// CSS Styles
const SVN_STYLES = `
    #svn-overlay, #sky-timer-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 100000;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    }
    #svn-modal, #sky-timer-modal {
        background: white; width: 100%; max-width: 550px;
        margin: 20px; padding: 0; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
    }
    #svn-header, #sky-timer-header {
        background: #f1f5f9; padding: 15px 20px; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center;
    }
    #svn-header h3, #sky-timer-header h3 { margin: 0; color: #334155; font-size: 18px; font-weight: 600; }
    #svn-close, #sky-timer-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    
    #svn-body, #sky-timer-body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    
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

    #svn-footer, #sky-timer-footer {
        padding: 15px 20px !important; border-top: 1px solid #e2e8f0 !important; background: #fff !important;
        display: flex !important; justify-content: flex-end !important; gap: 10px !important; align-items: center !important;
        min-height: 70px !important;
    }
    .btn { 
        padding: 0 20px !important; 
        border-radius: 5px !important; 
        font-size: 13px !important; 
        font-weight: 600 !important; 
        cursor: pointer !important; 
        border: none !important; 
        transition: all 0.2s !important; 
        height: 36px !important;
        line-height: 36px !important;
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
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #dc2626; }

    #svn-status, #sky-timer-status { font-size: 13px; color: #64748b; margin-right: auto; }
    .error-msg { color: #ef4444 !important; }
    .success-msg { color: #22c55e !important; }

    /* Timer Widget Styles */
    #sky-timer-widget {
        background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px 15px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    #sky-timer-display {
        font-family: 'Courier New', monospace;
        font-size: 24px;
        font-weight: bold;
        color: #334155;
        min-width: 120px;
        text-align: center;
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 2px 10px;
        border-radius: 4px;
    }
    .sky-timer-btn {
        width: 36px; height: 36px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex; justify-content: center; align-items: center;
        transition: transform 0.1s;
    }
    .sky-timer-btn:active { transform: scale(0.95); }
    .sky-btn-play { background: #22c55e; color: white; }
    .sky-btn-stop { background: #ef4444; color: white; }
    .sky-blink { animation: sky-blink 1s infinite; }
    @keyframes sky-blink { 50% { opacity: 0.5; } }

    /* My Page List Styles */
    .sky-list-action {
        margin-right: 8px; cursor: pointer; text-decoration: none; border: none; background: none; font-size: 14px;
        vertical-align: middle; display: inline-block; width: 20px; text-align: center;
    }
    .sky-list-timer {
        font-family: monospace; font-weight: bold; color: #166534; background: #dcfce7;
        padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 8px; vertical-align: middle;
    }
    .sky-row-active {
        background-color: #f0fdf4 !important; /* Green highlight for active task */
        border-left: 3px solid #22c55e;
    }
    .sky-copy-list-btn {
        opacity: 0.3; transition: opacity 0.2s; margin-left: 5px; cursor: pointer;
    }
    tr:hover .sky-copy-list-btn { opacity: 1; }
`;

// --- Redmine API & Logic (SkyRMTT Core) ---
const REDMINE_CONSTANTS = {
    STATUS: {
        NEW: 1,
        IN_PROGRESS: 2,
        RESOLVED: 3,
        CLOSED: 5
    }
};

