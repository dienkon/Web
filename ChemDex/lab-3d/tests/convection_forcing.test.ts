import { afterEach, describe, expect, it } from 'vitest';
import { liquidWaterDensityReference, liquidWaterViscosity_Pa_s } from '../src/science/liquidTransport';
import { convectionForcing } from '../src/science/convectionForcing';
import { ConvectionSystem } from '../src/simulation/effects/ConvectionSystem';
import { suspensionFluidProperties } from '../src/science/suspensionFluid';
import { effects } from '../src/vfx/vesselEffects';
import { useAppStore } from '../src/store/useAppStore';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); SimulationEngine.clearAll(); });
const base = { temp_c: 25, ambientTemp_c: 25, heatPower_W: 0, viscosity_mPa_s: 1 };
const speed = (patch: Partial<typeof base>) => convectionForcing({ ...base, ...patch }).strength_scene_s;

describe('IAPWS SR6-08 liquid reference, Eq2 and analytic derivative', () => {
  // Independent program-verification values printed in Table8 at 0.1 MPa.
  it.each([
    [260, 997.068360, -3.86550941e-7],
    [298.15, 997.047013, 2.58054178e-7],
    [375, 957.009710, 7.94706623e-7],
  ])('matches the published verification point at %s K', (kelvin, density, derivative) => {
    const result = liquidWaterDensityReference(kelvin - 273.15)!;
    expect(result.density_kg_m3).toBeCloseTo(density, 6);
    expect(result.volumeDerivative_m3_kg_K / derivative).toBeCloseTo(1, 8);
  });
  it('has a density maximum near4C and signed expansion on either side', () => {
    const at = liquidWaterDensityReference;
    expect(at(4)!.density_kg_m3).toBeGreaterThan(at(0)!.density_kg_m3);
    expect(at(4)!.density_kg_m3).toBeGreaterThan(at(8)!.density_kg_m3);
    expect(at(3.97)!.thermalExpansion_per_K).toBeLessThan(0);
    expect(at(4)!.thermalExpansion_per_K).toBeGreaterThan(0);
    for (const temp of [-15, 0, 4, 25, 80, 105]) {
      const delta = 0.001;
      const dv = (at(temp + delta)!.specificVolume_m3_kg - at(temp - delta)!.specificVolume_m3_kg) / (2 * delta);
      expect(Math.abs(dv - at(temp)!.volumeDerivative_m3_kg_K)).toBeLessThan(1e-14);
    }
  });
  it('keeps inclusive validity limits and rejects extrapolation/nonfinite input', () => {
    expect(liquidWaterDensityReference(-20)).not.toBeNull(); expect(liquidWaterDensityReference(110)).not.toBeNull();
    expect(liquidWaterViscosity_Pa_s(-20)).not.toBeNull(); expect(liquidWaterViscosity_Pa_s(110)).not.toBeNull();
    for (const temp of [-20.001, 110.001, Infinity, NaN]) expect(liquidWaterDensityReference(temp)).toBeNull();
  });
});

