import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getSolidMorphology } from '../../../store/useAppStore';
import { labSound } from '../../../utils/audio';

const stainlessSteelMaterial = new THREE.MeshStandardMaterial({
  color: '#e2e8f0',
  roughness: 0.22,
  metalness: 0.85,
});

const gripMaterial = new THREE.MeshStandardMaterial({
  color: '#94a3b8',
  roughness: 0.45,
  metalness: 0.7,
});

let grainCounter = 0;

interface InteractiveSpatulaProps {
  position?: [number, number, number];
}

export const InteractiveSpatula = React.memo(function InteractiveSpatula({
  position = [-3.8, 0.4, 2.0],
}: InteractiveSpatulaProps) {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);
  const mixSubstances = useAppStore(state => state.mixSubstances);
  const spatulaState = useAppStore(state => state.spatulaState);
  const setSpatulaScoop = useAppStore(state => state.setSpatulaScoop);

  const groupRef = useRef<THREE.Group>(null);
  const targetVessel = selectedVesselId ? vessels[selectedVesselId] : null;
  const isActive = activeTool === 'spatula';

  const [tiltAngle, setTiltAngle] = useState(0);
  const [isDumping, setIsDumping] = useState(false);
  const [fallingGrains, setFallingGrains] = useState<Array<{ x: number; y: number; z: number; vy: number; key: number }>>([]);

  // Target world position: hovering slightly above selected vessel or resting in rack
  const targetPos = useMemo(() => {
    if (isActive && targetVessel) {
      return new THREE.Vector3(
        targetVessel.position[0] - 0.2,
        targetVessel.position[1] + 1.45,
        targetVessel.position[2] + 0.1
      );
    }
    return new THREE.Vector3(...position);
  }, [isActive, targetVessel, position]);

  // Frame animation: smooth position lerp, tilt animation, and falling grains
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    groupRef.current.position.lerp(targetPos, delta * 8.0);

    // Tilt animation when dumping solid
    if (isDumping) {
      setTiltAngle(prev => Math.min(1.1, prev + delta * 5.0));
    } else {
      setTiltAngle(prev => Math.max(0, prev - delta * 4.0));
    }

    const currentRotationZ = isActive ? (isDumping ? -0.85 : -0.2) : 0.12;
    const currentRotationX = isActive ? (isDumping ? 0.35 : 0.0) : 0.08;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, currentRotationZ, delta * 10.0);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, currentRotationX, delta * 10.0);

    // Animate falling grains during dump
    if (fallingGrains.length > 0) {
      setFallingGrains(prev =>
        prev
          .map(g => ({
            ...g,
            y: g.y - g.vy * delta,
            vy: g.vy + 9.8 * delta,
          }))
          .filter(g => g.y > -0.8)
      );
    }
  });

  // Handle action: either dump into target vessel or scoop default reagent if empty
  const handleSpatulaAction = (e: any) => {
    e.stopPropagation();

    if (spatulaState.chemical && targetVessel) {
      // Dump solid into vessel
      setIsDumping(true);
      const scoopedChem = spatulaState.chemical;
      const morph = getSolidMorphology(scoopedChem);
      const hasWater = targetVessel.volume_ml > 0.05;

      if (morph === 'GRANULES' || morph === 'CHIPS') {
        if (hasWater) {
          labSound.playDroplet();
        } else {
          labSound.playTap();
        }
      } else if (morph === 'RIBBON' || morph === 'TURNINGS' || morph === 'FILINGS') {
        labSound.playTap();
      } else if (morph === 'PELLET') {
        if (hasWater && (scoopedChem === 'Na' || scoopedChem === 'K')) {
          labSound.playDroplet();
          labSound.playSodiumSizzlePop(0.35);
        } else {
          labSound.playTap();
        }
      } else {
        labSound.playPowder();
      }

      // Spawn falling particle shower
      const newGrains = Array.from({ length: 12 }, (_, i) => ({
        x: (Math.random() - 0.5) * 0.12,
        y: 0,
        z: (Math.random() - 0.5) * 0.12,
        vy: 1.2 + Math.random() * 1.5,
        key: ++grainCounter,
      }));
      setFallingGrains(newGrains);

      const scoopedMass = spatulaState.mass_g || 0.5;

      setTimeout(() => {
        mixSubstances(targetVessel.id, scoopedChem, scoopedMass);
        setSpatulaScoop(null);
        setIsDumping(false);
      }, 350);
    } else if (!spatulaState.chemical) {
      // Quick scoop sodium or salt if empty
      labSound.playGlassClink();
      setSpatulaScoop('Na', 0.5, '#cbd5e1');
      useAppStore.getState().touchToolChemical('spatula', 'Na');
    }
  };

  const hasSolid = Boolean(spatulaState.chemical && spatulaState.mass_g > 0);
  const solidColor = spatulaState.color || '#cbd5e1';
  const morphology = getSolidMorphology(spatulaState.chemical || '');

  return (
    <group
      ref={groupRef}
      onClick={handleSpatulaAction}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Resting Stand block when not held */}
      {!isActive && (
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[0.35, 0.4, 0.35]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      )}

      {/* Main Hexagonal/Cylindrical Stainless Steel Handle */}
      <mesh material={stainlessSteelMaterial} position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1.6, 12]} />
      </mesh>

      {/* Knurled Anti-Slip Grip Sleeve in Center */}
      <mesh material={gripMaterial} position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.55, 16]} />
      </mesh>

      {/* Top Hanging Ring / Flat End Blade */}
      <mesh material={stainlessSteelMaterial} position={[0, 1.32, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.012]} />
      </mesh>

      {/* Flattened Tapered Neck Transition */}
      <mesh material={stainlessSteelMaterial} position={[0, -0.38, 0]} castShadow>
        <boxGeometry args={[0.04, 0.22, 0.015]} />
      </mesh>

      {/* Spoon Scoop Blade (Dished curved tip) */}
      <group position={[0, -0.58, 0]} rotation={[0.12, 0, 0]}>
        <mesh material={stainlessSteelMaterial} castShadow receiveShadow>
          <boxGeometry args={[0.075, 0.24, 0.012]} />
        </mesh>
        {/* Slightly curved side lips */}
        <mesh material={stainlessSteelMaterial} position={[-0.038, 0, 0.008]}>
          <boxGeometry args={[0.008, 0.22, 0.016]} />
        </mesh>
        <mesh material={stainlessSteelMaterial} position={[0.038, 0, 0.008]}>
          <boxGeometry args={[0.008, 0.22, 0.016]} />
        </mesh>

        {/* 3D Reagent Heap on Spatula Tip (Matches authentic physical morphology) */}
        {hasSolid && (
          <group position={[0, -0.02, 0.02]}>
            {morphology === 'RIBBON' ? (
              <mesh position={[0, 0.02, 0.01]} rotation={[0.3, 0.2, -0.4]}>
                <torusGeometry args={[0.035, 0.008, 6, 16, Math.PI * 1.5]} />
                <meshStandardMaterial color={solidColor} roughness={0.18} metalness={0.96} />
              </mesh>
            ) : morphology === 'TURNINGS' ? (
              <mesh position={[0, 0.02, 0.01]} rotation={[0.2, 0.4, -0.3]}>
                <torusGeometry args={[0.032, 0.007, 6, 16, Math.PI * 1.8]} />
                <meshStandardMaterial color="#ea580c" roughness={0.22} metalness={0.98} />
              </mesh>
            ) : morphology === 'FILINGS' ? (
              <group position={[0, 0.02, 0.01]}>
                <mesh scale={[1.1, 0.5, 0.9]}>
                  <sphereGeometry args={[0.045, 12, 8]} />
                  <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.92} />
                </mesh>
                <mesh position={[0.01, 0.01, 0]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.04, 6]} />
                  <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.92} />
                </mesh>
              </group>
            ) : morphology === 'GRANULES' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <dodecahedronGeometry args={[0.036, 0]} />
                <meshStandardMaterial color={solidColor} roughness={0.4} metalness={0.88} />
              </mesh>
            ) : morphology === 'CHIPS' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <dodecahedronGeometry args={[0.038, 0]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.82} metalness={0.02} />
              </mesh>
            ) : morphology === 'CUBIC_CRYSTAL' ? (
              <group position={[0, 0.02, 0.01]}>
                <mesh position={[-0.012, 0, 0]}>
                  <boxGeometry args={[0.026, 0.026, 0.026]} />
                  <meshStandardMaterial color={solidColor} roughness={0.2} metalness={0.1} />
                </mesh>
                <mesh position={[0.014, 0.01, 0]}>
                  <boxGeometry args={[0.022, 0.022, 0.022]} />
                  <meshStandardMaterial color={solidColor} roughness={0.2} metalness={0.1} />
                </mesh>
              </group>
            ) : morphology === 'PRISMATIC_CRYSTAL' ? (
              <mesh position={[0, 0.02, 0.01]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.008, 0.008, 0.065, 6]} />
                <meshStandardMaterial color="#581c87" roughness={0.12} metalness={0.65} />
              </mesh>
            ) : morphology === 'TABULAR_CRYSTAL' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <boxGeometry args={[0.045, 0.012, 0.038]} />
                <meshStandardMaterial color="#ea580c" roughness={0.18} metalness={0.35} />
              </mesh>
            ) : morphology === 'HYDRATE_CRYSTAL' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <octahedronGeometry args={[0.035, 0]} />
                <meshStandardMaterial color={solidColor} roughness={0.15} metalness={0.12} />
              </mesh>
            ) : morphology === 'LUSTROUS_PLATES' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <boxGeometry args={[0.045, 0.012, 0.034]} />
                <meshStandardMaterial color="#3b0764" roughness={0.18} metalness={0.75} />
              </mesh>
            ) : morphology === 'PELLET' ? (
              <mesh position={[0, 0.02, 0.01]}>
                <boxGeometry args={[0.038, 0.032, 0.038]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.9} />
              </mesh>
            ) : (
              // Fine powder mound
              <group>
                <mesh scale={[1.1, 0.6, 1.0]}>
                  <sphereGeometry args={[0.065, 12, 8]} />
                  <meshStandardMaterial color={solidColor} roughness={0.96} metalness={0.02} />
                </mesh>
                <mesh position={[-0.015, 0.02, 0.01]}>
                  <dodecahedronGeometry args={[0.016, 0]} />
                  <meshStandardMaterial color={solidColor} roughness={0.96} metalness={0.02} />
                </mesh>
              </group>
            )}
          </group>
        )}
      </group>

      {/* Falling Particle Cascade during Dumping (Matches authentic morphology) */}
      {fallingGrains.map(grain => (
        <mesh key={grain.key} position={[grain.x, -0.68 + grain.y, grain.z]}>
          {morphology === 'RIBBON' ? (
            <torusGeometry args={[0.035, 0.008, 6, 12, Math.PI * 1.4]} />
          ) : morphology === 'TURNINGS' ? (
            <torusGeometry args={[0.032, 0.007, 6, 12, Math.PI * 1.8]} />
          ) : morphology === 'FILINGS' ? (
            <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
          ) : morphology === 'CUBIC_CRYSTAL' ? (
            <boxGeometry args={[0.024, 0.024, 0.024]} />
          ) : morphology === 'PRISMATIC_CRYSTAL' ? (
            <cylinderGeometry args={[0.006, 0.006, 0.045, 6]} />
          ) : morphology === 'HYDRATE_CRYSTAL' ? (
            <octahedronGeometry args={[0.028, 0]} />
          ) : morphology === 'POWDER' ? (
            <dodecahedronGeometry args={[0.014, 0]} />
          ) : (
            <dodecahedronGeometry args={[0.028, 0]} />
          )}
          <meshStandardMaterial
            color={
              morphology === 'TURNINGS' ? '#ea580c' : 
              (morphology === 'FILINGS' ? '#475569' : 
              (morphology === 'LUSTROUS_PLATES' ? '#3b0764' : 
              (morphology === 'PRISMATIC_CRYSTAL' ? '#581c87' : 
              (morphology === 'TABULAR_CRYSTAL' ? '#ea580c' : 
              (morphology === 'CHIPS' ? '#f1f5f9' : solidColor)))))
            }
            roughness={morphology === 'POWDER' ? 0.96 : (morphology === 'RIBBON' || morphology === 'TURNINGS' ? 0.2 : 0.65)}
            metalness={morphology === 'RIBBON' || morphology === 'TURNINGS' || morphology === 'FILINGS' || morphology === 'PELLET' ? 0.92 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
});
