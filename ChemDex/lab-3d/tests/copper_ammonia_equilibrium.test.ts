import { afterEach, describe, expect, it } from 'vitest';
import { copperAmmineBetas, copperAmmoniaEquilibrium, copperHydroxoAmmineBetas, HYDROXO_AMMINES } from '../src/science/copperAmmoniaEquilibrium';
import { applyCopperAmmoniaLedger } from '../src/engine/copperAmmoniaLedger';
import { readComposition } from '../src/science/balance';
import { computeMolarMass, applyProgramToLedger } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { createStudioSample, planStudioProgram } from '../src/engine/studioProgram';
import { getProgramById } from '../src/vfx/programs/library';
import { reactAliquotMixture } from '../src/engine/aliquotReaction';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { advanceReaction } from '../src/engine/advanceReaction';
import { continueReactionAfterOutflow } from '../src/engine/reactionContinuation';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { aqueousConstantsAtTemperature, waterDissociationEnthalpy_J_mol } from '../src/science/aqueousTemperature';

const original = useAppStore.getState();
afterEach(() => useAppStore.setState(original, true));
const row = (formula: string, moles: number, phase = 'aq'): SubstanceContent => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
function sample(ratio = 4, volume_ml = 50): VesselState {
  const contents = [row('CuSO4', 0.001), row('NH3', ratio * 0.001), row('H2O', volume_ml / 18.015, 'l')];
  const capacity_ml = Math.max(250, volume_ml);
  return { id: 'copper', name: 'Copper', type: 'beaker', capacity_ml, volume_ml, volume: volume_ml / capacity_ml,
    mass_g: contents.reduce((s, c) => s + c.mass_g, 0), contents, substances: contents.map(c => c.formula),
    temperature_c: 25, ph: 7, position: [0, 0, 0], rotationY: 0, isLocked: false,
    hasGas: false, hasPrecipitate: false, isBoiling: false };
}
function atoms(contents: SubstanceContent[]) {
  const total: Record<string, number> = {};
  for (const c of contents) for (const [e, n] of Object.entries(readComposition(c.formula).atoms)) total[e] = (total[e] ?? 0) + n * c.moles;
  return total;
}
function conserved(before: VesselState, after: Partial<VesselState>) {
  const a = atoms(before.contents), b = atoms(after.contents!);
  for (const e of new Set([...Object.keys(a), ...Object.keys(b)])) expect(b[e] ?? 0, e).toBeCloseTo(a[e] ?? 0, 10);
  expect(after.contents!.reduce((s, c) => s + c.mass_g, 0)).toBeCloseTo(before.mass_g, 9);
  expect(after.contents!.every(c => Number.isFinite(c.moles) && c.moles >= 0)).toBe(true);
}

