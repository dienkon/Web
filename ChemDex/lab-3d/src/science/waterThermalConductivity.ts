/** IAPWS SR6-08(2011), Eq. (8), Table 6. Liquid water near 0.1 MPa.
 * https://iapws.org/technical-guidance/release/LiquidWater
 * The recommended 273.15–383.15 K range includes metastable liquid above
 * the normal boiling point. We deliberately do not extrapolate below 0 C.
 * Section 6 permits saturated-liquid pressure through 0.3 MPa without
 * appreciable extra uncertainty; this is not a general pressure correlation. */
export function waterThermalConductivity_W_m_K(temperature_c: number): number | null {
  if (!Number.isFinite(temperature_c) || temperature_c < 0 || temperature_c > 110) return null;
  const t = (temperature_c + 273.15) / 300;
  return 1.6630 * t ** -1.15 - 1.7781 * t ** -3.4
    + 1.1567 * t ** -6.0 - 0.432115 * t ** -7.6;
}
