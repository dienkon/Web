import type { VesselState } from '../types/chemistry';
import type { StockGrainContact } from './stockLiquidContact';

export interface StockContactEvaluation {
  fraction: number;
  contacts: StockGrainContact[];
}
export type StockContactEvaluator = (vessel: VesselState, formula: string, aqueousOnly: boolean) => StockContactEvaluation;

// A local chemistry view can use a measured non-vessel boundary (e.g. a
// sessile puddle) without interpreting its world poses inside a fake beaker.
// Enumerable symbols survive participating-pool spreads but never JSON saves.
const contactContext = Symbol('stockContactContext');
type ContactVessel = VesselState & { [contactContext]?: StockContactEvaluator };

export function withStockContactContext(vessel: VesselState, evaluate: StockContactEvaluator): VesselState {
  return { ...vessel, [contactContext]: evaluate } as ContactVessel;
}

export function evaluatedStockContact(vessel: VesselState, formula: string, aqueousOnly: boolean): StockContactEvaluation | undefined {
  return (vessel as ContactVessel)[contactContext]?.(vessel, formula, aqueousOnly);
}
