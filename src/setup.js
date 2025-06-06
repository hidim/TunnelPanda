// Interactive setup assistant for TunnelPanda. Guides user through environment and tunnel configuration.
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user with a question and returns the answer.
 * @param {string} query - The question to ask
 * @returns {Promise<string>} The user's answer
 */
async function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Checks if the user is logged in to Cloudflare.
 * @returns {Promise<boolean>} True if logged in, false otherwise
 */
async function checkCloudflareLogin() {
  try {
    // Try to list tunnels to verify login status
    execSync('cloudflared tunnel list', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a Cloudflare tunnel already exists.
 * @param {string} tunnelName - The tunnel name
 * @returns {Promise<boolean>} True if the tunnel exists, false otherwise
 */
async function checkExistingTunnel(tunnelName) {
  try {
    const result = execSync('cloudflared tunnel list --output json', { encoding: 'utf8' });
    const tunnels = JSON.parse(result);
    return tunnels.some(tunnel => tunnel.name === tunnelName);
  } catch {
    return false;
  }
}

/**
 * Main setup function. Guides user through environment and tunnel setup.
 */
async function setup() {
  console.log('🐼 TunnelPanda Setup Assistant');
  console.log('─────────────────────────────');

  // Check if setup already exists
  const alreadySetup = fs.existsSync(path.join(process.cwd(), 'cloudflared', 'config.yml')) && fs.existsSync(path.join(process.cwd(), '.env'));
  if (alreadySetup) {
    console.log('⚙️  Setup already detected. Running update...');
    execSync('npm run update', { stdio: 'inherit' });
    rl.close();
    return;
  }

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
  const username = await question('Enter Basic Auth username (default: panda): ') || 'panda';
  const password = await question('Enter Basic Auth password (default: bamboo): ') || 'bamboo';
  const appToken = await question('Enter app token (default: super-secret-token): ') || 'super-secret-token';
  const ollamaUrl = await question('Enter Ollama API URL (default: http://localhost:11434): ') || 'http://localhost:11434';
  const ollamaKey = await question('Enter Ollama API key (optional): ');
  const dbProvider = await question('Enter DB provider (default: chroma): ') || 'chroma';
  const dbUrl      = await question('Enter DB URL (default: http://localhost:8000): ') || 'http://localhost:8000';
  const dbApiKey   = await question('Enter DB API key (optional): ');
  // New: ask for tenant and database name
  const dbTenant    = await question('Enter DB tenant (default: default_tenant): ') || 'default_tenant';
  const dbDatabase  = await question('Enter DB database (default: default_database): ') || 'default_database';
 
  const envContent = `# Tunnel Panda
PORT=${process.env.PORT || 16014}
BASIC_AUTH_USER=${username}
BASIC_AUTH_PASS=${password}
APP_TOKEN=${appToken}

# Ollama
OLLAMA_API_URL=${ollamaUrl}
OLLAMA_API_KEY=${ollamaKey}

# DB
DB_PROVIDER=${dbProvider}
DB_URL=${dbUrl}
DB_API_KEY=${dbApiKey}
DB_TENANT=${dbTenant}
DB_DATABASE=${dbDatabase}
`;
  fs.writeFileSync(envPath, envContent);
  // Verify .env was created
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file created and verified at', envPath);
  } else {
    console.error('❌ Failed to create .env file at', envPath);
    process.exit(1);
  }

  // Cloudflare setup
  console.log('\n🌥️  Cloudflare Tunnel Setup');
  console.log('────────────────────────');

  let domain = await question('Enter your domain (e.g. api.your-domain.com): ');
  if (!domain) {
    console.error('❌ Domain is required');
    process.exit(1);
  }

  try {
    // Check and handle Cloudflare login
    const isLoggedIn = await checkCloudflareLogin();
    if (!isLoggedIn) {
      console.log('\n🔑 Opening browser for Cloudflare login...');
      execSync('cloudflared tunnel login', { stdio: 'inherit' });
    } else {
      console.log('✅ Already logged in to Cloudflare');
    }

    // Check if tunnel exists, create if not
    const tunnelName = 'tunnelpanda';
    let tunnelUuid;
    const tunnelExists = await checkExistingTunnel(tunnelName);

    if (!tunnelExists) {
      console.log('\n🚇 Creating new tunnel...');
      const result = execSync(`cloudflared tunnel create ${tunnelName}`).toString();
      tunnelUuid = result.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];

      if (!tunnelUuid) {
        throw new Error('Could not extract tunnel UUID');
      }
      console.log(`✅ Created tunnel ${tunnelName} with UUID: ${tunnelUuid}`);
    } else {
      // Get existing tunnel ID
      const tunnelList = JSON.parse(execSync('cloudflared tunnel list --output json', { encoding: 'utf8' }));
      const existingTunnel = tunnelList.find(t => t.name === tunnelName);
      tunnelUuid = existingTunnel?.id;
      console.log(`✅ Using existing tunnel: ${tunnelUuid}`);
    }

    // Write minimal config.yml
    const configContent = `tunnel: ${tunnelUuid}
credentials-file: ${path.join(process.env.HOME || process.env.USERPROFILE, '.cloudflared', tunnelUuid + '.json')}

ingress:
  - hostname: ${domain}
    service: http://localhost:16014
  - service: http_status:404
`;
    fs.writeFileSync(path.join(configDir, 'config.yml'), configContent);
    console.log('✅ Created config.yml');

    console.log('\n🔧 Setting up DNS...');
    try {
      execSync(`cloudflared tunnel route dns ${tunnelName} ${domain}`, { stdio: 'inherit' });
      console.log('✅ DNS record created');
    } catch (error) {
      if (error.message.includes('record with that host already exists')) {
        console.log('\n⚠️  DNS record already exists.');
        execSync(`cloudflared tunnel route dns --overwrite-dns ${tunnelName} ${domain}`, { stdio: 'inherit' });
        console.log('✅ DNS route updated');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Setup complete! To start TunnelPanda:');
    console.log(`1. Run: cloudflared tunnel --config cloudflared/config.yml run tunnelpanda`);
    console.log('2. Run: npm start');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  rl.close();
}

setup();