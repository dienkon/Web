import { expect, it } from 'vitest';
import { readWorkbenchInventory } from '../src/handling/workbenchInventory';
import type { LiquidAliquot } from '../src/handling/aliquot';
import type { PourParcel } from '../src/engine/pourTransport';
import { useAppStore } from '../src/store/useAppStore';

const lab = useAppStore.getState();

function water(mass_g: number): LiquidAliquot {
  return { volume_ml: mass_g, mass_g, temperature_c: 25, color: '#fff', substances: ['H2O'],
    contents: [{ formula: 'H2O', phase: 'l', mass_g, moles: mass_g / 18.015 }] };
}

it('counts material once across vessels, wet walls, tools, parcels, spills, and waste', () => {
  const vessel = { ...lab.vessels.beaker_1, ...water(9),
    wallCoatingMass_g: 3, outerWallCoatingMass_g: 1, dynamicLoad_g: 50, tare_g: 85,
    wallCondensation: { inner_g: 1, outer_g: 2, innerWall_c: 25, outerWall_c: 24, dewPoint_c: 18,
      ambientCollected_g: 2, ambientReleased_g: 0, returned_g: 0, drainedOutside_g: 0,
      heatRejected_J: 0, heatTransferredToSample_J: 0 },
    waterVaporReleased_g: 1.25, escapedGas_g: { H2O: 7, CO2: 0.75 } };
  const position: [number, number, number] = [0, 0, 0];
  const parcel: PourParcel = { id: 'wall', stage: 'wall', sessionId: 'pour', sourceId: 'flask_1',
    sourceName: 'Flask', targetId: vessel.id, targetPose: '', sample: water(3), releasedVolume_ml: 6,
    duration_s: 1, elapsed_s: 1, arrivedFraction: 0.5,
    trajectory: { exitPos: position, exitVel: position, impactPos: position, timeOfFlight: 0.5,
      landingKind: 'wall_inner', targetVesselId: vessel.id } };
  const input = {
    ...lab,
    vessels: { [vessel.id]: vessel, lesson_vessel_example: { ...vessel, id: 'lesson_vessel_example', mass_g: 90 } },
    inFlightPours: [parcel], pipetteSample: water(4), burette: { ...lab.burette, currentVolume_ml: 20 },
    spatulaState: { chemical: 'NaCl', mass_g: 2, color: '#fff' },
    spills: { puddle: { id: 'puddle', position, radius: 0.1, isHazard: false, timestamp: 0,
      ...water(5), escapedGas_g: { H2O: 0.5 } } },
    wasteMass_g: 6, workbenchEscapedGas_g: { H2O: 0.5 },
  };

  expect(readWorkbenchInventory(input)).toMatchObject({
    masses: { vessels: 9, condensation: 3, pipette: 4, burette: 20, spatula: 2, inFlight: 3, spilled: 5, waste: 6 },
    total_g: 52, escaped_g: 2.5, buretteMassUnavailable: false,
  });
});

it('uses the burette solution model and identifies incompatible imported stock settings', () => {
  const valid = { ...lab.burette, currentVolume_ml: 12 };
  expect(readWorkbenchInventory({ ...lab, burette: valid }).masses.burette).toBe(12);
  expect(readWorkbenchInventory({ ...lab, burette: { ...valid, concentration_M: Infinity } }))
    .toMatchObject({ masses: { burette: 0 }, buretteMassUnavailable: true });
});
