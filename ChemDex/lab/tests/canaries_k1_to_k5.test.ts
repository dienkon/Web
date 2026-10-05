import { describe, it, expect } from 'vitest';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { retainedVolume, solveLevel } from '../src/pour/physics/retained';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { stepPourSimulation, SimVessel, PourPhysicsSession } from '../src/pour/physics/step';
import { willVesselTip, calculateVesselStability } from '../src/physicsLite/Support';
import { RigidBodyLite, TABLE_TOP_Y, FLOOR_Y } from '../src/physicsLite/RigidBodyLite';
import { evaluateDropImpact, evaluateThermalShock } from '../src/damage/DamageModel';
import { shardManager, MAX_ACTIVE_SHARDS } from '../src/damage/Shards';
import { TubingNetwork, TubingNode } from '../src/apparatus/Tubing';
import { evaluateSnapTarget } from '../src/handling/snapping';

describe('CANARY SUITE: High-Fidelity Realism Verifications (K1 - K5)', () => {
  // ========================================================
  // CANARY K1: 250 mL Beaker (80 mL water), Wheel-tilt 0 -> 180° and drain
  // ========================================================
  it('Canary K1: Beaker tilt 0 to 180° drains completely with exact mass conservation', () => {
    const beakerProfile = getVesselProfile('beaker');
    const initialVol = 80; // mL

    // 1. Monotone non-increasing retained curve
    let prevRetained = beakerProfile.capacity_ml;
    for (let deg = 0; deg <= 180; deg += 10) {
      const rad = (deg * Math.PI) / 180;
      const ret = retainedVolume(beakerProfile, rad);
      expect(ret).toBeLessThanOrEqual(prevRetained + 1e-4);
      prevRetained = ret;
    }

    // At 180 degrees, retained volume must be ≈ 0
    expect(retainedVolume(beakerProfile, Math.PI)).toBeCloseTo(0, 1);

    // 2. Physical simulation step to drain beaker
    const vessels: Record<string, SimVessel> = {
      beaker_src: {
        id: 'beaker_src',
        type: 'beaker',
        position: [0, 0.8, 0],
        rotationZ: -Math.PI, // 180° inverted
        volume_ml: initialVol,
        capacity_ml: 250,
        mass_g: initialVol,
        density_g_ml: 1.0,
        temperature_c: 25,
        colorHex: '#38bdf8',
        substances: ['H2O']
      },
      receiver: {
        id: 'receiver',
        type: 'beaker',
        position: [0, -0.135, 0],
        rotationZ: 0,
        volume_ml: 0,
        capacity_ml: 250,
        mass_g: 0,
        density_g_ml: 1.0,
        temperature_c: 25,
        colorHex: '#38bdf8',
        substances: ['H2O']
      }
    };

    let session: PourPhysicsSession = {
      sourceId: 'beaker_src',
      targetId: 'receiver',
      tilt: Math.PI,
      isStreaming: false,
      totalTransferred_ml: 0,
      totalSpilled_ml: 0,
      lastFlowRate: 0
    };

    // Simulate for 3 seconds of inverted draining
    const dt = 1 / 60;
    for (let f = 0; f < 180; f++) {
      const stepRes = stepPourSimulation(session, vessels, dt, f * dt);
      session = stepRes.nextSession;
      vessels.beaker_src = stepRes.updatedSource;
      if (stepRes.updatedTarget) {
        vessels.receiver = stepRes.updatedTarget;
      }
    }

    // At 180° inverted, beaker must be drained
    expect(vessels.beaker_src.volume_ml).toBeLessThan(1.0);

    // Mass conservation: transferred + spilled + remaining retained == initial
    const totalAccounted = vessels.beaker_src.volume_ml + session.totalTransferred_ml + session.totalSpilled_ml;
    expect(totalAccounted).toBeCloseTo(initialVol, 1);
  });

  // ========================================================
  // CANARY K2: Inverted Erlenmeyer Flask with glug-glug and stable solveLevel
  // ========================================================
  it('Canary K2: Erlenmeyer flask inverted pouring exhibits glug oscillation and zero NaNs', () => {
    const flaskProfile = getVesselProfile('flask');

    // Test stability and absence of NaN at 90°, 135°, and 180°
    const angles = [Math.PI * 0.5, Math.PI * 0.75, Math.PI];
    for (const theta of angles) {
      const level = solveLevel(flaskProfile, theta, 120);
      expect(isNaN(level.c)).toBe(false);
      expect(isNaN(level.liquidTopY)).toBe(false);
      expect(isNaN(level.surfaceArea)).toBe(false);
      expect(level.surfaceArea).toBeGreaterThan(0);
    }

    // Narrow-necked flask tilted steeply exhibits glugging
    const flow = calculateWeirFlow(flaskProfile, 150, 1.35, 0.5);
    expect(flow.isPouring).toBe(true);
    expect(flow.isGlugging).toBe(true);
    expect(flow.glugPulse).toBeGreaterThanOrEqual(0);
    expect(flow.glugPulse).toBeLessThanOrEqual(1.0);
  });

  // ========================================================
  // CANARY K3: Full tall graduated cylinder tips, falls off edge, and shatters
  // ========================================================
  it('Canary K3: Tall cylinder tips at ~12-15°, falls off edge, and shatters on stone floor', () => {
    // 1. Tipping criteria
    const cylinderStability = calculateVesselStability('cylinder', 80);
    expect(cylinderStability.tippingAngleRad).toBeLessThan(0.30); // < ~17°
    expect(willVesselTip('cylinder', (15 * Math.PI) / 180, 80)).toBe(true);

    // 2. Fall off bench edge to floor
    const cylinderBody = new RigidBodyLite('cyl_1', 'cylinder', [15.8, TABLE_TOP_Y, 0], 0.22);
    cylinderBody.applyImpulse([0.22 * 3.5, 0, 0]); // push off table

    let hasLanded = false;
    let floorImpactEnergy = 0;
    const dt = 1 / 60;

    for (let f = 0; f < 120; f++) {
      const res = cylinderBody.step(dt);
      if (res.hasLandedOnFloor) {
        hasLanded = true;
        floorImpactEnergy = res.impactEnergy_J;
        break;
      }
    }

    expect(hasLanded).toBe(true);
    expect(cylinderBody.state.position[1]).toBeCloseTo(FLOOR_Y, 1);
    expect(floorImpactEnergy).toBeGreaterThan(0);

    // 3. Impact damage assessment
    const fallHeight_m = TABLE_TOP_Y - FLOOR_Y; // ~2.36 m
    const damage = evaluateDropImpact(fallHeight_m, 0.22, 'soda-lime', 'stone_floor', 42);
    expect(damage.shattered).toBe(true);
    expect(damage.severity).toBe('shattered');

    // 4. Shards instance pool cap
    const shards = shardManager.spawnShatterShards('cyl_1', cylinderBody.state.position, '#cbd5e1', 24);
    expect(shards.length).toBe(24);
    expect(shardManager.getShards().length).toBeLessThanOrEqual(MAX_ACTIVE_SHARDS);
  });

  // ========================================================
  // CANARY K4: Heat dry soda-lime test tube then add cold water
  // ========================================================
  it('Canary K4: Soda-lime tube cracks from thermal shock (ΔT=85 K) while borosilicate survives', () => {
    const dT = 85; // 85 K difference

    // Soda-lime has shock limit ~50 K -> must crack or shatter
    const sodaDamage = evaluateThermalShock(dT, 'soda-lime', 99);
    expect(sodaDamage.severity).not.toBe('none');
    expect(sodaDamage.integrity).toBeLessThan(1.0);

    // Borosilicate has shock limit ~160 K -> must survive pristine
    const boroDamage = evaluateThermalShock(dT, 'borosilicate', 99);
    expect(boroDamage.severity).toBe('none');
    expect(boroDamage.integrity).toBe(1.0);
  });

  // ========================================================
  // CANARY K5: Assembly + Delivery tube bubbling + Cooling suck-back
  // ========================================================
  it('Canary K5: Complete CaCO3/HCl assembly generates bubbles in trough and sucks back on cooling', () => {
    // 1. Snapping validation
    const flaskNode = { id: 'gas_flask', type: 'flask', position: [0, 0.5, 0] as [number, number, number] };
    const snap = evaluateSnapTarget([0, 1.45, 0], 'filter_funnel', { gas_flask: flaskNode }, {});
    expect(snap.isSnapped).toBe(true);
    expect(snap.targetId).toBe('gas_flask');

    // 2. Gas bubble production in submerged water trough
    const net = new TubingNetwork();
    net.connect('gas_flask', 'pneumatic_trough', true);

    const nodes: Record<string, TubingNode> = {
      gas_flask: {
        id: 'gas_flask',
        type: 'flask',
        position: [0, 0.5, 0],
        temperature_c: 25,
        internalPressure_atm: 1.6, // Gas buildup
        liquidVolume_ml: 50,
        substances: ['HCl', 'CaCO3']
      },
      pneumatic_trough: {
        id: 'pneumatic_trough',
        type: 'trough',
        position: [2.0, -0.135, 0],
        temperature_c: 22,
        internalPressure_atm: 1.0,
        liquidVolume_ml: 600,
        substances: ['H2O']
      }
    };

    const prevT: Record<string, number> = {
      gas_flask: 25,
      pneumatic_trough: 22
    };

    const gasRes = net.update(1 / 60, nodes, prevT);
    expect(gasRes.gasBubblesSpawned.length).toBeGreaterThan(0);
    expect(gasRes.suckBackTransfers.length).toBe(0);

    // 3. Flame removed -> rapid cooling -> suck-back into hot flask
    nodes.gas_flask.temperature_c = 85;
    nodes.gas_flask.internalPressure_atm = 1.0;
    prevT.gas_flask = 98; // cooling by 13 K

    const suckRes = net.update(0.5, nodes, prevT);
    expect(suckRes.suckBackTransfers.length).toBeGreaterThan(0);
    expect(suckRes.suckBackTransfers[0].fromId).toBe('pneumatic_trough');
    expect(suckRes.suckBackTransfers[0].toId).toBe('gas_flask');

    // Thermal shock warning triggered for hot glass receiving cold liquid
    expect(suckRes.thermalShockRisk.length).toBeGreaterThan(0);
    expect(suckRes.thermalShockRisk[0].vesselId).toBe('gas_flask');
  });
});
