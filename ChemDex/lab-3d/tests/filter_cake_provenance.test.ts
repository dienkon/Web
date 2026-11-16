import { describe, expect, it } from 'vitest';
import { recoverFilterCake, stepFunnelFlow } from '../src/engine/funnelFlow';
import { computeMolarMass } from '../src/engine/ledger';
import { precipitateCohorts } from '../src/science/precipitateInventory';
import { VesselSimulationManager } from '../src/simulation/core/SimulationEngine';
import { useAppStore } from '../src/store/useAppStore';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const row = (formula: string, mass_g: number, patch: Partial<SubstanceContent> = {}): SubstanceContent => ({
  formula, phase: 's', mass_g, moles: mass_g / computeMolarMass(formula), ...patch,
});
function vessel(id: string, contents: SubstanceContent[], patch: Partial<VesselState> = {}): VesselState {
  return { id, name: id, type: 'beaker', position: [0, 0, 0], rotationY: 0, isLocked: false,
    capacity_ml: 100, volume_ml: 20, volume: .2, temperature_c: 25, ph: 7,
    hasGas: false, hasPrecipitate: false, isBoiling: false,
    contents, substances: [...new Set(contents.map(item => item.formula))],
    mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0), ...patch };
}
const fine = (mass_g: number) => row('PbI2', mass_g, { solidOrigin: 'precipitate', precipitateFormation: 'FINE_POWDER' });
const plate = (mass_g: number) => row('PbI2', mass_g, { solidOrigin: 'precipitate', precipitateFormation: 'CRYSTAL_PLATE' });
const water = () => row('H2O', 20, { phase: 'l' });
const cake = (rows: SubstanceContent[], patch: Partial<VesselState> = {}) => vessel('filter', rows.map(item => ({ ...item, location: 'filter' })),
  { type: 'filter_funnel', volume_ml: 0, volume: 0, filterPaperResidue_g: rows.reduce((sum, item) => sum + item.mass_g, 0), ...patch });
const cohorts = (v: VesselState) => precipitateCohorts(v.contents, v.precipitateSubstance, v.precipitateMorphology)
  .map(item => [item.key, item.mass_g]);

