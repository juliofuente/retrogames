@echo off
rem Lengua: ortografia (es), ingles para hispanohablantes (es) y spelling (en).
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\lengua.txt web=https://educativos.juegosboom.com,serie=1,desde=1,hasta=30,gancho,final,cta,extra
for %%p in (ortografia ingles spelling) do %G% --opciones opciones\lengua.txt --puzles %%p
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
