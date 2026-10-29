@echo off
rem Eliges un pack y cuantas preguntas por video; luego pregunta las opciones.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
echo Packs: secuencias problemas emojimates calculo balanza ortografia spelling ingles
echo Juegos: cerillas atasco jarras ranas apagon clavijas
set "PACK=emojimates"
set /p "PACK=Pack o juego [%PACK%]: "
%G% --preguntar opciones\%PACK%.txt web=https://educativos.juegosboom.com,idioma=ambos,serie=1,desde=1,hasta=10,espera,gancho,pregunta,final,cta,extra,url
%G% --opciones opciones\%PACK%.txt --puzles %PACK%
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
