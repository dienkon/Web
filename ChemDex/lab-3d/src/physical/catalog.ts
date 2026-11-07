import { VESSEL_PROFILES } from '../pour/physics/profiles';
import { contourRadius, vesselInterior } from '../science/vesselDimensions';
import { vesselContours, vesselOuterDimensions } from '../science/vesselContours';
import { vesselBodyTransform } from '../science/vesselScale';
import { METERS_PER_SCENE_UNIT as U } from '../science/sceneUnits';
import { vesselTareG } from '../core/labGeometry';
import { CHEMICAL_DATABASE } from '../data/chemicals';
import { PRECIPITATE_PROFILES } from '../simulation/core/SimulationConfig';
import { estimatedRecord, MATERIALS } from './materials';
import type { ColliderShape, PhysicalObjectDefinition, Vec3, ValidationRecord } from './types';

export const VESSEL_IDS = Object.keys(VESSEL_PROFILES).filter(id => id !== 'reagent_bottle');
export const AUXILIARY_IDS = ['test_tube_rack', 'tongs', 'retort_stand', 'retort_clamp', 'stopper', 'pneumatic_trough', 'hot_plate',
  'pipette', 'balance', 'thermometer', 'ph_meter', 'stirring_rod', 'spatula', 'sponge',
  'alcohol_burner', 'bunsen_burner', 'cork_stopper', 'reagent_bottle', 'amber_bottle'] as const;
export const EXPANSION_TOOLS = ['force_meter', 'pressure_sensor', 'pipette_bulb', 'water_bath', 'gas_collector'] as const;
export const SAMPLE_IDS = ['borosilicate', 'steel', 'aluminum', 'polyethylene', 'glycerol', 'silicone_oil', 'ice'] as const;
export const SHELL_SECTORS = 32; // Inscribed circular section error < 0.65%.

/** Wall wedges follow the SAME contour and affine scale as the rendered glass.
 * Every wedge is convex, but the collection leaves the reservoir hollow. */
