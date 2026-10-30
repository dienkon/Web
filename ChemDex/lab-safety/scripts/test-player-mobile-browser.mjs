import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,delay,click,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const dir='docs/player-mobile',snapshots={};
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${name}.png`,Buffer.from(r.data,'base64'));};
const inspect=()=>evaluate('window.__LAB_INSPECT_MODELS__()');
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
try{
 await mkdir(dir,{recursive:true});await send('Page.enable');await send('Runtime.enable');
 const before=JSON.parse(await readFile(`${dir}/before-character.json`)),after=JSON.parse(await readFile(`${dir}/after-character.json`));
 check(after.snapshots.length===23&&after.passed,'23 final wardrobe photos captured without runtime exceptions');
 for(const row of after.snapshots){
  check(row.model.invalidVertices===0&&Math.abs(row.model.min[1])<1e-6,'finite model and grounded soles: '+row.id);
 }
 const full=after.snapshots.find(r=>r.id==='full-front').model;
 check(full.calls<before.snapshots[0].model.calls*.5,'more detailed full avatar uses less than half of previous draw calls');
 for(const hex of ['#e5e7dc','#70a9b7','#78a4ad','#9abfc5','#405967'])check(full.palette.includes(hex),'real avatar vertex/material palette contains '+hex);
 const coat=full.wardrobe.find(x=>x.name==='asset-worn-coat');check(coat.fastened&&coat.buttons===6&&coat.pockets===3,'closed coat has six modeled buttons and three pockets');
 for(const ear of full.anchors.filter(a=>a.name.startsWith('wardrobe-mask-ear-'))){const expected=[Math.sign(ear.at[0])*.184,1.595,0];check(dist(ear.at,expected)<.004,'mask loop terminates within 4 mm of actual ear '+ear.name);}
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',runState:'RUNNING',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true},inventory:{...s.player.inventory,hasSweeper:true}}}));return true;`);
 await wait('window.__LAB_INSPECT_BATCHES__','batch inspector');await delay(1600);
 snapshots.batching=await evaluate('window.__LAB_INSPECT_BATCHES__()');
 check(snapshots.batching.batches.length===3,'architecture, benches and decor all build their render batches');
 check(snapshots.batching.batches.every(b=>b.sourceMeshes>b.drawBatches),'each batch retains named interaction proxies while reducing draws');
 const all=()=>ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.resetAll();playerCoords.position=[-.8,0,5.2];return true;`);
 await all();await delay(800);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;inputManager.addMouseLook((r[1]-Math.PI)/(.0022*s.cameraSensitivity),r[0]/(.0022*s.cameraSensitivity));useStore.setState({activeTool:'spillKit'});return true;`);await delay(1600);
 let models=await inspect();
 for(const [grip,palm]of [['held-mirror-pan-grip','avatar-right-palm'],['held-mirror-brush-grip','avatar-left-palm']]){
  check(dist(models.find(m=>m.name===grip).position,models.find(m=>m.name===palm).position)<.035,'mirror tool touches same anatomical palm: '+grip);
 }
 await capture('after-game-mirror-spill');
 const count=await evaluate('window.__LAB_RENDERER_INFO__.mirrorUpdates');await wait(`window.__LAB_RENDERER_INFO__.mirrorUpdates>${count}`,'live reflection counter',10000);
 check(true,'visible mirror updates live avatar');
 await ev('useStore.setState({showSettings:true});return true;');await delay(1100);const paused=await evaluate('window.__LAB_RENDERER_INFO__.mirrorUpdates');await delay(1100);check(await evaluate(`window.__LAB_RENDERER_INFO__.mirrorUpdates===${paused}`),'modal stops mirror rendering');
 await ev('useStore.setState({showSettings:false});return true;');
 await ev(`const {fireSimulation}=await import('/src/core/fire/FireSim.ts');useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_fire_extinguisher'})),activeTool:'extinguisher',player:{...s.player,inventory:{...s.player.inventory,hasFireExtinguisher:true}}}));return true;`);await delay(1400);
 models=await inspect();
 check(dist(models.find(m=>m.name==='held-mirror-extinguisher-grip').position,models.find(m=>m.name==='avatar-right-palm').position)<.005,'mirror extinguisher handle is within 5 mm of palm');
 check(dist(models.find(m=>m.name==='held-mirror-nozzle-port').position,models.find(m=>m.name==='avatar-left-palm').position)<.035,'mirror nozzle base touches left palm');
 check(await evaluate(`window.__LAB_INSPECT_RESOURCES__('asset-mirror-extinguisher')[0].textures.length>0`),'mirror uses labeled detailed carried extinguisher');await capture('after-game-mirror-extinguisher');
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;inputManager.addMouseLook(r[1]/(.0022*s.cameraSensitivity),r[0]/(.0022*s.cameraSensitivity));return true;`);await delay(1400);const hidden=await evaluate('window.__LAB_RENDERER_INFO__.mirrorUpdates');await delay(1100);check(await evaluate(`window.__LAB_RENDERER_INFO__.mirrorUpdates===${hidden}`),'mirror completely behind camera stops rendering');
 // Exercise merged geometry disposal and exclusions in a separate actual R3F root.
 snapshots.lifecycle=await evaluate(`(async()=>{
 const {default:R}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react.js').name),F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name),DOM=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react-dom_client.js').name);const {StaticRoomBatch}=await import('/src/components/3d/lab/StaticRoomBatch.tsx');
 const host=document.createElement('div');host.style.cssText='position:fixed;width:64px;height:64px;bottom:0;left:0;pointer-events:none';document.body.append(host);const root=(DOM.createRoot??DOM.default.createRoot)(host),pause=ms=>new Promise(r=>setTimeout(r,ms));const cycles=[];
 const mesh=name=>R.createElement('mesh',{name},R.createElement('boxGeometry'),R.createElement('meshStandardMaterial',{color:'#567890'}));
 const render=children=>root.render(R.createElement(F.Canvas,{dpr:1,frameloop:'always'},children));
 try{for(let i=0;i<3;i++){
 render(R.createElement(StaticRoomBatch,{id:'test'},mesh('static-a'),mesh('static-b'),R.createElement('group',{name:'door-leaf-test'},mesh('moving-door'))));
 let store;for(let n=0;n<100;n++){const canvas=host.querySelector('canvas');store=F._roots.get(canvas)?.store;if(store?.getState().scene.getObjectByName('static-a')?.userData.staticRenderProxy)break;await pause(100);}
 const scene=store.getState().scene,proxy=scene.getObjectByName('static-a'),door=scene.getObjectByName('moving-door'),mounted={...store.getState().gl.info.memory},state={proxy:!!proxy?.userData.staticRenderProxy&&!proxy.visible,door:!!door?.visible&&!door.userData.staticRenderProxy};
 render(R.createElement('group'));await pause(700);for(let n=0;n<40&&store.getState().gl.info.memory.geometries>0;n++)await pause(100);cycles.push({mounted,cleared:{...store.getState().gl.info.memory},...state});
 }return cycles;}finally{root.unmount();await pause(600);host.remove();}
})()`);
 check(snapshots.lifecycle.every(c=>c.proxy&&c.door),'batch proxy and animated-door exclusion survive every remount');
 check(snapshots.lifecycle.every(c=>c.mounted.geometries>0&&c.cleared.geometries===0),'all original and merged geometries released after three remounts');
 await ev('useStore.setState({view:"start",showCharacterCreator:true});return true;');await wait("document.querySelector('canvas')",'character preview');await delay(500);await click('Tóc tết');await delay(500);await capture('after-character-creator');
 snapshots.preview=await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name);const stores=[...F._roots.values()].map(r=>r.store.getState());const preview=stores.find(s=>s.frameloop==='demand'&&s.scene.getObjectByName('asset-character')&&!s.scene.getObjectByName('lab-room'));return {hair:preview?.scene.getObjectByName('asset-player-hair')?.userData.hairStyle,calls:preview?.gl.info.render.calls,frame:preview?.gl.info.render.frame};})()`);
 check(snapshots.preview.hair==='braided'&&snapshots.preview.calls>0,'demand-rendered preview changes actual hair geometry');
 await delay(1100);const idle=await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name);return [...F._roots.values()].map(r=>r.store.getState()).find(s=>s.scene.getObjectByName('asset-character')&&!s.scene.getObjectByName('lab-room')).gl.info.render.frame;})()`);check(idle===snapshots.preview.frame,'static creator preview stops rendering when idle');
 // Inspect real stored assets in the same lighting and viewport as the baseline.
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 for(const id of ['lab-coat','goggles','mask','grip-hand','bare-grip-hand']){
 await send('Page.navigate',{url:new URL('/?asset-review='+id+'&angle=three-quarter',app).href});await wait(`window.__ASSET_REVIEW__?.id==='${id}'`,'stored '+id);const model=await evaluate('window.__ASSET_REVIEW__');snapshots[id]=model;check(model.invalidVertices===0,'finite stored asset '+id);await capture('after-station-'+(id==='lab-coat'?'coat':id));
 }
 for(const [id,color]of [['lab-coat','#e5e7dc'],['goggles','#78a4ad'],['mask','#9abfc5']])check(snapshots[id].palette.includes(color)&&full.palette.includes(color),'stored and worn palette match '+id);
 check(errors.length===0,'no runtime exceptions in wardrobe, mirror, batch lifecycle and preview');await writeFile(`${dir}/browser-checks.json`,JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await capture('browser-failure');await writeFile(`${dir}/browser-checks.json`,JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
