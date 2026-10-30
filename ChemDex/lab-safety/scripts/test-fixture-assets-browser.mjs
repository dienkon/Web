import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,click,perform,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const models=()=>evaluate('window.__LAB_INSPECT_MODELS__()');
const at=(list,name)=>list.find(m=>m.name===name);
const pose=async(position,point)=>{
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=${JSON.stringify(position)};inputManager.resetAll();return true;`);await delay(1100);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const p=${JSON.stringify(point)},pos=playerCoords.position,r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;const dx=p[0]-pos[0],dz=p[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(p[1]-1.62,Math.hypot(dx,dz));inputManager.addMouseLook((r[1]-yaw)/(.0022*s.cameraSensitivity),(r[0]-pitch)/(.0022*s.cameraSensitivity)*(s.invertY?-1:1));return true;`);await delay(500);
};
const snapshots={};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:false},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-bench-cabinet')",'fixtures installed');await delay(800);
 let list=await models();snapshots.installed=list.filter(m=>/asset-(hood|sink|bench|faucet|stool|gas|alcohol|bunsen)/.test(m.name));
 for(const [name,count] of [['asset-hood-shell',1],['asset-hood-sash',1],['asset-handwash-station',1],['asset-sink-basin',6],['asset-faucet',6],['asset-bench-cabinet',4],['asset-stool',16],['asset-bunsen-assembly',1],['asset-alcohol-lamp',1]])check(list.filter(m=>m.name===name).length===count,'exact fixture instance count: '+name);
 check(list.filter(m=>m.name==='asset-bench-cabinet'||m.name==='asset-stool'||m.name==='asset-hood-shell'||m.name==='asset-handwash-station').every(m=>Math.abs(m.min[1])<.002),'fixed furniture rests on floor');
 check(list.filter(m=>m.name==='asset-bench-sink').every(m=>Math.abs(m.position[1]-.75992)<.002),'four sunk basins use the shared insertion height');
 check(Math.abs(at(list,'asset-bunsen-assembly').min[1]-.901)<.002&&Math.abs(at(list,'asset-alcohol-station').min[1]-.901)<.002,'both combustion assemblies rest on bench tops');
 const geometry=await ev(`const {INITIAL_COLLIDER_BOXES}=await import('/src/core/simulation/CollisionSystem.ts');const {FUME_HOOD_LAYOUT, WASH_STATION_LAYOUT}=await import('/src/data/scene/fixtureLayout.ts');return {hood:INITIAL_COLLIDER_BOXES.find(b=>b.id==='fume_hood'),wash:INITIAL_COLLIDER_BOXES.find(b=>b.id==='sink_handwash'),angle:FUME_HOOD_LAYOUT.rotationY,washAngle:WASH_STATION_LAYOUT.rotationY};`);
 const shell=at(list,'asset-hood-shell');check(Math.abs(shell.max[2]-shell.min[2]-2.4)<.003&&at(list,'asset-hood-sash').position[0]<shell.position[0]-.5,'hood front faces room from east wall');
 check(shell.min[0]>=geometry.hood.minX-.001&&shell.max[0]<=geometry.hood.maxX+.001&&shell.min[2]>=geometry.hood.minZ-.001&&shell.max[2]<=geometry.hood.maxZ+.001,'hood collision encloses rotated structure');
 check(Math.abs(at(list,'asset-handwash-station').max[2]-7.4)<.03,'handwash fixtures fit against south wall');
 const drawerId='bench_nw-drawer-0-1';
 await aim([-4.2,0,-.7],[-4.2,.65,-1.63],'equipment:'+drawerId);await interact();await wait("document.querySelector('[data-practical-simulation]')",'drawer opens by E');
 const work=await ev(`const {instrumentWork}=await import('/src/data/instrumentWork.ts');const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return instrumentWork(useLabEquipment.getState().items.find(i=>i.id==='${drawerId}'));`);
 await perform(work,{afterStep:async index=>{
  if(index===2){await delay(700);const m=at(await models(),'drawer-slide-'+drawerId);check(Math.abs(m.position[2]-(-2.2+.22))<.005,'drawer travels once by .22 along its rail');await capture('room-drawer-open');}
  if(index===4){await delay(700);check(Math.abs(at(await models(),'drawer-slide-'+drawerId).position[2]+2.2)<.005,'drawer returns fully closed after final step');}
 }});await click('Ghi nhận kết quả');
 await pose([7.1,0,-3.5],[8.25,1.5,-3.5]);await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Mở rộng cửa kính'))",'hood controls');await capture('room-fume-hood');
 const before=at(await models(),'asset-hood-shell');
 await click('Mở rộng cửa kính');await delay(900);list=await models();
 check(Math.abs(at(list,'asset-hood-sash').position[1]-1.75)<.008,'hood sash slides to upper position');
 await click('Đã hiểu');await delay(250);
 check(JSON.stringify(at(list,'asset-hood-shell').position)===JSON.stringify(before.position),'sash operation leaves cabinet frame fixed');await capture('room-fume-hood-open');
 await ev('useStore.setState(s=>({settings:{...s.settings,reduceMotion:true}}));return true;');await click('Hạ cửa kính');await delay(150);
 check(Math.abs(at(await models(),'asset-hood-sash').position[1]-1.45)<.002,'reduced motion sets sash directly at final position');
 await pose([3.5,0,-.7],[3.5,1.06,-2.03]);await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Mở Van Gas'))",'burner controls');
 await click('Mở Van Gas');await click('Đánh Lửa Mồi');await delay(150);list=await models();const yellow=at(list,'asset-bunsen-flame');
 check(Boolean(yellow),'lighting controls reveal local yellow flame');await capture('room-bunsen-yellow');
 await click('Mở Lỗ Gió');await ev('useStore.getState().closeDialog();return true;');await delay(200);list=await models();const blue=at(list,'asset-bunsen-flame');
 check(blue.max[1]-blue.min[1]<yellow.max[1]-yellow.min[1],'blue and yellow have distinct flame profiles');await capture('room-bunsen-blue');
 await click('Khóa Van Gas');check(!(await models()).some(m=>m.name==='asset-bunsen-flame'),'closing gas removes flame geometry');
 await pose([3.5,0,5.8],[3.5,1.05,7.1]);await capture('room-handwash');
 check(errors.length===0,'no runtime errors during fixture interactions');
 await writeFile('docs/asset-studies/fixture-integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){snapshots.debug=await evaluate(`(async()=>{const F=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/@react-three_fiber.js').name),T=await import('/node_modules/.vite/deps/three.js'),{useInteractionStore}=await import('/src/core/InteractionSystem.ts');const s=[...F._roots.values()].map(r=>r.store.getState()).find(s=>s.scene.getObjectByName('lab-room')),ray=new T.Raycaster(s.camera.position,s.camera.getWorldDirection(new T.Vector3()),0,3);return {camera:s.camera.position.toArray(),rotation:s.camera.rotation.toArray(),focus:useInteractionStore.getState().nearestId,items:Object.values(useInteractionStore.getState().interactables).filter(i=>i.object?.userData.labItem?.kind==='hood').map(({object,...i})=>({...i,bounds:new T.Box3().setFromObject(object)})),hits:ray.intersectObjects(s.scene.children,true).slice(0,20).map(h=>({name:h.object.name,d:h.distance,proxy:h.object.userData.staticRenderProxy,visible:h.object.visible,parents:[h.object.parent?.name,h.object.parent?.parent?.name]}))};})()`);await capture('fixture-integration-failure');await writeFile('docs/asset-studies/fixture-integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
