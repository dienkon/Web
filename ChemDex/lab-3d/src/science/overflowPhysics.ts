// Overflow presentation presets; wall/drip/crest/audio values remain illustrative.
// Only the puddle footprint below is derived from hydrostatic Young–Laplace.
import { solveSessileDrop } from './sessileDrop';
import { METERS_PER_SCENE_UNIT } from './sceneUnits';

export type OverflowRegime = 'minor' | 'moderate' | 'surge';

export interface OverflowRegimeProfile {
  regime: OverflowRegime;
  volume_ml: number;
  normFactor: number; // 0 to 1 progress within regime
  
  // Wall cascade stream configuration
  activeStreamsCount: number;
  streamSpacingRad: number;
  streamWidthBase: number;
  streamWidthWave: number;
  streamThickness: number;
  waveFrequency: number;
  waveSpeed: number;
  headDescentDuration_ms: number;
  
  // Crest rim lip crowning
  crestArcSpanRad: number;
  crestHeight: number;
  crestLipSpread: number;
  
  // Wall droplet tears
  activeDropletsCount: number;
  dropletSpeedScale: number;
  dropletSizeScale: number;
  
  // Base falling drips down to workbench
  activeFallingDripsCount: number;
  dripSizeScale: number;
  isIntermittentDripping: boolean;
  dripStretchFactor: number;
  
  // Tabletop splash rings
  activeSplashRingsCount: number;
  splashRingMaxRadiusScale: number;
  splashRingOpacityScale: number;
  
  // Tabletop puddle & splatter
  puddleRadius: number; // scene units, not metres
  expansionSpeed: number;
  harmonicLobeAmplitude: number;
  satelliteCount: number;
  satelliteMaxSpread: number;
  
  // Acoustic profile
  soundMode: 'minor_drip' | 'moderate_trickle' | 'surge_rush';
  soundInterval_ms: number;
}

/**
 * Classifies recorded overflow into 3 presentation bands (not a flow solver):
 * - Minor (micro-spill / small drip, ~0.1 - 2.0 mL): narrow trickling stream or sliding beads, intermittent dripping, compact puddle.
 * - Moderate (~2.0 - 12.0 mL): distinct cascading rivulets, steady downward velocity, continuous dripping, medium organic puddle.
 * - Massive / Surge (>12.0 - 50+ mL): wide sheet cascade covering broad rim arc, rushing flow, heavy dripping and stream detachment, large expanding puddle with splatter satellites.
 */
export function getOverflowRegime(volume_ml: number): OverflowRegime {
  if (volume_ml <= 2.0) return 'minor';
  if (volume_ml <= 12.0) return 'moderate';
  return 'surge';
}

/** Equilibrium water-like puddle radius in SCENE UNITS, with an assumed
 * 60-degree contact angle. Dry solid mass never creates a liquid footprint.
 * No radius clamp: table-edge runoff needs a separate finite inventory. */
export function calculateSpillRadius(volume_ml: number, _mass_g?: number): number {
  return (solveSessileDrop(volume_ml)?.radius_m ?? 0) / METERS_PER_SCENE_UNIT;
}

/**
 * Presentation/audio scaling from recorded volume, with continuous band
 * transitions. Only the puddle footprint is a hydrostatic calculation.
 */
