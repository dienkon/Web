import { Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { SubstanceContent, VesselState } from '../types/chemistry';
import type { ReactionProgram } from '../shared/programSchema';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { stockLocalMatrix } from './stockCoordinates';
import { stockSurfacePoints, sampleGeometrySurface, type StockSurfaceSample } from '../science/stockSurfaceSamples';
import { createStockSolidGeometry } from '../science/stockSolidGeometry';
import { createStockSolidLayout } from '../science/stockSolidLayout';
import { createPowderPileGeometry } from '../science/powderPileGeometry';
import { contourRadius, solidSceneVolume, vesselInterior } from '../science/vesselDimensions';
import { solveStockLiquidSurface } from '../science/stockLiquidSurface';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { phaseVolumes, phaseDensities, separatedLayers } from '../science/liquidLayers';
import { isSuspensionRow } from '../science/precipitateInventory';
import { liquidSurfaceVolume } from '../engine/waterPhase';
import { getVesselProfile } from '../pour/physics/profiles';
import { solveLevel } from '../pour/physics/retained';
import { attachedMetalMassForRow } from '../science/metalSurfaceAppearance';

const geometries = new Map<string, BufferGeometry>();
const powderSurfaces = new Map<string, StockSurfaceSample[]>();
// A transient participating-pool view still occupies the original vessel.
// Inert stock in an organic layer displaces fluid even though it cannot react
// with the aqueous phase. Symbol metadata survives local spreads, is omitted
// by serialization, and is never included in returned chemistry patches.
const contactGeometry = Symbol('stockContactGeometry');
type ContactVessel = VesselState & { [contactGeometry]?: VesselState };
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
export interface StockGrainContact {
  id: string;
  formula: string;
  /** Inventory-backed carrier mass; new, unposed doses do not inflate it. */
  mass_g: number;
  wetFraction: number;
  wetArea: number;
  totalArea: number;
}

export function stockGrainContacts(vessel: VesselState, formula: string, aqueousOnly = true): StockGrainContact[] {
  const contacts: StockGrainContact[] = [];
  stockLiquidContactFraction(vessel, formula, aqueousOnly, contacts);
  return contacts;
}

/** A coating uses its real host surface; it is not an independent floor grain.
 * Released deposits retain the unresolved suspension contact model. */
function attachedContactFraction(vessel: VesselState, row: SubstanceContent, aqueousOnly = true): number | null {
  if (!row.depositSubstrate || sameMolecularFormula(row.depositSubstrate, row.formula)
    || !(attachedMetalMassForRow(vessel, row) > 0)) return null;
  if (row.depositCarrierId) return stockGrainContacts(vessel, row.depositSubstrate, aqueousOnly)
    .find(contact => contact.id === row.depositCarrierId)?.wetFraction ?? 0;
  return stockLiquidContactFraction(vessel, row.depositSubstrate, aqueousOnly);
}

/** Keep protected coating provenance separate from a free pool of its metal. */
export function stockProtectionKey(row: SubstanceContent): string {
  const formula = identifySpecies(row.formula).formula;
  return row.depositSubstrate && !row.depositReleased
    ? `${formula}|${row.depositSubstrate}|${row.depositCarrierId ?? ''}` : formula;
}

/** Shared point predicate for contact area and newly formed surface deposits.
 * The original full geometry survives protected inventory projections. */
export function stockPointInAqueousLiquid(vessel: VesselState): (point: Vector3) => boolean {
  return stockPointInLiquid(vessel, true);
}
function stockPointInLiquid(vessel: VesselState, aqueousOnly: boolean): (point: Vector3) => boolean {
  const geometryVessel = (vessel as ContactVessel)[contactGeometry] ?? vessel;
  const layers = phaseVolumes(vessel);
  if (vessel.isShattered || !(vessel.volume_ml > 0) || aqueousOnly && !(layers.aqueous > 0)) return () => false;
  const rotation = vessel.physicalMotion?.rotation ? new Quaternion(...vessel.physicalMotion.rotation)
    : new Quaternion().setFromEuler(new Euler(0, vessel.rotationY ?? 0, vessel.rotationZ ?? 0, 'YXZ'));
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation.invert()), n = up.toArray() as [number, number, number];
  const profile = getVesselProfile(vessel.type, vessel.capacity_ml), interior = vesselInterior(vessel.type);
  const densities = phaseDensities(vessel), liquidDensity = Math.max(densities.aqueous, densities.organic, 1e-9);
  const level = (volume: number) => solveStockLiquidSurface(geometryVessel, n, liquidDensity, volume)?.c
    ?? solveLevel(profile, Math.atan2(Math.hypot(n[0], n[2]), n[1]),
      volume + Math.max(0, liquidSurfaceVolume(vessel) - vessel.volume_ml) * volume / vessel.volume_ml).c;
  let ceiling = level(vessel.volume_ml), floor = -Infinity;
  if (aqueousOnly && layers.organic > 0) {
    const separation = separatedLayers(vessel), boundary = level(separation.lowerVolume_ml);
    if (separation.lower === 'aqueous') ceiling = boundary; else floor = boundary;
  }
  return (p: Vector3) => {
    const height = up.dot(p);
    return p.y >= interior.floorY - 1e-8 && p.y <= interior.topY
      && Math.hypot(p.x, p.z) <= contourRadius(interior.points, p.y) + 1e-8
      && height < ceiling && height > floor;
  };
}

