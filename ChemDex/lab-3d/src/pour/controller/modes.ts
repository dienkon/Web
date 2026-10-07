/**
 * POURING OPERATIONAL MODES & SESSION STATE
 */

export type PourMode = 
  | 'HAND_TILT'      // Free tilt via 3D handle, 2D mobile dial, mouse wheel, or keys
  | 'ASSIST'         // Automated arc flight & tilt to target with hold-to-pour
  | 'STOCK_BOTTLE'   // Chemical stock bottle with stopper unseating and pouring
  | 'DROPPER'        // Indicator dropper pipette with discrete teardrop dispensing
  | 'SOLID'          // Spatula powder crystal tapping or tweezers metal strip addition
  | 'TABLE'          // Pouring onto workbench surface (waste or accidental spill)
  | 'ROD_GUIDED'     // Glass rod-guided pouring (standard safe protocol for acid dilution)
  | 'FUNNEL';        // Funnel-assisted narrow mouth filling

export type PourPhase = 
  | 'idle'
  | 'grabbing'
  | 'lifting'
  | 'tilting'
  | 'pouring'
  | 'dripping'
  | 'returning'
  | 'settling';

export interface PourSessionState {
  id: string;
  mode: PourMode;
  sourceId: string;
  targetId: string | null;
  tilt: number;               // Current tilt angle in radians
  targetTilt: number;         // Target tilt angle in radians
  lift: number;               // Vertical lift ratio 0..1
  requestedVolume_ml?: number;// For stock bottle / dropper / solid
  transferred_ml: number;     // Volume successfully transferred
  spilled_ml: number;         // Volume spilled onto table or rim
  flow_ml_s: number;          // Current instantaneous flow rate
  wallClinging: boolean;      // True if liquid is clinging to vessel wall
  aim: {
    landing: [number, number, number];
    kind: 'inside' | 'rim' | 'table';
  };
  assist: 'off' | 'low' | 'high';
  phase: PourPhase;
  startedAt: number;          // Simulation time in seconds
  chemical?: string;          // Chemical formula if stock bottle / dropper / solid
  solidMass_g?: number;       // Grams for solid chemicals
  sourcePos?: [number, number, number];
  sourceRotationZ?: number;
  initialSourcePos?: [number, number, number];
  initialFromVolume_ml?: number;
  initialToVolume_ml?: number;
  mixingZone?: {
    active: boolean;
    point: [number, number, number];
    radius: number;
    intensity: number;
    color: string;
  };
}
