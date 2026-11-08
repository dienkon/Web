import { QUALITY_CONFIGS, type QualityTier } from '../../vfx/quality';
import { precipitateComponents } from '../../science/precipitateInventory';
import type { VesselState } from '../../types/chemistry';

const counts = new WeakMap<Record<string, VesselState>, number>();
/** All subscribers share one inventory scan for each immutable store snapshot. */
export function activePrecipitateVessels(vessels: Record<string, VesselState>) {
  const cached = counts.get(vessels); if (cached !== undefined) return cached;
  const count = Object.values(vessels).filter(v => !v.isShattered && v.volume_ml > 0.2
    && precipitateComponents(v.contents, v.precipitateSubstance).length > 0).length;
  counts.set(vessels, count); return count;
}

/** Weighted parcels retain mass and physical radius when glyph count changes.
 * Reserve 30% of the scene's display budget for bubbles, mist and other FX. */
export function precipitateSceneBudget(tier: QualityTier, activeVessels: number) {
  const total = Math.floor(QUALITY_CONFIGS[tier].maxLiveParticles * 0.7);
  const cap = tier === 'high' || tier === 'ultra' ? 900 : tier === 'medium' ? 550 : tier === 'low' ? 260 : 120;
  const visible = Math.min(cap, Math.floor(total / Math.max(1, activeVessels)));
  // A hidden physical parcel still carries settling mass in very large scenes.
  return { physical: Math.max(1, visible), visible, total };
}
