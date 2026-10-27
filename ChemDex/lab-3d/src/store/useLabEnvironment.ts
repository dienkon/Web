import { create } from 'zustand';
import { DEFAULT_LAB_ENVIRONMENT, type LabEnvironment } from '../science/labEnvironment';

export const useLabEnvironment = create<{
  conditions: LabEnvironment;
  setConditions: (patch: Partial<LabEnvironment>) => void;
}>(set => ({
  conditions: { ...DEFAULT_LAB_ENVIRONMENT },
  setConditions: patch => set(state => {
    const next = { ...state.conditions };
    const bounds: Record<keyof LabEnvironment, [number, number]> = {
      temperature_c: [10, 40], pressure_atm: [0.6, 1.2], oxygenFraction: [0, 0.21], airSpeed_m_s: [0, 1], relativeHumidity: [0, 1],
    };
    for (const key of Object.keys(bounds) as (keyof LabEnvironment)[]) {
      const value = patch[key];
      if (value !== undefined && Number.isFinite(value)) next[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], value));
    }
    return { conditions: next };
  }),
}));
