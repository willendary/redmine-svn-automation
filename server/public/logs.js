const alvo = document.getElementById('logs');
let registros = [];
let consultando = false;
function renderizarLogs() {
    const busca = document.getElementById('filtro-logs').value.trim().toLocaleLowerCase('pt-BR');
    const lista = registros.filter(linha => linha.toLocaleLowerCase('pt-BR').includes(busca));
    const pertoDoFim = alvo.scrollHeight - alvo.scrollTop - alvo.clientHeight < 60;
    alvo.textContent = lista.join('\n') || (busca ? 'Nenhum registro corresponde à busca.' : 'Nenhuma atividade registrada por enquanto.');
    document.getElementById('log-count').textContent = lista.length + ' de ' + registros.length + ' registros';
    if (pertoDoFim) alvo.scrollTop = alvo.scrollHeight;
}
async function atualizar() {
    if (consultando) return;
    consultando = true;
    const botao = document.getElementById('atualizar');
    botao.disabled = true;
    try {
        const dados = await pedirJson('/logs/dados');
        registros = (dados.logs || []).map(String);
        renderizarLogs();
        document.getElementById('logs-status').textContent = 'Atualizado às ' + new Date().toLocaleTimeString('pt-BR') + (document.getElementById('logs-auto').checked ? ' · A cada 3 segundos' : ' · Atualização automática pausada');
    } catch (erro) {
        document.getElementById('logs-status').textContent = 'Falha ao buscar logs: ' + erro.message;
    } finally {
        consultando = false;
        botao.disabled = false;
    }
}
function limpar() {
    const overlay = abrirModal('<div class="modal-header"><h3>Limpar os logs?</h3><button data-fechar aria-label="Fechar">×</button></div><div class="modal-body"><p>Os registros atuais serão removidos. Novas operações continuarão aparecendo normalmente.</p><div class="aviso erro oculto" id="erro-limpar"></div></div><div class="modal-footer"><button class="btn secundario" data-fechar>Cancelar</button><button class="btn perigo" id="confirmar-limpar">Limpar registros</button></div>');
    overlay.querySelectorAll('[data-fechar]').forEach(botao => botao.addEventListener('click',() => overlay.remove()));
    overlay.querySelector('#confirmar-limpar').addEventListener('click',async event => {
        event.target.disabled = true;
        try {
            await pedirJson('/clear-logs',{method:'POST'});
            overlay.remove();
            await atualizar();
            mostrarToast('Logs limpos.');
        } catch (erro) {
            const aviso = overlay.querySelector('#erro-limpar');
            aviso.textContent = erro.message;
            aviso.classList.remove('oculto');
            event.target.disabled = false;
        }
    });
}
document.addEventListener('DOMContentLoaded',() => {
    document.getElementById('atualizar').addEventListener('click',atualizar);
    document.getElementById('limpar').addEventListener('click',limpar);
    document.getElementById('filtro-logs').addEventListener('input',renderizarLogs);
    document.getElementById('logs-auto').addEventListener('change',event => {
        if (event.target.checked) atualizar();
        else document.getElementById('logs-status').textContent = 'Atualização automática pausada';
    });
    atualizar();
    setInterval(() => { if (document.getElementById('logs-auto').checked && !document.hidden) atualizar(); },3000);
});
