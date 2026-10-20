// ArcadeRecorder · graba un vídeo con la demo de cada juego de la web (Arcade Perdido / JuegosBoom)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Lee el sitemap de una web (o de un subdominio), abre cada juego en Chrome sin ventana con «?rec=1» y el user agent
// «ArcadeRecorder», y el juego entra en modo grabación: no corre solo, sino que avanza un fotograma cada vez que este programa
// llama a window.arcadeRec.step(). Tras cada paso se saca una captura y se la pasa a ffmpeg. Así el vídeo sale fluido aunque el
// ordenador sea lento. Cada vídeo lleva una cartela de entrada (emoji, título, «inspirado en…»), la demo jugando sola y una
// cartela final con la dirección del juego. Junto a cada vídeo se escribe un .txt con el texto para publicarlo.
//
// Necesita: .NET 8, Google Chrome (o Chromium/Edge) y ffmpeg en el PATH. Sin paquetes NuGet: habla con Chrome por su protocolo
// de depuración (DevTools) con un WebSocket.
//
// Uso:  dotnet run -- --sitemap https://arcadeplus.juegosboom.com/sitemap.xml [opciones]
//   --sitemap URL         sitemap de la web (también vale --web https://arcadeplus.juegosboom.com)
//   --salida carpeta      dónde se guardan (por defecto «videos»): videos/<idioma>/<formato>/<id>.mp4 y .txt
//   --idioma es|en|ambos  (es)            --formato vertical|horizontal|ambos  (vertical = 1080×1920, horizontal = 1920×1080)
//   --duracion 75         segundos por vídeo (cartelas incluidas)        --fps 30
//   --intro 3 --outro 4   segundos de las cartelas de entrada y salida
//   --musica archivo|carpeta  música de fondo (si es carpeta, una al azar por vídeo; se repite y se funde al final)
//   --solo id1,id2        solo esos juegos            --max N   como mucho N juegos
//   --rehacer             vuelve a grabar los que ya existen (por defecto se saltan)
//   --paralelo N          juegos a la vez (1)         --calidad 21  (CRF de x264: menos = mejor y más pesado)
//   --chrome ruta         ejecutable de Chrome si no lo encuentra solo    --ffmpeg ruta
using System.Diagnostics;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ArcadeRecorder;

static class Program
{
    static async Task<int> Main(string[] argv)
    {
        var o = Options.Parse(argv);
        if (o == null) { Options.Help(); return 1; }
        Directory.CreateDirectory(o.Out);

        // 1. juegos del sitemap: las direcciones /<id>/es y /<id>/en son las de jugar (las fichas son /juego/<id>)
        Console.WriteLine($"Sitemap: {o.Sitemap}");
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 ArcadeRecorder/1.0");
        string xml = await http.GetStringAsync(o.Sitemap);
        var games = new List<(string Base, string Id)>();
        foreach (Match m in Regex.Matches(xml, @"<loc>\s*(https?://[^<\s]+?)/([a-z0-9][a-z0-9-]*)/(es|en)\s*</loc>"))
        {
            var (b, id) = (m.Groups[1].Value, m.Groups[2].Value);
            if (!games.Any(g => g.Id == id)) games.Add((b, id));
        }
        if (o.Only.Count > 0) games = games.Where(g => o.Only.Contains(g.Id)).ToList();
        if (o.Max > 0) games = games.Take(o.Max).ToList();
        Console.WriteLine($"{games.Count} juegos");
        if (games.Count == 0) return 1;

        var jobs = new Queue<Job>();
        foreach (var g in games) foreach (var lang in o.Langs) foreach (var fmt in o.Formats)
        {
            var dir = Path.Combine(o.Out, lang, fmt);
            var mp4 = Path.Combine(dir, g.Id + ".mp4");
            if (!o.Redo && File.Exists(mp4)) continue;
            jobs.Enqueue(new Job(g.Base, g.Id, lang, fmt, mp4));
        }
        Console.WriteLine($"{jobs.Count} vídeos por grabar");
        if (jobs.Count == 0) return 0;

        // 2. Chrome sin ventana con el puerto de depuración
        using var chrome = await Chrome.Start(o.ChromePath);
        int ok = 0, fail = 0; var total = jobs.Count; var sw = Stopwatch.StartNew();
        var workers = Enumerable.Range(0, Math.Max(1, o.Parallel)).Select(async w =>
        {
            while (true)
            {
                Job? j; lock (jobs) { if (jobs.Count == 0) return; j = jobs.Dequeue(); }
                try { if (await Record(chrome, o, j)) Interlocked.Increment(ref ok); else Interlocked.Increment(ref fail); }
                catch (Exception e) { Interlocked.Increment(ref fail); Console.WriteLine($"  ✗ {j.Id}: {e.Message}"); }
            }
        }).ToArray();
        await Task.WhenAll(workers);
        Console.WriteLine($"Hecho: {ok} vídeos, {fail} fallidos, de {total} · {sw.Elapsed:hh\\:mm\\:ss}");
        return fail > 0 ? 2 : 0;
    }

