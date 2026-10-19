import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cdpOrigin = process.env.P0_CDP_ORIGIN ?? 'http://127.0.0.1:9222';
const appUrl = process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/?debug=1';

class Client {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
  }

  async connect() {
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function pressInteract(client) {
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code: 'KeyE',
    key: 'e',
    windowsVirtualKeyCode: 69,
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    code: 'KeyE',
    key: 'e',
    windowsVirtualKeyCode: 69,
  });
}



const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();
const client=new Client(target.webSocketDebuggerUrl);await client.connect();
const errors=[];
client.socket.addEventListener('message',event=>{
 const m=JSON.parse(String(event.data));
 if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description).join(' '));
});
const ev=code=>evaluate(client,`(async()=>{const {useAcademy}=await import('/src/academy/core/store.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
const click=async text=>{const ok=await evaluate(client,`(()=>{const buttons=[...document.querySelectorAll('[data-academy] button')].filter(b=>!b.disabled);const b=buttons.find(b=>b.textContent.trim()===${JSON.stringify(text)})??buttons.find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`);if(!ok)throw Error('Missing button '+text);await delay(70)};
const selector=async sel=>{await evaluate(client,`(()=>{const b=document.querySelector(${JSON.stringify(sel)});if(!b||b.disabled)throw Error('Unavailable '+${JSON.stringify(sel)});b.click();return true})()`);await delay(70)};
const field=async(sel,value)=>{await evaluate(client,`(()=>{const e=document.querySelector(${JSON.stringify(sel)});const prototype=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await delay(90)};
const shot=async name=>{const response=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/academy-upgrade/${name}.png`,Buffer.from(response.data,'base64'))};
const open=async id=>{await ev(`useAcademy.getState().openHub(${JSON.stringify(id)});return true`);await waitFor(client,'document.querySelector("[data-academy-briefing]")','briefing '+id);await selector('[data-start-challenge]');await waitFor(client,'document.querySelector("[data-active-challenge]")','game '+id)};
const results=[];
try{
 await client.send('Runtime.enable');await client.send('Page.enable');await client.send('Page.bringToFront');await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 await ev(`const {createProfile}=await import('/src/academy/core/profile.ts');useAcademy.getState().importProfile(createProfile());return true`);
 await selector('[data-open-academy]');await waitFor(client,'document.querySelector("[data-academy]")','academy');await shot('academy-home');
 const catalog=await ev(`const {ACADEMY_GAMES}=await import('/src/academy/data/games.ts');return ACADEMY_GAMES`);
 for(const game of catalog){
  const before=await ev('return useAcademy.getState().profile.history.length');
  await open(game.id);
  if(game===catalog[0]){
   await click('Tạm dừng');const time=await evaluate(client,'document.querySelector(".academy-round-counters time").textContent');await delay(1200);check(await evaluate(client,`document.querySelector('.academy-round-counters time').textContent===${JSON.stringify(time)}`),'timer stops while paused');await click('Tiếp tục thực hành');
  }
  if(game.kind==='sort'){
   for(const object of game.objects){await selector(`[data-sort-object="${object.id}"]`);await selector(`[data-sort-bin="${object.binId}"]`);}
  }else if(game.kind==='sequence'){
   for(let i=0;i<game.steps.length;i++){await selector(`[data-sequence-card="${game.steps[i].id}"]`);await selector(`[data-sequence-slot="${i}"]`);}
  }else if(game.kind==='memory'){
   for(const pair of game.pairs){await selector(`[data-memory-card="${pair.id}-left"]`);await selector(`[data-memory-card="${pair.id}-right"]`);}
  }else if(game.kind==='hazard'){
   for(const spot of game.hazards)await selector(`[data-hazard-id="${spot.id}"]`);
   await click('Báo cáo các nguy cơ');
  }else if(game.kind==='precision'){
   if(game.precision.needsTare)await click('Đặt cốc và trừ bì');
   if(game.precision.needsEyeLevel)await click('Đặt mắt ngang vạch');
   await field('[data-precision-input]',game.precision.target);await delay(700);await click('Ghi kết quả');
  }else if(game.kind==='decision'){
   for(let i=0;i<game.caseIds.length;i++){await selector('[data-decision-choice="safe"]');await click('Xác nhận lựa chọn');await click(i===game.caseIds.length-1?'Hoàn thành tình huống':'Tình huống tiếp theo');}
  }else if(game.kind==='flow'){
   let loops=0;
   while(true){
    const amount=await evaluate(client,"parseFloat(document.querySelector('.academy-flow-readout strong').textContent)");
    if(amount>=game.flow.target-1.3)break;
    if(++loops>50)throw Error('Flow failed to advance');
    const rect=await evaluate(client,"(()=>{const r=document.querySelector('[data-pour-control]').getBoundingClientRect();document.querySelector('[data-pour-control]').scrollIntoView({block:'center'});const p=document.querySelector('[data-pour-control]').getBoundingClientRect();return {x:p.x+p.width/2,y:p.y+p.height/2}})()");
    await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
    await delay(Math.max(80,Math.min(320,(game.flow.target-1-amount)/game.flow.pourRate*1000)));
    await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
    await delay(500);
   }
   await evaluate(client,"document.querySelector('[data-stir-surface]').scrollIntoView({block:'center'});true;");
   const circle=[];for(let n=0;n<=40;n++){const a=n/40*Math.PI*2;circle.push(await evaluate(client,`(()=>{const p=new DOMPoint(${180+76*Math.cos(a)},${140+76*Math.sin(a)}).matrixTransform(document.querySelector('[data-stir-surface]').getScreenCTM());return {x:p.x,y:p.y};})()`));}
   await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...circle[0],button:'left',buttons:1,clickCount:1});for(const q of circle.slice(1))await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...q,buttons:1});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...circle.at(-1),button:'left',buttons:0,clickCount:1});
   await waitFor(client,"parseFloat(document.querySelectorAll('.academy-flow-readout strong')[1].textContent)<=28",'flow cooldown');
   if(game.id==='flow-first')await shot('academy-flow');
   await click('Kiểm tra mẻ');
  }
  await waitFor(client,'document.querySelector("[data-academy-result]")','result '+game.id);
  const result=await ev('return useAcademy.getState().profile.history.at(-1)');
  check(result.gameId===game.id&&result.completed&&result.score>0,'complete '+game.id);
  check(await ev(`return useAcademy.getState().profile.history.length===${before+1}`),'result recorded once');
  results.push({id:game.id,score:result.score,correct:result.correct,mistakes:result.mistakes});
  if(game.id==='balance-5')await shot('academy-result');
  await click('Về học viện');
 }
 check(results.length===44,'all 44 challenges can finish through their UI');
 await click('Phòng thử thách');await field('[aria-label="Tìm bài thực hành"]','phan loai');check(await evaluate(client,'document.querySelectorAll("[data-play-game]").length>0'),'accent-insensitive search');await field('[aria-label="Tìm bài thực hành"]','');
 await click('Lộ trình riêng');await shot('academy-plan');await click('Bắt đầu lộ trình');await waitFor(client,'document.querySelector("[data-academy-briefing]")','planned briefing');await selector('[aria-label="Đóng học viện"]');await click('Rời lượt chơi');
 await click('Từ điển');await field('[aria-label="Tìm khái niệm"]','tru bi');await click('Trừ bì');await click('Đánh dấu đã hiểu');check(await ev('return useAcademy.getState().profile.readGlossaryIds.length===1'),'glossary reading saved');
 await click('Sổ tay');await click('Ghi chú mới');await field('[aria-label="Tiêu đề ghi chú"]','Nhớ trừ bì');await field('[aria-label="Nội dung ghi chú"]','Đặt vật chứa trước rồi trừ bì.');await click('Lưu ghi chú');check(await ev('return useAcademy.getState().profile.notebook.length===1'),'notebook saved');
 await click('Tiến trình');await shot('academy-progress');await click('Thành tích');check(await evaluate(client,'document.querySelectorAll(".academy-badge-card.is-earned").length>0'),'achievements earned');await click('Gợi ý luyện tập');check(await evaluate(client,'document.querySelector(".academy-coaching")!==null'),'personal coaching available');
 const persisted=await ev('return {xp:useAcademy.getState().profile.xp,history:useAcademy.getState().profile.history.length}');await client.send('Page.reload');await delay(1200);await waitFor(client,"document.querySelector('.start-shell')",'reloaded');check(await ev(`return useAcademy.getState().profile.xp===${persisted.xp}&&useAcademy.getState().profile.history.length===44`),'profile survives reload');
 await selector('[data-open-academy]');await waitFor(client,'document.querySelector("[data-academy]")','mobile academy');await client.send('Emulation.setDeviceMetricsOverride',{width:812,height:375,deviceScaleFactor:1,mobile:true});await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await delay(400);await shot('academy-mobile');
 check(await evaluate(client,'document.querySelector("[data-academy]").scrollWidth<=812'),'mobile overlay has no horizontal overflow');
 await selector('[aria-label="Đóng học viện"]');await delay(150);check(await ev("const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().sceneModalCount===0"),'closing academy releases scene lock');
 check(errors.length===0,'no browser runtime or console errors');await writeFile('docs/academy-upgrade/browser-checks.json',JSON.stringify({passed:true,results,errors,persisted},null,2));
}catch(error){console.log('Browser errors:',errors);await shot('academy-failure');throw error;}
finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
