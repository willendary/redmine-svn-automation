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
