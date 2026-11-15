import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { transform } from 'esbuild';
import { transportWallBeads } from '../../src/engine/wallDropletTransport.ts';
import { AutoExperiment } from '../../src/vfx/autoplay/AutoExperiment.ts';
import { createStudioSample, planStudioProgram } from '../../src/engine/studioProgram.ts';
import { applyProgramToLedger } from '../../src/engine/ledger.ts';
const output = 'artifacts/auto-runtime-performance';
async function baselineModule(sourcePath, source, overrides = new Map()) {
  const {code} = await transform(source ?? readFileSync(sourcePath,'utf8'),{loader:'ts',format:'esm',target:'es2022'});
  const resolved = code.replace(/from "([^"]+)"/g,(_,specifier)=>{
    if (!specifier.startsWith('.')) return `from ${JSON.stringify(import.meta.resolve(specifier))}`;
    const stem=resolve(dirname(sourcePath),specifier),file=[stem,`${stem}.ts`,`${stem}.tsx`,join(stem,'index.ts'),join(stem,'index.tsx')].find(p=>existsSync(p)&&statSync(p).isFile());
    if(!file)throw Error('Missing '+specifier);
    return `from ${JSON.stringify(overrides.get(file)??pathToFileURL(file).href)}`;
  });
  const url=`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`;
  return {url,module:await import(url)};
}
const transport=await baselineModule('src/engine/wallDropletTransport.ts',readFileSync(output+'/wallDropletTransport.baseline.txt','utf8'));
const wall=await baselineModule('src/engine/wallCondensation.ts',null,new Map([[resolve('src/engine/wallDropletTransport.ts'),transport.url]]));
const route=await baselineModule('src/engine/waterVaporRouting.ts',null,new Map([[resolve('src/engine/wallCondensation.ts'),wall.url]]));
const auto=await baselineModule('src/vfx/autoplay/AutoExperiment.ts',null,new Map([[resolve('src/engine/waterVaporRouting.ts'),route.url]]));
const {fixtures}=JSON.parse(readFileSync('tests/fixtures/wall_empty_boundary.json'));
for(const fixture of fixtures){const before=transport.module.transportWallBeads(fixture.input),after=transportWallBeads(fixture.input);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Full transport mismatch '+fixture.name)}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const micro=[];
for(const kind of ['dry-room','dry-hot','wet-hot-drying','wet-cold-condensation']){
 const input=fixtures.find(f=>f.name===kind).input; const repeat=kind.startsWith('dry')?10000:1000;
 const runs={before:[],after:[]};
 for(const fn of[transport.module.transportWallBeads,transportWallBeads])for(let i=0;i<300;i++)fn(input);
 for(let round=0;round<8;round++)for(const [label,fn]of round%2?[['after',transportWallBeads],['before',transport.module.transportWallBeads]]:[['before',transport.module.transportWallBeads],['after',transportWallBeads]]){
  const start=performance.now();for(let i=0;i<repeat;i++)fn(input);runs[label].push((performance.now()-start)/repeat);
 }
 micro.push({kind,repeats:repeat,beforeMedian_ms:median(runs.before),afterMedian_ms:median(runs.after),speedup:median(runs.before)/median(runs.after),runs});
}
function specimen(Type,kind){const e=new Type(kind==='co2-reaction'?'caco3_hcl':'cuso4_naoh',false);if(kind==='hot-water'){e.sample={...e.sample,volume_ml:50,volume:.2,mass_g:50,temperature_c:95,contents:[{formula:'H2O',phase:'l',mass_g:50,moles:50/18.015}],substances:['H2O']};e.phase='complete'}else{const b=createStudioSample(e.program,e.sample);e.baseline=structuredClone(b);e.sample=structuredClone(b);e.kinetics=planStudioProgram(e.program,e.sample,'vi').kinetics;if(kind==='precipitate-tail'){e.sample={...b,...applyProgramToLedger(e.program,b,1)};e.progress=e.replayProgress=1;e.phase='complete'}else e.phase='react'}return e}
const integrated=[];
for(const kind of['hot-water','precipitate-tail','co2-reaction']){
 const runs={before:[],after:[]};let snapshot,parity=true;
 for(let round=0;round<8;round++)for(const [label,Type]of round%2?[['after',AutoExperiment],['before',auto.module.AutoExperiment]]:[['before',auto.module.AutoExperiment],['after',AutoExperiment]]){
  const e=specimen(Type,kind),start=performance.now();for(let i=0;i<600;i++)e.tick(1/60);runs[label].push((performance.now()-start)/600);
  const state=JSON.stringify({sample:e.sample,elapsed:e.elapsed,progress:e.progress,phase:e.phase,mass:e.accountedMass_g});
  if(!snapshot)snapshot=state;else if(snapshot!==state)parity=false;e.stocks.dispose();
 }
 integrated.push({kind,fullStateParity:parity,beforeMedian_ms:median(runs.before),afterMedian_ms:median(runs.after),speedup:median(runs.before)/median(runs.after),runs});
}
const result={generatedAt:new Date().toISOString(),method:'Alternating same-process baseline/current; only transport function differs. No WebGL, identical fixed ticks. Complete output state equality.',fixtures:fixtures.length,fixtureFullFieldParity:true,micro,integrated};
writeFileSync(output+'/empty-wall-ab.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,micro:micro.map(({runs,...r})=>r),integrated:integrated.map(({runs,...r})=>r)},null,2));
if(integrated.some(r=>!r.fullStateParity))process.exitCode=1;
