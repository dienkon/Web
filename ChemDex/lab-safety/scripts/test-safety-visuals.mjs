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



const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();
const client=new Client(target.webSocketDebuggerUrl);await client.connect();
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
const shot=async(name)=>{const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/screens/${name}.png`,Buffer.from(s.data,'base64'))};
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({isDialogActive:false,player:{...s.player,equipment:{...s.player.equipment,hasGoggles:true,hasGloves:true,hasLabCoat:true},flags:{...s.player.flags,passTrained:true}}}));playerCoords.position=[-.95,0,5.1];return true`);await delay(1800);
 const before=await evaluate(client,'window.__LAB_RENDERER_INFO__?.mirrorUpdates??0');await delay(1500);const after=await evaluate(client,'window.__LAB_RENDERER_INFO__?.mirrorUpdates??0');check(after>before,'mirror updates when facing mirror');await shot('safety-mirror');
 for(const [tool,item] of [['extinguisher','hasFireExtinguisher'],['spillKit','hasSweeper'],['waste','isHoldingTrash']]){
 await ev(`useStore.getState().equipItem('${item}');useStore.setState(s=>({player:{...s.player,inventory:{...s.player.inventory,heldTrashType:'chemical'}}}));useStore.getState().selectTool('${tool}');return true`);await delay(1100);
 check(await evaluate(client,`window.__LAB_RENDERER_INFO__?.heldTool==='${tool}'`),'visible held '+tool);await shot('safety-held-'+tool);
 }
 await client.send('Emulation.setDeviceMetricsOverride',{width:812,height:375,deviceScaleFactor:1,mobile:true});await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await ev(`useStore.setState(s=>({currentPhase:2,isDialogActive:false,tasks:s.tasks.map(t=>({...t,completed:!['task_inspect_acid','task_bandage','task_spill_kit','task_spill_neutralize','task_spill_wipe','task_trash_disposal'].includes(t.id)}))}));playerCoords.position=[4.2,0,3.6];return true`);await delay(400);await evaluate(client,"window.dispatchEvent(new Event('lab-open-acid'));true");await waitFor(client,"document.querySelector('.acid-game')",'mobile acid');
 const rects=await evaluate(client,"(()=>{document.querySelector('.acid-bench').scrollIntoView({block:'center'});return ['acid','water'].map(k=>{const r=document.querySelector('.acid-vessel.'+k).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})})()");
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...rects[0],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...rects[1],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await waitFor(client,"document.querySelector('.acid-stir-rod')",'touch pour');check(true,'mobile touch drag pour');await shot('safety-acid-mobile');
 const layout=await evaluate(client,"(()=>{const r=document.querySelector('.acid-game section').getBoundingClientRect();return {left:r.left,right:r.right,height:r.height}})()");check(layout.left>=0&&layout.right<=812&&layout.height<=375,'mobile modal stays in viewport with scroll');
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
