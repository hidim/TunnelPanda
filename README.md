# 🐼 Tunnel Panda — “Panda lives on 16014”

Tunnel Panda is a modular, secure reverse‑proxy that streams your local Ollama API behind a Cloudflare Tunnel. It supports Basic Auth, API token control, and streaming over WebSocket.

---

## ✨ Features

- 🔐 Basic Authentication + `X-APP-TOKEN` protection  
- ☁️ Cloudflare Tunnel exposure for local Ollama API  
- 💬 Stream completions over HTTP and WebSocket  
- 🧱 Modular architecture: routes, auth, logger  
- 🧰 Interactive setup assistant (`npm run setup`)  
- 📈 Internal rate-limit monitor: `/​_internal/rate-status`  
- 📜 Winston-based JSON logging with daily rotation  
- 🔁 One-line self-update: `npm run update`
- 🖥️ **NEW: Electron GUI Control Center** with visual management
- 🏗️ **NEW: Feature-based architecture** ready for Pro features

---

## 🏗️ Architecture

TunnelPanda now uses a **feature-based architecture** that makes it easy to add new functionality and maintain the codebase:

- **Modular Features**: Each feature (auth, database, ollama, etc.) is self-contained
- **Shared Utilities**: Common code is centralized in the shared folder
- **Pro-Ready**: Structure designed to easily add premium features
- **Clean Separation**: Core, desktop, and server concerns are separated

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

---

## 📁 Folder Layout

```
tunnelpanda/
├── apps/                  # Feature-based application structure
│   ├── core/             # Core features (free tier)
│   │   ├── features/     # Feature modules
│   │   │   ├── auth/     # Authentication
│   │   │   ├── database/ # Database operations
│   │   │   ├── health/   # Health checks
│   │   │   ├── ollama/   # Ollama API integration
│   │   │   ├── monitoring/ # System monitoring
│   │   │   └── tunneling/  # Tunnel management
│   │   ├── shared/       # Shared utilities
│   │   │   ├── config/   # Configuration
│   │   │   ├── middleware/ # Common middleware
│   │   │   └── utils/    # Utility functions
│   │   └── ui/           # Core UI components
│   ├── desktop/          # Electron GUI Control Center
│   │   ├── main/         # Main process
│   │   ├── preload/      # Preload scripts
│   │   └── renderer/     # Renderer UI
│   └── server/           # Express server entry point
├── cloudflared/
│   └── config.yml
├── logs/                 # Application logs
├── scripts/              # Development scripts
│   └── dev.js           # Development helper
├── .env.example
├── package.json
├── launcher.js
└── ARCHITECTURE.md       # Architecture documentation
```

---

## 🔧 Prerequisites

- Node.js 18+ and npm  
- Git  
- cloudflared (install via official Cloudflare documentation)

### Node.js Installation

#### Debian / Ubuntu
```bash
sudo apt update && sudo apt install -y nodejs npm git
```

#### RHEL / CentOS / Fedora
```bash
sudo yum install -y nodejs npm git
```

#### macOS
```bash
brew install node@18 git
```

#### Windows (PowerShell as Admin)
```powershell
choco install nodejs-lts git -y
```

---

## 🚀 Quick Start

### Command Line (Traditional)
```bash
git clone https://github.com/hidim/tunnelpanda.git
cd tunnelpanda
npm install
npm run setup
```

Follow the prompts. After setup:

```bash
cloudflared tunnel --config cloudflared/config.yml run tunnelpanda
npm start
```

### GUI Control Center (NEW)
```bash
git clone https://github.com/hidim/tunnelpanda.git
cd tunnelpanda
npm install
npm run electron
```

The Electron GUI provides:
- 🎛️ **Visual Controls**: Start/stop server and tunnel with buttons
- 🔐 **Security Management**: Configure auth, tokens, and rate limits
- 📊 **Real-time Monitoring**: Live stats, logs, and WebSocket data
- 🗄️ **Database Console**: Manage vector database connections
- 🔧 **API Testing**: Built-in endpoint tester with sample requests
- 📝 **Log Viewer**: Browse and filter application logs
- ⚙️ **Settings Panel**: Complete configuration management

Both interfaces work together - you can use npm commands or the GUI interchangeably!

---

## 🔌 API Endpoints

All endpoints require Basic Auth and an `X-APP-TOKEN` header.

