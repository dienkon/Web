import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { CONSTANTS } from '../core/units';
import { LAB_GEOMETRY } from '../core/labGeometry';
import { sceneToMeters } from '../science/sceneUnits';
import type { ColliderShape, Vec3, Quat } from './types';
import type { StockBoundaryFrame, StockContainerInput, StockGrainPose, StockGroupInput, StockWorldInput, StockWorldSnapshot } from './stockTypes';

const DT = 1 / 120;
const MAX_STEPS = 120;
// Condition millimetre contacts for Rapier's f32 geometry routines. All public
// inputs, force calculations and snapshots remain SI; only solver lengths use
// centimetres. Mass stays kg, hence solver force/impulse scales with length.
const S = 100;
const vec = (v: readonly number[]) => ({ x: v[0], y: v[1], z: v[2] });
const tuple = (v: { x: number; y: number; z: number }): Vec3 => [v.x, v.y, v.z];
const solver = (v: readonly number[]): Vec3 => [v[0] * S, v[1] * S, v[2] * S];
const si = (v: { x: number; y: number; z: number }): Vec3 => [v.x / S, v.y / S, v.z / S];
const quat = (q: Quat) => ({ x: q[0], y: q[1], z: q[2], w: q[3] });
type Grain = { body: RAPIER.RigidBody; collider: RAPIER.Collider; owner: string; pose: StockGrainPose; group: StockGroupInput; escaped: boolean };
let initialized: Promise<void> | undefined;

/** Actual SI rigid contacts for finite, mass-bearing stock pieces. Powder
 * bodies are coarse numerical carriers, not resolved primary dust grains. */
