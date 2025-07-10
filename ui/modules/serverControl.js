// ui/modules/serverControl.js
// Server and tunnel control functionality

class ServerControl {
  constructor(ui) {
    this.ui = ui;
  }

  async startServer() {
    try {
      await window.electronAPI.startServer();
      this.ui.addActivity('server', 'Starting server...', 'info');
    } catch (error) {
      this.ui.addActivity('server', `Failed to start server: ${error}`, 'error');
    }
  }

  async stopServer() {
    try {
      await window.electronAPI.stopServer();
      this.ui.addActivity('server', 'Stopping server...', 'info');
    } catch (error) {
      this.ui.addActivity('server', `Failed to stop server: ${error}`, 'error');
    }
  }

  async restartServer() {
    try {
      await window.electronAPI.restartServer();
      this.ui.addActivity('server', 'Restarting server...', 'info');
    } catch (error) {
      this.ui.addActivity('server', `Failed to restart server: ${error}`, 'error');
    }
  }

  async startTunnel() {
    try {
      await window.electronAPI.startTunnel();
      this.ui.addActivity('tunnel', 'Starting tunnel...', 'info');
    } catch (error) {
      this.ui.addActivity('tunnel', `Failed to start tunnel: ${error}`, 'error');
    }
  }

  async stopTunnel() {
    try {
      await window.electronAPI.stopTunnel();
      this.ui.addActivity('tunnel', 'Stopping tunnel...', 'info');
    } catch (error) {
      this.ui.addActivity('tunnel', `Failed to stop tunnel: ${error}`, 'error');
    }
  }

  async restartTunnel() {
    try {
      await window.electronAPI.restartTunnel();
      this.ui.addActivity('tunnel', 'Restarting tunnel...', 'info');
    } catch (error) {
      this.ui.addActivity('tunnel', `Failed to restart tunnel: ${error}`, 'error');
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
}

// Export for use in main app
window.ServerControl = ServerControl;
