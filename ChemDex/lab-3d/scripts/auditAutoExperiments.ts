import { mkdirSync, writeFileSync } from 'node:fs';
import { AUTO_EXPERIMENTS, AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';

// Let the existing 100 ms startup/history publication settle before checking
// strict store identity across awaited physics initialization.
await new Promise(resolve => setTimeout(resolve, 200));
const before = useAppStore.getState(), results = [];
for (const entry of AUTO_EXPERIMENTS) {
  const e = new AutoExperiment(entry.id);
  await e.stocks.initialize();
  const initialMass_g = e.sample.mass_g + e.donors.reduce((sum, d) => sum + d.remaining, 0);
  let peakParticles = 0, peakCloudParticles = 0;
  for (let frame = 0; frame < 2600 && !['complete', 'error'].includes(e.phase); frame++) {
    e.tick(0.1);
    peakParticles = Math.max(peakParticles, [...e.physics.precipitationSystems.values()].reduce((sum, s) => sum + s.particles.length, 0));
    peakCloudParticles = Math.max(peakCloudParticles, [...e.clouds.clouds.values()].reduce((sum, c) => sum + c.system.particles.length, 0));
  }
  const finalMass_g = e.sample.mass_g + Object.values(e.sample.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0) + (e.sample.evaporated_ml ?? 0);
  const ok = e.phase === 'complete' && !e.error && Math.abs(finalMass_g - initialMass_g) < 1e-5
    && peakParticles <= e.physics.maxPrecipitateParticles && useAppStore.getState() === before;
  results.push({ id: entry.id, ok, phase: e.phase, error: e.error, seconds: e.elapsed,
    initialMass_g, finalMass_g, peakParticles, peakCloudParticles,
    particleBudget: e.physics.maxPrecipitateParticles, workbenchUnchanged: useAppStore.getState() === before });
  e.stocks.dispose();
  if (results.length % 10 === 0) console.log(`Checked ${results.length}/${AUTO_EXPERIMENTS.length} native chemistry + physical effects pipelines`);
}
mkdirSync('artifacts/automatic-experiments', { recursive: true });
const failed = results.filter(r => !r.ok);
writeFileSync('artifacts/automatic-experiments/catalog-audit.json', JSON.stringify({
  total: results.length, passed: results.length - failed.length, failed, results,
  workbenchUnchanged: useAppStore.getState() === before, measuredRealWorldKinetics: false,
}, null, 2) + '\n');
console.log(JSON.stringify({ total: results.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
