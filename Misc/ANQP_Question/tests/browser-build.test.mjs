import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { Script } from 'node:vm';
import { browserBundle } from '../scripts/build-browser.mjs';

test('Browser bundle matches source and parses as a classic script', async () => {
  const bundle = await readFile(new URL('../src/browser.js', import.meta.url), 'utf8');
  assert.equal(bundle, await browserBundle(), 'Run node scripts/build-browser.mjs after editing source');
  assert.doesNotThrow(() => new Script(bundle));
});

test('All four entry pages use an existing deferred classic script for file:// support', async () => {
  for (const page of ['index.html', 'on-bai.html', 'o-chu.html', 'luyen-tap.html']) {
    const url = new URL(`../${page}`, import.meta.url);
    const html = await readFile(url, 'utf8');
    assert.doesNotMatch(html, /<script[^>]*type\s*=\s*["']module["']/i, page);
    const scripts = [...html.matchAll(/<script\s+defer\s+src="([^"]+)"/g)];
    assert.equal(scripts.length, 1, page);
    assert.equal(scripts[0][1], './src/browser.js', page);
    await access(new URL(scripts[0][1], url));
  }
});
