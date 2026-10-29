@echo off
rem Retos de cerillas (269): en ingles por defecto, 45 segundos para pensar.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\cerillas.txt web=https://mobilehits.juegosboom.com,idioma=en,desde=1,hasta=269,espera=45,gancho,final,cta,extra,siguenos
%G% --opciones opciones\cerillas.txt --puzles cerillas
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
