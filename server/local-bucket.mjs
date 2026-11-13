import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// Development-only adapter: R2-style conditional writes, persisted outside Git.
export class LocalBucket {
  constructor(directory) { this.directory = directory; this.locks = new Map(); }
  path(key) { return join(this.directory, `${createHash('sha256').update(key).digest('hex')}.json`); }
  async record(key) {
    try { return JSON.parse(await readFile(this.path(key), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async get(key) {
    const record = await this.record(key);
    if (!record) return null;
    return { etag: record.etag, text: async () => record.value, json: async () => JSON.parse(record.value) };
  }
  async put(key, value, options = {}) {
    const previous = this.locks.get(key) || Promise.resolve();
    let unlock;
    const gate = new Promise(resolve => { unlock = resolve; });
    const next = previous.then(() => gate);
    this.locks.set(key, next);
    await previous;
    try {
      const record = await this.record(key);
      const condition = options.onlyIf || {};
      if (condition.etagMatches && record?.etag !== condition.etagMatches) return null;
      if (condition.etagDoesNotMatch === '*' && record) return null;
      const etag = randomUUID();
      await mkdir(this.directory, { recursive: true });
      const temp = `${this.path(key)}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify({ etag, value: String(value) }), { mode: 0o600 });
      await rename(temp, this.path(key));
      return { etag };
    } finally { unlock(); if (this.locks.get(key) === next) this.locks.delete(key); }
  }
}
