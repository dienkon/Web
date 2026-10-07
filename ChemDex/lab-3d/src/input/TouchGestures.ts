/**
 * CHEMDEX LAB - Touch Gestures Recognizer (K3.2)
 * Recognizes multi-touch mobile & tablet gestures:
 * - Two-finger twist = yaw rotation
 * - Vertical two-finger drag = tilt adjustment
 * - Pinch = lift height (when holding vessel) or camera zoom
 * - Long-press (>= 500ms) = grab / release
 * - Double-tap (< 300ms) = context menu trigger
 */

export interface TouchGestureCallbacks {
  onTiltChange?: (deltaRad: number) => void;
  onYawChange?: (deltaRad: number) => void;
  onLiftChange?: (deltaY: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export class TouchGestureRecognizer {
  private activeTouches: Map<number, TouchPoint> = new Map();
  private callbacks: TouchGestureCallbacks;
  private longPressTimer: any = null;
  private lastTapTime: number = 0;
  private lastDistance: number = 0;
  private lastAngle: number = 0;

  constructor(callbacks: TouchGestureCallbacks) {
    this.callbacks = callbacks;
  }

  public handleTouchStart(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      this.activeTouches.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY });
    }

    if (this.activeTouches.size === 1) {
      const t = e.changedTouches[0];
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      // Check double tap
      if (now - this.lastTapTime < 300) {
        if (this.callbacks.onDoubleTap) {
          this.callbacks.onDoubleTap(t.clientX, t.clientY);
        }
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }

      // Start long-press timer
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.longPressTimer = setTimeout(() => {
        if (this.callbacks.onLongPress && this.activeTouches.size === 1) {
          this.callbacks.onLongPress(t.clientX, t.clientY);
        }
      }, 500);
    } else if (this.activeTouches.size === 2) {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      const points = Array.from(this.activeTouches.values());
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      this.lastDistance = Math.hypot(dx, dy);
      this.lastAngle = Math.atan2(dy, dx);
    }
  }

  public handleTouchMove(e: TouchEvent): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);

    if (this.activeTouches.size === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      if (!t0 || !t1) return;

      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const currentDistance = Math.hypot(dx, dy);
      const currentAngle = Math.atan2(dy, dx);

      // Two-finger twist -> Yaw rotation
      let deltaAngle = currentAngle - this.lastAngle;
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

      if (Math.abs(deltaAngle) > 0.02 && this.callbacks.onYawChange) {
        this.callbacks.onYawChange(deltaAngle * 1.5);
      }

      // Pinch -> Lift adjustment
      const deltaDist = currentDistance - this.lastDistance;
      if (Math.abs(deltaDist) > 3 && this.callbacks.onLiftChange) {
        this.callbacks.onLiftChange((deltaDist / 100) * 0.4);
      }

      // Vertical 2-finger drag -> Tilt
      const avgY = (t0.clientY + t1.clientY) / 2;
      const prevPoints = Array.from(this.activeTouches.values());
      if (prevPoints.length === 2) {
        const prevAvgY = (prevPoints[0].y + prevPoints[1].y) / 2;
        const deltaDragY = avgY - prevAvgY;
        if (Math.abs(deltaDragY) > 2 && this.callbacks.onTiltChange) {
          this.callbacks.onTiltChange((deltaDragY / 100) * 0.8);
        }
      }

      this.lastDistance = currentDistance;
      this.lastAngle = currentAngle;
    }

    // Update coordinates
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.activeTouches.has(t.identifier)) {
        this.activeTouches.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY });
      }
    }
  }

  public handleTouchEnd(e: TouchEvent): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.activeTouches.delete(e.changedTouches[i].identifier);
    }
  }
}
