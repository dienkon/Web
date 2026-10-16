import type { SubstanceContent, VesselState } from '../types/chemistry';
import type { LiquidAliquot } from '../handling/aliquot';
import { dispenseAliquot } from '../handling/aliquot';
import { isImmiscibleOrganic } from '../data/chemicals';

export const solidContent = (item: SubstanceContent) => item.phase === 's' || item.state === 's' || item.state === 'solid';
const gasContent = (item: SubstanceContent) => item.phase === 'g' || item.state === 'g' || item.state === 'gas';
const organicContent = (item: SubstanceContent) => item.liquidLayer === 'organic'
  || (item.liquidLayer !== 'aqueous' && isImmiscibleOrganic(item.formula));
const positive = (item: SubstanceContent) => item.moles > 1e-12 || item.mass_g > 1e-12;

/** volume_ml is TOTAL liquid; the organic volume is a subset, never added twice. */
export function phaseVolumes(vessel: VesselState) {
  const total = Math.max(0, vessel.volume_ml);
  const organic = Math.max(0, Math.min(total, vessel.immiscibleOrganicVolume_ml ?? 0));
  return { organic, aqueous: total - organic };
}

export function separatedLayers(vessel: VesselState) {
  const volumes = phaseVolumes(vessel);
  const liquid = vessel.contents.filter(item => !solidContent(item) && !gasContent(item));
  const mass = (organic: boolean) => liquid.filter(item => organicContent(item) === organic).reduce((sum, item) => sum + item.mass_g, 0);
  const organicBelow = volumes.organic > 0 && (volumes.aqueous <= 0 || mass(true) / volumes.organic > mass(false) / volumes.aqueous);
  return { lower: organicBelow ? 'organic' as const : 'aqueous' as const,
    lowerVolume_ml: organicBelow ? volumes.organic : volumes.aqueous,
    upperVolume_ml: organicBelow ? volumes.aqueous : volumes.organic };
}

export function refreshFlowInventory(vessel: VesselState): VesselState {
  const aqueous = phaseVolumes(vessel).aqueous;
  return { ...vessel, volume: vessel.capacity_ml > 0 ? vessel.volume_ml / vessel.capacity_ml : 0,
    density_g_ml: vessel.volume_ml > 0 ? Math.max(0, vessel.mass_g - vessel.contents.filter(item => solidContent(item) || gasContent(item)).reduce((sum, item) => sum + item.mass_g, 0)) / vessel.volume_ml : undefined,
    substances: [...new Set(vessel.contents.filter(positive).map(item => item.formula))],
    contents: vessel.contents.map(item => ({ ...item,
      ...(item.phase === 'aq' && !organicContent(item) ? { concentration_M: aqueous > 0 ? item.moles / (aqueous / 1000) : undefined } : {}) })),
  };
}

const RECEIVERS = new Set(['beaker', 'flask', 'test_tube', 'cylinder', 'volumetric_flask', 'watch_glass', 'petri_dish', 'crucible', 'evaporating_dish']);
export function selectFunnelReceiver(source: VesselState, vessels: Record<string, VesselState>): VesselState | null {
  const eligible = (item: VesselState) => item.id !== source.id && RECEIVERS.has(item.type)
    && !item.isSealed && !item.isShattered && item.capacity_ml > 0 && !item.id.startsWith('lesson_vessel_')
    && item.position[1] < source.position[1] - 0.05
    && Math.hypot(item.position[0] - source.position[0], item.position[2] - source.position[2]) < 0.65;
  if (source.flowReceiverId) {
    const target = vessels[source.flowReceiverId];
    return target && eligible(target) ? target : null;
  }
  return Object.values(vessels).filter(eligible).sort((a, b) =>
    Math.hypot(a.position[0] - source.position[0], a.position[2] - source.position[2])
      - Math.hypot(b.position[0] - source.position[0], b.position[2] - source.position[2]))[0] ?? null;
}

