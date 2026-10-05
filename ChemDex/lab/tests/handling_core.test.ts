import { describe, it, expect } from 'vitest';
import { evaluateGripSafety, getVesselGripSpec } from '../src/handling/gripPoints';
import { evaluateSnapTarget } from '../src/handling/snapping';
import { PPEState } from '../src/safety/Ppe';

describe('Handling Core: Grip Anchors, Thermal Rules & Smart Snapping (K1.2 - K1.4)', () => {
  const defaultPpe: PPEState = {
    goggles: false,
    gloves: false,
    labCoat: false,
    closedShoes: true,
    hairTied: true,
    eyeIrritation: false,
    eyeIrritationIntensity: 0,
    skinExposure: false,
    exposedChemical: null,
    coatStained: false,
    stainColor: null,
  };

  it('declares preferred grip anchors per vessel type', () => {
    const beakerSpec = getVesselGripSpec('beaker');
    expect(beakerSpec.preferred).toBe('body');

    const testTubeSpec = getVesselGripSpec('test_tube');
    expect(testTubeSpec.preferred).toBe('neck'); // Fingers near the top

    const crucibleSpec = getVesselGripSpec('crucible');
    expect(crucibleSpec.preferred).toBe('tongs');
  });

  it('triggers pain reflex drop when grabbing hot vessel (> 60 °C) barehanded', () => {
    const hotVessel = { temperature_c: 85, type: 'beaker' };
    const res = evaluateGripSafety(hotVessel, defaultPpe, false);

    expect(res.canGrip).toBe(false);
    expect(res.dropped).toBe(true);
    expect(res.hazardType).toBe('hot_burn');
  });

  it('allows holding hot vessel safely when using crucible tongs', () => {
    const hotVessel = { temperature_c: 120, type: 'crucible' };
    const res = evaluateGripSafety(hotVessel, defaultPpe, true); // true = with tongs

    expect(res.canGrip).toBe(true);
    expect(res.dropped).toBe(false);
    expect(res.hazardType).toBe('none');
  });

  it('warns when grabbing warm vessel (> 45 °C) barehanded without dropping', () => {
    const warmVessel = { temperature_c: 50, type: 'flask' };
    const res = evaluateGripSafety(warmVessel, defaultPpe, false);

    expect(res.canGrip).toBe(true);
    expect(res.dropped).toBe(false);
    expect(res.hazardType).toBe('hot_warning');
  });

  it('snaps accurately onto analytical balance pan', () => {
    const nearBalancePos: [number, number, number] = [7.4, 0.5, -2.6];
    const snap = evaluateSnapTarget(nearBalancePos, 'beaker', {}, {});

    expect(snap.isSnapped).toBe(true);
    expect(snap.targetType).toBe('balance');
    expect(snap.position[0]).toBeCloseTo(7.5, 2);
    expect(snap.position[1]).toBeCloseTo(-0.02, 2);
    expect(snap.position[2]).toBeCloseTo(-2.5, 2);
  });

  it('snaps test tube into test-tube rack', () => {
    const rack = { id: 'rack_1', type: 'test_tube_rack', position: [-2.0, -0.135, 1.0] as [number, number, number] };
    const tubePos: [number, number, number] = [-1.9, 0.4, 0.95];

    const snap = evaluateSnapTarget(tubePos, 'test_tube', { rack_1: rack }, {});

    expect(snap.isSnapped).toBe(true);
    expect(snap.targetType).toBe('rack');
    expect(snap.position[0]).toBeCloseTo(-2.0, 2);
    expect(snap.position[1]).toBeCloseTo(-0.135 + 0.45, 2);
  });

  it('snaps beaker onto alcohol burner wire gauze with thermal validity', () => {
    const burner = { id: 'burner_1', position: [0, -0.975, 0] as [number, number, number] };
    const beakerPos: [number, number, number] = [0.2, 1.0, 0.1];

    const snap = evaluateSnapTarget(beakerPos, 'beaker', {}, { burner_1: burner });

    expect(snap.isSnapped).toBe(true);
    expect(snap.targetType).toBe('burner');
    expect(snap.isValid).toBe(true);
    expect(snap.position[1]).toBeCloseTo(-0.975 + 2.49, 2);
  });
});
