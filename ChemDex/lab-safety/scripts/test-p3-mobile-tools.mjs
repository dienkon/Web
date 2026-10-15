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


const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();const client=new Client(target.webSocketDebuggerUrl);await client.connect();const errors=[];client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {fireSimulation}=await import('/src/core/fire/FireSim.ts');${code}})()`);
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:812,height:375,deviceScaleFactor:3,mobile:true});await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await client.send('Emulation.setEmulatedMedia',{features:[{name:'pointer',value:'coarse'},{name:'hover',value:'none'}]});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'menu');await delay(1000);
 await ev(`useStore.getState().startGame();useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:['task_talk','task_rules','task_shoes','task_hair','task_goggles','task_coat','task_gloves','task_mask'].includes(t.id)}))}));useStore.getState().equipItem('hasSweeper');useStore.getState().equipItem('hasFireExtinguisher');playerCoords.position=[4.2,0,0];return true`);await delay(500);
 await evaluate(client,`(async()=>{const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(Math.PI/.0022,.295/.0022);return true})()`);await delay(300);
 await evaluate(client,"document.querySelector('[aria-label=\"Rút chốt bình\"]').click();true");await delay(300);
 const rect=await evaluate(client,"(()=>{const r=document.querySelector('[aria-label=\"Giữ để phun CO2\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 const gasBefore=await ev('return fireSimulation.currentExtinguisher.agentLeft');
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x,y:rect.y,id:1,radiusX:7,radiusY:7,force:1}]});await delay(600);
 const gasAfter=await ev('return fireSimulation.currentExtinguisher.agentLeft');if(gasAfter>=gasBefore)throw Error('Touch spray did not work');
 await ev('useStore.getState().setShowSettings(true);return true');await delay(150);const paused=await ev('return fireSimulation.currentExtinguisher.agentLeft');await delay(400);const stable=await ev('return fireSimulation.currentExtinguisher.agentLeft');if(paused!==stable)throw Error('Spray continued through modal');
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ev('useStore.getState().setShowSettings(false);return true');await delay(300);
 await evaluate(client,"document.querySelector('[data-tool=\"spillKit\"]').click();true");await delay(1000);
 const layout=await evaluate(client,"(()=>{const r=document.querySelector('.tool-bar').getBoundingClientRect();return {slots:document.querySelectorAll('[data-tool]').length,left:r.left,right:r.right,bottom:r.bottom}})()");
 if(layout.slots!==3||layout.left<0||layout.right>812||layout.bottom>375)throw Error('Tool bar out of viewport');
 const held=await ev('return window.__LAB_RENDERER_INFO__?.heldTool');if(held!=='spillKit')throw Error('Touch slot switch failed');
 const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile('docs/screens/p3-tools-mobile.png',Buffer.from(s.data,'base64'));
 if(errors.length)throw Error(errors.join('\n'));const result={gasBefore,gasAfter,modalStoppedSpray:paused===stable,layout,held,errors};await writeFile('docs/perf/P3_MOBILE_TOOLS_CHECK.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
