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
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const WebSocket = require('ws');
const logger = require('./utils/logger');
const authenticate = require('./middleware/auth');
const ollamaAPI = require('./utils/api');
const dbRouter      = require('./routes/db');

const cfg = require('./config');
const PORT = cfg.port;

// Express app setup
const app = express();
app.set('trust proxy', 1);

// Logging setup
let logs = [];
app.use((req, res, next) => {
  const log = {
    method: req.method,
    path: req.path,
    ip: req.ip
  };
  logs.push({ ...log, timestamp: new Date().toISOString() });
  if (logs.length > 1000) logs.shift();
  logger.info(log);
  next();
});

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Body size logging
app.use((req, res, next) => {
  if (req.body && JSON.stringify(req.body).length > 10000) {
    logger.warn({ msg: 'Large payload', path: req.path, length: JSON.stringify(req.body).length });
  }
  next();
});

// Rate limiting
app.use(rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: true }
}));

// Authentication
app.use(authenticate);

// Routes
app.use('/', require('./routes/health'));
app.use('/', require('./routes/ollama'));
app.use('/db',      dbRouter);

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

// Error handler
app.use((err, req, res, _next) => {
  logger.error(err);
  res.status(500).json({ error: 'Proxy error' });
});

// Start server
if (require.main === module) {
  const httpServer = http.createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocket.Server({ 
    server: httpServer, 
    path: '/api/chat',
    verifyClient: (info, cb) => {
      // Basic auth ve token kontrolü WebSocket bağlantıları için de geçerli
      const auth = authenticate(info.req, {}, (err) => {
        if (err) {
          cb(false, 401, 'Unauthorized');
        } else {
          cb(true);
        }
      });
    }
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message) => {
      try {
        const params = JSON.parse(message.toString());
        const upstream = await ollamaAPI.chat(params);

        upstream.data.on('data', chunk => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk.toString());
          }
        });

        upstream.data.on('end', () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });

        upstream.data.on('error', (err) => {
          logger.error('Stream error:', err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ error: 'Stream error' }));
            ws.close();
          }
        });
      } catch (err) {
        logger.error('WebSocket error:', err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ error: 'WebSocket error' }));
          ws.close();
        }
      }
    });
  });

  // WebSocket heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Start HTTP server
  httpServer.listen(PORT, () => {
    logger.info(`🐼 TunnelPanda listening on http://localhost:${PORT}`);
    logger.info('📡 WebSocket: /api/chat');
  });
}

module.exports = app;