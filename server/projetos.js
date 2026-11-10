const REPO_BASE = 'https://repo.skyinformatica.com.br/svn/sky';

const PROJECTS = {
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

module.exports = { REPO_BASE, PROJECTS };