const RedmineService = {
    getCsrfToken: () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    },
    
    getCurrentUserId: () => {
        const userLink = document.querySelector('#loggedas a');
        return userLink ? userLink.getAttribute('href').split('/').pop() : null;
    },

    updateIssue: async (issueId, payload) => {
        const token = RedmineService.getCsrfToken();
        if (!token) throw new Error("CSRF Token não encontrado");

        const response = await fetch(`/issues/${issueId}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': '', // Usa sessão do browser
                'X-CSRF-Token': token
            },
            body: JSON.stringify({ issue: payload })
        });

        if (!response.ok) throw new Error(`Erro API: ${response.status}`);
    },

    setStatus: async (issueId, statusId) => {
        return RedmineService.updateIssue(issueId, { status_id: statusId });
    },

    assignToMe: async (issueId) => {
        const userId = RedmineService.getCurrentUserId();
        if (userId) {
            return RedmineService.updateIssue(issueId, { assigned_to_id: userId });
        }
    },

    pauseOtherTasks: async (currentIssueId) => {
        try {
            // Busca tarefas em andamento do usuário atual
            const response = await fetch('/issues.json?assigned_to_id=me&status_id=2', {
                headers: { 'X-Redmine-API-Key': '' } // Sessão do browser
            });
            const data = await response.json();
            
            if (data.issues && data.issues.length > 0) {
                const promises = data.issues.map(issue => {
                    if (issue.id != currentIssueId) {
                        console.log(`[SkyRMTT] Interrompendo tarefa #${issue.id}`);
                        // Define como Interrompida (7) ou Nova (1) se 7 não existir
                        // SkyRMTT usa 7.
                        return RedmineService.setStatus(issue.id, 7); 
                    }
                });
                await Promise.all(promises);
            }
        } catch (e) {
            console.error("Erro ao pausar outras tarefas:", e);
        }
    },

    logTime: async (issueId, hours, comments, activityId = 11) => { // 11 = Dev default?
        const token = RedmineService.getCsrfToken();
        const payload = {
            time_entry: {
                issue_id: issueId,
                hours: hours,
                comments: comments,
                activity_id: activityId,
                spent_on: new Date().toISOString().split('T')[0]
            }
        };

        const response = await fetch(`/time_entries.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Falha ao lançar horas");
    },

    getLoggedHoursToday: async (issueId) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/time_entries.json?issue_id=${issueId}&user_id=me&spent_on=${today}`, {
                headers: { 'X-Redmine-API-Key': '' }
            });
            const data = await response.json();
            
            if (data.time_entries) {
                return data.time_entries.reduce((acc, entry) => acc + entry.hours, 0);
            }
            return 0;
        } catch (e) {
            console.error("Erro ao buscar horas de hoje:", e);
            return 0;
        }
    }
};

