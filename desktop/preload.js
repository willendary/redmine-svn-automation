const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('skyElectron', {
    fetchRedmine: (url, options) => ipcRenderer.invoke('redmine-api', { url, options })
});
