/**
 * realism_engine.test.ts — Unit and Integration Tests for Realism Physics & Chemistry Grounding
 *
 * Verifies:
 * 1. P0.3 Concentration & mole bookkeeping (cumulative addition, concentration recalculation)
 * 2. Invariant check on all presets in setupExperimentPreset (|moles - mass_g / Mw| / moles < 2%)
 * 3. P1.1-lite Thermal model scaling (10 mL water heats ~6x faster than 100 mL water due to C_total = m*cp + C_glass)
 * 4. P1.3 Reaction calorimetry (50 mL 1 M HCl + 50 mL 1 M NaOH yields Delta T ~ +6.3 to 6.8 K)
 * 5. P1.5-lite Colligative boiling-point elevation (3 mol/kg NaCl boils at ~102.8 °C; exceeds 100 °C clamp)
 * 6. P4.2 Stoichiometric precipitate mass calculation (Golden Rain ~0.92 g, BaSO4 stoichiometric scaling)
 * 7. P2.10 & P2.5 Limewater excess CO2 clearing (milky CaCO3 dissolves to crystal clear Ca(HCO3)2 in excess CO2)
 */

import { describe, it, expect } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { findChemical } from '../src/data/chemicals';
import { evaluateLocalChemistry } from '../src/engine/chemistryEngine';
import { SimulationEngine } from '../src/simulation/core/SimulationEngine';
import { VesselState } from '../src/types/chemistry';

