/* Shared app shell. Isolated from page-specific legacy globals. */
(() => {
  'use strict';
  const THEME_KEY = 'sky-interface-theme';
  const systemTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let selectedTheme = null;
  try { const saved = localStorage.getItem(THEME_KEY); if (saved === 'light' || saved === 'dark') selectedTheme = saved; } catch (_) {}
  const applyTheme = theme => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme === 'dark' ? '#111827' : '#4263eb');
  };
  applyTheme(selectedTheme || (systemTheme?.matches ? 'dark' : 'light'));
  systemTheme?.addEventListener('change',event => {
    if (!selectedTheme) { applyTheme(event.matches ? 'dark' : 'light'); syncThemeButton(); }
  });
  function syncThemeButton() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    button.innerHTML = icon(dark ? 'sun' : 'moon')+'<span>'+(dark ? 'Modo claro' : 'Modo escuro')+'</span>';
    button.title = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
    button.setAttribute('aria-label',button.title);
    button.setAttribute('aria-pressed',String(dark));
  }
  const paths = {
    sun:'M12 3V1M12 23v-2M3 12H1M23 12h-2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
    moon:'M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    merge:'M7 3v10a4 4 0 0 0 4 4h6M13 13l4 4-4 4M17 3v5M4 3h6',
    tasks:'M9 5h12M9 12h12M9 19h12M3 5l1 1 2-3M3 12l1 1 2-3M3 19l1 1 2-3',
    settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    logs:'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h5',
    search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    refresh:'M20 7a8 8 0 0 0-14-2L3 8M3 3v5h5M4 17a8 8 0 0 0 14 2l3-3M21 21v-5h-5',
    clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    arrow:'M9 5l7 7-7 7', menu:'M4 6h16M4 12h16M4 18h16',
    branch:'M7 6v12M7 12h6a4 4 0 0 0 4-4V6M4 3h6v3H4zM14 3h6v3h-6zM4 18h6v3H4z',
    check:'M5 12l4 4L19 6', shield:'M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7zM8 12l3 3 5-6',
    copy:'M9 9h11v12H9zM15 9V3H3v12h6', external:'M14 3h7v7M21 3L10 14M10 3H3v18h18v-7',
    trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'
  };
  const icon = name => '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name] || paths.grid)+'"/></svg>';
  window.SkyUI = { icon };
  function init() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const path = location.pathname;
    const route = path.startsWith('/tarefa/') ? '/minhas-tarefas' : path === '/' ? '/pendentes' : path.replace(/\.html$/, '');
    const items = [
      ['/pendentes','Pendentes de merge','merge'],
      ['/minhas-tarefas','Minhas tarefas','tasks'],
      ['/config','Configurações','settings'],
      ['/logs','Logs do sistema','logs']
    ];
    const current = items.find(item => item[0] === route) || items[0];
    nav.setAttribute('aria-label','Navegação principal');
    const links = entries => entries.map(([url,label,ico]) => '<a href="'+url+'"'+(url === route ? ' class="ativo" aria-current="page"' : '')+'>'+icon(ico)+'<span>'+label+'</span></a>').join('');
    nav.innerHTML = '<a class="marca" href="/pendentes" aria-label="Sky Redmine — início"><img src="/favicon.svg?v=20261111-3" alt="" width="37" height="37"><span>sky<span style="font-weight:400;color:#c2d3c9"> redmine</span><small>Workspace</small></span></a><div class="nav-label">Área de trabalho</div><div class="nav-links">'+links(items.slice(0,2))+'</div><div class="nav-divider"></div><div class="nav-label">Gerenciar</div><div class="nav-links">'+links(items.slice(2))+'</div><div class="nav-footer"><div class="workspace-note">'+icon('branch')+'<strong>Seu fluxo, conectado.</strong><p>Tarefas, branches e tempo.<br>Tudo no mesmo lugar.</p></div><div class="workspace-id"><span class="workspace-avatar">S</span><div>Sky Informática<small>Redmine + SVN</small></div></div></div>';
    const bar = document.createElement('header');
    bar.className = 'app-bar';
    bar.innerHTML = '<button class="menu-toggle" aria-label="Abrir navegação" aria-expanded="false" aria-controls="nav">'+icon('menu')+'</button><div class="breadcrumb">'+icon('grid')+'<span>Workspace</span>'+icon('arrow')+'<strong>'+ (path.startsWith('/tarefa/') ? 'Detalhes da tarefa' : current[1]) +'</strong></div><div class="app-bar-right"><button type="button" id="theme-toggle" class="theme-toggle" aria-label="Alternar tema"></button><time class="app-date"></time><span class="local-label">Ambiente local</span></div>';
    document.body.prepend(bar);
    syncThemeButton();
    document.getElementById('theme-toggle').addEventListener('click',() => {
      selectedTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY,selectedTheme); } catch (_) {}
      applyTheme(selectedTheme); syncThemeButton();
    });
    const date = bar.querySelector('time');
    date.dateTime = new Date().toISOString();
    date.textContent = new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
    const skip = document.createElement('a');
    skip.href = '#conteudo'; skip.className = 'skip-link'; skip.textContent = 'Pular para o conteúdo';
    document.body.prepend(skip);
    const heading = document.querySelector('h1');
    if (heading) { heading.id ||= 'conteudo'; heading.tabIndex = -1; skip.href = '#'+heading.id; }
    const scrim = document.createElement('button');
    scrim.className = 'nav-scrim'; scrim.setAttribute('aria-label','Fechar navegação');
    document.body.appendChild(scrim);
    const toggle = bar.querySelector('.menu-toggle');
    function setMenu(open) {
      document.body.classList.toggle('nav-open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open ? 'Fechar navegação' : 'Abrir navegação');
      if (open) nav.querySelector('a.ativo')?.focus();
      else toggle.focus();
    }
    toggle.addEventListener('click',() => setMenu(!document.body.classList.contains('nav-open')));
    scrim.addEventListener('click',() => setMenu(false));
    document.addEventListener('keydown',event => {
      const editing = /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable;
      if (event.key === '/' && !editing && !document.querySelector('[aria-modal="true"]')) {
        const search = document.querySelector('input[type="search"]');
        if (search) { event.preventDefault(); search.focus(); }
      }
      if (event.key === 'Escape' && document.body.classList.contains('nav-open')) setMenu(false);
    });
    document.querySelectorAll('[data-icon]').forEach(element => element.insertAdjacentHTML('afterbegin',icon(element.dataset.icon)));
    document.querySelectorAll('[data-icon-only]').forEach(element => element.innerHTML = icon(element.dataset.iconOnly));
    document.querySelectorAll('.topo > div:first-child').forEach(element => {
      if (!element.querySelector('.eyebrow')) {
        const eyebrow = document.createElement('span');
        eyebrow.className = 'eyebrow';
        eyebrow.textContent = route === '/logs' ? 'Observabilidade' : path.startsWith('/tarefa/') ? 'Seu trabalho em detalhe' : route === '/minhas-tarefas' ? 'Seu dia de trabalho' : 'Controle de versões';
        element.prepend(eyebrow);
      }
    });
    document.querySelectorAll('#aviso, #toast').forEach(el => { el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); });
    const reset = document.getElementById('limpar-filtros');
    reset?.addEventListener('click',() => {
      [['filtro-responsavel','todos'],['filtro-sistema','todos'],['filtro-situacao','todos'],['filtro-versao','todas']].forEach(([id,value]) => {
        const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change'));
      });
      ['filtro-prontas','filtro-mescladas'].forEach(id => {
        const el = document.getElementById(id); el.checked = false; el.dispatchEvent(new Event('change'));
      });
      const search = document.getElementById('filtro-busca');
      search.value = ''; search.dispatchEvent(new Event('input')); search.focus();
    });
    setupDialogs();
  }
  function setupDialogs() {
    let current = null, previousFocus = null;
    function sync() {
      const visible = [...document.querySelectorAll('.modal-overlay,.overlay')].find(el => !el.classList.contains('oculto'));
      if (visible === current) return;
      if (current) {
        current.querySelector('.modal')?.removeAttribute('aria-modal');
        document.body.style.overflow = '';
        document.querySelector('.pagina')?.removeAttribute('inert');
        document.querySelector('.app-bar')?.removeAttribute('inert');
        previousFocus?.isConnected && previousFocus.focus();
      }
      current = visible || null;
      if (!current) return;
      previousFocus = document.activeElement;
      const modal = current.querySelector('.modal');
      if (!modal) return;
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
      const title = modal.querySelector('h2,h3');
      if (title) { title.id ||= 'dialog-title'; modal.setAttribute('aria-labelledby',title.id); }
      modal.tabIndex = -1;
      modal.querySelectorAll('[data-fechar],#merge-fechar').forEach(el => el.setAttribute('aria-label','Fechar diálogo'));
      document.body.style.overflow = 'hidden';
      document.querySelector('.pagina')?.setAttribute('inert','');
      document.querySelector('.app-bar')?.setAttribute('inert','');
      (modal.querySelector('input:not([readonly]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])') || modal).focus();
    }
    new MutationObserver(sync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',event => {
      if (!current) return;
      if (event.key === 'Escape') {
        const close = current.querySelector('[data-fechar],#merge-fechar');
        if (close && !close.disabled) close.click();
      }
      if (event.key !== 'Tab') return;
      const controls = [...current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el => el.getClientRects().length);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length-1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
    sync();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
