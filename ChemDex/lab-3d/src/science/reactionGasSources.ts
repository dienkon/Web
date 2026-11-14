import * as THREE from 'three';
import type { ReactionProgram } from '../shared/programSchema';
import type { VesselState } from '../types/chemistry';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { createStockSolidGeometry } from '../components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../components/three/stockSolidLayout';
import { createPowderPileGeometry } from '../components/three/powderPileGeometry';
import { sameMolecularFormula } from './speciesIdentity';
import { stockLocalMatrix } from '../physical/stockCoordinates';
import { contourRadius, solidSceneVolume, vesselInterior } from './vesselDimensions';
import { vesselLiquidSurfaceY } from './vesselGeometry';
import { pourContactRemaining } from './pourContactActivity';
import { pointPlaneDepth, projectToLiquidPlane, type LiquidPlane } from '../simulation/effects/liquidParticleFrame';

export interface ReactionGasSource {
  /** Vessel-local scene coordinates. */
  point: readonly [number, number, number];
  /** Effective reacting patch radius, in vessel-local scene units. */
  radius: number;
  /** Relative wetted-area weight; never an additional gas production rate. */
  weight: number;
  normal?: readonly [number, number, number];
}
interface SurfaceSample { point: THREE.Vector3; normal: THREE.Vector3; area: number }
const meshes = new Map<string, { geometry: THREE.BufferGeometry; samples: SurfaceSample[] }>();
const powderSurfaces = new Map<string, SurfaceSample[]>();

/** Bounded, deterministic area quadrature. Surface samples keep emissions on
 * the actual macro mesh instead of its bounding sphere or the heater floor. */
function surfaceSamples(geometry: THREE.BufferGeometry, count = 32): SurfaceSample[] {
  const positions = geometry.getAttribute('position'), index = geometry.index;
  const triangles: SurfaceSample[] = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let totalArea = 0;
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i);
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)), area = normal.length() / 2;
    if (!(area > 1e-12)) continue;
    totalArea += area;
    triangles.push({ point: a.clone().add(b).add(c).multiplyScalar(1 / 3), normal: normal.normalize(), area });
  }
  if (!triangles.length) return [];
  const result: SurfaceSample[] = [];
  let triangle = 0, area = triangles[0].area;
  for (let i = 0; i < count; i++) {
    const target = totalArea * (i + 0.5) / count;
    while (area < target && triangle < triangles.length - 1) area += triangles[++triangle].area;
    result.push({ ...triangles[triangle], area: totalArea / count });
  }
  return result;
}

function stockMesh(formula: string, morphology: ReturnType<typeof getSolidMorphology>) {
  const key = `${morphology}:${formula}`;
  let mesh = meshes.get(key);
  if (!mesh) {
    const geometry = createStockSolidGeometry(morphology, formula);
    mesh = { geometry, samples: surfaceSamples(geometry) };
    if (meshes.size >= 64) { const oldest = meshes.keys().next().value!; meshes.get(oldest)!.geometry.dispose(); meshes.delete(oldest); }
    meshes.set(key, mesh);
  }
  return mesh;
}

/** Gas evolution is sourced from the wetted reactant/catalyst, or the recent
 * liquid contact plume. Undefined requests distributed aqueous nucleation;
 * [] means a known heterogeneous route has no remaining wetted source.
 * This is illustrative nucleation geography, not a calibrated nucleation law.
 * The chemistry ledger remains the sole authority for gas production. */
