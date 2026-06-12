// Estilos CSS utilizados pela extensão
const ESTILOS_SKY = `
    #svn-overlay, #sky-timer-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 100000;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    }
    #svn-modal, #sky-timer-modal {
        background: white; width: 100%; max-width: 550px;
        margin: 20px; padding: 0; border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
    }
    #svn-header, #sky-timer-header {
        background: #f1f5f9; padding: 15px 20px; border-bottom: 1px solid #e2e8f0;
        display: flex; justify-content: space-between; align-items: center;
    }
    #svn-header h3, #sky-timer-header h3 { margin: 0; color: #334155; font-size: 18px; font-weight: 600; }
    #svn-close, #sky-timer-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #64748b; }
    
    #svn-body, #sky-timer-body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    
    .svn-field { display: flex; flex-direction: column; gap: 5px; }
    .svn-field label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    .svn-input { 
        padding: 8px 12px !important; 
        border: 1px solid #cbd5e1 !important; 
        border-radius: 4px !important; 
        font-size: 14px !important; 
        width: 100% !important; 
        box-sizing: border-box !important; 
        transition: border 0.2s !important;
        height: 40px !important;
        line-height: 1.5 !important;
        display: block !important;
        color: #334155 !important;
        background-color: white !important;
    }
    select.svn-input {
        appearance: auto !important;
        -webkit-appearance: auto !important;
    }
    .svn-input:focus { border-color: #3b82f6 !important; outline: none !important; }
    .svn-input[readonly] { background: #f8fafc !important; color: #64748b !important; }

    #svn-footer, #sky-timer-footer {
        padding: 15px 20px !important; border-top: 1px solid #e2e8f0 !important; background: #fff !important;
        display: flex !important; justify-content: flex-end !important; gap: 10px !important; align-items: center !important;
        min-height: 70px !important;
    }
    .btn { 
        padding: 0 20px !important; 
        border-radius: 5px !important; 
        font-size: 13px !important; 
        font-weight: 600 !important; 
        cursor: pointer !important; 
        border: none !important; 
        transition: all 0.2s !important; 
        height: 36px !important;
        line-height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
        box-sizing: border-box !important;
    }
    .btn-cancel { background: #fff; border: 1px solid #cbd5e1; color: #475569; }
    .btn-cancel:hover { background: #f1f5f9; }
    .btn-confirm { background: #22c55e; color: white; box-shadow: 0 2px 5px rgba(34, 197, 94, 0.3); }
    .btn-confirm:hover { background: #16a34a; transform: translateY(-1px); }
    .btn-confirm:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #dc2626; }

    #svn-status, #sky-timer-status { font-size: 13px; color: #64748b; margin-right: auto; }
    .error-msg { color: #ef4444 !important; }
    .success-msg { color: #22c55e !important; }

    /* Timer Widget Styles */
    #sky-timer-widget {
        background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px 15px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    #sky-timer-display {
        font-family: 'Courier New', monospace;
        font-size: 24px;
        font-weight: bold;
        color: #334155;
        min-width: 120px;
        text-align: center;
        background: #fff;
        border: 1px solid #e2e8f0;
        padding: 2px 10px;
        border-radius: 4px;
    }
    .sky-timer-btn {
        width: 36px; height: 36px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex; justify-content: center; align-items: center;
        transition: transform 0.1s;
    }
    .sky-timer-btn:active { transform: scale(0.95); }
    .sky-btn-play { background: #22c55e; color: white; }
    .sky-btn-stop { background: #ef4444; color: white; }
    .sky-blink { animation: sky-blink 1s infinite; }
    @keyframes sky-blink { 50% { opacity: 0.5; } }

    /* Custom Dropdown Styles */
    .sky-custom-select {
        position: relative;
        width: 100%;
    }
    .sky-select-trigger {
        width: 100%; padding: 8px 12px !important;
        border: 1px solid #cbd5e1;
        border-radius: 4px; font-size: 14px;
        color: #334155; box-sizing: border-box;
        background-color: #fff; cursor: pointer;
        display: flex; justify-content: space-between; align-items: center;
        height: 40px;
    }
    .sky-select-trigger::after {
        content: "▼";
        font-size: 10px; color: #64748b;
    }
    .sky-select-trigger.disabled { background-color: #f8fafc; cursor: not-allowed; color: #94a3b8; }
    .sky-dropdown-panel {
        position: absolute; top: 100%; left: 0; right: 0;
        background: #fff; border: 1px solid #cbd5e1;
        border-radius: 4px; margin-top: 4px; z-index: 1000;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        display: none; flex-direction: column;
        height: 350px; min-height: 200px; max-height: 80vh;
        resize: vertical; overflow: hidden;
    }
    .sky-dropdown-panel.open { display: flex; }
    .sky-dropdown-search {
        padding: 10px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .sky-dropdown-search input {
        width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1;
        border-radius: 4px; font-size: 13px; box-sizing: border-box; outline: none;
    }
    .sky-dropdown-search input:focus { border-color: #3b82f6; }
    .sky-dropdown-list {
        overflow-y: auto; flex: 1;
    }
    .sky-dropdown-item {
        padding: 10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer;
    }
    .sky-dropdown-item:hover { background-color: #f8fafc; }
    .sky-dropdown-item.selected { background-color: #eff6ff; }
    .sky-tag-title { font-weight: 600; color: #0f172a; font-size: 14px; display: block;}
    .sky-tag-meta { font-size: 11px; color: #64748b; display: block; margin-top: 4px;}
    .sky-tag-latest-badge {
        background-color: #22c55e; color: #fff; font-size: 10px;
        padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 8px; vertical-align: middle;
    }
    .sky-selected-preview {
        font-size: 12px; color: #16a34a; margin-top: 8px; font-weight: 500; min-height: 18px;
    }

    /* Estilos da Lista (Minha PÃ¡gina) */
    .sky-list-action {
        margin-right: 8px; cursor: pointer; text-decoration: none; border: none; background: none; font-size: 14px;
        vertical-align: middle; display: inline-block; width: 20px; text-align: center;
    }
    .sky-list-timer {
        font-family: monospace; font-weight: bold; color: #166534; background: #dcfce7;
        padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 8px; vertical-align: middle;
    }
    .sky-row-active {
        background-color: #f0fdf4 !important; /* Destaque verde para tarefa ativa */
        border-left: 3px solid #22c55e;
    }
    .sky-copy-list-btn {
        opacity: 0.3; transition: opacity 0.2s; margin-left: 5px; cursor: pointer;
    }
    tr:hover .sky-copy-list-btn { opacity: 1; }

    /* Navegação Desktop (Floating) */
    #sky-nav-controls {
        position: fixed; bottom: 20px; left: 20px; z-index: 99999;
        display: flex; gap: 5px;
        background: #fff; padding: 6px 10px; border-radius: 30px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        border: 1px solid #e2e8f0;
    }
    .sky-nav-btn {
        width: 32px; height: 32px; border-radius: 50%; border: none;
        background: transparent; color: #64748b; font-size: 16px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
    }
    .sky-nav-btn:hover { background: #f1f5f9; color: #0369a1; }
`;

function injetarEstilos() {
    if (document.getElementById('sky-styles')) return;
    const style = document.createElement('style');
    style.id = 'sky-styles';
    style.innerHTML = ESTILOS_SKY;
    document.head.appendChild(style);
}
