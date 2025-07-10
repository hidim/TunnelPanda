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
const crypto = require('crypto');
const logger = require('./utils/logger');
const authenticate = require('./middleware/auth');
const ollamaAPI = require('./utils/api');
const dbRouter = require('./routes/db');
const dbEvents = require('./utils/dbEvents');

const cfg = require('./config');
const PORT = cfg.port;
const collectionCounts = {};

// Check if running under Electron (forked process)
const isElectronChild = process.send !== undefined;

// Enhanced logging for Electron
function electronLog(message, level = 'info') {
  if (isElectronChild && process.send) {
    process.send({ type: 'log', level, message, timestamp: new Date().toISOString() });
  }
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// Log startup information
electronLog('🐼 TunnelPanda server initializing...');
electronLog(`Environment: ${process.env.NODE_ENV || 'development'}`);
electronLog(`Port: ${PORT}`);

// Make collection counts globally accessible
global.collectionCounts = collectionCounts;

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
electronLog('Setting up middleware...');
app.use(helmet());
app.use(express.json({ limit: cfg.requestLimit })); // Use configurable limit
app.use(express.urlencoded({ limit: cfg.requestLimit, extended: true })); // Use configurable limit
app.use(morgan('combined'));

// Enhanced logging middleware for Electron
app.use((req, res, next) => {
  electronLog(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Body size logging
app.use((req, res, next) => {
  // Logs if request body is larger than the configured threshold.
  if (req.body && JSON.stringify(req.body).length > cfg.largePayloadThreshold) {
    logger.warn({ msg: 'Large payload', path: req.path, length: JSON.stringify(req.body).length, threshold: cfg.largePayloadThreshold });
    electronLog(`⚠️ Large payload detected: ${req.path} (${JSON.stringify(req.body).length} bytes)`, 'warn');
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
electronLog('Setting up authentication...');
app.use(authenticate);

// Routes
electronLog('Setting up routes...');
app.use('/', require('./routes/health'));
app.use('/', require('./routes/ollama'));
app.use('/db', dbRouter);
electronLog('Routes configured: /, /api/*, /db/*');

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
  
  // Store WebSocket connections
  const wsConnections = {
    chat: new Set(),
    status: new Set()
  };
  
  // WebSocket upgrade handler
  httpServer.on('upgrade', (request, socket, head) => {
    const { url } = request;
    
    // Only handle WebSocket upgrades for specific endpoints
    if (url !== '/api/chat' && url !== '/db/status') {
      logger.warn(`WebSocket upgrade rejected for invalid path: ${url}`);
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }
    
    // Parse WebSocket key for handshake
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      logger.warn('WebSocket upgrade rejected: missing sec-websocket-key header');
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    
    // Check for proper WebSocket headers
    const upgrade = request.headers.upgrade;
    const connection = request.headers.connection;
    
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      logger.warn('WebSocket upgrade rejected: invalid upgrade header');
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    
    if (!connection || !connection.toLowerCase().includes('upgrade')) {
      logger.warn('WebSocket upgrade rejected: invalid connection header');
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    
    // Authenticate the WebSocket connection
    try {
      const result = authenticate(request, null, (err) => {
        if (err) {
          logger.error('WebSocket auth error:', err);
          socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
          return;
        }
        
        // Generate WebSocket accept key
        const acceptKey = crypto
          .createHash('sha1')
          .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
          .digest('base64');
        
        // Send WebSocket handshake response
        const responseHeaders = [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${acceptKey}`,
          '\r\n'
        ].join('\r\n');
        
        socket.write(responseHeaders);
        
        // Handle different WebSocket endpoints
        if (url === '/api/chat') {
          logger.info(`WebSocket connection established for: ${url}`);
          handleChatWebSocket(socket);
        } else if (url === '/db/status') {
          logger.info(`WebSocket connection established for: ${url}`);
          handleStatusWebSocket(socket);
        }
      });
    } catch (err) {
      logger.error('WebSocket auth exception:', err);
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
    }
  });
  
  // Chat WebSocket handler
  function handleChatWebSocket(socket) {
    logger.info('Chat WebSocket client connected');
    wsConnections.chat.add(socket);
    
    // Add error handler
    socket.on('error', (error) => {
      logger.error('Chat WebSocket error:', error);
      wsConnections.chat.delete(socket);
    });
    
    socket.on('data', async (buffer) => {
      try {
        const frame = parseWebSocketFrame(buffer);
        if (!frame) return;
        
        const params = JSON.parse(frame.payload.toString());
        const upstream = await ollamaAPI.chat(params);

        upstream.data.on('data', chunk => {
          if (socket.writable && !socket.destroyed) {
            sendWebSocketMessage(socket, chunk.toString());
          }
        });

        upstream.data.on('end', () => {
          if (socket.writable && !socket.destroyed) {
            socket.end();
          }
        });

        upstream.data.on('error', (err) => {
          logger.error('Stream error:', err);
          if (socket.writable && !socket.destroyed) {
            sendWebSocketMessage(socket, JSON.stringify({ error: 'Stream error' }));
            socket.end();
          }
        });
      } catch (err) {
        logger.error('WebSocket error:', err);
        if (socket.writable && !socket.destroyed) {
          sendWebSocketMessage(socket, JSON.stringify({ error: 'WebSocket error' }));
          socket.end();
        }
      }
    });
    
    socket.on('close', () => {
      wsConnections.chat.delete(socket);
      logger.info('Chat WebSocket client disconnected');
    });
  }
  
  // Status WebSocket handler
  async function handleStatusWebSocket(socket) {
    logger.info('DB status WebSocket client connected');
    wsConnections.status.add(socket);
    
    // Add error handler
    socket.on('error', (error) => {
      logger.error('Status WebSocket error:', error);
      wsConnections.status.delete(socket);
    });
    
    try {
      // Get initial collection status from database
      const { getDbClient } = require('./utils/dbFactory');
      const db = getDbClient();
      
      // Get collection list and counts
      const collections = await db.listCollections();
      const statusData = {
        timestamp: new Date().toISOString(),
        collections: {},
        collectionList: collections,
        totalCollections: collections.length
      };
      
      // Add runtime collection counts from memory
      Object.keys(collectionCounts).forEach(collection => {
        statusData.collections[collection] = {
          count: collectionCounts[collection],
          lastUpdated: new Date().toISOString()
        };
      });
      
      // Send initial status
      sendWebSocketMessage(socket, JSON.stringify(statusData));
      
    } catch (error) {
      logger.error('Error getting collection status:', error);
      if (socket.writable && !socket.destroyed) {
        sendWebSocketMessage(socket, JSON.stringify({
          error: 'Failed to get collection status',
          timestamp: new Date().toISOString()
        }));
      }
    }
    
    socket.on('close', () => {
      wsConnections.status.delete(socket);
      logger.info('DB status WebSocket client disconnected');
    });
  }
  
  // WebSocket frame parser
  function parseWebSocketFrame(buffer) {
    if (buffer.length < 2) return null;
    
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    const opcode = firstByte & 0x0f;
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    
    let offset = 2;
    
    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = buffer.readUInt32BE(offset + 4);
      offset += 8;
    }
    
    if (masked) {
      const maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
      
      const payload = buffer.slice(offset, offset + payloadLength);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
      
      return { opcode, payload };
    }
    
    return { opcode, payload: buffer.slice(offset, offset + payloadLength) };
  }
  
  // Send WebSocket message
  function sendWebSocketMessage(socket, message) {
    // Check if socket is still writable and not destroyed
    if (!socket || socket.destroyed || !socket.writable) {
      return false;
    }
    
    try {
      const payload = Buffer.from(message);
      const payloadLength = payload.length;
      
      let frame;
      if (payloadLength < 126) {
        frame = Buffer.allocUnsafe(2);
        frame[0] = 0x81; // FIN + text frame
        frame[1] = payloadLength;
      } else if (payloadLength < 65516) {
        frame = Buffer.allocUnsafe(4);
        frame[0] = 0x81;
        frame[1] = 126;
        frame.writeUInt16BE(payloadLength, 2);
      } else {
        frame = Buffer.allocUnsafe(10);
        frame[0] = 0x81;
        frame[1] = 127;
        frame.writeUInt32BE(0, 2);
        frame.writeUInt32BE(payloadLength, 6);
      }
      
      socket.write(Buffer.concat([frame, payload]));
      return true;
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
      // Remove the socket from connections if it's broken
      wsConnections.chat.delete(socket);
      wsConnections.status.delete(socket);
      return false;
    }
  }

  dbEvents.on('new-items', async ({ collection, count }) => {
    collectionCounts[collection] = (collectionCounts[collection] || 0) + count;
    
    try {
      // Get updated collection list from database
      const { getDbClient } = require('./utils/dbFactory');
      const db = getDbClient();
      const collections = await db.listCollections();
      
      const statusUpdate = {
        type: 'collection-update',
        timestamp: new Date().toISOString(),
        collection,
        newCount: collectionCounts[collection],
        totalCollections: collections.length,
        collections: {
          [collection]: {
            count: collectionCounts[collection],
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
      // Send to all status WebSocket clients - with proper error handling
      const messagesToSend = JSON.stringify(statusUpdate);
      const deadSockets = [];
      
      wsConnections.status.forEach((socket) => {
        if (!sendWebSocketMessage(socket, messagesToSend)) {
          deadSockets.push(socket);
        }
      });
      
      // Clean up dead sockets
      deadSockets.forEach(socket => wsConnections.status.delete(socket));
      
    } catch (error) {
      logger.error('Error sending collection update:', error);
      
      // Fallback to simple update if database query fails
      const fallbackMessage = JSON.stringify({ 
        type: 'collection-update',
        collection, 
        count: collectionCounts[collection],
        timestamp: new Date().toISOString()
      });
      
      const deadSockets = [];
      wsConnections.status.forEach((socket) => {
        if (!sendWebSocketMessage(socket, fallbackMessage)) {
          deadSockets.push(socket);
        }
      });
      
      // Clean up dead sockets
      deadSockets.forEach(socket => wsConnections.status.delete(socket));
    }
  });

  // WebSocket heartbeat and cleanup
  const interval = setInterval(() => {
    // Clean up dead connections
    const deadChatSockets = [];
    const deadStatusSockets = [];
    
    wsConnections.chat.forEach((socket) => {
      if (!socket.writable || socket.destroyed) {
        deadChatSockets.push(socket);
      }
    });
    
    wsConnections.status.forEach((socket) => {
      if (!socket.writable || socket.destroyed) {
        deadStatusSockets.push(socket);
      }
    });
    
    // Remove dead sockets
    deadChatSockets.forEach(socket => wsConnections.chat.delete(socket));
    deadStatusSockets.forEach(socket => wsConnections.status.delete(socket));
    
    // Log active connections
    if (wsConnections.chat.size > 0 || wsConnections.status.size > 0) {
      logger.info(`Active WebSocket connections - Chat: ${wsConnections.chat.size}, Status: ${wsConnections.status.size}`);
    }
  }, 30000);

  // Start HTTP server
  httpServer.listen(PORT, () => {
    electronLog(`🐼 TunnelPanda listening on http://localhost:${PORT}`);
    electronLog('📡 WebSocket: /api/chat');
    electronLog('📡 WebSocket: /db/status');
    electronLog('✅ Server started successfully');
    
    // Send ready message to Electron
    if (isElectronChild && process.send) {
      process.send({ type: 'ready', port: PORT, message: 'TunnelPanda server is ready' });
    }
  });
}

module.exports = app;