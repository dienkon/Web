/**
 * CHEMDEX LAB - Puddle & Spill Physics (K4.3)
 * Viscous gravity spreading on workbench, edge dripping to floor,
 * evaporation, residue stains, and puddle-puddle chemical reactions.
 */

import { TABLE_HALF_WIDTH, TABLE_HALF_DEPTH } from '../physicsLite/RigidBodyLite';

export interface PuddleState {
  id: string;
  position: [number, number, number];
  volume_ml: number;
  initialVolume_ml: number;
  radius: number;
  maxRadius: number;
  color: string;
  substances: string[];
  viscosity: number; // 1.0 = water, ~1.4 = conc acid, ~5.0 = glycerol
  isDrippingOffEdge: boolean;
  evaporatedFraction: number; // 0..1
  stainLeft: boolean;
}

export class PuddleSimulator {
  private puddles: Map<string, PuddleState> = new Map();

  public addPuddle(
    id: string,
    pos: [number, number, number],
    volume_ml: number,
    substances: string[],
    color: string = '#38bdf8',
    viscosity: number = 1.0
  ): PuddleState {
    const maxRadius = Math.min(1.8, 0.2 + Math.sqrt(volume_ml) * 0.08);
    const puddle: PuddleState = {
      id,
      position: [...pos],
      volume_ml,
      initialVolume_ml: volume_ml,
      radius: 0.15,
      maxRadius,
      color,
      substances: [...substances],
      viscosity,
      isDrippingOffEdge: false,
      evaporatedFraction: 0,
      stainLeft: false
    };

    this.puddles.set(id, puddle);
    return puddle;
  }

  public getPuddles(): PuddleState[] {
    return Array.from(this.puddles.values());
  }

  /**
   * Updates puddle spreading, evaporation, and edge dripping.
   * Deterministic integration step dt.
   */
  public update(dt: number, ambientTemp_c: number = 25): {
    drippingPuddles: PuddleState[];
    mergedReactionPuddles: Array<{ idA: string; idB: string; substances: string[] }>;
  } {
    const drippingPuddles: PuddleState[] = [];
    const mergedReactionPuddles: Array<{ idA: string; idB: string; substances: string[] }> = [];

    const list = Array.from(this.puddles.values());

    for (let i = 0; i < list.length; i++) {
      const p = list[i];

      // 1. Viscous Spreading: r(t) expands towards maxRadius
      if (p.radius < p.maxRadius) {
        const spreadRate = 0.25 / Math.max(0.5, p.viscosity);
        p.radius = Math.min(p.maxRadius, p.radius + spreadRate * dt);
      }

      // 2. Edge dripping: check if puddle edge touches table perimeter
      const touchesEdgeX = Math.abs(p.position[0]) + p.radius >= TABLE_HALF_WIDTH - 0.2;
      const touchesEdgeZ = Math.abs(p.position[2]) + p.radius >= TABLE_HALF_DEPTH - 0.2;

      if (touchesEdgeX || touchesEdgeZ) {
        p.isDrippingOffEdge = true;
        // Puddle loses volume as it drips over table edge
        const dripRate_ml_s = 2.0;
        p.volume_ml = Math.max(0, p.volume_ml - dripRate_ml_s * dt);
        drippingPuddles.push(p);
      }

      // 3. Ambient Evaporation
      if (p.volume_ml > 0) {
        const evapRate = 0.02 * (ambientTemp_c / 25);
        p.volume_ml = Math.max(0, p.volume_ml - evapRate * dt);
        p.evaporatedFraction = 1 - (p.volume_ml / Math.max(0.1, p.initialVolume_ml));
        if (p.volume_ml <= 0.05) {
          p.stainLeft = true;
        }
      }

      // 4. Overlap & Puddle-Puddle Interaction
      for (let j = i + 1; j < list.length; j++) {
        const other = list[j];
        const dist = Math.hypot(p.position[0] - other.position[0], p.position[2] - other.position[2]);
        if (dist <= p.radius + other.radius) {
          // Puddles overlap: collect substances for kernel reaction
          mergedReactionPuddles.push({
            idA: p.id,
            idB: other.id,
            substances: Array.from(new Set([...p.substances, ...other.substances]))
          });
        }
      }
    }

    return { drippingPuddles, mergedReactionPuddles };
  }

  public clearPuddle(id: string): void {
    this.puddles.delete(id);
  }

  public clearAll(): void {
    this.puddles.clear();
  }
}

export const puddleSimulator = new PuddleSimulator();
