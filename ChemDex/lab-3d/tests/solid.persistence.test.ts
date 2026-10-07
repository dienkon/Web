import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';

describe('Phase B — Solid Persistence & Stoichiometric Consumption (§4.7, §16)', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      vessels: {},
      burners: {},
      activeKinetics: {},
      pendingReactions: {},
      dissolvingSubstances: {},
      timeScale: 1.0,
      globalWarning: null
    });
  });

  it('guarantees inert solids persist indefinitely without disappearance across waiting, tilt, stir, and time-warp', async () => {
    const store = useAppStore.getState();
    const vesselId = 'test_beaker_inert';

    // 1. Create empty vessel
    store.addVessel('beaker', 'Inert Beaker');
    const addedId = Object.keys(useAppStore.getState().vessels)[0];
    expect(addedId).toBeDefined();

    // 2. Add inert solid with no reaction (e.g. Copper wire/turnings 5.0g into water)
    await useAppStore.getState().mixSubstances(addedId, 'H2O', 50); // 50 mL water
    await useAppStore.getState().mixSubstances(addedId, 'Cu', 5.0); // 5.0g copper

    let vessel = useAppStore.getState().vessels[addedId];
    expect(vessel.substances).toContain('Cu');
    const cuItem = vessel.contents?.find(c => c.formula === 'Cu');
    expect(cuItem).toBeDefined();
    expect(cuItem!.mass_g).toBeCloseTo(5.0, 2);
    expect(cuItem!.initialMoles).toBeGreaterThan(0);
    const initialMoles = cuItem!.moles;

    // 3. Advance 30 simulated seconds (tick)
    for (let i = 0; i < 300; i++) {
      useAppStore.getState().tick(0.1);
    }

    vessel = useAppStore.getState().vessels[addedId];
    // Cu must still be present, mass unchanged, not dissolved
    expect(vessel.substances).toContain('Cu');
    const cuAfter30s = vessel.contents?.find(c => c.formula === 'Cu');
    expect(cuAfter30s).toBeDefined();
    expect(cuAfter30s!.mass_g).toBeCloseTo(5.0, 2);
    expect(cuAfter30s!.moles).toBeCloseTo(initialMoles, 4);

    const dissolvingCu = useAppStore.getState().dissolvingSubstances[addedId]?.['Cu'];
    expect(dissolvingCu || 0).toBe(0); // Never dissolving

    // 4. Tilt vessel
    useAppStore.getState().rotateVessel(addedId, 0.45);
    for (let i = 0; i < 60; i++) {
      useAppStore.getState().tick(0.1);
    }
    vessel = useAppStore.getState().vessels[addedId];
    expect(vessel.substances).toContain('Cu');
    expect(vessel.contents?.find(c => c.formula === 'Cu')?.mass_g).toBeCloseTo(5.0, 2);

    // 5. Stir vessel
    useAppStore.getState().setActiveTool('stirring_rod');
    useAppStore.getState().setStirringVesselId(addedId);
    for (let i = 0; i < 60; i++) {
      useAppStore.getState().tick(0.1);
    }
    vessel = useAppStore.getState().vessels[addedId];
    expect(vessel.substances).toContain('Cu');
    expect(vessel.contents?.find(c => c.formula === 'Cu')?.mass_g).toBeCloseTo(5.0, 2);

    // 6. Time warp (10x speed)
    useAppStore.setState({ timeScale: 10.0 });
    for (let i = 0; i < 100; i++) {
      useAppStore.getState().tick(0.1);
    }
    useAppStore.setState({ timeScale: 1.0 });

    // 7. Verify absolute persistence
    vessel = useAppStore.getState().vessels[addedId];
    expect(vessel.substances).toContain('Cu');
    const cuFinal = vessel.contents?.find(c => c.formula === 'Cu');
    expect(cuFinal).toBeDefined();
    expect(cuFinal!.mass_g).toBeCloseTo(5.0, 2);
    expect(cuFinal!.moles).toBeCloseTo(initialMoles, 4);
    expect(useAppStore.getState().dissolvingSubstances[addedId]?.['Cu'] || 0).toBe(0);
  });

  it('preserves resting solids when liquid solvent is completely poured out of the vessel', async () => {
    const store = useAppStore.getState();
    store.addVessel('beaker', 'Source Beaker');
    store.addVessel('beaker', 'Target Beaker');

    const [srcId, tgtId] = Object.keys(useAppStore.getState().vessels);

    // Add 40 mL water and 3.0g inert copper powder to source beaker
    await store.mixSubstances(srcId, 'H2O', 40);
    await store.mixSubstances(srcId, 'Cu', 3.0);

    let src = useAppStore.getState().vessels[srcId];
    expect(src.substances).toContain('Cu');
    expect(src.volume_ml).toBeGreaterThanOrEqual(40);

    // Decant all liquid water from source to target
    await store.pourVessel(srcId, tgtId, src.volume_ml);

    src = useAppStore.getState().vessels[srcId];
    // Liquid volume is now 0, BUT Cu solid remains in vessel!
    expect(src.volume_ml).toBe(0);
    expect(src.substances).toContain('Cu');
    const cuItem = src.contents?.find(c => c.formula === 'Cu');
    expect(cuItem).toBeDefined();
    expect(cuItem!.mass_g).toBeCloseTo(3.0, 2);
    expect(src.mass_g).toBeCloseTo(3.0, 2);
  });

  it('consumes ONLY the stoichiometric fraction when reacting with a compatible reactant', async () => {
    const store = useAppStore.getState();
    store.addVessel('flask', 'Reaction Flask');
    const flaskId = Object.keys(useAppStore.getState().vessels)[0];

    // Add 2.0g CaCO3 powder: M = 100.09 g/mol -> n = 2.0 / 100.09 = 0.020 mol
    await store.mixSubstances(flaskId, 'CaCO3', 2.0);

    let flask = useAppStore.getState().vessels[flaskId];
    const initialCaCO3 = flask.contents?.find(c => c.formula === 'CaCO3');
    expect(initialCaCO3).toBeDefined();
    const nInitial = initialCaCO3!.moles;
    expect(nInitial).toBeCloseTo(0.020, 3);

    // Add 10 mL 1M HCl: n(HCl) = 0.010 L * 1.0 mol/L = 0.010 mol
    // Primary Reaction: CaCO3 + 2HCl -> CaCl2 + H2O + CO2(g) (consumes 0.005 mol CaCO3)
    // Secondary Cascading Reaction: CaCO3 + CO2 + H2O -> Ca(HCO3)2 (consumes further 0.005 mol CaCO3)
    // Total stoichiometric consumption leaves 0.010 mol CaCO3 (1.00 g)
    await store.mixSubstances(flaskId, 'HCl', 10);

    flask = useAppStore.getState().vessels[flaskId];
    const remainingCaCO3 = flask.contents?.find(c => c.formula === 'CaCO3');
    expect(remainingCaCO3).toBeDefined();

    // The solid was NOT 100% wiped out; stoichiometric amount persists!
    expect(remainingCaCO3!.moles).toBeCloseTo(0.010, 3);
    expect(remainingCaCO3!.moles).toBeLessThan(0.020);
    expect(flask.substances).toContain('CaCO3');
  });
});
