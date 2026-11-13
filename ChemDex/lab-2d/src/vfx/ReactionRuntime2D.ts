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
import { LiquidAppearanceField2D } from './LiquidAppearanceField2D';
import {
  DEFAULT_LAB_ENVIRONMENT,
  LabEnvironment,
  computeVaporPlumeVisibility,
} from '../chemistry/physical/environmentPhysics';

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

export interface FumePuff2D {
  x: number; // 0..1
  yOffsetPx: number; // negative px distance above meniscus (-4 .. -95)
  vx: number;
  vy: number; // px/s (negative rises, positive dense cascades slightly downward before dispersing)
  radius_px: number;
  alpha: number;
  life: number;
  maxLife: number;
  colorHex: string;
  fumeType: 'steam' | 'no2' | 'nh4cl' | 'iodine';
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
  flashTriggered?: boolean;
}

export interface VesselRuntimeVisualState2D {
  vesselId: string;
  colorField: LiquidAppearanceField2D;
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
  fumes: FumePuff2D[];
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
  schlierenIntensity: number; // 0..1 refractive thermal/mixing convection shimmer
  lastSizzleSoundAt: number;
  lastBubbleSoundAt: number;
}

class ReactionRuntimeEngine2D {
  private states = new Map<string, VesselRuntimeVisualState2D>();

