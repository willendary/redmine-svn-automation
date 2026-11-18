const test = require('node:test');
const assert = require('node:assert/strict');
const projetos = require('./projetos');

test('listarProjetos retorna projetos padrão', () => {
    const lista = projetos.listarProjetos();
    assert.ok(lista.length >= 3);
    assert.ok(lista.some(p => p.chave === 'financeiro' && p.branch === 'Financeiro'));
    assert.ok(lista.some(p => p.chave === 'skyboletos' && p.branch === 'SkyBoletos'));
});

test('adicionarProjeto e removerProjeto gerenciam dinamicamente os modulos', () => {
    const novo = projetos.adicionarProjeto({ chave: 'teste-modulo', branch: 'ModuloTeste', tag: 'moduloteste' });
    assert.equal(novo.chave, 'teste-modulo');
    assert.equal(projetos.PROJECTS['teste-modulo']?.branch, 'ModuloTeste');

    projetos.removerProjeto('teste-modulo');
    assert.equal(projetos.PROJECTS['teste-modulo'], undefined);
});
