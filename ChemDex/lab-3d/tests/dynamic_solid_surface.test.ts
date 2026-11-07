import { describe, expect, it } from 'vitest';
import { stockImmersion } from '../src/science/stockImmersion';
import { solveStockLiquidSurface } from '../src/science/stockLiquidSurface';
import { vesselBodyTransform, vesselLocalToWorld, vesselWorldToLocal } from '../src/science/vesselScale';
import { liquidLevelForVolume } from '../src/science/vesselDimensions';
import { Quaternion, Euler } from 'three';
import { availableLiquidVolume } from '../src/handling/solidOccupancy';

describe('Dynamic solids share the liquid displacement geometry', () => {
  it('raises the surface by actual submerged box volume without adding liquid inventory', () => {
    const vessel = { type: 'beaker' as const, capacity_ml: 100, volume_ml: 40, contents: [],
      dynamicSolids: [{ id: 'block', dimensions_m: [0.01, 0.01, 0.01] as [number, number, number],
        position_m: [0, -0.02, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number] }] };
    const surface = solveStockLiquidSurface(vessel, [0, 1, 0])!;
    expect(surface.displacement_ml).toBeCloseTo(1, 6);
    expect(surface.grossVolume_ml).toBeCloseTo(41, 6);
    expect(vessel.volume_ml).toBe(40);
    expect(availableLiquidVolume(vessel)).toBeCloseTo(59, 6);
    const immersion = stockImmersion(vessel)!;
    const t = vesselBodyTransform(vessel), boxCenterModel = (vessel.dynamicSolids[0].position_m[1] / 0.035 - t.offsetY) / t.scale;
    expect(immersion.displacementMl([0, 1, 0], boxCenterModel)).toBeCloseTo(0.5, 6);
    expect(immersion.displacementMl([0, -1, 0], -boxCenterModel)).toBeCloseTo(0.5, 6);
  });
  it('round-trips arbitrary 3D rigid orientation, including roll outside legacy yaw/tilt', () => {
    const q = new Quaternion().setFromEuler(new Euler(0.4, -0.6, 0.8));
    const v = { type: 'flask', capacity_ml: 250, position: [1, 2, 3] as [number, number, number], rotationY: 0, rotationZ: 0,
      physicalMotion: { rotation: q.toArray() as [number, number, number, number], velocity_m_s: [0, 0, 0] as [number, number, number],
        angularVelocity_rad_s: [0, 0, 0] as [number, number, number], tick: 1 } };
    const p: [number, number, number] = [0.2, 0.7, -0.3], round = vesselWorldToLocal(v, vesselLocalToWorld(v, p));
    round.forEach((x, i) => expect(x).toBeCloseTo(p[i], 12));
  });
});
