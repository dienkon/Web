import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ParticlePool } from '../src/vfx/particles/ParticlePool';
import { particleOpacityShader } from '../src/vfx/particles/particleOpacity';
import { stepFoamInventory, FOAM_SURFACTANT } from '../src/engine/foamInventory';
import { foamLayer, foamGlyph } from '../src/vfx/geometry/foamLayer';
import { DEFAULT_LAB_ENVIRONMENT } from '../src/science/labEnvironment';
import { contourVolumeBelow, vesselInterior, contourRadius } from '../src/science/vesselDimensions';
import { mergeWorkbenchSpill, mergeWorkbenchSpillBatch } from '../src/engine/spillInventory';
import { stepSpillChemistry } from '../src/engine/spillChemistry';
import { computeMolarMass } from '../src/engine/ledger';
import { useAppStore } from '../src/store/useAppStore';
import { pourContactRemaining } from '../src/science/pourContactActivity';
import { advanceSplatterFlight } from '../src/science/splatterFlight';
import { SCENE_GRAVITY } from '../src/science/sceneUnits';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { getReactionController } from '../src/vfx/reactions/registry';
import { registerVesselBody } from '../src/simulation/render/vesselBodyFrames';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vfxBus } from '../src/vfx/bus';
import type { VesselState } from '../src/types/chemistry';

const original = useAppStore.getState();
afterEach(() => { useAppStore.setState(original, true); vi.restoreAllMocks(); });
const row = (formula: string, mass_g: number, phase: string) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
const vessel = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'lab_effects', name: 'Sample', type: 'beaker',
  capacity_ml: 250, volume_ml: 50, mass_g: 50, volume: 0.2, temperature_c: 25, ph: 7,
  position: [0, -0.135, 0], rotationY: 0, isLocked: false, contents: [row('H2O', 50, 'l')],
  substances: ['H2O'], hasGas: false, hasPrecipitate: false, isBoiling: false, ...patch });

it('uploads distinct particle colors and opacity without requiring preallocated instance colors', () => {
  const pool = new ParticlePool(4), mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial(), 4);
  pool.spawn({ x: 1, r: 1, g: 0.2, b: 0, alpha: 0.3 });
  pool.spawn({ x: 2, r: 0, g: 0.4, b: 1, alpha: 0.8 });
  const update = vi.fn(() => true);
  for (const dt of [0, -1, NaN, Infinity]) pool.update(dt, update, mesh);
  expect(update).not.toHaveBeenCalled(); expect(pool.particles[0].age).toBe(0); expect(mesh.count).toBe(2);
  expect(Array.from(mesh.instanceColor!.array).slice(0, 6)).toEqual([1, expect.closeTo(0.2), 0, 0, expect.closeTo(0.4), 1]);
  expect(mesh.geometry.getAttribute('instanceOpacity').getX(0)).toBeCloseTo(0.3);
  expect(mesh.geometry.getAttribute('instanceOpacity').getX(1)).toBeCloseTo(0.8);
  const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>' };
  particleOpacityShader(shader); expect(shader.fragmentShader).toContain('diffuseColor.a *=');
  mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
});

it('uses exact scene-scale ballistic flight without integrating a particle twice', () => {
  const run = (steps: number) => {
    const pool = new ParticlePool(1), mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial(), 1);
    pool.spawn({ x: 1, y: 20, vx: 2, vy: 4, life: 2 });
    for (let i = 0; i < steps; i++) pool.update(0.2 / steps, (p, dt) => {
      const next = advanceSplatterFlight(p, dt, -1.175); Object.assign(p, next); return !next.hit;
    }, mesh, undefined, false);
    const result = { ...pool.particles[0] }; mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); return result;
  };
  const a = run(1), b = run(24);
  expect(a.x).toBeCloseTo(1.4, 10); expect(a.y).toBeCloseTo(20 + 4 * 0.2 - SCENE_GRAVITY * 0.2 ** 2 / 2, 10);
  expect(a.y).toBeCloseTo(b.y, 10); expect(a.vy).toBeCloseTo(b.vy, 10);
});

