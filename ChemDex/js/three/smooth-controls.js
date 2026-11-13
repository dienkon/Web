import * as THREE from 'three';

const EPS = 1e-5;

/**
 * Pole-free, damped screen-space quaternion orbit/arcball controls.
 * Avoids polar gimbal lock and horizon roll inversion on inverted views.
 */
export class SmoothOrbitControls extends THREE.EventDispatcher {
  constructor(camera, domElement, options = {}) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3();
    if (options.target) this.target.copy(options.target);

    this.enabled = true;
    this.enableRotate = options.enableRotate ?? true;
    this.enableZoom = options.enableZoom ?? true;
    this.enablePan = options.enablePan ?? true;

    this.rotateSpeed = options.rotateSpeed ?? 1.0;
    this.zoomSpeed = options.zoomSpeed ?? 1.0;
    this.panSpeed = options.panSpeed ?? 1.0;

    this.minDistance = options.minDistance ?? 0.05;
    this.maxDistance = options.maxDistance ?? 2000;

    this.autoRotate = options.autoRotate ?? false;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.42;
    this.pauseAutoRotateOnStart = options.pauseAutoRotateOnStart ?? false;
    this.spinAxis = (options.spinAxis ? options.spinAxis.clone() : new THREE.Vector3(0, 1, 0)).normalize();

    this.rect = { left: 0, top: 0, width: 1, height: 1 };
    this.handleResize();

    this._pointers = new Map();
    this._mode = 'none'; // 'rotate' | 'pan' | 'pinch'
    this._pendingYaw = 0;
    this._pendingPitch = 0;
    this._velYaw = 0;
    this._velPitch = 0;
    this._panDeltaX = 0;
    this._panDeltaY = 0;
    this._lastMoveAt = 0;
    this._pinchPrevDist = 0;
    this._pinchPrevMid = null;
    this._isInteracting = false;

