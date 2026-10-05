import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { vfxBus } from '../../vfx/bus';

export interface CameraControlsProps {
  /** Enable or disable orbit rotation */
  enableRotate?: boolean;
  /** Enable or disable zoom (dolly) */
  enableZoom?: boolean;
  /** Enable or disable camera panning */
  enablePan?: boolean;
  /** Damping factor for smooth camera motion */
  dampingFactor?: number;
  /** Distance limits */
  minDistance?: number;
  maxDistance?: number;
  /** Polar angle limits (vertical rotation) */
  minPolarAngle?: number;
  maxPolarAngle?: number;
  /** Azimuth angle limits (horizontal rotation) */
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
}

/**
 * CameraControls Component for React Three Fiber
 * Provides rotation (orbit), zoom, and pan capabilities with smooth damping,
 * responsive bounds, and animated preset camera switching (Perspective, Top, Front, Side, Focus).
 */
export const CameraControls = React.memo(function CameraControls({
  enableRotate = true,
  enableZoom = true,
  enablePan = true,
  dampingFactor = 0.05,
  minDistance = 3.5,
  maxDistance = 25,
  minPolarAngle = 0.08,
  maxPolarAngle = Math.PI / 2 - 0.04,
  minAzimuthAngle,
  maxAzimuthAngle,
}: CameraControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const cameraPreset = useAppStore(state => state.cameraPreset);
  const cameraFocusPosition = useAppStore(state => state.cameraFocusPosition);
  const isDraggingVessel = useAppStore(state => !!state.draggingVesselId);
  const cameraPanMode = useAppStore(state => state.cameraPanMode);
  const isScreenLocked = useAppStore(state => state.isScreenLocked);
  const isPourTiltLocked = useAppStore(state => state.isPourTiltLocked);

  const { gl } = useThree();

  useEffect(() => {
    if (isScreenLocked) {
      gl.domElement.style.cursor = 'default';
    } else if (cameraPanMode) {
      gl.domElement.style.cursor = 'grab';
    } else {
      gl.domElement.style.cursor = 'default';
    }
  }, [isScreenLocked, cameraPanMode, gl]);

  // Target vectors for animated lerp transitions
  const targetCamPos = useRef(new THREE.Vector3(0, 5, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef(false);
  const trauma = useRef(0);

  useEffect(() => {
    const unsubExplosion = vfxBus.on('explosion', (e) => {
      trauma.current = Math.min(1.0, trauma.current + (e.intensity || 0.85));
    });
    const unsubBurst = vfxBus.on('particle:burst', (e) => {
      if (e.count >= 8) {
        trauma.current = Math.min(1.0, trauma.current + 0.35);
      }
    });

    return () => {
      unsubExplosion();
      unsubBurst();
    };
  }, []);

  // Synchronize target camera coordinates with store camera preset or focus position
  useEffect(() => {
    isTransitioning.current = true;

    if (cameraFocusPosition) {
      targetLookAt.current.set(cameraFocusPosition[0], cameraFocusPosition[1] + 0.4, cameraFocusPosition[2]);
      targetCamPos.current.set(
        cameraFocusPosition[0],
        cameraFocusPosition[1] + 3.0,
        cameraFocusPosition[2] + 5.5
      );
      return;
    }

    switch (cameraPreset) {
      case 'top':
        // Top-down overhead view overlooking entire workbench
        targetCamPos.current.set(0, 15, 0.05);
        targetLookAt.current.set(0, 0, 0);
        break;
      case 'front':
        // Eye-level frontal view facing instruments directly
        targetCamPos.current.set(0, 1.6, 11);
        targetLookAt.current.set(0, 0.2, 0);
        break;
      case 'side':
        // Lateral profile view
        targetCamPos.current.set(12, 2.5, 0);
        targetLookAt.current.set(0, 0.2, 0);
        break;
      case 'perspective':
      default:
        // Default angled 3D laboratory perspective
        targetCamPos.current.set(0, 5, 12);
        targetLookAt.current.set(0, 0, 0);
        break;
    }
  }, [cameraPreset, cameraFocusPosition]);

  // Smooth frame interpolation when transitioning between presets
  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    const posDistSq = camera.position.distanceToSquared(targetCamPos.current);
    const targetDistSq = controlsRef.current
      ? controlsRef.current.target.distanceToSquared(targetLookAt.current)
      : 0;

    if (posDistSq > 0.0001 || targetDistSq > 0.0001) {
      const step = Math.min(delta * 4.5, 0.25);
      camera.position.lerp(targetCamPos.current, step);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, step);
        controlsRef.current.update();
      }
    } else {
      isTransitioning.current = false;
    }

    // Trauma-based camera shake with quadratic decay (respects prefers-reduced-motion)
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (trauma.current > 0.001) {
      if (!prefersReducedMotion) {
        const shake = trauma.current * trauma.current;
        const time = performance.now() * 0.001;
        const shakeX = (Math.sin(time * 38.0) * 0.16 + (Math.random() - 0.5) * 0.06) * shake;
        const shakeY = (Math.cos(time * 32.0) * 0.14 + (Math.random() - 0.5) * 0.06) * shake;
        const shakeRotZ = Math.sin(time * 26.0) * 0.035 * shake;

        camera.position.x += shakeX;
        camera.position.y += shakeY;
        camera.rotation.z += shakeRotZ;
      }

      trauma.current = Math.max(0, trauma.current - delta * 1.8);
    }
  });

  // Temporarily disable controls while actively dragging a vessel in 3D space, when screen is locked, or when pour tilt is locked
  const isCameraFrozen = isDraggingVessel || isScreenLocked || isPourTiltLocked;
  const controlsActive = !isCameraFrozen;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={controlsActive}
      enableRotate={enableRotate && !isCameraFrozen}
      enableZoom={enableZoom && !isCameraFrozen}
      enablePan={enablePan && !isCameraFrozen}
      enableDamping={true}
      dampingFactor={dampingFactor}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
      minAzimuthAngle={minAzimuthAngle}
      maxAzimuthAngle={maxAzimuthAngle}
      mouseButtons={
        cameraPanMode
          ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
          : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
      }
      // Configure pan speed and key controls for intuitive laboratory inspection
      panSpeed={cameraPanMode ? 1.5 : 0.85}
      rotateSpeed={0.8}
      zoomSpeed={1.0}
    />
  );
});

export default CameraControls;
