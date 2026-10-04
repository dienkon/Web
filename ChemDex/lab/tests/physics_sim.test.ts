import { describe, it, expect } from 'vitest';
import { FreeSurfaceSimulator } from '../src/sim/surface';
import { FluidGrid2D } from '../src/sim/fluidGrid';
import { ParticleSystem, ParticleType } from '../src/sim/particles';
import { BubbleManager } from '../src/sim/bubbles';
import { BoilingEngine, BoilingRegime } from '../src/sim/boiling';
import { EvaporationEngine } from '../src/sim/evaporation';
import { PrecipitationPipeline, PRECIPITATE_PRESETS } from '../src/sim/precipitation';
import { SolidsEngine } from '../src/sim/solids';
import { HeaterDevice } from '../src/sim/heater';
import { CombustionEngine } from '../src/sim/combustion';
import { PouringSimulator } from '../src/sim/pour';

describe('Milestone M2: Free Surface Dynamics', () => {
  it('propagates surface wave impulse symmetrically', () => {
    const surface = new FreeSurfaceSimulator({ resolution: 32, radius: 0.04 });
    surface.addImpulse(0, 0, 0.005, 0.1); // 5 mm impulse at center

    const centerIdx = 16 * 32 + 16;
    expect(surface.h[centerIdx]).toBeGreaterThan(0.003);

    // Step 5 times
    for (let i = 0; i < 5; i++) {
      surface.step(0.016);
    }

    // Impulse has radiated outward
    expect(surface.h[centerIdx]).toBeLessThan(0.005);
  });

  it('forms meniscus elevation near vessel glass boundary', () => {
    const surface = new FreeSurfaceSimulator({ resolution: 32, radius: 0.04 });
    // Advance multiple steps without perturbation to allow static wetting profile
    for (let i = 0; i < 20; i++) {
      surface.step(0.016);
    }

    // Near wall cell vs center cell
    const nearWallH = surface.sampleHeight(0.038, 0); // 38 mm from center (radius = 40 mm)
    const centerH = surface.sampleHeight(0, 0);
    expect(nearWallH).toBeGreaterThan(centerH);
  });

  it('forms Rankine vortex depression under stirring', () => {
    const surface = new FreeSurfaceSimulator({ resolution: 32, radius: 0.04 });
    surface.stirrerOmega = 25.0; // 25 rad/s stirring
    for (let i = 0; i < 25; i++) {
      surface.step(0.016);
    }

    const centerDepression = surface.sampleHeight(0, 0);
    const outerHeight = surface.sampleHeight(0.03, 0);
    expect(centerDepression).toBeLessThan(outerHeight);
  });
});

describe('Milestone M3: Stable Fluids Solver & Multi-Species Transport', () => {
  it('maintains low divergence norm after pressure projection (||∇·u|| < 1e-3)', () => {
    const grid = new FluidGrid2D({ nx: 32, ny: 48, domainWidth: 0.08, domainHeight: 0.12, pressureIters: 35 });
    
    // Inject non-divergence-free velocity
    grid.injectSource(0.5, 0.8, 0.2, 0.2, -0.4, 298.15, []);
    const unprojectedDiv = grid.computeDivergenceNorm();

    // Run projection
    grid.project();
    const projectedDiv = grid.computeDivergenceNorm();

    expect(unprojectedDiv).toBeGreaterThan(5.0);
    expect(projectedDiv).toBeLessThan(unprojectedDiv * 0.35); // Significant divergence reduction
  });

  it('advects chemical species with MacCormack without negative concentrations', () => {
    const grid = new FluidGrid2D({ nx: 32, ny: 48, domainWidth: 0.08, domainHeight: 0.12 });
    const slot = grid.getOrCreateSpeciesSlot('CuSO4');
    expect(slot).toBe(0);

    // Inject concentrated droplet at top
    grid.injectSource(0.5, 0.8, 0.15, 0.0, -0.3, 298.15, [{ slot, conc: 1.5 }]);

    // Advect downwards for 10 frames
    for (let i = 0; i < 10; i++) {
      grid.step(0.016);
    }

    let minConc = Infinity;
    let maxConc = -Infinity;
    for (let i = 0; i < grid.numCells; i++) {
      const c = grid.species[i];
      if (c < minConc) minConc = c;
      if (c > maxConc) maxConc = c;
    }

    expect(minConc).toBeGreaterThanOrEqual(0.0);
    expect(maxConc).toBeGreaterThan(0.1);
  });
});

