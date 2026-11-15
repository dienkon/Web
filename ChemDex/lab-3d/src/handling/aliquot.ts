import type { SubstanceContent, VesselState } from '../types/chemistry';
import { availableLiquidVolume, occupiedLiquidVolume } from './solidOccupancy';
import type { MobileSolidInventory } from '../science/suspensionTransport';
import { precipitateComponents, precipitateCohorts, precipitateCohortKey, rowPrecipitateFormation,
  precipitateCohortOutflow, isSuspensionRow, withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { attachedMetalMassForRow } from '../science/metalSurfaceAppearance';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { blendLiquidOptics, liquidOptics, type LiquidOptics } from '../pour/physics/mixing';
import { liquidContactFailure } from './liquidContact';

export interface LiquidAliquot {
  optics?: LiquidOptics;
  reactionProgramId?: string | null;
  contactChemistryLimit?: 'phase_boundary';
  organicVolume_ml?: number;
  organicColor?: string;
  volume_ml: number;
  mass_g: number;
  temperature_c: number;
  color: string;
  contents: SubstanceContent[];
  substances: string[];
}

const solid = (content: SubstanceContent) => ['s', 'solid'].includes(content.phase ?? content.state ?? identifySpecies(content.formula).phase ?? '');
const gas = (content: SubstanceContent) => ['g', 'gas'].includes(content.phase ?? content.state ?? identifySpecies(content.formula).phase ?? '');
export function refreshPrecipitateSummary(vessel: VesselState): VesselState {
  const components = precipitateComponents(vessel.contents, vessel.precipitateSubstance);
  const active = components.find(c => vessel.precipitateSubstance && sameMolecularFormula(c.formula, vessel.precipitateSubstance)) ?? components[0];
  return { ...vessel, hasPrecipitate: components.length > 0,
    precipitateAmount_g: components.reduce((s, c) => s + c.mass_g, 0),
    ...(active ? { precipitateSubstance: active.formula, precipitateMorphology: active.formation ?? vessel.precipitateMorphology } : {}) };
}

export function withdrawAliquot(vessel: VesselState, requested_ml: number, mobileSolids: MobileSolidInventory = {}): { vessel: VesselState; sample: LiquidAliquot } {
  const volume = Number.isFinite(requested_ml) ? Math.max(0, Math.min(requested_ml, vessel.volume_ml)) : 0;
  const fraction = vessel.volume_ml > 0 ? volume / vessel.volume_ml : 0;
  const input = Object.keys(mobileSolids).length ? withLegacyPrecipitateOrigins(vessel) : vessel.contents;
  const solidFractions = new Map<string, number>();
  const cohorts = precipitateCohorts(input, vessel.precipitateSubstance, vessel.precipitateMorphology);
  const keyOf = (row: SubstanceContent) => precipitateCohortKey(row.formula,
    rowPrecipitateFormation(row, input, vessel.precipitateSubstance, vessel.precipitateMorphology));
  const material = input === vessel.contents ? vessel : { ...vessel, contents: input };
  const freeFraction = (row: SubstanceContent) => row.mass_g > 0
    ? Math.max(0, 1 - attachedMetalMassForRow(material, row) / row.mass_g) : 0;
  for (const c of cohorts) {
    const total = mobileSolids[c.formula];
    // Legacy formula-only callers are valid only for one formation. Splitting
    // one mobile total between a bed and a suspension would invent erosion.
    const mobile = total?.cohorts?.[c.key] ?? (cohorts.filter(k => k.formula === c.formula).length === 1 ? total : undefined);
    const previousOutflow = precipitateCohortOutflow(vessel, c.key, c.formula);
    if (!mobile || ![mobile.inventoryMass_g, mobile.suspendedMass_g, previousOutflow].every(Number.isFinite)
      || !(mobile.inventoryMass_g > 0) || mobile.suspendedMass_g < 0 || previousOutflow < 0
      || mobile.suspendedMass_g > c.mass_g + Math.max(1e-10, c.mass_g * 1e-8)
      || Math.abs(c.mass_g - mobile.inventoryMass_g) > Math.max(1e-10, c.mass_g * 1e-8)) continue;
    const freeMass = input.filter(row => isSuspensionRow(row, input, vessel.precipitateSubstance) && keyOf(row) === c.key)
      .reduce((sum, row) => sum + row.mass_g * freeFraction(row), 0);
    if (mobile.suspendedMass_g > freeMass + Math.max(1e-10, freeMass * 1e-8)) continue;
    solidFractions.set(c.key, freeMass > 0 ? fraction * Math.min(freeMass, mobile.suspendedMass_g) / freeMass : 0);
  }
  const retained = (c: SubstanceContent) => gas(c) || (c.location && c.location !== 'bulk');
  const outgoingFraction = (c: SubstanceContent) => retained(c) ? 0 : !solid(c) ? fraction
    : isSuspensionRow(c, input, vessel.precipitateSubstance) ? (solidFractions.get(keyOf(c)) ?? 0) * freeFraction(c) : 0;
  const scale = (content: SubstanceContent, ratio: number): SubstanceContent => ({
    ...content, moles: content.moles * ratio, mass_g: content.mass_g * ratio,
    ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * ratio } : {}),
  });
  const contents = input.filter(c => outgoingFraction(c) > 0).map(c => ({ ...scale(c, outgoingFraction(c)),
    ...(solid(c) ? { phase: 's', solidOrigin: 'precipitate' as const,
      precipitateFormation: c.precipitateFormation ?? rowPrecipitateFormation(c, input, vessel.precipitateSubstance, vessel.precipitateMorphology) } : {}) }));
  const remaining = input.map(c => scale(c, 1 - outgoingFraction(c)));
  const movedSolidMass = contents.filter(solid).reduce((s, c) => s + c.mass_g, 0);
  const nonLiquidMass = input.filter(c => solid(c) || retained(c)).reduce((s, c) => s + c.mass_g, 0);
  const mass = Math.max(0, vessel.mass_g - nonLiquidMass) * fraction + movedSolidMass;
  const outflow = { ...vessel.precipitateOutflow_g };
  const cohortOutflow = { ...vessel.precipitateCohortOutflow_g };
  for (const c of cohorts) cohortOutflow[c.key] ??= precipitateCohortOutflow(vessel, c.key, c.formula);
  for (const c of contents.filter(solid)) {
    const formula = identifySpecies(c.formula).formula;
    outflow[formula] = (outflow[formula] ?? 0) + c.mass_g;
    const key = keyOf(c);
    cohortOutflow[key] = (cohortOutflow[key] ?? 0) + c.mass_g;
  }
  const source: VesselState = { ...vessel, volume_ml: vessel.volume_ml - volume,
    ...(vessel.immiscibleOrganicVolume_ml !== undefined ? { immiscibleOrganicVolume_ml: vessel.immiscibleOrganicVolume_ml * (1 - fraction) } : {}),
    ...(movedSolidMass > 0 ? { precipitateOutflow_g: outflow, precipitateCohortOutflow_g: cohortOutflow } : {}),
    volume: (vessel.volume_ml - volume) / vessel.capacity_ml, mass_g: vessel.mass_g - mass,
    contents: remaining, substances: volume === vessel.volume_ml ? remaining.filter(c => c.moles > 1e-12).map(c => c.formula) : vessel.substances };
  return {
    vessel: movedSolidMass > 0 ? refreshPrecipitateSummary(source) : source,
    sample: { volume_ml: volume, mass_g: mass, temperature_c: vessel.temperature_c,
      ...(vessel.immiscibleOrganicVolume_ml ? { organicVolume_ml: vessel.immiscibleOrganicVolume_ml * fraction, organicColor: vessel.immiscibleOrganicColor } : {}),
      color: vessel.liquidColor ?? '#f8fafc', optics: liquidOptics(vessel.liquidColor ?? '#f8fafc', vessel.liquidOptics), contents,
      substances: contents.length ? contents.map(c => c.formula) : [...vessel.substances] },
  };
}

