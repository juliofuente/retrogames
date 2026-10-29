@echo off
rem Crea Game2Video.exe en esta carpeta (necesita el SDK de .NET 8). Despues los .bat lo usan directamente.
cd /d "%~dp0"
dotnet publish ArcadeRecorder.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -o .
pause
