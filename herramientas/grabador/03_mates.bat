@echo off
rem Solo mates: problemas de Primaria, emojis, calculo mental y balanzas.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
%G% --preguntar opciones\mates.txt web=https://educativos.juegosboom.com,idioma=es,serie=1,desde=1,hasta=30,gancho,final,cta,extra
for %%p in (problemas emojimates calculo balanza) do %G% --opciones opciones\mates.txt --puzles %%p
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
