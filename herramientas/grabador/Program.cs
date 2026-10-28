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
//   --musica archivo|carpeta  música de fondo (si es carpeta, una al azar por vídeo; se repite y se funde al final). Sin decir
//                         nada, se usa la carpeta «mimusica» si existe (junto al programa o donde se lanza) · --sin-musica la quita
//                         · --volumen-musica 0.35
//   --solo id1,id2        solo esos juegos            --max N   como mucho N juegos
//   --rehacer             vuelve a grabar los que ya existen (por defecto se saltan)
//   --paralelo N          juegos a la vez (1)         --calidad 21  (CRF de x264: menos = mejor y más pesado)
//   --chrome ruta         ejecutable de Chrome si no lo encuentra solo    --ffmpeg ruta
//
// Tutoriales de los solitarios (--tutoriales): un vídeo «cómo se juega» por solitario de la web (los 100 de Arcade.paciencia):
// cartela de entrada, los pasos del tutorial con los montones resaltados, unas jugadas de ejemplo explicadas y hechas
// despacio, y cartela final con la dirección del juego. Opciones (los textos admiten «español | english»):
//   --jugadas 6           jugadas de ejemplo tras el tutorial       --lectura 1   (1,3 = cada texto un 30 % más de tiempo)
//   --url-juego "{host}/{id}"  dirección que se anuncia ({host} {id} {lang} {web})
//   --gancho "…"  frase de la entrada   --cta "…"  frase final   --extra "…"  línea extra final («-» = ninguna)
//   --texto "…"   texto del .txt para publicar ({emoji} {title} {tag} {url} {steps} {moves}) · --outro-tutorial 5.5  segundos de cierre
//
// Retos (--puzles <id>): un vídeo por problema · pregunta, cuenta atrás, solución y cierre con la dirección:
//   cerillas (escena propia) · atasco, jarras, ranas, apagon, clavijas (escena de reto común del motor: la solución la juega
//   el solucionador del juego) · secuencias (página educativos/brain-academy/video-secuencias; --serie 5 = 5 preguntas por vídeo)
//   Educativos (página educativos/video-retos): secuencias · problemas (es) · emojimates · calculo · balanza · ortografia (es) ·
//   spelling (en) · ingles (es); todos con --serie 1 o 5.
//   --espera N  segundos para pensar · --desde/--hasta · --url-juego · --pagina "ruta?x={lang}" (otra página)
//   Textos (todos admiten «español | english»): --gancho (entrada) · --pregunta · --final (titular del cierre) · --cta · --extra
//   («-» = ninguna) · --siguenos (cerillas y retos del motor)
//   El .txt para publicar lo escribe la propia página (info.caption) si lo trae.
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
        Console.OutputEncoding = Encoding.UTF8;
        bool interactive = argv.Length == 0;
        if (interactive) argv = Ask.Run();   // sin argumentos: pregunta por consola (y recuerda las respuestas)
        var o = Options.Parse(argv);
        if (o == null) { Options.Help(); if (interactive) Ask.Pause(); return 1; }
        int rc;
        try { rc = await Run(o); }
        catch (Exception e) { Console.WriteLine("Error: " + e.Message); rc = 1; }
        if (interactive) Ask.Pause();
        return rc;
    }

    static async Task<int> Run(Options o)
    {
        Directory.CreateDirectory(o.Out);
        if (o.Music != null) Console.WriteLine(Directory.Exists(o.Music) ? $"Música de fondo: una canción al azar de {o.Music} ({Directory.GetFiles(o.Music).Count(f => Regex.IsMatch(f, @"\.(mp3|m4a|aac|ogg|wav|flac)$", RegexOptions.IgnoreCase))} canciones)" : $"Música de fondo: {o.Music}");

        if (o.Puzzles != null) return await RunPuzzles(o);
        if (o.Tutorials) return await RunTutorials(o);

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
        return await RunJobs(chrome, o, jobs);
    }

    /* modo retos (--puzles <id>): un vídeo por problema con la escena propia del juego (recScene), p. ej. Cerillas:
       pregunta, cuenta atrás, solución animada y cierre con la dirección */
    static async Task<int> RunPuzzles(Options o)
    {
        var baseUrl = new Uri(o.Sitemap).GetLeftPart(UriPartial.Authority);
        using var chrome = await Chrome.Start(o.ChromePath);
        int count;
        await using (var page = await chrome.NewPage())
        {
            await page.Send("Page.enable");
            await page.Send("Network.setUserAgentOverride", new { userAgent = chrome.UserAgent + " ArcadeRecorder/1.0" });
            await page.Send("Page.navigate", new { url = PuzzleUrl(o, baseUrl, o.Langs[0], 1) });
            count = 0;
            for (int i = 0; i < 300 && count == 0; i++) { await Task.Delay(300); try { count = (await page.Eval("window.arcadeRec && window.arcadeRec.ready ? window.arcadeRec.quizCount : 0")).GetInt32(); } catch { } }
            // idiomas en los que existe (la ortografía y los problemas, solo en español; spelling, solo en inglés)
            try { var ls = (await page.Eval("JSON.stringify(window.arcadeRec.langs || null)")).GetString(); var arr = ls == null || ls == "null" ? null : JsonSerializer.Deserialize<List<string>>(ls);
                if (arr != null) { var drop = o.Langs.Where(l => !arr.Contains(l)).ToList(); if (drop.Count > 0) Console.WriteLine($"{o.Puzzles} no está en {string.Join(", ", drop)}: se graba solo en {string.Join(", ", arr)}"); o.Langs = o.Langs.Where(arr.Contains).ToList(); if (o.Langs.Count == 0) o.Langs = arr.Take(1).ToList(); } } catch { }
        }
        if (count == 0) { Console.WriteLine($"{o.Puzzles} no tiene vídeos de retos (recScene) o no carga en {baseUrl}"); return 1; }
        int from = Math.Max(1, o.From), to = o.To > 0 ? Math.Min(o.To, count) : count;
        Console.WriteLine($"{o.Puzzles}: {count} retos · se graban del {from} al {to}");
        var jobs = new Queue<Job>();
        for (int q = from; q <= to; q++) foreach (var lang in o.Langs) foreach (var fmt in o.Formats)
        {
            var mp4 = Path.Combine(o.Out, o.Puzzles, lang, fmt, o.Set > 1 ? $"{o.Puzzles}-{o.Set}x-{q:000}.mp4" : $"{o.Puzzles}-{q:000}.mp4");
            if (!o.Redo && File.Exists(mp4)) continue;
            jobs.Enqueue(new Job(baseUrl, o.Puzzles, lang, fmt, mp4, q));
        }
        Console.WriteLine($"{jobs.Count} vídeos por grabar");
        return jobs.Count == 0 ? 0 : await RunJobs(chrome, o, jobs);
    }

    /* modo tutoriales (--tutoriales): un vídeo «cómo se juega» por cada solitario del sitemap */
    static async Task<int> RunTutorials(Options o)
    {
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
        // solo los solitarios: su página usa el motor de solitarios (Arcade.paciencia, en cartas.js); la escoba, la brisca… no
        var soli = new List<(string Base, string Id)>(); var sem = new SemaphoreSlim(8);
        await Task.WhenAll(games.Select(async g =>
        {
            await sem.WaitAsync();
            try { var html = await http.GetStringAsync($"{g.Base}/{g.Id}/es"); if (html.Contains("cartas.js") && html.Contains("Arcade.paciencia")) lock (soli) soli.Add(g); }
            catch { }
            finally { sem.Release(); }
        }));
        soli = soli.OrderBy(g => games.FindIndex(x => x.Id == g.Id)).ToList();
        if (o.Max > 0) soli = soli.Take(o.Max).ToList();
        Console.WriteLine($"{soli.Count} solitarios (de {games.Count} juegos)");
        if (soli.Count == 0) return 1;
        var jobs = new Queue<Job>();
        foreach (var g in soli) foreach (var lang in o.Langs) foreach (var fmt in o.Formats)
        {
            var mp4 = Path.Combine(o.Out, "tutoriales", lang, fmt, g.Id + ".mp4");
            if (!o.Redo && File.Exists(mp4)) continue;
            jobs.Enqueue(new Job(g.Base, g.Id, lang, fmt, mp4, 0, true));
        }
        Console.WriteLine($"{jobs.Count} vídeos por grabar");
        if (jobs.Count == 0) return 0;
        using var chrome = await Chrome.Start(o.ChromePath);
        return await RunJobs(chrome, o, jobs);
    }

    /* dirección de un reto: el juego en /<id>/<idioma>, o una página propia (--pagina; la de las secuencias de Brain Academy
       viene de serie) con {lang} {id} en la ruta */
    public static readonly string[] EduPacks = { "secuencias", "problemas", "emojimates", "calculo", "balanza", "ortografia", "spelling", "ingles" };
    public static readonly Dictionary<string, string> Pages = EduPacks.ToDictionary(p => p, p => "educativos/video-retos?pack={id}&lang={lang}");
    static string PuzzleUrl(Options o, string baseUrl, string lang, int q, string? extra = null)
    {
        var page = o.Page ?? (Pages.TryGetValue(o.Puzzles!, out var pg) ? pg : null);
        var u = page != null ? baseUrl.TrimEnd('/') + "/" + page.TrimStart('/').Replace("{lang}", lang).Replace("{id}", o.Puzzles) : $"{baseUrl}/{o.Puzzles}/{lang}";
        u += (u.Contains('?') ? "&" : "?") + $"rec=1&quiz={q}";
        if (o.Set > 1) u += "&set=" + o.Set;
        return u + (extra ?? "");
    }

    // texto «español | english» → el del idioma (si no hay «|», el mismo para los dos)
    public static string? Lang(string? v, string lang)
    {
        if (v == null) return null;
        var p = v.Split('|');
        return (p.Length > 1 ? (lang == "en" ? p[1] : p[0]) : v).Trim();
    }
    static string TutorialUrl(Options o, Job j)
    {
        var host = new Uri(j.Base).Authority;
        return o.UrlTemplate.Replace("{host}", host).Replace("{id}", j.Id).Replace("{lang}", j.Lang).Replace("{web}", j.Base.TrimEnd('/'));
    }

    static async Task<int> RunJobs(Chrome chrome, Options o, Queue<Job> jobs)
    {
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

    record Job(string Base, string Id, string Lang, string Format, string Mp4, int Quiz = 0, bool Tut = false);

    static async Task<bool> Record(Chrome chrome, Options o, Job j)
    {
        bool vertical = j.Format == "vertical";
        int w = vertical ? 540 : 960, h = vertical ? 960 : 540;   // ×2 de densidad = 1080×1920 o 1920×1080
        var host = new Uri(j.Base).Authority;
        string E(string? v) => Uri.EscapeDataString(v ?? "");
        var inv = System.Globalization.CultureInfo.InvariantCulture;
        string url;
        if (j.Tut)
        {
            url = $"{j.Base}/{j.Id}/{j.Lang}?rec=1&fps={o.Fps}&tut=1&moves={o.Moves}&read={o.Read.ToString(inv)}&site={E(host)}&url={E(TutorialUrl(o, j))}";
            if (o.TutOutro > 0) url += "&outro=" + o.TutOutro.ToString(inv);
            foreach (var (k, v) in new[] { ("hook", o.Hook), ("cta", o.Cta), ("extra", o.Extra) })
                if (v != null) url += $"&{k}=" + E(v == "-" ? "" : Lang(v, j.Lang));
        }
        else if (j.Quiz > 0)
        {
            // espera: la que se pida; si no, 45 s en Cerillas y la de serie de cada página (20 s los retos del motor, 10 s las secuencias)
            int wait = o.Wait > 0 ? o.Wait : j.Id == "cerillas" ? 45 : 0;
            var extra = $"&fps={o.Fps}&site={E(host)}" + (wait > 0 ? $"&wait={wait}" : "") + (o.UrlSet ? "&url=" + E(TutorialUrl(o, j)) : "");
            foreach (var (k, v) in new[] { ("hook", o.Hook), ("ask", o.Ask), ("end", o.End), ("cta", o.Cta), ("extra", o.Extra), ("follow", o.Follow) })
                if (v != null) extra += $"&{k}=" + E(v == "-" ? "" : Lang(v, j.Lang));
            url = PuzzleUrl(o, j.Base, j.Lang, j.Quiz, extra);
        }
        else url = $"{j.Base}/{j.Id}/{j.Lang}?rec=1&fps={o.Fps}&dur={o.Duration}&intro={o.Intro}&outro={o.Outro}&site={E(host)}";
        await using var page = await chrome.NewPage();
        await page.Send("Page.enable");
        await page.Send("Emulation.setDeviceMetricsOverride", new { width = w, height = h, deviceScaleFactor = 2, mobile = vertical });
        if (vertical) await page.Send("Emulation.setTouchEmulationEnabled", new { enabled = true, maxTouchPoints = 2 });
        await page.Send("Network.setUserAgentOverride", new { userAgent = chrome.UserAgent + " ArcadeRecorder/1.0", acceptLanguage = j.Lang == "en" ? "en-GB,en" : "es-ES,es" });
        await page.Send("Page.navigate", new { url });

        // espera a que el juego diga que está listo (los que no tienen modo grabación, como los educativos aparte, se saltan)
        var t0 = DateTime.UtcNow; bool ready = false;
        while ((DateTime.UtcNow - t0).TotalSeconds < (j.Quiz > 0 ? 120 : 25))   // los retos ensayan antes la solución: tardan más
        {
            await Task.Delay(300);
            try { ready = (await page.Eval("!!(window.arcadeRec && window.arcadeRec.ready)")).GetBoolean(); } catch { }
            if (ready) break;
        }
        if (!ready) { Console.WriteLine($"  – {j.Id}: no tiene modo grabación, se salta"); return false; }
        if (j.Tut)
        {
            string scene = ""; try { scene = (await page.Eval("String(window.arcadeRec.scene || '')")).GetString() ?? ""; } catch { }
            if (scene != "tutorial") { Console.WriteLine($"  – {j.Id}: no tiene vídeo de tutorial (¿falta subir pwa/cartas.js nuevo a la web?), se salta"); return false; }
        }
        var info = JsonDocument.Parse((await page.Eval("JSON.stringify(window.arcadeRec.info)")).GetString()!).RootElement;
        int frames = (await page.Eval("window.arcadeRec.frames")).GetInt32();
        string title = info.GetProperty("title").GetString() ?? j.Id;
        Console.WriteLine($"▶ {j.Id} ({title}) · {j.Lang} · {j.Format} · {frames} fotogramas");

        Directory.CreateDirectory(Path.GetDirectoryName(j.Mp4)!);
        var tmp = j.Mp4 + ".part.mp4";
        var music = o.PickMusic();
        double seconds = (double)frames / o.Fps;
        // efectos de sonido de la escena (marcas de tiempo que da la página): se sintetizan aquí en un WAV
        string? sfx = null;
        try {
            var cues = JsonDocument.Parse((await page.Eval("JSON.stringify(window.arcadeRec.cues || [])")).GetString()!).RootElement;
            if (cues.GetArrayLength() > 0 && !o.NoSfx) { sfx = j.Mp4 + ".sfx.wav"; Sfx.Write(sfx, cues, seconds); }
        } catch (Exception e) { Console.WriteLine($"   (sin efectos de sonido: {e.Message})"); }
        using var ff = Ffmpeg.Start(o, tmp, music, sfx, seconds);
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
        if (sfx != null) try { File.Delete(sfx); } catch { }
        File.Move(tmp, j.Mp4, true);
        File.WriteAllText(Path.ChangeExtension(j.Mp4, ".txt"), j.Tut ? TutorialCaption(info, j.Lang, o) : j.Quiz > 0 ? QuizCaption(info, j.Lang) : Caption(info, j.Lang));
        Console.WriteLine($"  ✓ {j.Mp4} ({new FileInfo(j.Mp4).Length / 1024} KB, {sw.Elapsed.TotalSeconds:0}s)");
        return true;
    }

    // texto de un vídeo de reto: «¿lo resolverías?» sin destripar la solución
    static string QuizCaption(JsonElement i, string lang)
    {
        string S(string k) => i.TryGetProperty(k, out var v) ? (v.ValueKind == JsonValueKind.Number ? v.GetRawText() : v.GetString() ?? "") : "";
        if (S("caption") != "") return S("caption");   // la página trae su propio texto (retos del motor, secuencias…)
        string n = S("count"), act = S("action"), what = n == "1" ? "ONE match" : n + " matches";
        return lang == "en"
            ? $"🔥 Matchstick puzzle #{S("puzzle")}: {S("equation")} is wrong. Can you {act} {what} to make it true? 🤔\nAnswer at the end 👀 Comment yours before it shows!\nPlay {S("total")} puzzles like this for free: {S("url")}\n\n#matchstickpuzzle #puzzle #brainteaser #riddle #math #iqtest #fyp\n"
            : $"🔥 Reto de cerillas #{S("puzzle")}: {S("equation")} está mal. ¿Sabrías arreglarlo? 🤔\nLa solución, al final 👀 ¡Comenta la tuya antes!\nJuega gratis a {S("total")} retos como este: {S("url")}\n\n#cerillas #acertijo #retomental #matematicas #puzzle #fyp\n";
    }

    // texto de un vídeo de tutorial («cómo se juega»); con --texto se cambia por una plantilla propia
    static string TutorialCaption(JsonElement i, string lang, Options o)
    {
        string S(string k) => i.TryGetProperty(k, out var v) ? (v.ValueKind == JsonValueKind.Number ? v.GetRawText() : v.GetString() ?? "") : "";
        string tag = Regex.Replace(S("id"), "[^a-z0-9]", "");
        var tpl = Lang(o.CaptionTemplate, lang) ?? (lang == "en"
            ? "{emoji} {title}: how to play, in one minute 🃏\n{tag}. The rules step by step and a few example moves.\nPlay it free in your browser: {url}\n\n#solitaire #cardgames #howtoplay #patience #tutorial #{id}\n"
            : "{emoji} {title}: cómo se juega, en un minuto 🃏\n{tag}. Las reglas paso a paso y unas jugadas de ejemplo.\nJuega gratis en el navegador: {url}\n\n#solitario #juegosdecartas #comosejuega #paciencia #tutorial #{id}\n");
        foreach (var k in new[] { "emoji", "title", "tag", "url", "steps", "moves" }) tpl = tpl.Replace("{" + k + "}", S(k));
        return tpl.Replace("{id}", tag).Replace("\\n", "\n");
    }

    // texto para publicar el vídeo (TikTok, Shorts, Reels…)
    static string Caption(JsonElement i, string lang)
    {
        string S(string k) => i.TryGetProperty(k, out var v) ? v.GetString() ?? "" : "";
        string tag = Regex.Replace(S("id"), "[^a-z0-9]", "");
        var origin = S("origin").Split(" / ")[0];
        return lang == "en"
            ? $"{S("emoji")} {S("title")} — {S("tag")}\n{(origin != "" ? "Inspired by " + origin + ". " : "")}Play it free in your browser: {S("url")}\n\n#games #freegames #html5 #emoji #mobilegames #{tag}\n"
            : $"{S("emoji")} {S("title")} — {S("tag")}\n{(origin != "" ? "Inspirado en " + origin + ". " : "")}Juega gratis en el navegador: {S("url")}\n\n#juegos #juegosgratis #html5 #emoji #juegosmovil #{tag}\n";
    }
}

