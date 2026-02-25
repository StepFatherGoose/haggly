function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing environment variable: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

function json(res, statusCode, body) {
  res.status(statusCode);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

function methodNotAllowed(req, res, methods) {
  res.setHeader('Allow', methods.join(', '));
  json(res, 405, { error: 'Method not allowed' });
}

module.exports = { requireEnv, json, methodNotAllowed };
