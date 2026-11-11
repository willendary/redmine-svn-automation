const PROJETOS_LABEL = {
    financeiro: 'Financeiro',
    skyboletos: 'Sky Boletos',
    paineleletronico: 'Painel Eletrônico'
};

const CHAVE_FILTROS = 'sky_merge_filtros';

function lerFiltrosSalvos() {
    try {
        const filtros = JSON.parse(localStorage.getItem(CHAVE_FILTROS) || '{}');
        return filtros && typeof filtros === 'object' && !Array.isArray(filtros) ? filtros : {};
    } catch (e) {
        return {};
    }
}

const filtrosSalvos = lerFiltrosSalvos();
const estado = {
    dados: null,
    carregando: false,
    responsavel: filtrosSalvos.responsavel || localStorage.getItem('sky_merge_responsavel') || 'todos',
    sistema: filtrosSalvos.sistema || 'todos',
    ano: String(filtrosSalvos.ano || localStorage.getItem('sky_merge_ano') || new Date().getFullYear()),
    situacao: filtrosSalvos.situacao || 'todos',
    versao: filtrosSalvos.versao || 'todas',
    somenteProntas: filtrosSalvos.somenteProntas === true,
    busca: typeof filtrosSalvos.busca === 'string' ? filtrosSalvos.busca : '',
    mostrarMescladas: filtrosSalvos.mostrarMescladas === true,
    branchMerge: null
};

const el = id => document.getElementById(id);

function salvarFiltros() {
    const filtros = {
        responsavel: estado.responsavel,
        sistema: estado.sistema,
        ano: estado.ano,
        situacao: estado.situacao,
        versao: estado.versao,
        somenteProntas: estado.somenteProntas,
        busca: estado.busca,
        mostrarMescladas: estado.mostrarMescladas
    };
    localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros));
}

function escapar(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caractere]));
}

function formatarData(iso) {
    if (!iso) return '';
    const data = new Date(iso);
    if (isNaN(data.getTime())) return iso;
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

let temporizadorToast = null;
function mostrarToast(mensagem) {
    const toast = el('toast');
    toast.textContent = mensagem;
    toast.classList.remove('oculto');
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => toast.classList.add('oculto'), 3500);
}

function mostrarAviso(mensagem, erro = false) {
    const aviso = el('aviso');
    aviso.textContent = mensagem;
    aviso.className = `aviso${erro ? ' erro' : ''}`;
}

function esconderAviso() {
    el('aviso').classList.add('oculto');
}

function mostrarCardConfig(mostrar) {
    el('card-config').classList.toggle('oculto', !mostrar);
}

function preencherAnos() {
    const anoAtual = new Date().getFullYear();
    const select = el('filtro-ano');
    const anos = [];
    for (let ano = anoAtual; ano >= anoAtual - 3; ano--) anos.push(ano);

    select.innerHTML = anos.map(ano => `<option value="${ano}">${ano}</option>`).join('');
    if (anos.includes(Number(estado.ano))) select.value = estado.ano;
    else select.value = String(anoAtual);
    estado.ano = select.value;
}

async function verificarConfig() {
    try {
        const resposta = await fetch('/config-redmine');
        const config = await resposta.json();
        el('cfg-url').value = config.url || 'https://redmine.skyinformatica.com.br';
        mostrarCardConfig(!config.configurado);
    } catch (e) {
        mostrarAviso(`Não foi possível falar com o servidor local: ${e.message}`, true);
    }
    carregar();
}

async function carregar() {
    if (estado.carregando) return;
    estado.carregando = true;
    el('btn-atualizar').disabled = true;
    el('carregando').classList.remove('oculto');
    el('tabela-wrapper').classList.add('oculto');
    esconderAviso();

    try {
        const url = `/merge-pendentes?years=${encodeURIComponent(estado.ano)}&projects=financeiro,skyboletos,paineleletronico`;
        const resposta = await fetch(url);
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.details || dados.error || `HTTP ${resposta.status}`);

        estado.dados = dados;

        if (dados.redmine && !dados.redmine.configurado) mostrarCardConfig(true);
        if (dados.redmine && dados.redmine.erro) mostrarAviso(`Redmine: ${dados.redmine.erro}`, true);

        preencherResponsaveis();
        preencherSituacoes();
        renderizar();
    } catch (e) {
        mostrarAviso(`Erro ao carregar pendentes: ${e.message}`, true);
        el('tabela-contagem').textContent = estado.dados ? 'Exibindo a última consulta disponível.' : 'Dados indisponíveis. Use Atualizar pendências para tentar novamente.';
        el('ultima-atualizacao').textContent = 'Falha na atualização';
    } finally {
        estado.carregando = false;
        el('btn-atualizar').disabled = false;
        el('carregando').classList.add('oculto');
        el('tabela-wrapper').classList.remove('oculto');
    }
}

