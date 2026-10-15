import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cdpOrigin = process.env.P0_CDP_ORIGIN ?? 'http://127.0.0.1:9222';
const appUrl = process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/?debug=1';

class Client {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
  }

  async connect() {
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(client, expression, label) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function screenshot(client, filename) {
  const result = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  if (!result.data) throw new Error(`Missing screenshot: ${filename}`);
  const target = path.join(process.cwd(), 'docs', 'screens', filename);
  await writeFile(target, Buffer.from(result.data, 'base64'));
  return path.relative(process.cwd(), target).replaceAll('\\', '/');
}

const targetResponse = await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
if (!targetResponse.ok) throw new Error(`Cannot create Chrome target: ${targetResponse.status}`);
const target = await targetResponse.json();
const client = new Client(target.webSocketDebuggerUrl);
await client.connect();

try {
  await mkdir(path.join(process.cwd(), 'docs', 'screens'), { recursive: true });
  await mkdir(path.join(process.cwd(), 'docs', 'perf'), { recursive: true });
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    screenWidth: 390,
    screenHeight: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await client.send('Page.navigate', { url: appUrl });
  await waitFor(client, `document.readyState === 'complete' && document.querySelector('button.start-primary')`, 'Start screen');
  await evaluate(client, `localStorage.clear(); true`);
  await client.send('Page.navigate', { url: appUrl });
  await waitFor(client, `document.readyState === 'complete' && document.querySelector('button.start-primary')`, 'clean Start screen');
  await evaluate(client, `document.querySelector('button.start-primary').click(); true`);
  await waitFor(client, `document.querySelector('.orientation-gate') && window.__LAB_DEBUG_STATE__?.runState === 'PAUSED'`, 'portrait gate and pause');

  const portrait = {
    screenshot: await screenshot(client, 'p1-orientation-portrait.png'),
    state: await evaluate(client, `({
      text: document.querySelector('.orientation-gate')?.textContent,
      runState: window.__LAB_DEBUG_STATE__?.runState,
      appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
      rootHeight: document.querySelector('.app-shell')?.getBoundingClientRect().height,
      visualHeight: visualViewport?.height,
    })`),
  };

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    screenWidth: 844,
    screenHeight: 390,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await waitFor(client, `!document.querySelector('.orientation-gate') && window.__LAB_DEBUG_STATE__?.runState === 'RUNNING'`, 'landscape resume');
  const landscape = {
    screenshot: await screenshot(client, 'p1-orientation-landscape.png'),
    state: await evaluate(client, `({
      gatePresent: Boolean(document.querySelector('.orientation-gate')),
      runState: window.__LAB_DEBUG_STATE__?.runState,
      appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height'),
      rootHeight: document.querySelector('.app-shell')?.getBoundingClientRect().height,
      visualHeight: visualViewport?.height,
    })`),
  };

  const evidence = { capturedAt: new Date().toISOString(), portrait, landscape };
  if (!portrait.state.text?.includes('Xoay ngang màn hình để chơi')) throw new Error('Portrait copy mismatch');
  if (portrait.state.runState !== 'PAUSED' || landscape.state.runState !== 'RUNNING') throw new Error('Pause/resume mismatch');
  if (Math.abs(landscape.state.rootHeight - landscape.state.visualHeight) > 1) throw new Error('Dynamic viewport height mismatch');
  await writeFile(path.join(process.cwd(), 'docs', 'perf', 'P1_ORIENTATION_CHECK.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  client.socket.close();
  await fetch(`${cdpOrigin}/json/close/${target.id}`, { method: 'PUT' }).catch(() => undefined);
}
