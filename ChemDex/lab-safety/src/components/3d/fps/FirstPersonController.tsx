import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, playerCoords } from '../../../store/useStore';
import { advancePlayerMotion } from '../../../core/simulation/PlayerMotion';
import { spatialSound } from '../../../audio/SpatialSoundEngine';
import { inputManager } from '../../../systems/input/InputManager';
import { dispatchInteractionInput } from '../../../systems/input/InteractionBus';
import {useReducedLabMotion} from '../../../systems/device/useReducedLabMotion';
import {useCoarsePointer} from '../../../systems/device/useCoarsePointer';

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
  const reduced=useReducedLabMotion(),coarse=useCoarsePointer();
  const cameraEuler=useRef(new THREE.Euler(0,0,0,'YXZ'));

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

  const velocity = useRef({ x: 0, z: 0 });

  // Crouch state & head height lerping (standing = 1.62m, crouched = 1.05m)
  const isCrouched = useRef(false);
  const currentEyeHeight = useRef<number>(1.62);
  const headBobTimer = useRef<number>(0);
  const headBobOffset = useRef(0);

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
      // Acquiring mouse look must preserve a movement key already held down.
      if (locked) inputManager.resetPointers();
      else inputManager.resetAll();
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
      velocity.current.x=0;velocity.current.z=0;
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
      velocity.current.x = 0; velocity.current.z = 0;
      headBobOffset.current = 0;
      return;
    }
    const frameDelta = Math.max(0, Math.min(delta, .1));
    if (view !== 'game' || runState !== 'RUNNING') {
      velocity.current.x = 0; velocity.current.z = 0;
      headBobOffset.current = 0;
      playerCoords.isMoving = false;
      return;
    }

    if (isModalOrQuestActive) {
      playerCoords.isMoving = false;
      velocity.current.x = 0;
      velocity.current.z = 0;
      headBobOffset.current = 0;
      // Keep camera oriented towards current pitch/yaw
      const euler = cameraEuler.current.set(pitch.current,yaw.current,0,'YXZ');
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

    // Speeds: Crouch = 0.9 m/s, Walk = 1.6 m/s, Run = 3.2 m/s
    const targetEyeH = crouch ? 1.05 : 1.62;
    currentEyeHeight.current = THREE.MathUtils.damp(
      currentEyeHeight.current,
      targetEyeH,
      10,frameDelta
    );

    let moveSpeed = 1.6;
    if (crouch) {
      moveSpeed = 0.9;
    } else if (shift) {
      moveSpeed = 3.2;
    }

    const distance = advancePlayerMotion(
      playerCoords.position, velocity.current, move, yaw.current, moveSpeed, frameDelta,
    );
    playerCoords.isMoving = distance > .00001;
    // Drive the stride by actual distance, including analog walking and wall
    // contact. Ease its offset to zero on release instead of snapping the head.
    if (!reduced && playerCoords.isMoving) {
      headBobTimer.current += distance * (shift ? 14 / 3.2 : 9 / 1.6);
    }
    const amplitude = coarse ? (shift ? .015 : .008) : (shift ? .035 : .02);
    const bobTarget = playerCoords.isMoving && !reduced
      ? Math.sin(headBobTimer.current) * amplitude
      : 0;
    headBobOffset.current = THREE.MathUtils.damp(headBobOffset.current, bobTarget, 20, frameDelta);

    // Apply orientation and position to Camera
    const euler = cameraEuler.current.set(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
    playerCoords.rotationY = yaw.current;

    camera.position.set(
      playerCoords.position[0],
      playerCoords.position[1] + currentEyeHeight.current + headBobOffset.current,
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
