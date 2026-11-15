import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../src/store/useAppStore';
import type { VesselState } from '../src/types/chemistry';
import { canStirVessel, setRodContact, setRodInput, vesselAgitation } from '../src/science/stirring';
import { stirringRodPose, STIRRING_ROD_LENGTH, STIRRING_ROD_RADIUS } from '../src/science/stirringRodPose';
import { getWorldVesselProfile } from '../src/pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';

const original = useAppStore.getState();
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); setRodInput('stir'); setRodContact('stir'); useAppStore.setState(original, true); });
function setup() {
  const v = { id: 'stir', volume_ml: 30, stirringIntensity: 0.3, contents: [
    { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
  ] } as VesselState;
  useAppStore.setState({ vessels: { stir: v }, stirringVesselId: null, activeTool: 'none', selectedVesselId: 'stir' });
  return v;
}
describe('Inspector stirring applies a bounded pulse, without replaying chemistry', () => {
  it('drives the selected strength and preserves the chemical inventory', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    expect(vesselAgitation(v, useAppStore.getState())).toBe(0.3);
    expect(useAppStore.getState().vessels[v.id]).toBe(v);
    vi.advanceTimersByTime(2500);
    expect(vesselAgitation(v, useAppStore.getState())).toBe(0);
  });
  it('restarting the same vessel replaces the old stop deadline', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(2000);
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(600);
    expect(useAppStore.getState().stirringVesselId).toBe(v.id);
    vi.advanceTimersByTime(1900);
    expect(useAppStore.getState().stirringVesselId).toBeNull();
  });
  it('a direct rod selection invalidates an older timed pulse', () => {
    vi.useFakeTimers(); const v = setup();
    useAppStore.getState().stirVessel(v.id);
    vi.advanceTimersByTime(1000);
    useAppStore.getState().setStirringVesselId(v.id);
    vi.advanceTimersByTime(2000);
    expect(useAppStore.getState().stirringVesselId).toBe(v.id);
  });
  it('does not stir a second selected vessel while the rod is in the pulse vessel', () => {
    const v = setup();
    useAppStore.setState({ activeTool: 'stirring_rod', stirringVesselId: 'other' });
    expect(vesselAgitation(v, useAppStore.getState())).toBe(0);
    expect(vesselAgitation({ ...v, id: 'other' }, useAppStore.getState())).toBe(0.3);
  });
  it.each([{ isSealed: true }, { isShattered: true }, { volume_ml: 0 }, { rotationZ: 0.2 },
    { physicalMotion: { rotation: [Math.sin(0.1), 0, 0, Math.cos(0.1)], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], tick: 0 } }])(
    'rejects inaccessible samples: %j', updates => {
      const v = { ...setup(), ...updates } as VesselState;
      useAppStore.setState({ vessels: { stir: v } });
      useAppStore.getState().stirVessel(v.id);
      expect(useAppStore.getState().stirringVesselId).toBeNull();
      expect(vesselAgitation(v, { ...useAppStore.getState(), activeTool: 'stirring_rod' })).toBe(0);
    });
  it('suspends forcing while moving the tool, paused, or before tip immersion', () => {
    const v = setup(), state = { ...useAppStore.getState(), activeTool: 'stirring_rod' };
    expect(vesselAgitation(v, { ...state, moveMode: true })).toBe(0);
    expect(vesselAgitation(v, { ...state, isSimulationPaused: true })).toBe(0);
    expect(vesselAgitation(v, { ...state, draggingVesselId: v.id })).toBe(0);
    setRodContact(v.id, false); expect(vesselAgitation(v, state)).toBe(0);
    setRodContact(v.id, true); expect(vesselAgitation(v, state)).toBe(0.3);
    setRodContact(v.id); expect(vesselAgitation(v, state)).toBe(0.3);
  });
  it('expires pointer boosts and rejects non-finite input', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const v = setup(), state = { ...useAppStore.getState(), activeTool: 'stirring_rod' };
    setRodInput(v.id, 0.9); expect(vesselAgitation(v, state)).toBe(0.9);
    now.mockReturnValue(1401); expect(vesselAgitation(v, state)).toBe(0.3);
    setRodInput(v.id, NaN); expect(vesselAgitation(v, state)).toBe(0.3);
  });
});

