@echo off
chcp 65001 >nul
title Actualitzar el programa de gestio
rem Actualitza el programa a la darrera versio sense tocar les dades (carpeta data\).
rem
rem  - Si aquesta carpeta es una copia de Git, descarrega els canvis amb «git pull».
rem  - Si no, descarrega el ZIP de la versio nova i descomprimeix-lo DAMUNT d'aquesta carpeta
rem    (substituint els fitxers); la carpeta data\ no ve al ZIP i es conserva.
rem  - Despres instal-la les dependencies i compila la interficie. Abans d'obrir la base de dades
rem    amb la versio nova, Iniciar.bat en fa una copia de seguretat a data\copies.
cd /d "%~dp0"
set "NODE_OPTS=--disable-warning=ExperimentalWarning"

echo Abans de continuar, tanca la finestra del programa si esta obert.
pause

where node >nul 2>nul
if errorlevel 1 (
  echo No s'ha trobat Node.js. Instal-la la versio LTS des de https://nodejs.org
  pause
  goto :eof
)

if exist .git (
  where git >nul 2>nul
  if errorlevel 1 (
    echo Aquesta carpeta es de Git pero Git no esta instal-lat: instal-la'l o actualitza amb el ZIP.
    pause
    goto :eof
  )
  echo Descarregant la versio nova...
  git pull --ff-only
  if errorlevel 1 (
    echo No s'ha pogut actualitzar amb Git. Hi ha canvis locals o no hi ha connexio.
    pause
    goto :eof
  )
) else (
  echo Aquesta carpeta no es una copia de Git.
  echo Descomprimeix el ZIP de la versio nova damunt d'aquesta carpeta i torna a executar aquest fitxer,
  echo o simplement obre Iniciar.bat: detecta els canvis i ho prepara tot.
)

echo Copia de seguretat abans d'actualitzar...
node %NODE_OPTS% scripts\cal-compilar.ts copia-versio

echo Instal-lant dependencies...
call npm install
if errorlevel 1 goto :error
node %NODE_OPTS% scripts\cal-compilar.ts desa-dependencies

echo Compilant la interficie...
call npm run build
if errorlevel 1 goto :error
node %NODE_OPTS% scripts\cal-compilar.ts desa-interficie

echo.
echo Actualitzacio completada. Obre Iniciar.bat per fer servir el programa.
pause
goto :eof

:error
echo.
echo Hi ha hagut un error durant l'actualitzacio. Les dades no s'han modificat.
echo Comprova la connexio a Internet i torna-ho a provar.
pause
