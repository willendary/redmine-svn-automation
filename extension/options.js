// Salva opções no chrome.storage
function salvarOpcoes() {
    chrome.storage.sync.set({
        feature_timer: document.getElementById('feature_timer').checked,
        feature_svn: document.getElementById('feature_svn').checked,
        feature_mypage: document.getElementById('feature_mypage').checked,
        feature_filter: document.getElementById('feature_filter').checked,
        feature_summary: document.getElementById('feature_summary').checked,
        feature_meta: document.getElementById('feature_meta').checked,
        feature_copy: document.getElementById('feature_copy').checked
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Configurações salvas com sucesso!';
        status.className = 'success';
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
}

// Restaura o estado das opções
function restaurarOpcoes() {
    chrome.storage.sync.get({
        feature_timer: true,
        feature_svn: true,
        feature_mypage: true,
        feature_filter: true,
        feature_summary: true,
        feature_meta: true,
        feature_copy: true
    }, (items) => {
        document.getElementById('feature_timer').checked = items.feature_timer;
        document.getElementById('feature_svn').checked = items.feature_svn;
        document.getElementById('feature_mypage').checked = items.feature_mypage;
        document.getElementById('feature_filter').checked = items.feature_filter;
        document.getElementById('feature_summary').checked = items.feature_summary;
        document.getElementById('feature_meta').checked = items.feature_meta;
        document.getElementById('feature_copy').checked = items.feature_copy;
    });
}

document.addEventListener('DOMContentLoaded', restaurarOpcoes);
document.getElementById('save').addEventListener('click', salvarOpcoes);
