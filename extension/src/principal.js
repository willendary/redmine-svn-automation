// Variáveis de Estado
let estaVerificandoBranch = false;
let verificacaoBranchConcluida = false;

// --- Configurações Padrão ---
const configPadrao = {
    feature_timer: true,
    feature_svn: true,
    feature_mypage: true,
    feature_filter: true,
    feature_summary: true,
    feature_meta: true,
    feature_copy: true
};

// --- Lógica de Inicialização ---

function iniciarExtensao(config) {
    injetarEstilos();

    // 1. Minha Página (Lista de Tarefas)
    if (window.location.pathname === '/my/page') {
        if (config.feature_mypage) {
            if (config.feature_timer) RelogioSky.iniciarMinhaPagina();
            if (config.feature_filter) injetarFiltroDeBusca();
            if (config.feature_summary) injetarResumoDoDia();
            if (config.feature_meta) destacarDiasIncompletos();
        }
    } 
    // 2. Página de Detalhes da Tarefa
    else if (/^\/issues\/\d+$/.test(window.location.pathname)) {
        setInterval(() => {
            if (config.feature_svn) {
                verificarStatusDaBranch();
                gerenciarBotoesSvn();
            }
            if (config.feature_timer) injetarInterfaceTimer();
            if (config.feature_copy) injetarBotaoCopiar();
        }, 1000);
    }
}

// Carrega configurações e inicia
try {
    chrome.storage.sync.get(configPadrao, (items) => {
        iniciarExtensao(items);
    });
} catch (e) {
    console.warn("SkyRedmine: Erro ao carregar configs, usando padrão.", e);
    iniciarExtensao(configPadrao);
}


// --- Funções de Melhoria da "Minha Página" ---

function destacarDiasIncompletos() {
    const tabelaTempo = document.querySelector('#block-timelog table.list.time-entries tbody');
    if (!tabelaTempo) return;

    const linhas = tabelaTempo.querySelectorAll('tr');
    linhas.forEach(linha => {
        const celulaHoras = linha.querySelector('td.hours em');
        if (celulaHoras) {
            const textoHoras = celulaHoras.innerText.trim();
            const horas = parseFloat(textoHoras);
            if (!isNaN(horas)) {
                if (horas < 7.0) {
                    linha.style.backgroundColor = '#fee2e2'; 
                    linha.style.borderLeft = '4px solid #ef4444';
                    celulaHoras.style.color = '#b91c1c';
                    celulaHoras.style.fontWeight = 'bold';
                } else {
                    linha.style.backgroundColor = '#dcfce7';
                    linha.style.borderLeft = '4px solid #22c55e';
                    celulaHoras.style.color = '#15803d';
                }
            }
        }
    });
}

async function injetarResumoDoDia() {
    if (document.getElementById('sky-day-summary')) return;
    const boxMinhasTarefas = document.getElementById('block-issuesassignedtome');
    if (!boxMinhasTarefas) return;
    const header = boxMinhasTarefas.querySelector('h3');
    if (!header) return;
    const span = document.createElement('span');
    span.id = 'sky-day-summary';
    span.style.cssText = "font-size: 13px; font-weight: normal; color: #166534; background: #dcfce7; padding: 3px 10px; border-radius: 20px; margin-left: 15px; vertical-align: middle; border: 1px solid #bbf7d0;";
    span.innerHTML = '🕒 Carregando total de hoje...';
    header.appendChild(span);
    const totalHoras = await ServicoRedmine.obterTotalHorasGeraisHoje();
    span.innerHTML = `🕒 <strong>Total hoje:</strong> ${totalHoras.toFixed(2)}h`;
}

function injetarFiltroDeBusca() {
    if (document.getElementById('sky-quick-filter')) return;
    const boxMinhasTarefas = document.getElementById('block-issuesassignedtome');
    if (!boxMinhasTarefas) return;
    const input = document.createElement('input');
    input.id = 'sky-quick-filter';
    input.type = 'text';
    input.placeholder = '🔍 Filtrar tarefas por título ou ID...';
    input.style.cssText = "width: 100%; padding: 8px 12px; margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-size: 13px; outline: none;";
    const contextual = boxMinhasTarefas.querySelector('.contextual');
    if (contextual) contextual.after(input);
    else boxMinhasTarefas.prepend(input);
    input.oninput = () => {
        const termo = input.value.toLowerCase();
        const linhas = boxMinhasTarefas.querySelectorAll('tr.issue');
        linhas.forEach(linha => {
            linha.style.display = linha.innerText.toLowerCase().includes(termo) ? '' : 'none';
        });
    };
}


