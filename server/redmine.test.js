const test = require('node:test');
const assert = require('node:assert/strict');
const redmine = require('./redmine');

test('preencherDiasSemHoras inclui dias sem lançamentos na janela completa', () => {
    const hoje = new Date(2026, 10, 10);
    const resultado = redmine.preencherDiasSemHoras([
        { dia: '2026-11-09', horas: 5 }
    ], 3, hoje);

    assert.deepEqual(resultado, [
        { dia: '2026-11-10', horas: 0 },
        { dia: '2026-11-09', horas: 5 },
        { dia: '2026-11-08', horas: 0 }
    ]);
});

test('registrarTempo envia data escolhida como spent_on', async t => {
    const fetchOriginal = global.fetch;
    let requisicao;
    global.fetch = async (url, opcoes) => {
        requisicao = { url, opcoes };
        return new Response(JSON.stringify({ time_entry: { id: 10 } }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    };
    t.after(() => { global.fetch = fetchOriginal; });

    await redmine.registrarTempo({
        taskId: 93555,
        horas: 1.25,
        atividade: 11,
        data: '2026-11-06'
    });

    assert.equal(requisicao.opcoes.method, 'POST');
    assert.equal(JSON.parse(requisicao.opcoes.body).time_entry.spent_on, '2026-11-06');
});

test('atualizarLancamentoTempo envia a nova data para o Redmine', async t => {
    const fetchOriginal = global.fetch;
    let requisicao;
    global.fetch = async (url, opcoes) => {
        requisicao = { url, opcoes };
        return new Response(null, { status: 204 });
    };
    t.after(() => { global.fetch = fetchOriginal; });

    await redmine.atualizarLancamentoTempo(272228, {
        horas: 2.5,
        comentario: 'Ajuste de data',
        atividadeId: 11,
        data: '2026-11-09'
    });

    assert.equal(requisicao.opcoes.method, 'PUT');
    assert.equal(JSON.parse(requisicao.opcoes.body).time_entry.spent_on, '2026-11-09');
});