describe('Coupled Cu(II), ammonia, sulfate and hydroxide equilibria', () => {
  it('retains the selected cumulative source constants and decreases binding on warming', () => {
    const beta = copperAmmineBetas(25)!;
    expect(beta.map(Math.log10)).toEqual([4.10, 7.51, 10.31, 12.35]);
    expect(copperAmmineBetas(60)!.every((b, i) => b < beta[i])).toBe(true);
  });

  it('uses the sourced mixed-complex constants with OH- and their correct ionic charges', () => {
    expect(copperHydroxoAmmineBetas(25)!.map(Math.log10)).toEqual([11.3, 17, 15]);
    const v = sample(5), s = copperAmmoniaEquilibrium(v.contents, v.volume_ml, 25)!.state;
    HYDROXO_AMMINES.forEach((term, i) => {
      const ion = readComposition(term.formula);
      expect(ion.charge).toBe(2 - term.hydroxide);
      expect(ion.atoms.N).toBe(term.ammonia);
      const quotient = s.hydroxoAmmines_M[i]
        / (s.freeCopper_M * s.freeAmmonia_M ** term.ammonia * s.hydroxide_M ** term.hydroxide);
      expect(Math.log10(quotient)).toBeCloseTo(term.logBeta25, 10);
    });
  });

  it.each([5, 60, 89])('preserves the source H2O/H+ enthalpy basis during extrapolation at %s C', temperature_c => {
    const logK = (t: number, index: number) => Math.log(copperHydroxoAmmineBetas(t)![index])
      + HYDROXO_AMMINES[index].hydroxide * Math.log(aqueousConstantsAtTemperature(t)!.waterKw);
    HYDROXO_AMMINES.forEach((term, i) => {
      const slope = (logK(temperature_c + 0.001, i) - logK(temperature_c - 0.001, i)) / 0.002;
      const enthalpy = 8.314462618 * (temperature_c + 273.15) ** 2 * slope;
      const reference = term.estimatedDeltaH_J + term.hydroxide * waterDissociationEnthalpy_J_mol(25)!;
      expect(Math.abs(enthalpy - reference)).toBeLessThan(0.1);
    });
  });

  it.each([0, 0.001, 0.01])('counts every mixed ligand in Cu/N conservation with %s mol added NaOH', base => {
    const v = sample(20);
    if (base) v.contents.push(row('NaOH', base));
    v.mass_g = v.contents.reduce((s, c) => s + c.mass_g, 0);
    const s = copperAmmoniaEquilibrium(v.contents, v.volume_ml, 25)!.state;
    const mixedCu = s.hydroxoAmmines_M.reduce((sum, c) => sum + c, 0);
    const mixedN = s.hydroxoAmmines_M.reduce((sum, c, i) => sum + c * HYDROXO_AMMINES[i].ammonia, 0);
    expect(mixedCu).toBeGreaterThan(1e-5);
    const copper = s.freeCopper_M + s.hydrolyzedCopper_M + s.copperSulfatePair_M
      + s.ammines_M.reduce((sum, c) => sum + c, 0) + mixedCu + s.solid_mol / 0.05;
    const nitrogen = s.freeAmmonia_M + s.ammonium_M
      + s.ammines_M.reduce((sum, c, i) => sum + c * (i + 1), 0) + mixedN;
    expect(copper).toBeCloseTo(0.02, 10);
    expect(nitrogen).toBeCloseTo(0.4, 10);
    expect(Math.abs(s.chargeResidual_M)).toBeLessThan(1e-10);
    conserved(v, applyCopperAmmoniaLedger(v, 1)!);
  });

  it.each([0.01, 0.5, 1, 2, 4, 5, 20, 100])('closes all aqueous balances and phase complementarity at NH3/Cu=%s', ratio => {
    const v = sample(ratio), q = copperAmmoniaEquilibrium(v.contents, v.volume_ml, 25)!;
    expect(q).not.toBeNull();
    for (const residual of [q.state.chargeResidual_M, q.state.copperResidual_M, q.state.nitrogenResidual_M, q.state.sulfateResidual_M])
      expect(Math.abs(residual)).toBeLessThan(1e-10);
    if (q.state.solid_mol > 1e-12) expect(q.state.saturationRatio).toBeCloseTo(1, 9);
    else expect(q.state.saturationRatio).toBeLessThanOrEqual(1 + 1e-9);
    conserved(v, applyCopperAmmoniaLedger(v, 1)!);
  });

  it('does not declare four or five equivalents sufficient to dissolve all hydroxide', () => {
    for (const ratio of [4, 5]) {
      const v = sample(ratio), q = copperAmmoniaEquilibrium(v.contents, v.volume_ml, 25)!;
      expect(q.state.solid_mol).toBeGreaterThan(0.0008);
    }
    const excess = sample(100), q = copperAmmoniaEquilibrium(excess.contents, excess.volume_ml, 25)!;
    expect(q.state.solid_mol).toBeLessThan(1e-12);
    const bound = q.state.ammines_M.reduce((sum, c) => sum + c, 0)
      + q.state.hydroxoAmmines_M.reduce((sum, c) => sum + c, 0);
    expect(bound).toBeGreaterThan(0.019);
    expect(q.state.hydroxoAmmines_M[2]).toBeGreaterThan(0.001);
  });

  it('uses concentration rather than a universal ligand ratio', () => {
    const a = sample(5, 50), b = sample(5, 500);
    const first = copperAmmoniaEquilibrium(a.contents, a.volume_ml, 25)!, dilute = copperAmmoniaEquilibrium(b.contents, b.volume_ml, 25)!;
    expect(Math.abs(first.state.solid_mol - dilute.state.solid_mol)).toBeGreaterThan(1e-5);
    const scaled = a.contents.map(c => ({ ...c, moles: c.moles * 10, mass_g: c.mass_g * 10 }));
    expect(copperAmmoniaEquilibrium(scaled, 500, 25)!.state.ph).toBeCloseTo(first.state.ph, 9);
  });

  it('protonates ammonia and destroys ammines on adding finite aqueous sulfuric acid', () => {
    const v = sample(100), initial = copperAmmoniaEquilibrium(v.contents, v.volume_ml, 25)!;
    const acidified = [...v.contents, row('H2SO4(dil)', 0.06)];
    const q = copperAmmoniaEquilibrium(acidified, v.volume_ml, 25)!;
    expect(q.state.ph).toBeLessThan(4);
    expect(q.state.ammines_M.reduce((s, c) => s + c, 0)).toBeLessThan(initial.state.ammines_M[3] * 1e-3);
    expect(q.state.ammonium_M).toBeGreaterThan(0.999 * 0.1 / 0.05);
    expect(Math.abs(q.state.nitrogenResidual_M)).toBeLessThan(1e-10);
    expect(q.state.solid_mol).toBeLessThan(1e-12);
    const acidVessel = { ...v, contents: acidified, mass_g: acidified.reduce((s, c) => s + c.mass_g, 0) };
    conserved(acidVessel, applyCopperAmmoniaLedger(acidVessel, 1)!);
  });

  it('supports fresh hydroxide dissolving in ammonia without inventing sulfate', () => {
    const v = sample(100);
    v.contents = v.contents.map(c => c.formula === 'CuSO4' ? row('Cu(OH)2', 1e-5, 's') : c);
    v.mass_g = v.contents.reduce((s, c) => s + c.mass_g, 0);
    const end = applyCopperAmmoniaLedger(v, 1)!;
    conserved(v, end);
    expect(end.contents!.some(c => c.formula === '[Cu(NH3)4](OH)2')).toBe(true);
    expect(atoms(end.contents!).S ?? 0).toBe(0);
  });

  it('includes sodium/base left from preparing the precipitate and the hydroxide common-ion effect', () => {
    const base = sample(100);
    base.contents = [row('Cu(OH)2', 0.001, 's'), row('Na2SO4', 0.001),
      row('NH3', 0.1), row('H2O', 50 / 18.015, 'l')];
    base.mass_g = base.contents.reduce((s, c) => s + c.mass_g, 0);
    const clear = applyCopperAmmoniaLedger(base, 1)!;
    conserved(base, clear);
    expect(clear.hasPrecipitate).toBe(false);
    const alkaline = { ...base, contents: [...base.contents, row('NaOH', 0.01)] };
    alkaline.mass_g = alkaline.contents.reduce((s, c) => s + c.mass_g, 0);
    const gel = applyCopperAmmoniaLedger(alkaline, 1)!;
    conserved(alkaline, gel);
    expect(gel.hasPrecipitate).toBe(true);
    expect(gel.ph!).toBeGreaterThan(clear.ph!);
  });

  it('can retain dilute Cu in the neutral mixed complex even with substantial excess hydroxide', () => {
    const v = sample(100);
    v.contents = [row('Cu(OH)2', 0.0001, 's'), row('Na2SO4', 0.0001),
      row('NaOH', 0.01), row('NH3', 0.1), row('H2O', 50 / 18.015, 'l')];
    v.mass_g = v.contents.reduce((sum, c) => sum + c.mass_g, 0);
    const solved = copperAmmoniaEquilibrium(v.contents, 50, 25)!;
    expect(solved.state.solid_mol).toBeLessThan(1e-12);
    expect(solved.state.hydroxoAmmines_M[1]).toBeGreaterThan(0.9 * 0.0001 / 0.05);
    conserved(v, applyCopperAmmoniaLedger(v, 1)!);
  });

  it.each([0, 5, 25, 60, 90])('keeps balances finite at %s C and preserves atoms during fractional material replay', temperature_c => {
    const v = { ...sample(20), temperature_c };
    for (const progress of [0, 0.1, 0.5, 1]) conserved(v, applyCopperAmmoniaLedger(v, progress)!);
  });

  it('rejects unsupported competing ligands, wrong phases and invalid/dry quantities', () => {
    const v = sample();
    for (const contents of [[...v.contents, row('KSCN', 0.001)],
      v.contents.map(c => c.formula === 'NH3' ? { ...c, phase: 'g' } : c),
      v.contents.map(c => c.formula === 'NH3' ? { ...c, moles: Infinity } : c),
      v.contents.filter(c => c.formula !== 'H2O')]) {
      expect(copperAmmoniaEquilibrium(contents, 50, 25)).toBeNull();
      expect(planStudioProgram(getProgramById('cuso4_nh3')!, { ...v, contents }, 'vi').kinetics).toBeNull();
    }
    for (const temperature of [-1, 91, NaN, Infinity]) expect(copperAmmoniaEquilibrium(v.contents, 50, temperature)).toBeNull();
  });

  it('keeps filter cake separate and does not use it to determine equilibrium or new gel', () => {
    const v = sample(100), cake = { ...row('Cu(OH)2', 0.005, 's'), location: 'filter' as const };
    v.contents.unshift(cake); v.mass_g += cake.mass_g;
    const end = applyCopperAmmoniaLedger(v, 1)!;
    conserved(v, end);
    expect(end.contents!.find(c => c.location === 'filter')).toEqual(cake);
    expect(end.hasPrecipitate).toBe(false);
  });
});

