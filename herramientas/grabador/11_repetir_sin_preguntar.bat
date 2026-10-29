@echo off
rem Repite los educativos de una pregunta con las opciones guardadas la ultima vez (sin preguntar nada: vale para una tarea programada). Cambia --desde/--hasta para seguir por donde ibas.
chcp 65001 >nul
cd /d "%~dp0"
rem Game2Video.exe (compilar.bat) o, si no está, «dotnet run»
set "G=Game2Video.exe"
if not exist Game2Video.exe set "G=dotnet run -c Release --"
if not exist opciones mkdir opciones
if not exist opciones\educativos.txt (echo Primero ejecuta 01_educativos_1_pregunta.bat & pause & exit /b)
for %%p in (secuencias problemas emojimates calculo balanza ortografia spelling ingles) do %G% --opciones opciones\educativos.txt --puzles %%p --desde 21 --hasta 40
echo.
echo Terminado. Los videos estan en la carpeta de salida (por defecto «videos»).
pause
