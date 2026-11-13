const test = require('node:test');
const assert = require('node:assert');
const {
    parseIntervalos,
    parseMergeinfo,
    parseLog,
    extrairBranchDePath,
    agruparBranches,
    montarBranch,
    agruparRevisoes,
    mapearTarefa,
    diasDesde,
    caminhoRelativo,
    caminhosAlteradosDaBranch,
    analisarResumoDiff,
    validarUrlBranch,
    validarCaminhoDiff
} = require('./merge_pendentes');

const LOG_XML = `<?xml version="1.0" encoding="UTF-8"?>
<log>
<logentry revision="110">
<author>willian.oliveira</author>
<date>2026-01-03T10:00:00.000000Z</date>
<paths>
<path action="M" kind="file">/branches/Financeiro/2026/01/2026-02/T123/Financeiro/A.pas</path>
<path action="M" kind="file">/branches/Financeiro/2026/01/2026-02/T123/Lib/B.pas</path>
</paths>
<msg>T #123 - terceiro commit</msg>
</logentry>
<logentry revision="100">
<author>willian.oliveira</author>
<date>2026-01-02T10:00:00.000000Z</date>
<paths>
<path action="M" kind="file">/branches/Financeiro/2026/01/2026-02/T123/Financeiro/A.pas</path>
</paths>
<msg>T #123 - segundo commit</msg>
</logentry>
<logentry revision="90">
<author>willian.oliveira</author>
<date>2026-01-01T10:00:00.000000Z</date>
<paths>
<path action="A" copyfrom-path="/tags/financeiro/2026/01/2026.01.01.0" copyfrom-rev="80" kind="dir">/branches/Financeiro/2026/01/2026-02/T123</path>
</paths>
<msg>Automacao: Branch T123</msg>
</logentry>
</log>`;

