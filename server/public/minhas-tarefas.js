let tarefas = [];
let dias = [];
let totalHoje = 0;
let exibirFimDeSemana = true;
let filtro = '';
let diaExpandido = null;
let lancamentosDia = [];
let atividadesLancamento = [];
let carregandoLancamentos = false;
let erroLancamentos = '';

function htmlBadges(tarefa) {
    const status = `<span class="badge${tarefa.fechada ? ' fechada' : ''}">${escapar(tarefa.status || 'sem status')}</span>`;
    const versaoTeste = tarefa.versaoTeste ? `<span class="badge versao">teste ${escapar(tarefa.versaoTeste)}</span>` : '';
    const versaoEstavel = tarefa.versaoEstavel ? `<span class="badge versao">estável ${escapar(tarefa.versaoEstavel)}</span>` : '';
    return `${status}${versaoTeste}${versaoEstavel}`;
}

function htmlLinha(tarefa) {
    const link = `<a class="task-link" href="/tarefa/${tarefa.id}"><span class="task-number">#${tarefa.id}</span><span class="task-subject">${escapar(tarefa.assunto)}</span></a>`;

    return `
        <tr data-tarefa="${tarefa.id}">
            <td>
                ${link}
                <div class="meta">${htmlBadges(tarefa)} ${escapar(tarefa.projeto || '')}</div>
            </td>
            <td class="sprint-cell">${escapar(tarefa.sprint || '-')}</td>
            <td class="num">${formatarHoras(tarefa.horasHoje)}</td>
            <td><div class="row-actions">
                <button class="btn secundario pequeno" data-acao="copiar" data-tarefa="${tarefa.id}" aria-label="Copiar título da tarefa ${tarefa.id}" title="Copiar título">${window.SkyUI.icon('copy')}</button>
            </div></td>
        </tr>
    `;
}

function htmlGrupos(lista) {
    const partes = [];
    let sprintAtual = null;

    for (const tarefa of lista) {
        if (tarefa.sprint !== sprintAtual) {
            sprintAtual = tarefa.sprint;
            partes.push(`<tr class="linha-grupo"><td colspan="4">${escapar(sprintAtual || 'Sem sprint')}</td></tr>`);
        }
        partes.push(htmlLinha(tarefa));
    }

    return partes.join('');
}

function ehFimDeSemana(dia) {
    const [ano, mes, numero] = dia.split('-').map(Number);
    const diaSemana = new Date(ano, mes - 1, numero).getDay();
    return diaSemana === 0 || diaSemana === 6;
}

