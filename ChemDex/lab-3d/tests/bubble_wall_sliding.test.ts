import { describe, expect, it } from 'vitest';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { liquidParticlePlane, pointPlaneDepth } from '../src/simulation/effects/liquidParticleFrame';
import { bubbleMechanicalRadius } from '../src/science/bubblePhase';
import { metersPerModelUnit } from '../src/science/sceneUnits';
import { waterSurfaceTension } from '../src/science/wallDropletGeometry';
import { LiquidVortex, vortexHeight, vortexSlope } from '../src/science/liquidVortex';
import { vfxBus } from '../src/vfx/bus';

const profile = getVesselProfile('flask', 100), dt = 1 / 120;
const params: BoilingSimulationParams = { vesselProfile: profile, radius: 1.215,
  liquidBottomY: profile.baseY, surfaceY: 0.8, temp_c: 25, ambientTemp_c: 25,
  boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1, boilingStage: 'COLD_STABLE', boilingIntensity: 0 };
const packet = (x: number, y: number, z = 0): PhysicalBubble => ({ id: 1, x, y, z,
  radius: 0.012, baseRadius: 0.012, gasPV_scene3_Pa: 102000 * 0.012 ** 3, nucleationPressure_Pa: 102000,
  source: 'reaction', vx: 0, vy: 0, vz: 0, buoyancy: 1, growthRate: 0, wobblePhase: 0,
  wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1, life: 0, maxLife: 5, opacity: 1,
  temperature: 25, isPopping: false, popProgress: 0, merged: false });

function checkMechanicalInventory(b: PhysicalBubble, input: BoilingSimulationParams, inventory: number) {
  expect(b.gasPV_scene3_Pa).toBe(inventory);
  expect(b.noncondensablePV_scene3_Pa).toBe(inventory);
  expect([b.x, b.y, b.z, b.vx, b.vy, b.vz, b.radius, b.physicalRadius_m].every(Number.isFinite)).toBe(true);
  expect(b.radius).toBeGreaterThan(0);
  const scale = metersPerModelUnit(input.vesselProfile);
  const pressure = 101325 + 1000 * 9.80665 * Math.max(0, pointPlaneDepth(b, input.surfaceY, input.surfacePlane)) * scale;
  if (!b.isPopping) {
    expect(b.physicalRadius_m).toBeCloseTo(bubbleMechanicalRadius(inventory * scale ** 3, pressure, waterSurfaceTension(25)), 11);
    expect(Math.hypot(b.x, b.z) + b.radius * 1.6).toBeLessThanOrEqual(profile.r(b.y) + 1e-9);
  }
}

describe('Bubble contact with a sloping glass wall', () => {
  it.each([{ up: [1, 0, 0] as const }, { up: [0, 0, 1] as const }])('slides beneath a horizontal flask shoulder toward world up $up', ({ up }) => {
    const sim = new BoilingSystem(1), b = packet(up[0] * 0.2, 0.5, up[2] * 0.2);
    const inventory = b.gasPV_scene3_Pa!;
    const input = { ...params, surfacePlane: liquidParticlePlane(profile, 85, up)! };
    sim.bubbles = [b];
    let reachedSurface = false, previousHeight = b.x * up[0] + b.z * up[2];
    for (let step = 0; step < 240; step++) {
      sim.update(dt, input);
      // There is no dissolution source: this packet may only leave at the surface.
      expect(sim.bubbles).toHaveLength(1);
      const current = sim.bubbles[0], height = current.x * up[0] + current.z * up[2];
      checkMechanicalInventory(current, input, inventory);
      expect(height).toBeGreaterThanOrEqual(previousHeight - 1e-8);
      previousHeight = height;
      if (current.isPopping) {
        expect(pointPlaneDepth(current, input.surfaceY, input.surfacePlane)).toBeCloseTo(0, 10);
        expect(current.y).toBeLessThan(0.4); // Moves along the conical shoulder.
        reachedSurface = true; break;
      }
    }
    expect(reachedSurface).toBe(true);
  });
  it('continues rising and moves inward on the narrowing shoulder of an upright flask', () => {
    const sim = new BoilingSystem(1), b = packet(0.75, -0.2), inventory = b.gasPV_scene3_Pa!;
    sim.bubbles = [b];
    let reachedSurface = false, previousY = b.y;
    for (let step = 0; step < 300; step++) {
      sim.update(dt, params);
      expect(sim.bubbles).toHaveLength(1);
      const current = sim.bubbles[0];
      checkMechanicalInventory(current, params, inventory);
      expect(current.y).toBeGreaterThanOrEqual(previousY - 1e-8); previousY = current.y;
      if (current.isPopping) {
        expect(current.x).toBeLessThan(0.35);
        reachedSurface = true; break;
      }
    }
    expect(reachedSurface).toBe(true);
  });
  it('removes velocity into the wall while keeping the upward tangential part', () => {
    const sim = new BoilingSystem(1), b = packet(0.425, 0.5), inventory = b.gasPV_scene3_Pa!;
    b.vx = 0.2;
    const input = { ...params, surfacePlane: liquidParticlePlane(profile, 85, [1, 0, 0])! };
    sim.bubbles = [b]; sim.update(dt, input);
    const current = sim.bubbles[0], radial = Math.hypot(current.x, current.z);
    const slope = (0.35 - 1.215) / (0.7 + 0.96);
    const intoWall = (current.vx * current.x + current.vz * current.z) / radial - slope * current.vy;
    expect(intoWall).toBeLessThan(1e-7);
    expect(current.vx).toBeGreaterThan(0); expect(current.vy).toBeLessThan(0);
    checkMechanicalInventory(current, input, inventory);
  });
  it('leaves a free bubble away from the glass on its unchanged transport trajectory', () => {
    const bounded = new BoilingSystem(1), wide = new BoilingSystem(1);
    bounded.bubbles = [packet(0, -0.5)]; wide.bubbles = [packet(0, -0.5)];
    const clear = { ...params, vesselProfile: { ...profile, contour: undefined, r: () => 10 } };
    for (let i = 0; i < 10; i++) { bounded.update(dt, params); wide.update(dt, clear); }
    expect(bounded.bubbles).toEqual(wide.bubbles);
  });
});

