import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { World as RapierWorld } from '@dimforge/rapier3d-compat';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer } from '../src/physical/stockAdapter';
import { stockGrainContacts } from '../src/physical/stockLiquidContact';
import { attachedMetalForCarrier } from '../src/science/metalSurfaceAppearance';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import type { VesselState } from '../src/types/chemistry';

const clock = () => ({ wall: performance.now(), cpu: process.cpuUsage() });
const elapsed = (start: ReturnType<typeof clock>) => {
  const cpu = process.cpuUsage(start.cpu);
  return { wall_ms: performance.now() - start.wall, cpu_ms: (cpu.user + cpu.system) / 1000 };
};

const sample = { id: 'wire-timing', type: 'beaker', capacity_ml: 100, position: [0, 1.04, 0],
  volume_ml: 0, mass_g: 0.1, contents: [{ formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546 }] } as VesselState;
const world = await StockWorld.create();
const dry: object[] = [];
let settings: object;
try {
  world.sync({ containers: [stockContainer(sample, false)!], contacts: [], spills: [] });
  const engine = (world as unknown as { world: RapierWorld }).world;
  const segmentsPerBody: number[] = [];
  engine.bodies.forEach(body => { if (body.isDynamic()) segmentsPerBody.push(body.numColliders()); });
  settings = { lengthUnit: engine.integrationParameters.lengthUnit,
    allowedPenetration_m: engine.integrationParameters.normalizedAllowedLinearError * engine.integrationParameters.lengthUnit / 100,
    predictionDistance_m: engine.integrationParameters.normalizedPredictionDistance * engine.integrationParameters.lengthUnit / 100,
    segmentsPerBody };
  for (let block = 0; block < 5; block++) {
    const start = clock();
    for (let step = 0; step < 24; step++) world.advance(1 / 120, false);
    const snapshot = world.snapshot();
    let candidatePairs = 0;
    engine.colliders.forEach(collider => engine.contactPairsWith(collider, () => candidatePairs++));
    dry.push({ simulated_s: (block + 1) * 0.2, ...elapsed(start), candidatePairs,
      sleeping: snapshot.grains.filter(grain => grain.pose.sleeping).length,
      contacting: snapshot.grains.filter(grain => grain.pose.contacting).length });
  }
} finally { world.free(); }

const experiment = new AutoExperiment('cu_agno3', true);
await experiment.stocks.initialize();
const history: object[] = [];
const start = clock();
let frames = 0;
let natural: object;
try {
  for (; frames < 3600 && experiment.progress < 0.15 && !experiment.error; frames++) {
    experiment.tick(1 / 60);
    if ((frames + 1) % 300 === 0) {
      const contacts = stockGrainContacts(experiment.sample, 'Cu');
      history.push({ frames: frames + 1, simulated_s: experiment.elapsed, progress: experiment.progress,
        wetCarriers: contacts.filter(contact => contact.wetFraction > 0).length, ...elapsed(start) });
    }
  }
  const contacts = stockGrainContacts(experiment.sample, 'Cu');
  natural = { frames, simulated_s: experiment.elapsed, progress: experiment.progress, error: experiment.error,
    wetCarriers: contacts.filter(contact => contact.wetFraction > 0).length, carriers: contacts.length,
    attachedSilver_g: (experiment.sample.stockMotion?.grains ?? []).reduce((sum, pose) =>
      sum + attachedMetalForCarrier(experiment.sample, pose.id).mass_g, 0), ...elapsed(start), history };
} finally { experiment.stocks.dispose(); }

const report = { generatedAt: new Date().toISOString(), settings, dry, natural };
const directory = resolve('artifacts/copper-wire-contact');
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, 'timing.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (experiment.error || experiment.progress < 0.15) process.exitCode = 1;