### 🔁 Generate Completion
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","prompt":"Write a haiku about pandas.","stream":false}' \
     https://api.domain.com/api/generate
```

### 💬 Chat Stream
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","messages":[{"role":"user","content":"Hello Panda"}],"stream":true}' \
     https://api.domain.com/api/chat
```

### 🏷 List Models (Tags)
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     https://api.domain.com/api/tags
```

### 🧩 Create Embeddings
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","input":["Convert this text to vector."]}' \
     https://api.domain.com/api/embeddings
```

### ❤️ Health Checks
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     https://api.domain.com/health
```

### 📊 Internal Monitoring
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     https://api.domain.com/_internal/rate-status
```

### 📡 DB Status WebSocket
Connect to `wss://api.domain.com/db/status` with the same authentication. On
connect you'll receive a JSON map of collection counts:

```json
{ "reminders": 5, "tasks": 2 }
```

Every time new items are added the server broadcasts `{ "collection": "<name>",
"count": <total> }`.

---

## 🧪 WebSocket Example

**URL**: `wss://api.domain.com/api/chat`

```js
const ws = new WebSocket('ws://localhost:16014/api/chat');

ws.onopen = () => {
  ws.send(JSON.stringify({
    model: "phi4",
    messages: [{ role: "user", content: "Hi panda!" }],
    stream: true
  }));
};

ws.onmessage = ({ data }) => console.log('AI:', data);
ws.onerror = (err) => console.error('WebSocket error:', err);
ws.onclose = () => console.log('WebSocket closed');
```

---

## ⚙️ Environment Variables


Create a file `.env` with:

```dotenv
PORT=16014
BASIC_AUTH_USER=panda
BASIC_AUTH_PASS=bamboo
APP_TOKEN=super-secret-token

OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=

# DB Proxy Layer
DB_PROVIDER=chroma
DB_URL=http://localhost:8003
DB_TENANT=default_tenant
DB_DATABASE=default_database
DB_API_KEY=
```

## 🗄️ DB Proxy Layer

Tunnel Panda now includes a modular DB proxy layer under `/db`. It exposes your local vector databases behind the tunnel with a unified HTTP API. You can configure multiple providers via the `DB_PROVIDER` and related environment variables. The proxy uses a factory pattern to load the appropriate connector.

Supported providers include:
- **Chroma**: HTTP server at `DB_URL`, use `DB_TENANT` and `DB_DATABASE` to define the namespace.
- **Milvus**
- **Pinecone**
- **SQLite**, **Redis**, **PostgreSQL**, **MySQL**, and more.

### Example with Chroma

```bash
# Start a local Chroma HTTP server:
chromadb run --path /path/to/vector_db --host 127.0.0.1 --port 8003

# Configure Tunnel Panda environment:
export DB_PROVIDER=chroma
export DB_URL=http://localhost:8003
export DB_TENANT=default
export DB_DATABASE=vector_db

# Start Tunnel Panda:
npm start
```

### Accessing your databases

Once running, you can proxy your vector DB calls through Tunnel Panda:

```bash
curl -u panda:bamboo -H "X-APP-TOKEN: super-secret-token" \
     -X POST http://localhost:16014/db/reminders/query \
     -H "Content-Type: application/json" \
     -d '{"query_embeddings":[[0,0,0]],"n_results":5,"include":["documents","metadatas"]}'
```

---

## 📦 Available Commands

### Server Management
```bash
npm start              # Start TunnelPanda server
npm run setup          # Interactive setup wizard
npm run update         # Update application
```

### GUI Control Center
```bash
npm run electron       # Start Electron GUI (production)
npm run electron-dev   # Start Electron GUI (development)
npm run build-electron # Build distributable app
npm run dist           # Create platform installers
```

### Packaging the Electron App

Run `npm run build-electron` on your platform to produce a desktop build in
`dist/`. You can target specific operating systems with flags:

```bash
npm run build-electron -- --mac   # macOS DMG and app bundle
npm run build-electron -- --win   # Windows installer
npm run build-electron -- --linux # Linux AppImage/DEB/RPM
```

Cross-building may require additional tooling (e.g. Wine for Windows packages).

### Development
```bash
npm install            # Install dependencies
npm audit fix          # Fix security vulnerabilities
```

---

## 📄 License

MIT — Built with ☕, bamboo, and tunnel magic.
