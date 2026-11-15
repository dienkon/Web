import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { chemicalSource } from '../../scripts/chemical-names.mjs';

const source = await readFile('src/data/hazardSymbols.ts', 'utf8');
const transformed = chemicalSource(source, 'hazardSymbols.ts');
const { code } = await transform(transformed, { loader: 'ts', format: 'esm' });
const { HAZARD_SYMBOLS, WALL_HAZARD_SYMBOLS } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
assert.equal(HAZARD_SYMBOLS.length, 11);
assert.equal(WALL_HAZARD_SYMBOLS.length, 9);
for (const symbol of HAZARD_SYMBOLS) await access('public' + symbol.image);
assert.equal(WALL_HAZARD_SYMBOLS.find(s => s.id === 'oxidizing').image, '/SYMBOLS-IMG/bien-bao-chat-oxy-hoa.png');
console.log('PASS chemical-name build preserves all 11 real asset paths');

const compiled = await build({ entryPoints: ['src/compat/TimerClock.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const savedPerformance = globalThis.performance;
const savedDocument = globalThis.document;
let now = 1000;
globalThis.performance = { now: () => now };
globalThis.document = Object.assign(new EventTarget(), { hidden: false });
try {
  const { TimerClock } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  const clock = new TimerClock();
  assert.equal(clock.getDelta(), 0);
  now += 250;
  assert.equal(clock.getDelta(), .25);
  now += 150;
  assert.equal(clock.getElapsedTime(), .4);
  clock.stop();
  now += 4000;
  assert.equal(clock.getDelta(), 0);
  assert.equal(clock.elapsedTime, .4);
  clock.start();
  assert.equal(clock.elapsedTime, 0);
  now += 100;
  assert.equal(clock.getDelta(), .1);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  now += 10000;
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(clock.getDelta(), 0, 'resume must not advance simulation by hidden time');
  now += 20;
  assert.equal(clock.getDelta(), .02);
  assert.ok(Math.abs(clock.elapsedTime - .12) < 1e-9);
  const manual = new TimerClock(false);
  assert.equal(manual.getDelta(), 0);
  manual.elapsedTime = 12;
  assert.equal(manual.getElapsedTime(), 12, 'R3F advance() can own elapsedTime in never mode');
  console.log('PASS Timer adapter auto/manual start, stop, elapsed time and tab visibility');
} finally {
  globalThis.performance = savedPerformance;
  if (savedDocument === undefined) delete globalThis.document;
  else globalThis.document = savedDocument;
}
