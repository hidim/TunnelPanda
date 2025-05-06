const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('🐼 TunnelPanda Setup Assistant');
  console.log('─────────────────────────────');

  // Check if cloudflared is installed
  try {
    execSync('cloudflared -v');
  } catch {
    console.error('❌ cloudflared is not installed. Please install it first.');
    process.exit(1);
  }

  // Create config directory if needed
  const configDir = path.join(process.cwd(), 'cloudflared');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  // Environment setup
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    const username = await question('Enter Basic Auth username (default: panda): ') || 'panda';
    const password = await question('Enter Basic Auth password (default: bamboo): ') || 'bamboo';
    const appToken = await question('Enter app token (default: super-secret-token): ') || 'super-secret-token';
    const ollamaUrl = await question('Enter Ollama API URL (default: http://localhost:11434): ') || 'http://localhost:11434';
    const ollamaKey = await question('Enter Ollama API key (optional): ');

    const envContent = `# Core
PORT=16014
BASIC_AUTH_USER=${username}
BASIC_AUTH_PASS=${password}
APP_TOKEN=${appToken}

# Ollama
OLLAMA_API_URL=${ollamaUrl}
OLLAMA_API_KEY=${ollamaKey}
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file');
  }

  // Cloudflare setup
  console.log('\n🌥️  Cloudflare Tunnel Setup');
  console.log('────────────────────────');
  
  const domain = await question('Enter your domain (e.g. api.your-domain.com): ');
  if (!domain) {
    console.error('❌ Domain is required');
    process.exit(1);
  }

  try {
    // Login to Cloudflare (opens browser)
    console.log('\n🔑 Opening browser for Cloudflare login...');
    execSync('cloudflared tunnel login', { stdio: 'inherit' });

    // Create tunnel
    console.log('\n🚇 Creating tunnel...');
    const result = execSync('cloudflared tunnel create tunnelpanda').toString();
    const tunnelUuid = result.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
    
    if (!tunnelUuid) {
      throw new Error('Could not extract tunnel UUID');
    }

    // Create DNS record
    console.log('\n🔧 Setting up DNS...');
    execSync(`cloudflared tunnel route dns tunnelpanda ${domain}`, { stdio: 'inherit' });

    // Create config.yml
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configContent = `tunnel: ${tunnelUuid}
credentials-file: ${path.join(homeDir, '.cloudflared', tunnelUuid + '.json')}

ingress:
  - hostname: ${domain}
    service: http://localhost:16014
  - service: http_status:404
`;

    fs.writeFileSync(path.join(configDir, 'config.yml'), configContent);
    console.log('✅ Created cloudflared/config.yml');

    console.log('\n🎉 Setup complete! To start TunnelPanda:');
    console.log('1. Run in terminal 1: cloudflared tunnel --config cloudflared/config.yml run tunnelpanda');
    console.log('2. Run in terminal 2: npm start');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  rl.close();
}

setup();