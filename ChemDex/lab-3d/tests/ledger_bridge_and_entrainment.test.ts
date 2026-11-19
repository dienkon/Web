import { describe, expect, it } from 'vitest';
import { createLabMatterLedger, applyAtomicVesselTransfer, vesselToMatterParcels } from '../src/physical/ledgerBridge';
import { MatterLedger } from '../src/physical/MatterLedger';
import { stirredMobileSolids } from '../src/science/suspensionTransport';
import { decantLiquid } from '../src/engine/decantTransfer';
import { computeMolarMass } from '../src/engine/ledger';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';

const content = (formula: string, moles: number, phase = 'aq', extra: Partial<SubstanceContent> = {}): SubstanceContent => ({
  formula,
  moles,
  phase,
  mass_g: moles * computeMolarMass(formula),
  ...extra,
});

function makeVessel(id: string, contents: SubstanceContent[], volume_ml: number, patch: Partial<VesselState> = {}): VesselState {
  return {
    id,
    name: id,
    type: 'beaker',
    position: [0, 0, 0],
    rotationY: 0,
    isLocked: false,
    capacity_ml: 250,
    volume_ml,
    volume: volume_ml / 250,
    contents,
    substances: [...new Set(contents.map(c => c.formula))],
    mass_g: contents.reduce((sum, item) => sum + item.mass_g, 0),
    temperature_c: 25,
    ph: 7,
    hasGas: false,
    hasPrecipitate: contents.some(c => c.solidOrigin === 'precipitate'),
    isBoiling: false,
    ...patch,
  };
}

describe('Phase 2: MatterLedger bridge & stirred suspension entrainment', () => {
  it('projects vessel contents into SI MatterParcels and executes idempotent atomic transfers', () => {
    const src = makeVessel('src', [
      content('H2O', 50 / 18.015, 'l'),
      content('NaCl', 0.05, 'aq'),
    ], 50);
    const dst = makeVessel('dst', [], 0);

    const parcels = vesselToMatterParcels(src);
    expect(parcels).toHaveLength(2);
    expect(parcels.reduce((sum, p) => sum + p.mass_kg, 0)).toBeCloseTo(src.mass_g / 1000, 10);

    const ledger = createLabMatterLedger({ src, dst });
    const first = applyAtomicVesselTransfer(ledger, 'pour-001', src, dst, 20)!;
    expect(first).not.toBeNull();
    expect(first.duplicate).toBe(false);
    expect(first.accepted_ml).toBeCloseTo(20, 8);
    expect(first.totalsAfter.mass_kg).toBeCloseTo(first.totalsBefore.mass_kg, 12);
    for (const [el, n] of Object.entries(first.totalsBefore.elements_mol)) {
      expect(first.totalsAfter.elements_mol[el]).toBeCloseTo(n, 10);
    }

    // Replaying the same receipt after save/restore must be a strict no-op.
    const restored = new MatterLedger(ledger.snapshot());
    const replay = applyAtomicVesselTransfer(restored, 'pour-001', first.source, first.receiver!, 20)!;
    expect(replay.duplicate).toBe(true);
    expect(replay.transferred_kg).toBe(0);
    expect(replay.totalsAfter.mass_kg).toBeCloseTo(first.totalsBefore.mass_kg, 12);
  });

  it('tracks overflow spills into the SI ledger without losing mass or atoms', () => {
    const src = makeVessel('src', [content('H2O', 40 / 18.015, 'l')], 40);
    const small = makeVessel('small', [], 0, { capacity_ml: 10 });
    const ledger = createLabMatterLedger({ src, small });

    const out = applyAtomicVesselTransfer(ledger, 'overflow-001', src, small, 25)!;
    expect(out.accepted_ml).toBeCloseTo(10, 6);
    expect(out.spilled_ml).toBeCloseTo(15, 6);
    expect(out.totalsAfter.mass_kg).toBeCloseTo(out.totalsBefore.mass_kg, 12);
    expect(ledger.snapshot().parcels.some(p => p.location === 'spill')).toBe(true);
  });

  it('never erodes an unstirred precipitate bed, but entrains suspended precipitate when stirred', () => {
    const precipitate = content('Cu(OH)2', 0.01, 's', { solidOrigin: 'precipitate', precipitateFormation: 'gelatinous' });
    const src = makeVessel('src', [
      content('H2O', 50 / 18.015, 'l'),
      precipitate,
    ], 50, { precipitateSubstance: 'Cu(OH)2', precipitateMorphology: 'gelatinous' });
    const dst = makeVessel('dst', [], 0);

    // Unstirred: zero entrainment
    expect(stirredMobileSolids(src, 0)).toEqual({});
    const unstirred = decantLiquid(src, dst, 25)!;
    expect(unstirred.receiver!.contents.some(c => c.formula === 'Cu(OH)2')).toBe(false);

    // Actively stirred: entrains bounded fraction of free precipitate while conserving total mass
    const stirred = decantLiquid(src, dst, 25, {}, { stirringIntensity: 0.8 })!;
    const movedSolid = stirred.receiver!.contents.find(c => c.formula === 'Cu(OH)2');
    const keptSolid = stirred.source.contents.find(c => c.formula === 'Cu(OH)2');
    expect(movedSolid).toBeDefined();
    expect(movedSolid!.mass_g).toBeGreaterThan(0);
    expect(movedSolid!.mass_g).toBeLessThan(precipitate.mass_g * 0.5);
    expect(movedSolid!.mass_g + keptSolid!.mass_g).toBeCloseTo(precipitate.mass_g, 10);
    expect(stirred.source.mass_g + stirred.receiver!.mass_g).toBeCloseTo(src.mass_g, 10);
  });
});
