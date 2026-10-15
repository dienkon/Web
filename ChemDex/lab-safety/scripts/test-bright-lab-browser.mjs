import { mkdir, writeFile } from 'node:fs/promises';

const cdp = process.env.P0_CDP_ORIGIN ?? 'http://127.0.0.1:9222';
const app = process.env.P0_APP_URL ?? 'http://127.0.0.1:3001/?debug=1';
const target = await (await fetch(`${cdp}/json/new?${encodeURIComponent(app)}`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let sequence = 0;
socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data));
  if (message.method === 'Runtime.exceptionThrown') {
    errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
  }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result);
});
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
const ev = code => evaluate(`(async()=>{
  const {useStore,playerCoords}=await import('/src/store/useStore.ts');
  const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');
  const {inputManager}=await import('/src/systems/input/InputManager.ts');
  ${code}
})()`);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
function check(value, message) {
  if (!value) throw Error(message);
  checks.push(message);
  console.log('PASS', message);
}
async function wait(expression, message, timeout = 25000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw Error(`Timed out: ${message}`);
}
async function click(text) {
  const found = await evaluate(`(()=>{
    const panel=document.querySelector('[data-scenario-panel]')??document;
    const button=[...panel.querySelectorAll('button')].find(b=>!b.disabled&&b.getClientRects().length&&b.textContent.includes(${JSON.stringify(text)}));
    if(!button)return false;
    button.scrollIntoView({block:'nearest'});button.click();return true;
  })()`);
  if (!found) throw Error(`Missing button: ${text}`);
  await delay(80);
}
async function clickLabel(label) {
  const found = await evaluate(`(()=>{
    const button=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)}&&!b.disabled);
    if(!button)return false;button.click();return true;
  })()`);
  if (!found) throw Error(`Missing label: ${label}`);
  await delay(130);
}
async function aim(position, point) {
  await ev(`playerCoords.position=${JSON.stringify(position)};inputManager.resetAll();return true`);
  await delay(1100);
  await ev(`
    const target=${JSON.stringify(point)};
    const dx=target[0]-playerCoords.position[0],dy=target[1]-1.62,dz=target[2]-playerCoords.position[2];
    const rotation=window.__LAB_DEBUG_STATE__.cameraRotation;
    const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
    inputManager.addMouseLook((rotation[1]-yaw)/.0022,(rotation[0]-pitch)/.0022);return true;
  `);
  await delay(600);
}
async function interact() {
  await evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true}));true");
}
async function shot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`docs/bright-lab/${name}.png`, Buffer.from(result.data, 'base64'));
}
async function visibleButtonIssues() {
  return evaluate(`(()=>{
    const panel=document.querySelector('[data-scenario-panel]');
    const elements=[...(panel??document).querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);
    const issues=[];
    for(const button of elements){
      const r=button.getBoundingClientRect();
      if(r.bottom<=0||r.top>=innerHeight)continue;
      const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2));
      const y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
      const top=document.elementFromPoint(x,y);
      if(top&&!button.contains(top)&&!top.contains(button))issues.push(button.getAttribute('aria-label')??button.textContent.trim());
    }
    return issues;
  })()`);
}

