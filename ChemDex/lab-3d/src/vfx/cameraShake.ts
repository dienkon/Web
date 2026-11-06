import { Matrix4, type Camera } from 'three';

export interface CameraShakeState { strength: number; age_s: number; duration_s: number }
export const createCameraShake = (): CameraShakeState => ({ strength: 0, age_s: 0, duration_s: 0.6 });

export function kickCameraShake(state: CameraShakeState, intensity: number, duration_s = 0.6): void {
  if (!Number.isFinite(intensity) || intensity <= 0 || !Number.isFinite(duration_s) || duration_s <= 0) return;
  const remaining = state.strength * Math.max(0, 1 - state.age_s / state.duration_s);
  state.strength = Math.min(1, remaining + intensity);
  state.duration_s = Math.max(0.1, Math.min(3, duration_s)); state.age_s = 0;
}

export function stepCameraShake(state: CameraShakeState, dt: number, reducedMotion = false) {
  if (Number.isFinite(dt) && dt > 0) state.age_s = Math.min(state.duration_s, state.age_s + dt);
  const amplitude = reducedMotion ? 0 : (state.strength * Math.max(0, 1 - state.age_s / state.duration_s)) ** 2;
  if (amplitude === 0) return { x: 0, y: 0, roll: 0 };
  const t = state.age_s;
  return { x: amplitude * (Math.sin(t * 38) * 0.012 + Math.sin(t * 71) * 0.004),
    y: amplitude * (Math.sin(t * 32) * 0.010 + Math.sin(t * 59) * 0.004),
    roll: amplitude * Math.sin(t * 26) * 0.025 };
}

/** Clip-space viewport overlay. OrbitControls never receives a shaken physical
 * camera pose. Restore only our own last projection, respecting a real resize. */
export class CameraShakeProjection {
  private base = new Matrix4();
  private rendered = new Matrix4();
  private overlay = new Matrix4();
  private roll = new Matrix4();
  private active = false;
  restore(camera: Camera) {
    if (this.active && camera.projectionMatrix.equals(this.rendered)) {
      camera.projectionMatrix.copy(this.base);
      camera.projectionMatrixInverse.copy(this.base).invert();
    }
    this.active = false;
  }
  apply(camera: Camera, shake: { x: number; y: number; roll: number }) {
    this.restore(camera);
    if (![shake.x, shake.y, shake.roll].every(Number.isFinite) || !(shake.x || shake.y || shake.roll)) return;
    this.base.copy(camera.projectionMatrix);
    this.overlay.makeTranslation(shake.x, shake.y, 0).multiply(this.roll.makeRotationZ(shake.roll));
    camera.projectionMatrix.premultiply(this.overlay);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    this.rendered.copy(camera.projectionMatrix); this.active = true;
  }
}
