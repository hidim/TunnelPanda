# 🐼 Tunnel Panda – "Panda lives on 16014"

A tiny Node reverse‑proxy that listens on **localhost:16014** and exposes your
local **Ollama API** to the public **through your own Cloudflare Tunnel** –
**only** after the caller passes your **Basic Auth** credentials.

> **Flow**
> ```
> mobile / client
>     │  (Basic‑Auth)
>     ▼
>  https://api.your‑domain.com  ← public Cloudflare tunnel
>     │
>     ▼
>  Tunnel Panda  (localhost:16014)
>     │
>     ▼
>  Ollama  (localhost:11434 or wherever)
> ```

---

## 0. Prerequisites

| Need                                   | Why                                                |
|----------------------------------------|----------------------------------------------------|
| Cloudflare account + your own domain   | You'll create the tunnel on a real hostname        |
| `cloudflared` installed on the server  | The lightweight Cloudflare Tunnel daemon           |
| Node 18 + & npm                        | To run Tunnel Panda                                |
| Ollama up and listening locally        | `curl http://localhost:11434` should answer        |

---

## 1. Quick Start

```bash
# Clone and install
git clone https://github.com/hidim/tunnelpanda.git
cd tunnelpanda
npm install

# Run the interactive setup
npm run setup
```

The setup assistant will:
1. Create your .env file with your credentials
2. Log you into Cloudflare
3. Create and configure your tunnel
4. Set up DNS routing

---

## 2. Control Commands

TunnelPanda supports the following commands:

```bash
npm run start    # Start the server
npm run stop     # Stop the server
npm run restart  # Restart the server
npm run status   # Check server status
npm run logs     # View recent logs
```

You can also use HTTP endpoints with Basic Auth:
- POST /control/start   - Start server
- POST /control/stop    - Stop server
- POST /control/restart - Restart server
- POST /control/status  - Get status
- POST /control/logs    - Get logs

---

## 3. Running TunnelPanda

You'll need two terminals:

```bash
# Terminal 1: Start Cloudflare Tunnel
cloudflared tunnel --config cloudflared/config.yml run tunnelpanda

# Terminal 2: Start TunnelPanda
npm start
```

---

## 4. Testing the Connection

```bash
curl -u panda:bamboo \
     -H "X-APP-TOKEN: super‑secret‑token" \
     -H "Content-Type: application/json" \
     https://api.your-domain.com/v1/chat/completions \
     -d '{"model":"gemma:7b","messages":[{"role":"user","content":"Hi Panda"}]}'
```

Streaming works too: set `"stream": true`.

---

## 5. Environment Variables

The setup assistant will create a `.env` file with these defaults that you can customize:

```dotenv
# Core
PORT=16014
BASIC_AUTH_USER=panda
BASIC_AUTH_PASS=bamboo
APP_TOKEN=super‑secret‑token

# Ollama
OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=                 # leave empty if Ollama is open
```

---

## 6. Run as a systemd service (Linux)

`/etc/systemd/system/tunnelpanda.service`

```ini
[Unit]
Description=🐼 Tunnel Panda Proxy
After=network.target

[Service]
WorkingDirectory=/opt/tunnelpanda
ExecStart=/usr/bin/node src/app.js
EnvironmentFile=/opt/tunnelpanda/.env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tunnelpanda
```

---

## 🔒 Security checklist

1. **HTTPS only** — Cloudflare handles TLS for you.  
2. Rotate `BASIC_AUTH_PASS` regularly.  
3. Keep `APP_TOKEN` in secure storage on the mobile app (Keychain / Keystore).  
4. Tweak rate‑limits in `src/app.js` (default 200 req/min/IP).  
5. Monitor logs with `npm run logs` for suspicious activity.
6. Monitor Cloudflare Tunnel logs (`--metrics`) for abuse.

---

## License

MIT — Built with ☕, bamboo and Pandas.