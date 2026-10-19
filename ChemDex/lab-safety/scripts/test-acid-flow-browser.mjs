import {writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,click,shot,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
async function pourUntil(amount){
 const p=await evaluate("(()=>{const b=document.querySelector('[data-pour-control]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
 await wait(`parseFloat(document.querySelector('.academy-flow-readout strong').textContent)>=${amount}`,'pour target',30000);
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});await delay(100);
}
async function stir(from,to){
 await evaluate("document.querySelector('[data-stir-surface]').scrollIntoView({block:'center'});true;");
 const points=[];for(let n=from;n<=to;n++){const a=n/40*Math.PI*2;points.push(await evaluate(`(()=>{const p=new DOMPoint(${180+76*Math.cos(a)},${140+76*Math.sin(a)}).matrixTransform(document.querySelector('[data-stir-surface]').getScreenCTM());return {x:p.x,y:p.y};})()`));}
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...points[0],button:'left',buttons:1,clickCount:1});for(const q of points.slice(1))await send('Input.dispatchMouseEvent',{type:'mouseMoved',...q,buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...points.at(-1),button:'left',buttons:0,clickCount:1});
}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 const games=await ev("const {ACADEMY_GAMES}=await import('/src/academy/data/games.ts');return ACADEMY_GAMES.filter(g=>g.kind==='flow');");
 for(const game of games){
  await ev(`const {useAcademy}=await import('/src/academy/core/store.ts');useAcademy.getState().openHub(${JSON.stringify(game.id)});return true;`);await wait("document.querySelector('[data-academy-briefing]')",'briefing');await evaluate("document.querySelector('[data-start-challenge]').click();true;");await wait("document.querySelector('[data-pour-control]')",'flow');
  await pourUntil(game.flow.target/2-.5);
  await stir(0,20);check(await evaluate("document.querySelector('[data-stir-progress]').value>.45&&document.querySelector('[data-stir-progress]').value<.55"),game.id+': rod follows real half circle');
  if(game.id===games[0].id){await click('Tạm dừng');await click('Tiếp tục thực hành');check(await evaluate("document.querySelector('[data-stir-progress]').value>.45"),'pause retains partial circular motion');}
  await stir(20,40);await wait("document.querySelector('[data-stir-progress]').value>=1",'stir completed');
  await wait("parseFloat(document.querySelectorAll('.academy-flow-readout strong')[1].textContent)<=28",'cool first addition',30000);
  await pourUntil(game.flow.target-1);
  check(await evaluate("!document.querySelector('.academy-feedback.is-mistake')"),game.id+': two additions stay within model limits');
  await wait("parseFloat(document.querySelectorAll('.academy-flow-readout strong')[1].textContent)<=28",'cool second addition',30000);await shot('acid-'+game.id);await click('Kiểm tra mẻ');await wait("document.querySelector('[data-academy-result]')",'result');
  check(await ev(`const {useAcademy}=await import('/src/academy/core/store.ts');const r=useAcademy.getState().profile.history.at(-1);return r.gameId===${JSON.stringify(game.id)}&&r.completed&&r.mistakes===0;`),game.id+': completed with two pours and direct stirring');await click('Về học viện');
 }
 check(errors.length===0,'no acid flow runtime exceptions');await writeFile('docs/practical-review/acid-flow-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await shot('acid-flow-failure');await writeFile('docs/practical-review/acid-flow-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