export function vesselDefinition(type: string, capacity_ml = VESSEL_PROFILES[type]?.capacity_ml ?? 100): PhysicalObjectDefinition {
  if (!(capacity_ml > 0) || !Number.isFinite(capacity_ml) || !VESSEL_PROFILES[type]) throw new Error(`Invalid vessel: ${type}/${capacity_ml}`);
  const contours = vesselContours(type), interior = vesselInterior(type);
  const { scale, offsetY } = vesselBodyTransform({ type, capacity_ml });
  const length = scale * U, ySI = (y: number) => (y * scale + offsetY) * U;
  const levels = [...new Set([...contours.outer, ...interior.points].map(p => p[1]))].sort((a, b) => a - b);
  const colliders: ColliderShape[] = [];
  const outerBottom = vesselOuterDimensions(type).bottomY;
  const top = contours.outer.at(-1)![1];
  let shellVolume = 0, firstMoment = 0, inertiaY = 0, inertiaXOrigin = 0;
  for (let i = 1; i < levels.length; i++) {
    const low = Math.max(levels[i - 1], outerBottom), high = Math.min(levels[i], top);
    if (!(high > low)) continue;
    const inner = (y: number) => y < interior.floorY ? 0 : contourRadius(interior.points, y);
    const ro0 = contourRadius(contours.outer, low), ro1 = contourRadius(contours.outer, high);
    const ri0 = low < interior.floorY ? 0 : inner(low), ri1 = high <= interior.floorY ? 0 : inner(high);
    if (ri0 === 0 && ri1 === 0 && Math.max(ro0, ro1) > 0) {
      if (Math.abs(ro0 - ro1) < 1e-10) {
        colliders.push({ kind: 'cylinder', radius_m: ro0 * length, halfHeight_m: (high - low) * length / 2,
          center_m: [0, (ySI(low) + ySI(high)) / 2, 0] });
      } else {
      // One convex frustum for a solid bottom avoids coincident support
      // manifolds. This is the SAME polygonal solid, with no filled reservoir.
      const vertices_m: number[] = [];
      for (const [y, r] of [[low, ro0], [high, ro1]]) for (let sector = 0; sector < SHELL_SECTORS; sector++) {
        const theta = sector * 2 * Math.PI / SHELL_SECTORS;
        vertices_m.push(r * Math.cos(theta) * length, ySI(y), r * Math.sin(theta) * length);
      }
      colliders.push({ kind: 'hull', vertices_m });
      }
    } else {
    for (let sector = 0; sector < SHELL_SECTORS; sector++) {
      const vertices_m: number[] = [];
      for (const [y, ro, ri] of [[low, ro0, ri0], [high, ro1, ri1]]) {
        for (const r of [Math.min(ri, ro), ro]) for (const edge of [sector, sector + 1]) {
          const theta = edge * 2 * Math.PI / SHELL_SECTORS;
          vertices_m.push(r * Math.cos(theta) * length, ySI(y), r * Math.sin(theta) * length);
        }
      }
      if (Math.max(ro0 - ri0, ro1 - ri1) > 1e-8) colliders.push({ kind: 'hull', vertices_m });
    }
    }
    // Midpoint integration independent of tessellation for mass properties.
    for (let j = 0; j < 16; j++) {
      const y = low + (j + 0.5) * (high - low) / 16;
      const ro = contourRadius(contours.outer, y) * length, ri = Math.min(ro, inner(y) * length);
      const dv = Math.PI * (ro ** 2 - ri ** 2) * (high - low) * length / 16;
      const yy = ySI(y);
      shellVolume += dv; firstMoment += dv * yy;
      inertiaY += dv * (ro ** 2 + ri ** 2) / 2;
      inertiaXOrigin += dv * ((ro ** 2 + ri ** 2) / 4 + yy ** 2);
    }
  }
  const mass = vesselTareG(type) / 1000, centerY = firstMoment / Math.max(1e-20, shellVolume);
  const density = mass / Math.max(1e-20, shellVolume);
  const ix = Math.max(1e-9, density * inertiaXOrigin - mass * centerY ** 2);
  const maxRadius = Math.max(...contours.outer.map(([r]) => r)) * length;
  return {
    id: `vessel:${type}:${capacity_ml}`, name: type, category: 'vessel',
    materialId: ['crucible', 'evaporating_dish', 'mortar_pestle'].includes(type) ? 'porcelain' : type === 'wash_bottle' ? 'polyethylene' : 'borosilicate',
    mass_kg: mass, centerOfMass_m: [0, centerY, 0], inertia_kg_m2: [ix, Math.max(1e-9, density * inertiaY), ix],
    dimensions_m: [maxRadius * 2, (top - outerBottom) * length, maxRadius * 2], colliders,
    capacity_m3: capacity_ml * 1e-6, fixed: false, grip_m: [0, centerY, 0],
    ports: [{ id: 'mouth', position_m: [0, ySI(top), 0], radius_m: interior.points.at(-1)![0] * length, kind: 'liquid' }],
    behaviors: ['gravity', 'collision', 'grip', 'tilt', 'containment', 'transfer', 'thermal', 'damage'],
    validation: { ...estimatedRecord(`vessel:${type}`), scenarios: ['vessel_world_scale', 'hollow_collider', 'free_fall', 'mass_properties'],
      limitations: ['Tare is a legacy estimate; shell geometry follows the application, not a manufacturer.', 'Wedge tessellation and apparatus accessories need independent contact audit.'] },
  };
}

