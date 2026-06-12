const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// --- SEGURANÇA TOTALMENTE DESATIVADA PARA INTEGRACAO ---
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessNonSecureContextsAllowed');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-site-isolation-trials');

app.name = 'Sky Redmine Desktop';
const REDMINE_URL = 'https://redmine.skyinformatica.com.br';

const isPackaged = app.isPackaged;
const baseDir = __dirname;
const rootDir = isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked') : path.join(baseDir, '..');

const extensionPath = isPackaged ? path.join(process.resourcesPath, 'extension') : path.join(rootDir, 'extension');
const serverPath = isPackaged ? path.join(process.resourcesPath, 'server') : path.join(rootDir, 'server');
const iconPath = isPackaged ? path.join(process.resourcesPath, 'images', 'logo.png') : path.join(rootDir, 'images', 'logo.png');

let mainWindow;
let serverProcess = null;

function startBackend() {
    const serverFile = path.join(serverPath, 'server.js');
    const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node';
    serverProcess = spawn(nodeBin, [serverFile], { cwd: serverPath, stdio: 'pipe', shell: true });
    serverProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Backend ERROR]: ${data}`));
}

function getInjectionCode() {
    const srcPath = path.join(extensionPath, 'src');
    const optionsHtmlPath = path.join(extensionPath, 'options.html');
    const optionsJsPath = path.join(extensionPath, 'options.js');
    let optionsHtml = fs.existsSync(optionsHtmlPath) ? fs.readFileSync(optionsHtmlPath, 'utf8') : '';
    let optionsJs = fs.existsSync(optionsJsPath) ? fs.readFileSync(optionsJsPath, 'utf8') : '';
    optionsHtml = optionsHtml.replace(/`/g, '\\`').replace(/\r\n/g, '').replace(/\n/g, '');

    let combinedCode = `
        // SHIM STORAGE
        window.chrome = window.chrome || {};
        window.isSkyDesktop = true;
        window.chrome.storage = {
            sync: {
                get: (defaults, callback) => {
                    const items = {};
                    for (let key in defaults) {
                        const saved = localStorage.getItem('sky_config_' + key);
                        try { items[key] = saved !== null ? JSON.parse(saved) : defaults[key]; } catch (e) { items[key] = defaults[key]; }
                    }
                    if (callback) callback(items);
                },
                set: (items, callback) => {
                    for (let key in items) { localStorage.setItem('sky_config_' + key, JSON.stringify(items[key])); }
                    if (callback) callback();
                }
            }
        };

        function abrirPainelOpcoes() {
            let overlay = document.getElementById('sky-options-overlay');
            if (overlay) { overlay.style.display = 'flex'; return; }
            overlay = document.createElement('div');
            overlay.id = 'sky-options-overlay';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:999999; display:flex; justify-content:center; align-items:center; color: #333;";
            const modal = document.createElement('div');
            modal.style.cssText = "background:white; padding:20px; border-radius:8px; width:80%; max-width:600px; max-height:90vh; overflow:auto; position:relative;";
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = "position:absolute; right:15px; top:10px; border:none; background:none; font-size:28px; cursor:pointer; color:#94a3b8;";
            closeBtn.onclick = () => { overlay.style.display = 'none'; };
            const content = document.createElement('div');
            content.innerHTML = \`${optionsHtml}\`;
            modal.appendChild(closeBtn);
            modal.appendChild(content);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            const scriptEl = document.createElement('script');
            scriptEl.textContent = \`(function() { ${optionsJs}; if (typeof restaurarOpcoes === 'function') restaurarOpcoes(); })();\`;
            modal.appendChild(scriptEl);
        }

        async function abrirPainelLogs() {
            let overlay = document.getElementById('sky-logs-overlay');
            if (overlay) { 
                overlay.style.display = 'flex'; 
                atualizarLogs();
                return; 
            }
            overlay = document.createElement('div');
            overlay.id = 'sky-logs-overlay';
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:999999; display:flex; justify-content:center; align-items:center; color: #fff;";
            const modal = document.createElement('div');
            modal.style.cssText = "background:#1e1e1e; padding:20px; border-radius:8px; width:90%; max-width:900px; height:80vh; overflow:hidden; position:relative; display:flex; flex-direction:column;";
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = "position:absolute; right:15px; top:10px; border:none; background:none; font-size:28px; cursor:pointer; color:#94a3b8;";
            closeBtn.onclick = () => { overlay.style.display = 'none'; };
            const title = document.createElement('h2');
            title.textContent = 'Logs do Sistema (SVN / Backend)';
            title.style.margin = '0 0 10px 0';
            const content = document.createElement('div');
            content.id = 'sky-logs-content';
            content.style.cssText = "flex:1; overflow-y:auto; font-family:monospace; background:#000; padding:10px; border:1px solid #333; color:#0f0; white-space:pre-wrap;";
            
            const btnRefresh = document.createElement('button');
            btnRefresh.textContent = 'Atualizar Logs';
            btnRefresh.style.cssText = "margin-top:10px; padding:8px; background:#0369a1; color:#fff; border:none; cursor:pointer; border-radius:4px;";
            btnRefresh.onclick = atualizarLogs;

            modal.appendChild(closeBtn);
            modal.appendChild(title);
            modal.appendChild(content);
            modal.appendChild(btnRefresh);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            atualizarLogs();

            async function atualizarLogs() {
                try {
                    const res = await fetch('http://localhost:3000/logs');
                    const data = await res.json();
                    document.getElementById('sky-logs-content').textContent = data.logs.join('\\n');
                    document.getElementById('sky-logs-content').scrollTop = document.getElementById('sky-logs-content').scrollHeight;
                } catch(e) {
                    document.getElementById('sky-logs-content').textContent = 'Erro ao buscar logs do backend: ' + e.message;
                }
            }
        }

        function injetarBotaoOpcoes() {
            if (document.getElementById('sky-options-btn')) return;
            const topMenu = document.querySelector('#top-menu > ul');
            if (topMenu) {
                const liLogs = document.createElement('li');
                liLogs.innerHTML = '<a id="sky-logs-btn" href="#" style="background: #ef4444; color: white !important; border-radius: 4px; padding: 2px 10px !important; margin-left: 10px; font-weight: bold;">📝 Logs Sky</a>';
                liLogs.onclick = (e) => { e.preventDefault(); abrirPainelLogs(); };
                topMenu.appendChild(liLogs);

                const li = document.createElement('li');
                li.innerHTML = '<a id="sky-options-btn" href="#" style="background: #0369a1; color: white !important; border-radius: 4px; padding: 2px 10px !important; margin-left: 10px; font-weight: bold;">⚙ Config Sky</a>';
                li.onclick = (e) => { e.preventDefault(); abrirPainelOpcoes(); };
                topMenu.appendChild(li);
            }
        }
        setInterval(injetarBotaoOpcoes, 2000);
    `;

    const files = ['estilos.js', 'api_redmine.js', 'relogio_sky.js', 'principal.js'];
    files.forEach(fileName => {
        const filePath = path.join(srcPath, fileName);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(/localhost:3000/g, '127.0.0.1:3000');
            combinedCode += `\n\n/* --- ${fileName} --- */\n${content}`;
        }
    });
    return combinedCode;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    title: 'Sky Redmine Desktop',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#f8fafc', // Define a cor de fundo nativa para evitar flash branco
    webPreferences: {
      partition: 'persist:sky-redmine',
      nodeIntegration: false,
      contextIsolation: false, // FACILITA A COMUNICACAO
      webSecurity: false
    }
  });

  // Remove CSP para permitir tudo
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });

  mainWindow.loadURL(REDMINE_URL);

  mainWindow.webContents.on('dom-ready', async () => {
    // 1. Oculta a interface padrão imediatamente para evitar que o usuário veja o Redmine "feio"
    await mainWindow.webContents.insertCSS('html { opacity: 0; }');

    // 2. Prepara o código e adiciona a lógica de revelação suave
    const code = `(function() { 
        ${getInjectionCode()} 
        
        // 3. Revela a interface suavemente APÓS os estilos serem aplicados
        requestAnimationFrame(() => {
            const style = document.createElement('style');
            style.textContent = 'html { opacity: 1 !important; transition: opacity 0.4s ease-out; }';
            document.head.appendChild(style);
        });
    })();`;

    mainWindow.webContents.executeJavaScript(code).catch(e => {
        console.error(e);
        // Fallback: Se der erro, mostra a página para não travar tudo
        mainWindow.webContents.insertCSS('html { opacity: 1 !important; }');
    });
  });
}

app.whenReady().then(() => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (serverProcess) spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    if (process.platform !== 'darwin') app.quit();
});