    record Job(string Base, string Id, string Lang, string Format, string Mp4);

    static async Task<bool> Record(Chrome chrome, Options o, Job j)
    {
        bool vertical = j.Format == "vertical";
        int w = vertical ? 540 : 960, h = vertical ? 960 : 540;   // ×2 de densidad = 1080×1920 o 1920×1080
        var host = new Uri(j.Base).Authority;
        var url = $"{j.Base}/{j.Id}/{j.Lang}?rec=1&fps={o.Fps}&dur={o.Duration}&intro={o.Intro}&outro={o.Outro}&site={Uri.EscapeDataString(host)}";
        await using var page = await chrome.NewPage();
        await page.Send("Page.enable");
        await page.Send("Emulation.setDeviceMetricsOverride", new { width = w, height = h, deviceScaleFactor = 2, mobile = vertical });
        if (vertical) await page.Send("Emulation.setTouchEmulationEnabled", new { enabled = true, maxTouchPoints = 2 });
        await page.Send("Network.setUserAgentOverride", new { userAgent = chrome.UserAgent + " ArcadeRecorder/1.0", acceptLanguage = j.Lang == "en" ? "en-GB,en" : "es-ES,es" });
        await page.Send("Page.navigate", new { url });

        // espera a que el juego diga que está listo (los que no tienen modo grabación, como los educativos aparte, se saltan)
        var t0 = DateTime.UtcNow; bool ready = false;
        while ((DateTime.UtcNow - t0).TotalSeconds < 25)
        {
            await Task.Delay(300);
            try { ready = (await page.Eval("!!(window.arcadeRec && window.arcadeRec.ready)")).GetBoolean(); } catch { }
            if (ready) break;
        }
        if (!ready) { Console.WriteLine($"  – {j.Id}: no tiene modo grabación, se salta"); return false; }
        var info = JsonDocument.Parse((await page.Eval("JSON.stringify(window.arcadeRec.info)")).GetString()!).RootElement;
        int frames = (await page.Eval("window.arcadeRec.frames")).GetInt32();
        string title = info.GetProperty("title").GetString() ?? j.Id;
        Console.WriteLine($"▶ {j.Id} ({title}) · {j.Lang} · {j.Format} · {frames} fotogramas");

        Directory.CreateDirectory(Path.GetDirectoryName(j.Mp4)!);
        var tmp = j.Mp4 + ".part.mp4";
        var music = o.PickMusic();
        using var ff = Ffmpeg.Start(o, tmp, music);
        var stdin = ff.StandardInput.BaseStream;
        int last = -1; var sw = Stopwatch.StartNew();
        for (int f = 0; f < frames; f++)
        {
            var st = await page.Eval("JSON.stringify(window.arcadeRec.step(1))");
            var shot = await page.Send("Page.captureScreenshot", new { format = "jpeg", quality = o.JpegQuality, optimizeForSpeed = true });
            var bytes = Convert.FromBase64String(shot.GetProperty("data").GetString()!);
            await stdin.WriteAsync(bytes);
            int pct = (f + 1) * 10 / frames;
            if (pct != last && pct % 2 == 0) { last = pct; Console.WriteLine($"   {j.Id}: {pct * 10}% · {sw.Elapsed.TotalSeconds:0}s"); }
            if (JsonDocument.Parse(st.GetString()!).RootElement.GetProperty("done").GetBoolean()) break;
        }
        stdin.Close();
        await ff.WaitForExitAsync();
        if (ff.ExitCode != 0 || !File.Exists(tmp)) { Console.WriteLine($"  ✗ {j.Id}: ffmpeg terminó con error {ff.ExitCode}"); return false; }
        File.Move(tmp, j.Mp4, true);
        File.WriteAllText(Path.ChangeExtension(j.Mp4, ".txt"), Caption(info, j.Lang));
        Console.WriteLine($"  ✓ {j.Mp4} ({new FileInfo(j.Mp4).Length / 1024} KB, {sw.Elapsed.TotalSeconds:0}s)");
        return true;
    }

