Set WshShell = CreateObject("WScript.Shell")

' 1. Mata processos Node antigos para evitar duplicidade
' O comando taskkill retorna erro se não achar nada, então usamos "On Error Resume Next"
On Error Resume Next
WshShell.Run "taskkill /f /im node.exe", 0, True
On Error GoTo 0

' Pequena pausa para garantir a liberação da porta
WScript.Sleep 1000

' 2. Configurações de caminho
strPath = "D:\Dados\Projetos\React\redmine-svn-automation\server"
strCommand = "cmd /c cd /d " & strPath & " && node server.js"

' 3. Inicia o servidor oculto (0 = Hide Window)
WshShell.Run strCommand, 0, False
Set WshShell = Nothing