function captureFilterSolids(source: VesselState): VesselState {
  const contents = source.contents.map(item => solidContent(item) && positive(item)
    ? { ...item, location: 'filter' as const } : { ...item });
  const cake = contents.filter(item => item.location === 'filter' && solidContent(item));
  return { ...source, contents, filterPaperResidue_g: cake.reduce((sum, item) => sum + item.mass_g, 0),
    filterPaperResidueSubstance: cake.filter(positive).map(item => item.formula).join(' + ') || undefined,
    hasPrecipitate: false, precipitateAmount_g: 0, isFiltrating: false };
}

export interface FunnelFlowResult {
  source: VesselState;
  receiver?: VesselState;
  spill?: LiquidAliquot;
  moved_ml: number;
}

/** Ideal filter retains modeled solid particles, not dissolved salts. Separation
 * uses current layer inventories/densities; partition coefficients are not guessed.
 * Flow rates remain illustrative and geometry tests use vessel reference points.
 */
export function stepFunnelFlow(input: VesselState, receiver: VesselState | null, dt: number): FunnelFlowResult {
  if (![input.volume_ml, input.mass_g].every(value => Number.isFinite(value) && value >= 0)
    || input.contents.some(item => ![item.moles, item.mass_g].every(value => Number.isFinite(value) && value >= 0))) {
    return { source: { ...input, isFiltrating: false, flowStatus: 'Lượng chất không hợp lệ; chưa thể tính dòng chảy.' }, moved_ml: 0 };
  }
  let source = input.type === 'filter_funnel' ? captureFilterSolids(input) : { ...input, isFiltrating: false };
  const idle = (message: string): FunnelFlowResult => ({ source: { ...source, flowStatus: message }, moved_ml: 0 });
  if (!Number.isFinite(dt) || dt <= 0 || source.isShattered || source.isSealed) return idle('Chưa có dòng chảy: kiểm tra nút đậy và trạng thái bình.');
  if (source.type === 'separatory_funnel' && !source.stopcockOpen) return idle('Khóa van đang đóng.');
  if (source.volume_ml <= 1e-12) return idle('Đã hết pha lỏng.');
  const liquid = source.contents.filter(item => !solidContent(item) && !gasContent(item) && positive(item));
  const tracked = source.contents.reduce((sum, item) => sum + item.mass_g, 0);
  if (!liquid.length || Math.abs(tracked - source.mass_g) > Math.max(1e-6, source.mass_g * 0.0001)) {
    return idle('Chưa có kho chất định lượng khớp khối lượng mẫu; không tự tạo dịch lọc.');
  }
  const volumes = phaseVolumes(source);
  let layer: 'aqueous' | 'organic' | 'all' = 'all';
  if (source.type === 'separatory_funnel') {
    const mass = (organic: boolean) => liquid.filter(item => organicContent(item) === organic).reduce((sum, item) => sum + item.mass_g, 0);
    if (volumes.aqueous > 1e-12 && volumes.organic > 1e-12) {
      if (mass(false) <= 0 || mass(true) <= 0) return idle('Thiếu thành phần định lượng của một pha.');
      layer = mass(true) / volumes.organic > mass(false) / volumes.aqueous ? 'organic' : 'aqueous';
    } else layer = volumes.organic > 1e-12 ? 'organic' : 'aqueous';
  }
  const selected = liquid.filter(item => layer === 'all' || organicContent(item) === (layer === 'organic'));
  const layerVolume = layer === 'all' ? source.volume_ml : volumes[layer];
  if (!selected.length || layerVolume <= 1e-12) return idle('Pha được chọn chưa có lượng chất để xả.');
  const volume = Math.min(layerVolume, (source.type === 'filter_funnel' ? 2 : 2.5) * dt);
  const fraction = volume / layerVolume;
  const selectedSet = new Set(selected);
  // Carry the tiny stock-table mass rounding discrepancy proportionally;
  // molecular inventories themselves are never duplicated or regenerated.
  const nonLiquidMass = source.contents.filter(item => solidContent(item) || gasContent(item)).reduce((sum, item) => sum + item.mass_g, 0);
  const liquidMass = liquid.reduce((sum, item) => sum + item.mass_g, 0);
  const selectedMass = selected.reduce((sum, item) => sum + item.mass_g, 0);
  const transferredMass = Math.max(0, source.mass_g - nonLiquidMass) * selectedMass / liquidMass * fraction;
  const organicVolume = layer === 'organic' ? volume : layer === 'all' ? volumes.organic * fraction : 0;
  const sample: LiquidAliquot = { volume_ml: volume, mass_g: transferredMass, temperature_c: source.temperature_c,
    color: layer === 'organic' ? source.immiscibleOrganicColor ?? '#f8fafc' : source.liquidColor ?? '#f8fafc',
    contents: selected.map(item => ({ ...item, moles: item.moles * fraction, mass_g: item.mass_g * fraction,
      ...(item.volume_ml !== undefined ? { volume_ml: item.volume_ml * fraction } : {}) })),
    substances: [...new Set(selected.map(item => item.formula))] };
  source = refreshFlowInventory({ ...source, volume_ml: Math.max(0, source.volume_ml - volume),
    mass_g: Math.max(0, source.mass_g - transferredMass), immiscibleOrganicVolume_ml: Math.max(0, volumes.organic - organicVolume),
    contents: source.contents.map(item => selectedSet.has(item) ? { ...item, moles: item.moles * (1 - fraction), mass_g: item.mass_g * (1 - fraction),
      ...(item.volume_ml !== undefined ? { volume_ml: item.volume_ml * (1 - fraction) } : {}) } : item),
    isFiltrating: source.type === 'filter_funnel', flowStatus: layer === 'organic' ? 'Đang xả pha hữu cơ ở dưới.' : 'Đang chuyển pha lỏng xuống bình hứng.' });
  if (!receiver || receiver.isSealed || receiver.isShattered) return { source: { ...source, flowStatus: 'Chưa có bình hứng phù hợp phía dưới; dịch rơi xuống bàn.' }, spill: sample, moved_ml: volume };
  const transfer = dispenseAliquot(receiver, sample, volume);
  const receivedFraction = transfer.dispensed_ml / volume;
  const target = refreshFlowInventory({ ...transfer.vessel,
    immiscibleOrganicVolume_ml: (receiver.immiscibleOrganicVolume_ml ?? 0) + organicVolume * receivedFraction,
    immiscibleOrganicColor: organicVolume > 0 ? source.immiscibleOrganicColor : receiver.immiscibleOrganicColor });
  return { source, receiver: target, moved_ml: volume,
    ...(transfer.sample.volume_ml > 1e-12 ? { spill: transfer.sample } : {}) };
}