const TOOL_SPECS: Record<string, [string, Vec3, number]> = {
  retort_stand: ['steel', [0.13, 0.35, 0.10], 1.2], retort_clamp: ['steel', [0.11, 0.025, 0.025], 0.12],
  test_tube_rack: ['polyethylene', [0.20, 0.10, 0.09], 0.2], tongs: ['steel', [0.035, 0.20, 0.018], 0.08],
  pipette: ['borosilicate', [0.01, 0.22, 0.01], 0.015], burette: ['borosilicate', [0.015, 0.55, 0.015], 0.15],
  thermometer: ['borosilicate', [0.008, 0.15, 0.008], 0.01], ph_meter: ['polyethylene', [0.02, 0.16, 0.02], 0.08],
  stirring_rod: ['borosilicate', [0.006, 0.20, 0.006], 0.012], spatula: ['steel', [0.012, 0.16, 0.006], 0.02],
  sponge: ['sponge', [0.07, 0.025, 0.045], 0.008], stopper: ['rubber', [0.025, 0.025, 0.025], 0.015],
  cork_stopper: ['cork', [0.025, 0.025, 0.025], 0.003], balance: ['steel', [0.18, 0.05, 0.16], 0.8],
  hot_plate: ['porcelain', [0.15, 0.06, 0.15], 1.5], pneumatic_trough: ['polyethylene', [0.25, 0.12, 0.18], 0.4],
  alcohol_burner: ['borosilicate', [0.06, 0.08, 0.06], 0.12], bunsen_burner: ['steel', [0.07, 0.15, 0.07], 0.3],
  reagent_bottle: ['borosilicate', [0.06, 0.12, 0.06], 0.12], amber_bottle: ['borosilicate', [0.06, 0.12, 0.06], 0.12],
  force_meter: ['steel', [0.025, 0.13, 0.025], 0.06], pressure_sensor: ['steel', [0.06, 0.05, 0.03], 0.08],
  pipette_bulb: ['rubber', [0.035, 0.05, 0.035], 0.015], water_bath: ['steel', [0.22, 0.14, 0.18], 1.8],
  gas_collector: ['borosilicate', [0.035, 0.20, 0.035], 0.08],
};
export function toolDefinition(id: string): PhysicalObjectDefinition {
  const spec = TOOL_SPECS[id];
  if (!spec) throw new Error(`Unknown physical object ${id}`);
  const [materialId, d, mass] = spec;
  return { id: `tool:${id}`, name: id, category: 'tool', materialId, mass_kg: mass, centerOfMass_m: [0, 0, 0],
    inertia_kg_m2: [mass * (d[1] ** 2 + d[2] ** 2) / 12, mass * (d[0] ** 2 + d[2] ** 2) / 12, mass * (d[0] ** 2 + d[1] ** 2) / 12],
    dimensions_m: [...d], colliders: [{ kind: 'box', halfExtents_m: d.map(v => v / 2) as Vec3, center_m: [0, 0, 0] }],
    fixed: false, grip_m: [0, 0, 0], ports: [],
    behaviors: ['gravity', 'collision', 'grip', 'contact', 'measurement'],
    validation: { ...estimatedRecord(`tool:${id}`), limitations: ['Bounding box proxy: not contact-validated against rendered apparatus.', 'Dimensions, mass, calibration and mechanical interfaces need a selected instrument specification.'] } };
}
export function sampleDefinition(materialId: string, volume_m3 = 1e-6): PhysicalObjectDefinition {
  const m = MATERIALS[materialId];
  if (!m || !(volume_m3 > 0) || !Number.isFinite(volume_m3)) throw new Error('Invalid material sample');
  const edge = Math.cbrt(volume_m3), mass = m.density_kg_m3 * volume_m3;
  return { id: `sample:${materialId}:${volume_m3}`, name: m.name, category: 'sample', materialId, mass_kg: mass,
    centerOfMass_m: [0, 0, 0], inertia_kg_m2: [mass * edge ** 2 / 6, mass * edge ** 2 / 6, mass * edge ** 2 / 6],
    dimensions_m: [edge, edge, edge], colliders: [{ kind: 'box', halfExtents_m: [edge / 2, edge / 2, edge / 2], center_m: [0, 0, 0] }],
    fixed: false, grip_m: [0, 0, 0], ports: [], behaviors: ['gravity', 'buoyancy', 'drag', 'thermal', 'phase'], validation: m.validation };
}
export interface CoverageEntry { id: string; name: string; kind: string; behaviors: string[]; validation: ValidationRecord }
export function coverageInventory(): CoverageEntry[] {
  const objects = [...VESSEL_IDS.map(id => vesselDefinition(id)), ...AUXILIARY_IDS.map(toolDefinition),
    ...EXPANSION_TOOLS.map(toolDefinition), ...SAMPLE_IDS.map(id => sampleDefinition(id))];
  return [...objects.map(d => ({ id: d.id, name: d.name, kind: d.category, behaviors: d.behaviors, validation: d.validation })),
    ...CHEMICAL_DATABASE.map(c => ({ id: `stock:${c.formula}`, name: c.name_vi, kind: 'chemical',
      behaviors: ['phase', 'inventory', 'transport', 'appearance', 'chemistry'], validation: estimatedRecord(`stock:${c.formula}`) })),
    ...Object.entries(PRECIPITATE_PROFILES).map(([id, p]) => ({ id: `product:${id}`, name: id, kind: 'product',
      behaviors: ['precipitation', 'sedimentation', 'suspension', 'transport'], validation: {
        ...estimatedRecord(`product:${id}`), limitations: [`Transport model: ${p.modelBasis ?? 'uncalibrated_transport'}`, 'No independent experimental calibration.'] } })),
    ...['table', 'floor', 'cabinet', 'shelf', 'window', 'wall'].map(id => ({ id: `scene:${id}`, name: id, kind: 'environment',
      behaviors: ['fixed', 'support', 'collision'], validation: estimatedRecord(`scene:${id}`) }))];
}
