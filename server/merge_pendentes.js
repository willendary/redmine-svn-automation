const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { REPO_BASE, PROJECTS } = require('./projetos');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const REDMINE_URL_PADRAO = 'https://redmine.skyinformatica.com.br';
const CACHE_TTL_MS = 2 * 60 * 1000;

let logger = () => {};
function definirLogger(fn) {
    logger = typeof fn === 'function' ? fn : () => {};
}

// --- Configuração do Redmine ---

function lerConfigRedmine() {
    let arquivo = {};
    try {
        arquivo = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {
        arquivo = {};
    }

    const url = String(arquivo.redmineUrl || process.env.REDMINE_URL || REDMINE_URL_PADRAO).replace(/\/+$/, '');
    const apiKey = String(arquivo.redmineApiKey || process.env.REDMINE_API_KEY || '').trim();
    return { url, apiKey };
}

async function validarApiKey(url, apiKey) {
    const resposta = await fetch(`${url}/users/current.json`, {
        headers: { 'X-Redmine-API-Key': apiKey }
    });
    if (!resposta.ok) {
        throw new Error(`Redmine respondeu ${resposta.status}. Verifique a URL e a API key.`);
    }
    const dados = await resposta.json();
    return dados.user || {};
}

async function salvarConfigRedmine({ url, apiKey }) {
    const urlLimpa = String(url || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(urlLimpa)) throw new Error('URL do Redmine inválida.');

    const chave = String(apiKey || '').trim();
    if (!chave) throw new Error('API key obrigatória.');

    const usuario = await validarApiKey(urlLimpa, chave);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ redmineUrl: urlLimpa, redmineApiKey: chave }, null, 2), 'utf8');
    return usuario;
}

// --- SVN ---

function executarSvn(args, maxBuffer = 40 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        execFile('svn', args, { maxBuffer, windowsHide: true }, (erro, stdout, stderr) => {
            if (erro) {
                return reject(new Error(String(stderr || erro.message).split('\n')[0]));
            }
            resolve(stdout);
        });
    });
}

const parserXml = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    isArray: (nome, caminho) => caminho === 'log.logentry' || caminho === 'log.logentry.paths.path' || caminho === 'properties.target'
});

function textoDoNo(no) {
    if (no == null) return '';
    if (typeof no === 'string') return no;
    return no['#text'] != null ? String(no['#text']) : '';
}

function parseIntervalos(valor) {
    // O sufixo `*` marca mergeinfo non-inheritable; a revisao continua mesclada.
    return String(valor)
        .split(',')
        .map(parte => {
            const [inicio, fim] = parte.replace(/\*/g, '').trim().split('-').map(Number);
            if (!Number.isFinite(inicio)) return null;
            return [inicio, Number.isFinite(fim) ? fim : inicio];
        })
        .filter(Boolean);
}

function parseMergeinfo(xml) {
    const mapa = new Map();
    if (!xml) return mapa;

    const obj = parserXml.parse(xml);
    const alvos = obj?.properties?.target || [];

    for (const alvo of alvos) {
        const propriedades = Array.isArray(alvo.property) ? alvo.property : [alvo.property];
        const mergeinfo = propriedades.find(p => p && p['@_name'] === 'svn:mergeinfo');
        if (!mergeinfo) continue;

        for (const linha of textoDoNo(mergeinfo).split(/\r?\n/)) {
            const limpa = linha.trim();
            if (!limpa) continue;

            const separador = limpa.lastIndexOf(':');
            if (separador < 0) continue;

            const origem = limpa.slice(0, separador).trim();
            const intervalos = parseIntervalos(limpa.slice(separador + 1));
            if (origem && intervalos.length) mapa.set(origem, intervalos);
        }
    }

    return mapa;
}

function intervaloCobre(intervalos, revisao) {
    return intervalos.some(([inicio, fim]) => revisao >= inicio && revisao <= fim);
}

function diasDesde(dataIso, agora = new Date()) {
    if (!dataIso) return null;
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return null;
    const dias = Math.floor((agora.getTime() - data.getTime()) / 86400000);
    return dias > 0 ? dias : 0;
}