export function calculateOverflowProfile(volume_ml: number): OverflowRegimeProfile {
  if (!Number.isFinite(volume_ml) || volume_ml <= 0) return { ...calculateOverflowProfile(0.05),
    volume_ml: 0, activeStreamsCount: 0, activeDropletsCount: 0, activeFallingDripsCount: 0,
    activeSplashRingsCount: 0, satelliteCount: 0, puddleRadius: 0, crestHeight: 0,
    crestLipSpread: 0, streamWidthBase: 0, streamWidthWave: 0, streamThickness: 0 };
  const vol = volume_ml;
  const regime = getOverflowRegime(vol);

  if (regime === 'minor') {
    // 0.05 to 2.0 mL: Micro-spill / small drip
    const t = Math.min(1.0, Math.max(0.0, (vol - 0.05) / 1.95));
    const activeStreamsCount = vol <= 0.8 ? 1 : 2;
    
    return {
      regime: 'minor',
      volume_ml: vol,
      normFactor: t,
      
      activeStreamsCount,
      streamSpacingRad: 0.06 + 0.04 * t,
      streamWidthBase: 0.008 + 0.010 * t, // 8mm - 18mm narrow trickle
      streamWidthWave: 0.002 + 0.003 * t,
      streamThickness: 0.0008 + 0.0006 * t, // ~0.8mm - 1.4mm thin liquid film
      waveFrequency: 7.0,
      waveSpeed: 5.0,
      headDescentDuration_ms: Math.round(750 - t * 230), // 750 - 520ms slower sliding trickle due to capillary drag
      
      crestArcSpanRad: 0.20 + 0.18 * t, // ~11° - 22° tight localized overflow lip
      crestHeight: 0.0012 + 0.0012 * t,
      crestLipSpread: 0.003 + 0.003 * t,
      
      activeDropletsCount: Math.min(4, Math.max(2, Math.round(2 + t * 2))),
      dropletSpeedScale: 0.35 + 0.25 * t, // subtle sliding beads
      dropletSizeScale: 0.50 + 0.25 * t,
      
      activeFallingDripsCount: Math.min(2, Math.max(1, Math.round(1 + t))),
      dripSizeScale: 0.55 + 0.25 * t,
      isIntermittentDripping: true, // intermittent cadence
      dripStretchFactor: 1.4 + 0.4 * t,
      
      activeSplashRingsCount: 1,
      splashRingMaxRadiusScale: 0.35 + 0.25 * t, // small faint rings
      splashRingOpacityScale: 0.35 + 0.15 * t,
      
      puddleRadius: calculateSpillRadius(vol),
      expansionSpeed: 0.12 + 0.12 * t, // gentle capillary creeping (0.12 - 0.24 m/s)
      harmonicLobeAmplitude: 0.04 + 0.04 * t, // high surface tension, rounder dome profile
      satelliteCount: Math.min(8, Math.max(4, Math.round(4 + t * 4))),
      satelliteMaxSpread: 1.10 + 0.04 * t, // tightly clustered near puddle edge
      
      soundMode: 'minor_drip',
      soundInterval_ms: 1600,
    };
  }

  if (regime === 'moderate') {
    // 2.0 to 12.0 mL: Moderate cascading rivulets
    const t = Math.min(1.0, Math.max(0.0, (vol - 2.0) / 10.0));
    const activeStreamsCount = Math.min(4, Math.max(3, Math.round(3 + t)));
    
    return {
      regime: 'moderate',
      volume_ml: vol,
      normFactor: t,
      
      activeStreamsCount,
      streamSpacingRad: 0.10 + 0.08 * t,
      streamWidthBase: 0.018 + 0.030 * t, // 18mm - 48mm distinct cascading rivulets (connects C0 at 2.0mL)
      streamWidthWave: 0.005 + 0.006 * t,
      streamThickness: 0.0014 + 0.0018 * t, // ~1.4mm - 3.2mm steady fluid layer
      waveFrequency: 11.0,
      waveSpeed: 8.5,
      headDescentDuration_ms: Math.round(520 - t * 220), // 520 - 300ms steady downward velocity
      
      crestArcSpanRad: 0.38 + 0.62 * t, // ~22° - 57° distinct crest
      crestHeight: 0.0024 + 0.0024 * t,
      crestLipSpread: 0.006 + 0.005 * t,
      
      activeDropletsCount: Math.min(8, Math.max(4, Math.round(4 + t * 4))),
      dropletSpeedScale: 0.60 + 0.50 * t,
      dropletSizeScale: 0.75 + 0.35 * t,
      
      activeFallingDripsCount: Math.min(5, Math.max(2, Math.round(2 + t * 3))),
      dripSizeScale: 0.80 + 0.40 * t,
      isIntermittentDripping: false, // continuous dripping
      dripStretchFactor: 1.8 + 0.8 * t,
      
      activeSplashRingsCount: Math.min(4, Math.max(2, Math.round(2 + t * 2))),
      splashRingMaxRadiusScale: 0.60 + 0.50 * t,
      splashRingOpacityScale: 0.50 + 0.25 * t,
      
      puddleRadius: calculateSpillRadius(vol),
      expansionSpeed: 0.24 + 0.65 * t, // steady spreading (0.24 - 0.89 m/s)
      harmonicLobeAmplitude: 0.08 + 0.09 * t, // organic surface wetting lobes
      satelliteCount: Math.min(18, Math.max(8, Math.round(8 + t * 10))),
      satelliteMaxSpread: 1.14 + 0.22 * t,
      
      soundMode: 'moderate_trickle',
      soundInterval_ms: 1000,
    };
  }

  // Surge (>12.0 mL, e.g. 15 - 50+ mL): Massive sheet cascade & surge
  const surgeNorm = Math.min(1.0, Math.max(0.0, (vol - 12.0) / 38.0));
  
  return {
    regime: 'surge',
    volume_ml: vol,
    normFactor: surgeNorm,
    
    activeStreamsCount: 6, // full stream count, wide ribbons merging into sheet cascade
    streamSpacingRad: 0.18 + 0.08 * surgeNorm,
    streamWidthBase: 0.048 + 0.052 * surgeNorm, // 48mm - 100mm per ribbon (overlaps into sheet cascade, connects C0 at 12.0mL)
    streamWidthWave: 0.011 + 0.014 * surgeNorm,
    streamThickness: 0.0032 + 0.0035 * surgeNorm, // ~3.2mm - 6.7mm heavy rushing fluid
    waveFrequency: 16.0,
    waveSpeed: 13.5,
    headDescentDuration_ms: Math.round(300 - surgeNorm * 120), // 300 - 180ms rapid downward rush
    
    crestArcSpanRad: 1.00 + 0.90 * surgeNorm, // ~57° - 109° broad rim arc
    crestHeight: 0.0048 + 0.0042 * surgeNorm,
    crestLipSpread: 0.011 + 0.009 * surgeNorm,
    
    activeDropletsCount: 12, // all droplet beads active
    dropletSpeedScale: 1.10 + 0.70 * surgeNorm, // fast rushing spray
    dropletSizeScale: 1.10 + 0.50 * surgeNorm,
    
    activeFallingDripsCount: 8, // full heavy dripping and stream detachment
    dripSizeScale: 1.20 + 0.60 * surgeNorm,
    isIntermittentDripping: false,
    dripStretchFactor: 2.6 + 1.0 * surgeNorm, // continuous elongated detachment columns
    
    activeSplashRingsCount: 6,
    splashRingMaxRadiusScale: 1.10 + 0.70 * surgeNorm,
    splashRingOpacityScale: 0.75 + 0.20 * surgeNorm,
    
    puddleRadius: calculateSpillRadius(vol),
    expansionSpeed: 0.89 + 1.80 * surgeNorm, // rapid forceful expansion (0.89 - 2.69 m/s)
    harmonicLobeAmplitude: 0.17 + 0.11 * surgeNorm, // wide turbulent fingering lobes
    satelliteCount: Math.min(36, Math.max(18, Math.round(18 + surgeNorm * 18))),
    satelliteMaxSpread: 1.36 + 0.49 * surgeNorm, // energetic splash splatter flung far outward
    
    soundMode: 'surge_rush',
    soundInterval_ms: 650,
  };
}