const SkyTimer = {
    interval: null,
    startTime: null,
    issueId: null,
    accumulatedOffset: 0, // Horas já lançadas hoje (decimal)

    init: async () => {
        const stored = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const currentIssueId = window.location.pathname.split('/').pop();
        
        // Verifica se estamos na página de detalhes de uma issue
        const isIssuePage = /^\/issues\/\d+$/.test(window.location.pathname);

        // Busca horas já lançadas hoje para exibir no display (apenas se estiver na página da issue)
        if (isIssuePage && currentIssueId && !isNaN(currentIssueId)) {
            SkyTimer.accumulatedOffset = await RedmineService.getLoggedHoursToday(currentIssueId);
            // Atualiza display inicial (apenas acumulado) se não estiver rodando
            if (!stored.running || stored.issueId !== currentIssueId) {
                SkyTimer.updateDisplay();
            }
        }

        // Se tem timer rodando
        if (stored.running) {
            SkyTimer.startTime = stored.startTime;
            SkyTimer.issueId = stored.issueId;
            
            if (stored.issueId === currentIssueId && isIssuePage) {
                SkyTimer.startUI();
            } else {
                // Se estiver rodando em outra tarefa ou página, inicia intervalo global para atualizar listas
                SkyTimer.startGlobalInterval();
            }
        }
    },

    initMyPage: () => {
        SkyTimer.renderMyPage(); // Run immediately
        SkyTimer.startGlobalInterval();
    },

    renderMyPage: async () => {
        const table = document.querySelector('#block-issuesassignedtome table.list.issues');
        if (!table) return;

        const stored = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const activeId = (stored.running && stored.issueId) ? stored.issueId : null;
        const rows = table.querySelectorAll('tr.issue');
        
        for (const row of rows) {
            const id = row.id.replace('issue-', '');
            const subjectCell = row.querySelector('.subject');
            if (!subjectCell) continue;

            // --- 1. Botão Play/Stop ---
            let btn = row.querySelector('.sky-list-action');
            if (!btn) {
                btn = document.createElement('span');
                btn.className = 'sky-list-action';
                subjectCell.prepend(btn);
            }

            const isActive = (activeId === id);

            // Atualiza Estado Visual (Idempotente)
            if (isActive) {
                if (btn.innerHTML !== '■') { // Só atualiza se mudou
                    btn.innerHTML = '&#9632;'; // Stop
                    btn.style.color = '#ef4444';
                    btn.title = "Parar Timer (Tarefa em andamento)";
                    btn.onclick = (e) => { e.stopPropagation(); SkyTimer.stop(); };
                    row.classList.add('sky-row-active');
                    
                    // Timer Display
                    if (!row.querySelector('.sky-list-timer')) {
                        const timerSpan = document.createElement('span');
                        timerSpan.className = 'sky-list-timer';
                        timerSpan.id = `sky-list-timer-${id}`;
                        timerSpan.innerText = "Calculando...";
                        // Insere após o botão
                        btn.after(timerSpan);
                        
                        // Busca offset inicial se necessário
                        if (SkyTimer.accumulatedOffset === 0) {
                             SkyTimer.accumulatedOffset = await RedmineService.getLoggedHoursToday(id);
                        }
                    }
                }
            } else {
                if (btn.innerHTML !== '►') { // Só atualiza se mudou
                    btn.innerHTML = '&#9658;'; // Play
                    btn.style.color = '#22c55e';
                    btn.title = "Iniciar Timer nesta tarefa";
                    btn.onclick = (e) => { 
                        e.stopPropagation(); 
                        if (activeId && activeId !== id) {
                            if(!confirm("Existe outra tarefa em andamento. Deseja parar a anterior e iniciar esta?")) return;
                        }
                        SkyTimer.start(id); 
                    };
                    row.classList.remove('sky-row-active');
                    const existingTimer = row.querySelector('.sky-list-timer');
                    if (existingTimer) existingTimer.remove();
                }
            }

            // --- 2. Botão Copiar ---
            if (!row.querySelector('.sky-copy-list-btn')) {
                const copyBtn = document.createElement('span');
                copyBtn.className = 'sky-copy-list-btn';
                copyBtn.innerHTML = '📋';
                copyBtn.title = "Copiar ID e Título";
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    const text = `T #${id} - ${subjectCell.querySelector('a').innerText}`;
                    navigator.clipboard.writeText(text);
                    const original = copyBtn.innerHTML;
                    copyBtn.innerHTML = '✅';
                    setTimeout(() => copyBtn.innerHTML = original, 1000);
                };
                subjectCell.appendChild(copyBtn);
            }
        }
    },

    start: async (issueId) => {
        // Para qualquer outro timer anterior
        SkyTimer.stopInternal();

        // Atualiza offset ao iniciar para garantir precisão
        SkyTimer.accumulatedOffset = await RedmineService.getLoggedHoursToday(issueId);

        SkyTimer.issueId = issueId;
        SkyTimer.startTime = Date.now();
        localStorage.setItem('sky_timer_state', JSON.stringify({
            running: true,
            issueId: issueId,
            startTime: SkyTimer.startTime
        }));

        if (window.location.pathname.includes('/my/page')) {
            SkyTimer.renderMyPage();
            SkyTimer.startGlobalInterval();
        } else {
            SkyTimer.startUI();
        }
        
        // Automação: Em Andamento + Atribuir para mim + Pausar Outras
        RedmineService.pauseOtherTasks(issueId);
        RedmineService.setStatus(issueId, REDMINE_CONSTANTS.STATUS.IN_PROGRESS).catch(console.error);
        RedmineService.assignToMe(issueId).catch(console.error);
    },

    stop: () => {
        if (!SkyTimer.startTime) return;
        const sessionHours = (Date.now() - SkyTimer.startTime) / 1000 / 3600; // Horas apenas desta sessão
        
        SkyTimer.openLogModal(sessionHours);
        SkyTimer.stopInternal();
    },

    stopInternal: () => {
        if (SkyTimer.interval) clearInterval(SkyTimer.interval);
        SkyTimer.interval = null;
        SkyTimer.startTime = null;
        localStorage.removeItem('sky_timer_state');
        
        // Ao parar, volta a mostrar apenas o acumulado do servidor (ou soma visualmente até recarregar)
        // Por segurança, mantemos o acumulado visual até o reload
        SkyTimer.updateDisplay();
        
        // Atualiza UI da lista se estiver nela
        if (window.location.pathname.includes('/my/page')) {
             SkyTimer.renderMyPage(); // Remove estilos ativos
        }

        const btn = document.getElementById('sky-timer-toggle');
        if (btn) {
            btn.className = 'sky-timer-btn sky-btn-play';
            btn.innerHTML = '&#9658;'; // Play
            btn.title = "Iniciar Trabalho";
        }
    },

    startUI: () => {
        const btn = document.getElementById('sky-timer-toggle');
        if (btn) {
            btn.className = 'sky-timer-btn sky-btn-stop sky-blink';
            btn.innerHTML = '&#9632;'; // Stop
            btn.title = "Parar e Lançar Horas";
        }

        SkyTimer.startGlobalInterval();
        // Atualiza imediatamente
        SkyTimer.updateDisplay();
    },

    startGlobalInterval: () => {
        if (SkyTimer.interval) clearInterval(SkyTimer.interval);
        SkyTimer.interval = setInterval(() => {
            SkyTimer.updateDisplay();
            // Se estiver na "Minha Página", re-verifica a lista periodicamente
            if (window.location.pathname.includes('/my/page')) {
                SkyTimer.renderMyPage();
            }
        }, 1000);
    },

    updateDisplay: () => {
        // Lógica de cálculo
        if (!SkyTimer.startTime) return; // Nada a exibir se parado
        
        let totalSeconds = SkyTimer.accumulatedOffset * 3600; 
        const sessionSeconds = (Date.now() - SkyTimer.startTime) / 1000;
        totalSeconds += sessionSeconds;

        // Formatação HH:MM:SS
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);

        const text = 
            String(h).padStart(2, '0') + ':' + 
            String(m).padStart(2, '0') + ':' + 
            String(s).padStart(2, '0');
            
        // 1. Atualiza Widget na página da Issue
        const el = document.getElementById('sky-timer-display');
        if (el) el.innerText = text;

        // 2. Atualiza Timer na Lista (Minha Página)
        if (SkyTimer.issueId) {
            const listEl = document.getElementById(`sky-list-timer-${SkyTimer.issueId}`);
            if (listEl) listEl.innerText = text;
        }
    },

    openLogModal: (hours) => {
        const hoursFixed = hours.toFixed(2);
        
        const html = `
        <div id="sky-timer-overlay">
            <div id="sky-timer-modal">
                <div id="sky-timer-header">
                    <h3>Registrar Tempo (SkyRMTT)</h3>
                    <button id="sky-timer-close">&times;</button>
                </div>
                <div id="sky-timer-body">
                    <div class="svn-field">
                        <label>Tempo Decorrido (Horas)</label>
                        <input id="sky-log-hours" class="svn-input" value="${hoursFixed}">
                    </div>
                    <div class="svn-field">
                        <label>Comentário</label>
                        <textarea id="sky-log-comment" class="svn-input" style="height: 60px;"></textarea>
                    </div>
                    <div class="svn-field" style="flex-direction: row; align-items: center; gap: 10px;">
                        <input type="checkbox" id="sky-log-resolve" checked>
                        <label for="sky-log-resolve" style="margin:0; cursor:pointer;">Definir como RESOLVIDA?</label>
                    </div>
                </div>
                <div id="sky-timer-footer">
                    <div id="sky-timer-status"></div>
                    <button id="sky-timer-cancel" class="btn btn-cancel">Cancelar</button>
                    <button id="sky-timer-submit" class="btn btn-confirm">LANÇAR HORAS</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        // Preenche comentário com último da branch ou genérico
        document.getElementById('sky-log-comment').value = "Desenvolvimento"; 

        // Eventos
        const close = () => document.getElementById('sky-timer-overlay').remove();
        document.getElementById('sky-timer-close').onclick = close;
        document.getElementById('sky-timer-cancel').onclick = close;
        document.getElementById('sky-timer-submit').onclick = () => {
            const h = document.getElementById('sky-log-hours').value;
            const c = document.getElementById('sky-log-comment').value;
            const resolve = document.getElementById('sky-log-resolve').checked;
            
            const statusDiv = document.getElementById('sky-timer-status');
            const btnSubmit = document.getElementById('sky-timer-submit');
            
            statusDiv.innerText = "Enviando...";
            btnSubmit.disabled = true;

            const taskId = window.location.pathname.split('/').pop();

            // Promise Chain
            const actions = [ RedmineService.logTime(taskId, h, c) ];
            if (resolve) actions.push(RedmineService.setStatus(taskId, REDMINE_CONSTANTS.STATUS.RESOLVED));

            Promise.all(actions)
                .then(() => {
                    alert("Tempo registrado e status atualizado!");
                    close();
                    window.location.reload();
                })
                .catch(err => {
                    statusDiv.className = 'error-msg';
                    statusDiv.innerText = "Erro: " + err.message;
                    btnSubmit.disabled = false;
                });
        };
    }
};

function injectTimerUI() {
    if (document.getElementById('sky-timer-widget')) return;

    const details = document.querySelector('.issue.details');
    if (!details) return;

    const div = document.createElement('div');
    div.id = 'sky-timer-widget';
    div.innerHTML = `
        <div style="flex: 1;">
            <div style="font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase;">SkyRMTT Timer</div>
            <div style="font-size: 11px; color: #94a3b8;">Registre seu tempo automaticamente</div>
        </div>
        <div id="sky-timer-display">00:00:00</div>
        <button id="sky-timer-toggle" class="sky-timer-btn sky-btn-play" title="Iniciar Trabalho">&#9658;</button>
    `;

    // Insere ANTES da caixa de branch (se houver) ou no topo
    const branchBox = document.getElementById('sky-branch-info');
    if (branchBox) {
        details.insertBefore(div, branchBox);
    } else {
        details.prepend(div);
    }

    document.getElementById('sky-timer-toggle').onclick = () => {
        if (SkyTimer.startTime) {
            SkyTimer.stop();
        } else {
            const taskId = window.location.pathname.split('/').pop();
            SkyTimer.start(taskId);
        }
    };
    
    SkyTimer.init();
}

function injetarEstilos() {
    if (document.getElementById('svn-styles')) return;
    const style = document.createElement('style');
    style.id = 'svn-styles';
    style.innerHTML = SVN_STYLES;
    document.head.appendChild(style);
}

function criarModal() {
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
    document.getElementById('svn-close').onclick = fecharModal;
    document.getElementById('svn-cancel').onclick = fecharModal;
    document.getElementById('svn-overlay').onclick = (e) => {
        if (e.target.id === 'svn-overlay') fecharModal();
    };
    document.getElementById('svn-submit').onclick = enviarFormulario;
}

function abrirModal() {
    criarModal();
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
    carregarTags(year);
}

function fecharModal() {
    document.getElementById('svn-overlay').style.display = 'none';
}

function carregarTags(year) {
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

function enviarFormulario() {
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
            atualizarInterfaceComBranch(data.url);
            
            // SkyRMTT Integration: Inicia Timer e coloca em Andamento
            try {
                SkyTimer.start(taskId);
                alert("✅ Sucesso!\nBranch criada e Tarefa iniciada!");
            } catch (e) {
                console.error(e);
                alert("✅ Sucesso na Branch!\nMas houve erro ao iniciar o timer.");
            }

            fecharModal();
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

let isCheckingBranch = false;
let branchCheckDone = false;


function obterTarefasRelacionadas() {
    const tasks = [];
    const seenIds = new Set();
    const currentTaskId = window.location.pathname.split('/').pop();

    // 1. Tenta extrair do Fluxo de Tarefas (Mais preciso, tem a versão)
    const fluxoRows = document.querySelectorAll('.tabela-fluxo-tarefas tr');
    fluxoRows.forEach(row => {
        const subjectCol = row.querySelector('.subject a');
        const versionCol = row.querySelector('.version a');
        
        if (subjectCol) {
            const href = subjectCol.getAttribute('href'); // /issues/88367
            const id = href.split('/').pop();
            const version = versionCol ? versionCol.innerText.split(' ')[0] : null; // "2025-25"

            if (id && id !== currentTaskId && !seenIds.has(id)) {
                tasks.push({ id, version });
                seenIds.add(id);
            }
        }
    });

    // 2. Fallback: Relações (Sem versão explícita, usa a atual ou tenta descobrir)
    // Se achamos no fluxo, geralmente é suficiente. Se não, olhamos as relações.
    if (tasks.length === 0) {
        const relations = document.querySelectorAll('#relations .issue');
        relations.forEach(row => {
            const subjectLink = row.querySelector('.subject a');
            if (subjectLink) {
                const id = subjectLink.getAttribute('href').split('/').pop();
                // Relações não mostram a versão facilmente, vamos tentar sem versão (se o server permitir) ou usar a atual
                // Por padrão, vamos tentar a versão atual como fallback
                if (id && id !== currentTaskId && !seenIds.has(id)) {
                    tasks.push({ id, version: null }); 
                    seenIds.add(id);
                }
            }
        });
    }

    return tasks;
}

function atualizarInterfaceComBranch(url, relatedTaskId = null) {
    const btn = document.getElementById('sky-svn-btn');
    if (btn) {
        btn.innerHTML = relatedTaskId ? ` Branch em T${relatedTaskId}` : ' Branch Vinculada';
        btn.className = 'icon icon-checked';
        btn.style.color = 'green';
        btn.onclick = (e) => { 
            e.preventDefault(); 
        };
        btn.title = "Branch: " + url;
    }

    // Visual Box for Branch Info
    if (!document.getElementById('sky-branch-info')) {
        const details = document.querySelector('.issue.details');
        if (details) {
            const box = document.createElement('div');
            box.id = 'sky-branch-info';
            box.style.cssText = "background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
            
            const label = relatedTaskId ? `Branch (via T#${relatedTaskId}):` : 'Branch:';
            
            box.innerHTML = `
                <span class="icon icon-checked" style="background-position: 0 50%;"></span>
                <strong style="margin-right: 5px; white-space: nowrap;">${label}</strong>
                <input type="text" id="sky-branch-url-input" value="${url}" readonly style="flex: 1; border: 1px solid #dcfce7; background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #334155; font-size: 13px;" onclick="this.select();">
            `;

            const mergeBtn = document.createElement('a');
            mergeBtn.className = 'icon icon-package';
            mergeBtn.title = 'Mesclar alterações para o Trunk';
            mergeBtn.style.cssText = 'cursor: pointer; margin-left: 10px; text-decoration: none; color: #0369a1; font-weight: 600;';
            mergeBtn.innerText = 'Mesclar p/ Trunk';
            mergeBtn.onclick = (e) => {
                e.preventDefault();
                abrirModalDeMerge(url);
            };
            box.appendChild(mergeBtn);

            const copyBtn = document.createElement('a');
            copyBtn.className = 'icon icon-copy';
            copyBtn.title = 'Copiar caminho';
            copyBtn.style.cssText = 'cursor: pointer; margin-left: auto; text-decoration: none; color: #15803d; font-weight: 600;';
            copyBtn.innerText = 'Copiar';
            copyBtn.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(url).then(() => {
                    const original = copyBtn.innerText;
                    copyBtn.innerText = 'Copiado!';
                    setTimeout(() => copyBtn.innerText = original, 2000);
                });
            };
            box.appendChild(copyBtn);

            details.prepend(box);
        }
    }
}