    // texto para publicar el vídeo (TikTok, Shorts, Reels…)
    static string Caption(JsonElement i, string lang)
    {
        string S(string k) => i.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
        string tag = Regex.Replace(S("id"), "[^a-z0-9]", "");
        var origin = S("origin").Split(" / ")[0];
        return lang == "en"
            ? $"{S("emoji")} {S("title")} — {S("tag")}\n{(origin != "" ? "Inspired by " + origin + ". " : "")}Play it free, no ads, in your browser: {S("url")}\n\n#games #freegames #html5 #emoji #mobilegames #{tag}\n"
            : $"{S("emoji")} {S("title")} — {S("tag")}\n{(origin != "" ? "Inspirado en " + origin + ". " : "")}Juega gratis y sin anuncios en el navegador: {S("url")}\n\n#juegos #juegosgratis #html5 #emoji #juegosmovil #{tag}\n";
    }
}

/* ───────────── opciones ───────────── */
class Options
{
    public string Sitemap = ""; public string Out = "videos"; public List<string> Langs = new() { "es" }; public List<string> Formats = new() { "vertical" };
    public int Duration = 75, Fps = 30, Intro = 3, Outro = 4, Parallel = 1, Crf = 21, Max = 0, JpegQuality = 90;
    public bool Redo; public string? Music, ChromePath, FfmpegPath = "ffmpeg"; public HashSet<string> Only = new();
    readonly Random rnd = new();

    public static Options? Parse(string[] a)
    {
        var o = new Options();
        for (int i = 0; i < a.Length; i++)
        {
            string k = a[i];
            string v() => i + 1 < a.Length ? a[++i] : throw new ArgumentException("falta el valor de " + k);
            switch (k)
            {
                case "--sitemap": o.Sitemap = v(); break;
                case "--web": o.Sitemap = v().TrimEnd('/') + "/sitemap.xml"; break;
                case "--salida": o.Out = v(); break;
                case "--idioma": { var x = v(); o.Langs = x == "ambos" ? new() { "es", "en" } : new() { x }; break; }
                case "--formato": { var x = v(); o.Formats = x == "ambos" ? new() { "vertical", "horizontal" } : new() { x }; break; }
                case "--duracion": o.Duration = int.Parse(v()); break;
                case "--fps": o.Fps = int.Parse(v()); break;
                case "--intro": o.Intro = int.Parse(v()); break;
                case "--outro": o.Outro = int.Parse(v()); break;
                case "--musica": o.Music = v(); break;
                case "--solo": foreach (var x in v().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)) o.Only.Add(x); break;
                case "--max": o.Max = int.Parse(v()); break;
                case "--rehacer": o.Redo = true; break;
                case "--paralelo": o.Parallel = int.Parse(v()); break;
                case "--calidad": o.Crf = int.Parse(v()); break;
                case "--chrome": o.ChromePath = v(); break;
                case "--ffmpeg": o.FfmpegPath = v(); break;
                case "-h": case "--help": case "--ayuda": return null;
                default: Console.WriteLine("Opción desconocida: " + k); return null;
            }
        }
        if (o.Sitemap == "" || o.Langs.Any(l => l != "es" && l != "en") || o.Formats.Any(f => f != "vertical" && f != "horizontal")) return null;
        return o;
    }
    public static void Help() => Console.WriteLine("Uso: ArcadeRecorder --sitemap https://tu-web/sitemap.xml [--salida videos] [--idioma es|en|ambos] [--formato vertical|horizontal|ambos]\n" +
        "       [--duracion 75] [--fps 30] [--intro 3] [--outro 4] [--musica archivo|carpeta] [--solo id1,id2] [--max N] [--rehacer]\n" +
        "       [--paralelo N] [--calidad 21] [--chrome ruta] [--ffmpeg ruta]");
    public string? PickMusic()
    {
        if (string.IsNullOrEmpty(Music)) return null;
        if (File.Exists(Music)) return Music;
        if (!Directory.Exists(Music)) return null;
        var files = Directory.GetFiles(Music).Where(f => Regex.IsMatch(f, @"\.(mp3|m4a|aac|ogg|wav|flac)$", RegexOptions.IgnoreCase)).ToArray();
        lock (rnd) return files.Length > 0 ? files[rnd.Next(files.Length)] : null;
    }
}

