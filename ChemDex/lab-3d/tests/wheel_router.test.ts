import { describe, it, expect, beforeEach } from 'vitest';
import { wheelRouter } from '../src/input/WheelRouter';
import { useAppStore } from '../src/store/useAppStore';
import { PourController } from '../src/pour/controller/PourController';

function createWheelEvent(opts: Partial<WheelEvent> = {}): WheelEvent {
  return {
    deltaY: 0,
    deltaMode: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: () => {},
    ...opts
  } as unknown as WheelEvent;
}

describe('WheelRouter Mouse Wheel Interactions (K3.1 & K3.5)', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedVesselId: null,
      draggingVesselId: null,
      nearestPourTargetId: null
    });
    PourController.cancelPour();
  });

  it('falls through to camera zoom (returns false) when nothing is held or hovered', () => {
    const dummyEvent = createWheelEvent({ deltaY: 100 });
    const consumed = wheelRouter.handleWheel(dummyEvent);
    expect(consumed).toBe(false);
  });

  it('falls through to camera zoom when Ctrl key is held (escape hatch)', () => {
    // Select beaker
    const beakerId = Object.keys(useAppStore.getState().vessels)[0];
    useAppStore.getState().setSelectedVesselId(beakerId);

    const ctrlEvent = createWheelEvent({
      deltaY: 100,
      ctrlKey: true
    });

    const consumed = wheelRouter.handleWheel(ctrlEvent);
    expect(consumed).toBe(false);
  });

  it('adjusts tilt when a vessel is held/selected with pour tilt active/locked', () => {
    const beakerId = Object.keys(useAppStore.getState().vessels)[0];
    useAppStore.getState().setSelectedVesselId(beakerId);
    useAppStore.getState().setPourTiltLocked(true);

    let recordedUpdate: any = null;
    const unsub = wheelRouter.subscribe(update => {
      if (update) recordedUpdate = update;
    });

    const wheelDown = createWheelEvent({
      deltaY: 100
    });

    const consumed = wheelRouter.handleWheel(wheelDown);
    expect(consumed).toBe(true);

    const session = PourController.getSession();
    expect(session).not.toBeNull();
    expect(session?.targetTilt).toBeGreaterThan(0);
    expect(recordedUpdate).not.toBeNull();
    expect(recordedUpdate.paramName_en).toBe('Tilt Angle');

    unsub();
  });

  it('adjusts lift height when Shift+Wheel is used on a held vessel', () => {
    const beakerId = Object.keys(useAppStore.getState().vessels)[0];
    useAppStore.getState().setSelectedVesselId(beakerId);
    const initialY = useAppStore.getState().vessels[beakerId].position[1];

    const shiftWheel = createWheelEvent({
      deltaY: -100, // Wheel up -> lift up
      shiftKey: true
    });

    const consumed = wheelRouter.handleWheel(shiftWheel);
    expect(consumed).toBe(true);

    const newY = useAppStore.getState().vessels[beakerId].position[1];
    expect(newY).toBeGreaterThan(initialY);
  });

  it('adjusts yaw rotation when Alt+Wheel is used on a held vessel', () => {
    const beakerId = Object.keys(useAppStore.getState().vessels)[0];
    useAppStore.getState().setSelectedVesselId(beakerId);
    const initialYaw = useAppStore.getState().vessels[beakerId].rotationY || 0;

    const altWheel = createWheelEvent({
      deltaY: 100,
      altKey: true
    });

    const consumed = wheelRouter.handleWheel(altWheel);
    expect(consumed).toBe(true);

    const newYaw = useAppStore.getState().vessels[beakerId].rotationY || 0;
    expect(newYaw).not.toBe(initialYaw);
  });
});
