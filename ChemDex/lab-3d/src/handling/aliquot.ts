import type { SubstanceContent, VesselState } from '../types/chemistry';

export interface LiquidAliquot {
  organicVolume_ml?: number;
  organicColor?: string;
  volume_ml: number;
  mass_g: number;
  temperature_c: number;
  color: string;
  contents: SubstanceContent[];
  substances: string[];
}

const solid = (content: SubstanceContent) => content.phase === 's' || content.state === 's' || content.state === 'solid';
const gas = (content: SubstanceContent) => content.phase === 'g' || content.state === 'g' || content.state === 'gas';
export function withdrawAliquot(vessel: VesselState, requested_ml: number): { vessel: VesselState; sample: LiquidAliquot } {
  const volume = Number.isFinite(requested_ml) ? Math.max(0, Math.min(requested_ml, vessel.volume_ml)) : 0;
  const fraction = vessel.volume_ml > 0 ? volume / vessel.volume_ml : 0;
  const settledMass = vessel.contents.filter(content => solid(content) || gas(content)).reduce((sum, content) => sum + content.mass_g, 0);
  const mass = Math.max(0, vessel.mass_g - settledMass) * fraction;
  const scale = (content: SubstanceContent, ratio: number): SubstanceContent => ({
    ...content, moles: content.moles * ratio, mass_g: content.mass_g * ratio,
    ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * ratio } : {}),
  });
  const contents = vessel.contents.filter(content => !solid(content) && !gas(content)).map(content => scale(content, fraction));
  const remaining = vessel.contents.map(content => solid(content) || gas(content) ? content : scale(content, 1 - fraction));
  return {
    vessel: { ...vessel, volume_ml: vessel.volume_ml - volume,
      ...(vessel.immiscibleOrganicVolume_ml !== undefined ? { immiscibleOrganicVolume_ml: vessel.immiscibleOrganicVolume_ml * (1 - fraction) } : {}),
      volume: (vessel.volume_ml - volume) / vessel.capacity_ml, mass_g: vessel.mass_g - mass,
      contents: remaining, substances: volume === vessel.volume_ml ? remaining.filter(c => c.moles > 1e-12).map(c => c.formula) : vessel.substances },
    sample: { volume_ml: volume, mass_g: mass, temperature_c: vessel.temperature_c,
      ...(vessel.immiscibleOrganicVolume_ml ? { organicVolume_ml: vessel.immiscibleOrganicVolume_ml * fraction, organicColor: vessel.immiscibleOrganicColor } : {}),
      color: vessel.liquidColor ?? '#f8fafc', contents,
      substances: contents.length ? contents.map(c => c.formula) : [...vessel.substances] },
  };
}

export function dispenseAliquot(vessel: VesselState, sample: LiquidAliquot, requested_ml: number) {
  const volume = Number.isFinite(requested_ml) ? Math.max(0, Math.min(requested_ml, sample.volume_ml, vessel.capacity_ml - vessel.volume_ml)) : 0;
  const fraction = sample.volume_ml > 0 ? volume / sample.volume_ml : 0;
  const mass = sample.mass_g * fraction;
  const contents = vessel.contents.map(content => ({ ...content }));
  for (const source of sample.contents) {
    const target = contents.find(content => content.formula === source.formula && content.phase === source.phase && content.liquidLayer === source.liquidLayer);
    if (target) {
      target.moles += source.moles * fraction;
      target.mass_g += source.mass_g * fraction;
    } else contents.push({ ...source, moles: source.moles * fraction, mass_g: source.mass_g * fraction,
      ...(source.volume_ml !== undefined ? { volume_ml: source.volume_ml * fraction } : {}) });
  }
  const totalMass = vessel.mass_g + mass;
  const totalVolume = vessel.volume_ml + volume;
  for (const content of contents) {
    if (!solid(content)) content.concentration_M = totalVolume > 0 ? content.moles / (totalVolume / 1000) : 0;
  }
  return {
    vessel: { ...vessel, volume_ml: totalVolume, volume: totalVolume / vessel.capacity_ml,
      ...(sample.organicVolume_ml ? { immiscibleOrganicVolume_ml: (vessel.immiscibleOrganicVolume_ml ?? 0) + sample.organicVolume_ml * fraction, immiscibleOrganicColor: sample.organicColor } : {}),
      mass_g: totalMass, contents,
      substances: volume > 0 ? [...new Set([...vessel.substances, ...sample.substances])] : vessel.substances,
      liquidColor: vessel.volume_ml > 0 ? vessel.liquidColor : sample.color,
      temperature_c: totalMass > 0 ? (vessel.mass_g * vessel.temperature_c + mass * sample.temperature_c) / totalMass : vessel.temperature_c },
    sample: { ...sample, volume_ml: sample.volume_ml - volume, mass_g: sample.mass_g - mass,
      ...(sample.organicVolume_ml !== undefined ? { organicVolume_ml: sample.organicVolume_ml * (1 - fraction) } : {}),
      contents: sample.contents.map(content => ({ ...content, moles: content.moles * (1 - fraction), mass_g: content.mass_g * (1 - fraction),
        ...(content.volume_ml !== undefined ? { volume_ml: content.volume_ml * (1 - fraction) } : {}) })) },
    dispensed_ml: volume,
  };
}
