import { Matrix4, Vector3, type BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry } from '../components/three/stockSolidGeometry';
import { createStockSolidLayout, type StockSolidPiece } from '../components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior } from './vesselDimensions';
import { isSuspensionRow } from './precipitateInventory';
import { phaseVolumes, phaseDensities } from './liquidLayers';
import { compileSolid, clippedSolidVolume, type CompiledSolid, type Point3, type SolidClipPlane } from './clippedSolidVolume';

export type StockImmersionVessel = Pick<VesselState, 'type' | 'capacity_ml' | 'volume_ml' | 'contents'>
  & Partial<Pick<VesselState, 'isSealed' | 'isPulverized' | 'precipitateSubstance' | 'immiscibleOrganicVolume_ml'>>;
interface ImmersedPiece extends StockSolidPiece { inverse: Matrix4; factor: number; inside: number; mesh: CompiledSolid }
export interface StockImmersion {
  basis: 'stock-mesh-envelope-reference';
  insideVolume_ml: number;
  displacementMl(normal: Point3, offset: number): number;
}
const geometries = new Map<string, { geometry: BufferGeometry; compiled: CompiledSolid }>();
const models = new Map<string, StockImmersion | null>();

function transformedPlane(piece: ImmersedPiece, normal: Point3, offset: number): SolidClipPlane {
  const e = piece.matrix.elements, [x, y, z] = normal;
  return { normal: [e[0] * x + e[1] * y + e[2] * z, e[4] * x + e[5] * y + e[6] * z,
    e[8] * x + e[9] * y + e[10] * z], offset: offset - x * e[12] - y * e[13] - z * e[14] };
}
function clip(piece: ImmersedPiece, normal: Point3, offset: number, origin: Point3, top?: number) {
  const p = new Vector3(...origin).applyMatrix4(piece.inverse);
  const planes = [transformedPlane(piece, normal, offset)];
  if (top !== undefined) planes.push(transformedPlane(piece, [0, 1, 0], top));
  return clippedSolidVolume(piece.mesh, planes, [p.x, p.y, p.z]) * piece.factor;
}
function wetPiece(piece: ImmersedPiece, n: Point3, c: number, top: number): number {
  if (!(piece.inside > 0)) return 0;
  const [nx, ny, nz] = n;
  if (ny < 0) return piece.inside - wetPiece(piece, [-nx, -ny, -nz], -c, top);
  const h = Math.hypot(nx, nz), center = nx * piece.x + nz * piece.z;
  if (c >= center + h * piece.radius + ny * Math.min(top, piece.top)) return piece.inside;
  if (c <= center - h * piece.radius + ny * piece.bottom) return 0;
  let result: number;
  if (piece.top <= top) result = clip(piece, n, c, [nx * c, ny * c, nz * c]);
  else if (h === 0) result = clip(piece, [0, 1, 0], Math.min(top, c / ny), [0, Math.min(top, c / ny), 0]);
  else if (c >= ny * top + center + h * piece.radius) return piece.inside;
  else if (c <= ny * top + center - h * piece.radius) result = clip(piece, n, c, [nx * c, ny * c, nz * c]);
  else {
    // In this branch the intersection stays within the horizontal envelope,
    // including nearly parallel planes; avoid a far-away tetrahedron origin.
    const d = (c - ny * top - center) / (h * h);
    result = clip(piece, n, c, [piece.x + nx * d, top, piece.z + nz * d], top);
  }
  return Math.max(0, Math.min(piece.inside, result));
}

/** Same immutable geometry, mass and layout as the macroscopic stock renderer.
 * Only certified separated, contained/protruding dense stock groups use exact
 * mesh immersion. Powders, buoyant pieces, precipitates, alkali/ice, custom
 * filter supports and overlapping/unresolved groups explicitly return null.
 * Static pose is still an envelope reference, not force/contact dynamics. */
