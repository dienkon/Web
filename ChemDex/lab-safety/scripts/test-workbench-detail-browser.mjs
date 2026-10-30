import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,perform,getWork,click,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const practice=code=>ev(`const {useAdvancedPractice}=await import('/src/store/useAdvancedPractice.ts');${code}`);
const capture=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/visual-gameplay/${name}.png`,Buffer.from(r.data,'base64'));};
const rects=()=>evaluate(`['.practical-dialog','.practical-scene','.practical-scene>svg'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];})`);
try{
 await mkdir('docs/visual-gameplay',{recursive:true});await send('Page.enable');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await practice(`useStore.setState({view:'certificate',cinematic:null});return true;`);await evaluate('document.fonts.ready.then(()=>true)');
 for(const id of ['centrifuge-balance','fume','alcohol-cap']){
  await practice(`useAdvancedPractice.getState().select(${JSON.stringify(id)},'guided',true);return true;`);await wait("document.querySelector('[data-practical-simulation]')",id);
  const work=await getWork(id),baseline=await rects();await capture(id);
  const afterStep=async index=>{
   const current=await rects();if(!current.every((r,i)=>r.every((n,j)=>Math.abs(n-baseline[i][j])<.6)))throw Error('Fixed frame moved: '+id+'/'+index);
   if(id==='fume'&&index===4){check(await evaluate("Boolean(document.querySelector('.fx-extraction'))"),'extraction starts only after fan is enabled');await capture('fume-active');}
   if(id==='centrifuge-balance'&&index===3){check(await evaluate("Boolean(document.querySelector('[data-work-object=cap] circle[r=\"108\"]'))&&!document.querySelector('[data-work-object=tube1]')&&!document.querySelector('[data-work-object=rotor]')"),'closed centrifuge lid covers the full rotor and hides loaded tubes');await capture('centrifuge-closed');}
   if(id==='alcohol-cap'&&index===5){check(await evaluate("!document.querySelector('.fx-alcohol-flame')"),'alcohol flame disappears only after cap covers wick');await capture('alcohol-extinguished');}
  };
  if(id==='fume')check(await evaluate("!document.querySelector('.fx-extraction')"),'no extraction arrows while fan is off');
  await perform(work,{afterStep});check(true,'all steps and fixed frame verified for detailed model: '+id);await click('Ghi nhận kết quả');
 }
 check(errors.length===0,'no runtime exceptions during model detail checks');await writeFile('docs/visual-gameplay/detail-browser-checks.json',JSON.stringify({passed:true,checks,errors},null,2));
}catch(error){await capture('detail-failure');await writeFile('docs/visual-gameplay/detail-browser-checks.json',JSON.stringify({passed:false,checks,errors,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