function preencherResponsaveis() {
    const select = el('filtro-responsavel');
    const responsaveis = estado.dados?.responsaveis || [];
    select.innerHTML = '<option value="todos">Todos</option>' + responsaveis.map(responsavel =>
        `<option value="${escapar(responsavel)}">${escapar(responsavel)}</option>`
    ).join('');

    const escolhido = responsaveis.includes(estado.responsavel) ? estado.responsavel : 'todos';

    select.value = escolhido;
    estado.responsavel = escolhido;
}

function preencherSituacoes() {
    const select = el('filtro-situacao');
    const situacoes = [...new Set((estado.dados?.branches || [])
        .map(branch => branch.tarefa?.status)
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    select.innerHTML = '<option value="todos">Todas</option>' + situacoes.map(situacao =>
        `<option value="${escapar(situacao)}">${escapar(situacao)}</option>`
    ).join('');

    select.value = situacoes.includes(estado.situacao) ? estado.situacao : 'todos';
    estado.situacao = select.value;
}

function restaurarFiltrosEstaticos() {
    const sistemas = [...el('filtro-sistema').options].map(opcao => opcao.value);
    estado.sistema = sistemas.includes(estado.sistema) ? estado.sistema : 'todos';
    el('filtro-sistema').value = estado.sistema;

    const versoes = [...el('filtro-versao').options].map(opcao => opcao.value);
    estado.versao = versoes.includes(estado.versao) ? estado.versao : 'todas';
    el('filtro-versao').value = estado.versao;

    el('filtro-prontas').checked = estado.somenteProntas;
    el('filtro-busca').value = estado.busca;
    el('filtro-mescladas').checked = estado.mostrarMescladas;
}

function branchesFiltradas() {
    const busca = estado.busca.toLowerCase();

    return (estado.dados?.branches || []).filter(branch => {
        if (!estado.mostrarMescladas && (branch.status === 'mesclado' || branch.status === 'sem-commit')) return false;
        if (estado.responsavel !== 'todos' && branch.tarefa?.responsavel !== estado.responsavel) return false;
        if (estado.sistema !== 'todos' && branch.sistema !== estado.sistema) return false;
        if (estado.situacao !== 'todos' && branch.tarefa?.status !== estado.situacao) return false;

        if (estado.versao === 'teste' && !branch.tarefa?.versaoTeste) return false;
        if (estado.versao === 'estavel' && !branch.tarefa?.versaoEstavel) return false;
        if (estado.versao === 'sem-teste' && branch.tarefa?.versaoTeste) return false;

        if (estado.somenteProntas && !(branch.tarefa?.fechada || branch.tarefa?.versaoTeste)) return false;

        if (busca) {
            const texto = [
                branch.taskId,
                branch.tarefa?.assunto,
                branch.tarefa?.sprint,
                branch.tarefa?.responsavel,
                branch.tarefa?.versaoTeste,
                branch.tarefa?.versaoEstavel,
                branch.branchUrl,
                branch.versao,
                ...branch.revisoes.map(revisao => revisao.mensagem)
            ].join(' ').toLowerCase();
            if (!texto.includes(busca)) return false;
        }

        return true;
    });
}

function renderizar() {
    const branches = branchesFiltradas();
    renderizarResumo(branches);

    const corpo = el('corpo');
    if (branches.length === 0) {
        corpo.innerHTML = '';
        el('vazio').classList.remove('oculto');
        return;
    }

    el('vazio').classList.add('oculto');
    corpo.innerHTML = branches.map(htmlLinha).join('');
}

function renderizarResumo(branches) {
    const pendentes = branches.reduce((total, branch) => total + branch.pendentes.length, 0);
    const prontas = branches.filter(branch => branch.pendentes.length > 0 && (branch.tarefa?.fechada || branch.tarefa?.versaoTeste)).length;
    const sistemas = new Set(branches.map(branch => branch.sistema)).size;
    const icon = nome => window.SkyUI ? window.SkyUI.icon(nome) : '';
    const metricas = [
        ['Tarefas na fila', branches.length, 'branches nos filtros atuais', 'tasks', ''],
        ['Revisões pendentes', pendentes, 'alterações aguardando merge', 'branch', ' destaque'],
        ['Prontas para merge', prontas, 'fechadas ou com versão de teste', 'check', ''],
        ['Sistemas envolvidos', sistemas, 'projetos nos filtros atuais', 'grid', '']
    ];
    el('resumo').innerHTML = metricas.map(([titulo, valor, nota, simbolo, classe]) =>
        '<div class="chip'+classe+'"><span>'+titulo+'</span><span class="metric-icon">'+icon(simbolo)+'</span><strong>'+valor+'</strong><span class="metric-note">'+nota+'</span></div>'
    ).join('');
    el('total-resultados').textContent = branches.length;
    el('tabela-contagem').textContent = branches.length + (branches.length === 1 ? ' tarefa encontrada' : ' tarefas encontradas');
    el('ultima-atualizacao').textContent = estado.dados?.geradoEm ? 'Atualizado em ' + formatarData(estado.dados.geradoEm) : 'Dados carregados';
}

function htmlLinha(branch) {
    const tarefa = branch.tarefa;
    const link = tarefa
        ? `<a class="tarefa-id" href="${escapar(tarefa.url)}" target="_blank" rel="noopener">T#${branch.taskId}</a>`
        : `<span class="tarefa-id">T#${branch.taskId}</span>`;

    const statusTarefa = tarefa
        ? `<span class="badge status${tarefa.fechada ? ' fechada' : ''}">${escapar(tarefa.status)}</span>`
        : '<span class="badge status">sem tarefa</span>';

    const versoes = tarefa
        ? [
            tarefa.versaoTeste ? `<span class="badge versao teste" title="Versão teste">teste ${escapar(tarefa.versaoTeste)}</span>` : '',
            tarefa.versaoEstavel ? `<span class="badge versao estavel" title="Versão estável">estável ${escapar(tarefa.versaoEstavel)}</span>` : ''
        ].filter(Boolean).join('')
        : '';

    const assunto = tarefa?.assunto || '(tarefa não encontrada no Redmine)';
    const sprint = tarefa?.sprint ? `Sprint: ${escapar(tarefa.sprint)}` : '';
    const responsavel = tarefa?.responsavel ? `Responsável: ${escapar(tarefa.responsavel)}` : '';

    const totalRevisoes = branch.revisoes.length;
    const classePendentes = branch.status === 'mesclado' ? 'mesclado' : branch.status === 'parcial' ? 'parcial' : '';
    const textoPendentes = branch.status === 'mesclado'
        ? 'Mesclado'
        : `${branch.pendentes.length} pendente${branch.pendentes.length === 1 ? '' : 's'}`;

    const ultima = branch.ultimaRevisao;
    const dias = branch.diasUltimaRevisao;
    const idade = (dias != null && ultima)
        ? `<div class="meta idade${dias > 30 ? ' velha' : ''}">há ${dias} dia${dias === 1 ? '' : 's'}</div>`
        : '';
    const ultimaHtml = ultima
        ? `<div style="font-weight:600;color:#0369a1;">r${ultima.revisao}</div>
           <div class="meta">${escapar(formatarData(ultima.data))}</div>
           <div class="meta">por ${escapar(ultima.autor || 'desconhecido')}</div>
           ${idade}`
        : '<span class="meta">-</span>';

    const sistema = PROJETOS_LABEL[branch.sistema] || branch.sistema;
    const versao = branch.versao ? `Versão ${escapar(branch.versao)}` : '';

    return `
        <tr class="linha">
            <td>${link}<div class="badges">${statusTarefa}${versoes}</div></td>
            <td>
                <div class="assunto">${escapar(assunto)}</div>
                ${sprint ? `<div class="meta">${sprint}</div>` : ''}
                ${responsavel ? `<div class="meta">${responsavel}</div>` : ''}
            </td>
            <td>
                <div style="font-weight:600;">${escapar(sistema)}</div>
                ${versao ? `<div class="meta">${versao}</div>` : ''}
                <div class="meta">${escapar(branch.pastaBranch)}</div>
            </td>
            <td>
                <button class="btn-pendentes ${classePendentes}" data-toggle="${escapar(branch.chave)}">
                    ${escapar(textoPendentes)}
                </button>
                <div class="meta">${totalRevisoes} ${totalRevisoes === 1 ? 'revisão' : 'revisões'} no total</div>
            </td>
            <td>${ultimaHtml}</td>
            <td>
                <div class="acoes">
                    <button class="acao" data-acao="log" data-chave="${escapar(branch.chave)}">Log</button>
                    <button class="acao" data-acao="copiar" data-chave="${escapar(branch.chave)}">Copiar</button>
                    <button class="acao verificar" data-acao="verificar" data-chave="${escapar(branch.chave)}" title="Compara os arquivos das revisões pendentes com o trunk">Verificar</button>
                    <button class="acao merge" data-acao="merge" data-chave="${escapar(branch.chave)}">Mesclar</button>
                    ${branch.pendentes.length > 0 ? `<button class="acao record" data-acao="marcar" data-chave="${escapar(branch.chave)}" title="Grava o mergeinfo no trunk (record-only) e commita">Marcar mesclada</button>` : ''}
                </div>
            </td>
        </tr>
        <tr class="detalhe oculto" data-detalhe="${escapar(branch.chave)}">
            <td colspan="6">
                <div class="verificacao oculto" data-verificacao="${escapar(branch.chave)}"></div>
                <div class="lista-revisoes">
                    ${branch.revisoes.slice().reverse().map(revisao => `
                        <div class="revisao ${revisao.mesclada ? '' : 'pendente'}">
                            <span class="rev">r${revisao.revisao}</span>
                            <span class="data">${escapar(formatarData(revisao.data))}</span>
                            <span class="msg">${escapar(revisao.mensagem || '(sem mensagem)')}
                                <span class="meta">por ${escapar(revisao.autor || 'desconhecido')}${revisao.subpastas.length ? ` · ${escapar(revisao.subpastas.join(', '))}` : ''}</span>
                            </span>
                            <span class="situacao ${revisao.mesclada ? 'mesclada' : 'pendente'}">${revisao.mesclada ? 'mesclada' : 'pendente'}</span>
                        </div>
                    `).join('')}
                </div>
            </td>
        </tr>
    `;
}

function buscarBranch(chave) {
    return (estado.dados?.branches || []).find(branch => branch.chave === chave);
}

function alternarDetalhe(chave) {
    const detalhes = document.querySelectorAll('tr.detalhe');
    for (const detalhe of detalhes) {
        if (detalhe.dataset.detalhe === chave) detalhe.classList.toggle('oculto');
        else detalhe.classList.add('oculto');
    }
}

function abrirDetalhe(chave) {
    const detalhes = document.querySelectorAll('tr.detalhe');
    for (const detalhe of detalhes) {
        detalhe.classList.toggle('oculto', detalhe.dataset.detalhe !== chave);
    }
}

async function copiarBranch(branch) {
    try {
        await navigator.clipboard.writeText(branch.branchUrl);
        mostrarToast('URL da branch copiada.');
    } catch (e) {
        mostrarToast('Não foi possível copiar a URL.');
    }
}

async function abrirLogTortoise(caminho) {
    try {
        const resposta = await fetch('/open-tortoise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'log', path: caminho })
        });
        if (!resposta.ok) throw new Error('Falha ao abrir o Tortoise.');
    } catch (e) {
        mostrarToast(e.message);
    }
}

async function consultarVerificacao(branch) {
    const base = branch.pendentes.length > 0 ? branch.pendentes : branch.revisoes;
    const revisoes = base.map(revisao => revisao.revisao).join(',');
    const resposta = await fetch(`/verificar-conteudo?branchUrl=${encodeURIComponent(branch.branchUrl)}&revisoes=${revisoes}`);
    const dados = await resposta.json();
    if (!resposta.ok || !dados.success) throw new Error(dados.error || 'Falha ao verificar o conteúdo.');
    return dados;
}

function renderizarVerificacao(alvo, dados) {
    if (!alvo) return;
    alvo.classList.remove('oculto');

    if (dados.verificados === 0) {
        alvo.className = 'verificacao';
        alvo.textContent = 'Nenhuma revisão pendente para verificar.';
        return;
    }

    if (dados.ok) {
        alvo.className = 'verificacao ok';
        alvo.textContent = `Conteúdo confere com o trunk — ${dados.verificados} caminho(s) verificado(s).`;
        return;
    }

    const itens = dados.diferentes.slice(0, 10).map(item =>
        `<li>${escapar(item.caminho)} <span class="meta">(${escapar(item.situacao)})</span></li>`
    ).join('');
    const resto = dados.diferentes.length > 10
        ? `<li class="meta">…e mais ${dados.diferentes.length - 10}</li>`
        : '';

    alvo.className = 'verificacao alerta';
    alvo.innerHTML = `<strong>${dados.diferentes.length} de ${dados.verificados} caminho(s) diferem do trunk:</strong><ul>${itens}${resto}</ul>`;
}

async function verificarConteudoBranch(branch, botao) {
    const alvo = document.querySelector(`[data-verificacao="${branch.chave}"]`);
    if (botao) {
        botao.disabled = true;
        botao.textContent = 'Verificando...';
    }
    if (alvo) {
        alvo.className = 'verificacao';
        alvo.textContent = 'Conferindo conteúdo com o trunk...';
        alvo.classList.remove('oculto');
    }
    abrirDetalhe(branch.chave);

    try {
        const dados = await consultarVerificacao(branch);
        renderizarVerificacao(alvo, dados);
        return dados;
    } catch (e) {
        if (alvo) {
            alvo.className = 'verificacao erro';
            alvo.textContent = `Não foi possível verificar: ${e.message}`;
        }
        return { erro: e.message };
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = 'Verificar';
        }
    }
}

