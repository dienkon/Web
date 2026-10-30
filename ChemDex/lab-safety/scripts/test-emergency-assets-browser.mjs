import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,aim,interact,click,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${name}.png`,Buffer.from(r.data,'base64'));};
const models=()=>evaluate('window.__LAB_INSPECT_MODELS__()'),snapshots={};
try{
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_evacuation'})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true}}}));return true;`);
 await wait("window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='asset-emergency-shower')",'emergency models');await delay(800);
 let list=await models();snapshots.installed=list.filter(m=>/asset-(emergency|eyewash|shower|extinguisher|first-aid|spill-cart|fire-blanket)/.test(m.name));
 for(const name of ['emergency-shower','eyewash','shower-head','extinguisher-cabinet','extinguisher-powder','extinguisher-co2','first-aid-cabinet','fire-blanket','spill-cart'])check(list.filter(m=>m.name==='asset-'+name).length===1,'one integrated emergency model: '+name);
 check(Math.abs(list.find(m=>m.name==='asset-spill-cart').min[1])<.002,'spill cart wheels and feet touch floor');
 const head=list.find(m=>m.name==='asset-shower-head'),bowl=list.find(m=>m.name==='asset-eyewash');
 check(Math.abs(head.position[0]+8.4)<.002&&Math.abs(head.position[2]+4)<.002,'shower outlet matches shared world layout');
 check(head.position[0]-bowl.max[0]>.3,'standing space beneath shower clears eyewash bowl');
 const bottles=list.filter(m=>['asset-reagent-bottle','asset-amber-bottle'].includes(m.name)&&m.min[0]<-9.5&&m.position[1]>1);
 check(bottles.length===3&&bottles.every(m=>Math.abs(m.min[1]-1.4)<.002),'first aid bottles sit on upper shelf');
 const item=await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return useLabEquipment.getState().items.find(i=>i.title==='Bồn rửa mắt khẩn cấp');`);
 await aim([-7.8,0,-4],[-8.92,1.11,-4],'equipment:'+item.id);await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Kéo cần'))",'shower controls');await capture('room-emergency-station');
 const rod=list.find(m=>m.name==='asset-shower-pull-rod').position[1];
 await click('Kéo cần');await delay(300);list=await models();
 check(list.some(m=>m.name==='asset-shower-water')&&!list.some(m=>m.name==='asset-eyewash-jets'),'shower control enables only overhead water');
 check(list.find(m=>m.name==='asset-shower-pull-rod').position[1]<rod-.1,'pull rod follows lever end down');await capture('room-shower-active');
 await delay(1600);await ev('useStore.getState().closeDialog();return true;');await delay(250);
 await click('Kích hoạt Bồn Rửa Mắt');await delay(300);list=await models();
 check(list.some(m=>m.name==='asset-eyewash-jets')&&!list.some(m=>m.name==='asset-shower-water'),'eyewash has its own jets and turns overhead water off');
 check(Math.abs(list.find(m=>m.name==='asset-shower-pull-rod').position[1]-rod)<.002,'overhead pull rod resets when eyewash starts');await capture('room-eyewash-active');
 await delay(1600);await ev('useStore.getState().closeDialog();return true;');await delay(250);await click('Tắt vòi Rửa Mắt');
 check(!(await models()).some(m=>m.name==='asset-eyewash-jets'),'stopping eyewash removes jet geometry');
 const cabinet=await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return useLabEquipment.getState().items.find(i=>i.title==='Tủ bình cứu hỏa');`);
 await aim([-8.4,0,-1.5],[-9.7,1.0,-1.5],'equipment:'+cabinet.id);await capture('room-extinguisher-cabinet');await interact();await wait("document.querySelector('[data-practical-simulation]')",'extinguisher interaction');
 check(await evaluate("document.querySelector('.practical-dialog h2').textContent.includes('bình')||document.querySelector('.practical-dialog h2').textContent.includes('PASS')"),'detailed fire cabinet still opens its practice');await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");
 check(errors.length===0,'no runtime errors in emergency assets');await writeFile('docs/asset-studies/emergency-integration-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await capture('emergency-integration-failure');await writeFile('docs/asset-studies/emergency-integration-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
