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

function abrirGeradorCommit(tarefa) {
    if (!tarefa || !tarefa.id) return;
    const padroes = [
        { rotulo: 'Padrão Desenvolvimento (T #ID - Assunto)', prefixo: `T #${tarefa.id} - ${tarefa.assunto}` },
        { rotulo: 'Com Projeto/Tracker', prefixo: `T #${tarefa.id} - [${tarefa.projeto || tarefa.tracker || 'Sky'}] ${tarefa.assunto}` },
        { rotulo: 'Merge no Trunk', prefixo: `Merge T #${tarefa.id}` },
        { rotulo: 'Correção / Retorno de Teste', prefixo: `T #${tarefa.id} - [Retorno de Teste] ${tarefa.assunto}` },
        { rotulo: 'Refatoração / Melhoria', prefixo: `T #${tarefa.id} - [Refatoração] ${tarefa.assunto}` }
    ];

    const overlay = abrirModal(`
        <div class="modal-header">
            <h3>Gerador de Mensagem de Commit — Padrão Sky</h3>
            <button type="button" data-fechar aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body">
            <div class="campo">
                <label for="tipo-commit">Modelo de mensagem</label>
                <select id="tipo-commit">
                    ${padroes.map((p, idx) => `<option value="${idx}">${escapar(p.rotulo)}</option>`).join('')}
                </select>
            </div>
            <div class="campo">
                <label for="texto-commit">Mensagem formatada para o SVN (editável)</label>
                <textarea id="texto-commit" rows="3" style="width:100%; font-family: ui-monospace, Consolas, monospace; font-size:13px;"></textarea>
            </div>
            <div class="campo">
                <label for="detalhe-commit">Complemento opcional</label>
                <input type="text" id="detalhe-commit" placeholder="Ex.: Ajustado cálculo de juros e arredondamento">
            </div>
            <div style="font-size:12px; color:var(--muted, #5e7188); line-height:1.5;">
                💡 <strong>Padrão Sky:</strong> Inclua sempre o número <code>T #${tarefa.id}</code> no início para que o Redmine vincule as revisões do SVN à tarefa automaticamente.
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn secundario" type="button" data-fechar>Fechar</button>
            <button class="btn" type="button" id="btn-copiar-commit-gerado">Copiar mensagem</button>
        </div>
    `);

    overlay.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => overlay.remove()));

    const select = overlay.querySelector('#tipo-commit');
    const textarea = overlay.querySelector('#texto-commit');
    const inputDetalhe = overlay.querySelector('#detalhe-commit');

    function atualizarMensagem() {
        const base = padroes[Number(select.value)]?.prefixo || `T #${tarefa.id} - ${tarefa.assunto}`;
        const detalhe = inputDetalhe.value.trim();
        textarea.value = detalhe ? `${base} - ${detalhe}` : base;
    }

    select.addEventListener('change', atualizarMensagem);
    inputDetalhe.addEventListener('input', atualizarMensagem);
    atualizarMensagem();

    overlay.querySelector('#btn-copiar-commit-gerado').addEventListener('click', () => {
        navigator.clipboard.writeText(textarea.value.trim())
            .then(() => {
                mostrarToast('Mensagem de commit copiada.');
                overlay.remove();
            })
            .catch(erro => mostrarToast(erro.message, 'erro'));
    });
}
