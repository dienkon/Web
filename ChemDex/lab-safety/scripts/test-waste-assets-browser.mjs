import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,click,perform,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const snapshots={};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true}}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-liquid-waste')",'waste models');await delay(800);
 const models=await evaluate('window.__LAB_INSPECT_MODELS__()');snapshots.installed=models.filter(m=>/^asset-(glass-waste|chemical-bin|liquid-waste|sharps-box|domestic-bin)$/.test(m.name));
 const bins=await ev(`const {WASTE_CONTAINERS}=await import('/src/data/scene/fixtureLayout.ts');const {INITIAL_COLLIDER_CYLINDERS}=await import('/src/core/simulation/CollisionSystem.ts');return WASTE_CONTAINERS.map(b=>({...b,collider:INITIAL_COLLIDER_CYLINDERS.find(c=>c.id===b.id)}));`);
 const names={glass:'glass-waste',chemical:'chemical-bin',liquid:'liquid-waste',sharps:'sharps-box',domestic:'domestic-bin'};
 for(const b of bins){
  const model=snapshots.installed.find(m=>m.name==='asset-'+names[b.kind]);check(Boolean(model)&&Math.abs(model.min[1])<.002,'one floor-supported container: '+b.id);
  check(model.position.every((v,i)=>Math.abs(v-b.position[i])<.002)&&b.collider.x===b.position[0]&&b.collider.z===b.position[2],'container and collision share placement: '+b.id);
 }
 for(const b of bins){
  const target=[b.position[0]-.22,b.kind==='sharps'?.3:.36,b.position[2]];
  await aim([b.position[0]-1.25,0,b.position[2]],target,'equipment:'+b.id);await interact();await wait("document.querySelector('[data-practical-simulation]')",'bin practice '+b.id);
  const work=await ev(`const {instrumentWork}=await import('/src/data/instrumentWork.ts');const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return instrumentWork(useLabEquipment.getState().items.find(i=>i.id===${JSON.stringify(b.id)}));`);
  check(await evaluate(`document.querySelector('.practical-dialog h2').textContent.includes(${JSON.stringify(b.title)})`),'correct named practice for '+b.id);
  if(b.kind==='liquid'){check(!work.objects.some(o=>o.id==='chemical'),'liquid inspection avoids the solid-waste sorting workflow');await perform(work);await click('Ghi nhận kết quả');check(true,'liquid container inspection can complete');}
  else{const wanted=b.kind==='domestic'?'domestic':b.kind==='chemical'?'chemical':'sharps';check(work.steps[0].object===wanted,'sorting target follows container label: '+b.id);await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");}
 }
 await ev(`useStore.setState(s=>({currentPhase:3,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_trash_disposal'})),player:{...s.player,flags:{...s.player.flags,wastePicked:[]},inventory:{...s.player.inventory,isHoldingTrash:false}}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__().some(m=>m.name==='asset-glass-shards')",'loose samples');
 const loose=(await evaluate('window.__LAB_INSPECT_MODELS__()')).filter(m=>['asset-glass-shards','asset-crumpled-paper','asset-contaminated-paper'].includes(m.name));
 check(loose.length===3&&loose.every(m=>Math.abs(m.min[1]-.006)<.002),'all loose samples sit just above floor');snapshots.loose=loose;
 check(errors.length===0,'no runtime errors in waste fixtures');await writeFile('docs/asset-studies/waste-integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await capture('waste-integration-failure');await writeFile('docs/asset-studies/waste-integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
