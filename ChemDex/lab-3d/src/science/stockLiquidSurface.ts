import { stockImmersion, type StockImmersionVessel, type StockImmersion } from './stockImmersion';
import { getVesselProfile } from '../pour/physics/profiles';
import { roundPlaneVolume } from '../pour/physics/roundPlaneVolume';
import { solveLevel } from '../pour/physics/retained';
import type { Point3 } from './clippedSolidVolume';

export interface StockLiquidSurface {
  c: number; depth: number; grossVolume_ml: number; displacement_ml: number;
  basis: StockImmersion['basis'];
}
const cache = new WeakMap<StockImmersion, Map<string, StockLiquidSurface>>();

/** Solve V_reservoir(n,c) - V_stock_inside(n,c) = liquid inventory. Coordinates
 * are MODEL local. Axisymmetric glass permits 2D quadrature, while asymmetric
 * stocks must use the complete x/y/z normal. A cumulative layer target keeps
 * the original inventory/densities intact. No chemistry or quality inputs. */
export function solveStockLiquidSurface(vessel: StockImmersionVessel, normal: Point3, density = 1,
  cumulativeLiquid_ml = vessel.volume_ml): StockLiquidSurface | null {
  const model = stockImmersion(vessel, density), length = Math.hypot(...normal);
  if (!model || !(length > 0) || !Number.isFinite(length)) return null;
  const n = normal.map(x => x / length) as [number, number, number], liquid = Math.max(0, cumulativeLiquid_ml);
  let byPlane = cache.get(model); if (!byPlane) { byPlane = new Map(); cache.set(model, byPlane); }
  const key = `${liquid}:${n.join(':')}`, old = byPlane.get(key); if (old) return old;
  const p = getVesselProfile(vessel.type, vessel.capacity_ml), h = Math.hypot(n[0], n[2]);
  const section = roundPlaneVolume(p, -h, n[1]), perMl = section.full / vessel.capacity_ml;
  let c = section.low, gross = 0, displacement = 0;
  if (liquid >= vessel.capacity_ml - model.insideVolume_ml) {
    c = section.high; displacement = model.insideVolume_ml; gross = liquid + displacement;
  } else if (liquid > 0) {
    const tilt = Math.atan2(h, n[1]);
    let low = solveLevel(p, tilt, liquid).c, high = solveLevel(p, tilt, liquid + model.insideVolume_ml).c;
    const residual = (value: number) => section.evaluate(value).volume / perMl - model.displacementMl(n, value) - liquid;
    let fl = residual(low), fh = residual(high);
    const tolerance = Math.max(liquid * 2e-11, vessel.capacity_ml * 1e-14);
    c = Math.abs(fl) <= Math.abs(fh) ? low : high;
    for (let i = 0; i < 96 && Math.min(Math.abs(fl), Math.abs(fh)) > tolerance; i++) {
      const secant = low - fl * (high - low) / (fh - fl), middle = low + (high - low) / 2;
      if (middle === low || middle === high) break;
      // Most dose/pose changes are nearly linear. Three secants per bracket
      // reduction avoid repeatedly abandoning a good endpoint for a distant
      // midpoint. The final 32 iterations always bisect if still unresolved.
      c = i < 64 && i % 4 !== 3 && secant > low && secant < high && Number.isFinite(secant) ? secant : middle;
      const f = residual(c);
      if (Math.abs(f) <= tolerance) break;
      if (f < 0) { low = c; fl = f; } else { high = c; fh = f; }
      c = Math.abs(fl) <= Math.abs(fh) ? low : high;
    }
    displacement = model.displacementMl(n, c); gross = liquid + displacement;
  }
  const result = { c, depth: Math.max(0, c - section.low), grossVolume_ml: gross, displacement_ml: displacement, basis: model.basis };
  if (byPlane.size >= 64) byPlane.delete(byPlane.keys().next().value!);
  byPlane.set(key, result); return result;
}
