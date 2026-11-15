import { afterEach, describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockContainer, stockGeometry } from '../src/physical/stockAdapter';
import { stockLiquidContactFraction } from '../src/physical/stockLiquidContact';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselInterior } from '../src/science/vesselDimensions';
import { scenePointToSI } from '../src/science/sceneUnits';
import { geometryVolume } from '../src/science/stockSolidGeometry';
import type { VesselState } from '../src/types/chemistry';

const worlds: StockWorld[] = [];
afterEach(() => worlds.splice(0).forEach(world => world.free()));

function sample(formula: string): VesselState {
  return { id: 'sheet', type: 'beaker', capacity_ml: 250, position: [0, 1.04, 0],
    volume_ml: 30, mass_g: 30.024, contents: [{ formula, phase: 's', mass_g: 0.024, moles: 0.001 },
      { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }], substances: [formula, 'H2O'] } as VesselState;
}

describe('finite bent and folded sheet contacts', () => {
  it.each(['Mg', 'Al'])('%s contact prisms partition exactly the visible sheet material volume', formula => {
    const geometry = stockGeometry(formula), container = stockContainer(sample(formula), false)!;
    const parts = container.groups[0].convexParts!;
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(part => part.volume > 0 && [18, 24].includes(part.vertices.length))).toBe(true);
    expect(parts.reduce((sum, part) => sum + part.volume, 0)).toBeCloseTo(geometryVolume(geometry), 6);
    geometry.computeBoundingBox();
    for (const part of parts) for (let i = 0; i < part.vertices.length; i += 3) {
      const point = new Vector3(...part.vertices.slice(i, i + 3) as [number, number, number]);
      expect(geometry.boundingBox!.containsPoint(point)).toBe(true);
    }
  });

  it.each(['Mg', 'Al'])('supports %s at multiple floor positions while its actual inventory shrinks', async formula => {
    const world = await StockWorld.create(); worlds.push(world);
    const vessel = sample(formula), container = stockContainer(vessel, false)!;
    const floor = scenePointToSI(vesselLocalToWorld(vessel, [0, vesselInterior(vessel.type).floorY, 0]))[1];
    const vertices = stockGeometry(formula).getAttribute('position');
    world.sync({ containers: [container], contacts: [], spills: [] });
    let lowestResting = Infinity, minimumCenter = Infinity, minimumWet = 1;
    for (let frame = 0; frame < 240; frame++) {
      if (frame >= 60) {
        const mass_g = 0.024 * Math.pow(0.05, (frame - 60) / 179);
        container.groups[0].mass_g = mass_g;
        vessel.contents[0] = { ...vessel.contents[0], mass_g, moles: mass_g / (formula === 'Mg' ? 24.305 : 26.982) };
        world.sync({ containers: [container], contacts: [], spills: [] });
      }
      const snapshot = world.advance(1 / 60, false), grains = snapshot.grains.map(grain => grain.pose);
      expect(snapshot.escapes).toHaveLength(0);
      expect(grains.reduce((sum, grain) => sum + grain.mass_g, 0)).toBeCloseTo(container.groups[0].mass_g, 11);
      for (const grain of grains) {
        minimumCenter = Math.min(minimumCenter, grain.position_m[1]);
        if (frame >= 60) continue;
        const rotation = new Quaternion(...grain.rotation);
        for (let i = 0; i < vertices.count; i++) lowestResting = Math.min(lowestResting,
          new Vector3().fromBufferAttribute(vertices, i).multiplyScalar(grain.scale_m).applyQuaternion(rotation).y + grain.position_m[1]);
      }
      vessel.stockMotion = { tick: snapshot.tick, grains };
      minimumWet = Math.min(minimumWet, stockLiquidContactFraction(vessel, formula));
    }
    expect(lowestResting).toBeGreaterThan(floor - 0.00001);
    expect(minimumCenter).toBeGreaterThan(floor - 0.00001);
    for (let frame = 0; frame < 120; frame++) world.advance(1 / 120, false);
    for (const { pose } of world.snapshot().grains) {
      const rotation = new Quaternion(...pose.rotation);
      const lowest = Math.min(...Array.from({ length: vertices.count }, (_, i) =>
        new Vector3().fromBufferAttribute(vertices, i).multiplyScalar(pose.scale_m).applyQuaternion(rotation).y + pose.position_m[1]));
      expect(lowest).toBeGreaterThan(floor - 0.00001);
    }
    expect(minimumWet).toBeGreaterThan(0.5);
  }, 20000);
});
