Set WshShell = CreateObject("WScript.Shell")

' 1. Mata apenas o processo do servidor na porta 3000 para evitar duplicidade e nao fechar outros sistemas
On Error Resume Next
strKillCmd = "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| find "":3000"" ^| find ""LISTENING""') do taskkill /f /pid %a"
WshShell.Run strKillCmd, 0, True
On Error GoTo 0

' Pequena pausa para garantir a liberação da porta
WScript.Sleep 1000

' 2. Configurações de caminho
strPath = "D:\Dados\Projetos\React\redmine-svn-automation\server"
strCommand = "cmd /c cd /d " & strPath & " && node server.js"

' 3. Inicia o servidor oculto (0 = Hide Window)
WshShell.Run strCommand, 0, False
Set WshShell = Nothing
