const test = require('node:test');
const assert = require('node:assert/strict');
const { valoresPadrao, normalizar } = require('./preferencias');

test('preferências padrão mantêm fins de semana visíveis', () => {
    assert.deepEqual(valoresPadrao(), { exibirFimDeSemana: true });
});

test('normalizar altera somente preferências conhecidas e tipadas', () => {
    assert.deepEqual(normalizar({ exibirFimDeSemana: false }), { exibirFimDeSemana: false });
    assert.throws(() => normalizar({ exibirFimDeSemana: 'false' }), /Valor inválido/);
    assert.throws(() => normalizar({ novaOpcao: true }), /desconhecida/);
});
