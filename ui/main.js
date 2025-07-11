// ui/main.js
// Main Electron process for TunnelPanda UI
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn, fork } = require('child_process');
const fs = require('fs');
const WebSocket = require('ws');

// Development mode check
const isDev = process.argv.includes('--dev');

class TunnelPandaApp {
  constructor() {
    this.mainWindow = null;
    this.tunnelPandaProcess = null;
    this.cloudflaredProcess = null;
    this.wsConnection = null;
    this.statusWsConnection = null;
    this.isServerRunning = false;
    this.isTunnelRunning = false;
  }

  createWindow() {
    // Create the browser window
    const iconPath = path.join(__dirname, 'assets', 'app.png');
    const fallbackIconPath = path.join(__dirname, 'assets', 'icon.png');
    
    // Use app.png if it exists, otherwise fallback to icon.png
    let windowIcon;
    try {
      if (fs.existsSync(iconPath)) {
        windowIcon = iconPath;
      } else if (fs.existsSync(fallbackIconPath)) {
        windowIcon = fallbackIconPath;
      }
    } catch (error) {
      console.warn('Icon file check failed:', error);
    }

    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      icon: windowIcon,
      title: 'TunnelPanda Control Center'
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open DevTools in development
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.cleanup();
    });

    // Set up application menu
    this.createMenu();
  }

  createMenu() {
    const template = [
      {
        label: 'TunnelPanda',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Server',
        submenu: [
          {
            label: 'Start Server',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.startServer()
          },
          {
            label: 'Stop Server',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.stopServer()
          },
          { type: 'separator' },
          {
            label: 'Start Tunnel',
            accelerator: 'CmdOrCtrl+T',
            click: () => this.startTunnel()
          },
          {
            label: 'Stop Tunnel',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => this.stopTunnel()
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click: () => shell.openExternal('https://github.com/hidim/tunnelpanda')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // Server management methods
  startServer() {
    if (this.isServerRunning) {
      this.sendToRenderer('server-status', { running: true, message: 'Server is already running' });
      return;
    }

    console.log('Starting TunnelPanda server...');
    
    const appPath = path.join(__dirname, '..', 'src', 'app.js');
    console.log('Server path:', appPath);
    
    // Check if the app.js file exists
    if (!fs.existsSync(appPath)) {
      const error = `Server file not found: ${appPath}`;
      console.error(error);
      this.sendToRenderer('server-error', error);
      return;
    }

    try {
      this.tunnelPandaProcess = fork(appPath, [], {
        cwd: path.join(__dirname, '..'),
        silent: true,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });

      this.tunnelPandaProcess.on('message', (message) => {
        console.log('Server message:', message);
        if (message.type === 'log') {
          const logMessage = `[${message.level.toUpperCase()}] ${message.message}`;
          this.sendToRenderer('server-message', logMessage);
        } else if (message.type === 'ready') {
          this.sendToRenderer('server-message', `✅ ${message.message}`);
          this.sendToRenderer('server-status', { 
            running: true, 
            message: 'TunnelPanda server is ready',
            port: message.port
          });
        } else {
          this.sendToRenderer('server-message', JSON.stringify(message));
        }
      });

      this.tunnelPandaProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Server stdout:', output);
        this.sendToRenderer('server-message', output);
      });

      this.tunnelPandaProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        console.error('Server stderr:', output);
        this.sendToRenderer('server-error', output);
      });

      this.tunnelPandaProcess.on('error', (error) => {
        console.error('Server process error:', error);
        this.isServerRunning = false;
        this.sendToRenderer('server-error', error.message);
        this.sendToRenderer('server-status', { running: false, message: 'Failed to start server' });
      });

      this.tunnelPandaProcess.on('spawn', () => {
        console.log('Server process spawned successfully');
        this.isServerRunning = true;
        this.sendToRenderer('server-status', {
          running: true,
          message: 'TunnelPanda server started',
          pid: this.tunnelPandaProcess.pid
        });
        // Try to connect WebSocket for monitoring
        setTimeout(() => this.connectWebSocket(), 2000);
      });

      this.tunnelPandaProcess.on('exit', (code) => {
        console.log('Server process exited with code:', code);
        this.isServerRunning = false;
        this.sendToRenderer('server-status', { 
          running: false, 
          message: `Server stopped with code ${code}` 
        });
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      this.sendToRenderer('server-error', error.message);
      this.sendToRenderer('server-status', { running: false, message: 'Failed to start server' });
    }
  }

  stopServer() {
    if (this.tunnelPandaProcess) {
      this.tunnelPandaProcess.kill('SIGTERM');
      this.tunnelPandaProcess = null;
    }
    this.isServerRunning = false;
    this.disconnectWebSocket();
    this.sendToRenderer('server-status', { 
      running: false, 
      message: 'Server stopped' 
    });
  }

  startTunnel() {
    if (this.isTunnelRunning) {
      this.sendToRenderer('tunnel-status', { running: true, message: 'Tunnel is already running' });
      return;
    }

    const configPath = path.join(__dirname, '..', 'cloudflared', 'config.yml');
    if (!fs.existsSync(configPath)) {
      this.sendToRenderer('tunnel-error', 'Cloudflare tunnel config not found. Please run setup first.');
      return;
    }

    this.cloudflaredProcess = spawn('cloudflared', [
      'tunnel', '--config', configPath, 'run', 'tunnelpanda'
    ], {
      cwd: path.join(__dirname, '..')
    });

    this.cloudflaredProcess.stdout.on('data', (data) => {
      this.sendToRenderer('tunnel-output', data.toString());
    });

    this.cloudflaredProcess.stderr.on('data', (data) => {
      this.sendToRenderer('tunnel-output', data.toString());
    });

    this.cloudflaredProcess.on('error', (error) => {
      this.sendToRenderer('tunnel-error', error.message);
    });

    this.cloudflaredProcess.on('exit', (code) => {
      this.isTunnelRunning = false;
      this.sendToRenderer('tunnel-status', { 
        running: false, 
        message: `Tunnel stopped with code ${code}` 
      });
    });

    this.isTunnelRunning = true;
    this.sendToRenderer('tunnel-status', {
      running: true,
      message: 'Cloudflare tunnel started',
      pid: this.cloudflaredProcess.pid
    });
  }

  stopTunnel() {
    if (this.cloudflaredProcess) {
      this.cloudflaredProcess.kill('SIGTERM');
      this.cloudflaredProcess = null;
    }
    this.isTunnelRunning = false;
    this.sendToRenderer('tunnel-status', { 
      running: false, 
      message: 'Tunnel stopped' 
    });
  }

  // WebSocket connection for monitoring
  connectWebSocket() {
    try {
      // Load config to get authentication details
      const configPath = path.join(__dirname, '..', 'src', 'config.js');
      delete require.cache[require.resolve(configPath)]; // Clear cache to get fresh config
      const config = require(configPath);
      
      // Use default values if config values are empty
      const username = config.auth.user || 'panda';
      const password = config.auth.pass || 'bamboo';
      const token = config.auth.appToken || 'super-secret-token';
      
      // Connect to status WebSocket with proper authentication
      const wsOptions = {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
          'X-APP-TOKEN': token
        }
      };
      
      this.statusWsConnection = new WebSocket('ws://localhost:16014/db/status', wsOptions);

      this.statusWsConnection.on('open', () => {
        this.sendToRenderer('websocket-status', { connected: true });
      });

      this.statusWsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.sendToRenderer('websocket-message', message);
        } catch (e) {
          this.sendToRenderer('websocket-message', { raw: data.toString() });
        }
      });

      this.statusWsConnection.on('error', (error) => {
        this.sendToRenderer('websocket-error', error.message);
      });

      this.statusWsConnection.on('close', () => {
        this.sendToRenderer('websocket-status', { connected: false });
      });
    } catch (error) {
      this.sendToRenderer('websocket-error', error.message);
    }
  }

  disconnectWebSocket() {
    if (this.statusWsConnection) {
      this.statusWsConnection.close();
      this.statusWsConnection = null;
    }
  }

  // Utility methods
  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  cleanup() {
    this.stopServer();
    this.stopTunnel();
    this.disconnectWebSocket();
  }

  // IPC handlers
  setupIpcHandlers() {
    // Server control
    ipcMain.handle('start-server', () => this.startServer());
    ipcMain.handle('stop-server', () => this.stopServer());
    ipcMain.handle('restart-server', () => {
      this.stopServer();
      setTimeout(() => this.startServer(), 1000);
    });

    // Tunnel control
    ipcMain.handle('start-tunnel', () => this.startTunnel());
    ipcMain.handle('stop-tunnel', () => this.stopTunnel());
    ipcMain.handle('restart-tunnel', () => {
      this.stopTunnel();
      setTimeout(() => this.startTunnel(), 1000);
    });

    // Configuration
    ipcMain.handle('get-config', () => {
      try {
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
        let tunnelHostname = '';
        try {
          const cfgPath = path.join(__dirname, '..', 'cloudflared', 'config.yml');
          const yaml = fs.readFileSync(cfgPath, 'utf8');
          const match = yaml.match(/hostname:\s*(.+)/);
          if (match) tunnelHostname = match[1].trim();
        } catch {}

        return {
          port: process.env.PORT || 16014,
          basicAuthUser: process.env.BASIC_AUTH_USER || '',
          basicAuthPass: process.env.BASIC_AUTH_PASS || '',
          appToken: process.env.APP_TOKEN || '',
          ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
          ollamaApiKey: process.env.OLLAMA_API_KEY || '',
          dbProvider: process.env.DB_PROVIDER || '',
          dbUrl: process.env.DB_URL || '',
          dbApiKey: process.env.DB_API_KEY || '',
          dbTenant: process.env.DB_TENANT || '',
          dbDatabase: process.env.DB_DATABASE || '',
          tunnelHostname
        };
      } catch (error) {
        return {};
      }
    });

    ipcMain.handle('save-config', async (event, config) => {
      try {
        const envPath = path.join(__dirname, '..', '.env');
        const envContent = `# Tunnel Panda
PORT=${config.port}
BASIC_AUTH_USER=${config.basicAuthUser}
BASIC_AUTH_PASS=${config.basicAuthPass}
APP_TOKEN=${config.appToken}

# Ollama
OLLAMA_API_URL=${config.ollamaUrl}
OLLAMA_API_KEY=${config.ollamaApiKey}

# DB
DB_PROVIDER=${config.dbProvider}
DB_URL=${config.dbUrl}
DB_API_KEY=${config.dbApiKey}
DB_TENANT=${config.dbTenant}
DB_DATABASE=${config.dbDatabase}
`;
        fs.writeFileSync(envPath, envContent);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Logs and monitoring
    ipcMain.handle('get-logs', () => {
      try {
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) return [];
        
        const logFiles = fs.readdirSync(logsDir)
          .filter(file => file.endsWith('.log'))
          .sort()
          .reverse()
          .slice(0, 5); // Get last 5 log files

        return logFiles.map(file => {
          const filePath = path.join(logsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          return { file, content };
        });
      } catch (error) {
        return [];
      }
    });

    // Status checks
    ipcMain.handle('get-status', () => {
      return {
        server: this.isServerRunning,
        tunnel: this.isTunnelRunning,
        websocket: this.statusWsConnection?.readyState === WebSocket.OPEN
      };
    });

    // Open external URLs
    ipcMain.handle('open-external', (event, url) => {
      shell.openExternal(url);
    });

    // File operations
    ipcMain.handle('show-save-dialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('connect-websocket', () => {
      this.connectWebSocket();
    });

    ipcMain.handle('disconnect-websocket', () => {
      this.disconnectWebSocket();
    });

    ipcMain.handle('save-file', (_e, filePath, buffer) => {
      fs.writeFileSync(filePath, Buffer.from(buffer));
    });
  }
}

// App event handlers
const tunnelPandaApp = new TunnelPandaApp();

app.whenReady().then(() => {
  tunnelPandaApp.createWindow();
  tunnelPandaApp.setupIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      tunnelPandaApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tunnelPandaApp.cleanup();
    app.quit();
  }
});

app.on('before-quit', () => {
  tunnelPandaApp.cleanup();
});

// Security
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
