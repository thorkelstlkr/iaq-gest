@echo off
chcp 65001 >nul
title Gestio de l'associacio (no tanquis aquesta finestra)
rem Inicia l'aplicacio de gestio i l'obre al navegador.
rem Si s'ha actualitzat el programa, instal-la les dependencies noves i torna a compilar la interficie.
cd /d "%~dp0"
set "NODE_OPTS=--disable-warning=ExperimentalWarning"

where node >nul 2>nul
if errorlevel 1 (
  echo No s'ha trobat Node.js en aquest ordinador.
  echo Instal-la la versio LTS des de https://nodejs.org i torna a obrir aquest fitxer.
  start "" https://nodejs.org
  pause
  goto :eof
)

rem 1. Dependencies: la primera vegada, o si package-lock.json ha canviat des de la darrera instal-lacio.
node %NODE_OPTS% scripts\cal-compilar.ts dependencies
if not errorlevel 1 goto :compilacio
echo Instal-lant dependencies (cal connexio a Internet)...
call npm install
if errorlevel 1 (
  if not exist node_modules goto :error
  echo AVIS: no s'han pogut actualitzar les dependencies. Es continua amb les que hi ha.
) else (
  node %NODE_OPTS% scripts\cal-compilar.ts desa-dependencies
)

:compilacio
rem 2. Interficie: es compila si els fonts (src, shared...) son mes nous que la darrera compilacio.
node %NODE_OPTS% scripts\cal-compilar.ts interficie
if not errorlevel 1 goto :copia
echo Preparant l'aplicacio (pot trigar un minut)...
call npm run build
if errorlevel 1 (
  if not exist dist\index.html goto :error
  echo AVIS: no s'ha pogut compilar la versio nova de la interficie. S'obre l'anterior.
) else (
  node %NODE_OPTS% scripts\cal-compilar.ts desa-interficie
)

:copia
rem 3. Si la versio del programa ha canviat, copia de seguretat abans d'obrir la base de dades.
node %NODE_OPTS% scripts\cal-compilar.ts copia-versio

rem Obre el navegador uns segons despres, quan el servidor ja esta en marxa.
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
echo.
echo L'aplicacio esta en marxa a http://localhost:3000
echo Per aturar-la, tanca aquesta finestra.
echo.
call npm start
goto :eof

:error
echo.
echo Hi ha hagut un error. Comprova que Node.js 22.18 o superior esta instal-lat
echo i que tens connexio a Internet la primera vegada.
pause
