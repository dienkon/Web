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
const errors=[];
client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
const store=async(code)=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');${code};return true})()`);
const screenshot=async(name)=>{const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/screens/${name}.png`,Buffer.from(s.data,'base64'))};
try {
 await client.send('Page.enable');await client.send('Runtime.enable');
 await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell h1')",'menu'); await delay(2000);
 await mkdir('docs/screens',{recursive:true});
 await store('useStore.getState().setShowCharacterCreator(true)');await delay(800);await screenshot('p2-character-full-desktop');console.log('preview errors',errors.length);
 await store('useStore.getState().setShowCharacterCreator(false);useStore.getState().startGame();useStore.getState().closeDialog()');await delay(1000);console.log('start errors',errors.length);
 const ordered=await evaluate(client,`(async()=>{const {useStore}=await import('/src/store/useStore.ts');const {getActiveObjective}=await import('/src/components/3d/lab/ObjectiveMarker.tsx');const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');const s=useStore.getState();return {objective:getActiveObjective(s.currentPhase,s.tasks,s.player.flags).id,active:Object.values(useInteractionStore.getState().interactables).filter(i=>i.isActive).map(i=>i.id),labels:document.querySelectorAll('[data-objective-label]').length}})()`);
 if(ordered.objective!=='task_talk'||ordered.active.join()!=='teacher_talk'||ordered.labels!==1)throw Error('Sequential tasks failed: '+JSON.stringify(ordered));
 const navigation=await evaluate(client,`(async()=>{const {findNavigationPath,isWalkable}=await import('/src/core/simulation/NavigationPath.ts');const pairs=[[[-6,5.8],[0,-4.5]],[[0,-4.5],[-9.7,5]],[[-3,5.8],[4.2,2.2]],[[-.95,5.2],[-4,7]]];return pairs.map(([start,end])=>{const path=findNavigationPath(start,end);let safe=path.length>0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];for(let t=0;t<=1;t+=.05)if(!isWalkable(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))safe=false}return {path,safe}})})()`);
 if(navigation.some(p=>!p.safe))throw Error('Route crosses obstacle: '+JSON.stringify(navigation));
 await screenshot('p2-navigation-desktop');
 await store('playerCoords.position=[0,0,5.8]');
 await evaluate(client,`(async()=>{const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(Math.PI/.0022,0);return true})()`);await delay(1200);
 const performanceResult=await evaluate(client,`new Promise(resolve=>{let samples=[],last=performance.now();function frame(now){samples.push(now-last);last=now;if(samples.length<180)requestAnimationFrame(frame);else{samples.sort((a,b)=>a-b);resolve({fps:1000/(samples.reduce((a,b)=>a+b,0)/samples.length),medianMs:samples[90],p95Ms:samples[171],renderer:window.__LAB_RENDERER_INFO__})}}requestAnimationFrame(frame)})`);
 await store(`useStore.setState(s=>({tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_hair'}))}));playerCoords.position=[-.95,0,5.2]`);
 await evaluate(client,`(async()=>{const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(Math.PI/.0022,0.18/.0022);return true})()`);await delay(2000);await screenshot('p2-player-mirror');
 const mirror=await evaluate(client,'structuredClone(window.__LAB_RENDERER_INFO__)');
 if(!mirror.mirrorUpdates) throw Error('Mirror not updating');
 await store(`useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:!['task_inspect_acid','task_bandage'].includes(t.id)}))}));playerCoords.position=[4.2,0,3.9]`);await delay(500);
 await store("useStore.getState().setActiveRuleDialog((await import('/src/data/rules.ts')).SAFETY_RULES[3])");await delay(300);
 const labelsBlocked=await evaluate(client,"document.querySelectorAll('.scene-label').length");if(labelsBlocked!==0)throw Error('Labels leak over rule dialog');await screenshot('p2-rule-dialog-no-overlap');
 await store('useStore.getState().setActiveRuleDialog(null)');await delay(500);
 console.log('before acid', await evaluate(client, `(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const s=useStore.getState();return {position:playerCoords.position,view:s.view,phase:s.currentPhase,run:s.runState,dialog:s.isDialogActive,scene:s.sceneModalCount,rule:!!s.activeRuleDialog,labels:document.querySelectorAll('.scene-label').length,errors:${JSON.stringify(errors)}}})()`));
 await evaluate(client,"window.dispatchEvent(new Event('lab-open-acid'));true");await delay(300);
 const modal=await evaluate(client,`(async()=>{const {useStore}=await import('/src/store/useStore.ts');const s=useStore.getState();return {count:s.sceneModalCount,taskComplete:s.tasks.find(t=>t.id==='task_inspect_acid').completed,modalVisible:!!document.querySelector('.scene-modal'),labels:document.querySelectorAll('.scene-label').length}})()`);
 if(modal.count!==1||modal.taskComplete||!modal.modalVisible||modal.labels)throw Error('Acid modal guard failed: '+JSON.stringify({modal,errors}));await screenshot('p2-acid-modal-desktop');
 await client.send('Emulation.setDeviceMetricsOverride',{width:812,height:375,deviceScaleFactor:3,mobile:true});await delay(500);await screenshot('p2-acid-modal-mobile');

 const result={ordered,navigation,performanceResult,mirror,labelsBlocked,modal,errors};await writeFile('docs/perf/P2_GAME_REVIEW.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(errors.length)throw Error('Runtime exceptions: '+errors.join('\n'));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
