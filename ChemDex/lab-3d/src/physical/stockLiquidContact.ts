import { Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { stockLocalMatrix } from './stockCoordinates';
import { stockSurfacePoints, sampleGeometrySurface, type StockSurfaceSample } from '../science/stockSurfaceSamples';
import { createStockSolidGeometry } from '../science/stockSolidGeometry';
import { createStockSolidLayout } from '../science/stockSolidLayout';
import { createPowderPileGeometry } from '../science/powderPileGeometry';
import { contourRadius, solidSceneVolume, vesselInterior } from '../science/vesselDimensions';
import { solveStockLiquidSurface } from '../science/stockLiquidSurface';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { phaseVolumes, phaseDensities, separatedLayers } from '../science/liquidLayers';
import { isSuspensionRow } from '../science/precipitateInventory';
import { liquidSurfaceVolume } from '../engine/waterPhase';
import { getVesselProfile } from '../pour/physics/profiles';
import { solveLevel } from '../pour/physics/retained';

const geometries = new Map<string, BufferGeometry>();
const powderSurfaces = new Map<string, StockSurfaceSample[]>();
export const isContactSuspensionRow = (vessel: VesselState, row: VesselState['contents'][number]) => row.solidOrigin === 'precipitate'
  || !vessel.stockMotion?.grains.some(pose => sameMolecularFormula(pose.formula, row.formula))
    && isSuspensionRow(row, vessel.contents, vessel.precipitateSubstance);
function stockGeometry(formula: string) {
  let geometry = geometries.get(formula);
  if (!geometry) {
    geometry = createStockSolidGeometry(getSolidMorphology(formula), formula);
    if (geometries.size >= 64) { const first = geometries.keys().next().value!; geometries.get(first)!.dispose(); geometries.delete(first); }
    geometries.set(formula, geometry);
  }
  return geometry;
}

/** Geometry eligibility and relative exposed area, not a fitted rate law.
 * Explicit dynamic poses override the stock layout. Unknown static geometry
 * and unresolved precipitate particles retain the existing bulk-contact model. */
export function stockLiquidContactFraction(vessel: VesselState, formula: string, aqueousOnly = true): number {
  if (vessel.isShattered || !(vessel.volume_ml > 0)) return 0;
  const allRows = vessel.contents.filter(row => ['s', 'solid'].includes(row.phase ?? row.state ?? '')
    && (!row.location || row.location === 'bulk') && row.mass_g > 0 && sameMolecularFormula(row.formula, formula));
  if (!allRows.length) return 0;
  const layers = phaseVolumes(vessel), aqueousVolume = layers.aqueous;
  if (aqueousOnly && !(aqueousVolume > 0)) return 0;
  const rows = allRows.filter(row => !isContactSuspensionRow(vessel, row));
  // Unresolved precipitate remains bulk-wetted but never enlarges macrostock
  // geometry or changes its physical carrier mass.
  const suspensionMass = allRows.filter(row => !rows.includes(row)).reduce((sum, row) => sum + row.mass_g, 0);
  if (!rows.length) return 1;
  const rotation = vessel.physicalMotion?.rotation ? new Quaternion(...vessel.physicalMotion.rotation)
    : new Quaternion().setFromEuler(new Euler(0, vessel.rotationY ?? 0, vessel.rotationZ ?? 0, 'YXZ'));
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation.invert()), n = up.toArray() as [number, number, number];
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml), interior = vesselInterior(vessel.type);
  const densities = phaseDensities(vessel), liquidDensity = Math.max(densities.aqueous, densities.organic, 1e-9);
  const level = (volume: number) => solveStockLiquidSurface(vessel, n, liquidDensity, volume)?.c
    ?? solveLevel(profile, Math.atan2(Math.hypot(n[0], n[2]), n[1]),
      volume + Math.max(0, liquidSurfaceVolume(vessel) - vessel.volume_ml) * volume / vessel.volume_ml).c;
  let ceiling = level(vessel.volume_ml), floor = -Infinity;
  if (aqueousOnly && layers.organic > 0) {
    const separation = separatedLayers(vessel), boundary = level(separation.lowerVolume_ml);
    if (separation.lower === 'aqueous') ceiling = boundary; else floor = boundary;
  }
  const inside = (p: Vector3) => {
    const height = up.dot(p);
    return p.y >= interior.floorY - 1e-8 && p.y <= interior.topY
      && Math.hypot(p.x, p.z) <= contourRadius(interior.points, p.y) + 1e-8
      && height < ceiling && height > floor;
  };
  let wetArea = 0, totalArea = 0;
  const append = (points: readonly number[][], area: number, matrix: Matrix4) => {
    const scale = new Vector3().setFromMatrixScale(matrix).x, weight = area * scale * scale / points.length;
    const point = new Vector3();
    for (const sample of points) {
      point.set(sample[0], sample[1], sample[2]).applyMatrix4(matrix);
      totalArea += weight; if (inside(point)) wetArea += weight;
    }
  };
  const poses = vessel.stockMotion?.grains.filter(pose => sameMolecularFormula(pose.formula, formula)) ?? [];
  const mass = rows.reduce((sum, row) => sum + row.mass_g, 0), represented = poses.reduce((sum, pose) => sum + pose.mass_g, 0);
  if (represented > 0) {
    for (const pose of poses) {
      const surface = stockSurfacePoints(formula, pose.powder || !!vessel.isPulverized);
      append(surface.points, surface.area, stockLocalMatrix(vessel, { ...pose, scale_m: pose.scale_m * Math.cbrt(mass / represented) }));
    }
  } else {
    const stock = findChemical(formula), chemical = stock.type === 'solid' ? stock : findChemical(`${formula} (s)`);
    if (chemical.type !== 'solid' || !(chemical.density! > 0)) return 1;
    const morphology = vessel.isPulverized ? 'POWDER' : getSolidMorphology(formula), volume = solidSceneVolume(vessel, mass / chemical.density!);
    if (morphology === 'POWDER') {
      const key = `${vessel.type}:${volume}`;
      let samples = powderSurfaces.get(key);
      if (!samples) {
        const geometry = createPowderPileGeometry(vessel.type, volume / 0.55, interior.maximumRadius * 0.85);
        samples = sampleGeometrySurface(geometry).filter(sample => sample.normal.y > 0); geometry.dispose();
        if (powderSurfaces.size >= 64) powderSurfaces.delete(powderSurfaces.keys().next().value!);
        powderSurfaces.set(key, samples);
      }
      for (const sample of samples) { totalArea += sample.area; if (inside(sample.point)) wetArea += sample.area; }
    } else {
      const initial = rows.reduce((sum, row) => sum + Math.max(row.mass_g, row.initialMass_g
        ?? (row.initialMoles !== undefined ? row.initialMoles * chemical.molarMass : row.mass_g)), 0);
      const layout = createStockSolidLayout(vessel.type, morphology, stockGeometry(formula), volume,
        solidSceneVolume(vessel, initial / chemical.density!), interior.floorY, !vessel.isSealed);
      const surface = stockSurfacePoints(formula, false);
      for (const piece of layout.pieces) append(surface.points, surface.area, piece.matrix);
    }
  }
  const stockFraction = totalArea > 0 ? Math.max(0, Math.min(1, wetArea / totalArea)) : 0;
  return (stockFraction * mass + suspensionMass) / (mass + suspensionMass);
}

