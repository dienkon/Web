import { mkdirSync, writeFileSync } from 'node:fs';

const origin = 'http://127.0.0.1:6771';
const debugging = 'http://127.0.0.1:9331';
const targets = await (await fetch(`${debugging}/json/list`)).json();
let target = targets.find(item => item.type === 'page' && item.url.startsWith(origin));
if (!target) target = await (await fetch(`${debugging}/json/new?${origin}`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let serial = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject, timeout } = pending.get(message.id);
    clearTimeout(timeout);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  }
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, method === 'Runtime.evaluate' ? 120000 : 30000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result.value;
}
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`new Promise(resolve => { const started = Date.now(); const timer = setInterval(() => { if (document.querySelector('canvas') || Date.now() - started > 25000) { clearInterval(timer); resolve(true); } }, 250); })`);
  const mode = process.argv[2] ?? 'inspect';
  if (['ph', 'pipette', 'controls'].includes(mode)) {
    await send('Page.reload');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (mode === 'inspect') {
    console.log(JSON.stringify(await evaluate(`({ title: document.title, canvas: !!document.querySelector('canvas'), text: document.body.innerText.slice(0, 6000), buttons: [...document.querySelectorAll('button')].map(b => ({text:b.innerText, title:b.title})).slice(0,80) })`), null, 2));
  } else if (mode === 'library') {
    console.log(JSON.stringify(await evaluate(`(async () => {
      const tab = [...document.querySelectorAll('button')].find(button => button.innerText === 'BÀI HỌC');
      if (!tab) throw new Error('Missing curriculum tab');
      tab.click();
      await new Promise(resolve => setTimeout(resolve, 1500));
      const input = document.querySelector('input[aria-label="Tìm phản ứng"]');
      if (!input) throw new Error('Missing searchable reaction library');
      const section = input.closest('section');
      const count = section.querySelectorAll('button').length;
      if (count !== 126) throw new Error('Expected 126 entries, got ' + count);
      const copper = [...section.querySelectorAll('button')].find(button => button.innerText.includes('CuSO4 + NH3'));
      if (!copper) throw new Error('Missing copper-ammonia entry');
      copper.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      const detail = section.innerText;
      if (!detail.includes('4NH3') || !detail.includes('Bước 4.')) throw new Error('Missing equation or steps');
      return { entries: count, detailedSteps: 4, detail };
    })()`), null, 2));
  } else if (mode === 'drag') {
    const before = await evaluate(`(async () => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      useAppStore.getState().setMoveMode(true);
      return { position: [...useAppStore.getState().vessels.beaker_1.position] };
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 530, y: 565 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 530, y: 565, button: 'left', clickCount: 1 });
    for (let frame = 1; frame <= 15; frame++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 530 + frame * 4, y: 565 + frame * 3, button: 'left', buttons: 1 });
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 590, y: 610, button: 'left', clickCount: 1 });
    const after = await evaluate(`(async () => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      const state = useAppStore.getState();
      return { position: state.vessels.beaker_1.position, dragging: state.draggingVesselId, pouring: state.isPouring };
    })()`);
    if (before.position.every((value, axis) => value === after.position[axis])) throw new Error('Beaker did not move');
    if (after.dragging !== null || after.pouring) throw new Error('Move mode left an active drag or pour');
    console.log(JSON.stringify({ before, after }, null, 2));
  } else if (mode === 'controls') {
    const clickObject = async name => {
      const point = await evaluate(`(async()=>{
        await new Promise(resolve=>setTimeout(resolve,500));
        const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const THREE=await import('/node_modules/.vite/deps/three.js');
        const canvas=document.querySelector('canvas');const root=_roots.get(canvas).store.getState();
        const object=root.scene.getObjectByName(${JSON.stringify(name)});
        const point=object.getWorldPosition(new THREE.Vector3()).project(root.camera);
        const rect=canvas.getBoundingClientRect();return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
      })()`);
      await send('Input.dispatchMouseEvent', { type:'mouseMoved', ...point });
      await send('Input.dispatchMouseEvent', { type:'mousePressed', ...point, button:'left', clickCount:1 });
      await send('Input.dispatchMouseEvent', { type:'mouseReleased', ...point, button:'left', clickCount:1 });
    };
    const before = await evaluate(`(async()=>{
      const {useAppStore}=await import('/src/store/useAppStore.ts');
      const {useToolDockStore}=await import('/src/handling/toolDock.ts');
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const store=useAppStore.getState();store.setMoveMode(false);store.setActiveTool('none');
      useToolDockStore.setState(state=>({positions:{...state.positions,balance:[-0.5,0.4,3]}}));
      store.setVesselState('beaker_1',{position:[-0.5,-0.02,3],mass_g:20,volume_ml:20});
      await new Promise(resolve=>setTimeout(resolve,1000));
      const root=_roots.get(document.querySelector('canvas')).store.getState();
      let value;root.scene.getObjectByName('tool-balance').traverse(child=>{if(typeof child.text==='string'&&child.text.includes('g'))value=child.text;});return value;
    })()`);
    await clickObject('balance-tare');
    const tared = await evaluate(`(async()=>{await new Promise(resolve=>setTimeout(resolve,1000));const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');let value;_roots.get(document.querySelector('canvas')).store.getState().scene.getObjectByName('tool-balance').traverse(child=>{if(typeof child.text==='string'&&child.text.includes('g'))value=child.text;});return value;})()`);
    if(Math.abs(parseFloat(tared))>0.1)throw new Error('Tare control failed: '+tared);
    await evaluate(`(async()=>{
      const {useAppStore}=await import('/src/store/useAppStore.ts');const {useToolDockStore}=await import('/src/handling/toolDock.ts');
      const store=useAppStore.getState();useToolDockStore.setState(state=>({positions:{...state.positions,balance:[-8,0.4,-3],burette:[0,1,3]}}));
      store.updateBurette({position:[0,1,3],currentVolume_ml:10,isDispensing:false});
      store.setVesselState('beaker_1',{position:[-4,-0.135,0]});
    })()`);
    await clickObject('burette-stopcock');
    const opened = await evaluate(`(async()=>{await new Promise(resolve=>setTimeout(resolve,250));const {useAppStore}=await import('/src/store/useAppStore.ts');return useAppStore.getState().burette.isDispensing;})()`);
    await clickObject('burette-stopcock');
    const closed = await evaluate(`(async()=>{const {useAppStore}=await import('/src/store/useAppStore.ts');return useAppStore.getState().burette.isDispensing;})()`);
    if (!opened || closed) throw new Error('Stopcock did not open/close: '+JSON.stringify({opened,closed}));
    const report={before,tared,stopcockOpened:opened,stopcockClosed:!closed};
    writeFileSync('artifacts/physical-controls-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  } else if (mode === 'ph') {
    const report = await evaluate(`(async () => {
      const {useAppStore}=await import('/src/store/useAppStore.ts');
      const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const store=useAppStore.getState();
      store.setMoveMode(false);
      store.setVesselState('beaker_1',{volume_ml:20,volume:0.2,mass_g:20,ph:3.2});
      store.setSelectedVesselId('beaker_1');
      store.setActiveTool('ph_meter');
      await new Promise(resolve=>setTimeout(resolve,1000));
      const root=_roots.get(document.querySelector('canvas')).store.getState();
      const group=root.scene.getObjectByName('tool-ph_meter');
      const label=group.children.find(child=>typeof child.text==='string');
      const immersed=label?.text;
      store.setVesselState('beaker_1',{volume_ml:0,volume:0,mass_g:0});
      await new Promise(resolve=>setTimeout(resolve,200));
      const dry=label?.text;
      if(immersed!=='pH 3.20'||dry!=='pH ---')throw new Error('Invalid pH readings: '+immersed+' / '+dry);
      return {immersed,dry};
    })()`);
    writeFileSync('artifacts/ph-probe-review.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } else if (mode === 'pipette') {
    await evaluate(`(async()=>{
      const {useAppStore}=await import('/src/store/useAppStore.ts');
      const store=useAppStore.getState(); store.setMoveMode(false);
      store.setVesselState('beaker_1',{volume_ml:20,volume:0.2,mass_g:20.1,contents:[{formula:'NaCl',phase:'aq',moles:0.002,mass_g:0.11688}],substances:['NaCl']});
      store.setVesselState('flask_1',{volume_ml:0,volume:0,mass_g:0,contents:[],substances:[]});
      store.setSelectedVesselId('beaker_1');store.setActiveTool('pipette');
    })()`);
    const clickBulb = async () => {
      const point = await evaluate(`(async()=>{
        await new Promise(resolve=>setTimeout(resolve,700));
        const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const THREE=await import('/node_modules/.vite/deps/three.js');
        const canvas=document.querySelector('canvas');const root=_roots.get(canvas).store.getState();
        const group=root.scene.getObjectByName('tool-pipette');
        const point=new THREE.Vector3(0,0.85,0).applyMatrix4(group.matrixWorld).project(root.camera);
        const rect=canvas.getBoundingClientRect();return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
      })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    };
    await clickBulb();
    const aspirated = await evaluate(`(async()=>{const {useAppStore}=await import('/src/store/useAppStore.ts');const store=useAppStore.getState();const volume=store.vessels.beaker_1.volume_ml;store.setActiveTool('thermometer');return volume;})()`);
    await evaluate(`(async()=>{await new Promise(resolve=>setTimeout(resolve,300));const {useAppStore}=await import('/src/store/useAppStore.ts');const store=useAppStore.getState();store.setSelectedVesselId('flask_1');store.setActiveTool('pipette');})()`);
    await clickBulb();
    const result = await evaluate(`(async()=>{const {useAppStore}=await import('/src/store/useAppStore.ts');const {vessels}=useAppStore.getState();return {sourceVolume_ml:vessels.beaker_1.volume_ml,receiverVolume_ml:vessels.flask_1.volume_ml,receiverMoles:vessels.flask_1.contents.find(c=>c.formula==='NaCl')?.moles};})()`);
    if (aspirated !== 10 || result.sourceVolume_ml !== 10 || result.receiverVolume_ml !== 2.5 || Math.abs(result.receiverMoles - 0.00025) > 1e-10) throw new Error('Pipette UI conservation failure: '+JSON.stringify({aspirated,result}));
    writeFileSync('artifacts/pipette-interaction-review.json', JSON.stringify({aspirated,...result},null,2)+'\n');
    console.log(JSON.stringify({aspirated,...result}));
  } else if (mode === 'tools') {
    const results = [];
    for (const tool of ['pipette', 'thermometer', 'stirring_rod', 'spatula', 'balance', 'burette', 'ph_meter']) {
      const start = await evaluate(`(async () => {
        const { useAppStore } = await import('/src/store/useAppStore.ts');
        const { useToolDockStore } = await import('/src/handling/toolDock.ts');
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const THREE = await import('/node_modules/.vite/deps/three.js');
        useAppStore.getState().setActiveTool('none');
        useAppStore.getState().setMoveMode(true);
        const id = ${JSON.stringify(tool)};
        const position = [0, id === 'burette' ? 0 : 0.4, 3];
        useToolDockStore.setState(state => ({ positions: {...state.positions, [id]: position} }));
        await new Promise(resolve => setTimeout(resolve, 800));
        const canvas = document.querySelector('canvas');
        const root = _roots.get(canvas)?.store.getState();
        if (!root) throw new Error('R3F root unavailable');
        const group = root.scene.getObjectByName('tool-' + id);
        if (!group) throw new Error('Tool is not mounted: ' + id);
        const mesh = group.children.find(child => child.isMesh && child.visible);
        if (!mesh) throw new Error('Tool has no pickable body: ' + id);
        const point = mesh.getWorldPosition(new THREE.Vector3()).project(root.camera);
        const rect = canvas.getBoundingClientRect();
        return { position, x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
      })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', clickCount: 1 });
      for (let frame = 1; frame <= 12; frame++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x + frame * 5, y: start.y + frame * 2, buttons: 1, button: 'left' });
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: start.x + 60, y: start.y + 24, button: 'left', clickCount: 1 });
      const after = await evaluate(`(async () => { const {useToolDockStore}=await import('/src/handling/toolDock.ts'); return { position:useToolDockStore.getState().positions[${JSON.stringify(tool)}], dragging:useToolDockStore.getState().dragging }; })()`);
      const moved = start.position.some((value, axis) => Math.abs(value - after.position[axis]) > 0.01);
      results.push({ tool, moved, released: after.dragging === null, before: start.position, after: after.position });
      console.log(JSON.stringify(results.at(-1)));
      await evaluate(`(async () => { const {useToolDockStore}=await import('/src/handling/toolDock.ts'); useToolDockStore.setState(state=>({positions:{...state.positions,[${JSON.stringify(tool)}]:[-8,0.4,-3]}})); })()`);
    }
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/tool-interaction-review.json', JSON.stringify(results, null, 2) + '\n');
    if (results.some(result => !result.moved || !result.released)) throw new Error('Some tool drag checks failed');
  } else if (mode === 'benchmark') {
    await send('Page.reload');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const report = await evaluate(`(async () => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      const { useFrameStats } = await import('/src/render/FrameTelemetry.tsx');
      const { useQualityStore } = await import('/src/vfx/quality.ts');
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('webgl2');
      const extension = context?.getExtension('WEBGL_debug_renderer_info');
      const renderer = extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unknown';
      const readings = [];
      await new Promise(resolve => setTimeout(resolve, 3000));
      for (let second = 0; second < 60; second++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        readings.push({ ...useFrameStats.getState(), quality: useQualityStore.getState().effectiveTier });
      }
      return { scenario: 'default_scene_after_reload', seconds: 60, renderer,
        resolution: [canvas?.width, canvas?.height], vesselCount: useAppStore.getState().vesselIds.length, readings };
    })()`);
    mkdirSync('artifacts', { recursive: true });
    writeFileSync('artifacts/browser-performance.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ ...report, readings: undefined,
      summary: { minFps: Math.min(...report.readings.map(sample => sample.fps)), maxFps: Math.max(...report.readings.map(sample => sample.fps)),
        averageFps: report.readings.reduce((sum, sample) => sum + sample.fps, 0) / report.readings.length,
        maxP95_ms: Math.max(...report.readings.map(sample => sample.p95_ms)),
        qualityTiers: [...new Set(report.readings.map(sample => sample.quality))] } }, null, 2));
  }
  mkdirSync('artifacts', { recursive: true });
  if (mode === 'inspect' || mode === 'library' || mode === 'drag') {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`artifacts/lab-${mode}.png`, Buffer.from(screenshot.data, 'base64'));
  }
  console.log(JSON.stringify({ errors }));
} finally { socket.close(); }
