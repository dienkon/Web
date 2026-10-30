import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,wait,delay,click,errors,socket,target,cdp,app} from './practical-browser-driver.mjs';
const stage=process.argv[2]??'before';if(!['before','after'].includes(stage))throw Error('Use before or after');
const dir='docs/player-mobile',samples=[];
async function pose(position,target){
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.resetAll();playerCoords.position=${JSON.stringify(position)};return true;`);await delay(1200);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const p=${JSON.stringify(target)},r=window.__LAB_DEBUG_STATE__.cameraRotation,pos=playerCoords.position,s=useStore.getState().settings,dx=p[0]-pos[0],dz=p[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(p[1]-1.62,Math.hypot(dx,dz));inputManager.addMouseLook((r[1]-yaw)/(.0022*s.cameraSensitivity),(r[0]-pitch)/(.0022*s.cameraSensitivity));return true;`);await delay(1500);
}
async function sample(ms){
 await evaluate(`(()=>{window.__MOBILE_MEASURE__=new Promise(resolve=>{const start=performance.now(),first=window.__LAB_FRAME_CLOCK__.count,frames=[];let previous=window.__LAB_FRAME_CLOCK__.time,last=first;function frame(now){const clock=window.__LAB_FRAME_CLOCK__;if(clock.count!==last){frames.push(clock.time-previous);previous=clock.time;last=clock.count;}if(now-start<${ms})requestAnimationFrame(frame);else {frames.sort((a,b)=>a-b);resolve({seconds:(now-start)/1000,frames:last-first,fps:(last-first)*1000/(now-start),p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)]});}}requestAnimationFrame(frame);});return true;})()`);
}
try{
 await mkdir(dir,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setCPUThrottlingRate',{rate:4});
 for(const viewport of [{id:'mobile-844',width:844,height:390,dpr:3,touch:true},{id:'mobile-740',width:740,height:360,dpr:2,touch:true},{id:'desktop',width:1366,height:768,dpr:1,touch:false}]){
  await send('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:viewport.dpr,mobile:viewport.touch});await send('Emulation.setTouchEmulationEnabled',{enabled:viewport.touch,maxTouchPoints:2});
  await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
  await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'auto',reduceMotion:false},player:{...s.player,equipment:{hasGoggles:true,hasMask:true,hasLabCoat:true,hasGloves:true,hasClosedShoes:true,hairTied:true},inventory:{...s.player.inventory,hasSweeper:true}}}));return true;`);
  await delay(700);if(await evaluate("Boolean(document.querySelector('.orientation-gate'))")){await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'landscape admitted');}
  await wait('window.__LAB_FRAME_CLOCK__','actual renderer clock');
  for(const scene of [{id:'room',pos:[-.8,0,4.7],look:[0,1.3,-2]},{id:'mirror',pos:[-.8,0,5.2],look:[-.8,1.5,7.115]},{id:'mirror-off-axis',pos:[-.8,0,5.2],look:[-6,1.5,6.5]},{id:'move-look',pos:[-.8,0,4.7],look:[0,1.3,-2],move:viewport.touch}]){
   if(scene.id==='move-look'&&!viewport.touch)continue;
   await ev(`useStore.setState({activeTool:'spillKit'});return true;`);await pose(scene.pos,scene.look);
   const mirrorBefore=await evaluate('window.__LAB_RENDERER_INFO__.mirrorUpdates'),positionBefore=await ev('return [...playerCoords.position];');
   const x=viewport.width*.75,y=viewport.height*.46,left={x:65,y:viewport.height-84,id:1};
   if(scene.move){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,{x,y,id:2}]});}
   await sample(scene.move?6000:5000);
   if(scene.move){for(let i=0;i<30;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...left,y:left.y-43},{x:x+(i%6<3?i%3:3-i%3)*7,y,id:2}]});await delay(200);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   const timing=await evaluate('window.__MOBILE_MEASURE__'),renderer=await evaluate('structuredClone(window.__LAB_RENDERER_INFO__)'),positionAfter=await ev('return [...playerCoords.position];');
   const state=await evaluate('({coarse:matchMedia("(pointer: coarse)").matches,touches:navigator.maxTouchPoints,width:innerWidth,height:innerHeight,quality:window.__LAB_DEBUG_STATE__.runState})');
   const glDevice=await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name),state=[...F._roots.values()].map(r=>r.store.getState()).find(s=>s.scene.getObjectByName('lab-room')),gl=state.gl.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),antialias:gl.getContextAttributes().antialias};})()`);const record={viewport,scene:scene.id,timing,renderer,glDevice,mirrorUpdates:renderer.mirrorUpdates-mirrorBefore,positionBefore,positionAfter,state};samples.push(record);await writeFile(`${dir}/${stage}-mobile-progress.json`,JSON.stringify({passed:false,inProgress:true,stage,cpuThrottle:4,samples},null,2));
   const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${stage}-${viewport.id}-${scene.id}.png`,Buffer.from(shot.data,'base64'));
   console.log(JSON.stringify({viewport:viewport.id,scene:scene.id,fps:+timing.fps.toFixed(1),p95:+timing.p95.toFixed(1),calls:renderer.render.calls,dpr:renderer.pixelRatio,mirror:record.mirrorUpdates}));
  }
 }
 if(errors.length)throw Error(errors.join('\n'));await writeFile(`${dir}/${stage}-mobile.json`,JSON.stringify({passed:true,stage,cpuThrottle:4,browser:await send('Browser.getVersion'),gpu:await send('SystemInfo.getInfo').catch(()=>null),errors,samples},null,2));
}finally{await send('Emulation.setCPUThrottlingRate',{rate:1}).catch(()=>{});socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