/* ───────────── modo preguntas (al abrirlo sin argumentos, p. ej. con doble clic o F5) ───────────── */
static class Ask
{
    const string File_ = "ArcadeRecorder.respuestas.json";
    static Dictionary<string, string> last = new();

    public static string[] Run()
    {
        try { if (File.Exists(File_)) last = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(File_)) ?? new(); } catch { }
        Console.WriteLine("ArcadeRecorder · vídeos de los juegos (Enter = la respuesta entre corchetes)\n");
        var a = new List<string>();
        string web = Q("web", "Web de la que grabar (subdominio o dominio; para los tutoriales, la de solitarios)", "https://mobilehits.juegosboom.com").TrimEnd('/');
        if (!web.StartsWith("http")) web = "https://" + web;
        a.AddRange(new[] { "--web", web });
        string modo = Q("modo", "¿Qué quieres grabar?  1 = demos de los juegos · 2 = retos (un vídeo por problema) · 3 = tutoriales de los solitarios", "1").Trim();
        bool retos = modo == "2", tuts = modo == "3";
        if (tuts)
        {
            a.Add("--tutoriales");
            var solo = Q("soloT", "Solitarios concretos, separados por comas (Enter = todos los de la web)", "todos"); if (solo != "todos" && solo != "") a.AddRange(new[] { "--solo", solo });
            a.AddRange(new[] { "--jugadas", Q("jugadas", "Jugadas de ejemplo después del tutorial", "6") });
            a.AddRange(new[] { "--lectura", Q("lectura", "Velocidad de lectura (1 = normal, 1.3 = más despacio)", "1") });
            a.AddRange(new[] { "--url-juego", Q("urlJuego", "Dirección que se anuncia ({host} {id} {lang} {web})", "{host}/{id}") });
            foreach (var (k, txt, opt) in new[] { ("gancho", "Frase de la entrada («es | en», Enter = la de serie)", "--gancho"), ("cta", "Frase final («es | en», Enter = la de serie)", "--cta"), ("extra", "Línea extra final («es | en», - = ninguna, Enter = la de serie)", "--extra") })
            { var v = Q(k, txt, "auto"); if (v != "auto" && v != "") a.AddRange(new[] { opt, v }); }
        }
        else if (retos)
        {
            Console.WriteLine("  Educativos: secuencias · problemas (es) · emojimates · calculo · balanza · ortografia (es) · spelling (en) · ingles (es)");
            Console.WriteLine("  Juegos: cerillas · atasco · jarras · ranas · apagon · clavijas");
            var pz = Q("puzles", "Juego de retos", "secuencias").Trim().ToLowerInvariant();
            a.AddRange(new[] { "--puzles", pz });
            if (Program.EduPacks.Contains(pz)) a.AddRange(new[] { "--serie", Q("serie", "Preguntas por vídeo: 1 o 5 (de fácil a genio)", "1") });
            a.AddRange(new[] { "--desde", Q("desde", "Desde el reto número", "1") });
            var hasta = Q("hasta", "Hasta el reto número (Enter = todos)", "todos"); if (int.TryParse(hasta, out _)) a.AddRange(new[] { "--hasta", hasta });
            var esp = Q("esperaR", "Segundos para pensar (Enter = los de serie: 45 cerillas, 20 los demás, 10 secuencias, 6 en las de 5)", "auto"); if (int.TryParse(esp, out _)) a.AddRange(new[] { "--espera", esp });
            foreach (var (k, txt, opt) in new[] { ("ganchoR", "Texto de la entrada («es | en», Enter = el de serie)", "--gancho"), ("preguntaR", "Texto de la pregunta («es | en», Enter = el de serie)", "--pregunta"),
                ("finalR", "Titular del cierre, p. ej. «¿LO HAS ACERTADO? | DID YOU GET IT?» (Enter = el de serie)", "--final"), ("ctaR", "Frase del cierre («es | en», Enter = la de serie)", "--cta"),
                ("extraR", "Línea final («es | en», - = ninguna, Enter = la de serie)", "--extra"), ("urlR", "Dirección que se anuncia ({host} {id}; Enter = la del juego)", "--url-juego") })
            { var v = Q(k, txt, "auto"); if (v != "auto" && v != "") a.AddRange(new[] { opt, v }); }
        }
        else
        {
            var solo = Q("solo", "Juegos concretos, separados por comas (Enter = todos los de la web)", "todos"); if (solo != "todos" && solo != "") a.AddRange(new[] { "--solo", solo });
            a.AddRange(new[] { "--duracion", Q("duracion", "Segundos por vídeo", "75") });
        }
        a.AddRange(new[] { "--idioma", Q("idioma" + (retos ? "R" : tuts ? "T" : "D"), "Idioma: es / en / ambos", retos ? "en" : tuts ? "ambos" : "es") });
        a.AddRange(new[] { "--formato", Q("formato", "Formato: vertical / horizontal / ambos", "vertical") });
        var mus = Q("musica2", "Música de fondo: archivo o carpeta (Enter = la carpeta «mimusica» si existe; «no» = sin música)", "auto");
        if (mus.Equals("no", StringComparison.OrdinalIgnoreCase)) a.Add("--sin-musica"); else if (mus != "auto" && mus != "") a.AddRange(new[] { "--musica", mus.Trim('"') });
        a.AddRange(new[] { "--paralelo", Q("paralelo", "Vídeos a la vez", "2") });
        a.AddRange(new[] { "--salida", Q("salida", "Carpeta donde guardarlos", "videos") });
        if (Q("rehacer", "¿Volver a grabar los que ya existen? s/n", "n").StartsWith("s", StringComparison.OrdinalIgnoreCase)) a.Add("--rehacer");
        var chrome = Q("chrome", "Ruta de Chrome (Enter = buscarlo solo)", "auto"); if (chrome != "auto" && chrome != "") a.AddRange(new[] { "--chrome", chrome.Trim('"') });
        try { File.WriteAllText(File_, JsonSerializer.Serialize(last, new JsonSerializerOptions { WriteIndented = true })); } catch { }
        Console.WriteLine("\nArgumentos equivalentes (para ponerlos en un .bat):\n  ArcadeRecorder " + string.Join(" ", a.Select(x => x.Contains(' ') ? "\"" + x + "\"" : x)) + "\n");
        return a.ToArray();
    }

    static string Q(string key, string text, string def)
    {
        var d = last.TryGetValue(key, out var v) && v != "" ? v : def;
        Console.Write($"{text} [{d}]: ");
        var r = (Console.ReadLine() ?? "").Trim();
        if (r == "") r = d;
        last[key] = r; return r;
    }

    public static void Pause() { Console.WriteLine("\nPulsa Enter para salir…"); try { Console.ReadLine(); } catch { } }
}

