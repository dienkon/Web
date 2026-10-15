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
const errors=[];client.socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'){const text=m.params.args.map(a=>a.value??a.description).join(' ');console.log('CONSOLE ERROR',text);errors.push(text)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text)});
const ev=code=>evaluate(client,`(async()=>{const {useStore,playerCoords}=await import('/src/store/useStore.ts');const {useLabEquipment}=await import('/src/store/useLabEquipment.ts');${code}})()`);
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label)};
const click=async text=>{const ok=await evaluate(client,`(()=>{const buttons=[...document.querySelectorAll('[role="dialog"] button')].filter(b=>!b.disabled);const b=buttons.find(b=>b.textContent.trim()===${JSON.stringify(text)})??buttons.find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true})()`);if(!ok)throw Error('Missing button '+text);await delay(65)};
const input=async(label,value)=>{await evaluate(client,`(()=>{const e=document.querySelector('input[aria-label=${JSON.stringify(label)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${value});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);await delay(80)};
const shot=async name=>{const s=await client.send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/screens/${name}.png`,Buffer.from(s.data,'base64'))};
const workflows={ventilation:['Quan sát kính','Báo giáo viên','Giữ thông gió'],gas:['Kiểm tra ống','Xác nhận giáo viên','Khóa van'],blanket:['Báo động','Kéo hai đai','Chọn thoát nạn'],locker:['Kiểm tra ngăn','Đặt ba lô','Đóng ngăn'],smokeAlarm:['Kiểm tra thiết bị','Nhận tín hiệu','Báo giáo viên'],workspace:['Dọn trống','Đặt dụng cụ đứng','Kiểm tra bàn sạch'],glass:['Soi kiểm tra','Chọn dụng cụ nguyên','Đặt lên giá'],seat:['Kiểm tra chân','Điều chỉnh tư','Xoay ghế gọn'],drawer:['Kiểm tra nhãn','Mở ngăn','Đóng ngăn'],door:['Báo động','Kiểm tra lối thoát','Đi theo lối'],electrical:['Kiểm tra tay','Kiểm tra dây','Bật công tắc','Tắt công tắc'],board:['Xác định tên','Đọc chú giải','Đối chiếu nhãn'],ppe:['Kiểm tra đồ','Mang đúng','Xác nhận bảo'],shower:['Báo giáo viên','Đến vòi','Bắt đầu rửa'],firstAid:['Báo giáo viên','Chọn vật tư','Gọi hỗ trợ'],mirror:['Quan sát tóc','Buộc tóc','Kiểm tra kính'],spillKit:['Cô lập','Kiểm tra PPE','Lấy chổi'],waste:['Đọc nhãn','Chọn đúng','Đóng nắp']};
try{
 await client.send('Page.enable');await client.send('Runtime.enable');await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:appUrl});await waitFor(client,"document.querySelector('.start-shell')",'start');
 await ev(`useStore.getState().startGame();useStore.setState(s=>({isDialogActive:false,runState:'RUNNING',player:{...s.player,equipment:{hasGoggles:true,hasGloves:true,hasLabCoat:true,hasMask:true,hairTied:true,hasClosedShoes:true},flags:{...s.player.flags,passTrained:true}}}));return true`);await delay(1200);
 const nav=await ev(`const {findNavigationPath,hasWalkableSegment,isWalkable}=await import('/src/core/simulation/NavigationPath.ts');const starts=[[-8,2.2],[-6,5.8],[0,0],[6,5]],targets=[[-9.2,3],[2.5,1],[4.2,-2.2],[8.8,5],[-4.2,-2.2],[-6,7.4]];let routes=0,maxTurns=0;for(const start of starts)for(const target of targets){const route=findNavigationPath(start,target);if(!route.length)throw Error('Unreachable '+start+' -> '+target);for(let i=1;i<route.length;i++)if(!hasWalkableSegment(route[i-1],route[i]))throw Error('Route crosses furniture');const last=route.at(-1);if(Math.hypot(last[0]-target[0],last[1]-target[1])>1.551)throw Error('Approach out of range');routes++;maxTurns=Math.max(maxTurns,route.length);}const direct=findNavigationPath([0,0],[1,0],.1);if(direct.length>2)throw Error('Open-floor route not straight');return {routes,maxTurns};`);check(nav.routes===24,'24 routes avoid benches, stools and cabinets');
 const items=await ev('return useLabEquipment.getState().items');check(items.length>=95,'equipment catalog contains room objects: '+items.length);check(new Set(items.map(i=>i.id)).size===items.length,'each equipment instance has unique identity');
 const kinds=[...new Set(items.map(i=>i.kind))];console.log('Kinds: '+kinds.join(', ')); console.log(await ev("const s=useStore.getState();return {view:s.view,runState:s.runState,dialog:s.isDialogActive,modal:s.sceneModalCount,settings:s.showSettings,rules:s.showRulesList,creator:s.showCharacterCreator}"));
 // Navigate remotely from the actual equipment directory.
 await evaluate(client,"window.dispatchEvent(new Event('lab-open-equipment'));true");await waitFor(client,"document.querySelector('#equipment-title')",'catalog');await shot('expansion-equipment-catalog');await click('Dẫn đường đến dụng cụ');check(await ev('return !!useLabEquipment.getState().destination'),'catalog sets destination');await ev('useLabEquipment.getState().navigate(null);return true');
 const used=[];
 for(const item of items){
   await ev(`useStore.setState({isDialogActive:false,showFireExtinguisherQuiz:false});const {findNavigationPath}=await import('/src/core/simulation/NavigationPath.ts');const item=useLabEquipment.getState().items.find(i=>i.id===${JSON.stringify(item.id)});const route=findNavigationPath([0,0],[item.position[0],item.position[2]]);if(!route.length)throw Error('Item unreachable '+item.title);const p=route.at(-1);playerCoords.position=[p[0],0,p[1]];return true`);await delay(40);
   await evaluate(client,`window.dispatchEvent(new CustomEvent('lab-use-equipment',{detail:${JSON.stringify(item.id)}}));true`);
   await waitFor(client,"document.querySelector('#instrument-title')||document.querySelector('#acid-title')",'equipment '+item.title);
   if(item.kind==='acid'){
     for(let n=0;n<3;n++){await evaluate(client,"document.querySelector('.acid-vessel.acid').click();true");await delay(70);await evaluate(client,"document.querySelector('.acid-vessel.water').click();true");await waitFor(client,"document.querySelector('.acid-stir-rod')",'acid pour');await click('Khuấy đều');await waitFor(client,"!document.querySelector('.acid-cooling')",'cool');}await click('Ghi nhận');
   }else if(item.kind==='extinguisher'){
     for(const text of ['Xác định lối','Chọn bình phù','Mở khóa'])await click(text);
     // An already-trained player may reuse the extinguisher, retaining training.
     check(await ev('return !!useStore.getState().player.inventory.hasFireExtinguisher'),'trained extinguisher equipped');
   }else{
     if(item.kind==='clock'){await click('Bắt đầu bấm giờ');await delay(1150);await click('Dừng và ghi thời gian');}
     else if(item.kind==='balance'){for(const text of ['Bật nguồn','Đặt cốc cân','Trừ bì'])await click(text);for(let n=0;n<5;n++)await click('Thêm 1 g');await click('Ghi khối lượng');}
     else if(item.kind==='volume'){await input('Thể tích nước',25);await click('Đặt mắt');await click('Đọc và ghi');}
     else if(item.kind==='titration'){await click('Kiểm tra khóa');for(let n=0;n<8;n++)await click('Nhỏ 1 giọt');await click('Dừng và đọc');}
     else if(item.kind==='heat'){await click('Kiểm tra bình');await click('Bật gia nhiệt');for(let n=0;n<4;n++)await click('Tăng 5');await click('Tắt gia nhiệt');}
     else if(item.kind==='ph'){await click('Nước trung tính');await click('Nhúng giấy');await click('Trung tính');}
     else if(item.kind==='hood'){await input('Độ mở cửa tủ hút',30);await click('Bật hút');await click('Đậy mẫu');}
     else if(item.kind==='storage'){for(const text of ['Tủ dung môi','Khu axit','Khu bazơ'])await click(text);}
     else if(item.kind==='wash'){for(const text of ['Làm ướt','Lấy xà phòng','Chà đủ','Rửa sạch','Lau khô','Tắt vòi'])await click(text);}
     else for(const text of workflows[item.kind]??workflows.glass)await click(text);
     check(await ev(`return !!useLabEquipment.getState().progress[${JSON.stringify(item.id)}]?.completed`),'use '+item.title);
     await click('Hoàn thành •');
   }
   used.push(item.id);
 }
 check(used.length===items.length,'all '+used.length+' equipment instances can be used');
 // Physical waste picking and correct disposal; no early task completion.
 await ev(`useStore.setState(s=>({currentPhase:3,isDialogActive:false,activeTool:'spillKit',tasks:s.tasks.map(t=>({...t,completed:t.id!=='task_trash_disposal'})),player:{...s.player,inventory:{...s.player.inventory,hasSweeper:true,isHoldingTrash:false,heldWasteId:null},flags:{...s.player.flags,wastePicked:[],wasteDisposed:['spill'],spillStage:'cleaned'}}}));return true`);
 for(const [id,bin] of [['paper','Rác sinh hoạt'],['glass','Vật sắc nhọn'],['absorbent','Chất thải hóa chất —']]){
   await ev(`const {WASTE_SAMPLES}=await import('/src/data/wasteSamples.ts');const item=WASTE_SAMPLES.find(s=>s.id==='${id}');playerCoords.position=[item.position[0]-.5,0,item.position[2]];return true`);await delay(250);
   // Real nearest-object E interaction opens pickup, not a state-only shortcut.
   await pressInteract(client);await waitFor(client,"document.querySelector('[aria-label=\"Thu gom mẫu rác\"]')",'loose sample '+id);
   for(let n=0;n<3;n++)await click('Quét mẫu');await click('Hốt vào');
   check(await ev(`return useStore.getState().player.inventory.heldWasteId==='${id}'&&useStore.getState().activeTool==='waste'`),'picked physical '+id);
   check(await ev(`return !useStore.getState().tasks.find(t=>t.id==='task_trash_disposal').completed`),'disposal task not prematurely complete');
   await ev('playerCoords.position=[7.4,0,5];return true');await delay(250);await evaluate(client,"window.dispatchEvent(new Event('lab-open-waste'));true");await waitFor(client,"document.querySelector('#practice-title')",'bin classification');await click(bin);await click('Bỏ mẫu');
 }
 check(await ev("return useStore.getState().tasks.find(t=>t.id==='task_trash_disposal').completed"),'all waste samples disposed completes task');
 await ev("playerCoords.position=[-8,0,2.2];useStore.getState().selectTool('spillKit');useLabEquipment.getState().navigate(useLabEquipment.getState().items.find(i=>i.kind==='volume'));return true");await delay(900);await shot('expansion-dustpan-route');
 check(await ev('return useStore.getState().sceneModalCount===0'),'input unlocked after every game');check(errors.length===0,'no browser runtime exceptions');
 await writeFile('docs/perf/LAB_EXPANSION_CHECK.json',JSON.stringify({passed:true,equipmentCount:items.length,kinds,usedCount:used.length,navigation:nav,waste:['paper','glass','absorbent'],errors},null,2));
}catch(error){console.log('BROWSER ERRORS',errors);console.log(await ev("const s=useStore.getState();return {modal:s.sceneModalCount,quiz:s.showFireExtinguisherQuiz,bandage:s.showBandageQuiz,chemical:s.showChemicalSymbolsQuiz,rule:s.activeRuleDialog,body:document.body.innerText.slice(-1800)}"));throw error;}finally{client.socket.close();await fetch(`${cdpOrigin}/json/close/${target.id}`,{method:'PUT'});}
