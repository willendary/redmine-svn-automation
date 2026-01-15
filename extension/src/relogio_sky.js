const RelogioSky = {
    intervalo: null,
    inicioSessao: null, // Timestamp de quando o play foi dado (apenas se estiver na tarefa ativa)
    idTarefaRodando: null, // ID da tarefa que está no localStorage
    idTarefaVisualizada: null, // ID da tarefa da página atual
    horasServidor: 0, // Horas vindas do Redmine (static)

    iniciar: async () => {
        const estadoArmazenado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        RelogioSky.idTarefaVisualizada = window.location.pathname.split('/').pop();
        
        // Verifica se estamos na página de detalhes de uma issue
        const ehPaginaTarefa = /^\/issues\/\d+$/.test(window.location.pathname);

        // 1. Configura Estado Global (O que está rodando no background)
        if (estadoArmazenado.running) {
            RelogioSky.idTarefaRodando = estadoArmazenado.issueId;
            
            // Só configuramos o inicioSessao SE estivermos visualizando a mesma tarefa que está rodando
            if (RelogioSky.idTarefaRodando === RelogioSky.idTarefaVisualizada) {
                RelogioSky.inicioSessao = estadoArmazenado.startTime;
            } else {
                RelogioSky.inicioSessao = null; // Não estamos vendo a tarefa que roda
            }
        }

        // 2. Busca Horas do Servidor (apenas se estiver na página de detalhes)
        if (ehPaginaTarefa && RelogioSky.idTarefaVisualizada && !isNaN(RelogioSky.idTarefaVisualizada)) {
            // Define display como carregando se não tiver cache visual imediato
            const elDisplay = document.getElementById('sky-timer-display');
            if (elDisplay) elDisplay.innerText = "--:--:--";

            RelogioSky.horasServidor = await ServicoRedmine.obterHorasLancadasHoje(RelogioSky.idTarefaVisualizada);
            RelogioSky.atualizarDisplay();
        }

        // 3. Inicializa Interface
        if (estadoArmazenado.running) {
            if (RelogioSky.idTarefaRodando === RelogioSky.idTarefaVisualizada && ehPaginaTarefa) {
                RelogioSky.iniciarInterface();
            } else {
                // Timer roda em outra tarefa, mas precisamos atualizar a lista "Minhas Tarefas" se ela existir
                RelogioSky.iniciarIntervaloGlobal();
            }
        } else if (ehPaginaTarefa) {
            // Nenhuma tarefa rodando, mas mostra o total do dia estático
            RelogioSky.atualizarDisplay();
        }
    },

    iniciarMinhaPagina: () => {
        RelogioSky.renderizarMinhaPagina(); 
        RelogioSky.iniciarIntervaloGlobal();
    },

    renderizarMinhaPagina: async () => {
        const tabela = document.querySelector('#block-issuesassignedtome table.list.issues');
        if (!tabela) return;

        const estadoArmazenado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const idAtivo = (estadoArmazenado.running && estadoArmazenado.issueId) ? estadoArmazenado.issueId : null;
        const linhas = tabela.querySelectorAll('tr.issue');
        
        for (const linha of linhas) {
            const id = linha.id.replace('issue-', '');
            const celulaAssunto = linha.querySelector('.subject');
            if (!celulaAssunto) continue;

            let btn = linha.querySelector('.sky-list-action');
            if (!btn) {
                btn = document.createElement('span');
                btn.className = 'sky-list-action';
                celulaAssunto.prepend(btn);
            }

            const estaAtivo = (idAtivo === id);

            if (estaAtivo) {
                if (btn.innerHTML !== '■') {
                    btn.innerHTML = '&#9632;';
                    btn.style.color = '#ef4444';
                    btn.title = "Parar Timer (Tarefa em andamento)";
                    btn.onclick = (e) => { e.stopPropagation(); RelogioSky.parar(); };
                    linha.classList.add('sky-row-active');
                    
                    if (!linha.querySelector('.sky-list-timer')) {
                        const spanTimer = document.createElement('span');
                        spanTimer.className = 'sky-list-timer';
                        spanTimer.id = `sky-list-timer-${id}`;
                        spanTimer.innerText = "Calculando...";
                        btn.after(spanTimer);
                        
                        // Busca horas do servidor para somar no display da lista
                        ServicoRedmine.obterHorasLancadasHoje(id).then(h => {
                             spanTimer.dataset.serverHours = h;
                        });
                    }
                }
            } else {
                if (btn.innerHTML !== '►') {
                    btn.innerHTML = '&#9658;';
                    btn.style.color = '#22c55e';
                    btn.title = "Iniciar Timer nesta tarefa";
                    btn.onclick = (e) => { 
                        e.stopPropagation(); 
                        if (idAtivo && idAtivo !== id) {
                            if(!confirm("Existe outra tarefa em andamento. Deseja parar a anterior e iniciar esta?")) return;
                        }
                        RelogioSky.comecar(id); 
                    };
                    linha.classList.remove('sky-row-active');
                    const timerExistente = linha.querySelector('.sky-list-timer');
                    if (timerExistente) timerExistente.remove();
                }
            }

            if (!linha.querySelector('.sky-copy-list-btn')) {
                const btnCopiar = document.createElement('span');
                btnCopiar.className = 'sky-copy-list-btn';
                btnCopiar.innerHTML = '📋';
                btnCopiar.title = "Copiar ID e Título";
                btnCopiar.onclick = (e) => {
                    e.stopPropagation();
                    const texto = `T #${id} - ${celulaAssunto.querySelector('a').innerText}`;
                    navigator.clipboard.writeText(texto);
                    const original = btnCopiar.innerHTML;
                    btnCopiar.innerHTML = '✅';
                    setTimeout(() => btnCopiar.innerHTML = original, 1000);
                };
                celulaAssunto.appendChild(btnCopiar);
            }
        }
    },

    comecar: async (idTarefa) => {
        RelogioSky.pararInterno();

        // Busca horas antes de iniciar para ter o offset correto
        RelogioSky.horasServidor = await ServicoRedmine.obterHorasLancadasHoje(idTarefa);

        RelogioSky.idTarefaRodando = idTarefa;
        RelogioSky.idTarefaVisualizada = window.location.pathname.split('/').pop(); // Atualiza contexto visual
        RelogioSky.inicioSessao = Date.now();
        
        localStorage.setItem('sky_timer_state', JSON.stringify({
            running: true,
            issueId: idTarefa,
            startTime: RelogioSky.inicioSessao
        }));

        if (window.location.pathname.includes('/my/page')) {
            RelogioSky.renderizarMinhaPagina();
            RelogioSky.iniciarIntervaloGlobal();
        } else {
            RelogioSky.iniciarInterface();
        }
        
        ServicoRedmine.pausarOutrasTarefas(idTarefa);
        ServicoRedmine.definirStatus(idTarefa, CONSTANTES_REDMINE.STATUS.EM_ANDAMENTO).catch(console.error);
        ServicoRedmine.atribuirParaMim(idTarefa).catch(console.error);
    },

    parar: () => {
        // Precisa recuperar o startTime do storage se não estiver na tela da tarefa ativa
        let inicio = RelogioSky.inicioSessao;
        if (!inicio) {
            const stored = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
            inicio = stored.startTime;
        }

        if (!inicio) return;
        const horasSessao = (Date.now() - inicio) / 1000 / 3600;
        
        RelogioSky.abrirModalRegistro(horasSessao);
        RelogioSky.pararInterno();
    },

    pararInterno: () => {
        if (RelogioSky.intervalo) clearInterval(RelogioSky.intervalo);
        RelogioSky.intervalo = null;
        RelogioSky.inicioSessao = null;
        RelogioSky.idTarefaRodando = null;
        localStorage.removeItem('sky_timer_state');
        
        RelogioSky.atualizarDisplay();
        
        if (window.location.pathname.includes('/my/page')) {
             RelogioSky.renderizarMinhaPagina();
        }

        const btn = document.getElementById('sky-timer-toggle');
        if (btn) {
            btn.className = 'sky-timer-btn sky-btn-play';
            btn.innerHTML = '&#9658;';
            btn.title = "Iniciar Trabalho";
        }
    },

    iniciarInterface: () => {
        const btn = document.getElementById('sky-timer-toggle');
        if (btn) {
            btn.className = 'sky-timer-btn sky-btn-stop sky-blink';
            btn.innerHTML = '&#9632;';
            btn.title = "Parar e Lançar Horas";
        }
        RelogioSky.iniciarIntervaloGlobal();
        RelogioSky.atualizarDisplay();
    },

    iniciarIntervaloGlobal: () => {
        if (RelogioSky.intervalo) clearInterval(RelogioSky.intervalo);
        RelogioSky.intervalo = setInterval(() => {
            RelogioSky.atualizarDisplay();
            if (window.location.pathname.includes('/my/page')) {
                RelogioSky.renderizarMinhaPagina();
            }
        }, 1000);
    },

    atualizarDisplay: () => {
        // --- Cálculo para o Widget da Página de Detalhes ---
        const elWidget = document.getElementById('sky-timer-display');
        if (elWidget) {
            // Começa com as horas do servidor (estáticas)
            let segundosTotais = RelogioSky.horasServidor * 3600;
            
            // Se esta é a tarefa ativa, soma o tempo decorrido
            if (RelogioSky.idTarefaRodando === RelogioSky.idTarefaVisualizada && RelogioSky.inicioSessao) {
                const segundosSessao = (Date.now() - RelogioSky.inicioSessao) / 1000;
                segundosTotais += segundosSessao;
            }

            elWidget.innerText = RelogioSky.formatarTempo(segundosTotais);
        }

        // --- Cálculo para o Timer na Lista (Minha Página) ---
        // A lista pode ter um timer rodando que NÃO é a tarefa principal do widget (se estivermos na my/page)
        const estadoArmazenado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        if (estadoArmazenado.running && estadoArmazenado.issueId) {
            const elLista = document.getElementById(`sky-list-timer-${estadoArmazenado.issueId}`);
            if (elLista) {
                // Tenta ler as horas do servidor salvas no elemento (ver renderMyPage)
                let horasServidorLista = parseFloat(elLista.dataset.serverHours || 0);
                
                let segundosLista = horasServidorLista * 3600;
                const segundosSessaoLista = (Date.now() - estadoArmazenado.startTime) / 1000;
                segundosLista += segundosSessaoLista;

                elLista.innerText = RelogioSky.formatarTempo(segundosLista);
            }
        }
    },

    formatarTempo: (totalSegundos) => {
        const h = Math.floor(totalSegundos / 3600);
        const m = Math.floor((totalSegundos % 3600) / 60);
        const s = Math.floor(totalSegundos % 60);
        return String(h).padStart(2, '0') + ':' + 
               String(m).padStart(2, '0') + ':' + 
               String(s).padStart(2, '0');
    },

    abrirModalRegistro: (horas) => {
        const horasFixas = horas.toFixed(2);
        
        const html = `
        <div id="sky-timer-overlay">
            <div id="sky-timer-modal">
                <div id="sky-timer-header">
                    <h3>Registrar Tempo (SkyRMTT)</h3>
                    <button id="sky-timer-close">&times;</button>
                </div>
                <div id="sky-timer-body">
                    <div class="svn-field">
                        <label>Tempo Decorrido (Horas)</label>
                        <input id="sky-log-hours" class="svn-input" value="${horasFixas}">
                    </div>
                    <div class="svn-field">
                        <label>Comentário</label>
                        <textarea id="sky-log-comment" class="svn-input" style="height: 60px;"></textarea>
                    </div>
                    <div class="svn-field" style="flex-direction: row; align-items: center; gap: 10px;">
                        <input type="checkbox" id="sky-log-resolve" checked>
                        <label for="sky-log-resolve" style="margin:0; cursor:pointer;">Definir como RESOLVIDA?</label>
                    </div>
                </div>
                <div id="sky-timer-footer">
                    <div id="sky-timer-status"></div>
                    <button id="sky-timer-cancel" class="btn btn-cancel">Cancelar</button>
                    <button id="sky-timer-submit" class="btn btn-confirm">LANÇAR HORAS</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('sky-log-comment').value = "Desenvolvimento"; 

        const fechar = () => document.getElementById('sky-timer-overlay').remove();
        document.getElementById('sky-timer-close').onclick = fechar;
        document.getElementById('sky-timer-cancel').onclick = fechar;
        document.getElementById('sky-timer-submit').onclick = () => {
            const h = document.getElementById('sky-log-hours').value;
            const c = document.getElementById('sky-log-comment').value;
            const resolver = document.getElementById('sky-log-resolve').checked;
            
            const divStatus = document.getElementById('sky-timer-status');
            const btnEnviar = document.getElementById('sky-timer-submit');
            
            divStatus.innerText = "Enviando...";
            btnEnviar.disabled = true;

            let idTarefa = RelogioSky.idTarefaRodando || window.location.pathname.split('/').pop();

            const acoes = [ ServicoRedmine.registrarTempo(idTarefa, h, c) ];
            if (resolver) acoes.push(ServicoRedmine.definirStatus(idTarefa, CONSTANTES_REDMINE.STATUS.RESOLVIDA));

            Promise.all(acoes)
                .then(() => {
                    alert("Tempo registrado e status atualizado!");
                    fechar();
                    window.location.reload();
                })
                .catch(erro => {
                    divStatus.className = 'error-msg';
                    divStatus.innerText = "Erro: " + erro.message;
                    btnEnviar.disabled = false;
                });
        };
    }
};

function injetarInterfaceTimer() {
    if (document.getElementById('sky-timer-widget')) return;

    const detalhes = document.querySelector('.issue.details');
    if (!detalhes) return;

    const div = document.createElement('div');
    div.id = 'sky-timer-widget';
    div.innerHTML = `
        <div style="flex: 1;">
            <div style="font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase;">SkyRMTT Timer</div>
            <div style="font-size: 11px; color: #94a3b8;">Registre seu tempo automaticamente</div>
        </div>
        <div id="sky-timer-display">--:--:--</div>
        <button id="sky-timer-toggle" class="sky-timer-btn sky-btn-play" title="Iniciar Trabalho">&#9658;</button>
    `;

    const caixaBranch = document.getElementById('sky-branch-info');
    if (caixaBranch) {
        detalhes.insertBefore(div, caixaBranch);
    } else {
        detalhes.prepend(div);
    }

    document.getElementById('sky-timer-toggle').onclick = () => {
        // Verifica se a tarefa visualizada é a que está rodando
        const idTarefaVisualizada = window.location.pathname.split('/').pop();
        
        if (RelogioSky.idTarefaRodando === idTarefaVisualizada && RelogioSky.inicioSessao) {
            RelogioSky.parar();
        } else {
            RelogioSky.comecar(idTarefaVisualizada);
        }
    };
    
    RelogioSky.iniciar();
}