/* ───────────── opciones ───────────── */
class Options
{
    public string Sitemap = ""; public string Out = "videos"; public List<string> Langs = new() { "es" }; public List<string> Formats = new() { "vertical" };
    public string? Puzzles; public int Wait = 0, From = 1, To = 0; bool langSet; public bool NoSfx; public double MusicVolume = 0.35;
    public int Duration = 75, Fps = 30, Intro = 3, Outro = 4, Parallel = 1, Crf = 21, Max = 0, JpegQuality = 90;
    public bool Redo; public string? Music, ChromePath, FfmpegPath = "ffmpeg"; public HashSet<string> Only = new();
    public bool Tutorials; public int Moves = 6; public double Read = 1, TutOutro = 0; public string UrlTemplate = "{host}/{id}"; public bool UrlSet; public string? Page; public int Set = 1; public string? Hook, Cta, Extra, CaptionTemplate, Ask, End, Follow; public bool NoMusic;
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
                case "--puzles": o.Puzzles = v(); break;
                case "--tutoriales": o.Tutorials = true; break;
                case "--jugadas": o.Moves = int.Parse(v()); break;
                case "--lectura": o.Read = double.Parse(v().Replace(',', '.'), System.Globalization.CultureInfo.InvariantCulture); break;
                case "--url-juego": o.UrlTemplate = v(); o.UrlSet = true; break;
                case "--gancho": o.Hook = v(); break;
                case "--cta": o.Cta = v(); break;
                case "--extra": o.Extra = v(); break;
                case "--texto": o.CaptionTemplate = v(); break;
                case "--outro-tutorial": o.TutOutro = double.Parse(v().Replace(',', '.'), System.Globalization.CultureInfo.InvariantCulture); break;
                case "--sin-efectos": o.NoSfx = true; break;
                case "--volumen-musica": o.MusicVolume = double.Parse(v(), System.Globalization.CultureInfo.InvariantCulture); break;
                case "--espera": o.Wait = int.Parse(v()); break;
                case "--pagina": o.Page = v(); break;
                case "--serie": o.Set = int.Parse(v()); break;
                case "--desde": o.From = int.Parse(v()); break;
                case "--hasta": o.To = int.Parse(v()); break;
                case "--idioma": { o.langSet = true; var x = v(); o.Langs = x == "ambos" ? new() { "es", "en" } : new() { x }; break; }
                case "--formato": { var x = v(); o.Formats = x == "ambos" ? new() { "vertical", "horizontal" } : new() { x }; break; }
                case "--duracion": o.Duration = int.Parse(v()); break;
                case "--fps": o.Fps = int.Parse(v()); break;
                case "--intro": o.Intro = int.Parse(v()); break;
                case "--outro": o.Outro = int.Parse(v()); break;
                case "--musica": o.Music = v(); break;
                case "--sin-musica": o.NoMusic = true; break;
                case "--pregunta": o.Ask = v(); break;
                case "--final": o.End = v(); break;
                case "--siguenos": o.Follow = v(); break;
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
        if (o.Puzzles != null && !o.langSet) o.Langs = Program.EduPacks.Contains(o.Puzzles) ? new() { "es", "en" } : new() { "en" };   // los retos, en inglés; los educativos, en los idiomas que tengan
        // música de fondo: si no se dice nada y existe la carpeta «mimusica» (junto al programa o donde se lanza), una canción al azar por vídeo
        if (o.NoMusic) o.Music = null;
        else if (o.Music == null)
            foreach (var d in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory, Path.Combine(AppContext.BaseDirectory, "..", "..", "..") })
                if (Directory.Exists(Path.Combine(d, "mimusica"))) { o.Music = Path.GetFullPath(Path.Combine(d, "mimusica")); break; }
        if (o.Sitemap == "" || o.Langs.Any(l => l != "es" && l != "en") || o.Formats.Any(f => f != "vertical" && f != "horizontal")) return null;
        return o;
    }
    public static void Help() => Console.WriteLine("Uso: ArcadeRecorder --sitemap https://tu-web/sitemap.xml [--salida videos] [--idioma es|en|ambos] [--formato vertical|horizontal|ambos]\n" +
        "       [--duracion 75] [--fps 30] [--intro 3] [--outro 4] [--musica archivo|carpeta] [--solo id1,id2] [--max N] [--rehacer]\n" +
        "       [--paralelo N] [--calidad 21] [--chrome ruta] [--ffmpeg ruta]\n" +
        "Retos (un vídeo por problema): ArcadeRecorder --web https://mobilehits.juegosboom.com --puzles cerillas|atasco|jarras|ranas|apagon|clavijas [--espera 45] [--desde 1] [--hasta 269]\n" +
        "Educativos: ArcadeRecorder --web https://educativos.juegosboom.com --puzles secuencias|problemas|emojimates|calculo|balanza|ortografia|spelling|ingles [--serie 5] [--desde 1] [--hasta 30]\n" +
        "Textos: --gancho --pregunta --final --cta --extra --siguenos (\"español | english\") · Música: carpeta mimusica, --musica, --sin-musica\n" +
        "Tutoriales de solitarios: ArcadeRecorder --web https://solitarios.juegosboom.com --tutoriales [--idioma ambos] [--jugadas 6] [--lectura 1]\n" +
        "       [--url-juego \"{host}/{id}\"] [--gancho \"es | en\"] [--cta \"es | en\"] [--extra \"es | en\"] [--texto \"plantilla\"] [--outro-tutorial 5.5]");
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
    public static Process Start(Options o, string outFile, string? music, string? sfx, double seconds)
    {
        var a = new List<string> { "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", o.Fps.ToString(), "-i", "-" };
        int ia = 1, isfx = -1, imus = -1;
        if (sfx != null) { a.AddRange(new[] { "-i", sfx }); isfx = ia++; }
        if (music != null) { a.AddRange(new[] { "-stream_loop", "-1", "-i", music }); imus = ia++; }
        a.AddRange(new[] { "-map", "0:v", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", o.Crf.ToString(), "-r", o.Fps.ToString() });
        string fade = $"afade=t=in:d=1,afade=t=out:st={Math.Max(0, seconds - 2):0.##}:d=2";
        if (isfx >= 0 && imus >= 0)
            a.AddRange(new[] { "-filter_complex", $"[{imus}:a]volume={o.MusicVolume.ToString(System.Globalization.CultureInfo.InvariantCulture)},{fade}[m];[{isfx}:a][m]amix=inputs=2:duration=first:normalize=0[a]", "-map", "[a]" });
        else if (isfx >= 0) a.AddRange(new[] { "-map", isfx + ":a" });
        else if (imus >= 0) a.AddRange(new[] { "-map", imus + ":a", "-af", fade });
        if (isfx >= 0 || imus >= 0) a.AddRange(new[] { "-c:a", "aac", "-b:a", "160k", "-t", seconds.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture) });
        a.AddRange(new[] { "-movflags", "+faststart", outFile });
        var psi = new ProcessStartInfo(o.FfmpegPath!) { RedirectStandardInput = true, UseShellExecute = false };
        foreach (var x in a) psi.ArgumentList.Add(x);
        return Process.Start(psi) ?? throw new Exception("no se pudo arrancar ffmpeg");
    }
}

