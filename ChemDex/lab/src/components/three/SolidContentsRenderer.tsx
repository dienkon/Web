import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical } from '../../store/useAppStore';

interface SolidContentsRendererProps {
  vesselId: string;
  radius?: number;
  baseY?: number;
}

// Pseudo-random deterministic hash
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

const EMPTY_DISSOLVING: Record<string, number> = {};

export const SolidContentsRenderer = React.memo(function SolidContentsRenderer({
  vesselId,
  radius = 0.75,
  baseY = -0.95,
}: SolidContentsRendererProps) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[vesselId]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;
  const activeTool = useAppStore(state => state.activeTool);
  const isStirring = activeTool === 'stirring_rod';

  if (!vessel || !vessel.substances || vessel.substances.length === 0) {
    return null;
  }

  // Filter only solid substances present in the vessel
  const solidSubstances = vessel.substances.filter(sub => {
    const chem = getChemical(sub);
    return chem && chem.type === 'solid';
  });

  if (solidSubstances.length === 0) {
    return null;
  }

  return (
    <group name={`solids_${vesselId}`}>
      {solidSubstances.map((sub, idx) => (
        <SolidSubstanceMesh
          key={`${sub}_${idx}`}
          substance={sub}
          vesselRadius={radius}
          baseY={baseY}
          dissolveProgress={dissolving[sub] || 0}
          isStirring={isStirring}
        />
      ))}
    </group>
  );
});

interface SolidSubstanceMeshProps {
  substance: string;
  vesselRadius: number;
  baseY: number;
  dissolveProgress: number;
  isStirring: boolean;
}

const _dummyMat4 = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();

const SolidSubstanceMesh = React.memo(function SolidSubstanceMesh({
  substance,
  vesselRadius,
  baseY,
  dissolveProgress,
  isStirring,
}: SolidSubstanceMeshProps) {
  const chem = getChemical(substance);
  const color = chem.color || '#e2e8f0';
  const category = chem.category;

  const isMetal = category === 'metal' || ['Fe', 'Cu', 'Zn', 'Mg', 'Al', 'Na'].includes(substance);
  const isSaltCrystal = category === 'salt' || ['NaCl', 'CuSO4', 'PbI2'].includes(substance);
  const isPowder = !isMetal && !isSaltCrystal;

  const moundRef = useRef<THREE.Mesh>(null);
  const chunksRef = useRef<THREE.InstancedMesh>(null);

  const count = isMetal ? 18 : (isSaltCrystal ? 24 : 32);
  const effectiveRadius = Math.min(0.85, vesselRadius * 0.78);

  // Generate deterministic chunk positions & orientations
  const chunkData = useMemo(() => {
    const seed = hashString(substance);
    const rng = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: count }).map((_, i) => {
      const angle = rng(i * 7) * Math.PI * 2;
      const dist = Math.sqrt(rng(i * 7 + 1)) * effectiveRadius;
      const yOffset = rng(i * 7 + 2) * (isPowder ? 0.08 : 0.05);

      const baseScale = isMetal 
        ? (0.055 + rng(i * 7 + 3) * 0.04) 
        : (isSaltCrystal ? (0.045 + rng(i * 7 + 3) * 0.035) : (0.03 + rng(i * 7 + 3) * 0.025));

      return {
        x: Math.cos(angle) * dist,
        y: yOffset,
        z: Math.sin(angle) * dist,
        rotX: rng(i * 7 + 4) * Math.PI,
        rotY: rng(i * 7 + 5) * Math.PI,
        rotZ: rng(i * 7 + 6) * Math.PI,
        scale: baseScale,
      };
    });
  }, [substance, count, effectiveRadius, isMetal, isSaltCrystal, isPowder]);

  const currentScale = Math.max(0, 1.0 - dissolveProgress);

  useFrame((state) => {
    if (currentScale <= 0.001) return;

    // 1. Animate central powder mound scale if powder
    if (moundRef.current && isPowder) {
      const moundHeight = 0.14 * currentScale;
      const moundRad = effectiveRadius * 0.85 * Math.sqrt(currentScale);
      moundRef.current.scale.set(moundRad, moundHeight, moundRad);
      moundRef.current.position.set(0, baseY + moundHeight * 0.45, 0);
    }

    // 2. Animate chunks/granules instanced mesh
    if (chunksRef.current) {
      const stirRot = isStirring ? state.clock.elapsedTime * 3.5 : 0;
      const mesh = chunksRef.current;

      for (let i = 0; i < count; i++) {
        const c = chunkData[i];
        const s = c.scale * currentScale;

        const px = Math.cos(stirRot) * c.x - Math.sin(stirRot) * c.z;
        const pz = Math.sin(stirRot) * c.x + Math.cos(stirRot) * c.z;
        const py = baseY + c.y + (isPowder ? 0.02 : 0.03);

        _dummyPos.set(px, py, pz);
        _dummyEuler.set(c.rotX, c.rotY + stirRot, c.rotZ);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.set(s, s, s);

        _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMat4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (currentScale <= 0.001) return null;

  return (
    <group>
      {/* A. Conical Powder Mound (Only for fine powders e.g. CaCO3, MnO2, Cu(OH)2) */}
      {isPowder && (
        <mesh ref={moundRef} position={[0, baseY + 0.07, 0]} renderOrder={3}>
          <coneGeometry args={[1.0, 1.0, 24]} />
          <meshStandardMaterial
            color={color}
            roughness={0.94}
            metalness={0.04}
            flatShading={false}
          />
        </mesh>
      )}

      {/* B. Discrete Solid Chunks / Crystals / Metal Pellets */}
      <instancedMesh
        ref={chunksRef}
        args={[undefined, undefined, count]}
        renderOrder={3}
      >
        {isMetal ? (
          // Metallic irregular prism chunks
          <cylinderGeometry args={[0.5, 0.7, 0.8, 6]} />
        ) : isSaltCrystal ? (
          // Crystalline cubes or rhombic facets
          substance === 'NaCl' ? <boxGeometry args={[1, 1, 1]} /> : <octahedronGeometry args={[0.8, 0]} />
        ) : (
          // Powder granules
          <dodecahedronGeometry args={[0.6, 0]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={isMetal ? 0.28 : (isSaltCrystal ? 0.42 : 0.92)}
          metalness={isMetal ? 0.88 : (isSaltCrystal ? 0.18 : 0.05)}
        />
      </instancedMesh>
    </group>
  );
});
