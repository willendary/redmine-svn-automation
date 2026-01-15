// --- API do Redmine & Lógica de Negócio ---
const CONSTANTES_REDMINE = {
    STATUS: {
        NOVA: 1,
        EM_ANDAMENTO: 2,
        RESOLVIDA: 3,
        FECHADA: 5
    }
};

const ServicoRedmine = {
    obterTokenCsrf: () => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    },
    
    obterIdUsuarioAtual: () => {
        const userLink = document.querySelector('#loggedas a');
        return userLink ? userLink.getAttribute('href').split('/').pop() : null;
    },

    atualizarTarefa: async (idTarefa, payload) => {
        const token = ServicoRedmine.obterTokenCsrf();
        if (!token) throw new Error("CSRF Token não encontrado");

        // Headers padrão para ações de escrita (precisam de CSRF)
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token
        };

        const response = await fetch(`/issues/${idTarefa}.json`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ issue: payload })
        });

        if (!response.ok) throw new Error(`Erro API: ${response.status}`);
    },

    definirStatus: async (idTarefa, idStatus) => {
        return ServicoRedmine.atualizarTarefa(idTarefa, { status_id: idStatus });
    },

    atribuirParaMim: async (idTarefa) => {
        const idUsuario = ServicoRedmine.obterIdUsuarioAtual();
        if (idUsuario) {
            return ServicoRedmine.atualizarTarefa(idTarefa, { assigned_to_id: idUsuario });
        }
    },

    pausarOutrasTarefas: async (idTarefaAtual) => {
        try {
            // Usa apenas a sessão do browser, sem headers extras
            const response = await fetch('/issues.json?assigned_to_id=me&status_id=2');
            const data = await response.json();
            
            if (data.issues && data.issues.length > 0) {
                const promises = data.issues.map(issue => {
                    if (issue.id != idTarefaAtual) {
                        console.log(`[SkyRMTT] Interrompendo tarefa #${issue.id}`);
                        return ServicoRedmine.definirStatus(issue.id, 7); 
                    }
                });
                await Promise.all(promises);
            }
        } catch (e) {
            console.error("Erro ao pausar outras tarefas:", e);
        }
    },

    registrarTempo: async (idTarefa, horas, comentarios, idAtividade = 11) => { 
        const token = ServicoRedmine.obterTokenCsrf();
        
        // Data Local no formato YYYY-MM-DD
        const hoje = new Date().toLocaleDateString('en-CA'); // Formato ISO local

        const payload = {
            time_entry: {
                issue_id: idTarefa,
                hours: horas,
                comments: comentarios,
                activity_id: idAtividade,
                spent_on: hoje
            }
        };

        const response = await fetch(`/time_entries.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Falha ao lançar horas");
    },

    obterHorasLancadasHoje: async (idTarefa) => {
        try {
            // Correção: Usa data local em vez de UTC para evitar problemas de fuso
            const hoje = new Date().toLocaleDateString('en-CA'); // Retorna YYYY-MM-DD local
            
            // Correção: Removemos o header 'X-Redmine-API-Key' vazio que podia causar 401
            const response = await fetch(`/time_entries.json?issue_id=${idTarefa}&user_id=me&spent_on=${hoje}`);
            
            if (!response.ok) {
                console.warn("Falha ao buscar horas:", response.status);
                return 0;
            }

            const data = await response.json();
            
            if (data.time_entries) {
                return data.time_entries.reduce((acc, entry) => acc + entry.hours, 0);
            }
            return 0;
        } catch (e) {
            console.error("Erro ao buscar horas de hoje:", e);
            return 0;
        }
    },

    obterTotalHorasGeraisHoje: async () => {
        try {
            const hoje = new Date().toLocaleDateString('en-CA');
            const response = await fetch(`/time_entries.json?user_id=me&spent_on=${hoje}`);
            if (!response.ok) return 0;
            const data = await response.json();
            return data.time_entries ? data.time_entries.reduce((acc, entry) => acc + entry.hours, 0) : 0;
        } catch (e) {
            return 0;
        }
    }
};