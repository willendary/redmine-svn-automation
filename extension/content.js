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

    #svn-status { font-size: 13px; color: #64748b; margin-right: auto; }
    .error-msg { color: #ef4444 !important; }
    .success-msg { color: #22c55e !important; }
`;

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
            alert("✅ Sucesso!\n" + data.url);
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
                atualizarInterfaceComBranch(data.url, task.id);
            branchCheckDone = true;
            return;
        }

        // 2. Se não achou, verifica tarefas relacionadas (Fluxo ou Relações)
        const relatedTasks = getRelatedTasks();
        
        for (const task of relatedTasks) {
            // Se não tiver versão (veio de relações), usa a atual como tentativa
            const versionToCheck = task.version || currentVersion;
            
            console.log(`Verificando relacionada: T${task.id} na versão ${versionToCheck}`);
            
            data = await fetch(`http://localhost:3000/task-branch?taskId=${task.id}&version=${versionToCheck}`).then(r => r.json());
            
            if (data.found && data.url) {
                updateUiWithBranch(data.url, task.id);
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
setInterval(() => {
    verificarStatusDaBranch();

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