function resumoVerificacao(dados) {
    if (!dados) return '';
    if (dados.erro) return `Não foi possível conferir o conteúdo: ${dados.erro}`;
    if (dados.verificados === 0) return 'Sem revisões para conferir.';
    if (dados.ok) return `Conteúdo confere com o trunk (${dados.verificados} caminho(s)).`;
    return `${dados.diferentes.length} de ${dados.verificados} caminho(s) ainda diferem do trunk.`;
}

function mensagemConfirmacao(branch, verificacao) {
    const alvo = `T#${branch.taskId}`;
    const nota = '\n\nSerá gravado apenas o mergeinfo no trunk (record-only). Nenhum arquivo é alterado.';

    if (!verificacao) return `Marcar ${alvo} como mesclada?${nota}`;
    if (verificacao.erro) {
        return `Não foi possível verificar o conteúdo: ${verificacao.erro}\n\nMarcar ${alvo} como mesclada mesmo assim?${nota}`;
    }
    if (verificacao.verificados === 0) return `Marcar ${alvo} como mesclada?${nota}`;
    if (verificacao.ok) {
        return `Conteúdo confere com o trunk (${verificacao.verificados} caminho(s)).\n\nMarcar ${alvo} como mesclada?${nota}`;
    }

    const lista = verificacao.diferentes.slice(0, 8).map(item => `- ${item.caminho} (${item.situacao})`).join('\n');
    const resto = verificacao.diferentes.length > 8 ? `\n- …e mais ${verificacao.diferentes.length - 8}` : '';
    return `⚠️ ${verificacao.diferentes.length} de ${verificacao.verificados} caminho(s) ainda diferem do trunk:\n${lista}${resto}\n\nMarcar ${alvo} como mesclada mesmo assim?${nota}`;
}

