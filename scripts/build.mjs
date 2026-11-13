import { siteAssets } from './site-assets.mjs';
import { mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const assets = {};
for (const assetPath of siteAssets) {
  const bytes = await readFile(join(root, assetPath));
  assets[`/${assetPath}`] = { body: bytes.toString('base64'), encoding: 'base64', type: mime[extname(assetPath)] || 'application/octet-stream' };
}
for (const path of ['/index.html', '/class.html', '/admin.html']) if (!assets[path]) throw new Error(`Missing page: ${path}`);
const seed = JSON.parse(await readFile(join(root, 'data/students.json'), 'utf8'));
if (!Array.isArray(seed.students) || !seed.students.length) throw new Error('Student data is required.');
const ids = new Set();
const classes = new Set(['101', '102', '103', '201', '202', '301', '302']);
for (const student of seed.students) {
  if (typeof student.id !== 'string' || ids.has(student.id) || !classes.has(String(student.classId)) || typeof student.nameAr !== 'string' || !student.nameAr.trim() || !Number.isFinite(student.hours) || student.hours < 0 || typeof student.recorded !== 'boolean') throw new Error(`Invalid student record: ${student.id}`);
  ids.add(student.id);
}
const hosting = JSON.parse(await readFile(join(root, '.openai/hosting.json'), 'utf8'));
if (!hosting.project_id) throw new Error('Set a Sites project_id before building.');
const serverSource = await readFile(join(root, 'server/app.mjs'), 'utf8');
const output = `${serverSource}\nconst deployedHandler = createHandler({ assets: ${JSON.stringify(assets)}, seed: ${JSON.stringify(seed)} });\nexport default { fetch: deployedHandler };\n`;
await rm(join(root, 'dist'), { recursive: true, force: true });
await mkdir(join(root, 'dist/server'), { recursive: true });
await mkdir(join(root, 'dist/.openai'), { recursive: true });
await writeFile(join(root, 'dist/server/index.js'), output);
await copyFile(join(root, '.openai/hosting.json'), join(root, 'dist/.openai/hosting.json'));
console.log(`Built ${Object.keys(assets).length} assets and ${seed.students.length} students (${Buffer.byteLength(output)} bytes).`);
