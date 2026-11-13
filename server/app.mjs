const STATE_KEY = 'school-state.json';
const SESSION_COOKIE = 'athar_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;
const encoder = new TextEncoder();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
function error(code, status, message) { return json({ code, error: message }, status); }
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
function decode64(value) { return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0)); }
async function digest(value) { return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function equalSecrets(a, b) {
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let different = 0;
  for (let i = 0; i < left.length; i++) different |= left[i] ^ right[i];
  return different === 0;
}
async function hmacKey(secret) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function makeSession(secret) {
  const payload = base64url(encoder.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, nonce: crypto.randomUUID() })));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}
function configured(env) { return typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length > 0 && typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32 && !!env.BUCKET; }
async function authenticated(request, env) {
  if (!configured(env)) return false;
  const value = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!value || value.length > 1024) return false;
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return false;
    const [payload, signature] = parts;
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.SESSION_SECRET), decode64(signature), encoder.encode(payload));
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(decode64(payload)));
    return Number.isInteger(data.exp) && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
function cookie(request, value, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
async function bodyJson(request) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > 65536) throw new Error('body_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Count attempts durably before password verification. Conditional writes prevent
// concurrent requests from bypassing the five-attempt limit.
async function reserveLoginAttempt(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local-or-unidentified';
  const key = `auth-attempts/${base64url(await digest(ip))}.json`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const object = await env.BUCKET.get(key);
    const previous = object ? await object.json() : null;
    const now = Date.now();
    const current = previous && previous.windowStart > now - RATE_WINDOW_MS ? previous : { windowStart: now, count: 0 };
    if (current.count >= RATE_MAX) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.windowStart + RATE_WINDOW_MS - now) / 1000)) };
    const written = await env.BUCKET.put(key, JSON.stringify({ ...current, count: current.count + 1 }), {
      onlyIf: object ? { etagMatches: object.etag } : { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'application/json' },
    });
    if (written) return { allowed: true };
  }
  return { allowed: false, retryAfter: 1 };
}

function withSecurity(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  return new Response(response.body, { status: response.status, headers });
}

export function createHandler({ assets = {}, seed }) {
  if (!seed || !Array.isArray(seed.students)) throw new Error('A valid student seed is required.');
  const initialPromise = digest(JSON.stringify(seed.students)).then(hash => ({
    students: seed.students,
    updatedAt: seed.importedAt || null,
    revision: `seed-${base64url(hash).slice(0, 24)}`,
  }));
  async function load(env) {
    const object = env.BUCKET ? await env.BUCKET.get(STATE_KEY) : null;
    return { snapshot: object ? await object.json() : await initialPromise, etag: object?.etag || null };
  }
  async function route(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin');
    const readCors = path === '/api/students' && env.PUBLIC_ORIGIN && origin === env.PUBLIC_ORIGIN;
    const corsHeaders = readCors ? { 'Access-Control-Allow-Origin': env.PUBLIC_ORIGIN, Vary: 'Origin' } : {};
    if (method === 'OPTIONS' && path === '/api/students' && readCors) return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600' } });

    if (path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method) && origin !== url.origin) return error('forbidden_origin', 403, 'This action must be submitted from this website.');
    if (path === '/api/students' && method === 'GET') return json((await load(env)).snapshot, 200, corsHeaders);
    if (path === '/api/session' && method === 'GET') return json({ authenticated: await authenticated(request, env) });
    if (path === '/api/login' && method === 'POST') {
      if (!configured(env)) return error('unavailable', 503, 'Hour editing is not configured on this host.');
      let data;
      try { data = await bodyJson(request); } catch { return error('invalid_password', 400, 'Enter a password.'); }
      if (typeof data?.password !== 'string' || data.password.length > 1024) return error('invalid_password', 400, 'Enter a valid password.');
      const attempt = await reserveLoginAttempt(request, env);
      if (!attempt.allowed) return json({ code: 'rate_limited', error: 'Too many login attempts. Try again later.', retryAfter: attempt.retryAfter }, 429, { 'Retry-After': String(attempt.retryAfter) });
      if (!await equalSecrets(data.password, env.ADMIN_PASSWORD)) return error('invalid_password', 401, 'Incorrect password.');
      return json({ authenticated: true }, 200, { 'Set-Cookie': cookie(request, await makeSession(env.SESSION_SECRET)) });
    }
    if (path === '/api/logout' && method === 'POST') return json({ authenticated: false }, 200, { 'Set-Cookie': cookie(request, '', 0) });
    if (path === '/api/students' && method === 'PATCH') {
      if (!configured(env)) return error('unavailable', 503, 'Hour editing is not configured on this host.');
      if (!await authenticated(request, env)) return error('unauthorized', 401, 'Sign in to edit student hours.');
      let data;
      try { data = await bodyJson(request); } catch { return error('invalid_changes', 400, 'The changes are not valid JSON.'); }
      if (!Array.isArray(data?.changes) || data.changes.length < 1 || data.changes.length > 500 || typeof data.revision !== 'string') return error('invalid_changes', 400, 'Provide changes and the current revision.');
      const ids = new Set();
      for (const change of data.changes) {
        if (!change || typeof change.id !== 'string' || ids.has(change.id) || typeof change.hours !== 'number' || !Number.isFinite(change.hours) || change.hours < 0 || change.hours > 100000 || Math.abs(change.hours * 100 - Math.round(change.hours * 100)) > 1e-7) return error('invalid_changes', 400, 'Each student needs a unique ID and a nonnegative hour total with up to two decimal places.');
        ids.add(change.id);
      }
      const { snapshot, etag } = await load(env);
      if (snapshot.revision !== data.revision) return error('conflict', 409, 'The records changed. Reload before saving again.');
      const studentIds = new Set(snapshot.students.map(student => student.id));
      if (data.changes.some(change => !studentIds.has(change.id))) return error('invalid_changes', 400, 'A student ID was not found.');
      const changes = new Map(data.changes.map(change => [change.id, change.hours]));
      const updated = {
        students: snapshot.students.map(student => changes.has(student.id) ? { ...student, hours: changes.get(student.id), recorded: true } : student),
        updatedAt: new Date().toISOString(),
        revision: crypto.randomUUID(),
      };
      const written = await env.BUCKET.put(STATE_KEY, JSON.stringify(updated), {
        onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: '*' },
        httpMetadata: { contentType: 'application/json' },
      });
      if (!written) return error('conflict', 409, 'The records changed. Reload before saving again.');
      return json(updated);
    }
    if (path.startsWith('/api/')) return error('not_found', 404, 'Endpoint not found.');
    if (!['GET', 'HEAD'].includes(method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const assetPath = path === '/' ? '/index.html' : path;
    const asset = typeof assets === 'function' ? await assets(assetPath) : assets[assetPath];
    if (!asset) return new Response('Page not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const body = asset.encoding === 'base64' ? decode64(asset.body) : asset.body;
    return new Response(method === 'HEAD' ? null : body, { headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache' } });
  }
  return async function fetch(request, env = {}) {
    try { return withSecurity(await route(request, env)); }
    catch (cause) {
      // Do not expose errors, request bodies, or environment values to visitors.
      console.error('Request failed', cause instanceof Error ? cause.name : 'UnknownError');
      return withSecurity(error('unavailable', 503, 'The records are temporarily unavailable. Please try again.'));
    }
  };
}
