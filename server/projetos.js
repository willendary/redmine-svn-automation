const fs = require('fs');
const path = require('path');

const REPO_BASE = 'https://repo.skyinformatica.com.br/svn/sky';
const PROJETOS_PATH = path.join(__dirname, 'projetos.json');

const PROJETOS_PADRAO = {
    financeiro: {
        branch: 'Financeiro',
        tag: 'financeiro'
    },
    skyboletos: {
        branch: 'SkyBoletos',
        tag: 'skyboletos'
    },
    paineleletronico: {
        branch: 'PainelEletronico',
        tag: 'PainelEletronico'
    }
};

const PROJECTS = { ...PROJETOS_PADRAO };

function carregarProjetos() {
    try {
        if (fs.existsSync(PROJETOS_PATH)) {
            const salvos = JSON.parse(fs.readFileSync(PROJETOS_PATH, 'utf8'));
            if (salvos && typeof salvos === 'object') {
                Object.assign(PROJECTS, salvos);
            }
        }
    } catch (_) {}
}

function salvarArquivo() {
    fs.writeFileSync(PROJETOS_PATH, JSON.stringify(PROJECTS, null, 2), 'utf8');
}

function listarProjetos() {
    return Object.entries(PROJECTS).map(([chave, conf]) => ({
        chave,
        branch: conf.branch,
        tag: conf.tag || conf.branch.toLowerCase(),
        padrao: Boolean(PROJETOS_PADRAO[chave])
    }));
}

function adicionarProjeto({ chave, branch, tag }) {
    const k = String(chave || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const b = String(branch || '').trim();
    const t = String(tag || '').trim() || b.toLowerCase();

    if (!k || k.length < 2) throw new Error('Informe uma chave válida com pelo menos 2 caracteres (apenas letras, números e traços).');
    if (!b) throw new Error('Informe o nome da pasta da Branch no SVN.');

    PROJECTS[k] = { branch: b, tag: t };
    salvarArquivo();
    return { chave: k, branch: b, tag: t, padrao: Boolean(PROJETOS_PADRAO[k]) };
}

function removerProjeto(chave) {
    const k = String(chave || '').trim().toLowerCase();
    if (!PROJECTS[k]) throw new Error('Projeto não encontrado.');
    delete PROJECTS[k];
    salvarArquivo();
    return true;
}

carregarProjetos();

module.exports = {
    REPO_BASE,
    PROJECTS,
    PROJETOS_PADRAO,
    listarProjetos,
    adicionarProjeto,
    removerProjeto
};
