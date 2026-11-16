import { describe, expect, it } from 'vitest';
import { dropFlightPosition, dropRadius, verticalDropFlight, AUTO_DROPPER_TIP_LOCAL_Y, AUTO_DROPPER_SCALE } from '../src/handling/dropFlight';
import { dropSchedule, landedScheduledDropFraction } from '../src/handling/doseTiming';
import { GRAVITY_M_S2, metersPerModelUnit } from '../src/science/sceneUnits';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { vesselWorldToLocal } from '../src/science/vesselScale';
import { receiverLipWorld } from '../src/vfx/autoplay/receiverFrame';

describe('liquid drops share their visible outlet and receiving contact', () => {
  it('falls vertically to the exact translated surface without an extra horizontal offset', () => {
    const flight = verticalDropFlight([3.2, 4.8, -2.7], 1.17);
    expect(dropFlightPosition(flight, 0)).toEqual(flight.start);
    for (const progress of [0.1, 0.5, 0.9]) {
      const point = dropFlightPosition(flight, progress * flight.flightTime);
      expect(point[0]).toBe(3.2); expect(point[2]).toBe(-2.7);
      expect(point[1]).toBeGreaterThan(flight.target[1]);
    }
    expect(dropFlightPosition(flight, flight.flightTime)).toEqual(flight.target);
    expect(dropFlightPosition(flight, flight.flightTime * 2)).toEqual(flight.target);
  });

  it('uses the automatic model scale for gravity, droplet volume and ledger impact time', () => {
    for (const capacity_ml of [100, 250, 500]) {
      const meters = metersPerModelUnit(getVesselProfile('beaker', capacity_ml));
      const flight = verticalDropFlight([0, 2.4, 0], 0.1, meters);
      const schedule = dropSchedule(0.12, flight.start[1] - flight.target[1], flight.gravity);
      expect(flight.gravity).toBeCloseTo(GRAVITY_M_S2 / meters, 12);
      expect(schedule.flightTime).toBe(flight.flightTime);
      expect(landedScheduledDropFraction(schedule.releaseStart + flight.flightTime - 1e-6, 0.12, schedule)).toBe(0);
      expect(landedScheduledDropFraction(schedule.releaseStart + flight.flightTime, 0.12, schedule)).toBeCloseTo(0.05 / 0.12, 12);
      expect(landedScheduledDropFraction(schedule.lastImpact, 0.12, schedule)).toBe(1);
      expect(4 / 3 * Math.PI * (dropRadius(0.05, meters) * meters) ** 3).toBeCloseTo(0.05e-6, 15);
    }
  });

  it('places a microdose pipette over the receiver centre and records its actual vertical landing', () => {
    const experiment = new AutoExperiment('hcl_naoh', false);
    const donor = experiment.donors.find(item => item.row.phase === 'aq')!;
    const ratio = 0.12 / donor.solutionVolume_ml;
    donor.components = donor.components.map(row => ({ ...row, mass_g: row.mass_g * ratio, moles: row.moles * ratio }));
    donor.row = donor.components.find(row => row.formula === donor.row.formula)!;
    donor.totalMass_g = donor.remaining = donor.components.reduce((sum, row) => sum + row.mass_g, 0);
    donor.solutionVolume_ml = 0.12; donor.doseMode = 'dropper';
    for (let frame = 0; frame < 6000 && !(experiment.phase === 'dose' && experiment.donors[experiment.donorIndex] === donor); frame++) experiment.tick(1 / 60);
    expect(experiment.phase).toBe('dose');
    expect(donor.dropFlight).toBeDefined();
    const flight = donor.dropFlight!;
    expect(flight.start[0]).toBe(experiment.sample.position[0]);
    expect(flight.start[2]).toBe(experiment.sample.position[2]);
    expect(experiment.donorPose.position[1] + AUTO_DROPPER_TIP_LOCAL_Y * AUTO_DROPPER_SCALE).toBeCloseTo(flight.start[1], 12);
    expect(flight.start[1]).toBeGreaterThan(receiverLipWorld(experiment.sample)[1]);
    for (let frame = 0; frame < 120 && donor.fraction === 0; frame++) experiment.tick(1 / 60);
    expect(donor.fraction).toBeCloseTo(0.05 / 0.12, 12);
    experiment.sample.recentPourContact!.point.forEach((value, axis) =>
      expect(value).toBeCloseTo(vesselWorldToLocal(experiment.sample, flight.target)[axis], 5));
  });
});
