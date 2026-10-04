import { describe, it, expect } from 'vitest';
import { determineBoilingStage, computeFluidViscosity, computeFluidDensity } from '../chemistry/PhaseEngine';
import { checkSaturation, getSolubilityProduct } from '../chemistry/SolubilityEngine';
import { BoilingSystem } from '../effects/BoilingSystem';
import { PrecipitationSystem } from '../effects/PrecipitationSystem';
import { EvaporationSystem } from '../effects/EvaporationSystem';
import { SimulationEngine } from '../core/SimulationEngine';
import { VesselState } from '../../types/chemistry';

describe('Phase & Thermodynamics Engine', () => {
  it('correctly classifies boiling stages based on temperature and heat power', () => {
    // 25°C - Cold stable
    const cold = determineBoilingStage(25.0, 100.0, 0);
    expect(cold.stage).toBe('COLD_STABLE');
    expect(cold.intensity).toBe(0);

    // 65°C - Warming convection
    const warm = determineBoilingStage(65.0, 100.0, 50);
    expect(warm.stage).toBe('WARMING_CONVECTION');

    // 88°C - Microbubble nucleation
    const micro = determineBoilingStage(88.0, 100.0, 100);
    expect(micro.stage).toBe('MICROBUBBLE_NUCLEATION');

    // 93.5°C - Boiling onset
    const onset = determineBoilingStage(93.5, 100.0, 0);
    expect(onset.stage).toBe('BOILING_ONSET');

    // 100°C - Active boil
    const boil = determineBoilingStage(100.0, 100.0, 400);
    expect(boil.stage === 'ACTIVE_BOIL' || boil.stage === 'INTENSE_ROLLING_BOIL').toBe(true);
    expect(boil.intensity).toBeGreaterThan(0.5);
  });

  it('computes realistic Andrade viscosity decrease with temperature', () => {
    const eta20 = computeFluidViscosity(20.0, 0);
    const eta80 = computeFluidViscosity(80.0, 0);
    expect(eta80).toBeLessThan(eta20);
    expect(eta20).toBeGreaterThan(0.9);
    expect(eta80).toBeLessThan(0.5);
  });
});

describe('Solubility & Precipitation Engine', () => {
  it('correctly predicts supersaturation and excess precipitate', () => {
    // BaSO4 is insoluble (Ksp ~ 1.1e-10) -> even 0.05g in 100mL precipitates
    const satBa = checkSaturation('BaSO4', 0.05, 100, 25);
    expect(satBa.isSupersaturated).toBe(true);
    expect(satBa.excessPrecipitate_g).toBeGreaterThan(0.04);

    // NaCl is highly soluble (~36g / 100mL) -> 5g in 100mL dissolves completely
    const satNaCl = checkSaturation('NaCl', 5.0, 100, 25);
    expect(satNaCl.isSupersaturated).toBe(false);
    expect(satNaCl.excessPrecipitate_g).toBe(0);
  });

  it('demonstrates temperature-dependent solubility for PbI2 (Golden Rain)', () => {
    // PbI2 is moderately soluble in hot water (0.42g/100mL at 100°C) but insoluble cold (0.076g/100mL at 20°C)
    const hot = checkSaturation('PbI2', 0.3, 100, 95);
    const cold = checkSaturation('PbI2', 0.3, 100, 20);
    expect(hot.excessPrecipitate_g).toBeLessThan(cold.excessPrecipitate_g);
    expect(cold.isSupersaturated).toBe(true);
  });
});

