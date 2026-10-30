import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only product audit: edits only isolated browser state, writes research
// evidence, and never calls the cloud reaction/AI endpoints.
const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(labRoot, 'docs/research/visual-upgrade-2026-10-28');
const origin = process.env.LAB_RESEARCH_ORIGIN || 'http://127.0.0.1:6773';
const sampleMs = Number(process.env.LAB_RESEARCH_SAMPLE_MS || 8000);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), origin, browser: browser.version(),
  sampleMs, methodology: 'Measurement after typecheck and tests finished, with HMR disabled. No JSON writes until the browser is closed. Wait for DOM and canvas readiness, not remote network idleness. Fresh browser contexts; local Vite development build; hardware WebGL. Viewport emulation is not physical mobile validation. FrameTelemetry samples, not GPU timer queries; postprocessing draw counts are incomplete. UI screenshots excluded from sampling. Three reaction starts include settling/completion tails, not constant-load stress.',
  scenarios: [], errors: [], consoleErrors: [] };

async function inspect(page) {
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    const { useFrameStats } = await import('/src/render/FrameTelemetry.tsx');
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const state = useAppStore.getState();
    return { quality: { preference: useQualityStore.getState().preference,
        tier: useQualityStore.getState().effectiveTier, rendererClass: useQualityStore.getState().rendererClass },
      stats: { ...useFrameStats.getState() },
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
      canvas: canvas ? { width: canvas.width, height: canvas.height,
        rect: { x: canvas.getBoundingClientRect().x, y: canvas.getBoundingClientRect().y,
          width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height } } : null,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      panels: { left: state.leftSidebarOpen, right: state.rightSidebarOpen },
      vessels: Object.values(state.vessels).map(v => ({ id: v.id, type: v.type, temperature_c: v.temperature_c,
        volume_ml: v.volume_ml, precipitateAmount_g: v.precipitateAmount_g,
        studioProgramId: v.studioProgramId, gas: v.hasGas })),
      kinetics: Object.entries(state.activeKinetics).map(([id, k]) => ({ id, reactionId: k.reactionId, progress: k.progress })) };
  });
}

async function capture(page, name, setup) {
  const setupResult = setup ? await setup() : null;
  await page.waitForTimeout(1800);
  const start = await inspect(page);
  const readings = [];
  const started = Date.now();
  while (Date.now() - started < sampleMs) {
    await page.waitForTimeout(1000);
    readings.push((await inspect(page)).stats);
  }
  const end = await inspect(page);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  const result = { name, setupResult, start, end, readings };
  report.scenarios.push(result);
  console.log(JSON.stringify({ name, renderer: end.renderer, quality: end.quality, readings }));
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  page.on('pageerror', error => report.errors.push({ device: 'desktop', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ device: 'desktop', message: message.text() }); });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(7000);
  await capture(page, 'desktop-auto');
  for (const tier of ['high', 'ultra']) {
    await capture(page, `desktop-${tier}`, () => page.evaluate(async tier => {
      const { useQualityStore } = await import('/src/vfx/quality.ts');
      const { getGlassMaterials } = await import('/src/vfx/materials/glass.ts');
      useQualityStore.getState().setPreference(tier);
      const material = getGlassMaterials(tier).front;
      return { frontType: material.type, frontTransmission: material.transmission ?? 0,
        frontOpacity: material.opacity, frontSide: material.side };
    }, tier));
  }
  await capture(page, 'desktop-three-reactions', () => page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    const { getAllHandcraftedPrograms } = await import('/src/vfx/programs/library/index.ts');
    useQualityStore.getState().setPreference('high');
    const programs = getAllHandcraftedPrograms();
    const selected = ['caco3_hcl', 'zn_cuso4', 'bacl2_na2so4'].map(prefix => programs.find(p => p.id === prefix || p.id.startsWith(prefix + '_')));
    if (selected.some(p => !p)) throw new Error('Missing a benchmark reaction program');
    return selected.map((p, i) => {
      const s = useAppStore.getState();
      const target = i === 0 ? Object.keys(s.vessels).find(id => s.vessels[id].type === 'beaker') : undefined;
      const id = s.prepareStudioProgram(p.id, undefined, target);
      if (!id) return { program: p.id, started: false, error: useAppStore.getState().mixError };
      useAppStore.getState().updateVesselPosition(id, [(i - 1) * 3, useAppStore.getState().vessels[id].position[1], 0]);
      return { program: p.id, id, started: useAppStore.getState().runStudioProgram(id) };
    });
  }));
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', error => report.errors.push({ device: 'mobile-emulation', message: error.message }));
  mobilePage.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ device: 'mobile-emulation', message: message.text() }); });
  await mobilePage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await mobilePage.waitForSelector('canvas', { timeout: 60000 });
  await mobilePage.waitForTimeout(4000);
  await capture(mobilePage, 'mobile-default');
  await capture(mobilePage, 'mobile-low-clear', () => mobilePage.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    useQualityStore.getState().setPreference('low');
    useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false });
    return { layout: 'Both drawers closed for a clear workbench view' };
  }));
  await mobile.close();
} catch (error) {
  report.errors.push({ device: 'harness', message: error.stack || error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
