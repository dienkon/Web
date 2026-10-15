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


const target=await(await fetch(`${cdpOrigin}/json/new?http://127.0.0.1:4173/index.source.html`,{method:'PUT'})).json();const client=new Client(target.webSocketDebuggerUrl);await client.connect();const errors=[];client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
try{await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Page.navigate',{url:'http://127.0.0.1:4173/index.source.html'});await waitFor(client,"document.querySelector('.start-shell h1')",'menu');await delay(2500);const startup=[...errors];await evaluate(client,"document.querySelector('[aria-label=\"Tùy chỉnh nhân vật\"]').click();true");await delay(900);const preview=await evaluate(client,"document.querySelectorAll('canvas').length");console.log(JSON.stringify({startup,errors,preview}));if(errors.length || preview !== 2)throw Error('Production startup/preview failed');}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
