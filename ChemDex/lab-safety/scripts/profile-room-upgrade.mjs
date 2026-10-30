import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,wait,delay,errors,socket,target,cdp,app} from './practical-browser-driver.mjs';

const stage=process.argv[2]??'before';
if(!['before','after'].includes(stage))throw Error('Use before or after');
const output='docs/room-upgrade';
const snapshots=[];
async function pose(position,point){
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=${JSON.stringify(position)};inputManager.resetAll();return true;`);await delay(1200);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const p=${JSON.stringify(point)},pos=playerCoords.position,r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings,dx=p[0]-pos[0],dz=p[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(p[1]-1.62,Math.hypot(dx,dz));inputManager.addMouseLook((r[1]-yaw)/(.0022*s.cameraSensitivity),(r[0]-pitch)/(.0022*s.cameraSensitivity));return true;`);await delay(1800);
}
try{
 await mkdir(output,{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);
 await wait('window.__LAB_RENDERER_INFO__&&window.__LAB_INSPECT_MODELS__','renderer');
 for(const scene of [
  {id:'room',position:[0,0,4.6],point:[0,1.3,-3]},
  {id:'cabinets-closed',position:[7.1,0,.6],point:[9.4,1,.6]},
  {id:'cabinets-open',position:[7.1,0,.6],point:[9.4,1,.6],open:true},
  {id:'glass-rack',position:[7.3,0,3.2],point:[9.5,1.2,3.2]},
  {id:'stools',position:[-1.8,0,-.2],point:[-4.2,.5,-2.2]},
  {id:'held-hose',position:[0,0,4.6],point:[0,1.3,-3],held:true},
 ]){
  await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');for(const id of ['cab_flammable','cab_acid','cab_base'])useLabEquipment.getState().setActive(id,${!!scene.open});useStore.setState(s=>({activeTool:${scene.held?"'extinguisher'":'null'},player:{...s.player,inventory:{...s.player.inventory,hasFireExtinguisher:${!!scene.held}}}}));return true;`);
  await pose(scene.position,scene.point);
  const samples=await evaluate(`new Promise(resolve=>{const times=[],start=performance.now(),first=window.__LAB_READ_RENDER_FRAME__();let previous=start,last=first,browserFrames=0;function frame(now){browserFrames++;const current=window.__LAB_READ_RENDER_FRAME__();if(current!==last){times.push(now-previous);previous=now;last=current;}if(now-start<5000)requestAnimationFrame(frame);else {times.sort((a,b)=>a-b);resolve({renderFrames:last-first,browserFrames,seconds:(now-start)/1000,fps:(last-first)*1000/(now-start),p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)],p99:times[Math.floor(times.length*.99)]});}}requestAnimationFrame(frame);})`);
  const renderer=await evaluate('structuredClone(window.__LAB_RENDERER_INFO__)');
  const models=await evaluate("window.__LAB_INSPECT_MODELS__().filter(m=>/asset-(amber-bottle|beaker|stool)$|shelf-\\d-vessel-|cabinet-hinge-/.test(m.name))");
  snapshots.push({id:scene.id,...samples,renderer,models});
  const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${output}/${stage}-${scene.id}.png`,Buffer.from(image.data,'base64'));
  console.log(JSON.stringify({id:scene.id,fps:+samples.fps.toFixed(1),calls:renderer.render.calls,...renderer.memory}));
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(`${output}/${stage}.json`,JSON.stringify({stage,viewport:[1366,900],quality:'low',reducedMotion:true,throttle:1,browser:await send('Browser.getVersion'),errors,snapshots},null,2));
}finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
