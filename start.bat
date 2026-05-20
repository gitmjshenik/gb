@echo off
cd /d "%~dp0"
echo WeatherGuru запускается...
echo Откройте в браузере: http://localhost:8080
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%NODE_EXE%" (
  "%NODE_EXE%" "%~dp0server.js"
) else (
  echo Не найден Node.js. Можно открыть index.html напрямую, но часть функций браузера может быть ограничена.
  pause
)
