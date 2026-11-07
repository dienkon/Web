import RAPIER from '@dimforge/rapier3d-compat';
import { CONSTANTS } from '../core/units';
import { LAB_GEOMETRY } from '../core/labGeometry';
import { sceneToMeters } from '../science/sceneUnits';
import { materialProperties } from './materials';
import type { PhysicalBodyInput, SimulationCommand, SimulationSnapshot, Vec3, Quat } from './types';
import { Quaternion, Vector3 } from 'three';
import { getWorldVesselProfile } from '../pour/physics/profiles';
import { solveLevel } from '../pour/physics/retained';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { submergedBoxVolume, buoyancyForce_N, viscousDragImpulse } from './fluids';

const DT = 1 / 120;
const vector = (v: readonly number[]) => ({ x: v[0], y: v[1], z: v[2] });
const rotation = (q: Quat) => ({ x: q[0], y: q[1], z: q[2], w: q[3] });
const tuple = (v: { x: number; y: number; z: number }): Vec3 => [v.x, v.y, v.z];
const finite = (v: readonly number[]) => v.every(Number.isFinite);
let initialized: Promise<void> | undefined;
type Body = { input: PhysicalBodyInput; body: RAPIER.RigidBody; target?: { position: Vec3; rotation: Quat }; joint?: RAPIER.ImpulseJoint };
export interface RuntimeSave {
  version: 1; rapierVersion: string; world: number[]; inputs: PhysicalBodyInput[];
  handles: [string, number][]; targets: [string, { position: Vec3; rotation: Quat }][];
  joints: [string, number][]; tick: number; accumulator_s: number; sequence: number; seed: number;
}

/** Pure SI simulation. No React, DOM, wall clock or rendering quality input. */
export class PhysicsRuntime {
  private world: RAPIER.World;
  private events: RAPIER.EventQueue;
  private bodies = new Map<string, Body>();
  private colliderOwner = new Map<number, string>();
  private contacts = new Map<string, Set<string>>();
  private pending: SimulationCommand[] = [];
  private accumulator = 0;
  private tickCount = 0;
  private sequence = 0;
  private impacts: SimulationSnapshot['impacts'] = [];
  private fluidForces: NonNullable<SimulationSnapshot['fluidForces']> = [];

