import { describe, it, expect, vi } from 'vitest';
import { getVesselProfile, VESSEL_PROFILES } from '../src/pour/physics/profiles';
import { containParticle } from '../src/simulation/effects/particleBounds';
import { createSedimentGeometry, sedimentLevel } from '../src/simulation/effects/sedimentGeometry';
import { contourVolumeBelow, vesselInterior, liquidLevelForVolume, contourRadius } from '../src/science/vesselDimensions';
import { BoilingSystem } from '../src/simulation/effects/BoilingSystem';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import type { VesselState } from '../src/types/chemistry';

describe('Physical effects inside actual glass', () => {
  it.each(Object.keys(VESSEL_PROFILES))('%s contains finite glyphs across the full height', type => {
    const profile = getVesselProfile(type);
    for (let i = 1; i < 100; i++) {
      const p = { x: 3, y: profile.baseY + profile.H * i / 100, z: 2, radius: 0.01 };
      const bounds = { radius: profile.mouthR, liquidBottomY: profile.baseY,
        surfaceY: profile.baseY + profile.H, vesselProfile: profile };
      if (!containParticle(p, bounds, 2.01)) continue;
      const extent = p.radius * 2.01;
      expect(p.y - extent).toBeGreaterThanOrEqual(profile.baseY - 1e-10);
      expect(p.y + extent).toBeLessThanOrEqual(bounds.surfaceY + 1e-10);
      for (let j = -10; j <= 10; j++) {
        expect(Math.hypot(p.x, p.z) + extent).toBeLessThanOrEqual(profile.r(p.y + extent * j / 10) + 1e-9);
      }
    }
  });

  it.each(['flask', 'test_tube', 'watch_glass', 'volumetric_flask'])('%s bed volume matches finite packed mass and glass contour', type => {
    const profile = getVesselProfile(type, 100);
    const level = sedimentLevel(type, 100, 2, 4);
    const interior = vesselInterior(type);
    expect(contourVolumeBelow(interior.points, level) / interior.volume * 100).toBeCloseTo(2 / (4 * 0.65), 10);
    const geometry = createSedimentGeometry(type, level);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Float32 vertices can round the flat floor just below its double-precision height.
      expect(y).toBeGreaterThanOrEqual(profile.baseY - 1e-6);
      expect(Math.hypot(positions.getX(i), positions.getZ(i))).toBeLessThanOrEqual(profile.r(Math.max(profile.baseY, y)) + 1e-6);
      expect(y).toBeLessThanOrEqual(level + 1e-6);
    }
    geometry.dispose();
  });

  it('manager supplies the same nonlinear liquid level and actual capacity to every effect', () => {
    const manager = new VesselSimulationManager('geometry');
    const precipitation = vi.spyOn(manager.precipitationSystem, 'update');
    const evaporation = vi.spyOn(manager.evaporationSystem, 'update');
    const boiling = vi.spyOn(manager.boilingSystem, 'update');
    const vessel = { id: 'geometry', type: 'flask', capacity_ml: 500, volume_ml: 100,
      mass_g: 100.1, temperature_c: 25, contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 },
        { formula: 'BaSO4', phase: 's', solidOrigin: 'precipitate', mass_g: 0.1, moles: 0.1 / 233.39 }] } as VesselState;
    manager.step(vessel, 0.01, { thermalStateAuthoritative: true, reactionGasRate: 1 });
    const surface = vesselLiquidSurfaceY(vessel);
    expect(precipitation.mock.calls[0][1].surfaceY).toBe(surface);
    expect(evaporation.mock.calls[0][1].surfaceY).toBe(surface);
    expect(boiling.mock.calls[0][1].surfaceY).toBe(surface);
    expect(precipitation.mock.calls[0][1].vesselProfile?.capacity_ml).toBe(500);
  });

  it('dry vessel produces no floating bubbles and transfers finite precipitate into the bed', () => {
    const profile = getVesselProfile('watch_glass');
    const bounds = { radius: 1, liquidBottomY: profile.baseY, surfaceY: profile.baseY, vesselProfile: profile };
    const bubbles = new BoilingSystem();
    bubbles.update(0.2, { ...bounds, temp_c: 100, boilingPoint_c: 100, heatPower_W: 200,
      viscosity_mPa_s: 1, boilingStage: 'ACTIVE_BOIL', boilingIntensity: 1 });
    expect(bubbles.bubbles).toHaveLength(0);
    const solids = new PrecipitationSystem();
    for (let i = 0; i < 20; i++) solids.update(0.1, { ...bounds, temp_c: 25,
      viscosity_mPa_s: 1, density_g_ml: 1, precipitateAmount_g: 0.2 });
    expect(solids.particles).toHaveLength(0);
    expect(solids.representedMass_g).toBeCloseTo(0.2, 12);
    expect(solids.sedimentBed.amount_g).toBeGreaterThan(0);
  });

  it('small time steps still let contained bubbles reach and burst at the surface', () => {
    const system = new BoilingSystem(10);
    let popped = false;
    for (let i = 0; i < 2000; i++) {
      system.update(0.001, { radius: 0.5, liquidBottomY: 0, surfaceY: 0.1,
        temp_c: 25, boilingPoint_c: 100, heatPower_W: 0, viscosity_mPa_s: 1,
        boilingStage: 'COLD_STABLE', boilingIntensity: 0, reactionGasRate: 20 });
      popped ||= system.bubbles.some(b => b.isPopping);
    }
    expect(popped).toBe(true);
  });

  it.each(['beaker', 'flask', 'volumetric_flask', 'cylinder', 'test_tube', 'condenser', 'separatory_funnel', 'wash_bottle'])('%s condensation fog is confined strictly above liquid and inside glass contour', type => {
    const interior = vesselInterior(type);
    const capacity = 250;
    const volumes = [20, 50, 100, 150];

    for (const vol of volumes) {
      const liquidY = liquidLevelForVolume(type, vol, capacity);
      const bottomY = Math.max(interior.floorY, liquidY + 0.025);
      const topY = interior.topY - 0.035;

      if (topY - bottomY < 0.04) continue;

      expect(bottomY).toBeGreaterThan(liquidY);
      expect(topY).toBeLessThan(interior.topY);

      // Verify all sampled fog contour radii are strictly inside inner glass wall
      const SAMPLES = 20;
      for (let i = 0; i <= SAMPLES; i++) {
        const y = bottomY + (topY - bottomY) * (i / SAMPLES);
        const glassR = contourRadius(interior.points, y);
        const fogR = Math.max(0.02, glassR - 0.005);
        expect(fogR).toBeLessThan(glassR);
        expect(fogR).toBeGreaterThanOrEqual(0.02);
      }
    }
  });
});

