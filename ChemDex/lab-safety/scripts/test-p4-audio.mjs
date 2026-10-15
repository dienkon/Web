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
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {audioGraph}=await import('/src/audio/AudioGraph.ts');const {spatialSound}=await import('/src/audio/SpatialSoundEngine.ts');${code}})()`);
const diagnostics=()=>ev('return audioGraph.getDiagnostics()');
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'menu');await delay(800);
 const menu=await diagnostics();if(menu.activeVoices||menu.loops.length)throw Error('Menu is not silent');
 await ev('useStore.getState().startGame();useStore.setState({currentPhase:3});return true');await client.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyR',key:'r',windowsVirtualKeyCode:82});await client.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyR',key:'r',windowsVirtualKeyCode:82});await delay(200);
 const ready=await diagnostics();if(ready.state!=='running')throw Error('Audio not unlocked '+JSON.stringify(ready));
 const dedup=await ev("for(let i=0;i<500;i++)audioGraph.startLoop('stress-loop','world',.05,{filter:'bandpass',cutoff:1600});return audioGraph.getDiagnostics()");if(dedup.starts['stress-loop']!==1||dedup.loops.filter(x=>x==='stress-loop').length!==1)throw Error('Loop duplicated');
 await ev("for(let i=0;i<500;i++)audioGraph.stopLoop('stress-loop');audioGraph.startLoop('stress-loop','world',.05,{filter:'bandpass',cutoff:1600});return true");await delay(200);
 const race=await diagnostics();if(!race.loops.includes('stress-loop')||race.starts['stress-loop']!==2)throw Error('Old stop killed new loop');
 await ev("audioGraph.stopLoop('stress-loop');return true");await delay(200);const released=await diagnostics();if(released.activeVoices||released.loops.length)throw Error('Loop nodes leaked');
 const rewards=await ev("const {soundManager}=await import('/src/audio/soundManager.ts');for(let i=0;i<500;i++)soundManager.play('success');return audioGraph.getDiagnostics()");if(rewards.starts.reward!==1)throw Error('Reward spam not limited');await delay(600);
 await ev("for(let i=0;i<100;i++)useStore.getState().completeTask('task_spill_kit');return true");const repeated=await diagnostics();if(repeated.starts.reward!==2)throw Error('Completed task replayed its sound');await delay(600);
 await ev("useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:['task_talk','task_rules','task_shoes','task_hair','task_goggles','task_coat','task_gloves','task_mask'].includes(t.id)}))}));useStore.getState().equipItem('hasFireExtinguisher');playerCoords.position=[4.2,0,0];return true");await delay(400);
 await evaluate(client,"document.querySelector('[aria-label=\"Rút chốt bình\"]').click();true");await delay(200);
 const rect=await evaluate(client,"(()=>{const r=document.querySelector('[aria-label=\"Giữ để phun CO2\"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',buttons:1,clickCount:1});await delay(600);
 const spraying=await diagnostics();if(!spraying.loops.includes('co2-hiss')||spraying.starts['co2-hiss']!==1)throw Error('Held spray restarted audio '+JSON.stringify(spraying));
 await ev('useStore.getState().setShowSettings(true);return true');await delay(200);const modal=await diagnostics();if(modal.worldVoices||modal.loops.length)throw Error('Sound continued through modal');
 await delay(300);const modalStable=await diagnostics();if(modalStable.starts['co2-hiss']!==spraying.starts['co2-hiss'])throw Error('Sound restarted behind modal');
 await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',buttons:0,clickCount:1});await ev('useStore.getState().setShowSettings(false);return true');await delay(250);
 await ev("useStore.getState().setRunState('PAUSED');return true");await delay(200);const pause=await diagnostics();if(pause.worldVoices||pause.loops.length)throw Error('Pause leaked audio');
 await ev("useStore.getState().setRunState('RUNNING');return true");await delay(150);
 await ev("spatialSound.startExtinguisherHiss();useStore.getState().updateSettings({sfxVolume:0});return true");await delay(200);const mute=await diagnostics();if(mute.activeVoices||mute.loops.length||mute.sfxVolume!==0)throw Error('SFX zero did not mute all engines');
 await ev('useStore.getState().updateSettings({sfxVolume:.8});return true');await delay(200);
 await ev("window.dispatchEvent(new Event('blur'));return true");await delay(200);const blur=await diagnostics();if(blur.activeVoices||blur.loops.length||!blur.inactive)throw Error('Blur leaked audio');
 await ev("window.dispatchEvent(new Event('focus'));useStore.getState().completeTask('task_fire_extinguisher');return true");await delay(700);const completed=await diagnostics();if(completed.activeVoices||completed.loops.length)throw Error('Fire completion kept sound alive');
 await ev("useStore.getState().startGame();return true");await delay(200);const restart=await diagnostics();if(restart.activeVoices||restart.loops.length)throw Error('Restart kept sound alive');
 await ev("useStore.getState().setView('start');return true");await delay(200);const quit=await diagnostics();if(quit.activeVoices||quit.loops.length)throw Error('Menu kept sound alive');
 if(errors.length)throw Error(errors.join('\n'));const result={menu,ready,dedup,race,released,rewards,repeated,spraying,modal,pause,mute,blur,completed,restart,quit,errors};await writeFile('docs/perf/P4_AUDIO_CHECK.json',JSON.stringify(result,null,2));console.log(JSON.stringify({singleLoopStart:dedup.starts['stress-loop'],restartSurvivesOldStop:race.loops.includes('stress-loop'),releasedVoices:released.activeVoices,heldSprayStarts:spraying.starts['co2-hiss'],modalWorldVoices:modal.worldVoices,pauseWorldVoices:pause.worldVoices,mutedVoices:mute.activeVoices,completedVoices:completed.activeVoices,quitVoices:quit.activeVoices,errors},null,2));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
