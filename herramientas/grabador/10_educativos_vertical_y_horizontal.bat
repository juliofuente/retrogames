@echo off
rem Retos educativos en vertical (TikTok, Reels, Shorts) y horizontal (YouTube).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\educativos-ambos.txt web=https://educativos.juegosboom.com,idioma=ambos,desde=1,hasta=10,gancho,final,cta,extra
for %%p in (secuencias problemas emojimates calculo balanza ortografia spelling ingles) do %G% --opciones opciones\educativos-ambos.txt --puzles %%p --formato ambos
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
