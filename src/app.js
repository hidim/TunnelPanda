/*
// 🐼 Welcome to PandaLand!
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

const PORT = Number(process.env.PORT) || 16014;
const app  = express();
// Enable trust proxy for correct client IP handling behind Cloudflare
app.set('trust proxy', true);
let server = null;
let logs   = [];

// Configure logging
const LOG_PATH = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH);
}

const logStream = fs.createWriteStream(
  path.join(LOG_PATH, `panda-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

// Custom logging middleware
app.use((req, res, next) => {
  const log = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip
  };
  logs.push(log);
  if (logs.length > 1000) logs.shift(); // Keep last 1000 in memory
  logStream.write(JSON.stringify(log) + '\n');
  next();
});

// ────────────────────────────────────────── middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.use(rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
}));

// Basic Auth gate
app.use((req, res, next) => {
  const creds = basicAuth(req);
  if (!creds ||
      creds.name !== process.env.BASIC_AUTH_USER ||
      creds.pass !== process.env.BASIC_AUTH_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="TunnelPanda"');
    return res.status(401).send('Authentication required.');
  }
  next();
});

// Static app token gate
app.use((req, res, next) => {
  if (req.get('X-APP-TOKEN') !== cfg.auth.appToken) {
    return res.status(401).json({ error: 'Invalid X‑APP‑TOKEN' });
  }
  next();
});

// Control endpoints
app.post('/control/:command', (req, res) => {
  const { command } = req.params;
  
  switch (command) {
    case 'stop':
      if (server) {
        server.close(() => {
          console.log('🐼 TunnelPanda stopped');
          res.json({ status: 'stopped' });
        });
      } else {
        res.json({ error: 'Server not running' });
      }
      break;
      
    case 'start':
      if (!server) {
        server = app.listen(PORT, () => {
          console.log(`🐼 TunnelPanda listening on http://localhost:${PORT}`);
          res.json({ status: 'started', port: PORT });
        });
      } else {
        res.json({ error: 'Server already running' });
      }
      break;
      
    case 'restart':
      if (server) {
        server.close(() => {
          server = app.listen(PORT, () => {
            console.log(`🐼 TunnelPanda restarted on http://localhost:${PORT}`);
            res.json({ status: 'restarted', port: PORT });
          });
        });
      } else {
        server = app.listen(PORT, () => {
          console.log(`🐼 TunnelPanda started on http://localhost:${PORT}`);
          res.json({ status: 'started', port: PORT });
        });
      }
      break;
      
    case 'status':
      res.json({
        status: server ? 'running' : 'stopped',
        port: PORT,
        uptime: server ? process.uptime() : 0
      });
      break;
      
    case 'logs':
      res.json({ logs });
      break;
      
    default:
      res.status(400).json({ error: 'Invalid command' });
  }
});

// health
app.get('/status', (_, res) => res.json({ ok: true }));

// ─────────────────────────────── proxy → Ollama (stream capable)
app.post('/v1/chat/completions', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'post',
      url:   `${cfg.ollama.url}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cfg.ollama.apiKey
          ? `Bearer ${cfg.ollama.apiKey}`
          : undefined
      },
      data: req.body,
      responseType: 'stream'          // keep chunks
    });
    res.type('application/json');
    upstream.data.pipe(res);
  } catch (err) {
    next(err);
  }
});

// errors
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Proxy error' });
});

// Start server on module load
if (require.main === module) {
  server = app.listen(PORT, () =>
    console.log(`🐼 TunnelPanda listening on http://localhost:${PORT}`)
  );
}