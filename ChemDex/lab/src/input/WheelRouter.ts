/**
 * CHEMDEX LAB - WheelRouter
 * Unified mouse wheel parameter controller with context awareness,
 * smoothing, per-device delta normalization, and HUD feedback.
 */

import { useAppStore } from '../store/useAppStore';
import { PourController } from '../pour/controller/PourController';
import { clampTilt, clampLift, getHandleLimits } from '../handling/limits';

export interface WheelStateUpdate {
  active: boolean;
  targetId: string | null;
  targetType: string;
  paramName_en: string;
  paramName_vi: string;
  valueDisplay: string;
  unit: string;
  normalizedValue: number; // 0..1 for ring gauge
  warningLevel: 'safe' | 'warning' | 'danger';
}

export type WheelStateListener = (state: WheelStateUpdate | null) => void;

class WheelRouterClass {
  private listeners: Set<WheelStateListener> = new Set();
  private lastUpdate: WheelStateUpdate | null = null;
  private hideTimeout: any = null;
  private hoverDwellTimer: any = null;
  private hoveredTargetId: string | null = null;
  private isDwellSatisfied: boolean = false;

  public subscribe(listener: WheelStateListener): () => void {
    this.listeners.add(listener);
    listener(this.lastUpdate);
    return () => this.listeners.delete(listener);
  }

  private notify(update: WheelStateUpdate | null): void {
    this.lastUpdate = update;
    for (const listener of this.listeners) {
      listener(update);
    }
    if (update) {
      if (this.hideTimeout) clearTimeout(this.hideTimeout);
      this.hideTimeout = setTimeout(() => {
        this.notify(null);
      }, 1500);
    }
  }

  public setHoverTarget(targetId: string | null): void {
    if (this.hoveredTargetId === targetId) return;
    this.hoveredTargetId = targetId;
    this.isDwellSatisfied = false;
    if (this.hoverDwellTimer) clearTimeout(this.hoverDwellTimer);

    if (targetId) {
      // 120ms hover dwell to prevent accidental triggers while sweeping pointer
      this.hoverDwellTimer = setTimeout(() => {
        this.isDwellSatisfied = true;
      }, 120);
    }
  }

  /**
   * Main wheel event handler to be attached to Canvas container.
   * Returns true if event was consumed (should prevent default camera zoom/scroll).
   */
  public handleWheel(e: WheelEvent): boolean {
    // Escape hatch: Ctrl forces camera zoom / default OrbitControls
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      return false;
    }

    const store = useAppStore.getState();
    const heldId = store.draggingVesselId || store.selectedVesselId;
    const session = PourController.getSession();

    // Normalize wheel delta (lines vs pixels)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 24; // lines to px
    if (e.deltaMode === 2) delta *= 400; // pages to px
    const notches = Math.max(-5, Math.min(5, Math.round(delta / 40)));

