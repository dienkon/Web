/** Scene coordinates are a presentation boundary, never SI lengths. */
export const LAB_GEOMETRY = {
  tableTop_scene: -1.175,
  tableHalfWidth_scene: 16,
  tableHalfDepth_scene: 6.75,
  tableThickness_scene: 0.35,
  floor_scene: -5.35,
  defaultVesselOrigin_scene: -0.135,
} as const;

export const VESSEL_TARE_G: Readonly<Record<string, number>> = {
  beaker: 85, flask: 120, test_tube: 25, cylinder: 110, burette: 150,
  watch_glass: 20, evaporating_dish: 65, crucible: 35, petri_dish: 55,
  volumetric_flask: 80, separatory_funnel: 180, filter_funnel: 55,
  condenser: 200, mortar_pestle: 450, wash_bottle: 30,
};

/** Legacy tare values are estimates, not manufacturer measurements. */
export function vesselTareG(type: string, explicit?: number): number {
  return Number.isFinite(explicit) && explicit! > 0 ? explicit! : VESSEL_TARE_G[type] ?? 80;
}
