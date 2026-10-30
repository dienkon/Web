import {mkdir,writeFile} from 'node:fs/promises';
import {send,evaluate,wait,errors,socket,target,cdp,app} from './practical-browser-driver.mjs';
export const PLAYER_PHOTOS=[
 ['full-front','student-character','full','front','full'],['full-back','student-character','full','back','full'],['full-quarter','student-character','full','three-quarter','full'],
 ['plain-front','student-character','none','front','full'],['plain-back','student-character','none','back','full'],
 ['coat-front','student-character','coat','front','torso'],['coat-back','student-character','coat','back','torso'],['coat-side','student-character','coat','right','torso'],
 ['goggles-front','student-character','goggles','front','head'],['goggles-side','student-character','goggles','right','head'],['goggles-back','student-character','goggles','back','head'],
 ['mask-front','student-character','mask','front','head'],['mask-side','student-character','mask','right','head'],
 ['all-head-front','student-character','full','front','head'],['all-head-side','student-character','full','right','head'],['all-head-back','student-character','full','back','head'],
 ['glove-hands','student-character','gloves','front','hands'],['bare-hands','student-character','none','front','hands'],['shoe-feet','student-character','shoes','three-quarter','feet'],['open-feet','student-character','none','three-quarter','feet'],
 ['bun-head','bun-character','full','back','head'],['braid-head','braided-character','full','back','head'],['long-head','long-hair-character','none','back','head'],
];
const stage=process.argv[2]??'before';if(!['before','after'].includes(stage))throw Error('Use before or after');
const only=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7);
const dir='docs/player-mobile',snapshots=[];
try{
 await mkdir(dir,{recursive:true});await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 for(const [id,asset,wear,angle,detail] of PLAYER_PHOTOS.filter(row=>!only||row[0]===only)){
  await send('Page.navigate',{url:new URL(`/?asset-review=${asset}&wear=${wear}&angle=${angle}&detail=${detail}`,app).href});await wait(`window.__ASSET_REVIEW__?.id==='${asset}'`,'player photo '+id);
  const model=await evaluate('window.__ASSET_REVIEW__');if(model.invalidVertices)throw Error('Invalid character geometry '+id);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${stage}-${id}.png`,Buffer.from(shot.data,'base64'));snapshots.push({id,asset,wear,angle,detail,file:`${stage}-${id}.png`,model});console.log(stage+' '+id+' / '+model.calls+' calls');
 }
 if(errors.length)throw Error(errors.join('\n'));await writeFile(`${dir}/${stage}-character${only?'-partial':''}.json`,JSON.stringify({passed:true,stage,errors,snapshots},null,2));
}catch(error){const body=await evaluate('document.body.textContent.slice(-2500)');await writeFile(`${dir}/capture-failure.json`,JSON.stringify({error:String(error),errors,body},null,2));console.error(JSON.stringify({error:String(error),errors,body}));throw error;
}finally{socket.close();await fetch(`${cdp}/json/close/${target.id}`);}
