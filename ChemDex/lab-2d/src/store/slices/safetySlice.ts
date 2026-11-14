import { SpillPuddle } from '../../types/equipment';
import { DEFAULT_PPE_STATE } from '../../engine/safetyEngine2D';
import { neutralizeSpillWithNaHCO3 } from '../../engine/spillChemistry2D';
import { soundEngine } from '../../services/soundEngine';
import type { LabSliceCreator, LabStoreState } from '../labStoreTypes';

export type SafetySlice = Pick<
  LabStoreState,
  | 'spillPuddles'
  | 'ppe'
  | 'safetyAlerts'
  | 'togglePpe'
  | 'dismissSafetyAlert'
  | 'neutralizeSpill'
  | 'cleanSpill'
  | 'cleanAllSpills'
  | 'addSpillPuddle'
>;

export const createSafetySlice: LabSliceCreator<SafetySlice> = (set) => ({
  spillPuddles: [],
  ppe: { ...DEFAULT_PPE_STATE },
  safetyAlerts: [],

  togglePpe: (item) => {
    soundEngine.click();
    set(s => ({
      ppe: { ...s.ppe, [item]: !s.ppe[item] },
    }));
  },

  dismissSafetyAlert: (id) =>
    set(s => ({
      safetyAlerts: s.safetyAlerts.filter(a => a.id !== id),
    })),

  neutralizeSpill: (id) => {
    soundEngine.fizz(1.0);
    set(s => ({
      spillPuddles: s.spillPuddles.map(p => (p.id === id ? neutralizeSpillWithNaHCO3(p, 2.5) : p)),
    }));
  },

  cleanSpill: (id) =>
    set(s => {
      const targetPuddle = s.spillPuddles.find(p => p.id === id);
      const spillMass = targetPuddle ? Math.max(0, targetPuddle.volume_ml * 1.0) : 0;
      return {
        spillPuddles: s.spillPuddles.filter(p => p.id !== id),
        wasteMass_g: Math.round((s.wasteMass_g + spillMass) * 100) / 100,
      };
    }),

  cleanAllSpills: () =>
    set(s => {
      const spillMass = s.spillPuddles.reduce((sum, p) => sum + Math.max(0, p.volume_ml * 1.0), 0);
      return {
        spillPuddles: [],
        wasteMass_g: Math.round((s.wasteMass_g + spillMass) * 100) / 100,
      };
    }),

  addSpillPuddle: (x, y, volume_ml, colorHex, formula, ph = 7.0) => {
    const id = `puddle_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newPuddle: SpillPuddle = {
      id,
      x,
      y,
      volume_ml,
      colorHex,
      formula,
      ph,
      radius_px: Math.min(65, Math.max(18, 12 + Math.sqrt(volume_ml) * 5)),
      timestamp: Date.now(),
    };
    set(s => ({
      spillPuddles: [...s.spillPuddles.slice(-12), newPuddle],
    }));
  },
});
