import { Session } from 'node:inspector';
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { AutoExperiment } from '../../src/vfx/autoplay/AutoExperiment.ts';
import { createStudioSample, planStudioProgram } from '../../src/engine/studioProgram.ts';
import { applyProgramToLedger } from '../../src/engine/ledger.ts';
const output = 'artifacts/auto-runtime-performance';
const session = new Session(); session.connect();
const post = (method, params = {}) => new Promise((resolve, reject) => session.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
function specimen(kind, effects) {
  const id = kind === 'co2-reaction' ? 'caco3_hcl' : 'cuso4_naoh';
  const e = new AutoExperiment(id, effects);
  if (kind === 'hot-water') {
    e.sample = { ...e.sample, volume_ml: 50, volume: 0.2, mass_g: 50, temperature_c: 95,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }], substances: ['H2O'] };
    e.phase = 'complete';
  } else {
    const baseline = createStudioSample(e.program, e.sample);
    e.baseline = structuredClone(baseline); e.sample = structuredClone(baseline);
    e.kinetics = planStudioProgram(e.program, e.sample, 'vi').kinetics;
    if (kind === 'precipitate-tail') {
      e.sample = { ...baseline, ...applyProgramToLedger(e.program, baseline, 1) };
      e.progress = e.replayProgress = 1; e.phase = 'complete';
    } else e.phase = 'react';
  }
  return e;
}
function profileSummary(profile) {
  const nodes = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parent.set(child, node.id);
  const self = new Map(), inclusive = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    let id = profile.samples[i]; const dt = profile.timeDeltas[i] / 1000;
    self.set(id, (self.get(id) ?? 0) + dt);
    while (id !== undefined) { inclusive.set(id, (inclusive.get(id) ?? 0) + dt); id = parent.get(id); }
  }
  const totals = new Map();
  for (const [id, node] of nodes) {
    const f = node.callFrame;
    if (!f.url.includes('/src/')) continue;
    const key = `${f.functionName || '(anonymous)'} ${f.url.slice(f.url.indexOf('/src/'))}:${f.lineNumber + 1}`;
    const row = totals.get(key) ?? { fn: key, self_ms: 0, inclusive_ms: 0 };
    row.self_ms += self.get(id) ?? 0; row.inclusive_ms += inclusive.get(id) ?? 0; totals.set(key, row);
  }
  return { hotSelf: [...totals.values()].sort((a,b) => b.self_ms-a.self_ms).slice(0,18),
    hotInclusive: [...totals.values()].sort((a,b) => b.inclusive_ms-a.inclusive_ms).slice(0,24) };
}
await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 100 });
const results = [];
for (const kind of ['hot-water','precipitate-tail','co2-reaction']) {
  const warm = specimen(kind, false); for (let i=0;i<120;i++) warm.tick(1/60);
  for (const effects of [false,true]) {
    const repetitions = effects ? 2 : 4, frames = 600, timings = [], checks = [];
    await post('Profiler.start');
    const start = performance.now(), cpuStart = process.cpuUsage();
    for (let rep=0;rep<repetitions;rep++) {
      const e = specimen(kind,effects); if (effects) await e.stocks.initialize();
      const initialMass = e.accountedMass_g; let maxMassError=0;
      for (let i=0;i<frames;i++) {
        const t = performance.now(); e.tick(1/60); timings.push(performance.now()-t);
        if (i%60===0) maxMassError=Math.max(maxMassError,Math.abs(e.accountedMass_g-initialMass));
      }
      checks.push({ phase:e.phase,error:e.error,temperature_c:e.sample.temperature_c,progress:e.progress,
        maxMassError_g:maxMassError,elapsed_s:e.elapsed,wallWater_g:e.sample.wallCondensation?.inner_g??0,
        finalContents:e.sample.contents.map(c=>({formula:c.formula,phase:c.phase,mass_g:c.mass_g})) });
      e.stocks.dispose();
    }
    const cpu=process.cpuUsage(cpuStart), wall=performance.now()-start;
    const {profile}=await post('Profiler.stop');
    timings.sort((a,b)=>a-b);
    const result={kind,effects,repetitions,frames,totalSteps:timings.length,wall_ms:wall,cpu_ms:(cpu.user+cpu.system)/1000,
      mean_ms:timings.reduce((s,t)=>s+t,0)/timings.length,p50_ms:timings[Math.floor(timings.length*.5)],p95_ms:timings[Math.floor(timings.length*.95)],max_ms:timings.at(-1),checks,
      profile:profileSummary(profile)};
    results.push(result);writeFileSync(`${output}/${kind}-${effects?'physical':'logic'}.cpuprofile`,JSON.stringify(profile));
    writeFileSync(`${output}/baseline.json`,JSON.stringify({generatedAt:new Date().toISOString(),commit:'1d2d935a',method:'Existing exact AutoExperiment fixed steps; CPU sampled100us; source unchanged. Render/WebGL excluded.',results},null,2));
    console.log(JSON.stringify({kind,effects,mean_ms:result.mean_ms,p95_ms:result.p95_ms,cpu_ms:result.cpu_ms,wall_ms:wall,checks:checks.map(c=>({phase:c.phase,error:c.error,maxMassError_g:c.maxMassError_g})),top:result.profile.hotInclusive.slice(0,8)}));
  }
}
session.disconnect();
