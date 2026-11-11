const fs = require('fs');
const path = require('path');

const PREFERENCIAS_PATH = path.join(__dirname, 'preferencias.json');

const SECOES = [
    {
        id: 'exibicao',
        titulo: 'Exibição',
        descricao: 'Ajuste como os dados aparecem nas telas.',
        configuracoes: [
            {
                id: 'exibirFimDeSemana',
                tipo: 'switch',
                titulo: 'Exibir sábado e domingo',
                descricao: 'Mostra ou oculta fins de semana na tabela dos últimos 10 dias.',
                padrao: true
            }
        ]
    }
];

function definicoes() {
    return SECOES.flatMap(secao => secao.configuracoes);
}

function valoresPadrao() {
    return Object.fromEntries(definicoes().map(item => [item.id, item.padrao]));
}

function lerArquivo() {
    try {
        const valores = JSON.parse(fs.readFileSync(PREFERENCIAS_PATH, 'utf8'));
        return valores && typeof valores === 'object' && !Array.isArray(valores) ? valores : {};
    } catch (erro) {
        return {};
    }
}

function obterValores() {
    const salvos = lerArquivo();
    return Object.fromEntries(definicoes().map(item => [
        item.id,
        typeof salvos[item.id] === typeof item.padrao ? salvos[item.id] : item.padrao
    ]));
}

function normalizar(valores, atuais = valoresPadrao()) {
    if (!valores || typeof valores !== 'object' || Array.isArray(valores)) {
        throw new Error('Preferências inválidas.');
    }

    const configuracoes = definicoes();
    const idsConhecidos = new Set(configuracoes.map(item => item.id));
    const desconhecida = Object.keys(valores).find(id => !idsConhecidos.has(id));
    if (desconhecida) throw new Error(`Preferência desconhecida: ${desconhecida}.`);

    const resultado = { ...atuais };
    for (const item of configuracoes) {
        if (!Object.prototype.hasOwnProperty.call(valores, item.id)) continue;
        if (typeof valores[item.id] !== typeof item.padrao) {
            throw new Error(`Valor inválido para “${item.titulo}”.`);
        }
        resultado[item.id] = valores[item.id];
    }

    return resultado;
}

function listarSecoes() {
    const valores = obterValores();
    return SECOES.map(secao => ({
        ...secao,
        configuracoes: secao.configuracoes.map(item => ({
            ...item,
            valor: valores[item.id]
        }))
    }));
}

function salvar(valores) {
    const resultado = normalizar(valores, obterValores());
    fs.writeFileSync(PREFERENCIAS_PATH, JSON.stringify(resultado, null, 2), 'utf8');
    return resultado;
}

module.exports = {
    PREFERENCIAS_PATH,
    valoresPadrao,
    obterValores,
    normalizar,
    listarSecoes,
    salvar
};
