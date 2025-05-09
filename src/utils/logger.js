// src/utils/logger.js
// Winston-based logger for TunnelPanda. Logs messages to daily rotating log files in JSON format.
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs', `panda-${new Date().toISOString().split('T')[0]}.log`)
    })
  ]
});

module.exports = logger;