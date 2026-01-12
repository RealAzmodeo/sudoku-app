@echo off
TITLE Sudoku Project Starter
COLOR 0A

echo ==========================================
echo    INICIANDO PROYECTO SUDOKU (Backend + Mobile)
echo ==========================================

:: Iniciar el Backend en una nueva ventana
echo [1/2] Iniciando Servidor Backend (API + DB)...
start "Sudoku Backend" cmd /k "cd sudoku-backend && echo Instalando dependencias backend... && npm install && echo Levantando servidor... && npm start"

:: Esperar un momento para que el backend empiece a levantar
timeout /t 3 /nobreak > nul

:: Iniciar el Mobile (Expo) en una nueva ventana
echo [2/2] Iniciando App Mobile (Expo)...
start "Sudoku Mobile" cmd /k "cd sudoku-mobile && echo Instalando dependencias mobile... && npm install && echo Levantando Expo... && npm start"

echo ==========================================
echo    TODO LISTO!
echo    Las ventanas de terminal se mantendran
echo    abiertas para que veas los logs.
echo ==========================================
pause
