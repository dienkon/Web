import { describe, expect, it } from 'vitest';
import curriculum from '../src/data/curriculum/reactions.vi.json';
import { parseChemicalFormula } from '../src/engine/ledger';
import { getProgramById } from '../src/vfx/programs/library';
import { dispenseAliquot, withdrawAliquot } from '../src/handling/aliquot';
import { calculateVesselMass } from '../src/engine/interactionEngine';
import type { VesselState } from '../src/types/chemistry';
import { useAppStore } from '../src/store/useAppStore';

const entries = curriculum.reactions;
describe('Vietnamese THPT reaction data integrity', () => {
  it('contains more than 100 distinct equations and stable identifiers', () => {
    expect(entries.length).toBeGreaterThan(100);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
    const canonical = (equation: string) => equation.replace(/\((?:aq|s|l|g|dil|conc)\)/g, '').split(/ -> | <-> /)
      .map(side => side.split(' + ').map(term => term.replace(/^1(?=[A-Z])/, '')).sort().join('+')).join('->');
    expect(new Set(entries.map(entry => canonical(entry.equation))).size).toBe(entries.length);
  });

  it('resolves all claimed programs and labels reference material explicitly', () => {
    for (const entry of entries) {
      expect(entry.steps.length, entry.id).toBeGreaterThanOrEqual(4);
      expect(entry.protocolStatus, entry.id).toBe('reaction_specific');
      expect(entry.steps.map(step => step.order)).toEqual([1, 2, 3, 4]);
      expect(entry.steps.every(step => step.instruction_vi.length > 15)).toBe(true);
      expect(entry.quantityPolicy.length).toBeGreaterThan(20);
      expect(entry.sources.every(source => source.url.startsWith('https://'))).toBe(true);
      if (entry.runtime === 'existing_program' || entry.runtime === 'lesson_simulation') expect(getProgramById(entry.programId!), entry.id).toBeDefined();
      else expect(entry.programId).toBeNull();
    }
  });

  it('conserves element counts in all non-symbolic reaction species', () => {
    for (const entry of entries) {
      // n is symbolic polymer chain length; no fixed atom vector exists.
      if (entry.id === 'starch_hydrolysis') continue;
      const balance: Record<string, number> = {};
      for (const species of [...entry.reactants, ...entry.products]) {
        const sign = species.role === 'reactant' ? -1 : 1;
        for (const [element, count] of Object.entries(parseChemicalFormula(species.formula))) {
          balance[element] = (balance[element] ?? 0) + count * species.coeff * sign;
        }
      }
      expect(Object.values(balance).every(count => Math.abs(count) < 1e-8), `${entry.id}: ${JSON.stringify(balance)}`).toBe(true);
    }
  });
});

function vessel(overrides: Partial<VesselState> = {}): VesselState {
  return { id: 'source', name: 'test', type: 'beaker', capacity_ml: 100, volume_ml: 20,
    volume: 0.2, mass_g: 20.5, temperature_c: 25, ph: 7, position: [0, 0, 0],
    rotationY: 0, isLocked: false, hasPrecipitate: false, isBoiling: false, hasGas: false,
    substances: ['NaCl', 'KCl'], contents: [
      { formula: 'NaCl', phase: 'aq', moles: 0.002, mass_g: 0.11688 },
      { formula: 'KCl', phase: 'aq', moles: 0.001, mass_g: 0.07455 },
    ], ...overrides };
}