it('integrates only the time since emission for particles born partway through a slow frame', () => {
  const pool = new ParticlePool(2), mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial(), 2);
  pool.spawn({ age: -0.075, vx: 4, life: 1 });
  const integrate = vi.fn((_p: unknown, _dt: number) => true);
  pool.update(0.1, integrate, mesh);
  expect(pool.particles[0].age).toBeCloseTo(0.025, 12);
  expect(pool.particles[0].x).toBeCloseTo(0.1, 12);
  expect(integrate.mock.calls[0][1]).toBeCloseTo(0.025, 12);
  mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
});

it('foam volume follows ambient pressure and conserves retained plus escaped oxygen', () => {
  const contents = [row('H2O', 50, 'l'), row(FOAM_SURFACTANT, 0.25, 'aq')];
  const before = vessel({ contents, mass_g: 50.25 });
  const calculate = (pressure_atm: number) => stepFoamInventory({ ...before, escapedGas_g: { O2: 0.001 },
    environment: { ...DEFAULT_LAB_ENVIRONMENT, pressure_atm } }, before, 0.1)!;
  const low = calculate(0.5), normal = calculate(1), high = calculate(2);
  expect(low.foam_ml!).toBeCloseTo(normal.foam_ml! * 2, 9); expect(high.foam_ml!).toBeCloseTo(normal.foam_ml! / 2, 9);
  for (const result of [low, normal, high]) {
    const held = result.contents!.filter(c => c.location === 'foam').reduce((s, c) => s + c.mass_g, 0);
    expect(held + result.escapedGas_g!.O2).toBeCloseTo(0.001, 12);
  }
});

it.each(['beaker', 'flask', 'test_tube', 'cylinder'] as const)('foam occupies the inventoried gas volume inside a %s', type => {
  const v = vessel({ type, foam_ml: 30 }), layer = foamLayer(v)!;
  const interior = vesselInterior(type);
  const physicalVolume = (contourVolumeBelow(interior.points, layer.top) - contourVolumeBelow(interior.points, layer.bottom))
    / interior.volume * v.capacity_ml;
  expect(physicalVolume).toBeCloseTo(30, 7);
  for (let i = 0; i < 96; i++) {
    const glyph = foamGlyph(layer, i, 96, 13.4);
    expect(glyph.y - glyph.radius).toBeGreaterThanOrEqual(layer.bottom - 1e-10);
    expect(glyph.y + glyph.radius).toBeLessThanOrEqual(layer.top + 1e-10);
    expect(Math.hypot(glyph.x, glyph.z) + glyph.radius).toBeLessThanOrEqual(contourRadius(interior.points, glyph.y) + 1e-10);
  }
});

it.each([Math.PI / 6, Math.PI / 3])('tilted foam remains between horizontal gravity planes at %s radians', angle => {
  const up: [number, number, number] = [Math.sin(angle), Math.cos(angle), 0], layer = foamLayer(vessel({ foam_ml: 30 }), up)!;
  let visible = 0;
  for (let i = 0; i < 64; i++) {
    const glyph = foamGlyph(layer, i, 64, 3.2); if (!glyph.radius) continue; visible++;
    const offset = glyph.x * up[0] + glyph.y * up[1];
    expect(offset - glyph.radius).toBeGreaterThanOrEqual(layer.lowerPlane!.offset - 1e-10);
    expect(offset + glyph.radius).toBeLessThanOrEqual(layer.upperPlane!.offset + 1e-10);
  }
  expect(visible).toBeGreaterThan(40);
});

it.each(['single', 'batch'])('a %s water deposition wets actual dry sodium and starts finite chemistry', mode => {
  const initial = mergeWorkbenchSpill({}, [0, -1.175, 0], 0, ['Na'], '#bbb', 'Na', 0.1, [row('Na', 0.1, 's')]);
  const water = { volume_ml: 10, mass_g: 10, temperature_c: 25, color: '#f8fafc', contents: [row('H2O', 10, 'l')], substances: ['H2O'] };
  const mixed = mode === 'single' ? mergeWorkbenchSpill(initial, [0, -1.175, 0], 10, ['H2O'], water.color, '', 10, water.contents)
    : mergeWorkbenchSpillBatch(initial, [[0, -1.175, 0]], water);
  expect(Object.keys(mixed)).toHaveLength(1);
  const reacted = stepSpillChemistry(Object.values(mixed)[0], 0.1);
  expect(reacted.contents!.find(c => c.formula === 'Na')!.mass_g).toBeLessThan(0.1);
  expect(reacted.escapedGas_g?.H2).toBeGreaterThan(0);
  expect(reacted.mass_g + reacted.escapedGas_g!.H2).toBeCloseTo(10.1, 9);
});