describe('Manual, native prediction and automatic material paths', () => {
  it('plans a live manual reaction before committing products and uses the same native endpoint', () => {
    const v = sample(5), p = planStudioProgram(getProgramById('cuso4_nh3')!, v, 'vi');
    expect(p.kinetics).toBeDefined();
    const planned = reactAliquotMixture(v, 'vi', false);
    expect(planned.kinetics?.program?.id).toBe('cuso4_nh3');
    expect(planned.vessel.contents).toEqual(v.contents);
    const native = executeMultiStepReactions(v.contents, v.substances, v.volume_ml, 25, false);
    const ledger = applyProgramToLedger(getProgramById('cuso4_nh3')!, v, 1, { deferThermal: true });
    expect(native.hasPrecipitate).toBe(true);
    for (const c of ledger.contents!) expect(native.updatedContents.find(n => n.formula === c.formula && n.phase === c.phase)?.moles).toBeCloseTo(c.moles, 11);
  });

  it('does not replay heat or restore removed liquid on repeated progress', () => {
    const p = getProgramById('cuso4_nh3')!, v = sample(100);
    const first = { ...v, ...applyProgramWithThermalSinks(p, v, v, 0.5) };
    // Hold the environment fixed when testing duplicate receipts. A changed
    // temperature legitimately shifts equilibrium and the cumulative heat.
    const cooled = { ...first, temperature_c: v.temperature_c };
    const repeat = { ...cooled, ...applyProgramWithThermalSinks(p, v, cooled, 0.5) };
    expect(repeat.programHeatApplied_J).toBeCloseTo(first.programHeatApplied_J!, 10);
    expect(repeat.temperature_c).toBeCloseTo(cooled.temperature_c, 10);
    const k = planStudioProgram(p, v, 'vi').kinetics!; k.progress = 0.5;
    const remaining = { ...first, volume_ml: first.volume_ml / 2, mass_g: first.mass_g / 2,
      contents: first.contents.map(c => ({ ...c, moles: c.moles / 2, mass_g: c.mass_g / 2 })) };
    const next = continueReactionAfterOutflow(k, remaining, 'vi')!;
    expect(next).not.toBeNull();
    conserved(remaining, applyProgramWithThermalSinks(p, next.initialVesselBaseline!, remaining, 1));
  });

  it('advances the same chemical progress in the manual store and automatic core', () => {
    const e = new AutoExperiment('cuso4_nh3', false), p = e.program, v = createStudioSample(p, { ...e.sample, id: 'copper' });
    const k = planStudioProgram(p, v, 'vi').kinetics!;
    useAppStore.setState({ vessels: { copper: v }, activeKinetics: { copper: structuredClone(k) },
      burners: {}, spills: {}, pendingReactions: {}, isSimulationPaused: false, timeScale: 1 });
    const expected = advanceReaction(structuredClone(k), v, 0.1);
    useAppStore.getState().tickSimulation(0.1);
    expect(useAppStore.getState().activeKinetics.copper.progress).toBeCloseTo(expected, 12);
    conserved(v, useAppStore.getState().vessels.copper);
  });

  it('precipitates during the ammonia dose, then redissolves gel as more ammonia arrives', () => {
    const e = new AutoExperiment('cuso4_nh3', false);
    let peak = 0, sawGelDuringDose = false;
    for (let frame = 0; frame < 2000 && !['error', 'complete'].includes(e.phase); frame++) {
      e.tick(0.1);
      peak = Math.max(peak, e.sample.precipitateAmount_g ?? 0);
      if (e.phase === 'dose' && (e.sample.precipitateAmount_g ?? 0) > 1e-5) sawGelDuringDose = true;
    }
    expect(e.error).toBeNull(); expect(e.phase).toBe('complete');
    expect(sawGelDuringDose).toBe(true); expect(peak).toBeGreaterThan(1e-4);
    expect(e.sample.precipitateAmount_g ?? 0).toBeLessThan(1e-7);
    expect(e.sample.contents.some(c => c.formula === '[Cu(NH3)4]SO4')).toBe(true);
  }, 20000);
});
