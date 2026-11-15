import { describe, expect, it } from 'vitest';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { getProgramById } from '../src/vfx/programs/library';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { attachedMetalForCarrier, attachedMetalMassForRow, metalSurfaceAppearances,
  releaseUnsupportedMetalDeposits, splitAttachedMetal } from '../src/science/metalSurfaceAppearance';
import { freePrecipitateCohorts } from '../src/science/freePrecipitateCohorts';
import { partitionDryStock, stockLiquidContactFraction } from '../src/physical/stockLiquidContact';
import { withdrawAliquot } from '../src/handling/aliquot';
import { mobileSolidInventory } from '../src/science/suspensionTransport';

const mm = computeMolarMass;
const row = (formula: string, phase: string, moles: number, metadata = {}): SubstanceContent =>
  ({ formula, phase, moles, mass_g: moles * mm(formula), ...metadata });
const coating = (id: string, mass = 0.1) => row('Cu', 's', mass / mm('Cu'), {
  solidOrigin: 'precipitate', depositSubstrate: 'Fe', depositionReactionId: 'fe_cuso4', depositCarrierId: id,
});
function fixture(two = false): VesselState {
  const sample = { id: 'layered', name: 'layered', type: 'beaker', capacity_ml: 100,
    position: [0, 0, 0], rotationY: 0, volume_ml: 30, volume: 0.3, temperature_c: 25, ph: 5,
    contents: [row('Fe', 's', 1 / mm('Fe')), row('H2O', 'l', 30 / mm('H2O')),
      row('AgNO3', 'aq', 0.0002), coating('fe:wet'), ...(two ? [coating('fe:dry')] : [])],
    substances: ['Fe', 'Cu', 'AgNO3', 'H2O'] } as VesselState;
  sample.stockMotion = { tick: 1, grains: (two ? [-0.7, 0.6] : [-0.7]).map((y, i) => ({
    id: i ? 'fe:dry' : 'fe:wet', formula: 'Fe', mass_g: two ? 0.5 : 1, scale_m: 0.002,
    position_m: vesselLocalToWorld(sample, [i ? 0.25 : -0.25, y, 0]).map(n => n * 0.035) as [number, number, number],
    rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false,
  })) };
  sample.mass_g = sample.contents.reduce((sum, item) => sum + item.mass_g, 0);
  return sample;
}
const program = getProgramById('cu_agno3')!;
const react = (sample: VesselState, progress = 1) => ({ ...sample,
  ...applyProgramToLedger(program, sample, progress, { deferThermal: true }) });
const silver = (sample: VesselState) => sample.contents.filter(item => item.formula === 'Ag' && item.phase === 's');
const mass = (sample: VesselState) => sample.contents.reduce((sum, item) => sum + item.mass_g, 0);