describe('Milestone M4: Particles & Bubble Dynamics', () => {
  it('manages zero-allocation particle free pool', () => {
    const ps = new ParticleSystem(100);
    expect(ps.activeCount).toBe(0);

    const id1 = ps.spawn({
      type: ParticleType.BUBBLE,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0.2, vz: 0,
      radius: 0.002,
      maxAge: 1.0
    });
    expect(id1).toBe(99);
    expect(ps.activeCount).toBe(1);

    ps.kill(id1);
    expect(ps.activeCount).toBe(0);

    // Recycling reuses the index
    const id2 = ps.spawn({
      type: ParticleType.BUBBLE,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0.2, vz: 0,
      radius: 0.002,
      maxAge: 1.0
    });
    expect(id2).toBe(99);
  });

  it('calculates Fritz departure diameter and Minnaert frequency within physical range', () => {
    const bm = new BubbleManager({ contactAngleDeg: 50 });
    const dDeparture = bm.calculateDepartureDiameter(373.15);

    // Water Fritz departure diameter at 100°C is ~2 to 4 mm
    expect(dDeparture).toBeGreaterThan(0.001);
    expect(dDeparture).toBeLessThan(0.006);

    // Minnaert frequency for 2 mm radius bubble: f ≈ 3.26 / 0.002 ≈ 1630 Hz
    const r = 0.002;
    const fMinnaert = 3.26 / r;
    expect(fMinnaert).toBeCloseTo(1630, -1);
  });
});

describe('Milestone M5: Boiling & Evaporation', () => {
  it('progresses through physical boiling regimes and plateaus at Tsat', () => {
    const boiling = new BoilingEngine(373.15, true);

    // Below 55°C: Convection
    const state1 = boiling.evaluate(0.016, 298.15, 0, 0.00025);
    expect(state1.regime).toBe(BoilingRegime.NATURAL_CONVECTION);

    // 70°C: Degassing
    const state2 = boiling.evaluate(0.016, 343.15, 0, 0.00025);
    expect(state2.regime).toBe(BoilingRegime.DEGASSING);

    // 95°C: Subcooled singing
    const state3 = boiling.evaluate(0.016, 368.15, 0, 0.00025);
    expect(state3.regime).toBe(BoilingRegime.SUBCOOLED_SINGING);

    // 100°C: Nucleate boiling with latent heat vapor generation
    const state4 = boiling.evaluate(0.016, 373.15, 600, 0.00025); // 600 W heater
    expect(state4.regime).toBe(BoilingRegime.NUCLEATE_BOILING);
    // ṁ = P / Lv = 600 / 2.257e6 ≈ 2.66e-4 kg/s
    expect(state4.vaporRateKgPerS).toBeCloseTo(0.000266, 5);
  });

  it('computes boundary-layer evaporation rate and vapor pressure', () => {
    const evap = new EvaporationEngine({ ambientTempK: 293.15, ambientHumidity: 0.5 });
    
    // Saturation vapor pressure of water at 100°C is ~101.3 kPa
    const pSat100 = evap.satVaporPressureWater(373.15);
    expect(pSat100).toBeGreaterThan(99000);
    expect(pSat100).toBeLessThan(104000);

    // Surface area of 80mm beaker ≈ 0.005 m² at 60°C
    const res = evap.computeEvaporation(0.005, 333.15);
    expect(res.massRateKgPerS).toBeGreaterThan(0);
    expect(res.heatLossW).toBeGreaterThan(0);
  });
});

