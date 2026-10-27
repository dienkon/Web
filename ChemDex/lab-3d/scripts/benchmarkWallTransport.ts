/** Deterministic wall-transport benchmark, no renderer/store or timing gates.
 * node --import tsx scripts/benchmarkWallTransport.ts
 * Optional CPU profile: node --cpu-prof --import tsx scripts/benchmarkWallTransport.ts
 * Simulates the same ten-minute wet-wall scenario as basic_vessel_effects. */
import { performance } from 'node:perf_hooks';
import { stepWallCondensation } from '../src/engine/wallCondensation';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import type { VesselState } from '../src/types/chemistry';

let vessel: VesselState = { id: 'wall-transport-benchmark', name: 'Wall transport benchmark',
  type: 'beaker', capacity_ml: 100, position: [0,0,0], rotationY: 0, isLocked: false,
  volume_ml: 50, volume: 0.5, mass_g: 50,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50/18.015 }],
  substances: ['H2O'], temperature_c: 5, ph: 7, hasGas: false, hasPrecipitate: false,
  isBoiling: false, environment: DEFAULT_LAB_ENVIRONMENT };
vessel.wallCondensation = { ...stepWallCondensation(vessel,0,0).wall, outer_g: 0.5, ambientCollected_g: 0.5 };
const checkpoints: unknown[] = [], start = performance.now();
for (let i=0;i<1200;i++) {
  vessel = { ...vessel, wallCondensation: stepWallCondensation(vessel,0.5,0).wall };
  if ((i+1)%300===0) checkpoints.push({ seconds: (i+1)*0.5, ...vessel.wallCondensation });
}
const wall = vessel.wallCondensation!;
process.stdout.write(JSON.stringify({ elapsed_ms: performance.now()-start, simulatedSeconds:600,
  massBalanceResidual_g: wall.outer_g+wall.drainedOutside_g+wall.ambientReleased_g-wall.ambientCollected_g,
  checkpoints })+'\n');
