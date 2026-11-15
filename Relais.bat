@echo off
cd /d "%~dp0"
where node >nul 2>nul || goto sansnode
where claude >nul 2>nul || echo Attention : la commande claude est introuvable. Installe Claude Code pour lancer les etapes.
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

:sansnode
echo Relais a besoin de Node.js. Installe-le depuis https://nodejs.org puis relance Relais.bat.
pause
goto :eof

:erreur
popd
echo L'installation de l'interface a echoue. Verifie que Node.js et npm sont installes.
pause
