// Variáveis de Estado
let estaVerificandoBranch = false;
let verificacaoBranchConcluida = false;

// --- Configurações Padrão ---
const configPadrao = {
    feature_timer: true,
    feature_svn: true,
    feature_mypage: true,
    feature_copy: true
};

// --- Lógica de Inicialização ---

// Função principal que orquestra tudo com base nas configs
function iniciarExtensao(config) {
    injetarEstilos();

    // 1. Minha Página (Lista de Tarefas)
    if (window.location.pathname === '/my/page') {
        if (config.feature_mypage && config.feature_timer) {
            RelogioSky.iniciarMinhaPagina();
        }
    } 
    // 2. Página de Detalhes da Tarefa (/issues/12345)
    else if (/^\/issues\/\d+$/.test(window.location.pathname)) {
        
        // Loop principal de atualização da UI
        setInterval(() => {
            // A. Funcionalidades SVN (Branch/Merge)
            if (config.feature_svn) {
                verificarStatusDaBranch();
                gerenciarBotoesSvn();
            }

            // B. Funcionalidade Timer
            if (config.feature_timer) {
                injetarInterfaceTimer();
            }

            // C. Botão Copiar Título
            if (config.feature_copy) {
                injetarBotaoCopiar();
            }

        }, 1000);
    }
}

// Carrega configurações e inicia
try {
    chrome.storage.sync.get(configPadrao, (items) => {
        iniciarExtensao(items);
    });
} catch (e) {
    // Fallback se não estiver num ambiente de extensão válido ou erro de storage
    console.warn("SkyRedmine: Não foi possível carregar configurações, usando padrão.", e);
    iniciarExtensao(configPadrao);
}


// --- Funções Auxiliares de UI ---

function gerenciarBotoesSvn() {
    const menu = document.querySelector('#content > .contextual');
    if (!menu) return;

    // Se ainda está buscando, mostra um placeholder
    if (!verificacaoBranchConcluida && !document.getElementById('sky-branch-info')) {
        if (!document.getElementById('sky-svn-searching')) {
            const carregando = document.createElement('a');
            carregando.id = 'sky-svn-searching';
            carregando.innerHTML = 'Buscando Branch... ';
            carregando.className = 'icon icon-wait'; 
            carregando.href = '#';
            carregando.style.cursor = 'wait';
            carregando.onclick = (e) => e.preventDefault();
            menu.prepend(carregando);
        }
        const btnExistente = document.getElementById('sky-svn-btn');
        if (btnExistente) btnExistente.remove();
        return;
    }

    const placeholder = document.getElementById('sky-svn-searching');
    if (placeholder) placeholder.remove();

    // Botão Criar Branch
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

// --- Lógica de Branch SVN (Mantida Igual) ---

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
    document.getElementById('svn-close').onclick = fecharModalBranch;
    document.getElementById('svn-cancel').onclick = fecharModalBranch;
    document.getElementById('svn-overlay').onclick = (e) => {
        if (e.target.id === 'svn-overlay') fecharModalBranch();
    };
    document.getElementById('svn-submit').onclick = enviarFormularioBranch;
}

function abrirModalBranch() {
    criarModalBranch();
    const idTarefa = window.location.pathname.split('/').pop();
    const elVersao = document.querySelector('.fixed-version.attribute .value');
    const versao = elVersao ? elVersao.textContent.trim().split(' ')[0] : "";
    
    // Extrai ano
    let ano = new Date().getFullYear();
    const match = versao.match(/^(\d{4})/);
    if (match) ano = match[1];

    // Preenche campos
    document.getElementById('svn-task').value = idTarefa;
    document.getElementById('svn-version').value = versao;
    document.getElementById('svn-year-display').innerText = ano;
    document.getElementById('svn-overlay').style.display = 'flex';
    
    // Busca Tags
    carregarTagsSvn(ano);
}

function fecharModalBranch() {
    document.getElementById('svn-overlay').style.display = 'none';
}

