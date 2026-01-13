// CSS Styles
const SVN_STYLES = `
    #svn-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 100000;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    }
    #svn-modal {
        background: white; width: 100%; max-width: 550px;
        margin: 20px; padding: 0; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
    }
    #svn-header {
        background: #f1f5f9; padding: 15px 20px; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center;
    }
    #svn-header h3 { margin: 0; color: #334155; font-size: 18px; font-weight: 600; }
    #svn-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    
    #svn-body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    
    .svn-field { display: flex; flex-direction: column; gap: 5px; }
    .svn-field label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    .svn-input { 
        padding: 8px 12px !important; 
        border: 1px solid #cbd5e1 !important; 
        border-radius: 4px !important; 
        font-size: 14px !important; 
        width: 100% !important; 
        box-sizing: border-box !important; 
        transition: border 0.2s !important;
        height: 40px !important;
        line-height: 1.5 !important;
        display: block !important;
        color: #334155 !important;
        background-color: white !important;
    }
    select.svn-input {
        appearance: auto !important;
        -webkit-appearance: auto !important;
    }
    .svn-input:focus { border-color: #3b82f6 !important; outline: none !important; }
    .svn-input[readonly] { background: #f8fafc !important; color: #64748b !important; }

        #svn-footer {
            padding: 20px 25px !important; border-top: 1px solid #e2e8f0 !important; background: #fff !important;
            display: flex !important; justify-content: flex-end !important; gap: 12px !important; align-items: center !important;
        }    .btn { 
        padding: 0 25px !important; 
        border-radius: 5px !important; 
        font-size: 14px !important; 
        font-weight: 600 !important; 
        cursor: pointer !important; 
        border: none !important; 
        transition: all 0.2s !important; 
        height: 42px !important;
        line-height: 42px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
    }
    .btn-cancel { background: #fff; border: 1px solid #cbd5e1; color: #475569; }
    .btn-cancel:hover { background: #f1f5f9; }
    .btn-confirm { background: #22c55e; color: white; box-shadow: 0 2px 5px rgba(34, 197, 94, 0.3); }
    .btn-confirm:hover { background: #16a34a; transform: translateY(-1px); }
    .btn-confirm:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }

    #svn-status { font-size: 13px; color: #64748b; margin-right: auto; }
    .error-msg { color: #ef4444 !important; }
    .success-msg { color: #22c55e !important; }
`;

function injectStyles() {
    if (document.getElementById('svn-styles')) return;
    const style = document.createElement('style');
    style.id = 'svn-styles';
    style.innerHTML = SVN_STYLES;
    document.head.appendChild(style);
}

