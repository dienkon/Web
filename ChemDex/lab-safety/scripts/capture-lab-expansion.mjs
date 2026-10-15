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




const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();const client=new Client(target.webSocketDebuggerUrl);await client.connect();
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 await evaluate(client,`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().startGame();useStore.setState(s=>({isDialogActive:false,currentPhase:3,player:{...s.player,equipment:{hasGoggles:true,hasGloves:true,hasLabCoat:true,hasMask:true,hairTied:true,hasClosedShoes:true},inventory:{...s.player.inventory,hasSweeper:true}},activeTool:'spillKit'}));return true})()`);await delay(1000);
 await evaluate(client,`(async()=>{const {playerCoords}=await import('/src/store/useStore.ts');const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=[-8,0,2.2];useLabEquipment.getState().navigate(useLabEquipment.getState().items.find(i=>i.kind==='volume'));inputManager.addMouseLook(-Math.PI/2/.0022,.4/.0022);return true})()`);await delay(1200);
 const shot=await client.send('Page.captureScreenshot',{format:'png'});await writeFile('docs/screens/expansion-dustpan-route.png',Buffer.from(shot.data,'base64'));
 // Capture the real sample in the world by looking down the central aisle.
 await evaluate(client,`(async()=>{const {playerCoords}=await import('/src/store/useStore.ts');const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=[-3.5,0,2.7];inputManager.addMouseLook(0,.15/.0022);return true})()`);await delay(600);
 const waste=await client.send('Page.captureScreenshot',{format:'png'});await writeFile('docs/screens/expansion-visible-waste.png',Buffer.from(waste.data,'base64'));
 console.log('Captured route, dustpan and loose waste');
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
