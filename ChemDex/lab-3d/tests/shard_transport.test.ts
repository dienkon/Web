import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MAX_ACTIVE_SHARDS, ShardManager, shardManager } from '../src/damage/Shards';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';
import { METERS_PER_SCENE_UNIT, SCENE_GRAVITY } from '../src/science/sceneUnits';
import { useAppStore } from '../src/store/useAppStore';

const harness = vi.hoisted(() => ({ frame: null as null | ((s: unknown, dt: number) => void),
  refs: [] as { current: unknown }[] }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, default: { ...actual, memo: (fn: unknown) => fn },
    useMemo: (fn: () => unknown) => fn(), useRef: (value: unknown) => {
      const ref = { current: value }; harness.refs.push(ref); return ref;
    } };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (fn: typeof harness.frame) => { harness.frame = fn; } }));
import { ShardsRenderer } from '../src/components/three/ShardsRenderer';

const before = useAppStore.getState();
afterEach(() => {
  shardManager.cleanShards('brush_dustpan'); harness.refs = []; harness.frame = null;
  useAppStore.setState(before, true);
});

describe('Shard ballistic anchors', () => {
  it('falls the SI distance and conserves free-flight mechanical energy', () => {
    const manager = new ShardManager(), s = manager.spawnShatterShards('v', [0, 20, 0], '#fff', 1)[0];
    const start = structuredClone(s), dt = 0.1;
    manager.update(dt, -100);
    expect((s.position[1] - start.position[1] - start.velocity[1] * dt) * METERS_PER_SCENE_UNIT)
      .toBeCloseTo(-0.5 * 9.8 * dt ** 2, 12);
    const energy = (p: typeof s) => p.velocity.reduce((sum, v) => sum + v * v, 0) / 2 + SCENE_GRAVITY * p.position[1];
    expect(energy(s)).toBeCloseTo(energy(start), 9);
  });
  it('has equal trajectories, impact rotation and final rest at 30/60/120 Hz', () => {
    const run = (fps: number, duration: number) => {
      const manager = new ShardManager(); manager.spawnShatterShards('v', [0, 0, 0], '#fff', 4);
      for (let i = 0; i < fps * duration; i++) manager.update(1 / fps);
      return manager.getShards();
    };
    for (const duration of [0.1, 0.2, 1]) {
      const base = run(30, duration);
      for (const fps of [60, 120]) run(fps, duration).forEach((s, index) => {
        for (const key of ['position', 'velocity', 'rotation', 'angularVelocity'] as const)
          s[key].forEach((v, axis) => expect(v).toBeCloseTo(base[index][key][axis], 9));
        expect(s.isSettled).toBe(base[index].isSettled);
      });
      if (duration === 1) for (const s of base) {
        expect(s.isSettled).toBe(true); expect(s.position[1]).toBe(LAB_PHYSICS.TABLE_SURFACE_Y);
      }
    }
  });
  it('does not move settled shards or accept invalid elapsed time', () => {
    const manager = new ShardManager(); manager.spawnShatterShards('v', [0, 0, 0]);
    const initial = structuredClone(manager.getShards());
    for (const dt of [0, -1, NaN, Infinity]) manager.update(dt);
    expect(manager.getShards()).toEqual(initial);
    manager.update(1); const settled = structuredClone(manager.getShards());
    manager.update(10); expect(manager.getShards()).toEqual(settled);
  });
  it('keeps burst identity unique without changing seeded geometry', () => {
    const manager = new ShardManager();
    const a = manager.spawnShatterShards('same', [0, 0, 0]), b = manager.spawnShatterShards('same', [0, 0, 0]);
    expect(new Set([...a, ...b].map(s => s.id)).size).toBe(40);
    expect(a.map(({ id: _id, ...s }) => s)).toEqual(b.map(({ id: _id, ...s }) => s));
    expect(a.every(s => s.sourceVesselId === 'same')).toBe(true);
  });
  it('bounds allocation and rejects malformed bursts before mutation', () => {
    const manager = new ShardManager();
    for (const count of [NaN, Infinity, -1, 0, 0.1]) expect(manager.spawnShatterShards('v', [0, 0, 0], '#fff', count)).toEqual([]);
    expect(manager.spawnShatterShards('v', [NaN, 0, 0])).toEqual([]);
    const burst = manager.spawnShatterShards('v', [0, 0, 0], '#fff', 1e12, 1e308);
    expect(burst).toHaveLength(MAX_ACTIVE_SHARDS); expect(manager.getShards()).toEqual(burst);
    expect(burst.every(s => [...s.position, ...s.velocity].every(Number.isFinite))).toBe(true);
  });
});

