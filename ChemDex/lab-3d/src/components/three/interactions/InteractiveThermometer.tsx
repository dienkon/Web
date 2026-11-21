import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { updateThermalResponse } from '../../../engine/interactionEngine';
import { useToolDock } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';
import { readSample } from '../../../handling/instrumentReadings';
import { useLabEnvironment } from '../../../store/useLabEnvironment';
import { simulationFrameDt } from '../../../core/clock';
import { neutralizationProbeAttempt } from '../../../engine/neutralizationPractice';
import { useInstrumentStore } from '../../../handling/instrumentState';

const stemGlassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.08,
  transmission: 0.94,
  thickness: 0.2,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
});

export const InteractiveThermometer = React.memo(function InteractiveThermometer({
  position: initialPosition = instrumentHome('thermometer'),
}: {
  position?: [number, number, number];
}) {
  const dock = useToolDock('thermometer', initialPosition);
  const position = dock.position;
  const animationTarget = useRef(new THREE.Vector3());
  const activeTool = useAppStore(state => state.activeTool);
  const setActiveTool = useAppStore(state => state.setActiveTool);
  const targetVessel = useAppStore(state => state.selectedVesselId ? state.vessels[state.selectedVesselId] : undefined);

  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const fluidColumnRef = useRef<THREE.Mesh>(null);
  const ambient = useLabEnvironment(s => s.conditions.temperature_c);
  const currentTempRef = useRef(ambient);

  const isActive = activeTool === 'thermometer' && !dock.moveMode;
  const observation = readSample(targetVessel);
  useEffect(() => () => useInstrumentStore.getState().publishPracticeProbe('thermometer', null), []);

  useFrame((_, delta) => {
    const app = useAppStore.getState(), instrument = useInstrumentStore.getState();
    const dt = simulationFrameDt(delta, app);
    const attemptId = neutralizationProbeAttempt(targetVessel);
    if (!groupRef.current) { instrument.publishPracticeProbe('thermometer', null); return; }

    if (isActive && targetVessel && observation.thermometerPoint && observation.temperature_c !== null) {
      // Immerse thermometer bulb into the vessel's liquid
      const point = observation.thermometerPoint;
      const targetPos = animationTarget.current.set(
        point[0], point[1] + 0.75, point[2]
      );
      groupRef.current.position.lerp(targetPos, 1 - Math.exp(-dt * 8));
      if (dt > 0) groupRef.current.rotation.set(0, 0, 0);

      // In the assessed exercise the bulb starts sensing after it reaches the sample.
      if (!attemptId || groupRef.current.position.distanceToSquared(targetPos) <= 0.0001) {
        currentTempRef.current = updateThermalResponse(currentTempRef.current, observation.temperature_c, dt, 1.8);
      }
    } else {
      // Resting on rack
      const restPos = animationTarget.current.set(...position);
      groupRef.current.position.lerp(restPos, 1 - Math.exp(-dt * 8));
      if (dt > 0) groupRef.current.rotation.set(-Math.PI / 2, 0, 0);

      // The room control, not a fixed 25 C fallback, sets the dry probe's environment.
      currentTempRef.current = updateThermalResponse(
        currentTempRef.current,
        ambient,
        dt,
        3.0
      );
    }

    const t = currentTempRef.current;
    const point = observation.thermometerPoint;
    const inContact = isActive && attemptId && point && observation.temperature_c !== null
      && groupRef.current.position.distanceToSquared(animationTarget.current) <= 0.0001;
    instrument.publishPracticeProbe('thermometer', inContact
      ? { tool: 'thermometer', attemptId, epoch: app.pourEpoch, value: Number(t.toFixed(2)), point,
        settled: Math.abs(t - observation.temperature_c!) <= 0.14 } : null);
    if (textRef.current) {
      const label = `${t.toFixed(1)}°C`;
      if (textRef.current.text !== label) textRef.current.text = label;
    }

    // Update red alcohol column height (scaled from -10°C to 110°C)
    if (fluidColumnRef.current) {
      const normalizedTemp = Math.max(0, Math.min(1.0, (t - 0) / 100));
      const colHeight = Math.max(0.05, normalizedTemp * 1.6);
      fluidColumnRef.current.scale.set(1, colHeight, 1);
      fluidColumnRef.current.position.y = -0.6 + colHeight / 2;
    }
  });

  if (!dock.visible) return null;

  return (
    <group
      ref={groupRef}
      name="tool-thermometer" visible={dock.visible}
      position={position} rotation={isActive ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
      onPointerDown={dock.onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (dock.moveMode) return;
        setActiveTool(isActive ? 'none' : 'thermometer');
      }}
      onPointerOver={() => { document.body.style.cursor = dock.moveMode ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
{/* Glass Stem */}
      <mesh material={stemGlassMaterial} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.0, 16, 1, true]} />
      </mesh>

      {/* Bottom Mercury / Alcohol Reservoir Bulb */}
      <mesh position={[0, -0.75, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} metalness={0.2} />
      </mesh>

      {/* Rising Red Liquid Column */}
      <mesh ref={fluidColumnRef} position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 12]} />
        <meshStandardMaterial color="#ef4444" roughness={0.2} />
      </mesh>

      {/* Glass Graduation Marks */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, -0.4 + i * 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.046, 0.048, 12]} />
          <meshBasicMaterial color="#ffffff" opacity={0.6} transparent />
        </mesh>
      ))}

      {/* Digital LCD Head Housing */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.34, 0.22, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>

      {/* Digital Screen Faceplate */}
      <mesh position={[0, 1.35, 0.062]}>
        <planeGeometry args={[0.3, 0.16]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* Live Temperature Text */}
      <Text
        ref={textRef}
        name="thermometer-probe-reading"
        position={[0, 1.35, 0.065]}
        fontSize={0.075}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${ambient.toFixed(1)}°C`}
      </Text>
    </group>
  );
});
