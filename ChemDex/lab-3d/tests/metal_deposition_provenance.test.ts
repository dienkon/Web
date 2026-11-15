import { describe, expect, it } from 'vitest';
import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { SubstanceContent, VesselState } from '../src/types/chemistry';
import { attachedMetalForCarrier, attachedMetalMassForRow, metalSurfaceAppearances, releaseUnsupportedMetalDeposits, splitAttachedMetal } from '../src/science/metalSurfaceAppearance';
import { appendMetalDeposit } from '../src/science/metalDeposition';
import { applyProgramToLedger, computeMolarMass } from '../src/engine/ledger';
import { applyProgramWithThermalSinks } from '../src/engine/thermalLedger';
import { executeMultiStepReactions } from '../src/engine/chemistryEngine';
import { getProgramById } from '../src/vfx/programs/library';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { metalDepositAnchors, metalDepositPlacement, metalDepositPlacements } from '../src/science/metalDepositGeometry';
import { geometryVolume } from '../src/science/stockSolidGeometry';
import { vesselInterior } from '../src/science/vesselDimensions';
import { powderCarrierAppearance } from '../src/components/three/ContactPowder';

function vessel(): VesselState {
  const v = { id: 'coating', name: 'coating', type: 'beaker', capacity_ml: 100, position: [0, 0, 0],
    rotationY: 0, volume_ml: 30, volume: 0.3, temperature_c: 25, mass_g: 31, ph: 5,
    substances: ['Fe', 'CuSO4', 'H2O'], contents: [
      { formula: 'Fe', phase: 's', mass_g: 1, moles: 1 / computeMolarMass('Fe') },
      { formula: 'CuSO4', phase: 'aq', mass_g: 0.0005 * computeMolarMass('CuSO4'), moles: 0.0005 },
      { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / computeMolarMass('H2O') },
    ] } as VesselState;
  v.mass_g = v.contents.reduce((sum, row) => sum + row.mass_g, 0);
  v.stockMotion = { tick: 1, grains: [-0.7, 0.6].map((y, i) => ({ id: i ? 'dry' : 'wet', formula: 'Fe', mass_g: 0.5,
    scale_m: 0.002, position_m: vesselLocalToWorld(v, [i ? 0.25 : -0.25, y, 0]).map(n => n * 0.035) as [number, number, number],
    rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: true, powder: false })) };
  return v;
}
const copper = (mass_g: number): SubstanceContent => ({ formula: 'Cu', phase: 's', mass_g,
  moles: mass_g / computeMolarMass('Cu'), solidOrigin: 'precipitate' });

