import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../server/app.mjs';
import { LocalBucket } from '../server/local-bucket.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
function option(names, fallback) { for (const name of names) { const index = args.indexOf(name); if (index !== -1 && args[index + 1]) return args[index + 1]; } return fallback; }
const host = option(['--host', '--hostname'], '127.0.0.1');
const port = Number(option(['--port'], '5173'));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const bucket = new LocalBucket(resolve(root, '.local/bucket'));
async function environment() {
  const values = {};
  try {
    for (const line of (await readFile(resolve(root, '.dev.vars'), 'utf8')).split(/\r?\n/)) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if (value.startsWith('"')) { try { value = JSON.parse(value); } catch {} }
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      values[match[1]] = value;
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const key of ['ADMIN_PASSWORD', 'SESSION_SECRET', 'PUBLIC_ORIGIN']) if (process.env[key]) values[key] = process.env[key];
  return { ...values, BUCKET: bucket };
}
async function assets(path) {
  const target = resolve(root, 'public', `.${path}`);
  if (!target.startsWith(`${resolve(root, 'public')}${sep}`)) return null;
  try { return { body: new Uint8Array(await readFile(target)), type: mime[extname(target)] || 'application/octet-stream' }; }
  catch (error) { if (['ENOENT', 'EISDIR'].includes(error.code)) return null; throw error; }
}
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) { size += chunk.length; if (size > 65536) { outgoing.writeHead(413); outgoing.end('Request too large'); return; } chunks.push(chunk); }
    const origin = `http://${incoming.headers.host || `${host}:${port}`}`;
    const request = new Request(new URL(incoming.url, origin), { method: incoming.method, headers: incoming.headers, ...(['GET', 'HEAD'].includes(incoming.method) ? {} : { body: Buffer.concat(chunks) }) });
    const seed = JSON.parse(await readFile(resolve(root, 'data/students.json'), 'utf8'));
    const response = await createHandler({ assets, seed })(request, await environment());
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(503, { 'Content-Type': 'text/plain' }); outgoing.end('Preview unavailable. Check server setup.'); }
});
server.on('error', error => { console.error(`Preview server failed: ${error.code || error.name}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Athar preview listening on http://${host}:${port}`));