describe('metal grown from an existing coating retains its original carrier', () => {
  it('silver replacing a copper coating stays on the iron carrier with exact material volume', () => {
    const sample = fixture(), next = react(sample), ag = silver(next)[0];
    expect(ag).toMatchObject({ depositSubstrate: 'Cu', depositCarrierFormula: 'Fe', depositCarrierId: 'fe:wet' });
    expect(ag.depositReleased).not.toBe(true);
    expect(ag.mass_g).toBeCloseTo(0.0002 * mm('Ag'), 12);
    const copper = next.contents.find(item => item.formula === 'Cu')!.mass_g;
    expect(copper).toBeCloseTo(0.1 - 0.0001 * mm('Cu'), 12);
    expect(attachedMetalForCarrier(next, 'fe:wet')).toEqual({ mass_g: copper + ag.mass_g,
      volume_ml: copper / 8.96 + ag.mass_g / 10.5 });
    expect(metalSurfaceAppearances(next).map(group => [group.substrate, group.product])).toEqual([['Fe', 'Cu'], ['Fe', 'Ag']]);
    expect(freePrecipitateCohorts(next)).toEqual([]);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
    expect(next.stockMotion!.grains[0].mass_g).toBe(1);
  });

  it('consuming the intermediate copper does not release silver while its root support survives', () => {
    const sample = fixture();
    sample.contents[3] = coating('fe:wet', 0.0001 * mm('Cu'));
    sample.mass_g = mass(sample);
    const next = react(sample), ag = silver(next)[0];
    expect(next.contents.filter(item => item.formula === 'Cu').reduce((sum, item) => sum + item.mass_g, 0)).toBeCloseTo(0, 12);
    expect(attachedMetalForCarrier(next, 'fe:wet').mass_g).toBeCloseTo(ag.mass_g, 12);
    expect(freePrecipitateCohorts(next)).toEqual([]);
    const saved = JSON.parse(JSON.stringify({ ...next, lastReactionId: 'hcl_naoh' })) as VesselState;
    expect(attachedMetalMassForRow(saved, silver(saved)[0])).toBeCloseTo(ag.mass_g, 12);
    const released = releaseUnsupportedMetalDeposits(saved.contents.filter(item => item.formula !== 'Fe'),
      { tick: 2, grains: [] });
    const refilled = { ...saved, contents: [...released, sample.contents[0]], stockMotion: sample.stockMotion };
    expect(silver(refilled)[0].depositReleased).toBe(true);
    expect(attachedMetalForCarrier(refilled, 'fe:wet').mass_g).toBe(0);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('keeps a dry carrier coating unchanged and assigns new silver only to the consumed wet coating', () => {
    const sample = fixture(true);
    sample.contents[2] = row('AgNO3', 'aq', 0.1);
    sample.contents[3] = coating('fe:wet', 0.01); sample.contents[4] = coating('fe:dry', 0.01);
    sample.mass_g = mass(sample);
    const next = react(sample);
    expect(next.contents.find(item => item.formula === 'Cu' && item.depositCarrierId === 'fe:dry')!.mass_g).toBe(0.01);
    expect(silver(next)).toHaveLength(1);
    expect(silver(next)[0].depositCarrierId).toBe('fe:wet');
    expect(silver(next)[0].mass_g).toBeCloseTo(0.01 / mm('Cu') * 2 * mm('Ag'), 12);
    expect(attachedMetalForCarrier(next, 'fe:dry').mass_g).toBe(0.01);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('uses the root carrier contact for a layered product after the intermediate metal has gone', () => {
    const sample = fixture(); sample.contents[3] = coating('fe:wet', 0.0001 * mm('Cu'));
    const next = react(sample);
    next.stockMotion!.grains[0].position_m = vesselLocalToWorld(next, [0, 0.6, 0]).map(n => n * 0.035) as [number, number, number];
    expect(stockLiquidContactFraction(next, 'Ag')).toBe(0);
    expect(partitionDryStock(next).inertContents.some(item => item.formula === 'Ag')).toBe(true);
  });

  it.each([true, false])('allocates according to consumed free or coated Cu rather than formula alone (free first %s)', freeFirst => {
    const sample = fixture(), free = row('Cu', 's', 0.0001, { solidOrigin: 'precipitate' });
    if (freeFirst) sample.contents.splice(3, 0, free); else sample.contents.push(free);
    sample.mass_g = mass(sample);
    const next = react(sample), ag = silver(next)[0];
    expect(silver(next)).toHaveLength(1);
    if (freeFirst) {
      expect(ag.depositReleased).toBe(true);
      expect(ag.depositCarrierId).toBeUndefined();
      expect(next.contents.find(item => item.depositSubstrate === 'Fe')!.mass_g).toBe(0.1);
      expect(attachedMetalForCarrier(next, 'fe:wet').mass_g).toBe(0.1);
    } else {
      expect(ag.depositCarrierId).toBe('fe:wet');
      expect(ag.depositCarrierFormula).toBe('Fe');
      expect(next.contents.find(item => item.formula === 'Cu' && !item.depositSubstrate)!.mass_g).toBe(free.mass_g);
    }
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('independent copper stock receives its own yield without borrowing a coated iron carrier', () => {
    const sample = fixture(), copper = row('Cu', 's', 0.02 / mm('Cu'));
    sample.contents.splice(3, 0, copper);
    sample.stockMotion!.grains.push({ ...sample.stockMotion!.grains[0], id: 'cu:1', formula: 'Cu', mass_g: 0.02, scale_m: 0.001 });
    sample.mass_g = mass(sample);
    const next = react(sample), ag = silver(next)[0];
    expect(ag).toMatchObject({ depositCarrierId: 'cu:1', depositCarrierFormula: 'Cu' });
    expect(attachedMetalForCarrier(next, 'fe:wet').mass_g).toBe(0.1);
    expect(attachedMetalForCarrier(next, 'cu:1').mass_g).toBeCloseTo(0.0002 * mm('Ag'), 12);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('does not assign silver from a newly added unposed Cu dose to older Cu carriers', () => {
    const sample = fixture(); sample.contents = sample.contents.filter(item => item.formula !== 'Cu');
    sample.contents.push(row('Cu', 's', 0.04 / mm('Cu')));
    sample.stockMotion!.grains.push({ ...sample.stockMotion!.grains[0], id: 'cu:old', formula: 'Cu', mass_g: 0.02, scale_m: 0.001 });
    sample.mass_g = mass(sample);
    const next = react(sample);
    expect(next.stockMotion!.grains.find(pose => pose.id === 'cu:old')!.mass_g).toBe(0.02);
    expect(silver(next)[0].depositReleased).toBe(true);
    expect(silver(next)[0].depositCarrierId).toBeUndefined();
    expect(attachedMetalForCarrier(next, 'cu:old').mass_g).toBe(0);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('retains the root formula for unresolved static coating histories', () => {
    const sample = fixture(); sample.stockMotion = undefined;
    sample.contents[3] = { ...coating('unused', 0.0001 * mm('Cu')), depositCarrierId: undefined };
    sample.mass_g = mass(sample);
    const next = react(sample), ag = silver(next)[0];
    expect(ag).toMatchObject({ depositSubstrate: 'Cu', depositCarrierFormula: 'Fe' });
    expect(ag.depositReleased).not.toBe(true);
    expect(ag.depositCarrierId).toBeUndefined();
    expect(metalSurfaceAppearances(next).find(group => group.product === 'Ag')?.substrate).toBe('Fe');
    expect(freePrecipitateCohorts(next)).toEqual([]);
    expect(mass(next)).toBeCloseTo(mass(sample), 12);
  });

  it('retains prior layered allocation through replay and routes new growth after a wet/dry swap', () => {
    const baseline = fixture(true); baseline.contents[2] = row('AgNO3', 'aq', 0.0004);
    baseline.contents[3] = coating('fe:wet', 0.02); baseline.contents[4] = coating('fe:dry', 0.02);
    baseline.mass_g = mass(baseline);
    const first = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, 0.5, 0.1) };
    const oldSilver = silver(first).find(item => item.depositCarrierId === 'fe:wet')!.mass_g;
    const moved = structuredClone(first), [a, b] = moved.stockMotion!.grains;
    [a.position_m, b.position_m] = [b.position_m, a.position_m];
    const replay = { ...moved, ...applyProgramWithThermalSinks(program, baseline, moved, 0.5, 0.1) };
    expect(silver(replay)).toHaveLength(1);
    expect(silver(replay)[0].mass_g).toBeCloseTo(oldSilver, 12);
    const next = { ...replay, ...applyProgramWithThermalSinks(program, baseline, replay, 1, 0.1) };
    expect(silver(next).find(item => item.depositCarrierId === 'fe:wet')!.mass_g).toBeCloseTo(oldSilver, 12);
    expect(silver(next).find(item => item.depositCarrierId === 'fe:dry')!.mass_g).toBeCloseTo(oldSilver, 12);
    expect(mass(next)).toBeCloseTo(mass(baseline), 12);
  });

  it('moves all bound metals with their root and does not decant them as suspended solids', () => {
    const sample = fixture(), next = react(sample);
    const moved = splitAttachedMetal(next, 'Fe', 1, 'fe:wet');
    expect(moved.transferredContents.map(item => item.formula).sort()).toEqual(['Ag', 'Cu']);
    expect(moved.transferredContents.find(item => item.formula === 'Ag')!.depositCarrierFormula).toBe('Fe');
    expect(moved.remainingContents.some(item => item.formula === 'Ag')).toBe(false);
    const transport = { hasPrecipitationSnapshot: true,
      precipitationSystems: new Map(next.contents.filter(item => item.solidOrigin === 'precipitate')
        .map(item => [item.formula, { lastInputMass_g: item.mass_g, sedimentBed: { amount_g: 0 } }])),
      suspensionOutflowApplied_g: new Map([['Cu', 0], ['Ag', 0]]) };
    const aliquot = withdrawAliquot(next, 15, mobileSolidInventory(next, transport));
    expect(aliquot.sample.contents.some(item => item.phase === 's')).toBe(false);
    expect(aliquot.vessel.contents.find(item => item.formula === 'Ag')!.mass_g).toBe(silver(next)[0].mass_g);
  });
});
