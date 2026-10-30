import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,click,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const pose=async(position,point)=>{
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=${JSON.stringify(position)};inputManager.resetAll();return true;`);await delay(1100);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const p=${JSON.stringify(point)},pos=playerCoords.position,r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings,dx=p[0]-pos[0],dz=p[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(p[1]-1.62,Math.hypot(dx,dz));inputManager.addMouseLook((r[1]-yaw)/(.0022*s.cameraSensitivity),(r[0]-pitch)/(.0022*s.cameraSensitivity)*(s.invertY?-1:1));return true;`);await delay(700);
};
const snapshots={};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-ghs-board')",'architecture loaded');await delay(800);
 const models=await evaluate('window.__LAB_INSPECT_MODELS__()');snapshots.installed=models.filter(m=>/asset-(transom|led-panel|ventilation|hood-exhaust|lab-door|.*-board|teaching-bench|bag-rack)/.test(m.name));
 for(const [name,count] of [['lab-door',2],['transom-window',4],['led-panel',16],['smoke-detector',9],['sprinkler',9],['vent-grille',2],['ventilation-duct',2],['hood-exhaust',1],['periodic-board',1],['ghs-board',1],['lesson-board',1],['evacuation-board',1],['rules-board',1],['teaching-bench',1],['bag-rack',1]])check(models.filter(m=>m.name==='asset-'+name).length===count,'architecture instance count: '+name);
 const windows=models.filter(m=>m.name==='asset-transom-window'),boards=models.filter(m=>['asset-periodic-board','asset-ghs-board','asset-lesson-board'].includes(m.name));
 check(windows.every(w=>w.min[1]>Math.max(...boards.map(b=>b.max[1]))+.1),'high windows clear all classroom boards');
 check(models.filter(m=>m.name==='asset-led-panel'||m.name==='asset-ventilation-duct'||m.name==='asset-smoke-detector'||m.name==='asset-sprinkler').every(m=>m.max[1]<=3.805),'ceiling equipment stays below ceiling');
 const exhaust=models.find(m=>m.name==='asset-hood-exhaust'),hood=models.find(m=>m.name==='asset-hood-shell');check(Math.abs(exhaust.min[1]-2.76)<.005&&Math.abs(hood.max[1]-2.766)<.003,'exhaust reducer joins hood collar');
 const periodic=await ev(`const {PERIODIC_BOARD_ELEMENTS}=await import('/src/data/periodicBoard.ts');return PERIODIC_BOARD_ELEMENTS;`);
 check(periodic.length===118&&new Set(periodic.map(e=>e[0])).size===118,'periodic board contains 118 distinct atomic numbers');
 check(periodic[0][1]==='H'&&periodic[117][1]==='Og'&&periodic.filter(e=>e[2]===6).length===32,'periodic table edge symbols and period six verified');
 check(models.filter(m=>m.name==='asset-backpack').every(m=>Math.abs(m.min[1]-.9)<.002),'bags remain on replacement rack top');
 await pose([0,0,2.8],[0,2.4,-7.35]);await capture('room-north-wall');await pose([-5.5,0,-5.8],[-5.5,2,-7.35]);await capture('room-periodic-board');
 const door=await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return useLabEquipment.getState().items.find(i=>i.kind==='door'&&i.position[0]<0);`);
 await aim([-6,0,6.1],[-6.4,1.2,7.36],'equipment:'+door.id);await interact();await wait("document.querySelector('[data-practical-simulation]')",'door interaction retained');check(true,'door remains usable by aim and E');await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");
 await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');useLabEquipment.getState().record(${JSON.stringify(door.id)},true);return true;`);await delay(400);
 const open=await evaluate("window.__LAB_INSPECT_MODELS__().filter(m=>m.name.startsWith('door-leaf-')&&m.position[0]<0)");
 check(open.length===2&&open.every(m=>Math.abs(m.rotation[1])>1),'two door leaves rotate at hinges');await capture('room-door-open');
 check(errors.length===0,'no runtime errors in architecture review');await writeFile('docs/asset-studies/architecture-integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await capture('architecture-integration-failure');await writeFile('docs/asset-studies/architecture-integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
