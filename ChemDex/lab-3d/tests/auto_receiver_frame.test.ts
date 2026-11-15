import { describe, expect, it, vi } from 'vitest';
import { Matrix4, Vector3 } from 'three';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { receiverBodyMatrix, receiverLipWorld, receiverSurfaceWorld } from '../src/vfx/autoplay/receiverFrame';
import { stockLocalMatrix } from '../src/physical/stockCoordinates';
import { vesselLocalToWorld, vesselWorldToLocal } from '../src/science/vesselScale';
import { scenePointToSI, siPointToScene, SCENE_GRAVITY, METERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { solidFlightPosition } from '../src/vfx/autoplay/autoSolid';
import { gasInlet, gasPort } from '../src/vfx/autoplay/gasDelivery';

describe('automatic receiver shares the physical manual body frame', () => {
  it.each([100, 250, 500])('round-trips an SI stock pose through the actual %s mL glass body', capacity_ml => {
    const e = new AutoExperiment('cuso4_naoh', false);
    const vessel = { ...e.sample, capacity_ml, position: [1.2, 1.04, -0.7] as [number, number, number], rotationY: 0.27, rotationZ: 0.18 };
    const position_m = scenePointToSI(vesselLocalToWorld(vessel, [0.2, -0.4, -0.1]));
    const pose = { id: 'test', formula: 'Fe (nail)', mass_g: 1, scale_m: 0.003, position_m,
      rotation: [0, 0, 0, 1] as [number, number, number, number], velocity_m_s: [0, 0, 0] as [number, number, number], angularVelocity_rad_s: [0, 0, 0] as [number, number, number], sleeping: true, powder: false };
    const world = receiverBodyMatrix(vessel).multiply(stockLocalMatrix(vessel, pose));
    const center = new Vector3().setFromMatrixPosition(world).toArray();
    center.forEach((value, axis) => expect(value).toBeCloseTo(siPointToScene(position_m)[axis], 12));
    const matrix = receiverBodyMatrix(vessel);
    for (const point of [[0, 0, 0], [0.3, -0.8, 0.2], [0, 1, 0]] as [number, number, number][]) {
      const actual = new Vector3(...point).applyMatrix4(matrix).toArray(), expected = vesselLocalToWorld(vessel, point);
      actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], 12));
    }
  });

  it('uses the scaled translated lip and liquid surface for drop flight and local contact', () => {
    const e = new AutoExperiment('hcl_naoh', false);
    e.sample = { ...e.sample, capacity_ml: 100, position: [2, 1.04, -3], volume_ml: 20, volume: 0.2, mass_g: 20,
      contents: [{ formula: 'H2O', phase: 'l', moles: 20 / 18.015, mass_g: 20 }], substances: ['H2O'] };
    const donor = e.donors.find(d => d.row.phase === 'aq')!;
    donor.doseMode = 'dropper';
    e.donorIndex = e.donors.indexOf(donor); e.phase = 'carry'; e.phaseTime = 2;
    const before = e.sample;
    e.tick(1 / 60);
    const flight = donor.dropFlight!;
    expect(flight.gravity).toBe(SCENE_GRAVITY);
    expect(flight.target[0]).toBe(before.position[0]); expect(flight.target[2]).toBe(before.position[2]);
    // One thermal substep precedes entry and can evaporate a finite trace.
    expect(flight.target[1]).toBeCloseTo(receiverSurfaceWorld(before)[1], 7);
    expect(flight.start[1] - receiverLipWorld(before)[1]).toBeCloseTo(0.4, 12);
  });

  it('births finite stock at the exact displayed airborne world contact without applying a second body transform', () => {
    const e = new AutoExperiment('zn_hcl');
    e.sample = { ...e.sample, capacity_ml: 100, position: [2, 1.04, -3], volume_ml: 20, volume: 0.2, mass_g: 20,
      contents: [{ formula: 'H2O', phase: 'l', moles: 20 / 18.015, mass_g: 20 }], substances: ['H2O'] };
    const donor = e.donors.find(d => d.solid)!;
    e.donorIndex = e.donors.indexOf(donor); e.phase = 'dose'; e.phaseTime = 0;
    const submit = vi.spyOn(e.stocks, 'addContact');
    for (let frame = 0; frame < 360 && !submit.mock.calls.some(call => call[2].length); frame++) e.tick(1 / 60);
    const birth = submit.mock.calls.flatMap(call => call[2])[0], flight = donor.solid!.flights.find(f => f.arrived)!;
    expect(birth).toBeDefined();
    const visibleWorld = solidFlightPosition(flight, flight.arrivalAt);
    const expectedSI = scenePointToSI(visibleWorld.toArray());
    birth.position_m.forEach((value, axis) => expect(value).toBeCloseTo(expectedSI[axis], 12));
    expect(birth.velocity_m_s[1]).toBeCloseTo((flight.velocity[1] - SCENE_GRAVITY * (flight.arrivalAt - flight.releaseAt)) * METERS_PER_SCENE_UNIT, 12);
    const local = vesselWorldToLocal(e.sample, visibleWorld.toArray());
    expect(e.sample.recentPourContact!.point).toEqual(local);
  });

  it('keeps gas ports and submerged inlet under the same capacity-derived receiver frame', () => {
    const e = new AutoExperiment('nh3_hcl', false);
    e.sample = { ...e.sample, capacity_ml: 100, position: [2, 1.04, -3], volume_ml: 20, volume: 0.2, mass_g: 20,
      contents: [{ formula: 'H2O', phase: 'l', moles: 20 / 18.015, mass_g: 20 }], substances: ['H2O'] };
    const port = gasPort(0, e.sample), inlet = gasInlet(e, 0);
    expect(port[0]).toBe(inlet[0]); expect(port[2]).toBe(inlet[2]);
    expect(inlet[1]).toBeLessThan(receiverSurfaceWorld(e.sample)[1]);
    const local = vesselWorldToLocal(e.sample, inlet);
    expect(local[1]).toBeLessThan(vesselLiquidSurfaceY(e.sample));
    expect(local[0]).toBeCloseTo(0.4, 12);
  });
});
