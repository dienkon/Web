import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('artifacts/suspension-optical-reference');
await mkdir(output, { recursive: true });
const report = { errors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.routeWebSocket('**', () => {});
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram/i.test(m.text())) report.errors.push(m.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/scripts/fixtures/optical-reference.html`);
  await page.waitForFunction(() => window.opticalReady);
  for (const scale of [0.25, 0.5, 1, 2]) {
    const pixel = await page.evaluate(scale => window.opticalReference({ scale }), scale);
    const expected = 1 - 0.6 ** (2 * scale);
    assert(Math.abs(pixel[0] / 255 - expected) < 0.015, JSON.stringify({ scale, expected, pixel }));
    report.cases.push({ scale_cmPerModelUnit: scale, expected, measured: pixel[0] / 255 });
  }
  const normal = await page.evaluate(() => window.opticalReference({ scale: 0.5 }));
  const offset = await page.evaluate(() => window.opticalReference({ scale: 0.5, orthographicOffset: 0.8 }));
  assert(Math.abs(normal[0] - offset[0]) <= 1, 'Orthographic translation must not create perspective rays');
  const redFront = await page.evaluate(() => window.opticalReference({ mixed: true, color: true }));
  const blueFront = await page.evaluate(() => window.opticalReference({ mixed: true, color: true, reverse: true }));
  assert(redFront[0] > redFront[2] * 2 && blueFront[2] > blueFront[0] * 2, JSON.stringify({ redFront, blueFront }));
  report.mixed = { redFront, blueFront }; report.orthographic = { normal, offset };
  report.chords = [];
  for (const rayX of [0.5, 0.9, 0.98]) {
    const pixel = await page.evaluate(rayX => window.opticalReference({ scale: 0.5, rayX }), rayX);
    // Pixel center is 1/128 model unit to the right of the camera center.
    const expected = 1 - 0.6 ** Math.sqrt(1 - (rayX + 1 / 128) ** 2);
    assert(Math.abs(pixel[0] / 255 - expected) < 0.015, JSON.stringify({ rayX, expected, pixel }));
    report.chords.push({ rayX, expected, measured: pixel[0] / 255 });
  }
  report.concentrated = [];
  for (const opticalDepth of [0, 20, 40]) {
    const pixel = await page.evaluate(opticalDepth => window.opticalReference({ scale: 0.025, opticalDepth }), opticalDepth);
    const expected = 1 - Math.exp(-opticalDepth * 0.05);
    assert(Math.abs(pixel[0] / 255 - expected) < 0.015, JSON.stringify({ opticalDepth, expected, pixel }));
    report.concentrated.push({ opticalDepth, expected, measured: pixel[0] / 255 });
  }
  await page.screenshot({ path: resolve(output, 'gpu-reference.png') });
  assert.equal(report.errors.length, 0, JSON.stringify(report));
} finally {
  await browser.close();
  await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