  public getOrCreateState(eq: EquipmentState): VesselRuntimeVisualState2D {
    let st = this.states.get(eq.id);
    if (!st) {
      const colorField = new LiquidAppearanceField2D();
      if (eq.volume_ml > 0) {
        colorField.reset(eq.liquidColorHex || '#f8fafc', eq.liquidOpacity ?? 0.65);
      }
      st = {
        vesselId: eq.id,
        colorField,
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
        fumes: [],
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
        schlierenIntensity: 0,
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
   * Triggers spatial 2D diffusion + swirling color plume inside the vessel when pouring,
   * pipetting, or adding a reagent ("loang màu" at exact entry coordinate).
   */
  public triggerColorMixing(
    eq: EquipmentState,
    prevHex: string,
    targetHex: string,
    contactXNorm = 0,
    incomingHex?: string
  ): void {
    const st = this.getOrCreateState(eq);
    st.colorField.seedMixingTransition(
      prevHex || '#f8fafc',
      targetHex || '#f8fafc',
      eq.liquidOpacity ?? 0.72,
      contactXNorm,
      incomingHex
    );
    st.rippleAmplitude_px = Math.max(st.rippleAmplitude_px, 2.8);
    st.schlierenIntensity = Math.max(st.schlierenIntensity, 0.45);
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
        radius_px: isK ? 7.2 : 6.0,
        flameColorHex: isK ? '#c084fc' : '#fb923c',
        flameHeight_px: isK ? 32 : 22,
        progress: 0,
        hasPhenolphthalein: hasPhenol,
        wakeTrail: [],
      };
      st.rippleAmplitude_px = Math.max(st.rippleAmplitude_px, 5.2);
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
        size_px: isGoldenRain ? 4.8 + Math.random() * 2.8 : morph === 'curdy' ? 5.0 + Math.random() * 2.6 : 3.5 + Math.random() * 2.2,
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
  public stepAll(
    equipmentList: EquipmentState[],
    dt: number,
    env: LabEnvironment = DEFAULT_LAB_ENVIRONMENT
  ): void {
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));
    const now = performance.now();

    for (const eq of equipmentList) {
      if (!eq.isContainer) continue;
      const st = this.getOrCreateState(eq);

      if (eq.volume_ml <= 0.05 && eq.contents.length === 0) {
        st.bubbles.length = 0;
        st.precipitates.length = 0;
        st.fumes.length = 0;
        st.plumes.length = 0;
        st.alkaliPellet = null;
        st.sedimentBedRatio = 0;
        st.dynamicTurbidity = 0;
        st.colorField.reset('#f8fafc', 0.18);
        continue;
      }

      // Sync newly triggered controller IDs from store/engine
      if (eq.activeControllerIds?.length) {
        for (const cid of eq.activeControllerIds) {
          if (!st.activeTimers.has(cid)) {
            this.triggerController(eq, cid);
          }
        }
      }

      // Synchronize Beer-Lambert target & advance 2D spatial color field
      st.colorField.syncTarget(eq.liquidColorHex || '#f8fafc', eq.liquidOpacity ?? 0.7);
      const visc = Math.max(0.35, eq.viscosity_mPa_s ?? 0.89);
      const viscMobility = Math.max(0.18, Math.min(1.25, 0.89 / visc));

      // 1. Damped Spring Meniscus Wave Oscillator (responds to dragging, pouring, stirring, boiling)
      const dx = eq.x - st.lastVesselX;
      st.lastVesselX = eq.x;
      const dVol = eq.volume_ml - st.lastVolume_ml;
      st.lastVolume_ml = eq.volume_ml;

      const dragImpulse = -dx * 1.8;
      const pourImpulse = Math.abs(dVol) > 0.05 ? (Math.random() - 0.5) * 18 : 0;
      const omega0 = 14.0;
      const zeta = 0.22 + Math.min(0.35, (visc - 0.89) * 0.04); // Higher viscosity damps slosh faster
      const accel =
        -2 * zeta * omega0 * st.meniscusAngularVel -
        omega0 * omega0 * st.meniscusAngle_deg +
        (dragImpulse + pourImpulse) * 35;

      st.meniscusAngularVel += accel * clampedDt;
      st.meniscusAngle_deg = Math.max(-18, Math.min(18, st.meniscusAngle_deg + st.meniscusAngularVel * clampedDt));

      st.ripplePhase += clampedDt * (eq.isBoiling ? 18 : eq.hasGas ? 14 : 8);
      const targetRipple =
        (eq.isBoiling ? 3.5 * Math.max(0.3, eq.boilingIntensity ?? 0.6) : 0) +
        (eq.hasGas ? (eq.effervescenceSpeed === 'instant' ? 3.2 : 1.8) : 0) +
        (eq.isPouring || Math.abs(dVol) > 0.02 ? 2.5 : 0) +
        (st.alkaliPellet ? 3.8 : 0);
      st.rippleAmplitude_px += (targetRipple - st.rippleAmplitude_px) * Math.min(1, clampedDt * 6);

      const stirStrength = eq.isStirred ? Math.max(0.45, eq.stirringSpeed ?? 0.8) : Math.max(0, eq.stirIntensity ?? 0);
      const targetVortex = stirStrength > 0.05 ? 8.5 * stirStrength : 0;
      st.vortexDepth_px += (targetVortex - st.vortexDepth_px) * Math.min(1, clampedDt * 8);

      // 2. Step Active Reaction Controller Timers & Spatial Field Kinetics
      for (const [cid, timer] of st.activeTimers.entries()) {
        timer.elapsed_s += clampedDt;
        if (timer.elapsed_s <= timer.inductionDelay_s) {
          timer.progress = 0;
        } else {
          const activeWindow = Math.max(0.1, timer.duration_s - timer.inductionDelay_s);
          timer.progress = Math.min(1, (timer.elapsed_s - timer.inductionDelay_s) / activeWindow);
        }

        if (cid === 'colloidal_sulfur_clock') {
          st.dynamicTurbidity = timer.progress * 0.92;
        }
        if (cid === 'iodine_clock_flash' && timer.progress > 0 && !timer.flashTriggered) {
          timer.flashTriggered = true;
          st.colorField.injectPlume(0.5, 0.45, 0.55, '#1e1b4b', 0.98, 0.92);
          st.plumes.push({
            id: `clock_flash_${Date.now()}`,
            originX: 0.5,
            originY: 0.45,
            radiusNorm: 0.08,
            colorHex: '#1e1b4b',
            alpha: 0.9,
            isFlash: true,
          });
        }
        if (cid === 'kmno4_autocatalytic') {
          st.colorField.injectPlume(0.5, 0.5, 0.45, timer.progress > 0.65 ? '#f8fafc' : '#fde047', timer.progress * 0.45, 0.65);
        }
        if (cid === 'neutralization_thermal_schlieren') {
          st.schlierenIntensity = Math.max(st.schlierenIntensity, (1 - timer.progress) * 0.75);
        }
        if (cid === 'fe_cuso4_plating' || cid === 'zn_cuso4_plating') {
          st.copperPlatingProgress = Math.min(1, 0.15 + timer.progress * 0.85);
        }
        if (cid === 'iodine_sublimation') {
          st.iodineFrostProgress = Math.min(1, st.iodineFrostProgress + clampedDt * 0.18);
        }
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
      st.schlierenIntensity = Math.max(
        eq.isBeingHeated ? 0.35 : 0,
        st.schlierenIntensity - clampedDt * 0.18
      );

      // Step Eulerian 2D color diffusion field ("loang màu")
      st.colorField.step(clampedDt, {
        viscosity_mPa_s: visc,
        temperature_c: eq.temperature_c,
        stirIntensity: stirStrength,
        isBoiling: Boolean(eq.isBoiling),
        isHeated: Boolean(eq.isBeingHeated),
      });

      // 3. Step Alkali Metal (Na / K) Skittering on Water Surface
      if (st.alkaliPellet && eq.volume_ml > 1) {
        const p = st.alkaliPellet;
        p.progress = Math.min(1, p.progress + clampedDt * (p.metal === 'K' ? 0.22 : 0.15));
        p.radius_px = Math.max(1.2, (p.metal === 'K' ? 6.5 : 5.5) * (1 - p.progress * 0.85));

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

        // Inject swirling alkali ribbon directly into the 2D color field!
        if (Math.random() < 0.65) {
          p.wakeTrail.push({
            x: p.x,
            y: 0.04,
            radius_px: 4 + Math.random() * 3,
            alpha: p.hasPhenolphthalein ? 0.82 : 0.35,
          });
          if (p.wakeTrail.length > 40) p.wakeTrail.shift();
          if (p.hasPhenolphthalein) {
            st.colorField.injectPlume(p.x, 0.1, 0.16, '#ec4899', 0.55, 0.85);
          }
        }

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

      if (st.alkaliPellet) {
        for (const w of st.alkaliPellet.wakeTrail) {
          w.y = Math.min(0.92, w.y + clampedDt * 0.12);
          w.radius_px += clampedDt * 6.5;
          w.alpha = Math.max(0, w.alpha - clampedDt * 0.14);
        }
      }

      // 4. Nucleation & Buoyancy Bubble Physics (scaled by viscosity & surface tension)
      const sigmaRatio = Math.max(0.6, Math.min(1.4, 0.0728 / Math.max(0.025, eq.surfaceTension_N_m ?? 0.0728)));
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

          const radius_px = (eq.isBoiling ? 2.2 + Math.random() * 2.8 : 1.5 + Math.random() * 2.0) / Math.sqrt(sigmaRatio);
          st.bubbles.push({
            x: Math.max(0.12, Math.min(0.88, originX)),
            y: originY,
            vy: (0.42 + radius_px * 0.18 + Math.random() * 0.25) * viscMobility,
            radius_px,
            wobblePhase: Math.random() * Math.PI * 2,
            colorHex: eq.gasColorHex || '#ffffff',
          });
        }
      }

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

      // 4B. Dynamic Headspace & Plume Fumes (steam gap, dense NO2 cascade, NH4Cl smoke, I2 vapor + wind drift)
      const steamVis = eq.isBoiling ? 1 : computeVaporPlumeVisibility(eq.temperature_c, env);
      const wantFumes = eq.hasFumes || eq.isBoiling || steamVis > 0.12;
      if (wantFumes && st.fumes.length < 36) {
        const fType: FumePuff2D['fumeType'] = eq.fumeType || (eq.hasSublimation ? 'iodine' : 'steam');
        const spawnChance = fType === 'steam' ? 14 * Math.max(0.25, steamVis) : 16;
        const count = Math.floor(spawnChance * clampedDt) + (Math.random() < (spawnChance * clampedDt) % 1 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          // Boiling steam exhibits realistic ~14px transparent unsaturated gap immediately above liquid surface
          const startGap = fType === 'steam' ? -(14 + Math.random() * 8) : -(4 + Math.random() * 6);
          const isDense = fType === 'no2';
          st.fumes.push({
            x: 0.28 + Math.random() * 0.44,
            yOffsetPx: startGap,
            vx: (Math.random() - 0.5) * 0.18 + (env.airSpeed_m_s ?? 0.1) * 0.28,
            vy: isDense ? -(6 + Math.random() * 10) : -(24 + Math.random() * 18),
            radius_px: fType === 'nh4cl' ? 10 + Math.random() * 8 : 7.5 + Math.random() * 6,
            alpha: fType === 'steam' ? 0.52 * Math.max(0.4, steamVis) : 0.78,
            life: 0,
            maxLife: isDense ? 2.6 + Math.random() * 1.2 : 1.7 + Math.random() * 0.9,
            colorHex: eq.fumeColorHex || (fType === 'no2' ? '#b45309' : fType === 'iodine' ? '#9333ea' : '#e2e8f0'),
            fumeType: fType,
          });
        }
      }
      for (let i = st.fumes.length - 1; i >= 0; i--) {
        const fm = st.fumes[i];
        fm.life += clampedDt;
        fm.x = Math.max(-0.15, Math.min(1.15, fm.x + (fm.vx + Math.sin(fm.life * 4) * 0.08) * clampedDt));
        if (fm.fumeType === 'no2') {
          // Dense nitrogen dioxide rises above neck then curls outward
          fm.vy += 10 * clampedDt;
        }
        fm.yOffsetPx += fm.vy * clampedDt;
        fm.radius_px += clampedDt * 6.5;
        if (fm.life >= fm.maxLife) st.fumes.splice(i, 1);
      }

      // 5. Precipitate Stokes Sedimentation & Stirring Resuspension (viscosity coupled)
      if (eq.hasPrecipitate && st.precipitates.length < 25) {
        this.spawnPrecipitateBurst(eq, st, eq.precipitateMorphology === 'plates' ? 'pbi2_golden_rain' : 'baso4_milky');
      } else if (!eq.hasPrecipitate && st.precipitates.length > 0) {
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
        if (stirStrength > 0.15) {
          p.settled = false;
          p.y = Math.max(0.08, p.y - (0.15 + Math.random() * 0.25) * stirStrength * clampedDt);
          p.x = 0.5 + (p.x - 0.5) * Math.cos(clampedDt * 3 * stirStrength) + Math.sin(p.shimmerPhase) * 0.05 * clampedDt;
        } else if (!p.settled) {
          p.rotation_rad += p.spin_rad_s * clampedDt;
          p.x = Math.max(0.12, Math.min(0.88, p.x + p.vx * clampedDt + Math.sin(p.shimmerPhase) * 0.01 * clampedDt));
          p.y += p.vy * viscMobility * clampedDt;
          const bedTopY = 1.0 - Math.max(0.03, st.sedimentBedRatio);
          if (p.y >= bedTopY) {
            p.y = bedTopY + (Math.random() - 0.5) * 0.02;
            p.settled = true;
          }
        }
        if (p.settled) settledCount++;
      }

      if (eq.hasPrecipitate) {
        const targetBed = stirStrength > 0.25
          ? 0.02
          : Math.min(0.22, 0.03 + (settledCount / Math.max(1, st.precipitates.length)) * 0.12);
        st.sedimentBedRatio += (targetBed - st.sedimentBedRatio) * Math.min(1, clampedDt * 2.5);
      }

      // 6. Step Color Diffusion Plumes
      for (let i = st.plumes.length - 1; i >= 0; i--) {
        const pl = st.plumes[i];
        pl.radiusNorm += clampedDt * (pl.isFlash ? 3.8 : 0.65 * viscMobility);
        pl.alpha -= clampedDt * (pl.isFlash ? 0.9 : 0.28);
        if (pl.alpha <= 0.01) st.plumes.splice(i, 1);
      }

      // 7. Step Pyrotechnic Sparks & Acid Splatter Droplets
      for (let i = st.sparks.length - 1; i >= 0; i--) {
        const sp = st.sparks[i];
        sp.life += clampedDt;
        sp.vy += 1.8 * clampedDt;
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