it('solid carbonate reacts in an acid puddle containing inert salt without requiring a beaker', () => {
  const contents = [row('CaCO3', 0.1, 's'), row('HCl', 0.2, 'aq'), row('NaCl', 0.05, 'aq'), row('H2O', 20, 'l')];
  const spill = Object.values(mergeWorkbenchSpill({}, [0, -1.175, 0], 20, contents.map(c => c.formula), '#fff', '', 20.35, contents))[0];
  const reacted = stepSpillChemistry(spill, 0.1), next = stepSpillChemistry(reacted, 0.1);
  expect(reacted.escapedGas_g?.CO2).toBeGreaterThan(0); expect(next.escapedGas_g!.CO2).toBeGreaterThan(reacted.escapedGas_g!.CO2);
  expect(next.mass_g + next.escapedGas_g!.CO2).toBeCloseTo(spill.mass_g, 9);
  expect(next.contents!.find(c => c.formula === 'NaCl')!.mass_g).toBe(0.05);
});

it('contact color and precipitation entry points remain active while paused and age at the chosen time scale', () => {
  const v = vessel({ recentPourContact: { point: [0.1, 0, 0], expiresAt_ms: 0, remaining_s: 1.5, color: '#0af' } });
  useAppStore.setState({ vessels: { [v.id]: v }, burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {}, timeScale: 4, isSimulationPaused: true });
  useAppStore.getState().tickSimulation(0.1);
  expect(pourContactRemaining(useAppStore.getState().vessels[v.id].recentPourContact, 999999999999)).toBe(1.5);
  useAppStore.getState().setSimulationPaused(false); useAppStore.getState().tickSimulation(0.1);
  expect(pourContactRemaining(useAppStore.getState().vessels[v.id].recentPourContact)).toBeCloseTo(1.1, 10);
});

it('oxidizing and water-reactive spills inherit laboratory hazard labels from the chemical catalog', () => {
  for (const formula of ['KMnO4', 'Na', 'K', 'CuSO4']) {
    const spill = Object.values(mergeWorkbenchSpill({}, [0, -1.175, 0], 0, [formula], '#fff', '', 0.1, [row(formula, 0.1, 's')]))[0];
    expect(spill.isHazard, formula).toBe(true);
  }
});

it.each(['saved-pose', 'rendered-pose'])('reaction bursts originate from the real %s and capacity scale', mode => {
  const v = vessel({ capacity_ml: 500, position: [2, 0.3, -1], rotationY: 0.7, rotationZ: 0.35 });
  useAppStore.setState({ vessels: { [v.id]: v } });
  const local: [number, number, number] = [0.2, 0.4, -0.1], sparks: number[][] = [], droplets: number[][] = [];
  const body = new THREE.Object3D(); body.position.set(3, 1, -2); body.rotation.set(0.2, 0.5, 0.3); body.scale.setScalar(1.4);
  body.updateWorldMatrix(true, false);
  const detach = mode === 'rendered-pose' ? registerVesselBody(v.id, body) : () => {};
  const expected = mode === 'rendered-pose' ? new THREE.Vector3(...local).applyMatrix4(body.matrixWorld).toArray() : vesselLocalToWorld(v, local);
  const off = vfxBus.on('sparks', e => sparks.push(e.position)), offDrop = vfxBus.on('particle:burst', e => droplets.push(e.position));
  const engine = new ReactionSimulationEngine();
  vi.spyOn(getReactionController('burn_magnesium')!, 'update').mockImplementation(c => {
    c.emitSparks(local, 1, '#fff'); c.emitBurst(local, 1, '#0af', 1);
  });
  try {
    engine.startReaction(v.id, 'burn_magnesium'); engine.update(0.02);
    expect(sparks).toHaveLength(1); expect(droplets).toHaveLength(1);
    sparks[0].forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], 12));
    expect(droplets[0]).toEqual(sparks[0]);
  } finally { off(); offDrop(); detach(); engine.resetAll(); }
});
