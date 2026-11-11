const test = require('node:test');
const assert = require('node:assert/strict');
const { mesesCandidatos, urlsCandidatas } = require('./branches');

test('mesesCandidatos usa periodo da sprint, inclusive quando cruza ano', () => {
    assert.deepEqual(mesesCandidatos('2026-22 (26/10 a 06/11)', new Date(2026, 10, 10)), [
        { ano: 2026, mes: '10' },
        { ano: 2026, mes: '11' }
    ]);
    assert.deepEqual(mesesCandidatos('2026-24 (21/12 a 08/01)', new Date(2027, 0, 10)), [
        { ano: 2026, mes: '12' },
        { ano: 2027, mes: '01' }
    ]);
    assert.deepEqual(mesesCandidatos('2026-17 (10/08 a 21/08)', new Date(2026, 10, 10)), [
        { ano: 2026, mes: '08' },
        { ano: 2026, mes: '11' }
    ]);
});

test('urlsCandidatas usa codigo curto da sprint no caminho do SVN', () => {
    const urls = urlsCandidatas('97026', '2026-22 (26/10 a 06/11)', new Date(2026, 10, 10));
    assert.equal(urls.length, 6);
    assert.ok(urls.includes('https://repo.skyinformatica.com.br/svn/sky/branches/Financeiro/2026/10/2026-22/T97026'));
    assert.ok(urls.every(url => !url.includes('(26/10')));
});
