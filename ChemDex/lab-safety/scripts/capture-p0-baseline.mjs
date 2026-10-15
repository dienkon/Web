import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const cdpOrigin = process.env.P0_CDP_ORIGIN ?? 'http://127.0.0.1:9222';
const appUrl = process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/?debug=1';
const outputRoot = process.cwd();
const sampleDurationMs = Number(process.env.P0_SAMPLE_DURATION_MS ?? 20_000);
if (!Number.isFinite(sampleDurationMs) || sampleDurationMs < 1_000) {
  throw new Error('P0_SAMPLE_DURATION_MS must be a finite number >= 1000');
}
const cpuThrottleRate = 4;

const viewports = [
  { id: 'desktop-1366x768', width: 1366, height: 768, deviceScaleFactor: 1, mobile: false, touch: false },
  { id: 'mobile-812x375-3x', width: 812, height: 375, deviceScaleFactor: 3, mobile: true, touch: true },
  { id: 'mobile-740x360-2x', width: 740, height: 360, deviceScaleFactor: 2, mobile: true, touch: true },
];

class CdpClient {
  constructor(webSocketDebuggerUrl) {
    this.url = webSocketDebuggerUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    });
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', () => reject(new Error(`Cannot connect to ${this.url}`)), { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function evaluate(client, expression, awaitPromise = true) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  await waitFor(client, `document.readyState === 'complete'`, `page load: ${url}`);
}

async function sampleFrames(client) {
  const result = await evaluate(client, `new Promise((resolve, reject) => {
    if (!window.__LAB_RENDERER_INFO__) {
      reject(new Error('window.__LAB_RENDERER_INFO__ is unavailable; use DEV with ?debug=1'));
      return;
    }
    const timestamps = [];
    let startedAt;
    const tick = (timestamp) => {
      if (startedAt === undefined) startedAt = timestamp;
      timestamps.push(timestamp);
      if (timestamp - startedAt < ${sampleDurationMs}) {
        requestAnimationFrame(tick);
        return;
      }
      const intervals = timestamps.slice(1).map((value, index) => value - timestamps[index]);
      const durationMs = timestamps[timestamps.length - 1] - timestamps[0];
      const worstCount = Math.max(1, Math.ceil(intervals.length * 0.01));
      const worst = [...intervals].sort((a, b) => b - a).slice(0, worstCount);
      const worstAverageMs = worst.reduce((total, value) => total + value, 0) / worst.length;
      resolve({
        durationMs,
        frameCount: intervals.length,
        averageFps: intervals.length * 1000 / durationMs,
        onePercentLowFps: 1000 / worstAverageMs,
        intervalCount: intervals.length,
        intervalAverageMs: durationMs / intervals.length,
        intervalP99Ms: worst[worst.length - 1],
        renderer: structuredClone(window.__LAB_RENDERER_INFO__),
      });
    };
    requestAnimationFrame(tick);
  })`);

  for (const key of ['averageFps', 'onePercentLowFps', 'durationMs']) {
    if (!Number.isFinite(result?.[key])) throw new Error(`Invalid frame metric: ${key}`);
  }
  if (!result.renderer) throw new Error('Renderer snapshot missing after sample');
  return result;
}

async function captureScreenshot(client, filename) {
  const response = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  if (!response.data) throw new Error(`Screenshot payload missing: ${filename}`);
  const target = path.join(outputRoot, 'docs', 'screens', filename);
  await writeFile(target, Buffer.from(response.data, 'base64'));
  return path.relative(outputRoot, target).replaceAll('\\', '/');
}

async function captureScene(client, viewport, scene, sceneNote) {
  await delay(4_000);
  await waitFor(client, `window.__LAB_RENDERER_INFO__`, 'renderer metrics');
  const metrics = await sampleFrames(client);
  const screenshot = await captureScreenshot(client, `p0-${viewport.id}-${scene}.png`);
  return { scene, sceneNote, screenshot, ...metrics };
}

