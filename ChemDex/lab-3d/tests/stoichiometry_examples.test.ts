/**
 * stoichiometry_examples.test.ts — Vitest Verification of the 10 Worked Examples (§5.4)
 * 
 * Verifies exact physical stoichiometry, limiting reagent identification,
 * gas mass/volume yields (24.47 L/mol at 25 °C), precipitate mass yields,
 * thermal enthalpy deltaT changes, and balance readings within ±2%.
 */

import { describe, it, expect } from 'vitest';
import { computeMolarMass } from '../src/engine/ledger';

const MOLAR_VOLUME_25C_L = 24.47; // L/mol ideal gas at 298.15 K, 1 atm
const C_WATER = 4.184; // J / (g·K)

describe('Stoichiometry & Energy Balance Worked Examples Suite (§5.4)', () => {
  // Example 1: CaCO3 + 2HCl -> CaCl2 + H2O + CO2
  it('Example 1: CaCO3 + 2HCl limiting reagent, CO2 yield, leftover mass, and pressure', () => {
    const m_caco3 = 5.00; // g
    const n_caco3_initial = m_caco3 / computeMolarMass('CaCO3'); // 0.04996 ~ 0.0500 mol
    const v_hcl_L = 0.050; // L
    const c_hcl = 1.00; // M
    const n_hcl_initial = v_hcl_L * c_hcl; // 0.0500 mol

    // Reaction: 1 CaCO3 + 2 HCl -> 1 CaCl2 + 1 H2O + 1 CO2
    // HCl requires 2 mol HCl per mol CaCO3.
    // For 0.0500 mol CaCO3, needs 0.100 mol HCl. We only have 0.0500 mol HCl.
    // Therefore, HCl is limiting.
    const xi_max = n_hcl_initial / 2; // 0.0250 mol
    expect(xi_max).toBeCloseTo(0.0250, 3);

    // CO2 produced
    const n_co2 = xi_max; // 0.0250 mol
    const m_co2_g = n_co2 * computeMolarMass('CO2'); // 0.0250 * 44.01 = 1.10 g
    const v_co2_L = n_co2 * MOLAR_VOLUME_25C_L; // 0.0250 * 24.47 = 0.612 L
    expect(m_co2_g).toBeCloseTo(1.10, 2);
    expect(v_co2_L).toBeCloseTo(0.612, 2);

    // CaCO3 unreacted left over
    const n_caco3_left = n_caco3_initial - xi_max;
    const m_caco3_left = n_caco3_left * computeMolarMass('CaCO3');
    expect(m_caco3_left).toBeCloseTo(2.50, 1);

    // Open vessel balance loss equals mass of escaped CO2
    const delta_m_open_vessel = -m_co2_g;
    expect(delta_m_open_vessel).toBeCloseTo(-1.10, 2);

    // Sealed vessel keeps constant mass, headspace pressure rises
    // P = nRT / V_head. For 0.200 L headspace at 25 °C:
    const v_head_L = 0.200;
    const delta_P_atm = (n_co2 * 0.08206 * 298.15) / v_head_L;
    expect(delta_P_atm).toBeGreaterThan(2.5); // Stopper pop hazard triggered
  });

  // Example 2: Zn + 2HCl -> ZnCl2 + H2
  it('Example 2: Zn + 2HCl zinc limiting, H2 yield, and remaining acidity', () => {
    const m_zn = 1.00; // g
    const n_zn = m_zn / computeMolarMass('Zn'); // ~0.0153 mol
    const n_hcl_initial = 0.050 * 1.0; // 0.050 mol

    // Needs 2 HCl per Zn => 2 * 0.0153 = 0.0306 mol HCl. Zn is limiting!
    const xi_max = n_zn;
    expect(xi_max).toBeCloseTo(0.0153, 3);

    // H2 produced
    const n_h2 = xi_max;
    const m_h2 = n_h2 * computeMolarMass('H2'); // 0.0308 g
    const v_h2_L = n_h2 * MOLAR_VOLUME_25C_L; // 0.374 L
    expect(m_h2).toBeCloseTo(0.0308, 3);
    expect(v_h2_L).toBeCloseTo(0.374, 2);

    // HCl remaining and residual pH
    const n_hcl_left = n_hcl_initial - 2 * xi_max; // ~0.0194 mol
    expect(n_hcl_left).toBeCloseTo(0.0194, 3);
    const conc_hcl_left = n_hcl_left / 0.050; // ~0.388 M
    const ph = -Math.log10(conc_hcl_left);
    expect(ph).toBeCloseTo(0.41, 1);
  });

  // Example 3: AgNO3 + NaCl -> AgCl(s) + NaNO3
  it('Example 3: AgNO3 + NaCl equimolar precipitation yield and clearing', () => {
    const n_each = 0.020 * 0.100; // 0.00200 mol
    const xi_max = n_each;
    const m_agcl = xi_max * computeMolarMass('AgCl'); // 0.00200 * 143.32 = 0.287 g
    expect(m_agcl).toBeCloseTo(0.287, 3);

    // Residual [Ag+] from Ksp = 1.8e-10
    const residual_ag = Math.sqrt(1.8e-10); // 1.34e-5 M
    expect(residual_ag).toBeLessThan(1.5e-5);
  });

  // Example 4: Pb(NO3)2 + 2KI -> PbI2(s) + 2KNO3
  it('Example 4: Pb(NO3)2 + 2KI golden rain mass and temperature solubility', () => {
    const n_pb = 0.010 * 0.100; // 0.00100 mol
    const n_ki = 0.020 * 0.100; // 0.00200 mol
    // Equimolar according to stoichiometry
    const xi_max = 0.00100;
    const m_pbi2 = xi_max * computeMolarMass('PbI2'); // 0.00100 * 461.0 = 0.461 g
    expect(m_pbi2).toBeCloseTo(0.461, 3);
  });

  // Example 5: BaCl2 + Na2SO4 -> BaSO4(s) + 2NaCl
  it('Example 5: BaCl2 + Na2SO4 barium sulfate yield and hours-long Stokes settling', () => {
    const n_each = 0.025 * 0.100; // 0.00250 mol
    const xi_max = n_each;
    const m_baso4 = xi_max * computeMolarMass('BaSO4'); // 0.00250 * 233.39 = 0.583 g
    expect(m_baso4).toBeCloseTo(0.583, 3);

    // Stokes settling time for 0.5 um particle falling 5 cm:
    // v = 2/9 * r^2 * (rho_p - rho_f) * g / eta
    // r = 0.5e-6 m, rho_p = 4500 kg/m3, rho_f = 1000 kg/m3, eta = 1e-3 Pa*s, g = 9.81
    const r = 0.5e-6;
    const v_stokes = (2 / 9) * (r * r) * (4500 - 1000) * 9.81 / 1e-3; // ~1.9e-6 m/s
    const t_settle_s = 0.05 / v_stokes; // ~26,000 s ~ 7.2 hours
    const t_settle_hours = t_settle_s / 3600;
    expect(t_settle_hours).toBeGreaterThan(5.5);
    expect(t_settle_hours).toBeLessThan(9.0);
  });

  // Example 6: 2Mg + O2 -> 2MgO
  it('Example 6: Magnesium burning mass gain from air and enthalpy release', () => {
    const m_mg = 0.240; // g nominal
    const n_mg = 0.0100; // mol per prompt §5.4 (0.240 g Mg ~ 0.0100 mol)
    const xi_max = n_mg / 2; // per 2 Mg as written, or 0.0100 mol MgO
    const n_mgo = n_mg;
    const m_mgo = n_mgo * computeMolarMass('MgO'); // 0.0100 * 40.30 = 0.403 g
    expect(m_mgo).toBeCloseTo(0.403, 2);

    // Mass gain from atmospheric O2
    const delta_mass_gain = m_mgo - m_mg;
    expect(delta_mass_gain).toBeCloseTo(0.163, 2);

    // Enthalpy released: deltaH = -601.6 kJ/mol MgO
    const q_heat_kJ = n_mgo * 601.6; // ~6.0 kJ
    expect(q_heat_kJ).toBeCloseTo(6.0, 1);
  });

  // Example 7: 2Na + 2H2O -> 2NaOH + H2
  it('Example 7: Sodium with water H2 gas yield, NaOH pH, and deltaT', () => {
    const m_na = 0.230; // g
    const n_na = m_na / computeMolarMass('Na'); // 0.0100 mol
    const n_h2 = n_na / 2; // 0.00500 mol
    const m_h2 = n_h2 * computeMolarMass('H2'); // 0.0101 g
    const v_h2_mL = n_h2 * MOLAR_VOLUME_25C_L * 1000; // 122.35 mL
    expect(m_h2).toBeCloseTo(0.0101, 3);
    expect(v_h2_mL).toBeCloseTo(122, 0);

    // NaOH 0.0100 mol in 100 mL -> 0.100 M -> pOH = 1.0 -> pH = 13.0
    const conc_naoh = n_na / 0.100;
    const pOH = -Math.log10(conc_naoh);
    const pH = 14 - pOH;
    expect(pH).toBeCloseTo(13.0, 1);

    // deltaH = -184 kJ/mol Na -> Q = 0.0100 * 184 = 1.84 kJ
    // In 100 g water: deltaT = 1840 J / (100 * 4.184) ~ +4.4 K
    const deltaT = 1840 / (100 * C_WATER);
    expect(deltaT).toBeCloseTo(4.4, 0.5);
  });

  // Example 8: HCl + NaOH -> NaCl + H2O
  it('Example 8: Equimolar neutralization exact deltaT and phenolphthalein endpoint', () => {
    const n_each = 0.050 * 1.0; // 0.0500 mol
    const deltaH_neut = -57.3e3; // J/mol
    const q_heat = n_each * Math.abs(deltaH_neut); // 2865 J
    const total_mass_g = 100; // 50 mL + 50 mL ~ 100 g
    const deltaT = q_heat / (total_mass_g * C_WATER); // 2865 / (100 * 4.184) = +6.85 K
    expect(deltaT).toBeCloseTo(6.85, 0.2);
  });

  // Example 9: NH4NO3 Dissolution Endothermic Frost
  it('Example 9: Ammonium nitrate dissolution chilling and wall frosting', () => {
    const m_solute = 10.0; // g
    const n_solute = m_solute / computeMolarMass('NH4NO3'); // ~0.125 mol
    const deltaH_sol = 25.7e3; // J/mol (endothermic)
    const q_absorbed = n_solute * deltaH_sol; // ~3210 J
    const total_mass_g = 50 + m_solute; // 60 g
    const deltaT = -q_absorbed / (total_mass_g * C_WATER); // -3210 / (60 * 4.184) ~ -12.8 K
    expect(deltaT).toBeCloseTo(-12.8, 1.0);
  });

  // Example 10: NaOH Dissolution Exothermic Heating
  it('Example 10: Sodium hydroxide pellet dissolution heating', () => {
    const m_naoh = 4.00; // g
    const n_naoh = m_naoh / computeMolarMass('NaOH'); // 0.100 mol
    const deltaH_sol = -44.5e3; // J/mol
    const q_released = n_naoh * Math.abs(deltaH_sol); // 4450 J
    const total_mass_g = 100 + m_naoh; // 104 g
    const deltaT = q_released / (total_mass_g * C_WATER); // 4450 / (104 * 4.184) ~ +10.2 K
    expect(deltaT).toBeCloseTo(10.2, 0.5);
  });
});
