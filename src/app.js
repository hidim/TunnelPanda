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
const cfg        = require('./config');

const PORT = Number(process.env.PORT) || 16014;
const app  = express();

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

// go!
app.listen(PORT, () =>
  console.log(`🐼  Tunnel Panda listening on http://localhost:${PORT}`)
);