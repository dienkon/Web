import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { programPlayer } from '../src/vfx/programs/player/ProgramPlayer';
import { getEffectAtom } from '../src/vfx/catalog/index';
import { getProgramById } from '../src/vfx/programs/library/index';

describe('Phase C, D & E — End-to-End Reaction & ProgramPlayer Verification (§4.11, §19)', () => {
  beforeEach(() => {
    useAppStore.setState({
      vessels: {},
      burners: {},
      activeKinetics: {},
      pendingReactions: {},
      dissolvingSubstances: {},
      timeScale: 1.0,
      globalWarning: null
    });
    programPlayer.dispose();
  });

  it('guarantees CaCl2 + Na2CO3 executes end-to-end with continuous extent xi(t), white precipitate, zero gas, and mass conservation', async () => {
    const store = useAppStore.getState();

    // 1. Setup beaker with 50 mL CaCl2 (0.2M) -> n(CaCl2) = 0.050 L * 0.2 mol/L = 0.010 mol
    store.addVessel('beaker', 'Beaker 1');
    const beakerId = Object.keys(useAppStore.getState().vessels)[0];

    // CaCl2 solution: 50 mL (0.2M) -> 0.010 mol
    await store.mixSubstances(beakerId, 'CaCl2', 50);

    let vessel = useAppStore.getState().vessels[beakerId];
    expect(vessel.substances).toContain('CaCl2');
    const caCl2Item = vessel.contents?.find(c => c.formula === 'CaCl2');
    expect(caCl2Item).toBeDefined();
    expect(caCl2Item!.moles).toBeCloseTo(0.010, 2);

    const initialTotalMass = vessel.mass_g;

    // 2. Add 20 mL Na2CO3 (0.5M) -> n(Na2CO3) = 0.020 L * 0.5 mol/L = 0.010 mol
    // Stoichiometry: CaCl2 + Na2CO3 -> CaCO3(s) + 2NaCl(aq) (1:1 ratio)
    // Both reactants 0.010 mol -> exact stoichiometric conversion
    // Theoretical yields:
    // CaCO3: 0.010 mol * 100.09 g/mol = 1.001 g white precipitate
    // NaCl: 0.020 mol
    await store.mixSubstances(beakerId, 'Na2CO3', 20);

    // 3. ZERO TELEPORTATION CHECK at t = 0
    vessel = useAppStore.getState().vessels[beakerId];
    const kinetics = useAppStore.getState().activeKinetics[beakerId];
    expect(kinetics).toBeDefined();
    expect(kinetics.reactionId).toBe('cacl2_na2co3');
    expect(kinetics.progress).toBe(0);

    // Reactants are NOT wiped out at t = 0!
    const caCl2AtT0 = vessel.contents?.find(c => c.formula === 'CaCl2');
    const na2CO3AtT0 = vessel.contents?.find(c => c.formula === 'Na2CO3');
    expect(caCl2AtT0).toBeDefined();
    expect(caCl2AtT0!.moles).toBeCloseTo(0.010, 2);
    expect(na2CO3AtT0).toBeDefined();
    expect(na2CO3AtT0!.moles).toBeCloseTo(0.010, 2);

    // Products are NOT teleported at t = 0!
    expect(vessel.hasPrecipitate).toBe(false);
    expect(vessel.precipitateAmount_g || 0).toBe(0);
    expect(vessel.hasGas).toBe(false);

    // 4. STEP SIMULATION to intermediate progress xi ≈ 0.5
    // Duration is ~7.0s. At 35 ticks of dt=0.1s (3.5s elapsed): progress ~ 0.5
    for (let i = 0; i < 35; i++) {
      useAppStore.getState().tick(0.1);
    }

    vessel = useAppStore.getState().vessels[beakerId];
    const midKinetics = useAppStore.getState().activeKinetics[beakerId];
    expect(midKinetics).toBeDefined();
    expect(midKinetics.progress).toBeGreaterThan(0.4);
    expect(midKinetics.progress).toBeLessThan(0.7);

    // Intermediate reactants partially consumed
    const caCl2Mid = vessel.contents?.find(c => c.formula === 'CaCl2');
    const na2CO3Mid = vessel.contents?.find(c => c.formula === 'Na2CO3');
    expect(caCl2Mid!.moles).toBeLessThan(0.010);
    expect(caCl2Mid!.moles).toBeGreaterThan(0.002);
    expect(na2CO3Mid!.moles).toBeLessThan(0.010);
    expect(na2CO3Mid!.moles).toBeGreaterThan(0.002);

    // Intermediate precipitate growing
    expect(vessel.hasPrecipitate).toBe(true);
    expect(vessel.precipitateAmount_g).toBeGreaterThan(0.2);
    expect(vessel.precipitateAmount_g).toBeLessThan(1.0);
    expect(vessel.turbidity).toBeGreaterThan(0.3);

    // ZERO GAS GUARANTEE
    expect(vessel.hasGas).toBe(false);

    // MASS CONSERVATION: mass must not drift
    expect(vessel.mass_g).toBeCloseTo(initialTotalMass + 20 * 1.04, 1);

    // 5. STEP TO FINAL COMPLETION (xi = 1.0)
    for (let i = 0; i < 50; i++) {
      useAppStore.getState().tick(0.1);
    }

    vessel = useAppStore.getState().vessels[beakerId];
    // Kinetics finished and cleaned up
    expect(useAppStore.getState().activeKinetics[beakerId]).toBeUndefined();

    // Final stoichiometric yields
    const finalCaCO3 = vessel.contents?.find(c => c.formula === 'CaCO3');
    const finalNaCl = vessel.contents?.find(c => c.formula === 'NaCl');
    const finalNa2CO3 = vessel.contents?.find(c => c.formula === 'Na2CO3');
    const finalCaCl2 = vessel.contents?.find(c => c.formula === 'CaCl2');

    expect(finalCaCO3).toBeDefined();
    expect(finalCaCO3!.moles).toBeCloseTo(0.010, 2); // 100% conversion
    expect(vessel.precipitateAmount_g).toBeCloseTo(1.00, 1); // 1.00g CaCO3
    expect(vessel.precipitateSubstance).toBe('CaCO3');
    expect(vessel.precipitateColor).toBe('#ffffff');
    expect(vessel.hasPrecipitate).toBe(true);

    expect(finalNaCl).toBeDefined();
    expect(finalNaCl!.moles).toBeCloseTo(0.020, 2);

    // Reactants completely consumed
    expect(finalNa2CO3 ? finalNa2CO3.moles : 0).toBeLessThan(1e-4);
    expect(finalCaCl2 ? finalCaCl2.moles : 0).toBeLessThan(1e-4);

    // Zero gas throughout
    expect(vessel.hasGas).toBe(false);
  });

  it('runs ProgramPlayer with timeline window atoms (precipitateNucleation, turbidityShift, stokesSedimentation)', () => {
    const program = getProgramById('cacl2_na2co3');
    expect(program).toBeDefined();

    const session = programPlayer.startProgram('test_vessel_1', program!, {
      position: [0, 0, 0],
      timeScale: 1.0
    });

    expect(session).toBeDefined();
    expect(session.progress).toBe(0);
    expect(session.isComplete).toBe(false);

    // Step to t = 1.0s (progress ~ 1.0 / 7.0 ≈ 0.14)
    // Both precipitateNucleation ([0, 0.4]) and turbidityShift ([0, 0.5]) should be active
    let patches = programPlayer.update(1.0);
    expect(session.progress).toBeCloseTo(0.14, 2);
    expect(session.activeAtoms.has('precip')).toBe(true);
    expect(session.activeAtoms.has('turb')).toBe(true);
    expect(session.activeAtoms.has('stokes')).toBe(false);

    const precipInstance = session.activeAtoms.get('precip')!;
    expect(precipInstance.handle.custom.spawnedParticles).toBeGreaterThan(0);
    expect(patches['test_vessel_1'].turbidity).toBeGreaterThan(0);

    // Step to t = 3.5s (progress ~ 3.5 / 7.0 = 0.50)
    // precipitateNucleation window [0, 0.4] is past -> disposed
    // stokesSedimentation window [0.35, 1.0] -> active
    patches = programPlayer.update(2.5);
    expect(session.progress).toBeCloseTo(0.50, 2);
    expect(session.activeAtoms.has('precip')).toBe(false);
    expect(session.activeAtoms.has('stokes')).toBe(true);

    const stokesInstance = session.activeAtoms.get('stokes')!;
    expect(stokesInstance.handle.custom.currentBedHeight_mm).toBeGreaterThan(0);

    // Step to completion t = 7.5s (progress >= 1.0)
    programPlayer.update(4.0);
    expect(session.progress).toBe(1.0);
    expect(session.isComplete).toBe(true);
    expect(session.activeAtoms.size).toBe(0); // All atoms disposed
  });

  it('validates effect atom contract and catalog registration for runtime atoms', () => {
    const nucleationAtom = getEffectAtom('precipitateNucleation');
    expect(nucleationAtom).toBeDefined();
    expect(nucleationAtom!.category).toBe('solidPhase');

    const turbidityAtom = getEffectAtom('turbidityShift');
    expect(turbidityAtom).toBeDefined();
    expect(turbidityAtom!.category).toBe('liquidOptics');

    const stokesAtom = getEffectAtom('stokesSedimentation');
    expect(stokesAtom).toBeDefined();
    expect(stokesAtom!.category).toBe('solidPhase');

    // Test mount, update, writeBack, dispose lifecycle on nucleationAtom
    const ctx = {
      vesselId: 'test_atom',
      position: [0, 0, 0] as [number, number, number],
      dimensions: { radius: 0.045, height: 0.12, liquidY: 0.05, mouthY: 0.12 },
      timeScale: 1.0,
      seed: 123
    };

    const handle = nucleationAtom!.mount(ctx, { color: '#ffffff', nucleationRate: 60 });
    expect(handle.alive).toBe(true);
    expect(handle.custom.maxParticles).toBe(60);

    const ledger = {
      time_s: 1.0,
      temperature_c: 25,
      pressure_atm: 1.0,
      pH: 7.0,
      turbidity: 0.2,
      liquidColor: '#ffffff',
      gasHoldup: 0,
      foam_ml: 0,
      speciesAmounts: {},
      speciesRates: {},
      heatRate_W: 0
    };

    nucleationAtom!.update(handle, 0.5, ledger);
    expect(handle.custom.spawnedParticles).toBeGreaterThan(0);

    const patch: any = {};
    nucleationAtom!.writeBack!(handle, patch);
    expect(patch.turbidity).toBeGreaterThan(0);
    expect(patch.liquidColor).toBe('#ffffff');

    nucleationAtom!.dispose(handle);
    expect(handle.alive).toBe(false);
  });

  it('validates active mount, update, writeBack, and dispose lifecycles for core gas, optics, solid, thermal, and combustion atoms', () => {
    const ctx = {
      vesselId: 'test_atom_multi',
      position: [0, 0, 0] as [number, number, number],
      dimensions: { radius: 0.045, height: 0.12, liquidY: 0.05, mouthY: 0.12 },
      timeScale: 1.0,
      seed: 456
    };
    const ledger = {
      time_s: 1.0,
      temperature_c: 25,
      pressure_atm: 1.0,
      pH: 7.0,
      turbidity: 0.0,
      liquidColor: '#38bdf8',
      gasHoldup: 0,
      foam_ml: 0,
      speciesAmounts: {},
      speciesRates: {},
      heatRate_W: 0
    };

    // 1. Gas atom: nucleateBubbles
    const bubbleAtom = getEffectAtom('nucleateBubbles')!;
    expect(bubbleAtom).toBeDefined();
    const bHandle = bubbleAtom.mount(ctx, { bubbleRate: 20 });
    expect(bHandle.alive).toBe(true);
    bubbleAtom.update(bHandle, 0.5, ledger);
    expect(bHandle.custom.activeBubbleCount).toBeGreaterThan(0);
    const bPatch: any = {};
    bubbleAtom.writeBack!(bHandle, bPatch);
    expect(bPatch.hasGas).toBe(true);
    expect(bPatch.gasRate).toBe(20);
    bubbleAtom.dispose(bHandle);
    expect(bHandle.alive).toBe(false);

    // 2. Liquid optics: beerLambertFade
    const fadeAtom = getEffectAtom('beerLambertFade')!;
    expect(fadeAtom).toBeDefined();
    const fHandle = fadeAtom.mount(ctx, { startColor: '#7c3aed', endColor: '#f8fafc' });
    expect(fHandle.alive).toBe(true);
    fadeAtom.update(fHandle, 5.0, ledger);
    expect(fHandle.custom.fadeProgress).toBe(1.0);
    const fPatch: any = {};
    fadeAtom.writeBack!(fHandle, fPatch);
    expect(fPatch.liquidColor).toBe('#f8fafc');
    fadeAtom.dispose(fHandle);
    expect(fHandle.alive).toBe(false);

    // 3. Solid atom: crystalGlitter
    const glitterAtom = getEffectAtom('crystalGlitter')!;
    expect(glitterAtom).toBeDefined();
    const gHandle = glitterAtom.mount(ctx, { glintColor: '#fef08a' });
    expect(gHandle.alive).toBe(true);
    glitterAtom.update(gHandle, 0.5, ledger);
    const gPatch: any = {};
    glitterAtom.writeBack!(gHandle, gPatch);
    expect(gPatch.hasPrecipitate).toBe(true);
    expect(gPatch.precipitateColor).toBe('#fef08a');
    glitterAtom.dispose(gHandle);
    expect(gHandle.alive).toBe(false);

    // 4. Thermal atom: thermalSteam
    const steamAtom = getEffectAtom('thermalSteam')!;
    expect(steamAtom).toBeDefined();
    const sHandle = steamAtom.mount(ctx, { steamDensity: 1.5, temperature_c: 85 });
    expect(sHandle.alive).toBe(true);
    steamAtom.update(sHandle, 1.0, ledger);
    const sPatch: any = {};
    steamAtom.writeBack!(sHandle, sPatch);
    expect(sPatch.temperature_c).toBe(85);
    expect(sPatch.fumingIntensity).toBeGreaterThan(0);
    steamAtom.dispose(sHandle);
    expect(sHandle.alive).toBe(false);

    // 5. Combustion atom: flameCone
    const flameAtom = getEffectAtom('flameCone')!;
    expect(flameAtom).toBeDefined();
    const flameHandle = flameAtom.mount(ctx, { flameColor: '#0284c7' });
    expect(flameHandle.alive).toBe(true);
    flameAtom.update(flameHandle, 0.5, ledger);
    const flamePatch: any = {};
    flameAtom.writeBack!(flameHandle, flamePatch);
    expect(flamePatch.temperature_c).toBeGreaterThanOrEqual(450);
    flameAtom.dispose(flameHandle);
    expect(flameHandle.alive).toBe(false);
  });
});
