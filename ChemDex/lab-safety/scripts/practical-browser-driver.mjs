import { mkdir, writeFile } from 'node:fs/promises';
const cdp=process.env.P0_CDP_ORIGIN??'http://127.0.0.1:9222';
const app=process.env.P0_APP_URL??'http://127.0.0.1:3000/?debug=1';
const target=await(await fetch(`${cdp}/json/new?${encodeURIComponent(app)}`,{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[],checks=[];
let seq=0;
socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
const ev=code=>evaluate(`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {useScenarioSession}=await import('/src/scenarios/store.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('PASS '+label);};
async function wait(expression,label,timeout=30000){const until=Date.now()+timeout;while(Date.now()<until){if(await evaluate(`Boolean(${expression})`))return;await delay(100);}throw Error('Timeout '+label);}
async function click(text){const ok=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.getClientRects().length&&b.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true;})()`);if(!ok)throw Error('No button '+text);await delay(100);}
await mkdir('docs/practical-review',{recursive:true});
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/practical-review/${name}.png`,Buffer.from(r.data,'base64'));}
async function screenPoint(p){return evaluate(`(()=>{const svg=document.querySelector('[data-practical-simulation] svg');const p=new DOMPoint(${p[0]},${p[1]}).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y};})()`);}
async function mouse(type,p,pressed=false){const q=await screenPoint(p);await send('Input.dispatchMouseEvent',{type,...q,button:type==='mouseMoved'?'none':'left',buttons:pressed?1:0,clickCount:type==='mousePressed'||type==='mouseReleased'?1:0});}
async function getWork(key){return ev(`const {PRACTICAL_WORK}=await import('/src/data/practicalWork.ts');const {getPostPhaseWork,POST_PHASE_IDS}=await import('/src/data/postPhaseWork.ts');return POST_PHASE_IDS.includes(${JSON.stringify(key)})?getPostPhaseWork(${JSON.stringify(key)}):PRACTICAL_WORK[${JSON.stringify(key)}];`);}
async function aim(position,target,id){
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');playerCoords.position=${JSON.stringify(position)};inputManager.resetAll();return true;`);await delay(1100);
 await ev(`const {inputManager}=await import('/src/systems/input/InputManager.ts');const p=${JSON.stringify(target)},pos=playerCoords.position,r=window.__LAB_DEBUG_STATE__.cameraRotation,s=useStore.getState().settings;const dx=p[0]-pos[0],dz=p[2]-pos[2],yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(p[1]-1.62,Math.hypot(dx,dz));inputManager.addMouseLook((r[1]-yaw)/(.0022*s.cameraSensitivity),(r[0]-pitch)/(.0022*s.cameraSensitivity)*(s.invertY?-1:1));return true;`);
 await wait(`window.__LAB_DEBUG_STATE__?.focusId===${JSON.stringify(id)}`,'focus '+id);
}
async function interact(){await ev(`const {dispatchInteractionInput}=await import('/src/systems/input/InteractionBus.ts');dispatchInteractionInput();return true;`);}
async function perform(work,{from=0,to=work.steps.length,touch=false,initialPlacements=[]}={}){
 const positions=Object.fromEntries(work.objects.map(o=>[o.id,o.at]));
 work.steps.slice(0,from).forEach(s=>{if(s.mode==='drag'||s.mode==='stir')positions[s.object]=s.target;if(s.mode==='trace')positions[s.object]=s.path.at(-1);if(s.mode==='arrange')s.placements.forEach(p=>positions[p.object]=p.target);});
 for(let i=from;i<to;i++){
  const step=work.steps[i];
  if(step.mode==='inspect'){
   for(let j=0;j<step.inspections.length;j++){
    await evaluate(`document.querySelectorAll('.practical-inspections button')[${j}].click();true;`);await delay(70);await click('Đã kiểm tra vật này');
   }
  }else if(step.mode==='arrange'){
   for(const placement of step.placements){if(i===from&&initialPlacements.includes(placement.object))positions[placement.object]=placement.target;}
   for(const placement of [...step.placements].reverse().filter(p=>i!==from||!initialPlacements.includes(p.object))){
    if(touch){const start=await screenPoint(positions[placement.object]),end=await screenPoint(placement.target);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else {await mouse('mouseMoved',positions[placement.object]);await mouse('mousePressed',positions[placement.object],true);await mouse('mouseMoved',placement.target,true);await mouse('mouseReleased',placement.target);}
    positions[placement.object]=placement.target;await delay(80);
   }
  }else if(step.mode==='stir'){
   const circle=[];
   for(let n=0;n<=40;n++){const a=n/40*Math.PI*2;circle.push(await evaluate(`(()=>{const p=new DOMPoint(${180+76*Math.cos(a)},${140+76*Math.sin(a)}).matrixTransform(document.querySelector('[data-stir-surface]').getScreenCTM());return {x:p.x,y:p.y};})()`));}
   if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...circle[0],id:1}]});for(const q of circle.slice(1))await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...q,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await send('Input.dispatchMouseEvent',{type:'mousePressed',...circle[0],button:'left',buttons:1,clickCount:1});for(const q of circle.slice(1))await send('Input.dispatchMouseEvent',{type:'mouseMoved',...q,button:'none',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...circle.at(-1),button:'left',buttons:0,clickCount:1});}
  }else if(step.mode==='adjust'){
   await evaluate(`(()=>{const input=document.querySelector('[data-practical-simulation] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${step.value});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   // React's native range change handling is verified with real keyboard input as well.
   const q=await evaluate(`(()=>{const r=document.querySelector('[data-practical-simulation] input').getBoundingClientRect();return {x:r.x+10+(r.width-20)*${step.value}/100,y:r.y+r.height/2};})()`);
   await send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1});
   await click('Xác nhận vị trí');
  }else{
   const origin=step.mode==='hold'?step.target:positions[step.object];
   if(touch){
    const start=await screenPoint(origin);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    for(const p of step.mode==='trace'?step.path:[step.target]){const q=await screenPoint(p);await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...q,id:1}]});}
    if(step.mode==='hold')await wait(`!document.querySelector('.practical-instruction strong')?.textContent.startsWith('${i+1}/')`,'held action '+i,((step.seconds??2)+10)*1000);
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await mouse('mouseMoved',origin);await mouse('mousePressed',origin,true);
    if(step.mode==='hold')await wait(`!document.querySelector('.practical-instruction strong')?.textContent.startsWith('${i+1}/')`,'held action '+i,((step.seconds??2)+10)*1000);
    else for(const p of step.mode==='trace'?step.path:[step.target])await mouse('mouseMoved',p,true);
    await mouse('mouseReleased',step.mode==='hold'?origin:step.mode==='trace'?step.path.at(-1):step.target);
   }
  }
  if(step.mode==='drag'||step.mode==='stir')positions[step.object]=step.target;
  if(step.mode==='trace')positions[step.object]=step.path.at(-1);
  await delay(90);
  const text=await evaluate("document.querySelector('.practical-instruction strong')?.textContent");
  if(i+1===work.steps.length){if(!text.includes('Đã hoàn thành'))throw Error(`Step ${i} did not finish ${work.title}: ${text}`);}
  else if(!text.startsWith(`${i+2}/`))throw Error(`Step ${i} failed ${work.title}: ${text}`);
 }
}
export {send,evaluate,ev,check,wait,click,shot,screenPoint,mouse,getWork,aim,interact,perform,delay,errors,checks,socket,target,cdp,app};
