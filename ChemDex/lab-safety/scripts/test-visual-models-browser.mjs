import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,click,aim,perform,getWork,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const practice=code=>ev(`const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');${code}`);
const saveShot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/visual-gameplay/${name}.png`,Buffer.from(r.data,'base64'));};
const rects=()=>evaluate(`['.practical-dialog','.practical-scene','.practical-scene>svg'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];})`);
const stable=async before=>{const after=await rects();check(after.every((r,i)=>r.every((n,j)=>Math.abs(n-before[i][j])<.6)),'frame remains stable after instruction/control changes');};
try{
 await mkdir('docs/visual-gameplay',{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');await evaluate('document.fonts.ready.then(()=>true)');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({cinematic:null,view:'game',currentPhase:5,settings:{...s.settings,graphicsQuality:'low'}}));return true;`);
 await wait('window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==="cab_acid")','storage models');
 const storage=await evaluate('window.__LAB_INSPECT_MODELS__()');
 for(const id of ['cab_flammable','cab_acid','cab_base']){
  const model=storage.find(m=>m.name===id);check(model&&Math.abs(model.min[1])<.01&&model.max[1]<1.82,'cabinet rests on floor with correct full height: '+id);
 }
 for(let shelf=0;shelf<4;shelf++)for(let vessel=0;vessel<4;vessel++){
  const model=storage.find(m=>m.name===`shelf-${shelf}-vessel-${vessel}`),top=[.4,.85,1.3,1.75][shelf]+.015;
  check(model&&Math.abs(model.min[1]-top)<.002,'vessel bottom contacts shelf: '+shelf+'/'+vessel);
 }
 const cabinetBoxes=await ev(`const {INITIAL_COLLIDER_BOXES}=await import('/src/core/simulation/CollisionSystem.ts');return INITIAL_COLLIDER_BOXES.filter(b=>b.id.startsWith('cab_')||b.id==='shelf_general');`);
 for(const collider of cabinetBoxes){const model=storage.find(m=>m.name===collider.id);check(model.min[0]>=collider.minX-.03&&model.max[0]<=collider.maxX+.03&&model.min[2]>=collider.minZ-.03&&model.max[2]<=collider.maxZ+.03,'rendered storage matches collider: '+collider.id);}
 await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');useLabEquipment.getState().setActive('cab_acid',true);return true;`);await delay(1000);
 const open=await evaluate(`window.__LAB_INSPECT_MODELS__().filter(m=>m.name.startsWith('cabinet-hinge-')&&m.position[2]>.05&&m.position[2]<1.2)`);
 check(open.some(m=>Math.abs(m.rotation[1])>1),'cabinet doors rotate at hinges instead of shifting cabinet');
 await ev(`const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');useLabEquipment.getState().setActive('cab_acid',false);playerCoords.position=[6.8,0,.6];useStore.setState({currentPhase:4});return true;`);await delay(600);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;inputManager.addMouseLook((r[1]+Math.PI/2)/(.0022*s.cameraSensitivity),(r[0]+.15)/(.0022*s.cameraSensitivity));return true;`);await delay(1000);await saveShot('storage-3d');
 const ids=await ev(`const {LAB_SCENARIOS}=await import('/src/scenarios/catalog.ts');return LAB_SCENARIOS.map(s=>s.id);`);
 for(const id of ids){
  await ev(`const {LAB_SCENARIOS}=await import('/src/scenarios/catalog.ts');const id=${JSON.stringify(id)},scenario=LAB_SCENARIOS.find(s=>s.id===id);useStore.setState(s=>({view:'game',cinematic:null,currentPhase:5,tasks:s.tasks.map(t=>({...t,completed:t.id.startsWith('task_scenario_')&&t.id!==scenario.taskId}))}));return true;`);
  await wait(`window.__LAB_INSPECT_MODELS__?.().some(m=>m.name==='scenario-props-${id}')`,'scenario '+id);
  const models=await evaluate('window.__LAB_INSPECT_MODELS__()');
  const evidence=models.filter(m=>m.name.startsWith('evidence-')),platform=models.find(m=>m.name===`scenario-props-${id}`);
  check(evidence.length===3&&evidence.every(m=>Math.abs(m.min[1]-platform.position[1])<=.035),'all three evidence models rest within surface/tray clearance: '+id);
  await ev(`useStore.getState().startCinematic('scenario:${id}');return true;`);
  await wait(`window.__LAB_INSPECT_MODELS__().some(m=>m.name==='scenario-motion-${id}')`,'local motion '+id);
  await delay(300);
  const first=await evaluate(`window.__LAB_INSPECT_MODELS__().find(m=>m.name==='scenario-motion-${id}')`);await delay(500);
  const second=await evaluate(`window.__LAB_INSPECT_MODELS__().find(m=>m.name==='scenario-motion-${id}')`);
  check(JSON.stringify(first)!==JSON.stringify(second),'dedicated local detail actually animates: '+id);
  if(['hot-glass','centrifuge-balance','incompatible-storage'].includes(id)){await delay(4100);await saveShot('cinematic-'+id);}
  await ev('useStore.getState().finishCinematic();return true;');
 }
 await practice(`useStore.setState({view:'certificate',cinematic:null});useAdvancedPractice.getState().select('hot-glass','guided',true);return true;`);await wait("document.querySelector('[data-practical-simulation]')",'practice');
 let before=await rects();await click('Xem gợi ý');await stable(before);await click('Làm lại bước');await stable(before);
 await evaluate("document.querySelector('.practical-inspections button').click();true;");await click('Đã kiểm tra vật này');await stable(before);
 await click('Phóng vùng chơi');const expanded=await rects();await click('Hiện hướng dẫn');await stable(before);
 await click('Phóng vùng chơi');
 // Complete inspections via accessible cards after leaving expanded mode, then check explicit zoom persists into a hold step.
 await click('Hiện hướng dẫn');await perform(await getWork('hot-glass'),{to:1});await click('Phóng vùng chơi');
 const zoom=await rects();await perform(await getWork('hot-glass'),{from:1,to:4});
 check(await evaluate("document.querySelector('.practical-expand').getAttribute('aria-pressed')==='true'"),'zoom persists when advancing into a hold step');await stable(zoom);await click('Hiện hướng dẫn');
 await ev('useStore.setState(s=>({settings:{...s.settings,reduceMotion:true}}));return true;');
 check(await evaluate("[...document.querySelectorAll('[class^=fx-]')].every(n=>getComputedStyle(n).animationName==='none')"),'game reduced-motion setting disables local animation');
 await ev('useStore.setState(s=>({settings:{...s.settings,reduceMotion:false}}));return true;');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check(await evaluate("[...document.querySelectorAll('[class^=fx-]')].every(n=>getComputedStyle(n).animationName==='none')"),'OS reduced-motion setting disables local animation');
 await send('Emulation.setEmulatedMedia',{features:[]});
 for(const [width,height] of [[844,390],[390,844]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(250);
  if(await evaluate("Boolean(document.querySelector('.orientation-gate'))"))await click('Mở toàn màn hình');
  before=await rects();await click('Xem gợi ý');await stable(before);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow at '+width+'x'+height);
  check(before[2][2]>100&&before[2][3]>100,'usable fixed SVG viewport at '+width+'x'+height);await saveShot('workbench-'+width+'x'+height);
 }
 check(errors.length===0,'no runtime exceptions during visual and model review');
 await writeFile('docs/visual-gameplay/model-browser-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await saveShot('visual-failure');await writeFile('docs/visual-gameplay/model-browser-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
