import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { ContinuousLiquidStream } from './ContinuousLiquidStream';
import { labSound } from '../../../utils/audio';

const glassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.05,
  transmission: 0.94,
  thickness: 0.15,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
});

export const InteractivePipette = React.memo(function InteractivePipette({
  targetVesselId,
  position = [-6.5, 0.4, 2.0],
}: {
  targetVesselId?: string | null;
  position?: [number, number, number];
}) {
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const vessels = useAppStore(state => state.vessels);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const mixSubstances = useAppStore(state => state.mixSubstances);
  const setVesselState = useAppStore(state => state.setVesselState);

  const [pipetteVolume, setPipetteVolume] = useState(0); // 0 to 10 mL
  const [pipetteColor, setPipetteColor] = useState('#38bdf8');
  const [pipetteSubstances, setPipetteSubstances] = useState<string[]>([]);
  const [isBulbSqueezed, setIsBulbSqueezed] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);

  const pipetteGroupRef = useRef<THREE.Group>(null);
  const targetVessel = selectedVesselId ? vessels[selectedVesselId] : null;

  // Active if selected in toolbar or clicked
  const isActive = activeTool === 'pipette';

  // Position: either hovering above the active vessel or at resting rack position
  const targetWorldPos = useMemo(() => {
    if (isActive && targetVessel) {
      return new THREE.Vector3(targetVessel.position[0], targetVessel.position[1] + 1.8, targetVessel.position[2]);
    }
    return new THREE.Vector3(...position);
  }, [isActive, targetVessel, position]);

  useFrame((_, delta) => {
    if (!pipetteGroupRef.current) return;
    pipetteGroupRef.current.position.lerp(targetWorldPos, delta * 8.0);
  });

  // Aspirate liquid from target vessel
  const handleAspirate = (e: any) => {
    e.stopPropagation();
    if (!targetVessel || targetVessel.volume_ml <= 0) return;
    
    setIsBulbSqueezed(true);
    setTimeout(() => {
      setIsBulbSqueezed(false);
      const drawAmount = Math.min(10, targetVessel.volume_ml);
      setPipetteVolume(drawAmount);
      setPipetteColor(targetVessel.liquidColor || '#38bdf8');
      setPipetteSubstances([...targetVessel.substances]);

      // Deduct from vessel
      const remainingVol = Math.max(0, targetVessel.volume_ml - drawAmount);
      setVesselState(targetVessel.id, {
        volume_ml: remainingVol,
        volume: remainingVol / targetVessel.capacity_ml,
      });
      if (targetVessel.substances.length > 0) {
        useAppStore.getState().touchToolChemical('pipette', targetVessel.substances[0]);
      }
      labSound.playDrop();
    }, 200);
  };

  // Dispense liquid from pipette into target vessel
  const handleDispense = (e: any) => {
    e.stopPropagation();
    if (pipetteVolume <= 0 || !targetVessel) return;

    setIsBulbSqueezed(true);
    setIsDispensing(true);
    labSound.playDrop();

    const dispenseAmount = Math.min(2.5, pipetteVolume);
    const remainingInPipette = pipetteVolume - dispenseAmount;
    setPipetteVolume(remainingInPipette);

    // Transfer chemical
    if (pipetteSubstances.length > 0) {
      pipetteSubstances.forEach(sub => {
        mixSubstances(targetVessel.id, sub, dispenseAmount);
      });
    }

    setTimeout(() => {
      setIsBulbSqueezed(false);
      setIsDispensing(false);
    }, 300);
  };

  const handleBulbClick = (e: any) => {
    e.stopPropagation();
    if (pipetteVolume <= 0.1) {
      handleAspirate(e);
    } else {
      handleDispense(e);
    }
  };

  const streamFrom: [number, number, number] = targetVessel
    ? [targetVessel.position[0], targetVessel.position[1] + 1.1, targetVessel.position[2]]
    : [position[0], position[1] - 0.7, position[2]];
  const streamTo: [number, number, number] = targetVessel
    ? [targetVessel.position[0], targetVessel.position[1] + 0.2, targetVessel.position[2]]
    : [position[0], position[1] - 1.2, position[2]];

  const fillRatio = pipetteVolume / 10;

  return (
    <group
      ref={pipetteGroupRef}
      onClick={(e) => {
        e.stopPropagation();
        setActiveTool(isActive ? 'none' : 'pipette');
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Pipette Rest Stand / Acrylic Block when resting */}
      {!isActive && (
        <mesh position={[0, -0.7, 0]} receiveShadow>
          <boxGeometry args={[0.5, 0.4, 0.5]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
      )}

      {/* Glass Barrel Stem */}
      <mesh material={glassMaterial} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1.4, 16, 1, true]} />
      </mesh>

      {/* Graduation Markings */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -0.4 + i * 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.046, 0.048, 12]} />
          <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}

      {/* Drawn Liquid Column Inside Capillary */}
      {fillRatio > 0.01 && (
        <mesh position={[0, -0.65 + (fillRatio * 1.2) / 2, 0]}>
          <cylinderGeometry args={[0.038, 0.038, fillRatio * 1.2, 12]} />
          <meshStandardMaterial color={pipetteColor} transparent opacity={0.8} roughness={0.1} />
        </mesh>
      )}

      {/* Narrow Drawn Tapered Delivery Tip */}
      <mesh material={glassMaterial} position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.045, 0.012, 0.35, 16]} />
      </mesh>

      {/* Compressible Rubber Suction Bulb */}
      <group
        position={[0, 0.85, 0]}
        onClick={handleBulbClick}
        scale={[1, isBulbSqueezed ? 0.65 : 1, 1]}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.65} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 0.12, 16]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.7} />
        </mesh>
      </group>

      {/* Dispensing Droplet Stream */}
      <ContinuousLiquidStream
        fromPos={streamFrom}
        toPos={streamTo}
        color={pipetteColor}
        flowRate={isDispensing ? 12 : 0}
        thickness={0.02}
        active={isDispensing}
      />
    </group>
  );
});
