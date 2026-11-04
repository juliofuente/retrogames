@echo off
rem Videos «como se juega» de los puzles orientales (sudoku, nonograma, hashi, kakuro, slitherlink...).
rem En «solo» puedes poner unos pocos separados por comas (sudoku,hashi) o dejarlo vacio para todos.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\tutoriales_orientales.txt web=https://orientales.juegosboom.com,idioma=ambos,formato=vertical,solo,jugadas=6,lectura=1,gancho,cta,extra,url
%G% --opciones opciones\tutoriales_orientales.txt --tutoriales
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
