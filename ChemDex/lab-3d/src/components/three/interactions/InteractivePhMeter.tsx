import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { useToolDock } from '../../../handling/toolDock';
import { instrumentHome } from '../../../handling/instrumentCatalog';
import { readSample } from '../../../handling/instrumentReadings';
import { simulationFrameDt } from '../../../core/clock';

/** Aqueous pH probe: the displayed value approaches the solution's chemistry
 * state. A dry probe has no valid pH measurement, rather than reading pH 7. */
export const InteractivePhMeter = React.memo(function InteractivePhMeter() {
  const dock = useToolDock('ph_meter', instrumentHome('ph_meter'));
  const active = useAppStore(state => state.activeTool === 'ph_meter' && !state.moveMode);
  const vessel = useAppStore(state => state.selectedVesselId ? state.vessels[state.selectedVesselId] : undefined);
  const group = useRef<THREE.Group>(null);
  const label = useRef<any>(null);
  const target = useRef(new THREE.Vector3());
  const reading = useRef<number | null>(null);
  const observation = readSample(vessel);
  const immersed = active && vessel && observation.phPoint !== null;

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = simulationFrameDt(delta, useAppStore.getState());
    if (immersed) {
      const point = observation.phPoint!;
      target.current.set(point[0], point[1] + 0.68, point[2]);
      const equilibrium = observation.ph;
      reading.current = equilibrium === null ? null : reading.current === null ? equilibrium
        : reading.current + (equilibrium - reading.current) * (1 - Math.exp(-dt / 1.2));
    } else {
      target.current.set(...dock.position);
      reading.current = null;
    }
    group.current.position.lerp(target.current, 1 - Math.exp(-delta * 8));
    group.current.rotation.set(immersed ? 0 : -Math.PI / 2, 0, 0);
    if (label.current) {
      const text = reading.current === null ? 'pH ---' : `pH ${reading.current.toFixed(2)}`;
      if (label.current.text !== text) label.current.text = text;
    }
  });

  if (!dock.visible) return null;

  return <group ref={group} name="tool-ph_meter" visible={dock.visible} position={dock.position} rotation={active ? [0, 0, 0] : [-Math.PI / 2, 0, 0]} onPointerDown={dock.onPointerDown}
    onClick={event => {
      event.stopPropagation();
      if (!dock.moveMode) useAppStore.getState().setActiveTool(active ? 'none' : 'ph_meter');
    }}
    onPointerOver={() => { document.body.style.cursor = dock.moveMode ? 'grab' : 'pointer'; }}
    onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[0.38, 0.7, 0.18]} />
      <meshStandardMaterial color="#fbbf24" roughness={0.55} />
    </mesh>
    <mesh position={[0, 0.55, 0.095]}>
      <planeGeometry args={[0.31, 0.22]} />
      <meshBasicMaterial color="#d9edce" />
    </mesh>
    <Text ref={label} name="ph-probe-reading" position={[0, 0.55, 0.1]} fontSize={0.065} color="#18362c" anchorX="center" anchorY="middle">pH ---</Text>
    {immersed && <Text position={[0, 0.47, 0.1]} fontSize={0.026} color="#36523a" anchorX="center" anchorY="middle">
      {observation.basis === 'ideal_aqueous_25c' ? 'Mô hình 25 °C'
        : observation.basis === 'ideal_aqueous_temperature' ? `Mô hình ${observation.referenceTemperature_c!.toFixed(1)} °C`
          : observation.basis === 'scenario' ? 'Điều kiện kịch bản' : 'Chưa có mô hình pH'}
    </Text>}
    <mesh position={[0, 0.13, 0.095]}>
      <circleGeometry args={[0.045, 12]} />
      <meshStandardMaterial color={active ? '#22c55e' : '#64748b'} roughness={0.7} />
    </mesh>
    <mesh position={[0, -0.25, 0]}>
      <cylinderGeometry args={[0.045, 0.045, 0.8, 12]} />
      <meshStandardMaterial color="#d6e4e9" transparent opacity={0.65} roughness={0.2} />
    </mesh>
    <mesh position={[0, -0.68, 0]}>
      <sphereGeometry args={[0.065, 12, 8]} />
      <meshStandardMaterial color="#bfdbfe" transparent opacity={0.7} roughness={0.12} />
    </mesh>
</group>;
});
