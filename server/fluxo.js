// Fluxo de uma tarefa no Redmine: a cadeia de copias entre sprints e o retorno
// de testes. Usa a API de indicadores do plugin (chave do fluxo) e as relacoes
// de copia para achar as tarefas do meio, sem raspar HTML.
const redmine = require('./redmine');
const branches = require('./branches');

const TTL_CACHE = 5 * 60 * 1000;
const MAX_TAREFAS = 12;
const TIPOS_COPIA = new Set(['copied_to', 'copied_from']);
const cache = new Map();

function idDaRelacao(relacao, atual) {
    const de = String(relacao.issue_id);
    const para = String(relacao.issue_to_id);
    return de === String(atual) ? para : de;
}

// Monta a cadeia a partir de uma tarefa qualquer. Recebe o cliente por
// parametro para poder ser testado sem rede.
async function montarFluxo(taskId, cliente = redmine) {
    const id = String(taskId).replace(/\D/g, '');
    const ids = new Set([id]);
    const fila = [id];

    try {
        const indicador = await cliente.obterIndicador(id);
        for (const campo of ['id_tarefa', 'id_ultima_tarefa', 'id_tarefa_qs', 'id_ultima_tarefa_qs']) {
            const valor = indicador && indicador[campo];
            if (!valor) continue;
            const texto = String(valor);
            if (!ids.has(texto)) {
                ids.add(texto);
                fila.push(texto);
            }
        }
    } catch (e) {
        // Sem indicador o fluxo ainda funciona pelas relacoes da propria tarefa.
    }

    const visitados = new Set();
    while (fila.length > 0 && visitados.size < MAX_TAREFAS) {
        const atual = fila.shift();
        if (visitados.has(atual)) continue;
        visitados.add(atual);

        let relacoes = [];
        try {
            relacoes = await cliente.obterRelacoes(atual);
        } catch (e) {
            continue;
        }

        for (const relacao of relacoes) {
            if (!TIPOS_COPIA.has(relacao.relation_type)) continue;
            const vizinho = idDaRelacao(relacao, atual);
            if (!ids.has(vizinho) && ids.size < MAX_TAREFAS) {
                ids.add(vizinho);
                fila.push(vizinho);
            }
        }
    }

    return [...ids];
}

async function obterFluxo(taskId) {
    const id = String(taskId).replace(/\D/g, '');
    const cacheado = cache.get(id);
    if (cacheado && Date.now() - cacheado.em < TTL_CACHE) return cacheado.valor;

    const ids = await montarFluxo(id);
    const tarefas = await redmine.obterIssues(ids);
    const ordenadas = tarefas.sort((a, b) => String(a.created_on).localeCompare(String(b.created_on)));
    const valor = ordenadas.length > 0 ? ordenadas : [];

    cache.set(id, { em: Date.now(), valor });
    return valor;
}

// Procura branch em todas as tarefas do fluxo, comecando pela tarefa aberta.
async function obterBranchDoFluxo(taskId, versaoAtual) {
    const fluxo = await obterFluxo(taskId).catch(() => []);
    const ordem = [String(taskId), ...fluxo.map(issue => String(issue.id)).filter(id => id !== String(taskId))];

    for (const id of ordem) {
        const issue = fluxo.find(item => String(item.id) === id);
        const versao = id === String(taskId) ? versaoAtual : (issue?.fixed_version?.name || versaoAtual);
        const url = await branches.localizarBranch(id, versao);
        if (url) return { encontrada: true, url, viaTaskId: id };
    }

    return { encontrada: false, url: null, viaTaskId: null };
}

function limparCache() {
    cache.clear();
}

module.exports = { montarFluxo, obterFluxo, obterBranchDoFluxo, limparCache };
