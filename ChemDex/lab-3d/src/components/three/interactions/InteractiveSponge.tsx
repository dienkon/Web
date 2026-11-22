import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { LAB_GEOMETRY } from '../../../core/labGeometry';

const SPONGE_BASE = { width: 0.52, height: 0.16, depth: 0.32, centerY: 0.04 };
const SPONGE_BOTTOM = SPONGE_BASE.centerY - SPONGE_BASE.height / 2;
const SPONGE_REST_Y = LAB_GEOMETRY.tableTop_scene - SPONGE_BOTTOM;

export const InteractiveSponge = React.memo(function InteractiveSponge({ preview = false }: { preview?: boolean } = {}) {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const wipeSpillAt = useAppStore(state => state.wipeSpillAt);
  const { camera, raycaster, gl } = useThree();

  const groupRef = useRef<THREE.Group>(null);
  const [isWiping, setIsWiping] = useState(false);
  const targetWorldPos = useRef(new THREE.Vector3(0, SPONGE_REST_Y, 1.2));
  const wipeAngle = useRef(0);
  const lastWipeTime = useRef(-Infinity);
  const wipingPointer = useRef<number | null>(null);

  const tablePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAB_GEOMETRY.tableTop_scene), []);
  const intersectPoint = useMemo(() => new THREE.Vector3(), []);

  // Track pointer across workbench
  React.useEffect(() => {
    if (preview) return;
    const canvas = gl.domElement;
    if (!canvas) return;

    const targetPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0) || e.clientX < rect.left || e.clientX > rect.right
        || e.clientY < rect.top || e.clientY > rect.bottom) return false;
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      if (!raycaster.ray.intersectPlane(tablePlane, intersectPoint)
        || Math.abs(intersectPoint.x) > LAB_GEOMETRY.tableHalfWidth_scene
        || Math.abs(intersectPoint.z) > LAB_GEOMETRY.tableHalfDepth_scene) return false;
      // The same bounded center drives the visible sponge and its collector.
      targetWorldPos.current.set(
        THREE.MathUtils.clamp(intersectPoint.x, -LAB_GEOMETRY.tableHalfWidth_scene + 0.265, LAB_GEOMETRY.tableHalfWidth_scene - 0.265),
        SPONGE_REST_Y,
        THREE.MathUtils.clamp(intersectPoint.z, -LAB_GEOMETRY.tableHalfDepth_scene + 0.165, LAB_GEOMETRY.tableHalfDepth_scene - 0.165)
      );
      return true;
    };
    const collect = (e: PointerEvent) => {
      lastWipeTime.current = e.timeStamp;
      wipeSpillAt([targetWorldPos.current.x, LAB_GEOMETRY.tableTop_scene, targetWorldPos.current.z], 0.75);
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (activeTool !== 'sponge' || e.isPrimary === false) return;
      const overTable = targetPoint(e);
      if (!overTable || e.buttons !== 1 || wipingPointer.current !== e.pointerId) {
        setIsWiping(false); return;
      }
      setIsWiping(true);
      if (e.timeStamp - lastWipeTime.current >= 120) collect(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (activeTool !== 'sponge' || e.button !== 0 || e.isPrimary === false || !targetPoint(e)) return;
      wipingPointer.current = e.pointerId;
      setIsWiping(true);
      collect(e);
    };

    const handlePointerUp = () => {
      wipingPointer.current = null;
      setIsWiping(false);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    return () => {
      wipingPointer.current = null;
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [preview, activeTool, camera, gl, raycaster, tablePlane, intersectPoint, wipeSpillAt]);

  useFrame((state, delta) => {
    if (preview) return;
    if (!groupRef.current) return;

    // Smoothly track target position on workbench
    groupRef.current.position.lerp(targetWorldPos.current, 1 - Math.exp(-delta * 14));

    // Dynamic wiping wiggle animation
    if (isWiping) {
      wipeAngle.current += delta * 18.0;
      groupRef.current.rotation.y = Math.sin(wipeAngle.current) * 0.28;
      groupRef.current.rotation.z = Math.cos(wipeAngle.current * 0.5) * 0.08;
    } else {
      const settle = 1 - Math.exp(-delta * 6);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0.15, settle);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, settle);
    }
    const roll = groupRef.current.rotation.z;
    groupRef.current.position.y = LAB_GEOMETRY.tableTop_scene - SPONGE_BOTTOM * Math.cos(roll)
      + SPONGE_BASE.width / 2 * Math.abs(Math.sin(roll));
  });

  if (!preview && activeTool !== 'sponge') return null;

  return (
    <group name="interactive-sponge" ref={groupRef} position={[0, preview ? -1.08 : SPONGE_REST_Y, 1.2]} renderOrder={10}>
      {/* Yellow Cellulose Sponge Base */}
      <mesh name="sponge-cellulose-base" castShadow position={[0, SPONGE_BASE.centerY, 0]}>
        <boxGeometry args={[SPONGE_BASE.width, SPONGE_BASE.height, SPONGE_BASE.depth]} />
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SPONGE_BOTTOM + 0.003, 0]}>
          <ringGeometry args={[0.25, 0.38, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
});
