/**
 * 60Hz Fixed-Timestep Reaction Visual Controllers & Particle Physics Runtime for ChemDex 2D
 *
 * Ports all 30+ dedicated ReactionVisualControllers from lab-3d to 2D vessel space:
 * - Alkali metals (Na, K) skittering on water with molten silvery sphere, sparks, Na/K flame & phenolphthalein pink wake
 * - PbI2 Golden Rain hexagonal shimmering platelets with Stokes settling & stirring resuspension
 * - AgCl curdy white flocs, BaSO4 milky cloud, Fe(OH)3 rust-brown flocs, Cu(OH)2 / Al(OH)3 gelatinous clouds
 * - Multi-stage redissolution swirls (Cu(OH)2 -> [Cu(NH3)4]2+ sapphire blue, Al(OH)3 -> [Al(OH)4]-)
 * - Colloidal Sulfur (Na2S2O3 + HCl) induction delay & Tyndall opacity ramp
 * - Iodine Clock countdown -> sudden <0.2s midnight-blue flash wave
 * - KMnO4 + H2C2O4 autocatalytic S-curve decolorization
 * - Fe/Zn + CuSO4 direct metallic copper plating (#b85d3b) on submerged nail/granule
 * - Surface-nucleated gas bubbles (CaCO3/Zn/Mg/Fe + acid, H2O2 + MnO2 catalytic surge, Cu + HNO3 NO2 plume)
 * - I2 violet sublimation & upper-wall crystalline frost deposition
 * - Mg blinding white combustion flash & ash
 * - Water into conc. H2SO4 violent boiling splatter & glass shatter shards
 */

import { EquipmentState } from '../types/equipment';
import { PrecipitateMorphology } from '../types/chemistry';
import { soundEngine } from '../services/soundEngine';

export interface BubbleParticle2D {
  x: number; // Normalized 0..1 across vessel inner width
  y: number; // Normalized 0..1 within liquid column (0 = meniscus, 1 = bottom)
  vy: number; // Upward velocity in normalized units/s
  radius_px: number;
  wobblePhase: number;
  colorHex: string;
}

export interface PrecipitateParticle2D {
  x: number; // 0..1 across inner width
  y: number; // 0..1 within liquid column (0 = meniscus, 1 = bottom)
  vx: number;
  vy: number; // Downward Stokes velocity
  size_px: number;
  rotation_rad: number;
  spin_rad_s: number;
  shimmerPhase: number;
  colorHex: string;
  morphology: PrecipitateMorphology;
  settled: boolean;
}

export interface SparkParticle2D {
  x: number; // 0..1 relative to vessel width
  y: number; // 0..1 relative to vessel height (can go above meniscus < 0)
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colorHex: string;
  size_px: number;
}

export interface AlkaliWakePoint2D {
  x: number; // 0..1
  y: number; // 0..1 in liquid
  radius_px: number;
  alpha: number;
}

export interface AlkaliPelletState2D {
  metal: 'Na' | 'K';
  x: number; // 0.15 .. 0.85 on meniscus
  vx: number;
  radius_px: number;
  flameColorHex: string;
  flameHeight_px: number;
  progress: number; // 0..1 consumption
  hasPhenolphthalein: boolean;
  wakeTrail: AlkaliWakePoint2D[];
}

export interface ColorPlume2D {
  id: string;
  originX: number; // 0..1
  originY: number; // 0..1 in liquid
  radiusNorm: number; // 0..1.5 expanding front
  colorHex: string;
  alpha: number;
  isFlash: boolean;
}

export interface GlassShard2D {
  x: number; // px relative to vessel center
  y: number;
  vx: number;
  vy: number;
  angle_rad: number;
  spin_rad_s: number;
  size_px: number;
  alpha: number;
}

export interface ActiveControllerTimer2D {
  controllerId: string;
  elapsed_s: number;
  duration_s: number;
  progress: number; // 0..1 kinetic progress
  inductionDelay_s: number;
}

export interface VesselRuntimeVisualState2D {
  vesselId: string;
  // Meniscus damped spring wave
  meniscusAngle_deg: number;
  meniscusAngularVel: number;
  ripplePhase: number;
  rippleAmplitude_px: number;
  vortexDepth_px: number;
  lastVesselX: number;
  lastVolume_ml: number;

