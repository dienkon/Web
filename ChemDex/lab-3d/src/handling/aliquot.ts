import type { SubstanceContent, VesselState } from '../types/chemistry';
import { availableLiquidVolume, occupiedLiquidVolume } from './solidOccupancy';
import type { MobileSolidInventory } from '../science/suspensionTransport';
import { precipitateComponents, isSuspensionRow, withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';

export interface LiquidAliquot {
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
function refreshPrecipitateSummary(vessel: VesselState): VesselState {
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
  for (const c of precipitateComponents(input, vessel.precipitateSubstance)) {
    const mobile = mobileSolids[c.formula], previousOutflow = vessel.precipitateOutflow_g?.[c.formula] ?? 0;
    if (!mobile || ![mobile.inventoryMass_g, mobile.suspendedMass_g, previousOutflow].every(Number.isFinite)
      || !(mobile.inventoryMass_g > 0) || mobile.suspendedMass_g < 0 || previousOutflow < 0
      || mobile.suspendedMass_g > c.mass_g + Math.max(1e-10, c.mass_g * 1e-8)
      || Math.abs(c.mass_g - mobile.inventoryMass_g) > Math.max(1e-10, c.mass_g * 1e-8)) continue;
    solidFractions.set(c.formula, fraction * Math.min(c.mass_g, mobile.suspendedMass_g) / c.mass_g);
  }
  const retained = (c: SubstanceContent) => gas(c) || (c.location && c.location !== 'bulk');
  const outgoingFraction = (c: SubstanceContent) => retained(c) ? 0 : !solid(c) ? fraction
    : isSuspensionRow(c, input, vessel.precipitateSubstance) ? solidFractions.get(identifySpecies(c.formula).formula) ?? 0 : 0;
  const scale = (content: SubstanceContent, ratio: number): SubstanceContent => ({
    ...content, moles: content.moles * ratio, mass_g: content.mass_g * ratio,
    ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * ratio } : {}),
  });
  const contents = input.filter(c => outgoingFraction(c) > 0).map(c => ({ ...scale(c, outgoingFraction(c)),
    ...(solid(c) ? { phase: 's', solidOrigin: 'precipitate' as const,
      precipitateFormation: c.precipitateFormation ?? vessel.precipitateMorphology } : {}) }));
  const remaining = input.map(c => scale(c, 1 - outgoingFraction(c)));
  const movedSolidMass = contents.filter(solid).reduce((s, c) => s + c.mass_g, 0);
  const nonLiquidMass = input.filter(c => solid(c) || retained(c)).reduce((s, c) => s + c.mass_g, 0);
  const mass = Math.max(0, vessel.mass_g - nonLiquidMass) * fraction + movedSolidMass;
  const outflow = { ...vessel.precipitateOutflow_g };
  for (const c of contents.filter(solid)) {
    const formula = identifySpecies(c.formula).formula;
    outflow[formula] = (outflow[formula] ?? 0) + c.mass_g;
  }
  const source: VesselState = { ...vessel, volume_ml: vessel.volume_ml - volume,
    ...(vessel.immiscibleOrganicVolume_ml !== undefined ? { immiscibleOrganicVolume_ml: vessel.immiscibleOrganicVolume_ml * (1 - fraction) } : {}),
    ...(movedSolidMass > 0 ? { precipitateOutflow_g: outflow } : {}),
    volume: (vessel.volume_ml - volume) / vessel.capacity_ml, mass_g: vessel.mass_g - mass,
    contents: remaining, substances: volume === vessel.volume_ml ? remaining.filter(c => c.moles > 1e-12).map(c => c.formula) : vessel.substances };
  return {
    vessel: movedSolidMass > 0 ? refreshPrecipitateSummary(source) : source,
    sample: { volume_ml: volume, mass_g: mass, temperature_c: vessel.temperature_c,
      ...(vessel.immiscibleOrganicVolume_ml ? { organicVolume_ml: vessel.immiscibleOrganicVolume_ml * fraction, organicColor: vessel.immiscibleOrganicColor } : {}),
      color: vessel.liquidColor ?? '#f8fafc', contents,
      substances: contents.length ? contents.map(c => c.formula) : [...vessel.substances] },
  };
}

