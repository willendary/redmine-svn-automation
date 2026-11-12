' ============================================================
' Sky Redmine Workspace - iniciador oculto (sem janela)
' - Dois cliques aqui (ou via iniciar_web.cmd) sobem o
'   servidor em segundo plano, sem janela de console.
' - Se o servidor ja estiver no ar, apenas abre o navegador.
' - Saida e erros vao para server\servidor.log
' - Para parar: executar parar_servidor.cmd
' - Uso para teste sem abrir o navegador:
'     wscript "iniciar_web_oculto.vbs" sem-navegador
' ============================================================
Option Explicit

Dim shell, fso, pasta, serverDir, logFile, comNavegador

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
serverDir = fso.BuildPath(pasta, "server")
logFile = fso.BuildPath(serverDir, "servidor.log")
comNavegador = True
If WScript.Arguments.Count > 0 Then
    If LCase(WScript.Arguments(0)) = "sem-navegador" Then comNavegador = False
End If

' Node.js presente?
If shell.Run("cmd /c where node >nul 2>nul", 0, True) <> 0 Then
    MsgBox "Node.js nao encontrado. Instale o Node.js 24 ou superior.", vbExclamation, "Sky Redmine Workspace"
    WScript.Quit 1
End If

' Dependencias instaladas?
If Not fso.FolderExists(fso.BuildPath(serverDir, "node_modules\express")) Then
    MsgBox "Dependencias nao encontradas. Rode: npm ci --prefix server", vbExclamation, "Sky Redmine Workspace"
    WScript.Quit 1
End If

' Ja esta no ar? So abre o navegador.
If ServidorNoAr() Then
    If comNavegador Then AbrirNavegador
    WScript.Quit 0
End If

shell.CurrentDirectory = serverDir
shell.Run "cmd /c node ""server.js"" >> """ & logFile & """ 2>&1", 0, False

Dim i
For i = 1 To 20
    WScript.Sleep 500
    If ServidorNoAr() Then Exit For
Next
If comNavegador Then AbrirNavegador

Sub AbrirNavegador()
    shell.Run "rundll32 url.dll,FileProtocolHandler http://localhost:3000", 0, False
End Sub

Function ServidorNoAr()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.XMLHTTP.6.0")
    http.setTimeout = 800
    http.Open "GET", "http://127.0.0.1:3000/", False
    http.Send
    ServidorNoAr = (http.Status = 200)
    Err.Clear
    On Error GoTo 0
End Function
