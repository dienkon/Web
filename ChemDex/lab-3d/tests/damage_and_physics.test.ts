import { describe, it, expect } from 'vitest';
import { evaluateDropImpact, evaluateThermalShock } from '../src/damage/DamageModel';
import { RigidBodyLite, TABLE_TOP_Y, FLOOR_Y } from '../src/physicsLite/RigidBodyLite';
import { willVesselTip, calculateVesselStability } from '../src/physicsLite/Support';
import { shardManager, MAX_ACTIVE_SHARDS } from '../src/damage/Shards';
import { PuddleSimulator } from '../src/damage/Puddle';

describe('Physics World Lite: Friction, Sliding & Edge Falls (K5.1 - K5.4)', () => {
  it('stops a pushed beaker faster on dry bench than on wet bench due to friction', () => {
    // Dry bench simulation
    const dryBeaker = new RigidBodyLite('dry_1', 'beaker', [0, TABLE_TOP_Y, 0], 0.15);
    dryBeaker.setWetSurface(false);
    dryBeaker.applyImpulse([0.15 * 0.5, 0, 0]); // v0 = 0.5 m/s

    const dt = 1 / 60;
    for (let f = 0; f < 60; f++) {
      dryBeaker.step(dt);
    }
    const dryDist = dryBeaker.state.position[0];

    // Wet bench simulation
    const wetBeaker = new RigidBodyLite('wet_1', 'beaker', [0, TABLE_TOP_Y, 0], 0.15);
    wetBeaker.setWetSurface(true);
    wetBeaker.applyImpulse([0.15 * 0.5, 0, 0]); // v0 = 0.5 m/s

    for (let f = 0; f < 60; f++) {
      wetBeaker.step(dt);
    }
    const wetDist = wetBeaker.state.position[0];

    // Wet surface must slide significantly further than dry surface
    expect(wetDist).toBeGreaterThan(dryDist * 1.5);
    expect(dryDist).toBeLessThan(0.05); // Stops within a few cm
  });

  it('correctly assesses tipping criteria for tall cylinder vs stable beaker', () => {
    // 250 mL beaker is very stable
    const beakerStability = calculateVesselStability('beaker', 100);
    expect(beakerStability.tippingAngleRad).toBeGreaterThan(0.6); // > 34 degrees

    // Tall graduated cylinder 80% full has high COM and narrow base
    const cylinderStability = calculateVesselStability('cylinder', 80);
    // Tips at ~12-15 degrees (~0.20 to 0.26 radians)
    expect(cylinderStability.tippingAngleRad).toBeLessThan(0.35);

    // Cylinder with 15° tilt will tip
    const tilt15deg = (15 * Math.PI) / 180;
    expect(willVesselTip('cylinder', tilt15deg, 80)).toBe(true);

    // Beaker with 15° tilt remains stable
    expect(willVesselTip('beaker', tilt15deg, 80)).toBe(false);
  });

  it('simulates falling off bench edge and lands on floor with correct fall height', () => {
    // Position body near edge and push off
    const body = new RigidBodyLite('falling_obj', 'beaker', [15.9, TABLE_TOP_Y, 0], 0.15);
    body.applyImpulse([0.15 * 3.0, 0, 0]); // push across X = 16 boundary

    const dt = 1 / 60;
    let landed = false;
    for (let f = 0; f < 120; f++) {
      const res = body.step(dt);
      if (res.hasLandedOnFloor) {
        landed = true;
        break;
      }
    }

    expect(landed).toBe(true);
    expect(body.state.isOnFloor).toBe(true);
    expect(body.state.position[1]).toBeCloseTo(FLOOR_Y, 1);
  });
});

describe('Damage Model & Glass Shattering (K4.1 & K4.2)', () => {
  it('survives drop of 10 cm onto bench but shatters from 80 cm onto stone floor', () => {
    const mass = 0.12; // 120g empty beaker

    // 10 cm onto wooden/epoxy bench
    const resLow = evaluateDropImpact(0.10, mass, 'borosilicate', 'bench', 77);
    expect(resLow.shattered).toBe(false);
    expect(resLow.severity).not.toBe('shattered');

    // 80 cm onto stone floor
    const resHigh = evaluateDropImpact(0.80, mass, 'borosilicate', 'stone_floor', 77);
    expect(resHigh.shattered).toBe(true);
    expect(resHigh.severity).toBe('shattered');
  });

  it('guarantees identical deterministic outcome with same seed', () => {
    const resA = evaluateDropImpact(0.35, 0.15, 'borosilicate', 'bench', 12345);
    const resB = evaluateDropImpact(0.35, 0.15, 'borosilicate', 'bench', 12345);

    expect(resA.severity).toBe(resB.severity);
    expect(resA.energy_J).toBe(resB.energy_J);
    expect(resA.integrity).toBe(resB.integrity);
  });

  it('correctly models thermal shock: soda-lime cracks while borosilicate survives at ΔT = 80 K', () => {
    const dT = 80; // 80 Kelvin ΔT

    const resSoda = evaluateThermalShock(dT, 'soda-lime', 55);
    expect(resSoda.severity).not.toBe('none'); // Soda-lime cracks or shatters

    const resBoro = evaluateThermalShock(dT, 'borosilicate', 55);
    expect(resBoro.severity).toBe('none'); // Borosilicate easily withstands 80 K
  });

  it('strictly caps active shard instances to MAX_ACTIVE_SHARDS (<= 600)', () => {
    // Repeatedly spawn shards
    for (let burst = 0; burst < 35; burst++) {
      shardManager.spawnShatterShards(`vessel_${burst}`, [0, 0, 0], '#fff', 24);
    }

    const aliveShards = shardManager.getShards();
    expect(aliveShards.length).toBeLessThanOrEqual(MAX_ACTIVE_SHARDS);
  });
});

describe('Puddle Simulation & Edge Dripping (K4.3)', () => {
  it('spreads viscously and drips when reaching the table edge', () => {
    const sim = new PuddleSimulator();

    // Place puddle right near the table edge
    const puddle = sim.addPuddle('spill_edge', [15.7, TABLE_TOP_Y, 0], 25, ['H2O']);
    expect(puddle.radius).toBe(0.15);

    // Step simulation
    let dripped = false;
    for (let step = 0; step < 60; step++) {
      const res = sim.update(1 / 60);
      if (res.drippingPuddles.some(p => p.id === 'spill_edge')) {
        dripped = true;
      }
    }

    expect(puddle.radius).toBeGreaterThan(0.15);
    expect(dripped).toBe(true);
    expect(puddle.isDrippingOffEdge).toBe(true);
  });
});
