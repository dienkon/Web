import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,perform,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const snapshots={};
const inspect=()=>evaluate('window.__LAB_INSPECT_MODELS__()');
const resources=name=>evaluate(`window.__LAB_INSPECT_RESOURCES__(${JSON.stringify(name)})`);
try{
 await mkdir('docs/room-upgrade',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);
 await wait('window.__LAB_INSPECT_RESOURCES__','resource inspector');await delay(1000);
 const models=await inspect();
 check(models.filter(m=>m.name==='asset-amber-bottle'&&m.position[0]>8).length===27,'27 named detailed bottles remain in cabinets');
 check(models.filter(m=>m.name==='asset-stool').length===16,'16 five-legged stools remain');
 snapshots.cabinet=(await resources('cab_acid'))[0];
 check(snapshots.cabinet.textures.length===4,'cabinet shares two bottle labels plus two door labels');
 check(snapshots.cabinet.geometries.length<55,'cabinet borrows source geometry instead of 9 independent models');
 const beakers=await resources('asset-beaker'),rackModels=models.filter(m=>m.name==='asset-beaker'&&m.position[0]>9);
 check(rackModels.length===16,'16 named glass beakers remain on rack');
 const shared=beakers.filter(r=>r.geometries[0]===beakers.find(r=>beakers.filter(x=>x.geometries[0]===r.geometries[0]).length===16)?.geometries[0]);
 check(shared.length===16&&new Set(shared.flatMap(r=>r.geometries)).size===3,'16 beakers share all 3 geometry resources');
 check(new Set(shared.flatMap(r=>r.textures)).size===2,'16 beakers share graduations and label textures');
 await aim([7.7,0,.6],[9.08,.98,.6],'equipment:cab_acid');await interact();await wait("document.querySelector('[data-practical-simulation]')",'cabinet practice');
 const work=await ev(`const {instrumentWork}=await import('/src/data/instrumentWork.ts');const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return instrumentWork(useLabEquipment.getState().items.find(i=>i.id==='cab_acid'));`);
 await perform(work,{to:1});await delay(600);
 check((await inspect()).filter(m=>m.name.startsWith('cabinet-hinge-')&&m.position[2]>.05&&m.position[2]<1.2).every(m=>Math.abs(m.rotation[1])>1),'actual first practice step opens both cabinet hinges');
 await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");await delay(300);
 check((await inspect()).filter(m=>m.name.startsWith('cabinet-hinge-')&&m.position[2]>.05&&m.position[2]<1.2).every(m=>Math.abs(m.rotation[1])<.01),'closing practice resets both hinges');
 for(const [quality,dpr] of [['potato',.7],['low',.85],['medium',1],['high',1],['low',.85]]){
  await ev(`useStore.setState(s=>({settings:{...s.settings,graphicsQuality:'${quality}'}}));return true;`);await delay(1300);
  check(Math.abs(await evaluate('window.__LAB_RENDERER_INFO__.pixelRatio')-dpr)<.001,'Canvas and adaptive quality agree on DPR: '+quality);
 }
 await ev(`useStore.setState(s=>({activeTool:'extinguisher',settings:{...s.settings,reduceMotion:false},player:{...s.player,inventory:{...s.player.inventory,hasFireExtinguisher:true}}}));return true;`);await delay(700);
 const first=(await resources('held-extinguisher-hose'))[0];await delay(2000);const later=(await resources('held-extinguisher-hose'))[0];snapshots.hose={first,later};
 check(first.geometries[0]===later.geometries[0],'moving hose retains its GPU geometry');
 check(later.buffers[0].version>first.buffers[0].version+10,'moving hose updates persistent position buffer');
 check(later.buffers[0].vertices===119&&later.buffers[0].indices===576,'hose keeps full radial and longitudinal detail');
 await ev(`useStore.setState(s=>({settings:{...s.settings,reduceMotion:true}}));return true;`);await delay(1700);
 const still=(await resources('held-extinguisher-hose'))[0];await delay(800);const stillLater=(await resources('held-extinguisher-hose'))[0];
 check(still.buffers[0].version===stillLater.buffers[0].version,'stationary reduced-motion hose skips buffer uploads');
 for(let i=0;i<4;i++){await ev(`useStore.setState({activeTool:null});return true;`);await delay(150);check((await resources('held-extinguisher-hose')).length===0,'switching tool removes hose '+i);await ev(`useStore.setState({activeTool:'extinguisher'});return true;`);await delay(200);}
 // Exercise mounting and disposal in an isolated live R3F canvas. Its portal
 // shares exactly the same implementation and model used by cabinet bottles.
 snapshots.lifecycle=await evaluate(`(async()=>{
  const {default:R}=await import('/node_modules/.vite/deps/react.js'),F=await import('/node_modules/.vite/deps/@react-three_fiber.js');
  const {StaticAssetCopies}=await import('/src/components/3d/assets/StaticAssetCopies.tsx'),{ReagentBottleAsset}=await import('/src/components/3d/assets/LabwareAssets.tsx');
  const canvas=document.createElement('canvas');Object.assign(canvas.style,{position:'fixed',width:'64px',height:'64px',left:'0',bottom:'0',pointerEvents:'none'});document.body.append(canvas);
  const root=F.createRoot(canvas),pause=ms=>new Promise(r=>setTimeout(r,ms));let store;const cycles=[];
  try{
   await root.configure({size:{width:64,height:64,top:0,left:0},dpr:1,frameloop:'always'});
   store=root.render(R.createElement(ReagentBottleAsset,{amber:true}));await pause(700);
   root.render(R.createElement('group'));await pause(900);
   // Establish the renderer-owned texture baseline with an ordinary, unshared
   // bottle; Three retains an internal texture after its first physical material.
   const baseline={...store.getState().gl.info.memory};
   for(let cycle=0;cycle<4;cycle++){
    root.render(R.createElement(StaticAssetCopies,{placements:Array.from({length:9},(_,i)=>({at:[i*.18,0,0]}))},R.createElement(ReagentBottleAsset,{amber:true})));
    await pause(700);const mounted={...store.getState().gl.info.memory};
    root.render(R.createElement('group'));await pause(900);const cleared={...store.getState().gl.info.memory};cycles.push({mounted,cleared});
   }
   return {baseline,cycles};
  }finally{root.unmount();await pause(600);canvas.remove();}
 })()`);
 check(snapshots.lifecycle.cycles.every(c=>c.mounted.geometries>0&&c.mounted.textures>snapshots.lifecycle.baseline.textures),'shared source renders in every lifecycle cycle');
 check(snapshots.lifecycle.baseline.geometries===0&&snapshots.lifecycle.cycles.every(c=>c.cleared.geometries===0&&c.cleared.textures===snapshots.lifecycle.baseline.textures),'remount cycles release all model resources back to ordinary renderer baseline');
 const before=JSON.parse(await readFile('docs/room-upgrade/before.json','utf8')),after=JSON.parse(await readFile('docs/room-upgrade/after.json','utf8'));
 for(const sample of after.snapshots){const old=before.snapshots.find(s=>s.id===sample.id);check(sample.renderer.pixelRatio===old.renderer.pixelRatio,'same render resolution before/after: '+sample.id);check(sample.renderer.render.calls<old.renderer.render.calls,'fewer draw calls without removing models: '+sample.id);check(sample.models.length===old.models.length&&sample.models.every(m=>old.models.some(o=>o.name===m.name&&['position','min','max'].every(k=>o[k].every((v,i)=>Math.abs(v-m[k][i])<.00001)))),'all named model bounds and placements preserved: '+sample.id);}
 check(errors.length===0,'no runtime exceptions during room upgrade checks');
 await writeFile('docs/room-upgrade/browser-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await writeFile('docs/room-upgrade/browser-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
