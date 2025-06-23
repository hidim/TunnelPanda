// src/app.js
// Main application entry point for TunnelPanda. Sets up Express server, middleware, routes, and error handling.

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
const dbRouter = require('./routes/db');
const dbEvents = require('./utils/dbEvents');

const cfg = require('./config');
const PORT = cfg.port;
const collectionCounts = {};

// Express app setup
const app = express();
app.set('trust proxy', 1);

// Logging setup
let logs = [];
app.use((req, res, next) => {
  // Logs each request's method, path, and IP address.
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
  // Logs if request body is larger than 10,000 characters.
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
app.use('/db', dbRouter);

// Internal endpoint: rate status
app.get('/_internal/rate-status', (req, res) => {
  // Returns the number of unique IPs and request counts by IP.
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
  // Logs error details for failed requests.
  logger.error('Proxy error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers,
    error: err
  });
  res.status(500).json({ error: 'Proxy error', details: err.message, stack: err.stack });
});

// Start server
if (require.main === module) {
  const httpServer = http.createServer(app);
  
  // WebSocket server setup
  const wss = new WebSocket.Server({
    server: httpServer,
    path: '/api/chat',
    verifyClient: (info, cb) => {
      // Basic authentication and token validation for WebSocket connections.
      try {
        const result = authenticate(info.req, null, (err) => {
          if (err) {
            logger.error('WebSocket auth error:', err);
            cb(false, 401, 'Unauthorized');
          } else {
            cb(true);
          }
        });
      } catch (err) {
        logger.error('WebSocket auth exception:', err);
        cb(false, 401, 'Unauthorized');
      }
    }
  });

  // DB status WebSocket
  const statusWss = new WebSocket.Server({
    server: httpServer,
    path: '/db/status',
    verifyClient: (info, cb) => {
      try {
        const result = authenticate(info.req, null, (err) => {
          if (err) {
            logger.error('DB status WebSocket auth error:', err);
            cb(false, 401, 'Unauthorized');
          } else {
            logger.info('DB status WebSocket authenticated successfully');
            cb(true);
          }
        });
      } catch (err) {
        logger.error('DB status WebSocket auth exception:', err);
        cb(false, 401, 'Unauthorized');
      }
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

  // DB status connection handler
  statusWss.on('connection', (ws) => {
    ws.send(JSON.stringify(collectionCounts));
  });

  dbEvents.on('new-items', ({ collection, count }) => {
    collectionCounts[collection] = (collectionCounts[collection] || 0) + count;
    const message = JSON.stringify({ collection, count: collectionCounts[collection] });
    statusWss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
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
    logger.info('📡 WebSocket: /db/status');
  });
}

module.exports = app;