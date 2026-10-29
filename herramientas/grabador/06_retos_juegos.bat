@echo off
rem Retos con solucion de los juegos del motor: Atasco, Jarras, Ranas, Apagon y Clavijas.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\retos.txt web=https://juegosboom.com,idioma=ambos,desde=1,hasta=10,espera,gancho,cta,extra,siguenos
for %%p in (atasco jarras ranas apagon clavijas) do %G% --opciones opciones\retos.txt --puzles %%p
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
