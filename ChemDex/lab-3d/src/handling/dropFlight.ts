import { GRAVITY_M_S2, METERS_PER_SCENE_UNIT } from '../science/sceneUnits';

export type DropPoint = [number, number, number];
export interface VerticalDropFlight {
  start: DropPoint;
  target: DropPoint;
  gravity: number;
  flightTime: number;
}

// These outlets are also used to place the rendered capillary end faces.
export const STOCK_DROPPER_TIP_LOCAL_Y = -0.875;
export const AUTO_DROPPER_TIP_LOCAL_Y = -0.61;
export const AUTO_DROPPER_SCALE = 0.6;
export const HANDHELD_PIPETTE_TIP_LOCAL_Y = -1.025;

/** Snapshot the outlet and receiving surface once. Rendering and material
 * arrival then share a vertical path even when the receiver's fill changes. */
export function verticalDropFlight(start: DropPoint, surfaceY: number,
  metersPerUnit = METERS_PER_SCENE_UNIT): VerticalDropFlight {
  const gravity = GRAVITY_M_S2 / metersPerUnit;
  const target: DropPoint = [start[0], Math.min(start[1], surfaceY), start[2]];
  return { start: [...start], target, gravity, flightTime: Math.sqrt(2 * (start[1] - target[1]) / gravity) };
}

export function dropFlightPosition(flight: VerticalDropFlight, age: number): DropPoint {
  const time = Math.max(0, Math.min(flight.flightTime, age));
  return [flight.start[0], Math.max(flight.target[1], flight.start[1] - 0.5 * flight.gravity * time * time), flight.start[2]];
}

export function dropRadius(volume_ml: number, metersPerUnit = METERS_PER_SCENE_UNIT): number {
  return Number.isFinite(volume_ml) && volume_ml > 0
    ? Math.cbrt(3 * volume_ml * 1e-6 / (4 * Math.PI)) / metersPerUnit : 0;
}
