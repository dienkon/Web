import { create } from 'zustand';

export type QualityTier = 'low' | 'medium' | 'high';
export type QualityPreference = 'auto' | QualityTier;

export interface QualitySettings {
  dprMax: number;
  glassTransmission: boolean;
  transmissionResolutionScale: number;
  usePostFX: boolean;
  useN8AO: boolean;
  useBloom: boolean;
  useSMAA: boolean;
  useVignette: boolean;
  particleMultiplier: number;
  maxLiveParticles: number;
  tableReflector: boolean;
  heatHaze: boolean;
}

export const QUALITY_CONFIGS: Record<QualityTier, QualitySettings> = {
  high: {
    dprMax: 1.5,
    glassTransmission: true,
    transmissionResolutionScale: 0.75,
    usePostFX: true,
    useN8AO: false, // Heavy SSAO disabled by default to maintain consistent 60 FPS
    useBloom: true,
    useSMAA: true,
    useVignette: false,
    particleMultiplier: 0.85,
    maxLiveParticles: 1800,
    tableReflector: false, // Matte non-glare epoxy bench as requested
    heatHaze: true,
  },
  medium: {
    dprMax: 1.25,
    glassTransmission: true,
    transmissionResolutionScale: 0.5,
    usePostFX: true,
    useN8AO: false,
    useBloom: true,
    useSMAA: false,
    useVignette: false,
    particleMultiplier: 0.5,
    maxLiveParticles: 1000,
    tableReflector: false,
    heatHaze: false,
  },
  low: {
    dprMax: 1.0,
    glassTransmission: false,
    transmissionResolutionScale: 0.25,
    usePostFX: false,
    useN8AO: false,
    useBloom: false,
    useSMAA: false,
    useVignette: false,
    particleMultiplier: 0.25,
    maxLiveParticles: 500,
    tableReflector: false,
    heatHaze: false,
  },
};

const STORAGE_KEY = 'chemlab_vfx_quality_preference';

function getInitialPreference(): QualityPreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'auto' || saved === 'low' || saved === 'medium' || saved === 'high') {
      return saved;
    }
  } catch {
    // fallback if localStorage not accessible
  }
  return 'auto';
}

interface QualityStoreState {
  preference: QualityPreference;
  effectiveTier: QualityTier;
  setPreference: (pref: QualityPreference) => void;
  setEffectiveTier: (tier: QualityTier) => void;
  handlePerformanceDecline: () => void;
  handlePerformanceIncline: () => void;
}

export const useQualityStore = create<QualityStoreState>((set, get) => ({
  preference: getInitialPreference(),
  effectiveTier: 'high',
  setPreference: (preference: QualityPreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {}
    if (preference === 'auto') {
      set({ preference, effectiveTier: 'high' });
    } else {
      set({ preference, effectiveTier: preference });
    }
  },
  setEffectiveTier: (effectiveTier: QualityTier) => {
    set({ effectiveTier });
  },
  handlePerformanceDecline: () => {
    const { preference, effectiveTier } = get();
    if (preference !== 'auto') return;
    if (effectiveTier === 'high') {
      set({ effectiveTier: 'medium' });
    } else if (effectiveTier === 'medium') {
      set({ effectiveTier: 'low' });
    }
  },
  handlePerformanceIncline: () => {
    const { preference, effectiveTier } = get();
    if (preference !== 'auto') return;
    if (effectiveTier === 'low') {
      set({ effectiveTier: 'medium' });
    } else if (effectiveTier === 'medium') {
      set({ effectiveTier: 'high' });
    }
  },
}));

export function getQualitySettings(tier: QualityTier): QualitySettings {
  return QUALITY_CONFIGS[tier] || QUALITY_CONFIGS.high;
}
