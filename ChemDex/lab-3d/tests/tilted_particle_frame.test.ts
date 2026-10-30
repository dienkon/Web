import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { liquidParticlePlane, pointPlaneDepth, projectToLiquidPlane } from '../src/simulation/effects/liquidParticleFrame';
import { containParticle } from '../src/simulation/effects/particleBounds';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { volumeBelowPlane } from '../src/pour/physics/retained';
import { advanceBubbleMotion } from '../src/science/bubbleRise';
import { BoilingSystem, type BoilingSimulationParams } from '../src/simulation/effects/BoilingSystem';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { EvaporationSystem } from '../src/simulation/effects/EvaporationSystem';
import { GasPlumeSystem } from '../src/simulation/effects/GasPlumeSystem';
import { registerVesselBody, renderedVesselBody } from '../src/simulation/render/vesselBodyFrames';
import { PRNG } from '../src/core/rng';
import { vfxBus } from '../src/vfx/bus';
import type { PhysicalBubble } from '../src/simulation/core/SimulationTypes';

afterEach(() => vi.restoreAllMocks());

it.each(['beaker', 'flask', 'test_tube', 'cylinder'])('keeps particles inside the volume-preserving tilted %s liquid', type => {
  const profile = getVesselProfile(type, 100);
  for (const tilt of [0.2, 0.8, 1.4, 1.9]) for (const fraction of [0.1, 0.5, 0.9]) {
    const normal: [number, number, number] = [Math.sin(tilt) * 0.6, Math.cos(tilt), Math.sin(tilt) * 0.8];
    const plane = liquidParticlePlane(profile, 100 * fraction, normal)!;
    const volume = volumeBelowPlane(profile, Math.hypot(normal[0], normal[2]), normal[1], plane.offset);
    expect(volume / profile.referenceSceneVolume!).toBeCloseTo(fraction, 5);
    const bounds = { vesselProfile: profile, liquidBottomY: profile.baseY, radius: 1,
      surfaceY: profile.baseY + profile.H * fraction, surfacePlane: plane };
    const p = { x: 2, y: profile.baseY + profile.H, z: -1, radius: 0.008 };
    expect(containParticle(p, bounds)).toBe(true);
    expect(pointPlaneDepth(p, bounds.surfaceY, plane)).toBeGreaterThanOrEqual(p.radius - 1e-8);
    expect(p.y).toBeGreaterThanOrEqual(profile.baseY + p.radius - 1e-8);
    expect(p.y).toBeLessThanOrEqual(profile.baseY + profile.H - p.radius + 1e-8);
    expect(Math.hypot(p.x, p.z) + p.radius).toBeLessThanOrEqual(profile.r(p.y) + 1e-8);
    projectToLiquidPlane(p, bounds.surfaceY, plane);
    expect(containParticle(p, bounds, 1, true)).toBe(true);
    expect(pointPlaneDepth(p, bounds.surfaceY, plane)).toBeCloseTo(0, 8);
  }
});

it('rotates bubble motion as a vector law, including its finite-response displacement', () => {
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.8, -0.7, 1.1));
  const rotate = (p: readonly number[]) => new THREE.Vector3(...p as [number, number, number]).applyQuaternion(rotation).toArray();
  const position: [number, number, number] = [0.01, 0.02, -0.03], velocity: [number, number, number] = [0.01, 0.03, 0.02];
  const carrier: [number, number, number] = [-0.01, 0.02, 0.01];
  const reference = advanceBubbleMotion(position, velocity, carrier, 0.0002, 1000, 0.001, 0.01);
  const transformed = advanceBubbleMotion(rotate(position), rotate(velocity), rotate(carrier), 0.0002, 1000, 0.001, 0.01, 'immobile', rotate([0, 1, 0]));
  for (let i = 0; i < 3; i++) {
    expect(transformed.position[i]).toBeCloseTo(rotate(reference.position)[i], 13);
    expect(transformed.velocity[i]).toBeCloseTo(rotate(reference.velocity)[i], 13);
  }
  expect(transformed.terminal_m_s).toBe(reference.terminal_m_s);
});

it('pops on the tilted plane and transforms the burst using the captured body frame', () => {
  const profile = getVesselProfile('beaker', 100), normal: [number, number, number] = [-0.6, 0.8, 0];
  const plane = liquidParticlePlane(profile, 50, normal)!;
  const body = new THREE.Matrix4().compose(new THREE.Vector3(3, 4, -2),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.asin(0.6)), new THREE.Vector3(0.7, 0.7, 0.7));
  const point = projectToLiquidPlane({ x: 0, y: 0, z: 0 }, 0, plane, 0.002);
  const bubble = { id: 1, ...point, vx: 0, vy: 0, vz: 0, radius: 0.02, baseRadius: 0.02,
    gasPV_scene3_Pa: 101325 * 0.02 ** 3, nucleationPressure_Pa: 101325, source: 'reaction',
    buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1,
    life: 0, maxLife: 5, opacity: 1, temperature: 25, isPopping: false, popProgress: 0, merged: false } as PhysicalBubble;
  const system = new BoilingSystem(10, new PRNG(73)); system.bubbles = [bubble];
  const emit = vi.spyOn(vfxBus, 'emit');
  const params: BoilingSimulationParams = { vesselId: 'tilted', vesselProfile: profile, surfacePlane: plane,
    radius: 0.9, liquidBottomY: profile.baseY, surfaceY: 0.01, temp_c: 25, boilingPoint_c: 100,
    heatPower_W: 0, viscosity_mPa_s: 1, boilingStage: 'COLD_STABLE', boilingIntensity: 0.7,
    localToWorld: p => new THREE.Vector3(...p).applyMatrix4(body).toArray() };
  system.update(1 / 120, params);
  expect(system.bubbles[0].isPopping).toBe(true);
  expect(pointPlaneDepth(system.bubbles[0], params.surfaceY, plane)).toBeCloseTo(0, 9);
  const burst = emit.mock.calls.find(([event]) => event === 'particle:burst')![1] as { position: number[] };
  const expected = new THREE.Vector3(bubble.x + normal[0] * 0.006, bubble.y + normal[1] * 0.006, bubble.z).applyMatrix4(body);
  for (let i = 0; i < 3; i++) expect(burst.position[i]).toBeCloseTo(expected.toArray()[i], 12);
});

