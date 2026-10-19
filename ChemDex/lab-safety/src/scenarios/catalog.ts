import { scenario as s0 } from './data/unknown-bottle';
import { scenario as s1 } from './data/cracked-glass';
import { scenario as s2 } from './data/gas-hose';
import { scenario as s3 } from './data/hot-glass';
import { scenario as s4 } from './data/incompatible-storage';
import { scenario as s5 } from './data/pipette-bulb';
import { scenario as s6 } from './data/centrifuge-balance';
import { scenario as s7 } from './data/blocked-exit';
import { scenario as s8 } from './data/eye-protection';
import { scenario as s9 } from './data/dirty-gloves';
import { scenario as s10 } from './data/waste-mixing';
import { scenario as s11 } from './data/vacuum-check';
import { scenario as s12 } from './data/reagent-return';
import { scenario as s13 } from './data/crowded-bench';
import { scenario as s14 } from './data/shutdown-check';

export const LAB_SCENARIOS = [
  s0,
  s1,
  s2,
  s3,
  s4,
  s5,
  s6,
  s7,
  s8,
  s9,
  s10,
  s11,
  s12,
  s13,
  s14,].map(scenario => {
  // Put tabletop incidents in the clear front work zone, away from the service rack.
  if (Math.abs(scenario.position[0]) < 6 && Math.abs(scenario.position[1] - .92) < .2 && Math.abs(scenario.position[2]) < 3) {
    return { ...scenario, position: [scenario.position[0], scenario.position[1], scenario.position[2] + .38] as [number, number, number] };
  }
  return scenario;
});

export const SCENARIO_BY_ID = new Map(LAB_SCENARIOS.map(s => [s.id, s]));
