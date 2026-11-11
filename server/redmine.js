// Cliente da API do Redmine usado pelas telas web.
// A API key fica em server/config.json (mesma configuração da tela de pendentes).
const { lerConfigRedmine } = require('./merge_pendentes');

const STATUS = { NOVA: 1, EM_ANDAMENTO: 2, RESOLVIDA: 3, FECHADA: 5, INTERROMPIDA: 7 };
const ATIVIDADE_DESENVOLVIMENTO = 11;

function configuracao() {
    const config = lerConfigRedmine();
    if (!config.apiKey) throw new Error('API key do Redmine não configurada. Abra /config.');
    return config;
}

function dataLocal(data = new Date()) {
    return data.toLocaleDateString('en-CA');
}

async function requisitar(caminho, opcoes = {}) {
    const { url, apiKey } = configuracao();
    const headers = { 'X-Redmine-API-Key': apiKey, ...(opcoes.headers || {}) };
    if (opcoes.body) headers['Content-Type'] = 'application/json';

    const resposta = await fetch(`${url}${caminho}`, { ...opcoes, headers });
    if (!resposta.ok) {
        const texto = await resposta.text().catch(() => '');
        throw new Error(`Redmine ${resposta.status} em ${caminho}${texto ? `: ${texto.slice(0, 200)}` : ''}`);
    }
    if (resposta.status === 204) return null;
    return resposta.json();
}

async function listarPaginado(caminho, chave, parametros = {}) {
    const itens = [];

    for (let offset = 0; ;) {
        const busca = new URLSearchParams({ ...parametros, limit: '100', offset: String(offset) });
        const dados = await requisitar(`${caminho}?${busca}`);
        const lote = dados[chave] || [];
        itens.push(...lote);
        offset += lote.length;

        if (lote.length < 100 || itens.length >= (dados.total_count || 0)) break;
    }

    return itens;
}

function obterIssue(id) {
    return requisitar(`/issues/${id}.json`).then(dados => dados.issue);
}

function obterRelacoes(id) {
    return requisitar(`/issues/${id}/relations.json`).then(dados => dados.relations || []);
}

async function obterIndicador(id) {
    const dados = await requisitar(`/issues/${id}/indicadores.json`);
    return (dados.indicadores || [])[0] || null;
}

function obterUsuarioAtual() {
    return requisitar('/users/current.json').then(dados => dados.user);
}

function listarMinhasTarefas() {
    return listarPaginado('/issues.json', 'issues', {
        assigned_to_id: 'me',
        status_id: 'open',
        sort: 'fixed_version:desc,id:asc'
    });
}

function obterIssues(ids) {
    if (ids.length === 0) return Promise.resolve([]);
    return listarPaginado('/issues.json', 'issues', {
        issue_id: ids.join(','),
        status_id: '*'
    });
}

function somarHoras(entradas) {
    return (entradas || []).reduce((total, entrada) => total + (Number(entrada.hours) || 0), 0);
}

async function obterHorasHoje(taskId) {
    const entradas = await listarPaginado('/time_entries.json', 'time_entries', {
        issue_id: String(taskId),
        user_id: 'me',
        spent_on: dataLocal()
    });
    return somarHoras(entradas);
}

function obterEntradasHoje() {
    return listarPaginado('/time_entries.json', 'time_entries', {
        user_id: 'me',
        spent_on: dataLocal()
    });
}

function agruparHorasPorTarefa(entradas) {
    const porTarefa = new Map();

    for (const entrada of entradas || []) {
        const id = entrada.issue && entrada.issue.id;
        if (!id) continue;
        porTarefa.set(String(id), (porTarefa.get(String(id)) || 0) + (Number(entrada.hours) || 0));
    }

    return porTarefa;
}

async function obterTotalHorasHoje() {
    const entradas = await listarPaginado('/time_entries.json', 'time_entries', {
        user_id: 'me',
        spent_on: dataLocal()
    });
    return somarHoras(entradas);
}

// Agrupa horas lancadas por dia (chave YYYY-MM-DD).
function agruparHorasPorDia(entradas) {
    const porDia = new Map();

    for (const entrada of entradas || []) {
        const dia = entrada.spent_on;
        if (!dia) continue;
        porDia.set(dia, (porDia.get(dia) || 0) + (Number(entrada.hours) || 0));
    }

    return [...porDia.entries()]
        .map(([dia, horas]) => ({ dia, horas }))
        .sort((a, b) => b.dia.localeCompare(a.dia));
}