    this._targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.camera.position.distanceTo(this.target) || 1)
    );
    this._home = null;
    this._transition = null;

    this._offset = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._axis = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._panVec = new THREE.Vector3();

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onContextMenu = (e) => {
      if (this.enabled && this.enablePan) e.preventDefault();
    };

    if (this.domElement) {
      this.domElement.style.touchAction = 'none';
      this.domElement.addEventListener('pointerdown', this._onPointerDown);
      this.domElement.addEventListener('pointermove', this._onPointerMove);
      this.domElement.addEventListener('pointerup', this._onPointerUp);
      this.domElement.addEventListener('pointercancel', this._onPointerUp);
      this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
      this.domElement.addEventListener('contextmenu', this._onContextMenu);
    }
  }

  handleResize() {
    if (!this.domElement) return;
    const box = this.domElement.getBoundingClientRect();
    this.rect.left = box.left;
    this.rect.top = box.top;
    this.rect.width = Math.max(box.width, 1);
    this.rect.height = Math.max(box.height, 1);
  }

  syncFromCamera() {
    this._targetDistance = THREE.MathUtils.clamp(
      this.camera.position.distanceTo(this.target) || 1,
      this.minDistance,
      this.maxDistance
    );
    this._pendingYaw = 0;
    this._pendingPitch = 0;
    this._velYaw = 0;
    this._velPitch = 0;
    this._panDeltaX = 0;
    this._panDeltaY = 0;
    this._transition = null;
    this.dispatchEvent({ type: 'change' });
  }

  saveHome() {
    this._home = {
      position: this.camera.position.clone(),
      target: this.target.clone(),
      up: this.camera.up.clone(),
    };
  }

  animateTo(position, target, up, duration = 0.38) {
    this._velYaw = 0;
    this._velPitch = 0;
    this._pendingYaw = 0;
    this._pendingPitch = 0;
    this._panDeltaX = 0;
    this._panDeltaY = 0;
    if (duration <= 0) {
      this.target.copy(target);
      this.camera.position.copy(position);
      this.camera.up.copy(up).normalize();
      this.camera.lookAt(this.target);
      this.syncFromCamera();
      return;
    }
    this._transition = {
      elapsed: 0,
      duration,
      fromPos: this.camera.position.clone(),
      fromTarget: this.target.clone(),
      fromUp: this.camera.up.clone().normalize(),
      toPos: position.clone(),
      toTarget: target.clone(),
      toUp: up.clone().normalize(),
    };
    this.dispatchEvent({ type: 'change' });
  }

  reset(duration = 0.35) {
    if (!this._home) return;
    this.animateTo(this._home.position, this._home.target, this._home.up, duration);
  }

  _beginInteraction() {
    this._transition = null;
    if (!this._isInteracting) {
      this._isInteracting = true;
      if (this.pauseAutoRotateOnStart) this.autoRotate = false;
      this.dispatchEvent({ type: 'start' });
    }
  }

  _endInteraction() {
    if (this._isInteracting) {
      this._isInteracting = false;
      this.dispatchEvent({ type: 'end' });
    }
  }

  _handlePointerDown(e) {
    if (!this.enabled) return;
    this.handleResize();
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    try {
      this.domElement.setPointerCapture?.(e.pointerId);
    } catch {}

    this._velYaw = 0;
    this._velPitch = 0;

    if (this._pointers.size === 1) {
      const wantsPan = this.enablePan && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey);
      if (wantsPan) {
        this._mode = 'pan';
      } else if (this.enableRotate) {
        this._mode = 'rotate';
      } else {
        this._mode = 'none';
      }
      if (this._mode !== 'none') this._beginInteraction();
    } else if (this._pointers.size >= 2) {
      const pts = [...this._pointers.values()];
      this._pinchPrevDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this._pinchPrevMid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
      this._mode = 'pinch';
      this._beginInteraction();
    }
  }

  _handlePointerMove(e) {
    if (!this.enabled || !this._pointers.has(e.pointerId)) return;
    const prev = this._pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    prev.x = e.clientX;
    prev.y = e.clientY;

    if (this._pointers.size >= 2 && this._mode === 'pinch') {
      const pts = [...this._pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
      if (this.enableZoom && this._pinchPrevDist > 0 && dist > 0) {
        const ratio = this._pinchPrevDist / dist;
        this._targetDistance = THREE.MathUtils.clamp(
          this._targetDistance * Math.pow(ratio, this.zoomSpeed),
          this.minDistance,
          this.maxDistance
        );
      }
      if (this.enablePan && this._pinchPrevMid) {
        this._panDeltaX += mid.x - this._pinchPrevMid.x;
        this._panDeltaY += mid.y - this._pinchPrevMid.y;
      }
      this._pinchPrevDist = dist;
      this._pinchPrevMid = mid;
      this.dispatchEvent({ type: 'change' });
      return;
    }

    if (dx === 0 && dy === 0) return;
    const now = performance.now();

    if (this._mode === 'rotate' && this.enableRotate) {
      const scale = (2.8 * this.rotateSpeed) / Math.max(Math.min(this.rect.width, this.rect.height), 220);
      const dYaw = -dx * scale;
      const dPitch = -dy * scale;
      this._pendingYaw += dYaw;
      this._pendingPitch += dPitch;

      const dtMs = Math.max(now - (this._lastMoveAt || now - 16), 6);
      const instRate = 1000 / Math.min(dtMs, 80);
      this._velYaw = THREE.MathUtils.lerp(this._velYaw, dYaw * instRate, 0.55);
      this._velPitch = THREE.MathUtils.lerp(this._velPitch, dPitch * instRate, 0.55);
      this._lastMoveAt = now;
      this.dispatchEvent({ type: 'change' });
    } else if (this._mode === 'pan' && this.enablePan) {
      this._panDeltaX += dx;
      this._panDeltaY += dy;
      this.dispatchEvent({ type: 'change' });
    }
  }

  _handlePointerUp(e) {
    this._pointers.delete(e.pointerId);
    try {
      if (this.domElement.hasPointerCapture?.(e.pointerId)) {
        this.domElement.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (this._pointers.size === 1) {
      this._mode = this.enableRotate ? 'rotate' : 'none';
      this._pinchPrevDist = 0;
      this._pinchPrevMid = null;
      return;
    }

    if (this._pointers.size === 0) {
      if (performance.now() - this._lastMoveAt > 75) {
        this._velYaw = 0;
        this._velPitch = 0;
      }
      this._mode = 'none';
      this._endInteraction();
    }
  }

  _handleWheel(e) {
    if (!this.enabled || !this.enableZoom) return;
    e.preventDefault();
    this._transition = null;
    const unitScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.rect.height : 1;
    const pixels = THREE.MathUtils.clamp(e.deltaY * unitScale, -240, 240);
    const factor = Math.exp(pixels * 0.0012 * this.zoomSpeed);
    this._targetDistance = THREE.MathUtils.clamp(this._targetDistance * factor, this.minDistance, this.maxDistance);
    this.dispatchEvent({ type: 'change' });
  }

  update(dt = 1 / 60) {
    if (!this.enabled) return false;
    const clampedDt = Math.min(Math.max(dt, 1 / 240), 0.05);
    let moved = false;

    if (this._transition) {
      this._transition.elapsed += clampedDt;
      const raw = Math.min(this._transition.elapsed / this._transition.duration, 1);
      const t = 1 - Math.pow(1 - raw, 3);
      this.target.lerpVectors(this._transition.fromTarget, this._transition.toTarget, t);
      this.camera.position.lerpVectors(this._transition.fromPos, this._transition.toPos, t);
      this.camera.up.lerpVectors(this._transition.fromUp, this._transition.toUp, t).normalize();
      this.camera.lookAt(this.target);
      this._targetDistance = THREE.MathUtils.clamp(
        this.camera.position.distanceTo(this.target) || 1,
        this.minDistance,
        this.maxDistance
      );
      if (raw >= 1) this._transition = null;
      this.dispatchEvent({ type: 'change' });
      return true;
    }

    this._offset.copy(this.camera.position).sub(this.target);
    const currentDist = Math.max(this._offset.length(), EPS);

    // Derive stable orthonormal camera axes from current camera pose
    this._forward.copy(this._offset).negate().normalize();
    this._right.crossVectors(this._forward, this.camera.up);
    if (this._right.lengthSq() < 1e-8) {
      this._right.set(1, 0, 0);
    } else {
      this._right.normalize();
    }
    this._up.crossVectors(this._right, this._forward).normalize();
    this.camera.up.copy(this._up);

    // Apply panning in screen plane
    if (Math.abs(this._panDeltaX) > EPS || Math.abs(this._panDeltaY) > EPS) {
      const fovRad = THREE.MathUtils.degToRad(this.camera.fov || 40);
      const scale = (2 * currentDist * Math.tan(fovRad * 0.5) * this.panSpeed) / Math.max(this.rect.height, 1);
      this._panVec
        .set(0, 0, 0)
        .addScaledVector(this._right, -this._panDeltaX * scale)
        .addScaledVector(this._up, this._panDeltaY * scale);
      this.target.add(this._panVec);
      this.camera.position.add(this._panVec);
      this._panDeltaX = 0;
      this._panDeltaY = 0;
      moved = true;
    }

    // Gather angular delta (pending drag + inertia when released + optional autoRotate)
    let stepYaw = 0;
    let stepPitch = 0;
    if (Math.abs(this._pendingYaw) > EPS || Math.abs(this._pendingPitch) > EPS) {
      const blend = 1 - Math.exp(-32 * clampedDt);
      stepYaw = this._pendingYaw * blend;
      stepPitch = this._pendingPitch * blend;
      this._pendingYaw -= stepYaw;
      this._pendingPitch -= stepPitch;
    }

    if (this._mode !== 'rotate' && (Math.abs(this._velYaw) > EPS || Math.abs(this._velPitch) > EPS)) {
      stepYaw += this._velYaw * clampedDt;
      stepPitch += this._velPitch * clampedDt;
      const damp = Math.exp(-7.5 * clampedDt);
      this._velYaw *= damp;
      this._velPitch *= damp;
      if (Math.hypot(this._velYaw, this._velPitch) < 0.008) {
        this._velYaw = 0;
        this._velPitch = 0;
      }
    }

    const stepAngle = Math.hypot(stepYaw, stepPitch);
    if (stepAngle > EPS) {
      this._axis.set(0, 0, 0).addScaledVector(this._up, stepYaw).addScaledVector(this._right, stepPitch).normalize();
      this._quat.setFromAxisAngle(this._axis, stepAngle);
      this._offset.applyQuaternion(this._quat);
      this.camera.up.applyQuaternion(this._quat).normalize();
      moved = true;
    } else if (this.autoRotate && !this._isInteracting && this.autoRotateSpeed) {
      this._quat.setFromAxisAngle(this.spinAxis, this.autoRotateSpeed * clampedDt);
      this._offset.applyQuaternion(this._quat);
      this.camera.up.applyQuaternion(this._quat).normalize();
      moved = true;
    }

    // Smooth zoom interpolation
    const distDiff = this._targetDistance - currentDist;
    if (Math.abs(distDiff) > EPS * Math.max(currentDist, 1)) {
      const zoomBlend = 1 - Math.exp(-16 * clampedDt);
      const nextDist = currentDist + distDiff * zoomBlend;
      this._offset.setLength(nextDist);
      moved = true;
    }

    if (moved) {
      this.camera.position.copy(this.target).add(this._offset);
      this.camera.lookAt(this.target);
      this.dispatchEvent({ type: 'change' });
    }
    return moved;
  }

  dispose() {
    if (!this.domElement) return;
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('pointercancel', this._onPointerUp);
    this.domElement.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('contextmenu', this._onContextMenu);
    this._pointers.clear();
  }
}
