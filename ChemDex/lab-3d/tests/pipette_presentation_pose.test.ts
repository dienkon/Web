import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import type { VesselState } from '../src/types/chemistry';
import { makePipettePresentation, pipetteTargetUnchanged, PIPETTE_TARGET_POSITION_TOLERANCE } from '../src/handling/pipettePresentation';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';
import { vesselLocalToWorld } from '../src/science/vesselScale';

const target = (overrides: Partial<VesselState> = {}): VesselState => ({ id: 'tilted-beaker', name: 'Beaker', type: 'beaker',
  capacity_ml: 100, position: [1, 0.2, -2], rotationY: 0.3, rotationZ: 0.25, isLocked: false,
  volume_ml: 8, contents: [{ formula: 'H2O', phase: 'l', mass_g: 8, moles: 8 / 18.015 }], ...overrides } as VesselState);

describe('pipette presentation target pose', () => {
  it('anchors nozzle and liquid impact to the rotated vessel surface and follows its local axis', () => {
    const vessel = target(), receipt = makePipettePresentation({ target: vessel, epoch: 3, direction: 'dispense', volume_ml: 1,
      before: { volume_ml: 1, color: '#dc2626' }, after: { volume_ml: 0, color: null } }, 1)!;
    const orientation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), vessel.rotationY!)
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), vessel.rotationZ!));
    const normal = new Vector3(0, 1, 0).applyQuaternion(orientation);
    const tip = new Vector3(0, -1.025, 0).applyQuaternion(orientation).add(new Vector3(...receipt.toolPosition));
    expect(tip.distanceTo(new Vector3(...receipt.outlet))).toBeLessThan(1e-12);
    expect(new Quaternion(...receipt.toolRotation).angleTo(orientation)).toBeLessThan(1e-7);
    const center = new Vector3(...vesselLocalToWorld(vessel, [0, vesselLiquidSurfaceY(vessel), 0]));
    const impact = new Vector3(...receipt.surface);
    expect(impact.y).toBeLessThan(receipt.outlet[1]);
    expect(Math.abs(normal.dot(impact.clone().sub(center)))).toBeLessThan(1e-12);
    expect(impact.x).toBe(receipt.outlet[0]); expect(impact.z).toBe(receipt.outlet[2]);
  });

  it('tolerates settled floating-point pose noise but cancels a real receiver move', () => {
    const original = target(), receipt = makePipettePresentation({ target: original, epoch: 3, direction: 'aspirate', volume_ml: 1,
      before: { volume_ml: 0, color: null }, after: { volume_ml: 1, color: '#38bdf8' } }, 1)!;
    const jittered = target({ position: original.position.map((value, i) => value + (i + 1) * 1e-7) as [number, number, number] });
    expect(pipetteTargetUnchanged(receipt, jittered)).toBe(true);
    const moved = target({ position: [original.position[0] + PIPETTE_TARGET_POSITION_TOLERANCE * 2, ...original.position.slice(1)] as [number, number, number] });
    expect(pipetteTargetUnchanged(receipt, moved)).toBe(false);
    expect(pipetteTargetUnchanged(receipt, target({ rotationZ: original.rotationZ! + 1e-4 }))).toBe(false);
  });
});