function preencherDiasSemHoras(horasPorDia, quantidade, hoje = new Date()) {
    const totalDias = Math.max(1, Math.floor(Number(quantidade) || 10));
    const horas = new Map(horasPorDia.map(item => [item.dia, item.horas]));
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (totalDias - 1));
    const resultado = [];

    for (let indice = 0; indice < totalDias; indice++) {
        const data = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice);
        const dia = dataLocal(data);
        resultado.push({ dia, horas: horas.get(dia) || 0 });
    }

    return resultado.reverse();
}

async function obterHorasPorDia(dias = 10) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1));

    const entradas = await listarPaginado('/time_entries.json', 'time_entries', {
        user_id: 'me',
        from: dataLocal(inicio),
        to: dataLocal(hoje)
    });

    return preencherDiasSemHoras(agruparHorasPorDia(entradas), dias, hoje);
}

async function obterLancamentosPorDia(data) {
    const entradas = await listarPaginado('/time_entries.json', 'time_entries', {
        user_id: 'me',
        spent_on: data
    });
    const idsTarefas = [...new Set(entradas.map(entrada => entrada.issue?.id).filter(Boolean))];
    const tarefas = await obterIssues(idsTarefas);
    const porId = new Map(tarefas.map(tarefa => [String(tarefa.id), tarefa]));
    const { url } = configuracao();

    return entradas.map(entrada => {
        const issueId = entrada.issue?.id;
        const tarefa = porId.get(String(issueId));
        return {
            id: entrada.id,
            taskId: issueId,
            projeto: entrada.project?.name || '',
            assunto: tarefa?.subject || '',
            urlTarefa: tarefa ? `${url}/issues/${tarefa.id}` : '',
            horas: Number(entrada.hours) || 0,
            comentario: entrada.comments || '',
            atividadeId: entrada.activity?.id || ATIVIDADE_DESENVOLVIMENTO,
            atividade: entrada.activity?.name || '',
            data: entrada.spent_on
        };
    }).sort((a, b) => Number(a.id) - Number(b.id));
}

async function obterAtividadesTempo() {
    const dados = await requisitar('/enumerations/time_entry_activities.json');
    return (dados.time_entry_activities || [])
        .filter(atividade => atividade.active !== false)
        .map(atividade => ({
            id: Number(atividade.id),
            nome: atividade.name || '',
            padrao: Boolean(atividade.is_default)
        }));
}

async function obterLancamentoTempo(id) {
    const dados = await requisitar(`/time_entries/${id}.json`);
    return dados.time_entry;
}

function atualizarLancamentoTempo(id, { horas, comentario, atividadeId, data }) {
    return requisitar(`/time_entries/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify({
            time_entry: {
                hours: horas,
                comments: comentario || '',
                spent_on: data,
                ...(atividadeId == null ? {} : { activity_id: atividadeId })
            }
        })
    });
}

function registrarTempo({ taskId, horas, comentario, atividade = ATIVIDADE_DESENVOLVIMENTO, data = dataLocal() }) {
    const payload = {
        time_entry: {
            issue_id: Number(taskId),
            hours: horas,
            comments: comentario || '',
            activity_id: atividade,
            spent_on: data
        }
    };

    return requisitar('/time_entries.json', { method: 'POST', body: JSON.stringify(payload) });
}

function atualizarTarefa(id, payload) {
    return requisitar(`/issues/${id}.json`, {
        method: 'PUT',
        body: JSON.stringify({ issue: payload })
    });
}

async function pausarOutrasTarefas(idAtual) {
    const emAndamento = await listarPaginado('/issues.json', 'issues', {
        assigned_to_id: 'me',
        status_id: String(STATUS.EM_ANDAMENTO)
    });

    for (const issue of emAndamento) {
        if (String(issue.id) === String(idAtual)) continue;
        // Uma tarefa que o fluxo nao deixa interromper nao pode impedir o timer.
        await atualizarTarefa(issue.id, { status_id: STATUS.INTERROMPIDA }).catch(() => {});
    }
}

module.exports = {
    STATUS,
    ATIVIDADE_DESENVOLVIMENTO,
    dataLocal,
    requisitar,
    listarPaginado,
    somarHoras,
    obterIssue,
    obterRelacoes,
    obterIndicador,
    obterUsuarioAtual,
    listarMinhasTarefas,
    obterIssues,
    obterHorasHoje,
    obterEntradasHoje,
    agruparHorasPorTarefa,
    obterTotalHorasHoje,
    agruparHorasPorDia,
    preencherDiasSemHoras,
    obterHorasPorDia,
    obterLancamentosPorDia,
    obterAtividadesTempo,
    obterLancamentoTempo,
    atualizarLancamentoTempo,
    registrarTempo,
    atualizarTarefa,
    pausarOutrasTarefas
};
