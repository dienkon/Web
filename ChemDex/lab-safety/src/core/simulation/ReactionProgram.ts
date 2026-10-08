
export interface SimState {
  temperature: number;
  liquidVolume: number;
  containerVolume: number;
  phase: 'solid' | 'liquid' | 'gas';
  isBurning: boolean;
  pH?: number;
}

export const deriveVFX = (state: SimState) => {
  const effects = [];
  if (state.isBurning) effects.push('fire_particles');
  if (state.temperature > 80 && state.liquidVolume > 0) effects.push('boiling_bubbles');
  if (state.pH !== undefined && (state.pH < 3 || state.pH > 11)) effects.push('corrosive_fumes');
  return effects;
};
