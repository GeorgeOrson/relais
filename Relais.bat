@echo off
cd /d "%~dp0"
rem Au premier lancement, installe et compile l'interface (web\dist).
if not exist "web\dist\index.html" (
  echo Premiere installation de l'interface, une minute...
  pushd web
  call npm ci || goto erreur
  call npm run build || goto erreur
  popd
)
node server.js || pause
goto :eof

:erreur
popd
echo L'installation de l'interface a echoue. Verifie que Node.js et npm sont installes.
pause
