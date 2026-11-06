import type { VesselState } from '../types/chemistry';
import { dispenseAliquot, mergeLiquidDose, withdrawAliquot, refreshPrecipitateSummary, type LiquidAliquot } from './aliquot';
import { solidDisplacementAtSurface } from './solidOccupancy';
import { solidContent, gasContent, organicContent, phaseVolumes, separatedLayers } from '../science/liquidLayers';
import { liquidContactFailure } from './liquidContact';
import { precipitateComponents } from '../science/precipitateInventory';
import type { MobileSolidInventory } from '../science/suspensionTransport';

function scale(sample: LiquidAliquot, fraction: number): LiquidAliquot {
  return { ...sample, volume_ml: sample.volume_ml * fraction, mass_g: sample.mass_g * fraction,
    ...(sample.organicVolume_ml !== undefined ? { organicVolume_ml: sample.organicVolume_ml * fraction } : {}),
    contents: sample.contents.map(c => ({ ...c, moles: c.moles * fraction, mass_g: c.mass_g * fraction,
      ...(c.volume_ml !== undefined ? { volume_ml: c.volume_ml * fraction } : {}) })) };
}
function sampleOf(v: VesselState): LiquidAliquot {
  return { volume_ml: v.volume_ml, mass_g: v.mass_g, temperature_c: v.temperature_c,
    contents: v.contents, substances: v.substances, color: v.liquidColor ?? '#f8fafc', optics: v.liquidOptics,
    ...(v.immiscibleOrganicVolume_ml ? { organicVolume_ml: v.immiscibleOrganicVolume_ml, organicColor: v.immiscibleOrganicColor } : {}) };
}
function combine(a: LiquidAliquot, b: LiquidAliquot, template: VesselState): LiquidAliquot {
  if (!(a.volume_ml > 0)) return { ...b, reactionProgramId: undefined };
  if (!(b.volume_ml > 0)) return { ...a, reactionProgramId: undefined };
  return sampleOf(mergeLiquidDose({ ...template, volume_ml: a.volume_ml, mass_g: a.mass_g,
    contents: a.contents, substances: a.substances, temperature_c: a.temperature_c,
    liquidColor: a.color, liquidOptics: a.optics, immiscibleOrganicVolume_ml: a.organicVolume_ml,
    immiscibleOrganicColor: a.organicColor }, b, b.volume_ml));
}

/** Surface overflow takes the upper liquid layer, never the settled bed,
 * filter cake, foam or headspace gas. Layers retain their own species. */
function withdrawUpperLayer(v: VesselState, requested_ml: number) {
  const volumes = phaseVolumes(v), layers = separatedLayers(v);
  const organic = volumes.organic > 0 && (volumes.aqueous <= 0 || layers.lower === 'aqueous');
  const layerVolume = organic ? volumes.organic : volumes.aqueous;
  const amount = Math.min(requested_ml, layerVolume), fraction = layerVolume > 0 ? amount / layerVolume : 0;
  const selected = (c: VesselState['contents'][number]) => !solidContent(c) && !gasContent(c)
    && (!c.location || c.location === 'bulk') && organicContent(c) === organic;
  const scaled = (c: VesselState['contents'][number], f: number) => ({ ...c, moles: c.moles * f, mass_g: c.mass_g * f,
    ...(c.volume_ml !== undefined ? { volume_ml: c.volume_ml * f } : {}) });
  const contents = v.contents.filter(selected).map(c => scaled(c, fraction));
  const mass = contents.reduce((sum, c) => sum + c.mass_g, 0);
  const color = organic ? v.immiscibleOrganicColor ?? '#f8fafc' : v.liquidColor ?? '#f8fafc';
  return { vessel: { ...v, volume_ml: v.volume_ml - amount, mass_g: v.mass_g - mass,
    immiscibleOrganicVolume_ml: Math.max(0, volumes.organic - (organic ? amount : 0)),
    contents: v.contents.map(c => selected(c) ? scaled(c, 1 - fraction) : c) },
    sample: { volume_ml: amount, mass_g: mass, contents, temperature_c: v.temperature_c,
      color, ...(!organic ? { optics: v.liquidOptics } : {}), substances: [...new Set(contents.filter(c => c.mass_g > 0).map(c => c.formula))],
      ...(organic ? { organicVolume_ml: amount, organicColor: color } : {}) } as LiquidAliquot };
}

/** Reconcile a newly displaced liquid volume without introducing a new dose.
 * Also used after precipitation/phase changes, in the same material commit. */
