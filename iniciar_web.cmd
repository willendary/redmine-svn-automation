@echo off
rem Inicia o Sky Redmine Workspace oculto (sem janela de console).
rem Log do servidor: server\servidor.log
rem Para parar: parar_servidor.cmd
setlocal
cd /d "%~dp0"
start "" wscript "%~dp0iniciar_web_oculto.vbs"
endlocal
