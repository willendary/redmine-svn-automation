function renderizarSecoes(secoes) {
    const alvo = document.getElementById('secoes-preferencias');

    if (!Array.isArray(secoes) || secoes.length === 0) {
        alvo.innerHTML = '<div class="config-carregando">Nenhuma preferência disponível.</div>';
        return;
    }

    alvo.innerHTML = secoes.map(secao => `
        <section class="config-grupo" aria-labelledby="grupo-${escapar(secao.id)}">
            <div class="config-grupo-header">
                <h3 id="grupo-${escapar(secao.id)}">${escapar(secao.titulo)}</h3>
                <p>${escapar(secao.descricao || '')}</p>
            </div>
            ${(secao.configuracoes || []).map(item => `
                <label class="config-item">
                    <span class="config-item-copy">
                        <span class="config-item-title">${escapar(item.titulo)}</span>
                        <span class="config-item-description">${escapar(item.descricao || '')}</span>
                    </span>
                    <span class="config-switch">
                        <input type="checkbox" data-preferencia="${escapar(item.id)}" aria-label="${escapar(item.titulo)}" ${item.valor ? 'checked' : ''}>
                        <span class="config-switch-track" aria-hidden="true"><span></span></span>
                    </span>
                </label>
            `).join('')}
        </section>
    `).join('');

    alvo.querySelectorAll('[data-preferencia]').forEach(controle => {
        controle.addEventListener('change', marcarPreferenciasAlteradas);
    });
}

function marcarPreferenciasAlteradas() {
    const status = document.getElementById('status-preferencias');
    status.className = 'config-save-status pendente';
    status.textContent = 'Há alterações não salvas.';
    document.getElementById('salvar-preferencias').disabled = false;
}

async function carregarPreferencias() {
    const dados = await pedirJson('/preferencias');
    renderizarSecoes(dados.secoes);
    const status = document.getElementById('status-preferencias');
    status.className = 'config-save-status';
    status.textContent = 'Preferências carregadas.';
}

async function salvarPreferencias() {
    const botao = document.getElementById('salvar-preferencias');
    const status = document.getElementById('status-preferencias');
    const valores = Object.fromEntries(
        [...document.querySelectorAll('[data-preferencia]')]
            .map(controle => [controle.dataset.preferencia, controle.checked])
    );

    botao.disabled = true;
    botao.textContent = 'Salvando...';
    status.className = 'config-save-status';
    status.textContent = 'Salvando preferências...';

    try {
        const dados = await pedirJson('/preferencias', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(valores)
        });

        renderizarSecoes(dados.secoes);
        status.className = 'config-save-status sucesso';
        status.textContent = 'Todas as preferências foram salvas.';
        mostrarToast('Preferências salvas.');
    } catch (erro) {
        status.className = 'config-save-status erro';
        status.textContent = erro.message;
        botao.disabled = false;
    } finally {
        botao.textContent = 'Salvar preferências';
    }
}

async function carregarConfiguracaoRedmine() {
    const dados = await pedirJson('/config-redmine');
    document.getElementById('url').value = dados.url || 'https://redmine.skyinformatica.com.br';

    const status = document.getElementById('status');
    status.textContent = dados.configurado
        ? 'Conexão ativa. Informe uma nova API key apenas para substituí-la.'
        : 'Nenhuma API key configurada ainda.';
    status.className = `config-save-status ${dados.configurado ? 'sucesso' : ''}`;
}

async function salvarConfiguracaoRedmine() {
    const botao = document.getElementById('salvar');
    const status = document.getElementById('status');
    const url = document.getElementById('url').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiKey) {
        status.className = 'config-save-status erro';
        status.textContent = 'Informe a API key para salvar.';
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Validando...';
    status.className = 'config-save-status';
    status.textContent = 'Validando acesso ao Redmine...';

    try {
        const dados = await pedirJson('/config-redmine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, apiKey })
        });

        document.getElementById('apiKey').value = '';
        status.className = 'config-save-status sucesso';
        status.textContent = `Conexão validada para ${dados.usuario || 'o usuário'}.`;
        mostrarToast('Conexão com Redmine salva.');
    } catch (erro) {
        status.className = 'config-save-status erro';
        status.textContent = erro.message;
    } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar e validar';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('salvar-preferencias').addEventListener('click', salvarPreferencias);
    document.getElementById('salvar').addEventListener('click', salvarConfiguracaoRedmine);

    carregarPreferencias().catch(erro => {
        const alvo = document.getElementById('secoes-preferencias');
        alvo.innerHTML = `<div class="aviso erro">${escapar(erro.message)}</div>`;
    });
    carregarConfiguracaoRedmine().catch(erro => {
        const status = document.getElementById('status');
        status.className = 'config-save-status erro';
        status.textContent = erro.message;
    });
});
