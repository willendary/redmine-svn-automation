const taskId = window.location.pathname.split('/').pop().replace(/\D/g, '');
let dados = null;
let timer = { rodando: false };

function segundosDecorridos() {
    if (!timer.rodando || !timer.inicio) return 0;
    return Math.max(0, (Date.now() - new Date(timer.inicio).getTime()) / 1000);
}

function tarefaAtual() {
    return dados ? dados.tarefa : null;
}

function versaoDaSprint() {
    const sprint = (tarefaAtual() && tarefaAtual().sprint) || '';
    return sprint.trim().split(' ')[0];
}

function anoDaVersao() {
    const match = versaoDaSprint().match(/^(\d{4})/);
    return match ? match[1] : String(new Date().getFullYear());
}

function renderizarCabecalho() {
    const tarefa = tarefaAtual();
    if (!tarefa) return;

    document.title = `T#${tarefa.id} - ${tarefa.assunto}`;
    document.getElementById('titulo').textContent = `T#${tarefa.id} ${tarefa.assunto}`;
    document.getElementById('subtitulo').textContent =
        [tarefa.projeto, tarefa.tracker, tarefa.responsavel].filter(Boolean).join(' · ');
    document.getElementById('link-redmine').href = tarefa.url;
    document.getElementById('copiar-titulo').onclick = () => {
        navigator.clipboard.writeText(`T #${tarefa.id} - ${tarefa.assunto}`)
            .then(() => mostrarToast('Título copiado.'))
            .catch(erro => mostrarToast(erro.message, 'erro'));
    };

    const chips = [
        `<span class="chip">Status: <strong>${escapar(tarefa.status || '-')}</strong></span>`,
        `<span class="chip">Sprint: <strong>${escapar(tarefa.sprint || '-')}</strong></span>`,
        `<span class="chip">Hoje: <strong>${formatarHoras(tarefa.horasHoje)}</strong></span>`,
        `<span class="chip">Estimadas: <strong>${formatarHoras(tarefa.horasEstimadas)}</strong></span>`,
        `<span class="chip">Gastas: <strong>${formatarHoras(tarefa.horasGastas)}</strong></span>`
    ];
    if (tarefa.versaoTeste) chips.push(`<span class="chip">Versão teste: <strong>${escapar(tarefa.versaoTeste)}</strong></span>`);
    if (tarefa.versaoEstavel) chips.push(`<span class="chip">Versão estável: <strong>${escapar(tarefa.versaoEstavel)}</strong></span>`);
    document.getElementById('resumo').innerHTML = chips.join('');
}

function renderizarBranch() {
    const alvo = document.getElementById('branch-conteudo');
    const branch = dados && dados.branch;

    if (!branch || !branch.encontrada) {
        alvo.innerHTML = `
            <div class="aviso">Nenhuma branch encontrada no SVN para esta tarefa ou para as tarefas do fluxo.</div>
            ${branch && branch.erro ? `<div class="aviso erro">${escapar(branch.erro)}</div>` : ''}
            <button class="btn" id="criar-branch">Criar branch</button>
        `;
        document.getElementById('criar-branch').addEventListener('click', abrirModalCriarBranch);
        return;
    }

    const via = branch.viaTaskId && String(branch.viaTaskId) !== String(taskId)
        ? `<div class="aviso ok">Branch encontrada via T#${escapar(branch.viaTaskId)} (tarefa relacionada).</div>`
        : '';

    alvo.innerHTML = `
        ${via}
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="branch-url" readonly value="${escapar(branch.url)}" style="flex:1; min-width:260px; font-family: ui-monospace, Consolas, monospace; font-size:12px;">
            <button class="btn secundario" id="copiar-branch">Copiar</button>
            <button class="btn secundario" id="log-branch">Ver log</button>
            <button class="btn" id="mesclar-branch">Mesclar p/ Trunk</button>
        </div>
    `;

    document.getElementById('copiar-branch').addEventListener('click', () => {
        navigator.clipboard.writeText(branch.url)
            .then(() => mostrarToast('URL da branch copiada.'))
            .catch(erro => mostrarToast(erro.message, 'erro'));
    });
    document.getElementById('log-branch').addEventListener('click', () => abrirTortoise('log', branch.url));
    document.getElementById('mesclar-branch').addEventListener('click', () => abrirModalMerge(branch.url));
}