describe('Live shard renderer', () => {
  function mount() {
    return (ShardsRenderer as unknown as () => { props: { onClick: (e: { instanceId: number; stopPropagation: () => void }) => void } })();
  }
  it('freezes on pause and follows the application time scale', () => {
    mount(); const s = shardManager.spawnShatterShards('v', [0, 10, 0], '#fff', 1)[0], start = structuredClone(s);
    useAppStore.setState({ isSimulationPaused: true, timeScale: 2 }); harness.frame!({}, 0.01);
    expect(s).toEqual(start);
    useAppStore.setState({ isSimulationPaused: false }); harness.frame!({}, 0.01);
    expect(s.velocity[1]).toBeCloseTo(start.velocity[1] - SCENE_GRAVITY * 0.02, 12);
  });
  it('places the lowest rotated rendered vertex on the real tabletop after settling', () => {
    mount(); useAppStore.setState({ isSimulationPaused: false, timeScale: 1 });
    shardManager.spawnShatterShards('v', [0, 0, 0], '#fff', 4);
    const geom = new THREE.TetrahedronGeometry(1, 0), mesh = new THREE.InstancedMesh(geom, new THREE.MeshBasicMaterial(), MAX_ACTIVE_SHARDS);
    harness.refs[0].current = mesh;
    for (let i = 0; i < 60; i++) harness.frame!({}, 1 / 60);
    const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3(), vertices = geom.getAttribute('position');
    for (let i = 0; i < 4; i++) {
      expect(shardManager.getShards()[i].isSettled).toBe(true);
      mesh.getMatrixAt(i, matrix); let minY = Infinity;
      for (let j = 0; j < vertices.count; j++) minY = Math.min(minY, vertex.fromBufferAttribute(vertices, j).applyMatrix4(matrix).y);
      expect(minY).toBeCloseTo(LAB_PHYSICS.TABLE_SURFACE_Y, 6);
    }
    geom.dispose(); mesh.material.dispose();
  });
  it('hides collected instances on the next render without regenerating debris', () => {
    mount(); useAppStore.setState({ isSimulationPaused: false, timeScale: 1 });
    shardManager.spawnShatterShards('v', [0, 0, 0], '#fff', 1);
    const geom = new THREE.TetrahedronGeometry(1, 0), material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.InstancedMesh(geom, material, MAX_ACTIVE_SHARDS);
    harness.refs[0].current = mesh;
    for (let i = 0; i < 60; i++) harness.frame!({}, 1 / 60);
    expect(useAppStore.getState().cleanGlassDebris('v')).toBe(1);
    for (let i = 0; i < 3; i++) harness.frame!({}, 0);
    expect(shardManager.getShards()).toEqual([]);
    expect(mesh.count).toBe(0);
    const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3(), vertices = geom.getAttribute('position');
    mesh.getMatrixAt(0, matrix);
    for (let i = 0; i < vertices.count; i++) {
      expect(vertex.fromBufferAttribute(vertices, i).applyMatrix4(matrix).toArray()).toEqual([0, -999, 0]);
    }
    geom.dispose(); material.dispose();
  });
  it('checkpoints the settled pose once, rather than replaying a saved launch on reload', () => {
    mount(); useAppStore.setState({ isSimulationPaused: false, timeScale: 1 });
    const checkpoint = vi.spyOn(useAppStore.getState(), 'checkpointGlassDebris');
    shardManager.spawnShatterShards('v', [0, 0, 0], '#fff', 1);
    for (let i = 0; i < 60; i++) harness.frame!({}, 1 / 60);
    expect(checkpoint).toHaveBeenCalledTimes(1);
    expect(shardManager.getShards()[0].isSettled).toBe(true);
    for (let i = 0; i < 60; i++) harness.frame!({}, 1 / 60);
    expect(checkpoint).toHaveBeenCalledTimes(1); checkpoint.mockRestore();
  });
  it('selects the source of the rendered instance even if collection changes pool ordering before the next frame', () => {
    const node = mount();
    const source = { id: 'a' } as import('../src/types/chemistry').VesselState;
    useAppStore.setState({ vessels: { a: source, b: { ...source, id: 'b' } }, isSimulationPaused: false, timeScale: 1 });
    shardManager.spawnShatterShards('a', [0, 0, 0], '#fff', 1);
    shardManager.spawnShatterShards('b', [8, 0, 0], '#fff', 1);
    const geom = new THREE.TetrahedronGeometry(1, 0), material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.InstancedMesh(geom, material, MAX_ACTIVE_SHARDS); harness.refs[0].current = mesh;
    for (let i = 0; i < 60; i++) harness.frame!({}, 1 / 60);
    useAppStore.getState().cleanGlassDebris('a');
    const stopPropagation = vi.fn(); node.props.onClick({ instanceId: 1, stopPropagation });
    expect(useAppStore.getState().selectedVesselId).toBe('b'); expect(stopPropagation).toHaveBeenCalledOnce();
    harness.frame!({}, 0); useAppStore.setState({ selectedVesselId: null });
    node.props.onClick({ instanceId: 0, stopPropagation });
    expect(useAppStore.getState().selectedVesselId).toBe('b');
    useAppStore.setState({ vessels: {}, selectedVesselId: null });
    node.props.onClick({ instanceId: 0, stopPropagation }); expect(useAppStore.getState().selectedVesselId).toBeNull();
    geom.dispose(); material.dispose();
  });
});