describe('durable finite metal deposition', () => {
  it.each([['zn_agno3', 'Zn', 'Ag'], ['cu_agno3', 'Cu', 'Ag'], ['mg_cuso4', 'Mg', 'Cu'],
    ['zn_cuso4', 'Zn', 'Cu'], ['fe_cuso4_displacement', 'Fe', 'Cu'], ['zn+pb(no3)2', 'Zn', 'Pb']])
  ('%s retains finite product on its own substrate', (reaction, substrate, product) => {
    const v = vessel(); v.contents[0] = { ...v.contents[0], formula: substrate, moles: 1 / computeMolarMass(substrate) };
    v.stockMotion!.grains.forEach(pose => { pose.formula = substrate; });
    appendMetalDeposit(v.contents, { ...copper(0.1), formula: product, moles: 0.1 / computeMolarMass(product) }, reaction, v);
    expect(metalSurfaceAppearances(v)[0]).toMatchObject({ substrate, product, attachedMass_g: 0.1 });
    expect(attachedMetalForCarrier(v, 'wet').mass_g).toBeCloseTo(0.1, 12);
    expect(attachedMetalForCarrier(v, 'dry').mass_g).toBe(0);
  });

  it('keeps exact attached and free inventories after a different reaction and save round trip', () => {
    const v = vessel(); appendMetalDeposit(v.contents, copper(0.1), 'fe_cuso4', v);
    v.contents.push({ ...copper(0.2), depositSubstrate: 'Zn', depositionReactionId: 'zn_cuso4', depositReleased: true });
    const saved = JSON.parse(JSON.stringify({ ...v, lastReactionId: 'hcl_naoh', studioProgramId: undefined })) as VesselState;
    expect(metalSurfaceAppearances(saved).map(c => [c.product, c.attachedMass_g])).toEqual([['Cu', 0.1]]);
    expect(saved.contents.reduce((sum, row) => sum + attachedMetalMassForRow(saved, row), 0)).toBeCloseTo(0.1, 12);
    expect(attachedMetalForCarrier(saved, 'wet')).toEqual({ mass_g: 0.1, volume_ml: 0.1 / 8.96 });
    expect(attachedMetalForCarrier(saved, 'dry').mass_g).toBe(0);
  });

  it('preserves old carrier allocation through baseline replay and assigns only new growth to the newly wet carrier', () => {
    const baseline = vessel(), program = getProgramById('fe_cuso4')!;
    const first = { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, 0.5, 0.1) };
    const oldMass = attachedMetalForCarrier(first, 'wet').mass_g;
    expect(oldMass).toBeCloseTo(0.00025 * computeMolarMass('Cu'), 12);
    const moved = structuredClone(first);
    const a = moved.stockMotion!.grains[0], b = moved.stockMotion!.grains[1];
    [a.position_m, b.position_m] = [b.position_m, a.position_m];
    const replay = { ...moved, ...applyProgramWithThermalSinks(program, baseline, moved, 0.5, 0.1) };
    expect(attachedMetalForCarrier(replay, 'wet').mass_g).toBeCloseTo(oldMass, 12);
    expect(attachedMetalForCarrier(replay, 'dry').mass_g).toBe(0);
    const next = { ...replay, ...applyProgramWithThermalSinks(program, baseline, replay, 1, 0.1) };
    expect(attachedMetalForCarrier(next, 'wet').mass_g).toBeCloseTo(oldMass, 12);
    expect(attachedMetalForCarrier(next, 'dry').mass_g).toBeCloseTo(oldMass, 12);
    expect(next.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(baseline.mass_g, 10);
  });

  it('native displacement produces persistent provenance without a studio reaction label', () => {
    const sample = vessel(), result = executeMultiStepReactions(sample.contents, sample.substances, 30, 25, false, 'vi', { vesselContact: sample });
    const next = { ...sample, contents: result.updatedContents, stockMotion: result.stockMotion };
    expect(result.reactionsOccurred.some(r => r.reactionId === 'fe_cuso4_displacement')).toBe(true);
    expect(metalSurfaceAppearances(next)[0].attachedMass_g).toBeCloseTo(0.0005 * computeMolarMass('Cu'), 10);
    expect(attachedMetalForCarrier(next, 'dry').mass_g).toBe(0);
  });

  it('moves coating with its exact core and never reallocates it to the other grain', () => {
    const v = vessel(); appendMetalDeposit(v.contents, copper(0.1), 'fe_cuso4', v);
    expect(splitAttachedMetal(v, 'Fe', 0.5, 'dry').transferredContents).toHaveLength(0);
    const moved = splitAttachedMetal(v, 'Fe', 0.25, 'wet');
    expect(moved.transferredContents[0].mass_g).toBeCloseTo(0.05, 12);
    expect(moved.transferredContents[0].depositCarrierId).toBe('wet');
    expect([...moved.remainingContents, ...moved.transferredContents].reduce((sum, row) => sum + row.mass_g, 0))
      .toBeCloseTo(v.contents.reduce((sum, row) => sum + row.mass_g, 0), 12);
  });

  it('liberated deposit cannot attach to a later replacement of the exhausted substrate', () => {
    const v = vessel(); appendMetalDeposit(v.contents, copper(0.1), 'fe_cuso4', v);
    const released = releaseUnsupportedMetalDeposits(v.contents.filter(row => row.formula !== 'Fe'));
    const refilled = { ...v, contents: [...released, v.contents[0]] };
    expect(metalSurfaceAppearances(refilled)).toHaveLength(0);
    expect(released.find(row => row.formula === 'Cu')?.depositReleased).toBe(true);
  });

  it.each(['replay', 'native'] as const)('permanently releases an exhausted carrier coating while its same-formula sibling survives (%s)', mode => {
    const baseline = vessel(), program = getProgramById('fe_cuso4')!;
    baseline.contents[0].mass_g = 0.02; baseline.contents[0].moles = 0.02 / computeMolarMass('Fe');
    baseline.contents[1].moles = 0.1; baseline.contents[1].mass_g = 0.1 * computeMolarMass('CuSO4');
    for (const pose of baseline.stockMotion!.grains) pose.mass_g = 0.01;
    baseline.mass_g = baseline.contents.reduce((sum, row) => sum + row.mass_g, 0);
    const native = mode === 'native' ? executeMultiStepReactions(baseline.contents, baseline.substances, 30, 25, false, 'vi', { vesselContact: baseline }) : undefined;
    const next = native ? { ...baseline, contents: native.updatedContents, stockMotion: native.stockMotion }
      : { ...baseline, ...applyProgramWithThermalSinks(program, baseline, baseline, 1, 0.1) };
    expect(next.stockMotion!.grains.find(pose => pose.id === 'wet')!.mass_g).toBe(0);
    expect(next.stockMotion!.grains.find(pose => pose.id === 'dry')!.mass_g).toBe(0.01);
    const released = next.contents.find(row => row.depositCarrierId === 'wet')!;
    expect(released.mass_g).toBeCloseTo(0.01 / computeMolarMass('Fe') * computeMolarMass('Cu'), 12);
    expect(released.depositReleased).toBe(true);
    const saved = JSON.parse(JSON.stringify(next)) as VesselState;
    // A restarted worker may allocate the old textual ID to a later dose.
    // The persisted release flag must defeat that accidental identity match.
    saved.stockMotion!.grains[0] = { ...baseline.stockMotion!.grains[0] };
    saved.contents[0] = { ...saved.contents[0], mass_g: 0.02, moles: 0.02 / computeMolarMass('Fe') };
    expect(attachedMetalMassForRow(saved, saved.contents.find(row => row.depositCarrierId === 'wet')!)).toBe(0);
    if (mode === 'replay') {
      const replay = { ...next, ...applyProgramWithThermalSinks(program, baseline, next, 1, 0.1) };
      expect(replay.contents.find(row => row.depositCarrierId === 'wet')!.depositReleased).toBe(true);
      expect(replay.contents.reduce((sum, row) => sum + row.mass_g, 0)).toBeCloseTo(baseline.mass_g, 10);
    }
  });

  it('does not infer carrier loss from an omitted static or temporarily unavailable motion snapshot', () => {
    const sample = vessel(); appendMetalDeposit(sample.contents, copper(0.1), 'fe_cuso4', sample);
    const unresolved = releaseUnsupportedMetalDeposits(sample.contents);
    expect(unresolved.find(row => row.formula === 'Cu')!.depositReleased).not.toBe(true);
    const acknowledged = releaseUnsupportedMetalDeposits(unresolved, { tick: 2, grains: [sample.stockMotion!.grains[1]] });
    expect(acknowledged.find(row => row.formula === 'Cu')!.depositReleased).toBe(true);
  });

  it('growing a recognized legacy coating migrates its old mass without releasing it', () => {
    const v = vessel(); v.lastReactionId = 'fe_cuso4'; v.precipitateSubstance = 'Cu'; v.contents.push(copper(0.1));
    appendMetalDeposit(v.contents, copper(0.02), 'fe_cuso4', v);
    expect(metalSurfaceAppearances(v)[0].attachedMass_g).toBeCloseTo(0.12, 12);
    expect(v.contents.filter(row => row.formula === 'Cu').every(row => row.depositSubstrate === 'Fe')).toBe(true);
    expect(metalSurfaceAppearances({ ...v, lastReactionId: 'hcl_naoh' })[0].attachedMass_g).toBeCloseTo(0.12, 12);
  });

  it('a separately produced solid cannot borrow an older surface-deposit provenance', () => {
    const v = vessel(); appendMetalDeposit(v.contents, copper(0.1), 'fe_cuso4', v);
    const nominal = getProgramById('fe_cuso4')!;
    // Deliberately unclassified product route exercises the generic solid
    // merger: it has no permission to attach its yield to the earlier coat.
    const unrelated = { ...nominal, id: 'independent-copper-product' };
    const next = { ...v, ...applyProgramToLedger(unrelated, v, 0.5, { deferThermal: true }) };
    const products = next.contents.filter(row => row.formula === 'Cu' && row.phase === 's');
    expect(products).toHaveLength(2);
    expect(products.find(row => row.depositSubstrate)?.mass_g).toBeCloseTo(0.1, 12);
    expect(products.find(row => !row.depositSubstrate)?.mass_g).toBeGreaterThan(0);
    expect(metalSurfaceAppearances(next)[0].attachedMass_g).toBeCloseTo(0.1, 12);
  });

  it('powder carries metal volume and only the coated grain changes finish', () => {
    const v = vessel(); appendMetalDeposit(v.contents, copper(0.1), 'fe_cuso4', v);
    const wet = powderCarrierAppearance(v, 'wet', 0.5, 7.87, '#777777');
    const dry = powderCarrierAppearance(v, 'dry', 0.5, 7.87, '#777777');
    expect(wet.volume_ml - dry.volume_ml).toBeCloseTo(0.1 / 8.96, 14);
    expect(dry.color.getHexString()).toBe('777777'); expect(wet.color.getHexString()).not.toBe('777777');
  });

  it('all surface aggregates retain real volume and touch the support without floor translation', () => {
    const stock = new BoxGeometry(1, 1, 1), deposit = new BoxGeometry(1, 1, 1);
    const floor = vesselInterior('beaker').floorY, scale = 0.12;
    const support = new Matrix4().compose(new Vector3(0, floor + 0.08, 0), new Quaternion(), new Vector3(scale, scale, scale));
    const matrices = metalDepositPlacements(stock, support, deposit, 0.00008, 'beaker');
    expect(matrices).toHaveLength(8);
    expect(matrices.reduce((sum, matrix) => sum + geometryVolume(deposit) * matrix.determinant(), 0)).toBeCloseTo(0.00008, 14);
    const vertices = deposit.getAttribute('position'), inverse = support.clone().invert();
    for (const matrix of matrices) {
      const points = Array.from({ length: vertices.count }, (_, i) => new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(matrix));
      expect(Math.min(...points.map(p => p.y))).toBeGreaterThanOrEqual(floor - 1e-7);
      const local = points.map(p => p.applyMatrix4(inverse));
      // At least one face of each aggregate lies exactly on a stock face.
      const gap = Math.min(...(['x', 'y', 'z'] as const).flatMap(axis => [
        Math.abs(Math.min(...local.map(p => p[axis])) - 0.5), Math.abs(Math.max(...local.map(p => p[axis])) + 0.5)]));
      expect(gap).toBeLessThan(1e-7);
    }
    stock.dispose(); deposit.dispose();
  });

  it('new anchors start on the submerged surface and remain on that material surface after rotation', () => {
    const stock = new BoxGeometry(1, 1, 1), deposit = new BoxGeometry(1, 1, 1), support = new Matrix4().makeScale(0.1, 0.1, 0.1);
    const anchors = metalDepositAnchors(stock, support, deposit, 1e-6, 'beaker', 8, point => point.y < 0);
    expect(anchors).toHaveLength(8); expect(anchors.every(anchor => anchor.point.y < 0)).toBe(true);
    const rotation = new Matrix4().makeRotationZ(Math.PI / 2), moved = rotation.clone().multiply(support);
    for (const anchor of anchors) {
      const before = metalDepositPlacement(anchor, support, deposit, 1e-6 / 8);
      const after = metalDepositPlacement(anchor, moved, deposit, 1e-6 / 8);
      const expected = rotation.clone().multiply(before);
      after.elements.forEach((value, i) => expect(value).toBeCloseTo(expected.elements[i], 12));
    }
    stock.dispose(); deposit.dispose();
  });
});
