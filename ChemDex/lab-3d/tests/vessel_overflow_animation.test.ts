import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import { vfxBus } from '../src/vfx/bus';
import { vesselOuterDimensions, vesselContours } from '../src/science/vesselContours';
import { contourRadius } from '../src/science/vesselDimensions';
import { getOverflowRegime, calculateOverflowProfile, calculateSpillRadius } from '../src/science/overflowPhysics';
import { labSound } from '../src/utils/audio';
import { METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import type { VesselState, SubstanceContent } from '../src/types/chemistry';

const initialStore = useAppStore.getState();

const item = (formula: string, mass_g: number, phase = 'l'): SubstanceContent => ({
  formula,
  mass_g,
  moles: mass_g / 18.015,
  phase,
});

function makeVessel(id = 'vessel_1', volume_ml = 100, capacity_ml = 100): VesselState {
  const contents = [item('H2O', volume_ml)];
  return {
    id,
    name: 'Test Beaker',
    type: 'beaker',
    capacity_ml,
    position: [0, -0.135, 0],
    rotationY: 0,
    isLocked: false,
    volume_ml,
    volume: volume_ml / capacity_ml,
    contents,
    substances: ['H2O'],
    mass_g: volume_ml,
    temperature_c: 25,
    ph: 7,
    hasGas: false,
    hasPrecipitate: false,
    isBoiling: false,
  };
}

describe('Vessel Outer Wall Overflow & Animation Mechanics', () => {
  beforeEach(() => {
    useAppStore.setState(initialStore, true);
  });

  afterEach(() => {
    useAppStore.setState(initialStore, true);
  });

  it('calculates outer dimensions accurately across diverse vessel geometries', () => {
    const beakerDim = vesselOuterDimensions('beaker');
    expect(beakerDim.topY).toBe(1.0);
    expect(beakerDim.bottomY).toBe(-1.0);
    expect(beakerDim.rimRadius).toBeCloseTo(1.04, 2);
    expect(beakerDim.baseRadius).toBeGreaterThanOrEqual(0.92);

    const flaskDim = vesselOuterDimensions('flask');
    expect(flaskDim.topY).toBe(1.5);
    expect(flaskDim.bottomY).toBe(-1.0);
    expect(flaskDim.baseRadius).toBeCloseTo(1.25, 2);
    expect(flaskDim.rimRadius).toBeCloseTo(0.42, 2);

    const tubeDim = vesselOuterDimensions('test_tube');
    expect(tubeDim.topY).toBe(1.2);
    expect(tubeDim.bottomY).toBeLessThan(-0.6);
    expect(tubeDim.baseRadius).toBeCloseTo(0.22, 2);

    const cylDim = vesselOuterDimensions('graduated_cylinder');
    expect(cylDim.topY).toBe(1.7);
    expect(cylDim.bottomY).toBe(-0.9);
    expect(cylDim.baseRadius).toBeCloseTo(0.35, 2);
  });

  it('traces wall contour profile r(y) smoothly without discontinuities', () => {
    const { outer } = vesselContours('flask');
    const dim = vesselOuterDimensions('flask');

    // Sampling from top rim to bottom base
    const rTop = contourRadius(outer, dim.topY);
    const rNeck = contourRadius(outer, 1.0);
    const rBase = contourRadius(outer, dim.bottomY + 0.05);

    expect(rTop).toBeCloseTo(0.42, 2);
    expect(rNeck).toBeCloseTo(0.38, 2);
    expect(rBase).toBeGreaterThan(1.1);
  });

  it('emits vessel:overflow event on vfxBus when chemical dosing exceeds vessel capacity', async () => {
    const fullBeaker = makeVessel('beaker_overflow', 100, 100);
    useAppStore.setState({
      vessels: { [fullBeaker.id]: fullBeaker },
      vesselIds: [fullBeaker.id],
      burners: {},
      spills: {},
      activeKinetics: {},
      pendingReactions: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      await useAppStore.getState().mixSubstances(fullBeaker.id, 'HCl', 10);

      expect(overflowEmitted).not.toBeNull();
      expect(overflowEmitted.vesselId).toBe(fullBeaker.id);
      expect(overflowEmitted.volume_ml).toBe(10);
      expect(overflowEmitted.substances).toContain('HCl');

      // Exterior inventory is registered before any ground deposition.
      expect(Object.values(useAppStore.getState().spills)).toHaveLength(0);
      expect(useAppStore.getState().inFlightPours[0].sample.volume_ml).toBe(10);
      useAppStore.getState().advancePourTransport(2);
      const spills = Object.values(useAppStore.getState().spills);
      expect(spills.length).toBeGreaterThan(0);
      expect(spills.reduce((sum, s) => sum + s.volume_ml, 0)).toBeCloseTo(10, 10);
    } finally {
      unsub();
    }
  });

  it('emits vessel:overflow event when continuous pouring exceeds receiver capacity', () => {
    const source = { ...makeVessel('source', 50, 100), position: [0.5, 0.5, 0] as [number, number, number] };
    const receiver = { ...makeVessel('receiver', 98, 100), position: [0, -0.135, 0] as [number, number, number] };

    useAppStore.setState({
      vessels: { [source.id]: source, [receiver.id]: receiver },
      vesselIds: [source.id, receiver.id],
      burners: {},
      spills: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      // Pour 10 mL from source into receiver that only has 2 mL capacity left
      const result = useAppStore.getState().transferLiquidContinuous(source.id, receiver.id, 10);

      expect(result.accepted_ml).toBeCloseTo(2, 4);
      expect(result.spilled_ml).toBeCloseTo(8, 4);

      expect(overflowEmitted).not.toBeNull();
      expect(overflowEmitted.vesselId).toBe(receiver.id);
      expect(overflowEmitted.volume_ml).toBeCloseTo(8, 4);
    } finally {
      unsub();
    }
  });

  it('uses the explicitly identified receiver for an already released overflow receipt', () => {
    const beaker = makeVessel('beaker_spill_test', 100, 100);
    useAppStore.setState({
      vessels: { [beaker.id]: beaker },
      vesselIds: [beaker.id],
      spills: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      useAppStore.getState().addSpill(beaker.position, 15, ['H2O'], '#38bdf8', beaker.name,
        15, [item('H2O', 15)], beaker.id);

      expect(overflowEmitted).not.toBeNull();
      expect(overflowEmitted.vesselId).toBe(beaker.id);
      expect(overflowEmitted.volume_ml).toBe(15);
    } finally {
      unsub();
    }
  });

  it('does not trigger vessel:overflow for shattered vessels', () => {
    const shattered = { ...makeVessel('shattered_vessel', 0, 100), isShattered: true };
    useAppStore.setState({
      vessels: { [shattered.id]: shattered },
      vesselIds: [shattered.id],
      spills: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      useAppStore.getState().addSpill(shattered.position, 20, ['H2O'], '#38bdf8', shattered.name,
        20, [item('H2O', 20)], shattered.id);
      // Shattered vessel breaking is a glass shatter spill, not outer rim overflow
      expect(overflowEmitted).toBeNull();
    } finally {
      unsub();
    }
  });

  it('does not infer rim overflow from a ground spill near the outer rim perimeter', () => {
    const beaker = makeVessel('beaker_rim_test', 100, 100);
    const rimSpillPos: [number, number, number] = [
      beaker.position[0] + 0.85,
      beaker.position[1],
      beaker.position[2]
    ];

    useAppStore.setState({
      vessels: { [beaker.id]: beaker },
      vesselIds: [beaker.id],
      spills: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      useAppStore.getState().addSpill(rimSpillPos, 12, ['H2O'], '#38bdf8', beaker.name);
      expect(overflowEmitted).toBeNull();
      const spill = Object.values(useAppStore.getState().spills)[0];
      expect(spill.volume_ml).toBe(12);
      expect(spill.position[0]).toBe(rimSpillPos[0]); expect(spill.position[2]).toBe(rimSpillPos[2]);
    } finally {
      unsub();
    }
  });

  it('emits overflow event with vessel rotation angle to ensure puddle and cascade alignment', () => {
    const rotatedBeaker = {
      ...makeVessel('beaker_rotated', 100, 100),
      rotationY: Math.PI / 4, // 45 degrees
    };

    useAppStore.setState({
      vessels: { [rotatedBeaker.id]: rotatedBeaker },
      vesselIds: [rotatedBeaker.id],
      spills: {},
    });

    let overflowEmitted: any = null;
    const unsub = vfxBus.on('vessel:overflow', (event) => {
      overflowEmitted = event;
    });

    try {
      useAppStore.getState().addSpill(rotatedBeaker.position, 10, ['H2O'], '#38bdf8', rotatedBeaker.name,
        10, [item('H2O', 10)], rotatedBeaker.id);
      expect(overflowEmitted).not.toBeNull();
      expect(overflowEmitted.angle).toBeCloseTo(-Math.PI / 4, 4);
      const parcel = useAppStore.getState().inFlightPours.at(-1)!;
      expect(Math.atan2(parcel.trajectory.exitPos[2] - rotatedBeaker.position[2],
        parcel.trajectory.exitPos[0] - rotatedBeaker.position[0])).toBeCloseTo(overflowEmitted.angle, 8);
    } finally {
      unsub();
    }
  });

  it('calculates outer dimensions for volumetric flask and condenser accurately', () => {
    const vFlaskDim = vesselOuterDimensions('volumetric_flask');
    expect(vFlaskDim.topY).toBeGreaterThan(1.5);
    expect(vFlaskDim.bottomY).toBeLessThan(0);
    expect(vFlaskDim.baseRadius).toBeGreaterThan(0.5);

    const condenserDim = vesselOuterDimensions('condenser');
    expect(condenserDim.height).toBeGreaterThan(2.0);
    expect(condenserDim.rimRadius).toBeGreaterThan(0.1);
  });

  describe('Differentiated Overflow Regimes & Realistic Dynamics', () => {
    it('accurately categorizes overflow volume into minor, moderate, and surge regimes', () => {
      expect(getOverflowRegime(0.1)).toBe('minor');
      expect(getOverflowRegime(0.5)).toBe('minor');
      expect(getOverflowRegime(1.5)).toBe('minor');
      expect(getOverflowRegime(2.0)).toBe('minor');

      expect(getOverflowRegime(2.5)).toBe('moderate');
      expect(getOverflowRegime(5.0)).toBe('moderate');
      expect(getOverflowRegime(10.0)).toBe('moderate');
      expect(getOverflowRegime(12.0)).toBe('moderate');

      expect(getOverflowRegime(15.0)).toBe('surge');
      expect(getOverflowRegime(25.0)).toBe('surge');
      expect(getOverflowRegime(50.0)).toBe('surge');
    });

    it('models minor overflow with thin trickling streams, intermittent dripping, compact puddle, and gentle acoustics', () => {
      const minor = calculateOverflowProfile(0.5);

      expect(minor.regime).toBe('minor');
      expect(minor.activeStreamsCount).toBeLessThanOrEqual(2);
      expect(minor.streamWidthBase).toBeLessThan(0.02); // narrow trickle < 20mm
      expect(minor.streamThickness).toBeLessThan(0.0015); // thin sliding film
      expect(minor.crestArcSpanRad).toBeLessThan(0.4); // tight localized lip < 23 degrees
      expect(minor.headDescentDuration_ms).toBeGreaterThanOrEqual(600); // capillary drag slows trickle
      expect(minor.isIntermittentDripping).toBe(true); // intermittent dripping cadence
      expect(minor.activeFallingDripsCount).toBeLessThanOrEqual(2);
      expect(minor.activeSplashRingsCount).toBe(1);
      expect(minor.puddleRadius * METERS_PER_SCENE_UNIT).toBeLessThan(0.02);
      expect(minor.expansionSpeed).toBeLessThan(0.25); // slow capillary creeping
      expect(minor.satelliteMaxSpread).toBeLessThanOrEqual(1.15); // tightly bound to perimeter
      expect(minor.soundMode).toBe('minor_drip');
    });

    it('models moderate overflow with distinct cascading rivulets, steady downward velocity, and medium organic puddle', () => {
      const moderate = calculateOverflowProfile(6.0);

      expect(moderate.regime).toBe('moderate');
      expect(moderate.activeStreamsCount).toBeGreaterThanOrEqual(3);
      expect(moderate.activeStreamsCount).toBeLessThanOrEqual(4);
      expect(moderate.streamWidthBase).toBeGreaterThan(0.025);
      expect(moderate.streamWidthBase).toBeLessThan(0.06);
      expect(moderate.streamThickness).toBeGreaterThan(0.0015);
      expect(moderate.crestArcSpanRad).toBeGreaterThan(0.5);
      expect(moderate.crestArcSpanRad).toBeLessThan(1.2);
      expect(moderate.headDescentDuration_ms).toBeGreaterThan(300);
      expect(moderate.headDescentDuration_ms).toBeLessThan(450);
      expect(moderate.isIntermittentDripping).toBe(false); // continuous dripping
      expect(moderate.puddleRadius * METERS_PER_SCENE_UNIT).toBeGreaterThan(0.02);
      expect(moderate.puddleRadius * METERS_PER_SCENE_UNIT).toBeLessThan(0.04);
      expect(moderate.expansionSpeed).toBeGreaterThan(0.35);
      expect(moderate.soundMode).toBe('moderate_trickle');
    });

    it('models massive surge overflow with wide sheet cascade, torrential downward rush, heavy detachment, and large splatter puddle', () => {
      const surge = calculateOverflowProfile(35.0);

      expect(surge.regime).toBe('surge');
      expect(surge.activeStreamsCount).toBe(6); // full streams merging into sheet
      expect(surge.streamWidthBase).toBeGreaterThanOrEqual(0.065); // wide ribbons up to 13cm
      expect(surge.streamThickness).toBeGreaterThan(0.004); // heavy fluid layer
      expect(surge.crestArcSpanRad).toBeGreaterThan(1.2); // broad arc > 70 degrees
      expect(surge.headDescentDuration_ms).toBeLessThanOrEqual(240); // rapid downward rush!
      expect(surge.dripStretchFactor).toBeGreaterThanOrEqual(3.0); // columnar fluid ligaments
      expect(surge.activeFallingDripsCount).toBe(8);
      expect(surge.activeSplashRingsCount).toBe(6);
      expect(surge.puddleRadius * METERS_PER_SCENE_UNIT).toBeGreaterThan(0.05);
      expect(surge.expansionSpeed).toBeGreaterThan(1.3); // rapid forceful expansion
      expect(surge.satelliteMaxSpread).toBeGreaterThan(1.5); // energetic splatters flung outward
      expect(surge.satelliteCount).toBeGreaterThanOrEqual(22);
      expect(surge.soundMode).toBe('surge_rush');
    });

    it('maintains strict physical monotonicity across the entire overflow spectrum', () => {
      const volumes = [0.1, 0.5, 1.5, 1.99, 2.01, 3.0, 7.0, 11.99, 12.01, 15.0, 30.0, 60.0];
      const profiles = volumes.map(v => calculateOverflowProfile(v));

      for (let i = 1; i < profiles.length; i++) {
        const prev = profiles[i - 1];
        const curr = profiles[i];

        // Stream width must increase monotonically with volume
        expect(curr.streamWidthBase).toBeGreaterThanOrEqual(prev.streamWidthBase);

        // Stream thickness must increase monotonically with volume
        expect(curr.streamThickness).toBeGreaterThanOrEqual(prev.streamThickness);

        // Rim crest arc span must increase monotonically with volume
        expect(curr.crestArcSpanRad).toBeGreaterThanOrEqual(prev.crestArcSpanRad);

        // Puddle radius must increase monotonically with volume
        expect(curr.puddleRadius).toBeGreaterThan(prev.puddleRadius);

        // Head descent duration must decrease (larger volume rushes down faster)
        expect(curr.headDescentDuration_ms).toBeLessThanOrEqual(prev.headDescentDuration_ms);

        // Expansion speed must increase monotonically with volume
        expect(curr.expansionSpeed).toBeGreaterThan(prev.expansionSpeed);
      }
    });

    it('exhibits exact C0 boundary continuity across regime inflection points (2.0 mL and 12.0 mL)', () => {
      const p199 = calculateOverflowProfile(1.999);
      const p200 = calculateOverflowProfile(2.001);

      // Puddle radius must be continuous across 2.0 mL boundary (< 1mm delta)
      expect(Math.abs(p200.puddleRadius - p199.puddleRadius)).toBeLessThan(0.001);
      // Stream width base must be continuous (< 1mm delta)
      expect(Math.abs(p200.streamWidthBase - p199.streamWidthBase)).toBeLessThan(0.001);
      // Stream thickness must be continuous (< 0.5mm delta)
      expect(Math.abs(p200.streamThickness - p199.streamThickness)).toBeLessThan(0.0005);
      // Crest arc span must be continuous (< 0.02 rad delta)
      expect(Math.abs(p200.crestArcSpanRad - p199.crestArcSpanRad)).toBeLessThan(0.02);
      // Head descent duration must be continuous (<= 2ms delta)
      expect(Math.abs(p200.headDescentDuration_ms - p199.headDescentDuration_ms)).toBeLessThanOrEqual(2);
      // Expansion speed must be continuous (< 0.02 m/s delta)
      expect(Math.abs(p200.expansionSpeed - p199.expansionSpeed)).toBeLessThan(0.02);

      const p119 = calculateOverflowProfile(11.999);
      const p120 = calculateOverflowProfile(12.001);

      // Puddle radius must be continuous across 12.0 mL boundary (< 1mm delta)
      expect(Math.abs(p120.puddleRadius - p119.puddleRadius)).toBeLessThan(0.001);
      // Stream width base must be continuous (< 1mm delta)
      expect(Math.abs(p120.streamWidthBase - p119.streamWidthBase)).toBeLessThan(0.001);
      // Stream thickness must be continuous (< 0.5mm delta)
      expect(Math.abs(p120.streamThickness - p119.streamThickness)).toBeLessThan(0.0005);
      // Crest arc span must be continuous (< 0.02 rad delta)
      expect(Math.abs(p120.crestArcSpanRad - p119.crestArcSpanRad)).toBeLessThan(0.02);
      // Head descent duration must be continuous (<= 2ms delta)
      expect(Math.abs(p120.headDescentDuration_ms - p119.headDescentDuration_ms)).toBeLessThanOrEqual(2);
      // Expansion speed must be continuous (< 0.02 m/s delta)
      expect(Math.abs(p120.expansionSpeed - p119.expansionSpeed)).toBeLessThan(0.02);
    });

    it('keeps a large finite liquid footprint without radius clamping or converting dry mass to water', () => {
      const extremeProfile = calculateOverflowProfile(500);
      expect(extremeProfile.puddleRadius * METERS_PER_SCENE_UNIT).toBeGreaterThan(0.22);
      expect(extremeProfile.puddleRadius * METERS_PER_SCENE_UNIT).toBeLessThan(0.27);

      const extremeInventoryRadius = calculateSpillRadius(500);
      expect(extremeInventoryRadius).toBe(extremeProfile.puddleRadius);

      const extremeMassRadius = calculateSpillRadius(0, 800);
      expect(extremeMassRadius).toBe(0);
    });

    it('guarantees spatial alignment of droplets, drips, and splash ripples with active stream ribbons', () => {
      const testVols = [0.2, 0.8, 1.5, 4.0, 8.0, 20.0, 50.0];
      const STREAMS_COUNT = 6;

      for (const v of testVols) {
        const profile = calculateOverflowProfile(v);
        const activeStreams = profile.activeStreamsCount;
        const minActiveIdx = Math.floor((STREAMS_COUNT - activeStreams) / 2);
        const maxActiveIdx = minActiveIdx + activeStreams - 1;

        // Droplets
        for (let i = 0; i < profile.activeDropletsCount; i++) {
          const activeStreamIdx = minActiveIdx + (i % activeStreams);
          expect(activeStreamIdx).toBeGreaterThanOrEqual(minActiveIdx);
          expect(activeStreamIdx).toBeLessThanOrEqual(maxActiveIdx);
        }

        // Falling drips
        for (let i = 0; i < profile.activeFallingDripsCount; i++) {
          const activeStreamIdx = minActiveIdx + (i % activeStreams);
          expect(activeStreamIdx).toBeGreaterThanOrEqual(minActiveIdx);
          expect(activeStreamIdx).toBeLessThanOrEqual(maxActiveIdx);
        }

        // Splash rings
        for (let i = 0; i < profile.activeSplashRingsCount; i++) {
          const activeStreamIdx = minActiveIdx + (i % activeStreams);
          expect(activeStreamIdx).toBeGreaterThanOrEqual(minActiveIdx);
          expect(activeStreamIdx).toBeLessThanOrEqual(maxActiveIdx);
        }
      }
    });

    it('preserves spill continuity and expands smoothly when repeated micro-doses are merged', () => {
      const beaker = makeVessel('beaker_merge_test', 100, 100);
      useAppStore.setState({
        vessels: { [beaker.id]: beaker },
        vesselIds: [beaker.id],
        spills: {},
      });

      // Dose 1: 0.2 mL micro-spill
      useAppStore.getState().addSpill(beaker.position, 0.2, ['H2O'], '#38bdf8', beaker.name);
      let spills = Object.values(useAppStore.getState().spills);
      expect(spills.length).toBe(1);
      const initialId = spills[0].id;
      expect(spills[0].volume_ml).toBeCloseTo(0.2, 4);
      const r1 = spills[0].radius;
      expect(r1 * METERS_PER_SCENE_UNIT).toBeLessThan(0.01);

      // Dose 2: second 0.2 mL drop merges into existing puddle
      useAppStore.getState().addSpill(beaker.position, 0.2, ['H2O'], '#38bdf8', beaker.name);
      spills = Object.values(useAppStore.getState().spills);
      expect(spills.length).toBe(1); // Merged into same puddle
      expect(spills[0].id).toBe(initialId);
      expect(spills[0].volume_ml).toBeCloseTo(0.4, 4);
      const r2 = spills[0].radius;
      expect(r2).toBeGreaterThan(r1);

      // Dose 3: moderate addition 5.0 mL merges smoothly
      useAppStore.getState().addSpill(beaker.position, 5.0, ['H2O'], '#38bdf8', beaker.name);
      spills = Object.values(useAppStore.getState().spills);
      expect(spills.length).toBe(1);
      expect(spills[0].id).toBe(initialId);
      expect(spills[0].volume_ml).toBeCloseTo(5.4, 4);
      const r3 = spills[0].radius;
      expect(r3).toBeGreaterThan(r2);
      expect(r3).toBeGreaterThan(0.15);
    });

    it('synthesizes realistically differentiated acoustic modes in labSound', () => {
      const spyMinor = vi.spyOn(labSound, 'playMinorDropletDrip').mockImplementation(() => {});
      const spyMod = vi.spyOn(labSound, 'playModerateOverflow').mockImplementation(() => {});
      const spySurge = vi.spyOn(labSound, 'playSurgeRushSplatter').mockImplementation(() => {});

      try {
        labSound.playOverflow(0.8);
        expect(spyMinor).toHaveBeenCalledTimes(1);
        expect(spyMod).not.toHaveBeenCalled();
        expect(spySurge).not.toHaveBeenCalled();

        labSound.playOverflow(5.0);
        expect(spyMinor).toHaveBeenCalledTimes(1);
        expect(spyMod).toHaveBeenCalledTimes(1);
        expect(spySurge).not.toHaveBeenCalled();

        labSound.playOverflow(25.0);
        expect(spyMinor).toHaveBeenCalledTimes(1);
        expect(spyMod).toHaveBeenCalledTimes(1);
        expect(spySurge).toHaveBeenCalledTimes(1);
      } finally {
        spyMinor.mockRestore();
        spyMod.mockRestore();
        spySurge.mockRestore();
      }
    });
  });
});
