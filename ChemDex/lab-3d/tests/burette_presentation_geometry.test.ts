import { describe, expect, it } from 'vitest';
import type { VesselState } from '../src/types/chemistry';
import { BURETTE_TIP_LOCAL_Y, advanceBurettePresentations, burettePresentationView, buretteTargetUnchanged,
  makeBurettePresentation, MAX_BURETTE_PRESENTATIONS } from '../src/handling/burettePresentation';
import { dropRadius } from '../src/handling/dropFlight';
import { vesselLocalToWorld } from '../src/science/vesselScale';
import { vesselLiquidSurfaceY } from '../src/science/vesselGeometry';

const stand: [number, number, number] = [1.25, 1.4, -0.8];
const vessel = (overrides: Partial<VesselState> = {}): VesselState => ({ id: 'target', name: 'Target', type: 'beaker', capacity_ml: 100,
  position: [stand[0], -0.135, stand[2]], rotationY: 0, isLocked: false, volume_ml: 10,
  contents: [{ formula: 'H2O', phase: 'l', mass_g: 10, moles: 10 / 18.015 }], ...overrides } as VesselState);
const input = (volume_ml = .02, overrides: Partial<VesselState> = {}) => ({ target: vessel(overrides), epoch: 4,
  standPosition: [...stand] as [number, number, number], volume_ml, color: '#d946ef' });

describe('burette drop presentation', () => {
  it('uses the actual lower tip face and the exact finite sample radius', () => {
    const receipt = makeBurettePresentation(input(), 1)!;
    expect(receipt.outlet).toEqual([stand[0], stand[1] + BURETTE_TIP_LOCAL_Y, stand[2]]);
    expect(receipt.radius).toBeCloseTo(dropRadius(.02), 14);
    expect(receipt.radius).toBeLessThan(dropRadius(.05));
    expect(burettePresentationView(receipt).position).toEqual(receipt.outlet);
    const mid = burettePresentationView({ ...receipt, elapsed_s: receipt.flight.flightTime / 2 });
    expect(mid.visible).toBe(true);
    expect(mid.position[0]).toBe(receipt.outlet[0]); expect(mid.position[2]).toBe(receipt.outlet[2]);
    expect(mid.position[1]).toBeGreaterThan(receipt.surface[1]);
    const end = burettePresentationView({ ...receipt, elapsed_s: receipt.flight.flightTime });
    expect(end.visible).toBe(false); end.position.forEach((value, i) => expect(value).toBeCloseTo(receipt.surface[i], 12));
  });

  it('anchors liquid surface and retires target changes without retargeting', () => {
    const tilted = vessel({ rotationY: .2, rotationZ: .18 });
    const receipt = makeBurettePresentation({ ...input(), target: tilted }, 1)!;
    const center = vesselLocalToWorld(tilted, [0, vesselLiquidSurfaceY(tilted), 0]);
    expect(receipt.surface[0]).toBeCloseTo(stand[0], 12);
    expect(receipt.surface[2]).toBeCloseTo(stand[2], 12);
    expect(receipt.surface[1]).toBeLessThan(center[1]);
    expect(buretteTargetUnchanged(receipt, { ...tilted, position: [stand[0] + 1e-7, -.135, stand[2]] })).toBe(true);
    expect(buretteTargetUnchanged(receipt, { ...tilted, position: [stand[0] + .01, -.135, stand[2]] })).toBe(false);
    expect(buretteTargetUnchanged(receipt, undefined)).toBe(false);
  });

  it('advances overlapping drops together, freezes paused queues, and clears epochs', () => {
    const a = makeBurettePresentation(input(.05), 1)!, b = makeBurettePresentation(input(), 2)!;
    const active = advanceBurettePresentations([a, b], .04, 4);
    expect(active.map(r => r.elapsed_s)).toEqual([.04, .04]);
    const paused = advanceBurettePresentations(active, 0, 4);
    expect(paused.map(r => r.elapsed_s)).toEqual([.04, .04]);
    expect(advanceBurettePresentations(active, 0, 5)).toEqual([]);
    expect(advanceBurettePresentations(active, 10, 4)).toEqual([]);
  });

  it('rejects nonfinite, empty-color, oversize and excess-batch receipts without clipping actual quantity', () => {
    expect(makeBurettePresentation({ ...input(), volume_ml: .051 }, 1)).toBeNull();
    expect(makeBurettePresentation({ ...input(), volume_ml: 0 }, 1)).toBeNull();
    expect(makeBurettePresentation({ ...input(), color: null }, 1)).toBeNull();
    const queue = Array.from({ length: MAX_BURETTE_PRESENTATIONS }, (_, id) => makeBurettePresentation(input(), id + 1)!);
    expect(queue).toHaveLength(128);
    expect(queue.reduce((sum, receipt) => sum + receipt.volume_ml, 0)).toBeCloseTo(2.56, 12);
  });
});
