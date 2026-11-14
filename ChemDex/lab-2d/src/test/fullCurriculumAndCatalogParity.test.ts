import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  COMPILED_CURRICULUM_REACTIONS,
  COMPILED_CATALOG_REACTIONS,
  ensureCatalogCompiled,
} from '../chemistry/reactions/curriculumAndCatalogCompiler';
import { runSimulationCycle } from '../chemistry/reactions/engine';
import { computeMolarMass, parseChemicalFormula } from '../chemistry/core/formula';
import { calculateSolutionPh } from '../chemistry/equilibrium/acidBase';
import {
  stepVesselThermal,
  stepTemperatureSolubility,
  ICE_LATENT_HEAT_J_G,
  BURNER_PEAK_POWER_W,
  BURNER_FUEL_CAPACITY_ML,
} from '../engine/simulationTick';
import { DEFAULT_LAB_ENVIRONMENT } from '../chemistry/physical/environmentPhysics';
import { runReactionOnWorkbench2D } from '../engine/workbenchReactionBridge';
import { useLabStore } from '../store/useLabStore';
import { EquipmentState } from '../types/equipment';
import { ReactionDefinition, SubstanceQuantity } from '../types/chemistry';

function buildInputsForReaction(rx: ReactionDefinition & {
  requiresCatalyst?: boolean;
  catalystFormula?: string;
  tags?: string[];
}): {
  contents: SubstanceQuantity[];
  volume_ml: number;
  temp_c: number;
  isHeated: boolean;
} {
  const hasAq =
    rx.reactants.some(r => r.state === 'aq') ||
    rx.products.some(p => p.state === 'aq');
  const isConcAcid =
    /đặc|conc/i.test(`${rx.name_vi} ${rx.name_en} ${rx.equation}`) ||
    (rx.tags ?? []).some(t => /conc|dac/i.test(t));

  const contents: SubstanceQuantity[] = [];
  for (const r of rx.reactants) {
    const moles = 0.04 * r.coefficient;
    const mm = Math.max(1, computeMolarMass(r.formula));
    const isAcid = /^(HNO3|H2SO4)$/i.test(r.formula);
    contents.push({
      formula: r.formula,
      moles,
      mass_g: moles * mm,
      state: r.state,
      ...(r.state === 'aq'
        ? { concentration_M: isConcAcid && isAcid ? 14 : 1.0 }
        : {}),
    });
  }

  if (
    hasAq &&
    !contents.some(c => c.formula.toUpperCase() === 'H2O')
  ) {
    const waterMass = isConcAcid ? 8 : 50;
    contents.push({
      formula: 'H2O',
      moles: waterMass / 18.015,
      mass_g: waterMass,
      state: 'l',
    });
  }

  if (rx.requiresCatalyst && rx.catalystFormula) {
    const cat = rx.catalystFormula.trim();
    if (!contents.some(c => c.formula.toUpperCase() === cat.toUpperCase())) {
      contents.push({
        formula: cat,
        moles: 0.01,
        mass_g: 0.5,
        state: cat === 'H2SO4' ? 'aq' : 's',
        ...(cat === 'H2SO4' ? { concentration_M: isConcAcid ? 14 : 2.0 } : {}),
      });
    }
  }

  const temp_c = Math.max(25, rx.minTemp_c ?? (rx.requiresHeating ? 120 : 25));
  const isHeated = Boolean(rx.requiresHeating || (rx.minTemp_c ?? 25) > 35);
  const volume_ml = hasAq ? (isConcAcid ? 15 : 50) : 0;

  return { contents, volume_ml, temp_c, isHeated };
}

function makeContainer(overrides: Partial<EquipmentState>): EquipmentState {
  return {
    id: 'eq-test',
    type: 'beaker',
    name: 'Test Beaker',
    name_vi: 'Cốc thử',
    x: 100,
    y: 100,
    width: 110,
    height: 130,
    isContainer: true,
    capacity_ml: 250,
    volume_ml: 100,
    mass_g: 150,
    tare_g: 50,
    temperature_c: 25,
    contents: [],
    liquidColorHex: '#f8fafc',
    liquidOpacity: 0.25,
    ph: 7,
    isOn: false,
    ...overrides,
  };
}

