// Follow-through regression: use the real pin control, aim, spray and sweep after the film.
import { writeFile } from 'node:fs/promises';
const targets = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const target = targets.find(t => t.url.includes('3001'));
if (!target) throw Error('Open the local game on port 3001 with Chrome debugging on 9222.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map(); let id = 0;
socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data)), request = pending.get(message.id);
  if (request) { pending.delete(message.id); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result); }
});
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const send = (method, params) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
const ev = async code => {
  const result = await send('Runtime.evaluate', { expression: `(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {fireSimulation}=await import('/src/core/fire/FireSim.ts');const {inputManager}=await import('/src/systems/input/InputManager.ts');const {toolControls}=await import('/src/systems/input/toolControls.ts');${code}})()`, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await send('Page.bringToFront', {});
  await ev(`useStore.getState().startGame();useStore.setState(s=>({currentPhase:2,player:{...s.player,inventory:{...s.player.inventory,hasFireExtinguisher:true},flags:{...s.player.flags,passTrained:true,fireIntroSeen:true}}}));useStore.getState().selectTool('extinguisher');playerCoords.position=[4.2,0,0];return true`);
  await delay(600);
  await delay(700);
  await ev('const rotation=window.__LAB_DEBUG_STATE__.cameraRotation;inputManager.addMouseLook(rotation[1]/.0022,(rotation[0]+.295)/.0022);return true'); await delay(600);
  const gas = await ev('return fireSimulation.currentExtinguisher.agentLeft');
  await ev('toolControls.spraying=true;return true'); await delay(300);
  const beforePin = await ev('toolControls.spraying=false;return fireSimulation.currentExtinguisher.agentLeft');
  if (gas !== beforePin) throw Error('Spraying worked before pulling pin.');
  await ev(`document.querySelector('[aria-label="Rút chốt bình"]').click();return true`);
  await ev('toolControls.spraying=true;return true');
  for (let i = 0; i < 24; i++) {
    await ev(`inputManager.addMouseLook(${i % 2 ? -.045 : .045}/.0022,0);return true`);
    await delay(200);
    if (await ev("return useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed")) break;
  }
  const result = await ev(`toolControls.spraying=false;return {done:useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed,extinguished:fireSimulation.areAllFiresExtinguished(),flag:useStore.getState().player.flags.fireExtinguished,gas:fireSimulation.currentExtinguisher.agentLeft}`);
  if (!result.done || !result.extinguished || !result.flag) throw Error(JSON.stringify(result));
  await writeFile('docs/LAB_FIRE_FOLLOWTHROUGH.json', JSON.stringify({ passed: true, pinGuard: true, ...result }, null, 2));
  console.log('PASS actual pin, aim, spray and sweep complete fire task', result);
} finally { socket.close(); }