function abrirModalDeMerge(sourceUrl) {
    if (document.getElementById('svn-merge-overlay')) document.getElementById('svn-merge-overlay').remove();

    const targetUrl = sourceUrl.split('/branches/')[0] + '/trunk';
    const savedLocalPath = localStorage.getItem('svn_local_trunk_path') || 'C:\\';
    
    const html = `
        <div id="svn-merge-overlay">
            <div id="svn-modal" style="max-width: 700px;">
                <div id="svn-header">
                    <h3>Mesclar Alterações para o Trunk</h3>
                    <button id="svn-merge-close">&times;</button>
                </div>
                <div id="svn-body">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <div class="svn-field" style="flex: 1;">
                            <label>Origem (Sua Branch)</label>
                            <input class="svn-input" value="${sourceUrl}" readonly>
                        </div>
                        <div class="svn-field" style="flex: 1;">
                            <label>Caminho Local do Trunk (Obrigatório)</label>
                            <input id="svn-local-path" class="svn-input" value="${savedLocalPath}" placeholder="Ex: C:\\Projetos\\Sky\\trunk">
                        </div>
                    </div>
                    
                    <label style="font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase;">Selecione as Revisões para Merge</label>
                    <div id="merge-rev-list" style="margin-top: 5px; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff; max-height: 250px; overflow-y: auto;">
                        <div style="text-align: center; color: #64748b; padding: 20px;">
                            <span class="icon icon-wait"></span> Carregando histórico da branch...
                        </div>
                    </div>

                    <div class="svn-field" style="margin-top: 15px;">
                        <label>Comentário do Commit (Opcional)</label>
                        <textarea id="merge-comment" class="svn-input" style="height: 60px; padding: 8px; resize: none;"></textarea>
                    </div>
                </div>
                <div id="svn-footer">
                    <div id="merge-status"></div>
                    <button id="svn-merge-cancel" class="btn btn-cancel">Cancelar</button>
                    <button id="svn-merge-tortoise" class="btn btn-cancel" style="color: #0369a1; border-color: #0369a1;">Abrir Log (Tortoise)</button>
                    <button id="svn-merge-submit" class="btn btn-confirm" disabled>EXECUTAR MERGE</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    
    const overlay = document.getElementById('svn-merge-overlay');
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 100000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);";

    const taskId = window.location.pathname.split('/').pop();
    document.getElementById('merge-comment').value = `Merge T#${taskId}: `;

    // Eventos
    document.getElementById('svn-merge-close').onclick = () => overlay.remove();
    document.getElementById('svn-merge-cancel').onclick = () => overlay.remove();
    document.getElementById('svn-merge-submit').onclick = () => executarMerge(sourceUrl, targetUrl);
    document.getElementById('svn-merge-tortoise').onclick = () => abrirTortoise('log', sourceUrl);

    // Salva caminho local ao digitar
    document.getElementById('svn-local-path').addEventListener('input', (e) => {
        localStorage.setItem('svn_local_trunk_path', e.target.value);
    });

    // Carrega Log
    fetch(`http://localhost:3000/branch-log?url=${encodeURIComponent(sourceUrl)}`)
        .then(r => r.json())
        .then(data => {
            const listArea = document.getElementById('merge-rev-list');
            const submitBtn = document.getElementById('svn-merge-submit');
            
            if (data.success && data.commits.length > 0) {
                let htmlLog = '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
                htmlLog += '<tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;"><th style="padding: 8px; text-align: left; width: 30px;"></th><th style="padding: 8px; text-align: left; width: 60px;">Rev</th><th style="padding: 8px; text-align: left;">Mensagem</th></tr>';
                
                data.commits.forEach(c => {
                    htmlLog += `
                        <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;" onclick="const cb = this.querySelector('input'); cb.checked = !cb.checked;">
                            <td style="padding: 8px; text-align: center;" onclick="event.stopPropagation()">
                                <input type="checkbox" class="merge-rev-check" value="${c.revision}" checked>
                            </td>
                            <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #0369a1;">r${c.revision}</td>
                            <td style="padding: 8px; color: #334155;">${c.message || '(sem comentário)'}</td>
                        </tr>
                    `;
                });
                htmlLog += '</table>';
                listArea.innerHTML = htmlLog;
                submitBtn.disabled = false;
                document.getElementById('merge-status').innerText = `${data.commits.length} commits encontrados.`;
            } else {
                listArea.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Nenhum commit encontrado na branch ou erro ao carregar.</div>`;
            }
        })
        .catch(err => {
            document.getElementById('merge-rev-list').innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Erro ao conectar ao servidor local.</div>`;
        });
}

function executarMerge(source, target) {
    const btn = document.getElementById('svn-merge-submit');
    const status = document.getElementById('merge-status');
    const localPath = document.getElementById('svn-local-path').value;
    
    if (!localPath || localPath.length < 3) {
        alert("Por favor, informe o caminho da pasta Trunk no seu computador.");
        document.getElementById('svn-local-path').focus();
        return;
    }

    const selectedRevisions = Array.from(document.querySelectorAll('.merge-rev-check:checked'))
                                   .map(cb => cb.value)
                                   .sort((a, b) => parseInt(a) - parseInt(b));

    if (selectedRevisions.length === 0) {
        alert("Selecione ao menos uma revisão para mesclar.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Abrindo Tortoise...";
    status.innerText = `Enviando ${selectedRevisions.length} revisões para o TortoiseSVN...`;

    fetch("http://localhost:3000/execute-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            source, 
            target: localPath, // Envia o caminho local como alvo
            revisions: selectedRevisions
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            status.innerText = "Interface do Tortoise aberta.";
            setTimeout(() => {
                document.getElementById('svn-merge-overlay').remove();
            }, 1000);
        } else {
            alert("Erro ao abrir Tortoise:\n" + data.details);
        }
    })
    .catch(() => alert("Erro de conexão com o servidor local."))
    .finally(() => {
        btn.disabled = false;
        btn.innerText = "EXECUTAR MERGE";
    });
}

function abrirTortoise(command, path, path2 = null) {
    fetch("http://localhost:3000/open-tortoise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, path, path2 })
    }).then(() => {
        console.log("Comando enviado ao TortoiseSVN.");
    });
}