// --- Funções Auxiliares de UI (Issues) ---

function gerenciarBotoesSvn() {
    const menu = document.querySelector('#content > .contextual');
    if (!menu) return;
    if (!verificacaoBranchConcluida && !document.getElementById('sky-branch-info')) {
        if (!document.getElementById('sky-svn-searching')) {
            const carregando = document.createElement('a');
            carregando.id = 'sky-svn-searching';
            carregando.innerHTML = 'Buscando Branch... ';
            carregando.className = 'icon icon-wait'; 
            carregando.href = '#';
            menu.prepend(carregando);
        }
        return;
    }
    const placeholder = document.getElementById('sky-svn-searching');
    if (placeholder) placeholder.remove();
    if (verificacaoBranchConcluida && !document.getElementById('sky-branch-info') && !document.getElementById('sky-svn-btn')) {
        const btn = document.createElement('a');
        btn.id = 'sky-svn-btn';
        btn.innerHTML = 'Criar Branch';
        btn.className = 'icon icon-add';
        btn.href = '#';
        btn.onclick = (e) => { e.preventDefault(); abrirModalBranch(); };
        menu.prepend(btn);
    }
}

function injetarBotaoCopiar() {
    if (!document.getElementById('sky-copy-btn')) {
        const cabecalho = document.querySelector('h2.inline-flex');
        if (cabecalho) {
            const btn = document.createElement('a');
            btn.id = 'sky-copy-btn';
            btn.title = 'Copiar Título Formatado';
            btn.className = 'icon icon-copy'; 
            btn.style.cssText = "margin-left: 10px; cursor: pointer; font-size: 14px; vertical-align: middle; text-decoration: none;";
            btn.href = '#';
            btn.onclick = (e) => { e.preventDefault(); copiarTituloDaTarefa(); };
            cabecalho.appendChild(btn);
        }
    }
}

// --- Lógica de Branch SVN & Merge ---

function criarModalBranch() {
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
    document.getElementById('svn-close').onclick = fecharModalBranch;
    document.getElementById('svn-cancel').onclick = fecharModalBranch;
    document.getElementById('svn-overlay').onclick = (e) => { if (e.target.id === 'svn-overlay') fecharModalBranch(); };
    document.getElementById('svn-submit').onclick = enviarFormularioBranch;
}

function abrirModalBranch() {
    criarModalBranch();
    const idTarefa = window.location.pathname.split('/').pop();
    const elVersao = document.querySelector('.fixed-version.attribute .value');
    const versao = elVersao ? elVersao.textContent.trim().split(' ')[0] : "";
    let ano = new Date().getFullYear();
    const match = versao.match(/^(\d{4})/);
    if (match) ano = match[1];
    document.getElementById('svn-task').value = idTarefa;
    document.getElementById('svn-version').value = versao;
    document.getElementById('svn-year-display').innerText = ano;
    document.getElementById('svn-overlay').style.display = 'flex';
    carregarTagsSvn(ano);
}

function fecharModalBranch() { document.getElementById('svn-overlay').style.display = 'none'; }

function carregarTagsSvn(ano) {
    const select = document.getElementById('svn-tags');
    select.innerHTML = '<option value="">Carregando tags...</option>';
    select.disabled = true;
    fetch(`http://localhost:3000/list-tags?year=${ano}`)
        .then(r => r.json())
        .then(data => {
            select.innerHTML = '<option value="">-- Trunk (Padrão) --</option>';
            if (data.tags) {
                data.tags.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.value;
                    opt.innerText = t.label;
                    select.appendChild(opt);
                });
            }
        })
        .finally(() => { select.disabled = false; });
}

function enviarFormularioBranch() {
    const taskId = document.getElementById('svn-task').value;
    const version = document.getElementById('svn-version').value;
    const sourceTag = document.getElementById('svn-tags').value;
    const year = document.getElementById('svn-year-display').innerText;
    fetch("http://localhost:3000/create-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, version, sourceTag, year })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            atualizarInterfaceComBranch(data.url);
            RelogioSky.comecar(taskId);
            fecharModalBranch();
        } else {
            alert("Erro:\n" + data.details);
        }
    });
}

