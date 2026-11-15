import { Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { sampleGeometrySurface } from './stockSurfaceSamples';
import { geometryVolume } from './stockSolidGeometry';
import { contourRadius, vesselInterior } from './vesselDimensions';

export const DEPOSIT_AGGREGATES_PER_CARRIER = 8;
const surfaceCache = new WeakMap<BufferGeometry, ReturnType<typeof sampleGeometrySurface>>();
const depositCache = new WeakMap<BufferGeometry, { volume: number; minY: number }>();
export interface MetalDepositAnchor { point: Vector3; normal: Vector3 }
function dimensions(deposit: BufferGeometry) {
  let result = depositCache.get(deposit);
  if (!result) { const p = deposit.getAttribute('position'); let minY = Infinity;
    for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
    result = { volume: geometryVolume(deposit), minY }; depositCache.set(deposit, result); }
  return result;
}

export function metalDepositPlacement(anchor: MetalDepositAnchor, stockMatrix: Matrix4, deposit: BufferGeometry, materialVolume: number) {
  const d = dimensions(deposit), scale = Math.cbrt(materialVolume / d.volume);
  const normal = anchor.normal.clone().transformDirection(stockMatrix);
  const center = anchor.point.clone().applyMatrix4(stockMatrix).addScaledVector(normal, -d.minY * scale);
  const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(stockMatrix))
    .multiply(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), anchor.normal));
  return new Matrix4().compose(center, rotation, new Vector3(scale, scale, scale));
}

/** Finite-volume surface aggregates. The support point stays on a real mesh
 * triangle; an aggregate is never translated away from it to clear the floor.
 * The visible habit and allocation among exposed faces are coarse display
 * approximations, not a dendrite-growth or adhesion model. */
export function metalDepositAnchors(stock: BufferGeometry, stockMatrix: Matrix4, deposit: BufferGeometry,
  materialVolume: number, vesselType: string | undefined, count = DEPOSIT_AGGREGATES_PER_CARRIER,
  inLiquid?: (point: Vector3) => boolean, supportFloorY = 0): MetalDepositAnchor[] {
  if (!(materialVolume > 0) || count < 1) return [];
  let samples = surfaceCache.get(stock);
  if (!samples) { samples = sampleGeometrySurface(stock, 128); surfaceCache.set(stock, samples); }
  if (!samples.length) return [];
  if (inLiquid) {
    const wetted = samples.filter(sample => inLiquid(sample.point.clone().applyMatrix4(stockMatrix)));
    if (wetted.length) samples = wetted;
  }
  const p = deposit.getAttribute('position'), vertex = new Vector3();
  const interior = vesselType ? vesselInterior(vesselType) : null, candidates: { sample: MetalDepositAnchor; clearance: number }[] = [];
  for (const sample of samples) {
    const matrix = metalDepositPlacement(sample, stockMatrix, deposit, materialVolume / count);
    let clearance = Infinity;
    for (let i = 0; i < p.count; i++) {
      vertex.fromBufferAttribute(p, i).applyMatrix4(matrix);
      clearance = Math.min(clearance, vertex.y - (interior?.floorY ?? supportFloorY), interior ? interior.topY - vertex.y : Infinity,
        interior ? contourRadius(interior.points, vertex.y) - Math.hypot(vertex.x, vertex.z) : Infinity);
    }
    candidates.push({ sample, clearance });
  }
  const valid = candidates.filter(candidate => candidate.clearance >= -1e-7);
  // Very large aggregates can outgrow the coarse host/wall envelope. Keep
  // support and material volume in that regime; never create floating pieces.
  const available = valid.length ? valid : candidates.sort((a, b) => b.clearance - a.clearance).slice(0, count);
  return Array.from({ length: count }, (_, i) => available[Math.floor((i + 0.5) * available.length / count)].sample);
}

export function metalDepositPlacements(stock: BufferGeometry, stockMatrix: Matrix4, deposit: BufferGeometry,
  materialVolume: number, vesselType: string, count = DEPOSIT_AGGREGATES_PER_CARRIER): Matrix4[] {
  return metalDepositAnchors(stock, stockMatrix, deposit, materialVolume, vesselType, count)
    .map(anchor => metalDepositPlacement(anchor, stockMatrix, deposit, materialVolume / count));
}
