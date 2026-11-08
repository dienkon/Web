import type { ColliderShape, Quat, Vec3 } from './types';

export interface StockGrainPose {
  id: string; formula: string; mass_g: number; scale_m: number;
  position_m: Vec3; rotation: Quat; velocity_m_s: Vec3; angularVelocity_rad_s: Vec3;
  sleeping: boolean; powder: boolean;
  /** True only when the contact solver reports a supporting contact. */
  contacting?: boolean;
}
export interface StockContactBirth {
  mass_g: number; position_m: Vec3; rotation: Quat; velocity_m_s: Vec3; angularVelocity_rad_s: Vec3;
}
export interface StockContactReceipt { id: number; vesselId: string; formula: string; resolved: boolean; pieces: StockContactBirth[] }
export interface StockGroupInput {
  formula: string; mass_g: number; density_kg_m3: number; powder: boolean;
  vertices: number[]; unitVolume: number; seed: { position_m: Vec3; rotation: Quat }[];
}
export interface StockContainerInput {
  id: string; shapeKey: string; colliders: ColliderShape[]; position_m: Vec3; rotation: Quat;
  sealed?: boolean;
  groups: StockGroupInput[]; saved?: StockGrainPose[]; restore: boolean;
  cavity?: { points: [number, number][] };
  fluid?: { normal: Vec3; offset_m: number; density_kg_m3: number; viscosity_Pas: number };
}
export interface StockSpillPose extends StockGrainPose { vesselId: string; group?: StockGroupInput; restore?: boolean }
export interface StockWorldInput { containers: StockContainerInput[]; contacts: StockContactReceipt[]; spills: StockSpillPose[] }
export interface StockBoundaryFrame {
  seconds: number;
  containers: { id: string; position_m: Vec3; rotation: Quat }[];
}
export interface StockWorldSnapshot {
  tick: number; grains: { vesselId: string; pose: StockGrainPose }[]; appliedContacts: number[];
  escapes: { vesselId: string; pose: StockGrainPose }[];
  captures: { vesselId: string; pose: StockGrainPose }[];
  reactions: { vesselId: string; impulse_Ns: Vec3 }[];
}
