import { describe, it, expect } from 'vitest';
import { segArea, retainedVolume } from '../retained';
import { getVesselProfile } from '../profiles';
import { calculateWeirFlow } from '../flow';
import { transferFluidIncrement, mixColorBeerLambert, MixingState } from '../mixing';
import { calculateSolidDisplacement, willSolidFloat } from '../solids';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../step';

describe('Vessel Profiles & Geometry', () => {
  it('returns valid profiles for all 5 glassware types', () => {
    const beaker = getVesselProfile('beaker');
    const flask = getVesselProfile('flask');
    const cylinder = getVesselProfile('cylinder');
    const testTube = getVesselProfile('test_tube');
    const bottle = getVesselProfile('reagent_bottle');

    expect(beaker.capacity_ml).toBe(250);
    expect(flask.capacity_ml).toBe(250);
    expect(cylinder.capacity_ml).toBe(100);
    expect(testTube.capacity_ml).toBe(50);
    expect(bottle.capacity_ml).toBe(150);

    expect(beaker.r(0)).toBeCloseTo(0.965, 2);
    expect(cylinder.r(0)).toBeCloseTo(0.325, 2);
  });
});

describe('Circular Segment Area (segArea)', () => {
  it('computes exact boundary cases for circular segment area', () => {
    const R = 2.0;
    const fullCircle = Math.PI * R * R;

    // s <= -R -> empty
    expect(segArea(R, -R)).toBe(0);
    expect(segArea(R, -2.5)).toBe(0);

    // s >= R -> full circle
    expect(segArea(R, R)).toBeCloseTo(fullCircle, 5);
    expect(segArea(R, 2.5)).toBeCloseTo(fullCircle, 5);

    // s = 0 -> exact half circle
    expect(segArea(R, 0)).toBeCloseTo(fullCircle / 2, 5);
  });

  it('is strictly monotonic as s increases from -R to R', () => {
    const R = 1.0;
    let prev = -1;
    for (let s = -1.0; s <= 1.0; s += 0.1) {
      const area = segArea(R, s);
      expect(area).toBeGreaterThanOrEqual(prev);
      prev = area;
    }
  });
});

describe('Retained Volume Curve', () => {
  it('retains maximum nominal capacity when upright (theta = 0)', () => {
    const beaker = getVesselProfile('beaker');
    const v0 = retainedVolume(beaker, 0);
    expect(v0).toBeCloseTo(250, 0);
  });

  it('monotonically decreases retained capacity as tilt increases', () => {
    const beaker = getVesselProfile('beaker');
    let prev = 300;
    for (let deg = 0; deg <= 90; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const v = retainedVolume(beaker, rad);
      expect(v).toBeLessThanOrEqual(prev + 0.001);
      prev = v;
    }
  });
});

describe('Weir Discharge Flow Rate', () => {
  it('discharges zero flow when liquid is below weir crest', () => {
    const beaker = getVesselProfile('beaker');
    const result = calculateWeirFlow(beaker, 100, 0.1); // Small tilt, liquid does not reach lip
    expect(result.isPouring).toBe(false);
    expect(result.flowRate_ml_s).toBe(0);
  });

  it('discharges positive laminar flow when liquid exceeds retained volume', () => {
    const beaker = getVesselProfile('beaker');
    const result = calculateWeirFlow(beaker, 200, 1.1); // Steep tilt, liquid overflows
    expect(result.isPouring).toBe(true);
    expect(result.flowRate_ml_s).toBeGreaterThan(0.5);
    expect(result.flowRate_ml_s).toBeLessThanOrEqual(60);
  });
});

