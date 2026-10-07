/**
 * CHEMDEX LAB — REACTION-SPECIFIC RUNTIME & CONTROLLER ARCHITECTURE
 * 
 * Defines the core types for reaction-specific controllers, runtime state,
 * local reaction zones, surface interaction hooks, and visual profiles.
 */

import { VesselState } from '../../types/chemistry';

export type ReactionZoneOrigin =
  | 'pourPoint'
  | 'liquidInterface'
  | 'solidSurface'
  | 'bottom'
  | 'heatedRegion'
  | 'airLiquidInterface'
  | 'metalSurface'
  | 'flameContact'
  | 'uniform';

export interface ReactionZone {
  origin: ReactionZoneOrigin;
  position: [number, number, number]; // World/vessel-local coordinates
  radius: number;
  direction?: [number, number, number];
}

export interface ReactionRuntime {
  reactionId: string;
  vesselId: string;

  // Normalized progress & rate
  progress: number; // 0..1
  reactionRate: number; // instantaneous kinetic rate (0..1+)
  temperature: number; // °C

  // Species tracking
  reactantAvailability: Record<string, number>;
  productFormation: Record<string, number>;

  // Activity rates driving physical sub-systems
  surfaceActivity: number; // 0..1
  gasGenerationRate: number; // bubbles/particles per second
  precipitateRate: number; // nucleation rate
  mixingIntensity: number; // advection/diffusion rate
  agitation: number; // external stirring/shake
  heatReleaseRate: number; // W or J/s

  // Optical & color state
  currentColor: string;
  targetColor: string;
  turbidity: number; // 0 (clear) .. 1 (opaque)

  // Timing
  elapsed: number; // seconds
  duration: number; // total expected duration in seconds

  // Custom controller state (e.g. sodium position, induction timer)
  customData: Record<string, any>;
}

export interface ReactionContext {
  vessel: VesselState;
  runtime: ReactionRuntime;
  dt: number;
  timeScale: number;

  // Helpers to interact with vessel environment
  addSurfaceImpulse: (normX: number, normZ: number, amplitude: number, radiusSigma?: number) => void;
  emitBurst: (position: [number, number, number], count: number, color?: string, speed?: number) => void;
  emitSparks: (position: [number, number, number], count: number, color?: string) => void;
  playSound: (soundId: string, options?: any) => void;
  recordContamination?: (tool: string, chemical: string) => void;
}

export interface ReactionVisualController {
  id: string;
  name: string;

  /**
   * Called once when the reaction is initiated in a vessel.
   */
  initialize(context: ReactionContext): void;

  /**
   * Updates internal reaction kinetics and physical state at fixed dt.
   */
  update(context: ReactionContext): void;

  /**
   * Returns current primary reaction zone (where chemistry takes place).
   */
  getReactionZone(context: ReactionContext): ReactionZone;

  /**
   * Emits or updates reaction-specific particles (bubbles, crystals, aerosols).
   */
  emitParticles?(context: ReactionContext): void;

  /**
   * Drives liquid surface disturbances, meniscus ripples, or vortex effects.
   */
  updateSurface?(context: ReactionContext): void;

  /**
   * Drives gas plumes, aerosols, or fuming vapors.
   */
  updateGas?(context: ReactionContext): void;

  /**
   * Drives liquid convective plumes, color propagation, or optical turbidity.
   */
  updateLiquid?(context: ReactionContext): void;

  /**
   * Drives solid dissolution, pitting, metal deposition, or crystal growth.
   */
  updateSolids?(context: ReactionContext): void;

  /**
   * Called when reaction completes to transfer persistent sediment, stains, or residues.
   */
  finalize(context: ReactionContext): void;
}

export interface ReactionVisualProfile {
  reactionId: string;
  name: string;
  category: 'neutralization' | 'precipitation' | 'gas' | 'redox' | 'complex' | 'combustion' | 'equilibrium' | 'thermal';
  controller: ReactionVisualController;
  typicalDuration: number;
  soundProfile: {
    ambientSound?: string;
    triggerEvents?: Array<{ atProgress: number; sound: string }>;
  };
  description_en: string;
  description_vi: string;
}
