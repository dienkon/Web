import * as THREE from 'three';
import { PhysicalBubble, BoilingStage } from '../core/SimulationTypes';
import { DEFAULT_SIMULATION_CONFIG } from '../core/SimulationConfig';
import { ConvectionSystem } from './ConvectionSystem';
import { vfxBus } from '../../vfx/bus';

export interface BoilingSimulationParams {
  temp_c: number;
  boilingPoint_c: number;
  heatPower_W: number;
  viscosity_mPa_s: number;
  radius: number;
  liquidBottomY: number;
  surfaceY: number;
  boilingStage: BoilingStage;
  boilingIntensity: number;
  agitation?: number;
  reactionGasRate?: number;
}

export class BoilingSystem {
  public bubbles: PhysicalBubble[] = [];
  public maxBubbles: number;
  private spawnTimer = 0;
  private nextId = 1;

  constructor(maxBubbles = 90) {
    this.maxBubbles = maxBubbles;
    this.bubbles = [];
  }

  public reset(): void {
    this.bubbles = [];
    this.spawnTimer = 0;
  }

  public update(dt: number, params: BoilingSimulationParams): void {
    if (dt <= 0) return;

    const {
      temp_c,
      boilingPoint_c,
      heatPower_W,
      viscosity_mPa_s,
      radius,
      liquidBottomY,
      surfaceY,
      boilingStage,
      boilingIntensity,
      agitation = 0
    } = params;

    const height = Math.max(0.05, surfaceY - liquidBottomY);

    // 1. DETERMINE SPAWN RATE ACCORDING TO BOILING STAGE
    let spawnRate = 0;
    let baseBubbleSize = 0.012;

    switch (boilingStage) {
      case 'COLD_STABLE':
      case 'WARMING_CONVECTION':
        spawnRate = 0; // Absolute stillness, no fake boiling!
        break;

      case 'MICROBUBBLE_NUCLEATION':
        // Rare tiny microbubbles forming at bottom hotspots (1 to 4/sec)
        spawnRate = 1.5 + (temp_c - 80) * 0.35;
        baseBubbleSize = 0.008 + Math.random() * 0.005; // tiny micro-nuclei
        break;

      case 'BOILING_ONSET':
        spawnRate = 8 + boilingIntensity * 12;
        baseBubbleSize = 0.012 + Math.random() * 0.008;
        break;

      case 'ACTIVE_BOIL':
        spawnRate = 22 + boilingIntensity * 28;
        baseBubbleSize = 0.015 + Math.random() * 0.012;
        break;

      case 'INTENSE_ROLLING_BOIL':
        spawnRate = 45 + boilingIntensity * 40;
        baseBubbleSize = 0.018 + Math.random() * 0.016;
        break;
    }

    // Boost slightly if agitation/stirring is active
    if (agitation > 0.05) {
      spawnRate *= (1.0 + agitation * 0.4);
    }

    // Add chemical reaction gas effervescence rate
    if (params.reactionGasRate && params.reactionGasRate > 0) {
      spawnRate += params.reactionGasRate;
    }

    // 2. SPAWN NEW BUBBLES
    if (spawnRate > 0 && this.bubbles.length < this.maxBubbles) {
      this.spawnTimer += dt * spawnRate;
      while (this.spawnTimer >= 1.0 && this.bubbles.length < this.maxBubbles) {
        this.spawnTimer -= 1.0;

        // Nucleate at bottom heated zone with controlled stochastic distribution
        const angle = Math.random() * Math.PI * 2;
        // Biased toward center where heat concentration is highest
        const rRatio = Math.pow(Math.random(), 0.75) * 0.78;
        const r = rRatio * radius;

        const bx = Math.cos(angle) * r;
        const bz = Math.sin(angle) * r;
        const by = liquidBottomY + Math.random() * (height * 0.08); // Right at heated floor!

        const baseRad = baseBubbleSize * (0.8 + Math.random() * 0.4);

        this.bubbles.push({
          id: this.nextId++,
          x: bx,
          y: by,
          z: bz,
          baseRadius: baseRad,
          radius: baseRad,
          vx: (Math.random() - 0.5) * 0.04,
          vy: 0.35 + Math.random() * 0.3,
          vz: (Math.random() - 0.5) * 0.04,
          buoyancy: 1.2 + Math.random() * 0.6,
          growthRate: 0.45 + Math.random() * 0.4,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 8.0 + Math.random() * 4.0,
          wobbleAmp: 0.002 + Math.random() * 0.003,
          aspectRatio: 1.0,
          life: 0,
          maxLife: 4.5,
          opacity: 0.88,
          temperature: temp_c,
          isPopping: false,
          popProgress: 0,
          merged: false
        });
      }
    }

    // 3. STEP PHYSICAL SIMULATION FOR ALL BUBBLES
    const activeBubbles: PhysicalBubble[] = [];
    const count = this.bubbles.length;

    for (let i = 0; i < count; i++) {
      const b = this.bubbles[i];

      // Handling pop sequence at surface
      if (b.isPopping) {
        b.popProgress += dt * 7.5; // Rapid pop sequence across ~0.13s (7-8 frames)
        b.radius = b.baseRadius * (1.35 + b.popProgress * 0.65);
        b.opacity = Math.max(0, 0.85 * (1.0 - b.popProgress));

        if (b.popProgress >= 1.0) {
          // Finished pop
          continue;
        }
        activeBubbles.push(b);
        continue;
      }

      b.life += dt;
      if (b.life >= b.maxLife) {
        continue;
      }

      // Check sub-boiling microbubble collapse
      // In sub-cooled boiling (80-92°C), microbubbles condensing as they rise into cooler upper fluid
      if (boilingStage === 'MICROBUBBLE_NUCLEATION' && b.y > liquidBottomY + height * 0.45) {
        if (Math.random() < 0.08) {
          // Bubble collapsed and re-dissolved back into liquid
          continue;
        }
      }

      // Sample convective circulation current
      const [cvx, cvy, cvz] = ConvectionSystem.sampleVelocity(b.x, b.y, b.z, {
        temp_c,
        ambientTemp_c: 25.0,
        heatPower_W,
        viscosity_mPa_s,
        radius,
        liquidBottomY,
        surfaceY
      });

      // Buoyant acceleration (Stokes/Archimedes reduced by viscosity)
      const buoyancyAccel = (DEFAULT_SIMULATION_CONFIG.bubbleBuoyancyAccel_m_s2 * b.buoyancy) / Math.max(0.4, viscosity_mPa_s);
      b.vy += buoyancyAccel * dt;

      // Influence by convection fluid velocity
      b.vx = THREE.MathUtils.lerp(b.vx, cvx + (Math.random() - 0.5) * 0.02, dt * 3.5);
      b.vy = THREE.MathUtils.lerp(b.vy, b.vy + cvy * 0.5, dt * 2.0);
      b.vz = THREE.MathUtils.lerp(b.vz, cvz + (Math.random() - 0.5) * 0.02, dt * 3.5);

      // Hydrodynamic wobble oscillation
      b.wobblePhase += dt * b.wobbleSpeed;
      const wobbleOffsetX = Math.sin(b.wobblePhase) * b.wobbleAmp;
      const wobbleOffsetZ = Math.cos(b.wobblePhase * 0.8) * b.wobbleAmp;

      // Position integration
      b.x += (b.vx + wobbleOffsetX) * dt;
      b.y += b.vy * dt;
      b.z += (b.vz + wobbleOffsetZ) * dt;

      // Hydrodynamic deformation: bubble elongates along vertical velocity axis
      const speed = Math.hypot(b.vx, b.vy, b.vz);
      b.aspectRatio = THREE.MathUtils.lerp(b.aspectRatio, Math.min(1.45, 1.0 + speed * 0.35), dt * 6.0);

      // Boundary collision inside vessel wall: clamp radius
      const rDist = Math.hypot(b.x, b.z);
      const maxR = radius * 0.84;
      if (rDist > maxR) {
        b.x = (b.x / rDist) * maxR;
        b.z = (b.z / rDist) * maxR;
        b.vx = -b.vx * 0.5;
        b.vz = -b.vz * 0.5;
      }

      // Hydrostatic decompression expansion: as bubble ascends, pressure decreases: P(y) = P0 + rho*g*(h - y)
      const normH = Math.max(0, Math.min(1.0, (b.y - liquidBottomY) / height));
      b.radius = b.baseRadius * (1.0 + normH * b.growthRate);

      // BUBBLE COALESCENCE (Merging nearby bubbles)
      if (boilingStage === 'ACTIVE_BOIL' || boilingStage === 'INTENSE_ROLLING_BOIL') {
        for (let j = i + 1; j < count; j++) {
          const b2 = this.bubbles[j];
          if (b2.isPopping || b2.merged) continue;
          const distSq = (b.x - b2.x) ** 2 + (b.y - b2.y) ** 2 + (b.z - b2.z) ** 2;
          const mergeDist = b.radius + b2.radius;
          if (distSq < mergeDist * mergeDist * 0.45) {
            // Merge b2 into b!
            b.baseRadius = Math.min(DEFAULT_SIMULATION_CONFIG.bubbleMaxRadius_m, Math.cbrt(b.baseRadius ** 3 + b2.baseRadius ** 3));
            b.radius = b.baseRadius;
            b2.merged = true;
            break;
          }
        }
      }

      if (b.merged) {
        continue;
      }

      // CHECK MENISCUS SURFACE IMPACT
      if (b.y >= surfaceY - b.radius * 0.4) {
        // Trigger surface pop!
        b.isPopping = true;
        b.y = surfaceY;

        // Emit small surface pop event if rolling boil
        if (boilingIntensity > 0.4 && Math.random() < 0.25) {
          vfxBus.emit('particle:burst', {
            position: [b.x, surfaceY, b.z],
            count: 3,
            color: '#f8fafc',
            speed: 0.6
          });
        }
      }

      activeBubbles.push(b);
    }

    this.bubbles = activeBubbles;
  }
}