function mergeContents(vessel: VesselState, sample: LiquidAliquot, fraction: number) {
  const contents = withLegacyPrecipitateOrigins(vessel);
  for (const entry of sample.contents) {
    const source = { ...entry, phase: entry.phase ?? identifySpecies(entry.formula).phase ?? undefined };
    const target = contents.find(content => content.formula === source.formula && content.phase === source.phase
      && content.liquidLayer === source.liquidLayer && content.location === source.location
      && content.solidOrigin === source.solidOrigin && content.precipitateFormation === source.precipitateFormation
      && content.depositSubstrate === source.depositSubstrate && content.depositionReactionId === source.depositionReactionId
      && content.depositCarrierId === source.depositCarrierId && content.depositReleased === source.depositReleased);
    if (target) {
      target.moles += source.moles * fraction;
      target.mass_g += source.mass_g * fraction;
      if (source.volume_ml !== undefined) target.volume_ml = (target.volume_ml ?? 0) + source.volume_ml * fraction;
    } else contents.push({ ...source, moles: source.moles * fraction, mass_g: source.mass_g * fraction,
      ...(source.volume_ml !== undefined ? { volume_ml: source.volume_ml * fraction } : {}) });
  }
  return contents;
}

/** Internal material merge. The pouring receiver must resolve overflow before
 * publishing this potentially overfilled intermediate; never resize its glass. */
