import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const action=code=>ev(`const {fireSimulation}=await import('/src/core/fire/FireSim.ts');const {toolControls}=await import('/src/systems/input/toolControls.ts');${code}`);
const inspect=()=>evaluate('window.__LAB_INSPECT_MODELS__()');
const point=(models,name)=>models.find(m=>m.name===name&&m.visible)?.position;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const snapshots={};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Page.bringToFront');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true},inventory:{...s.player.inventory,hasSweeper:true,isHoldingTrash:false}}}));return true;`);
 await wait('window.__LAB_INSPECT_MODELS__','debug ready');
 await ev(`useStore.getState().selectTool('spillKit');return true;`);await delay(800);
 let models=await inspect();
 for(const [grip,palm] of [['held-pan-grip','held-right-palm'],['held-brush-grip','held-left-palm']])check(distance(point(models,grip),point(models,palm))<.035,'handle touches palm: '+grip);
 const held=model=>model.filter(m=>['held-right-palm','held-left-palm'].includes(m.name)).map(m=>m.position);
 const still=held(models);await delay(600);const settled=held(await inspect());snapshots.reducedMotion={before:still,after:settled};check(settled.every((p,i)=>distance(p,still[i])<.0001),'reduced motion stops hand breathing and sway within .1 mm');await capture('room-held-spill-tools');
 for(const kind of ['chemical','domestic','sharps']){
  await ev(`useStore.setState(s=>({player:{...s.player,inventory:{...s.player.inventory,isHoldingTrash:true,heldTrashType:${JSON.stringify(kind)}}}}));useStore.getState().selectTool('waste');return true;`);await delay(500);models=await inspect();
  check(distance(point(models,'held-waste-grip'),point(models,'held-right-palm'))<.035,'carrier grip touches palm: '+kind);await capture('room-held-'+kind);
 }
 await action(`useStore.setState(s=>({currentPhase:2,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_fire_extinguisher'})),player:{...s.player,inventory:{...s.player.inventory,hasFireExtinguisher:true,isHoldingTrash:false},flags:{...s.player.flags,passTrained:true,fireIntroSeen:true}}}));useStore.getState().selectTool('extinguisher');playerCoords.position=[4.2,0,0];return true;`);
 await wait("window.__LAB_INSPECT_MODELS__().some(m=>m.name==='asset-carried-extinguisher'&&m.visible)",'held extinguisher');await delay(1200);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;inputManager.addMouseLook(r[1]/(.0022*s.cameraSensitivity),(r[0]+.295)/(.0022*s.cameraSensitivity));return true;`);await delay(1100);
 models=await inspect();snapshots.extinguisher=models.filter(m=>m.name.startsWith('held-')||m.name.startsWith('asset-carried-')||m.name==='extinguisher-muzzle');
 check(distance(point(models,'held-extinguisher-grip'),point(models,'held-right-palm'))<.035,'extinguisher handle rests inside right palm');
 check(distance(point(models,'held-nozzle-port'),point(models,'extinguisher-muzzle'))>.115&&distance(point(models,'held-nozzle-port'),point(models,'extinguisher-muzzle'))<.125,'muzzle is exactly one nozzle length ahead of hose port');
 const [pitch,yaw]=await evaluate('window.__LAB_DEBUG_STATE__.cameraRotation'),forward=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)],port=point(models,'held-nozzle-port'),muzzle=point(models,'extinguisher-muzzle'),length=distance(port,muzzle);
 check(muzzle.reduce((dot,v,i)=>dot+(v-port[i])/length*forward[i],0)>.999,'physical nozzle aligns with stream direction');
 check(distance(port,point(models,'held-left-palm'))<.035,'nozzle base rests inside left palm');
 check(models.find(m=>m.name==='asset-carried-extinguisher-pin')?.visible,'safety pin is visible before pulling');
 const gas=await action('return fireSimulation.currentExtinguisher.agentLeft;');await action('toolControls.spraying=true;return true;');await delay(300);
 const guarded=await action('toolControls.spraying=false;return fireSimulation.currentExtinguisher.agentLeft;');check(gas===guarded,'spraying remains guarded by physical pin state');
 await evaluate("document.querySelector('[aria-label=\"Rút chốt bình\"]').click();true;");await delay(150);models=await inspect();check(!models.find(m=>m.name==='asset-carried-extinguisher-pin')?.visible,'pin disappears from held model after actual control');
 await action('toolControls.spraying=true;return true;');await delay(350);models=await inspect();
 check(models.find(m=>m.name==='asset-carried-extinguisher-lever')?.rotation[2]<-.12,'held lever closes when simulation discharges');await capture('room-held-extinguisher-spraying');
 for(let i=0;i<30;i++){
  await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');inputManager.addMouseLook(${i%2?-.045:.045}/.0022,0);return true;`);await delay(200);
  if(await ev("return useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed;"))break;
 }
 const result=await action(`toolControls.spraying=false;return {completed:useStore.getState().tasks.find(t=>t.id==='task_fire_extinguisher').completed,extinguished:fireSimulation.areAllFiresExtinguished(),flag:useStore.getState().player.flags.fireExtinguished};`);
 check(result.completed&&result.extinguished&&result.flag,'new held model completes actual pin, spray and sweep workflow');
 check(errors.length===0,'no runtime errors while handling all tools');await writeFile('docs/asset-studies/held-integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots,result},null,2));
}catch(error){await action('toolControls.spraying=false;return true;');await capture('held-integration-failure');await writeFile('docs/asset-studies/held-integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