/** Protect wholly dry macrostock rows while allowing the actual aqueous and
 * tagged-precipitate pools to react. Returned rows retain identity/metadata.
 * Partially wetted carriers remain one inventory; per-grain consumption is
 * unresolved and must not be inferred from this row-level partition. */
export function partitionDryStock(vessel: VesselState) {
  const stockRows = vessel.contents.filter(row => ['s', 'solid'].includes(row.phase ?? row.state ?? '')
    && (!row.location || row.location === 'bulk') && row.mass_g > 0
    && !isContactSuspensionRow(vessel, row));
  const dry = new Set<string>();
  for (const formula of new Set(stockRows.map(row => row.formula))) {
    const stockView = { ...vessel, contents: vessel.contents.filter(row => !isContactSuspensionRow(vessel, row)) };
    if (stockLiquidContactFraction(stockView, formula) <= 0) dry.add(formula);
  }
  const inertContents = stockRows.filter(row => dry.has(row.formula)), inert = new Set(inertContents);
  return { reactiveContents: vessel.contents.filter(row => !inert.has(row)), inertContents };
}

/** Only solid/liquid contact routes need immersion. Gas/solid combustion and
 * dry thermolysis remain eligible under their existing activation conditions. */
export function reactionStockContactFraction(program: ReactionProgram | undefined, vessel: VesselState): number {
  if (!program) return 1;
  const reactants = program.chemistry.species.filter(species => species.role === 'reactant');
  const dissolution = reactants.some(solid => solid.phase === 's' && program.chemistry.species.some(product =>
    product.role === 'product' && product.phase === 'aq' && sameMolecularFormula(product.formula, solid.formula)));
  if (!dissolution && !reactants.some(species => ['aq', 'l'].includes(species.phase))) return 1;
  const solids = program.chemistry.species.filter(species => species.phase === 's'
    && (species.role === 'reactant' || species.role === 'catalyst'));
  const formulas = solids.map(solid => solid.formula);
  // This coupled program accepts Cu(OH)2 directly as well as its nominal
  // aqueous CuSO4 feed; the actual intermediate pool must obey contact too.
  if (program.id === 'cuso4_nh3') {
    const reactive = partitionDryStock(vessel).reactiveContents;
    const aqueousCopper = reactive.some(row => row.phase === 'aq' && row.moles > 0 && identifyCopper(row.formula));
    if (!aqueousCopper && vessel.contents.some(row => row.phase === 's' && row.mass_g > 0
      && (!row.location || row.location === 'bulk') && sameMolecularFormula(row.formula, 'Cu(OH)2'))) formulas.push('Cu(OH)2');
  }
  return formulas.reduce((fraction, formula) => Math.min(fraction, stockLiquidContactFraction(vessel, formula)), 1);
}

const identifyCopper = (formula: string) => /^(?:\[?Cu(?:\(|SO4|\[|$))/.test(formula.replace(/\s+/g, ''));