const MERGEINFO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<properties>
<target path="https://repo/trunk/Financeiro">
<property name="svn:mergeinfo">/branches/Financeiro/2026/01/2026-02/T123/Financeiro:100
/branches/Financeiro/2026/01/2026-02/T999/Financeiro:50-60</property>
</target>
</properties>`;

test('parseIntervalos entende lista e faixa', () => {
    assert.deepStrictEqual(parseIntervalos('1,3-5'), [[1, 1], [3, 5]]);
});

test('parseIntervalos ignora marca de non-inheritable', () => {
    assert.deepStrictEqual(parseIntervalos('82518*,82526*'), [[82518, 82518], [82526, 82526]]);
    assert.deepStrictEqual(parseIntervalos('1-3*'), [[1, 3]]);
});

test('mapearTarefa extrai versão de teste e versão estável dos campos do Redmine', () => {
    const tarefa = mapearTarefa({
        id: 97113,
        subject: 'Fechamento de caixa',
        status: { name: 'Fechada', is_closed: true },
        assigned_to: { name: 'Willian Antônio Oliveira' },
        fixed_version: { name: '2026-22 (26/10 a 06/11)' },
        custom_fields: [
            { id: 35, name: 'Versão teste', value: '2026.10.30.0' },
            { id: 37, name: 'Versão estável', value: '' }
        ]
    }, 'https://redmine');

    assert.strictEqual(tarefa.versaoTeste, '2026.10.30.0');
    assert.strictEqual(tarefa.versaoEstavel, '');
    assert.strictEqual(tarefa.fechada, true);
    assert.strictEqual(tarefa.sprint, '2026-22 (26/10 a 06/11)');
    assert.strictEqual(tarefa.responsavel, 'Willian Antônio Oliveira');
});

test('mapearTarefa aceita tarefa sem campos personalizados', () => {
    const tarefa = mapearTarefa({ id: 1, subject: 'x', status: { name: 'Resolvida', is_closed: false } }, 'https://redmine');
    assert.strictEqual(tarefa.versaoTeste, '');
    assert.strictEqual(tarefa.versaoEstavel, '');
});

test('diasDesde conta dias inteiros e nunca fica negativo', () => {
    const agora = new Date('2026-11-10T12:00:00Z');
    assert.strictEqual(diasDesde('2026-11-10T09:00:00Z', agora), 0);
    assert.strictEqual(diasDesde('2026-10-10T09:00:00Z', agora), 31);
    assert.strictEqual(diasDesde('2026-11-11T09:00:00Z', agora), 0);
    assert.strictEqual(diasDesde('', agora), null);
    assert.strictEqual(diasDesde('nao-e-data', agora), null);
});

test('caminhoRelativo converte caminho do repositorio para a raiz da branch', () => {
    const raiz = '/branches/Financeiro/2026/11/2026-23/T89077';
    assert.strictEqual(
        caminhoRelativo(`${raiz}/Financeiro/A.pas`, raiz),
        '/Financeiro/A.pas'
    );
    assert.strictEqual(caminhoRelativo('/trunk/Financeiro/A.pas', raiz), '');
    assert.strictEqual(caminhoRelativo(raiz, raiz), '');
});

test('diff da branch reúne arquivos alterados desde a cópia e ignora a revisão de criação', () => {
    const raiz = '/branches/Financeiro/2026/01/2026-02/T123';
    assert.deepStrictEqual(caminhosAlteradosDaBranch(LOG_XML, raiz), [
        'Financeiro/A.pas',
        'Lib/B.pas'
    ]);
});

test('diff resume arquivos de trunk e branch em caminhos relativos', () => {
    const xml = `<diff><paths>
        <path item="modified" props="none" kind="file">https://repo.skyinformatica.com.br/svn/sky/trunk/Financeiro/A.pas</path>
        <path item="added" props="none" kind="file">https://repo.skyinformatica.com.br/svn/sky/branches/Financeiro/2026/01/2026-02/T123/Financeiro/B.pas</path>
    </paths></diff>`;
    assert.deepStrictEqual(analisarResumoDiff(xml, '/branches/Financeiro/2026/01/2026-02/T123'), [
        { caminho: 'Financeiro/A.pas', situacao: 'modificado', tipo: 'file' },
        { caminho: 'Financeiro/B.pas', situacao: 'adicionado', tipo: 'file' }
    ]);
});

test('caminho do diff rejeita traversal e caminhos absolutos', () => {
    assert.throws(() => validarCaminhoDiff('../config.json'), /inválido/);
    assert.throws(() => validarCaminhoDiff('/etc/passwd'), /inválido/);
    assert.strictEqual(validarCaminhoDiff('Financeiro/fontes/Arquivo.pas'), 'Financeiro/fontes/Arquivo.pas');
    assert.strictEqual(validarUrlBranch('https://repo.skyinformatica.com.br/svn/sky/branches/Financeiro/2026/01/2026-02/T123'), 'https://repo.skyinformatica.com.br/svn/sky/branches/Financeiro/2026/01/2026-02/T123');
    assert.throws(() => validarUrlBranch('https://example.com/branches/Financeiro/2026/01/2026-02/T123'), /inválida/);
    assert.throws(() => validarUrlBranch('https://user:pass@repo.skyinformatica.com.br/svn/sky/branches/Financeiro/2026/01/2026-02/T123'), /inválida/);
    assert.throws(() => validarUrlBranch('https://repo.skyinformatica.com.br/svn/sky/trunk'), /inválida/);
});

test('agruparRevisoes compacta contíguas e preserva lacunas', () => {
    assert.strictEqual(agruparRevisoes([82537, 82518, 82526, 82534]), '82518,82526,82534,82537');
    assert.strictEqual(agruparRevisoes(['1', '2', '3', '5', '7', '8']), '1-3,5,7-8');
    assert.strictEqual(agruparRevisoes([]), '');
});

test('parseMergeinfo monta mapa origem -> intervalos', () => {
    const mapa = parseMergeinfo(MERGEINFO_XML);
    assert.deepStrictEqual(mapa.get('/branches/Financeiro/2026/01/2026-02/T123/Financeiro'), [[100, 100]]);
    assert.deepStrictEqual(mapa.get('/branches/Financeiro/2026/01/2026-02/T999/Financeiro'), [[50, 60]]);
});

test('extrairBranchDePath separa projeto, ano, versao e tarefa', () => {
    const info = extrairBranchDePath('/branches/Financeiro/2026/01/2026-02/T123/Financeiro/A.pas');
    assert.strictEqual(info.pasta, 'Financeiro');
    assert.strictEqual(info.ano, '2026');
    assert.strictEqual(info.meio, '01/2026-02');
    assert.strictEqual(info.taskId, '123');
    assert.strictEqual(info.resto, 'Financeiro/A.pas');
});

test('agruparBranches ignora a revisao de criacao', () => {
    const branches = agruparBranches(parseLog(LOG_XML));
    assert.strictEqual(branches.length, 1);

    const branch = branches[0];
    assert.strictEqual(branch.criacaoRevisao, 90);
    assert.deepStrictEqual([...branch.revisoes.keys()].sort(), [100, 110]);
});

test('branch sem mergeinfo fica pendente', () => {
    const branch = agruparBranches(parseLog(LOG_XML))[0];
    const resultado = montarBranch(branch, new Map());

    assert.strictEqual(resultado.status, 'pendente');
    assert.strictEqual(resultado.pendentes.length, 2);
    assert.strictEqual(resultado.sistema, 'financeiro');
});

test('branch com uma revisao mesclada fica parcial', () => {
    const branch = agruparBranches(parseLog(LOG_XML))[0];
    const resultado = montarBranch(branch, parseMergeinfo(MERGEINFO_XML));

    assert.strictEqual(resultado.status, 'parcial');
    assert.deepStrictEqual(resultado.pendentes.map(revisao => revisao.revisao), [110]);
});

test('branch so fica mesclada quando o projeto principal esta coberto', () => {
    const branch = agruparBranches(parseLog(LOG_XML))[0];
    const mergeinfo = parseMergeinfo(MERGEINFO_XML);

    const parcial = montarBranch(branch, mergeinfo);
    assert.strictEqual(parcial.status, 'parcial');
    assert.deepStrictEqual(parcial.pendentes.map(revisao => revisao.revisao), [110]);

    mergeinfo.set('/branches/Financeiro/2026/01/2026-02/T123/Financeiro', [[100, 110]]);
    const mesclado = montarBranch(branch, mergeinfo);
    assert.strictEqual(mesclado.status, 'mesclado');
    assert.strictEqual(mesclado.pendentes.length, 0);
});

test('branch recriada usa a criacao mais recente', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <log>
    <logentry revision="100"><author>willian.oliveira</author><date>2026-01-05T10:00:00Z</date>
    <paths><path action="M" kind="file">/branches/Financeiro/2026/01/2026-02/T123/Financeiro/A.pas</path></paths>
    <msg>commit novo</msg></logentry>
    <logentry revision="96"><author>willian.oliveira</author><date>2026-01-04T10:00:00Z</date>
    <paths><path action="A" copyfrom-path="/tags/financeiro/tag2" copyfrom-rev="95" kind="dir">/branches/Financeiro/2026/01/2026-02/T123</path></paths>
    <msg>recriacao</msg></logentry>
    <logentry revision="95"><author>willian.oliveira</author><date>2026-01-03T10:00:00Z</date>
    <paths><path action="D" kind="dir">/branches/Financeiro/2026/01/2026-02/T123</path></paths>
    <msg>apagada</msg></logentry>
    <logentry revision="90"><author>willian.oliveira</author><date>2026-01-02T10:00:00Z</date>
    <paths><path action="A" copyfrom-path="/tags/financeiro/tag1" copyfrom-rev="89" kind="dir">/branches/Financeiro/2026/01/2026-02/T123</path></paths>
    <msg>criacao antiga</msg></logentry>
    </log>`;

    const branch = agruparBranches(parseLog(xml))[0];
    assert.strictEqual(branch.criacaoRevisao, 96);
    assert.deepStrictEqual([...branch.revisoes.keys()], [100]);
});