export function stockImmersion(vessel: StockImmersionVessel, liquidDensity = 1): StockImmersion | null {
  if (!(vessel.capacity_ml > 0) || vessel.isPulverized || vessel.type === 'filter_funnel') return null;
  // Dense static stocks must sink through BOTH phases. An averaged density
  // can incorrectly certify a piece that floats at their interface.
  if ((vessel.immiscibleOrganicVolume_ml ?? 0) > 0) {
    const volumes = phaseVolumes(vessel), densities = phaseDensities(vessel);
    if ((volumes.aqueous > 0 && !(densities.aqueous > 0)) || (volumes.organic > 0 && !(densities.organic > 0))) return null;
    liquidDensity = Math.max(liquidDensity, densities.aqueous, densities.organic);
  }
  const rows = (vessel.contents ?? []).filter(r => ['s', 'solid'].includes(r.phase ?? r.state ?? '')
    && r.mass_g > 0 && r.location !== 'filter' && r.location !== 'foam');
  if (!rows.length) return null;
  if (vessel.volume_ml > 0.05 && rows.some(r => isSuspensionRow(r, vessel.contents, vessel.precipitateSubstance))) return null;
  const key = JSON.stringify([vessel.type, vessel.capacity_ml, !!vessel.isSealed, liquidDensity,
    rows.map(r => [r.formula, r.mass_g, r.initialMass_g, r.initialMoles, r.solidOrigin])]);
  if (models.has(key)) return models.get(key)!;
  const remember = (result: StockImmersion | null) => {
    if (models.size >= 64) models.delete(models.keys().next().value!);
    models.set(key, result); return result;
  };
  const pieces: ImmersedPiece[] = [], top = vesselInterior(vessel.type).topY;
  for (const formula of new Set(rows.map(r => r.formula))) {
    if (['Na', 'K', 'H2O'].includes(formula)) return remember(null);
    const group = rows.filter(r => r.formula === formula), stock = findChemical(formula);
    const chemical = stock?.type === 'solid' ? stock : findChemical(`${formula} (s)`);
    const morphology = getSolidMorphology(formula), density = chemical?.type === 'solid' ? chemical.density : undefined;
    if (group.some(r => r.solidOrigin === 'precipitate') || morphology === 'POWDER'
      || !(density! >= liquidDensity && density! > 0)) return remember(null);
    const mass = group.reduce((s, r) => s + r.mass_g, 0);
    const initial = group.reduce((s, r) => s + Math.max(r.mass_g, r.initialMass_g
      ?? (r.initialMoles !== undefined && chemical ? r.initialMoles * chemical.molarMass : r.mass_g)), 0);
    const geometryKey = `${morphology}:${formula}`;
    let data = geometries.get(geometryKey);
    if (!data) {
      const geometry = createStockSolidGeometry(morphology, formula); data = { geometry, compiled: compileSolid(geometry) };
      // Snapshots already built keep their typed triangles; dispose only the
      // unused geometry when evicting. No WebGL resource belongs to this cache.
      if (geometries.size >= 64) { const old = geometries.keys().next().value!; geometries.get(old)!.geometry.dispose(); geometries.delete(old); }
      geometries.set(geometryKey, data);
    }
    const layout = createStockSolidLayout(vessel.type, morphology, data.geometry,
      solidSceneVolume(vessel, mass / density!), solidSceneVolume(vessel, initial / density!), vesselInterior(vessel.type).floorY, !vessel.isSealed);
    if (layout.status === 'unresolved-fit' || layout.status === 'empty') return remember(null);
    const added = layout.pieces.map(p => ({ ...p, inverse: p.matrix.clone().invert(), factor: p.matrix.determinant(), inside: 0, mesh: data.compiled }));
    for (const p of added) {
      if (pieces.some(q => Math.hypot(p.x - q.x, p.z - q.z) < p.radius + q.radius
        && p.bottom < q.top && q.bottom < p.top)) return remember(null);
      p.inside = p.bottom >= top ? 0 : p.top <= top ? p.mesh.volume * p.factor
        : clip(p, [0, 1, 0], top, [0, top, 0]);
    }
    pieces.push(...added);
  }
  const scenePerMl = solidSceneVolume(vessel, 1);
  return remember({ basis: 'stock-mesh-envelope-reference', insideVolume_ml: pieces.reduce((s, p) => s + p.inside, 0) / scenePerMl,
    displacementMl(normal, offset) {
      const length = Math.hypot(...normal);
      if (!(length > 0) || !Number.isFinite(length) || !Number.isFinite(offset)) return 0;
      const n = normal.map(x => x / length) as [number, number, number];
      return pieces.reduce((s, p) => s + wetPiece(p, n, offset / length, top), 0) / scenePerMl;
    } });
}