describe('Continuous water-reference forcing with a stated nominal amplitude', () => {
  it('is quiescent at equilibrium but responds continuously below the old10K/2W gates', () => {
    expect(speed({})).toBe(0);
    expect(speed({ temp_c: 25.001 })).toBeGreaterThan(0);
    expect(speed({ heatPower_W: 0.001 })).toBeGreaterThan(0);
    for (const boundary of [2, 10]) {
      const variable = boundary === 2 ? 'heatPower_W' : 'temp_c';
      const middle = boundary === 2 ? boundary : 25 + boundary;
      const below = speed({ [variable]: middle - 1e-7 }), above = speed({ [variable]: middle + 1e-7 });
      expect(Math.abs(above - below)).toBeLessThan(1e-7);
    }
    expect(Math.abs(speed({ temp_c: 25 + 1e-6 }))).toBeLessThan(1e-8);
  });
  it('reverses ordinary cooling and respects the cold-water density anomaly', () => {
    expect(speed({ temp_c: 40, ambientTemp_c: 25 })).toBeGreaterThan(0);
    expect(speed({ temp_c: 5, ambientTemp_c: 25 })).toBeLessThan(0);
    expect(speed({ temp_c: 0, ambientTemp_c: 4 })).toBeGreaterThan(0);
    expect(speed({ temp_c: 4, ambientTemp_c: 0 })).toBeLessThan(0);
  });
  it('does not invent a heater overturn below the density maximum in the linearized closure', () => {
    expect(speed({ temp_c: 2, ambientTemp_c: 2, heatPower_W: 50 })).toBe(0);
    expect(speed({ temp_c: 5, ambientTemp_c: 5, heatPower_W: 0.01 })).toBeGreaterThan(0);
    expect(speed({ heatPower_W: 10 })).toBeGreaterThan(speed({ heatPower_W: 2 }));
  });
  it('bounds presentation amplitude and damps it monotonically with viscosity', () => {
    expect(speed({ temp_c: 100, heatPower_W: Number.MAX_VALUE })).toBeLessThanOrEqual(0.6);
    expect(speed({ temp_c: 50, viscosity_mPa_s: 2 })).toBeCloseTo(speed({ temp_c: 50 }) / 2, 14);
    for (const patch of [{ temp_c: NaN }, { ambientTemp_c: Infinity }, { heatPower_W: -1 }, { viscosity_mPa_s: 0 }]) {
      expect(convectionForcing({ ...base, ...patch }).status).toBe('invalid-input');
    }
    expect(convectionForcing({ ...base, temp_c: 111 }).status).toBe('temperature-out-of-range');
    expect(convectionForcing({ ...base, temp_c: 50, fluidModel: 'unavailable' }).strength_scene_s).toBe(0);
  });
  it('preserves solute/unknown-solvent distinctions and the actual material density', () => {
    const water = { formula: 'H2O', phase: 'l', mass_g: 99, moles: 99 / 18.015 };
    const pure = suspensionFluidProperties([water], 100, 25);
    expect(pure.convectionFluidModel).toBe('pure-water-reference'); expect(pure.density_g_ml).toBe(0.99);
    expect(suspensionFluidProperties([water, { formula: 'NaCl', phase: 'aq', mass_g: 1, moles: 1 / 58.44 }],
      100, 25).convectionFluidModel).toBe('aqueous-water-proxy');
    expect(suspensionFluidProperties([{ ...water, formula: 'C2H5OH' }], 100, 25).convectionFluidModel).toBe('unavailable');
  });
  it('retains geometric continuity under reversed flow and does not leak a memo across boundaries', () => {
    const p = { ...base, radius: 1, liquidBottomY: 0, surfaceY: 2, temp_c: 5 };
    const v = (x: number, y: number, z: number) => ConvectionSystem.sampleVelocity(x, y, z, p);
    expect(v(0, 1, 0)[1]).toBeLessThan(0); expect(v(0.9, 1, 0)[1]).toBeGreaterThan(0);
    const d = 1e-5, x = 0.3, y = 0.7, z = 0.2;
    const divergence = (v(x+d,y,z)[0]-v(x-d,y,z)[0] + v(x,y+d,z)[1]-v(x,y-d,z)[1]
      + v(x,y,z+d)[2]-v(x,y,z-d)[2])/(2*d);
    expect(Math.abs(divergence)).toBeLessThan(1e-8);
    expect(ConvectionSystem.sampleVelocity(0, 1, 0, { ...p, ambientTemp_c: 5 })).toEqual([0,0,0]);
    expect(v(0, 1, 0)[1]).toBeLessThan(0);
    expect(ConvectionSystem.sampleVelocity(0, 1, 0, { ...p, fluidModel: 'unavailable' })).toEqual([0,0,0]);
    expect(v(0, 1, 0)[1]).toBeLessThan(0);
  });
  it('exposes the model on the addressed vessel without creating a manager or apparatus', () => {
    const vessel = { id: 'density-probe', type: 'beaker', capacity_ml: 250, temperature_c: 5, volume_ml: 100,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }] } as VesselState;
    useAppStore.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id] });
    const before = JSON.stringify(useAppStore.getState().vessels);
    const result = effects.forVessel(vessel.id).inspect();
    expect(result.state?.convection.status).toBe('available');
    expect(result.state?.convection.strength_scene_s).toBeLessThan(0);
    expect(result.state?.convection.referencePressure_Pa).toBe(100000);
    expect(SimulationEngine.findManager(vessel.id)).toBeUndefined();
    expect(JSON.stringify(useAppStore.getState().vessels)).toBe(before);
  });
});