// Converte um caminho do repositorio em caminho relativo a raiz da branch.
// Ex.: (/branches/X/T1/Financeiro/A.pas, /branches/X/T1) -> /Financeiro/A.pas
function caminhoRelativo(caminho, raiz) {
    const prefixo = `${String(raiz).replace(/\/+$/, '')}/`;
    const texto = String(caminho);
    return texto.startsWith(prefixo) ? `/${texto.slice(prefixo.length)}` : '';
}

// Executa tarefas assincronas com no maximo `limite` em paralelo.
async function executarLimitado(itens, limite, tarefa) {
    const resultados = new Array(itens.length);
    let proximo = 0;

    async function consumir() {
        while (proximo < itens.length) {
            const indice = proximo++;
            resultados[indice] = await tarefa(itens[indice]);
        }
    }

    const operarios = Math.min(Math.max(limite, 1), itens.length);
    await Promise.all(Array.from({ length: operarios }, consumir));
    return resultados;
}

// Agrupa revisões contíguas no formato aceito por `svn merge -c` (ex.: 1-3,5,7-8).
function agruparRevisoes(revisoes) {
    const lista = (revisoes || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const partes = [];

    for (let i = 0; i < lista.length; i++) {
        let fim = i;
        while (fim + 1 < lista.length && lista[fim + 1] === lista[fim] + 1) fim++;
        partes.push(fim > i ? `${lista[i]}-${lista[fim]}` : String(lista[i]));
        i = fim;
    }

    return partes.join(',');
}

// Grava o mergeinfo no trunk (record-only) e commita só a propriedade, num WC temporário limpo.
async function marcarComoMesclada({ branchUrl, revisoes, mensagem }) {
    const url = String(branchUrl || '').trim();
    if (!url.startsWith(`${REPO_BASE}/branches/`)) {
        throw new Error('URL da branch inválida.');
    }

    const lista = [...new Set((revisoes || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    if (lista.length === 0) throw new Error('Nenhuma revisão pendente para marcar.');

    const faixa = agruparRevisoes(lista);
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'sky-record-'));

    try {
        await executarSvn(['checkout', `${REPO_BASE}/trunk`, pasta, '--depth', 'empty', '--non-interactive']);
        await executarSvn(['merge', '--record-only', '-c', faixa, url, pasta, '--non-interactive']);

        // WC raso faz o SVN gravar mergeinfo non-inheritable (`*`). O conteudo ja esta no
        // trunk inteiro, entao o registro correto e inheritable, como nas demais branches.
        const mergeinfo = (await executarSvn(['propget', 'svn:mergeinfo', pasta, '--non-interactive'])).replace(/\s+$/, '');
        if (mergeinfo.includes('*')) {
            await executarSvn(['propset', 'svn:mergeinfo', mergeinfo.replace(/\*/g, ''), pasta, '--non-interactive']);
        }

        const diff = await executarSvn(['diff', '--depth', 'empty', pasta, '--non-interactive']);
        if (!diff.trim()) throw new Error('O merge record-only não alterou o mergeinfo.');

        const saida = await executarSvn(['commit', pasta, '--depth', 'empty', '-m', mensagem, '--non-interactive']);
        limparCache();
        logger('INFO', `[MERGE] Record-only commitado: ${url} (${faixa})`);
        return { revisoes: lista, saida: saida.trim() };
    } finally {
        try {
            fs.rmSync(pasta, { recursive: true, force: true });
        } catch (e) {
            logger('WARN', `[MERGE] Não foi possível remover ${pasta}: ${e.message}`);
        }
    }
}


function parseLog(xml) {
    if (!xml) return [];
    const obj = parserXml.parse(xml);
    const entradas = obj?.log?.logentry || [];

    return entradas.map(entrada => ({
        revisao: Number(entrada['@_revision']),
        autor: textoDoNo(entrada.author),
        data: textoDoNo(entrada.date),
        mensagem: textoDoNo(entrada.msg),
        caminhos: (entrada.paths?.path || []).map(caminho => ({
            caminho: textoDoNo(caminho),
            copiaDe: caminho['@_copyfrom-path'] || ''
        }))
    }));
}

async function caminhoExiste(url) {
    try {
        await executarSvn(['info', url, '--non-interactive']);
        return true;
    } catch (e) {
        return false;
    }
}

async function compararCaminho(urlBranch, urlTrunk) {
    try {
        const saida = await executarSvn(['diff', '--summarize', urlBranch, urlTrunk, '--non-interactive']);
        return saida.trim()
            ? { situacao: 'diferente', detalhes: saida.trim().split(/\r?\n/).map(linha => linha.trim()) }
            : { situacao: 'igual' };
    } catch (erro) {
        // Um dos lados nao existe: svn diff falha com E160013.
        const [existeBranch, existeTrunk] = await Promise.all([caminhoExiste(urlBranch), caminhoExiste(urlTrunk)]);
        if (existeBranch && !existeTrunk) return { situacao: 'faltando' };
        if (!existeBranch && existeTrunk) return { situacao: 'removido' };
        return { situacao: 'erro', erro: erro.message };
    }
}

// Confere, arquivo a arquivo, se o conteudo das revisoes pendentes ja esta no trunk.
async function verificarConteudo({ branchUrl, revisoes }) {
    const url = String(branchUrl || '').trim().replace(/\/+$/, '');
    if (!url.startsWith(`${REPO_BASE}/branches/`)) {
        throw new Error('URL da branch inválida.');
    }

    const lista = [...new Set((revisoes || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    if (lista.length === 0) return { ok: true, verificados: 0, diferentes: [] };

    const xml = await executarSvn([
        'log', '--xml', '-v', '-r', `${lista[0]}:${lista[lista.length - 1]}`, url, '--non-interactive'
    ]);

    const raiz = url.slice(REPO_BASE.length);
    const caminhos = new Set();
    for (const entrada of parseLog(xml)) {
        if (!lista.includes(entrada.revisao)) continue;
        for (const item of entrada.caminhos) {
            const relativo = caminhoRelativo(item.caminho, raiz);
            if (relativo) caminhos.add(relativo);
        }
    }

    const resultados = await executarLimitado([...caminhos], 6, async relativo => ({
        caminho: relativo,
        ...(await compararCaminho(`${url}${relativo}`, `${REPO_BASE}/trunk${relativo}`))
    }));

    const diferentes = resultados.filter(resultado => resultado.situacao !== 'igual');
    logger('INFO', `[MERGE] Verificação ${url}: ${resultados.length} caminho(s), ${diferentes.length} diferente(s)`);
    return { ok: diferentes.length === 0, verificados: resultados.length, diferentes };
}

function validarUrlBranch(branchUrl) {
    let url;
    try {
        url = new URL(String(branchUrl || '').trim());
    } catch (e) {
        throw new Error('URL da branch inválida.');
    }
    const repositorio = new URL(REPO_BASE);
    const prefixo = `${repositorio.pathname}/branches/`;
    const segmentosBranch = url.pathname.slice(prefixo.length).split('/').filter(Boolean);

    if (url.origin !== repositorio.origin || url.username || url.password || !url.pathname.startsWith(prefixo)
        || !/^T\d+$/.test(segmentosBranch.at(-1) || '') || url.search || url.hash) {
        throw new Error('URL da branch inválida.');
    }

    return url.toString().replace(/\/+$/, '');
}

function caminhosAlteradosDaBranch(xml, raiz) {
    const caminhos = new Set();
    for (const entrada of parseLog(xml)) {
        for (const item of entrada.caminhos) {
            const relativo = caminhoRelativo(item.caminho, raiz);
            if (relativo) caminhos.add(relativo.slice(1));
        }
    }
    return [...caminhos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function caminhoRelativoDoDiff(caminho, raizBranch) {
    let caminhoRepositorio = String(caminho || '');
    if (/^https?:\/\//i.test(caminhoRepositorio)) {
        try {
            const url = new URL(caminhoRepositorio);
            const repositorio = new URL(REPO_BASE);
            if (url.origin !== repositorio.origin || !url.pathname.startsWith(`${repositorio.pathname}/`)) return '';
            caminhoRepositorio = decodeURIComponent(url.pathname.slice(repositorio.pathname.length));
        } catch (e) {
            return '';
        }
    }

    return (caminhoRelativo(caminhoRepositorio, '/trunk') || caminhoRelativo(caminhoRepositorio, raizBranch)).slice(1);
}

function analisarResumoDiff(xml, raizBranch) {
    const entradas = parserXml.parse(xml)?.diff?.paths?.path || [];
    const caminhos = Array.isArray(entradas) ? entradas : [entradas];
    const porCaminho = new Map();
    const situacoes = {
        added: 'adicionado',
        deleted: 'removido',
        modified: 'modificado',
        replaced: 'modificado'
    };

    for (const entrada of caminhos) {
        const caminho = caminhoRelativoDoDiff(textoDoNo(entrada), raizBranch);
        if (!caminho) continue;
        const item = entrada['@_item'] || 'modified';
        const situacao = entrada['@_props'] && entrada['@_props'] !== 'none' && item === 'none'
            ? 'propriedades'
            : (situacoes[item] || 'modificado');
        porCaminho.set(caminho, {
            caminho,
            situacao,
            tipo: entrada['@_kind'] || 'file'
        });
    }

    return [...porCaminho.values()].sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'));
}

async function listarDiffBranch(branchUrl) {
    const url = validarUrlBranch(branchUrl);
    const raiz = decodeURIComponent(new URL(url).pathname.slice(new URL(REPO_BASE).pathname.length));
    const log = await executarSvn(['log', '--xml', '--verbose', '--stop-on-copy', '--non-interactive', url]);
    const caminhos = caminhosAlteradosDaBranch(log, raiz);
    if (caminhos.length === 0) return { branchUrl: url, trunkUrl: `${REPO_BASE}/trunk`, arquivos: [] };

    const partes = [];
    for (let i = 0; i < caminhos.length; i += 40) partes.push(caminhos.slice(i, i + 40));
    const resumos = await executarLimitado(partes, 4, parte => executarSvn([
        'diff', '--summarize', '--xml', '--non-interactive',
        '--old', `${REPO_BASE}/trunk@`, '--new', `${url}@`, '--', ...parte.map(escaparPegRevision)
    ]));
    const arquivos = resumos.flatMap(resumo => analisarResumoDiff(resumo, raiz));
    const unicos = [...new Map(arquivos.map(arquivo => [arquivo.caminho, arquivo])).values()]
        .sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'));

    return { branchUrl: url, trunkUrl: `${REPO_BASE}/trunk`, arquivos: unicos };
}

function validarCaminhoDiff(caminho) {
    const valor = String(caminho || '');
    const partes = valor.split('/');
    if (!valor || valor.startsWith('/') || valor.includes('\\') || valor.includes('\0')
        || partes.some(parte => !parte || parte === '.' || parte === '..')) {
        throw new Error('Caminho de arquivo inválido.');
    }
    return valor;
}

function escaparPegRevision(caminho) {
    return caminho.includes('@') ? `${caminho}@` : caminho;
}

async function obterDiffArquivoBranch({ branchUrl, caminho }) {
    const url = validarUrlBranch(branchUrl);
    const caminhoSeguro = validarCaminhoDiff(caminho);
    const raiz = `${REPO_BASE}/trunk@`;
    const saida = await executarSvn([
        'diff', '--non-interactive', '--old', raiz, '--new', `${url}@`, '--', escaparPegRevision(caminhoSeguro)
    ], 6 * 1024 * 1024);
    const binario = /Cannot display: file marked as a binary type|svn:mime-type\s*=\s*application\/octet-stream/i.test(saida);
    return { diff: binario ? '' : saida, binario };
}

function extrairBranchDePath(caminho) {
    const match = String(caminho).match(/^\/branches\/([^/]+)\/(\d{4})\/(.+?)\/(T\d+)(?:\/(.*))?$/);
    if (!match) return null;

    return {
        pasta: match[1],
        ano: match[2],
        meio: match[3],
        tarefaPasta: match[4],
        taskId: match[4].slice(1),
        resto: match[5] || ''
    };
}

function agruparBranches(entradas) {
    const branches = new Map();

    for (const entrada of entradas) {
        for (const caminho of entrada.caminhos) {
            const info = extrairBranchDePath(caminho.caminho);
            if (!info) continue;

            const chave = `/branches/${info.pasta}/${info.ano}/${info.meio}/${info.tarefaPasta}`;
            let branch = branches.get(chave);

            if (!branch) {
                branch = {
                    chave,
                    pasta: info.pasta,
                    ano: info.ano,
                    meio: info.meio,
                    tarefaPasta: info.tarefaPasta,
                    taskId: info.taskId,
                    criacaoRevisao: null,
                    criacoes: [],
                    revisoes: new Map()
                };
                branches.set(chave, branch);
            }

            if (caminho.caminho === chave && caminho.copiaDe) {
                branch.criacoes.push(entrada.revisao);
            }

            let revisao = branch.revisoes.get(entrada.revisao);
            if (!revisao) {
                revisao = {
                    revisao: entrada.revisao,
                    autor: entrada.autor,
                    data: entrada.data,
                    mensagem: entrada.mensagem,
                    subpastas: new Set()
                };
                branch.revisoes.set(entrada.revisao, revisao);
            }

            if (info.resto) {
                const subpasta = info.resto.split('/')[0];
                if (subpasta) revisao.subpastas.add(subpasta);
            }
        }
    }

    // Branch pode ter sido criada, apagada e recriada: vale a criacao mais recente.
    for (const branch of branches.values()) {
        if (branch.criacoes.length > 0) {
            branch.criacaoRevisao = Math.max(...branch.criacoes);
            for (const revisao of [...branch.revisoes.keys()]) {
                if (revisao <= branch.criacaoRevisao) branch.revisoes.delete(revisao);
            }
        }
        delete branch.criacoes;
    }

    return [...branches.values()];
}

function revisaoMesclada(mergeinfo, branch, revisao, subprojetoPrimario) {
    const coberto = origem => {
        const intervalos = mergeinfo.get(origem);
        return intervalos ? intervaloCobre(intervalos, revisao.revisao) : false;
    };

    // Se a revisao mexe no projeto principal da branch, e ele que manda.
    if (subprojetoPrimario && revisao.subpastas.has(subprojetoPrimario)) {
        return coberto(`${branch.chave}/${subprojetoPrimario}`) || coberto(branch.chave);
    }

    if (revisao.subpastas.size > 0) {
        return [...revisao.subpastas].some(subpasta =>
            coberto(`${branch.chave}/${subpasta}`) || coberto(branch.chave)
        );
    }

    for (const origem of mergeinfo.keys()) {
        if ((origem === branch.chave || origem.startsWith(`${branch.chave}/`)) && coberto(origem)) {
            return true;
        }
    }
    return false;
}

function sistemaDaPasta(pasta) {
    const entrada = Object.entries(PROJECTS).find(([, projeto]) => projeto.branch.toLowerCase() === String(pasta).toLowerCase());
    return entrada ? entrada[0] : String(pasta);
}

function contarSubprojetos(revisoes) {
    const contagem = new Map();
    for (const revisao of revisoes) {
        for (const subpasta of revisao.subpastas) {
            contagem.set(subpasta, (contagem.get(subpasta) || 0) + 1);
        }
    }
    return [...contagem.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([subpasta]) => subpasta);
}

function escolherSubprojetoPrimario(subprojetos, pastaBranch) {
    const conhecido = subprojetos.find(subpasta => PROJECTS[sistemaDaPasta(subpasta)]);
    if (conhecido) return conhecido;

    const daPasta = subprojetos.find(subpasta => subpasta.toLowerCase() === String(pastaBranch).toLowerCase());
    return daPasta || subprojetos[0] || pastaBranch;
}

function montarBranch(branch, mergeinfo) {
    const revisoesBase = [...branch.revisoes.values()].sort((a, b) => a.revisao - b.revisao);
    const subprojetos = contarSubprojetos(revisoesBase);
    let subprojetoPrimario = escolherSubprojetoPrimario(subprojetos, branch.pasta);

    // Revisoes de outros subprojetos (Lib, NFSe...) nao definem o merge da tarefa.
    let revisoesDoProjeto = revisoesBase.filter(revisao => revisao.subpastas.has(subprojetoPrimario));
    if (revisoesDoProjeto.length === 0) {
        subprojetoPrimario = branch.pasta;
        revisoesDoProjeto = revisoesBase;
    }

    const revisoes = revisoesDoProjeto.map(revisao => ({
        revisao: revisao.revisao,
        autor: revisao.autor,
        data: revisao.data,
        mensagem: revisao.mensagem,
        subpastas: [...revisao.subpastas],
        mesclada: revisaoMesclada(mergeinfo, branch, revisao, subprojetoPrimario)
    }));

    const pendentes = revisoes.filter(revisao => !revisao.mesclada);
    const mescladas = revisoes.filter(revisao => revisao.mesclada);

    let status = 'sem-commit';
    if (revisoes.length > 0) {
        if (pendentes.length === 0) status = 'mesclado';
        else if (mescladas.length > 0) status = 'parcial';
        else status = 'pendente';
    }

    const sistema = PROJECTS[sistemaDaPasta(subprojetoPrimario)]
        ? sistemaDaPasta(subprojetoPrimario)
        : sistemaDaPasta(branch.pasta);
    const partesMeio = branch.meio.split('/');
    const ultimaRevisao = revisoes.length ? revisoes[revisoes.length - 1] : null;

    return {
        chave: branch.chave,
        taskId: branch.taskId,
        sistema,
        pastaBranch: branch.pasta,
        ano: branch.ano,
        mes: partesMeio[0] || '',
        versao: partesMeio.slice(1).join('/'),
        branchUrl: `${REPO_BASE}${branch.chave}`,
        subprojetos,
        subprojetoPrimario: subprojetos.includes(subprojetoPrimario) ? subprojetoPrimario : '',
        criacaoRevisao: branch.criacaoRevisao,
        revisoes,
        pendentes,
        mescladas,
        status,
        ultimaRevisao,
        diasUltimaRevisao: diasDesde(ultimaRevisao?.data)
    };
}

async function obterBranchesSvn(anos, projetos) {
    const pastas = [...new Set(projetos.map(projeto => PROJECTS[projeto].branch))];

    const consultasLog = [];
    for (const pasta of pastas) {
        for (const ano of anos) {
            consultasLog.push(
                executarSvn(['log', `${REPO_BASE}/branches/${pasta}/${ano}`, '--xml', '-v', '--non-interactive'])
                    .catch(erro => {
                        logger('WARN', `[MERGE] Sem log para ${pasta}/${ano}: ${erro.message}`);
                        return '';
                    })
            );
        }
    }

    const alvosMergeinfo = ['', ...pastas];
    const consultasMergeinfo = alvosMergeinfo.map(subprojeto =>
        executarSvn(['propget', 'svn:mergeinfo', '--xml', `${REPO_BASE}/trunk${subprojeto ? `/${subprojeto}` : ''}`, '--non-interactive'])
            .catch(erro => {
                logger('WARN', `[MERGE] Sem mergeinfo em trunk/${subprojeto || '.'}: ${erro.message}`);
                return '';
            })
    );

    const [logs, mergeinfos] = await Promise.all([
        Promise.all(consultasLog),
        Promise.all(consultasMergeinfo)
    ]);

    const mergeinfo = new Map();
    for (const xml of mergeinfos) {
        for (const [origem, intervalos] of parseMergeinfo(xml)) {
            mergeinfo.set(origem, intervalos);
        }
    }

    const branches = new Map();
    for (const xml of logs) {
        for (const branch of agruparBranches(parseLog(xml))) {
            branches.set(branch.chave, branch);
        }
    }

    return [...branches.values()]
        .map(branch => montarBranch(branch, mergeinfo))
        .sort((a, b) => {
            const dataA = a.ultimaRevisao?.data || '';
            const dataB = b.ultimaRevisao?.data || '';
            return dataB.localeCompare(dataA);
        });
}

function valorCampoPersonalizado(issue, nome) {
    const campo = (issue.custom_fields || []).find(item => item.name === nome);
    return campo && campo.value != null ? String(campo.value) : '';
}

function mapearTarefa(issue, urlRedmine) {
    return {
        id: issue.id,
        assunto: issue.subject || '',
        status: issue.status?.name || '',
        fechada: Boolean(issue.status?.is_closed),
        responsavel: issue.assigned_to?.name || '',
        sprint: issue.fixed_version?.name || '',
        projeto: issue.project?.name || '',
        tracker: issue.tracker?.name || '',
        versaoTeste: valorCampoPersonalizado(issue, 'Versão teste'),
        versaoEstavel: valorCampoPersonalizado(issue, 'Versão estável'),
        url: `${urlRedmine}/issues/${issue.id}`
    };
}

async function enriquecerComRedmine(branches) {
    const config = lerConfigRedmine();
    if (!config.apiKey) {
        return { configurado: false, url: config.url, erro: null, tarefas: {} };
    }

    const ids = [...new Set(branches.map(branch => branch.taskId))];
    const tarefas = {};

    try {
        for (let inicio = 0; inicio < ids.length; inicio += 100) {
            const lote = ids.slice(inicio, inicio + 100);
            const url = new URL(`${config.url}/issues.json`);
            url.searchParams.set('issue_id', lote.join(','));
            url.searchParams.set('status_id', '*');
            url.searchParams.set('limit', '100');

            const resposta = await fetch(url, { headers: { 'X-Redmine-API-Key': config.apiKey } });
            if (!resposta.ok) throw new Error(`Redmine respondeu ${resposta.status}.`);

            const dados = await resposta.json();
            for (const issue of dados.issues || []) {
                tarefas[issue.id] = mapearTarefa(issue, config.url);
            }
        }

        return { configurado: true, url: config.url, erro: null, tarefas };
    } catch (erro) {
        logger('WARN', `[MERGE] Falha ao buscar tarefas no Redmine: ${erro.message}`);
        return { configurado: true, url: config.url, erro: erro.message, tarefas };
    }
}

// --- Cache ---

const cacheSvn = new Map();

function chaveCache(anos, projetos) {
    return `${anos.join(',')}|${projetos.join(',')}`;
}

async function coletarPendentes({ anos, projetos }) {
    const chave = chaveCache(anos, projetos);
    const agora = Date.now();
    let branches = cacheSvn.get(chave);

    if (!branches || agora - branches.em > CACHE_TTL_MS) {
        logger('INFO', `[MERGE] Varrendo SVN: anos=${anos.join(',')} projetos=${projetos.join(',')}`);
        const lista = await obterBranchesSvn(anos, projetos);
        branches = { em: agora, lista };
        cacheSvn.set(chave, branches);
    }

    const redmine = await enriquecerComRedmine(branches.lista);
    const responsaveis = [...new Set(branches.lista
        .map(branch => redmine.tarefas[branch.taskId]?.responsavel)
        .filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
        geradoEm: new Date().toISOString(),
        anos,
        projetos,
        responsaveis,
        branches: branches.lista.map(branch => ({
            ...branch,
            tarefa: redmine.tarefas[branch.taskId] || null
        })),
        redmine
    };
}

function limparCache() {
    cacheSvn.clear();
}

module.exports = {
    CONFIG_PATH,
    lerConfigRedmine,
    salvarConfigRedmine,
    parseMergeinfo,
    parseIntervalos,
    parseLog,
    extrairBranchDePath,
    agruparBranches,
    montarBranch,
    agruparRevisoes,
    marcarComoMesclada,
    verificarConteudo,
    listarDiffBranch,
    obterDiffArquivoBranch,
    caminhosAlteradosDaBranch,
    analisarResumoDiff,
    validarUrlBranch,
    validarCaminhoDiff,
    diasDesde,
    caminhoRelativo,
    executarLimitado,
    mapearTarefa,
    coletarPendentes,
    limparCache,
    definirLogger
};