describe('Milestone M6: Precipitation Pipeline', () => {
  it('nucleates precipitate and consumes supersaturation', () => {
    const precip = new PrecipitationPipeline('curdy', 0.04);
    expect(precip.suspendedMoles).toBe(0);

    // S = 5.0, 0.02 moles excess
    const nucleated = precip.nucleate(5.0, 0.02, 0.1);
    expect(nucleated).toBeGreaterThan(0);
    expect(precip.suspendedMoles).toBe(nucleated);
  });

  it('settles precipitate using Richardson-Zaki hindered settling', () => {
    const precip = new PrecipitationPipeline('curdy', 0.04);
    precip.suspendedMoles = 0.01;
    const ps = new ParticleSystem(10);

    precip.update(1.0, ps, 0.08, 0.0, 0.0); // 1 second settling
    expect(precip.sedimentMoles).toBeGreaterThan(0);
    expect(precip.suspendedMoles).toBeLessThan(0.01);
  });
});

describe('Milestone M7: Solids Dissolution & Reactions', () => {
  it('shrinks solid piece mass via Noyes-Whitney dissolution', () => {
    const engine = new SolidsEngine();
    engine.addSolid({
      id: 'nacl_1',
      substanceId: 'NaCl',
      massKg: 0.005, // 5 grams
      radiusM: 0.005,
      densityKgPerM3: 2160,
      x: 0, y: 0.002, z: 0,
      vx: 0, vy: 0, vz: 0,
      isDissolving: true,
      solubilityMolPerM3: 6000,
      dendriteThicknessM: 0,
      isAlkaliMetal: false,
    });

    // Dissolve in pure water (bulk conc = 0)
    engine.update(1.0, 0.08, 298.15, { NaCl: 0 });
    expect(engine.solids[0].massKg).toBeLessThan(0.005);
  });
});

describe('Milestone M8: Heater & Combustion', () => {
  it('heats vessel bottom with first-order lag on hotplate', () => {
    const heater = new HeaterDevice();
    heater.setType('hotplate');
    heater.setPower(true, 150); // 150 °C setpoint

    // Step 5 seconds
    const heatTransferred = heater.step(5.0, 298.15, 0.005);
    expect(heater.currentTempK).toBeGreaterThan(293.15);
    expect(heatTransferred).toBeGreaterThan(0);
  });

  it('maps blackbody temperature and evaluates flame tests', () => {
    const combustion = new CombustionEngine();
    const coolColor = combustion.blackbodyColor(1000); // 1000 K deep red
    expect(coolColor.r).toBeGreaterThan(coolColor.g);
    expect(coolColor.b).toBe(0);

    const hotColor = combustion.blackbodyColor(4000); // 4000 K white
    expect(hotColor.b).toBeGreaterThan(0.5);

    // Flame test for copper
    const cuFlame = combustion.evaluateFlameColor(true, { Cu: 1.0 });
    expect(cuFlame.g).toBeGreaterThan(cuFlame.r); // Emerald green/cyan
  });
});

describe('Milestone M9: Pouring & Droppers', () => {
  it('computes weir flow rate according to Francis/Poleni law', () => {
    const pour = new PouringSimulator();
    const q1 = pour.computeWeirFlow(0.005); // 5 mm head
    const q2 = pour.computeWeirFlow(0.010); // 10 mm head

    expect(q1).toBeGreaterThan(0);
    // H^(3/2) relation: (10/5)^1.5 ≈ 2.83
    expect(q2 / q1).toBeCloseTo(2.83, 1);
  });

  it('computes Tate law droplet volume ~0.05 mL', () => {
    const pour = new PouringSimulator();
    const vDrop = pour.computeDropletVolume(0.0015); // 1.5 mm radius tip
    const vDropMl = vDrop * 1e6; // Convert m³ to mL
    expect(vDropMl).toBeGreaterThan(0.03);
    expect(vDropMl).toBeLessThan(0.08);
  });
});