async function marcarComoMesclada(branch, botao) {
    const revisoes = branch.pendentes.map(revisao => revisao.revisao);

    botao.disabled = true;
    botao.textContent = 'Verificando...';

    let verificacao = null;
    try {
        verificacao = await consultarVerificacao(branch);
    } catch (e) {
        verificacao = { erro: e.message };
    }

    const confirmado = window.confirm(mensagemConfirmacao(branch, verificacao));
    if (!confirmado) {
        botao.disabled = false;
        botao.textContent = 'Marcar mesclada';
        return;
    }

    botao.textContent = 'Marcando...';

    try {
        const resposta = await fetch('/marcar-mesclada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: branch.taskId, branchUrl: branch.branchUrl, revisoes })
        });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.success) throw new Error(dados.error || 'Falha ao marcar como mesclada.');

        const pos = await consultarVerificacao(branch).catch(e => ({ erro: e.message }));
        mostrarToast(`T#${branch.taskId} marcada como mesclada. ${resumoVerificacao(pos)}`);
        await carregar();
    } catch (e) {
        mostrarAviso(`T#${branch.taskId}: ${e.message}`, true);
        botao.disabled = false;
        botao.textContent = 'Marcar mesclada';
    }
}

async function abrirModalMerge(branch) {
    estado.branchMerge = branch;

    const subprojeto = branch.subprojetoPrimario || '';
    const origem = branch.branchUrl + (subprojeto ? `/${subprojeto}` : '');

    el('merge-origem').value = origem;
    el('merge-caminho').value = localStorage.getItem('sky_local_trunk_path') || 'C:\\';
    el('merge-comentario').value = `Merge T #${branch.taskId}: `;
    el('merge-status').textContent = '';
    el('merge-status').className = 'status';
    el('merge-revisoes').innerHTML = '<div class="carregando"><span class="spinner"></span>Carregando revisões...</div>';
    el('merge-executar').disabled = true;
    el('modal-merge').classList.remove('oculto');

    try {
        const resposta = await fetch(`/branch-log?url=${encodeURIComponent(origem)}`);
        const dados = await resposta.json();
        if (!resposta.ok || !dados.success) throw new Error(dados.details || dados.error || 'Falha ao buscar o log.');

        const commits = dados.commits || [];
        if (commits.length === 0) {
            el('merge-revisoes').innerHTML = '<div class="estado-vazio">Nenhum commit encontrado nesta branch.</div>';
            return;
        }

        const pendentes = new Set(branch.pendentes.map(revisao => String(revisao.revisao)));
        el('merge-revisoes').innerHTML = commits.map(commit => {
            const marcado = pendentes.size === 0 || pendentes.has(String(commit.revision));
            return `
                <label class="merge-rev">
                    <input type="checkbox" value="${escapar(commit.revision)}" ${marcado ? 'checked' : ''}>
                    <span class="rev">r${escapar(commit.revision)}</span>
                    <span class="msg">${escapar(commit.message || '(sem mensagem)')}</span>
                </label>
            `;
        }).join('');

        el('merge-executar').disabled = false;
    } catch (e) {
        el('merge-revisoes').innerHTML = `<div class="estado-vazio">${escapar(e.message)}</div>`;
    }
}