function carregarTagsSvn(ano) {
    const select = document.getElementById('svn-tags');
    const status = document.getElementById('svn-status');
    
    select.innerHTML = '<option value="">Carregando tags...</option>';
    select.disabled = true;
    status.innerText = "Conectando ao servidor local...";

    fetch(`http://localhost:3000/list-tags?year=${ano}`)
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

function enviarFormularioBranch() {
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
                RelogioSky.comecar(taskId);
                alert("✅ Sucesso!\nBranch criada e Tarefa iniciada!");
            } catch (e) {
                console.error(e);
                alert("✅ Sucesso na Branch!\nMas houve erro ao iniciar o timer.");
            }

            fecharModalBranch();
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

function obterTarefasRelacionadas() {
    const tarefas = [];
    const idsVistos = new Set();
    const idTarefaAtual = window.location.pathname.split('/').pop();

    // 1. Tenta extrair do Fluxo de Tarefas (Mais preciso, tem a versão)
    const linhasFluxo = document.querySelectorAll('.tabela-fluxo-tarefas tr');
    linhasFluxo.forEach(linha => {
        const colunaAssunto = linha.querySelector('.subject a');
        const colunaVersao = linha.querySelector('.version a');
        
        if (colunaAssunto) {
            const href = colunaAssunto.getAttribute('href'); 
            const id = href.split('/').pop();
            const versao = colunaVersao ? colunaVersao.innerText.split(' ')[0] : null;

            if (id && id !== idTarefaAtual && !idsVistos.has(id)) {
                tarefas.push({ id, versao });
                idsVistos.add(id);
            }
        }
    });

    // 2. Fallback: Relações
    if (tarefas.length === 0) {
        const relacoes = document.querySelectorAll('#relations .issue');
        relacoes.forEach(linha => {
            const linkAssunto = linha.querySelector('.subject a');
            if (linkAssunto) {
                const id = linkAssunto.getAttribute('href').split('/').pop();
                if (id && id !== idTarefaAtual && !idsVistos.has(id)) {
                    tarefas.push({ id, versao: null }); 
                    idsVistos.add(id);
                }
            }
        });
    }

    return tarefas;
}

function atualizarInterfaceComBranch(url, idTarefaRelacionada = null) {
    const btn = document.getElementById('sky-svn-btn');
    if (btn) {
        btn.innerHTML = idTarefaRelacionada ? ` Branch em T${idTarefaRelacionada}` : ' Branch Vinculada';
        btn.className = 'icon icon-checked';
        btn.style.color = 'green';
        btn.onclick = (e) => { 
            e.preventDefault(); 
        };
        btn.title = "Branch: " + url;
    }

    // Caixa Visual para Info da Branch
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

            const btnMerge = document.createElement('a');
            btnMerge.className = 'icon icon-package';
            btnMerge.title = 'Mesclar alterações para o Trunk';
            btnMerge.style.cssText = 'cursor: pointer; margin-left: 10px; text-decoration: none; color: #0369a1; font-weight: 600;';
            btnMerge.innerText = 'Mesclar p/ Trunk';
            btnMerge.onclick = (e) => {
                e.preventDefault();
                abrirModalDeMerge(url);
            };
            caixa.appendChild(btnMerge);

            const btnCopiar = document.createElement('a');
            btnCopiar.className = 'icon icon-copy';
            btnCopiar.title = 'Copiar caminho';
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

function abrirModalDeMerge(urlOrigem) {
    if (document.getElementById('svn-merge-overlay')) document.getElementById('svn-merge-overlay').remove();

    const urlDestino = urlOrigem.split('/branches/')[0] + '/trunk';
    const caminhoLocalSalvo = localStorage.getItem('svn_local_trunk_path') || 'C:\\';
    
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
                            <input class="svn-input" value="${urlOrigem}" readonly>
                        </div>
                        <div class="svn-field" style="flex: 1;">
                            <label>Caminho Local do Trunk (Obrigatório)</label>
                            <input id="svn-local-path" class="svn-input" value="${caminhoLocalSalvo}" placeholder="Ex: C:\\Projetos\\Sky\\trunk">
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

    const idTarefa = window.location.pathname.split('/').pop();
    document.getElementById('merge-comment').value = `Merge T#${idTarefa}: `;

    // Eventos
    document.getElementById('svn-merge-close').onclick = () => overlay.remove();
    document.getElementById('svn-merge-cancel').onclick = () => overlay.remove();
    document.getElementById('svn-merge-submit').onclick = () => executarMerge(urlOrigem, urlDestino);
    document.getElementById('svn-merge-tortoise').onclick = () => abrirTortoise('log', urlOrigem);

    // Salva caminho local ao digitar
    document.getElementById('svn-local-path').addEventListener('input', (e) => {
        localStorage.setItem('svn_local_trunk_path', e.target.value);
    });

    // Carrega Log
    fetch(`http://localhost:3000/branch-log?url=${encodeURIComponent(urlOrigem)}`)
        .then(r => r.json())
        .then(data => {
            const areaLista = document.getElementById('merge-rev-list');
            const btnEnviar = document.getElementById('svn-merge-submit');
            
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
                areaLista.innerHTML = htmlLog;
                btnEnviar.disabled = false;
                document.getElementById('merge-status').innerText = `${data.commits.length} commits encontrados.`;
            } else {
                areaLista.innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Nenhum commit encontrado na branch ou erro ao carregar.</div>`;
            }
        })
        .catch(err => {
            document.getElementById('merge-rev-list').innerHTML = `<div style="padding: 20px; text-align: center; color: #ef4444;">Erro ao conectar ao servidor local.</div>`;
        });
}

function executarMerge(origem, destino) {
    const btn = document.getElementById('svn-merge-submit');
    const status = document.getElementById('merge-status');
    const caminhoLocal = document.getElementById('svn-local-path').value;
    
    if (!caminhoLocal || caminhoLocal.length < 3) {
        alert("Por favor, informe o caminho da pasta Trunk no seu computador.");
        document.getElementById('svn-local-path').focus();
        return;
    }

    const revisoesSelecionadas = Array.from(document.querySelectorAll('.merge-rev-check:checked'))
                                   .map(cb => cb.value)
                                   .sort((a, b) => parseInt(a) - parseInt(b));

    if (revisoesSelecionadas.length === 0) {
        alert("Selecione ao menos uma revisão para mesclar.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Abrindo Tortoise...";
    status.innerText = `Enviando ${revisoesSelecionadas.length} revisões para o TortoiseSVN...`;

    fetch("http://localhost:3000/execute-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            source: origem, 
            target: caminhoLocal, 
            revisions: revisoesSelecionadas
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

function abrirTortoise(comando, caminho, caminho2 = null) {
    fetch("http://localhost:3000/open-tortoise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: comando, path: caminho, path2: caminho2 })
    }).then(() => {
        console.log("Comando enviado ao TortoiseSVN.");
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
        // 1. Verifica a tarefa atual
        let data = await fetch(`http://localhost:3000/task-branch?taskId=${idTarefaAtual}&version=${versaoAtual}`).then(r => r.json());
        
        if (data.found && data.url) {
            atualizarInterfaceComBranch(data.url);
            verificacaoBranchConcluida = true;
            return;
        }

        // 2. Se não achou, verifica tarefas relacionadas (Fluxo ou Relações)
        const tarefasRelacionadas = obterTarefasRelacionadas();
        
        for (const tarefa of tarefasRelacionadas) {
            const versaoParaChecar = tarefa.versao || versaoAtual;
            
            console.log(`Verificando relacionada: T${tarefa.id} na versão ${versaoParaChecar}`);
            
            data = await fetch(`http://localhost:3000/task-branch?taskId=${tarefa.id}&version=${versaoParaChecar}`).then(r => r.json());
            
            if (data.found && data.url) {
                atualizarInterfaceComBranch(data.url, tarefa.id);
                verificacaoBranchConcluida = true;
                return;
            }
        }
        
        verificacaoBranchConcluida = true;

    } catch (erro) {
        console.error("Erro ao verificar branch:", erro);
        verificacaoBranchConcluida = true; 
    } finally { 
        estaVerificandoBranch = false; 
    } 
}

function copiarTituloDaTarefa() {
    const idTarefa = window.location.pathname.split('/').pop();
    const elDescricao = document.querySelector('.subject h3');
    if (!elDescricao) return;
    const descricao = elDescricao.innerText.trim();
    const texto = `T #${idTarefa} - ${descricao}`;
    
    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById('sky-copy-btn');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copiado!';
            setTimeout(() => {
                btn.innerHTML = original;
            }, 2000);
        }
    });
}