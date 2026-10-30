import {writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,click,shot,mouse,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
async function mount(code){
 await evaluate(`(async()=>{window.uxRoot?.unmount();const reactModule=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react.js').name);const React=reactModule.default??reactModule;const rootModule=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/node_modules/.vite/deps/react-dom_client.js').name);const {createRoot}=rootModule.default??rootModule;let host=document.getElementById('ux-host');if(!host){host=document.createElement('div');host.id='ux-host';document.body.append(host);}window.uxRoot=createRoot(host);${code}})()`);await delay(250);
}
async function fits(selector,label){
 check(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;const r=e.getBoundingClientRect();return r.top>=-1&&r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+1;})()`),label);
}
async function reachable(selector,label){
 if(await evaluate("Boolean(document.querySelector('.orientation-gate'))")){await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'admit after layout');await delay(200);}
 check(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.y>=0&&r.bottom<=innerHeight&&e.contains(hit);})()`),label);
}
const workMount=(key,step=0)=>mount(`const {PracticalSimulation}=await import('/src/components/ui/PracticalSimulation.tsx');const {PRACTICAL_WORK}=await import('/src/data/practicalWork.ts');const {ACID_WORK}=await import('/src/components/ui/AcidPourGame.tsx');window.uxWork=${key==='acid'?'ACID_WORK':`PRACTICAL_WORK[${JSON.stringify(key)}]`};window.uxProgress=null;window.uxRoot.render(React.createElement(PracticalSimulation,{work:window.uxWork,initialStep:${step},onClose:()=>{},onComplete:()=>{},onProgress:p=>window.uxProgress=p}));`);
async function stirEvent(type,angle,touch=false){
 if(type==='touchEnd'){await send('Input.dispatchTouchEvent',{type,touchPoints:[]});return;}
 const q=await evaluate(`(()=>{const p=new DOMPoint(${180+76*Math.cos(angle)},${140+76*Math.sin(angle)}).matrixTransform(document.querySelector('[data-stir-surface]').getScreenCTM());return {x:p.x,y:p.y};})()`);
 if(touch)await send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{...q,id:1}]});
 else await send('Input.dispatchMouseEvent',{type,...q,button:type==='mouseMoved'?'none':'left',buttons:type==='mouseReleased'?0:1,clickCount:type==='mouseMoved'?0:1});
}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev("useStore.setState({view:'start'});return true;");
 for(const [width,height] of [[568,320],[667,375],[844,390]]){
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(650);
  if(await evaluate("Boolean(document.querySelector('.orientation-gate'))")){await click('Mở toàn màn hình');await wait("!document.querySelector('.orientation-gate')",'landscape gate');await delay(350);}
  await workMount('bandage',0);await fits('.practical-dialog',`${width}: workbench stays in viewport`);await reachable('[aria-label="Đóng thực hành"]',`${width}: workbench close remains reachable`);
  await workMount('acid',4);await fits('.practical-dialog',`${width}: direct stirring fits`);await fits('[data-stir-surface]',`${width}: bowl remains in viewport`);
  if(width===568){
   await stirEvent('touchStart',0,true);await delay(250);check(await evaluate("document.querySelector('[data-stir-progress]').value===0"),'stationary touch cannot auto-stir');
   for(let n=1;n<=20;n++)await stirEvent('touchMove',n/40*Math.PI*2,true);await stirEvent('touchEnd',Math.PI,true);
   check(await evaluate("document.querySelector('[data-stir-progress]').value>.45&&document.querySelector('[data-stir-progress]').value<.55"),'half circle is retained after finger lift');
   await stirEvent('touchStart',Math.PI,true);for(let n=21;n<=40;n++)await stirEvent('touchMove',n/40*Math.PI*2,true);await stirEvent('touchEnd',Math.PI*2,true);
   check(await evaluate("document.querySelector('.practical-instruction strong').textContent.startsWith('6/')"),'touch resumes and completes real stirring');
  }
  await mount(`const {Sheet}=await import('/src/ui/Sheet.tsx');window.uxRoot.render(React.createElement(Sheet,{isOpen:true,onClose:()=>{},title:'Cài đặt và hướng dẫn trên điện thoại'},React.createElement('div',{},Array.from({length:30},(_,i)=>React.createElement('p',{key:i},'Nội dung dài để kiểm tra cuộn và vùng an toàn '+i)),React.createElement('button',{id:'sheet-last'},'Thao tác cuối'))));`);
  await fits('.lab-sheet-dialog',`${width}: sheet stays in viewport`);await reachable('#sheet-last',`${width}: sheet content scroll reaches final action`);await reachable('.lab-sheet-header button',`${width}: sheet header close remains visible`);
  await mount(`const {RuleDialog}=await import('/src/components/ui/RuleDialog.tsx');const {useStore}=await import('/src/store/useStore.ts');const {SAFETY_RULES}=await import('/src/data/rules.ts');useStore.setState({activeRuleDialog:{...SAFETY_RULES[0],why:'Phần giải thích dài. '.repeat(70)}});window.uxRoot.render(null);`);
  await click('Lật xem chi tiết');await fits('.lab-rule-dialog',`${width}: rule details stay in viewport`);await reachable('.lab-rule-footer button:last-child',`${width}: rule action remains visible`);await reachable('.lab-rule-header button',`${width}: rule close remains visible`);
  await ev('useStore.setState({activeRuleDialog:null});return true;');
  await mount(`const {ConfirmPopup}=await import('/src/components/ui/ConfirmPopup.tsx');window.uxRoot.render(React.createElement(ConfirmPopup,{title:'Xác nhận thao tác',message:'Nội dung thông báo dài và hướng dẫn kiểm tra. '.repeat(40),onClose:()=>{},onConfirm:()=>{}}));`);
  await fits('.lab-popup',`${width}: long confirmation stays in viewport`);await reachable('.lab-popup button:last-child',`${width}: confirmation actions can be reached`);
  await workMount('bandage',2);await click('Phóng vùng chơi');await fits('.practical-dialog',`${width}: enlarged interaction surface fits`);await reachable('[aria-label="Đóng thực hành"]',`${width}: enlarged close remains visible`);
  await shot(`mobile-ux-${width}`);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await mount(`const {PracticalSimulation}=await import('/src/components/ui/PracticalSimulation.tsx');const {getPostPhaseWork}=await import('/src/data/postPhaseWork.ts');window.uxRoot.render(React.createElement(PracticalSimulation,{work:getPostPhaseWork('centrifuge-balance'),onClose:()=>{},onComplete:()=>{}}));`);
 await evaluate("document.querySelector('.practical-inspections button').click();true;");await fits('.practical-inspector>section','mobile close-up stays in viewport');await reachable('.practical-inspector-content>button','mobile close-up acknowledgement remains reachable');await shot('mobile-ux-inspection');
 await evaluate('window.uxRoot.unmount();true;');
 for(const flag of ['showSettings','showRulesList','showCharacterCreator']){
  await ev(`useStore.setState({${flag}:true});return true;`);await wait("document.querySelector('.lab-sheet-dialog')",flag);await delay(400);
  await fits('.lab-sheet-dialog',flag+': actual mobile popup fits');await reachable('.lab-sheet-header button',flag+': actual popup close stays reachable');
  await ev(`useStore.setState({${flag}:false});return true;`);await wait("!document.querySelector('.lab-sheet-dialog')",'close '+flag);
 }
 await ev("useStore.setState({activeErrorBanner:{title:'Thông báo dài',consequence:'Nội dung phản hồi. '.repeat(80)}});return true;");await wait("document.querySelector('.lab-popup')",'notice');await fits('.lab-popup','long notice fits mobile');await reachable('.lab-popup button','long notice acknowledgement reachable');await click('Đã hiểu');
 await ev("const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');useAdvancedPractice.getState().show();return true;");await wait("document.querySelector('[data-advanced-practice]')",'library');await fits('.advanced-practice-library','mobile library fits');await reachable('[data-advanced-practice] header>button','mobile library close reachable');
 await ev("const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');useAdvancedPractice.getState().close();return true;");
 await ev("const {useAcademy}=await import('/src/academy/core/store.ts');useAcademy.getState().openHub('flow-first');return true;");await wait("document.querySelector('[data-academy-briefing]')",'academy');await evaluate("document.querySelector('[data-start-challenge]').click();true;");await wait("document.querySelector('[data-active-challenge]')",'academy flow');await click('Tạm dừng');await fits('.academy-pause-overlay>section','mobile academy pause fits');await reachable('.academy-pause-overlay button','mobile academy resume reachable');await click('Tiếp tục thực hành');await evaluate("document.querySelector('[aria-label=\"Đóng học viện\"]').click();true;");await wait("document.querySelector('.academy-confirm-overlay')",'academy exit');await fits('.academy-confirm-overlay>section','mobile academy exit confirmation fits');await reachable('.academy-confirm-overlay button:last-child','mobile academy exit action reachable');await click('Rời lượt chơi');await evaluate("document.querySelector('[aria-label=\"Đóng học viện\"]').click();true;");
 await workMount('bandage',5);
 const path=await evaluate('window.uxWork.steps[5].path');
 const start=path[0],next=[start[0]+(path[1][0]-start[0])*.55,start[1]+(path[1][1]-start[1])*.55];
 await mouse('mousePressed',start,true);await mouse('mouseMoved',next,true);await mouse('mouseReleased',next);await delay(100);
 const saved=await evaluate('window.uxProgress.traceDistance');check(saved>5,'trace saves partial progress after release');
 await mouse('mousePressed',next,true);await mouse('mouseMoved',[next[0],next[1]-150],true);await mouse('mouseReleased',[next[0],next[1]-150]);await delay(100);
 check(await evaluate(`window.uxProgress.traceDistance>=${saved}&&window.uxProgress.mistakes===0`),'trace excursion retains completed ribbon without penalty');
 await shot('mobile-ux-trace');
 await evaluate('window.uxRoot.unmount();true;');
 check(errors.length===0,'no mobile UX runtime exceptions');
 await writeFile('docs/practical-review/mobile-ux-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await shot('mobile-ux-failure');await writeFile('docs/practical-review/mobile-ux-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