function atualizarInterfaceComBranch(url, idTarefaRelacionada = null) {
    const btn = document.getElementById('sky-svn-btn');
    if (btn) {
        btn.innerHTML = idTarefaRelacionada ? ` Branch em T${idTarefaRelacionada}` : ' Branch Vinculada';
        btn.className = 'icon icon-checked';
        btn.style.color = 'green';
        btn.onclick = (e) => e.preventDefault();
    }

    if (!document.getElementById('sky-branch-info')) {
        const detalhes = document.querySelector('.issue.details');
        if (detalhes) {
            const caixa = document.createElement('div');
            caixa.id = 'sky-branch-info';
            caixa.style.cssText = "background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 15px; margin: 0 0 15px 0; border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);";
            
            const label = idTarefaRelacionada ? `Branch (via T#${idTarefaRelacionada}):` : 'Branch:';
            
            caixa.innerHTML = `
                <span class="icon icon-checked" style="background-position: 0 50%;"></span>
                <strong style="margin-right: 5px; white-space: nowrap;">${label}</strong>
                <input type="text" id="sky-branch-url-input" value="${url}" readonly style="flex: 1; border: 1px solid #dcfce7; background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #334155; font-size: 13px;" onclick="this.select();">
            `;

            // Botão MESCLAR
            const btnMerge = document.createElement('a');
            btnMerge.className = 'icon icon-package';
            btnMerge.title = 'Mesclar alterações para o Trunk';
            btnMerge.style.cssText = 'cursor: pointer; margin-left: 10px; text-decoration: none; color: #0369a1; font-weight: 600;';
            btnMerge.innerText = 'Mesclar p/ Trunk';
            btnMerge.onclick = (e) => { e.preventDefault(); abrirModalDeMerge(url); };
            caixa.appendChild(btnMerge);

            // Botão COPIAR URL
            const btnCopiar = document.createElement('a');
            btnCopiar.className = 'icon icon-copy';
            btnCopiar.title = 'Copiar caminho da branch';
            btnCopiar.style.cssText = 'cursor: pointer; margin-left: auto; text-decoration: none; color: #15803d; font-weight: 600;';
            btnCopiar.innerText = 'Copiar';
            btnCopiar.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(url).then(() => {
                    const original = btnCopiar.innerText;
                    btnCopiar.innerText = 'Copiado!';
                    setTimeout(() => btnCopiar.innerText = original, 2000);
                });
            };
            caixa.appendChild(btnCopiar);

            detalhes.prepend(caixa);
        }
    }
}

// --- Funções de Merge ---

function abrirModalDeMerge(urlOrigem) {
    if (document.getElementById('svn-merge-overlay')) document.getElementById('svn-merge-overlay').remove();
    const urlDestino = urlOrigem.split('/branches/')[0] + '/trunk';
    const caminhoLocalSalvo = localStorage.getItem('svn_local_trunk_path') || 'C:\\';
    const html = `
        <div id="svn-merge-overlay">
            <div id="svn-modal" style="max-width: 700px;">
                <div id="svn-header"><h3>Mesclar Alterações para o Trunk</h3><button id="svn-merge-close">&times;</button></div>
                <div id="svn-body">
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <div class="svn-field" style="flex: 1;"><label>Origem (Branch)</label><input class="svn-input" value="${urlOrigem}" readonly></div>
                        <div class="svn-field" style="flex: 1;"><label>Caminho Local Trunk</label><input id="svn-local-path" class="svn-input" value="${caminhoLocalSalvo}"></div>
                    </div>
                    <label style="font-size: 12px; font-weight: 600; color: #475569;">SELECIONE AS REVISÕES</label>
                    <div id="merge-rev-list" style="margin-top: 5px; border: 1px solid #e2e8f0; border-radius: 4px; background: #fff; max-height: 250px; overflow-y: auto;"><div style="padding: 20px; text-align: center;">Carregando histórico...</div></div>
                    <div class="svn-field" style="margin-top: 15px;"><label>Comentário (Opcional)</label><textarea id="merge-comment" class="svn-input" style="height: 60px;"></textarea></div>
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
    const idTarefa = window.location.pathname.split('/').pop();
    document.getElementById('merge-comment').value = `Merge T#${idTarefa}: `;
    document.getElementById('svn-merge-close').onclick = () => overlay.remove();
    document.getElementById('svn-merge-cancel').onclick = () => overlay.remove();
    document.getElementById('svn-merge-submit').onclick = () => executarMerge(urlOrigem, urlDestino);
    document.getElementById('svn-merge-tortoise').onclick = () => abrirTortoise('log', urlOrigem);
    document.getElementById('svn-local-path').addEventListener('input', (e) => { localStorage.setItem('svn_local_trunk_path', e.target.value); });
    fetch(`http://localhost:3000/branch-log?url=${encodeURIComponent(urlOrigem)}`).then(r => r.json()).then(data => {
        const areaLista = document.getElementById('merge-rev-list');
        const btnEnviar = document.getElementById('svn-merge-submit');
        if (data.success && data.commits.length > 0) {
            let htmlLog = '<table style="width: 100%; font-size: 12px; border-collapse: collapse;">';
            data.commits.forEach(c => {
                htmlLog += `<tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;" onclick="const cb = this.querySelector('input'); cb.checked = !cb.checked;"><td style="padding: 8px; text-align: center;"><input type="checkbox" class="merge-rev-check" value="${c.revision}" checked onclick="event.stopPropagation()"></td><td style="padding: 8px; font-weight: bold; color: #0369a1;">r${c.revision}</td><td style="padding: 8px;">${c.message || ''}</td></tr>`;
            });
            areaLista.innerHTML = htmlLog + '</table>';
            btnEnviar.disabled = false;
        } else { areaLista.innerHTML = '<div style="padding: 20px; color: red;">Nenhum commit encontrado.</div>'; }
    });
}

