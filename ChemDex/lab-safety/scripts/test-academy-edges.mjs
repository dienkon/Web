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



const target=await(await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`,{method:'PUT'})).json();const client=new Client(target.webSocketDebuggerUrl);await client.connect();
const errors=[];client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
const ev=code=>evaluate(client,`(async()=>{const {useAcademy}=await import('/src/academy/core/store.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
const select=async sel=>{await evaluate(client,`document.querySelector(${JSON.stringify(sel)}).click();true`);await delay(90)};
const click=async text=>{const ok=await evaluate(client,`(()=>{const b=[...document.querySelectorAll('[data-academy] button')].find(b=>b.textContent.includes(${JSON.stringify(text)})&&!b.disabled);if(!b)return false;b.click();return true})()`);if(!ok)throw Error('Button missing '+text);await delay(100)};
const open=async id=>{await ev(`useAcademy.getState().openHub('${id}');return true`);await waitFor(client,'document.querySelector("[data-academy-briefing]")','briefing');await select('[data-start-challenge]');await waitFor(client,'document.querySelector("[data-active-challenge]")','round')};
const leave=async()=>{await select('[aria-label="Đóng học viện"]');await click('Rời lượt chơi')};
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Page.bringToFront');await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 const before=await ev('return useAcademy.getState().profile.history.length');
 await open('sort-waste');await select('[data-sort-object="glass"]');await select('[data-sort-bin="domestic"]');check(await evaluate(client,'!document.querySelector("[data-sort-object=glass]").disabled'),'wrong bin does not consume sample');check(await evaluate(client,'!document.querySelector("[data-academy-result]")'),'wrong sorting does not complete game');
 await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const rects=await evaluate(client,"['[data-sort-object=glass]','[data-sort-bin=sharps]'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})");
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...rects[0],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...rects[1],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(200);check(await evaluate(client,'document.querySelector("[data-sort-object=glass]").disabled'),'actual touch drag sorts into the correct bin');await leave();
 await open('sequence-balance');await select('[data-sequence-card="step-3"]');await select('[data-sequence-slot="0"]');check(await evaluate(client,'!document.querySelector("[data-sequence-slot]").disabled'),'wrong step leaves current slot open');await leave();
 await open('memory-tools');await select('[data-memory-card="pair-1-left"]');await select('[data-memory-card="pair-2-right"]');await click('Tạm dừng');await delay(1800);check(await evaluate(client,'document.querySelectorAll(".academy-memory-card.is-open").length===2'),'memory mismatch reveal pauses with the round');await click('Tiếp tục thực hành');await waitFor(client,'document.querySelectorAll(".academy-memory-card.is-open").length===0','memory cards close after resume');
 await select('[data-memory-card="pair-1-left"]');await select('[data-memory-card="pair-3-right"]');await delay(200);check(await evaluate(client,'document.querySelectorAll(".academy-memory-card.is-open").length===2'),'each mismatch gets a full readable reveal');await waitFor(client,'document.querySelectorAll(".academy-memory-card.is-open").length===0','second mismatch closes');await leave();
 await open('flow-first');await click('Thử chọn nước');await evaluate(client,"document.querySelector('[data-pour-control]').focus();true");await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await delay(150);await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await delay(100);check(await evaluate(client,"parseFloat(document.querySelector('.academy-flow-readout strong').textContent)===0"),'unsafe direction does not add liquid');
 await click('Nguồn: axit');await evaluate(client,"document.querySelector('[data-pour-control]').focus();true");await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await delay(250);await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await delay(100);const amount=await evaluate(client,"parseFloat(document.querySelector('.academy-flow-readout strong').textContent)");check(amount>0,'keyboard hold can pour safely');await click('Tạm dừng');await delay(600);check(await evaluate(client,`parseFloat(document.querySelector('.academy-flow-readout strong').textContent)===${amount}`),'liquid amount freezes while paused');await click('Tiếp tục thực hành');await leave();
 check(await ev(`return useAcademy.getState().profile.history.length===${before}`),'abandoned rounds do not award completed results');await select('[aria-label="Đóng học viện"]');await delay(200);
 await ev("const {useStore}=await import('/src/store/useStore.ts');useStore.getState().startGame();return true");await delay(900);await select('[data-open-academy]');await waitFor(client,'document.querySelector("[data-academy]")','academy from room');check(await ev("const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().sceneModalCount>0"),'academy opened from 3D blocks world input');await select('[aria-label="Đóng học viện"]');await delay(150);check(await ev("const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().sceneModalCount===0"),'returning to room releases lock');
 await ev("const {playerCoords}=await import('/src/store/useStore.ts');playerCoords.position=[-6.3,0,-1.8];return true");await delay(300);
 const item=await ev("const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');return useLabEquipment.getState().items.find(i=>i.kind==='balance')");
 await evaluate(client,`window.dispatchEvent(new CustomEvent('lab-use-equipment',{detail:${JSON.stringify(item.id)}}));true`);await waitFor(client,'document.querySelector("#instrument-title")','instrument panel');
 await evaluate(client,"[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Chơi thử thách nâng cao')).click();true");await waitFor(client,'document.querySelector("[data-academy-briefing]")','instrument challenge bridge');
 check(await evaluate(client,"document.querySelector('[data-academy-briefing] h2').textContent.includes('5 g')"),'equipment opens its matching academy challenge');
 await delay(150);check(await ev("const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().sceneModalCount===1"),'equipment-to-academy handoff keeps one scene lock');
 await leave();await select('[aria-label="Đóng học viện"]');await delay(150);
 check(await ev("const {useStore}=await import('/src/store/useStore.ts');const s=useStore.getState();return s.sceneModalCount===0&&!s.player.inventory.hasFireExtinguisher&&!s.tasks.find(t=>t.id==='task_fire_extinguisher').completed"),'academy does not bypass world PASS or leak a lock');
 check(errors.length===0,'no edge-case runtime exceptions');await writeFile('docs/academy-upgrade/edge-checks.json',JSON.stringify({passed:true,checks:['wrong bin preserved','touch drag','wrong order guarded','memory pause','flow unsafe direction','keyboard pouring','pause flow','abandon no reward','world modal cleanup'],errors},null,2));
}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
