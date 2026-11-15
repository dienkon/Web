import { afterEach, describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer, stockGeometry } from '../src/physical/stockAdapter';
import { stockLiquidContactFraction } from '../src/physical/stockLiquidContact';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselInterior } from '../src/science/vesselDimensions';
import { scenePointToSI } from '../src/science/sceneUnits';
import type { VesselState } from '../src/types/chemistry';
import type { StockGrainPose } from '../src/physical/stockTypes';

const worlds: StockWorld[] = [];
afterEach(() => worlds.splice(0).forEach(world => world.free()));
const create = async () => { const world = await StockWorld.create(); worlds.push(world); return world; };
const specimen = (formula: string, mass_g: number): VesselState => ({
  id: 'shrinking-stock', type: 'beaker', capacity_ml: 250, position: [0, 1.04, 0],
  volume_ml: 30, mass_g: 30 + mass_g, temperature_c: 25,
  contents: [{ formula, phase: 's', mass_g, moles: mass_g / 80 },
    { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }],
  substances: [formula, 'H2O'],
} as VesselState);
const floorY = (vessel: VesselState) => scenePointToSI(vesselLocalToWorld(vessel, [0, vesselInterior(vessel.type).floorY, 0]))[1];
function lowestVertex(formula: string, pose: StockGrainPose) {
  const vertices = stockGeometry(formula).getAttribute('position'), rotation = new Quaternion(...pose.rotation);
  let lowest = Infinity;
  for (let i = 0; i < vertices.count; i++) lowest = Math.min(lowest,
    new Vector3().fromBufferAttribute(vertices, i).multiplyScalar(pose.scale_m).applyQuaternion(rotation).y + pose.position_m[1]);
  return lowest;
}

describe('glass support while finite stock shrinks', () => {
  it('recovers a small penetrating crystal above the same glass floor instead of trapping it inside an internal support slab', async () => {
    const world = await create(), vessel = specimen('NH4NO3', 1e-6), container = stockContainer(vessel, false)!;
    // A shrinking/recreated contact may begin within the numerical support
    // boundary. The solver must resolve outward through the cavity floor.
    container.groups[0].seed = [{ position_m: [-0.0165, floorY(vessel) - 0.00016, 0], rotation: [0, 0, 0, 1] }];
    world.sync({ containers: [container], contacts: [], spills: [] });
    let snapshot = world.snapshot();
    for (let i = 0; i < 120; i++) snapshot = world.advance(1 / 120, false);
    const poses = snapshot.grains.map(grain => grain.pose);
    expect(snapshot.escapes).toHaveLength(0);
    expect(poses).toHaveLength(1);
    expect(poses[0].mass_g).toBeCloseTo(1e-6, 14);
    expect(lowestVertex('NH4NO3', poses[0])).toBeGreaterThanOrEqual(floorY(vessel) - 0.00001);
    vessel.stockMotion = { tick: snapshot.tick, grains: poses };
    expect(stockLiquidContactFraction(vessel, 'NH4NO3')).toBeGreaterThan(0.75);
  });

  it('keeps wetted grain surfaces supported as a 10 mg crystal shrinks through four orders of mass', async () => {
    const world = await create(), vessel = specimen('Zn', 0.01), container = stockContainer(vessel, false)!;
    container.groups[0].seed = [{ position_m: [0.01, floorY(vessel) + 0.004, 0], rotation: [0, 0, 0, 1] }];
    world.sync({ containers: [container], contacts: [], spills: [] });
    for (let i = 0; i < 120; i++) world.advance(1 / 120, false);
    let minimumWet = 1, minimumCenterHeight = Infinity;
    for (let i = 1; i <= 600; i++) {
      const mass_g = 0.01 * Math.pow(1e-4, i / 600);
      container.groups[0].mass_g = mass_g;
      vessel.contents[0] = { ...vessel.contents[0], mass_g, moles: mass_g / 65.38 };
      world.sync({ containers: [container], contacts: [], spills: [] });
      const snapshot = world.advance(1 / 60, false), poses = snapshot.grains.map(grain => grain.pose);
      expect(snapshot.escapes).toHaveLength(0);
      expect(poses.reduce((sum, pose) => sum + pose.mass_g, 0)).toBeCloseTo(mass_g, 12);
      vessel.stockMotion = { tick: snapshot.tick, grains: poses };
      minimumWet = Math.min(minimumWet, stockLiquidContactFraction(vessel, 'Zn'));
      minimumCenterHeight = Math.min(minimumCenterHeight, poses[0].position_m[1]);
    }
    expect(minimumCenterHeight).toBeGreaterThan(floorY(vessel));
    expect(minimumWet).toBeGreaterThan(0.5);
    // Rigid contact may transiently overlap while shapes shrink; after the
    // mass settles the actual rotated hull must rest on the cavity surface.
    for (let i = 0; i < 120; i++) world.advance(1 / 120, false);
    const final = world.snapshot().grains[0].pose;
    expect(lowestVertex('Zn', final)).toBeGreaterThanOrEqual(floorY(vessel) - 0.00001);
  });
});
