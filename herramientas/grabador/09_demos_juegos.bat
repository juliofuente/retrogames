@echo off
rem Demos de los juegos de una web (el juego jugando solo, con cartela de entrada y salida).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\demos.txt web=https://mobilehits.juegosboom.com,idioma=es,formato=vertical,solo,duracion=75,musica,paralelo=2
%G% --opciones opciones\demos.txt
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