  static async create(seed = 1, environment = true) {
    await (initialized ??= RAPIER.init());
    return new PhysicsRuntime(seed, environment);
  }
  private constructor(private seed: number, environment: boolean) {
    this.world = new RAPIER.World({ x: 0, y: -CONSTANTS.g, z: 0 });
    this.world.timestep = DT;
    this.world.integrationParameters.normalizedAllowedLinearError = 0.00001;
    this.world.integrationParameters.normalizedPredictionDistance = 0.001;
    this.world.integrationParameters.numSolverIterations = 12;
    this.world.integrationParameters.maxCcdSubsteps = 4;
    this.events = new RAPIER.EventQueue(true);
    if (environment) {
      const table = RAPIER.ColliderDesc.cuboid(sceneToMeters(LAB_GEOMETRY.tableHalfWidth_scene),
        sceneToMeters(LAB_GEOMETRY.tableThickness_scene / 2), sceneToMeters(LAB_GEOMETRY.tableHalfDepth_scene))
        .setTranslation(0, sceneToMeters(LAB_GEOMETRY.tableTop_scene - LAB_GEOMETRY.tableThickness_scene / 2), 0);
      const floor = RAPIER.ColliderDesc.cuboid(10, 0.05, 10).setTranslation(0, sceneToMeters(LAB_GEOMETRY.floor_scene) - 0.05, 0);
      for (const [name, desc] of [['bench', table], ['stone_floor', floor]] as const) {
        const collider = this.world.createCollider(desc.setFriction(0.65).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS));
        this.colliderOwner.set(collider.handle, name);
      }
    }
  }
  get tick() { return this.tickCount; }

  dispatch(command: SimulationCommand): SimulationSnapshot {
    if (!Number.isSafeInteger(command.sequence) || command.sequence <= this.sequence) throw new Error('Physics command sequence must increase');
    if (!Number.isSafeInteger(command.tick) || command.tick < 0) throw new Error('Invalid command tick');
    this.sequence = command.sequence;
    if (command.kind === 'advance') {
      if (!Number.isFinite(command.seconds) || command.seconds < 0 || !Number.isFinite(command.timeScale)
        || command.timeScale < 0.1 || command.timeScale > 8) throw new Error('Invalid simulation time');
      this.flushCommands();
      if (!command.paused) {
        this.accumulator += Math.min(command.seconds, 0.1) * command.timeScale;
        let steps = 0;
        while (this.accumulator + 1e-12 >= DT && steps++ < 120) {
          this.flushCommands(); this.step(); this.accumulator = Math.max(0, this.accumulator - DT);
        }
      }
    } else {
      this.pending.push(structuredClone(command));
      this.pending.sort((a, b) => a.tick - b.tick || a.sequence - b.sequence);
      this.flushCommands();
    }
    return this.snapshot();
  }
  private flushCommands() {
    while (this.pending.length && this.pending[0].tick <= this.tickCount) {
      const c = this.pending.shift()!;
      if (c.kind === 'sync') this.sync(c.bodies);
      else if ('id' in c) {
        const entry = this.bodies.get(c.id);
        if (!entry) continue;
        if (c.kind === 'impulse') {
          if (!finite(c.impulse_Ns)) throw new Error('Non-finite impulse');
          entry.body.applyImpulse(vector(c.impulse_Ns), true);
        } else if (c.kind === 'hold') {
          if (!finite(c.target_m) || !finite(c.rotation) || Math.hypot(...c.rotation) < 1e-6) throw new Error('Invalid grip target');
          const n = Math.hypot(...c.rotation);
          entry.target = { position: c.target_m, rotation: c.rotation.map(v => v / n) as Quat };
          entry.body.wakeUp();
        } else if (c.kind === 'release') entry.target = undefined;
        else if (c.kind === 'detach') {
          if (entry.joint) this.world.removeImpulseJoint(entry.joint, true);
          entry.joint = undefined;
        } else if (c.kind === 'attach') {
          const other = this.bodies.get(c.otherId);
          if (!other || c.id === c.otherId || !finite(c.anchor_m) || !finite(c.otherAnchor_m)) throw new Error('Invalid attachment');
          if (entry.joint) this.world.removeImpulseJoint(entry.joint, true);
          entry.joint = this.world.createImpulseJoint(RAPIER.JointData.spherical(vector(c.anchor_m), vector(c.otherAnchor_m)), entry.body, other.body, true);
        }
      }
    }
  }
  private sync(inputs: PhysicalBodyInput[]) {
    if (new Set(inputs.map(i => i.id)).size !== inputs.length) throw new Error('Duplicate physical body');
    for (const input of inputs) {
      if (!input.id || !finite(input.position_m) || !finite(input.rotation) || !Number.isFinite(input.temperature_K)
        || !(input.definition.mass_kg > 0) || !(input.contentsMass_kg >= 0) || !Number.isFinite(input.contentsMass_kg)
        || !finite(input.definition.inertia_kg_m2) || input.definition.inertia_kg_m2.some(v => v <= 0)) throw new Error('Invalid body input');
    }
    const ids = new Set(inputs.map(i => i.id));
    for (const [id, entry] of this.bodies) if (!ids.has(id)) {
      for (let i = 0; i < entry.body.numColliders(); i++) this.colliderOwner.delete(entry.body.collider(i).handle);
      this.world.removeRigidBody(entry.body); this.bodies.delete(id); this.contacts.delete(id);
    }
    for (const input of [...inputs].sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
      let entry = this.bodies.get(input.id);
      if (entry && entry.input.definition.id !== input.definition.id) {
        for (let i = 0; i < entry.body.numColliders(); i++) this.colliderOwner.delete(entry.body.collider(i).handle);
        this.world.removeRigidBody(entry.body); this.bodies.delete(input.id); entry = undefined;
      }
      if (!entry) {
        const d = input.definition;
        const desc = (d.fixed || input.locked ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
          .setTranslation(...input.position_m).setRotation(rotation(input.rotation)).setCcdEnabled(true);
        if (input.velocity_m_s && finite(input.velocity_m_s)) desc.setLinvel(...input.velocity_m_s);
        if (input.angularVelocity_rad_s && finite(input.angularVelocity_rad_s)) desc.setAngvel(vector(input.angularVelocity_rad_s));
        const body = this.world.createRigidBody(desc);
        const material = materialProperties(d.materialId);
        try {
          for (const shape of d.colliders) {
            let collider: RAPIER.ColliderDesc | null;
            if (shape.kind === 'box') collider = RAPIER.ColliderDesc.cuboid(...shape.halfExtents_m).setTranslation(...shape.center_m);
            else if (shape.kind === 'ball') collider = RAPIER.ColliderDesc.ball(shape.radius_m).setTranslation(...shape.center_m);
            else collider = RAPIER.ColliderDesc.convexHull(new Float32Array(shape.vertices_m));
            if (!collider) throw new Error(`Degenerate collider: ${d.id}`);
            const actual = this.world.createCollider(collider.setDensity(0).setFriction(material.friction)
              .setRestitution(material.restitution).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body);
            this.colliderOwner.set(actual.handle, input.id);
          }
        } catch (error) { this.world.removeRigidBody(body); throw error; }
        entry = { body, input }; this.bodies.set(input.id, entry);
        this.updateMass(entry, input);
      } else {
        const old = entry.input;
        if (old.contentsMass_kg !== input.contentsMass_kg || JSON.stringify(old.contentsCOM_m) !== JSON.stringify(input.contentsCOM_m)) this.updateMass(entry, input);
        if (old.locked !== input.locked) entry.body.setBodyType(input.locked || input.definition.fixed ? RAPIER.RigidBodyType.Fixed : RAPIER.RigidBodyType.Dynamic, true);
        entry.input = input;
      }
    }
  }
  private updateMass(entry: Body, input: PhysicalBodyInput) {
    const d = input.definition, total = d.mass_kg + input.contentsMass_kg;
    const c = input.contentsCOM_m ?? d.centerOfMass_m;
    const com = d.centerOfMass_m.map((v, i) => (v * d.mass_kg + c[i] * input.contentsMass_kg) / total) as Vec3;
    const inertia = d.inertia_kg_m2.map((v, i) => v + d.centerOfMass_m.reduce((sum, x, j) => sum + (i === j ? 0 : d.mass_kg * (x - com[j]) ** 2), 0)
      + c.reduce((sum, x, j) => sum + (i === j ? 0 : input.contentsMass_kg * ((x - com[j]) ** 2 + d.dimensions_m[j] ** 2 / 12)), 0)) as Vec3;
    entry.body.setAdditionalMassProperties(total, vector(com), vector(inertia), { x: 0, y: 0, z: 0, w: 1 }, true);
    entry.body.recomputeMassPropertiesFromColliders();
  }
  private step() {
    const before = new Map<string, { velocity: Vec3; mass: number }>();
    for (const [id, entry] of this.bodies) {
      const b = entry.body;
      before.set(id, { velocity: tuple(b.linvel()), mass: b.mass() });
      b.resetForces(false); b.resetTorques(false);
      if (entry.target && b.isDynamic()) {
        const p = tuple(b.translation()), v = tuple(b.linvel()), m = b.mass();
        const force = p.map((x, i) => m * (24 ** 2 * (entry.target!.position[i] - x) - 48 * v[i] + (i === 1 ? CONSTANTS.g : 0))) as Vec3;
        const magnitude = Math.hypot(...force), limit = Math.max(20, m * CONSTANTS.g * 3);
        b.addForce(vector(force.map(x => x * Math.min(1, limit / Math.max(1e-12, magnitude)))), true);
        const q = b.rotation(), target = entry.target.rotation, angular = tuple(b.angvel());
        const sign = q.x * target[0] + q.y * target[1] + q.z * target[2] + q.w * target[3] < 0 ? -1 : 1;
        // Quaternion error target * inverse(current), shortest arc.
        const e = [target[3] * -q.x + target[0] * q.w - target[1] * q.z + target[2] * q.y,
          target[3] * -q.y + target[0] * q.z + target[1] * q.w - target[2] * q.x,
          target[3] * -q.z - target[0] * q.y + target[1] * q.x + target[2] * q.w];
        const torque = e.map((x, i) => entry.input.definition.inertia_kg_m2[i] * (2 * sign * x * 24 ** 2 - 48 * angular[i]));
        b.addTorque(vector(torque), true);
      }
    }
    this.stepFluids();
    this.world.step(this.events);
    this.events.drainCollisionEvents((a, b, started) => {
      const ia = this.colliderOwner.get(a), ib = this.colliderOwner.get(b);
      if (!ia || !ib || ia === ib) return;
      for (const [id, other] of [[ia, ib], [ib, ia]]) {
        let set = this.contacts.get(id); if (!set) this.contacts.set(id, set = new Set());
        // Rebuilt from actual contact pairs in snapshot, so one stopped wedge
        // cannot clear another active wedge of the same compound object.
        if (started) set.add(other);
        const body = before.get(id);
        if (started && body && (other === 'bench' || other === 'stone_floor')) {
          const energy = 0.5 * body.mass * body.velocity[1] ** 2;
          if (energy > 1e-5) this.impacts.push({ id, energy_J: energy, surface: other });
        }
      }
    });
    this.tickCount++;
  }
  private stepFluids() {
    this.fluidForces = [];
    const samples = [...this.bodies.values()].filter(e => e.input.definition.category === 'sample');
    if (!samples.length) return;
    for (const [ownerId, vessel] of this.bodies) {
      const fluid = vessel.input.fluid;
      if (!fluid || !(fluid.volume_m3 > 0)) continue;
      const profile = getWorldVesselProfile(fluid.vesselType, fluid.capacity_ml);
      const vp = vessel.body.translation(), vq = vessel.body.rotation();
      const inverse = new Quaternion(vq.x, vq.y, vq.z, vq.w).invert();
      const up = new Vector3(0, 1, 0).applyQuaternion(inverse);
      const tilt = Math.atan2(Math.hypot(up.x, up.z), up.y);
      const inside = samples.filter(sample => {
        const p = sample.body.translation();
        const local = new Vector3(p.x - vp.x, p.y - vp.y, p.z - vp.z).applyQuaternion(inverse).multiplyScalar(1 / METERS_PER_SCENE_UNIT);
        return local.y >= profile.baseY - sample.input.definition.dimensions_m[1] / METERS_PER_SCENE_UNIT
          && local.y <= profile.baseY + profile.H + sample.input.definition.dimensions_m[1] / METERS_PER_SCENE_UNIT
          && Math.hypot(local.x, local.z) < profile.r(Math.max(profile.baseY, Math.min(profile.baseY + profile.H, local.y)));
      });
      if (!inside.length) continue;
      const base_ml = Math.min(fluid.capacity_ml, fluid.volume_m3 * 1e6);
      let level = solveLevel(profile, tilt, base_ml).c * METERS_PER_SCENE_UNIT + vp.y;
      // Fixed point for displacement; the existing transport engine owns any overflow.
      for (let i = 0; i < 8; i++) {
        const displaced = inside.reduce((sum, sample) => {
          const p = sample.body.translation(), q = sample.body.rotation();
          return sum + submergedBoxVolume(sample.input.definition.dimensions_m, tuple(p), [q.x, q.y, q.z, q.w], level);
        }, 0);
        const next = solveLevel(profile, tilt, Math.min(fluid.capacity_ml, base_ml + displaced * 1e6)).c * METERS_PER_SCENE_UNIT + vp.y;
        if (Math.abs(next - level) < 1e-8) { level = next; break; }
        level = next;
      }
      for (const sample of inside) {
        const d = sample.input.definition, p = sample.body.translation(), q = sample.body.rotation();
        const volume = d.dimensions_m[0] * d.dimensions_m[1] * d.dimensions_m[2];
        const submerged = submergedBoxVolume(d.dimensions_m, tuple(p), [q.x, q.y, q.z, q.w], level);
        if (!(submerged > 0)) continue;
        const buoyancy = buoyancyForce_N(fluid.density_kg_m3, submerged);
        sample.body.addForce({ x: 0, y: buoyancy, z: 0 }, true);
        const relative = tuple(sample.body.linvel()).map((v, i) => v - tuple(vessel.body.linvel())[i]) as Vec3;
        const impulse = viscousDragImpulse(relative, sample.body.mass(), Math.cbrt(3 * volume / (4 * Math.PI)),
          fluid.density_kg_m3, fluid.viscosity_Pas, DT, submerged / volume);
        sample.body.applyImpulse(vector(impulse), true);
        if (vessel.body.isDynamic()) {
          vessel.body.addForceAtPoint({ x: 0, y: -buoyancy, z: 0 }, p, true);
          vessel.body.applyImpulseAtPoint(vector(impulse.map(v => -v)), p, true);
        }
        this.fluidForces.push({ id: sample.input.id, ownerId, displaced_m3: submerged, buoyancy_N: buoyancy });
      }
    }
  }
  snapshot(): SimulationSnapshot {
    return { version: 1, tick: this.tickCount, time_s: this.tickCount * DT, seed: this.seed, sequence: this.sequence,
      backlog_s: this.accumulator, impacts: this.impacts.splice(0), fluidForces: structuredClone(this.fluidForces), objects: [...this.bodies].map(([id, entry]) => {
        const b = entry.body, q = b.rotation(), contacts = new Set<string>();
        for (let i = 0; i < b.numColliders(); i++) this.world.contactPairsWith(b.collider(i), collider => {
          const owner = this.colliderOwner.get(collider.handle); if (owner && owner !== id) contacts.add(owner);
        });
        return { id, definitionId: entry.input.definition.id, position_m: tuple(b.translation()), rotation: [q.x, q.y, q.z, q.w],
          velocity_m_s: tuple(b.linvel()), angularVelocity_rad_s: tuple(b.angvel()), temperature_K: entry.input.temperature_K,
          contacts: [...contacts].sort(), attachments: entry.joint ? ['joint'] : [], damage: 'intact', held: !!entry.target, sleeping: b.isSleeping() };
      }) };
  }
  save(): RuntimeSave {
    if (this.pending.length) throw new Error('Cannot save with future commands pending');
    return { version: 1, rapierVersion: RAPIER.version(), world: Array.from(this.world.takeSnapshot()),
      inputs: structuredClone([...this.bodies.values()].map(e => e.input)), handles: [...this.bodies].map(([id, e]) => [id, e.body.handle]),
      targets: [...this.bodies].filter(([, e]) => !!e.target).map(([id, e]) => [id, structuredClone(e.target!)]),
      joints: [...this.bodies].filter(([, e]) => !!e.joint).map(([id, e]) => [id, e.joint!.handle]),
      tick: this.tickCount, accumulator_s: this.accumulator, sequence: this.sequence, seed: this.seed };
  }
  restore(saved: RuntimeSave) {
    if (saved.version !== 1 || saved.rapierVersion !== RAPIER.version() || !Number.isSafeInteger(saved.tick) || saved.tick < 0
      || !Number.isFinite(saved.accumulator_s) || saved.accumulator_s < 0) throw new Error('Unsupported physics snapshot');
    const restored = RAPIER.World.restoreSnapshot(new Uint8Array(saved.world));
    const handles = new Map(saved.handles), targets = new Map(saved.targets), joints = new Map(saved.joints);
    const entries = new Map<string, Body>();
    try {
      for (const input of saved.inputs) {
        const handle = handles.get(input.id), b = handle === undefined ? undefined : restored.getRigidBody(handle);
        if (!b) throw new Error('Physics snapshot is missing a rigid body');
        entries.set(input.id, { body: b, input: structuredClone(input), target: targets.get(input.id),
          joint: joints.has(input.id) ? restored.getImpulseJoint(joints.get(input.id)!) : undefined });
      }
    } catch (error) { restored.free(); throw error; }
    this.world.free(); this.world = restored; this.bodies = entries; this.colliderOwner.clear();
    this.world.forEachCollider(c => {
      const p = c.parent();
      const owner = p ? saved.handles.find(([, h]) => h === p.handle)?.[0] : c.translation().y < sceneToMeters(LAB_GEOMETRY.floor_scene) ? 'stone_floor' : 'bench';
      if (owner) this.colliderOwner.set(c.handle, owner);
    });
    this.pending = []; this.impacts = []; this.contacts.clear(); this.tickCount = saved.tick;
    this.accumulator = saved.accumulator_s; this.sequence = saved.sequence; this.seed = saved.seed;
  }
  free() { this.events.free(); this.world.free(); this.bodies.clear(); }
}
