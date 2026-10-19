import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { resolveCapsuleMovement, LAB_BOUNDS } from '../../../core/simulation/CollisionSystem';
import { spatialSound } from '../../../audio/SpatialSoundEngine';
import { inputManager } from '../../../systems/input/InputManager';
import { dispatchInteractionInput } from '../../../systems/input/InteractionBus';

const putAwayCurrentItem = () => {
  const store = useStore.getState();
  if (store.showRulesList) {
    store.setShowRulesList(false);
  } else if (store.showSettings) {
    store.setShowSettings(false);
  } else { store.selectTool(null); }
};

const inspectHotbarSlot = (slot: number) => {
  const store = useStore.getState();
  if (slot >= 1 && slot <= 3) store.selectTool((['extinguisher', 'spillKit', 'waste'] as const)[slot - 1]);
};

export const FirstPersonController: React.FC = () => {
  const { camera, gl } = useThree();

  const view = useStore((s) => s.view);
  const cinematic = useStore(s => s.cinematic);
  const isDialogActive = useStore((s) => s.isDialogActive);
  const showRulesList = useStore((s) => s.showRulesList);
  const showSettings = useStore((s) => s.showSettings);
  const showFireExtinguisherQuiz = useStore((s) => s.showFireExtinguisherQuiz);
  const showBandageQuiz = useStore((s) => s.showBandageQuiz);
  const showChemicalSymbolsQuiz = useStore((s) => s.showChemicalSymbolsQuiz);
  const activeRuleDialog = useStore((s) => s.activeRuleDialog);

  const sceneModalCount = useStore(s => s.sceneModalCount);
  const showCharacterCreator = useStore(s => s.showCharacterCreator);
  const isModalOrQuestActive = !!cinematic || sceneModalCount > 0 || showCharacterCreator ||
    isDialogActive ||
    showRulesList ||
    showSettings ||
    showFireExtinguisherQuiz ||
    showBandageQuiz ||
    showChemicalSymbolsQuiz ||
    Boolean(activeRuleDialog);

  const runState = useStore((s) => s.runState);
  const settings = useStore((s) => s.settings);

  // Pitch and Yaw angles
  const yaw = useRef<number>(Math.PI);
  const pitch = useRef<number>(0);
  const isLocked = useRef<boolean>(false);

  // Velocity smoothing for zero stutter / butter-smooth movement
  const currentVelX = useRef<number>(0);
  const currentVelZ = useRef<number>(0);

  // Crouch state & head height lerping (standing = 1.62m, crouched = 1.05m)
  const isCrouched = useRef(false);
  const currentEyeHeight = useRef<number>(1.62);
  const headBobTimer = useRef<number>(0);

  // FPS Flashlight (Key F)
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotLightTarget = useRef(new THREE.Object3D());

  // Automatically release pointer lock whenever a quest, quiz, or dialog modal opens!
  useEffect(() => {
    if (isModalOrQuestActive || runState !== 'RUNNING' || view !== 'game') {
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      isLocked.current = false;
      inputManager.resetAll();
      gl.domElement.style.cursor = 'default';
    }
  }, [isModalOrQuestActive, runState, view, gl.domElement]);

  useEffect(() => {
    inputManager.setLookConfig(settings.cameraSensitivity, settings.invertY);
  }, [settings.cameraSensitivity, settings.invertY]);

  // Unified pointer lock, mouse drag, and touch look listeners.
  useEffect(() => {
    const canvas = gl.domElement;
    let pressPoint: {x:number;y:number} | null=null;
    let dragged=false;

    const isUiTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('[data-ui]'));

    const inputIsBlocked = () => {
      const state = useStore.getState();
      return !!state.cinematic || state.view !== 'game'
        || state.runState !== 'RUNNING'
        || state.isDialogActive
        || state.showRulesList
        || state.showSettings
        || state.showFireExtinguisherQuiz
        || state.showBandageQuiz
        || state.showChemicalSymbolsQuiz
        || state.sceneModalCount > 0 || state.showCharacterCreator || Boolean(state.activeRuleDialog);
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      isLocked.current = locked;
      canvas.style.cursor = locked ? 'none' : 'default';
      inputManager.resetAll();
    };

    const onClick = (event: PointerEvent) => {
      if (!dragged && (event.pointerType === 'mouse' || !('pointerType' in event)) && !isUiTarget(event.target) && !inputIsBlocked()) {
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

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || inputIsBlocked() || isUiTarget(event.target)) return;
      pressPoint={x:event.clientX,y:event.clientY};dragged=false;
      if (inputManager.beginLook(event.pointerId, event.clientX, event.clientY)) {
        if (document.pointerLockElement !== canvas) {
          try { canvas.setPointerCapture(event.pointerId); } catch { /* Window listeners still end a mouse drag if capture is unavailable. */ }
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (inputIsBlocked()) return;
      if(pressPoint&&Math.hypot(event.clientX-pressPoint.x,event.clientY-pressPoint.y)>6)dragged=true;
      if (event.pointerType === 'mouse' && isLocked.current) {
        inputManager.addMouseLook(event.movementX, event.movementY);
        return;
      }
      inputManager.updateLook(event.pointerId, event.clientX, event.clientY);
    };

    const onPointerEnd = (event: PointerEvent) => {
      pressPoint=null;
      inputManager.endLook(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', onClick as EventListener);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvas.removeEventListener('click', onClick as EventListener);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      inputManager.resetPointers();
    };
  }, [gl.domElement]);

  // Keyboard and lifecycle listeners use current store state at event time.
  useEffect(() => {
    const inputIsBlocked = () => {
      const state = useStore.getState();
      return !!state.cinematic || state.view !== 'game'
        || state.runState !== 'RUNNING'
        || state.isDialogActive
        || state.showRulesList
        || state.showSettings
        || state.showFireExtinguisherQuiz
        || state.showBandageQuiz
        || state.showChemicalSymbolsQuiz
        || state.sceneModalCount > 0 || state.showCharacterCreator || Boolean(state.activeRuleDialog);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-ui], [role="dialog"], input, textarea, button, select')) return;
      if (event.code === 'KeyE' || event.code === 'Space' || event.code === 'Enter') {
        if (event.repeat || useStore.getState().view !== 'game') return;
        event.preventDefault();
        dispatchInteractionInput();
        return;
      }
      if (inputIsBlocked()) {
        inputManager.resetAll();
        return;
      }
      if (event.code === 'Tab') {
        event.preventDefault();
        const store = useStore.getState();
        store.setShowRulesList(!store.showRulesList);
        return;
      }
      inputManager.handleKeyDown(event.code, event.repeat);
    };

    const handleKeyUp = (event: KeyboardEvent) => inputManager.handleKeyUp(event.code);
    const resetInput = () => {
      inputManager.resetAll();
      currentVelX.current=0;currentVelZ.current=0;
      if(document.pointerLockElement===gl.domElement)document.exitPointerLock();
    };
    const handleVisibility = () => {
      if (document.hidden) resetInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetInput);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetInput);
      document.removeEventListener('visibilitychange', handleVisibility);
      inputManager.resetAll();
    };
  }, [gl.domElement]);

  useEffect(() => {
    inputManager.resetAll();
  }, [view, isModalOrQuestActive]);

  // Frame update
  useFrame((_, delta) => {
    if (useStore.getState().cinematic) {
      playerCoords.isMoving = false;
      currentVelX.current = 0; currentVelZ.current = 0;
      return;
    }
    const frameDelta = Math.min(delta, 1 / 20);
    if (view !== 'game' || runState !== 'RUNNING') {
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

    const look = inputManager.consumeLookDelta();
    yaw.current -= look.x;
    pitch.current -= look.y;
    const maxPitch = (80 * Math.PI) / 180;
    pitch.current = Math.max(-maxPitch, Math.min(maxPitch, pitch.current));

    if (inputManager.consumeButton('crouchToggle')) isCrouched.current = !isCrouched.current;
    if (inputManager.consumeButton('flashlight')) useStore.getState().toggleFlashlight();
    if (inputManager.consumeButton('putAway')) putAwayCurrentItem();
    const hotbarSlot = inputManager.consumeHotbar();
    if (hotbarSlot !== null) inspectHotbarSlot(hotbarSlot);

    const move = inputManager.move;
    const shift = inputManager.buttons.run;
    const crouch = isCrouched.current;
    const hasInput = Math.abs(move.x) > 0.001 || Math.abs(move.y) > 0.001;

    // Speeds: Crouch = 0.9 m/s, Walk = 1.6 m/s, Run = 3.2 m/s
    const targetEyeH = crouch ? 1.05 : 1.62;
    currentEyeHeight.current = THREE.MathUtils.lerp(
      currentEyeHeight.current,
      targetEyeH,
      Math.min(1, frameDelta * 10)
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

    inputX = -forwardX * move.y + rightX * move.x;
    inputZ = -forwardZ * move.y + rightZ * move.x;

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
      Math.min(1, frameDelta * dampSpeed)
    );
    currentVelZ.current = THREE.MathUtils.lerp(
      currentVelZ.current,
      targetVelZ,
      Math.min(1, frameDelta * dampSpeed)
    );

    const currentSpeedSq =
      currentVelX.current * currentVelX.current + currentVelZ.current * currentVelZ.current;

    if (currentSpeedSq > 0.0001) {
      const deltaX = currentVelX.current * frameDelta;
      const deltaZ = currentVelZ.current * frameDelta;

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

      const actuallyMoved = Math.hypot(resolved.x - playerCoords.position[0], resolved.z - playerCoords.position[2]) > 0.0001;
      playerCoords.position[0] = resolved.x;
      playerCoords.position[2] = resolved.z;
      playerCoords.rotationY = yaw.current;
      playerCoords.isMoving = actuallyMoved;

      // Head bobbing (disabled if reduceMotion is on)
      if (!settings.reduceMotion) {
        headBobTimer.current += frameDelta * (shift ? 14 : 9);
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
    playerCoords.rotationY = yaw.current;

    camera.position.set(
      playerCoords.position[0],
      playerCoords.position[1] + currentEyeHeight.current + bobY,
      playerCoords.position[2]
    );

    // Update 3D Audio Listener and Footsteps
    spatialSound.updateListener(
      playerCoords.position[0],
      playerCoords.position[1],
      playerCoords.position[2],
      -Math.sin(yaw.current),
      -Math.cos(yaw.current)
    );
    spatialSound.tickFootsteps(playerCoords.isMoving, Boolean(shift));

    // Update FPS Flashlight
    if (spotLightRef.current) {
      spotLightRef.current.position.copy(camera.position);
      const lookDirX = -Math.sin(yaw.current) * Math.cos(pitch.current);
      const lookDirY = Math.sin(pitch.current);
      const lookDirZ = -Math.cos(yaw.current) * Math.cos(pitch.current);
      spotLightTarget.current.position.set(
        camera.position.x + lookDirX * 10,
        camera.position.y + lookDirY * 10,
        camera.position.z + lookDirZ * 10
      );
      spotLightTarget.current.updateMatrixWorld();
    }
  });

  const isFlashlightOn = useStore((s) => s.isFlashlightOn);

  return (
    <>
      <primitive object={spotLightTarget.current} />
      <spotLight
        ref={spotLightRef}
        target={spotLightTarget.current}
        intensity={isFlashlightOn ? 3.2 : 0}
        angle={0.52}
        penumbra={0.6}
        color="#F8FAFC"
        distance={22}
      />
    </>
  );
};
