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

        const response = await fetch(`/issues/${idTarefa}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': '', // Usa sessão do browser
                'X-CSRF-Token': token
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
        if (idUsuario) {
            return ServicoRedmine.atualizarTarefa(idTarefa, { assigned_to_id: idUsuario });
        }
    },

    pausarOutrasTarefas: async (idTarefaAtual) => {
        try {
            // Busca tarefas em andamento do usuário atual
            const response = await fetch('/issues.json?assigned_to_id=me&status_id=2', {
                headers: { 'X-Redmine-API-Key': '' } // Sessão do browser
            });
            const data = await response.json();
            
            if (data.issues && data.issues.length > 0) {
                const promises = data.issues.map(issue => {
                    if (issue.id != idTarefaAtual) {
                        console.log(`[SkyRMTT] Interrompendo tarefa #${issue.id}`);
                        // Define como Interrompida (7) ou Nova (1) se 7 não existir
                        // O sistema Sky usa 7 para Interrompida.
                        return ServicoRedmine.definirStatus(issue.id, 7); 
                    }
                });
                await Promise.all(promises);
            }
        } catch (e) {
            console.error("Erro ao pausar outras tarefas:", e);
        }
    },

    registrarTempo: async (idTarefa, horas, comentarios, idAtividade = 11) => { // 11 = Dev default
        const token = ServicoRedmine.obterTokenCsrf();
        const payload = {
            time_entry: {
                issue_id: idTarefa,
                hours: horas,
                comments: comentarios,
                activity_id: idAtividade,
                spent_on: new Date().toISOString().split('T')[0]
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
            const hoje = new Date().toISOString().split('T')[0];
            const response = await fetch(`/time_entries.json?issue_id=${idTarefa}&user_id=me&spent_on=${hoje}`, {
                headers: { 'X-Redmine-API-Key': '' }
            });
            const data = await response.json();
            
            if (data.time_entries) {
                return data.time_entries.reduce((acc, entry) => acc + entry.hours, 0);
            }
            return 0;
        } catch (e) {
            console.error("Erro ao buscar horas de hoje:", e);
            return 0;
        }
    }
};