function executarMerge(origem, destino) {
    const btn = document.getElementById('svn-merge-submit');
    const caminhoLocal = document.getElementById('svn-local-path').value;
    if (!caminhoLocal || caminhoLocal.length < 3) { alert("Informe o caminho local do Trunk."); return; }
    const revisoes = Array.from(document.querySelectorAll('.merge-rev-check:checked')).map(cb => cb.value).sort((a, b) => parseInt(a) - parseInt(b));
    if (revisoes.length === 0) { alert("Selecione revisões."); return; }
    btn.disabled = true;
    fetch("http://localhost:3000/execute-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: origem, target: caminhoLocal, revisions: revisoes })
    }).then(r => r.json()).then(data => {
        if (data.success) document.getElementById('svn-merge-overlay').remove();
        else alert("Erro: " + data.details);
    }).finally(() => { btn.disabled = false; });
}

function abrirTortoise(comando, caminho, caminho2 = null) {
    fetch("http://localhost:3000/open-tortoise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: comando, path: caminho, path2: caminho2 })
    });
}

async function verificarStatusDaBranch() {
    if (verificacaoBranchConcluida || estaVerificandoBranch || document.getElementById('sky-branch-info')) return;
    const idTarefaAtual = window.location.pathname.split('/').pop();
    const elVersao = document.querySelector('.fixed-version.attribute .value');
    if (!idTarefaAtual || !elVersao) return;
    const versaoAtual = elVersao.textContent.trim().split(' ')[0];
    estaVerificandoBranch = true;
    try {
        let data = await fetch(`http://localhost:3000/task-branch?taskId=${idTarefaAtual}&version=${versaoAtual}`).then(r => r.json());
        if (data.found && data.url) {
            atualizarInterfaceComBranch(data.url);
            verificacaoBranchConcluida = true;
            return;
        }
        // Tenta tarefas relacionadas
        const relacionadas = obterTarefasRelacionadas();
        for (const t of relacionadas) {
            const v = t.versao || versaoAtual;
            const d = await fetch(`http://localhost:3000/task-branch?taskId=${t.id}&version=${v}`).then(r => r.json());
            if (d.found && d.url) {
                atualizarInterfaceComBranch(d.url, t.id);
                verificacaoBranchConcluida = true;
                return;
            }
        }
        verificacaoBranchConcluida = true;
    } catch (e) { verificacaoBranchConcluida = true; } finally { estaVerificandoBranch = false; }
}

function obterTarefasRelacionadas() {
    const tarefas = [];
    const idsVistos = new Set();
    const idTarefaAtual = window.location.pathname.split('/').pop();
    const linhasFluxo = document.querySelectorAll('.tabela-fluxo-tarefas tr');
    linhasFluxo.forEach(linha => {
        const colAssunto = linha.querySelector('.subject a');
        const colVersao = linha.querySelector('.version a');
        if (colAssunto) {
            const id = colAssunto.getAttribute('href').split('/').pop();
            const versao = colVersao ? colVersao.innerText.split(' ')[0] : null;
            if (id && id !== idTarefaAtual && !idsVistos.has(id)) {
                tarefas.push({ id, versao });
                idsVistos.add(id);
            }
        }
    });
    return tarefas;
}

function copiarTituloDaTarefa() {
    const idTarefa = window.location.pathname.split('/').pop();
    const elDescricao = document.querySelector('.subject h3');
    if (!elDescricao) return;
    const texto = `T #${idTarefa} - ${elDescricao.innerText.trim()}`;
    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('sky-copy-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copiado!';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
    });
}
