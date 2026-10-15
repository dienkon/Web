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


const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();const client=new Client(target.webSocketDebuggerUrl);await client.connect();const errors=[];
client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description).join(' '))});
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {fireSimulation}=await import('/src/core/fire/FireSim.ts');${code}})()`);
const shot=async(name)=>{const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/screens/${name}.png`,Buffer.from(s.data,'base64'))};
const action=async()=>{await pressInteract(client);await delay(300)};
const sampleFrames=()=>evaluate(client,`new Promise(resolve=>{const timings=[];let last=performance.now();const tick=now=>{timings.push(now-last);last=now;if(timings.length<120)requestAnimationFrame(tick);else{timings.sort((a,b)=>a-b);resolve({fps:1000/(timings.reduce((a,b)=>a+b,0)/timings.length),p95Ms:timings[114],renderer:window.__LAB_RENDERER_INFO__})}};requestAnimationFrame(tick)})`);
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'menu');await delay(1500);
 await mkdir('docs/screens',{recursive:true});await ev('useStore.getState().setShowCharacterCreator(true);return true');await delay(500);await shot('p3-player-profile');
 await ev(`useStore.getState().setShowCharacterCreator(false);useStore.getState().startGame();useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:['task_talk','task_rules','task_shoes','task_hair','task_goggles','task_coat','task_gloves','task_mask'].includes(t.id)})),player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));playerCoords.position=[-8.3,0,-1.5];return true`);await delay(600);await action();
 await ev('useStore.getState().closeDialog();return true');await delay(1000);
 const pickup=await ev(`return {tool:useStore.getState().activeTool,has:useStore.getState().player.inventory.hasFireExtinguisher,taskDone:useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed,flames:window.__LAB_RENDERER_INFO__?.visibleFlames}`);
 if(!pickup.has||pickup.tool!=='extinguisher'||pickup.taskDone||!pickup.flames)throw Error('Pickup/render failed '+JSON.stringify({pickup,errors,state:await ev("const s=useStore.getState();const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');return {view:s.view,phase:s.currentPhase,blocked:s.isDialogActive,task:s.tasks.find(t=>t.id==='task_fire_extinguisher'),interactions:useInteractionStore.getState(),position:playerCoords.position}")}));
 await ev('playerCoords.position=[4.2,0,0];return true');
 await evaluate(client,`(async()=>{const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(Math.PI/.0022,.295/.0022);return true})()`);await delay(500);await shot('p3-fire-before');
 const gas=await ev('return fireSimulation.currentExtinguisher.agentLeft');await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:390,button:'left',buttons:1,clickCount:1});await delay(250);await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:390,button:'left',buttons:0,clickCount:1});
 const noPin=await ev('return fireSimulation.currentExtinguisher.agentLeft');if(gas!==noPin)throw Error('Sprayed with pin still in');
 await evaluate(client,"document.querySelector('[aria-label=\"Rút chốt bình\"]').click();true");await delay(300);
 await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:390,button:'left',buttons:1,clickCount:1});await delay(300);await shot('p3-fire-spray');const firePerformance=await sampleFrames();
 for(let i=0;i<18;i++){
   await evaluate(client,`(async()=>{const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(${i%2?-.045:.045}/.0022,0);return true})()`);await delay(200);
   if(await ev("return useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed"))break;
 }
 await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:390,button:'left',buttons:0,clickCount:1});
 const fire=await ev("return {done:useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed,extinguished:fireSimulation.areAllFiresExtinguished(),flag:useStore.getState().player.flags.fireExtinguished,gas:fireSimulation.currentExtinguisher.agentLeft}");if(!fire.done||!fire.extinguished||!fire.flag)throw Error('Actual fire did not finish '+JSON.stringify(fire));await ev('useStore.getState().closeDialog();return true');
 await ev(`useStore.setState(s=>({currentPhase:3,tasks:s.tasks.map(t=>({...t,completed:!t.id.startsWith('task_spill')&&t.id!=='task_trash_disposal'}))}));playerCoords.position=[-7.8,0,3];return true`);await delay(400);await action();await ev('useStore.getState().closeDialog();return true');await delay(1000);
 const kit=await ev('return {tool:useStore.getState().activeTool,held:window.__LAB_RENDERER_INFO__?.heldTool,has:useStore.getState().player.inventory.hasSweeper}');if(kit.tool!=='spillKit'||kit.held!=='spillKit'||!kit.has)throw Error('Wrong held kit '+JSON.stringify(kit));
 await ev('playerCoords.position=[1.2,0,.6];return true');await delay(400);await action();await ev('useStore.getState().closeDialog();return true');await delay(250);
 if(await ev("return useStore.getState().player.flags.spillStage")!=='cones_placed')throw Error('Cones not placed');await shot('p3-spill-cones');
 for(let i=0;i<3;i++)await action();
 const neutralized=await ev("return {stage:useStore.getState().player.flags.spillStage,progress:useStore.getState().player.flags.spillProgress,done:useStore.getState().tasks.find(t=>t.id==='task_spill_neutralize').completed}");if(neutralized.stage!=='neutralized'||neutralized.progress!==100||!neutralized.done)throw Error('Neutralization failed '+JSON.stringify(neutralized));
 await ev('useStore.getState().closeDialog();return true');await delay(250);await action();
 const waste=await ev("return {holding:useStore.getState().player.inventory.isHoldingTrash,tool:useStore.getState().activeTool,stage:useStore.getState().player.flags.spillStage}");if(!waste.holding||waste.tool!=='waste'||waste.stage!=='cleaned')throw Error('Collection failed '+JSON.stringify(waste));
 await ev('useStore.getState().closeDialog();playerCoords.position=[7.3,0,5];return true');await delay(400);await action();
 const disposed=await ev("const {PhaseEngine}=await import('/src/core/PhaseEngine.ts');const s=useStore.getState();return {holding:s.player.inventory.isHoldingTrash,task:s.tasks.find(t=>t.id==='task_trash_disposal').completed,phaseComplete:PhaseEngine.isPhaseComplete(3,s.tasks,s.player)}");if(disposed.holding||!disposed.task||!disposed.phaseComplete)throw Error('Disposal/phase failed '+JSON.stringify(disposed));
 await ev('useStore.getState().closeDialog();useStore.getState().selectTool(\'spillKit\');return true');await delay(200);await evaluate(client,"document.querySelector('[data-tool=\"extinguisher\"]').click();true");
 if(await ev('return useStore.getState().activeTool')!=='extinguisher')throw Error('Tool switching failed');
 await ev('useStore.getState().selectTool(null);useStore.getState().startGame();return true');await delay(400);
 const reset=await ev('return {fires:fireSimulation.sources.length,tool:useStore.getState().activeTool,spill:useStore.getState().player.flags.spillStage??\'hazard\'}');if(reset.fires||reset.tool||reset.spill!=='hazard')throw Error('New game did not reset');
 if(errors.length)throw Error(errors.join('\n'));
 const result={firePerformance,pickup,noPinBlocked:gas===noPin,fire,kit,neutralized,waste,disposed,reset,errors};await writeFile('docs/perf/P3_GAMEPLAY_CHECK.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
