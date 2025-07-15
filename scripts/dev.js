#!/usr/bin/env node
// scripts/dev.js - Development helper script

const { spawn } = require('child_process');
const path = require('path');

const command = process.argv[2];

switch (command) {
  case 'server':
    console.log('🚀 Starting development server...');
    spawn('node', ['apps/server/app.js'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    break;
    
  case 'electron':
    console.log('🚀 Starting Electron GUI...');
    spawn('npm', ['run', 'electron-dev'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    break;
    
  case 'setup':
    console.log('⚙️ Running setup wizard...');
    spawn('node', ['apps/core/shared/config/setup.js'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    break;
    
  default:
    console.log(`
🐼 TunnelPanda Development Helper

Usage: node scripts/dev.js <command>

Commands:
  server    - Start the Express server only
  electron  - Start the Electron GUI in development mode
  setup     - Run the setup wizard

Examples:
  node scripts/dev.js server
  node scripts/dev.js electron
  node scripts/dev.js setup
`);
}
