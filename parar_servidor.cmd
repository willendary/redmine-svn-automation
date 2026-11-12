@echo off
rem Para o servidor do Sky Redmine Workspace (processo node na porta 3000).
setlocal
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":3000" ^| findstr /C:"LISTENING"') do (
    tasklist /FI "PID eq %%p" /NH 2>nul | findstr /C:"node.exe" >nul
    if not errorlevel 1 (
        echo Encerrando servidor ^(PID %%p^)...
        taskkill /PID %%p /F >nul 2>nul
    )
)
echo Servidor encerrado.
endlocal