describe('Bubble contact with the stirring vortex', () => {
  const glass = getVesselProfile('beaker', 100), fill = -0.15;
  const vortex = new LiquidVortex();
  vortex.setMotion(48, 0, glass, fill);
  const surface = vortex.surface!;
  const plane = { offset: fill, normal: [0, 1, 0] as const, vortex: surface };
  const input: BoilingSimulationParams = {
    ...params, vesselId: 'vortex-contact', vesselProfile: glass, surfacePlane: plane,
    radius: glass.r(fill), liquidBottomY: glass.baseY, surfaceY: fill, viscosity_mPa_s: 500, boilingIntensity: 0.7,
  };

  it('reaches the sloping meniscus, ejects outward from it, and follows it as stirring subsides', () => {
    const sim = new BoilingSystem(1);
    const r = surface.coreRadius / Math.sqrt(3);
    const b = packet(r, vortexHeight(r, 0, surface) - 0.012 * 1.6 * 0.92);
    sim.bubbles = [b];
    const positions: number[][] = [];
    const stop = vfxBus.on('particle:burst', event => {
      if (event.vesselId === input.vesselId) positions.push(event.position);
    });
    try {
      sim.update(dt, input);
      expect(b.isPopping).toBe(true);
      expect(pointPlaneDepth(b, fill, plane)).toBeCloseTo(0, 9);
      expect(positions).toHaveLength(1);
      const radial = Math.hypot(b.x, b.z);
      const slope = vortexSlope(radial, surface);
      const lift = 0.006 / Math.hypot(1, slope);
      expect(positions[0][0] - b.x).toBeCloseTo(-lift * slope * b.x / radial, 12);
      expect(positions[0][1] - b.y).toBeCloseTo(lift, 12);
      const arrivalRadius = b.radius;
      const calmer = { ...plane, vortex: { ...surface, amplitude: surface.amplitude / 2 } };
      sim.update(dt, { ...input, surfacePlane: calmer });
      expect(sim.bubbles).toHaveLength(1);
      expect(pointPlaneDepth(b, fill, calmer)).toBeCloseTo(0, 9);
      expect(b.radius / arrivalRadius).toBeCloseTo(1 + dt * 6.5 * 0.6, 12);
      expect(positions).toHaveLength(1);
    } finally {
      stop();
    }
  });

  it('keeps a closely submerged bubble under the nearly flat centre', () => {
    const sim = new BoilingSystem(1);
    const b = packet(0, vortexHeight(0, 0, surface) - 0.012 * 1.6 * 1.08);
    sim.bubbles = [b];
    sim.update(dt, input);
    expect(sim.bubbles).toEqual([b]);
    expect(b.isPopping).toBe(false);
  });
});
