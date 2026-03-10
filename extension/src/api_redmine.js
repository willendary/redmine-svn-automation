// --- API do Redmine & Lógica de Negócio ---
const CONSTANTES_REDMINE = {
    STATUS: { NOVA: 1, EM_ANDAMENTO: 2, RESOLVIDA: 3, FECHADA: 5 }
};

const ServicoRedmine = {
    obterTokenCsrf: () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    },
    
    obterIdUsuarioAtual: () => {
        const userLink = document.querySelector('#loggedas a, .user.active');
        if (userLink) {
            const href = userLink.getAttribute('href');
            if (href) return href.split('/').pop();
        }
        return null;
    },

    atualizarTarefa: async (idTarefa, payload) => {
        const token = ServicoRedmine.obterTokenCsrf();
        const response = await fetch(`/issues/${idTarefa}.json`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRF-Token': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ issue: payload })
        });
        if (!response.ok) throw new Error(`Erro API: ${response.status}`);
    },

    definirStatus: async (idTarefa, idStatus) => {
        return ServicoRedmine.atualizarTarefa(idTarefa, { status_id: idStatus });
    },

    atribuirParaMim: async (idTarefa) => {
        const idUsuario = ServicoRedmine.obterIdUsuarioAtual();
        if (idUsuario) return ServicoRedmine.atualizarTarefa(idTarefa, { assigned_to_id: idUsuario });
    },

    pausarOutrasTarefas: async (idTarefaAtual) => {
        try {
            const response = await fetch('/issues.json?assigned_to_id=me&status_id=2', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (data.issues) {
                for (const issue of data.issues) {
                    if (issue.id != idTarefaAtual) await ServicoRedmine.definirStatus(issue.id, 7); 
                }
            }
        } catch (e) { console.error(e); }
    },

    registrarTempo: async (idTarefa, horas, comentarios, idAtividade = 11) => { 
        const token = ServicoRedmine.obterTokenCsrf();
        const hoje = new Date().toLocaleDateString('en-CA');
        const payload = {
            time_entry: { issue_id: idTarefa, hours: horas, comments: comentarios, activity_id: idAtividade, spent_on: hoje }
        };
        const response = await fetch(`/time_entries.json`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRF-Token': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Falha ao lançar horas");
    },

    obterHorasLancadasHoje: async (idTarefa) => {
        try {
            const hoje = new Date().toLocaleDateString('en-CA');
            const response = await fetch(`/time_entries.json?issue_id=${idTarefa}&user_id=me&spent_on=${hoje}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (response.ok) {
                const data = await response.json();
                return data.time_entries ? data.time_entries.reduce((acc, entry) => acc + entry.hours, 0) : 0;
            }
            return 0;
        } catch (e) { return 0; }
    },

    obterTotalHorasGeraisHoje: async () => {
        try {
            const hoje = new Date().toLocaleDateString('en-CA');
            
            // TENTA VIA API JSON PRIMEIRO
            const response = await fetch(`/time_entries.json?user_id=me&spent_on=${hoje}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (response.ok) {
                const data = await response.json();
                return data.time_entries ? data.time_entries.reduce((acc, entry) => acc + entry.hours, 0) : 0;
            }

            // SE FALHAR (401), TENTA VIA HTML (SCRAPING) - INFALÍVEL
            console.warn("[Sky API] API JSON bloqueada (401). Tentando ler total via HTML...");
            const htmlResponse = await fetch(`/time_entries?user_id=me&from=${hoje}&to=${hoje}`);
            const html = await htmlResponse.text();
            
            // Parser simples de HTML para achar o total
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 1. Procura na linha de TOTAL, que é o mais confiável.
            const totalRow = Array.from(doc.querySelectorAll('tr.total, .total-hours')).find(el => el.innerText.toLowerCase().includes('total'));
            if (totalRow) {
                const hoursMatch = totalRow.innerText.match(/(\d+[.,]\d+)/);
                if (hoursMatch) return parseFloat(hoursMatch[1].replace(',', '.'));
            }

            // 2. Se não achar a linha de total, soma todas as linhas de horas individuais.
            // Este é o fallback que corrige o bug de pegar só o primeiro valor.
            const hourCells = doc.querySelectorAll('table.list.time-entries td.hours');
            if (hourCells.length > 0) {
                console.warn("[Sky API] Linha de total não encontrada. Somando horas individuais como fallback.");
                return Array.from(hourCells).reduce((sum, cell) => {
                    const hours = parseFloat(cell.innerText.replace(',', '.'));
                    return sum + (isNaN(hours) ? 0 : hours);
                }, 0);
            }

            return 0;
        } catch (e) { 
            console.error("[Sky API] Falha total ao obter horas:", e);
            return 0; 
        }
    }
};
