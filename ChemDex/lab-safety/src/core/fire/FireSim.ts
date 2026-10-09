import { FireClass, Agent, EFFICACY, SideEffect } from './FireClasses';
import { SmokeLayerState, createSmokeLayer, updateSmokeLayer } from './SmokeModel';
import { ExtinguisherState, createExtinguisher, pullPin, dischargeExtinguisher } from './ExtinguisherModel';

export interface FireCell {
  id: string;
  x: number;
  y: number;
  z: number;
  intensity: number; // 0..1
  fuelLeft: number; // 0..1
  heat: number;
}

export interface FireSource {
  id: string;
  fireClass: FireClass;
  origin: [number, number, number];
  cells: FireCell[];
  isEscalated: boolean;
  timeAlive: number;
}

export class FireSimulation {
  public sources: FireSource[] = [];
  public smoke: SmokeLayerState = createSmokeLayer();
  public currentExtinguisher: ExtinguisherState | null = null;
  public onMistakeTriggered?: (mistakeId: string, details?: string) => void;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.sources = [];
    this.smoke = createSmokeLayer();
    this.currentExtinguisher = null;
  }

  /**
   * Spawns an initial fire scenario
   */
  public spawnFire(id: string, fireClass: FireClass, origin: [number, number, number]): FireSource {
    const cells: FireCell[] = [
      {
        id: `${id}_0`,
        x: origin[0],
        y: origin[1],
        z: origin[2],
        intensity: 0.8,
        fuelLeft: 1.0,
        heat: 1.0,
      },
    ];

    const source: FireSource = {
      id,
      fireClass,
      origin,
      cells,
      isEscalated: false,
      timeAlive: 0,
    };

    this.sources.push(source);
    return source;
  }

  public equipExtinguisher(agent: Agent): void {
    this.currentExtinguisher = createExtinguisher(`ext_${agent}`, agent);
  }

  public pullPin(): boolean {
    if (!this.currentExtinguisher) return false;
    return pullPin(this.currentExtinguisher);
  }

  /**
   * Fixed 20 Hz simulation step
   */
  public update(dt: number): void {
    let activeFires = 0;

    for (const source of this.sources) {
      let sourceActive = false;
      source.timeAlive += dt;

      // Check escalation (e.g. >20s unattended)
      if (source.timeAlive > 20 && !source.isEscalated) {
        source.isEscalated = true;
      }

      for (const cell of source.cells) {
        if (cell.intensity > 0.05 && cell.fuelLeft > 0) {
          sourceActive = true;
          // Natural fuel consumption
          cell.fuelLeft = Math.max(0, cell.fuelLeft - 0.01 * dt);
          if (cell.fuelLeft <= 0) {
            cell.intensity = Math.max(0, cell.intensity - 0.2 * dt);
          }
        } else {
          cell.intensity = 0;
        }
      }

      if (sourceActive) activeFires++;
    }

    updateSmokeLayer(this.smoke, activeFires, dt);
  }

  /**
   * Discharges current extinguisher towards targeted point in 3D
   */
  public dischargeAtTarget(
    targetPos: [number, number, number],
    isAimingAtBase: boolean,
    sweepScore: number,
    dt: number
  ): { success: boolean; sideEffect?: SideEffect } {
    if (!this.currentExtinguisher) return { success: false };

    if (!this.currentExtinguisher.pinPulled) {
      if (this.onMistakeTriggered) {
        this.onMistakeTriggered('NO_PIN_PULLED', 'Chưa rút chốt kẹp chì!');
      }
      return { success: false };
    }

    const { discharged } = dischargeExtinguisher(this.currentExtinguisher, dt);
    if (!discharged) return { success: false };

    const agent = this.currentExtinguisher.agent;

    for (const source of this.sources) {
      const efficacy = EFFICACY[source.fireClass][agent];

      // Handle severe mistakes (e.g. water on Class B or Class C)
      if (efficacy.k === 0 && efficacy.side) {
        if (efficacy.side === 'SPREAD_BURNING_LIQUID') {
          // Fire flares up and spreads
          for (const cell of source.cells) {
            cell.intensity = Math.min(1.0, cell.intensity + 0.3);
          }
          if (this.onMistakeTriggered) {
            this.onMistakeTriggered('WRONG_EXTINGUISHER', 'Nước làm bùng cháy chất lỏng!');
          }
        } else if (efficacy.side === 'ELECTRIC_SHOCK_RISK') {
          if (this.onMistakeTriggered) {
            this.onMistakeTriggered('WRONG_EXTINGUISHER_ELECTRICAL', 'Nguy cơ giật điện cao áp!');
          }
        }
        return { success: false, sideEffect: efficacy.side };
      }

      // Compute PASS factors
      const aimFactor = isAimingAtBase ? 1.0 : 0.25;
      if (!isAimingAtBase && this.onMistakeTriggered) {
        this.onMistakeTriggered('AIM_AT_FLAME_NOT_BASE', 'Cần ngắm vào GỐC lửa!');
      }

      const sweepFactor = Math.min(1.0, Math.max(0.4, 0.4 + 0.6 * sweepScore));
      const suppressionRate = efficacy.k * aimFactor * sweepFactor * 0.4 * dt;

      for (const cell of source.cells) {
        // Distance check between spray target and fire cell
        const dx = cell.x - targetPos[0];
        const dy = cell.y - targetPos[1];
        const dz = cell.z - targetPos[2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 0.64) {
          // within 0.8m hit radius
          cell.intensity = Math.max(0, cell.intensity - suppressionRate);
          cell.heat = Math.max(0, cell.heat - suppressionRate);
        }
      }
    }

    return { success: true };
  }

  public areAllFiresExtinguished(): boolean {
    if (this.sources.length === 0) return true;
    for (const s of this.sources) {
      for (const c of s.cells) {
        if (c.intensity > 0.05) return false;
      }
    }
    return true;
  }
}

export const fireSimulation = new FireSimulation();
