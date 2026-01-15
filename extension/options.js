// Salva opções no chrome.storage
function salvarOpcoes() {
    const timer = document.getElementById('feature_timer').checked;
    const svn = document.getElementById('feature_svn').checked;
    const mypage = document.getElementById('feature_mypage').checked;
    const copy = document.getElementById('feature_copy').checked;

    chrome.storage.sync.set({
        feature_timer: timer,
        feature_svn: svn,
        feature_mypage: mypage,
        feature_copy: copy
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Configurações salvas com sucesso!';
        status.className = 'success';
        status.style.display = 'block';
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    });
}

// Restaura o estado das opções usando as preferências armazenadas
function restaurarOpcoes() {
    // Padrão: Tudo ativado se for a primeira vez
    chrome.storage.sync.get({
        feature_timer: true,
        feature_svn: true,
        feature_mypage: true,
        feature_copy: true
    }, (items) => {
        document.getElementById('feature_timer').checked = items.feature_timer;
        document.getElementById('feature_svn').checked = items.feature_svn;
        document.getElementById('feature_mypage').checked = items.feature_mypage;
        document.getElementById('feature_copy').checked = items.feature_copy;
    });
}

document.addEventListener('DOMContentLoaded', restaurarOpcoes);
document.getElementById('save').addEventListener('click', salvarOpcoes);
