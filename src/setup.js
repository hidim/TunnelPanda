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

async function checkCloudflareLogin() {
  try {
    execSync('cloudflared tunnel list', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function checkExistingTunnel(tunnelName) {
  try {
    const result = execSync('cloudflared tunnel list --output json', { encoding: 'utf8' });
    const tunnels = JSON.parse(result);
    return tunnels.some(t => t.name === tunnelName);
  } catch {
    return false;
  }
}

async function setup() {
  console.log('🐼 TunnelPanda Setup Assistant');
  console.log('─────────────────────────────');

  // Verify cloudflared installed
  try {
    execSync('cloudflared -v');
  } catch {
    console.error('❌ cloudflared is not installed. Please install it first.');
    process.exit(1);
  }

  // Ensure cloudflared directory
  const configDir = path.join(process.cwd(), 'cloudflared');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  // Environment setup
  const envPath = path.join(process.cwd(), '.env');
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
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file created and verified at', envPath);
  } else {
    console.error('❌ Failed to create .env file at', envPath);
    process.exit(1);
  }

  // Cloudflare tunnel setup
  console.log('\n🌥️  Cloudflare Tunnel Setup');
  const domain = await question('Enter your domain (e.g. api.your-domain.com): ');
  if (!domain) {
    console.error('❌ Domain is required');
    process.exit(1);
  }

  // Login if needed
  const isLoggedIn = await checkCloudflareLogin();
  if (!isLoggedIn) {
    console.log('\n🔑 Opening browser for Cloudflare login...');
    execSync('cloudflared tunnel login', { stdio: 'inherit' });
  } else {
    console.log('✅ Already logged in to Cloudflare');
  }

  // Create or reuse tunnel
  const tunnelName = 'tunnelpanda';
  let tunnelUuid;
  const exists = await checkExistingTunnel(tunnelName);
  if (!exists) {
    console.log('\n🚇 Creating new tunnel...');
    const res = execSync(`cloudflared tunnel create ${tunnelName}`).toString();
    tunnelUuid = res.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)[0];
    console.log(`✅ Created tunnel ${tunnelName} (UUID: ${tunnelUuid})`);
  } else {
    const list = JSON.parse(execSync('cloudflared tunnel list --output json', { encoding: 'utf8' }));
    const t = list.find(t => t.name === tunnelName);
    tunnelUuid = t.id;
    console.log(`✅ Using existing tunnel ${tunnelName} (UUID: ${tunnelUuid})`);
  }

  // Write config.yml
  const cfg = `tunnel: ${tunnelUuid}
credentials-file: ${path.join(process.env.HOME || process.env.USERPROFILE, '.cloudflared', tunnelUuid + '.json')}

ingress:
  - hostname: ${domain}
    service: http://localhost:16014
  - service: http_status:404
`;
  fs.writeFileSync(path.join(configDir, 'config.yml'), cfg);
  console.log('✅ Created cloudflared/config.yml');

  // Setup DNS
  console.log('\n🔧 Setting up DNS...');
  try {
    execSync(`cloudflared tunnel route dns ${tunnelName} ${domain}`, { stdio: 'inherit' });
    console.log('✅ DNS record created');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️  DNS record already exists, updating...');
      execSync(`cloudflared tunnel route dns --overwrite-dns ${tunnelName} ${domain}`, { stdio: 'inherit' });
      console.log('✅ DNS route updated');
    } else {
      throw err;
    }
  }

  console.log('\n🎉 Setup complete!');
  console.log('Run `npm start` to launch Cloudflare Tunnel and Tunnel Panda proxy together.');
  rl.close();
}

setup();