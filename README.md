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

---

## 📁 Folder Layout

```
tunnelpanda/
├── cloudflared/
│   └── config.yml
├── src/
│   ├── app.js
│   ├── config.js
│   ├── setup.js
│   ├── routes/
│   │   ├── ollama.js
│   │   └── health.js
│   ├── middleware/
│   │   └── auth.js
│   └── utils/
│       ├── logger.js
│       └── api.js
├── .env.example
├── package.json
├── start
└── ReadMe.md
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

---

## 🔌 API Endpoints

All endpoints require Basic Auth and an `X-APP-TOKEN` header.

### 🔁 Generate Completion
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","prompt":"Write a haiku about pandas.","stream":false}' \
     http://localhost:16014/api/generate
```

### 💬 Chat Stream
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","messages":[{"role":"user","content":"Hello Panda"}],"stream":true}' \
     http://localhost:16014/api/chat
```

### 🏷 List Models (Tags)
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     http://localhost:16014/api/tags
```

### 🧩 Create Embeddings
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     -H "Content-Type: application/json" \
     -d '{"model":"phi4","input":["Convert this text to vector."]}' \
     http://localhost:16014/api/embeddings
```

### ❤️ Health Checks
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     http://localhost:16014/health
```

### 📊 Internal Monitoring
```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super-secret-token" \
     http://localhost:16014/_internal/rate-status
```

---

## 🧪 WebSocket Example

**URL**: `ws://localhost:16014/api/chat`

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
```

---

## 📦 Update Script

```bash
npm run update
```

Runs:

- `git pull`  
- `npm install`

---

## 📄 License

MIT — Built with ☕, bamboo, and tunnel magic.