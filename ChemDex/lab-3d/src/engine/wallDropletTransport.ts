import type { ContourPoint } from '../science/vesselContours';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';
import { wallDropCap, wallDropMotion, wallSurfaceSection, wallHeightAtMeridian, wallDropEvaporationG } from '../science/wallDropletGeometry';
import { evaporateWallFilm, type WallEvaporationBoundary } from '../science/wallFilmEvaporation';
import { WATER_CP_J_G_K as cp, waterLatentHeatJ_G } from './waterProperties';
import { condenseWallFilm, type WallCondensationBoundary } from '../science/wallFilmCondensation';
import { waterPressureDrivenFluxG_M2_S } from '../science/waterSurface';
import { advanceWallDrop } from '../science/wallDropAdvection';

export interface WallBead {
  mass_g: number;
  y: number;
  theta: number;
  sliding: boolean;
}
const COUNT = 48;
const hash = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const weights = Array.from({ length: COUNT }, (_, i) => 0.01 + hash(i + 1) ** 6);
const weightSum = weights.reduce((a, b) => a + b, 0);

/** Finite representative beads. Empty sites may nucleate again only when a
 * new, explicitly supplied condensate delivery gives them water. No wrapping.
 * Existing beads keep their location when the fill level changes. */
export function transportWallBeads(options: {
  previous?: WallBead[]; initialMass_g: number; deposited_g: number; evaporated_g: number;
  dt: number; points: readonly ContourPoint[]; bottom: number; top: number;
  temperature_c: number; inner: boolean; maximumDrain_g?: number;
  /** Positive vapor-pressure-driven flux on each exposed cap. Overrides the
   * legacy aggregate evaporated_g request; submerged inner beads are excluded. */
  evaporationFlux_g_m2_s?: number;
  evaporationBoundary?: WallEvaporationBoundary;
  condensationBoundary?: WallCondensationBoundary;
  admitDrain?: (requested_g: number, previouslyDrained_g: number, previousSensible_J: number, temperature_c: number) => number;
}) {
  const { points, bottom, top, inner, temperature_c } = options;
  const diagnostics = { temperature_c, vaporEnergy_J: 0, vaporSensibleEnergy_J: 0, vaporTemperatureMass_c_g: 0,
    motionModel: 'quasi-steady-cap/iapws2008-saturation-reference' as const, motionModelLimit: undefined as string | undefined,
    drainedSensibleEnergy_J: 0, evaporationThermalLimit: undefined as string | undefined,
    condensed_g: 0, wetCondensed_g: 0, dryCondensed_g: 0, condensationReceivedEnergy_J: 0,
    condensationBoundaryHeat_J: 0, condensationThermalLimit: undefined as string | undefined };
  if (![options.dt, options.initialMass_g, options.deposited_g, options.evaporated_g, bottom, top, temperature_c].every(Number.isFinite)
    || options.dt <= 0 || options.initialMass_g < 0 || options.deposited_g < 0 || options.evaporated_g < 0
    || options.evaporationFlux_g_m2_s !== undefined
      && (!Number.isFinite(options.evaporationFlux_g_m2_s) || options.evaporationFlux_g_m2_s < 0)) {
    return { ...diagnostics, beads: options.previous?.map(b => ({ ...b })) ?? [], retained_g: Math.max(0, options.initialMass_g), drained_g: 0, evaporated_g: 0 };
  }
  if (!(options.initialMass_g > 0) && !(options.deposited_g > 0) && !options.condensationBoundary) {
    return { ...diagnostics, beads: [] as WallBead[], retained_g: 0, drained_g: 0, evaporated_g: 0 };
  }
  const seed = (i: number): WallBead => ({ mass_g: 0,
    y: bottom + (0.05 + 0.9 * hash(i + 113)) * Math.max(0, top - bottom),
    theta: hash(i + 51) * Math.PI * 2, sliding: false });
  const beads = Array.from({ length: COUNT }, (_, i) => {
    const previous = options.previous?.[i];
    return previous && [previous.mass_g, previous.y, previous.theta].every(Number.isFinite) && previous.mass_g >= 0
      ? { ...previous } : seed(i);
  });
  const oldSum = beads.reduce((sum, b) => sum + b.mass_g, 0);
  const inventoryTolerance = 64 * Number.EPSILON * Math.max(oldSum, options.initialMass_g, Number.MIN_VALUE);
  if (!options.previous || Math.abs(oldSum - options.initialMass_g) > inventoryTolerance) {
    for (let i = 0; i < COUNT; i++) beads[i].mass_g = options.initialMass_g * weights[i] / weightSum;
  }
  let drained_g = 0, fluxEvaporated_g = 0, filmTemperature = temperature_c;
  const contacts = new Float64Array(COUNT);
  // Geometry is fixed during this call. Pinned beads revisit identical y for
  // many 120-Hz substeps. Cache exact sections locally, never quantize y or
  // retain a stale contour across calls/vessels. Bound sliding-height entries.
  const sections = new Map<number, ReturnType<typeof wallSurfaceSection>>();
  const sectionAt = (y: number) => {
    let section = sections.get(y);
    if (!section) {
      section = wallSurfaceSection(points, y);
      if (sections.size >= 256) sections.delete(sections.keys().next().value!);
      sections.set(y, section);
    }
    return section;
  };
  const bottomMeridian = sectionAt(bottom).meridian;
  const touchesBottom = (b: WallBead, contactRadius_m = wallDropCap(b.mass_g).contactRadius_m) =>
    b.y <= bottom || sectionAt(b.y).meridian - bottomMeridian <= contactRadius_m / METERS_PER_SCENE_UNIT + 1e-10;
  const drain = (b: WallBead) => {
    const admitted = options.admitDrain?.(b.mass_g, drained_g, diagnostics.drainedSensibleEnergy_J, filmTemperature) ?? b.mass_g;
    const moved = Math.min(b.mass_g, Math.max(0, (options.maximumDrain_g ?? Infinity) - drained_g),
      Number.isFinite(admitted) ? Math.max(0, admitted) : 0);
    diagnostics.drainedSensibleEnergy_J += moved * cp * filmTemperature;
    drained_g += moved;
    b.mass_g -= moved;
    if (b.mass_g > 0) {
      b.y = wallHeightAtMeridian(points, bottomMeridian + wallDropCap(b.mass_g).contactRadius_m / METERS_PER_SCENE_UNIT);
      b.sliding = false;
    }
  };
  const steps = Math.max(1, Math.ceil(options.dt * 120)), dt = options.dt / steps;
  const deposit = (mass: number) => {
    for (let i = 0; i < COUNT; i++) {
      if (!(beads[i].mass_g > 0) && mass > 0) Object.assign(beads[i], seed(i));
      beads[i].mass_g += mass * weights[i] / weightSum;
    }
  };
  for (let step = 0; step < steps; step++) {
    const oldMass = beads.reduce((sum, b) => sum + b.mass_g, 0);
    for (let i = 0; i < COUNT; i++) {
      if (beads[i].mass_g <= 0 && options.deposited_g > 0) Object.assign(beads[i], seed(i));
      beads[i].mass_g += options.deposited_g / steps * weights[i] / weightSum;
    }
    const mixedMass = beads.reduce((sum, b) => sum + b.mass_g, 0);
    if (mixedMass > 0 && options.deposited_g > 0) filmTemperature = (oldMass * filmTemperature
      + (mixedMass - oldMass) * temperature_c) / mixedMass;
    const cb = options.condensationBoundary;
    if (cb) {
      const supplied = cb.availableVapor_g ?? Infinity;
      const remaining = Math.max(0, supplied - diagnostics.condensed_g);
      const validBoundary = [cb.regionArea_m2, cb.dryWallTemperature_c, cb.vaporSpecificEnthalpy_J_g,
        cb.gasTemperature_c, cb.waterPressure_Pa, cb.airSpeed_m_s].every(Number.isFinite)
        && cb.regionArea_m2 >= 0 && cb.dryWallTemperature_c >= 0 && cb.dryWallTemperature_c < 373.946
        && cb.waterPressure_Pa >= 0 && cb.airSpeed_m_s >= 0 && cb.gasTemperature_c > -273.15
        && (cb.availableVapor_g === undefined || Number.isFinite(cb.availableVapor_g) && cb.availableVapor_g >= 0);
      if (validBoundary && remaining > 0) {
        let footprint = 0;
        for (const b of beads) if (b.mass_g > 0 && b.y >= bottom && b.y <= top) {
          footprint += Math.PI * wallDropCap(b.mass_g).contactRadius_m ** 2;
        }
        const dryArea = Math.max(0, cb.regionArea_m2 - footprint);
        const dryFlux = Math.max(0, -waterPressureDrivenFluxG_M2_S(cb.dryWallTemperature_c,
          cb.gasTemperature_c, cb.waterPressure_Pa, cb.airSpeed_m_s));
        const dryMass = cb.vaporSpecificEnthalpy_J_g > cp * cb.dryWallTemperature_c
          ? Math.min(remaining, dryFlux * dryArea * dt) : 0;
        if (dryMass > 0) {
          const beforeMass = beads.reduce((sum, b) => sum + b.mass_g, 0);
          filmTemperature += dryMass * (cb.dryWallTemperature_c - filmTemperature) / (beforeMass + dryMass);
          deposit(dryMass); diagnostics.condensed_g += dryMass; diagnostics.dryCondensed_g += dryMass;
          diagnostics.condensationReceivedEnergy_J += dryMass * cb.vaporSpecificEnthalpy_J_g;
          diagnostics.condensationBoundaryHeat_J += dryMass * (cb.vaporSpecificEnthalpy_J_g - cp * cb.dryWallTemperature_c);
        }
        const totalFilm = beads.reduce((sum, b) => sum + b.mass_g, 0);
        const wetRecipients = beads.filter(b => b.mass_g > 0 && (!inner || !touchesBottom(b)));
        const wetAreas = wetRecipients.map(b => wallDropCap(b.mass_g).surfaceArea_m2);
        const wetArea = wetAreas.reduce((sum, area) => sum + area, 0);
        const condensation = condenseWallFilm({ mass_g: totalFilm, temperature_c: filmTemperature,
          area_m2: wetArea, dt, boundary: cb, vaporSpecificEnthalpy_J_g: cb.vaporSpecificEnthalpy_J_g,
          ...(cb.availableVapor_g === undefined ? {} : { availableVapor_g: Math.max(0, supplied - diagnostics.condensed_g) }) });
        if (condensation.valid) {
          filmTemperature = condensation.temperature_c;
          if (wetArea > 0) wetRecipients.forEach((b, i) => { b.mass_g += condensation.condensed_g * wetAreas[i] / wetArea; });
          diagnostics.condensed_g += condensation.condensed_g; diagnostics.wetCondensed_g += condensation.condensed_g;
          diagnostics.condensationReceivedEnergy_J += condensation.receivedVaporEnergy_J;
        } else if (remaining > dryMass) diagnostics.condensationThermalLimit = condensation.reason;
      } else if (!validBoundary) diagnostics.condensationThermalLimit = 'unsupported-boundary';
    }
    for (let i = 0; i < COUNT; i++) {
      // A submerged inner bead is already in contact with the receiving
      // liquid; it is not an exposed source for evaporation into headspace.
      if (inner && beads[i].mass_g > 0 && touchesBottom(beads[i])) drain(beads[i]);
    }
    const total = beads.reduce((s, b) => s + b.mass_g, 0);
    const keep = total > 0 ? Math.max(0, 1 - options.evaporated_g / steps / total) : 1;
    if (options.evaporationBoundary && total > 0) {
      const exposed = beads.filter(b => b.mass_g > 0 && (!inner || !touchesBottom(b)));
      const evaporation = evaporateWallFilm({ masses_g: exposed.map(b => b.mass_g), totalMass_g: total,
        temperature_c: filmTemperature, dt, boundary: options.evaporationBoundary });
      if (evaporation.valid) {
        exposed.forEach((b, i) => { b.mass_g = evaporation.masses_g[i]; });
        filmTemperature = evaporation.temperature_c; fluxEvaporated_g += evaporation.evaporated_g;
        diagnostics.vaporEnergy_J += evaporation.vaporEnergy_J;
        diagnostics.vaporSensibleEnergy_J += evaporation.vaporSensibleEnergy_J;
        diagnostics.vaporTemperatureMass_c_g += evaporation.vaporTemperatureMass_c_g;
        if (evaporation.limitedBy === 'liquid-floor') diagnostics.evaporationThermalLimit = 'liquid-floor';
      } else diagnostics.evaporationThermalLimit = 'numerical-or-domain-limit';
    }
    for (let i = 0; i < COUNT; i++) {
      const b = beads[i];
      contacts[i] = 0;
      if (options.evaporationBoundary) {
        // The finite-energy shared node already applied this substep's sink.
      } else if (options.evaporationFlux_g_m2_s !== undefined) {
        const exposed = !inner || !touchesBottom(b);
        const removed = exposed ? wallDropEvaporationG(b.mass_g, options.evaporationFlux_g_m2_s, dt) : 0;
        b.mass_g -= removed; fluxEvaporated_g += removed;
        diagnostics.vaporEnergy_J += removed * (cp * filmTemperature + waterLatentHeatJ_G(filmTemperature));
        diagnostics.vaporSensibleEnergy_J += removed * cp * filmTemperature;
        diagnostics.vaporTemperatureMass_c_g += removed * filmTemperature;
      } else b.mass_g *= keep;
      if (!(b.mass_g > 0)) continue;
      const motion = advanceWallDrop(b.mass_g,filmTemperature,points,b.y,dt,
        { sectionAt,lowerBoundaryMeridian:bottomMeridian });
      if (motion.motionLimit) diagnostics.motionModelLimit = motion.motionLimit;
      contacts[i] = motion.contactRadius_m;
      b.sliding = motion.speed_m_s > 0;
      b.y = motion.y;
      if (touchesBottom(b, motion.contactRadius_m) && (inner || b.sliding)) {
        // If the receiving sample is full, retain the finite remainder at the
        // boundary. It cannot teleport upward or create an overflow sink.
        drain(b);
        contacts[i] = wallDropCap(b.mass_g).contactRadius_m;
      }
    }
    // Coalescence conserves mass and the local surface centroid; azimuth uses
    // the short periodic arc, so the seam is not a physical barrier.
    for (let i = 0; i < COUNT; i++) if (beads[i].mass_g > 0) {
      for (let j = i + 1; j < COUNT; j++) {
        const a = beads[i], b = beads[j];
        if (!(b.mass_g > 0)) continue;
        const contact = contacts[i] + contacts[j];
        if (Math.abs(b.y - a.y) * METERS_PER_SCENE_UNIT > contact) continue;
        // Normalize the same shortest periodic arc algebraically. Most pairs
        // cannot touch in azimuth, so reject them before two meridian lookups
        // and the full distance calculation. No timestep or mass is skipped.
        let angle = (b.theta - a.theta) % (2 * Math.PI);
        if (angle > Math.PI) angle -= 2 * Math.PI;
        else if (angle < -Math.PI) angle += 2 * Math.PI;
        const frame = sectionAt((a.y + b.y) / 2);
        if (Math.abs(angle * frame.radius) * METERS_PER_SCENE_UNIT > contact) continue;
        const meridianA = sectionAt(a.y).meridian, meridianB = sectionAt(b.y).meridian;
        const distance = Math.hypot(angle * frame.radius, meridianB - meridianA) * METERS_PER_SCENE_UNIT;
        if (distance > contact) continue;
        const fraction = b.mass_g / (a.mass_g + b.mass_g);
        a.y = wallHeightAtMeridian(points, meridianA + (meridianB - meridianA) * fraction);
        a.theta += angle * fraction;
        a.mass_g += b.mass_g;
        contacts[i] = wallDropCap(a.mass_g).contactRadius_m;
        b.mass_g = 0;
        // The larger footprint can newly touch the liquid/lower boundary.
        // This is an end-of-substep event, not another full motion timestep.
        const mergedMotion = wallDropMotion(a.mass_g, filmTemperature, sectionAt(a.y).metric);
        if (mergedMotion.motionLimit) diagnostics.motionModelLimit = mergedMotion.motionLimit;
        a.sliding = mergedMotion.speed_m_s > 0;
        if (touchesBottom(a, contacts[i]) && (inner || a.sliding)) {
          drain(a); contacts[i] = wallDropCap(a.mass_g).contactRadius_m;
          if (!(a.mass_g > 0)) break;
        }
      }
    }
  }
  const retained_g = beads.reduce((s, b) => s + b.mass_g, 0);
  // Actual evaporation can be smaller than requested when drainage wins the
  // competing sink. Report the amount that really left, never the request.
  const evaporated_g = options.evaporationBoundary || options.evaporationFlux_g_m2_s !== undefined ? fluxEvaporated_g
    : Math.min(options.evaporated_g, Math.max(0, options.initialMass_g + options.deposited_g + diagnostics.condensed_g - retained_g - drained_g));
  return { ...diagnostics, temperature_c: filmTemperature, beads, retained_g, drained_g, evaporated_g };
}
