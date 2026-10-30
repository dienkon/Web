import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({currentPhase:1,settings:{...s.settings,graphicsQuality:'low'},tasks:s.tasks.map(t=>({...t,completed:['task_talk','task_rules'].includes(t.id)})),player:{...s.player,equipment:{...s.player.equipment,hasGoggles:false,hasLabCoat:false,hasGloves:false,hasMask:false,hasClosedShoes:false,hairTied:false}}}));window.__PPE_TEST_STORE__=useStore;return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-goggles')",'PPE station');
 const models=await evaluate('window.__LAB_INSPECT_MODELS__()');
 check(models.filter(m=>m.name==='asset-goggles').length===3,'three detailed goggles on their shelf');
 check(models.filter(m=>m.name==='asset-lab-coat').length===2,'two distinct hanging coats');
 check(models.filter(m=>m.name==='asset-glove-dispenser').length===3,'three size-specific glove dispensers');
 check(models.filter(m=>m.name==='asset-backpack').length===2,'both entrance backpacks use shared model');
 check(models.filter(m=>m.name==='asset-goggles').every(m=>Math.abs(m.min[1]-1.215)<.003),'goggles contact shelf');
 check(models.filter(m=>m.name==='asset-lab-coat').every(m=>Math.abs(m.max[1]-1.6)<.015),'coat hangers reach rail');
 check(models.filter(m=>m.name==='asset-backpack').every(m=>Math.abs(m.min[1]-.9)<.002),'backpacks contact locker top');
 check(models.some(m=>m.name==='asset-shoes-mat'&&Math.abs(m.min[1]-.001)<.002),'entrance mat touches floor');
 await aim([-6,0,5.8],[-6,.05,6.8],'shoes_mat');await interact();await wait('window.__PPE_TEST_STORE__.getState().player.equipment.hasClosedShoes','shoe check');check(true,'shoe quest targets its visible mat');await ev('useStore.getState().closeDialog();return true;');await delay(700);
 await aim([-.8,0,5.65],[-.8,1.5,7.115],'mirror_hair');await interact();await wait('window.__PPE_TEST_STORE__.getState().player.equipment.hairTied','hair preparation');check(true,'hair quest uses new mirror location');await ev('useStore.getState().closeDialog();return true;');await delay(800);
 await wait('window.__LAB_RENDERER_INFO__?.mirrorUpdates>0','live reflection');check(true,'mirror updates actual character reflection');await capture('room-mirror-reflection');
 const frame=models.find(m=>m.name==='asset-mirror-frame');check(frame&&Math.abs(frame.min[1])<.002&&frame.min[0]>-1.5,'mirror stand rests on floor and clears PPE cabinet');
 await aim([-3,0,5.4],[-3,1.25,7.1],'equip_goggles');await capture('room-ppe-station');
 const tasks=[['equip_goggles','hasGoggles',[-3,1.25,7.1]],['equip_coat','hasLabCoat',[-4,1.35,7.1]],['equip_gloves','hasGloves',[-2.05,1.25,7.1]],['equip_mask','hasMask',[-2.5,.65,7.1]]];
 for(const [id,key,at] of tasks){await aim([at[0],0,5.4],at,id);await interact();await wait(`window.__PPE_TEST_STORE__.getState().player.equipment.${key}`,'equip '+key);check(true,'real quest interaction works with detailed station: '+id);await delay(700);}
 check(errors.length===0,'no PPE integration runtime exceptions');await writeFile('docs/asset-studies/ppe-integration-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await capture('ppe-integration-failure');await writeFile('docs/asset-studies/ppe-integration-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
