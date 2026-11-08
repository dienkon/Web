import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/spill-suspension/production'); await mkdir(output, { recursive: true });
const fixture = await readFile(resolve('artifacts/spill-suspension/fixture.json'), 'utf8');
const initialMass = Object.values(JSON.parse(fixture).materials.spills).reduce((s, p) => s + p.mass_g, 0);
const report = { errors: [], consoleErrors: [], cases: [] }, browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [tier, mobile] of [['low', false], ['high', false], ['low', true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(({ fixture, tier }) => {
      localStorage.setItem('chemlab_physical_state_v4', fixture); localStorage.setItem('chemlab_vfx_quality_preference', tier);
      window.prodSuspension = { scattering: [], losses: 0 }; const locations = new WeakMap();
      document.addEventListener('webglcontextlost', () => window.prodSuspension.losses++, true);
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (Type) {
        const location = Type.prototype.getUniformLocation, upload = Type.prototype.uniform1f;
        Type.prototype.getUniformLocation = function(program, name) { const value = location.call(this, program, name);
          if (value && name === 'uSpillScattering') locations.set(value, true); return value; };
        Type.prototype.uniform1f = function(location, value) { if (location && locations.has(location)) {
          const list = window.prodSuspension.scattering; if (list.length >= 1000) list.shift(); list.push(value); }
          return upload.call(this, location, value); };
      }
    }, { fixture, tier });
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.PRODUCTION_ORIGIN ?? 'http://127.0.0.1:6774', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('canvas');
    await page.getByTitle('Mở/Đóng danh mục', { exact: true }).click(); await page.getByTitle('Mở/Đóng phản ứng & chuẩn độ', { exact: true }).click();
    await page.waitForFunction(() => window.prodSuspension.scattering.some(s => s > 0), undefined, { timeout: 60000 });
    await page.getByTitle('Tạm dừng phản ứng', { exact: true }).click();
    await page.waitForTimeout(1300);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chemlab_physical_state_v4')));
    const mass = Object.values(saved.materials.spills).reduce((s, p) => s + p.mass_g, 0);
    if (Math.abs(mass - initialMass) > 1e-8 || !saved.materials.spills['cloud-0'].suspension) throw new Error('Production checkpoint lost suspension or mass');
    await page.getByRole('combobox', { name: 'Chất lượng đồ họa' }).selectOption(tier === 'low' ? 'high' : 'low');
    await page.getByRole('combobox', { name: 'Chất lượng đồ họa' }).selectOption(tier); await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(output, `${tier}-${mobile ? 'mobile' : 'desktop'}.png`) });
    const info = await page.evaluate(() => window.prodSuspension);
    if (info.losses || info.scattering.some(s => !Number.isFinite(s) || s < 0)) throw new Error('Invalid rendered scattering');
    report.cases.push({ tier, mobile, mass_g: mass, maxScattering_scene: Math.max(...info.scattering), losses: info.losses,
      cohorts: Object.values(saved.materials.spills).flatMap(p => p.suspension?.species.map(s => s.cohorts.length) ?? []), pauseAndQualityThroughUI: true });
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify(report));
