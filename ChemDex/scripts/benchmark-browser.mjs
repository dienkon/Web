import fs from 'node:fs';
import os from 'node:os';
import {chromium} from '@playwright/test';
const origin=process.env.CHEMDEX_TEST_URL??'http://127.0.0.1:4173';
const launchArgs=process.env.CHEMDEX_SOFTWARE_GPU==='1'?['--enable-unsafe-swiftshader']
  :process.platform==='win32'?['--use-angle=d3d11','--enable-gpu']:['--enable-gpu'];
const browser=await chromium.launch({args:launchArgs});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const results=[];
try{
  for(const scenario of [
    {name:'caffeine molecule rotating',url:'/tien-ich/cau-truc-3d/?compound=cid-2519',molecule:true},
    {name:'lab-3d default interactive scene',url:'/lab-3d/',molecule:false},
  ]){
    await page.goto(origin+scenario.url);
    await page.waitForSelector('canvas');
    if(scenario.molecule)await page.waitForFunction(()=>document.querySelector('chem-structure-viewer')?.viewer?.getModel()?.selectedAtoms({}).length>0);
    // Let shader compilation and automatic quality adaptation settle before
    // measuring sustained interaction; startup remains covered by Lighthouse.
    await page.waitForTimeout(15000);
    const result=await page.evaluate(async({molecule})=>{
      const canvas=document.querySelector('canvas');
      const gl=molecule?document.querySelector('chem-structure-viewer').viewer.getRenderer().getContext():canvas.getContext('webgl2')??canvas.getContext('webgl');
      const extension=gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable';
      const samples=[];let previous;
      for(let index=0;index<150;index++){
        const time=await new Promise(requestAnimationFrame);
        if(previous!==undefined&&index>30)samples.push(time-previous);
        previous=time;
        if(molecule)document.querySelector('chem-structure-viewer').viewer.rotate(1,'y');
      }
      samples.sort((a,b)=>a-b);
      const average=samples.reduce((sum,value)=>sum+value,0)/samples.length;
      return{renderer,frames:samples.length,averageFrame_ms:average,averageFps:1000/average,p95Frame_ms:samples[Math.floor(samples.length*.95)]};
    },scenario);
    results.push({scenario:scenario.name,...result});
    console.log(JSON.stringify(results.at(-1)));
  }
}finally{await browser.close();}
const report={checkedAt:new Date().toISOString(),origin,platform:`${os.platform()} ${os.arch()}`,cpu:os.cpus()[0]?.model,launchArgs,viewport:{width:1440,height:900},method:'15 second shader/adaptation warmup plus 30 frames, then 119 RAF intervals; molecule rotates each frame; default lab scene renders normally',results};
fs.mkdirSync('artifacts/platform',{recursive:true});fs.writeFileSync('artifacts/platform/browser-performance.json',JSON.stringify(report,null,2)+'\n');
if(results.some(result=>result.averageFps<30))process.exitCode=1;
