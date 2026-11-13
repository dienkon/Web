import { Euler, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { VesselState } from '../types/chemistry';
import { findChemical, getSolidMorphology } from '../data/chemicals';
import { vesselDefinition, VESSEL_IDS } from './catalog';
import { createStockSolidGeometry } from '../components/three/stockSolidGeometry';
import { createStockSolidLayout } from '../components/three/stockSolidLayout';
import { solidSceneVolume, vesselInterior } from '../science/vesselDimensions';
import { isSuspensionRow } from '../science/precipitateInventory';
import { METERS_PER_SCENE_UNIT as U, scenePointToSI } from '../science/sceneUnits';
import { vesselBodyTransform, vesselLocalToWorld } from '../science/vesselScale';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { solveStockLiquidSurface } from '../science/stockLiquidSurface';
import { liquidParticlePlane } from '../simulation/effects/liquidParticleFrame';
import { getVesselProfile } from '../pour/physics/profiles';
import { liquidInventoryMass } from '../handling/solidOccupancy';
import type { StockContainerInput, StockGroupInput } from './stockTypes';
import type { Quat } from './types';

const geometries = new Map<string, BufferGeometry>();
const vertices = new Map<string, number[]>();
const definitions = new Map<string, ReturnType<typeof vesselDefinition>>();
export function stockGeometry(formula: string) {
  let g = geometries.get(formula); if (!g) { g = createStockSolidGeometry(getSolidMorphology(formula), formula); geometries.set(formula, g); }
  return g;
}
export function stockGroup(formula: string, mass_g: number): StockGroupInput | null {
  if (!(mass_g > 1e-12)) return null;
  const known = findChemical(formula), chemical = known?.type === 'solid' ? known : findChemical(`${formula} (s)`);
  if (!chemical?.density || !(chemical.density > 0) || chemical.type !== 'solid' || ['H2O', 'Na', 'K'].includes(formula)) return null;
  const geometry = stockGeometry(formula);
  let points = vertices.get(formula);
  if (!points) { points = Array.from(geometry.getAttribute('position').array); vertices.set(formula, points); }
  return { formula, mass_g, density_kg_m3: chemical.density * 1000, powder: getSolidMorphology(formula) === 'POWDER',
    vertices: points, unitVolume: 1, seed: [] };
}
export function stockContainer(v: VesselState, restore: boolean, vortex?: import('../science/liquidVortex').VortexSurface): StockContainerInput | null {
  if (v.isShattered || v.id.startsWith('lesson_vessel_') || !VESSEL_IDS.includes(v.type)) return null;
  const key = `${v.type}:${v.capacity_ml}:${!!v.isSealed}`;
  let definition = definitions.get(key); if (!definition) {
    definition = vesselDefinition(v.type, v.capacity_ml);
    if (v.isSealed) { const mouth = definition.ports[0]; definition = { ...definition, colliders: [...definition.colliders,
      { kind: 'cylinder', halfHeight_m: 0.001, radius_m: mouth.radius_m + 0.002, center_m: mouth.position_m }] }; }
    definitions.set(key, definition);
  }
  const rotation = v.physicalMotion?.rotation ?? new Quaternion().setFromEuler(new Euler(0, v.rotationY ?? 0, v.rotationZ ?? 0, 'YXZ')).toArray() as Quat;
  const groups: StockGroupInput[] = [];
  const rows = v.contents.filter(c => c.phase === 's' && c.mass_g > 1e-10 && c.location !== 'filter' && c.location !== 'foam'
    && !(v.volume_ml > 0.05 && isSuspensionRow(c, v.contents, v.precipitateSubstance)) && c.solidOrigin !== 'precipitate');
  for (const formula of new Set(rows.map(r => r.formula))) {
    const group = stockGroup(formula, rows.filter(r => r.formula === formula).reduce((m, r) => m + r.mass_g, 0)); if (!group) continue;
    const geometry = stockGeometry(formula), q = new Quaternion(), p = new Vector3(), scale = new Vector3();
    const layout = createStockSolidLayout(v.type, getSolidMorphology(formula), geometry,
      solidSceneVolume(v, group.mass_g / (group.density_kg_m3 / 1000)), undefined, vesselInterior(v.type).floorY, !v.isSealed);
    const bodyQ = new Quaternion(...rotation);
    group.seed = layout.pieces.map(piece => {
      piece.matrix.decompose(p, q, scale);
      const position_m = scenePointToSI(vesselLocalToWorld(v, p.toArray()));
      return { position_m, rotation: bodyQ.clone().multiply(q).toArray() as Quat };
    });
    groups.push(group);
  }
  let fluid: StockContainerInput['fluid'];
  if (v.volume_ml > 0.05) {
    const n = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...rotation).invert());
    const density = liquidInventoryMass(v) / v.volume_ml;
    const surface = solveStockLiquidSurface(v, n.toArray(), density)
      ?? liquidParticlePlane(getVesselProfile(v.type, v.capacity_ml), v.volume_ml, n.toArray());
    const offset = surface && ('c' in surface ? surface.c : surface.offset);
    const level = scenePointToSI(vesselLocalToWorld(v, offset !== null && offset !== undefined ? n.clone().multiplyScalar(offset).toArray() : [0, vesselLiquidSurfaceY(v), 0]));
    fluid = { normal: [0, 1, 0], offset_m: level[1], density_kg_m3: density * 1000, viscosity_Pas: (v.viscosity_mPa_s ?? 1) / 1000 };
    if (vortex) {
      const origin = scenePointToSI(vesselLocalToWorld(v, [0, 0, 0]));
      const scale = getVesselProfile(v.type, v.capacity_ml).sceneScale / 100;
      fluid.vortex = { axis_m: origin, coreRadius_m: vortex.coreRadius * scale, angularSpeed_rad_s: vortex.angularSpeed_rad_s,
        radius_m: vortex.radius * scale, centerHeight_m: origin[1] + vortex.offset * scale,
        amplitude_m: vortex.amplitude * scale, floorY_m: origin[1] + getVesselProfile(v.type, v.capacity_ml).baseY * scale };
    }
  }
  const transform = vesselBodyTransform(v);
  return { id: v.id, shapeKey: key, sealed: v.isSealed, colliders: definition.colliders, position_m: scenePointToSI(v.position), rotation, groups,
    cavity: { points: vesselInterior(v.type).points.map(([r, y]) => [r * transform.scale * U, (y * transform.scale + transform.offsetY) * U]) },
    saved: v.stockMotion?.grains, restore,
    fluid };
}
