import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.P0_CDP_ORIGIN ?? 'http://127.0.0.1:9222';
const app = process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/?debug=1';
const target = await (await fetch(`${origin}/json/new?${encodeURIComponent(app)}`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const requests = new Map(), errors = [];
let sequence = 0;
socket.addEventListener('message', e => {
  const m = JSON.parse(String(e.data));
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  const pending = requests.get(m.id);
  if (pending) { requests.delete(m.id); m.error ? pending.reject(Error(m.error.message)) : pending.resolve(m.result); }
});
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; requests.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const ev = code => evaluate(`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');${code}})()`);
const delay = ms => new Promise(r => setTimeout(r, ms));
const checks = [];
const check = (value, label) => { if (!value) throw Error(label); checks.push(label); console.log('PASS', label); };
const wait = async (expression, label, timeout = 35000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await evaluate(expression)) return; await delay(150); }
  throw Error(`Timeout: ${label}`);
};
const click = async text => {
  check(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.getClientRects().length&&b.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`), `click ${text}`);
  await delay(150);
};
const interact = async () => {
  await evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true}));true");
};
const screenshot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`docs/screens/${name}.png`, Buffer.from(r.data, 'base64'));
};
try {
  await mkdir('docs/screens', { recursive: true });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.bringToFront'); await send('Page.navigate', { url: app });
  await wait("!!document.querySelector('.start-shell')", 'start screen');
  await ev('useStore.getState().startGame();return true');
  await wait('window.__LAB_DEBUG_STATE__?.apparatusDetails', 'room');
  check(await evaluate('window.__LAB_DEBUG_STATE__.wasteSampleCount===0'), 'no waste at start');
  await ev('useStore.setState({currentPhase:2});return true'); await delay(1300);
  check(await ev("const {fireSimulation}=await import('/src/core/fire/FireSim.ts');return fireSimulation.sources.length===0"), 'no fire before PASS');
  await ev('useStore.getState().setShowFireExtinguisherQuiz(true);return true');
  await delay(600);
  // These are the four actual correct answers in the existing PASS quiz.
  for (const answer of ['B', 'B', 'B', 'A']) {
    const chosen = await evaluate(`(()=>{const options=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&b.querySelector('div')?.textContent.trim()===${JSON.stringify(answer)});if(!options[0])return false;options[0].click();return true})()`);
    check(chosen, `PASS option ${answer}`); await delay(100);
    await click('Xác Nhận Lựa Chọn');
    // Verify the real quiz accepts this answer before advancing.
    check(await evaluate("document.body.textContent.includes('Phản hồi chuẩn xác!')"), 'PASS accepted correct answer');
    await click(await evaluate("document.body.innerText.includes('Hoàn Thành Huấn Luyện')") ? 'Hoàn Thành Huấn Luyện' : 'Bước Tiếp Theo');
  }
  await wait("!!document.querySelector('[data-cinematic-overlay]')", 'PASS starts film');
  check(await ev("return useStore.getState().cinematic==='fire'"), 'PASS completion triggers fire cinematic');
  check(await evaluate("[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length).length===0"), 'all buttons hidden during film');
  const player = await ev('return [...playerCoords.position]');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w' });
  await delay(1500);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
  check(JSON.stringify(player) === JSON.stringify(await ev('return playerCoords.position')), 'movement blocked during film');
  await screenshot('lab-film-fire-approach');
  await wait("window.__LAB_DEBUG_STATE__?.fireSourceCount===1", 'fire ignites in story');
  await screenshot('lab-film-fire-ignition');
  await wait("!document.querySelector('[data-cinematic-overlay]')", 'film ends');
  check(await ev('return !!useStore.getState().player.flags.fireIntroSeen && useStore.getState().sceneModalCount===0'), 'film restores controls without modal leak');
  check(await evaluate("!!document.querySelector('.fire-controls')"), 'PASS controls return');
  await ev("useStore.setState(s=>({currentPhase:3,tasks:s.tasks.map(t=>({...t,completed:t.id==='task_spill_kit'||t.id==='task_spill_neutralize'}))}));return true");
  await delay(1300); check(await evaluate('window.__LAB_DEBUG_STATE__.wasteSampleCount===0'), 'waste hidden until wipe task complete');
  await ev("useStore.getState().completeTask('task_spill_wipe');return true");
  await wait('window.__LAB_DEBUG_STATE__?.wasteSampleCount===3', 'three waste samples appear');
  check(true, 'exactly three samples appear for collection round');
  await ev("useStore.getState().completeTask('task_trash_disposal');return true");
  await wait('window.__LAB_DEBUG_STATE__?.wasteSampleCount===0', 'waste hidden after round');
  check(await ev("const {PhaseEngine}=await import('/src/core/PhaseEngine.ts');let phase=0,ended=false;const s=useStore.getState();const d=PhaseEngine.getTeacherDialog(3,s.tasks.map(t=>({...t,completed:true})),s.player,()=>{},p=>phase=p,()=>ended=true);d.onComplete();return phase===4&&!ended"), 'teacher advances to new phase before certificate');
  await ev("useStore.setState(s=>({currentPhase:4,isDialogActive:false,tasks:s.tasks.map(t=>({...t,completed:!t.phase}))}));return true");
  const rounds = await ev("const {SAFETY_ROUNDS}=await import('/src/data/safetyRounds.ts');return SAFETY_ROUNDS");
  for (const round of rounds) {
    await ev(`playerCoords.position=[${round.position[0]},0,${round.position[2]+.6}];return true`);
    await delay(1100);
    await ev(`
      const {inputManager}=await import('/src/systems/input/InputManager.ts');
      const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');
      const item=useInteractionStore.getState().interactables['${round.id}'];
      const target=item.aimPosition??item.position;
      const dx=target[0]-playerCoords.position[0],dz=target[2]-playerCoords.position[2],dy=target[1]-1.62;
      const rotation=window.__LAB_DEBUG_STATE__.cameraRotation;
      const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
      inputManager.addMouseLook((rotation[1]-yaw)/.0022,(rotation[0]-pitch)/.0022);return true;
    `);
    await wait(`(async()=>{const {useInteractionStore}=await import('/src/core/InteractionSystem.ts');return useInteractionStore.getState().nearestId===${JSON.stringify(round.id)}})()`, `nearest ${round.id}`);
    await delay(800); await interact();
    await wait("!!document.querySelector('[data-cinematic-overlay]')", `film ${round.id}`);
    await screenshot(`lab-film-${round.cinematic}`);
    await wait("!!document.querySelector('#round-title')", `round ${round.id}`);
    await click(round.steps[0].options[0]);
    check(!(await ev(`return useStore.getState().tasks.find(t=>t.id==='${round.id}').completed`)), 'wrong answer cannot complete round');
    await click('Chọn lại');
    for (let i = 0; i < round.steps.length; i++) {
      await click(round.steps[i].options[round.steps[i].correct]);
      if (i === 1) await screenshot(`lab-round-${round.cinematic}`);
      await click(i === round.steps.length - 1 ? 'Hoàn thành vòng chơi' : 'Bước tiếp theo');
    }
    check(await ev(`return useStore.getState().tasks.find(t=>t.id==='${round.id}').completed`), `round completed ${round.id}`);
    await ev('useStore.setState({isDialogActive:false,dialogCallback:null});return true');
    await delay(250);
  }
  check(await ev("const {PhaseEngine}=await import('/src/core/PhaseEngine.ts');let ended=false,next=0;const s=useStore.getState();PhaseEngine.getTeacherDialog(4,s.tasks,s.player,()=>{},p=>next=p,()=>ended=true).onComplete?.();return next===5&&!ended"), 'teacher unlocks the 15-scenario campaign after the advanced rounds');
  await ev('useStore.getState().saveGame();useStore.getState().resumeGame();return true');
  check(await ev("return useStore.getState().currentPhase===4&&useStore.getState().tasks.filter(t=>t.phase===4).every(t=>t.completed)&&useStore.getState().cinematic===null"), 'save/resume retains new round progress');
  check(errors.length===0, `no browser runtime errors (${errors.length})`);
  await writeFile('docs/LAB_CINEMATICS_CHECKS.json', JSON.stringify({ passed: true, checks }, null, 2));
} catch (error) {
  console.error(error); console.error(errors);
  await screenshot('lab-cinematics-failure'); process.exitCode = 1;
} finally { socket.close(); }
