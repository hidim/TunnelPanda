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
    if (statusElement) {
      statusElement.textContent = data.message;
    }
  }

  updateTunnelStatus(data) {
    const statusElement = document.getElementById('tunnel-status-text');
    if (statusElement) {
      statusElement.textContent = data.message;
    }
  }

  updateWebSocketStatus(data) {
    const statusElement = document.getElementById('websocket-status-text');
    if (statusElement) {
      statusElement.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  handleWebSocketMessage(data) {
    // Handle WebSocket messages for real-time updates
    console.log('WebSocket message:', data);
  }

  // Placeholder methods for future implementation
  async updateDashboard() {
    // Dashboard update logic
    this.updateStatusIndicators();
  }

  async loadSecuritySettings() {
    // Security settings logic
    const config = this.config;
    const form = document.getElementById('security-form');
    if (form && config) {
      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        if (config[input.name]) {
          input.value = config[input.name];
        }
      });
    }
  }

  async saveSecuritySettings() {
    // Save security logic
    console.log('Saving security settings...');
  }

  async resetSecuritySettings() {
    // Reset security logic
    console.log('Resetting security settings...');
  }

  async loadEndpointSettings() {
    // Endpoint settings logic
    console.log('Loading endpoint settings...');
  }

  async saveEndpointSettings() {
    // Save endpoint logic
    console.log('Saving endpoint settings...');
  }

  async resetEndpointSettings() {
    // Reset endpoint logic
    console.log('Resetting endpoint settings...');
  }

  async loadMonitoringData() {
    // Monitoring data logic
    console.log('Loading monitoring data...');
  }

  async loadDatabaseInfo() {
    // Database info logic
    console.log('Loading database info...');
  }

  async loadLogs() {
    // Load logs logic
    console.log('Loading logs...');
  }

  async clearLogs() {
    // Clear logs logic
    console.log('Clearing logs...');
  }

  async exportLogs() {
    // Export logs logic
    console.log('Exporting logs...');
  }

  async loadSettings() {
    // Load settings logic
    console.log('Loading settings...');
  }

  async saveSettings() {
    // Save settings logic
    console.log('Saving settings...');
  }

  async resetSettings() {
    // Reset settings logic
    console.log('Resetting settings...');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.tunnelPandaUI = new TunnelPandaUI();
});