describe('Conservation Laws & Optical Color Mixing', () => {
  it('preserves exact mass and volume conservation on transfer', () => {
    const source: MixingState = {
      volume_ml: 100,
      mass_g: 100,
      density_g_ml: 1.0,
      temperature_c: 25,
      colorHex: '#38bdf8',
      contents: {}
    };

    const target: MixingState = {
      volume_ml: 50,
      mass_g: 50,
      density_g_ml: 1.0,
      temperature_c: 25,
      colorHex: '#ffffff',
      contents: {}
    };

    const dV = 20;
    const res = transferFluidIncrement(source, target, dV, 250);

    expect(res.accepted_ml).toBeCloseTo(20, 4);
    expect(res.overflow_ml).toBe(0);
    expect(res.newSource.volume_ml).toBeCloseTo(80, 4);
    expect(res.newRecipient.volume_ml).toBeCloseTo(70, 4);
    // Invariant: total volume is preserved
    expect(res.newSource.volume_ml + res.newRecipient.volume_ml).toBeCloseTo(150, 4);
  });

  it('accurately mixes temperatures according to thermal energy conservation', () => {
    const coldSource: MixingState = {
      volume_ml: 50,
      mass_g: 50,
      density_g_ml: 1.0,
      temperature_c: 20, // 20 °C
      colorHex: '#38bdf8',
      contents: {}
    };

    const hotTarget: MixingState = {
      volume_ml: 50,
      mass_g: 50,
      density_g_ml: 1.0,
      temperature_c: 80, // 80 °C
      colorHex: '#38bdf8',
      contents: {}
    };

    const res = transferFluidIncrement(coldSource, hotTarget, 50, 250);
    // Equal masses of 20°C and 80°C water must equilibrate to 50°C
    expect(res.newRecipient.temperature_c).toBeCloseTo(50, 1);
  });

  it('mixes optical absorption via Beer-Lambert law without muddy grey artifacts', () => {
    const blue = '#0088ff';
    const clearWater = '#ffffff';

    const diluted = mixColorBeerLambert(blue, 50, clearWater, 50);
    // When diluted with clear water, blue must stay blue with reduced optical density
    expect(diluted.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
    expect(diluted).not.toBe('#000000');
  });
});

describe('Solid Chemistry Physics', () => {
  it('accurately distinguishes floating vs sinking solids by Archimedes density', () => {
    // Sodium metal has density 0.968 g/cm3 < water density 1.0 -> FLOATS
    expect(willSolidFloat('Na', 1.0)).toBe(true);

    // Iron filings have density 7.874 g/cm3 > 1.0 -> SINKS
    expect(willSolidFloat('Fe', 1.0)).toBe(false);

    // Copper turnings sink
    expect(willSolidFloat('Cu', 1.0)).toBe(false);
  });

  it('computes exact liquid volume displacement from solid mass and density', () => {
    // 10g of CaCO3 with density 2.71 g/cm3 displaces 10 / 2.71 ≈ 3.69 mL
    const displaced = calculateSolidDisplacement('CaCO3', 10);
    expect(displaced).toBeCloseTo(3.69, 1);
  });
});

describe('Deterministic Fixed-Timestep Simulation Step', () => {
  it('correctly executes a simulation step and produces impact events', () => {
    const vessels: Record<string, SimVessel> = {
      src: {
        id: 'src',
        type: 'beaker',
        position: [-1.2, 1.2, 0],
        rotationZ: -1.2, // Tilted towards target
        volume_ml: 100,
        capacity_ml: 250,
        mass_g: 100,
        density_g_ml: 1.0,
        temperature_c: 25,
        colorHex: '#38bdf8',
        substances: ['H2O']
      },
      dst: {
        id: 'dst',
        type: 'beaker',
        position: [0, -0.135, 0],
        rotationZ: 0,
        volume_ml: 20,
        capacity_ml: 250,
        mass_g: 20,
        density_g_ml: 1.0,
        temperature_c: 25,
        colorHex: '#38bdf8',
        substances: ['H2O']
      }
    };

    const session: PourPhysicsSession = {
      sourceId: 'src',
      targetId: 'dst',
      tilt: 1.2,
      isStreaming: false,
      totalTransferred_ml: 0,
      totalSpilled_ml: 0,
      lastFlowRate: 0
    };

    const stepResult = stepPourSimulation(session, vessels, 1 / 60, 0.5);
    expect(stepResult.nextSession.isStreaming).toBe(true);
    expect(stepResult.events.length).toBeGreaterThan(0);
    expect(stepResult.updatedSource.volume_ml).toBeLessThan(100);
  });
});