/** Recover the actual cake; resetting a display counter must not delete matter. */
export function recoverFilterCake(source: VesselState, receiver: VesselState): { source: VesselState; receiver: VesselState } | null {
  if (source.id === receiver.id || receiver.isSealed || receiver.isShattered || !RECEIVERS.has(receiver.type) || receiver.capacity_ml <= 0) return null;
  const cake = source.contents.filter(item => solidContent(item) && item.location === 'filter' && positive(item));
  if (!cake.length) return null;
  const mass = cake.reduce((sum, item) => sum + item.mass_g, 0);
  const contents = receiver.contents.map(item => ({ ...item }));
  for (const item of cake) {
    const existing = contents.find(target => target.formula === item.formula && solidContent(target) && target.location !== 'filter');
    if (existing) { existing.moles += item.moles; existing.mass_g += item.mass_g; }
    else contents.push({ ...item, location: 'bulk' });
  }
  return { source: refreshFlowInventory({ ...source, contents: source.contents.filter(item => !cake.includes(item)),
    mass_g: Math.max(0, source.mass_g - mass), filterPaperResidue_g: 0, filterPaperResidueSubstance: undefined }),
    receiver: refreshFlowInventory({ ...receiver, contents, mass_g: receiver.mass_g + mass,
      hasPrecipitate: receiver.volume_ml > 0, precipitateAmount_g: receiver.volume_ml > 0 ? (receiver.precipitateAmount_g ?? 0) + mass : 0,
      precipitateSubstance: cake[0].formula, precipitateColor: source.precipitateColor ?? '#f8fafc' }) };
}
