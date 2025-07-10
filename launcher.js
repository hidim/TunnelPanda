#!/usr/bin/env node
// launcher.js - TunnelPanda Launcher
// Provides an interactive menu to choose between CLI and GUI modes

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🐼 TunnelPanda Launcher
──────────────────────

Choose how you want to run TunnelPanda:

1. 🖥️  GUI Control Center (Electron) - Visual interface
2. 🖥️  Server Only (CLI) - Command line
3. ⚙️  Setup Wizard - First time configuration
4. 📦 Update - Pull latest changes
5. ❌ Exit

`);

rl.question('Enter your choice (1-5): ', (answer) => {
  const choice = parseInt(answer);
  
  switch (choice) {
    case 1:
      console.log('🚀 Starting GUI Control Center...');
      launchElectron();
      break;
    case 2:
      console.log('🚀 Starting TunnelPanda server...');
      launchServer();
      break;
    case 3:
      console.log('⚙️ Starting setup wizard...');
      launchSetup();
      break;
    case 4:
      console.log('📦 Updating TunnelPanda...');
      launchUpdate();
      break;
    case 5:
      console.log('👋 Goodbye!');
      process.exit(0);
      break;
    default:
      console.log('❌ Invalid choice. Please run the launcher again.');
      process.exit(1);
  }
  
  rl.close();
});

function launchElectron() {
  const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
  const mainPath = path.join(__dirname, 'ui', 'main.js');
  
  const electron = spawn(electronPath, [mainPath], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  electron.on('error', (error) => {
    console.error('❌ Failed to start Electron GUI:', error.message);
    console.log('💡 Try running: npm install');
    process.exit(1);
  });
  
  electron.on('exit', (code) => {
    if (code !== 0) {
      console.log(`❌ Electron GUI exited with code ${code}`);
    }
    process.exit(code);
  });
}

function launchServer() {
  const serverPath = path.join(__dirname, 'src', 'app.js');
  
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    if (code !== 0) {
      console.log(`❌ Server exited with code ${code}`);
    }
    process.exit(code);
  });
}

function launchSetup() {
  const setupPath = path.join(__dirname, 'src', 'setup.js');
  
  const setup = spawn('node', [setupPath], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  setup.on('error', (error) => {
    console.error('❌ Failed to start setup:', error.message);
    process.exit(1);
  });
  
  setup.on('exit', (code) => {
    console.log(code === 0 ? '✅ Setup completed!' : `❌ Setup exited with code ${code}`);
    process.exit(code);
  });
}

function launchUpdate() {
  const npm = spawn('npm', ['run', 'update'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  npm.on('error', (error) => {
    console.error('❌ Failed to update:', error.message);
    process.exit(1);
  });
  
  npm.on('exit', (code) => {
    console.log(code === 0 ? '✅ Update completed!' : `❌ Update failed with code ${code}`);
    process.exit(code);
  });
}
