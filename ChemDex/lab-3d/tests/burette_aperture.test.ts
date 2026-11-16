import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import type { VesselState } from '../src/types/chemistry';
import { buretteDeliveryPath, buretteTargetProblem, findBuretteReceiver } from '../src/handling/buretteTarget';
import { makeBurettePresentation } from '../src/handling/burettePresentation';
import { vesselLocalToWorld, vesselWorldToLocal } from '../src/science/vesselScale';
import { contourRadius, vesselInterior } from '../src/science/vesselDimensions';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { volumeBelowPlane } from '../src/pour/physics/retained';
import { vesselVortexSurface } from '../src/science/vesselLiquidMotion';
import { vortexHeight } from '../src/science/liquidVortex';

const receiver = (patch: Partial<VesselState> = {}): VesselState => ({ id: 'target', name: 'Target', type: 'beaker', capacity_ml: 100,
  position: [0, -.135, 0], rotationY: 0, rotationZ: .15, isLocked: false, mass_g: 10, volume_ml: 10, volume: .1,
  temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }], substances: ['H2O'], ...patch });

describe('vertical burette delivery enters the real opening', () => {
  it('rejects an offset nozzle whose ray misses a tilted mouth even though the nozzle local radius fits', () => {
    const target = receiver(), stand: [number, number, number] = [-1, 2, 0];
    const nozzle = vesselWorldToLocal(target, [-1, 1.9, 0]);
    expect(Math.hypot(nozzle[0], nozzle[2])).toBeLessThan(.965); // The previous predicate accepted it.
    expect(buretteTargetProblem(target, stand)).not.toBeNull();
    expect(findBuretteReceiver({ target }, stand)).toBeNull();
    expect(makeBurettePresentation({ target, epoch: 1, standPosition: stand, volume_ml: .05, color: '#fff' }, 1)).toBeNull();
  });

  it.each([false, true])('accepts the actual tilted flask opening from above (physical quaternion=%s)', physical => {
    const tilt = .3, target = receiver({ type: 'flask', rotationZ: tilt,
      ...(physical ? { rotationZ: 0, physicalMotion: { rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt).toArray(),
        velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 0 } } : {}) });
    const mouth = vesselLocalToWorld(target, [0, vesselInterior(target.type).topY, 0]);
    const stand: [number, number, number] = [mouth[0], mouth[1] + 1.5, mouth[2]];
    expect(buretteTargetProblem(target, stand)).toBeNull();
    const path = buretteDeliveryPath(target, stand)!;
    expect(path.contactKind).toBe('liquid');
    expect(path.contact[0]).toBe(path.outlet[0]); expect(path.contact[2]).toBe(path.outlet[2]);
    expect(path.contact[1]).toBeLessThan(mouth[1]);
  });

  it('ends at an inner wall after entering a tilted tube rather than passing through glass to a fictitious liquid plane', () => {
    const target = receiver({ type: 'test_tube', rotationZ: .3 });
    const mouth = vesselLocalToWorld(target, [0, vesselInterior(target.type).topY, 0]);
    const stand: [number, number, number] = [mouth[0], mouth[1] + .6, mouth[2]];
    const path = buretteDeliveryPath(target, stand)!;
    expect(path.contactKind).toBe('wall');
    const local = vesselWorldToLocal(target, path.contact);
    expect(Math.hypot(local[0], local[2])).toBeCloseTo(contourRadius(vesselInterior(target.type).points, local[1]), 10);
    const receipt = makeBurettePresentation({ target, epoch: 1, standPosition: stand, volume_ml: .02, color: '#fff' }, 1)!;
    expect(receipt.surface).toEqual(path.contact);
  });

  it('intersects a horizontal retained-volume liquid plane at the same height across the tilted receiver', () => {
    const target = receiver({ rotationZ: .2, volume_ml: 50, volume: .5, mass_g: 50,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] });
    const a = buretteDeliveryPath(target, [-.1, 2, 0])!, b = buretteDeliveryPath(target, [.1, 2, 0])!;
    expect(a.contactKind).toBe('liquid'); expect(b.contactKind).toBe('liquid');
    expect(a.contact[1]).toBeCloseTo(b.contact[1], 12);
    const local = vesselWorldToLocal(target, a.contact), normal: [number, number, number] = [Math.sin(.2), Math.cos(.2), 0];
    const level = normal.reduce((sum, value, axis) => sum + value * local[axis], 0);
    const profile = getVesselProfile(target.type, target.capacity_ml);
    expect(volumeBelowPlane(profile, normal[0], normal[1], level) / volumeBelowPlane(profile, 0, 1, vesselInterior(target.type).topY))
      .toBeCloseTo(.5, 10);
  });

  it('allows an inserted tip above a dry floor but rejects submerged and downward-facing receivers', () => {
    const dry = receiver({ rotationZ: 0, volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] });
    const floor = vesselLocalToWorld(dry, [0, vesselInterior(dry.type).floorY, 0]);
    const inserted = vesselLocalToWorld(dry, [0, 0, 0]);
    const path = buretteDeliveryPath(dry, [inserted[0], inserted[1] + .1, inserted[2]])!;
    expect(path.contactKind).toBe('floor'); expect(path.contact[1]).toBeCloseTo(floor[1], 12);
    expect(buretteDeliveryPath(receiver({ rotationZ: 0 }), [0, floor[1], 0])).toBeNull();
    expect(buretteDeliveryPath(receiver({ rotationZ: Math.PI }), [0, 2, 0])).toBeNull();
  });

  it('uses the accepted stirred surface rather than an upright mean-height plane', () => {
    const target = receiver({ rotationZ: 0, volume_ml: 50, volume: .5, mass_g: 50,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }],
      liquidMotion: { angularSpeed_rad_s: 12, phase_rad: .5, remainder_s: 0 } });
    const vortex = vesselVortexSurface(target)!;
    expect(vortex).toBeDefined();
    const path = buretteDeliveryPath(target, [0, 2, 0])!;
    expect(path.contactKind).toBe('liquid');
    const point = vesselWorldToLocal(target, path.contact);
    expect(point[1]).toBeCloseTo(vortexHeight(point[0], point[2], vortex), 12);
    expect(point[1]).toBeLessThan(vortex.meanLevel);
  });
});