export function mergeLiquidDose(vessel: VesselState, sample: LiquidAliquot, volume: number): VesselState {
  const fraction = volume / sample.volume_ml, mass = sample.mass_g * fraction;
  const contents = mergeContents(vessel, sample, fraction);
  const totalMass = vessel.mass_g + mass, totalVolume = vessel.volume_ml + volume;
  const organic = sample.organicVolume_ml ?? 0, heldOrganic = vessel.immiscibleOrganicVolume_ml ?? 0;
  const optics = blendLiquidOptics(liquidOptics(vessel.liquidColor ?? '#f8fafc', vessel.liquidOptics),
    Math.max(0, vessel.volume_ml - heldOrganic), liquidOptics(sample.color, sample.optics), Math.max(0, volume - organic * fraction));
  for (const content of contents) {
    if (!solid(content)) content.concentration_M = totalVolume > 0 ? content.moles / (totalVolume / 1000) : 0;
  }
  return { ...vessel, volume_ml: totalVolume, volume: totalVolume / vessel.capacity_ml,
    ...(organic > 0 ? { immiscibleOrganicVolume_ml: heldOrganic + organic * fraction, immiscibleOrganicColor: sample.organicColor } : {}),
    mass_g: totalMass, contents, substances: [...new Set([...vessel.substances, ...sample.substances])],
    liquidColor: optics.hex, liquidOptics: optics,
    temperature_c: totalMass > 0 ? (vessel.mass_g * vessel.temperature_c + mass * sample.temperature_c) / totalMass : vessel.temperature_c };
}

export function dispenseAliquot(vessel: VesselState, sample: LiquidAliquot, requested_ml: number): {
  vessel: VesselState; sample: LiquidAliquot; dispensed_ml: number; failureReason?: string;
} {
  if (vessel.isShattered || vessel.isSealed || !(vessel.capacity_ml > 0) || !Number.isFinite(vessel.capacity_ml)
    || !(requested_ml > 0) || !Number.isFinite(requested_ml)
    || !(sample.volume_ml > 0) || !Number.isFinite(sample.volume_ml) || !Number.isFinite(sample.mass_g) || sample.mass_g < 0)
    return { vessel, sample, dispensed_ml: 0 };
  const incomingSolidMass = sample.contents.filter(solid).reduce((s, c) => s + c.mass_g, 0);
  const incomingDensity = sample.volume_ml > 0 ? Math.max(0, sample.mass_g - incomingSolidMass) / sample.volume_ml : 1;
  let volume = Number.isFinite(requested_ml) ? Math.max(0, Math.min(requested_ml, sample.volume_ml, availableLiquidVolume(vessel, incomingDensity))) : 0;
  if (incomingSolidMass > 0 && volume > 0 && sample.volume_ml > 0) {
    const fits = (added: number) => occupiedLiquidVolume({ ...vessel, volume_ml: vessel.volume_ml + added,
      contents: mergeContents(vessel, sample, added / sample.volume_ml) }) + Math.max(0, vessel.wallCoating_ml ?? 0) <= vessel.capacity_ml;
    if (!fits(volume)) {
      let low = 0, high = volume;
      for (let i = 0; i < 40; i++) {
        const mid = (low + high) / 2;
        if (fits(mid)) low = mid; else high = mid;
      }
      volume = low;
    }
  }
  const fraction = sample.volume_ml > 0 ? volume / sample.volume_ml : 0;
  if (!(volume > 0)) return { vessel, sample, dispensed_ml: 0 };
  const mass = sample.mass_g * fraction;
  const receiver = mergeLiquidDose(vessel, sample, volume);
  return {
    vessel: incomingSolidMass > 0 && volume > 0 ? refreshPrecipitateSummary(receiver) : receiver,
    sample: { ...sample, volume_ml: sample.volume_ml - volume, mass_g: sample.mass_g - mass,
      ...(sample.organicVolume_ml !== undefined ? { organicVolume_ml: sample.organicVolume_ml * (1 - fraction) } : {}),
      contents: sample.contents.map(content => ({ ...content, moles: content.moles * (1 - fraction), mass_g: content.mass_g * (1 - fraction),
        ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * (1 - fraction) } : {}) })) },
    dispensed_ml: volume,
    failureReason: liquidContactFailure(vessel, sample, volume),
  };
}
