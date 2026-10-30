import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { ContinuousLiquidStream } from './ContinuousLiquidStream';
import { useToolDock } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';
import { useInstrumentStore } from '../../../handling/instrumentState';
import { aspiratePipette, dispensePipette } from '../../../handling/instrumentOperations';
import { getWorldVesselProfile } from '../../../pour/physics/profiles';
import { vesselWorldLiquidSurfaceY } from '../../../science/vesselGeometry';

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
  position: initialPosition = instrumentHome('pipette'),
}: {
  targetVesselId?: string | null;
  position?: [number, number, number];
}) {
  const dock = useToolDock('pipette', initialPosition);
  const position = dock.position;
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);

  const sample = useAppStore(state => state.pipetteSample);
  const pulse = useInstrumentStore(state => state.pipettePulse);
  const dispensing = useInstrumentStore(state => state.pipetteDispensing);
  const pipetteVolume = sample?.volume_ml ?? 0;
  const pipetteColor = sample?.color ?? '#38bdf8';
  const pulseTime = useRef(0);
  const lastPulse = useRef(pulse);
  const [isBulbSqueezed, setIsBulbSqueezed] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);

  const pipetteGroupRef = useRef<THREE.Group>(null);
  const targetId = targetVesselId ?? selectedVesselId;
  const targetVessel = useAppStore(state => targetId ? state.vessels[targetId] : undefined);

  // Active if selected in toolbar or clicked
  const isActive = activeTool === 'pipette' && !dock.moveMode;

  // Position: either hovering above the active vessel or at resting rack position
  const targetWorldPos = useMemo(() => {
    if (isActive && targetVessel) {
      return new THREE.Vector3(targetVessel.position[0], targetVessel.position[1]
        + getWorldVesselProfile(targetVessel.type, targetVessel.capacity_ml).lipLocal[1] + 0.8, targetVessel.position[2]);
    }
    return new THREE.Vector3(...position);
  }, [isActive, targetVessel, position]);

  useFrame((_, delta) => {
    if (lastPulse.current !== pulse) {
      lastPulse.current = pulse;
      pulseTime.current = 0.3;
      setIsBulbSqueezed(true);
      setIsDispensing(dispensing);
    }
    if (pulseTime.current > 0) {
      pulseTime.current -= delta;
      if (pulseTime.current <= 0) {
        setIsBulbSqueezed(false);
        setIsDispensing(false);
      }
    }
    if (!pipetteGroupRef.current) return;
    pipetteGroupRef.current.position.lerp(targetWorldPos, 1 - Math.exp(-delta * 8));
    pipetteGroupRef.current.rotation.set(isActive && targetVessel ? 0 : -Math.PI / 2, 0, 0);
  });

  const handleBulbClick = (e: any) => {
    e.stopPropagation();
    if (dock.moveMode) return;
    if (!isActive) { setActiveTool('pipette'); return; }
    if (targetVesselId) useAppStore.getState().setSelectedVesselId(targetVesselId);
    if (pipetteVolume <= 0.000001) {
      aspiratePipette(10);
    } else {
      dispensePipette(2.5);
    }
  };

  const streamFrom: [number, number, number] = targetVessel
    ? [targetVessel.position[0], targetVessel.position[1] + getWorldVesselProfile(targetVessel.type, targetVessel.capacity_ml).lipLocal[1] + 0.1, targetVessel.position[2]]
    : [position[0], position[1] - 0.7, position[2]];
  const streamTo: [number, number, number] = targetVessel
    ? [targetVessel.position[0], targetVessel.position[1] + vesselWorldLiquidSurfaceY(targetVessel), targetVessel.position[2]]
    : [position[0], position[1] - 1.2, position[2]];

  const fillRatio = pipetteVolume / 10;

  if (!dock.visible) return null;

  return (
    <group
      ref={pipetteGroupRef}
      name="tool-pipette" visible={dock.visible}
      position={position} rotation={isActive ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      onPointerDown={dock.onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (dock.moveMode) return;
        setActiveTool(isActive ? 'none' : 'pipette');
      }}
      onPointerOver={() => { document.body.style.cursor = dock.moveMode ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
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
        onPointerDown={(event) => {
          if (dock.moveMode) dock.onPointerDown(event);
          else handleBulbClick(event);
        }}
        onClick={(event) => event.stopPropagation()}
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