  // Dynamic particle pools
  bubbles: BubbleParticle2D[];
  precipitates: PrecipitateParticle2D[];
  sparks: SparkParticle2D[];
  plumes: ColorPlume2D[];
  shards: GlassShard2D[];
  alkaliPellet: AlkaliPelletState2D | null;

  // Dynamic kinetic overrides (for induction clocks, colloidal sulfur, copper plating, sublimation)
  activeTimers: Map<string, ActiveControllerTimer2D>;
  dynamicTurbidity: number; // 0..1
  sedimentBedRatio: number; // 0..0.35 of liquid height
  copperPlatingProgress: number; // 0..1
  iodineFrostProgress: number; // 0..1 on upper glass wall
  mgFlashIntensity: number; // 0..1 blinding white bloom
  thermalDecompProgress: number; // 0..1 bottom-up blackening for Cu(OH)2 -> CuO
  lastSizzleSoundAt: number;
  lastBubbleSoundAt: number;
}

class ReactionRuntimeEngine2D {
  private states = new Map<string, VesselRuntimeVisualState2D>();

  public getOrCreateState(eq: EquipmentState): VesselRuntimeVisualState2D {
    let st = this.states.get(eq.id);
    if (!st) {
      st = {
        vesselId: eq.id,
        meniscusAngle_deg: 0,
        meniscusAngularVel: 0,
        ripplePhase: 0,
        rippleAmplitude_px: 0,
        vortexDepth_px: 0,
        lastVesselX: eq.x,
        lastVolume_ml: eq.volume_ml,
        bubbles: [],
        precipitates: [],
        sparks: [],
        plumes: [],
        shards: [],
        alkaliPellet: null,
        activeTimers: new Map(),
        dynamicTurbidity: eq.turbidity ?? 0,
        sedimentBedRatio: eq.hasPrecipitate ? 0.04 : 0,
        copperPlatingProgress: 0,
        iodineFrostProgress: eq.sublimationFrostProgress ?? 0,
        mgFlashIntensity: 0,
        thermalDecompProgress: 0,
        lastSizzleSoundAt: 0,
        lastBubbleSoundAt: 0,
      };
      this.states.set(eq.id, st);
    }
    return st;
  }

  public resetAll(): void {
    this.states.clear();
  }

  /**
   * Trigger a dedicated visual controller on a vessel (called when reactions fire)
   */
  public triggerController(
    eq: EquipmentState,
    controllerId: string,
    options?: { hasPhenolphthalein?: boolean; targetColorHex?: string }
  ): void {
    const st = this.getOrCreateState(eq);

    // Configure controller duration & induction period
    let duration_s = 6.0;
    let inductionDelay_s = 0;

    if (controllerId === 'iodine_clock_flash') {
      inductionDelay_s = 2.8;
      duration_s = 3.2;
    } else if (controllerId === 'colloidal_sulfur_clock') {
      inductionDelay_s = 1.8;
      duration_s = 6.0;
      st.dynamicTurbidity = 0.05;
    } else if (controllerId === 'kmno4_autocatalytic') {
      inductionDelay_s = 1.2;
      duration_s = 5.0;
    } else if (controllerId === 'na_water_skitter' || controllerId === 'k_water_skitter') {
      duration_s = 7.5;
      const isK = controllerId === 'k_water_skitter';
      const hasPhenol =
        options?.hasPhenolphthalein ??
        eq.contents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
      st.alkaliPellet = {
        metal: isK ? 'K' : 'Na',
        x: 0.5,
        vx: (Math.random() > 0.5 ? 1 : -1) * (isK ? 0.95 : 0.65),
        radius_px: isK ? 6.5 : 5.5,
        flameColorHex: isK ? '#c084fc' : '#facc15',
        flameHeight_px: isK ? 22 : 14,
        progress: 0,
        hasPhenolphthalein: hasPhenol,
        wakeTrail: [],
      };
      st.rippleAmplitude_px = Math.max(st.rippleAmplitude_px, 4.5);
    } else if (controllerId === 'mg_blinding_flash') {
      duration_s = 3.5;
      st.mgFlashIntensity = 1.0;
      for (let i = 0; i < 28; i++) {
        const angle = -Math.PI * Math.random();
        const speed = 0.4 + Math.random() * 1.2;
        st.sparks.push({
          x: 0.5,
          y: 0.65,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.6,
          colorHex: '#ffffff',
          size_px: 2.5 + Math.random() * 2.5,
        });
      }
    } else if (controllerId === 'water_into_conc_h2so4_explosion') {
      duration_s = 4.0;
      st.rippleAmplitude_px = 7.0;
      soundEngine.playExplosion(0.8);
      for (let i = 0; i < 24; i++) {
        st.sparks.push({
          x: 0.3 + Math.random() * 0.4,
          y: 0.1,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -0.6 - Math.random() * 1.2,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.5,
          colorHex: '#fef08a',
          size_px: 3.0,
        });
      }
    } else if (controllerId === 'fe_cuso4_plating' || controllerId === 'zn_cuso4_plating') {
      duration_s = 6.0;
      st.copperPlatingProgress = Math.max(0.15, st.copperPlatingProgress);
    }

    st.activeTimers.set(controllerId, {
      controllerId,
      elapsed_s: 0,
      duration_s,
      progress: 0,
      inductionDelay_s,
    });

    // Spawn initial color plume at contact point if liquid color changed
    if (options?.targetColorHex || eq.liquidColorHex) {
      st.plumes.push({
        id: `plume_${controllerId}_${Date.now()}`,
        originX: 0.5,
        originY: 0.25,
        radiusNorm: 0.05,
        colorHex: options?.targetColorHex || eq.liquidColorHex || '#38bdf8',
        alpha: 0.65,
        isFlash: controllerId === 'iodine_clock_flash',
      });
    }

    // Spawn initial burst of precipitate particles if precipitation controller
    if (
      controllerId === 'pbi2_golden_rain' ||
      controllerId === 'agcl_curdy' ||
      controllerId === 'baso4_milky' ||
      controllerId === 'cuoh2_gel' ||
      controllerId === 'feoh3_floc' ||
      controllerId === 'aloh3_amphoteric'
    ) {
      this.spawnPrecipitateBurst(eq, st, controllerId);
    }
  }

