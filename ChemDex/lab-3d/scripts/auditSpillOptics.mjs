import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const label = process.env.SPILL_OPTICS_LABEL ?? 'after', output = resolve('artifacts/spill-optics', label);
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], cases: [] };
const before = label === 'before' ? null : JSON.parse(await readFile(resolve('artifacts/spill-optics/before/browser-audit.json'), 'utf8'));
async function pixelsAt(page, png, points) {
  return page.evaluate(async ({ png, points }) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return points.map(p => ({ pool: p.pool, white: p.white, rgb: Array.from(ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data).slice(0, 3) }));
  }, { png: png.toString('base64'), points });
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [tier, mobile] of [['low', false], ['high', false], ['low', true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(tier => { localStorage.setItem('chemlab_vfx_quality_preference', tier);
      window.opticsLosses = 0; document.addEventListener('webglcontextlost', () => window.opticsLosses++, true);
      window.opticsBuffers = 0; const buffers = new WeakSet();
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (Type) {
        const create = Type.prototype.createBuffer, remove = Type.prototype.deleteBuffer;
        Type.prototype.createBuffer = function(...args) { const b = create.apply(this, args); if (b && !buffers.has(b)) { buffers.add(b); window.opticsBuffers++; } return b; };
        Type.prototype.deleteBuffer = function(b) { if (b && buffers.has(b)) { buffers.delete(b); window.opticsBuffers--; } return remove.call(this, b); };
      }
    }, tier);
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => { if (!report.errors.includes(e.message)) report.errors.push(e.message); });
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas'); await page.waitForTimeout(1200);
    await page.evaluate(async ({ mobile, tier }) => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const { calculateSpillRadius } = await import('/src/science/overflowPhysics.ts');
      const { useQualityStore } = await import('/src/vfx/quality.ts');
      useQualityStore.getState().setPreference(tier);
      const colors = ['#ffffff', '#2378e2', '#d58420'], spills = {};
      for (let i = 0; i < 3; i++) {
        const id = `optics-${i}`; spills[id] = { id, position: [(i - 1) * 3, -1.175, 2],
          contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }], substances: ['H2O'],
          color: colors[i], volume_ml: 10, mass_g: 10, radius: calculateSpillRadius(10), isHazard: false, timestamp: 0, temperature_c: 25 };
      }
      app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], spills, activeKinetics: {}, pendingReactions: {}, inFlightPours: [],
        selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false, isSimulationPaused: true });
      const canvasRoot = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')), root = canvasRoot.store.getState();
      const tiles = [], samples = [], patterns = new THREE.Group(); patterns.name = 'optical-reference-grid';
      for (let i = 0; i < 3; i++) for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) {
        const white = (x + z) % 2 === 0, mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.21),
          new THREE.MeshBasicMaterial({ color: white ? '#eeeeee' : '#111111', toneMapped: false }));
        mesh.rotation.x = -Math.PI / 2; mesh.position.set((i - 1) * 3 + (x - 2.5) * 0.21, -1.1748, 2 + (z - 2.5) * 0.21);
        patterns.add(mesh); tiles.push(mesh); samples.push({ pool: i, white, point: mesh.position.toArray() });
      }
      root.scene.add(patterns);
      canvasRoot.store.getState().internal.subscribe({ current: ({ camera }) => {
        camera.position.set(0, mobile ? 17 : 9, 2.001); camera.lookAt(0, -1.175, 2); camera.updateMatrixWorld();
      } }, 0, canvasRoot.store);
      window.spillOpticsAudit = { app, quality: useQualityStore, root, samples, original: JSON.stringify(spills), frames: [] };
      const render = root.gl.render.bind(root.gl);
      root.gl.render = (scene, camera) => { const screen = !root.gl.getRenderTarget() && scene === root.scene; render(scene, camera);
        if (screen) { const a = window.spillOpticsAudit; if (a.frames.length >= 90) a.frames.shift(); a.frames.push(root.gl.info.render.calls); } };
    }, { mobile, tier });
    await page.waitForTimeout(2500);
    const sample = await page.evaluate(() => {
      const a = window.spillOpticsAudit, rect = document.querySelector('canvas').getBoundingClientRect(), materials = [];
      a.root.scene.traverse(o => { if (o.name.startsWith('spill-optics:')) materials.push({ name: o.name,
        transmission: o.material.transmission ?? 0, opacity: o.material.opacity, vertices: o.geometry.getAttribute('position').count }); });
      return { samples: a.samples.map(s => { const p = a.root.camera.position.clone().fromArray(s.point).project(a.root.camera);
        return { pool: s.pool, white: s.white, x: rect.x + (p.x + 1) * rect.width / 2, y: rect.y + (1 - p.y) * rect.height / 2 }; }),
        materials, frameDrawCalls: a.frames, inventoryUnchanged: a.original === JSON.stringify(a.app.getState().spills), losses: window.opticsLosses };
    });
    const png = await page.screenshot({ path: resolve(output, `${tier}-${mobile ? 'mobile' : 'desktop'}.png`) });
    const points = sample.samples;
    sample.pixels = await pixelsAt(page, png, points);
    delete sample.samples;
    if (!sample.inventoryUnchanged || sample.losses) throw new Error('Optical display changed the inventory or lost WebGL');
    if (label !== 'before' && sample.materials.length !== (tier === 'low' ? 6 : 3)) throw new Error('Browser did not load the current optical renderer');
    const contrast = c => {
      const a = white => { const p = c.pixels.filter(p => p.pool === 0 && p.white === white);
        return p.reduce((sum, p) => sum + p.rgb[0] * 0.2126 + p.rgb[1] * 0.7152 + p.rgb[2] * 0.0722, 0) / p.length; };
      return a(true) - a(false);
    };
    sample.clearWaterContrast = contrast(sample);
    if (before) {
      sample.contrastGain = sample.clearWaterContrast / contrast(before.cases.find(c => c.tier === tier && c.mobile === mobile));
      if (sample.contrastGain < 2) throw new Error(`Insufficient submerged readability gain: ${sample.contrastGain}`);
      if (tier === 'low' && !mobile) {
        const recolor = async color => page.evaluate(color => window.spillOpticsAudit.app.setState(s => ({ spills: { ...s.spills,
          'optics-1': { ...s.spills['optics-1'], color } } })), color);
        await recolor('#d58420');
        await page.waitForFunction(() => { const u = window.spillOpticsAudit.root.scene.getObjectByName('spill-optics:optics-1').material.uniforms.uSpillAbsorption.value; return u.x < u.z; });
        const editedPng = await page.screenshot({ path: resolve(output, 'paused-color-change.png') });
        const edited = (await pixelsAt(page, editedPng, points)).filter(p => p.pool === 1 && p.white);
        const rgb = [0, 1, 2].map(i => edited.reduce((s, p) => s + p.rgb[i], 0) / edited.length);
        sample.pausedColorChange = { from: '#2378e2', to: '#d58420', whiteTileRGB: rgb };
        if (rgb[0] < rgb[2] + 20) throw new Error('Paused color change did not reach the pixels');
        await recolor('#2378e2');
        for (const q of ['high', 'low']) { await page.evaluate(q => window.spillOpticsAudit.quality.getState().setPreference(q), q); await page.waitForTimeout(500); }
        const initial = await page.evaluate(() => ({ buffers: window.opticsBuffers, geometries: window.spillOpticsAudit.root.gl.info.memory.geometries }));
        for (let i = 0; i < 20; i++) { await page.evaluate(q => window.spillOpticsAudit.quality.getState().setPreference(q), i % 2 ? 'low' : 'high'); await page.waitForTimeout(400); }
        await page.waitForTimeout(800);
        const final = await page.evaluate(() => ({ buffers: window.opticsBuffers, geometries: window.spillOpticsAudit.root.gl.info.memory.geometries,
          inventoryUnchanged: window.spillOpticsAudit.original === JSON.stringify(window.spillOpticsAudit.app.getState().spills) }));
        sample.qualitySwitches = { count: 20, initial, final };
        if (!final.inventoryUnchanged || final.buffers - initial.buffers > 8 || final.geometries - initial.geometries > 2) throw new Error(`Quality switch resource growth: ${JSON.stringify(sample.qualitySwitches)}`);
      }
    }
    report.cases.push({ tier, mobile, ...sample }); await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify({ errors: report.errors, consoleErrors: report.consoleErrors }));
console.log(JSON.stringify(report.cases.map(c => ({ tier: c.tier, mobile: c.mobile, inventoryUnchanged: c.inventoryUnchanged }))));