describe('glass rod geometry remains inside the liquid and neck', () => {
  function sample(type: string, capacity_ml: number, fraction = 0.5): VesselState {
    return { ...setup(), type, capacity_ml, volume_ml: capacity_ml * fraction,
      position: [2, 1.4, -3], rotationY: 0, rotationZ: 0, contents: [
        { formula: 'H2O', phase: 'l', mass_g: capacity_ml * fraction, moles: capacity_ml * fraction / 18.015 },
      ] } as VesselState;
  }
  it.each(['beaker', 'flask', 'cylinder', 'test_tube', 'reagent_bottle', 'volumetric_flask'] as const)(
    '%s clears the wall throughout the orbit and leaves the handle above the rim', type => {
      for (const capacity of [50, 100, 250]) {
        const vessel = sample(type, capacity), profile = getWorldVesselProfile(type, capacity);
        for (let phase = 0; phase < Math.PI * 2; phase += Math.PI / 8) {
          const pose = stirringRodPose(vessel, phase)!;
          expect(pose).not.toBeNull();
          const tipY = pose.tip[1] - vessel.position[1];
          expect(tipY - STIRRING_ROD_RADIUS).toBeGreaterThan(profile.baseY);
          expect(tipY + STIRRING_ROD_RADIUS).toBeLessThan(vesselWorldLiquidSurfaceY(vessel));
          expect(pose.tip[1] + STIRRING_ROD_LENGTH).toBeGreaterThan(pose.rimY + 0.59);
          for (let y = tipY; y < profile.baseY + profile.H; y += 0.02) {
            expect(pose.orbitRadius + STIRRING_ROD_RADIUS).toBeLessThan(profile.r(y));
          }
        }
      }
    });
  it('tracks vessel translation without leaving a stale tip in world space', () => {
    const vessel = sample('flask', 100), before = stirringRodPose(vessel, 0)!;
    const after = stirringRodPose({ ...vessel, position: [5, 3.4, 4] }, 0)!;
    expect(after.tip[0] - before.tip[0]).toBeCloseTo(3);
    expect(after.tip[1] - before.tip[1]).toBeCloseTo(2);
    expect(after.tip[2] - before.tip[2]).toBeCloseTo(7);
  });

  it('rejects the tilted flask neck collision while allowing settled upright roundoff', () => {
    const upright = sample('volumetric_flask', 250);
    expect(canStirVessel(upright)).toBe(true);
    expect(stirringRodPose({ ...upright, rotationZ: 1e-6 }, 0)).not.toBeNull();
    // At 0.04 rad the former vertical shaft crossed the neck near local
    // [0.146, 1.918, 0], with negative clearance including its radius.
    expect(stirringRodPose({ ...upright, rotationZ: 0.04 }, 0)).toBeNull();
    const body = { ...upright, physicalMotion: { rotation: [0, 0, Math.sin(0.02), Math.cos(0.02)] as [number, number, number, number],
      velocity_m_s: [0, 0, 0] as [number, number, number], angularVelocity_rad_s: [0, 0, 0] as [number, number, number], tick: 1 } };
    expect(stirringRodPose(body, 0)).toBeNull();
    expect(vesselAgitation(body, { stirringVesselId: body.id, activeTool: 'stirring_rod', selectedVesselId: body.id })).toBe(0);
  });
  it('does not insert a rod into a dry film or through a stopper', () => {
    expect(stirringRodPose(sample('beaker', 250, 0.00001), 0)).toBeNull();
    expect(stirringRodPose({ ...sample('flask', 100), isSealed: true }, 0)).toBeNull();
  });
});
