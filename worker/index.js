/**
 * Cloudflare Worker entry point for the portfolio site.
 *
 * Provides:
 * - GET /api/visit for the visitor counter
 * - GET /api/messages for recent appreciation messages
 * - POST /api/message for new appreciation messages
 * - CORS support for browser requests
 * - KV-based rate limiting for write requests
 */

const MAX_MESSAGE_LENGTH = 280;
const DEFAULT_MESSAGE_LIMIT = 10;
const MAX_MESSAGE_HISTORY = 100;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

/**
 * @param {Request} request
 * @returns {Headers}
 */
function buildCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return headers;
}

/**
 * @param {number} status
 * @param {object} body
 * @param {Headers} headers
 * @returns {Response}
 */
function jsonResponse(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * @param {KVNamespace} kv
 * @param {string} key
 * @returns {Promise<any>}
 */
async function readJson(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * @param {Request} request
 * @returns {string}
 */
function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * @param {Request} request
 * @param {KVNamespace} kv
 * @param {string} path
 * @returns {Promise<Response|null>}
 */
async function enforceRateLimit(request, kv, path) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `ratelimit:${ip}:${path}`;
  const stored = await readJson(kv, key);

  let bucket = { count: 0, windowStart: now };
  if (stored && typeof stored === 'object') {
    bucket = stored;
  }

  if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_SECONDS * 1000) {
    bucket = { count: 0, windowStart: now };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonResponse(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Too many requests. Please try again shortly.',
    }, buildCorsHeaders(request));
  }

  bucket.count += 1;
  await kv.put(key, JSON.stringify(bucket), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 10 });
  return null;
}

/**
 * @param {unknown} input
 * @returns {{ok: boolean, message?: string, error?: string}}
 */
function validateMessage(input) {
  if (typeof input !== 'string') {
    return { ok: false, error: 'invalid_input', message: 'Message must be a text string.' };
  }

  const text = input.trim();
  if (!text) {
    return { ok: false, error: 'invalid_input', message: 'Message is required.' };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: 'invalid_input', message: 'Message exceeds the maximum length.' };
  }

  if (/<\s*script|<\s*iframe|javascript\s*:|on\w+\s*=|<\s*img\s+src/i.test(text)) {
    return { ok: false, error: 'invalid_input', message: 'Message contains unsafe content.' };
  }

  return { ok: true, message: text };
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<Response>}
 */
async function handleVisit(request, env) {
  const url = new URL(request.url);
  const corsHeaders = buildCorsHeaders(request);
  const track = url.searchParams.get('track') === '1';

  let count = 0;
  const current = await readJson(env.KV, 'visit:counter');
  if (current && typeof current.count === 'number') {
    count = current.count;
  }

  if (track) {
    const ip = getClientIp(request);
    const dedupeKey = `visit:dedupe:${ip}:${Math.floor(Date.now() / 60000)}`;
    const alreadyTracked = await env.KV.get(dedupeKey);

    if (!alreadyTracked) {
      count += 1;
      await env.KV.put('visit:counter', JSON.stringify({ count, updatedAt: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 30 });
      await env.KV.put(dedupeKey, '1', { expirationTtl: 120 });
    }
  }

  return jsonResponse(200, { ok: true, count, tracked: track, generatedAt: new Date().toISOString() }, corsHeaders);
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<Response>}
 */
async function handleMessages(request, env) {
  const corsHeaders = buildCorsHeaders(request);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || DEFAULT_MESSAGE_LIMIT, 1), 50);

  const stored = await readJson(env.KV, 'wall:messages');
  const messages = Array.isArray(stored) ? stored : [];

  const recent = messages
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit)
    .map((message) => ({ id: message.id || 'unknown', text: String(message.text || ''), createdAt: message.createdAt || new Date().toISOString() }));

  return jsonResponse(200, { ok: true, messages: recent }, corsHeaders);
}

/**
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<Response>}
 */
async function handleMessage(request, env) {
  const corsHeaders = buildCorsHeaders(request);

  const rateLimited = await enforceRateLimit(request, env.KV, 'post:/api/message');
  if (rateLimited) return rateLimited;

  let payload;
  try { payload = await request.json(); }
  catch { return jsonResponse(400, { ok: false, error: 'invalid_json', message: 'Request body must be valid JSON.' }, corsHeaders); }

  const validation = validateMessage(payload && payload.text);
  if (!validation.ok) {
    return jsonResponse(400, { ok: false, error: validation.error, message: validation.message }, corsHeaders);
  }

  const stored = await readJson(env.KV, 'wall:messages');
  const messages = Array.isArray(stored) ? stored : [];

  const message = { id: `msg_${Date.now()}`, text: validation.message, createdAt: new Date().toISOString() };
  messages.unshift(message);
  const trimmed = messages.slice(0, MAX_MESSAGE_HISTORY);

  await env.KV.put('wall:messages', JSON.stringify(trimmed), { expirationTtl: 60 * 60 * 24 * 30 });

  return jsonResponse(200, { ok: true, message }, corsHeaders);
}

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
    }

    if (url.pathname === '/api/visit') return handleVisit(request, env);
    if (url.pathname === '/api/messages') return handleMessages(request, env);
    if (url.pathname === '/api/message') return handleMessage(request, env);

    return jsonResponse(404, { ok: false, error: 'not_found', message: 'Route not found.' }, buildCorsHeaders(request));
  },
};
