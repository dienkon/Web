import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/spill-optics/production'); await mkdir(output, { recursive: true });
const saved = JSON.parse(await readFile(resolve('artifacts/spill-optics/contacts/fixture.json'), 'utf8'));
const template = saved.materials.spills['pool-0'], spills = {};
for (const [i, color] of ['#ffffff', '#2378e2', '#d58420'].entries()) {
  const id = `optics-${i}`; spills[id] = { ...template, id, position: [(i - 1) * 3, -1.175, 2], color,
    contents: template.contents.filter(c => c.formula === 'H2O'), substances: ['H2O'], mass_g: 10, isHazard: false };
}
const fixture = JSON.stringify({ vessels: {}, burners: {}, savedAt: Date.now(), materials: { spills, inFlightPours: [],
  wasteMass_g: 0, wasteContents: [], workbenchEscapedGas_g: {} } });
await writeFile(resolve(output, 'fixture.json'), fixture);
const report = { errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [tier, mobile] of [['low', false], ['high', false], ['low', true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(({ fixture, tier }) => {
      localStorage.setItem('chemlab_physical_state_v4', fixture); localStorage.setItem('chemlab_vfx_quality_preference', tier);
      window.spillShaderAudit = { compiled: [], losses: 0 }; const sources = new WeakMap();
      document.addEventListener('webglcontextlost', () => window.spillShaderAudit.losses++, true);
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (Type) {
        const source = Type.prototype.shaderSource, compile = Type.prototype.compileShader;
        Type.prototype.shaderSource = function(shader, text) {
          if (text.includes('vSpillHeight')) sources.set(shader, { absorption: text.includes('uSpillAbsorption'), refraction: text.includes('vec3 spillRay') });
          return source.call(this, shader, text);
        };
        Type.prototype.compileShader = function(shader) { compile.call(this, shader);
          if (sources.has(shader)) window.spillShaderAudit.compiled.push({ ...sources.get(shader), valid: this.getShaderParameter(shader, this.COMPILE_STATUS) }); };
      }
    }, { fixture, tier });
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.PRODUCTION_ORIGIN ?? 'http://127.0.0.1:6774', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.getByTitle('Mở/Đóng danh mục', { exact: true }).click();
    await page.getByTitle('Mở/Đóng phản ứng & chuẩn độ', { exact: true }).click();
    await page.waitForFunction(() => document.querySelector('canvas').getBoundingClientRect().width > innerWidth * 0.8);
    await page.waitForFunction(tier => window.spillShaderAudit.compiled.some(s => s.valid && (tier === 'low' ? s.absorption : s.refraction)), tier);
    const other = tier === 'low' ? 'high' : 'low';
    await page.getByRole('combobox', { name: 'Chất lượng đồ họa' }).selectOption(other);
    await page.waitForFunction(tier => window.spillShaderAudit.compiled.some(s => s.valid && (tier === 'low' ? s.absorption : s.refraction)), other);
    await page.getByRole('combobox', { name: 'Chất lượng đồ họa' }).selectOption(tier); await page.waitForTimeout(500);
    const result = await page.evaluate(() => window.spillShaderAudit);
    if (result.losses || result.compiled.some(s => !s.valid)) throw new Error(`Production shader failure: ${JSON.stringify(result)}`);
    await page.screenshot({ path: resolve(output, `${tier}-${mobile ? 'mobile' : 'desktop'}.png`) });
    report.cases.push({ tier, mobile, qualityChangedThroughUI: true, panelsClosedThroughUI: true,
      canvasWidth: await page.locator('canvas').evaluate(c => c.getBoundingClientRect().width), ...result }); await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify(report.cases.map(c => ({ tier: c.tier, mobile: c.mobile, shadersCompiled: c.compiled.length, losses: c.losses }))));