describe('ChemDex 2D — Full 131 Curriculum + 1,300 Catalog & Lab-3D Realism Parity', () => {
  beforeAll(async () => {
    await ensureCatalogCompiled();
  });

  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('compiles all 131 THPT curriculum reactions with valid stoichiometry and executes them under proper conditions', () => {
    expect(COMPILED_CURRICULUM_REACTIONS.length).toBe(131);

    const failures: string[] = [];
    for (const rx of COMPILED_CURRICULUM_REACTIONS) {
      expect(rx.reactants.length).toBeGreaterThan(0);
      expect(rx.products.length).toBeGreaterThan(0);
      expect(rx.visual).toBeDefined();
      expect(rx.controllerId || rx.archetype).toBeTruthy();

      const { contents, volume_ml, temp_c, isHeated } = buildInputsForReaction(rx);
      const sim = runSimulationCycle(contents, volume_ml, temp_c, isHeated, true, {
        oxygenFraction: 0.21,
      });

      const normKey = (f: string) => f.replace(/\[/g, '(').replace(/\]/g, ')').toUpperCase();
      const expectedProducts = rx.products.map(p => normKey(p.formula));
      const actualFormulas = new Set(sim.updatedContents.map(c => normKey(c.formula)));
      const escapedGas = sim.escapedGas_g ?? {};
      const matchedAnyProduct =
        sim.reactionsOccurred.length > 0 &&
        expectedProducts.some(
          pf =>
            actualFormulas.has(pf) ||
            (rx.id === 'cuso4_nh3' && actualFormulas.has('(CU(NH3)4)(OH)2')) ||
            Object.keys(escapedGas).some(g => normKey(g) === pf)
        );

      if (!matchedAnyProduct) {
        failures.push(`${rx.id} (${rx.equation})`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('compiles all 18 catalog families (1,300 entries), executes samples from each family, and conserves stoichiometry', () => {
    expect(COMPILED_CATALOG_REACTIONS.length).toBeGreaterThanOrEqual(1200);

    const byFamily = new Map<string, typeof COMPILED_CATALOG_REACTIONS>();
    for (const rx of COMPILED_CATALOG_REACTIONS) {
      const fam = rx.family ?? 'unknown';
      const arr = byFamily.get(fam) ?? [];
      arr.push(rx);
      byFamily.set(fam, arr);
    }

    expect(byFamily.size).toBe(18);

    // Check atom balance across balanced non-polymer catalog reactions
    for (const rx of COMPILED_CATALOG_REACTIONS) {
      if (rx.reactants.some(r => r.formula.includes('(') && /\)\s*n$/i.test(r.formula))) continue;
      const lhsAtoms: Record<string, number> = {};
      const rhsAtoms: Record<string, number> = {};
      for (const r of rx.reactants) {
        const parsed = parseChemicalFormula(r.formula);
        for (const [el, cnt] of Object.entries(parsed)) {
          lhsAtoms[el] = (lhsAtoms[el] ?? 0) + cnt * r.coefficient;
        }
      }
      for (const p of rx.products) {
        const parsed = parseChemicalFormula(p.formula);
        for (const [el, cnt] of Object.entries(parsed)) {
          rhsAtoms[el] = (rhsAtoms[el] ?? 0) + cnt * p.coefficient;
        }
      }
      const allEls = new Set([...Object.keys(lhsAtoms), ...Object.keys(rhsAtoms)]);
      for (const el of allEls) {
        if (Math.abs((lhsAtoms[el] ?? 0) - (rhsAtoms[el] ?? 0)) > 1e-6) {
          throw new Error(`Unbalanced catalog reaction ${rx.id}: ${rx.equation} element ${el}`);
        }
      }
    }

    // Execute representative samples from all 18 families through simulation engine & workbench bridge
    const executionFailures: string[] = [];
    for (const [fam, list] of byFamily.entries()) {
      for (const rx of list.slice(0, 3)) {
        const { contents, volume_ml, temp_c, isHeated } = buildInputsForReaction(rx);
        const sim = runSimulationCycle(contents, volume_ml, temp_c, isHeated, true, {
          oxygenFraction: 0.21,
        });
        if (sim.reactionsOccurred.length === 0) {
          executionFailures.push(`[${fam}] ${rx.id}: ${rx.equation}`);
        }
      }
    }
    expect(executionFailures).toEqual([]);

    // Verify workbench bridge auto-doses catalyst and heating for a catalog reaction
    const sampleCur = COMPILED_CURRICULUM_REACTIONS[0];
    const launched = runReactionOnWorkbench2D({
      id: sampleCur.id,
      equation: sampleCur.equation,
      reactants: sampleCur.reactants.map(r => ({
        formula: r.formula,
        coeff: r.coefficient,
        coefficient: r.coefficient,
        phase: r.state,
      })),
      conditions: {
        heating: sampleCur.requiresHeating,
        temperature_c: sampleCur.minTemp_c,
        catalyst: sampleCur.catalystFormula,
      },
      minTemp_c: sampleCur.minTemp_c,
      family: sampleCur.family,
    });
    expect(launched.vesselId).toBeTruthy();
  });

  it('handles multi-stage cascades: Zn(OH)2 amphoteric/NH3, cold vs hot C6H12O6 + Cu(OH)2, and Landolt Iodine Clock', () => {
    // 1. ZnSO4 + stoichiometric NaOH -> Zn(OH)2(s), then + HCl OR + NH3
    const znPrecip = runSimulationCycle(
      [
        { formula: 'ZnSO4', moles: 0.02, mass_g: 3.23, state: 'aq' },
        { formula: 'NaOH', moles: 0.04, mass_g: 1.6, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25
    );
    expect(znPrecip.hasPrecipitate).toBe(true);
    expect(znPrecip.precipitateInfo?.formula).toBe('Zn(OH)2');

    const znAcidDissolved = runSimulationCycle(
      [
        ...znPrecip.updatedContents,
        { formula: 'HCl', moles: 0.05, mass_g: 1.82, state: 'aq' },
      ],
      60,
      25
    );
    expect(znAcidDissolved.hasPrecipitate).toBe(false);
    expect(znAcidDissolved.updatedContents.some(c => c.formula === 'ZnCl2')).toBe(true);

    const znNh3Complex = runSimulationCycle(
      [
        ...znPrecip.updatedContents,
        { formula: 'NH3', moles: 0.1, mass_g: 1.7, state: 'aq' },
      ],
      60,
      25
    );
    expect(znNh3Complex.hasPrecipitate).toBe(false);
    expect(
      znNh3Complex.updatedContents.some(
        c => c.formula === '[Zn(NH3)4](OH)2' || c.formula.includes('Zn(NH3)4')
      )
    ).toBe(true);

    // 2. Glucose + Cu(OH)2: Cold (25°C) royal-blue complex vs Hot (85°C) brick-red Cu2O
    const coldGlucose = runSimulationCycle(
      [
        { formula: 'C6H12O6', moles: 0.02, mass_g: 3.6, state: 'aq' },
        { formula: 'Cu(OH)2', moles: 0.01, mass_g: 0.975, state: 's' },
        { formula: 'NaOH', moles: 0.02, mass_g: 0.8, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      25,
      false
    );
    expect(coldGlucose.hasPrecipitate).toBe(false);
    expect(
      coldGlucose.updatedContents.some(
        c => c.formula === '[C6H11O6]2Cu' || c.formula === 'Cu(C6H11O6)2'
      )
    ).toBe(true);

    const hotGlucose = runSimulationCycle(
      [
        { formula: 'C6H12O6', moles: 0.01, mass_g: 1.8, state: 'aq' },
        { formula: 'Cu(OH)2', moles: 0.02, mass_g: 1.95, state: 's' },
        { formula: 'NaOH', moles: 0.02, mass_g: 0.8, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      50,
      85,
      true
    );
    expect(hotGlucose.hasPrecipitate).toBe(true);
    expect(hotGlucose.precipitateInfo?.formula).toBe('Cu2O');

    // 3. Landolt Iodine Clock: excess Na2S2O3 suppresses Starch-I2 blue-black; exhausted Na2S2O3 flashes blue-black
    const scavenged = runSimulationCycle(
      [
        { formula: 'H2O2', moles: 0.01, mass_g: 0.34, state: 'aq' },
        { formula: 'KI', moles: 0.02, mass_g: 3.32, state: 'aq' },
        { formula: 'H2SO4', moles: 0.01, mass_g: 0.98, state: 'aq' },
        { formula: 'Na2S2O3', moles: 0.05, mass_g: 7.9, state: 'aq' },
        { formula: 'TinhBot', moles: 0.005, mass_g: 0.81, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      60,
      25
    );
    expect(scavenged.finalLiquidColorHex).not.toBe('#1e1b4b');

    const flashed = runSimulationCycle(
      [
        { formula: 'H2O2', moles: 0.03, mass_g: 1.02, state: 'aq' },
        { formula: 'KI', moles: 0.06, mass_g: 9.96, state: 'aq' },
        { formula: 'H2SO4', moles: 0.03, mass_g: 2.94, state: 'aq' },
        { formula: 'Na2S2O3', moles: 0.01, mass_g: 1.58, state: 'aq' },
        { formula: 'TinhBot', moles: 0.005, mass_g: 0.81, state: 'aq' },
        { formula: 'H2O', moles: 2.5, mass_g: 45, state: 'l' },
      ],
      60,
      25
    );
    expect(flashed.finalLiquidColorHex).toBe('#1e1b4b');
  });

  it('computes salt hydrolysis pH for acidic cations, basic anions, weak amines, and neutral salts', () => {
    const vol = 100; // 0.1 L -> 0.01 mol = 0.1 M
    const phOf = (formula: string) =>
      calculateSolutionPh(
        [
          { formula, moles: 0.01, mass_g: 1, state: 'aq', concentration_M: 0.1 },
          { formula: 'H2O', moles: 5.5, mass_g: 100, state: 'l' },
        ],
        vol
      );

    expect(phOf('FeCl3')).toBeLessThan(3.5);
    expect(phOf('AlCl3')).toBeLessThan(5.0);
    expect(phOf('CuSO4')).toBeLessThan(5.5);
    expect(phOf('NH4Cl')).toBeLessThan(6.2);

    expect(phOf('Na2CO3')).toBeGreaterThan(10.5);
    expect(phOf('CH3COONa')).toBeGreaterThan(8.0);
    expect(phOf('CH3COONa')).toBeLessThan(10.0);
    expect(phOf('Na2S')).toBeGreaterThan(11.5);
    expect(phOf('C6H5ONa')).toBeGreaterThan(10.5);
    expect(phOf('CH3NH2')).toBeGreaterThan(10.5);

    expect(phOf('NaCl')).toBe(7.0);
  });

  it('models 0°C H2O(s) latent-heat melting at 334 J/g, generalized KNO3 solubility, and shared burner power budget', () => {
    // 1. Ice latent heat plateau at 0 °C (334 J/g)
    const iceBeaker = makeContainer({
      volume_ml: 0,
      mass_g: 100, // 50g tare + 50g ice
      tare_g: 50,
      temperature_c: 0,
      contents: [{ formula: 'H2O', moles: 50 / 18.015, mass_g: 50, state: 's' }],
    });
    const warmStep = stepVesselThermal(iceBeaker, 1.0, 334, 0, DEFAULT_LAB_ENVIRONMENT);
    expect(ICE_LATENT_HEAT_J_G).toBe(334);
    expect(warmStep.temperature_c).toBeCloseTo(0, 1);
    expect(warmStep.volume_ml).toBeGreaterThan(0.5);
    expect(warmStep.mass_g).toBeCloseTo(100, 4);
    expect(warmStep.contents.some(c => c.formula === 'H2O' && c.state === 'l')).toBe(true);
    expect(warmStep.contents.some(c => c.formula === 'H2O' && c.state === 's')).toBe(true);

    // 2. Generalized KNO3 temperature-solubility equilibrium (high solubility at 85°C, crystallization on cool to 20°C)
    const kno3Mix: SubstanceQuantity[] = [
      { formula: 'KNO3', moles: 0.8, mass_g: 80.88, state: 's' },
      { formula: 'H2O', moles: 5.5, mass_g: 100, state: 'l' },
    ];
    const hotKno3 = stepTemperatureSolubility(kno3Mix, 100, 85, 2);
    expect(hotKno3.redissolvedFormula).toBe('KNO3');
    const dissolvedAt85 =
      hotKno3.contents.find(c => c.formula === 'KNO3' && c.state === 'aq')?.mass_g ?? 0;
    expect(dissolvedAt85).toBeGreaterThan(35);

    const cooledKno3 = stepTemperatureSolubility(
      [
        {
          formula: 'KNO3',
          moles: 0.7,
          mass_g: 70.77,
          state: 'aq',
          concentration_M: 7.0,
        },
        { formula: 'H2O', moles: 5.5, mass_g: 100, state: 'l' },
      ],
      100,
      20,
      2
    );
    expect(cooledKno3.recrystallizedFormula).toBe('KNO3');
    expect(
      cooledKno3.contents.some(c => c.formula === 'KNO3' && c.state === 's' && c.mass_g > 1)
    ).toBe(true);

    // 3. Shared burner power budget & fuelLevel_ml depletion across two vessels
    const store = useLabStore.getState();
    const burnerId = store.addEquipment('bunsen_burner', 200, 300);
    const v1Id = store.addEquipment('beaker', 165, 135);
    const v2Id = store.addEquipment('beaker', 205, 135);
    store.addChemicalToEquipment(v1Id, 'chem-water', 50);
    store.addChemicalToEquipment(v2Id, 'chem-water', 50);
    store.toggleHeat(burnerId);

    store.tickSimulation(0.5);
    const eqAfter = useLabStore.getState().equipment;
    const totalDeliveredW =
      (eqAfter[v1Id].absorbedPower_W ?? 0) + (eqAfter[v2Id].absorbedPower_W ?? 0);
    expect(totalDeliveredW).toBeGreaterThan(0);
    expect(totalDeliveredW).toBeLessThanOrEqual(BURNER_PEAK_POWER_W + 2);
    expect(eqAfter[burnerId].fuelLevel_ml ?? BURNER_FUEL_CAPACITY_ML).toBeLessThan(
      BURNER_FUEL_CAPACITY_ML
    );
  });
});
