@echo off
rem Baja (o vuelve a bajar) los juegos de GitHub a la carpeta «juegos». Hazlo cuando subas juegos nuevos o cambios.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --solo-bajar
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
