import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const output = resolve('artifacts/optical-geometry'); await mkdir(output, { recursive: true });
const report = { errors: [], cases: [] }, browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage(); await page.routeWebSocket('**', () => {});
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram/i.test(m.text())) report.errors.push(m.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/scripts/fixtures/optical-geometry.html`);
  await page.waitForFunction(() => window.opticalGeometryReady);
  report.cases = await page.evaluate(() => {
    const cases = [];
    for (const type of window.opticalGeometryTypes) for (const angle of [0, 0.45, 1.1, -0.45, -1.1]) {
      for (const height of [0.08, 0.5, 0.8]) for (const x of [0, 0.6, 0.9]) {
        for (const state of [{ vortex: false }, { vortex: true }, { tilted: true }]) {
          cases.push(window.opticalGeometryReference({ type, angle, height, x, ...state }));
        }
      }
    }
    return cases;
  });
  report.maximumError = Math.max(...report.cases.map(c => Math.abs(c.error)));
  report.performance = [];
  for (const type of ['beaker', 'flask', 'test_tube']) {
    report.performance.push(await page.evaluate(type => {
      window.opticalGeometryReference({ type, angle: 0.45, height: 0.5, x: 0, vortex: true });
      return { type, ...window.opticalGeometryBenchmark() };
    }, type));
  }
  report.failures = report.cases.filter(c => Math.abs(c.error) > 0.025);
  console.log(JSON.stringify({ count: report.cases.length, maximumError: report.maximumError, failures: report.failures.length,
    worst: [...report.failures].sort((a, b) => Math.abs(b.error) - Math.abs(a.error)).slice(0, 8), errors: report.errors, performance: report.performance }));
  if (!process.env.OPTICAL_GEOMETRY_BASELINE) assert.equal(report.failures.length + report.errors.length, 0);
} finally { await browser.close(); await writeFile(resolve(output, process.env.OPTICAL_GEOMETRY_BASELINE ? 'baseline.json' : 'audit.json'), JSON.stringify(report, null, 2)); }
