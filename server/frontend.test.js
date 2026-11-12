const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, requestInterceptor, VirtualConsole } = require('jsdom');

const publicDir = path.join(__dirname, 'public');
const longSubject = 'Financeiro — Movimentação financeira com um título longo que deve aparecer integralmente, incluindo o final da descrição.';
const task = { id:93555, assunto:longSubject, sprint:'2026-23 (03/11 a 14/11)', projeto:'Equipe Financeiro', status:'Em andamento', horasHoje:3.6, horasEstimadas:8, horasGastas:12, url:'https://redmine.example/issues/93555' };
const preferences = { secoes:[{ id:'exibicao', titulo:'Exibição', configuracoes:[{ id:'exibirFimDeSemana', titulo:'Exibir sábado e domingo', descricao:'Mostrar fins de semana', valor:true }] }] };
const revision = { revisao:12345, mensagem:'Correção <script>indesejado</script>', data:'2026-11-11T10:00:00Z', autor:'dev', mesclada:false, subpastas:[] };
const branch = { chave:'branch-93555', taskId:93555, sistema:'financeiro', pastaBranch:'2026/11/T93555', versao:'2026.11', branchUrl:'https://svn.example/branch', tarefa:{...task, responsavel:'Dev', versaoTeste:'2026.11.1'}, status:'pendente', revisoes:[revision], pendentes:[12345], ultimaRevisao:revision, diasUltimaRevisao:0 };
const routes = {
  '/config-redmine':{configurado:true,url:'https://redmine.example'},
  '/preferencias':preferences,
  '/minhas-tarefas/dados':{tarefas:[task],dias:[{dia:'2026-11-11',horas:3.6},{dia:'2026-11-10',horas:7.5}],totalHoje:3.6},
  '/tarefa/93555/dados':{tarefa:task,branch:{encontrada:true,url:'https://svn.example/branches/T93555'},fluxo:[task]},
  '/merge-pendentes':{branches:[branch],responsaveis:['Dev'],redmine:{configurado:true},geradoEm:'2026-11-11T15:00:00Z'},
  '/time-entries':{lancamentos:[{id:1,taskId:93555,assunto:longSubject,urlTarefa:task.url,atividade:'Desenvolvimento',comentario:'Análise e implementação completas',horas:3.6,data:'2026-11-11',atividadeId:9}],atividades:[{id:9,nome:'Desenvolvimento',padrao:true}]},
  '/logs/dados':{logs:['[10:00:00] [INFO] SVN consulta concluída','[10:01:00] [ERROR] Redmine indisponível']}
};
const flush = () => new Promise(resolve => setTimeout(resolve,20));
async function open(t, name, options={}) {
  const errors = [], requests = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError',error => errors.push(error.message));
  let systemListener;
  const dom = new JSDOM(fs.readFileSync(path.join(publicDir,name+'.html'),'utf8'), {
    url:'http://localhost:3000/'+(name==='tarefa'?'tarefa/93555':name),
    resources:{interceptors:[requestInterceptor(request => { const name=path.basename(new URL(request.url).pathname); return new Response(name.endsWith('.js') ? fs.readFileSync(path.join(publicDir,name),'utf8') : '', {headers:{'Content-Type':name.endsWith('.js')?'application/javascript':'text/css'}}); })]},runScripts:'dangerously',virtualConsole,
    beforeParse(window) {
      if(options.savedTheme) window.localStorage.setItem('sky-interface-theme',options.savedTheme);
      window.matchMedia = () => ({matches:!!options.systemDark,addEventListener:(_,fn)=>systemListener=fn});
      window.fetch = async (url,init={}) => {
        requests.push({url:String(url),method:init.method||'GET',body:init.body});
        const pathname = new URL(url,'http://localhost:3000').pathname;
        if(options.fail === pathname) return {ok:false,status:503,json:async()=>({error:'Serviço temporariamente indisponível'})};
        if(!Object.hasOwn(routes,pathname)) throw new Error('API inesperada no teste: '+pathname);
        return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(routes[pathname]))};
      };
      Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async()=>{}}});
      window.addEventListener('error',event => errors.push(event.error?.message||event.message));
    }
  });
  t.after(()=>dom.window.close());
  await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
  await flush();
  assert.deepEqual(errors,[], 'Página deve carregar sem erros JavaScript');
  return {dom,window:dom.window,document:dom.window.document,errors,requests,systemChange:dark=>systemListener?.({matches:dark})};
}
for(const name of ['pendentes','minhas-tarefas','tarefa','config','logs']) {
  test(name+': inicializa navegação, mantém IDs únicos e alterna temas', async t => {
    const {document,window,errors} = await open(t,name);
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    assert.equal(ids.length,new Set(ids).size,'IDs não podem se repetir');
    assert.equal(document.querySelectorAll('.nav-links a[aria-current="page"]').length,1);
    assert.equal(document.documentElement.dataset.theme,'light');
    const toggle=document.getElementById('theme-toggle');
    toggle.click();
    assert.equal(document.documentElement.dataset.theme,'dark');
    assert.equal(window.localStorage.getItem('sky-interface-theme'),'dark');
    assert.equal(toggle.getAttribute('aria-pressed'),'true');
    assert.match(toggle.textContent,/Modo claro/);
    toggle.click();
    assert.equal(document.documentElement.dataset.theme,'light');
    assert.equal(window.localStorage.getItem('sky-interface-theme'),'light');
    assert.deepEqual(errors,[]);
  });
}
test('tema segue o sistema e respeita a preferência salva',async t=>{
  const system=await open(t,'config',{systemDark:true});
  assert.equal(system.document.documentElement.dataset.theme,'dark');
  system.systemChange(false);
  assert.equal(system.document.documentElement.dataset.theme,'light');
  const saved=await open(t,'config',{systemDark:true,savedTheme:'light'});
  assert.equal(saved.document.documentElement.dataset.theme,'light');
  saved.systemChange(true);
  assert.equal(saved.document.documentElement.dataset.theme,'light');
  const dark=await open(t,'logs',{savedTheme:'dark'});
  assert.equal(dark.document.documentElement.dataset.theme,'dark');
});
test('tarefas: resumo e meta carregam; busca funciona; histórico preserva todas as colunas',async t=>{
  const {document,window,errors}=await open(t,'minhas-tarefas');
  assert.equal(document.getElementById('total-tarefas').textContent,'1');
  assert.equal(document.getElementById('meta-horas').textContent,'3,60h');
  assert.equal(document.getElementById('meta-progresso').value,3.6);
  assert.equal(document.querySelectorAll('#resumo .chip').length,4);
  assert.equal(document.querySelector('.task-subject').textContent,longSubject);
  const filter=document.getElementById('filtro');
  filter.value='nada-corresponde';filter.dispatchEvent(new window.Event('input'));
  assert.equal(document.getElementById('total-tarefas').textContent,'0');
  assert.match(document.getElementById('corpo').textContent,/Nenhuma tarefa/);
  filter.value='93555';filter.dispatchEvent(new window.Event('input'));
  assert.equal(document.getElementById('total-tarefas').textContent,'1');
  document.querySelector('[data-dia-toggle]').click();await flush();
  const entry=document.querySelector('.tabela-lancamentos');
  assert.ok(entry.closest('.history-panel'));
  assert.equal(entry.querySelectorAll('thead th').length,5);
  assert.equal(entry.querySelectorAll('tbody tr:first-child td').length,5);
  assert.match(entry.textContent,/Análise e implementação completas/);
  assert.match(entry.textContent,/Alterar/);
  assert.match(entry.textContent,/3,60h/);
  assert.deepEqual(errors,[]);
});
test('lançamentos: edição abre diálogo acessível e Escape restaura o foco sem gravar',async t=>{
  const {document,window,requests}=await open(t,'minhas-tarefas');
  document.querySelector('[data-dia-toggle]').click();await flush();
  const edit=document.querySelector('[data-acao-dia="editar"]');
  edit.focus();edit.click();await flush();
  const modal=document.querySelector('[role="dialog"]');
  assert.ok(modal);assert.equal(modal.getAttribute('aria-modal'),'true');
  assert.ok(document.querySelector('.pagina').hasAttribute('inert'));
  assert.match(modal.textContent,/Alterar lançamento/);
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flush();
  assert.equal(document.querySelector('[role="dialog"]'),null);
  assert.equal(document.activeElement,edit);
  assert.ok(!requests.some(request=>request.method!=='GET'));
});
test('pendentes: filtros, métricas e restauração dos filtros',async t=>{
  const {document,window,errors}=await open(t,'pendentes');
  assert.equal(document.getElementById('total-resultados').textContent,'1');
  assert.equal(document.querySelectorAll('#resumo .chip').length,4);
  const system=document.getElementById('filtro-sistema');
  system.value='skyboletos';system.dispatchEvent(new window.Event('change'));
  assert.equal(document.getElementById('total-resultados').textContent,'0');
  assert.ok(!document.getElementById('vazio').classList.contains('oculto'));
  document.getElementById('limpar-filtros').click();await new Promise(resolve=>setTimeout(resolve,230));
  assert.equal(document.getElementById('total-resultados').textContent,'1');
  assert.equal(document.getElementById('filtro-sistema').value,'todos');
  assert.deepEqual(errors,[]);
});
test('logs: busca, pausa e cancelamento da limpeza não alteram o servidor',async t=>{
  const {document,window,requests}=await open(t,'logs');
  const filter=document.getElementById('filtro-logs');
  filter.value='ERROR';filter.dispatchEvent(new window.Event('input'));
  assert.match(document.getElementById('logs').textContent,/Redmine/);
  assert.doesNotMatch(document.getElementById('logs').textContent,/consulta concluída/);
  const auto=document.getElementById('logs-auto');auto.checked=false;auto.dispatchEvent(new window.Event('change'));
  assert.match(document.getElementById('logs-status').textContent,/pausada/);
  document.getElementById('limpar').click();await flush();
  assert.ok(document.querySelector('[role="dialog"]'));
  document.querySelector('.modal-footer [data-fechar]').click();await flush();
  assert.ok(!requests.some(request=>request.method!=='GET'));
});
test('configurações: alterar preferência habilita salvar sem gravar automaticamente',async t=>{
  const {document,requests}=await open(t,'config');
  const save=document.getElementById('salvar-preferencias');
  assert.equal(save.disabled,true);
  document.querySelector('[data-preferencia]').click();
  assert.equal(save.disabled,false);
  assert.match(document.getElementById('status-preferencias').textContent,/não salvas/);
  assert.ok(!requests.some(request=>request.method!=='GET'));
});
test('falha de API é exibida com mensagem útil',async t=>{
  const {document}=await open(t,'minhas-tarefas',{fail:'/minhas-tarefas/dados'});
  assert.match(document.getElementById('aviso').textContent,/temporariamente indisponível/);
  assert.doesNotMatch(document.getElementById('corpo').textContent,/Carregando/);
  assert.doesNotMatch(document.getElementById('dias').textContent,/Carregando/);
});
