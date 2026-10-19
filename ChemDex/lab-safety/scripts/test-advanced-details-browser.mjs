import { writeFile } from 'node:fs/promises';
import { send,evaluate,ev,check,wait,click,shot,mouse,getWork,perform,delay,errors,checks,socket,target,cdp,app } from './practical-browser-driver.mjs';
const practice=code=>ev(`const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');${code}`);
async function select(id){await practice(`useAdvancedPractice.getState().select(${JSON.stringify(id)},'guided',true);return true;`);await wait("document.querySelector('[data-practical-simulation]')",id);}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');await ev("useStore.setState({view:'certificate'});return true;");
 await select('pipette-bulb');await perform(await getWork('pipette-bulb'),{to:4});
 check(await evaluate("document.querySelector('[data-work-object=pipette]').getAttribute('transform')==='translate(650 250)'&&document.querySelector('[data-work-object=bulb]').getAttribute('transform')==='translate(650 190)'"),'assembled pipette and bulb move together in rendered scene');await shot('advanced-pipette-assembly');
 await select('centrifuge-balance');await perform(await getWork('centrifuge-balance'),{to:1});await mouse('mousePressed',[160,180],true);await mouse('mouseMoved',[450,180],true);await mouse('mouseReleased',[450,180]);await delay(100);await shot('advanced-centrifuge');
 await practice('useAdvancedPractice.getState().close();return true;');await delay(100);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await delay(250);
 if(await evaluate("Boolean(document.querySelector('.orientation-gate'))"))await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'landscape');
 await select('crowded-bench');await perform(await getWork('crowded-bench'),{to:2,touch:true});await shot('advanced-mobile-arrange');
 check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'final mobile workbench has no horizontal overflow');
 await practice('useAdvancedPractice.getState().close();return true;');await delay(150);check(await ev('return useStore.getState().sceneModalCount===0;'),'assembly and mobile review release modal guards');check(errors.length===0,'no detail-review runtime exceptions');
 await writeFile('docs/practical-review/advanced-detail-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
