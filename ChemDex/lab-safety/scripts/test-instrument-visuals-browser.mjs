import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {send,evaluate,ev,check,wait,perform,mouse,click,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const dir='docs/instrument-upgrade',snapshots=[];
const from=process.argv.find(arg=>arg.startsWith('--from='))?.slice(7);
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
const update=process.argv.includes('--update');
if(update&&!only)throw Error('Updating requires named fixtures');
const report=from||only&&!update?'browser-checks-partial.json':'browser-checks.json';
const baseline=update?JSON.parse(await readFile(`${dir}/browser-checks.json`,'utf8')):null;
if(update&&!baseline?.passed)throw Error('Updating requires a passing baseline');
const capture=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${name}.png`,Buffer.from(shot.data,'base64'));};
const rects=()=>evaluate(`['.practical-dialog','.practical-scene','.practical-scene svg'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];})`);
const present=selector=>evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
async function mount(kind,id=kind,title=kind){
 const work=await evaluate(`window.__INSTRUMENT_TEST__.mount(${JSON.stringify({kind,id,title})})`);
 await wait(`document.querySelector('[data-practical-simulation]')?.dataset.sceneId===${JSON.stringify(work.visualId)}`,'mount '+id);await delay(80);return work;
}
try{
 await mkdir(dir,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:app});await wait("document.querySelector('.start-shell')",'start');
 await ev(`useStore.setState(s=>({view:'certificate',cinematic:null,settings:{...s.settings,reduceMotion:false,graphicsQuality:'low'}}));return true;`);
 await evaluate(`(async()=>{
  const {default:R}=await import('/node_modules/.vite/deps/react.js'),{default:D}=await import('/node_modules/.vite/deps/react-dom_client.js');
  const {PracticalSimulation}=await import('/src/components/ui/PracticalSimulation.tsx'),{instrumentWork}=await import('/src/data/instrumentWork.ts');
  const {collectionWork,disposalWork}=await import('/src/data/practicalWork.ts'),{ACID_WORK}=await import('/src/data/acidWork.ts'),{HAZARD_LABEL_WORK}=await import('/src/data/hazardLabelWork.ts');
  const element=document.createElement('div');document.body.append(element);const root=D.createRoot(element);let key=0;
  window.__INSTRUMENT_TEST__={completed:0,root,element,mount(item,options={}){
   const work=item.id==='acid-dilution'?ACID_WORK:item.id==='hazard-labels'?HAZARD_LABEL_WORK:item.kind==='collection'?collectionWork(item.title,item.id==='sharps',item.id==='chemical'):item.kind==='disposal'?disposalWork(item.id):instrumentWork({...item,position:[0,0,0]});
   root.render(R.createElement(PracticalSimulation,{key:++key,work,onClose:()=>root.render(null),onComplete:()=>{window.__INSTRUMENT_TEST__.completed++;root.render(null);},...options}));return work;
  }};return true;
 })()`);
 const kinds=['balance','volume','titration','ph','heat','wash','washBottle','seat','drawer','locker','blanket','shower','spillKit','clock','ventilation','smokeAlarm'];
 const titles={balance:'Cân phân tích',volume:'Đong thể tích',titration:'Đọc và điều chỉnh buret',ph:'Điện cực pH',heat:'Bếp gia nhiệt',wash:'Vệ sinh tay',washBottle:'Bình tia',seat:'Ghế thực hành',drawer:'Ngăn dụng cụ',locker:'Tủ cá nhân',blanket:'Chăn chữa cháy',shower:'Vòi khẩn cấp',spillKit:'Bộ xử lý tràn',clock:'Đồng hồ',ventilation:'Lưới thông gió',smokeAlarm:'Đầu báo khói',chemical:'Mẫu nhiễm đã được cho phép xử lý',domestic:'Giấy sạch',sharps:'Mảnh thủy tinh'};
 const allCases=[...kinds.map(kind=>({kind,id:kind,title:titles[kind]})),{kind:'waste',id:'bin_liquid',title:'Can thải lỏng'},...['chemical','domestic','sharps'].map(id=>({kind:'disposal',id,title:titles[id]})),...['chemical','domestic','sharps'].map(id=>({kind:'collection',id,title:titles[id]})),...['Bảng ký hiệu GHS','Bảng tuần hoàn','Sơ đồ thoát nạn','Bảng hướng dẫn trên lớp'].map(title=>({kind:'board',id:title,title})),{kind:'extra',id:'acid-dilution',title:'Pha loãng'},{kind:'extra',id:'hazard-labels',title:'Nhận diện biểu tượng'}];
 if(from&&!allCases.some(item=>item.id===from))throw Error('Unknown fixture '+from);
 if(only?.some(id=>!allCases.some(item=>item.id===id)))throw Error('Unknown selected fixture');
 const cases=only?allCases.filter(item=>only.includes(item.id)):from?allCases.slice(allCases.findIndex(item=>item.id===from)):allCases;
 for(const item of cases){
  const work=await mount(item.kind,item.id,item.title),baseline=await rects();
  check(await present(`[data-instrument-backdrop="${work.visualId}"]`),'dedicated instrument backdrop: '+item.id);
  if(item.kind==='volume'||item.kind==='titration'){
   const ticks=await evaluate("[...document.querySelectorAll('[data-graduation]')].map(n=>[Number(n.dataset.graduation),Number(n.getAttribute('y'))])");
   check(ticks.length===11&&ticks[0][0]===(item.kind==='volume'?50:0)&&ticks.at(-1)[0]===(item.kind==='volume'?0:50),'correct numbered scale orientation: '+item.kind);
  }
  if(item.kind==='volume'){
   check(await evaluate("Number(document.querySelector('[data-liquid-level]').getAttribute('fill-opacity'))===0"),'empty cylinder does not show residual liquid');
   await mouse('mouseMoved',work.objects[0].at);await mouse('mousePressed',work.objects[0].at,true);await mouse('mouseMoved',[200,80],true);await mouse('mouseReleased',[200,80]);await delay(100);
   check(await evaluate("document.querySelector('.practical-feedback').textContent.includes('Chưa tới đích')"),'invalid placement is rejected before volume reading');
   const afterError=await rects();check(afterError.every((r,i)=>r.every((n,j)=>Math.abs(n-baseline[i][j])<.6)),'invalid placement leaves instrument frame fixed');
   await click('Xem gợi ý thao tác');const afterHint=await rects();check(afterHint.every((r,i)=>r.every((n,j)=>Math.abs(n-baseline[i][j])<.6)),'instrument hint leaves frame fixed');
  }
  for(const [kind,selector] of [['titration','[data-titration-flow]'],['shower','[data-emergency-flow]'],['wash','[data-handwash-flow]'],['washBottle','[data-wash-bottle-stream]']])if(item.kind===kind)check(!await present(selector),'flow is absent before activation: '+kind);
  if(item.kind==='board'&&item.title.includes('tuần hoàn'))check(await evaluate("document.querySelectorAll('[data-element]').length===118"),'periodic board uses all 118 shared elements');
  if(item.id==='acid-dilution')check(await present('[data-instrument-model="stirringRod"]'),'dilution uses solid stirring rod rather than graduated pipette');
  if(item.kind==='ventilation'||item.kind==='smokeAlarm')check(await present(`[data-instrument-model="${item.kind==='ventilation'?'ventGrille':'smokeDetector'}"]`),'correct device instead of fume hood: '+item.kind);
  await capture(item.kind+'-'+(item.kind==='board'?cases.indexOf(item):item.id)+'-initial');
  await perform(work,{afterStep:async index=>{
   const now=await rects();if(!now.every((r,i)=>r.every((n,j)=>Math.abs(n-baseline[i][j])<.6)))throw Error('Frame moved: '+item.id+'/'+index);
   if(item.kind==='volume'&&index===3)check(await evaluate("document.querySelector('[data-liquid-level]').dataset.liquidLevel==='50'&&document.querySelector('[data-instrument-effect]').textContent.includes('25.0 mL')"),'volume surface and 25 mL reading match slider');
   if(item.kind==='volume'&&index===3)check(await evaluate("(()=>{const p=document.querySelector('[data-meniscus]');return Math.abs(p.getPointAtLength(p.getTotalLength()/2).y+7)<.01;})()"),'actual meniscus bottom aligns exactly with 25 mL graduation');
   if(item.kind==='titration'&&index===3)check(await evaluate("(()=>{const p=document.querySelector('[data-meniscus]');return Math.abs(p.getPointAtLength(p.getTotalLength()/2).y+23)<.01;})()"),'actual buret meniscus bottom aligns exactly with 20 mL reading');
   if(item.kind==='titration'&&index===2)check(await present('[data-titration-flow]'),'opening stopcock enables drops');
   if(item.kind==='titration'&&index===5)check(!await present('[data-titration-flow]'),'closing stopcock stops drops');
   if(item.kind==='titration'&&index===4)check(await evaluate("document.querySelector('.practical-adjust input').value==='20'"),'closing begins at previous stopcock position without jumping');
   if(['drawer','locker'].includes(item.kind)&&index===3)check(await evaluate("document.querySelector('.practical-adjust input').value==='85'"),'closing begins at previous opening: '+item.kind);
   if(item.kind==='heat'&&index===5)check(await present('[data-heat-state="residual"]'),'power off preserves residual heat indication');
   if(item.kind==='wash'&&index===1)check(await present('[data-handwash-flow]'),'wetting starts sink flow');
   if(item.kind==='wash'&&index===4)check(!await present('[data-handwash-flow]')&&!await present('[data-soap-foam]'),'rinsed hands have no foam and stream stops before drying');
   if(item.kind==='blanket'&&index===3)check(await present('[data-blanket-released]'),'two independent straps release folded blanket');
   if(item.kind==='shower'&&index===3)check(await present('[data-emergency-flow]'),'pulling handle activates shower');
   if(item.kind==='clock'&&index===1)check(await evaluate("Number(document.querySelector('[data-clock-elapsed]').dataset.clockElapsed)===3"),'clock keeps first three seconds at next step');
   if(item.kind==='clock'&&index===2)check(await evaluate("Number(document.querySelector('[data-clock-elapsed]').dataset.clockElapsed)===5"),'clock accumulates 3 + 2 actual simulated seconds');
   if(item.kind==='clock'&&index===2)check(await evaluate("Math.abs(parseFloat(document.querySelector('[data-work-object=clock] path[stroke=\"#df7865\"]').getAttribute('transform').replace('rotate(',''))-30)<.00001"),'clock hand advances by 6 degrees per simulated second');
   if(item.id==='acid-dilution'&&[3,8].includes(index))check(!await present('[data-acid-pour]'),'portion stream stops after pouring confirmation '+index);
   if(item.id==='acid-dilution'&&[4,9].includes(index))check(await present('[data-stir-surface]'),'each dilution cycle has real circular stirring '+index);
   if(item.id==='acid-dilution'&&index===1)check(await evaluate("document.querySelector('[data-work-object=tray]').getAttribute('transform')==='translate(600 340)'&&!document.querySelector('[data-work-object=tray] text')"),'water vessel sits on receiving tray without overlapping tray label');
   if(item.id==='hazard-labels'&&index===work.steps.length)check(await present('[data-affixed-hazard]'),'last warning label remains affixed at completion');
   if(['ventilation','smokeAlarm','blanket','board'].includes(item.kind)){
    const id=item.kind==='board'?'board':item.kind==='blanket'?'blanket':'hood',object=work.objects.find(o=>o.id===id);
    const transform=await evaluate(`document.querySelector('[data-work-object="${id}"]')?.getAttribute('transform')`);
    if(transform!==`translate(${object.at[0]} ${object.at[1]})`)throw Error('Inspection moved fixed device '+item.id);
   }
  }});
  check(true,'all gestures complete with fixed frame: '+item.id);await capture(item.kind+'-'+(item.kind==='board'?cases.indexOf(item):item.id)+'-complete');await click('Ghi nhận kết quả');await wait("!document.querySelector('[data-practical-simulation]')",'closed '+item.id);snapshots.push({item,visualId:work.visualId,steps:work.steps.length});
 }
 // Capture a real held jet, not a fabricated end state.
 const jet=await mount('washBottle');await perform(jet,{to:3});await mouse('mouseMoved',[600,230]);await mouse('mousePressed',[600,230],true);await delay(450);check(await present('[data-wash-bottle-stream]'),'bottle jet appears only during held squeeze');await capture('wash-bottle-active');await mouse('mouseReleased',[600,230]);await delay(100);check(!await present('[data-wash-bottle-stream]'),'releasing squeeze removes water jet');
 // Verify visible motion and both reduction controls at the active stopcock.
 const titration=await mount('titration');await perform(titration,{to:2});
 const beforeReset=await rects();
 const slider=await evaluate("(()=>{const r=document.querySelector('.practical-adjust input').getBoundingClientRect();return {x:r.x+r.width*.7,y:r.y+r.height/2};})()");
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...slider,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...slider,button:'left',buttons:0,clickCount:1});
 check(await evaluate("Number(document.querySelector('.practical-adjust input').value)>0"),'actual range interaction changes instrument control');await click('Làm lại bước này');
 check(await evaluate("document.querySelector('.practical-adjust input').value==='0'&&[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Xác nhận vị trí')).disabled"),'reset restores starting control and confirmation guard');
 const resetFrame=await rects();check(resetFrame.every((r,i)=>r.every((n,j)=>Math.abs(n-beforeReset[i][j])<.6)),'reset leaves instrument frame fixed');
 await perform(titration,{from:2,to:3});await click('Phóng vùng chơi');const zoom=await rects();await perform(titration,{from:3,to:4});
 check(await evaluate("document.querySelector('.practical-expand').getAttribute('aria-pressed')==='true'"),'instrument zoom survives step advance');const afterZoom=await rects();check(afterZoom.every((r,i)=>r.every((n,j)=>Math.abs(n-zoom[i][j])<.6)),'expanded instrument viewport stays fixed');await click('Hiện hướng dẫn');
 check(await evaluate("getComputedStyle(document.querySelector('.fx-titration-drop')).animationName==='titration-drop'"),'local titration drop uses its own animation');
 await ev('useStore.setState(s=>({settings:{...s.settings,reduceMotion:true}}));return true;');await wait("document.querySelector('[data-practical-simulation]').dataset.reducedMotion==='true'",'reduced motion setting reaches instrument');
 check(await evaluate("getComputedStyle(document.querySelector('.fx-titration-drop')).animationName==='none'"),'game reduced motion stops instrument animation');
 await ev('useStore.setState(s=>({settings:{...s.settings,reduceMotion:false}}));return true;');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});check(await evaluate("getComputedStyle(document.querySelector('.fx-titration-drop')).animationName==='none'"),'OS reduced motion stops instrument animation');await send('Emulation.setEmulatedMedia',{features:[]});
 for(const viewport of [{width:844,height:390},{width:390,height:844}]){
  await send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:true});const work=await mount('volume'),baseline=await rects();await perform(work,{touch:true});
  const after=await rects();check(after.every((r,i)=>r.every((n,j)=>Math.abs(n-baseline[i][j])<.6)),'touch preserves frame '+viewport.width+'x'+viewport.height);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'no mobile horizontal overflow '+viewport.width+'x'+viewport.height);await capture('mobile-volume-'+viewport.width);await click('Ghi nhận kết quả');
 }
 check(await evaluate(`window.__INSTRUMENT_TEST__.completed===${cases.length+2}`),'every full fixture records exactly one completion');
 check(errors.length===0,'no runtime exceptions across instrument visuals');
 const result=baseline?{...baseline,passed:true,checks:[...new Set([...baseline.checks,...checks])],errors,snapshots:baseline.snapshots.map(old=>snapshots.find(s=>s.item.id===old.item.id&&s.item.kind===old.item.kind)??old),refreshedFixtures:[...new Set([...(baseline.refreshedFixtures??[]),...only])]}:{passed:true,fixtureCount:cases.length,checks,errors,snapshots};
 await writeFile(`${dir}/${report}`,JSON.stringify(result,null,2));
}catch(error){await capture('failure');await writeFile(`${dir}/${report}`,JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{await evaluate("window.__INSTRUMENT_TEST__?.root.unmount();window.__INSTRUMENT_TEST__?.element.remove();true;").catch(()=>{});socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
