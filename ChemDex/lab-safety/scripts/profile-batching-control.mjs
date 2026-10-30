import {writeFile} from 'node:fs/promises';
import {send,evaluate,ev,wait,delay,errors,socket,target,cdp,app} from './practical-browser-driver.mjs';
const samples=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:true})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);await delay(800);
 if(await evaluate("Boolean(document.querySelector('.orientation-gate'))"))await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Mở toàn màn hình')).click();true;");await wait("!document.querySelector('.orientation-gate')",'landscape');await wait('window.__LAB_FRAME_CLOCK__','main render clock');
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.resetAll();playerCoords.position=[-.8,0,4.7];return true;`);await delay(1200);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const r=window.__LAB_DEBUG_STATE__.cameraRotation;inputManager.addMouseLook(r[1]/.0022,r[0]/.0022);return true;`);await delay(1500);
 await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name);window.__BATCH_TEST_SCENE__=[...F._roots.values()].map(r=>r.store.getState()).find(s=>s.scene.getObjectByName('lab-room')).scene;return true;})()`);
 const bounds=await evaluate("window.__LAB_INSPECT_MODELS__().map(({visible,rotation,...m})=>m)");
 for(const cpu of [1,4]){
 await send('Emulation.setCPUThrottlingRate',{rate:cpu});
 for(const enabled of [false,true,true,false]){
 await evaluate(`window.__BATCH_TEST_SCENE__.traverse(o=>{if(o.userData.staticRenderProxy)o.visible=${!enabled};if(o.name==='room-static-render-batch')o.visible=${enabled};});true;`);await delay(1800);
 const timing=await evaluate(`new Promise(resolve=>{const start=performance.now(),first=window.__LAB_FRAME_CLOCK__.count,frames=[];let last=first,prev=window.__LAB_FRAME_CLOCK__.time;const loop=now=>{const f=window.__LAB_FRAME_CLOCK__;if(f.count!==last){frames.push(f.time-prev);last=f.count;prev=f.time;}if(now-start<6000)requestAnimationFrame(loop);else{frames.sort((a,b)=>a-b);resolve({fps:(last-first)*1000/(now-start),frames:last-first,p95:frames[Math.floor(frames.length*.95)]});}};requestAnimationFrame(loop);})`);
 const renderer=await evaluate('structuredClone(window.__LAB_RENDERER_INFO__)'),geometryBounds=await evaluate('window.__LAB_INSPECT_MODELS__().map(({visible,rotation,...m})=>m)');
 const sameBounds=JSON.stringify(bounds)===JSON.stringify(geometryBounds);samples.push({cpu,enabled,timing,renderer,sameBounds});console.log(JSON.stringify(samples.at(-1)));await writeFile('docs/player-mobile/batching-control.json',JSON.stringify({passed:false,inProgress:true,errors,samples},null,2));
 }
 }
 if(errors.length||samples.some(s=>!s.sameBounds))throw Error('Bounds changed or runtime exception');await writeFile('docs/player-mobile/batching-control.json',JSON.stringify({passed:true,method:'ABBA; same avatar, scene, camera, 844x390, DPR .85; CPU 1 and 4; 6-second main-render samples; only render visibility of original proxies/batches toggled',errors,samples},null,2));
}finally{await send('Emulation.setCPUThrottlingRate',{rate:1}).catch(()=>{});socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
