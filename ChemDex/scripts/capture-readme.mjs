import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Run after building and starting npm run preview. No accounts or API keys needed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.CHEMDEX_SCREENSHOT_URL ?? 'http://127.0.0.1:4173';
const output = path.join(root, 'docs/images');
fs.mkdirSync(output, { recursive: true });
const requested = new Set(process.argv.slice(2));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/features/main.json'), 'utf8'));
const screens = [
  ['periodic', '/', '#periodic-table .el-symbol'],
  ['element', '/nguyen-to.html?element=Cu', '#detail-hero'],
  ['chatbot', '/nguyen-to.html?element=Cu', '#chat-fab', async p => {
    await p.locator('#chat-fab').click();
    await p.locator('#chat-input').waitFor({ state: 'visible' });
  }],
  ['search', '/', '#open-search', async p => {
    await p.locator('#open-search').click();
  }],
  ['tools', '/tien-ich/', '#tool-cards'],
  ['structures', '/tien-ich/cau-truc-3d/', '#selected canvas'],
  ['lab-2d', '/lab-2d/', 'text=Bàn thí nghiệm ảo sẵn sàng'],
  ['lab-3d', '/lab-3d/', 'canvas'],
  ['lab-safety', '/lab-safety/', 'text=LAB SAFETY.'],
  ['library', '/trung-tam/tai-lieu-so/', 'main'],
  ['community', '/trung-tam/cong-dong/', 'text=Diễn Đàn Hóa Học', async p => {
    await p.locator('main .animate-pulse.space-y-4').first().waitFor({ state: 'hidden', timeout: 30000 });
  }],
  ['study', '/on-tap/', '#quiz h2'],
  ['arena', '/dau-truong/', 'text=Chơi thử ở chế độ Khách'],
  ['editor', '/data-editor.html', 'body'],
  ...manifest.features.map(f => [f.href.split('/').filter(Boolean).at(-1), f.href, 'body']),
];
for (const name of requested) {
  if (!screens.some(screen => screen[0] === name)) throw new Error(`Unknown screenshot: ${name}`);
}
const browser = await chromium.launch({
  ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const records = [];
try {
  for (const [name, route, ready, prepare] of screens) {
    if (requested.size && !requested.has(name)) continue;
    const viewport = name === 'periodic' ? { width: 1920, height: 1080 } : { width: 1440, height: 960 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    try {
      const response = await page.goto(new URL(route, baseURL).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
      await page.locator(ready).first().waitFor({ state: 'visible', timeout: 30000 });
      if (prepare) await prepare(page);
      await page.waitForTimeout(name.startsWith('lab-') ? 4000 : 1800);
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
      await page.screenshot({ path: path.join(output, `${name}.webp`), type: 'webp', quality: 82, animations: 'disabled', timeout: 20000 });
      records.push({ file: `${name}.webp`, route, viewport: `${viewport.width}x${viewport.height}`, status: response.status(), capturedAt: new Date().toISOString() });
      console.log(`Captured ${name}: ${route}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const manifestFile = path.join(output, 'manifest.json');
const previous = requested.size && fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')).screens : [];
const merged = [...previous.filter(record => !records.some(next => next.file === record.file)), ...records];
fs.writeFileSync(manifestFile, JSON.stringify({ capturedAt: new Date().toISOString(), baseURL, screens: merged }, null, 2) + '\n');