try {
  await mkdir('docs/bright-lab', { recursive: true });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.bringToFront');
  await send('Page.navigate', { url: app });
  await wait("!!document.querySelector('.start-shell')", 'start menu');
  await shot('white-start');
  await ev('useStore.getState().startGame();return true');
  await wait('!!window.__LAB_DEBUG_STATE__?.cameraRotation', 'debug camera');
  await delay(500);
  check(await ev('return useInteractionStore.getState().nearestId===null'), 'no automatic equipment prompt at spawn');
  await aim([0, 0, -2.5], [0, 1.2, -4.5]);
  check(await ev("return useInteractionStore.getState().nearestId==='teacher_talk'"), 'looking at nearby teacher acquires the intended target');
  await wait('window.__LAB_DEBUG_STATE__?.detectedRing===true', 'green ring');
  check(await evaluate("document.querySelectorAll('[data-focus-prompt]').length===1"), 'exactly one prompt accompanies green detection ring');
  await shot('green-detection');
  await aim([0, 0, -2.5], [0, 1.62, 1]);
  check(await ev('return useInteractionStore.getState().nearestId===null'), 'looking away clears interaction instead of showing nearby objects');
  await aim([-6, 0, 5.8], [-6, 3.8, 4.8]);
  check(await ev('return useInteractionStore.getState().nearestId===null'), 'ceiling lights are not auto-detected');
  await aim([3.1, 0, 4.05], [3.1, 1.05, 2.65]);
  const equipmentFocus = await ev('return useInteractionStore.getState().nearestId');
  check(equipmentFocus === 'equipment:detail-wash-bottle', `aim and actual surface hit detect wash bottle (${equipmentFocus})`);
  await interact();
  await wait("!!document.querySelector('#instrument-title')", 'equipment opens from detected item');
  check(await evaluate("getComputedStyle(document.querySelector('#instrument-title').closest('section')).backgroundColor==='rgb(255, 255, 255)'"), 'equipment question panel has a white background');
  await shot('white-equipment');
  await clickLabel('Đóng dụng cụ');
  await aim([3.1, 0, 4.05], [3.1, 1.62, 6]);
  await ev("window.dispatchEvent(new CustomEvent('lab-use-equipment',{detail:'detail-wash-bottle'}));return true");
  // A synthetic equipment event must not bypass the current detection state.
  await delay(150);
  check(await evaluate("!document.querySelector('#instrument-title')"), 'stale equipment events cannot bypass detection');
  await ev("useStore.setState(s=>({currentPhase:5,activeTool:null,tasks:s.tasks.map(t=>({...t,completed:t.phase!==5}))}));return true");
  const scenarios = await ev("const {LAB_SCENARIOS}=await import('/src/scenarios/catalog.ts');return LAB_SCENARIOS");
  for (let index = 0; index < scenarios.length; index++) {
    const scenario = scenarios[index];
    await delay(180);
    const targetPoint = await ev(`const item=useInteractionStore.getState().interactables['scenario:${scenario.id}'];return item?.aimPosition??${JSON.stringify(scenario.position)}`);
    await aim(scenario.approach, targetPoint);
    await wait(`(async()=>{const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');return useInteractionStore.getState().nearestId==='scenario:${scenario.id}'})()`, `scenario focus ${scenario.id}`);
    await interact();
    await wait("!!document.querySelector('[data-cinematic-overlay]')", 'scenario movie');
    if (index === 0) {
      check(await evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length).length===0"), 'scenario movie hides all game buttons');
      await delay(5000);
      await shot('white-cinematic');
      await wait("!!document.querySelector('[data-scenario-panel]')", 'movie finishes into practice', 30000);
    } else {
      await ev('useStore.getState().finishCinematic();return true');
      await wait("!!document.querySelector('[data-scenario-panel]')", 'practice panel');
    }
    check(await evaluate("getComputedStyle(document.querySelector('.scenario-panel')).backgroundColor==='rgb(255, 255, 255)'"), `white question surface ${scenario.id}`);
    if (index === 0) {
      check((await visibleButtonIssues()).length === 0, 'desktop scenario controls are not covered');
      await shot('white-observation');
      await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
      await delay(400);
      check((await visibleButtonIssues()).length === 0, 'landscape mobile scenario controls are not covered');
      await shot('white-mobile-question');
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    }
    for (const clue of scenario.clues) await clickLabel(`Quan sát: ${clue.title}`);
    await click('Chọn cách xử lý');
    const question = scenario.decisions[0];
    await click(question.choices.find(choice => !choice.safe).label);
    await click('Chọn lại');
    for (const decision of scenario.decisions) {
      await click(decision.choices.find(choice => choice.safe).label);
      await click('Tiếp tục');
    }
    await click(scenario.actions[2].label);
    check(!(await ev(`return useStore.getState().tasks.find(t=>t.id==='${scenario.taskId}').completed`)), `out-of-order action cannot complete ${scenario.id}`);
    for (const action of scenario.actions) await click(action.label);
    if (index === 0) await shot('white-debrief');
    await click('Ghi nhận và hoàn thành');
    check(await ev(`return useStore.getState().tasks.find(t=>t.id==='${scenario.taskId}').completed`), `scenario completed ${scenario.id}`);
    check(await ev('return useStore.getState().sceneModalCount===0'), `no modal leak ${scenario.id}`);
  }
  check(await ev("const {PhaseEngine}=await import('/src/core/PhaseEngine.ts');const s=useStore.getState();let ended=false;PhaseEngine.getTeacherDialog(5,s.tasks,s.player,()=>{},()=>{},()=>ended=true).onComplete?.();return ended"), 'teacher unlocks certificate only after the 15-scenario campaign');
  await ev('useStore.getState().saveGame();useStore.getState().resumeGame();return true');
  check(await ev("const {useScenarioSession}=await import('/src/scenarios/store.ts');return Object.values(useScenarioSession.getState().runs).filter(r=>r.completed).length===15"), 'all scenario runs survive save and resume');
  await ev('useStore.setState({isDialogActive:false,activeTool:null,currentPhase:1});return true');
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await delay(700);
  check((await visibleButtonIssues()).length === 0, 'landscape HUD buttons do not overlap');
  await shot('white-mobile-hud');
  const frames = await evaluate(`new Promise(resolve=>{
    const samples=[];let last=performance.now();
    function tick(now){samples.push(now-last);last=now;if(samples.length<90)requestAnimationFrame(tick);else resolve({meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,renderer:window.__LAB_RENDERER_INFO__});}
    requestAnimationFrame(tick);
  })`);
  check(errors.length === 0, `no browser runtime errors (${errors.length})`);
  await writeFile('docs/bright-lab/browser-checks.json', JSON.stringify({ passed: true, checks, errors, frames }, null, 2));
} catch (error) {
  console.error(error);
  console.error(errors);
  await shot('failure');
  process.exitCode = 1;
} finally { socket.close(); }
