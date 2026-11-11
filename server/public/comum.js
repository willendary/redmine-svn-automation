// Utilitarios compartilhados pelas telas web.
function escapar(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatarHoras(horas) {
    const valor = Number(horas) || 0;
    return `${valor.toFixed(2).replace('.', ',')}h`;
}

function formatarDuracao(segundos) {
    const total = Math.max(0, Math.floor(Number(segundos) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(parte => String(parte).padStart(2, '0')).join(':');
}

function formatarData(dataIso) {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function pedirJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        const erro = new Error(dados.error || `Falha na requisição (${resposta.status}).`);
        erro.status = resposta.status;
        erro.dados = dados;
        throw erro;
    }
    return dados;
}

function mostrarToast(mensagem, tipo = 'ok') {
    const anterior = document.querySelector('.toast');
    if (anterior) anterior.remove();

    const elemento = document.createElement('div');
    elemento.className = `toast ${tipo}`;
    elemento.textContent = mensagem;
    elemento.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    document.body.appendChild(elemento);

    setTimeout(() => elemento.remove(), 5000);
}

function abrirModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">${html}</div>`;
    overlay.addEventListener('click', evento => {
        if (evento.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    return overlay;
}

// Modal de lancamento de horas, usado pela tarefa e por minhas tarefas.
function abrirModalRegistroTempo(timerAtual, aoConcluir) {
    const segundos = timerAtual && timerAtual.rodando && timerAtual.inicio
        ? Math.max(0, (Date.now() - new Date(timerAtual.inicio).getTime()) / 1000)
        : 0;
    const horasSugeridas = Math.max(0.01, Math.round((segundos / 3600) * 100) / 100);
    const taskId = timerAtual ? timerAtual.taskId : '';

    const overlay = abrirModal(`
        <div class="modal-header">
            <h3>Registrar tempo — T#${escapar(taskId)}</h3>
            <button data-fechar>&times;</button>
        </div>
        <div class="modal-body">
            <div class="campo">
                <label for="horas">Tempo decorrido (horas)</label>
                <input type="number" id="horas" step="0.01" min="0.01" value="${horasSugeridas.toFixed(2)}">
            </div>
            <div class="campo">
                <label for="comentario">Comentário</label>
                <textarea id="comentario">Desenvolvimento</textarea>
            </div>
            <label style="display:flex; gap:8px; align-items:center; font-size:13px;">
                <input type="checkbox" id="resolver" checked style="width:auto;">
                Definir como Resolvida?
            </label>
            <div id="erro-registro" class="aviso erro oculto" style="margin-top:12px;"></div>
        </div>
        <div class="modal-footer">
            <button class="btn secundario" data-fechar>Cancelar</button>
            <button class="btn" id="lancar">Lançar horas</button>
        </div>
    `);

    overlay.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click', () => overlay.remove()));
    overlay.querySelector('#lancar').addEventListener('click', async () => {
        const botao = overlay.querySelector('#lancar');
        const erro = overlay.querySelector('#erro-registro');
        botao.disabled = true;
        botao.textContent = 'Lançando...';

        try {
            const resultado = await pedirJson('/timer/parar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    horas: Number(overlay.querySelector('#horas').value),
                    comentario: overlay.querySelector('#comentario').value,
                    resolver: overlay.querySelector('#resolver').checked
                })
            });

            overlay.remove();
            mostrarToast(resultado.aviso || 'Tempo lançado.', resultado.aviso ? 'erro' : 'ok');
            if (aoConcluir) aoConcluir();
        } catch (falha) {
            erro.textContent = falha.message;
            erro.classList.remove('oculto');
            botao.disabled = false;
            botao.textContent = 'Lançar horas';
        }
    });
}