describe('Physical Effect Systems', () => {
  it('BoilingSystem spawns bubbles only at high temperature or onset', () => {
    const boiling = new BoilingSystem(50);
    // Cold: 0 bubbles
    boiling.update(0.1, {
      temp_c: 25,
      boilingPoint_c: 100,
      heatPower_W: 0,
      viscosity_mPa_s: 1.0,
      radius: 0.5,
      liquidBottomY: -0.8,
      surfaceY: 0.2,
      boilingStage: 'COLD_STABLE',
      boilingIntensity: 0
    });
    expect(boiling.bubbles.length).toBe(0);

    // Active boil: bubbles spawn with upward velocity
    for (let i = 0; i < 10; i++) {
      boiling.update(0.1, {
        temp_c: 100,
        boilingPoint_c: 100,
        heatPower_W: 300,
        viscosity_mPa_s: 0.3,
        radius: 0.5,
        liquidBottomY: -0.8,
        surfaceY: 0.2,
        boilingStage: 'ACTIVE_BOIL',
        boilingIntensity: 0.8
      });
    }
    expect(boiling.bubbles.length).toBeGreaterThan(0);
    expect(boiling.bubbles[0].vy).toBeGreaterThan(0);
  });

  it('PrecipitationSystem accumulates sediment bed and clarifies supernatant over time', () => {
    const precip = new PrecipitationSystem(80, 'BaSO4');
    // Seed with 0.5g precipitate
    precip.update(0.1, {
      temp_c: 25,
      viscosity_mPa_s: 1.0,
      density_g_ml: 1.0,
      radius: 0.5,
      liquidBottomY: -0.8,
      surfaceY: 0.2,
      precipitateAmount_g: 0.5,
      substance: 'BaSO4'
    });

    expect(precip.cloudiness).toBeGreaterThan(0);
    expect(precip.particles.length).toBeGreaterThan(0);

    // Let particles settle over time
    for (let i = 0; i < 50; i++) {
      precip.update(0.2, {
        temp_c: 25,
        viscosity_mPa_s: 1.0,
        density_g_ml: 1.0,
        radius: 0.5,
        liquidBottomY: -0.8,
        surfaceY: 0.2,
        precipitateAmount_g: 0.5,
        substance: 'BaSO4'
      });
    }

    // Sediment bed should accumulate on floor
    expect(precip.sedimentBed.amount_g).toBeGreaterThan(0);
    expect(precip.sedimentBed.thickness).toBeGreaterThan(0);
  });

  it('EvaporationSystem scales with temperature and surface area', () => {
    const evap = new EvaporationSystem(40);
    const coldEvap = evap.update(0.1, {
      temp_c: 25,
      surfaceArea_cm2: 50,
      radius: 0.5,
      surfaceY: 0.2,
      mouthY: 1.0,
      mouthRadius: 0.3,
      isBoiling: false
    });

    const hotEvap = evap.update(0.1, {
      temp_c: 95,
      surfaceArea_cm2: 50,
      radius: 0.5,
      surfaceY: 0.2,
      mouthY: 1.0,
      mouthRadius: 0.3,
      isBoiling: true
    });

    expect(hotEvap.evaporated_ml).toBeGreaterThan(coldEvap.evaporated_ml);
  });
});

describe('SimulationEngine Integrated Vessel Lifecycle', () => {
  it('manages vessel physics lifecycle consistently', () => {
    const vesselId = 'test_vessel_1';
    const mgr = SimulationEngine.getManager(vesselId, 'high');
    expect(mgr).toBeDefined();

    const mockVessel: VesselState = {
      id: vesselId,
      name: 'Beaker 250ml',
      type: 'beaker',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      volume_ml: 100,
      capacity_ml: 250,
      volume: 0.4,
      substances: ['H2O'],
      contents: [{ formula: 'H2O', mass_g: 100, concentration_m: 0 }],
      temperature_c: 25,
      isBoiling: false,
      hasPrecipitate: false
    };

    const res = mgr.step(mockVessel, 0.05, {
      heatPower_W: 200,
      ambientTemp_c: 25.0
    });

    expect(res.temperature_c).toBeGreaterThan(25.0);
    expect(res.volume_ml).toBeLessThanOrEqual(100);

    SimulationEngine.removeManager(vesselId);
  });
});
