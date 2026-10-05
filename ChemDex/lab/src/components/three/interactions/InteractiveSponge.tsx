import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';

export const InteractiveSponge = React.memo(function InteractiveSponge() {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const wipeSpillAt = useAppStore(state => state.wipeSpillAt);
  const spills = useAppStore(state => state.spills);
  const { camera, raycaster, gl } = useThree();

  const groupRef = useRef<THREE.Group>(null);
  const [isWiping, setIsWiping] = useState(false);
  const targetWorldPos = useRef(new THREE.Vector3(0, -1.08, 1.2));
  const wipeAngle = useRef(0);
  const lastWipeTime = useRef(0);

  // Table plane at Y = -1.155 for accurate mouse raycasting
  const tablePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.155), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  // Track pointer across workbench
  React.useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (activeTool !== 'sponge') return;
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(tablePlane, intersectPoint)) {
        targetWorldPos.current.set(
          Math.max(-14, Math.min(14, intersectPoint.x)),
          -1.08,
          Math.max(-5, Math.min(5, intersectPoint.z))
        );

        if (e.buttons === 1) {
          setIsWiping(true);
          const now = Date.now();
          if (now - lastWipeTime.current > 120) {
            lastWipeTime.current = now;
            wipeSpillAt([intersectPoint.x, -1.155, intersectPoint.z], 0.7);
          }
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (activeTool !== 'sponge') return;
      setIsWiping(true);
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (raycaster.ray.intersectPlane(tablePlane, intersectPoint)) {
        wipeSpillAt([intersectPoint.x, -1.155, intersectPoint.z], 0.75);
      }
    };

    const handlePointerUp = () => {
      setIsWiping(false);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeTool, camera, gl, raycaster, tablePlane, intersectPoint, wipeSpillAt]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smoothly track target position on workbench
    groupRef.current.position.lerp(targetWorldPos.current, delta * 14.0);

    // Dynamic wiping wiggle animation
    if (isWiping) {
      wipeAngle.current += delta * 18.0;
      groupRef.current.rotation.y = Math.sin(wipeAngle.current) * 0.28;
      groupRef.current.rotation.z = Math.cos(wipeAngle.current * 0.5) * 0.08;
      groupRef.current.position.y = -1.10 + Math.abs(Math.sin(wipeAngle.current)) * 0.02;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0.15, delta * 6.0);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 6.0);
    }
  });

  if (activeTool !== 'sponge') return null;

  return (
    <group ref={groupRef} position={[0, -1.08, 1.2]} renderOrder={10}>
      {/* Yellow Cellulose Sponge Base */}
      <mesh castShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[0.52, 0.16, 0.32]} />
        <meshStandardMaterial
          color="#facc15"
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>

      {/* Dark Green Abrasive Scrub Pad on top */}
      <mesh castShadow position={[0, 0.13, 0]}>
        <boxGeometry args={[0.53, 0.04, 0.33]} />
        <meshStandardMaterial
          color="#065f46"
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Grip Groove Indentations for ergonomic realism */}
      <mesh position={[-0.24, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.14, 0.22]} />
        <meshStandardMaterial color="#eab308" roughness={0.8} />
      </mesh>
      <mesh position={[0.24, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.14, 0.22]} />
        <meshStandardMaterial color="#eab308" roughness={0.8} />
      </mesh>

      {/* Gentle Cleaning Bubble Ring while wiping */}
      {isWiping && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.25, 0.38, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
});
