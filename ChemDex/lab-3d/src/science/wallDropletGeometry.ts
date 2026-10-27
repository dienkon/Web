import { contourRadius } from './vesselDimensions';
import type { ContourPoint } from './vesselContours';
import { waterSaturationProperties } from './waterThermodynamics';
import { waterBackgroundViscosity_Pa_s, waterViscosityNeedsCriticalEnhancement } from './waterViscosity';

/** Exact lateral area of clipped straight segments revolved about Y.
 * Horizontal floor/rim faces are deliberately excluded from the wall region. */
export function contourWallArea(points: readonly ContourPoint[], bottom: number, top: number): number {
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const [r0, y0] = points[i - 1], [r1, y1] = points[i];
    const lo = Math.max(bottom, y0), hi = Math.min(top, y1);
    if (!(hi > lo) || !(y1 > y0)) continue;
    const slope = (r1 - r0) / (y1 - y0);
    const a = r0 + slope * (lo - y0), b = r0 + slope * (hi - y0);
    area += Math.PI * (a + b) * (hi - lo) * Math.hypot(1, slope);
  }
  return area;
}

/** Scalar meridional geometry. Transport needs this section without creating
 * render vectors or evaluating azimuthal sin/cos on every physics substep. */
export function wallSurfaceSection(points: readonly ContourPoint[], y: number) {
  let slope = 0, metric = 1, meridian = 0, lastY = points[0]?.[1] ?? 0;
  for (let i = 1; i < points.length; i++) {
    const [r0, y0] = points[i - 1], [r1, y1] = points[i];
    if (y1 > y0) {
      slope = (r1 - r0) / (y1 - y0);
      metric = Math.hypot(1, slope);
      if (y <= y1) return { radius: contourRadius(points, y), slope, metric,
        meridian: meridian + (y - y0) * metric };
      meridian += (y1 - y0) * metric;
      lastY = y1;
    }
  }
  return { radius: contourRadius(points, y), slope, metric,
    meridian: meridian + (y - lastY) * metric };
}

/** Inverse of the piecewise-linear wall meridian coordinate, in scene units.
 * As with contourWallArea, horizontal floor/rim faces are excluded. Outside
 * the contour, extend its first/last meridional metric, matching section(). */
export function wallHeightAtMeridian(points: readonly ContourPoint[], coordinate: number): number {
  let meridian = 0, metric = 1, lastY = points[0]?.[1] ?? 0;
  for (let i = 1; i < points.length; i++) {
    const [r0,y0] = points[i-1], [r1,y1] = points[i];
    if (!(y1>y0)) continue;
    metric = Math.hypot(1,(r1-r0)/(y1-y0));
    const end = meridian + (y1-y0)*metric;
    if (coordinate<=end) return y0 + (coordinate-meridian)/metric;
    meridian = end; lastY = y1;
  }
  return lastY + (coordinate-meridian)/metric;
}

/** Unit meridional tangent and outward normal of the actual lathed contour. */
export function wallSurfaceFrame(points: readonly ContourPoint[], y: number, theta: number) {
  const { radius, slope, metric } = wallSurfaceSection(points, y);
  const c = Math.cos(theta), s = Math.sin(theta);
  return { radius, slope, metric,
    position: [radius * c, y, radius * s] as [number, number, number],
    normal: [c / metric, -slope / metric, s / metric] as [number, number, number],
    tangent: [slope * c / metric, 1 / metric, slope * s / metric] as [number, number, number] };
}

/** Illustrative glass wetting parameters, not measurements for this mesh. */
export const WALL_CONTACT_ANGLE = 70 * Math.PI / 180;
export const WALL_ADVANCING_ANGLE = 80 * Math.PI / 180;
export const WALL_RECEDING_ANGLE = 40 * Math.PI / 180;
const contactCos = Math.cos(WALL_CONTACT_ANGLE), contactSin = Math.sin(WALL_CONTACT_ANGLE);
const hysteresisCos = Math.cos(WALL_RECEDING_ANGLE) - Math.cos(WALL_ADVANCING_ANGLE);

/** Equivalent spherical-cap curvature radius, contact radius and height (m).
 * Water density is approximated as 1000 kg/m³ consistently with the wall ledger. */
