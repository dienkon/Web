export interface InputVector2 {
  x: number;
  y: number;
}

export interface InputButtons {
  interact: boolean;
  run: boolean;
  crouchToggle: boolean;
  flashlight: boolean;
  putAway: boolean;
  hotbar: number | null;
}

export interface JoystickVisualState {
  x: number;
  y: number;
  sprinting: boolean;
}

type EdgeButton = 'interact' | 'crouchToggle' | 'flashlight' | 'putAway';

const JOYSTICK_RADIUS = 56;
const JOYSTICK_DEAD_ZONE = 0.12;

export class InputManager {
  readonly move: InputVector2 = { x: 0, y: 0 };
  readonly lookDelta: InputVector2 = { x: 0, y: 0 };
  readonly buttons: InputButtons = {
    interact: false,
    run: false,
    crouchToggle: false,
    flashlight: false,
    putAway: false,
    hotbar: null,
  };

  joystickPointerId: number | null = null;
  lookPointerId: number | null = null;

  private readonly keyboardMove: InputVector2 = { x: 0, y: 0 };
  private readonly joystickMove: InputVector2 = { x: 0, y: 0 };
  private readonly consumedLook: InputVector2 = { x: 0, y: 0 };
  private joystickOriginX = 0;
  private joystickOriginY = 0;
  private lookLastX = 0;
  private lookLastY = 0;
  private smoothedLookX = 0;
  private smoothedLookY = 0;
  private sensitivity = 1;
  private invertY = false;
  private keyboardRun = false;
  private joystickSprint = false;
  private readonly pressedKeys = new Set<string>();

  setLookConfig(sensitivity: number, invertY: boolean) {
    this.sensitivity = Number.isFinite(sensitivity) ? Math.max(0.25, Math.min(3, sensitivity)) : 1;
    this.invertY = invertY;
  }