function renderizarFluxo() {
    const corpo = document.getElementById('fluxo');
    const fluxo = (dados && dados.fluxo) || [];

    corpo.innerHTML = fluxo.length > 0
        ? fluxo.map(item => {
            const atual = String(item.id) === String(taskId);
            return `<tr>
                <td>
                    <a href="/tarefa/${item.id}" class="assunto" style="color:var(--azul); text-decoration:none;">
                        T#${item.id} ${escapar(item.assunto)}
                    </a>
                    <div class="meta">${escapar(item.projeto || '')}</div>
                </td>
                <td>${escapar(item.sprint || '-')}</td>
                <td>
                    <span class="badge${item.fechada ? ' fechada' : ''}">${escapar(item.status || '-')}</span>
                    ${atual ? '<span class="badge versao">esta tarefa</span>' : ''}
                </td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="3" class="meta">Nenhuma tarefa relacionada por cópia.</td></tr>';
}

function renderizarTimer() {
    const botao = document.getElementById('botao-timer');
    const info = document.getElementById('timer-info');
    const rodandoAqui = timer.rodando && String(timer.taskId) === String(taskId);

    botao.innerHTML = rodandoAqui ? '&#9632;' : '&#9658;';
    botao.title = rodandoAqui ? 'Parar e lançar horas' : 'Iniciar trabalho';
    botao.setAttribute('aria-label', botao.title);
    botao.classList.toggle('parar', rodandoAqui);

    if (rodandoAqui) {
        info.textContent = 'Em andamento nesta tarefa.';
    } else if (timer.rodando) {
        info.textContent = `Cronômetro rodando em T#${timer.taskId}. Iniciar aqui descarta o tempo da outra.`;
    } else {
        info.textContent = 'Nenhum cronômetro em andamento.';
    }

    atualizarCronometro();
}

function atualizarCronometro() {
    const alvo = document.getElementById('cronometro');
    const tarefa = tarefaAtual();
    const base = tarefa ? tarefa.horasHoje : 0;
    const rodandoAqui = timer.rodando && String(timer.taskId) === String(taskId);
    alvo.textContent = formatarDuracao(base * 3600 + (rodandoAqui ? segundosDecorridos() : 0));
}

function renderizar() {
    document.getElementById('aviso').innerHTML = '';
    renderizarCabecalho();
    renderizarBranch();
    renderizarFluxo();
    renderizarTimer();
}

async function carregar() {
    dados = await pedirJson(`/tarefa/${taskId}/dados`);
    timer = dados.timer || { rodando: false };
    renderizar();
}

async function iniciarTimer() {
    try {
        timer = await pedirJson('/timer/iniciar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId })
        });
        await carregar();
        mostrarToast(`Cronômetro iniciado em T#${taskId}.`);
    } catch (erro) {
        if (erro.status === 409 && erro.dados.anterior) {
            const anterior = erro.dados.anterior;
            const tempo = formatarDuracao(anterior.decorridoHoras * 3600);
            const confirmado = window.confirm(
                `T#${anterior.taskId} está em andamento há ${tempo}.\n\n` +
                'Iniciar esta tarefa e descartar o tempo da anterior?'
            );
            if (!confirmado) return;

            try {
                timer = await pedirJson('/timer/iniciar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId, confirmarTroca: true })
                });
                await carregar();
                mostrarToast(`Cronômetro iniciado em T#${taskId}.`);
            } catch (falha) {
                mostrarToast(falha.message, 'erro');
            }
            return;
        }
        mostrarToast(erro.message, 'erro');
    }
}