async function verificarStatusDaBranch() {
    if (branchCheckDone || isCheckingBranch || document.getElementById('sky-branch-info')) return;

    const currentTaskId = window.location.pathname.split('/').pop();
    const versionEl = document.querySelector('.fixed-version.attribute .value');
    
    if (!currentTaskId || !versionEl) return;
    
    const currentVersion = versionEl.textContent.trim().split(' ')[0];

    isCheckingBranch = true;
    
    try {
        // 1. Verifica a tarefa atual
        let data = await fetch(`http://localhost:3000/task-branch?taskId=${currentTaskId}&version=${currentVersion}`).then(r => r.json());
        
        if (data.found && data.url) {
                atualizarInterfaceComBranch(data.url);
            branchCheckDone = true;
            return;
        }

        // 2. Se não achou, verifica tarefas relacionadas (Fluxo ou Relações)
        const relatedTasks = obterTarefasRelacionadas();
        
        for (const task of relatedTasks) {
            // Se não tiver versão (veio de relações), usa a atual como tentativa
            const versionToCheck = task.version || currentVersion;
            
            console.log(`Verificando relacionada: T${task.id} na versão ${versionToCheck}`);
            
            data = await fetch(`http://localhost:3000/task-branch?taskId=${task.id}&version=${versionToCheck}`).then(r => r.json());
            
            if (data.found && data.url) {
                atualizarInterfaceComBranch(data.url, task.id);
                branchCheckDone = true;
                return;
            }
        }
        // 3. Se chegou aqui e não retornou, não achou em nenhuma
        branchCheckDone = true;

    } catch (err) {
        console.error("Erro ao verificar branch:", err);
        branchCheckDone = true; // Mesmo com erro, encerra a busca para liberar o botão
    } finally { 
        isCheckingBranch = false; 
    }
}

