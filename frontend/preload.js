const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Authentication
  handleAuthRedirect: (url) => ipcRenderer.invoke('handle-auth-redirect', url),

  // Platform info
  platform: process.platform,

  // Events
  onAuthCallback: (callback) => {
    ipcRenderer.on('oauth-callback', callback);
  },

  removeAuthCallback: (callback) => {
    ipcRenderer.removeListener('oauth-callback', callback);
  }
});