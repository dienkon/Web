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
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
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

async function waitFor(client, expression, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const touchPoint = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 });

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
  await client.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'pointer', value: 'coarse' },
      { name: 'hover', value: 'none' },
    ],
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 812,
    height: 375,
    screenWidth: 812,
    screenHeight: 375,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await client.send('Page.navigate', { url: appUrl });
  await waitFor(client, `document.readyState === 'complete' && document.querySelector('button.start-primary')`, 'Start screen');
  await evaluate(client, `localStorage.clear(); true`);
  await client.send('Page.navigate', { url: appUrl });
  await waitFor(client, `document.readyState === 'complete' && document.querySelector('button.start-primary')`, 'clean Start screen');
  await evaluate(client, `document.querySelector('button.start-primary').click(); true`);
  await waitFor(client, `window.__LAB_DEBUG_STATE__?.runState === 'RUNNING'`, 'running game');

  const layoutDiagnostic = await evaluate(client, `(() => {
    const zone = document.querySelector('[aria-label="Cần điều khiển di chuyển"]');
    const rect = zone?.getBoundingClientRect();
    let joystickPoint = null;
    if (zone && rect) {
      for (let y = rect.top + 24; y < rect.bottom - 24 && !joystickPoint; y += 28) {
        for (let x = rect.left + 24; x < rect.right - 24; x += 28) {
          if (document.elementFromPoint(x, y)?.closest('[aria-label="Cần điều khiển di chuyển"]') === zone) {
            joystickPoint = { x, y };
            break;
          }
        }
      }
    }
    let lookPoint = null;
    for (let y = 140; y < 260 && !lookPoint; y += 20) {
      for (let x = 450; x < 700; x += 20) {
        if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') { lookPoint = { x, y }; break; }
      }
    }
    return {
      lookPoint,
      coarse: matchMedia('(pointer: coarse)').matches,
      hoverNone: matchMedia('(hover: none)').matches,
      zoneDisplay: zone ? getComputedStyle(zone).display : null,
      zoneRect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } : null,
      hitJoystick: document.elementFromPoint(100, 300)?.closest('[aria-label="Cần điều khiển di chuyển"]') !== null,
      hitLook: document.elementFromPoint(650, 180)?.tagName,
      joystickPoint,
    };
  })()`);
  process.stdout.write(`layout ${JSON.stringify(layoutDiagnostic)}\n`);

  if (!layoutDiagnostic.lookPoint) throw new Error('No unobstructed camera hit point');
  if (!layoutDiagnostic.joystickPoint) throw new Error('No unobstructed joystick hit point');
  await evaluate(client, `(() => {
    window.__P1_POINTER_EVENTS__ = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      window.addEventListener(type, (event) => window.__P1_POINTER_EVENTS__.push({
        type: event.type,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        target: event.target?.tagName,
      }), { capture: true });
    }
    return true;
  })()`);

  const joystickStart = layoutDiagnostic.joystickPoint;
  const startPoints = [touchPoint(1, joystickStart.x, joystickStart.y), touchPoint(2, layoutDiagnostic.lookPoint.x, layoutDiagnostic.lookPoint.y)];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [startPoints[0]] });
  await delay(100);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: startPoints });
  const movedPoints = [touchPoint(1, joystickStart.x, joystickStart.y - 75), touchPoint(2, layoutDiagnostic.lookPoint.x + 30, layoutDiagnostic.lookPoint.y + 20)];
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: movedPoints });
  await delay(1_200);
  process.stdout.write(`input ${JSON.stringify(await evaluate(client, `structuredClone(window.__LAB_DEBUG_STATE__?.input)`))}\n`);
  process.stdout.write(`events ${JSON.stringify(await evaluate(client, `structuredClone(window.__P1_POINTER_EVENTS__)`))}\n`);
  await waitFor(
    client,
    `window.__LAB_DEBUG_STATE__?.input.joystickPointerId !== null
      && window.__LAB_DEBUG_STATE__?.input.lookPointerId !== null
      && window.__LAB_DEBUG_STATE__?.input.move[1] > 0.5`,
    'simultaneous joystick and look pointers',
  );
  const simultaneous = await evaluate(client, `structuredClone(window.__LAB_DEBUG_STATE__.input)`);

  const lookOnlyMovedPoints = [touchPoint(1, joystickStart.x, joystickStart.y - 75), touchPoint(2, 755, 235)];
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: lookOnlyMovedPoints });
  await delay(1_200);
  const lookMoved = await evaluate(client, `structuredClone(window.__LAB_DEBUG_STATE__.input)`);
  if (Math.abs(simultaneous.move[0] - lookMoved.move[0]) > 0.05 || Math.abs(simultaneous.move[1] - lookMoved.move[1]) > 0.05) {
    throw new Error('Joystick output changed when only the look pointer moved');
  }

  const screenshotResult = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshot = path.join(process.cwd(), 'docs', 'screens', 'p1-input-multitouch.png');
  await writeFile(screenshot, Buffer.from(screenshotResult.data, 'base64'));

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await waitFor(
    client,
    `window.__LAB_DEBUG_STATE__?.input.joystickPointerId === null
      && window.__LAB_DEBUG_STATE__?.input.lookPointerId === null
      && Math.abs(window.__LAB_DEBUG_STATE__?.input.move[0]) < 0.001
      && Math.abs(window.__LAB_DEBUG_STATE__?.input.move[1]) < 0.001`,
    'pointer release reset',
  );
  const afterTouchEnd = await evaluate(client, `structuredClone(window.__LAB_DEBUG_STATE__.input)`);

  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
  await waitFor(client, `window.__LAB_DEBUG_STATE__?.input.move[1] === 1`, 'keyboard movement');
  await evaluate(client, `window.dispatchEvent(new Event('blur')); true`);
  await waitFor(client, `window.__LAB_DEBUG_STATE__?.input.move[1] === 0`, 'blur reset');
  const afterBlur = await evaluate(client, `structuredClone(window.__LAB_DEBUG_STATE__.input)`);

  const evidence = {
    capturedAt: new Date().toISOString(),
    viewport: { width: 812, height: 375, deviceScaleFactor: 3, touch: true },
    simultaneous,
    lookMoved,
    afterTouchEnd,
    afterBlur,
    screenshot: 'docs/screens/p1-input-multitouch.png',
  };
  await writeFile(path.join(process.cwd(), 'docs', 'perf', 'P1_INPUT_CHECK.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  client.socket.close();
  await fetch(`${cdpOrigin}/json/close/${target.id}`, { method: 'PUT' }).catch(() => undefined);
}
