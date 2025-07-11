// ui/app.js - TunnelPanda Control Center JavaScript
class TunnelPandaUI {
  constructor() {
    this.activeTab = 'dashboard';
    this.config = {};
    this.serverRunning = false;
    this.tunnelRunning = false;
    this.wsConnected = false;
    this.refreshInterval = null;
    this.activityBuffer = [];

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupIpcListeners();
    await this.loadConfig();
    this.updateUI();
    this.startAutoRefresh();
    this.showTab('dashboard');
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.showTab(tab);
      });
    });

    // Server controls
    document.getElementById('start-server-btn')?.addEventListener('click', () => this.startServer());
    document.getElementById('stop-server-btn')?.addEventListener('click', () => this.stopServer());
    document.getElementById('restart-server-btn')?.addEventListener('click', () => this.restartServer());

    document.getElementById('start-tunnel-btn')?.addEventListener('click', () => this.startTunnel());
    document.getElementById('stop-tunnel-btn')?.addEventListener('click', () => this.stopTunnel());
    document.getElementById('restart-tunnel-btn')?.addEventListener('click', () => this.restartTunnel());

    // Quick actions
    document.getElementById('start-all-btn')?.addEventListener('click', () => this.startAll());
    document.getElementById('stop-all-btn')?.addEventListener('click', () => this.stopAll());
    document.getElementById('restart-all-btn')?.addEventListener('click', () => this.restartAll());

    // Console clear buttons
    document.getElementById('clear-server-console-btn')?.addEventListener('click', () => this.clearServerConsole());
    document.getElementById('clear-tunnel-console-btn')?.addEventListener('click', () => this.clearTunnelConsole());

    // Security form
    document.getElementById('save-security-btn')?.addEventListener('click', () => this.saveSecuritySettings());
    document.getElementById('reset-security-btn')?.addEventListener('click', () => this.resetSecuritySettings());

    // Endpoint form
    document.getElementById('save-endpoint-btn')?.addEventListener('click', () => this.saveEndpointSettings());
    document.getElementById('reset-endpoint-btn')?.addEventListener('click', () => this.resetEndpointSettings());

    // Settings form
    document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-settings-btn')?.addEventListener('click', () => this.resetSettings());

    // Log actions
    document.getElementById('refresh-logs-btn')?.addEventListener('click', () => this.loadLogs());
    document.getElementById('clear-logs-btn')?.addEventListener('click', () => this.clearLogs());
    document.getElementById('export-logs-btn')?.addEventListener('click', () => this.exportLogs());

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => this.updateUI());
  }

  setupIpcListeners() {
    // Server status updates
    window.electronAPI.onServerStatus((event, data) => {
      this.serverRunning = data.running;
      this.updateServerStatus(data);
      this.addActivity('server', data.message, data.running ? 'success' : 'warning');
    });

    window.electronAPI.onServerMessage((event, data) => {
      this.addServerConsoleMessage(data, 'info');
    });

    window.electronAPI.onServerError((event, data) => {
      this.addServerConsoleMessage(data, 'error');
      this.addActivity('server', `Error: ${data}`, 'error');
    });

    // Tunnel status updates
    window.electronAPI.onTunnelStatus((event, data) => {
      this.tunnelRunning = data.running;
      this.updateTunnelStatus(data);
      this.addActivity('tunnel', data.message, data.running ? 'success' : 'warning');
    });

    window.electronAPI.onTunnelOutput((event, data) => {
      this.addTunnelConsoleMessage(data, 'info');
    });

    window.electronAPI.onTunnelError((event, data) => {
      this.addTunnelConsoleMessage(data, 'error');
      this.addActivity('tunnel', `Error: ${data}`, 'error');
    });

    // WebSocket updates
    window.electronAPI.onWebSocketStatus((event, data) => {
      this.wsConnected = data.connected;
      this.updateWebSocketStatus(data);
      this.addActivity('websocket', data.connected ? 'Connected to monitoring' : 'Disconnected from monitoring', data.connected ? 'success' : 'warning');
    });

    window.electronAPI.onWebSocketMessage((event, data) => {
      this.handleWebSocketMessage(data);
    });

    window.electronAPI.onWebSocketError((event, data) => {
      this.addActivity('websocket', `WebSocket error: ${data}`, 'error');
    });
  }

  // Server control methods
  async startServer() {
    try {
      await window.electronAPI.startServer();
      this.addActivity('server', 'Starting server...', 'info');
    } catch (error) {
      this.addActivity('server', `Failed to start server: ${error}`, 'error');
    }
  }

  async stopServer() {
    try {
      await window.electronAPI.stopServer();
      this.addActivity('server', 'Stopping server...', 'info');
    } catch (error) {
      this.addActivity('server', `Failed to stop server: ${error}`, 'error');
    }
  }

  async restartServer() {
    try {
      await window.electronAPI.restartServer();
      this.addActivity('server', 'Restarting server...', 'info');
    } catch (error) {
      this.addActivity('server', `Failed to restart server: ${error}`, 'error');
    }
  }

  async startTunnel() {
    try {
      await window.electronAPI.startTunnel();
      this.addActivity('tunnel', 'Starting tunnel...', 'info');
    } catch (error) {
      this.addActivity('tunnel', `Failed to start tunnel: ${error}`, 'error');
    }
  }

  async stopTunnel() {
    try {
      await window.electronAPI.stopTunnel();
      this.addActivity('tunnel', 'Stopping tunnel...', 'info');
    } catch (error) {
      this.addActivity('tunnel', `Failed to stop tunnel: ${error}`, 'error');
    }
  }

  async restartTunnel() {
    try {
      await window.electronAPI.restartTunnel();
      this.addActivity('tunnel', 'Restarting tunnel...', 'info');
    } catch (error) {
      this.addActivity('tunnel', `Failed to restart tunnel: ${error}`, 'error');
    }
  }

  async startAll() {
    await this.startServer();
    setTimeout(() => this.startTunnel(), 2000);
  }

  async stopAll() {
    await this.stopTunnel();
    await this.stopServer();
  }

  async restartAll() {
    await this.stopAll();
    setTimeout(() => this.startAll(), 3000);
  }

  // UI Navigation
  showTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName)?.classList.add('active');

    this.activeTab = tabName;

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadTabData(tabName) {
    switch (tabName) {
      case 'dashboard':
        await this.updateDashboard();
        break;
      case 'security':
        await this.loadSecuritySettings();
        break;
      case 'endpoints':
        await this.loadEndpointSettings();
        break;
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseInfo();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadSettings();
        break;
    }
  }

  // Configuration
  async loadConfig() {
    try {
      this.config = await window.electronAPI.getConfig();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = {};
    }
  }

  async updateUI() {
    await this.loadConfig();
    this.updateStatusIndicators();
    this.updateDashboard();
  }

  updateStatusIndicators() {
    const serverDot = document.getElementById('server-dot');
    const tunnelDot = document.getElementById('tunnel-dot');
    const websocketDot = document.getElementById('websocket-dot');

    if (serverDot) {
      serverDot.className = `status-dot ${this.serverRunning ? 'success' : 'error'}`;
    }

    if (tunnelDot) {
      tunnelDot.className = `status-dot ${this.tunnelRunning ? 'success' : 'error'}`;
    }

    if (websocketDot) {
      websocketDot.className = `status-dot ${this.wsConnected ? 'success' : 'warning'}`;
    }
  }

  // Activity Feed
  addActivity(type, message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const activity = { timestamp, type, message, level };
    
    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer = this.activityBuffer.slice(0, 100);
    }

    this.updateActivityFeed();
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    feed.innerHTML = this.activityBuffer.map(activity => `
      <div class="activity-item ${activity.level}">
        <span class="activity-time">${activity.timestamp}</span>
        <span class="activity-type">[${activity.type.toUpperCase()}]</span>
        <span class="activity-message">${activity.message}</span>
      </div>
    `).join('');
  }

  // Console Methods
  addServerConsoleMessage(message, type = 'info') {
    this.addConsoleMessage('server-console', message, type);
  }

  addTunnelConsoleMessage(message, type = 'info') {
    this.addConsoleMessage('tunnel-console', message, type);
  }

  addConsoleMessage(consoleId, message, type = 'info') {
    const console = document.getElementById(consoleId);
    if (!console) return;

    const timestamp = new Date().toLocaleTimeString();
    const messageDiv = document.createElement('div');
    messageDiv.className = `console-message ${type}`;
    messageDiv.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    console.appendChild(messageDiv);
    console.scrollTop = console.scrollHeight;

    // Keep only last 500 messages
    while (console.children.length > 500) {
      console.removeChild(console.firstChild);
    }
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '';
    }
  }

  // Auto-refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.updateUI();
    }, 30000); // Refresh every 30 seconds
  }

  // Status update methods
  updateServerStatus(data) {
    const statusElement = document.getElementById('server-status-text');
    if (statusElement) statusElement.textContent = data.message;
    const detail = document.getElementById('server-status-detail');
    if (detail) detail.textContent = data.message;
    const proc = document.getElementById('server-process');
    if (proc) proc.textContent = data.pid ? `PID ${data.pid}` : (data.running ? 'Running' : 'Not running');
  }

  updateTunnelStatus(data) {
    const statusElement = document.getElementById('tunnel-status-text');
    if (statusElement) statusElement.textContent = data.message;
    const detail = document.getElementById('tunnel-status-detail');
    if (detail) detail.textContent = data.message;
    const proc = document.getElementById('tunnel-process');
    if (proc) proc.textContent = data.pid ? `PID ${data.pid}` : (data.running ? 'Running' : 'Not running');
  }

  updateWebSocketStatus(data) {
    const statusElement = document.getElementById('websocket-status-text');
    if (statusElement) statusElement.textContent = data.connected ? 'Connected' : 'Disconnected';
    const dot = document.getElementById('websocket-dot');
    if (dot) dot.className = `status-dot ${data.connected ? 'success' : 'warning'}`;
  }

  handleWebSocketMessage(data) {
    // Handle WebSocket messages for real-time updates
    console.log('WebSocket message:', data);
  }

  // Placeholder methods for future implementation
  async updateDashboard() {
    this.updateStatusIndicators();
    const localEl = document.getElementById('local-url');
    if (localEl) localEl.textContent = `http://localhost:${this.config.port || 16014}`;
    const tunnelEl = document.getElementById('tunnel-url');
    if (tunnelEl) tunnelEl.textContent = this.config.tunnelHostname ? `https://${this.config.tunnelHostname}` : 'Not configured';
    await this.refreshStats();
  }

  async loadSecuritySettings() {
    const form = document.getElementById('auth-form');
    if (!form) return;
    form.basicAuthUser.value = this.config.basicAuthUser || '';
    form.basicAuthPass.value = this.config.basicAuthPass || '';
    form.appToken.value = this.config.appToken || '';
    await this.refreshClientIPs();
  }

  async saveSecuritySettings() {
    const form = document.getElementById('auth-form');
    if (!form) return;
    const cfg = {
      ...this.config,
      basicAuthUser: form.basicAuthUser.value.trim(),
      basicAuthPass: form.basicAuthPass.value,
      appToken: form.appToken.value
    };
    const res = await window.electronAPI.saveConfig(cfg);
    if (res.success) {
      this.config = cfg;
      this.addActivity('security', 'Security settings saved', 'success');
    } else {
      this.addActivity('security', `Failed to save: ${res.error}`, 'error');
    }
  }

  async resetSecuritySettings() {
    await this.loadConfig();
    await this.loadSecuritySettings();
    this.addActivity('security', 'Security settings reset', 'info');
  }

  async refreshClientIPs() {
    try {
      const res = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`),
          'X-APP-TOKEN': this.config.appToken || ''
        }
      });
      const data = await res.json();
      const container = document.getElementById('client-ips');
      if (container) {
        const entries = Object.entries(data.requestsByIP || {});
        container.innerHTML = entries.length
          ? entries.map(([ip,count]) => `<div>${ip} - ${count}</div>`).join('')
          : '<p>No recent connections</p>';
      }
    } catch (err) {
      console.error('Failed to refresh IPs', err);
    }
  }

  async loadEndpointSettings() {
    // no-op for now
  }

  async saveEndpointSettings() {
    // no-op
  }

  async resetEndpointSettings() {
    // no-op
  }

  async testEndpoint(path, method = 'GET', body = null) {
    const url = `http://localhost:${this.config.port || 16014}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`),
          'X-APP-TOKEN': this.config.appToken || ''
        },
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      const display = document.getElementById('test-response-display');
      if (display) display.textContent = text;
      this.addActivity('endpoint', `${method} ${path} -> ${res.status}`, res.ok ? 'success' : 'error');
    } catch (err) {
      this.addActivity('endpoint', `${method} ${path} failed`, 'error');
    }
  }

  async loadMonitoringData() {
    await this.refreshStats();
  }

  async refreshStats() {
    try {
      const res = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`),
          'X-APP-TOKEN': this.config.appToken || ''
        }
      });
      const data = await res.json();
      document.getElementById('total-requests').textContent = Object.values(data.requestsByIP).reduce((a,b)=>a+b,0);
      document.getElementById('unique-ips').textContent = data.uniqueIPs;
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }

  connectWebSocket() {
    window.electronAPI.connectWebSocket();
  }

  disconnectWebSocket() {
    window.electronAPI.disconnectWebSocket();
  }

  async loadDatabaseInfo() {
    try {
      const res = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`),
          'X-APP-TOKEN': this.config.appToken || ''
        }
      });
      const data = await res.json();
      document.getElementById('current-db-provider').textContent = data.database.provider;
      document.getElementById('current-db-url').textContent = data.database.url;
      document.getElementById('current-db-tenant').textContent = data.database.tenant;
      document.getElementById('current-db-database').textContent = data.database.database;
      document.getElementById('total-collections').textContent = data.collections.total;
      const list = document.getElementById('collections-list');
      if (list) list.innerHTML = data.collections.list.map(c => `<div>${typeof c==='string'?c:c.name}</div>`).join('');
    } catch (e) {
      console.error('Failed to load database info', e);
    }
  }

  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      const filesDiv = document.getElementById('log-files');
      const viewer = document.getElementById('log-viewer');
      if (filesDiv) filesDiv.innerHTML = logs.map(l => `<div>${l.file}</div>`).join('');
      if (viewer) viewer.textContent = logs.map(l => `\n--- ${l.file} ---\n${l.content}`).join('\n');
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  }

  async clearLogs() {
    const viewer = document.getElementById('log-viewer');
    if (viewer) viewer.textContent = '';
  }

  async exportLogs() {
    const logs = await window.electronAPI.getLogs();
    const { canceled, filePath } = await window.electronAPI.showSaveDialog({
      title: 'Export Logs',
      defaultPath: 'tunnelpanda-logs.txt'
    });
    if (!canceled && filePath) {
      const blob = new Blob([logs.map(l => `\n--- ${l.file} ---\n${l.content}`).join('\n')], { type: 'text/plain' });
      const arrayBuffer = await blob.arrayBuffer();
      await window.electronAPI.saveFile(filePath, Buffer.from(arrayBuffer));
    }
  }

  async loadSettings() {
    const serverForm = document.getElementById('server-settings-form');
    const ollamaForm = document.getElementById('ollama-settings-form');
    if (serverForm) {
      serverForm.port.value = this.config.port || 16014;
      serverForm.requestLimit.value = this.config.requestLimit || '10mb';
      serverForm.payloadThreshold.value = this.config.largePayloadThreshold || 50000;
    }
    if (ollamaForm) {
      ollamaForm.ollamaUrl.value = this.config.ollamaUrl || '';
      ollamaForm.ollamaApiKey.value = this.config.ollamaApiKey || '';
    }
  }

  async saveSettings() {
    const serverForm = document.getElementById('server-settings-form');
    const ollamaForm = document.getElementById('ollama-settings-form');
    const cfg = {
      ...this.config,
      port: parseInt(serverForm.port.value,10),
      requestLimit: serverForm.requestLimit.value,
      largePayloadThreshold: parseInt(serverForm.payloadThreshold.value,10),
      ollamaUrl: ollamaForm.ollamaUrl.value,
      ollamaApiKey: ollamaForm.ollamaApiKey.value
    };
    const res = await window.electronAPI.saveConfig(cfg);
    if (res.success) {
      this.config = cfg;
      this.addActivity('settings', 'Settings saved', 'success');
    } else {
      this.addActivity('settings', `Failed to save: ${res.error}`, 'error');
    }
  }

  async resetSettings() {
    await this.loadConfig();
    await this.loadSettings();
    this.addActivity('settings', 'Settings reset', 'info');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.tunnelPandaUI = new TunnelPandaUI();
});

// Simple utility for copy buttons in the UI
window.copyToClipboard = (id) => {
  const el = document.getElementById(id);
  if (el) {
    const text = el.textContent || el.value || '';
    navigator.clipboard.writeText(text).catch((err) => console.error('Copy failed', err));
  }
};

window.togglePassword = (id) => {
  const input = document.getElementById(id);
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
};

window.generateToken = (id) => {
  const input = document.getElementById(id);
  if (input) input.value = crypto.randomUUID().replace(/-/g, '');
};

window.refreshClientIPs = () => window.tunnelPandaUI.refreshClientIPs();
window.testEndpoint = (path, method) => window.tunnelPandaUI.testEndpoint(path, method);
window.connectWebSocket = () => window.tunnelPandaUI.connectWebSocket();
window.disconnectWebSocket = () => window.tunnelPandaUI.disconnectWebSocket();
window.refreshLogs = () => window.tunnelPandaUI.loadLogs();
