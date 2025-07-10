// ui/app.js - TunnelPanda Control Center (Simplified)
class TunnelPandaUI {
  constructor() {
    this.activeTab = 'dashboard';
    this.config = {};
    this.serverRunning = false;
    this.tunnelRunning = false;
    this.wsConnected = false;
    this.refreshInterval = null;
    this.activityBuffer = [];

    // Initialize modules
    this.themeManager = new ThemeManager();
    this.serverControl = new ServerControl(this);

    this.init();
  }

  async init() {
    // Initialize theme
    await this.themeManager.init();
    
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

    // Server controls - delegate to serverControl module
    document.getElementById('start-server-btn')?.addEventListener('click', () => this.serverControl.startServer());
    document.getElementById('stop-server-btn')?.addEventListener('click', () => this.serverControl.stopServer());
    document.getElementById('restart-server-btn')?.addEventListener('click', () => this.serverControl.restartServer());

    document.getElementById('start-tunnel-btn')?.addEventListener('click', () => this.serverControl.startTunnel());
    document.getElementById('stop-tunnel-btn')?.addEventListener('click', () => this.serverControl.stopTunnel());
    document.getElementById('restart-tunnel-btn')?.addEventListener('click', () => this.serverControl.restartTunnel());

    // Quick actions
    document.getElementById('start-all-btn')?.addEventListener('click', () => this.serverControl.startAll());
    document.getElementById('stop-all-btn')?.addEventListener('click', () => this.serverControl.stopAll());
    document.getElementById('restart-all-btn')?.addEventListener('click', () => this.serverControl.restartAll());

    // Console clear buttons
    document.getElementById('clear-server-console')?.addEventListener('click', () => this.serverControl.clearServerConsole());
    document.getElementById('clear-tunnel-console')?.addEventListener('click', () => this.serverControl.clearTunnelConsole());

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
    const serverStatus = document.getElementById('server-status');
    const tunnelStatus = document.getElementById('tunnel-status');
    const wsStatus = document.getElementById('ws-status');

    if (serverStatus) {
      serverStatus.textContent = this.serverRunning ? 'Server: Running' : 'Server: Stopped';
      serverStatus.className = `status-item ${this.serverRunning ? 'success' : 'error'}`;
    }

    if (tunnelStatus) {
      tunnelStatus.textContent = this.tunnelRunning ? 'Tunnel: Connected' : 'Tunnel: Disconnected';
      tunnelStatus.className = `status-item ${this.tunnelRunning ? 'success' : 'error'}`;
    }

    if (wsStatus) {
      wsStatus.textContent = this.wsConnected ? 'Monitor: Connected' : 'Monitor: Disconnected';
      wsStatus.className = `status-item ${this.wsConnected ? 'success' : 'warning'}`;
    }
  }

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

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.updateUI();
    }, 30000); // Refresh every 30 seconds
  }

  // Simplified placeholder methods - implement as needed
  async updateDashboard() { /* Dashboard update logic */ }
  async loadSecuritySettings() { /* Security settings logic */ }
  async saveSecuritySettings() { /* Save security logic */ }
  async resetSecuritySettings() { /* Reset security logic */ }
  async loadEndpointSettings() { /* Endpoint settings logic */ }
  async saveEndpointSettings() { /* Save endpoint logic */ }
  async resetEndpointSettings() { /* Reset endpoint logic */ }
  async loadMonitoringData() { /* Monitoring data logic */ }
  async loadDatabaseInfo() { /* Database info logic */ }
  async loadLogs() { /* Load logs logic */ }
  async clearLogs() { /* Clear logs logic */ }
  async exportLogs() { /* Export logs logic */ }
  async loadSettings() { /* Load settings logic */ }
  async saveSettings() { /* Save settings logic */ }
  async resetSettings() { /* Reset settings logic */ }
  updateServerStatus(data) { /* Server status update logic */ }
  updateTunnelStatus(data) { /* Tunnel status update logic */ }
  updateWebSocketStatus(data) { /* WebSocket status update logic */ }
  handleWebSocketMessage(data) { /* WebSocket message handling */ }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.tunnelPandaUI = new TunnelPandaUI();
});
