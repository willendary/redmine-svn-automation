const RelogioSky = {
    intervalo: null,
    inicioSessao: null, 
    idTarefaRodando: null, 
    idTarefaVisualizada: null, 
    horasServidor: 0, 

    iniciar: async () => {
        window.addEventListener('storage', RelogioSky.aoMudarStorage);
        window.addEventListener('focus', RelogioSky.aoFocarJanela);
        await RelogioSky.sincronizarEstadoGeral();
    },

    aoMudarStorage: (e) => {
        if (e.key === 'sky_timer_state') RelogioSky.sincronizarEstadoGeral();
    },

    aoFocarJanela: () => {
        if (RelogioSky.idTarefaVisualizada && /^\d+$/.test(RelogioSky.idTarefaVisualizada)) {
            ServicoRedmine.obterHorasLancadasHoje(RelogioSky.idTarefaVisualizada).then(horas => {
                RelogioSky.horasServidor = horas;
                RelogioSky.atualizarDisplay();
            });
        }
    },

    sincronizarEstadoGeral: async () => {
        const estado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const partesUrl = window.location.pathname.split('/');
        const possivelId = partesUrl.pop();
        
        // Só define como ID se for numérico
        RelogioSky.idTarefaVisualizada = /^\d+$/.test(possivelId) ? possivelId : null;
        const ehPaginaTarefa = !!RelogioSky.idTarefaVisualizada;

        if (estado.running) {
            RelogioSky.idTarefaRodando = String(estado.issueId);
            RelogioSky.inicioSessao = estado.startTime;
        } else {
            RelogioSky.idTarefaRodando = null;
            RelogioSky.inicioSessao = null;
        }

        // Busca horas se estivermos em uma tarefa
        if (ehPaginaTarefa) {
            const h = await ServicoRedmine.obterHorasLancadasHoje(RelogioSky.idTarefaVisualizada);
            RelogioSky.horasServidor = h;
        }

        RelogioSky.gerenciarIntervalos();
        RelogioSky.renderizarMinhaPagina(); 
        RelogioSky.atualizarDisplay();      
    },

    iniciarMinhaPagina: () => {
        RelogioSky.renderizarMinhaPagina();
        RelogioSky.iniciarIntervaloGlobal();
    },

    renderizarMinhaPagina: async () => {
        const tabela = document.querySelector('#block-issuesassignedtome table.list.issues');
        if (!tabela) return;

        const estado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const idAtivo = (estado.running && estado.issueId) ? String(estado.issueId) : null;
        const linhas = tabela.querySelectorAll('tr.issue');
        
        for (const linha of linhas) {
            const id = linha.id.replace('issue-', '');
            const celulaAssunto = linha.querySelector('.subject');
            if (!celulaAssunto) continue;

            // 1. Botão Play/Stop
            let btn = linha.querySelector('.sky-list-action');
            if (!btn) {
                btn = document.createElement('span');
                btn.className = 'sky-list-action';
                celulaAssunto.prepend(btn);
            }

            if (idAtivo === id) {
                if (btn.innerHTML !== '■') {
                    btn.innerHTML = '&#9632;'; 
                    btn.style.color = '#ef4444';
                    btn.onclick = (e) => { e.stopPropagation(); RelogioSky.parar(); };
                    linha.classList.add('sky-row-active');
                }
                
                let spanTimer = linha.querySelector('.sky-list-timer');
                if (!spanTimer) {
                    spanTimer = document.createElement('span');
                    spanTimer.className = 'sky-list-timer';
                    spanTimer.id = `sky-list-timer-${id}`;
                    spanTimer.innerText = "00:00:00"; // Começa em zero em vez de "Calculando"
                    btn.after(spanTimer);
                    
                    ServicoRedmine.obterHorasLancadasHoje(id).then(h => {
                         spanTimer.dataset.serverHours = h || 0;
                         RelogioSky.atualizarDisplay(); 
                    });
                }
            } else {
                if (btn.innerHTML !== '►') {
                    btn.innerHTML = '&#9658;'; 
                    btn.style.color = '#22c55e';
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

            // 2. Botão Copiar
            if (!linha.querySelector('.sky-copy-list-btn')) {
                const btnCopiar = document.createElement('span');
                btnCopiar.className = 'sky-copy-list-btn';
                btnCopiar.innerHTML = '📋';
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
        const horasHoje = await ServicoRedmine.obterHorasLancadasHoje(idTarefa);
        RelogioSky.horasServidor = horasHoje;
        RelogioSky.idTarefaRodando = String(idTarefa);
        RelogioSky.inicioSessao = Date.now();
        
        localStorage.setItem('sky_timer_state', JSON.stringify({
            running: true,
            issueId: idTarefa,
            startTime: RelogioSky.inicioSessao
        }));

        RelogioSky.gerenciarIntervalos();
        RelogioSky.renderizarMinhaPagina();
        RelogioSky.atualizarDisplay();
        
        ServicoRedmine.pausarOutrasTarefas(idTarefa);
        ServicoRedmine.definirStatus(idTarefa, CONSTANTES_REDMINE.STATUS.EM_ANDAMENTO).catch(console.error);
        ServicoRedmine.atribuirParaMim(idTarefa).catch(console.error);
    },

    parar: () => {
        const estado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        const inicio = RelogioSky.inicioSessao || estado.startTime;
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
        RelogioSky.renderizarMinhaPagina();
        RelogioSky.atualizarDisplay();
        const btn = document.getElementById('sky-timer-toggle');
        if (btn) {
            btn.className = 'sky-timer-btn sky-btn-play';
            btn.innerHTML = '&#9658;'; 
        }
    },

    gerenciarIntervalos: () => {
        if (RelogioSky.idTarefaRodando) {
            RelogioSky.iniciarIntervaloGlobal();
            const btn = document.getElementById('sky-timer-toggle');
            if (btn) {
                if (RelogioSky.idTarefaRodando === RelogioSky.idTarefaVisualizada) {
                    btn.className = 'sky-timer-btn sky-btn-stop sky-blink';
                    btn.innerHTML = '&#9632;';
                } else {
                    btn.className = 'sky-timer-btn sky-btn-play';
                    btn.innerHTML = '&#9658;';
                }
            }
        } else {
            if (RelogioSky.intervalo) clearInterval(RelogioSky.intervalo);
            RelogioSky.intervalo = null;
        }
    },

    iniciarIntervaloGlobal: () => {
        if (RelogioSky.intervalo) clearInterval(RelogioSky.intervalo);
        RelogioSky.intervalo = setInterval(() => {
            RelogioSky.atualizarDisplay();
            if (window.location.pathname.includes('/my/page')) RelogioSky.renderizarMinhaPagina();
        }, 1000);
    },

    atualizarDisplay: () => {
        const estado = JSON.parse(localStorage.getItem('sky_timer_state') || '{}');
        
        // 1. Widget Detalhes
        const elWidget = document.getElementById('sky-timer-display');
        if (elWidget) {
            let seg = (RelogioSky.horasServidor || 0) * 3600;
            if (RelogioSky.idTarefaRodando === RelogioSky.idTarefaVisualizada && RelogioSky.inicioSessao) {
                seg += (Date.now() - RelogioSky.inicioSessao) / 1000;
            }
            elWidget.innerText = RelogioSky.formatarTempo(seg);
        }

        // 2. Lista na Minha Página (Varredura de todos os timers ativos na tela)
        if (estado.running) {
            const timers = document.querySelectorAll('.sky-list-timer');
            timers.forEach(t => {
                const idTimer = t.id.replace('sky-list-timer-', '');
                if (idTimer === String(estado.issueId)) {
                    const hServ = parseFloat(t.dataset.serverHours || 0);
                    let segList = hServ * 3600 + (Date.now() - estado.startTime) / 1000;
                    t.innerText = RelogioSky.formatarTempo(segList);
                }
            });
        }
    },

    formatarTempo: (s) => {
        if (isNaN(s) || s < 0) s = 0;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
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
            Promise.all(acoes).then(() => {
                alert("Tempo registrado!");
                fechar();
                window.location.reload();
            }).catch(erro => {
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
        <div id="sky-timer-display">00:00:00</div>
        <button id="sky-timer-toggle" class="sky-timer-btn sky-btn-play" title="Iniciar Trabalho">&#9658;</button>
    `;
    const caixaBranch = document.getElementById('sky-branch-info');
    if (caixaBranch) detalhes.insertBefore(div, caixaBranch);
    else detalhes.prepend(div);
    document.getElementById('sky-timer-toggle').onclick = () => {
        const idVis = window.location.pathname.split('/').pop();
        if (RelogioSky.idTarefaRodando === idVis && RelogioSky.inicioSessao) RelogioSky.parar();
        else RelogioSky.comecar(idVis);
    };
    RelogioSky.iniciar();
}