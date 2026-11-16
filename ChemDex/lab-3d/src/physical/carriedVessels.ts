import type { BurnerState, VesselState } from '../types/chemistry';

type MoveAssembly = {
  moveMode: boolean;
  draggingVesselId: string | null;
  vessels: Record<string, VesselState>;
  burners: Record<string, BurnerState>;
};

/** Match the apparatus that updateVesselPosition / the burner gesture moves
 * together. Its samples need the same carry frame as a directly held vessel. */
export function moveCarriedVesselIds(state: MoveAssembly): Set<string> {
  const result = new Set<string>();
  const id = state.moveMode ? state.draggingVesselId : null;
  if (!id) return result;
  const root = state.vessels[id];
  if (!root) {
    const burner = state.burners[id];
    if (!burner) return result;
    for (const vessel of Object.values(state.vessels))
      if (vessel.position[1] > 0.5 && Math.hypot(vessel.position[0] - burner.position[0], vessel.position[2] - burner.position[2]) < 0.5)
        result.add(vessel.id);
    return result;
  }
  result.add(root.id);
  if (root.type === 'test_tube_rack')
    for (const tubeId of root.slottedTestTubeIds ?? []) if (state.vessels[tubeId]) result.add(tubeId);
  if (root.type === 'tongs' && root.grippedVesselId && state.vessels[root.grippedVesselId]) result.add(root.grippedVesselId);
  for (const vessel of Object.values(state.vessels))
    if (vessel.type === 'filter_funnel' && vessel.id !== id && vessel.position[1] > root.position[1] + 0.5
      && Math.hypot(vessel.position[0] - root.position[0], vessel.position[2] - root.position[2]) < 0.6)
      result.add(vessel.id);
  return result;
}
