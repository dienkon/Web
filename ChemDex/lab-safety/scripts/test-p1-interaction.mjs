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
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function pressInteract(client) {
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code: 'KeyE',
    key: 'e',
    windowsVirtualKeyCode: 69,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    code: 'KeyE',
    key: 'e',
    windowsVirtualKeyCode: 69,
  });
}

const targetResponse = await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
if (!targetResponse.ok) throw new Error(`Cannot create Chrome target: ${targetResponse.status}`);
const target = await targetResponse.json();
const client = new Client(target.webSocketDebuggerUrl);
await client.connect();

try {
  await mkdir(path.join(process.cwd(), 'docs', 'perf'), { recursive: true });
  await client.send('Page.enable');
  await client.send('Runtime.enable');
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

  const unitResult = await evaluate(client, `(async () => {
    const { InteractionBus, INTERACTION_PRIORITY } = await import('/src/systems/input/InteractionBus.ts');
    const bus = new InteractionBus(150);
    const calls = [];
    const offTarget = bus.subscribe({ priority: INTERACTION_PRIORITY.TARGET, onInteract: () => calls.push('target') });
    const offQuiz = bus.subscribe({ priority: INTERACTION_PRIORITY.QUIZ, onInteract: () => calls.push('quiz') });
    const offDialog = bus.subscribe({ priority: INTERACTION_PRIORITY.DIALOG, onInteract: () => calls.push('dialog') });
    const dialogHandled = bus.emit(1000);
    offDialog();
    const quizHandled = bus.emit(1200);
    offQuiz();
    const targetHandled = bus.emit(1400);
    const duplicateHandled = bus.emit(1450);
    offTarget();
    return { calls, dialogHandled, quizHandled, targetHandled, duplicateHandled };
  })()`);

  await evaluate(client, `(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    const { interactionBus, INTERACTION_PRIORITY } = await import('/src/systems/input/InteractionBus.ts');
    window.__P1_INTERACTION_TEST__ = { targetCount: 0 };
    window.__P1_INTERACTION_TEST__.unsubscribe = interactionBus.subscribe({
      priority: INTERACTION_PRIORITY.TARGET + 50,
      onInteract: () => { window.__P1_INTERACTION_TEST__.targetCount += 1; },
    });
    interactionBus.resetDebounce();
    useStore.getState().startDialog(['Một', 'Hai']);
    return true;
  })()`);
  await waitFor(client, `document.body.textContent.includes('Một')`, 'teacher dialog');
  await pressInteract(client);
  await delay(80);
  const dialogResult = await evaluate(client, `(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    return {
      targetCount: window.__P1_INTERACTION_TEST__.targetCount,
      dialogOpen: useStore.getState().isDialogActive,
      dialogIndex: useStore.getState().currentDialogIndex,
    };
  })()`);

  await evaluate(client, `(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    const { interactionBus } = await import('/src/systems/input/InteractionBus.ts');
    useStore.getState().closeDialog();
    useStore.getState().setShowChemicalSymbolsQuiz(true);
    interactionBus.resetDebounce();
    return true;
  })()`);
  await delay(300);
  await pressInteract(client);
  await delay(80);
  const quizResult = await evaluate(client, `(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    return {
      targetCount: window.__P1_INTERACTION_TEST__.targetCount,
      quizOpen: useStore.getState().showChemicalSymbolsQuiz,
    };
  })()`);

  await evaluate(client, `(async () => {
    const { useStore } = await import('/src/store/useStore.ts');
    const { interactionBus } = await import('/src/systems/input/InteractionBus.ts');
    useStore.getState().setShowChemicalSymbolsQuiz(false);
    interactionBus.resetDebounce();
    return true;
  })()`);
  await delay(300);
  await pressInteract(client);
  await pressInteract(client);
  await delay(80);
  const afterDuplicate = await evaluate(client, `window.__P1_INTERACTION_TEST__.targetCount`);
  await delay(170);
  await pressInteract(client);
  await delay(80);
  const afterDebounce = await evaluate(client, `window.__P1_INTERACTION_TEST__.targetCount`);

  if (JSON.stringify(unitResult.calls) !== JSON.stringify(['dialog', 'quiz', 'target'])) {
    throw new Error(`Priority order failed: ${JSON.stringify(unitResult)}`);
  }
  if (unitResult.duplicateHandled !== false) throw new Error('150ms debounce did not reject a duplicate');
  if (dialogResult.targetCount !== 0 || !dialogResult.dialogOpen) throw new Error(`Dialog priority failed: ${JSON.stringify(dialogResult)}`);
  if (quizResult.targetCount !== 0 || !quizResult.quizOpen) throw new Error(`Quiz guard failed: ${JSON.stringify(quizResult)}`);
  if (afterDuplicate !== 1 || afterDebounce !== 2) {
    throw new Error(`Keyboard/debounce integration failed: ${afterDuplicate}/${afterDebounce}`);
  }

  const evidence = {
    capturedAt: new Date().toISOString(),
    viewport: { width: 812, height: 375, deviceScaleFactor: 3 },
    unitResult,
    dialogResult,
    quizResult,
    targetResult: { afterDuplicate, afterDebounce },
  };
  await writeFile(path.join(process.cwd(), 'docs', 'perf', 'P1_INTERACTION_CHECK.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  await evaluate(client, `window.__P1_INTERACTION_TEST__?.unsubscribe?.(); true`).catch(() => undefined);
  client.socket.close();
  await fetch(`${cdpOrigin}/json/close/${target.id}`, { method: 'PUT' }).catch(() => undefined);
}
