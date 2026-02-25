const { createAdminAuthClient } = require('./supabase');

function getBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error('Missing bearer token');
    err.statusCode = 401;
    throw err;
  }

  const supabase = createAdminAuthClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    const err = new Error(error?.message || 'Invalid auth token');
    err.statusCode = 401;
    throw err;
  }

  return data.user;
}

module.exports = { getBearerToken, requireUser };
