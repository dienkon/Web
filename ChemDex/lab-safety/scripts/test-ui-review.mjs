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


const target = await (await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`, {method:'PUT'})).json();
const client = new Client(target.webSocketDebuggerUrl); await client.connect();
try {
 await client.send('Page.enable'); await client.send('Runtime.enable');
 await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 await client.send('Page.navigate',{url:appUrl});
 await waitFor(client,"document.querySelector('.start-shell h1')",'menu'); await delay(2500);
 await mkdir('docs/screens',{recursive:true});
 const shot=await client.send('Page.captureScreenshot',{format:'png'}); await writeFile('docs/screens/ui-bright-desktop.png',Buffer.from(shot.data,'base64'));
 const menu=await evaluate(client,`(async()=>{ const {useInteractionStore}=await import('/src/core/InteractionSystem.ts'); return Object.values(useInteractionStore.getState().interactables).filter(x=>x.isActive).length; })()`);
 if(menu!==0) throw Error('Items active behind menu');
 await evaluate(client,`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().startGame();useStore.getState().closeDialog();return true})()`); await delay(800);
 await client.send('Emulation.setDeviceMetricsOverride',{width:812,height:375,deviceScaleFactor:1,mobile:true});
 await evaluate(client,`(async()=>{const {useStore}=await import('/src/store/useStore.ts');useStore.getState().startDialog(['Một thông điệp đủ dài để kiểm tra thao tác hiện hết nội dung ngay lập tức trên điện thoại.']);return true})()`); await delay(200);
 await evaluate(client,"document.querySelector('.teacher-dialog .dialog-content').click();true");
 const revealed=await evaluate(client,"document.querySelector('.dialog-content').textContent"); await delay(120);
 const stable=await evaluate(client,"document.querySelector('.dialog-content').textContent");
 if(revealed!==stable) throw Error('Typewriter overwrites revealed text');
 const mobile=await evaluate(client,`(()=>{const r=document.querySelector('.teacher-dialog > div').getBoundingClientRect();return {width:r.width,height:r.height,bottom:r.bottom}})()`);
 if(mobile.width>500 || mobile.height>160 || mobile.bottom>375) throw Error('Mobile dialog oversized: '+JSON.stringify(mobile));
 const shot2=await client.send('Page.captureScreenshot',{format:'png'}); await writeFile('docs/screens/ui-bright-mobile.png',Buffer.from(shot2.data,'base64'));
 const blocked=await evaluate(client,`(async()=>{const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');return Object.values(useInteractionStore.getState().interactables).filter(x=>x.isActive).length})()`);
 if(blocked!==0) throw Error('Items active behind dialog');
 console.log(JSON.stringify({menuActiveItems:menu,dialogActiveItems:blocked,mobileDialog:mobile,revealStable:revealed===stable}));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