/* ───────────── efectos de sonido sintetizados (tick, pop, ritmo, golpe, whoosh, campana…) ───────────── */
static class Sfx
{
    const int SR = 44100;
    public static void Write(string path, JsonElement cues, double seconds)
    {
        var buf = new float[(int)(seconds * SR) + SR];
        var rnd = new Random(7);
        foreach (var c in cues.EnumerateArray())
        {
            double t = c.GetProperty("t").GetDouble(); string k = c.GetProperty("s").GetString() ?? "";
            int at = (int)(t * SR); if (at < 0 || at >= buf.Length) continue;
            switch (k)
            {
                case "tick": Tone(buf, at, 0.05, f => 1500, 0.30, 60); break;
                case "tock": Tone(buf, at, 0.14, f => 880, 0.55, 22); Tone(buf, at, 0.10, f => 1760, 0.18, 30); break;
                case "pop": Tone(buf, at, 0.09, f => 500 + 700 * f, 0.32, 30); break;
                case "kick": Tone(buf, at, 0.20, f => 150 - 105 * f, 0.75, 14); break;
                case "hat": Noise(buf, at, 0.04, 0.10, 80, rnd, true); break;
                case "boom": Tone(buf, at, 0.7, f => 90 - 60 * f, 0.9, 5); Noise(buf, at, 0.5, 0.35, 6, rnd, false); break;
                case "whoosh": Whoosh(buf, at, 0.55, 0.45, rnd); break;
                case "ding": foreach (var (fr, v) in new[] { (1046.5, 0.30), (1568.0, 0.18), (2093.0, 0.10) }) Tone(buf, at, 1.3, f => fr, v, 3.2); break;
                case "drum": for (int i = 0; i < 14; i++) Noise(buf, at + (int)(i * 0.055 * SR), 0.05, 0.08 + i * 0.022, 50, rnd, false); break;
            }
        }
        float peak = 0; foreach (var v in buf) peak = Math.Max(peak, Math.Abs(v));
        float g = peak > 0.95f ? 0.95f / peak : 1f;
        using var w = new BinaryWriter(File.Create(path));
        int n = buf.Length; w.Write("RIFF"u8); w.Write(36 + n * 2); w.Write("WAVE"u8); w.Write("fmt "u8); w.Write(16); w.Write((short)1); w.Write((short)1); w.Write(SR); w.Write(SR * 2); w.Write((short)2); w.Write((short)16);
        w.Write("data"u8); w.Write(n * 2); foreach (var v in buf) w.Write((short)Math.Clamp(v * g * 32767, -32768, 32767));
    }
    // tono con frecuencia variable (f(0..1)) y caída exponencial
    static void Tone(float[] b, int at, double dur, Func<double, double> freq, double vol, double decay)
    {
        int n = (int)(dur * SR); double ph = 0;
        for (int i = 0; i < n && at + i < b.Length; i++) { double f = (double)i / n; ph += 2 * Math.PI * freq(f) / SR; double env = Math.Exp(-decay * i / (double)SR) * Math.Min(1, i / (0.003 * SR)); b[at + i] += (float)(Math.Sin(ph) * vol * env); }
    }
    static void Noise(float[] b, int at, double dur, double vol, double decay, Random r, bool bright)
    {
        int n = (int)(dur * SR); double last = 0;
        for (int i = 0; i < n && at + i < b.Length; i++) { double x = r.NextDouble() * 2 - 1, y = bright ? x - last : last + (x - last) * 0.15; last = bright ? x : y; b[at + i] += (float)(y * vol * Math.Exp(-decay * i / (double)SR)); }
    }
    static void Whoosh(float[] b, int at, double dur, double vol, Random r)
    {
        int n = (int)(dur * SR); double lp = 0;
        for (int i = 0; i < n && at + i < b.Length; i++) { double f = (double)i / n, cut = 0.02 + 0.3 * f; lp += (r.NextDouble() * 2 - 1 - lp) * cut; b[at + i] += (float)(lp * vol * Math.Sin(Math.PI * f) * 2.2); }
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