export function wallDropCap(mass_g: number) {
  const radius_m = Math.cbrt(Math.max(0, mass_g) * 1e-6 * 3 / (Math.PI * (2 - 3 * contactCos + contactCos ** 3)));
  return { radius_m, contactRadius_m: radius_m * contactSin, height_m: radius_m * (1 - contactCos),
    surfaceArea_m2: 2 * Math.PI * radius_m ** 2 * (1 - contactCos) };
}

/** Constant interfacial mass flux on a shrinking spherical cap (fixed contact
 * angle/density). dm/dt=-j*A(1g)*m^(2/3); integrate the cube root exactly.
 * Contact-angle hysteresis/diffusion interactions still need calibration. */
export function wallDropEvaporationG(mass_g: number, flux_g_m2_s: number, dt: number): number {
  if (![mass_g, flux_g_m2_s, dt].every(Number.isFinite) || mass_g <= 0 || flux_g_m2_s <= 0 || dt <= 0) return 0;
  const root = Math.cbrt(mass_g), drop = Math.min(root, flux_g_m2_s * wallDropCap(1).surfaceArea_m2 * dt / 3);
  if (drop >= root) return mass_g;
  // Difference of cubes avoids cancelling two nearly equal inventory values.
  return Math.min(mass_g, drop * (3 * root * root - 3 * root * drop + drop * drop));
}

/** IAPWS R1-76(2014), N/m; liquid water on its saturation boundary.
 * https://iapws.org/technical-guidance/release/Surf-H2O */
export function waterSurfaceTension(temperature_c: number): number {
  const tau = 1 - Math.max(273.16, Math.min(647.096, temperature_c + 273.15)) / 647.096;
  return 0.2358 * tau ** 1.256 * (1 - 0.625 * tau);
}

/** Quasi-steady force-balance closure on an upright wall. The Furmidge-style
 * retention force uses assumed hysteresis, not a universal pinning radius.
 * Wall drag multiplier 20 and speed cap 0.15 m/s are uncalibrated closures. */
// One-entry derived cache: every bead in a transport substep shares the same
// temperature. No rounding, quantization, changed force or skipped timestep.
let cachedTemperature_c = NaN, cachedSigma_N_m = 0, cachedViscosity_Pa_s: number | null = null;
let cachedCritical = false;
export function wallDropMotion(mass_g: number, temperature_c: number, metric: number) {
  const cap = wallDropCap(Number.isFinite(mass_g) ? mass_g : 0);
  const held = { ...cap, drive_N: 0, retention_N: 0, speed_m_s: 0, viscosity_Pa_s: null as number | null,
    viscosityModel: 'iapws2008-saturation-reference' as const, motionLimit: undefined as string | undefined };
  if (![mass_g,temperature_c,metric].every(Number.isFinite) || mass_g<0 || metric<1) {
    held.motionLimit = 'invalid-motion-input'; return held;
  }
  if (temperature_c<0 || temperature_c>=373.946) {
    held.motionLimit = 'unsupported-liquid-temperature'; return held;
  }
  if (temperature_c !== cachedTemperature_c) {
    cachedTemperature_c = temperature_c;
    cachedSigma_N_m = waterSurfaceTension(temperature_c);
    const density=waterSaturationProperties(temperature_c)!.liquidDensity_kg_m3;
    cachedViscosity_Pa_s = waterBackgroundViscosity_Pa_s(temperature_c+273.15,density);
    cachedCritical = waterViscosityNeedsCriticalEnhancement(temperature_c+273.15,density);
  }
  if (cachedViscosity_Pa_s===null || cachedCritical) {
    held.motionLimit = cachedCritical ? 'critical-enhancement-unavailable' : 'viscosity-unavailable'; return held;
  }
  const drive_N = mass_g * 0.001 * 9.80665 / metric;
  const retention_N = 2 * cap.contactRadius_m * cachedSigma_N_m * hysteresisCos;
  const drag = 6 * Math.PI * cachedViscosity_Pa_s * Math.max(1e-12, cap.radius_m) * 20;
  const speed_m_s = Math.min(0.15, Math.max(0, drive_N - retention_N) / drag);
  held.drive_N = drive_N; held.retention_N = retention_N; held.speed_m_s = speed_m_s;
  held.viscosity_Pa_s = cachedViscosity_Pa_s;
  return held;
}