async function runViewport(browserVersion, viewport) {
  const targetResponse = await fetch(`${cdpOrigin}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Cannot create Chrome target: HTTP ${targetResponse.status}`);
  const target = await targetResponse.json();
  if (!target.webSocketDebuggerUrl) throw new Error('Chrome target has no webSocketDebuggerUrl');

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  try {
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.deviceScaleFactor,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });
    await client.send('Emulation.setTouchEmulationEnabled', {
      enabled: viewport.touch,
      maxTouchPoints: viewport.touch ? 5 : 1,
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottleRate });

    await navigate(client, appUrl);
    await evaluate(client, `localStorage.clear(); 'cleared'`);
    await navigate(client, appUrl);
    await waitFor(client, `document.readyState === 'complete' && document.querySelector('button.start-primary')`, 'clean Start screen');

    const samples = [];
    samples.push(await captureScene(client, viewport, 'start', 'Start screen'));

    const started = await evaluate(client, `(() => {
      const button = document.querySelector('button.start-primary');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!started) throw new Error('Start button could not be clicked');
    await waitFor(client, `document.body.innerText.includes('DEV: SKIP')`, 'game HUD');
    await waitFor(client, `localStorage.getItem('labSafetySave')`, 'initial save');
    samples.push(await captureScene(client, viewport, 'lobby', 'Lab lobby at the default new-game spawn'));

    const savePrepared = await evaluate(client, `(() => {
      const raw = localStorage.getItem('labSafetySave');
      if (!raw) return false;
      const save = JSON.parse(raw);
      save.currentPhase = 2;
      localStorage.setItem('labSafetySave', JSON.stringify(save));
      return true;
    })()`);
    if (!savePrepared) throw new Error('Could not prepare Phase 2 save');
    await navigate(client, appUrl);
    await waitFor(client, `Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Tiếp tục'))`, 'Continue button');
    const resumed = await evaluate(client, `(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent.includes('Tiếp tục'));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!resumed) throw new Error('Continue button could not be clicked');
    await waitFor(
      client,
      `window.__LAB_DEBUG_STATE__?.currentPhase === 2 && window.__LAB_DEBUG_STATE__?.activeFireCellCount > 0`,
      'Phase 2 fire simulation',
    );
    const positionedNearFire = await evaluate(client, `(() => {
      if (!window.__LAB_SET_PLAYER_POSE__) return false;
      window.__LAB_SET_PLAYER_POSE__([4.2, 0, 1.0], Math.PI);
      return true;
    })()`);
    if (!positionedNearFire) throw new Error('DEV player pose bridge is unavailable');
    await waitFor(
      client,
      `window.__LAB_DEBUG_STATE__?.playerPosition?.[0] === 4.2 && window.__LAB_DEBUG_STATE__?.playerPosition?.[2] === 1`,
      'near-fire player position',
    );
    samples.push(await captureScene(
      client,
      viewport,
      'phase2-fire',
      'Phase 2 fire spawned; sampled 3.2 m from the fire origin using the DEV-only pose bridge',
    ));

    return { viewport, browserVersion, cpuThrottleRate, sampleDurationMs, samples };
  } finally {
    client.close();
    await fetch(`${cdpOrigin}/json/close/${target.id}`, { method: 'PUT' }).catch(() => undefined);
  }
}

async function main() {
  await mkdir(path.join(outputRoot, 'docs', 'screens'), { recursive: true });
  await mkdir(path.join(outputRoot, 'docs', 'perf'), { recursive: true });

  const versionResponse = await fetch(`${cdpOrigin}/json/version`);
  if (!versionResponse.ok) throw new Error(`Chrome CDP is unavailable at ${cdpOrigin}`);
  const version = await versionResponse.json();
  if (!version.Browser) throw new Error('Chrome version metadata is missing');

  const results = [];
  for (const viewport of viewports) {
    process.stdout.write(`Measuring ${viewport.id}...\n`);
    results.push(await runViewport(version.Browser, viewport));
  }

  const output = {
    capturedAt: new Date().toISOString(),
    sourceUrl: appUrl,
    cdpOrigin,
    browser: version.Browser,
    protocolVersion: version['Protocol-Version'],
    cpuThrottleRate,
    sampleDurationMs,
    results,
  };
  const destination = path.join(outputRoot, 'docs', 'perf', 'P0_BASELINE_RAW.json');
  await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(`Wrote ${destination}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
