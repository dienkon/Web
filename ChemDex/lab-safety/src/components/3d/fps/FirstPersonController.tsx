import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { resolveCapsuleMovement, LAB_BOUNDS } from '../../../core/simulation/CollisionSystem';

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
  const showRulesList = useStore((s) => s.showRulesList);
  const showSettings = useStore((s) => s.showSettings);
  const showFireExtinguisherQuiz = useStore((s) => s.showFireExtinguisherQuiz);
  const showBandageQuiz = useStore((s) => s.showBandageQuiz);
  const showChemicalSymbolsQuiz = useStore((s) => s.showChemicalSymbolsQuiz);
  const activeRuleDialog = useStore((s) => s.activeRuleDialog);

  const isModalOrQuestActive =
    isDialogActive ||
    showRulesList ||
    showSettings ||
    showFireExtinguisherQuiz ||
    showBandageQuiz ||
    showChemicalSymbolsQuiz ||
    Boolean(activeRuleDialog);

  const runState = useStore((s) => s.runState);
  const joystickVec = useStore((s) => s.joystickVec) || { x: 0, y: 0 };
  const settings = useStore((s) => s.settings);

  // Pitch and Yaw angles
  const yaw = useRef<number>(Math.PI);
  const pitch = useRef<number>(0);
  const isLocked = useRef<boolean>(false);

  // Velocity smoothing for zero stutter / butter-smooth movement
  const currentVelX = useRef<number>(0);
  const currentVelZ = useRef<number>(0);

  // Mouse Drag fallback when pointer lock is not active
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch drag for mobile look
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);

  // Crouch state & head height lerping (standing = 1.62m, crouched = 1.05m)
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

  // Automatically release pointer lock whenever a quest, quiz, or dialog modal opens!
  useEffect(() => {
    if (isModalOrQuestActive) {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      isLocked.current = false;
      isDragging.current = false;
      gl.domElement.style.cursor = 'default';
    }
  }, [isModalOrQuestActive, gl.domElement]);

  // Pointer lock & drag event listeners
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      isLocked.current = locked;
      canvas.style.cursor = locked ? 'none' : 'default';
    };

    const onClick = () => {
      if (view === 'game' && !isModalOrQuestActive) {
        if (!isLocked.current && canvas.requestPointerLock) {
          try {
            const p = canvas.requestPointerLock();
            if (p && typeof (p as any).catch === 'function') {
              (p as any).catch(() => {});
            }
          } catch {}
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (view !== 'game' || isModalOrQuestActive) return;
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (view !== 'game' || isModalOrQuestActive) return;

      const sensitivity = (settings.cameraSensitivity || 1.0) * 0.0022;

      if (isLocked.current) {
        // Pointer lock mode
        yaw.current -= e.movementX * sensitivity;
        pitch.current -= e.movementY * sensitivity;
      } else if (isDragging.current) {
        // Drag to look fallback
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        yaw.current -= dx * sensitivity;
        pitch.current -= dy * sensitivity;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }

      // Clamp pitch to +/- 85 degrees
      const maxPitch = (85 * Math.PI) / 180;
      pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current));
    };

    // Touch controls for mobile look
    const onTouchStart = (e: TouchEvent) => {
      if (view !== 'game' || isModalOrQuestActive || e.touches.length === 0) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        // If touch starts on the right half of screen, use it for camera rotation
        if (touch.clientX > window.innerWidth * 0.35) {
          lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (view !== 'game' || isModalOrQuestActive || !lastTouchPos.current || e.touches.length === 0) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.clientX > window.innerWidth * 0.3) {
          const dx = touch.clientX - lastTouchPos.current.x;
          const dy = touch.clientY - lastTouchPos.current.y;
          const sensitivity = (settings.cameraSensitivity || 1.0) * 0.0035;

          yaw.current -= dx * sensitivity;
          pitch.current -= dy * sensitivity;

          const maxPitch = (85 * Math.PI) / 180;
          pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current));

          lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const onTouchEnd = () => {
      lastTouchPos.current = null;
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);

      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [gl, view, isModalOrQuestActive, settings.cameraSensitivity]);

  // Keyboard listeners (WASD + Arrow Keys + Shift + C/Ctrl)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'game' || isModalOrQuestActive) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.w = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.s = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.a = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.d = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = true;
          break;
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight':
          keys.current.crouch = !keys.current.crouch; // Toggle crouch
          break;
        case 'Tab':
          e.preventDefault();
          useStore.getState().setShowRulesList(!useStore.getState().showRulesList);
          break;
        case 'Backspace':
        case 'KeyQ': {
          const store = useStore.getState();
          if (store.showRulesList) {
            store.setShowRulesList(false);
          } else if (store.showSettings) {
            store.setShowSettings(false);
          } else if (store.player.inventory.hasSweeper || store.player.inventory.isHoldingTrash) {
            // Put down / unequip held item
            const newPlayer = JSON.parse(JSON.stringify(store.player));
            newPlayer.inventory.hasSweeper = false;
            newPlayer.inventory.isHoldingTrash = false;
            useStore.setState({ player: newPlayer });
          }
          break;
        }
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6': {
          // Select inventory item or quick inspect
          const slot = parseInt(e.code.replace('Digit', ''), 10);
          const store = useStore.getState();
          if (slot === 1 && store.player.equipment.hasGoggles) {
            store.startDialog(['Kính bảo hộ: Đang được trang bị đúng quy cách, chống văng bắn hóa chất vào mắt.']);
          } else if (slot === 2 && store.player.equipment.hasLabCoat) {
            store.startDialog(['Áo Blouse: Vải cotton chịu nhiệt đạt chuẩn, bảo vệ cơ thể khỏi tác nhân ăn mòn.']);
          } else if (slot === 3 && store.player.equipment.hasGloves) {
            store.startDialog(['Găng tay Nitrile: Đã đeo ôm sát tay, kháng axit và dung môi hữu cơ.']);
          } else if (slot === 4 && store.player.inventory.hasSweeper) {
            store.startDialog(['Bộ dụng cụ dọn tràn Spill Kit: Bột trung hòa NaHCO3 và xẻng gom chất thải.']);
          } else if (slot === 5 && store.player.inventory.hasFireExtinguisher) {
            store.startDialog(['Bình chữa cháy: Đã rút chốt an toàn, sẵn sàng bóp cò xịt vào gốc đám cháy.']);
          }
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.w = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.s = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.a = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
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
  }, [view, isDialogActive]);

  // Frame update
  useFrame((_, delta) => {
    if (view !== 'game') {
      playerCoords.isMoving = false;
      return;
    }

    if (isModalOrQuestActive) {
      playerCoords.isMoving = false;
      currentVelX.current = 0;
      currentVelZ.current = 0;
      // Keep camera oriented towards current pitch/yaw
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
    currentEyeHeight.current = THREE.MathUtils.lerp(
      currentEyeHeight.current,
      targetEyeH,
      Math.min(1, delta * 10)
    );

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
      // Joystick movement
      inputX += -forwardX * joystickVec.y + rightX * joystickVec.x;
      inputZ += -forwardZ * joystickVec.y + rightZ * joystickVec.x;
    }

    const inputLenSq = inputX * inputX + inputZ * inputZ;

    // Target velocity in world space
    let targetVelX = 0;
    let targetVelZ = 0;
    if (inputLenSq > 0.001) {
      const invLen = 1 / Math.sqrt(inputLenSq);
      targetVelX = inputX * invLen * moveSpeed;
      targetVelZ = inputZ * invLen * moveSpeed;
    }

    // Damped acceleration & deceleration for silky-smooth response (eliminates all stutter)
    const dampSpeed = hasInput ? 18 : 22;
    currentVelX.current = THREE.MathUtils.lerp(
      currentVelX.current,
      targetVelX,
      Math.min(1, delta * dampSpeed)
    );
    currentVelZ.current = THREE.MathUtils.lerp(
      currentVelZ.current,
      targetVelZ,
      Math.min(1, delta * dampSpeed)
    );

    const currentSpeedSq =
      currentVelX.current * currentVelX.current + currentVelZ.current * currentVelZ.current;

    if (currentSpeedSq > 0.0001) {
      const deltaX = currentVelX.current * delta;
      const deltaZ = currentVelZ.current * delta;

      const targetX = playerCoords.position[0] + deltaX;
      const targetZ = playerCoords.position[2] + deltaZ;

      // Solve collision and smooth wall slide
      const resolved = resolveCapsuleMovement(
        playerCoords.position,
        targetX,
        targetZ,
        0.28 // Capsule radius
      );

      // Damp velocity component if stopped against obstacle to avoid stick/jerk
      if (Math.abs(resolved.x - targetX) > 0.0001) {
        currentVelX.current = 0;
      }
      if (Math.abs(resolved.z - targetZ) > 0.0001) {
        currentVelZ.current = 0;
      }

      playerCoords.position[0] = resolved.x;
      playerCoords.position[2] = resolved.z;
      playerCoords.rotationY = yaw.current;
      playerCoords.isMoving = true;

      // Head bobbing (disabled if reduceMotion is on)
      if (!settings.reduceMotion) {
        headBobTimer.current += delta * (shift ? 14 : 9);
      }
    } else {
      playerCoords.isMoving = false;
      headBobTimer.current = 0;
    }

    // Clamp coordinates within room boundary safeguards
    playerCoords.position[0] = Math.max(
      LAB_BOUNDS.minX + 0.28,
      Math.min(LAB_BOUNDS.maxX - 0.28, playerCoords.position[0])
    );
    playerCoords.position[2] = Math.max(
      LAB_BOUNDS.minZ + 0.28,
      Math.min(LAB_BOUNDS.maxZ - 0.28, playerCoords.position[2])
    );

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
