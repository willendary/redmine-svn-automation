// Localizacao de branches no SVN, compartilhada pelas rotas e pelas telas web.
const { execFile } = require('child_process');
const { promisify } = require('util');
const { REPO_BASE, PROJECTS } = require('./projetos');
const { executarLimitado } = require('./merge_pendentes');

const executarSvn = promisify(execFile);
const TTL_CACHE = 5 * 60 * 1000;
const cache = new Map();

async function caminhoExiste(url) {
    try {
        await executarSvn('svn', ['info', url, '--non-interactive'], { maxBuffer: 1024 * 1024 });
        return true;
    } catch (e) {
        return false;
    }
}

function anoMes(data) {
    return { ano: data.getFullYear(), mes: String(data.getMonth() + 1).padStart(2, '0') };
}

// A pasta costuma ficar nos meses do periodo da sprint; a criacao usa mes atual,
// entao ele tambem entra. Sem periodo no nome, varre os ultimos 12 meses.
function mesesCandidatos(versao, hoje = new Date()) {
    const match = String(versao || '').match(/^(\d{4})-\d{2}\s*\(\d{2}\/(\d{2})\s+a\s+\d{2}\/(\d{2})\)/i);
    if (match) {
        const ano = Number(match[1]);
        const mesInicio = Number(match[2]);
        const mesFim = Number(match[3]);
        if (mesInicio >= 1 && mesInicio <= 12 && mesFim >= 1 && mesFim <= 12) {
            const anoFim = mesFim < mesInicio ? ano + 1 : ano;
            const inicio = new Date(ano, mesInicio - 1, 1);
            const fim = new Date(anoFim, mesFim - 1, 1);
            const meses = [];

            for (const cursor = inicio; cursor <= fim; cursor.setMonth(cursor.getMonth() + 1)) {
                meses.push(anoMes(cursor));
            }

            const mesAtual = anoMes(hoje);
            if (!meses.some(mes => mes.ano === mesAtual.ano && mes.mes === mesAtual.mes)) {
                meses.push(mesAtual);
            }

            return meses;
        }
    }

    return Array.from({ length: 12 }, (_, indice) =>
        anoMes(new Date(hoje.getFullYear(), hoje.getMonth() - indice, 1))
    );
}

function urlsCandidatas(taskId, versao, hoje = new Date()) {
    const urls = [];
    const codigoVersao = versaoCurta(versao);
    for (const { ano, mes } of mesesCandidatos(versao, hoje)) {
        for (const projeto of Object.values(PROJECTS)) {
            urls.push(`${REPO_BASE}/branches/${projeto.branch}/${ano}/${mes}/${codigoVersao}/T${taskId}`);
        }
    }
    return [...new Set(urls)];
}

// A versao chega ora como "2026-22", ora como o nome completo da sprint
// ("2026-22 (26/10 a 06/11)"). A pasta no SVN usa so o codigo.
function versaoCurta(versao) {
    return String(versao || '').trim().split(/\s+/)[0];
}

async function localizarBranch(taskId, versao) {
    const id = String(taskId || '').replace(/\D/g, '');
    const codigoVersao = versaoCurta(versao);
    if (!id || !codigoVersao) return null;

    const chave = `${id}|${String(versao).trim()}`;
    const cacheado = cache.get(chave);
    if (cacheado && Date.now() - cacheado.em < TTL_CACHE) return cacheado.url;

    const candidatas = urlsCandidatas(id, versao);
    const resultados = await executarLimitado(candidatas, 6, async url => (await caminhoExiste(url)) ? url : null);
    const url = resultados.find(Boolean) || null;

    cache.set(chave, { em: Date.now(), url });
    return url;
}

function limparCache() {
    cache.clear();
}

module.exports = { localizarBranch, mesesCandidatos, urlsCandidatas, limparCache };
