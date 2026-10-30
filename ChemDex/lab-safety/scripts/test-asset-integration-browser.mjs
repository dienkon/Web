import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,click,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const snapshots=[];
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,settings:{...s.settings,graphicsQuality:'low'},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-balance')",'shared assets in actual room');
 let models=await evaluate('window.__LAB_INSPECT_MODELS__()');
 for(const name of ['balance','hotplate','ph-meter','burette'])check(models.filter(m=>m.name==='asset-'+name).length===1,'exactly one integrated '+name);
 for(const name of ['balance','hotplate','ph-meter','burette','tube-rack','pipette-tray'])check(models.filter(m=>m.name==='asset-'+name).every(m=>Math.abs(m.min[1]-.901)<.002),'actual room support contact: '+name);
 check(models.filter(m=>m.name==='asset-cylinder').length===2,'both cylinder instances share new geometry');
 check(models.filter(m=>m.name==='asset-test-tube').length===8,'two tube racks contain four identifiable tubes each');
 check(models.filter(m=>m.name==='asset-amber-bottle'&&m.position[0]>8).length===27,'all cabinet reagent bottles use detailed model');
 for(let shelf=0;shelf<4;shelf++)for(let i=0;i<4;i++){
  const model=models.find(m=>m.name===`shelf-${shelf}-vessel-${i}`),top=[.4,.85,1.3,1.75][shelf]+.015;
  check(Math.abs(model.min[1]-top)<.002,'shared beaker rests on shelf: '+shelf+'/'+i);
 }
 await delay(800);
 const balance=await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return useLabEquipment.getState().items.find(i=>i.kind==='balance');`);
 const b=models.find(m=>m.name==='asset-balance'),center=b.min.map((v,i)=>(v+b.max[i])/2);
 await aim([-4.7,0,-.65],center,'equipment:'+balance.id);await capture('room-analytical-assets');
 await interact();await wait("document.querySelector('[data-practical-simulation]')",'balance remains usable');
 check(await evaluate("document.querySelector('.practical-dialog h2').textContent.includes('Cân phân tích')"),'detailed balance opens its existing interaction');await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");
 const ids=await ev(`const {LAB_SCENARIOS}=await import('/src/scenarios/catalog.ts');return LAB_SCENARIOS.map(s=>s.id);`);
 for(const id of ids){
  await ev(`const {LAB_SCENARIOS}=await import('/src/scenarios/catalog.ts');const scenario=LAB_SCENARIOS.find(s=>s.id===${JSON.stringify(id)});useStore.setState(s=>({currentPhase:5,tasks:s.tasks.map(t=>({...t,completed:t.id.startsWith('task_scenario_')&&t.id!==scenario.taskId}))}));return true;`);
  await wait(`window.__LAB_INSPECT_MODELS__().some(m=>m.name==='scenario-props-${id}')`,'scenario '+id);
  models=await evaluate('window.__LAB_INSPECT_MODELS__()');const platform=models.find(m=>m.name===`scenario-props-${id}`),evidence=models.filter(m=>m.name.startsWith('evidence-'));
  check(evidence.length===3&&evidence.every(m=>Math.abs(m.min[1]-platform.position[1])<=.035),'detailed scene evidence stays on its support: '+id);
  snapshots.push({id,evidence});
  if(['cracked-glass','centrifuge-balance','vacuum-check','pipette-bulb'].includes(id)){
   await ev(`useStore.getState().startCinematic('scenario:${id}');return true;`);await delay(5200);await capture('room-'+id);await ev('useStore.getState().finishCinematic();return true;');
  }
 }
 check(errors.length===0,'no integration runtime exceptions');await writeFile('docs/asset-studies/integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await capture('integration-failure');await writeFile('docs/asset-studies/integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
