import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { resolveCapsuleMovement } from '../../../core/simulation/CollisionSystem';

interface KeysState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  shift: boolean;
  crouch: boolean;
}

export const FirstPersonController: React.FC = () => {
  const { camera, gl } = useThree();

  const view = useStore((s) => s.view);
  const isDialogActive = useStore((s) => s.isDialogActive);
  const runState = useStore((s) => s.runState);
  const joystickVec = useStore((s) => s.joystickVec) || { x: 0, y: 0 };
  const settings = useStore((s) => s.settings);

  // Pitch (vertical) and Yaw (horizontal) angles in radians
  const yaw = useRef<number>(Math.PI); // Facing North (-z) by default
  const pitch = useRef<number>(0);
  const isLocked = useRef<boolean>(false);

  // Crouch state & head height lerping
  // Standing eye height = 1.62m, crouched = 1.05m
  const currentEyeHeight = useRef<number>(1.62);
  const headBobTimer = useRef<number>(0);

  // Key states
  const keys = useRef<KeysState>({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    crouch: false,
  });

  // Stuck prevention: track time player has been stationary while pushing input
  const stuckTimer = useRef<number>(0);
  const lastRecordedPos = useRef<[number, number]>([playerCoords.position[0], playerCoords.position[2]]);

  // Pointer lock handling
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };

    const onClick = () => {
      if (view === 'game' && !isDialogActive && runState !== 'PAUSED') {
        if (!isLocked.current && canvas.requestPointerLock) {
          canvas.requestPointerLock();
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;

      const sensitivity = (settings.cameraSensitivity || 1.0) * 0.0022;
      yaw.current -= e.movementX * sensitivity;
      pitch.current -= e.movementY * sensitivity;

      // Limit pitch to +/- 85 degrees (1.48 rad)
      const maxPitch = (85 * Math.PI) / 180;
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current));
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onClick);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [gl, view, isDialogActive, runState, settings.cameraSensitivity]);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'game' || isDialogActive || runState === 'PAUSED') return;

      switch (e.code) {
        case 'KeyW':
          keys.current.w = true;
          break;
        case 'KeyS':
          keys.current.s = true;
          break;
        case 'KeyA':
          keys.current.a = true;
          break;
        case 'KeyD':
          keys.current.d = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = true;
          break;
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          keys.current.crouch = !keys.current.crouch; // toggle crouch
          break;
        case 'Escape':
          // Esc releases pointer lock automatically by browser
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          keys.current.w = false;
          break;
        case 'KeyS':
          keys.current.s = false;
          break;
        case 'KeyA':
          keys.current.a = false;
          break;
        case 'KeyD':
          keys.current.d = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [view, isDialogActive, runState]);

  // Frame update
  useFrame((_, delta) => {
    if (view !== 'game' || runState === 'PAUSED') {
      playerCoords.isMoving = false;
      return;
    }

    if (isDialogActive) {
      playerCoords.isMoving = false;
      // Keep camera oriented
      const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      camera.position.set(
        playerCoords.position[0],
        playerCoords.position[1] + currentEyeHeight.current,
        playerCoords.position[2]
      );
      return;
    }

    const { w, a, s, d, shift, crouch } = keys.current;
    const hasJoy = Math.abs(joystickVec.x) > 0.05 || Math.abs(joystickVec.y) > 0.05;
    const hasInput = w || a || s || d || hasJoy;

    // Speeds: Crouch = 0.9 m/s, Walk = 1.6 m/s, Run = 3.2 m/s
    const targetEyeH = crouch ? 1.05 : 1.62;
    currentEyeHeight.current = THREE.MathUtils.lerp(currentEyeHeight.current, targetEyeH, delta * 10);

    let moveSpeed = 1.6;
    if (crouch) {
      moveSpeed = 0.9;
    } else if (shift) {
      moveSpeed = 3.2;
    }

    // Camera forward and right vectors (horizontal plane)
    const forwardX = Math.sin(yaw.current);
    const forwardZ = Math.cos(yaw.current);
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);

    let inputX = 0;
    let inputZ = 0;

    if (w) {
      inputX -= forwardX;
      inputZ -= forwardZ;
    }
    if (s) {
      inputX += forwardX;
      inputZ += forwardZ;
    }
    if (a) {
      inputX -= rightX;
      inputZ -= rightZ;
    }
    if (d) {
      inputX += rightX;
      inputZ += rightZ;
    }

    if (hasJoy) {
      // Joystick Y is forward/back (-y = forward in joystick standard), X is strafe
      inputX += -forwardX * joystickVec.y + rightX * joystickVec.x;
      inputZ += -forwardZ * joystickVec.y + rightZ * joystickVec.x;
    }

    const inputLenSq = inputX * inputX + inputZ * inputZ;

    if (inputLenSq > 0.001) {
      const invLen = 1 / Math.sqrt(inputLenSq);
      const dirX = inputX * invLen;
      const dirZ = inputZ * invLen;

      const deltaX = dirX * moveSpeed * delta;
      const deltaZ = dirZ * moveSpeed * delta;

      const targetX = playerCoords.position[0] + deltaX;
      const targetZ = playerCoords.position[2] + deltaZ;

      // Solve collision and wall slide
      const resolved = resolveCapsuleMovement(
        playerCoords.position,
        targetX,
        targetZ,
        0.28 // capsule radius
      );

      playerCoords.position[0] = resolved.x;
      playerCoords.position[2] = resolved.z;
      playerCoords.rotationY = yaw.current;
      playerCoords.isMoving = true;

      // Head bobbing (subtle, disabled if reduceMotion is on)
      if (!settings.reduceMotion) {
        headBobTimer.current += delta * (shift ? 14 : 9);
      }

      // Anti-stuck watchdog
      const dX = resolved.x - lastRecordedPos.current[0];
      const dZ = resolved.z - lastRecordedPos.current[1];
      if (dX * dX + dZ * dZ < 0.0001) {
        stuckTimer.current += delta;
        if (stuckTimer.current > 2.0) {
          // Push player back to entrance area (-4.0, +3.5) if stuck for 2 seconds
          playerCoords.position[0] = -4.0;
          playerCoords.position[2] = 3.5;
          stuckTimer.current = 0;
        }
      } else {
        stuckTimer.current = 0;
        lastRecordedPos.current = [resolved.x, resolved.z];
      }
    } else {
      playerCoords.isMoving = false;
      stuckTimer.current = 0;
      headBobTimer.current = 0;
    }

    // Compute head-bob offset
    let bobY = 0;
    if (playerCoords.isMoving && !settings.reduceMotion) {
      bobY = Math.sin(headBobTimer.current) * (shift ? 0.035 : 0.02);
    }

    // Apply orientation and position to Camera
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    camera.position.set(
      playerCoords.position[0],
      playerCoords.position[1] + currentEyeHeight.current + bobY,
      playerCoords.position[2]
    );
  });

  return null;
};
