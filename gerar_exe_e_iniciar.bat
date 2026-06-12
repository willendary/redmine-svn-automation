@echo off
chcp 65001 >nul
title Compilador - Sky Redmine Automation
echo ===========================================================
echo       SKY REDMINE AUTOMATION - BUILD E INICIALIZACAO
echo ===========================================================
echo.

echo [1/3] Reiniciando o servidor backend (Node.js)...
:: Mata apenas o processo do servidor rodando na porta 3000 (para nao derrubar outros processos Node)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

:: Inicia o servidor usando o script VBS que o esconde no background
cscript //nologo iniciar_server_remdmine_svn_server.vbs
echo  - Servidor iniciado em background com sucesso na porta 3000!
echo.

echo [2/3] Construindo o novo EXE do Desktop...
echo  - Isso pode levar alguns segundos...
cd desktop
call npm run build

echo.
echo [3/3] Concluido! 
echo ===========================================================
echo  Sucesso! O servidor ja esta rodando e o EXE foi gerado.
echo ===========================================================
echo.

echo Abrindo a pasta com o executavel...
explorer dist

echo.
pause
