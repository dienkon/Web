import { describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { LAB_PRESET_IDS, materializePresetInventory } from '../src/engine/presetInventory';
import { stepFunnelFlow, selectFunnelReceiver, recoverFilterCake, phaseVolumes, separatedLayers } from '../src/engine/funnelFlow';
import { computeMolarMass } from '../src/engine/ledger';
import { readComposition } from '../src/science/balance';
import { identifySpecies } from '../src/science/speciesIdentity';
import { partitionLeadIodide } from '../src/engine/leadIodidePhase';
import { withdrawAliquot } from '../src/handling/aliquot';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const amount = (formula: string, mass_g: number, phase: string): SubstanceContent => ({
  formula, phase, mass_g, moles: mass_g / computeMolarMass(formula),
});
const vessel = (patch: Partial<VesselState> = {}): VesselState => ({
  id: 'flow_source', name: 'Funnel', type: 'filter_funnel', capacity_ml: 150,
  position: [4, 1, 4], rotationY: 0, isLocked: false, volume_ml: 100, volume: 2 / 3,
  mass_g: 103, contents: [amount('H2O', 100, 'l'), amount('NaCl', 2, 'aq'), amount('BaSO4', 1, 's')],
  substances: ['H2O', 'NaCl', 'BaSO4'], temperature_c: 25, ph: 7,
  hasPrecipitate: true, precipitateAmount_g: 1, precipitateSubstance: 'BaSO4', hasGas: false, isBoiling: false, ...patch,
});
const receiver = (patch: Partial<VesselState> = {}) => vessel({ id: 'flow_receiver', name: 'Receiver', type: 'beaker',
  position: [4, 0, 4], contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0,
  hasPrecipitate: false, precipitateAmount_g: 0, ...patch });
function atoms(items: SubstanceContent[]) {
  const result: Record<string, number> = {};
  for (const item of items) for (const [atom, count] of Object.entries(readComposition(item.formula).atoms)) {
    result[atom] = (result[atom] ?? 0) + count * item.moles;
  }
  return result;
}
function conserved(before: SubstanceContent[], after: SubstanceContent[]) {
  const initial = atoms(before), final = atoms(after);
  for (const key of new Set([...Object.keys(initial), ...Object.keys(final)])) expect(final[key] ?? 0, key).toBeCloseTo(initial[key] ?? 0, 10);
}

describe('Every authored preset has an explicit finite inventory', () => {
  it('retires the old reaction when a new preset replaces its vessel identifiers', () => {
    const before = useAppStore.getState();
    try {
      useAppStore.setState({ burners: {}, activeKinetics: { beaker_1: {
        vesselId: 'beaker_1', reactionId: 'hcl_naoh_neutralization', startTime: Date.now(), duration: 5, progress: 0,
        reactionName: 'Old reaction', equation: 'HCl + NaOH -> NaCl + H2O', initialLiquidColor: '#fff',
        targetLiquidColor: '#fff', targetTemp: 80, hasGas: false, hasPrecipitate: false, dissolvingReactants: [],
      } } });
      useAppStore.getState().setupExperimentPreset('golden_rain_synthesis');
      useAppStore.getState().tickSimulation(0.05);
      const current = useAppStore.getState();
      expect(current.activeKinetics.beaker_1).toBeUndefined();
      expect(current.vessels.beaker_1.temperature_c).toBeCloseTo(25, 10);
      expect(current.vessels.beaker_1.contents.some(item => item.formula === 'Pb(NO3)2')).toBe(true);
    } finally { useAppStore.setState(before, true); }
  });
  it.each(LAB_PRESET_IDS)('%s accounts for solvent, phases and the whole sample mass', id => {
    const before = useAppStore.getState();
    try {
      useAppStore.getState().setupExperimentPreset(id);
      const state = useAppStore.getState();
      expect(state.vesselIds.length).toBeGreaterThan(0);
      for (const item of Object.values(state.vessels)) {
        expect(item.contents.reduce((sum, content) => sum + content.mass_g, 0), item.name).toBeCloseTo(item.mass_g, 8);
        expect(item.contents.every(content => content.phase && Number.isFinite(content.moles) && content.moles >= 0)).toBe(true);
        if (item.volume_ml > 0) expect(item.contents.some(content => content.formula === 'H2O' && content.mass_g > 0), item.name).toBe(true);
        else expect(item.contents.some(content => content.formula === 'H2O')).toBe(false);
        expect(materializePresetInventory(item)).toEqual(item);
      }
    } finally { useAppStore.setState(before, true); }
  });

  it('makes concentrated-acid mass fractions agree with their preset labels', () => {
    const before = useAppStore.getState();
    try {
      for (const [id, formula, fraction] of [['redox_gas_cu_hno3', 'HNO3', 0.68], ['acid_safety_dilution', 'H2SO4', 0.98]] as const) {
        useAppStore.getState().setupExperimentPreset(id);
        const sample = Object.values(useAppStore.getState().vessels).find(v => v.contents.some(item => identifySpecies(item.formula).formula === formula))!;
        const acid = sample.contents.find(item => identifySpecies(item.formula).formula === formula)!;
        expect(identifySpecies(acid.formula).concentration).toBe('concentrated');
        expect(acid.mass_g / sample.mass_g).toBeCloseTo(fraction, 10);
        expect(acid.moles * computeMolarMass(formula)).toBeCloseTo(acid.mass_g, 10);
      }
    } finally { useAppStore.setState(before, true); }
  });
});

describe('Ideal filtration keeps one finite cake and moves real filtrate', () => {
  it.each([-1, NaN, Infinity])('does not drain an invalid mass %s', value => {
    const input = vessel(); input.contents[0].mass_g = value;
    const result = stepFunnelFlow(input, receiver(), 1);
    expect(result.moved_ml).toBe(0);
    expect(result.receiver).toBeUndefined();
  });
  it('passes dissolved salt and retains solid without duplicating atoms or mass', () => {
    const initial = vessel();
    const result = stepFunnelFlow(initial, receiver(), 5);
    expect(result.moved_ml).toBe(10);
    expect(result.source.filterPaperResidue_g).toBe(1);
    expect(result.source.contents.find(item => item.formula === 'BaSO4')?.location).toBe('filter');
    expect(result.receiver!.contents.some(item => item.formula === 'NaCl')).toBe(true);
    expect(result.receiver!.contents.some(item => item.formula === 'BaSO4')).toBe(false);
    expect(result.source.mass_g + result.receiver!.mass_g).toBeCloseTo(initial.mass_g, 10);
    conserved(initial.contents, [...result.source.contents, ...result.receiver!.contents]);
    expect(initial.contents[2].location).toBeUndefined();
  });

  it('does not keep creating residue after all filtrate is collected', () => {
    let source = vessel(), target = receiver();
    for (let i = 0; i < 800; i++) {
      const result = stepFunnelFlow(source, target, 0.1);
      source = result.source; target = result.receiver ?? target;
    }
    expect(source.volume_ml).toBeCloseTo(0, 9);
    expect(source.mass_g).toBeCloseTo(1, 9);
    expect(source.filterPaperResidue_g).toBe(1);
    expect(source.isFiltrating).toBe(false);
    expect(target.mass_g).toBeCloseTo(102, 9);
    conserved(vessel().contents, [...source.contents, ...target.contents]);
  });

  it('recovers cake once into a separate container instead of deleting it', () => {
    const filtered = stepFunnelFlow(vessel(), receiver(), 5).source;
    const recovered = recoverFilterCake(filtered, receiver({ id: 'cake', type: 'watch_glass' }))!;
    expect(recovered.source.filterPaperResidue_g).toBe(0);
    expect(recovered.receiver.mass_g).toBe(1);
    expect(recovered.receiver.contents[0].location).toBe('bulk');
    expect(recovered.source.mass_g + recovered.receiver.mass_g).toBeCloseTo(filtered.mass_g, 12);
    expect(recoverFilterCake(recovered.source, receiver())).toBeNull();
    conserved(filtered.contents, [...recovered.source.contents, ...recovered.receiver.contents]);
  });

  it('records overflow and uncollected droplets with their full composition', () => {
    const initial = vessel();
    const result = stepFunnelFlow(initial, receiver({ capacity_ml: 1 }), 5);
    expect(result.receiver!.volume_ml).toBe(1);
    expect(result.spill!.volume_ml).toBe(9);
    expect(result.source.mass_g + result.receiver!.mass_g + result.spill!.mass_g).toBeCloseTo(initial.mass_g, 10);
    conserved(initial.contents, [...result.source.contents, ...result.receiver!.contents, ...result.spill!.contents]);
    const noReceiver = stepFunnelFlow(initial, null, 0.001);
    expect(noReceiver.spill!.volume_ml).toBe(0.002);
    expect(noReceiver.spill!.contents.some(item => item.formula === 'NaCl')).toBe(true);
  });

  it('does not manufacture a precipitate or a filtrate from display flags', () => {
    const untracked = vessel({ contents: [], precipitateAmount_g: 1.2 });
    const result = stepFunnelFlow(untracked, receiver(), 1);
    expect(result.moved_ml).toBe(0);
    expect(result.source.filterPaperResidue_g).toBe(0);
    expect(result.source.mass_g).toBe(untracked.mass_g);
  });

  it('leaves headspace gas in place when taking a liquid aliquot', () => {
    const input = vessel({ contents: [...vessel().contents, amount('H2', 0.002016, 'g')], mass_g: 103.002016 });
    const result = withdrawAliquot(input, 10);
    expect(result.sample.contents.some(item => item.phase === 'g')).toBe(false);
    expect(result.vessel.contents.find(item => item.formula === 'H2')!.mass_g).toBe(0.002016);
    expect(result.sample.mass_g).toBeCloseTo(10.2, 10);
  });

  it('does not let the beaker solubility projection relocate retained PbI2 cake', () => {
    const input = vessel({ contents: [amount('H2O', 100, 'l'), { ...amount('PbI2', 1, 's'), location: 'filter' }], mass_g: 101 });
    expect(partitionLeadIodide(input, 1)).toBeNull();
  });
});

describe('Separatory funnel uses finite lower-layer inventory', () => {
  const separated = () => vessel({ type: 'separatory_funnel', stopcockOpen: true, volume_ml: 30,
    immiscibleOrganicVolume_ml: 10, mass_g: 27.6, hasPrecipitate: false,
    contents: [amount('H2O', 20, 'l'), amount('NaCl', 1, 'aq'), { ...amount('C6H14', 6.6, 'l'), liquidLayer: 'organic' }],
    substances: ['H2O', 'NaCl', 'C6H14'] });

  it('drains water below hexane and preserves both phase volumes and all molecules', () => {
    const initial = separated();
    const result = stepFunnelFlow(initial, receiver(), 4);
    expect(result.source.volume_ml).toBe(20);
    expect(result.source.immiscibleOrganicVolume_ml).toBe(10);
    expect(result.receiver!.contents.some(item => item.formula === 'C6H14')).toBe(false);
    expect(result.receiver!.contents.find(item => item.formula === 'NaCl')!.mass_g).toBeCloseTo(0.5);
    expect(phaseVolumes(result.source)).toEqual({ aqueous: 10, organic: 10 });
    expect(result.source.mass_g + result.receiver!.mass_g).toBeCloseTo(initial.mass_g, 10);
    conserved(initial.contents, [...result.source.contents, ...result.receiver!.contents]);
  });

  it('drains a denser organic phase first instead of assuming organics float', () => {
    const initial = separated();
    initial.contents[2] = { ...amount('CHCl3', 15, 'l'), liquidLayer: 'organic' };
    initial.mass_g = 36;
    const result = stepFunnelFlow(initial, receiver(), 2);
    expect(result.receiver!.contents.map(item => item.formula)).toEqual(['CHCl3']);
    expect(result.source.immiscibleOrganicVolume_ml).toBe(5);
    expect(phaseVolumes(result.source).aqueous).toBe(20);
    expect(separatedLayers(initial).lower).toBe('organic');
    conserved(initial.contents, [...result.source.contents, ...result.receiver!.contents]);
  });

  it('needs an open valve and an unstoppered source, and empties without going negative', () => {
    const initial = separated();
    expect(stepFunnelFlow({ ...initial, stopcockOpen: false }, receiver(), 2).moved_ml).toBe(0);
    expect(stepFunnelFlow({ ...initial, isSealed: true }, receiver(), 2).moved_ml).toBe(0);
    let source = initial, target = receiver();
    for (let i = 0; i < 200; i++) {
      const result = stepFunnelFlow(source, target, 0.1); source = result.source; target = result.receiver ?? target;
    }
    expect(source.volume_ml).toBeCloseTo(0, 9);
    expect(source.mass_g).toBeCloseTo(0, 9);
    expect(target.mass_g).toBeCloseTo(initial.mass_g, 9);
    expect(target.immiscibleOrganicVolume_ml).toBeCloseTo(10, 9);
  });

  it('chooses a receiver below the source and rejects an explicit misplaced receiver', () => {
    const source = separated(), below = receiver(), above = receiver({ id: 'above', position: [4, 2, 4] });
    expect(selectFunnelReceiver(source, { below, above })?.id).toBe(below.id);
    expect(selectFunnelReceiver({ ...source, flowReceiverId: above.id }, { [above.id]: above, [below.id]: below })).toBeNull();
  });
});

describe('Store flow and cleanup preserve sample mass', () => {
  it.each([25, 120])('recovered Cu(OH)2 remains a real reagent at %s °C', temperature => {
    const before = useAppStore.getState();
    try {
      const source = vessel({ contents: [amount('H2O', 10, 'l'), { ...amount('Cu(OH)2', 1, 's'), location: 'filter' }],
        mass_g: 11, volume_ml: 10, filterPaperResidue_g: 1, filterPaperResidueSubstance: 'Cu(OH)2' });
      const target = receiver({ id: 'recovered', type: 'watch_glass', temperature_c: temperature });
      useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target }, vesselIds: [source.id, target.id],
        burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, isSimulationPaused: false });
      useAppStore.getState().recoverFilterResidue(source.id, target.id);
      const state = useAppStore.getState();
      const recovered = state.vessels[target.id];
      expect(state.vessels[source.id].mass_g + recovered.mass_g).toBeCloseTo(11, 10);
      if (temperature === 25) {
        expect(recovered.contents.some(item => item.formula === 'Cu(OH)2')).toBe(true);
        expect(state.pendingReactions[target.id]).toBeDefined();
      } else {
        expect(recovered.contents.some(item => item.formula === 'CuO' && item.phase === 's')).toBe(true);
        expect(recovered.contents.some(item => item.formula === 'H2O' && item.phase === 'g')).toBe(true);
        expect(state.activeKinetics[target.id]?.reactionId).toBe('cuoh2_thermal_decomposition');
      }
    } finally { useAppStore.setState(before, true); }
  });
  it('runs gravity filtration at room temperature and moves the actual cake through the recovery tool', () => {
    const before = useAppStore.getState();
    try {
      const source = vessel(), target = receiver(), cake = receiver({ id: 'cake', type: 'watch_glass' });
      useAppStore.setState({ vessels: { [source.id]: source, [target.id]: target, [cake.id]: cake }, vesselIds: [source.id, target.id, cake.id],
        burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {}, spills: {}, wasteMass_g: 0, isSimulationPaused: false });
      useAppStore.getState().tickSimulation(0.1);
      let state = useAppStore.getState();
      expect(state.vessels[target.id].mass_g).toBeGreaterThan(0);
      expect(state.vessels[source.id].filterPaperResidue_g).toBe(1);
      expect(Object.values(state.vessels).reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(103, 9);
      state.recoverFilterResidue(source.id, cake.id);
      state = useAppStore.getState();
      expect(state.vessels[cake.id].mass_g).toBe(1);
      expect(state.vessels[source.id].filterPaperResidue_g).toBe(0);
      expect(Object.values(state.vessels).reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(103, 9);
    } finally { useAppStore.setState(before, true); }
  });

  it('keeps sub-20-microliter spills and merges their molecules, then records cleaned mass as waste', () => {
    const before = useAppStore.getState();
    try {
      useAppStore.setState({ spills: {}, wasteMass_g: 0 });
      const contents = [amount('NaCl', 0.0001, 'aq'), amount('H2O', 0.0009, 'l')];
      for (let i = 0; i < 2; i++) useAppStore.getState().addSpill([4, 0, 4], 0.001, ['NaCl', 'H2O'], '#fff', 'Test', 0.001, contents);
      const spill = Object.values(useAppStore.getState().spills)[0];
      expect(spill.mass_g).toBe(0.002);
      expect(spill.contents!.find(item => item.formula === 'NaCl')!.mass_g).toBe(0.0002);
      useAppStore.getState().cleanSpills();
      expect(useAppStore.getState().wasteMass_g).toBe(0.002);
    } finally { useAppStore.setState(before, true); }
  });
});