export function stockLiquidContactFraction(vessel: VesselState, formula: string, aqueousOnly = true,
  contacts?: StockGrainContact[]): number {
  if (vessel.isShattered || !(vessel.volume_ml > 0)) return 0;
  const allRows = vessel.contents.filter(row => ['s', 'solid'].includes(row.phase ?? row.state ?? '')
    && (!row.location || row.location === 'bulk') && row.mass_g > 0 && sameMolecularFormula(row.formula, formula));
  if (!allRows.length) return 0;
  const layers = phaseVolumes(vessel), aqueousVolume = layers.aqueous;
  if (aqueousOnly && !(aqueousVolume > 0)) return 0;
  const rows = allRows.filter(row => !isContactSuspensionRow(vessel, row));
  // Unresolved precipitate remains bulk-wetted but never enlarges macrostock
  // geometry or changes its physical carrier mass.
  const suspensions = allRows.filter(row => !rows.includes(row));
  const suspensionMass = suspensions.reduce((sum, row) => sum + row.mass_g, 0);
  const wettedSuspensionMass = suspensions.reduce((sum, row) => sum + row.mass_g * (attachedContactFraction(vessel, row, aqueousOnly) ?? 1), 0);
  if (!rows.length) return suspensionMass > 0 ? wettedSuspensionMass / suspensionMass : 0;
  const inside = stockPointInLiquid(vessel, aqueousOnly);
  const interior = vesselInterior(vessel.type);
  let wetArea = 0, totalArea = 0;
  const append = (points: readonly number[][], area: number, matrix: Matrix4) => {
    const scale = new Vector3().setFromMatrixScale(matrix).x, weight = area * scale * scale / points.length;
    const point = new Vector3();
    for (const sample of points) {
      point.set(sample[0], sample[1], sample[2]).applyMatrix4(matrix);
      totalArea += weight; if (inside(point)) wetArea += weight;
    }
  };
  const poses = vessel.stockMotion?.grains.filter(pose => pose.mass_g > 0 && sameMolecularFormula(pose.formula, formula)) ?? [];
  const mass = rows.reduce((sum, row) => sum + row.mass_g, 0), represented = poses.reduce((sum, pose) => sum + pose.mass_g, 0);
  if (represented > 0) {
    for (const pose of poses) {
      const surface = stockSurfacePoints(formula, pose.powder || !!vessel.isPulverized);
      const ratio = Math.min(1, mass / represented), previousWet = wetArea, previousTotal = totalArea;
      append(surface.points, surface.area, stockLocalMatrix(vessel, { ...pose, scale_m: pose.scale_m * Math.cbrt(ratio) }));
      const area = totalArea - previousTotal, wet = wetArea - previousWet;
      contacts?.push({ id: pose.id, formula: pose.formula, mass_g: pose.mass_g * ratio,
        wetFraction: area > 0 ? wet / area : 0, wetArea: wet, totalArea: area });
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
  let stockFraction = totalArea > 0 ? Math.max(0, Math.min(1, wetArea / totalArea)) : 0;
  if (represented > 0 && mass > represented + 1e-12) {
    // A dose added since the last worker snapshot has its own static spawn
    // layout until physics seeds it; it never enlarges the older carriers.
    const looseMass = mass - represented, fraction = looseMass / mass;
    const loose = { ...vessel, stockMotion: undefined, contents: vessel.contents.map(row => rows.includes(row)
      ? { ...row, mass_g: row.mass_g * fraction, moles: row.moles * fraction } : row) };
    stockFraction = (stockFraction * represented + stockLiquidContactFraction(loose, formula, aqueousOnly) * looseMass) / mass;
  }
  return (stockFraction * mass + wettedSuspensionMass) / (mass + suspensionMass);
}

/** Split aggregate stock rows by whole carrier eligibility. A partly immersed
 * carrier exposes its whole finite inventory, with its rate weighted by wet
 * area; a wholly dry carrier is protected. Metadata survives both portions.
 * reactiveVessel carries only eligible poses, making repeated partitioning
 * idempotent instead of repeatedly splitting against the original dry poses. */
export function partitionDryStock(vessel: VesselState) {
  const stockRows = vessel.contents.filter(row => ['s', 'solid'].includes(row.phase ?? row.state ?? '')
    && (!row.location || row.location === 'bulk') && row.mass_g > 0
    && !isContactSuspensionRow(vessel, row));
  const dryFractions = new Map<string, number>(), excluded = new Set<string>();
  const effectiveMasses = new Map<string, number>();
  for (const formula of new Set(stockRows.map(row => row.formula))) {
    const stockView = { ...vessel, contents: vessel.contents.filter(row => !isContactSuspensionRow(vessel, row)) };
    const mass = stockRows.filter(row => sameMolecularFormula(row.formula, formula)).reduce((sum, row) => sum + row.mass_g, 0);
    const contacts = stockGrainContacts(stockView, formula);
    let dryMass = 0;
    for (const contact of contacts) {
      effectiveMasses.set(contact.id, contact.mass_g);
      if (!(contact.wetArea > 0)) { dryMass += contact.mass_g; excluded.add(contact.id); }
    }
    if (!contacts.length) {
      if (stockLiquidContactFraction(stockView, formula) <= 0) dryMass = mass;
    } else {
      const looseMass = Math.max(0, mass - contacts.reduce((sum, contact) => sum + contact.mass_g, 0));
      if (looseMass > 1e-12 && stockLiquidContactFraction({ ...stockView, stockMotion: undefined }, formula) <= 0) dryMass += looseMass;
    }
    dryFractions.set(formula, Math.min(1, dryMass / mass));
  }
  const reactiveContents: SubstanceContent[] = [], inertContents: SubstanceContent[] = [];
  const protectedMolesByRow = new Map<SubstanceContent, number>();
  for (const row of vessel.contents) {
    const coatingContact = attachedContactFraction(vessel, row);
    const dry = stockRows.includes(row) ? dryFractions.get(row.formula) ?? 0 : coatingContact === 0 ? 1 : 0;
    if (dry > 0) {
      protectedMolesByRow.set(row, row.moles * dry);
      inertContents.push(dry === 1 ? row : { ...row, mass_g: row.mass_g * dry, moles: row.moles * dry });
    }
    if (dry < 1) reactiveContents.push(dry === 0 ? row : { ...row, mass_g: row.mass_g * (1 - dry), moles: row.moles * (1 - dry) });
  }
  const reactiveVessel: ContactVessel = inertContents.length ? { ...vessel, contents: reactiveContents,
    [contactGeometry]: (vessel as ContactVessel)[contactGeometry] ?? vessel,
    mass_g: vessel.mass_g - inertContents.reduce((sum, row) => sum + row.mass_g, 0),
    stockMotion: vessel.stockMotion ? { ...vessel.stockMotion, grains: vessel.stockMotion.grains
      .filter(pose => pose.mass_g > 0 && !excluded.has(pose.id)).map(pose => {
        const mass_g = effectiveMasses.get(pose.id) ?? pose.mass_g;
        return mass_g === pose.mass_g ? pose : { ...pose, mass_g, scale_m: pose.scale_m * Math.cbrt(mass_g / pose.mass_g) };
      }) } : undefined } : vessel;
  return { reactiveContents, inertContents, reactiveVessel, protectedMolesByRow };
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
