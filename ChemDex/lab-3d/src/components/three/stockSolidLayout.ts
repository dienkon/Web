import { BufferGeometry, Euler, Matrix4, Quaternion, Vector3, type BufferAttribute, type InterleavedBufferAttribute } from 'three';
import type { SolidMorphology } from '../../types/chemistry';
import { vesselInterior } from '../../science/vesselDimensions';
import { solidColumnIntervals } from '../../science/solidColumnIntervals';
import { geometryVolume, stockSolidChunkCount } from './stockSolidGeometry';

export interface StockSolidPiece { matrix: Matrix4; bottom: number; top: number; x: number; z: number; radius: number }
export interface StockSolidLayout {
  status: 'empty' | 'packed-reference' | 'protruding-reference' | 'unresolved-fit';
  pieces: StockSolidPiece[];
  materialVolume: number;
  unitVolume: number;
}
interface Envelope { low: number; high: number; radius: number; rotation: Quaternion }
const envelopes = new WeakMap<BufferGeometry, Map<string, Envelope>>();
function envelope(g: BufferGeometry, orientation: number): Envelope {
  let cache = envelopes.get(g); if (!cache) { cache = new Map(); envelopes.set(g, cache); }
  const key = String(orientation), cached = cache.get(key); if (cached) return cached;
  const rotation = new Quaternion().setFromEuler(orientation === 1 ? new Euler(0, 0, Math.PI / 2)
    : orientation === 2 ? new Euler(Math.PI / 2, 0, 0) : new Euler());
  let low = Infinity, high = -Infinity, radius = 0;
  const p = g.attributes.position, point = new Vector3();
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i).applyQuaternion(rotation);
    low = Math.min(low, point.y); high = Math.max(high, point.y); radius = Math.max(radius, Math.hypot(point.x, point.z));
  }
  const result = { low, high, radius, rotation }; cache.set(key, result); return result;
}
interface Column { x: number; z: number; slots: [number, number][] }
function pack(type: string, count: number, scale: number, e: Envelope, floor: number | undefined, openTop: boolean): StockSolidPiece[] | null {
  const interior = vesselInterior(type), margin = interior.height * 1e-7;
  const radius = e.radius * scale + margin, height = (e.high - e.low) * scale, pitch = height + margin;
  const maximum = interior.maximumRadius - radius;
  if (!(radius > 0) || !(height > 0) || maximum < 0) return null;
  // Square and triangular lattices, each with centered and translated cells.
  // Their nonintersecting cylinders certify separation for every yaw angle.
  const variants = [[false, 0, 0], [false, 0.5, 0.5], [true, 0, 0], [true, 0.5, 1 / 6]] as const;
  for (const [hex, ox, oz] of variants) {
    const columns: Column[] = [], spacing = 2 * radius;
    const bound = Math.min(count + 1, Math.ceil(maximum / (radius * Math.sqrt(3))) + 2);
    let capacity = 0;
    for (let ring = 0; ring <= bound; ring++) {
      for (let j = -ring; j <= ring; j++) for (let i = -ring; i <= ring; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const x = spacing * (i + ox + (hex ? (j % 2) / 2 : 0));
        const z = spacing * (j + oz) * (hex ? Math.sqrt(3) / 2 : 1);
        if (Math.hypot(x, z) > maximum) continue;
        const intervals = solidColumnIntervals(type, Math.hypot(x, z) + radius, floor, openTop);
        const slots: [number, number][] = [];
        for (const [a, b] of intervals) {
          const n = Math.min(count, Math.floor((b - a + margin) / pitch));
          if (n > 0) { slots.push([a, n]); capacity += n; }
        }
        if (slots.length) columns.push({ x, z, slots });
      }
      if (capacity >= count && columns.length >= Math.min(count, Math.ceil(Math.sqrt(count)))) break;
    }
    if (capacity < count) continue;
    const pieces: StockSolidPiece[] = [], position = new Vector3(), size = new Vector3(scale, scale, scale);
    for (let n = 0; n < count; n++) {
      let chosen: Column | undefined;
      for (const col of columns) if (col.slots.length && (!chosen || col.slots[0][0] < chosen.slots[0][0])) chosen = col;
      if (!chosen) return null;
      const bottom = chosen.slots[0][0], yaw = n * 2.399963229728653;
      const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).multiply(e.rotation);
      position.set(chosen.x, bottom - e.low * scale, chosen.z);
      pieces.push({ matrix: new Matrix4().compose(position, q, size), bottom, top: bottom + height, x: chosen.x, z: chosen.z, radius });
      chosen.slots[0][0] += pitch; if (--chosen.slots[0][1] === 0) chosen.slots.shift();
    }
    return pieces;
  }
  return null;
}