export function dispenseAliquot(vessel: VesselState, sample: LiquidAliquot, requested_ml: number) {
  const incomingSolidMass = sample.contents.filter(solid).reduce((s, c) => s + c.mass_g, 0);
  const incomingDensity = sample.volume_ml > 0 ? Math.max(0, sample.mass_g - incomingSolidMass) / sample.volume_ml : 1;
  const mergeAt = (fraction: number) => {
    const contents = vessel.contents.map(content => ({ ...content }));
    for (const entry of sample.contents) {
      const source = { ...entry, phase: entry.phase ?? identifySpecies(entry.formula).phase ?? undefined };
      const target = contents.find(content => content.formula === source.formula && content.phase === source.phase
        && content.liquidLayer === source.liquidLayer && content.location === source.location
        && content.solidOrigin === source.solidOrigin && content.precipitateFormation === source.precipitateFormation);
      if (target) {
        target.moles += source.moles * fraction;
        target.mass_g += source.mass_g * fraction;
      } else contents.push({ ...source, moles: source.moles * fraction, mass_g: source.mass_g * fraction,
        ...(source.volume_ml !== undefined ? { volume_ml: source.volume_ml * fraction } : {}) });
    }
    return contents;
  };
  let volume = Number.isFinite(requested_ml) ? Math.max(0, Math.min(requested_ml, sample.volume_ml, availableLiquidVolume(vessel, incomingDensity))) : 0;
  if (incomingSolidMass > 0 && volume > 0 && sample.volume_ml > 0) {
    const fits = (added: number) => occupiedLiquidVolume({ ...vessel, volume_ml: vessel.volume_ml + added,
      contents: mergeAt(added / sample.volume_ml) }) + Math.max(0, vessel.wallCoating_ml ?? 0) <= vessel.capacity_ml;
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
  const mass = sample.mass_g * fraction;
  const contents = mergeAt(fraction);
  const totalMass = vessel.mass_g + mass;
  const totalVolume = vessel.volume_ml + volume;
  for (const content of contents) {
    if (!solid(content)) content.concentration_M = totalVolume > 0 ? content.moles / (totalVolume / 1000) : 0;
  }
  const receiver: VesselState = { ...vessel, volume_ml: totalVolume, volume: totalVolume / vessel.capacity_ml,
      ...(sample.organicVolume_ml ? { immiscibleOrganicVolume_ml: (vessel.immiscibleOrganicVolume_ml ?? 0) + sample.organicVolume_ml * fraction, immiscibleOrganicColor: sample.organicColor } : {}),
      mass_g: totalMass, contents,
      substances: volume > 0 ? [...new Set([...vessel.substances, ...sample.substances])] : vessel.substances,
      liquidColor: vessel.volume_ml > 0 ? vessel.liquidColor : sample.color,
      temperature_c: totalMass > 0 ? (vessel.mass_g * vessel.temperature_c + mass * sample.temperature_c) / totalMass : vessel.temperature_c };
  return {
    vessel: incomingSolidMass > 0 && volume > 0 ? refreshPrecipitateSummary(receiver) : receiver,
    sample: { ...sample, volume_ml: sample.volume_ml - volume, mass_g: sample.mass_g - mass,
      ...(sample.organicVolume_ml !== undefined ? { organicVolume_ml: sample.organicVolume_ml * (1 - fraction) } : {}),
      contents: sample.contents.map(content => ({ ...content, moles: content.moles * (1 - fraction), mass_g: content.mass_g * (1 - fraction),
        ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * (1 - fraction) } : {}) })) },
    dispensed_ml: volume,
  };
}
