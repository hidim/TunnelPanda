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
    // Initialize color theme first
    await this.initializeColorTheme();
    
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

    // Security form
    document.getElementById('save-security-btn')?.addEventListener('click', () => this.saveSecuritySettings());
    document.getElementById('reset-security-btn')?.addEventListener('click', () => this.resetSecuritySettings());

    // Settings form
    document.getElementById('save-all-settings-btn')?.addEventListener('click', () => this.saveAllSettings());
    document.getElementById('reset-all-settings-btn')?.addEventListener('click', () => this.resetAllSettings());
    document.getElementById('export-config-btn')?.addEventListener('click', () => this.exportConfig());
    document.getElementById('import-config-btn')?.addEventListener('click', () => this.importConfig());

    // API testing
    document.getElementById('send-request-btn')?.addEventListener('click', () => this.sendApiRequest());
    document.getElementById('clear-test-btn')?.addEventListener('click', () => this.clearApiTest());

    // Console
    document.getElementById('clear-console-btn')?.addEventListener('click', () => this.clearConsole());
    document.getElementById('clear-server-console-btn')?.addEventListener('click', () => this.clearServerConsole());
    document.getElementById('clear-tunnel-console-btn')?.addEventListener('click', () => this.clearTunnelConsole());

    // Theme controls
    document.getElementById('refresh-theme-btn')?.addEventListener('click', () => this.refreshTheme());

    // Log controls
    document.getElementById('download-logs-btn')?.addEventListener('click', () => this.downloadLogs());
    document.getElementById('upload-logs-btn')?.addEventListener('click', () => this.uploadLogs());
  }

  setupIpcListeners() {
    // Server status updates
    window.electronAPI.onServerStatus((event, data) => {
      this.serverRunning = data.running;
      this.updateServerStatus(data);
      this.addActivity('server', data.message, data.running ? 'success' : 'info');
    });

    window.electronAPI.onServerMessage((event, data) => {
      this.addServerConsoleMessage(JSON.stringify(data), 'info');
    });

    window.electronAPI.onServerError((event, data) => {
      this.addServerConsoleMessage(data, 'error');
      this.addActivity('server', `Error: ${data}`, 'error');
    });

    // Tunnel status updates
    window.electronAPI.onTunnelStatus((event, data) => {
      this.tunnelRunning = data.running;
      this.updateTunnelStatus(data);
      this.addActivity('tunnel', data.message, data.running ? 'success' : 'info');
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    const btn = document.getElementById('refresh-theme-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    try {
      await this.initializeColorTheme();
      btn.innerHTML = '<i class="fas fa-check"></i> Updated!';
    } catch (error) {
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
    }
    
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
      btn.disabled = false;
    }, 2000);
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    const btn = document.getElementById('refresh-theme-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    try {
      await this.initializeColorTheme();
      btn.innerHTML = '<i class="fas fa-check"></i> Updated!';
    } catch (error) {
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
    }
    
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
      btn.disabled = false;
    }, 2000);
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    const btn = document.getElementById('refresh-theme-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    try {
      await this.initializeColorTheme();
      btn.innerHTML = '<i class="fas fa-check"></i> Updated!';
    } catch (error) {
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
    }
    
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
      btn.disabled = false;
    }, 2000);
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
      await this.initializeColorTheme();
      
      // Show success feedback
      button.innerHTML = '<i class="fas fa-check"></i> Theme Updated!';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to refresh theme:', error);
      const button = document.getElementById('refresh-theme-btn');
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
        button.disabled = false;
      }, 2000);
    }
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    try {
      const button = document.getElementById('refresh-theme-btn');
      const originalText = button.innerHTML;
      
      // Show loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      button.disabled = true;
      
      // Re-extract colors
      await this.initializeColorTheme();
      
      // Show success feedback
      button.innerHTML = '<i class="fas fa-check"></i> Theme Updated!';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to refresh theme:', error);
      const button = document.getElementById('refresh-theme-btn');
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
        button.disabled = false;
      }, 2000);
    }
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    try {
      const button = document.getElementById('refresh-theme-btn');
      const originalText = button.innerHTML;
      
      // Show loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      button.disabled = true;
      
      // Re-extract colors
      await this.initializeColorTheme();
      
      // Show success feedback
      button.innerHTML = '<i class="fas fa-check"></i> Theme Updated!';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to refresh theme:', error);
      const button = document.getElementById('refresh-theme-btn');
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
        button.disabled = false;
      }, 2000);
    }
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else {
      this.showSaveStatus('security-save-status', `Error: ${result.error}`, 'error');
    }
  }

  async saveAllSettings() {
    const config = this.getAllFormData();
    const result = await window.electronAPI.saveConfig(config);
    
    if (result.success) {
      this.config = config;
      this.showSaveStatus('settings-save-status', 'All settings saved successfully!', 'success');
      this.addActivity('config', 'All settings updated', 'success');
    } else {
      this.showSaveStatus('settings-save-status', `Error: ${result.error}`, 'error');
    }
  }

  getAllFormData() {
    return {
      port: document.getElementById('server-port')?.value || 16014,
      basicAuthUser: document.getElementById('basic-auth-user')?.value || '',
      basicAuthPass: document.getElementById('basic-auth-pass')?.value || '',
      appToken: document.getElementById('app-token')?.value || '',
      ollamaUrl: document.getElementById('ollama-url')?.value || '',
      ollamaApiKey: document.getElementById('ollama-api-key')?.value || '',
      dbProvider: document.getElementById('db-provider')?.value || '',
      dbUrl: document.getElementById('db-url')?.value || '',
      dbApiKey: document.getElementById('db-api-key')?.value || '',
      dbTenant: document.getElementById('db-tenant')?.value || '',
      dbDatabase: document.getElementById('db-database')?.value || ''
    };
  }

  // UI Updates
  updateServerStatus(data) {
    const indicators = {
      'server-dot': data.running,
      'server-status-text': data.message,
      'server-status-detail': data.message,
      'server-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateTunnelStatus(data) {
    const indicators = {
      'tunnel-dot': data.running,
      'tunnel-status-text': data.message,
      'tunnel-status-detail': data.message,
      'tunnel-process': data.running ? 'Running' : 'Not running'
    };

    Object.entries(indicators).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        if (id.includes('dot')) {
          element.classList.toggle('connected', value);
        } else {
          element.textContent = value;
        }
      }
    });
  }

  updateWebSocketStatus(data) {
    const dot = document.getElementById('websocket-dot');
    if (dot) {
      dot.classList.toggle('connected', data.connected);
    }

    const status = document.getElementById('ws-status');
    if (status) {
      status.textContent = data.connected ? 'Connected' : 'Disconnected';
    }
  }

  updateConnectionInfo() {
    const localUrl = document.getElementById('local-url');
    const tunnelUrl = document.getElementById('tunnel-url');
    
    if (localUrl) {
      localUrl.textContent = `http://localhost:${this.config.port || 16014}`;
    }
    
    // TODO: Extract tunnel URL from config or status
    if (tunnelUrl) {
      tunnelUrl.textContent = 'Configure in cloudflared/config.yml';
    }
  }

  // Activity and Console
  addActivity(type, message, level = 'info') {
    const activity = {
      type,
      message,
      level,
      timestamp: new Date()
    };

    this.activityBuffer.unshift(activity);
    if (this.activityBuffer.length > 100) {
      this.activityBuffer.pop();
    }

    this.updateActivityFeed();
    this.updateActivityMonitor(activity);
  }

  updateActivityFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const recent = this.activityBuffer.slice(0, 5);
    feed.innerHTML = recent.map(activity => `
      <div class="activity-item">
        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
        <span>${activity.message}</span>
        <small class="timestamp">${this.formatTimestamp(activity.timestamp)}</small>
      </div>
    `).join('');
  }

  updateActivityMonitor(activity) {
    const monitor = document.getElementById('activity-monitor');
    if (!monitor) return;

    const line = document.createElement('div');
    line.className = 'activity-item';
    line.innerHTML = `
      <span class="timestamp">[${this.formatTimestamp(activity.timestamp)}]</span>
      <span class="message">${activity.message}</span>
    `;

    monitor.insertBefore(line, monitor.firstChild);

    // Keep only last 50 items
    while (monitor.children.length > 50) {
      monitor.removeChild(monitor.lastChild);
    }

    monitor.scrollTop = 0;
  }

  addServerConsoleMessage(message, type = 'info') {
    const console = document.getElementById('server-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  addTunnelConsoleMessage(message, type = 'info') {
    const console = document.getElementById('tunnel-console');
    if (!console) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    console.appendChild(line);
    console.scrollTop = console.scrollHeight;

    // Keep only last 100 lines
    while (console.children.length > 100) {
      console.removeChild(console.firstChild);
    }
  }

  // Legacy method for backward compatibility
  addConsoleMessage(message, type = 'info') {
    // Route to server console by default
    this.addServerConsoleMessage(message, type);
  }

  clearServerConsole() {
    const console = document.getElementById('server-console');
    if (console) {
      console.innerHTML = '<div class="console-line">TunnelPanda server console cleared.</div>';
    }
  }

  clearTunnelConsole() {
    const console = document.getElementById('tunnel-console');
    if (console) {
      console.innerHTML = '<div class="console-line">Cloudflare tunnel console cleared.</div>';
    }
  }

  clearConsole() {
    // Clear both consoles
    this.clearServerConsole();
    this.clearTunnelConsole();
  }

  // API Testing
  async sendApiRequest() {
    const method = document.getElementById('test-method').value;
    const endpoint = document.getElementById('test-endpoint').value;
    const body = document.getElementById('test-body-input').value;

    if (!endpoint) {
      this.showApiResponse({ error: 'Please enter an endpoint' });
      return;
    }

    try {
      const url = `http://localhost:${this.config.port || 16014}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken,
          'Content-Type': 'application/json'
        }
      };

      if (method !== 'GET' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const data = await response.json();
      
      this.showApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
    } catch (error) {
      this.showApiResponse({ error: error.message });
    }
  }

  showApiResponse(response) {
    const display = document.getElementById('test-response-display');
    if (display) {
      display.innerHTML = `<pre>${JSON.stringify(response, null, 2)}</pre>`;
    }
  }

  clearApiTest() {
    document.getElementById('test-endpoint').value = '';
    document.getElementById('test-body-input').value = '';
    document.getElementById('test-response-display').innerHTML = '<p>No response yet</p>';
  }

  // WebSocket Message Handling
  handleWebSocketMessage(data) {
    if (data.type === 'collection-update') {
      this.updateCollectionStats(data);
    }
    
    const lastMessage = document.getElementById('ws-last-message');
    if (lastMessage) {
      lastMessage.textContent = new Date().toLocaleTimeString();
    }

    this.addActivity('websocket', `Database update: ${data.collection || 'status'}`, 'info');
  }

  updateCollectionStats(data) {
    // Update database statistics
    const totalCollections = document.getElementById('total-collections');
    if (totalCollections && data.totalCollections) {
      totalCollections.textContent = data.totalCollections;
    }

    // Update activity
    if (data.collection) {
      this.addActivity('database', `Collection "${data.collection}" updated (${data.newCount} items)`, 'info');
    }
  }

  // Monitoring Data
  async loadMonitoringData() {
    try {
      // This would typically fetch from the server's rate status endpoint
      const response = await fetch(`http://localhost:${this.config.port || 16014}/_internal/rate-status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateRequestStats(data);
      }
    } catch (error) {
      console.warn('Could not load monitoring data:', error);
    }
  }

  updateRequestStats(data) {
    const totalRequests = Object.values(data.requestsByIP || {}).reduce((sum, count) => sum + count, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-ips').textContent = data.uniqueIPs || 0;
    
    // Update IP analysis
    const ipAnalysis = document.getElementById('ip-analysis');
    if (ipAnalysis && data.requestsByIP) {
      ipAnalysis.innerHTML = Object.entries(data.requestsByIP)
        .map(([ip, count]) => `
          <div class="ip-item">
            <span class="ip">${ip}</span>
            <span class="count">${count} requests</span>
          </div>
        `).join('');
    }
  }

  // Database Management
  async loadDatabaseData() {
    try {
      const response = await fetch(`http://localhost:${this.config.port || 16014}/db/status`, {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.basicAuthUser}:${this.config.basicAuthPass}`)}`,
          'X-APP-TOKEN': this.config.appToken
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateDatabaseStatus(data);
      }
    } catch (error) {
      console.warn('Could not load database data:', error);
    }
  }

  updateDatabaseStatus(data) {
    // Update connection status
    const statusDot = document.querySelector('#db-status .status-dot');
    if (statusDot) {
      statusDot.classList.toggle('connected', data.connected);
    }

    // Update database info
    document.getElementById('current-db-provider').textContent = data.database?.provider || 'Not configured';
    document.getElementById('current-db-url').textContent = data.database?.url || 'Not configured';
    document.getElementById('current-db-tenant').textContent = data.database?.tenant || 'Not configured';
    document.getElementById('current-db-database').textContent = data.database?.database || 'Not configured';

    // Update collections
    if (data.collections) {
      this.updateCollectionsList(data.collections);
      document.getElementById('total-collections').textContent = data.collections.total || 0;
    }
  }

  updateCollectionsList(collections) {
    const list = document.getElementById('collections-list');
    if (!list) return;

    if (!collections.list || collections.list.length === 0) {
      list.innerHTML = '<p>No collections available</p>';
      return;
    }

    list.innerHTML = collections.list.map(col => {
      const name = typeof col === 'string' ? col : col.name;
      const details = collections.details?.[name];
      return `
        <div class="collection-item">
          <div class="collection-info">
            <h4>${name}</h4>
            <p>Runtime operations: ${details?.runtimeCount || 0}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logs
  async loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      this.displayLogs(logs);
    } catch (error) {
      console.warn('Could not load logs:', error);
    }
  }

  displayLogs(logs) {
    const viewer = document.getElementById('log-viewer');
    const files = document.getElementById('log-files');
    
    if (!viewer || !files) return;

    // Update file list
    files.innerHTML = logs.map(log => `
      <div class="log-file-item">
        <span class="filename">${log.file}</span>
        <button class="btn btn-sm" onclick="app.selectLogFile('${log.file}')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `).join('');

    // Show latest log by default
    if (logs.length > 0) {
      this.displayLogContent(logs[0].content);
    }
  }

  displayLogContent(content) {
    const viewer = document.getElementById('log-viewer');
    if (!viewer) return;

    const lines = content.split('\n').slice(-100); // Show last 100 lines
    viewer.innerHTML = lines.map(line => {
      try {
        const logEntry = JSON.parse(line);
        return `
          <div class="log-line">
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-level ${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message || JSON.stringify(logEntry)}</span>
          </div>
        `;
      } catch {
        return `
          <div class="log-line">
            <span class="log-message">${line}</span>
          </div>
        `;
      }
    }).join('');

    viewer.scrollTop = viewer.scrollHeight;
  }

  // Auto Refresh
  startAutoRefresh() {
    this.refreshInterval = setInterval(async () => {
      if (document.getElementById('auto-refresh')?.checked) {
        const status = await window.electronAPI.getStatus();
        this.serverRunning = status.server;
        this.tunnelRunning = status.tunnel;
        this.wsConnected = status.websocket;
        
        if (this.activeTab === 'monitoring') {
          await this.loadMonitoringData();
        } else if (this.activeTab === 'database') {
          await this.loadDatabaseData();
        }
      }
    }, (document.getElementById('refresh-interval')?.value || 30) * 1000);
  }

  // Utility functions
  updateUI() {
    this.updateDashboard();
  }

  async updateDashboard() {
    const status = await window.electronAPI.getStatus();
    this.serverRunning = status.server;
    this.tunnelRunning = status.tunnel;
    this.wsConnected = status.websocket;
    
    this.updateServerStatus({ running: status.server, message: status.server ? 'Running' : 'Stopped' });
    this.updateTunnelStatus({ running: status.tunnel, message: status.tunnel ? 'Running' : 'Stopped' });
    this.updateWebSocketStatus({ connected: status.websocket });
  }

  getActivityIcon(type) {
    const icons = {
      server: 'server',
      tunnel: 'cloud',
      websocket: 'plug',
      database: 'database',
      config: 'cog',
      error: 'exclamation-triangle'
    };
    return icons[type] || 'info-circle';
  }

  formatTimestamp(date) {
    return date.toLocaleTimeString();
  }

  showSaveStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `save-status ${type}`;
      setTimeout(() => {
        element.textContent = '';
        element.className = 'save-status';
      }, 3000);
    }
  }

  changeTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }

  async initializeColorTheme() {
    try {
      const colorData = await window.electronAPI.extractColors();
      this.applyColorTheme(colorData);
    } catch (error) {
      console.error('Failed to initialize color theme:', error);
    }
  }

  applyColorTheme(colorData) {
    if (!colorData?.css) return;
    
    const existingStyle = document.getElementById('dynamic-color-theme');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'dynamic-color-theme';
    style.textContent = colorData.css;
    document.head.appendChild(style);

    this.colorTheme = colorData.colors;
    document.body.classList.add('themed');
  }

  async refreshTheme() {
    try {
      const button = document.getElementById('refresh-theme-btn');
      const originalText = button.innerHTML;
      
      // Show loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      button.disabled = true;
      
      // Re-extract colors
      await this.initializeColorTheme();
      
      // Show success feedback
      button.innerHTML = '<i class="fas fa-check"></i> Theme Updated!';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to refresh theme:', error);
      const button = document.getElementById('refresh-theme-btn');
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
      setTimeout(() => {
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Theme from Icon';
        button.disabled = false;
      }, 2000);
    }
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
      case 'monitoring':
        await this.loadMonitoringData();
        break;
      case 'database':
        await this.loadDatabaseData();
        break;
      case 'logs':
        await this.loadLogs();
        break;
      case 'settings':
        await this.loadAllSettings();
        break;
    }
  }

  // Server Management
  async startServer() {
    await window.electronAPI.startServer();
    this.addServerConsoleMessage('Starting TunnelPanda server...', 'info');
  }

  async stopServer() {
    await window.electronAPI.stopServer();
    this.addServerConsoleMessage('Stopping TunnelPanda server...', 'warning');
  }

  async restartServer() {
    await window.electronAPI.restartServer();
    this.addServerConsoleMessage('Restarting TunnelPanda server...', 'warning');
  }

  async startTunnel() {
    await window.electronAPI.startTunnel();
    this.addTunnelConsoleMessage('Starting Cloudflare tunnel...', 'info');
  }

  async stopTunnel() {
    await window.electronAPI.stopTunnel();
    this.addTunnelConsoleMessage('Stopping Cloudflare tunnel...', 'warning');
  }

  async restartTunnel() {
    await window.electronAPI.restartTunnel();
    this.addTunnelConsoleMessage('Restarting Cloudflare tunnel...', 'warning');
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

  // Configuration Management
  async loadConfig() {
    this.config = await window.electronAPI.getConfig();
    this.populateConfigForms();
  }

  populateConfigForms() {
    // Security settings
    if (document.getElementById('basic-auth-user')) {
      document.getElementById('basic-auth-user').value = this.config.basicAuthUser || '';
      document.getElementById('basic-auth-pass').value = this.config.basicAuthPass || '';
      document.getElementById('app-token').value = this.config.appToken || '';
    }

    // Server settings
    if (document.getElementById('server-port')) {
      document.getElementById('server-port').value = this.config.port || 16014;
      document.getElementById('ollama-url').value = this.config.ollamaUrl || '';
      document.getElementById('ollama-api-key').value = this.config.ollamaApiKey || '';
    }

    // Database settings
    if (document.getElementById('db-provider')) {
      document.getElementById('db-provider').value = this.config.dbProvider || '';
      document.getElementById('db-url').value = this.config.dbUrl || '';
      document.getElementById('db-api-key').value = this.config.dbApiKey || '';
      document.getElementById('db-tenant').value = this.config.dbTenant || '';
      document.getElementById('db-database').value = this.config.dbDatabase || '';
    }

    // Update connection info
    this.updateConnectionInfo();
  }

  async saveSecuritySettings() {
    const formData = new FormData(document.getElementById('auth-form'));
    const securityConfig = Object.fromEntries(formData);
    
    const updatedConfig = { ...this.config, ...securityConfig };
    const result = await window.electronAPI.saveConfig(updatedConfig);
    
    if (result.success) {
      this.config = updatedConfig;
      this.showSaveStatus('security-save-status', 'Security settings saved successfully!', 'success');
      this.addActivity('config', 'Security settings updated', 'success');
    } else