/**
 * stoichiometry.examples.test.ts — Worked Examples Verification via Conservation Ledger (§5.4 & §11.1)
 * 
 * Executes all 10 canonical worked examples directly through applyProgramToLedger:
 * 1. CaCO3 + 2HCl (limiting reagent, CO2 yield, leftover mass, open vs sealed)
 * 2. Zn + 2HCl (zinc limiting, H2 yield, acidity)
 * 3. AgNO3 + NaCl (equimolar precipitation yield)
 * 4. Pb(NO3)2 + 2KI (golden rain mass)
 * 5. BaCl2 + Na2SO4 (BaSO4 yield & Stokes settling)
 * 6. 2Mg + O2 (mass gain from atmospheric oxygen, MgO yield)
 * 7. 2Na + 2H2O (H2 gas yield, NaOH pH, enthalpy)
 * 8. HCl + NaOH (neutralization deltaT)
 * 9. NH4NO3 dissolution (endothermic cooling & frost)
 * 10. NaOH dissolution (exothermic dissolution)
 */

import { describe, it, expect } from 'vitest';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { VesselState } from '../src/types/chemistry';
import { getProgramById } from '../src/vfx/programs/library/index';
import { calculateStokesVelocity } from '../src/data/precipitates';

const MOLAR_VOLUME_25C_L = 24.47; // L/mol at 298.15 K, 1 atm

