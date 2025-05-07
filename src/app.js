/*
🐼 Welcome to PandaLand!
// This app listens on port 16014 — Why?
//   P = 16th letter of the alphabet
//   A = 1st letter
//   N = 14th letter
// → 16‑01‑14  → 16014
// So yes, Panda lives here. 🐼✨
*/
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const basicAuth  = require('basic-auth');
const axios      = require('axios');
const fs         = require('fs');
const path       = require('path');
const cfg        = require('./config');
const { execSync } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const authenticate = require('./middleware/auth');

const ollamaRouter = require('./routes/ollama');
const healthRouter = require('./routes/health');

const logger = require('./utils/logger');

const PORT = cfg.port;
const app  = express();
// Enable trust proxy for correct client IP handling behind Cloudflare
app.set('trust proxy', 1);
let server = null;
let logs   = [];

// Custom logging middleware using winston
app.use((req, res, next) => {
  const log = {
    method: req.method,
    path: req.path,
    ip: req.ip
  };
  logs.push({ ...log, timestamp: new Date().toISOString() });
  if (logs.length > 1000) logs.shift(); // Keep last 1000 in memory
  logger.info(log);
  next();
});

// ────────────────────────────────────────── middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));


// Body size logging middleware (before rate limiter)
app.use((req, res, next) => {
  if (req.body && JSON.stringify(req.body).length > 10000) {
    logger.warn({ msg: 'Large payload', path: req.path, length: JSON.stringify(req.body).length });
  }
  next();
});

app.use(rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true }
}));

app.use(authenticate);

app.use('/', healthRouter);
app.use('/', ollamaRouter);

// Internal endpoint: rate status
app.get('/_internal/rate-status', (req, res) => {
  const ipCountMap = logs.reduce((acc, log) => {
    acc[log.ip] = (acc[log.ip] || 0) + 1;
    return acc;
  }, {});
  res.json({
    uniqueIPs: Object.keys(ipCountMap).length,
    requestsByIP: ipCountMap
  });
});

// errors
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Proxy error' });
});

// Start server on module load
if (require.main === module) {
  const httpServer = http.createServer(app);
  const wss = new WebSocket.Server({ server: httpServer, path: '/v1/chat/stream' });

  // WebSocket heartbeat logic
  function noop() {}
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        const upstream = await axios({
          method: 'post',
          url: `${cfg.ollama.url}/api/generate`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': cfg.ollama.apiKey ? `Bearer ${cfg.ollama.apiKey}` : undefined
          },
          data: { ...parsed, stream: true },
          responseType: 'stream'
        });

        upstream.data.on('data', chunk => {
          ws.send(JSON.stringify({ chunk: chunk.toString() }));
        });

        upstream.data.on('end', () => ws.close());
        upstream.data.on('error', () => ws.close());
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Stream error' }));
        ws.close();
      }
    });
  });

  // Heartbeat interval
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  httpServer.listen(PORT, () => {
    console.log(`🐼 TunnelPanda listening on http://localhost:${PORT}`);
    console.log('📡 WebSocket: /v1/chat/stream → /api/generate');
  });
}