function copiarTituloDaTarefa() {
    const taskId = window.location.pathname.split('/').pop();
    const descriptionEl = document.querySelector('.subject h3');
    if (!descriptionEl) return;
    const description = descriptionEl.innerText.trim();
    const textToCopy = `T #${taskId} - ${description}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.getElementById('sky-copy-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copiado!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
    });
}

// Inicialização
injetarEstilos();

if (window.location.pathname === '/my/page') {
    SkyTimer.initMyPage();
} else {
    setInterval(() => {
        verificarStatusDaBranch();
        injectTimerUI(); // SkyRMTT UI
    
        const menu = document.querySelector('#content > .contextual');
        if (!menu) return;
    
        // Se ainda está buscando, mostra um placeholder ou não mostra o botão de criar
        if (!branchCheckDone && !document.getElementById('sky-branch-info')) {
            if (!document.getElementById('sky-svn-searching')) {
                const searching = document.createElement('a');
                searching.id = 'sky-svn-searching';
                searching.innerHTML = 'Buscando Branch... ';            
                searching.className = 'icon icon-wait'; // Ícone de carregamento do Redmine
                searching.href = '#';
                searching.style.cursor = 'wait';
                searching.onclick = (e) => e.preventDefault();
                menu.prepend(searching);
            }
            // Remove o botão de criar se ele existir (para garantir que não apareça antes do tempo)
            const existingBtn = document.getElementById('sky-svn-btn');
            if (existingBtn) existingBtn.remove();
            return;
        }
    
        // Se a busca terminou, remove o placeholder de "Buscando"
        const searchingPlaceholder = document.getElementById('sky-svn-searching');
        if (searchingPlaceholder) searchingPlaceholder.remove();
    
        // Só cria o botão "Criar Branch" se a busca terminou E não achou branch vinculada
        if (branchCheckDone && !document.getElementById('sky-branch-info') && !document.getElementById('sky-svn-btn')) {
            const btn = document.createElement('a');
            btn.id = 'sky-svn-btn';
            btn.innerHTML = 'Criar Branch';
            btn.className = 'icon icon-add';
            btn.href = '#';
            btn.onclick = (e) => { e.preventDefault(); abrirModal(); };
            menu.prepend(btn);
        }
    
        // Botão Copiar (Ao lado do título) - Pode ficar sempre visível pois não depende do SVN
        if (!document.getElementById('sky-copy-btn')) {
            const titleHeader = document.querySelector('h2.inline-flex');
            if (titleHeader) {
                const btn = document.createElement('a');
                btn.id = 'sky-copy-btn';
                btn.title = 'Copiar Título Formatado';
                btn.className = 'icon icon-copy'; 
                btn.style.cssText = "margin-left: 10px; cursor: pointer; font-size: 14px; vertical-align: middle; text-decoration: none;";
                btn.href = '#';
                btn.onclick = (e) => { e.preventDefault(); copiarTituloDaTarefa(); };
                titleHeader.appendChild(btn);
            }
        }
    }, 1000);
}