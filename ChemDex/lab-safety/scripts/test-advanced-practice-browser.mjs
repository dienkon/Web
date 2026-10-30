import { mkdir,writeFile } from 'node:fs/promises';
import { send,evaluate,ev,check,wait,click,shot,screenPoint,mouse,getWork,perform,delay,errors,checks,socket,target,cdp,app } from './practical-browser-driver.mjs';
const practice=code=>ev(`const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');${code}`);
const rects=()=>evaluate(`['.practical-dialog','.practical-scene','.practical-scene>svg'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height];})`);
const stable=async baseline=>{
 const current=await rects();if(current.some((r,i)=>r.some((n,j)=>Math.abs(n-baseline[i][j])>.6)))throw Error('Workbench shifted: '+JSON.stringify({baseline,current}));
};
async function captureVisual(id){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/visual-gameplay/${id}.png`,Buffer.from(r.data,'base64'));}
async function select(id,mode='guided',restart=true){
 await practice(`useAdvancedPractice.getState().select(${JSON.stringify(id)},${JSON.stringify(mode)},${restart});return true;`);
 await wait("document.querySelector('[data-practical-simulation]')",id);
}
async function closeWork(){await evaluate("document.querySelector('[aria-label=\"Đóng thực hành\"]').click();true;");await wait("document.querySelector('[data-advanced-practice]')",'catalog');}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await mkdir('docs/visual-gameplay',{recursive:true});await evaluate('document.fonts.ready.then(()=>true)');
 await practice(`localStorage.removeItem('chemdex-advanced-practice-v2');useAdvancedPractice.setState({records:{},open:false,selected:null});useStore.getState().startGame();useStore.setState(s=>({view:'certificate',score:73,settings:{...s.settings,graphicsQuality:'potato'}}));return true;`);
 await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Tiếp tục luyện minigame'))",'certificate practice entry');await click('Tiếp tục luyện minigame');
 await wait("document.querySelector('[data-advanced-practice]')",'catalog');check(await evaluate("document.querySelectorAll('.advanced-practice-grid article').length===19"),'all nineteen post-phase exercises are accessible from certificate');await shot('advanced-catalog');
 const ids=await ev("const {POST_PHASE_IDS}=await import('/src/data/postPhaseWork.ts');return POST_PHASE_IDS;");
 const centrifuge=await getWork('centrifuge-balance');await select('centrifuge-balance');
 await evaluate("document.querySelector('.practical-inspections button').click();true;");await wait("document.querySelector('.practical-inspector')",'close-up');await shot('advanced-close-up');
 check(await evaluate("document.querySelector('.practical-inspector-detail').textContent.includes('khối lượng')"),'close-up shows actual mass and paired-slot evidence');
 await click('Đã kiểm tra vật này');
 for(let i=1;i<3;i++){await evaluate(`document.querySelectorAll('.practical-inspections button')[${i}].click();true;`);await click('Đã kiểm tra vật này');}
 await mouse('mouseMoved',[160,180]);await mouse('mousePressed',[160,180],true);await mouse('mouseMoved',[530,260],true);await mouse('mouseReleased',[530,260]);await delay(100);
 check(await practice("return useAdvancedPractice.getState().records['centrifuge-balance'].draft.progress.mistakes===1&&useAdvancedPractice.getState().records['centrifuge-balance'].draft.progress.placed.length===0;"),'wrong tube-slot pairing is rejected and recorded');
 await mouse('mousePressed',[160,180],true);await mouse('mouseMoved',[450,180],true);await mouse('mouseReleased',[450,180]);await delay(100);await shot('advanced-centrifuge');await closeWork();
 await send('Page.reload',{ignoreCache:true});await wait("document.querySelector('.start-shell')",'reload');await practice("useStore.setState({view:'certificate'});return true;");await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Tiếp tục luyện minigame'))",'certificate');await click('Tiếp tục luyện minigame');await select('centrifuge-balance','guided',false);
 check(await evaluate("document.querySelector('[data-work-object=tube1]').getAttribute('transform')==='translate(450 180)'"),'partial multi-object placement survives page reload');
 await perform(centrifuge,{from:1,initialPlacements:['tube1']});await click('Ghi nhận kết quả');
 check(await practice("return useAdvancedPractice.getState().records['centrifuge-balance'].best.score===95&&!useAdvancedPractice.getState().records['centrifuge-balance'].draft;"),'result reflects corrected mistake and clears only completed draft');
 for(const id of ids.filter(id=>id!=='centrifuge-balance')){
  await select(id);const work=await getWork(id),baseline=await rects();
  check(await evaluate(`document.querySelector('[data-scene-backdrop]').getAttribute('data-scene-backdrop')===${JSON.stringify(id)}&&document.querySelector('[data-scene-effect]').getAttribute('data-scene-effect')===${JSON.stringify(id)}`),'dedicated scene art and effects: '+id);
  await captureVisual(id);await perform(work,{afterStep:()=>stable(baseline)});await stable(baseline);
  check(true,'dialog, scene and SVG stay fixed across every step and result: '+id);await click('Ghi nhận kết quả');
  check(await practice(`return useAdvancedPractice.getState().records[${JSON.stringify(id)}]?.runs===1&&useAdvancedPractice.getState().records[${JSON.stringify(id)}].best.score===100;`),'complete all physical operations: '+id);
 }
 check(await practice("return Object.values(useAdvancedPractice.getState().records).filter(r=>r.best).length===19;"),'all nineteen exercises have actual completed runtime evidence');
 await select('centrifuge-balance','independent');await perform(centrifuge,{to:1});
 check(await evaluate("document.querySelectorAll('.practical-scene circle[stroke=\"#099b96\"]').length===0"),'independent mode removes guided tool highlights');await click('Xem gợi ý');await click('Xem gợi ý');
 check(await practice("return useAdvancedPractice.getState().records['centrifuge-balance'].draft.progress.hints===1;"),'reopening the same step hint is not charged twice');await closeWork();await select('centrifuge-balance','independent',false);await click('Xem gợi ý');
 check(await practice("return useAdvancedPractice.getState().records['centrifuge-balance'].draft.progress.hints===1;"),'revealed hint survives closing and resuming without extra penalty');await perform(centrifuge,{from:1});await click('Ghi nhận kết quả');
 check(await practice("return useAdvancedPractice.getState().records['centrifuge-balance'].independentBest.score===98&&useAdvancedPractice.getState().records['centrifuge-balance'].history.length===2;"),'guided and independent records remain separate with bounded run history');
 const evacuation=await getWork('evacuation');await select('evacuation');await perform(evacuation,{to:2});
 await mouse('mousePressed',[190,370],true);await mouse('mouseMoved',[740,110],true);await mouse('mouseReleased',[740,110]);await delay(100);
 check(await practice("const d=useAdvancedPractice.getState().records.evacuation.draft.progress;return d.step===2;"),'cutting across evacuation route cannot bypass the path');await closeWork();
 check(await ev('return useStore.getState().score===100;'),'practice scoring does not change the restored certificate score');
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await delay(250);
 if(await evaluate("Boolean(document.querySelector('.orientation-gate'))"))await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'landscape');
 await select('crowded-bench');const bench=await getWork('crowded-bench');await perform(bench,{to:2,touch:true});await shot('advanced-mobile-arrange');await perform(bench,{from:2,touch:true});await click('Ghi nhận kết quả');
 check(await practice("return useAdvancedPractice.getState().records['crowded-bench'].runs===2;"),'touch completes free-order arrangement and continuous tool path');
 check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'advanced library and workbench fit mobile landscape');
 await practice('useAdvancedPractice.getState().close();return true;');await delay(150);check(await ev('return useStore.getState().sceneModalCount===0;'),'closing all practice layers restores scene input');
 check(errors.length===0,'no advanced-practice runtime exceptions');
 await writeFile('docs/practical-review/advanced-browser-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await shot('advanced-failure');await writeFile('docs/practical-review/advanced-browser-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
