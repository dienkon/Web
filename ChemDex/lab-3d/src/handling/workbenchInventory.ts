import { create } from 'zustand';
import { findChemical } from '../data/chemicals';
import { waterVaporReleasedHistoryG } from '../engine/waterVaporRouting';
import { sameMolecularFormula } from '../science/speciesIdentity';
import type { AppState } from '../store/useAppStore';
import { csvCell } from '../utils/csv';
import { buretteAliquot } from './buretteAliquot';
import { isLessonVessel } from './instrumentCatalog';

type InventoryInput = Pick<AppState, 'vessels' | 'inFlightPours' | 'spills' | 'wasteMass_g'
  | 'workbenchEscapedGas_g' | 'pipetteSample' | 'burette' | 'spatulaState'>;

const positiveMass = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;

export function readWorkbenchInventory(state: InventoryInput) {
  const vessels = Object.values(state.vessels).filter(vessel => !isLessonVessel(vessel.id));
  const contents = vessels.map(vessel => ({
    id: vessel.id,
    name: vessel.name,
    held_g: positiveMass(vessel.mass_g),
    condensed_g: positiveMass(vessel.wallCondensation?.inner_g) + positiveMass(vessel.wallCondensation?.outer_g),
    // The water history already accounts for vapor recovered from the gross gas record.
    escaped_g: positiveMass(waterVaporReleasedHistoryG(vessel)) + Object.entries(vessel.escapedGas_g ?? {})
      .filter(([formula]) => !sameMolecularFormula(formula, 'H2O')).reduce((sum, [, mass]) => sum + positiveMass(mass), 0),
  }));
  const burette = state.burette;
  const buretteSample = burette.currentVolume_ml > 0
    ? buretteAliquot(findChemical(burette.reagentFormula), burette.reagentFormula, burette.concentration_M, burette.currentVolume_ml, 25)
    : null;
  const masses = {
    vessels: contents.reduce((sum, vessel) => sum + vessel.held_g, 0),
    condensation: contents.reduce((sum, vessel) => sum + vessel.condensed_g, 0),
    pipette: positiveMass(state.pipetteSample?.mass_g),
    burette: positiveMass(buretteSample?.mass_g),
    spatula: positiveMass(state.spatulaState.mass_g),
    // Wall films in flight are owned by their parcel. Vessel coating fields
    // mirror these parcels for the scale and therefore stay out of this sum.
    inFlight: state.inFlightPours.reduce((sum, parcel) => sum + positiveMass(parcel.sample.mass_g), 0),
    spilled: Object.values(state.spills).reduce((sum, spill) => sum + positiveMass(spill.mass_g), 0),
    waste: positiveMass(state.wasteMass_g),
  };
  return {
    contents,
    masses,
    total_g: Object.values(masses).reduce((sum, mass) => sum + mass, 0),
    escaped_g: contents.reduce((sum, vessel) => sum + vessel.escaped_g, 0)
      + Object.values(state.workbenchEscapedGas_g).reduce((sum, mass) => sum + positiveMass(mass), 0),
    buretteMassUnavailable: burette.currentVolume_ml > 0 && buretteSample === null,
  };
}

type WorkbenchInventory = ReturnType<typeof readWorkbenchInventory>;

export function workbenchInventoryCSV(inventory: WorkbenchInventory, baseline?: WorkbenchInventory | null): string {
  const rows = Object.entries(inventory.masses).map(([key, mass]) => {
    const recorded = key === 'burette' && inventory.buretteMassUnavailable ? null : mass;
    const change = baseline && recorded !== null ? recorded - baseline.masses[key as keyof WorkbenchInventory['masses']] : null;
    return [key, recorded, change];
  });
  rows.push(['on_bench_subtotal', inventory.total_g, baseline ? inventory.total_g - baseline.total_g : null],
    ['recorded_exhaust', inventory.escaped_g, baseline ? inventory.escaped_g - baseline.escaped_g : null]);
  return '\uFEFF' + ['location,recorded_g,change_from_baseline_g',
    ...rows.map(row => row.map(csvCell).join(','))].join('\r\n') + '\r\n';
}

export const useWorkbenchInventoryReference = create<{
  reference: { epoch: number; snapshot: WorkbenchInventory } | null;
}>(() => ({ reference: null }));
