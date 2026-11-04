@echo off
rem Partidas de ejemplo de los puzles orientales: el tablero, unos segundos para pensar y la solucion paso a paso.
rem Cambia la lista del «for» para grabar otros (los 38 estan en LEEME.txt).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\partidas_orientales.txt web=https://orientales.juegosboom.com,idioma=ambos,formato=vertical,desde=1,hasta=5,espera,gancho,cta,extra,siguenos
for %%p in (sudoku nonograma numberlink hashi kakuro futoshiki takuzu kenken rascacielos slitherlink masyu akari estrellas tiendas) do %G% --opciones opciones\partidas_orientales.txt --puzles %%p
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
