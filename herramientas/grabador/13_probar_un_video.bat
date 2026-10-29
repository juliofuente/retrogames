@echo off
rem Prueba rapida: un solo video de un pack, sin preguntar nada (para ver que todo funciona).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --web https://educativos.juegosboom.com --puzles emojimates --idioma es --hasta 1 --rehacer --salida prueba
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
