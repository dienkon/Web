import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {send,evaluate,check,wait,delay,errors,checks,socket,target,cdp,app} from './practical-browser-driver.mjs';
const snapshots=[];
const args=process.argv.slice(2),reportArg=args.find(a=>a.startsWith('--report='))?.slice(9),requested=args.filter(a=>!a.startsWith('--')),update=args.includes('--update');
if(reportArg&&!/^[a-z0-9-]+\.json$/.test(reportArg))throw Error('Report must be a JSON filename');
const reportFile=reportArg??(requested.length?'ppe-browser-checks.json':'browser-checks.json');
try{
 const baseline=update?JSON.parse(await readFile('docs/asset-studies/'+reportFile,'utf8')):null;
 if(update&&(!requested.length||!baseline?.passed))throw Error('Updating requires named assets and a passing baseline report');
 await mkdir('docs/asset-studies',{recursive:true});await send('Page.enable');await send('Page.bringToFront');await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 const origin=new URL(app).origin;
 await send('Page.navigate',{url:origin+'/?asset-review=beaker'});await wait('window.__ASSET_REVIEW__','asset viewer');
 const allIds=await evaluate("import('/src/components/3d/assets/assetCatalog.tsx').then(m=>m.ASSET_CATALOG.map(a=>a.id))"),ids=requested.length?allIds.filter(id=>requested.includes(id)):allIds;
 if(requested.some(id=>!allIds.includes(id)))throw Error('Unknown requested asset');
 for(const id of ids)for(const angle of ['front','three-quarter','back','top']){
  await send('Page.navigate',{url:`${origin}/?asset-review=${id}&angle=${angle}`});await wait(`window.__ASSET_REVIEW__?.id===${JSON.stringify(id)}`,'render '+id+'/'+angle);
  const s=await evaluate('window.__ASSET_REVIEW__');
  check(s.invalidVertices===0&&s.triangles>0&&s.size.every(n=>Number.isFinite(n)&&n>0),'finite solid geometry: '+id+'/'+angle);
  if(angle==='three-quarter'){
   check(s.min[1]>=-.004&&s.min[1]<=.006,'bottom rests on support plane: '+id);
   check(s.calls<170,'bounded asset draw calls: '+id+' / '+s.calls);
   snapshots.push(s);
  }
  const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/asset-studies/${id}-${angle}.png`,Buffer.from(r.data,'base64'));
 }
 check(errors.length===0,'no runtime exceptions while rendering all asset studies');
 const refreshed=new Set(snapshots.map(s=>s.id));
 const keepCheck=label=>!label.startsWith('no runtime exceptions')&&!snapshots.some(s=>label.endsWith(': '+s.id)||label.includes(': '+s.id+'/')||label.startsWith('bounded asset draw calls: '+s.id+' / '));
 const result=baseline?{passed:true,checks:[...baseline.checks.filter(keepCheck),...checks],errors,snapshots:[...baseline.snapshots.map(s=>refreshed.has(s.id)?snapshots.find(n=>n.id===s.id):s),...snapshots.filter(s=>!baseline.snapshots.some(old=>old.id===s.id))],refreshedAssets:[...new Set([...(baseline.refreshedAssets??[]),...requested])]}:{passed:true,checks,errors,snapshots};
 await writeFile('docs/asset-studies/'+reportFile,JSON.stringify(result,null,2));
}catch(error){await writeFile('docs/asset-studies/'+reportFile,JSON.stringify({passed:false,checks,errors,snapshots,error:String(error)},null,2));throw error;}
finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