/** Keep each initial column and piece identity during dissolution. Only the
 * envelope height/radius and vertical supports change with surviving mass. */
function resizeLayout(type: string, initial: StockSolidPiece[], scale: number, e: Envelope, floor: number | undefined, openTop: boolean) {
  const interior = vesselInterior(type), margin = interior.height * 1e-7;
  const radius = e.radius * scale + margin, height = (e.high - e.low) * scale, pitch = height + margin;
  const columns = new Map<string, { cursor: number; intervals: [number, number][]; bottom: number }>();
  const result: StockSolidPiece[] = [], size = new Vector3(scale, scale, scale);
  for (let i = 0; i < initial.length; i++) {
    const p = initial[i], key = `${p.x}:${p.z}`;
    let col = columns.get(key);
    if (!col) {
      const intervals = solidColumnIntervals(type, Math.hypot(p.x, p.z) + radius, floor, openTop);
      if (!intervals.length) return null;
      col = { cursor: 0, intervals, bottom: intervals[0][0] }; columns.set(key, col);
    }
    while (col.bottom + height > col.intervals[col.cursor][1] + margin) {
      if (++col.cursor >= col.intervals.length) return null;
      col.bottom = col.intervals[col.cursor][0];
    }
    const bottom = col.bottom, q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i * 2.399963229728653).multiply(e.rotation);
    result.push({ matrix: new Matrix4().compose(new Vector3(p.x, bottom - e.low * scale, p.z), q, size),
      bottom, top: bottom + height, x: p.x, z: p.z, radius });
    col.bottom += pitch;
  }
  return result;
}

interface InitialPlan { status: StockSolidLayout['status']; pieces: StockSolidPiece[]; e: Envelope; openTop: boolean }
interface GeometryPlans { position: BufferGeometry['attributes'][string]; positionVersion: number;
  index: BufferGeometry['index']; indexVersion: number; unitVolume: number; plans: Map<string, InitialPlan> }
const initialPlans = new WeakMap<BufferGeometry, GeometryPlans>();

/** Deterministic, conservative envelope arrangement, not DEM or calibrated
 * grain packing. Piece count represents the mass dose, not fractures created
 * during pouring. Initial volume keeps the count stable during dissolution.
 * A whole nail is never split. No successful or fallback path shrinks mass. */