    // 1. If holding or tilting a vessel:
    if (session || heldId) {
      const vesselId = session ? session.sourceId : (heldId as string);
      const vessel = store.vessels[vesselId];
      if (!vessel) return false;

      // Shift + Wheel = Adjust Lift Height (while holding or selecting)
      if (e.shiftKey && heldId) {
        if (e.cancelable) e.preventDefault();
        const currentLift = vessel.position[1];
        const step = (e.altKey ? 0.02 : 0.08) * -Math.sign(delta);
        const newLift = clampLift(vessel.type, currentLift + step);
        store.updateVesselPosition(vesselId, [vessel.position[0], newLift, vessel.position[2]]);

        const limits = getHandleLimits(vessel.type);
        const norm = Math.max(0, Math.min(1, (newLift - limits.lift[0]) / (limits.lift[1] - limits.lift[0])));
        this.notify({
          active: true,
          targetId: vesselId,
          targetType: vessel.type,
          paramName_en: 'Lift Height',
          paramName_vi: 'Độ cao nâng',
          valueDisplay: `${newLift.toFixed(2)}`,
          unit: 'm',
          normalizedValue: norm,
          warningLevel: newLift > 2.0 ? 'warning' : 'safe'
        });
        return true;
      }

      // Alt + Wheel without Shift = Adjust Yaw Rotation
      if (e.altKey && heldId) {
        if (e.cancelable) e.preventDefault();
        const step = (Math.PI / 36) * -Math.sign(delta); // 5 degrees per notch
        const newYaw = (vessel.rotationY || 0) + step;
        store.rotateVessel(vesselId, step);

        const deg = Math.round(((newYaw * 180) / Math.PI) % 360);
        this.notify({
          active: true,
          targetId: vesselId,
          targetType: vessel.type,
          paramName_en: 'Yaw Rotation',
          paramName_vi: 'Góc xoay ngang',
          valueDisplay: `${deg > 0 ? deg : deg + 360}`,
          unit: '°',
          normalizedValue: ((newYaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI),
          warningLevel: 'safe'
        });
        return true;
      }

      // Plain Wheel = Adjust Tilt ONLY when 2 vessels are close together and pour mode is active/locked
      const canPourTilt = store.isPourTiltLocked || (session && session.targetId) || (store.nearestPourTargetId && store.draggingVesselId);
      if (!canPourTilt) {
        // Not in pour-ready state: allow natural camera zoom
        return false;
      }

      if (e.cancelable) e.preventDefault();

      const currentTilt = session ? session.targetTilt : 0;
      const degStep = e.altKey ? 0.25 : 1.5; // ±1.5° default, ±0.25° fine
      const radStep = (degStep * Math.PI) / 180;
      const newTilt = clampTilt(vessel.type, currentTilt + radStep * Math.sign(delta));

      if (session) {
        PourController.setTilt(newTilt);
      } else {
        // Begin hand tilt session towards the nearby vessel
        PourController.beginPour({
          mode: 'HAND_TILT',
          sourceId: vesselId,
          targetId: store.nearestPourTargetId || null
        });
        PourController.setTilt(newTilt);
      }

      const deg = Math.round((newTilt * 180) / Math.PI);
      const isNearSpill = deg > 45 && deg <= 90;
      const isBeyondLimit = deg > 90;

      this.notify({
        active: true,
        targetId: vesselId,
        targetType: vessel.type,
        paramName_en: 'Tilt Angle',
        paramName_vi: 'Góc nghiêng rót',
        valueDisplay: `${deg}`,
        unit: '°',
        normalizedValue: newTilt / Math.PI,
        warningLevel: isBeyondLimit ? 'danger' : isNearSpill ? 'warning' : 'safe'
      });

      return true;
    }

    // 2. Controllable Burner hovered
    if (this.hoveredTargetId && this.hoveredTargetId.startsWith('burner') && this.isDwellSatisfied) {
      e.preventDefault();
      const burner = store.burners[this.hoveredTargetId];
      if (burner) {
        const step = -Math.sign(delta);
        const newIntensity = Math.max(1, Math.min(5, burner.intensity + step));
        store.setBurnerIntensity(this.hoveredTargetId, newIntensity);

        this.notify({
          active: true,
          targetId: this.hoveredTargetId,
          targetType: 'burner',
          paramName_en: 'Flame Intensity',
          paramName_vi: 'Cường độ ngọn lửa',
          valueDisplay: `${newIntensity}`,
          unit: '/ 5',
          normalizedValue: newIntensity / 5,
          warningLevel: newIntensity >= 4 ? 'danger' : 'safe'
        });
        return true;
      }
    }

    // 3. Hovered vessel (not held): rotate yaw on the spot
    if (this.hoveredTargetId && store.vessels[this.hoveredTargetId] && this.isDwellSatisfied) {
      e.preventDefault();
      const vessel = store.vessels[this.hoveredTargetId];
      const step = (Math.PI / 24) * -Math.sign(delta);
      store.rotateVessel(this.hoveredTargetId, step);

      const deg = Math.round((((vessel.rotationY || 0) + step) * 180) / Math.PI);
      this.notify({
        active: true,
        targetId: this.hoveredTargetId,
        targetType: vessel.type,
        paramName_en: 'Bench Rotation',
        paramName_vi: 'Xoay trên bàn',
        valueDisplay: `${(deg % 360 + 360) % 360}`,
        unit: '°',
        normalizedValue: 0.5,
        warningLevel: 'safe'
      });
      return true;
    }

    // Default: allow camera zoom to take over
    return false;
  }
}

export const wheelRouter = new WheelRouterClass();
