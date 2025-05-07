const basicAuth = require('basic-auth');
const cfg = require('../config');

function authenticate(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== cfg.auth.user || user.pass !== cfg.auth.pass) {
    res.set('WWW-Authenticate', 'Basic realm="TunnelPanda"');
    return res.status(401).send('Authentication required.');
  }

  const token = req.get('X-APP-TOKEN');
  if (!token || token !== cfg.auth.appToken) {
    return res.status(403).send('Invalid or missing X-APP-TOKEN');
  }

  next();
}

module.exports = authenticate;