export function createStockSolidLayout(type: string, morphology: SolidMorphology, geometry: BufferGeometry,
  materialVolume: number, initialVolume = materialVolume, floor?: number, openTop = true): StockSolidLayout {
  let cache = initialPlans.get(geometry);
  const p = geometry.attributes.position;
  const positionVersion = (p as BufferAttribute).version ?? (p as InterleavedBufferAttribute).data?.version ?? 0;
  const indexVersion = geometry.index?.version ?? 0;
  if (!cache || cache.position !== p || cache.positionVersion !== positionVersion || cache.index !== geometry.index || cache.indexVersion !== indexVersion) {
    cache = { position: p, positionVersion, index: geometry.index, indexVersion, unitVolume: geometryVolume(geometry), plans: new Map() };
    initialPlans.set(geometry, cache); envelopes.delete(geometry);
  }
  const unitVolume = cache.unitVolume;
  if (!(materialVolume > 0) || !(unitVolume > 0)) return { status: 'empty', pieces: [], materialVolume: 0, unitVolume };
  initialVolume = Math.max(materialVolume, initialVolume);
  const key = `${type}:${morphology}:${initialVolume}:${floor}:${openTop}`, old = cache.plans.get(key);
  const usePlan = (plan: InitialPlan): StockSolidLayout => {
    if (materialVolume === initialVolume) return { status: plan.status, pieces: plan.pieces, materialVolume, unitVolume };
    const scale = Math.cbrt(materialVolume / (plan.pieces.length * unitVolume));
    const resized = resizeLayout(type, plan.pieces, scale, plan.e, floor, plan.openTop);
    if (resized) return { status: plan.status === 'unresolved-fit' ? 'unresolved-fit'
      : resized.some(p => p.top > vesselInterior(type).topY) ? 'protruding-reference' : 'packed-reference', pieces: resized, materialVolume, unitVolume };
    const ratio = Math.cbrt(materialVolume / initialVolume), factor = new Vector3(ratio, ratio, ratio);
    return { status: 'unresolved-fit', pieces: plan.pieces.map(p => {
      const matrix = p.matrix.clone().scale(factor), y = matrix.elements[13];
      return { ...p, matrix, bottom: y + plan.e.low * scale, top: y + plan.e.high * scale, radius: plan.e.radius * scale };
    }), materialVolume, unitVolume };
  };
  const save = (plan: InitialPlan) => {
    if (cache!.plans.size >= 8) cache!.plans.delete(cache!.plans.keys().next().value!);
    cache!.plans.set(key, plan); return usePlan(plan);
  };
  if (old) return usePlan(old);
  const base = stockSolidChunkCount(morphology), limit = morphology === 'NAIL' ? 1 : 512;
  const orientations = morphology === 'NAIL' ? [0, 1, 2] : morphology === 'RIBBON' ? [2, 0, 1] : [0, 1, 2];
  let firstMouthFit: { count: number; e: Envelope } | undefined;
  const mouth = vesselInterior(type).points.at(-1)![0];
  for (let count = base; count <= limit; count += Math.max(1, Math.floor(count * 0.08))) {
    const initialScale = Math.cbrt(initialVolume / (count * unitVolume));
    for (const orientation of orientations) {
      const e = envelope(geometry, orientation);
      if (e.radius * initialScale >= mouth) continue;
      firstMouthFit ??= { count, e };
      const initial = pack(type, count, initialScale, e, floor, false);
      if (!initial) continue;
      return save({ status: 'packed-reference', pieces: initial, e, openTop: false });
    }
  }
  if (openTop && firstMouthFit) {
    const { count, e } = firstMouthFit;
    const pieces = pack(type, count, Math.cbrt(initialVolume / (count * unitVolume)), e, floor, true);
    if (pieces) return save({ status: 'protruding-reference', pieces, e, openTop: true });
  }
  // Unrepresentable placements retain their full material volume and an
  // explicit unresolved status; they are never certified as contained.
  const e = envelope(geometry, 0), scale = Math.cbrt(initialVolume / (base * unitVolume));
  const bottom = vesselInterior(type).floorY, pieces: StockSolidPiece[] = [];
  for (let i = 0; i < base; i++) {
    const y = bottom + i * (e.high - e.low) * scale;
    pieces.push({ matrix: new Matrix4().compose(new Vector3(0, y - e.low * scale, 0), e.rotation, new Vector3(scale, scale, scale)),
      bottom: y, top: y + (e.high - e.low) * scale, x: 0, z: 0, radius: e.radius * scale });
  }
  return save({ status: 'unresolved-fit', pieces, e, openTop: true });
}
