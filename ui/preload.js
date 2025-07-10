// ui/preload.js
// Preload script for TunnelPanda Electron app
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Server control
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  restartServer: () => ipcRenderer.invoke('restart-server'),

  // Tunnel control
  startTunnel: () => ipcRenderer.invoke('start-tunnel'),
  stopTunnel: () => ipcRenderer.invoke('stop-tunnel'),
  restartTunnel: () => ipcRenderer.invoke('restart-tunnel'),

  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // Monitoring
  getLogs: () => ipcRenderer.invoke('get-logs'),
  getStatus: () => ipcRenderer.invoke('get-status'),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Event listeners
  onServerStatus: (callback) => ipcRenderer.on('server-status', callback),
  onServerMessage: (callback) => ipcRenderer.on('server-message', callback),
  onServerError: (callback) => ipcRenderer.on('server-error', callback),
  onTunnelStatus: (callback) => ipcRenderer.on('tunnel-status', callback),
  onTunnelOutput: (callback) => ipcRenderer.on('tunnel-output', callback),
  onTunnelError: (callback) => ipcRenderer.on('tunnel-error', callback),
  onWebSocketStatus: (callback) => ipcRenderer.on('websocket-status', callback),
  onWebSocketMessage: (callback) => ipcRenderer.on('websocket-message', callback),
  onWebSocketError: (callback) => ipcRenderer.on('websocket-error', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