async function executarMerge() {
    const branch = estado.branchMerge;
    if (!branch) return;

    const origem = el('merge-origem').value;
    const caminho = el('merge-caminho').value.trim();
    const revisoes = [...document.querySelectorAll('#merge-revisoes input:checked')]
        .map(input => input.value)
        .sort((a, b) => Number(a) - Number(b));

    const status = el('merge-status');
    status.className = 'status';

    if (!caminho || caminho.length < 3) {
        status.textContent = 'Informe o caminho local do Trunk.';
        status.className = 'status erro';
        return;
    }

    if (revisoes.length === 0) {
        status.textContent = 'Selecione ao menos uma revisão.';
        status.className = 'status erro';
        return;
    }

    localStorage.setItem('sky_local_trunk_path', caminho);
    el('merge-executar').disabled = true;
    status.textContent = 'Abrindo merge no Tortoise...';

    try {
        const resposta = await fetch('/execute-merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: origem, target: caminho, revisions: revisoes })
        });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.success) throw new Error(dados.details || dados.error || 'Falha ao executar o merge.');

        status.textContent = 'Tortoise aberto. Conclua o merge e o commit por lá.';
        status.className = 'status ok';
        mostrarToast('Merge aberto no Tortoise.');
    } catch (e) {
        status.textContent = e.message;
        status.className = 'status erro';
    } finally {
        el('merge-executar').disabled = false;
    }
}

