import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir('pages-dist', { recursive: true });
await cp('public', 'pages-dist', { recursive: true });
const seed = JSON.parse(await readFile('data/students.json', 'utf8'));
await writeFile('pages-dist/records.json', JSON.stringify({ students: seed.students, updatedAt: seed.importedAt, revision: 'published-snapshot' }));
await writeFile('pages-dist/.nojekyll', '');
await writeFile('pages-dist/config.js', "window.ATHAR_CONFIG = { apiBaseUrl: 'https://athar-school-hours.toughechidna2.chatgpt.site', snapshotUrl: './records.json' };\n");
