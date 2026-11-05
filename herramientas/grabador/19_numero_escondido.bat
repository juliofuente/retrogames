@echo off
rem El número escondido (8 × ? − 5 = 27): de una pregunta y de cinco, en los dos idiomas (con .title y .descrip).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\escondido.txt web=https://educativos.juegosboom.com,idioma=ambos,desde=1,hasta=20,gancho,final,cta,extra
for %%s in (1 5) do %G% --opciones opciones\escondido.txt --puzles escondido --serie %%s
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