export function drainVesselOverflow(vessel: VesselState, mobile: MobileSolidInventory = {}) {
  let receiver = vessel;
  let spill = scale(sampleOf(vessel), 0);
  if (vessel.isSealed || vessel.isShattered || !(vessel.capacity_ml > 0) || !(vessel.volume_ml > 0)
    || !Number.isFinite(vessel.volume_ml) || !Number.isFinite(vessel.capacity_ml)) return { vessel, spill };
  const layered = (vessel.immiscibleOrganicVolume_ml ?? 0) > 0 || vessel.contents.some(c => c.mass_g > 0 && organicContent(c));
  for (let i = 0; i < 8; i++) {
    const rimVolume = Math.max(0, receiver.capacity_ml - (receiver.wallCoating_ml ?? 0));
    const excess = Math.min(receiver.volume_ml, Math.max(0, receiver.volume_ml
      + solidDisplacementAtSurface(receiver, rimVolume) - rimVolume));
    if (!(excess > 1e-10)) break;
    let withdrawn;
    if (layered) withdrawn = withdrawUpperLayer(receiver, excess);
    else {
      const fits = (amount: number) => {
        const after = withdrawAliquot(receiver, amount, mobile).vessel;
        return after.volume_ml + solidDisplacementAtSurface(after, rimVolume) <= rimVolume;
      };
      let low = 0, high = receiver.volume_ml;
      for (let n = 0; n < 40; n++) {
        const mid = (low + high) / 2;
        if (fits(mid)) high = mid; else low = mid;
      }
      withdrawn = withdrawAliquot(receiver, high, mobile);
    }
    if (!(withdrawn.sample.volume_ml > 0)) break;
    receiver = withdrawn.vessel; spill = combine(spill, withdrawn.sample, vessel);
  }
  return { vessel: receiver, spill };
}

/** Finite pouring contact, distinct from a metered pipette stopping at capacity.
 * Homogeneous liquid: fill, then exact ideal well-mixed through-flow
 * C(q)=Cin+(C0-Cin) exp(-q/V). The overflow is its integrated effluent,
 * not the final tank composition and not rejected pure feed.
 * Resident/incoming solids use a conservative mix/displace step. Immiscible
 * layers use density-ordered surface withdrawal instead of homogenization.
 * No turbulence, bed erosion, partition coefficients or kinetics are invented. */
export function receivePourAliquot(vessel: VesselState, sample: LiquidAliquot) {
  const empty = scale(sample, 0);
  if (vessel.isSealed || vessel.isShattered || ![vessel.capacity_ml, vessel.volume_ml, vessel.mass_g, vessel.temperature_c,
    sample.volume_ml, sample.mass_g, sample.temperature_c].every(Number.isFinite)
    || [...vessel.contents, ...sample.contents].some(c => ![c.mass_g, c.moles].every(n => Number.isFinite(n) && n >= 0))
    || vessel.capacity_ml <= 0 || vessel.volume_ml < 0 || vessel.mass_g < 0 || sample.volume_ml <= 0 || sample.mass_g <= 0)
    return { vessel, spill: sample, accepted_ml: 0, contacted_ml: 0, failureReason: undefined as string | undefined };
  const layered = (vessel.immiscibleOrganicVolume_ml ?? 0) > 0 || (sample.organicVolume_ml ?? 0) > 0
    || [...vessel.contents, ...sample.contents].some(c => c.mass_g > 0 && organicContent(c));
  const hasSolids = [...vessel.contents, ...sample.contents].some(c => c.mass_g > 0 && solidContent(c));
  let receiver: VesselState, spill: LiquidAliquot;
  if (!layered && !hasSolids) {
    const fill = dispenseAliquot(vessel, sample, sample.volume_ml);
    receiver = fill.vessel; spill = empty;
    if (fill.sample.volume_ml > 0 && receiver.volume_ml > 0) {
      const exchange = receiver.volume_ml * -Math.expm1(-fill.sample.volume_ml / receiver.volume_ml);
      const old = withdrawAliquot(receiver, exchange);
      receiver = mergeLiquidDose(old.vessel, fill.sample, exchange);
      spill = combine(old.sample, scale(fill.sample, Math.max(0, 1 - exchange / fill.sample.volume_ml)), vessel);
    } else if (fill.sample.volume_ml > 0) spill = fill.sample;
  } else {
    receiver = mergeLiquidDose(vessel, sample, sample.volume_ml); spill = empty;
    // Solids already carried by a liquid aliquot are mobile arrivals, unlike
    // an unmeasured resident bed. Only this incoming fraction can leave again.
    const mobile: MobileSolidInventory = {};
    const incomingSolids = precipitateComponents(sample.contents);
    for (const c of precipitateComponents(receiver.contents, receiver.precipitateSubstance)) {
      const incoming = incomingSolids.find(s => s.formula === c.formula)?.mass_g ?? 0;
      if (incoming > 0) mobile[c.formula] = { inventoryMass_g: c.mass_g, suspendedMass_g: incoming };
    }
    const drained = drainVesselOverflow(receiver, mobile);
    receiver = drained.vessel; spill = drained.spill;
  }
  const volumes = phaseVolumes(receiver);
  receiver = { ...receiver, volume: receiver.volume_ml / receiver.capacity_ml,
    contents: receiver.contents.map(c => solidContent(c) || gasContent(c) ? c : { ...c,
      concentration_M: volumes[organicContent(c) ? 'organic' : 'aqueous'] > 0
        ? c.moles * 1000 / volumes[organicContent(c) ? 'organic' : 'aqueous'] : undefined }),
    substances: [...new Set(receiver.contents.filter(c => c.mass_g > 0 || c.moles > 0).map(c => c.formula))] };
  if (hasSolids) receiver = refreshPrecipitateSummary(receiver);
  const net = sample.volume_ml - spill.volume_ml;
  return { vessel: receiver, spill, accepted_ml: Math.abs(net) < 1e-10 ? 0 : net, contacted_ml: sample.volume_ml,
    failureReason: liquidContactFailure(vessel, sample, sample.volume_ml) };
}