function abrirModalCriarBranch() {
    const versao = versaoDaSprint();
    const ano = anoDaVersao();

    const overlay = abrirModal(`
        <div class="modal-header">
            <h3>Criar branch — T#${escapar(taskId)}</h3>
            <button data-fechar>&times;</button>
        </div>
        <div class="modal-body">
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <div class="campo" style="flex:1; min-width:160px;">
                    <label for="projeto">Projeto</label>
                    <select id="projeto">
                        <option value="financeiro">Financeiro</option>
                        <option value="skyboletos">Sky Boletos</option>
                        <option value="paineleletronico">Painel Eletrônico</option>
                    </select>
                </div>
                <div class="campo" style="flex:1; min-width:160px;">
                    <label for="versao">Versão destino</label>
                    <input type="text" id="versao" value="${escapar(versao)}">
                </div>
            </div>
            <div class="campo">
                <label for="tag">Basear na tag (ano ${escapar(ano)})</label>
                <select id="tag"><option value="">-- Trunk (padrão) --</option></select>
                <small id="tag-status">Carregando tags...</small>
            </div>
            <div id="erro-branch" class="aviso erro oculto"></div>
        </div>
        <div class="modal-footer">
            <button class="btn secundario" data-fechar>Cancelar</button>
            <button class="btn" id="confirmar-branch">Criar branch</button>
        </div>
    `);

    overlay.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click', () => overlay.remove()));

    const selectProjeto = overlay.querySelector('#projeto');
    const selectTag = overlay.querySelector('#tag');
    const statusTag = overlay.querySelector('#tag-status');

    async function carregarTags() {
        statusTag.textContent = 'Carregando tags...';
        selectTag.innerHTML = '<option value="">-- Trunk (padrão) --</option>';

        try {
            const dadosTags = await pedirJson(`/list-tags?year=${encodeURIComponent(ano)}&project=${encodeURIComponent(selectProjeto.value)}`);
            for (const tag of dadosTags.tags || []) {
                const opcao = document.createElement('option');
                opcao.value = tag.value;
                opcao.textContent = `${tag.label} — ${formatarData(tag.date)}${tag.author ? ` (${tag.author})` : ''}`;
                selectTag.appendChild(opcao);
            }
            statusTag.textContent = (dadosTags.tags || []).length > 0
                ? 'Sem tag selecionada: a branch nasce do trunk.'
                : (dadosTags.message || 'Nenhuma tag encontrada; a branch nascerá do trunk.');
        } catch (erro) {
            statusTag.textContent = `Falha ao carregar tags: ${erro.message}`;
        }
    }

    selectProjeto.addEventListener('change', carregarTags);
    carregarTags();

    overlay.querySelector('#confirmar-branch').addEventListener('click', async evento => {
        const botao = evento.currentTarget;
        const erro = overlay.querySelector('#erro-branch');
        const versaoEscolhida = overlay.querySelector('#versao').value.trim();

        if (!versaoEscolhida) {
            erro.textContent = 'Informe a versão destino.';
            erro.classList.remove('oculto');
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Criando...';
        erro.classList.add('oculto');

        try {
            const resultado = await pedirJson('/create-branch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId,
                    version: versaoEscolhida,
                    sourceTag: selectTag.value,
                    year: ano,
                    project: selectProjeto.value
                })
            });

            overlay.remove();
            mostrarToast(resultado.message || 'Branch criada.');
            await carregar();
        } catch (falha) {
            erro.textContent = falha.message;
            erro.classList.remove('oculto');
            botao.disabled = false;
            botao.textContent = 'Criar branch';
        }
    });
}