export class StockWorld {
  private world: RAPIER.World;
  private grains = new Map<string, Grain>();
  private containers = new Map<string, { body: RAPIER.RigidBody; input: StockContainerInput; min: number; max: number; radius: number }>();
  private reactions = new Map<string, Vec3>();
  private colliderContainer = new Map<number, string>();
  private sequence = 0;
  private accumulator = 0;
  private tick = 0;
  private appliedContacts: number[] = [];
  private input: StockWorldInput = { containers: [], contacts: [], spills: [] };
  static async create() { await (initialized ??= RAPIER.init()); return new StockWorld(); }
  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -CONSTANTS.g * S, z: 0 }); this.world.timestep = DT;
    this.world.integrationParameters.numSolverIterations = 10;
    this.world.integrationParameters.lengthUnit = S;
    // Resolve the thin glass support at tens of micrometres; the default
    // compliant contact frequency permits ~0.3 mm static gravitational sag.
    this.world.integrationParameters.contact_natural_frequency = 240;
    this.world.integrationParameters.normalizedAllowedLinearError = 1e-5;
    this.world.integrationParameters.normalizedPredictionDistance = 0.0005;
    this.world.integrationParameters.maxCcdSubsteps = 4;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(sceneToMeters(LAB_GEOMETRY.tableHalfWidth_scene) * S,
      sceneToMeters(LAB_GEOMETRY.tableThickness_scene / 2) * S, sceneToMeters(LAB_GEOMETRY.tableHalfDepth_scene) * S)
      .setTranslation(0, sceneToMeters(LAB_GEOMETRY.tableTop_scene - LAB_GEOMETRY.tableThickness_scene / 2) * S, 0).setFriction(0.6));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(10 * S, 0.05 * S, 10 * S)
      .setTranslation(0, (sceneToMeters(LAB_GEOMETRY.floor_scene) - 0.05) * S, 0).setFriction(0.6));
  }
  private shape(shape: ColliderShape) {
    if (shape.kind === 'box') return RAPIER.ColliderDesc.cuboid(...solver(shape.halfExtents_m)).setTranslation(...solver(shape.center_m));
    if (shape.kind === 'ball') return RAPIER.ColliderDesc.ball(shape.radius_m * S).setTranslation(...solver(shape.center_m));
    if (shape.kind === 'cylinder') return RAPIER.ColliderDesc.cylinder(shape.halfHeight_m * S, shape.radius_m * S).setTranslation(...solver(shape.center_m));
    const center: Vec3 = [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) {
      const values = shape.vertices_m.filter((_, i) => i % 3 === axis);
      center[axis] = (Math.min(...values) + Math.max(...values)) / 2;
    }
    const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(shape.vertices_m.map((v, i) => (v - center[i % 3]) * S)));
    if (!hull) throw new Error('Invalid stock container hull'); return hull.setTranslation(...solver(center));
  }
  private supportCap(shape: ColliderShape) {
    if (shape.kind !== 'hull' || shape.vertices_m.length < 72) return null;
    const levels = [...new Set(shape.vertices_m.filter((_, i) => i % 3 === 1))].sort((a, b) => a - b);
    if (levels.length !== 2) return null;
    const [low, high] = levels;
    const ring = (y: number) => shape.vertices_m.flatMap((x, i) => i % 3 === 0 && shape.vertices_m[i + 1] === y
      ? [{ radius: Math.hypot(x, shape.vertices_m[i + 2]), angle: Math.atan2(shape.vertices_m[i + 2], x) }] : []);
    const bottom = ring(low), top = ring(high), n = top.length;
    if (n < 12 || bottom.length !== n) return null;
    const ro = Math.max(...top.map(p => p.radius)), rb = Math.max(...bottom.map(p => p.radius));
    if (top.some(p => Math.abs(p.radius - ro) > ro * 1e-6) || bottom.some(p => Math.abs(p.radius - rb) > rb * 1e-6)) return null;
    const angles = top.map(p => p.angle).sort((a, b) => a - b);
    if (angles.some((a, i) => (angles[(i + 1) % n] + (i + 1 === n ? Math.PI * 2 : 0) - a) > Math.PI * 2 / n + 1e-5)) return null;
    const halfHeight = Math.min((high - low) / 4, 0.00005);
    const lowerRadius = rb + (ro - rb) * (high - 2 * halfHeight - low) / (high - low);
    // Wholly INSIDE the existing solid frustum, including its polygonal edge.
    // An analytic cap yields a stable plane manifold for sub-millimetre glass;
    // the generic hull remains for the chamfer and every external contact.
    const radius = Math.min(ro, lowerRadius) * Math.cos(Math.PI / n) - 1e-7;
    return radius > 0 ? RAPIER.ColliderDesc.cylinder(halfHeight * S, radius * S)
      .setTranslation(0, (high - halfHeight) * S, 0) : null;
  }
  private create(owner: string, group: StockGroupInput, mass_g: number, position_m: Vec3, rotation: Quat,
    velocity_m_s: Vec3 = [0, 0, 0], angularVelocity_rad_s: Vec3 = [0, 0, 0], restored?: StockGrainPose) {
    const id = restored?.id ?? `stock:${++this.sequence}`;
    const scale = Math.cbrt(mass_g / 1000 / group.density_kg_m3 / group.unitVolume);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...solver(position_m)).setRotation(quat(rotation))
      .setLinvel(...solver(velocity_m_s)).setAngvel(vec(angularVelocity_rad_s)).setCcdEnabled(true).setSoftCcdPrediction(0.005 * S).setUserData({ stockId: id }));
    const desc = group.powder ? RAPIER.ColliderDesc.ball(Math.cbrt(mass_g / 1000 / group.density_kg_m3 * 3 / (4 * Math.PI)) * S)
      : RAPIER.ColliderDesc.convexHull(new Float32Array(group.vertices.map(x => x * scale * S)));
    if (!desc) { this.world.removeRigidBody(body); throw new Error(`Degenerate stock grain ${group.formula}`); }
    const collider = this.world.createCollider(desc.setMass(mass_g / 1000).setFriction(group.powder ? 0.55 : 0.42)
      .setRestitution(group.powder ? 0.06 : 0.22), body);
    const pose: StockGrainPose = { id, formula: group.formula, mass_g, scale_m: scale, position_m, rotation,
      velocity_m_s, angularVelocity_rad_s, sleeping: false, powder: group.powder };
    this.grains.set(id, { body, collider, owner, group, pose, escaped: false });
    const suffix = Number(id.split(':').at(-1)); if (Number.isSafeInteger(suffix)) this.sequence = Math.max(this.sequence, suffix);
  }
  sync(input: StockWorldInput) {
    this.input = input; this.appliedContacts = [];
    // Reserve every restored identity before creating any fresh dose bodies.
    // A new dose in the first vessel must not overwrite a later saved grain.
    for (const p of [...input.containers.flatMap(v => v.saved ?? []), ...input.spills]) {
      const suffix = Number(p.id.split(':').at(-1));
      if (Number.isSafeInteger(suffix)) this.sequence = Math.max(this.sequence, suffix);
    }
    const removeContainer = (id: string, body: RAPIER.RigidBody) => {
      for (let i = 0; i < body.numColliders(); i++) this.colliderContainer.delete(body.collider(i).handle);
      this.world.removeRigidBody(body); this.containers.delete(id);
    };
    const alive = new Set(input.containers.map(v => v.id));
    for (const [id, container] of this.containers) if (!alive.has(id)) removeContainer(id, container.body);
    for (const v of input.containers) {
      let old = this.containers.get(v.id);
      if (old && old.input.shapeKey !== v.shapeKey) { removeContainer(v.id, old.body); old = undefined; }
      if (!old) {
        const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...solver(v.position_m)).setRotation(quat(v.rotation)));
        for (const s of v.colliders) {
          this.colliderContainer.set(this.world.createCollider(this.shape(s).setFriction(0.45), body).handle, v.id);
          const cap = this.supportCap(s);
          if (cap) this.colliderContainer.set(this.world.createCollider(cap.setFriction(0.45), body).handle, v.id);
        }
        const ys = v.colliders.flatMap(c => c.kind === 'hull' ? c.vertices_m.filter((_, i) => i % 3 === 1)
          : c.kind === 'box' ? [c.center_m[1] - c.halfExtents_m[1], c.center_m[1] + c.halfExtents_m[1]]
            : c.kind === 'cylinder' ? [c.center_m[1] - c.halfHeight_m, c.center_m[1] + c.halfHeight_m] : [c.center_m[1]]);
        const radius = Math.max(0, ...v.colliders.map(c => c.kind === 'hull' ? Math.max(...c.vertices_m.filter((_, i) => i % 3 !== 1).map(Math.abs))
          : c.kind === 'box' ? Math.max(c.halfExtents_m[0], c.halfExtents_m[2]) : c.radius_m));
        old = { body, input: v, min: ys.length ? Math.min(...ys) : 0, max: ys.length ? Math.max(...ys) : 0, radius }; this.containers.set(v.id, old);
      }
      old.input = v;
      if (v.restore) {
        old.body.setTranslation(vec(solver(v.position_m)), true); old.body.setRotation(quat(v.rotation), true);
        old.body.setNextKinematicTranslation(vec(solver(v.position_m))); old.body.setNextKinematicRotation(quat(v.rotation));
      }
      for (const p of v.saved ?? []) {
        const g = this.grains.get(p.id);
        if (g?.escaped && v.groups.some(s => s.formula === p.formula)) { g.owner = v.id; g.escaped = false; }
      }
      if (v.restore) for (const [id, g] of this.grains) if (g.owner === v.id && !g.escaped) { this.world.removeRigidBody(g.body); this.grains.delete(id); }
      for (const group of v.groups) {
        let bodies = [...this.grains.values()].filter(g => g.owner === v.id && g.pose.formula === group.formula && !g.escaped);
        const contacts = input.contacts.filter(c => c.vesselId === v.id && c.formula === group.formula);
        if (!bodies.length && v.saved?.some(p => p.formula === group.formula)) {
          const saved = v.saved.filter(p => p.formula === group.formula), mass = saved.reduce((s, p) => s + p.mass_g, 0);
          for (const p of saved) this.create(v.id, group, p.mass_g * Math.min(1, group.mass_g / mass), p.position_m, p.rotation, p.velocity_m_s, p.angularVelocity_rad_s, p);
          bodies = [...this.grains.values()].filter(g => g.owner === v.id && g.pose.formula === group.formula && !g.escaped);
        }
        const current = bodies.reduce((s, g) => s + g.pose.mass_g, 0), delta = group.mass_g - current;
        if (delta > Math.max(1e-9, group.mass_g * 1e-7)) {
          if (contacts.some(c => !c.resolved)) continue;
          const births = contacts.flatMap(c => c.pieces), total = births.reduce((s, p) => s + p.mass_g, 0);
          if (births.length) for (const p of births) this.create(v.id, group, delta * p.mass_g / total, p.position_m, p.rotation, p.velocity_m_s, p.angularVelocity_rad_s);
          else for (const p of group.seed) this.create(v.id, group, delta / group.seed.length, p.position_m, p.rotation);
        } else if (delta < -Math.max(1e-9, group.mass_g * 1e-7)) {
          // Dissolution/reaction changes mass and shape together, retaining pose
          // and momentum per surviving mass, never shifting to a new grid.
          for (const g of bodies) {
            const p = this.pose(g), mass = p.mass_g * group.mass_g / current;
            this.world.removeRigidBody(g.body); this.grains.delete(p.id);
            if (mass > 1e-12) this.create(v.id, group, mass, p.position_m, p.rotation, p.velocity_m_s, p.angularVelocity_rad_s, { ...p, mass_g: mass });
          }
        }
        for (const c of contacts) if (c.resolved) this.appliedContacts.push(c.id);
      }
    }
    for (const c of input.contacts) if (c.resolved && !input.containers.some(v => v.id === c.vesselId && v.groups.some(g => g.formula === c.formula))) this.appliedContacts.push(c.id);
    const spilled = new Set(input.spills.map(p => p.id));
    for (const p of input.spills) {
      let g = this.grains.get(p.id);
      if (g && Math.abs(g.pose.mass_g - p.mass_g) > 1e-10) { this.world.removeRigidBody(g.body); this.grains.delete(p.id); g = undefined; }
      if (!g && p.group && p.mass_g > 1e-12) { this.create(p.vesselId, p.group, p.mass_g, p.position_m, p.rotation, p.velocity_m_s, p.angularVelocity_rad_s, p); g = this.grains.get(p.id); }
      if (g) g.escaped = true;
    }
    for (const [id, g] of this.grains) {
      const owner = input.containers.find(v => v.id === g.owner), exists = owner?.groups.some(s => s.formula === g.pose.formula && s.mass_g > 0);
      if ((!g.escaped && !exists) || (g.escaped && !spilled.has(id))) { this.world.removeRigidBody(g.body); this.grains.delete(id); }
    }
  }
  private pose(g: Grain): StockGrainPose {
    const q = g.body.rotation();
    let contacting = false;
    this.world.contactPairsWith(g.collider, other => this.world.contactPair(g.collider, other, m => {
      if (m.numSolverContacts() > 0) for (let i = 0; i < m.numContacts(); i++) {
        if (m.contactDist(i) / S <= 2e-5) contacting = true;
      }
    }));
    return { ...g.pose, position_m: si(g.body.translation()), rotation: [q.x, q.y, q.z, q.w],
      velocity_m_s: si(g.body.linvel()), angularVelocity_rad_s: tuple(g.body.angvel()), sleeping: g.body.isSleeping(), contacting };
  }
  advance(seconds: number, paused: boolean) {
    this.reactions.clear();
    if (!paused && Number.isFinite(seconds)) this.accumulator += Math.min(1, Math.max(0, seconds));
    const count = Math.min(MAX_STEPS, Math.floor((this.accumulator + 1e-12) / DT));
    const starts = new Map([...this.containers].map(([id, c]) => {
      const q = c.body.rotation();
      return [id, { position: new Vector3(...si(c.body.translation())), rotation: new Quaternion(q.x, q.y, q.z, q.w) }];
    }));
    for (let steps = 0; !paused && this.accumulator + 1e-12 >= DT && steps < MAX_STEPS; steps++) {
      const targets = new Map<string, { position: Vector3; rotation: Quaternion; fromPosition: Vector3; fromRotation: Quaternion }>();
      let sweep = 0;
      for (const [id, c] of this.containers) {
        const start = starts.get(id)!, t = (steps + 1) / count;
        const p = start.position.clone().lerp(new Vector3(...c.input.position_m), t);
        const q = start.rotation.clone().slerp(new Quaternion(...c.input.rotation), t);
        const fromPosition = new Vector3(...si(c.body.translation())), rotation = c.body.rotation();
        const fromRotation = new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
        sweep = Math.max(sweep, fromPosition.distanceTo(p) + fromRotation.angleTo(q) * Math.hypot(c.radius, Math.max(Math.abs(c.min), Math.abs(c.max))));
        if (fromPosition.distanceToSquared(p) > 1e-16 || fromRotation.angleTo(q) > 1e-7) {
          c.body.wakeUp();
          for (const g of this.grains.values()) if (g.owner === id && !g.escaped) g.body.wakeUp();
        }
        targets.set(id, { position: p, rotation: q, fromPosition, fromRotation });
      }
      const momentum = new Map<string, { before: Vec3; mass: number }>();
      for (const g of this.grains.values()) if (!g.escaped) {
        const row = momentum.get(g.owner) ?? { before: [0, 0, 0] as Vec3, mass: 0 }, v = si(g.body.linvel()), mass = g.body.mass();
        row.mass += mass; for (let i = 0; i < 3; i++) row.before[i] += mass * v[i]; momentum.set(g.owner, row);
      }
      for (const g of this.grains.values()) {
        if (g.escaped || g.body.isSleeping()) continue;
        const fluid = this.containers.get(g.owner)?.input.fluid; g.body.resetForces(false);
        if (fluid) {
          const position = si(g.body.translation()), p = vec(position), radius = g.collider.shape instanceof RAPIER.Ball ? g.collider.shape.radius / S
            : Math.cbrt(g.pose.mass_g / 1000 / g.group.density_kg_m3 * 3 / (4 * Math.PI));
          const depth = fluid.offset_m - (p.x * fluid.normal[0] + p.y * fluid.normal[1] + p.z * fluid.normal[2]);
          const h = Math.max(0, Math.min(2 * radius, depth + radius)), immersed = Math.PI * h * h * (radius - h / 3);
          const volume = g.pose.mass_g / 1000 / g.group.density_kg_m3, fraction = Math.min(1, immersed / Math.max(volume, 1e-20));
          g.body.addForce({ x: 0, y: fluid.density_kg_m3 * volume * fraction * CONSTANTS.g * S, z: 0 }, false);
          const velocity = si(g.body.linvel()), speed = Math.hypot(...velocity);
          const k = (6 * Math.PI * fluid.viscosity_Pas * radius + 0.5 * fluid.density_kg_m3 * 0.8 * Math.PI * radius ** 2 * speed) * fraction;
          const attenuation = 1 - Math.exp(-k * DT / (g.pose.mass_g / 1000));
          g.body.applyImpulse(vec(solver(velocity.map(x => -x * g.pose.mass_g / 1000 * attenuation))), false);
        }
      }
      // Moving thin glass can otherwise sweep past a nearly stationary grain:
      // dynamic-body CCD alone does not sweep both bodies simultaneously.
      // Bound boundary travel to 1 mm per contact substep (up to 16). The
      // external clock, force accounting and snapshots remain at 120 Hz.
      const contactSteps = Math.max(1, Math.min(16, Math.ceil(sweep / 0.001)));
      this.world.timestep = DT / contactSteps;
      for (let substep = 1; substep <= contactSteps; substep++) {
        for (const [id, target] of targets) {
          const body = this.containers.get(id)!.body, t = substep / contactSteps;
          body.setNextKinematicTranslation(target.fromPosition.clone().lerp(target.position, t).multiplyScalar(S));
          body.setNextKinematicRotation(target.fromRotation.clone().slerp(target.rotation, t));
        }
        this.world.step();
      }
      this.world.timestep = DT;
      // Momentum balance includes friction, pressure/drag and all internal
      // grain contacts. Unlike a last solver-substep manifold impulse, this
      // is the complete reaction impulse over the fixed physical step.
      for (const g of this.grains.values()) if (!g.escaped) {
        const row = momentum.get(g.owner)!, v = si(g.body.linvel()), mass = g.body.mass();
        for (let i = 0; i < 3; i++) row.before[i] -= mass * v[i];
      }
      for (const [owner, row] of momentum) {
        const reaction = this.reactions.get(owner) ?? [0, 0, 0];
        for (let i = 0; i < 3; i++) reaction[i] += row.before[i] - (i === 1 ? row.mass * CONSTANTS.g * DT : 0);
        this.reactions.set(owner, reaction);
      }
      this.accumulator -= DT; this.tick++;
    }
    return this.snapshot();
  }
  snapshot(): StockWorldSnapshot {
    const escapes: StockWorldSnapshot['escapes'] = [], captures: StockWorldSnapshot['captures'] = [], grains: StockWorldSnapshot['grains'] = [];
    for (const g of this.grains.values()) {
      const pose = this.pose(g), container = this.containers.get(g.owner), v = container?.input;
      if (v && container && v.colliders.length && !g.escaped) {
        const q = container.body.rotation();
        const local = new Vector3(...pose.position_m).sub(new Vector3(...si(container.body.translation()))).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w).invert());
        const { min, max, radius } = container;
        if (local.y < min - 0.005 || local.y > max + 0.001
          || Math.hypot(local.x, local.z) > radius + 0.005 && local.y < max) escapes.push({ vesselId: g.owner, pose });
      }
      if (g.escaped) for (const target of this.containers.values()) {
        if (target.input.sealed) continue;
        const cavity = target.input.cavity; if (!cavity) continue;
        const q = target.body.rotation();
        const local = new Vector3(...pose.position_m).sub(new Vector3(...si(target.body.translation()))).applyQuaternion(new Quaternion(q.x, q.y, q.z, q.w).invert());
        const points = cavity.points;
        if (local.y < points[0][1] || local.y > points.at(-1)![1]) continue;
        let radius = 0;
        for (let i = 1; i < points.length; i++) if (local.y >= points[i - 1][1] && local.y <= points[i][1]) {
          const t = (local.y - points[i - 1][1]) / Math.max(1e-20, points[i][1] - points[i - 1][1]);
          radius = points[i - 1][0] + t * (points[i][0] - points[i - 1][0]); break;
        }
        if (Math.hypot(local.x, local.z) > radius) continue;
        const fluid = target.input.fluid;
        let contact = fluid && pose.position_m.reduce((s, x, i) => s + x * fluid.normal[i], 0) - fluid.offset_m
          <= Math.cbrt(g.pose.mass_g / 1000 / g.group.density_kg_m3 * 3 / (4 * Math.PI));
        if (!fluid) this.world.contactPairsWith(g.collider, other => {
          const id = (other.parent()?.userData as { stockId?: string } | undefined)?.stockId;
          const support = id ? this.grains.get(id) : undefined;
          if (this.colliderContainer.get(other.handle) === target.input.id || support?.owner === target.input.id && !support.escaped) {
            this.world.contactPair(g.collider, other, m => {
              if (m.numSolverContacts() > 0) for (let i = 0; i < m.numContacts(); i++) if (m.contactDist(i) / S <= 2e-5) contact = true;
            });
          }
        });
        if (contact) { captures.push({ vesselId: target.input.id, pose }); break; }
      }
      grains.push({ vesselId: g.owner, pose });
    }
    return { tick: this.tick, grains, escapes, captures, appliedContacts: [...new Set(this.appliedContacts)],
      reactions: [...this.reactions].map(([vesselId, impulse_Ns]) => ({ vesselId, impulse_Ns })) };
  }
  /** Preserve gesture samples collected while the Worker was busy. Collapsing
   * lift-then-tilt to one diagonal pose path can pull the bottom through stock. */
  advanceBoundaryPath(path: StockBoundaryFrame[], paused: boolean) {
    const reactions = new Map<string, Vec3>();
    for (const frame of path) {
      for (const pose of frame.containers) {
        const container = this.containers.get(pose.id); if (!container) continue;
        const old = container.input;
        container.input = { ...old, position_m: pose.position_m, rotation: pose.rotation,
          fluid: old.fluid ? { ...old.fluid, offset_m: old.fluid.offset_m + pose.position_m[1] - old.position_m[1] } : undefined };
      }
      const result = this.advance(frame.seconds, paused);
      for (const force of result.reactions) {
        const sum = reactions.get(force.vesselId) ?? [0, 0, 0];
        for (let i = 0; i < 3; i++) sum[i] += force.impulse_Ns[i];
        reactions.set(force.vesselId, sum);
      }
    }
    this.reactions = reactions;
  }
  markEscaped(ids: string[]) { for (const id of ids) { const g = this.grains.get(id); if (g) g.escaped = true; } }
  free() { this.world.free(); }
}
