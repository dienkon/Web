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


const target = await (await fetch(`${cdpOrigin}/json/new?${encodeURIComponent(appUrl)}`, {method:'PUT'})).json();
const client = new Client(target.webSocketDebuggerUrl); await client.connect();
const errors=[]; client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
const clickText=async(text)=>{const ok=await evaluate(client,`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})&&!b.disabled);if(!b)return false;b.click();return true})()`);check(ok,'click '+text);await delay(150)};
const shot=async(name)=>{const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/screens/${name}.png`,Buffer.from(s.data,'base64'))};
try {
 await client.send('Page.enable'); await client.send('Runtime.enable');
 await client.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({currentPhase:2,isDialogActive:false,player:{...s.player,equipment:{hasGoggles:true,hasLabCoat:true,hasGloves:true,hasMask:true,hairTied:true,hasClosedShoes:true}}}));return true`);await delay(1500);
 await ev(`useStore.getState().equipItem('hasFireExtinguisher');return true`);
 check(await ev('return !useStore.getState().player.inventory.hasFireExtinguisher && useStore.getState().showFireExtinguisherQuiz'),'PASS quiz required before equip');
 await waitFor(client,"[...document.querySelectorAll('h2')].some(e=>e.textContent.includes('P.A.S.S'))",'quiz');
 await clickText('Lắc mạnh'); await clickText('Xác Nhận');
 check(await ev('return !useStore.getState().player.flags.passTrained'),'wrong answer does not unlock'); await clickText('Thử Lại');
 const answers=['Rút chốt an toàn bằng','Hướng loa phun trực tiếp vào gốc','Bóp chặt và giữ liên tục','Quét loa phun qua lại'];
 for(let i=0;i<answers.length;i++){await clickText(answers[i]);await clickText('Xác Nhận');await clickText(i===3?'Hoàn Thành':'Bước Tiếp');}
 check(await ev("return useStore.getState().player.flags.passTrained && useStore.getState().player.inventory.hasFireExtinguisher && useStore.getState().activeTool==='extinguisher'"),'four correct answers unlock extinguisher');
 await ev(`useStore.setState(s=>({isDialogActive:false,dialogMessages:[],showFireExtinguisherQuiz:false,tasks:s.tasks.map(t=>({...t,completed:!['task_inspect_acid','task_bandage','task_spill_kit','task_spill_neutralize','task_spill_wipe','task_trash_disposal'].includes(t.id)}))}));playerCoords.position=[4.2,0,3.6];return true`);await delay(400);
 await evaluate(client,"window.dispatchEvent(new Event('lab-open-acid'));true");await waitFor(client,"document.querySelector('.acid-game')",'acid game');
 check(await ev('return useStore.getState().sceneModalCount>0'),'acid modal blocks world input');
 await evaluate(client,"document.querySelector('.acid-vessel.water').click();true");await delay(80);await evaluate(client,"document.querySelector('.acid-vessel.acid').click();true");await delay(250);
 check(await evaluate(client,"!!document.querySelector('.acid-unsafe')"),'water into acid rejected');await clickText('Làm lại an toàn');
 // Actual pointer drag of acid onto water, including captured pointer move.
 const rects=await evaluate(client,"['acid','water'].map(k=>{const r=document.querySelector('.acid-vessel.'+k).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})");
 await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...rects[0]});await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...rects[0],button:'left',clickCount:1});
 await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...rects[1],button:'left',buttons:1});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...rects[1],button:'left',clickCount:1});
 await waitFor(client,"document.querySelector('.acid-stir-rod')",'first pour');
 for(let i=0;i<3;i++){
   if(i>0){await evaluate(client,"document.querySelector('.acid-vessel.acid').click();true");await delay(80);await evaluate(client,"document.querySelector('.acid-vessel.water').click();true");await waitFor(client,"document.querySelector('.acid-stir-rod')",'next pour');}
   await clickText('Khuấy đều'); await waitFor(client,"!document.querySelector('.acid-cooling')",'cool down');
 }
 await shot('safety-acid-complete');await clickText('Ghi nhận kết quả');
 check(await ev("return useStore.getState().tasks.find(t=>t.id==='task_inspect_acid').completed"),'acid task completes after all cycles');
 await ev(`useStore.setState(s=>({currentPhase:3,isDialogActive:false,activeTool:'waste',player:{...s.player,inventory:{...s.player.inventory,isHoldingTrash:true,heldTrashType:'chemical'}}}));playerCoords.position=[7.5,0,5];return true`);await delay(500);
 await evaluate(client,"window.dispatchEvent(new Event('lab-open-waste'));true");await waitFor(client,"document.querySelector('#practice-title')",'waste game');
 check(await evaluate(client,"document.body.textContent.includes('Mẫu: túi giấy thấm')"),'visible waste sample');
 await clickText('Rác sinh hoạt');check(await ev('return useStore.getState().player.inventory.isHoldingTrash'),'wrong bin keeps waste');await clickText('Chọn lại');await clickText('Chất thải hóa chất —');await clickText('Bỏ mẫu');
 check(await ev("return !useStore.getState().player.inventory.isHoldingTrash && !useStore.getState().tasks.find(t=>t.id==='task_trash_disposal').completed"),'correct bin disposes sample without skipping remaining waste');
 await clickText('Luyện kỹ năng');
 for(const text of ['Dừng sử dụng','Báo động, rời','Tháo găng đúng']){await clickText(text);await clickText('Tình huống tiếp theo');}
 check(await evaluate(client,"document.body.textContent.includes('Đã ôn tập 3 tình huống')"),'three safety practice cases complete');await shot('safety-practice-complete');
 await clickText("✕");await delay(300);
 check(await ev('return useStore.getState().sceneModalCount===0'),'all modals release input lock');
 check(errors.length===0,'no browser runtime exceptions');
 await mkdir('docs/perf',{recursive:true});await writeFile('docs/perf/SAFETY_INTERACTIONS_CHECK.json',JSON.stringify({passed:true,errors,checked:['PASS unlock and wrong answer','acid drag and reversed pour','three pour-stir-cool cycles','waste sample and classification','three safety scenarios','modal cleanup']},null,2));
} finally {client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