describe('Realism Engine: Physical & Chemical Invariants', () => {
  // Test 1: Concentration & mole bookkeeping fix (P0.3)
  it('correctly tracks moles and recalculates concentration upon incremental reagent additions', async () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Concentration Test Beaker');
    const vesselId = useAppStore.getState().vesselIds[useAppStore.getState().vesselIds.length - 1];

    store.setVesselState(vesselId, {
      volume_ml: 0,
      mass_g: 0,
      substances: [],
      contents: []
    });

    // Step 1: Add 20 mL of 1.0 M NaOH (liquid reagent with defaultConcentration = 1.0)
    await store.mixSubstances(vesselId, 'NaOH', 20);
    let v = useAppStore.getState().vessels[vesselId];
    expect(v.volume_ml).toBe(20);
    let naohItem = v.contents.find(c => c.formula === 'NaOH');
    expect(naohItem).toBeDefined();
    // 20 mL * 1.0 M = 0.020 mol
    expect(naohItem!.moles).toBeCloseTo(0.020, 3);
    expect(naohItem!.concentration_M).toBeCloseTo(1.0, 2);

    // Step 2: Add another 20 mL of 1.0 M NaOH
    await store.mixSubstances(vesselId, 'NaOH', 20);
    v = useAppStore.getState().vessels[vesselId];
    expect(v.volume_ml).toBe(40);
    naohItem = v.contents.find(c => c.formula === 'NaOH');
    expect(naohItem).toBeDefined();
    // Cumulative: 0.020 + 0.020 = 0.040 mol in 40 mL -> concentration remains 1.0 M
    expect(naohItem!.moles).toBeCloseTo(0.040, 3);
    expect(naohItem!.concentration_M).toBeCloseTo(1.0, 2);

    // Clean up
    store.removeVessel(vesselId);
  });

  // Test 2: Invariant check on all presets in setupExperimentPreset
  it('satisfies physical mass-mole invariant (|moles - mass_g / Mw| / moles < 2%) across all experiment presets', () => {
    const PRESET_IDS = [
      'acid_base_titration',
      'golden_rain_synthesis',
      'co2_gas_evolution',
      'iron_copper_redox',
      'mass_conservation_bacl2_na2so4',
      'catalytic_oxygen_prep',
      'thermal_decomp_cuoh2',
      'redox_gas_cu_hno3',
      'alkali_metal_water_na',
      'acid_safety_dilution',
      'agcl_curdy_precipitation',
      'exothermic_neutralization',
      'zn_hcl_hydrogen_production',
      'landolt_iodine_clock',
      'fe_kscn_chemical_equilibrium',
      'copper_ammonia_deep_blue',
      'al_amphoteric_hydroxide',
      'thiosulfate_acid_clock',
      'permanganate_oxalate_redox',
    ];

    const store = useAppStore.getState();

    for (const presetId of PRESET_IDS) {
      store.setupExperimentPreset(presetId);
      const currentVessels = Object.values(useAppStore.getState().vessels);

      for (const vessel of currentVessels) {
        if (!vessel.contents || vessel.contents.length === 0) continue;

        for (const item of vessel.contents) {
          if (item.formula === 'H2O') {
            const theoretical = item.mass_g / 18.015;
            const diff = Math.abs(item.moles - theoretical) / item.moles;
            expect(diff, `Preset ${presetId} vessel ${vessel.name} water moles mismatch`).toBeLessThan(0.02);
          } else {
            const chem = findChemical(item.formula);
            if (chem && chem.molarMass && item.moles > 0) {
              const theoretical = item.mass_g / chem.molarMass;
              const diff = Math.abs(item.moles - theoretical) / item.moles;
              expect(
                diff,
                `Preset ${presetId} vessel ${vessel.name} item ${item.formula}: moles=${item.moles}, mass=${item.mass_g}, Mw=${chem.molarMass}`
              ).toBeLessThan(0.02);
            }
          }
        }
      }
    }
  });

  // Test 3: Thermal model scaling (P1.1-lite)
  it('scales thermal rise rate with specific heat capacity + glass mass (10 mL water heats ~6x faster than 100 mL)', () => {
    SimulationEngine.clearAll();

    const mockVessel10: VesselState = {
      id: 'vessel_10ml',
      name: 'Beaker 10mL',
      type: 'beaker',
      capacity_ml: 100,
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume_ml: 10,
      volume: 10 / 100,
      mass_g: 10,
      temperature_c: 25.0,
      liquidColor: '#38bdf8',
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['H2O'],
      contents: [{ formula: 'H2O', moles: 10 / 18.015, mass_g: 10 }]
    };

    const mockVessel100: VesselState = {
      id: 'vessel_100ml',
      name: 'Beaker 100mL',
      type: 'beaker',
      capacity_ml: 250,
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume_ml: 100,
      volume: 100 / 250,
      mass_g: 100,
      temperature_c: 25.0,
      liquidColor: '#38bdf8',
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['H2O'],
      contents: [{ formula: 'H2O', moles: 100 / 18.015, mass_g: 100 }]
    };

    const mgr10 = SimulationEngine.getManager(mockVessel10.id);
    const mgr100 = SimulationEngine.getManager(mockVessel100.id);

    const res10 = mgr10.step(mockVessel10, 1.0, { heatPower_W: 50, ambientTemp_c: 25.0 });
    const res100 = mgr100.step(mockVessel100, 1.0, { heatPower_W: 50, ambientTemp_c: 25.0 });

    const dT10 = res10.temperature_c - 25.0;
    const dT100 = res100.temperature_c - 25.0;

    // Theoretical: (100 * 4.184 + 33.2) / (10 * 4.184 + 33.2) = 451.6 / 75.04 = 6.018
    const ratio = dT10 / dT100;
    expect(ratio).toBeGreaterThan(5.5);
    expect(ratio).toBeLessThan(6.5);
  });

  // Test 4: Reaction calorimetry (P1.3)
  it('calculates physical enthalpy release for strong acid-base neutralization (+6.3 to +6.8 K)', () => {
    // 50 mL 1 M HCl + 50 mL 1 M NaOH -> total volume 100 mL, xi = 0.05 mol, deltaH = -57.1 kJ/mol
    const result = evaluateLocalChemistry(
      ['HCl', 'NaOH'],
      100,
      25.0,
      false,
      'en',
      [
        { formula: 'HCl', moles: 0.05, mass_g: 1.82 },
        { formula: 'NaOH', moles: 0.05, mass_g: 2.00 }
      ]
    );

    expect(result).not.toBeNull();
    expect(result!.reaction_id).toBe('hcl_naoh_neutralization');
    expect(result!.new_vessel_state.temperature_c).toBeDefined();

    const finalTemp = result!.new_vessel_state.temperature_c!;
    const deltaT = finalTemp - 25.0;

    // Delta T = (57100 J/mol * 0.05 mol) / (100 g * 4.184 J/gK + 33.2 J/K) = 2855 / 451.6 = 6.32 K
    expect(deltaT).toBeGreaterThanOrEqual(6.2);
    expect(deltaT).toBeLessThanOrEqual(6.8);
    expect(finalTemp).toBeCloseTo(31.3, 1);
  });

  // Test 5: Colligative boiling point elevation (P1.5-lite)
  it('elevates water boiling point above 100 °C for concentrated salt solutions (3 mol/kg NaCl boils at ~102.8 °C)', () => {
    SimulationEngine.clearAll();

    // 100 mL solution with 3 molal NaCl
    // solvent ~ 0.095 kg, dissolved moles = 3 * 0.095 = 0.285 mol
    const naclVessel: VesselState = {
      id: 'vessel_nacl_boil',
      name: 'Beaker 3m NaCl',
      type: 'beaker',
      capacity_ml: 250,
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume_ml: 100,
      volume: 100 / 250,
      mass_g: 110,
      temperature_c: 98.0,
      liquidColor: '#f8fafc',
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['H2O', 'NaCl'],
      contents: [
        { formula: 'H2O', moles: 95 / 18.015, mass_g: 95 },
        { formula: 'NaCl', moles: 0.285, mass_g: 0.285 * 58.44 }
      ]
    };

    const mgr = SimulationEngine.getManager(naclVessel.id);

    // Heat intensely over several seconds to reach boiling limit
    let currentVessel = { ...naclVessel };
    for (let i = 0; i < 20; i++) {
      const step = mgr.step(currentVessel, 0.5, { heatPower_W: 100, ambientTemp_c: 25.0 });
      currentVessel = { ...currentVessel, ...step };
    }

    // Boiling point elevation: Tb = 100 + 0.512 * (0.285 * 1.8 / 0.095) = 100 + 0.512 * 5.4 = 102.76 °C
    // Temperature must exceed standard 100.0 °C and cap at ~102.8 °C
    expect(currentVessel.temperature_c).toBeGreaterThan(101.5);
    expect(currentVessel.temperature_c).toBeLessThanOrEqual(102.8);
  });

  // Test 6: Stoichiometric precipitate mass (P4.2)
  it('determines precipitate mass strictly from reaction extent and molar mass', () => {
    // Case A: Golden Rain (Pb(NO3)2 + 2KI -> PbI2 + 2KNO3)
    // 0.002 mol Pb(NO3)2 + 0.004 mol KI -> xi = 0.002 mol, Mw(PbI2) = 461.01 g/mol -> 0.92 g
    const goldenRainRes = evaluateLocalChemistry(
      ['Pb(NO3)2', 'KI'],
      80,
      25.0,
      false,
      'en',
      [
        { formula: 'Pb(NO3)2', moles: 0.002, mass_g: 0.662 },
        { formula: 'KI', moles: 0.004, mass_g: 0.664 }
      ]
    );

    expect(goldenRainRes).not.toBeNull();
    expect(goldenRainRes!.reaction_id).toBe('golden_rain_pbi2');
    expect(goldenRainRes!.new_vessel_state.has_precipitate).toBe(true);
    expect(goldenRainRes!.new_vessel_state.precipitate_substance).toBe('PbI2');
    expect(goldenRainRes!.new_vessel_state.precipitate_amount_g).toBeCloseTo(0.92, 2);

    // Case B: Barium Sulfate Precipitation (BaCl2 + Na2SO4 -> BaSO4 + 2NaCl)
    // 0.010 mol BaCl2 + 0.010 mol Na2SO4 -> xi = 0.010 mol, Mw(BaSO4) = 233.39 g/mol -> 2.33 g
    const baso4Res = evaluateLocalChemistry(
      ['BaCl2', 'Na2SO4'],
      100,
      25.0,
      false,
      'en',
      [
        { formula: 'BaCl2', moles: 0.01, mass_g: 2.08 },
        { formula: 'Na2SO4', moles: 0.01, mass_g: 1.42 }
      ]
    );

    expect(baso4Res).not.toBeNull();
    expect(baso4Res!.reaction_id).toBe('bacl2_na2so4_conservation');
    expect(baso4Res!.new_vessel_state.has_precipitate).toBe(true);
    expect(baso4Res!.new_vessel_state.precipitate_substance).toBe('BaSO4');
    expect(baso4Res!.new_vessel_state.precipitate_amount_g).toBeCloseTo(2.33, 2);
  });

  // Test 7: Limewater excess CO2 clearing (P2.10 & P2.5)
  it('demonstrates excess reagent clearing: limewater turns milky then clears in excess CO2', () => {
    // Stage 1: Initial CO2 bubbling into clear limewater produces milky CaCO3 precipitate
    const stage1 = evaluateLocalChemistry(['Ca(OH)2', 'CO2'], 50, 25.0, false, 'en');
    expect(stage1).not.toBeNull();
    expect(stage1!.reaction_id).toBe('limewater_co2_milky');
    expect(stage1!.new_vessel_state.has_precipitate).toBe(true);
    expect(stage1!.new_vessel_state.precipitate_substance).toBe('CaCO3');
    expect(stage1!.new_vessel_state.precipitate_color).toBe('#ffffff');

    // Stage 2: Excess CO2 bubbling into milky CaCO3 suspension dissolves the precipitate back to clear Ca(HCO3)2
    const stage2 = evaluateLocalChemistry(['CaCO3', 'CO2'], 50, 25.0, false, 'en');
    expect(stage2).not.toBeNull();
    expect(stage2!.reaction_id).toBe('caco3_co2_excess_clearing');
    expect(stage2!.new_vessel_state.has_precipitate).toBe(false);
    expect(stage2!.products).toContain('Ca(HCO3)2');
  });
});