function fecharModalMerge() {
    el('modal-merge').classList.add('oculto');
    estado.branchMerge = null;
}

async function salvarConfig() {
    const url = el('cfg-url').value.trim();
    const apiKey = el('cfg-key').value.trim();
    const status = el('cfg-status');

    if (!url || !apiKey) {
        status.textContent = 'Informe a URL e a API key.';
        status.style.color = '#dc2626';
        return;
    }

    el('cfg-salvar').disabled = true;
    status.textContent = 'Validando...';
    status.style.color = '#64748b';

    try {
        const resposta = await fetch('/config-redmine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, apiKey })
        });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.error || 'Falha ao salvar.');

        status.textContent = `Configurado para ${dados.usuario}.`;
        status.style.color = '#16a34a';
        el('cfg-key').value = '';
        mostrarToast('API key do Redmine salva.');
        setTimeout(() => mostrarCardConfig(false), 1200);
        await carregar();
    } catch (e) {
        status.textContent = e.message;
        status.style.color = '#dc2626';
    } finally {
        el('cfg-salvar').disabled = false;
    }
}

function ligarEventos() {
    el('btn-atualizar').addEventListener('click', () => carregar());
    el('btn-config').addEventListener('click', () => {
        el('card-config').classList.toggle('oculto');
    });

    el('cfg-salvar').addEventListener('click', salvarConfig);

    el('filtro-responsavel').addEventListener('change', evento => {
        estado.responsavel = evento.target.value;
        salvarFiltros();
        renderizar();
    });

    el('filtro-sistema').addEventListener('change', evento => {
        estado.sistema = evento.target.value;
        salvarFiltros();
        renderizar();
    });

    el('filtro-ano').addEventListener('change', evento => {
        estado.ano = evento.target.value;
        salvarFiltros();
        carregar();
    });

    el('filtro-situacao').addEventListener('change', evento => {
        estado.situacao = evento.target.value;
        salvarFiltros();
        renderizar();
    });

    el('filtro-versao').addEventListener('change', evento => {
        estado.versao = evento.target.value;
        salvarFiltros();
        renderizar();
    });

    el('filtro-prontas').addEventListener('change', evento => {
        estado.somenteProntas = evento.target.checked;
        salvarFiltros();
        renderizar();
    });

    let temporizadorBusca = null;
    el('filtro-busca').addEventListener('input', evento => {
        estado.busca = evento.target.value;
        salvarFiltros();
        clearTimeout(temporizadorBusca);
        temporizadorBusca = setTimeout(renderizar, 200);
    });

    el('filtro-mescladas').addEventListener('change', evento => {
        estado.mostrarMescladas = evento.target.checked;
        salvarFiltros();
        renderizar();
    });

    el('corpo').addEventListener('click', evento => {
        const botaoToggle = evento.target.closest('[data-toggle]');
        if (botaoToggle) {
            alternarDetalhe(botaoToggle.dataset.toggle);
            return;
        }

        const botaoAcao = evento.target.closest('[data-acao]');
        if (!botaoAcao) return;

        const branch = buscarBranch(botaoAcao.dataset.chave);
        if (!branch) return;

        if (botaoAcao.dataset.acao === 'log') abrirLogTortoise(branch.branchUrl);
        else if (botaoAcao.dataset.acao === 'copiar') copiarBranch(branch);
        else if (botaoAcao.dataset.acao === 'verificar') verificarConteudoBranch(branch, botaoAcao);
        else if (botaoAcao.dataset.acao === 'merge') abrirModalMerge(branch);
        else if (botaoAcao.dataset.acao === 'marcar') marcarComoMesclada(branch, botaoAcao);
    });

    el('merge-fechar').addEventListener('click', fecharModalMerge);
    el('merge-cancelar').addEventListener('click', fecharModalMerge);
    el('merge-executar').addEventListener('click', executarMerge);
    el('merge-log').addEventListener('click', () => abrirLogTortoise(el('merge-origem').value));
    el('modal-merge').addEventListener('click', evento => {
        if (evento.target === el('modal-merge')) fecharModalMerge();
    });

    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !el('modal-merge').classList.contains('oculto')) fecharModalMerge();
    });
}

preencherAnos();
restaurarFiltrosEstaticos();
ligarEventos();
verificarConfig();
