/**
 * CHEMDEX LAB - Apparatus Tubing & Pneumatic Flow Graph (K6.3 & K6.4)
 * Graph edge carrying gas and liquid between apparatuses.
 * Features:
 * - Sealed vs vented pressure calculation
 * - Pneumatic underwater bubbling
 * - Thermal contraction suck-back when cooling (causes cold liquid to rush into heated flask)
 */

export interface TubingNode {
  id: string;
  type: string;
  position: [number, number, number];
  temperature_c: number;
  internalPressure_atm: number;
  liquidVolume_ml: number;
  substances: string[];
}

export interface TubingConnection {
  id: string;
  sourceVesselId: string;
  targetVesselId: string;
  isSubmergedInTarget: boolean; // Tube end is beneath liquid surface
  length_cm: number;
  gasFlowRate_ml_s: number;
  liquidSuckBackRate_ml_s: number;
  isSuckingBack: boolean;
}

export class TubingNetwork {
  private connections: Map<string, TubingConnection> = new Map();

  public connect(
    sourceId: string, 
    targetId: string, 
    isSubmerged: boolean = false,
    length_cm: number = 30
  ): TubingConnection {
    const id = `tube_${sourceId}_${targetId}`;
    const conn: TubingConnection = {
      id,
      sourceVesselId: sourceId,
      targetVesselId: targetId,
      isSubmergedInTarget: isSubmerged,
      length_cm,
      gasFlowRate_ml_s: 0,
      liquidSuckBackRate_ml_s: 0,
      isSuckingBack: false
    };
    this.connections.set(id, conn);
    return conn;
  }

  public disconnect(id: string): void {
    this.connections.delete(id);
  }

  public getConnections(): TubingConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Deterministic step for gas transfer and thermal contraction suck-back.
   */
  public update(
    dt: number,
    nodes: Record<string, TubingNode>,
    prevTemperatures: Record<string, number>
  ): {
    gasBubblesSpawned: Array<{ pos: [number, number, number]; rate: number }>;
    suckBackTransfers: Array<{ fromId: string; toId: string; volume_ml: number }>;
    thermalShockRisk: Array<{ vesselId: string; dT: number }>;
  } {
    const gasBubblesSpawned: Array<{ pos: [number, number, number]; rate: number }> = [];
    const suckBackTransfers: Array<{ fromId: string; toId: string; volume_ml: number }> = [];
    const thermalShockRisk: Array<{ vesselId: string; dT: number }> = [];

    for (const conn of this.connections.values()) {
      const source = nodes[conn.sourceVesselId];
      const target = nodes[conn.targetVesselId];
      if (!source || !target) continue;

      const prevT = prevTemperatures[conn.sourceVesselId] ?? source.temperature_c;
      const coolingRate = (prevT - source.temperature_c) / Math.max(0.001, dt); // K/s

      // 1. Gas generation & displacement from source into target
      const hasGasGeneration = source.internalPressure_atm > 1.05;
      if (hasGasGeneration) {
        const deltaP = source.internalPressure_atm - Math.max(1.0, target.internalPressure_atm);
        if (deltaP > 0) {
          conn.gasFlowRate_ml_s = deltaP * 15.0; // mL/s
          conn.isSuckingBack = false;

          // If submerged in liquid, produces bubbles!
          if (conn.isSubmergedInTarget) {
            gasBubblesSpawned.push({
              pos: target.position,
              rate: conn.gasFlowRate_ml_s
            });
          }
        }
      }

      // 2. SUCK-BACK ON COOLING (Classic lab hazard: P = nRT/V drops as gas contracts)
      // When flame is removed from heated source vessel and delivery tube end is underwater:
      if (coolingRate > 1.5 && source.temperature_c < prevT && conn.isSubmergedInTarget) {
        conn.isSuckingBack = true;
        // Suck-back rate proportional to cooling rate
        const suckRate = Math.min(25.0, coolingRate * 1.8);
        const suckedVolume_ml = Math.min(target.liquidVolume_ml, suckRate * dt);

        if (suckedVolume_ml > 0.01) {
          conn.liquidSuckBackRate_ml_s = suckRate;
          suckBackTransfers.push({
            fromId: target.id,
            toId: source.id,
            volume_ml: suckedVolume_ml
          });

          // If cold liquid reaches hot source flask (T > 80 °C) -> thermal shock risk!
          if (source.temperature_c > 80) {
            thermalShockRisk.push({
              vesselId: source.id,
              dT: source.temperature_c - target.temperature_c
            });
          }
        }
      } else {
        conn.isSuckingBack = false;
        conn.liquidSuckBackRate_ml_s = 0;
      }
    }

    return { gasBubblesSpawned, suckBackTransfers, thermalShockRisk };
  }
}

export const tubingNetwork = new TubingNetwork();
