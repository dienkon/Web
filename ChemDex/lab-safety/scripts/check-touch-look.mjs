import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const stage=process.argv[2]??'after';
await mkdir('.browser-review/touch-tests',{recursive:true});await mkdir('docs/player-mobile',{recursive:true});
const outfile=path.resolve('.browser-review/touch-tests/input.mjs');
await build({entryPoints:['src/systems/input/InputManager.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'warning'});
const {InputManager}=await import(pathToFileURL(outfile).href);
const samples=[];
for(const events of [1,4,12,30,60,120]){
 const input=new InputManager();input.beginLook(9,0,0);for(let i=1;i<=events;i++)input.updateLook(9,120*i/events,60*i/events);
 const look={...input.consumeLookDelta()};samples.push({events,...look});
}
const spread={x:Math.max(...samples.map(s=>s.x))-Math.min(...samples.map(s=>s.x)),y:Math.max(...samples.map(s=>s.y))-Math.min(...samples.map(s=>s.y))};
if(stage!=='before'){
 assert(spread.x<1e-10&&spread.y<1e-10,'swipe angle changes with event frequency');
 assert(Math.abs(samples[0].x-120*.0035)<1e-10&&Math.abs(samples[0].y-60*.0035)<1e-10,'swipe distance must map directly to angle');
 const input=new InputManager();assert(input.beginJoystick(1,40,150));assert(input.beginLook(2,400,200));assert(!input.beginLook(1,40,150));
 input.updateLook(2,450,200);assert(input.lookDelta.x>0);assert(!input.endLook(1));assert.equal(input.lookPointerId,2);input.resetAll();assert.equal(input.lookPointerId,null);assert.equal(input.move.x,0);assert.equal(input.lookDelta.x,0);
 input.setLookConfig(2,true);input.beginLook(3,0,0);input.updateLook(3,20,10);const delta=input.consumeLookDelta();assert(Math.abs(delta.x-.14)<1e-10&&Math.abs(delta.y+.07)<1e-10);assert.equal(input.consumeLookDelta().x,0);
}
const result={stage,passed:stage==='before'?undefined:true,samples,spread};await writeFile(`docs/player-mobile/${stage}-touch.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