  handleKeyDown(code: string, repeat = false): boolean {
    this.pressedKeys.add(code);
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
      case 'KeyS':
      case 'ArrowDown':
      case 'KeyA':
      case 'ArrowLeft':
      case 'KeyD':
      case 'ArrowRight':
        this.updateKeyboardMove();
        return true;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyboardRun = true;
        this.updateRun();
        return true;
      case 'KeyC':
      case 'ControlLeft':
      case 'ControlRight':
        if (!repeat) this.buttons.crouchToggle = true;
        return true;
      case 'KeyF':
        if (!repeat) this.buttons.flashlight = true;
        return true;
      case 'Backspace':
      case 'KeyQ':
        if (!repeat) this.buttons.putAway = true;
        return true;
      case 'KeyE':
      case 'Space':
      case 'Enter':
        if (!repeat) this.buttons.interact = true;
        return true;
      default:
        if (code.startsWith('Digit')) {
          const slot = Number(code.slice(5));
          if (!repeat && slot >= 1 && slot <= 6) this.buttons.hotbar = slot;
          return slot >= 1 && slot <= 6;
        }
        return false;
    }
  }

  handleKeyUp(code: string): boolean {
    this.pressedKeys.delete(code);
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
      case 'KeyS':
      case 'ArrowDown':
      case 'KeyA':
      case 'ArrowLeft':
      case 'KeyD':
      case 'ArrowRight':
        this.updateKeyboardMove();
        return true;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyboardRun = this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight');
        this.updateRun();
        return true;
      default:
        return false;
    }
  }

  beginJoystick(pointerId: number, clientX: number, clientY: number) {
    if (this.joystickPointerId !== null) return false;
    this.joystickPointerId = pointerId;
    this.joystickOriginX = clientX;
    this.joystickOriginY = clientY;
    this.setJoystick(0, 0);
    return true;
  }

  updateJoystick(pointerId: number, clientX: number, clientY: number): JoystickVisualState | null {
    if (pointerId !== this.joystickPointerId) return null;
    const dx = clientX - this.joystickOriginX;
    const dy = clientY - this.joystickOriginY;
    const distance = Math.hypot(dx, dy);
    const limitedDistance = Math.min(distance, JOYSTICK_RADIUS);
    const directionX = distance > 0 ? dx / distance : 0;
    const directionY = distance > 0 ? dy / distance : 0;
    const rawMagnitude = limitedDistance / JOYSTICK_RADIUS;
    const normalizedMagnitude = rawMagnitude <= JOYSTICK_DEAD_ZONE
      ? 0
      : (rawMagnitude - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
    const curvedMagnitude = Math.pow(normalizedMagnitude, 1.3);

    this.setJoystick(directionX * curvedMagnitude, -directionY * curvedMagnitude);
    this.joystickSprint = this.joystickMove.y > 0 && rawMagnitude >= 0.9;
    this.updateRun();

    return {
      x: directionX * limitedDistance,
      y: directionY * limitedDistance,
      sprinting: this.joystickSprint,
    };
  }

  endJoystick(pointerId: number) {
    if (pointerId !== this.joystickPointerId) return false;
    this.joystickPointerId = null;
    this.joystickSprint = false;
    this.setJoystick(0, 0);
    this.updateRun();
    return true;
  }

  beginLook(pointerId: number, clientX: number, clientY: number) {
    if (this.lookPointerId !== null || pointerId === this.joystickPointerId) return false;
    this.lookPointerId = pointerId;
    this.lookLastX = clientX;
    this.lookLastY = clientY;
    this.smoothedLookX = 0;
    this.smoothedLookY = 0;
    return true;
  }

  updateLook(pointerId: number, clientX: number, clientY: number) {
    if (pointerId !== this.lookPointerId) return false;
    const dx = clientX - this.lookLastX;
    const dy = clientY - this.lookLastY;
    this.lookLastX = clientX;
    this.lookLastY = clientY;

    const acceleratedX = Math.sign(dx) * Math.pow(Math.abs(dx), 1.15);
    const acceleratedY = Math.sign(dy) * Math.pow(Math.abs(dy), 1.15);
    this.smoothedLookX += (acceleratedX - this.smoothedLookX) * 0.5;
    this.smoothedLookY += (acceleratedY - this.smoothedLookY) * 0.5;
    const scale = 0.0035 * this.sensitivity;
    this.lookDelta.x += this.smoothedLookX * scale;
    this.lookDelta.y += this.smoothedLookY * scale * (this.invertY ? -1 : 1);
    return true;
  }

  addMouseLook(deltaX: number, deltaY: number) {
    const scale = 0.0022 * this.sensitivity;
    this.lookDelta.x += deltaX * scale;
    this.lookDelta.y += deltaY * scale * (this.invertY ? -1 : 1);
  }

  endLook(pointerId: number) {
    if (pointerId !== this.lookPointerId) return false;
    this.lookPointerId = null;
    this.smoothedLookX = 0;
    this.smoothedLookY = 0;
    return true;
  }

  pressButton(button: EdgeButton) {
    this.buttons[button] = true;
  }

  consumeButton(button: EdgeButton) {
    const pressed = this.buttons[button];
    this.buttons[button] = false;
    return pressed;
  }

  consumeHotbar() {
    const slot = this.buttons.hotbar;
    this.buttons.hotbar = null;
    return slot;
  }

  consumeLookDelta() {
    this.consumedLook.x = this.lookDelta.x;
    this.consumedLook.y = this.lookDelta.y;
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return this.consumedLook;
  }

  resetPointers() {
    this.joystickPointerId = null;
    this.lookPointerId = null;
    this.joystickSprint = false;
    this.smoothedLookX = 0;
    this.smoothedLookY = 0;
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    this.setJoystick(0, 0);
    this.updateRun();
  }

  resetAll() {
    this.pressedKeys.clear();
    this.keyboardMove.x = 0;
    this.keyboardMove.y = 0;
    this.keyboardRun = false;
    this.buttons.interact = false;
    this.buttons.crouchToggle = false;
    this.buttons.flashlight = false;
    this.buttons.putAway = false;
    this.buttons.hotbar = null;
    this.resetPointers();
    this.updateMove();
  }

  private setJoystick(x: number, y: number) {
    this.joystickMove.x = x;
    this.joystickMove.y = y;
    this.updateMove();
  }

  private updateKeyboardMove() {
    this.keyboardMove.x = (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight') ? 1 : 0)
      - (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft') ? 1 : 0);
    this.keyboardMove.y = (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp') ? 1 : 0)
      - (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown') ? 1 : 0);
    this.updateMove();
  }

  private updateMove() {
    const x = this.keyboardMove.x + this.joystickMove.x;
    const y = this.keyboardMove.y + this.joystickMove.y;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      this.move.x = x / magnitude;
      this.move.y = y / magnitude;
    } else {
      this.move.x = x;
      this.move.y = y;
    }
  }

  private updateRun() {
    this.buttons.run = this.keyboardRun || this.joystickSprint;
  }
}

export const inputManager = new InputManager();