describe('Filter recovery retains each physical solid history', () => {
  it('keeps recovered plates separate from existing powder and delivers both actual populations', () => {
    const source = cake([plate(.2)]), receiver = vessel('receiver', [water(), fine(.1)]);
    const before = structuredClone({ source, receiver });
    const result = recoverFilterCake(source, receiver)!;
    expect(cohorts(result.receiver)).toEqual([['PbI2', .1], ['PbI2|CRYSTAL_PLATE', .2]]);
    const manager = new VesselSimulationManager(receiver.id, 'low');
    manager.step(result.receiver, .1, { thermalStateAuthoritative: true });
    expect([...manager.precipitationSystems.keys()].sort()).toEqual(['PbI2', 'PbI2|CRYSTAL_PLATE']);
    expect(manager.precipitationSystems.get('PbI2')!.representedMass_g).toBeCloseTo(.1, 12);
    expect(manager.precipitationSystems.get('PbI2|CRYSTAL_PLATE')!.representedMass_g).toBeCloseTo(.2, 12);
    expect(result.source.mass_g + result.receiver.mass_g).toBeCloseTo(source.mass_g + receiver.mass_g, 12);
    expect({ source, receiver }).toEqual(before);
    expect(recoverFilterCake(result.source, result.receiver)).toBeNull();
  });

  it('does not turn recovered product into separately added macrostock of the same formula', () => {
    const source = cake([plate(.2)]), receiver = vessel('receiver', [water(), row('PbI2', .5, { initialMass_g: .5 })]);
    const result = recoverFilterCake(source, receiver)!;
    expect(cohorts(result.receiver)).toEqual([['PbI2|CRYSTAL_PLATE', .2]]);
    expect(result.receiver.contents.find(item => item.initialMass_g === .5)?.mass_g).toBe(.5);
  });

  it('materializes legacy crystal formation before capture clears the source summary', () => {
    const source = vessel('filter', [water(), row('PbI2', .2)], { type: 'filter_funnel',
      hasPrecipitate: true, precipitateAmount_g: .2, precipitateSubstance: 'PbI2', precipitateMorphology: 'CRYSTAL_PLATE' });
    const filtered = stepFunnelFlow(source, null, .1).source;
    expect(filtered.hasPrecipitate).toBe(false);
    expect(filtered.contents.find(item => item.formula === 'PbI2')).toMatchObject({ location: 'filter',
      solidOrigin: 'precipitate', precipitateFormation: 'CRYSTAL_PLATE' });
    const result = recoverFilterCake(filtered, vessel('receiver', [water(), fine(.1)]))!;
    expect(cohorts(result.receiver)).toEqual([['PbI2', .1], ['PbI2|CRYSTAL_PLATE', .2]]);
  });

  it('preserves a receiver legacy plate population before adding explicitly tagged fresh powder', () => {
    const receiver = vessel('receiver', [water(), row('PbI2', .1)], { hasPrecipitate: true,
      precipitateAmount_g: .1, precipitateSubstance: 'PbI2', precipitateMorphology: 'CRYSTAL_PLATE' });
    const result = recoverFilterCake(cake([fine(.2)]), receiver)!;
    expect(cohorts(result.receiver)).toEqual([['PbI2', .2], ['PbI2|CRYSTAL_PLATE', .1]]);
  });

  it('retains released metal provenance beside independent metal stock and other deposit routes', () => {
    const liberated = row('Cu', .2, { solidOrigin: 'precipitate', depositSubstrate: 'Fe',
      depositionReactionId: 'fe_cuso4', depositCarrierId: 'old-iron', depositCarrierFormula: 'Fe', depositReleased: true });
    const other = row('Cu', .1, { solidOrigin: 'precipitate', depositSubstrate: 'Zn',
      depositionReactionId: 'zn_cuso4', depositCarrierId: 'old-zinc', depositCarrierFormula: 'Zn', depositReleased: true });
    const receiver = vessel('receiver', [water(), row('Cu', .5), other]);
    const result = recoverFilterCake(cake([liberated]), receiver)!;
    expect(result.receiver.contents.find(item => item.depositCarrierId === 'old-iron')).toEqual({ ...liberated, location: 'bulk' });
    expect(result.receiver.contents.find(item => item.depositCarrierId === 'old-zinc')).toEqual(other);
    expect(result.receiver.contents.find(item => item.formula === 'Cu' && !item.solidOrigin)?.mass_g).toBe(.5);
    expect(result.source.mass_g + result.receiver.mass_g).toBeCloseTo(receiver.mass_g + .2, 12);
  });

  it('preserves both formations through the actual recovery action and never recovers the cake twice', () => {
    const initial = useAppStore.getState(), source = cake([plate(.2)]);
    const receiver = vessel('receiver', [fine(.1)], { type: 'watch_glass', volume_ml: 0, volume: 0 });
    try {
      useAppStore.setState({ vessels: { [source.id]: source, [receiver.id]: receiver },
        vesselIds: [source.id, receiver.id], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {} });
      useAppStore.getState().recoverFilterResidue(source.id, receiver.id);
      const result = useAppStore.getState();
      expect(cohorts(result.vessels[receiver.id])).toEqual([['PbI2', .1], ['PbI2|CRYSTAL_PLATE', .2]]);
      expect(result.vessels[source.id].filterPaperResidue_g).toBe(0);
      expect(result.vessels[source.id].mass_g + result.vessels[receiver.id].mass_g).toBeCloseTo(.3, 12);
      result.recoverFilterResidue(source.id, receiver.id);
      expect(useAppStore.getState().vessels[receiver.id]).toBe(result.vessels[receiver.id]);
    } finally { useAppStore.setState(initial, true); }
  });
});