function createModal() {
    if (document.getElementById('svn-overlay')) return;

    const html = `
        <div id="svn-overlay" style="display:none">
            <div id="svn-modal">
                <div id="svn-header">
                    <h3>Criar Branch SVN</h3>
                    <button id="svn-close">&times;</button>
                </div>
                <div id="svn-body">
                    <div style="display: flex; gap: 15px;">
                        <div class="svn-field" style="flex: 1;">
                            <label>Tarefa (ID)</label>
                            <input id="svn-task" class="svn-input" readonly>
                        </div>
                        <div class="svn-field" style="flex: 1;">
                            <label>Versão Destino</label>
                            <input id="svn-version" class="svn-input">
                        </div>
                    </div>

                    <div class="svn-field">
                        <label>Basear na Tag (Ano <span id="svn-year-display"></span>)</label>
                        <select id="svn-tags" class="svn-input">
                            <option value="">Carregando...</option>
                        </select>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                            Selecione a tag de origem. Se vazio, usará o Trunk.
                        </div>
                    </div>
                </div>
                <div id="svn-footer">
                    <div id="svn-status"></div>
                    <button id="svn-cancel" class="btn btn-cancel">Cancelar</button>
                    <button id="svn-submit" class="btn btn-confirm">CRIAR BRANCH</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    // Event Listeners
    document.getElementById('svn-close').onclick = closeModal;
    document.getElementById('svn-cancel').onclick = closeModal;
    document.getElementById('svn-overlay').onclick = (e) => {
        if (e.target.id === 'svn-overlay') closeModal();
    };
    document.getElementById('svn-submit').onclick = submitForm;
}

function openModal() {
    createModal();
    const taskId = window.location.pathname.split('/').pop();
    const versionEl = document.querySelector('.fixed-version.attribute .value');
    const version = versionEl ? versionEl.textContent.trim().split(' ')[0] : "";
    
    // Extrai ano
    let year = new Date().getFullYear();
    const match = version.match(/^(\d{4})/);
    if (match) year = match[1];

    // Preenche campos
    document.getElementById('svn-task').value = taskId;
    document.getElementById('svn-version').value = version;
    document.getElementById('svn-year-display').innerText = year;
    document.getElementById('svn-overlay').style.display = 'flex';
    
    // Busca Tags
    loadTags(year);
}

function closeModal() {
    document.getElementById('svn-overlay').style.display = 'none';
}

function loadTags(year) {
    const select = document.getElementById('svn-tags');
    const status = document.getElementById('svn-status');
    
    select.innerHTML = '<option value="">Carregando tags...</option>';
    select.disabled = true;
    status.innerText = "Conectando ao servidor local...";

    fetch(`http://localhost:3000/list-tags?year=${year}`)
        .then(r => r.json())
        .then(data => {
            select.innerHTML = '<option value="">-- Trunk (Padrão) --</option>';
            
            if (data.error) {
                status.className = 'error-msg';
                status.innerText = "Erro no SVN: " + data.details;
                return;
            }

            if (data.tags && data.tags.length > 0) {
                data.tags.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.value;
                    opt.innerText = t.label;
                    select.appendChild(opt);
                });
                status.innerText = `${data.tags.length} tags carregadas.`;
            } else {
                status.innerText = "Nenhuma tag encontrada neste ano.";
            }
        })
        .catch(err => {
            status.className = 'error-msg';
            status.innerText = "Erro: Servidor Node não está rodando.";
            select.innerHTML = '<option value="">Falha na conexão</option>';
        })
        .finally(() => {
            select.disabled = false;
        });
}

function submitForm() {
    const taskId = document.getElementById('svn-task').value;
    const version = document.getElementById('svn-version').value;
    const sourceTag = document.getElementById('svn-tags').value;
    const year = document.getElementById('svn-year-display').innerText;
    const btn = document.getElementById('svn-submit');
    const status = document.getElementById('svn-status');

    if (!taskId || !version) {
        alert("Preencha a versão e o ID da tarefa.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Processando...";
    status.className = '';
    status.innerText = "Enviando comando SVN...";

    fetch("http://localhost:3000/create-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, version, sourceTag, year })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            status.className = 'success-msg';
            status.innerText = "Branch criada com sucesso!";
            alert("✅ Sucesso!\n" + data.url);
            closeModal();
        } else {
            status.className = 'error-msg';
            status.innerText = "Erro: " + (data.details || "Desconhecido");
            alert("Erro:\n" + (data.details || "Verifique o console do servidor"));
        }
    })
    .catch(() => {
        status.className = 'error-msg';
        status.innerText = "Erro de conexão.";
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "CRIAR BRANCH";
    });
}

// Inicialização
injectStyles();
setInterval(() => {
    if (!document.getElementById('sky-svn-btn')) {
        const menu = document.querySelector('#content > .contextual');
        if (menu) {
            const btn = document.createElement('a');
            btn.id = 'sky-svn-btn';
            btn.innerHTML = '⚡ Criar Branch';
            btn.className = 'icon icon-add';
            btn.style.cssText = "background-color: #2563eb; color: white !important; padding: 5px 10px 5px 28px; border-radius: 4px; font-weight: 600; cursor: pointer; margin-left: 10px; border: 1px solid #1d4ed8; font-size: 13px;";
            btn.onclick = (e) => { e.preventDefault(); openModal(); };
            menu.prepend(btn);
        }
    }
}, 1000);