describe('Pipette aliquot conservation', () => {
  it('transfers one mixture volume while conserving each solute and total mass', () => {
    const original = vessel();
    const withdrawn = withdrawAliquot(original, 10);
    const receiver = vessel({ id: 'receiver', volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] });
    const result = dispenseAliquot(receiver, withdrawn.sample, 2.5);
    expect(result.vessel.volume_ml).toBe(2.5);
    expect(result.sample.volume_ml).toBe(7.5);
    expect(withdrawn.vessel.mass_g + result.vessel.mass_g + result.sample.mass_g).toBeCloseTo(original.mass_g, 12);
    for (const source of original.contents) {
      const amount = (list: typeof original.contents) => list.find(content => content.formula === source.formula)!.moles;
      expect(amount(withdrawn.vessel.contents) + amount(result.vessel.contents) + amount(result.sample.contents)).toBeCloseTo(source.moles, 12);
    }
    expect(original.volume_ml).toBe(20);
    expect(original.contents[0].moles).toBe(0.002);
  });

  it('keeps undissolved solids in the source and caps the receiver volume', () => {
    const source = vessel({ contents: [...vessel().contents, { formula: 'Cu', phase: 's', moles: 0.01, mass_g: 0.63546 }] });
    const withdrawn = withdrawAliquot(source, 100);
    expect(withdrawn.sample.contents.some(content => content.formula === 'Cu')).toBe(false);
    expect(withdrawn.vessel.contents.find(content => content.formula === 'Cu')!.mass_g).toBe(0.63546);
    const result = dispenseAliquot(vessel({ volume_ml: 99 }), withdrawn.sample, 2.5);
    expect(result.dispensed_ml).toBe(1);
    expect(result.vessel.volume_ml).toBe(100);
    expect(result.sample.volume_ml).toBe(19);
  });

  it('supports repeated dispensing without duplicating moles and rejects invalid quantities', () => {
    const source = vessel();
    let { sample } = withdrawAliquot(source, 10);
    let target = vessel({ volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] });
    for (let i = 0; i < 8; i++) ({ vessel: target, sample } = dispenseAliquot(target, sample, 2.5));
    expect(target.volume_ml).toBe(10);
    expect(target.contents[0].moles).toBeCloseTo(source.contents[0].moles / 2, 12);
    expect(sample.volume_ml).toBe(0);
    expect(withdrawAliquot(source, Number.NaN).sample.volume_ml).toBe(0);
    expect(dispenseAliquot(target, sample, -1).dispensed_ml).toBe(0);
  });

  it('weighs stored total mass once and honors an explicit container tare', () => {
    expect(calculateVesselMass(vessel({ tare_g: 50, mass_g: 20.5 }))).toBe(70.5);
    expect(calculateVesselMass(vessel({ tare_g: 0, mass_g: 20.5 }))).toBe(20.5);
  });
});

describe('Metered burette dosing', () => {
  function withBurette(run: (id: string) => void, remaining = 10) {
    const snapshot = useAppStore.getState();
    const id = 'metered_receiver';
    useAppStore.setState({ vessels: { ...snapshot.vessels, [id]: vessel({ id, volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] }) },
      burette: { ...snapshot.burette, reagentFormula: 'NaOH', concentration_M: 0.1, currentVolume_ml: remaining }, titrationHistory: [] });
    try { run(id); }
    finally { useAppStore.setState({ vessels: snapshot.vessels, burette: snapshot.burette,
      titrationHistory: snapshot.titrationHistory, activeKinetics: snapshot.activeKinetics, lastMixResult: snapshot.lastMixResult }); }
  }

  it('dispenses 0.05 mL at the burette concentration, preserving micromoles', () => withBurette(id => {
    useAppStore.getState().dispenseBuretteDrop(id);
    const state = useAppStore.getState();
    expect(state.vessels[id].volume_ml).toBeCloseTo(0.05, 12);
    expect(state.vessels[id].contents.find(c => c.formula === 'NaOH')!.moles).toBeCloseTo(0.000005, 12);
    expect(state.vessels[id].ph).toBeCloseTo(13, 6);
    expect(state.burette.currentVolume_ml).toBeCloseTo(9.95, 12);
  }));

  it('does not discard reagent on a full or nonexistent receiver', () => withBurette(id => {
    useAppStore.getState().setVesselState(id, { volume_ml: 100, volume: 1 });
    useAppStore.getState().dispenseBuretteDrop(id);
    useAppStore.getState().dispenseBuretteDrop('missing_receiver');
    expect(useAppStore.getState().burette.currentVolume_ml).toBe(10);
  }));

  it('uses only the final partial drop instead of manufacturing a full drop', () => withBurette(id => {
    useAppStore.getState().dispenseBuretteDrop(id);
    expect(useAppStore.getState().vessels[id].volume_ml).toBeCloseTo(0.02, 12);
    expect(useAppStore.getState().burette.currentVolume_ml).toBe(0);
  }, 0.02));

  it('consumes acid over repeated small drops without rounding it back up', () => withBurette(id => {
    const store = useAppStore.getState();
    store.setVesselState(id, { volume_ml: 20, volume: 0.2, mass_g: 20,
      substances: ['HCl'], contents: [{ formula: 'HCl', phase: 'aq', moles: 0.002, mass_g: 0.07292 }] });
    for (let drop = 0; drop < 20; drop++) useAppStore.getState().dispenseBuretteDrop(id);
    const target = useAppStore.getState().vessels[id];
    expect(target.volume_ml).toBeCloseTo(21, 10);
    expect(target.contents.find(c => c.formula === 'HCl')!.moles).toBeCloseTo(0.0019, 12);
    expect(target.contents.find(c => c.formula === 'NaCl')!.moles).toBeCloseTo(0.0001, 12);
    expect(useAppStore.getState().titrationHistory.at(-1)!.volumeAdded_ml).toBe(1);
  }));
});
