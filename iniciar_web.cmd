@echo off
setlocal
title Sky Redmine Workspace
cd /d "%~dp0server"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js nao encontrado. Instale Node.js 24 ou superior.
    pause
    exit /b 1
)
if not exist "node_modules\express" (
    echo Instalando dependencias...
    call npm ci
    if errorlevel 1 (
        pause
        exit /b 1
    )
)
echo.
echo Sky Redmine Workspace
echo Acesse http://localhost:3000 no navegador.
echo Mantenha esta janela aberta enquanto usa o sistema.
echo.
call npm start
if errorlevel 1 pause
endlocal