/* ───────────── ffmpeg: recibe los JPEG por la entrada estándar ───────────── */
static class Ffmpeg
{
    public static Process Start(Options o, string outFile, string? music)
    {
        var a = new List<string> { "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", o.Fps.ToString(), "-i", "-" };
        if (music != null) a.AddRange(new[] { "-stream_loop", "-1", "-i", music });
        a.AddRange(new[] { "-map", "0:v", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", o.Crf.ToString(), "-r", o.Fps.ToString() });
        if (music != null) a.AddRange(new[] { "-map", "1:a", "-c:a", "aac", "-b:a", "160k", "-af", $"afade=t=in:d=1,afade=t=out:st={Math.Max(0, o.Duration - 2)}:d=2", "-shortest" });
        a.AddRange(new[] { "-movflags", "+faststart", outFile });
        var psi = new ProcessStartInfo(o.FfmpegPath!) { RedirectStandardInput = true, UseShellExecute = false };
        foreach (var x in a) psi.ArgumentList.Add(x);
        return Process.Start(psi) ?? throw new Exception("no se pudo arrancar ffmpeg");
    }
}

/* ───────────── Chrome sin ventana + protocolo DevTools ───────────── */
sealed class Chrome : IDisposable
{
    Process proc = null!; string dataDir = ""; public int Port; public string UserAgent = ""; Cdp browser = null!;

    public static async Task<Chrome> Start(string? path)
    {
        path ??= Find() ?? throw new Exception("No encuentro Chrome: indícalo con --chrome <ruta al ejecutable>");
        var c = new Chrome { dataDir = Path.Combine(Path.GetTempPath(), "arcrec-" + Guid.NewGuid().ToString("N")[..8]) };
        Directory.CreateDirectory(c.dataDir);
        var psi = new ProcessStartInfo(path) { UseShellExecute = false, RedirectStandardError = true, RedirectStandardOutput = true };
        foreach (var x in new[] { "--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + c.dataDir, "--no-first-run", "--no-default-browser-check",
                 "--mute-audio", "--hide-scrollbars", "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
                 "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required", "--force-color-profile=srgb", "about:blank" })
            psi.ArgumentList.Add(x);
        if (OperatingSystem.IsLinux() && Environment.UserName == "root") psi.ArgumentList.Insert(0, "--no-sandbox");
        c.proc = Process.Start(psi) ?? throw new Exception("no se pudo arrancar Chrome");
        c.proc.ErrorDataReceived += (_, _) => { }; c.proc.BeginErrorReadLine(); c.proc.OutputDataReceived += (_, _) => { }; c.proc.BeginOutputReadLine();
        var portFile = Path.Combine(c.dataDir, "DevToolsActivePort");
        for (int i = 0; i < 100 && !File.Exists(portFile); i++) await Task.Delay(100);
        if (!File.Exists(portFile)) throw new Exception("Chrome no abrió el puerto de depuración");
        await Task.Delay(100);
        c.Port = int.Parse(File.ReadAllLines(portFile)[0].Trim());
        using var http = new HttpClient();
        var ver = JsonDocument.Parse(await http.GetStringAsync($"http://127.0.0.1:{c.Port}/json/version")).RootElement;
        c.UserAgent = (ver.GetProperty("User-Agent").GetString() ?? "").Replace("HeadlessChrome", "Chrome");
        c.browser = await Cdp.Connect(ver.GetProperty("webSocketDebuggerUrl").GetString()!);
        Console.WriteLine($"Chrome: {path} (puerto {c.Port})");
        return c;
    }

    public async Task<Cdp> NewPage()
    {
        var r = await browser.Send("Target.createTarget", new { url = "about:blank" });
        var id = r.GetProperty("targetId").GetString()!;
        var page = await Cdp.Connect($"ws://127.0.0.1:{Port}/devtools/page/{id}");
        page.OnDispose = async () => { try { await browser.Send("Target.closeTarget", new { targetId = id }); } catch { } };
        return page;
    }

    static string? Find()
    {
        var c = new List<string>();
        if (OperatingSystem.IsWindows())
        {
            foreach (var root in new[] { Environment.GetEnvironmentVariable("ProgramFiles"), Environment.GetEnvironmentVariable("ProgramFiles(x86)"), Environment.GetEnvironmentVariable("LOCALAPPDATA") })
                if (!string.IsNullOrEmpty(root)) { c.Add(Path.Combine(root, @"Google\Chrome\Application\chrome.exe")); c.Add(Path.Combine(root, @"Microsoft\Edge\Application\msedge.exe")); }
        }
        else if (OperatingSystem.IsMacOS()) c.AddRange(new[] { "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium" });
        else c.AddRange(new[] { "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/pw-browsers/chromium" });
        return c.FirstOrDefault(File.Exists);
    }

    public void Dispose()
    {
        try { browser?.DisposeAsync().AsTask().Wait(2000); } catch { }
        try { if (!proc.HasExited) proc.Kill(true); } catch { }
        try { Directory.Delete(dataDir, true); } catch { }
    }
}

/* cliente mínimo del protocolo DevTools: comandos con id y respuestas; los eventos se ignoran */
sealed class Cdp : IAsyncDisposable
{
    readonly ClientWebSocket ws = new(); int nextId;
    readonly Dictionary<int, TaskCompletionSource<JsonElement>> pending = new();
    readonly SemaphoreSlim sendLock = new(1, 1); Task? loop; public Func<Task>? OnDispose;

    public static async Task<Cdp> Connect(string url)
    {
        var c = new Cdp(); c.ws.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);
        await c.ws.ConnectAsync(new Uri(url), CancellationToken.None);
        c.loop = Task.Run(c.Receive);
        return c;
    }

    public async Task<JsonElement> Send(string method, object? prms = null, int timeoutSec = 60)
    {
        int id = Interlocked.Increment(ref nextId);
        var tcs = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (pending) pending[id] = tcs;
        var json = JsonSerializer.SerializeToUtf8Bytes(new { id, method, @params = prms ?? new { } });
        await sendLock.WaitAsync();
        try { await ws.SendAsync(json, WebSocketMessageType.Text, true, CancellationToken.None); } finally { sendLock.Release(); }
        var done = await Task.WhenAny(tcs.Task, Task.Delay(TimeSpan.FromSeconds(timeoutSec)));
        if (done != tcs.Task) { lock (pending) pending.Remove(id); throw new TimeoutException(method + " no responde"); }
        return await tcs.Task;
    }

    // evalúa una expresión en la página y devuelve su valor
    public async Task<JsonElement> Eval(string expr)
    {
        var r = await Send("Runtime.evaluate", new { expression = expr, returnByValue = true, awaitPromise = true });
        if (r.TryGetProperty("exceptionDetails", out var ex)) throw new Exception("error en la página: " + ex.ToString());
        return r.GetProperty("result").TryGetProperty("value", out var v) ? v : default;
    }

    async Task Receive()
    {
        var buf = new byte[1 << 16]; var ms = new MemoryStream();
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                ms.SetLength(0); WebSocketReceiveResult r;
                do { r = await ws.ReceiveAsync(buf, CancellationToken.None); if (r.MessageType == WebSocketMessageType.Close) return; ms.Write(buf, 0, r.Count); } while (!r.EndOfMessage);
                var doc = JsonDocument.Parse(ms.ToArray()).RootElement;
                if (!doc.TryGetProperty("id", out var idEl)) continue;   // evento
                TaskCompletionSource<JsonElement>? t; lock (pending) { pending.Remove(idEl.GetInt32(), out t); }
                if (t == null) continue;
                if (doc.TryGetProperty("error", out var err)) t.TrySetException(new Exception(err.ToString()));
                else t.TrySetResult(doc.TryGetProperty("result", out var res) ? res.Clone() : default);
            }
        }
        catch { }
        finally { lock (pending) { foreach (var t in pending.Values) t.TrySetException(new Exception("conexión cerrada")); pending.Clear(); } }
    }

    public async ValueTask DisposeAsync()
    {
        if (OnDispose != null) await OnDispose();
        try { if (ws.State == WebSocketState.Open) await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None); } catch { }
        ws.Dispose();
    }
}