export function reactionGasSources(vessel: VesselState, program?: ReactionProgram,
  frame: { surfaceY?: number; surfacePlane?: LiquidPlane; bodyMatrixWorld?: THREE.Matrix4 } = {}): ReactionGasSource[] | undefined {
  if (vessel.isShattered || !(vessel.volume_ml > 0.05)) return [];
  const surfaceY = frame.surfaceY ?? vesselLiquidSurfaceY(vessel), interior = vesselInterior(vessel.type);
  const surfaceFormulas = program?.chemistry.species.filter(item => (item.role === 'reactant' || item.role === 'catalyst')
    && item.phase === 's').map(item => item.formula) ?? [];
  if (!surfaceFormulas.length) {
    const contact = vessel.recentPourContact;
    if (contact && pourContactRemaining(contact) > 0 && contact.point.every(Number.isFinite)) {
      const point = new THREE.Vector3(...contact.point);
      if (pointPlaneDepth(point, surfaceY, frame.surfacePlane) < 0.02) projectToLiquidPlane(point, surfaceY, frame.surfacePlane, 0.02);
      return [{ point: point.toArray() as [number, number, number], radius: interior.maximumRadius * 0.1, weight: 1 }];
    }
    return undefined;
  }
  const sources: ReactionGasSource[] = [];
  const append = (samples: SurfaceSample[], matrix: THREE.Matrix4) => {
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const scale = new THREE.Vector3().setFromMatrixScale(matrix).x;
    for (const sample of samples) {
      const point = sample.point.clone().applyMatrix4(matrix), normal = sample.normal.clone().applyMatrix3(normalMatrix).normalize();
      if (![point.x, point.y, point.z].every(Number.isFinite) || point.y <= interior.floorY + 1e-5
        || point.y >= interior.topY || Math.hypot(point.x, point.z) >= contourRadius(interior.points, point.y) - 1e-5
        || pointPlaneDepth(point, surfaceY, frame.surfacePlane) <= 0.002) continue;
      // A face pressed into the supporting glass is not a wetted interface.
      const outside = point.clone().addScaledVector(normal, 0.002);
      if (outside.y <= interior.floorY || Math.hypot(outside.x, outside.z) >= contourRadius(interior.points, outside.y)) continue;
      sources.push({ point: point.toArray() as [number, number, number], radius: 0,
        weight: sample.area * scale * scale, normal: normal.toArray() as [number, number, number] });
    }
  };
  for (const formula of new Set(surfaceFormulas)) {
    let rows = vessel.contents.filter(row => sameMolecularFormula(row.formula, formula) && ['s', 'solid'].includes(row.phase ?? row.state ?? '')
      && row.mass_g > 0 && row.location !== 'filter' && row.location !== 'foam');
    // A positive receipt refers to the just-finished chemistry interval. Even
    // the first interval may consume the entire tiny solid dose; its observed
    // pre-step surface remains the source for that one pulse, never inventory.
    const receipt = vessel.gasFlux && Object.values(vessel.gasFlux.generated_mol_s).some(rate => rate > 0)
      ? vessel.gasFlux.sourceSolids : undefined;
    const sourceVessel = !rows.length && receipt ? { ...vessel, contents: receipt.contents, stockMotion: receipt.stockMotion } : vessel;
    if (!rows.length && receipt) rows = receipt.contents.filter(row => sameMolecularFormula(row.formula, formula));
    const mass = rows.reduce((sum, row) => sum + row.mass_g, 0);
    if (!(mass > 0)) continue;
    const stock = findChemical(formula), chemical = stock?.type === 'solid' ? stock : findChemical(`${formula} (s)`);
    const declared = program?.chemistry.species.find(item => sameMolecularFormula(item.formula, formula));
    const density = chemical?.type === 'solid' ? chemical.density : declared?.density_g_ml;
    if (!(density! > 0)) continue;
    const morphology = vessel.isPulverized ? 'POWDER' : getSolidMorphology(formula);
    const poses = sourceVessel.stockMotion?.grains.filter(p => sameMolecularFormula(p.formula, formula)) ?? [];
    const represented = poses.reduce((sum, p) => sum + p.mass_g, 0);
    if (represented > 0) {
      const mesh = stockMesh(formula, morphology === 'POWDER' ? 'PELLET' : morphology);
      for (const pose of poses) {
        const matrix = stockLocalMatrix(vessel, { ...pose, scale_m: pose.scale_m * Math.cbrt(mass / represented) }, frame.bodyMatrixWorld);
        // Powder is a coarse contact carrier; this emission envelope follows
        // its measured location, without claiming resolved microscopic sites.
        if (morphology === 'POWDER') {
          const position = new THREE.Vector3().setFromMatrixPosition(matrix);
          const factor = Math.cbrt(solidSceneVolume(vessel, pose.mass_g * mass / represented / density!));
          matrix.makeScale(factor, factor, factor).setPosition(position);
        }
        append(mesh.samples, matrix);
      }
    } else if (morphology === 'POWDER') {
      const volume = solidSceneVolume(vessel, mass / density!) / 0.55, key = `${vessel.type}:${volume}`;
      let samples = powderSurfaces.get(key);
      if (!samples) {
        const geometry = createPowderPileGeometry(vessel.type, volume, interior.maximumRadius * 0.85);
        samples = surfaceSamples(geometry).filter(sample => sample.normal.y > 0); geometry.dispose();
        if (powderSurfaces.size >= 64) powderSurfaces.delete(powderSurfaces.keys().next().value!);
        powderSurfaces.set(key, samples);
      }
      append(samples, new THREE.Matrix4());
    } else {
      const mesh = stockMesh(formula, morphology);
      const initial = rows.reduce((sum, row) => sum + Math.max(row.mass_g, row.initialMass_g
        ?? (row.initialMoles !== undefined && chemical ? row.initialMoles * chemical.molarMass : row.mass_g)), 0);
      const layout = createStockSolidLayout(vessel.type, morphology, mesh.geometry, solidSceneVolume(vessel, mass / density!),
        solidSceneVolume(vessel, initial / density!), interior.floorY, !vessel.isSealed);
      for (const piece of layout.pieces) append(mesh.samples, piece.matrix);
    }
  }
  if (sources.length <= 128) return sources;
  // Keep a whole-vessel budget as well as the per-mesh quadrature. Cumulative
  // area strata preserve total source weight without bias toward tiny pieces.
  const total = sources.reduce((sum, source) => sum + source.weight, 0), selected: ReactionGasSource[] = [];
  let index = 0, area = sources[0].weight;
  for (let i = 0; i < 128; i++) {
    const target = total * (i + 0.5) / 128;
    while (area < target && index < sources.length - 1) area += sources[++index].weight;
    selected.push({ ...sources[index], weight: total / 128 });
  }
  return selected;
}