  public triggerGlassShatter(eq: EquipmentState): void {
    const st = this.getOrCreateState(eq);
    if (st.shards.length > 0) return;
    soundEngine.playGlassShatter();
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.3;
      const speed = 45 + Math.random() * 95;
      st.shards.push({
        x: (Math.random() - 0.5) * eq.width * 0.5,
        y: (Math.random() - 0.5) * eq.height * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        angle_rad: Math.random() * Math.PI * 2,
        spin_rad_s: (Math.random() - 0.5) * 12,
        size_px: 5 + Math.random() * 8,
        alpha: 1.0,
      });
    }
  }

  private spawnPrecipitateBurst(
    eq: EquipmentState,
    st: VesselRuntimeVisualState2D,
    controllerId: string
  ): void {
    const isGoldenRain = controllerId === 'pbi2_golden_rain' || eq.precipitateMorphology === 'plates';
    const count = isGoldenRain ? 55 : 42;
    const morph: PrecipitateMorphology = isGoldenRain
      ? 'plates'
      : controllerId === 'agcl_curdy'
        ? 'curdy'
        : controllerId === 'feoh3_floc'
          ? 'floc'
          : controllerId === 'cuoh2_gel' || controllerId === 'aloh3_amphoteric'
            ? 'gel'
            : (eq.precipitateMorphology ?? 'milky');

    const colorHex = isGoldenRain
      ? '#facc15'
      : controllerId === 'feoh3_floc'
        ? '#9a3412'
        : controllerId === 'cuoh2_gel'
          ? '#38bdf8'
          : (eq.precipitateColorHex ?? '#ffffff');

    for (let i = 0; i < count; i++) {
      if (st.precipitates.length >= 140) break;
      st.precipitates.push({
        x: 0.15 + Math.random() * 0.7,
        y: 0.05 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.08,
        vy: isGoldenRain
          ? 0.06 + Math.random() * 0.06
          : morph === 'curdy'
            ? 0.16 + Math.random() * 0.1
            : 0.04 + Math.random() * 0.06,
        size_px: isGoldenRain ? 4.2 + Math.random() * 2.5 : morph === 'curdy' ? 4.5 + Math.random() * 2.5 : 3.2 + Math.random() * 2,
        rotation_rad: Math.random() * Math.PI * 2,
        spin_rad_s: isGoldenRain ? (Math.random() - 0.5) * 3.5 : (Math.random() - 0.5) * 0.8,
        shimmerPhase: Math.random() * Math.PI * 2,
        colorHex,
        morphology: morph,
        settled: false,
      });
    }
  }

  /**
   * Step all vessels' 60Hz physical & reaction visual states by dt seconds
   */
  public stepAll(equipmentList: EquipmentState[], dt: number): void {
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    const now = performance.now();

    for (const eq of equipmentList) {
      if (!eq.isContainer) continue;
      const st = this.getOrCreateState(eq);

      // Sync newly triggered controller IDs from store/engine
      if (eq.activeControllerIds?.length) {
        for (const cid of eq.activeControllerIds) {
          if (!st.activeTimers.has(cid)) {
            this.triggerController(eq, cid);
          }
        }
      }

      // 1. Damped Spring Meniscus Wave Oscillator (responds to dragging, pouring, stirring, boiling)
      const dx = eq.x - st.lastVesselX;
      st.lastVesselX = eq.x;
      const dVol = eq.volume_ml - st.lastVolume_ml;
      st.lastVolume_ml = eq.volume_ml;

      // External impulse from horizontal dragging or liquid pouring impact
      const dragImpulse = -dx * 1.8;
      const pourImpulse = Math.abs(dVol) > 0.05 ? (Math.random() - 0.5) * 18 : 0;
      const omega0 = 14.0; // Natural slosh frequency rad/s
      const zeta = 0.22; // Damping ratio
      const accel =
        -2 * zeta * omega0 * st.meniscusAngularVel -
        omega0 * omega0 * st.meniscusAngle_deg +
        (dragImpulse + pourImpulse) * 35;

      st.meniscusAngularVel += accel * clampedDt;
      st.meniscusAngle_deg = Math.max(-18, Math.min(18, st.meniscusAngle_deg + st.meniscusAngularVel * clampedDt));

      // Ripple amplitude & stirring vortex
      st.ripplePhase += clampedDt * (eq.isBoiling ? 18 : eq.hasGas ? 14 : 8);
      const targetRipple =
        (eq.isBoiling ? 3.5 * Math.max(0.3, eq.boilingIntensity ?? 0.6) : 0) +
        (eq.hasGas ? (eq.effervescenceSpeed === 'instant' ? 3.2 : 1.8) : 0) +
        (eq.isPouring || Math.abs(dVol) > 0.02 ? 2.5 : 0) +
        (st.alkaliPellet ? 3.8 : 0);
      st.rippleAmplitude_px += (targetRipple - st.rippleAmplitude_px) * Math.min(1, clampedDt * 6);

      const targetVortex = eq.isStirred ? 8.5 * Math.max(0.4, eq.stirringSpeed ?? 0.7) : 0;
      st.vortexDepth_px += (targetVortex - st.vortexDepth_px) * Math.min(1, clampedDt * 8);

      // 2. Step Active Reaction Controller Timers
      for (const [cid, timer] of st.activeTimers.entries()) {
        timer.elapsed_s += clampedDt;
        if (timer.elapsed_s <= timer.inductionDelay_s) {
          timer.progress = 0;
        } else {
          const activeWindow = Math.max(0.1, timer.duration_s - timer.inductionDelay_s);
          timer.progress = Math.min(1, (timer.elapsed_s - timer.inductionDelay_s) / activeWindow);
        }

        // Colloidal Sulfur Tyndall opacity ramp after induction delay
        if (cid === 'colloidal_sulfur_clock') {
          st.dynamicTurbidity = timer.progress * 0.92;
        }
        // Copper plating progress on Fe/Zn
        if (cid === 'fe_cuso4_plating' || cid === 'zn_cuso4_plating') {
          st.copperPlatingProgress = Math.min(1, 0.15 + timer.progress * 0.85);
        }
        // Iodine sublimation upper-wall frost buildup
        if (cid === 'iodine_sublimation') {
          st.iodineFrostProgress = Math.min(1, st.iodineFrostProgress + clampedDt * 0.18);
        }
        // Thermal decomposition Cu(OH)2 -> CuO bottom-up blackening
        if (cid === 'cuoh2_thermal_decomp') {
          st.thermalDecompProgress = timer.progress;
        }

        if (timer.elapsed_s >= timer.duration_s + 2.0) {
          st.activeTimers.delete(cid);
        }
      }

      if (st.mgFlashIntensity > 0) {
        st.mgFlashIntensity = Math.max(0, st.mgFlashIntensity - clampedDt * 0.45);
      }

      // 3. Step Alkali Metal (Na / K) Skittering on Water Surface
      if (st.alkaliPellet && eq.volume_ml > 1) {
        const p = st.alkaliPellet;
        p.progress = Math.min(1, p.progress + clampedDt * (p.metal === 'K' ? 0.22 : 0.15));
        p.radius_px = Math.max(1.2, (p.metal === 'K' ? 6.5 : 5.5) * (1 - p.progress * 0.85));

        // Chaotic H2 gas thrust jitter + wall bounce
        p.vx += (Math.random() - 0.5) * 4.5 * clampedDt;
        const maxSpeed = p.metal === 'K' ? 1.35 : 0.95;
        p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
        p.x += p.vx * clampedDt;
        if (p.x < 0.16) {
          p.x = 0.16;
          p.vx = Math.abs(p.vx) * (0.85 + Math.random() * 0.3);
        } else if (p.x > 0.84) {
          p.x = 0.84;
          p.vx = -Math.abs(p.vx) * (0.85 + Math.random() * 0.3);
        }

        // Leave pink phenolphthalein wake trail in the liquid underneath
        if (Math.random() < 0.65) {
          p.wakeTrail.push({
            x: p.x,
            y: 0.04,
            radius_px: 4 + Math.random() * 3,
            alpha: p.hasPhenolphthalein ? 0.78 : 0.32,
          });
          if (p.wakeTrail.length > 40) p.wakeTrail.shift();
        }

        // Emit sparks & H2 bubbles from pellet
        if (Math.random() < 0.55) {
          st.sparks.push({
            x: p.x,
            y: 0.0,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -0.4 - Math.random() * 0.8,
            life: 0,
            maxLife: 0.25 + Math.random() * 0.25,
            colorHex: p.flameColorHex,
            size_px: 2 + Math.random() * 1.5,
          });
        }

        if (now - st.lastSizzleSoundAt > 280) {
          st.lastSizzleSoundAt = now;
          soundEngine.playSodiumSizzlePop(1 - p.progress * 0.5);
        }

        if (p.progress >= 1) {
          st.alkaliPellet = null;
        }
      } else if (st.alkaliPellet && eq.volume_ml <= 1) {
        st.alkaliPellet = null;
      }

      // Diffuse alkali wake trail downward
      if (st.alkaliPellet) {
        for (const w of st.alkaliPellet.wakeTrail) {
          w.y = Math.min(0.92, w.y + clampedDt * 0.12);
          w.radius_px += clampedDt * 6.5;
          w.alpha = Math.max(0, w.alpha - clampedDt * 0.14);
        }
      }

      // 4. Nucleation & Buoyancy Bubble Physics
      const shouldSpawnBubbles = (eq.hasGas || eq.isBoiling || Boolean(st.alkaliPellet)) && eq.volume_ml > 0.5;
      if (shouldSpawnBubbles) {
        const spawnRate =
          eq.effervescenceSpeed === 'instant' || (eq.boilingIntensity ?? 0) > 0.7
            ? 38
            : eq.effervescenceSpeed === 'vigorous' || eq.isBoiling
              ? 22
              : 9;
        const expectedNew = spawnRate * clampedDt;
        const countToSpawn = Math.floor(expectedNew) + (Math.random() < expectedNew % 1 ? 1 : 0);

        // Determine physical nucleation origin (solid chunk surface vs heated bottom)
        const solidChunks = eq.solidChunks?.filter(c => !c.isFloating) ?? [];

        for (let i = 0; i < countToSpawn; i++) {
          if (st.bubbles.length >= 90) break;
          let originX = 0.2 + Math.random() * 0.6;
          let originY = 0.88 + Math.random() * 0.08;

          if (solidChunks.length > 0 && eq.hasGas) {
            const chunk = solidChunks[i % solidChunks.length];
            originX = chunk.xNormalized + (Math.random() - 0.5) * 0.12;
            originY = 0.86 + Math.random() * 0.08;
          }

          const radius_px = eq.isBoiling ? 2.2 + Math.random() * 2.8 : 1.5 + Math.random() * 2.0;
          st.bubbles.push({
            x: Math.max(0.12, Math.min(0.88, originX)),
            y: originY,
            vy: 0.45 + radius_px * 0.18 + Math.random() * 0.25,
            radius_px,
            wobblePhase: Math.random() * Math.PI * 2,
            colorHex: eq.gasColorHex || '#ffffff',
          });
        }
      }

      // Step existing bubbles upward & pop at meniscus (y <= 0.02)
      for (let i = st.bubbles.length - 1; i >= 0; i--) {
        const b = st.bubbles[i];
        b.wobblePhase += clampedDt * 10;
        b.x += Math.sin(b.wobblePhase) * 0.04 * clampedDt;
        b.y -= b.vy * clampedDt;
        if (b.y <= 0.02) {
          st.bubbles.splice(i, 1);
          if (now - st.lastBubbleSoundAt > 180 && Math.random() < 0.25) {
            st.lastBubbleSoundAt = now;
            soundEngine.playMinnaertBubble(b.radius_px * 0.6);
          }
        }
      }

      // 5. Precipitate Stokes Sedimentation & Stirring Resuspension
      if (eq.hasPrecipitate && st.precipitates.length < 25) {
        this.spawnPrecipitateBurst(eq, st, eq.precipitateMorphology === 'plates' ? 'pbi2_golden_rain' : 'baso4_milky');
      } else if (!eq.hasPrecipitate && st.precipitates.length > 0) {
        // Amphoteric / complexation dissolution in excess reagent: swirl & shrink particles
        for (let i = st.precipitates.length - 1; i >= 0; i--) {
          const p = st.precipitates[i];
          p.size_px -= clampedDt * 2.5;
          if (p.size_px <= 0.4) st.precipitates.splice(i, 1);
        }
        st.sedimentBedRatio = Math.max(0, st.sedimentBedRatio - clampedDt * 0.08);
      }

      let settledCount = 0;
      for (const p of st.precipitates) {
        p.shimmerPhase += clampedDt * 5.0;
        if (eq.isStirred) {
          // Resuspend settled particles into swirling vortex
          p.settled = false;
          p.y = Math.max(0.08, p.y - (0.15 + Math.random() * 0.25) * clampedDt);
          p.x = 0.5 + (p.x - 0.5) * Math.cos(clampedDt * 3) + Math.sin(p.shimmerPhase) * 0.05 * clampedDt;
        } else if (!p.settled) {
          p.rotation_rad += p.spin_rad_s * clampedDt;
          p.x = Math.max(0.12, Math.min(0.88, p.x + p.vx * clampedDt + Math.sin(p.shimmerPhase) * 0.01 * clampedDt));
          p.y += p.vy * clampedDt;
          const bedTopY = 1.0 - Math.max(0.03, st.sedimentBedRatio);
          if (p.y >= bedTopY) {
            p.y = bedTopY + (Math.random() - 0.5) * 0.02;
            p.settled = true;
          }
        }
        if (p.settled) settledCount++;
      }

      if (eq.hasPrecipitate) {
        const targetBed = eq.isStirred
          ? 0.02
          : Math.min(0.22, 0.03 + (settledCount / Math.max(1, st.precipitates.length)) * 0.12);
        st.sedimentBedRatio += (targetBed - st.sedimentBedRatio) * Math.min(1, clampedDt * 2.5);
      }

      // 6. Step Color Diffusion Plumes
      for (let i = st.plumes.length - 1; i >= 0; i--) {
        const pl = st.plumes[i];
        pl.radiusNorm += clampedDt * (pl.isFlash ? 3.8 : 0.65);
        pl.alpha -= clampedDt * (pl.isFlash ? 0.9 : 0.28);
        if (pl.alpha <= 0.01) st.plumes.splice(i, 1);
      }

      // 7. Step Pyrotechnic Sparks & Acid Splatter Droplets
      for (let i = st.sparks.length - 1; i >= 0; i--) {
        const sp = st.sparks[i];
        sp.life += clampedDt;
        sp.vy += 1.8 * clampedDt; // Gravity
        sp.x += sp.vx * clampedDt;
        sp.y += sp.vy * clampedDt;
        if (sp.life >= sp.maxLife) st.sparks.splice(i, 1);
      }

      // 8. Step Shattered Glass Shards
      if (eq.isShattered && st.shards.length === 0) {
        this.triggerGlassShatter(eq);
      }
      for (let i = st.shards.length - 1; i >= 0; i--) {
        const sh = st.shards[i];
        sh.vy += 260 * clampedDt;
        sh.x += sh.vx * clampedDt;
        sh.y += sh.vy * clampedDt;
        sh.angle_rad += sh.spin_rad_s * clampedDt;
        sh.alpha = Math.max(0, sh.alpha - clampedDt * 0.45);
        if (sh.alpha <= 0.02) st.shards.splice(i, 1);
      }
    }
  }
}

export const reactionRuntime2D = new ReactionRuntimeEngine2D();
