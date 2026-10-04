import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSimulationDebugStore } from '../core/debugStore';
import { PourController } from '../../pour/controller/PourController';
import { useAppStore } from '../../store/useAppStore';
import { SimulationEngine } from '../core/SimulationEngine';

export const SimulationDebugGizmos: React.FC = () => {
  const showGravity = useSimulationDebugStore(s => s.showGravity);
  const showContainerTilt = useSimulationDebugStore(s => s.showContainerTilt);
  const showLiquidPlane = useSimulationDebugStore(s => s.showLiquidPlane);
  const showPourTrajectory = useSimulationDebugStore(s => s.showPourTrajectory);
  const showMixingZone = useSimulationDebugStore(s => s.showMixingZone);
  const showSedimentBounds = useSimulationDebugStore(s => s.showSedimentBounds);

  const selectedVesselId = useAppStore(s => s.selectedVesselId);
  const vessels = useAppStore(s => s.vessels);

  const gravityLineRef = useRef<THREE.Line>(null);
  const liquidPlaneRingRef = useRef<THREE.Mesh>(null);
  const mixingRingRef = useRef<THREE.Mesh>(null);
  const sedimentBoxRef = useRef<THREE.Mesh>(null);
  const trajectoryLineRef = useRef<THREE.Line>(null);

  // Reusable points for trajectory line
  const trajectoryPoints = useRef<THREE.Vector3[]>(
    Array.from({ length: 24 }, () => new THREE.Vector3())
  );

  useFrame(() => {
    const vessel = selectedVesselId ? vessels[selectedVesselId] : null;
    const session = PourController.getSession();

    // 1. Gravity Vector Gizmo
    if (gravityLineRef.current && vessel) {
      if (showGravity) {
        gravityLineRef.current.visible = true;
        const [vx, vy, vz] = vessel.position;
        gravityLineRef.current.position.set(vx, vy + 0.8, vz);
      } else {
        gravityLineRef.current.visible = false;
      }
    }

    // 2. Liquid Horizontal Plane Gizmo
    if (liquidPlaneRingRef.current && vessel) {
      if (showLiquidPlane && vessel.volume_ml > 0) {
        liquidPlaneRingRef.current.visible = true;
        const [vx, vy, vz] = vessel.position;
        const heightRatio = Math.min(1, vessel.volume_ml / (vessel.capacity_ml || 100));
        liquidPlaneRingRef.current.position.set(vx, vy + heightRatio * 0.7, vz);
        liquidPlaneRingRef.current.rotation.x = Math.PI / 2;
      } else {
        liquidPlaneRingRef.current.visible = false;
      }
    }

    // 3. Mixing Zone & Impact Point Gizmo
    if (mixingRingRef.current) {
      if (showMixingZone && session && session.targetId && session.flow_ml_s > 0.05) {
        const targetVessel = vessels[session.targetId];
        if (targetVessel) {
          mixingRingRef.current.visible = true;
          const [tx, ty, tz] = targetVessel.position;
          const fillRatio = Math.min(1, targetVessel.volume_ml / (targetVessel.capacity_ml || 100));
          mixingRingRef.current.position.set(tx, ty + fillRatio * 0.7 + 0.02, tz);
          mixingRingRef.current.rotation.x = Math.PI / 2;
          const pulse = 1.0 + 0.15 * Math.sin(performance.now() * 0.008);
          mixingRingRef.current.scale.set(pulse, pulse, pulse);
        }
      } else {
        mixingRingRef.current.visible = false;
      }
    }

    // 4. Sediment Layer Bounds Gizmo
    if (sedimentBoxRef.current && selectedVesselId) {
      const mgr = SimulationEngine.getManager(selectedVesselId);
      if (showSedimentBounds && mgr && mgr.precipitationSystem.sedimentBed.amount_g > 0.01 && vessel) {
        sedimentBoxRef.current.visible = true;
        const [vx, vy, vz] = vessel.position;
        const thick = mgr.precipitationSystem.sedimentBed.thickness;
        sedimentBoxRef.current.position.set(vx, vy + thick * 0.5, vz);
        sedimentBoxRef.current.scale.set(0.6, thick, 0.6);
      } else {
        sedimentBoxRef.current.visible = false;
      }
    }

    // 5. Ballistic Stream Trajectory Wireframe
    if (trajectoryLineRef.current) {
      if (showPourTrajectory && session && session.flow_ml_s > 0.05 && session.targetId) {
        const srcVessel = vessels[session.sourceId];
        const tgtVessel = vessels[session.targetId];
        if (srcVessel && tgtVessel) {
          trajectoryLineRef.current.visible = true;
          const start = new THREE.Vector3(
            srcVessel.position[0] + Math.sin(session.tilt) * 0.25,
            srcVessel.position[1] + (session.lift || 0.4),
            srcVessel.position[2]
          );
          const tgtFill = Math.min(1, tgtVessel.volume_ml / (tgtVessel.capacity_ml || 100));
          const end = new THREE.Vector3(
            tgtVessel.position[0],
            tgtVessel.position[1] + tgtFill * 0.7,
            tgtVessel.position[2]
          );

          const geom = trajectoryLineRef.current.geometry as THREE.BufferGeometry;
          const posAttr = geom.attributes.position as THREE.BufferAttribute;
          const count = 24;

          for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            // Parabola under gravity
            const x = THREE.MathUtils.lerp(start.x, end.x, t);
            const z = THREE.MathUtils.lerp(start.z, end.z, t);
            const linearY = THREE.MathUtils.lerp(start.y, end.y, t);
            const sag = 4.0 * t * (1.0 - t) * 0.15;
            const y = linearY - sag;
            posAttr.setXYZ(i, x, y, z);
          }
          posAttr.needsUpdate = true;
        }
      } else {
        trajectoryLineRef.current.visible = false;
      }
    }
  });

  return (
    <group name="simulation_debug_gizmos">
      {/* Gravity Vector Arrow/Line */}
      <line ref={gravityLineRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, -0.6, 0]), 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[new Float32Array([0, 1, 1, 0, 0.4, 1]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors linewidth={2} />
      </line>

      {/* Horizontal Liquid Gravity Plane Ring */}
      <mesh ref={liquidPlaneRingRef} visible={false}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshBasicMaterial color="#38bdf8" wireframe side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>

      {/* Local Mixing Zone Ring */}
      <mesh ref={mixingRingRef} visible={false}>
        <ringGeometry args={[0.08, 0.22, 32]} />
        <meshBasicMaterial color="#ec4899" wireframe side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {/* Sediment Bed Bounds Cylinder/Box */}
      <mesh ref={sedimentBoxRef} visible={false}>
        <cylinderGeometry args={[0.4, 0.4, 1, 16]} />
        <meshBasicMaterial color="#eab308" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Trajectory Parabola Line */}
      <line ref={trajectoryLineRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(24 * 3), 3]}
          />
        </bufferGeometry>
        <lineDashedMaterial color="#22c55e" dashSize={0.05} gapSize={0.03} />
      </line>
    </group>
  );
};
