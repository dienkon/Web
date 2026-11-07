import { Euler, Quaternion } from 'three';
import type { VesselState } from '../types/chemistry';
import { vesselDefinition, VESSEL_IDS } from './catalog';
import { scenePointToSI } from '../science/sceneUnits';
import { liquidLevelForVolume, vesselInterior } from '../science/vesselDimensions';
import { vesselBodyTransform } from '../science/vesselScale';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { calculateVesselMass } from '../engine/interactionEngine';
import type { PhysicalBodyInput, PhysicalObjectDefinition, Quat } from './types';
import { vesselTareG } from '../core/labGeometry';

const definitions = new Map<string, PhysicalObjectDefinition>();
export function inputFromVessel(v: VesselState): PhysicalBodyInput | null {
  if (v.isShattered || v.id.startsWith('lesson_vessel_') || !VESSEL_IDS.includes(v.type)) return null;
  const key = `${v.type}:${v.capacity_ml}:${v.tare_g ?? ''}`;
  let definition = definitions.get(key);
  if (!definition) {
    definition = vesselDefinition(v.type, v.capacity_ml);
    const mass = vesselTareG(v.type, v.tare_g) / 1000, ratio = mass / definition.mass_kg;
    definition = { ...definition, mass_kg: mass, inertia_kg_m2: definition.inertia_kg_m2.map(i => i * ratio) as [number, number, number] };
    definitions.set(key, definition);
  }
  const q = new Quaternion().setFromEuler(new Euler(0, v.rotationY ?? 0, v.rotationZ ?? 0, 'YXZ'));
  const transform = vesselBodyTransform(v), floor = vesselInterior(v.type).floorY;
  const level = liquidLevelForVolume(v.type, v.volume_ml, v.capacity_ml);
  // Quasi-static bulk COM; explicitly estimated until a coupled slosh solver.
  const contentsY = ((floor + level) / 2 * transform.scale + transform.offsetY) * METERS_PER_SCENE_UNIT;
  return { id: v.id, definition, position_m: scenePointToSI(v.position), rotation: v.physicalMotion?.rotation ?? q.toArray() as Quat,
    velocity_m_s: v.physicalMotion?.velocity_m_s, angularVelocity_rad_s: v.physicalMotion?.angularVelocity_rad_s,
    contentsMass_kg: Math.max(0, calculateVesselMass(v) / 1000 - definition.mass_kg), contentsCOM_m: [0, contentsY, 0],
    fluid: v.volume_ml > 0 ? { volume_m3: v.volume_ml * 1e-6, density_kg_m3: (v.density_g_ml ?? 1) * 1000,
      viscosity_Pas: (v.viscosity_mPa_s ?? 1) * 0.001, vesselType: v.type, capacity_ml: v.capacity_ml } : undefined,
    temperature_K: v.temperature_c + 273.15, locked: v.isLocked };
}
