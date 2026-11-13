import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../server/app.mjs';
import { LocalBucket } from '../server/local-bucket.mjs';
const origin = 'https://school.example';
const seed = { importedAt: '2026-11-13T00:00:00Z', students: [
  { id: '101-01', classId: '101', nameAr: 'طالب أول', hours: 10, recorded: true },
  { id: '202-01', classId: '202', nameAr: 'طالب ثان', hours: 0, recorded: false },
] };
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'athar-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env = { ADMIN_PASSWORD: 'test-password', SESSION_SECRET: 'test-session-secret-with-at-least-32-characters', BUCKET: new LocalBucket(directory) };
  const handler = createHandler({ assets: { '/index.html': { body: '<html lang="ar"></html>', type: 'text/html' } }, seed });
  const request = (path, options = {}) => handler(new Request(origin + path, options), env);
  const post = (path, body, cookie, extraHeaders = {}) => request(path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders }, body: JSON.stringify(body) });
  const login = async () => { const response = await post('/api/login', { password: env.ADMIN_PASSWORD }); assert.equal(response.status, 200); return response.headers.get('Set-Cookie').split(';')[0]; };
  const patch = (changes, revision, cookie) => request('/api/students', { method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ changes, revision }) });
  return { env, handler, request, post, login, patch, directory };
}
test('public roster is readable; writes require authentication; sessions never expose secrets', async t => {
  const { request, patch, login, env } = await fixture(t);
  const snapshot = await (await request('/api/students')).json();
  assert.equal(snapshot.students.length, 2);
  assert.equal((await patch([{ id: '101-01', hours: 20 }], snapshot.revision)).status, 401);
  assert.deepEqual(await (await request('/api/session')).json(), { authenticated: false });
  const cookie = await login();
  assert.equal(cookie.includes(env.ADMIN_PASSWORD), false);
  assert.equal(cookie.includes(env.SESSION_SECRET), false);
  assert.deepEqual(await (await request('/api/session', { headers: { Cookie: cookie } })).json(), { authenticated: true });
  assert.deepEqual(await (await request('/api/session', { headers: { Cookie: `${cookie}tampered` } })).json(), { authenticated: false });
});
test('successful edits persist across handler and bucket instances, and zero becomes recorded', async t => {
  const { request, patch, login, env, directory } = await fixture(t);
  const before = await (await request('/api/students')).json();
  const cookie = await login();
  const result = await patch([{ id: '101-01', hours: 14.25 }, { id: '202-01', hours: 0 }], before.revision, cookie);
  assert.equal(result.status, 200);
  const saved = await result.json();
  assert.notEqual(saved.revision, before.revision);
  const reopened = createHandler({ seed });
  const loaded = await (await reopened(new Request(origin + '/api/students'), { ...env, BUCKET: new LocalBucket(directory) })).json();
  assert.equal(loaded.students[0].hours, 14.25);
  assert.equal(loaded.students[1].recorded, true);
  assert.equal(loaded.revision, saved.revision);
});
test('concurrent first saves and stale revisions cannot overwrite each other', async t => {
  const { request, patch, login } = await fixture(t);
  const before = await (await request('/api/students')).json();
  const cookie = await login();
  const responses = await Promise.all([patch([{ id: '101-01', hours: 20 }], before.revision, cookie), patch([{ id: '101-01', hours: 30 }], before.revision, cookie)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal((await patch([{ id: '101-01', hours: 100 }], before.revision, cookie)).status, 409);
});
test('rejects invalid, duplicate, unknown and excessively precise hours without changing data', async t => {
  const { request, patch, login } = await fixture(t);
  const before = await (await request('/api/students')).json();
  const cookie = await login();
  for (const hours of [-1, 100001, 1.234, '20', null]) assert.equal((await patch([{ id: '101-01', hours }], before.revision, cookie)).status, 400);
  assert.equal((await patch([{ id: '101-01', hours: 2 }, { id: '101-01', hours: 3 }], before.revision, cookie)).status, 400);
  assert.equal((await patch([{ id: 'missing', hours: 2 }], before.revision, cookie)).status, 400);
  assert.deepEqual(await (await request('/api/students')).json(), before);
});
test('rejects cross-origin and absent-origin writes; CORS only permits a configured read origin', async t => {
  const { request, post, env } = await fixture(t);
  assert.equal((await post('/api/login', { password: env.ADMIN_PASSWORD }, null, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/login', { method: 'POST', body: '{}' })).status, 403);
  env.PUBLIC_ORIGIN = 'https://school.github.io';
  const read = await request('/api/students', { headers: { Origin: env.PUBLIC_ORIGIN } });
  assert.equal(read.headers.get('Access-Control-Allow-Origin'), env.PUBLIC_ORIGIN);
  const badRead = await request('/api/students', { headers: { Origin: 'https://evil.example' } });
  assert.equal(badRead.headers.get('Access-Control-Allow-Origin'), null);
  const cors = await request('/api/students', { method: 'OPTIONS', headers: { Origin: env.PUBLIC_ORIGIN } });
  assert.equal(cors.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');
});
test('rate limit persists and serializes simultaneous login attempts', async t => {
  const { post, env, directory } = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 9 }, () => post('/api/login', { password: 'wrong' })));
  assert.equal(responses.filter(r => r.status === 401).length, 5);
  assert.equal(responses.filter(r => r.status === 429).length, 4);
  const reopened = createHandler({ seed });
  const response = await reopened(new Request(origin + '/api/login', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ password: env.ADMIN_PASSWORD }) }), { ...env, BUCKET: new LocalBucket(directory) });
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('Retry-After')) > 0);
});
test('missing secrets or storage fail closed for editing and cookies use secure flags', async t => {
  const { env, handler, post } = await fixture(t);
  const good = await post('/api/login', { password: env.ADMIN_PASSWORD });
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure']) assert.ok(good.headers.get('Set-Cookie').includes(flag));
  for (const key of ['ADMIN_PASSWORD', 'SESSION_SECRET', 'BUCKET']) {
    const incomplete = { ...env }; delete incomplete[key];
    const response = await handler(new Request(origin + '/api/login', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ password: 'test-password' }) }), incomplete);
    assert.equal(response.status, 503);
  }
  const logout = await post('/api/logout', {});
  assert.ok(logout.headers.get('Set-Cookie').includes('Max-Age=0'));
});
test('serves only known files and sets browser security headers', async t => {
  const { request } = await fixture(t);
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.ok(page.headers.get('Content-Security-Policy').includes("script-src 'self'"));
  assert.equal((await request('/.dev.vars')).status, 404);
  assert.equal((await request('/server/app.mjs')).status, 404);
});
