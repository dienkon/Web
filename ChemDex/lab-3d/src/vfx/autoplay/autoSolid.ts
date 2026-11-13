import { Matrix4, Quaternion, Vector3 } from 'three';
import { findChemical, getSolidMorphology } from '../../data/chemicals';
import { createStockSolidGeometry } from '../../components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../../components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior } from '../../science/vesselDimensions';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { getPrecipitateProfile } from '../../simulation/core/SimulationConfig';
import { getVesselProfile } from '../../pour/physics/profiles';
import { GRAVITY_M_S2, metersPerModelUnit } from '../../science/sceneUnits';
import { ICE_DENSITY_G_ML } from '../../engine/waterProperties';
import type { SolidMorphology, VesselState } from '../../types/chemistry';

export const AUTO_DONOR_SCALE = 0.6;
const definitions = new Map<string, ReturnType<typeof defineSolid>>();
function defineSolid(formula: string, product: boolean) {
  const known = findChemical(formula), solid = known.type === 'solid' ? known : findChemical(`${formula} (s)`);
  const chemical = solid.type === 'solid' ? solid : undefined;
  const profile = getPrecipitateProfile(formula);
  const morphology: SolidMorphology = formula === 'H2O' ? 'CUBIC_CRYSTAL' : product ? 'POWDER' : getSolidMorphology(formula);
  const density = formula === 'H2O' ? ICE_DENSITY_G_ML
    : product && profile.modelBasis !== 'generic_fallback' ? profile.particleDensity_g_cm3
    : chemical?.density ?? profile.particleDensity_g_cm3;
  const material = stockSolidMaterial(chemical, morphology);
  if (product) Object.assign(material, { color: profile.color, roughness: profile.roughness, metalness: profile.metalness ?? 0 });
  return { morphology, density, material, fixedCount: ['Na', 'K', 'H2O'].includes(formula) ? 1 : undefined,
    geometry: createStockSolidGeometry(morphology, formula) };
}

/** The same stock form, phase-specific density and finish used on the manual bench. */
export function autoSolid(formula: string, product = false) {
  const key = `${formula}:${product}`;
  let definition = definitions.get(key);
  if (!definition) { definition = defineSolid(formula, product); definitions.set(key, definition); }
  return definition;
}

export interface AutoSolidFlight {
  mass_g: number; releaseAt: number; arrivalAt: number; arrived: boolean;
  position: [number, number, number]; velocity: [number, number, number]; rotation: Quaternion; scale: number;
}
export interface AutoSolidDose {
  pieces: Matrix4[]; flights: AutoSolidFlight[]; released: number; arrived: number;
}

/** Calibrate the displayed donor's 0.6 scale to the receiver's physical units. */
export function autoDonorVessel(): Pick<VesselState, 'type' | 'capacity_ml'> {
  const cm = getVesselProfile('beaker', 100).sceneScale * AUTO_DONOR_SCALE;
  return { type: 'flask', capacity_ml: vesselInterior('flask').volume * cm ** 3 };
}
export function createAutoSolidDose(formula: string, mass_g: number): AutoSolidDose {
  const solid = autoSolid(formula), donor = autoDonorVessel();
  const layout = createStockSolidLayout('flask', solid.morphology, solid.geometry, solidSceneVolume(donor, mass_g / solid.density),
    undefined, undefined, true, solid.fixedCount);
  return { pieces: layout.pieces.map(p => p.matrix), flights: [], released: 0, arrived: 0 };
}

export const autoSolidGravity = GRAVITY_M_S2 / metersPerModelUnit(getVesselProfile('beaker', 100));
export function solidFlightPosition(flight: AutoSolidFlight, time: number, out = new Vector3()) {
  const t = Math.max(0, time - flight.releaseAt);
  return out.set(flight.position[0] + flight.velocity[0] * t,
    flight.position[1] + flight.velocity[1] * t - autoSolidGravity * t * t / 2,
    flight.position[2] + flight.velocity[2] * t);
}