it('settles suspended grains along world gravity and keeps every representative mass', () => {
  const profile = getVesselProfile('beaker', 100), normal: [number, number, number] = [-0.6, 0.8, 0];
  const plane = liquidParticlePlane(profile, 60, normal)!;
  const system = new PrecipitationSystem(20, 'CuS', new PRNG(73));
  system.update(0.1, { vesselProfile: profile, surfacePlane: plane, temp_c: 25, ambientTemp_c: 25,
    viscosity_mPa_s: 1, density_g_ml: 1, radius: 0.9, liquidBottomY: profile.baseY, surfaceY: 0.2,
    precipitateAmount_g: 0.1, volume_ml: 60, substance: 'CuS', aggregationEnabled: false, agitation: 0, heatPower_W: 0 });
  expect(system.particles.length).toBeGreaterThan(0);
  expect(system.representedMass_g).toBeCloseTo(0.1, 12);
  for (const p of system.particles) {
    expect(p.vx).toBeCloseTo(-normal[0] * p.sedimentationSpeed, 10);
    expect(p.vy).toBeCloseTo(-normal[1] * p.sedimentationSpeed, 10);
    expect(p.vz).toBeCloseTo(0, 10);
    expect(pointPlaneDepth(p, 0.2, plane)).toBeGreaterThanOrEqual(p.radius * 2.01 - 1e-8);
  }
});

it('keeps emitted mist in world space when only the source moves', () => {
  const a = new EvaporationSystem(30, new PRNG(77)), b = new EvaporationSystem(30, new PRNG(77));
  const initial = { temp_c: 100, radius: 0.6, mouthRadius: 0.6, surfaceY: 0, mouthY: 1,
    surfaceArea_cm2: 20, isBoiling: true, actualRate_g_s: 0.15, ambient_c: 20, relativeHumidity: 0.5,
    sourceWaterPressure_Pa: 101325, sourceToWorld: (p: [number, number, number]): [number, number, number] => [p[0] + 2, p[1] + 3, p[2] - 1] };
  a.update(0.3, initial); b.update(0.3, initial);
  expect(a.particles.length).toBeGreaterThan(0);
  const moved = { ...initial, actualRate_g_s: 0,
    sourceToWorld: (p: [number, number, number]): [number, number, number] => [p[0] + 9, p[1] + 3, p[2] - 1] };
  a.update(0.1, { ...initial, actualRate_g_s: 0 }); b.update(0.1, moved);
  expect(b.particles).toEqual(a.particles);
  const oldIds = new Set(a.particles.map(p => p.id));
  a.update(0.1, initial); b.update(0.1, { ...moved, actualRate_g_s: initial.actualRate_g_s });
  const newborn = a.particles.filter(p => !oldIds.has(p.id)); expect(newborn.length).toBeGreaterThan(0);
  for (const particle of newborn) {
    const translated = b.particles.find(p => p.id === particle.id)!;
    expect(translated.x - particle.x).toBeCloseTo(7, 12);
    expect(translated.y).toBeCloseTo(particle.y, 12);
  }
});

it('emits colored gas through the captured tilted source disk and keeps old gas independent of its motion', () => {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(3, 4, -1),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.7, -0.9)), new THREE.Vector3(1.2, 1.2, 1.2));
  const a = new GasPlumeSystem(30, new PRNG(77)), b = new GasPlumeSystem(30, new PRNG(77));
  const input = { rate: 20, mol_s: 0.001, temperature_c: 25, ambient_c: 25, molarMass: 46.005,
    mouthY: 1, mouthRadius: 0.3, floorY: -2, wind_m_s: 0.1,
    sourceToWorld: (p: [number, number, number]) => new THREE.Vector3(...p).applyMatrix4(matrix).toArray() };
  a.update(0.3, input); b.update(0.3, input); expect(a.particles.length).toBeGreaterThan(0);
  const translated = matrix.clone().setPosition(10, 4, -1);
  a.update(0.1, { ...input, rate: 0, mol_s: 0 });
  b.update(0.1, { ...input, rate: 0, mol_s: 0, sourceToWorld: p => new THREE.Vector3(...p).applyMatrix4(translated).toArray() });
  expect(b.particles).toEqual(a.particles);
  expect(a.particles.every(p => p.x > 2 && p.y > 4)).toBe(true);
  expect(a.acceptedGas_mol).toBeCloseTo(0.0003, 12);
});

it('does not let old body cleanup remove the frame of a remounted replacement', () => {
  const original = new THREE.Group(), replacement = new THREE.Group(); replacement.position.set(2, 3, 4);
  const removeOld = registerVesselBody('v', original), removeNew = registerVesselBody('v', replacement);
  try { removeOld(); expect(renderedVesselBody('v')).toBe(replacement); }
  finally { removeNew(); }
  expect(renderedVesselBody('v')).toBeUndefined();
});