function htmlDetalhesDia(dia) {
    const total = formatarHoras(dia.horas);
    const acaoAdicionar = `<button class="btn pequeno" data-acao-dia="adicionar" data-dia="${escapar(dia.dia)}">＋ Lançar horas</button>`;

    if (carregandoLancamentos) {
        return `<div class="detalhes-dia"><div class="detalhes-dia-topo"><strong>Lançamentos do dia</strong>${acaoAdicionar}</div><div class="config-carregando">Carregando lançamentos...</div></div>`;
    }
    if (erroLancamentos) {
        return `<div class="detalhes-dia"><div class="detalhes-dia-topo"><strong>Lançamentos do dia</strong>${acaoAdicionar}</div><div class="aviso erro">${escapar(erroLancamentos)}</div></div>`;
    }
    if (lancamentosDia.length === 0) {
        return `<div class="detalhes-dia"><div class="detalhes-dia-topo"><div><strong>Lançamentos do dia</strong><div class="meta">Total: ${total}</div></div>${acaoAdicionar}</div><div class="vazio-lancamentos">Nenhum lançamento registrado neste dia.</div></div>`;
    }

    return `
        <div class="detalhes-dia">
            <div class="detalhes-dia-topo">
                <div>
                    <strong>Lançamentos do dia</strong>
                    <div class="meta">${lancamentosDia.length} lançamento(s) · Total ${total}</div>
                </div>
                ${acaoAdicionar}
            </div>
            <div class="tabela-wrapper">
                <table class="tabela-lancamentos">
                    <thead><tr><th>Tarefa</th><th>Atividade</th><th>Comentário</th><th class="num">Horas</th><th>Ação</th></tr></thead>
                    <tbody>${lancamentosDia.map(lancamento => `
                        <tr>
                            <td>${lancamento.taskId
                                ? (lancamento.urlTarefa
                                    ? `<a href="${escapar(lancamento.urlTarefa)}" target="_blank" rel="noopener" class="assunto">T#${lancamento.taskId} ${escapar(lancamento.assunto || '')}</a>`
                                    : `<span class="assunto">T#${lancamento.taskId}</span>`)
                                : `<span class="assunto">${escapar(lancamento.projeto ? `Projeto: ${lancamento.projeto}` : 'Lançamento sem tarefa')}</span>`}</td>
                            <td>${escapar(lancamento.atividade || '-')}</td>
                            <td>${escapar(lancamento.comentario || '-')}</td>
                            <td class="num">${formatarHoras(lancamento.horas)}</td>
                            <td><button class="btn secundario pequeno" data-acao-dia="editar" data-lancamento="${lancamento.id}">Alterar</button></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        </div>
    `;
}

function htmlLinhaDia(dia) {
    const aberto = diaExpandido === dia.dia;
    const poucas = dia.horas < 7;
    return `
        <tr class="linha-dia${aberto ? ' aberto' : ''}">
            <td><button class="botao-dia" data-dia-toggle="${escapar(dia.dia)}" aria-expanded="${aberto}"><span aria-hidden="true">${aberto ? '▾' : '▸'}</span>${escapar(dia.dia.split('-').reverse().join('/'))}</button></td>
            <td class="num ${poucas ? 'horas-baixas' : 'horas-ok'}">${formatarHoras(dia.horas)}</td>
        </tr>
        ${aberto ? `<tr class="linha-detalhe-dia"><td colspan="2">${htmlDetalhesDia(dia)}</td></tr>` : ''}
    `;
}

function renderizar() {
    const termo = filtro.toLowerCase();
    const visiveis = tarefas.filter(tarefa =>
        !termo || `${tarefa.id} ${tarefa.assunto} ${tarefa.sprint} ${tarefa.projeto}`.toLowerCase().includes(termo)
    );

    document.getElementById('corpo').innerHTML = visiveis.length > 0
        ? htmlGrupos(visiveis)
        : '<tr><td colspan="4" class="estado-vazio"><strong>Nenhuma tarefa por aqui</strong><p>Altere sua busca ou atualize a lista de tarefas.</p></td></tr>';

    const restante = Math.max(0, 7 - totalHoje);
    const metricas = [
        ['Horas registradas hoje', formatarHoras(totalHoje), 'tempo dedicado às suas entregas', 'clock'],
        ['Tarefas abertas', tarefas.length, 'atribuídas a você no Redmine', 'tasks'],
        ['Tempo para a meta', formatarHoras(restante), restante > 0 ? 'para completar as 7h do dia' : 'meta diária alcançada', 'check'],
        ['Dias com horas', dias.filter(dia => Number(dia.horas) > 0).length, 'nos últimos 10 dias', 'grid']
    ];
    document.getElementById('resumo').innerHTML = metricas.map(([titulo,valor,nota,simbolo],index) =>
        '<div class="chip'+(index === 0 ? ' destaque' : '')+'"><span>'+titulo+'</span><span class="metric-icon">'+window.SkyUI.icon(simbolo)+'</span><strong>'+escapar(valor)+'</strong><span class="metric-note">'+nota+'</span></div>'
    ).join('');
    document.getElementById('total-tarefas').textContent = visiveis.length;
    document.getElementById('meta-horas').textContent = formatarHoras(totalHoje);
    document.getElementById('meta-progresso').value = Math.min(7,totalHoje);
    document.getElementById('meta-restante').textContent = restante > 0 ? 'Faltam '+formatarHoras(restante)+' para sua meta.' : 'Meta alcançada. Bom trabalho!';

    const diasVisiveis = exibirFimDeSemana ? dias : dias.filter(dia => !ehFimDeSemana(dia.dia));
    document.getElementById('dias').innerHTML = diasVisiveis.length > 0
        ? diasVisiveis.map(htmlLinhaDia).join('')
        : '<tr><td colspan="2" class="meta">Sem horas lançadas no período.</td></tr>';
}

async function carregarLancamentosDia(dia) {
    diaExpandido = dia;
    carregandoLancamentos = true;
    erroLancamentos = '';
    lancamentosDia = [];
    renderizar();

    try {
        const dados = await pedirJson(`/time-entries?date=${encodeURIComponent(dia)}`);
        if (diaExpandido !== dia) return;
        lancamentosDia = dados.lancamentos || [];
        atividadesLancamento = dados.atividades || [];
    } catch (erro) {
        if (diaExpandido !== dia) return;
        erroLancamentos = erro.message;
    } finally {
        if (diaExpandido === dia) {
            carregandoLancamentos = false;
            renderizar();
        }
    }
}

function alternarDetalhesDia(dia) {
    if (diaExpandido === dia) {
        diaExpandido = null;
        lancamentosDia = [];
        erroLancamentos = '';
        renderizar();
        return;
    }

    carregarLancamentosDia(dia);
}

function abrirModalLancamento(dia, lancamento = null) {
    const editando = Boolean(lancamento);
    const dataOriginal = lancamento?.data || dia;
    const atividadePadrao = atividadesLancamento.find(item => item.padrao) || atividadesLancamento[0];
    const atividadeSelecionada = lancamento?.atividadeId || atividadePadrao?.id || '';
    const campoTarefa = editando
        ? `<div class="campo"><label>Tarefa ou projeto</label><div class="campo-leitura">${lancamento.taskId ? `T#${lancamento.taskId} ${escapar(lancamento.assunto || '')}` : `Projeto: ${escapar(lancamento.projeto || 'sem projeto')}`}</div></div>`
        : '<div class="campo"><label for="lancamento-tarefa">Número da tarefa</label><input type="number" id="lancamento-tarefa" aria-label="Número da tarefa" min="1" step="1" required placeholder="Ex.: 93555"></div>';
    const opcoesAtividade = atividadesLancamento.map(item =>
        `<option value="${item.id}"${item.id === Number(atividadeSelecionada) ? ' selected' : ''}>${escapar(item.nome)}</option>`
    ).join('');

    const overlay = abrirModal(`
        <div class="modal-header">
            <h3>${editando ? 'Alterar lançamento' : 'Lançar horas'}</h3>
            <button type="button" data-fechar aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body">
            <div class="campo">
                <label for="lancamento-data">Data do lançamento</label>
                <input type="date" id="lancamento-data" aria-label="Data do lançamento" value="${escapar(dataOriginal)}">
            </div>
            ${campoTarefa}
            <div class="campo">
                <label for="lancamento-atividade">Atividade</label>
                <select id="lancamento-atividade">${opcoesAtividade}</select>
            </div>
            <div class="campo">
                <label for="lancamento-horas">Horas</label>
                <input type="number" id="lancamento-horas" aria-label="Quantidade de horas" min="0.01" step="0.01" value="${editando ? Number(lancamento.horas).toFixed(2) : ''}" placeholder="0,00">
            </div>
            <div class="campo">
                <label for="lancamento-comentario">Comentário</label>
                <textarea id="lancamento-comentario" aria-label="Comentário do lançamento" placeholder="Opcional">${escapar(lancamento?.comentario || '')}</textarea>
            </div>
            <div id="erro-lancamento" class="aviso erro oculto"></div>
        </div>
        <div class="modal-footer">
            <button class="btn secundario" type="button" data-fechar>Cancelar</button>
            <button class="btn" type="button" id="salvar-lancamento">${editando ? 'Salvar alterações' : 'Lançar horas'}</button>
        </div>
    `);

    overlay.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click', () => overlay.remove()));
    overlay.querySelector('#salvar-lancamento').addEventListener('click', async evento => {
        const botao = evento.currentTarget;
        const erro = overlay.querySelector('#erro-lancamento');
        const taskId = editando ? lancamento.taskId : Number(overlay.querySelector('#lancamento-tarefa').value);
        const horas = Number(overlay.querySelector('#lancamento-horas').value);
        const atividadeId = Number(overlay.querySelector('#lancamento-atividade').value);
        const dataEscolhida = overlay.querySelector('#lancamento-data').value;

        if (!editando && (!Number.isInteger(taskId) || taskId <= 0)) {
            erro.textContent = 'Informe um número de tarefa válido.';
            erro.classList.remove('oculto');
            return;
        }
        if (!Number.isFinite(horas) || horas <= 0) {
            erro.textContent = 'Informe uma quantidade de horas maior que zero.';
            erro.classList.remove('oculto');
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEscolhida)) {
            erro.textContent = 'Informe uma data válida.';
            erro.classList.remove('oculto');
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Salvando...';
        erro.classList.add('oculto');

        try {
            const corpo = {
                date: dataEscolhida,
                horas,
                atividadeId,
                comentario: overlay.querySelector('#lancamento-comentario').value
            };
            if (editando) corpo.dataOriginal = lancamento.data;
            else corpo.taskId = taskId;

            await pedirJson(editando ? `/time-entries/${lancamento.id}` : '/time-entries', {
                method: editando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corpo)
            });
            overlay.remove();
            diaExpandido = null;
            await carregar();
            const dataVisivel = dias.some(item => item.dia === dataEscolhida)
                && (exibirFimDeSemana || !ehFimDeSemana(dataEscolhida));
            if (dataVisivel) await carregarLancamentosDia(dataEscolhida);
            mostrarToast(editando ? 'Lançamento alterado.' : 'Horas lançadas.');
        } catch (falha) {
            erro.textContent = falha.message;
            erro.classList.remove('oculto');
            botao.disabled = false;
            botao.textContent = editando ? 'Salvar alterações' : 'Lançar horas';
        }
    });
}

async function carregar() {
    const [dados, configuracao] = await Promise.all([
        pedirJson('/minhas-tarefas/dados'),
        pedirJson('/preferencias').catch(() => null)
    ]);
    tarefas = dados.tarefas || [];
    dias = dados.dias || [];
    totalHoje = Number(dados.totalHoje) || 0;
    const configuracaoExibicao = configuracao?.secoes
        ?.flatMap(secao => secao.configuracoes || [])
        .find(item => item.id === 'exibirFimDeSemana');
    exibirFimDeSemana = configuracaoExibicao ? Boolean(configuracaoExibicao.valor) : true;
    document.getElementById('aviso').innerHTML = '';
    renderizar();
}

function copiar(tarefa) {
    const texto = `T #${tarefa.id} - ${tarefa.assunto}`;
    navigator.clipboard.writeText(texto).then(() => mostrarToast('Título copiado.'));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('filtro').addEventListener('input', evento => {
        filtro = evento.target.value;
        renderizar();
    });

    document.getElementById('atualizar').addEventListener('click', () => carregar().catch(erro => mostrarToast(erro.message, 'erro')));

    document.getElementById('corpo').addEventListener('click', evento => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;

        const tarefa = tarefas.find(item => String(item.id) === botao.dataset.tarefa);
        if (!tarefa) return;

        if (botao.dataset.acao === 'copiar') copiar(tarefa);
    });

    document.getElementById('dias').addEventListener('click', evento => {
        const alternar = evento.target.closest('[data-dia-toggle]');
        if (alternar) {
            alternarDetalhesDia(alternar.dataset.diaToggle);
            return;
        }

        const botao = evento.target.closest('[data-acao-dia]');
        if (!botao) return;
        if (botao.dataset.acaoDia === 'adicionar') abrirModalLancamento(botao.dataset.dia);
        else if (botao.dataset.acaoDia === 'editar') {
            const lancamento = lancamentosDia.find(item => String(item.id) === botao.dataset.lancamento);
            if (lancamento) abrirModalLancamento(lancamento.data, lancamento);
        }
    });

    carregar().catch(erro => {
        document.getElementById('aviso').innerHTML = `<div class="aviso erro">${escapar(erro.message)}</div>`;
        document.getElementById('corpo').innerHTML = '<tr><td colspan="4" class="estado-vazio"><strong>Não foi possível carregar suas tarefas</strong><p>Verifique a conexão e use Atualizar tarefas para tentar novamente.</p></td></tr>';
        document.getElementById('dias').innerHTML = '<tr><td colspan="2" class="estado-vazio">Histórico indisponível nesta consulta.</td></tr>';
        document.getElementById('meta-restante').textContent = 'Horas indisponíveis nesta consulta.';
    });
});
