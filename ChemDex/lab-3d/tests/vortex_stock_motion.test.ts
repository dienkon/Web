import { describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { StockWorld } from '../src/physical/StockWorld';
import { stockFluidAt } from '../src/physical/stockFluidMotion';
import { AutoStockDynamics } from '../src/vfx/autoplay/AutoStockDynamics';
import type { StockContainerInput } from '../src/physical/stockTypes';
import type { VesselState } from '../src/types/chemistry';

describe('solid stock follows carrier drag, not a decorative orbit', () => {
  it('samples the SI vortex surface and relative carrier velocity', () => {
    const fluid: NonNullable<StockContainerInput['fluid']> = { normal: [0, 1, 0], offset_m: 1, density_kg_m3: 1000, viscosity_Pas: 0.001,
      vortex: { axis_m: [0, 0, 0], coreRadius_m: 0.03, radius_m: 0.1, angularSpeed_rad_s: 20,
        centerHeight_m: 0.98, amplitude_m: 0.03, floorY_m: 0 } };
    const a = stockFluidAt([0.03, 0.8, 0], fluid);
    expect(a.velocity_m_s[0]).toBeCloseTo(0); expect(a.velocity_m_s[2]).toBeCloseTo(0.3);
    expect(a.depth_m).toBeCloseTo(0.195); expect(a.spin_rad_s).toBeCloseTo(5);
    expect(stockFluidAt([0.11, 0.8, 0], fluid).velocity_m_s).toEqual([-0, 0, 0]);
  });
  it('transfers tangential and angular momentum to a real immersed Rapier stock body without changing its mass', async () => {
    const world = await StockWorld.create(), geometry = new BoxGeometry(1, 1, 1);
    try {
      const container: StockContainerInput = { id: 'rig', shapeKey: 'none', colliders: [], position_m: [0, 0, 0], rotation: [0, 0, 0, 1], restore: false,
        groups: [{ formula: 'reference', mass_g: 1, density_kg_m3: 1000, powder: false, unitVolume: 1,
          vertices: Array.from(geometry.getAttribute('position').array), seed: [{ position_m: [0.02, 1, 0], rotation: [0, 0, 0, 1] }] }],
        fluid: { normal: [0, 1, 0], offset_m: 2, density_kg_m3: 1000, viscosity_Pas: 0.001,
          vortex: { axis_m: [0, 0, 0], radius_m: 0.1, coreRadius_m: 0.03, angularSpeed_rad_s: 16,
            centerHeight_m: 2, amplitude_m: 0.01, floorY_m: 0 } } };
      world.sync({ containers: [container], contacts: [], spills: [] });
      const result = world.advance(0.1, false).grains[0].pose;
      expect(result.mass_g).toBeCloseTo(1, 10); expect(result.position_m[2]).toBeGreaterThan(0.001);
      expect(result.velocity_m_s[2]).toBeGreaterThan(0.01); expect(result.angularVelocity_rad_s[1]).toBeGreaterThan(0);
      const paused = world.advance(0.1, true).grains[0].pose;
      expect(paused.position_m).toEqual(result.position_m);
    } finally { world.free(); geometry.dispose(); }
  });
  it('settles a dense dry stock through contacts and removes consumed stock', async () => {
    const motion = new AutoStockDynamics(), vessel = { id: 's', type: 'beaker', capacity_ml: 100, temperature_c: 25, volume_ml: 0,
      position: [0, 1.04, 0], rotationY: 0, contents: [{ formula: 'Fe', phase: 's', mass_g: 1, moles: 1 / 55.845 }] } as VesselState;
    await motion.initialize();
    try {
      for (let i = 0; i < 240; i++) motion.advance(vessel, 1 / 60);
      const first = motion.grains.map(p => p.position_m);
      for (let i = 0; i < 60; i++) motion.advance(vessel, 1 / 60);
      expect(motion.grains.length).toBeGreaterThan(1);
      expect(motion.grains.reduce((m, p) => m + p.mass_g, 0)).toBeCloseTo(1, 9);
      motion.grains.forEach((p, i) => expect(Math.hypot(...p.position_m.map((x, j) => x - first[i][j]))).toBeLessThan(0.0001));
      vessel.contents = []; motion.advance(vessel, 1 / 60); expect(motion.grains.length).toBe(0);
    } finally { motion.dispose(); }
  });
});
