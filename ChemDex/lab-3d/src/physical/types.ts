export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type ValidationStatus = 'unverified' | 'estimated' | 'analytic' | 'experimental';
export type MatterPhase = 'solid' | 'liquid' | 'gas';
export type Dispersion = 'bulk' | 'solution' | 'suspension' | 'gel' | 'foam' | 'sediment';
export type MatterLocation = 'vessel' | 'tool' | 'flight' | 'wall' | 'spill' | 'escaped' | 'waste';
export interface ValidationRecord {
  id: string; status: ValidationStatus; sourceUrls: string[]; domain: string;
  scenarios: string[]; limitations: string[]; relativeTolerance?: number;
}
export interface MaterialPropertyModel {
  id: string; name: string; density_kg_m3: number; heatCapacity_J_kgK: number;
  conductivity_W_mK: number; viscosity_Pas?: number; surfaceTension_N_m?: number;
  expansion_K1?: number; melting_K?: number; latentFusion_J_kg?: number;
  friction: number; restitution: number; color: string; validation: ValidationRecord;
}
export type ColliderShape =
  | { kind: 'box'; halfExtents_m: Vec3; center_m: Vec3 }
  | { kind: 'ball'; radius_m: number; center_m: Vec3 }
  | { kind: 'hull'; vertices_m: number[] };
export interface PhysicalObjectDefinition {
  id: string; name: string; category: 'vessel' | 'tool' | 'apparatus' | 'sample' | 'environment';
  materialId: string; mass_kg: number; centerOfMass_m: Vec3;
  inertia_kg_m2: Vec3; dimensions_m: Vec3; colliders: ColliderShape[];
  capacity_m3?: number; fixed: boolean; grip_m: Vec3;
  ports: { id: string; position_m: Vec3; radius_m: number; kind: 'gas' | 'liquid' | 'clamp' }[];
  behaviors: string[]; validation: ValidationRecord;
}
export interface PhysicalObjectState {
  id: string; definitionId: string; position_m: Vec3; rotation: Quat;
  velocity_m_s: Vec3; angularVelocity_rad_s: Vec3; temperature_K: number;
  contacts: string[]; attachments: string[]; damage: 'intact' | 'cracked' | 'broken';
  held: boolean; sleeping: boolean;
}
export interface MatterParcel {
  id: string; ownerId: string; species: string; phase: MatterPhase; dispersion: Dispersion;
  location: MatterLocation; mass_kg: number; amount_mol: number;
  enthalpy_J: number; charge_mol: number; elements_mol: Record<string, number>;
}
export interface MatterInventory { revision: number; parcels: MatterParcel[] }
export interface PhysicalBodyInput {
  id: string; definition: PhysicalObjectDefinition; position_m: Vec3; rotation: Quat;
  contentsMass_kg: number; contentsCOM_m?: Vec3; temperature_K: number; locked: boolean;
  velocity_m_s?: Vec3; angularVelocity_rad_s?: Vec3;
  fluid?: { volume_m3: number; density_kg_m3: number; viscosity_Pas: number; vesselType: string; capacity_ml: number };
}
export type SimulationCommand = { sequence: number; tick: number } & (
  | { kind: 'sync'; bodies: PhysicalBodyInput[] }
  | { kind: 'impulse'; id: string; impulse_Ns: Vec3 }
  | { kind: 'hold'; id: string; target_m: Vec3; rotation: Quat }
  | { kind: 'release'; id: string }
  | { kind: 'attach'; id: string; otherId: string; anchor_m: Vec3; otherAnchor_m: Vec3 }
  | { kind: 'detach'; id: string }
  | { kind: 'advance'; seconds: number; paused: boolean; timeScale: number }
);
export interface SimulationSnapshot {
  version: 1; tick: number; time_s: number; seed: number; sequence: number;
  objects: PhysicalObjectState[]; impacts: { id: string; energy_J: number; surface: 'bench' | 'stone_floor' }[];
  backlog_s: number;
  fluidForces?: { id: string; ownerId: string; displaced_m3: number; buoyancy_N: number }[];
}
export interface PhysicalSave {
  version: 1; snapshot: SimulationSnapshot; inventory: MatterInventory;
  definitions: PhysicalObjectDefinition[];
}
