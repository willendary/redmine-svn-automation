// Cronometro de horas compartilhado entre as telas web.
// O estado fica no servidor para o tempo continuar correndo mesmo se a aba fechar.
const fs = require('fs');
const path = require('path');
const redmine = require('./redmine');

const ESTADO_PATH = path.join(__dirname, 'timer.json');

function lerEstado() {
    try {
        const dados = JSON.parse(fs.readFileSync(ESTADO_PATH, 'utf8'));
        return dados && dados.rodando && dados.taskId ? dados : null;
    } catch (e) {
        return null;
    }
}

function gravarEstado(estado) {
    fs.writeFileSync(ESTADO_PATH, JSON.stringify(estado, null, 2), 'utf8');
}

function limparEstado() {
    try {
        fs.unlinkSync(ESTADO_PATH);
    } catch (e) {
        // Sem arquivo: nada a limpar.
    }
}

function horasDecorridas(estado, agora = Date.now()) {
    const inicio = new Date(estado.inicio).getTime();
    if (!Number.isFinite(inicio)) return 0;
    return Math.max(0, (agora - inicio) / 3600000);
}

async function estado() {
    const atual = lerEstado();
    if (!atual) return { rodando: false };

    const horasHoje = await redmine.obterHorasHoje(atual.taskId).catch(() => 0);
    return {
        rodando: true,
        taskId: String(atual.taskId),
        inicio: atual.inicio,
        decorridoHoras: horasDecorridas(atual),
        horasHoje
    };
}

async function iniciar(taskId, { confirmarTroca = false } = {}) {
    const id = String(taskId || '').replace(/\D/g, '');
    if (!id) throw new Error('Informe a tarefa.');

    const atual = lerEstado();
    if (atual && String(atual.taskId) === id) return estado();

    if (atual && !confirmarTroca) {
        const erro = new Error('Já existe outra tarefa em andamento.');
        erro.status = 409;
        erro.anterior = {
            taskId: String(atual.taskId),
            inicio: atual.inicio,
            decorridoHoras: horasDecorridas(atual)
        };
        throw erro;
    }

    await redmine.pausarOutrasTarefas(id);
    const usuario = await redmine.obterUsuarioAtual();
    await redmine.atualizarTarefa(id, {
        status_id: redmine.STATUS.EM_ANDAMENTO,
        assigned_to_id: usuario.id
    });

    gravarEstado({ rodando: true, taskId: id, inicio: new Date().toISOString() });
    return estado();
}

async function parar({ horas, comentario, resolver = false } = {}) {
    const atual = lerEstado();
    if (!atual) throw new Error('Nenhuma tarefa em andamento.');

    const id = String(atual.taskId);
    const horasLancadas = Number(horas);
    const horasValidas = Number.isFinite(horasLancadas) && horasLancadas > 0
        ? Math.round(horasLancadas * 100) / 100
        : Math.round(horasDecorridas(atual) * 100) / 100;

    if (horasValidas <= 0) throw new Error('O tempo decorrido é zero. Informe as horas manualmente.');

    await redmine.registrarTempo({ taskId: id, horas: horasValidas, comentario });
    // Horas ja lancadas: limpa o estado antes de resolver, para um erro de status
    // nao permitir lancar o mesmo tempo de novo.
    limparEstado();

    let aviso = '';
    if (resolver) {
        try {
            await redmine.atualizarTarefa(id, { status_id: redmine.STATUS.RESOLVIDA });
        } catch (erro) {
            aviso = `Horas lançadas, mas não foi possível marcar como Resolvida: ${erro.message}`;
        }
    }

    return { taskId: id, horas: horasValidas, resolvida: Boolean(resolver) && !aviso, aviso };
}

module.exports = {
    ESTADO_PATH,
    lerEstado,
    horasDecorridas,
    estado,
    iniciar,
    parar
};
