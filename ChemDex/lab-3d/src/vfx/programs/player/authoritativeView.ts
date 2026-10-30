import type { VesselState } from '../../../types/chemistry';
import type { ActiveKineticsState } from '../../../store/useAppStore';
import type { LedgerView, VesselPatch } from '../../catalog/types';
import type { ReactionProgram } from '../../../shared/programSchema';
import { indicatorColor } from '../../../science/indicatorAppearance';
import { waterVisualState } from '../../waterVisualState';
import { DEFAULT_LAB_ENVIRONMENT } from '../../../science/labEnvironment';

/** Snapshot in declared units. Rendering cannot invent species, pressure,
 * heat release, or gas holdup from a boolean or a timeline parameter. */
export function buildProgramLedgerView(vessel: VesselState, kinetics: ActiveKineticsState): LedgerView {
  const speciesAmounts: Record<string, number> = {};
  for (const c of vessel.contents) {
    if (Number.isFinite(c.moles) && c.moles > 0) speciesAmounts[c.formula] = (speciesAmounts[c.formula] ?? 0) + c.moles;
  }
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
  const water = waterVisualState(vessel);
  return {
    reactionProgress: kinetics.progress,
    time_s: kinetics.progress * kinetics.duration,
    temperature_c: vessel.temperature_c,
    pressure_atm: vessel.internalPressure_atm ?? env.pressure_atm,
    pH: vessel.ph,
    turbidity: vessel.turbidity ?? 0,
    liquidColor: vessel.liquidColor ?? '#f8fafc',
    gasHoldup: 0, // no resolved dispersed-gas volume field; unknown is not 20%
    foam_ml: vessel.foam_ml ?? 0,
    speciesAmounts,
    speciesRates: {}, // visual bubble rates are not chemical mol/s
    heatRate_W: 0, // no instantaneous reaction-power ledger available here
    isBoiling: water.isBoiling,
    evaporationRate_g_s: Math.max(0, vessel.evaporationRate_g_s ?? 0),
    waterVaporOutflow_g_s: water.rate_g_s,
    waterMistVisibility: water.visibility,
    waterVaporTemperature_c: water.sourceTemperature_c,
  };
}

/** Timeline curves describe optics. They cannot overwrite quantities, phase
 * flags, temperatures, real sediment/foam, or the chemistry's solution color.
 * Indicators are the exception: their appearance is derived from measured pH.
 * Return only changes so the caller can publish one immutable store update. */
export function programAppearanceChanges(vessel: VesselState, patch: VesselPatch,
  program: ReactionProgram): Partial<VesselState> {
  const result: Partial<VesselState> = {};
  if (Number.isFinite(patch.liquidOpacity) && patch.liquidOpacity! >= 0 && patch.liquidOpacity! <= 1
    && patch.liquidOpacity !== vessel.liquidOpacity) result.liquidOpacity = patch.liquidOpacity;
  if (program.chemistry.representation === 'indicator') {
    const color = indicatorColor(program.id, vessel.ph);
    if (color && color !== vessel.liquidColor) result.liquidColor = color;
  }
  return result;
}
