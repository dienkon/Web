import {writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,delay,click,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const snapshots={};
const input=()=>ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');return {move:{...inputManager.move},look:{...inputManager.lookDelta},joystick:inputManager.joystickPointerId,lookId:inputManager.lookPointerId};`);
const touch=(type,touchPoints)=>send('Input.dispatchTouchEvent',{type,touchPoints});
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({view:'game',cinematic:null,currentPhase:4,tasks:s.tasks.map(t=>({...t,completed:true})),settings:{...s.settings,graphicsQuality:'low',reduceMotion:true},player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true;`);await delay(800);if(await evaluate("Boolean(document.querySelector('.orientation-gate'))"))await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'landscape admission');await wait('window.__LAB_DEBUG_STATE__','renderer');await delay(1000);
 check(await evaluate('matchMedia("(pointer:coarse)").matches'),'actual coarse pointer layout is active');
 const start={x:64,y:305,id:1},right={x:650,y:180,id:2};await touch('touchStart',[start]);await touch('touchStart',[start,right]);await touch('touchMove',[{...start,y:262},{...right,x:685}]);await delay(500);
 let state=await input();snapshots.moving=state;check(state.joystick!==null&&state.lookId!==null&&state.joystick!==state.lookId,'two fingers have distinct joystick and look owners');check(state.move.y>.5,'walking reacts immediately to real touch displacement');
 check(await evaluate(`(()=>{const zone=document.querySelector('[aria-label="Cần điều khiển di chuyển"]'),knob=zone?.querySelector('.grid');return !!knob&&knob.style.transform.includes('translate3d')&&!knob.style.marginTop&&!knob.style.marginLeft;})()`),'joystick uses compositor transform without changing margins');
 const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('docs/player-mobile/after-mobile-controls.png',Buffer.from(shot.data,'base64'));
 await touch('touchEnd',[]);await delay(500);state=await input();check(state.joystick===null&&state.lookId===null&&state.move.y===0,'releasing both fingers clears both owners and movement');check(await evaluate(`!document.querySelector('[aria-label="Cần điều khiển di chuyển"] .grid')`),'joystick knob disappears after release');
 for(const reset of ['cancel','blur','modal']){
 await touch('touchStart',[start]);await touch('touchMove',[{...start,y:252}]);await delay(150);
 if(reset==='cancel')await touch('touchCancel',[]);
 if(reset==='blur'){await evaluate("window.dispatchEvent(new Event('blur'));true;");await touch('touchEnd',[]);}
 if(reset==='modal'){await ev('useStore.setState({showSettings:true});return true;');await touch('touchEnd',[]);}
 await delay(400);state=await input();check(state.joystick===null&&state.move.y===0,'no stuck movement after '+reset);check(await evaluate(`!document.querySelector('[aria-label="Cần điều khiển di chuyển"] .grid')`),'no stale knob after '+reset);
 if(reset==='modal'){await ev('useStore.setState({showSettings:false});return true;');await delay(400);}
 }
 snapshots.budget=await evaluate('window.__LAB_INSPECT_BATCHES__()');check(snapshots.budget.mirror.width===256&&snapshots.budget.mirror.height===384&&snapshots.budget.mirror.frameSpacing===3,'coarse mirror has compact target and separate main-frame budget');
 await ev('useStore.setState(s=>({settings:{...s.settings,graphicsQuality:"high"}}));return true;');await delay(600);snapshots.high=await evaluate('window.__LAB_INSPECT_BATCHES__()');check(snapshots.high.mirror.width===512,'high quality restores detailed reflection target');
 await ev('useStore.setState(s=>({settings:{...s.settings,graphicsQuality:"low"}}));return true;');await delay(600);check(await evaluate('window.__LAB_INSPECT_BATCHES__().mirror.width===256'),'switching back restores compact reflection without losing mirror');
 check(errors.length===0,'no runtime errors during native touch, cancellation and graphics changes');await writeFile('docs/player-mobile/mobile-controls-checks.json',JSON.stringify({passed:true,checks,errors,snapshots},null,2));
}catch(error){await writeFile('docs/player-mobile/mobile-controls-checks.json',JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{await touch('touchEnd',[]).catch(()=>{});socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
