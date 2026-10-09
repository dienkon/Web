export type FireClass = 'A' | 'B' | 'C_electrical' | 'D_metal';
export type Agent = 'water' | 'co2' | 'abc_powder' | 'blanket';
export type SideEffect =
  | 'SPREAD_BURNING_LIQUID'
  | 'ELECTRIC_SHOCK_RISK'
  | 'VIOLENT_REACTION'
  | 'COLD_BURN_RISK';

export interface EfficacyResult {
  k: number;
  side?: SideEffect;
}

export const EFFICACY: Record<FireClass, Record<Agent, EfficacyResult>> = {
  A: {
    water: { k: 1.0 },
    abc_powder: { k: 1.0 },
    co2: { k: 0.35 },
    blanket: { k: 0.8 },
  },
  B: {
    water: { k: 0.0, side: 'SPREAD_BURNING_LIQUID' },
    abc_powder: { k: 1.0 },
    co2: { k: 1.0 },
    blanket: { k: 0.9 }, // Only for small fires in beaker/flask
  },
  C_electrical: {
    water: { k: 0.0, side: 'ELECTRIC_SHOCK_RISK' },
    abc_powder: { k: 0.9 },
    co2: { k: 1.0 },
    blanket: { k: 0.2 },
  },
  D_metal: {
    water: { k: 0.0, side: 'VIOLENT_REACTION' },
    abc_powder: { k: 0.0 },
    co2: { k: 0.0 },
    blanket: { k: 0.0 }, // Metal fires require Class D powders or immediate evacuation
  },
};
