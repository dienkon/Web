import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.PHYSICAL_AUDIT_OUTPUT ?? 'artifacts/verified-physics');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], cases: [], method: 'Native mouse/CDP touch events in desktop Chrome; touch emulation is not a physical phone test.' };
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: touch, hasTouch: touch });
    await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Vật lí', exact: true }).click();
    await page.getByRole('checkbox', { name: /Bật va chạm/ }).check();
    await page.evaluate(async () => {
      window.interactionPhysics = (await import('/src/physical/usePhysicsStore.ts')).usePhysicsStore;
      window.interactionApp = (await import('/src/store/useAppStore.ts')).useAppStore;
      window.interactionRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots;
      window.interactionTHREE = await import('/node_modules/.vite/deps/three.js');
      window.interactionPhysics.getState().setPanelOpen(false);
      window.interactionApp.setState({ leftSidebarOpen: false, rightSidebarOpen: false, moveMode: true });
    });
    await page.waitForFunction(() => window.interactionPhysics.getState().snapshot?.objects.some(o => o.id === 'beaker_1'));
    await page.waitForTimeout(400);
    const point = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
      const root = [...window.interactionRoots.values()].find(r => r.store.getState().gl.domElement === canvas).store.getState();
      const body = root.scene.getObjectByName('vessel_si_body_beaker_1');
      body.updateWorldMatrix(true, false);
      const p = new window.interactionTHREE.Vector3(0.5, -0.2, 0).applyMatrix4(body.matrixWorld).project(root.camera);
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2,
        initial: window.interactionPhysics.getState().snapshot.objects.find(o => o.id === 'beaker_1').position_m };
    });
    const cdp = touch ? await context.newCDPSession(page) : null;
    const sendTouch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    if (touch) await sendTouch('touchStart', point.x, point.y);
    else { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
    await page.waitForFunction(() => window.interactionApp.getState().draggingVesselId === 'beaker_1');
    const destination = { x: point.x + (touch ? 25 : 60), y: point.y - 30 };
    if (touch) await sendTouch('touchMove', destination.x, destination.y);
    else await page.mouse.move(destination.x, destination.y, { steps: 6 });
    await page.waitForFunction(() => window.interactionPhysics.getState().snapshot?.objects.find(o => o.id === 'beaker_1')?.held);
    const held = await page.evaluate(() => window.interactionPhysics.getState().snapshot.objects.find(o => o.id === 'beaker_1'));
    if (touch) await sendTouch('touchEnd'); else await page.mouse.up();
    await page.waitForFunction(() => window.interactionApp.getState().draggingVesselId === null
      && window.interactionPhysics.getState().snapshot?.objects.find(o => o.id === 'beaker_1')?.held === false);
    const released = await page.evaluate(() => window.interactionPhysics.getState().snapshot.objects.find(o => o.id === 'beaker_1'));
    if (![...released.position_m, ...released.velocity_m_s].every(Number.isFinite)) throw new Error('Invalid released pose');
    report.cases.push({ touch, point, destination, held, released, pass: true });
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'interaction-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length) throw new Error(report.errors.join('\n'));
console.log(JSON.stringify({ cases: report.cases.map(c => ({ touch: c.touch, pass: c.pass })), errors: report.errors }));