function abrirModalMerge(urlOrigem) {
    const caminhoLocal = localStorage.getItem('svn_local_trunk_path') || 'D:\\sky';

    const overlay = abrirModal(`
        <div class="modal-header">
            <h3>Mesclar alterações para o Trunk</h3>
            <button data-fechar>&times;</button>
        </div>
        <div class="modal-body">
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <div class="campo" style="flex:1; min-width:220px;">
                    <label>Origem (branch)</label>
                    <input type="text" value="${escapar(urlOrigem)}" readonly style="font-family: ui-monospace, Consolas, monospace; font-size:12px;">
                </div>
                <div class="campo" style="flex:1; min-width:220px;">
                    <label for="caminho-local">Caminho local do Trunk</label>
                    <input type="text" id="caminho-local" value="${escapar(caminhoLocal)}">
                </div>
            </div>
            <div class="campo">
                <label>Revisões</label>
                <div class="lista-revisoes" id="lista-revisoes">
                    <div style="padding:14px;" class="meta">Carregando histórico...</div>
                </div>
            </div>
            <div class="campo">
                <label for="comentario-merge">Comentário</label>
                <textarea id="comentario-merge">Merge T #${escapar(taskId)}: </textarea>
                <button class="btn secundario pequeno" type="button" id="copiar-comentario" style="align-self:flex-start;">Copiar comentário</button>
                <small>Use na mensagem de commit após concluir o merge no TortoiseSVN.</small>
            </div>
            <div id="erro-merge" class="aviso erro oculto"></div>
        </div>
        <div class="modal-footer">
            <button class="btn secundario" data-fechar>Cancelar</button>
            <button class="btn secundario" id="log-merge">Abrir log (Tortoise)</button>
            <button class="btn" id="confirmar-merge" disabled>Executar merge</button>
        </div>
    `);

    overlay.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click', () => overlay.remove()));

    const caminhoInput = overlay.querySelector('#caminho-local');
    caminhoInput.addEventListener('input', () => localStorage.setItem('svn_local_trunk_path', caminhoInput.value));

    overlay.querySelector('#copiar-comentario').addEventListener('click', () => {
        navigator.clipboard.writeText(overlay.querySelector('#comentario-merge').value)
            .then(() => mostrarToast('Comentário copiado.'))
            .catch(falha => mostrarToast(falha.message, 'erro'));
    });

    overlay.querySelector('#log-merge').addEventListener('click', () => abrirTortoise('log', urlOrigem));

    const lista = overlay.querySelector('#lista-revisoes');
    const botaoMerge = overlay.querySelector('#confirmar-merge');
    const erro = overlay.querySelector('#erro-merge');

    pedirJson(`/branch-log?url=${encodeURIComponent(urlOrigem)}`)
        .then(dadosLog => {
            const commits = dadosLog.commits || [];
            if (commits.length === 0) {
                lista.innerHTML = '<div style="padding:14px; color:var(--vermelho);">Nenhum commit encontrado.</div>';
                return;
            }

            lista.innerHTML = commits.map(commit => `
                <label>
                    <input type="checkbox" class="revisao" value="${escapar(commit.revision)}" checked style="width:auto;">
                    <span class="rev">r${escapar(commit.revision)}</span>
                    <span>${escapar(commit.message || '')}</span>
                </label>
            `).join('');
            botaoMerge.disabled = false;
        })
        .catch(falha => {
            lista.innerHTML = `<div style="padding:14px; color:var(--vermelho);">${escapar(falha.message)}</div>`;
        });

    botaoMerge.addEventListener('click', async () => {
        const caminho = caminhoInput.value.trim();
        const revisoes = [...overlay.querySelectorAll('.revisao:checked')]
            .map(caixa => caixa.value)
            .sort((a, b) => Number(a) - Number(b));

        if (caminho.length < 3) {
            erro.textContent = 'Informe o caminho local do Trunk.';
            erro.classList.remove('oculto');
            return;
        }
        if (revisoes.length === 0) {
            erro.textContent = 'Selecione pelo menos uma revisão.';
            erro.classList.remove('oculto');
            return;
        }

        botaoMerge.disabled = true;
        botaoMerge.textContent = 'Abrindo...';
        erro.classList.add('oculto');

        try {
            await pedirJson('/execute-merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: urlOrigem, target: caminho, revisions: revisoes })
            });
            overlay.remove();
            mostrarToast('Interface de merge do TortoiseSVN aberta.');
        } catch (falha) {
            erro.textContent = falha.message;
            erro.classList.remove('oculto');
            botaoMerge.disabled = false;
            botaoMerge.textContent = 'Executar merge';
        }
    });
}

async function abrirTortoise(comando, caminho) {
    try {
        await pedirJson('/open-tortoise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: comando, path: caminho })
        });
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('atualizar').addEventListener('click', () => {
        carregar().catch(erro => mostrarToast(erro.message, 'erro'));
    });

    document.getElementById('botao-timer').addEventListener('click', () => {
        if (timer.rodando && String(timer.taskId) === String(taskId)) {
            abrirModalRegistroTempo(timer, () => {
                timer = { rodando: false };
                carregar().catch(erro => mostrarToast(erro.message, 'erro'));
            });
        } else {
            iniciarTimer();
        }
    });

    carregar().catch(erro => {
        document.getElementById('aviso').innerHTML = `<div class="aviso erro">${escapar(erro.message)}</div>`;
        document.getElementById('titulo').textContent = 'Tarefa indisponível';
        document.getElementById('branch-conteudo').textContent = 'Atualize a tarefa para consultar a branch.';
    });

    setInterval(atualizarCronometro, 1000);
});
