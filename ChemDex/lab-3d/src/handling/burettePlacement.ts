import { LAB_GEOMETRY } from '../core/labGeometry';
import { constrainToolPosition, type ToolPosition } from './toolDockState';

export const BURETTE_HOME: ToolPosition = [0, 1, 0];
export const BURETTE_NOZZLE_LOCAL_Y = -0.1;
export const BURETTE_RIM_CLEARANCE = 0.25;
export const BURETTE_MAX_ANCHOR_Y = 4.8;
export const BURETTE_POST_Z = -2.35;
export const BURETTE_BASE_SIZE: ToolPosition = [1.5, 0.16, 1.06];
export const BURETTE_MIN_Z = Math.ceil(
  (-LAB_GEOMETRY.tableHalfDepth_scene - BURETTE_POST_Z + BURETTE_BASE_SIZE[2] / 2) * 10
) / 10;

export function constrainBurettePosition(position: ToolPosition): ToolPosition {
  return constrainToolPosition(position[0],
    Math.max(BURETTE_HOME[1], Math.min(BURETTE_MAX_ANCHOR_Y, position[1])), Math.max(BURETTE_MIN_Z, position[2]));
}

const POST_TOP = 3.55;
/** The clamp and the glass share an anchor. The underside of the stand stays
 * on the workbench as that anchor is raised to clear taller glassware. */
export function buretteStandSupport(anchorY: number) {
  const baseBottom = LAB_GEOMETRY.tableTop_scene - anchorY;
  const baseHeight = BURETTE_BASE_SIZE[1];
  const postBottom = baseBottom + baseHeight - 0.01;
  return {
    baseCenterY: baseBottom + baseHeight / 2,
    postCenterY: (postBottom + POST_TOP) / 2,
    postHeight: POST_TOP - postBottom,
    capCenterY: POST_TOP,
  };
}