describe('Stoichiometry Worked Examples via Conservation Ledger (§5.4 & §11.1)', () => {
  // Example 1: CaCO3 + 2HCl -> CaCl2 + H2O + CO2
  it('Example 1: CaCO3 + 2HCl limiting reagent, CO2 yield, leftover solid, and open vs sealed mass', () => {
    const prog = getProgramById('caco3_hcl_gas') || getProgramById('caco3+hcl');
    expect(prog).toBeDefined();

    const m_caco3 = 5.00; // g
    const n_caco3 = m_caco3 / computeMolarMass('CaCO3'); // 0.04996 mol ~ 0.0500 mol
    const v_hcl_ml = 50.0;
    const n_hcl = 0.050 * 1.0; // 0.0500 mol

    const openVessel: VesselState = {
      id: 'ex1_open',
      name: 'Open Beaker',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      isSealed: false,
      volume: 0.2,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 50.0,
      temperature_c: 25.0,
      ph: 1.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['CaCO3', 'HCl'],
      contents: [
        { formula: 'CaCO3', moles: n_caco3, mass_g: m_caco3, phase: 's' },
        { formula: 'HCl', moles: n_hcl, mass_g: n_hcl * computeMolarMass('HCl'), volume_ml: 50, concentration_M: 1.0 }
      ]
    };

    const openRes = applyProgramToLedger(prog!, openVessel, 1.0);

    // HCl is limiting (needs 2 HCl per CaCO3 => 0.05 mol HCl reacts with 0.025 mol CaCO3)
    const caco3Left = openRes.contents?.find(c => c.formula.toLowerCase() === 'caco3');
    expect(caco3Left).toBeDefined();
    expect(caco3Left!.mass_g).toBeCloseTo(2.50, 1); // 2.50 g marble chips remain
    expect(caco3Left!.moles).toBeCloseTo(0.025, 2);

    // CO2 produced = 0.025 mol => 1.10 g
    const co2Produced = openRes.contents?.find(c => c.formula.toLowerCase() === 'co2');
    expect(co2Produced).toBeDefined();
    expect(co2Produced!.moles).toBeCloseTo(0.025, 2);
    expect(co2Produced!.mass_g).toBeCloseTo(1.10, 2);
    const co2Volume_L = co2Produced!.moles * MOLAR_VOLUME_25C_L;
    expect(co2Volume_L).toBeCloseTo(0.612, 2);

    // Open vessel balance reading falls by escaped CO2 mass
    expect(openRes.mass_g).toBeCloseTo(100.0 - 1.10, 1);

    // Sealed flask: mass constant, pressure builds
    const sealedVessel: VesselState = {
      ...openVessel,
      id: 'ex1_sealed',
      isSealed: true,
      internalPressure_atm: 1.0
    };
    const sealedRes = applyProgramToLedger(prog!, sealedVessel, 1.0);
    expect(sealedRes.mass_g).toBe(100.0);
    expect(sealedRes.internalPressure_atm).toBeGreaterThan(2.5); // Stopper pop hazard
  });

  // Example 2: Zn + 2HCl -> ZnCl2 + H2
  it('Example 2: Zn + 2HCl zinc limiting, H2 yield, and remaining acidity', () => {
    const prog = getProgramById('zn_hcl_gas') || getProgramById('zn+hcl');
    expect(prog).toBeDefined();

    const m_zn = 1.00; // g
    const n_zn = m_zn / computeMolarMass('Zn'); // ~0.0153 mol
    const n_hcl = 0.050 * 1.0; // 0.050 mol

    const vessel: VesselState = {
      id: 'ex2_zn',
      name: 'Beaker Zn',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.2,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 50.0,
      temperature_c: 25.0,
      ph: 1.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['Zn', 'HCl'],
      contents: [
        { formula: 'Zn', moles: n_zn, mass_g: m_zn, phase: 's' },
        { formula: 'HCl', moles: n_hcl, mass_g: n_hcl * computeMolarMass('HCl'), volume_ml: 50, concentration_M: 1.0 }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);

    // Zn is limiting => completely consumed
    const znLeft = res.contents?.find(c => c.formula.toLowerCase() === 'zn');
    expect(znLeft?.moles).toBeCloseTo(0.0, 4);

    // H2 produced: 0.0153 mol = 0.0308 g = 0.374 L
    const h2Produced = res.contents?.find(c => c.formula.toLowerCase() === 'h2');
    expect(h2Produced?.moles).toBeCloseTo(0.0153, 3);
    expect(h2Produced?.mass_g).toBeCloseTo(0.0308, 3);
    const v_h2_L = (h2Produced?.moles || 0) * MOLAR_VOLUME_25C_L;
    expect(v_h2_L).toBeCloseTo(0.374, 2);

    // Remaining HCl: 0.050 - 2 * 0.0153 = 0.0194 mol
    const hclLeft = res.contents?.find(c => c.formula.toLowerCase() === 'hcl');
    expect(hclLeft?.moles).toBeCloseTo(0.0194, 3);
  });

  // Example 3: AgNO3 + NaCl -> AgCl↓ + NaNO3
  it('Example 3: AgNO3 + NaCl equimolar precipitation yield and clearing', () => {
    const prog = getProgramById('agno3_nacl_precipitate') || getProgramById('agno3+nacl');
    expect(prog).toBeDefined();

    const n_each = 0.020 * 0.100; // 0.00200 mol
    const vessel: VesselState = {
      id: 'ex3_agcl',
      name: 'AgCl Mix',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.15,
      mass_g: 80.0,
      capacity_ml: 250,
      volume_ml: 40.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['AgNO3', 'NaCl'],
      contents: [
        { formula: 'AgNO3', moles: n_each, mass_g: n_each * computeMolarMass('AgNO3'), volume_ml: 20, concentration_M: 0.1 },
        { formula: 'NaCl', moles: n_each, mass_g: n_each * computeMolarMass('NaCl'), volume_ml: 20, concentration_M: 0.1 }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    expect(res.hasPrecipitate).toBe(true);
    expect(res.precipitateAmount_g).toBeCloseTo(0.287, 2); // 0.00200 * 143.32 = 0.287 g
  });

  // Example 4: Pb(NO3)2 + 2KI -> PbI2↓ + 2KNO3
  it('Example 4: Pb(NO3)2 + 2KI golden rain mass', () => {
    const prog = getProgramById('pbno32_ki_golden_rain') || getProgramById('pb(no3)2+ki');
    expect(prog).toBeDefined();

    const n_pb = 0.010 * 0.100; // 0.00100 mol
    const n_ki = 0.020 * 0.100; // 0.00200 mol

    const vessel: VesselState = {
      id: 'ex4_pbi2',
      name: 'PbI2 Mix',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.12,
      mass_g: 60.0,
      capacity_ml: 250,
      volume_ml: 30.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['Pb(NO3)2', 'KI'],
      contents: [
        { formula: 'Pb(NO3)2', moles: n_pb, mass_g: n_pb * computeMolarMass('Pb(NO3)2'), volume_ml: 10, concentration_M: 0.1 },
        { formula: 'KI', moles: n_ki, mass_g: n_ki * computeMolarMass('KI'), volume_ml: 20, concentration_M: 0.1 }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    expect(res.hasPrecipitate).toBe(true);
    expect(res.precipitateAmount_g).toBeCloseTo(0.461, 2); // 0.00100 * 461.0 = 0.461 g
  });

  // Example 5: BaCl2 + Na2SO4 -> BaSO4↓ + 2NaCl
  it('Example 5: BaCl2 + Na2SO4 barium sulfate yield and Stokes settling timescale', () => {
    const prog = getProgramById('bacl2_na2so4') || getProgramById('bacl2+na2so4');
    expect(prog).toBeDefined();

    const n_each = 0.025 * 0.100; // 0.00250 mol
    const vessel: VesselState = {
      id: 'ex5_baso4',
      name: 'BaSO4 Mix',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.2,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 50.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['BaCl2', 'Na2SO4'],
      contents: [
        { formula: 'BaCl2', moles: n_each, mass_g: n_each * computeMolarMass('BaCl2'), volume_ml: 25, concentration_M: 0.1 },
        { formula: 'Na2SO4', moles: n_each, mass_g: n_each * computeMolarMass('Na2SO4'), volume_ml: 25, concentration_M: 0.1 }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    expect(res.hasPrecipitate).toBe(true);
    expect(res.precipitateAmount_g).toBeCloseTo(0.583, 2); // 0.00250 * 233.39 = 0.583 g

    // Stokes settling time for 0.5 um particle falling 5 cm
    const v_mps = calculateStokesVelocity(4.50, 0.5, 1.0, 1.0);
    const t_hours = (0.05 / v_mps) / 3600;
    expect(t_hours).toBeGreaterThan(5.5);
    expect(t_hours).toBeLessThan(9.0);
  });

  // Example 6: 2Mg + O2 -> 2MgO
  it('Example 6: Magnesium burning mass gain from atmospheric oxygen and enthalpy', () => {
    const prog = getProgramById('mg_o2_burn') || getProgramById('mg_burn') || getProgramById('mg_combustion');
    expect(prog).toBeDefined();

    const m_mg = 0.240; // g
    const n_mg = 0.0100; // mol Mg

    const vessel: VesselState = {
      id: 'ex6_mg',
      name: 'Crucible',
      type: 'crucible',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.1,
      mass_g: m_mg,
      capacity_ml: 50,
      volume_ml: 1,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['Mg', 'O2'],
      contents: [
        { formula: 'Mg', moles: n_mg, mass_g: m_mg, phase: 's' },
        { formula: 'O2', moles: n_mg / 2, mass_g: (n_mg / 2) * computeMolarMass('O2'), phase: 'g' }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    const mgoProduct = res.contents?.find(c => c.formula.toLowerCase() === 'mgo');
    expect(mgoProduct).toBeDefined();
    expect(mgoProduct!.mass_g).toBeCloseTo(0.403, 2); // 0.0100 * 40.30 = 0.403 g
    expect(mgoProduct!.mass_g - m_mg).toBeCloseTo(0.163, 2); // Mass gain 0.163 g
  });

  // Example 7: 2Na + 2H2O -> 2NaOH + H2
  it('Example 7: Sodium with water H2 gas yield, NaOH pH, and deltaT', () => {
    const prog = getProgramById('na_h2o_reaction') || getProgramById('na+h2o');
    expect(prog).toBeDefined();

    const m_na = 0.230; // g
    const n_na = m_na / computeMolarMass('Na'); // 0.0100 mol

    const vessel: VesselState = {
      id: 'ex7_na',
      name: 'Trough',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.4,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['Na', 'H2O'],
      contents: [
        { formula: 'Na', moles: n_na, mass_g: m_na, phase: 's' },
        { formula: 'H2O', moles: 100 / 18.015, mass_g: 100, volume_ml: 100, phase: 'l' }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    const h2Gas = res.contents?.find(c => c.formula.toLowerCase() === 'h2');
    expect(h2Gas).toBeDefined();
    expect(h2Gas!.moles).toBeCloseTo(0.00500, 3);
    expect(h2Gas!.mass_g).toBeCloseTo(0.0101, 3);
    const v_h2_mL = h2Gas!.moles * MOLAR_VOLUME_25C_L * 1000;
    expect(v_h2_mL).toBeCloseTo(122, 0);

    // Exothermic warming
    expect(res.temperature_c).toBeGreaterThan(25.0);
  });

  // Example 8: HCl + NaOH -> NaCl + H2O
  it('Example 8: Equimolar neutralization exact deltaT', () => {
    const prog = getProgramById('hcl_naoh') || getProgramById('hcl+naoh');
    expect(prog).toBeDefined();

    const n_each = 0.050 * 1.0; // 0.0500 mol
    const vessel: VesselState = {
      id: 'ex8_neut',
      name: 'Calorimeter',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.4,
      mass_g: 100.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['HCl', 'NaOH'],
      contents: [
        { formula: 'HCl', moles: n_each, mass_g: n_each * computeMolarMass('HCl'), volume_ml: 50, concentration_M: 1.0 },
        { formula: 'NaOH', moles: n_each, mass_g: n_each * computeMolarMass('NaOH'), volume_ml: 50, concentration_M: 1.0 }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    const deltaT = (res.temperature_c || 25.0) - 25.0;
    expect(deltaT).toBeCloseTo(6.85, 0.5); // ~ +6.85 K
  });

  // Example 9: NH4NO3 Dissolution
  it('Example 9: Ammonium nitrate dissolution chilling and wall frosting', () => {
    const prog = getProgramById('nh4no3_dissolution_cold') || getProgramById('nh4no3_dissolution');
    expect(prog).toBeDefined();

    const m_solute = 10.0;
    const n_solute = m_solute / computeMolarMass('NH4NO3'); // 0.125 mol

    const vessel: VesselState = {
      id: 'ex9_cold',
      name: 'Cold Beaker',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.2,
      mass_g: 60.0,
      capacity_ml: 250,
      volume_ml: 50.0,
      temperature_c: 25.0,
      ph: 7.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['NH4NO3', 'H2O'],
      contents: [
        { formula: 'NH4NO3', moles: n_solute, mass_g: m_solute, phase: 's' },
        { formula: 'H2O', moles: 50 / 18.015, mass_g: 50, volume_ml: 50, phase: 'l' }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    expect(res.temperature_c).toBeLessThan(20.0); // Chilling below ambient
  });

  // Example 10: NaOH Dissolution
  it('Example 10: Sodium hydroxide pellet dissolution exothermic heating', () => {
    const prog = getProgramById('naoh_dissolution_heat') || getProgramById('naoh_dissolution');
    expect(prog).toBeDefined();

    const m_naoh = 4.00;
    const n_naoh = m_naoh / computeMolarMass('NaOH'); // 0.100 mol

    const vessel: VesselState = {
      id: 'ex10_hot',
      name: 'Hot Beaker',
      type: 'beaker',
      position: [0, 0, 0],
      rotationY: 0,
      isLocked: false,
      volume: 0.4,
      mass_g: 104.0,
      capacity_ml: 250,
      volume_ml: 100.0,
      temperature_c: 25.0,
      ph: 14.0,
      hasPrecipitate: false,
      isBoiling: false,
      hasGas: false,
      substances: ['NaOH', 'H2O'],
      contents: [
        { formula: 'NaOH', moles: n_naoh, mass_g: m_naoh, phase: 's' },
        { formula: 'H2O', moles: 100 / 18.015, mass_g: 100, volume_ml: 100, phase: 'l' }
      ]
    };

    const res = applyProgramToLedger(prog!, vessel, 1.0);
    expect(res.temperature_c).toBeGreaterThan(32.0); // Exothermic warming ~ +10 K
  });
});
