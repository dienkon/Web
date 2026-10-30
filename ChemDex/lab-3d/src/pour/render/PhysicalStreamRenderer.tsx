import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PourController } from '../controller/PourController';
import { useAppStore } from '../../store/useAppStore';
import { getWorldVesselProfile } from '../physics/profiles';
import { pourAudio } from '../audio/PourAudio';
import { SCENE_GRAVITY, METERS_PER_SCENE_UNIT, streamRadiusForFlow, liquidDropRadius } from '../../science/sceneUnits';
import { NOMINAL_DROP_ML } from '../../handling/doseTiming';
import { occupiedLiquidVolume } from '../../handling/solidOccupancy';
import { PourTransitRenderer } from './PourTransitRenderer';

interface StreamDroplet {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  targetY: number;
  color: string;
  hitsLiquid: boolean;
}

const MAX_DROPLETS = 32;
const STREAM_SEGMENTS = 24;

/**
 * High-fidelity, real-time physical liquid stream & droplet renderer.
 * Features:
 * - Parabolic ballistic trajectory following gravity gravity converted from SI to scene units
 * - Hydrodynamic narrowing along fall: w(y) proportional to 1 / sqrt(velocity)
 * - Nominal visual droplets at low flow; breakup instability is not solved
 * - Concentric surface impact ripples & local mixing zone excitation
 * - Reuses typed buffers and scratch matrices for stream geometry
 */
export const PhysicalStreamRenderer = React.memo(function PhysicalStreamRenderer() {
  const streamMeshRef = useRef<THREE.Mesh>(null);
  const dropletsMeshRef = useRef<THREE.InstancedMesh>(null);
  const rippleMeshRef = useRef<THREE.Mesh>(null);
  const secondaryRippleRef = useRef<THREE.Mesh>(null);
  const wasStreamingRef = useRef(false);

  // Pre-allocated droplet pool
  const droplets = useRef<StreamDroplet[]>(
    Array.from({ length: MAX_DROPLETS }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 0.02,
      targetY: -0.135,
      color: '#38bdf8', hitsLiquid: false
    }))
  );
  const dropletSpawnTimer = useRef(0);
  const visualTime = useRef(0);

  // Scratch objects for zero allocation in animation loop
  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);

  // Pre-allocated cylinder geometry for continuous stream column
  const streamGeometry = useMemo(() => {
    // 24 segments along height, 16 around circumference
    return new THREE.CylinderGeometry(0.04, 0.025, 1.0, 16, STREAM_SEGMENTS, true);
  }, []);

  // Clean initialization
  useEffect(() => {
    if (dropletsMeshRef.current) {
      scratchPos.set(0, -9999, 0);
      scratchScale.set(0, 0, 0);
      scratchQuat.identity();
      scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
      for (let i = 0; i < MAX_DROPLETS; i++) {
        dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
      }
      dropletsMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [scratchMat4, scratchPos, scratchQuat, scratchScale]);

  useFrame((state, delta) => {
    const live = useAppStore.getState();
    if (live.isSimulationPaused) return;
    const session = PourController.getSession();
    if (session && !['STOCK_BOTTLE', 'DROPPER', 'SOLID'].includes(session.mode)) {
      if (streamMeshRef.current) streamMeshRef.current.visible = false;
      if (dropletsMeshRef.current) dropletsMeshRef.current.visible = false;
      if (rippleMeshRef.current) rippleMeshRef.current.visible = false;
      if (secondaryRippleRef.current) secondaryRippleRef.current.visible = false;
      for (const drop of droplets.current) drop.active = false;
      if (wasStreamingRef.current) { pourAudio.stopPourStream(); wasStreamingRef.current = false; }
      return;
    }
    const dt = simulationFrameDt(delta, live);
    visualTime.current += dt;
    const time = visualTime.current;

    // If no active session or negligible flow, hide stream and deactivate audio
    if (!session || (session.flow_ml_s <= 0.01 && session.phase !== 'dripping')) {
      if (streamMeshRef.current) streamMeshRef.current.visible = false;
      if (rippleMeshRef.current) rippleMeshRef.current.visible = false;
      if (secondaryRippleRef.current) secondaryRippleRef.current.visible = false;

      if (wasStreamingRef.current) { pourAudio.stopPourStream(); wasStreamingRef.current = false; }
      // Update remaining falling droplets until they hit bottom
      let anyDropActive = false;
      if (dropletsMeshRef.current) {
        for (let i = 0; i < MAX_DROPLETS; i++) {
          const d = droplets.current[i];
          if (d.active) {
            dropletsMeshRef.current.setColorAt(i, scratchColor.set(d.color));
            d.y += d.vy * dt - 0.5 * SCENE_GRAVITY * dt * dt;
            d.vy -= SCENE_GRAVITY * dt;
            d.x += d.vx * dt;
            d.z += d.vz * dt;

            if (d.y <= d.targetY) {
              d.active = false;
              scratchPos.set(0, -9999, 0);
              scratchScale.set(0, 0, 0);
              scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
              dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
            } else {
              anyDropActive = true;
              scratchPos.set(d.x, d.y, d.z);
              const sy = Math.max(1.0, Math.min(2, 1.0 + Math.abs(d.vy) * METERS_PER_SCENE_UNIT * 1.5));
              const sx = 1.0 / Math.sqrt(sy);
              scratchScale.set(d.radius * sx, d.radius * sy, d.radius * sx);
              scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
              dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
            }
          }
        }
        dropletsMeshRef.current.instanceMatrix.needsUpdate = true;
        if (dropletsMeshRef.current.instanceColor) dropletsMeshRef.current.instanceColor.needsUpdate = true;
      }

      if (dropletsMeshRef.current) dropletsMeshRef.current.visible = anyDropActive;
      return;
    }

    const store = useAppStore.getState();
    const sourceVessel = store.vessels[session.sourceId];
    const targetVessel = session.targetId ? store.vessels[session.targetId] : null;

    if (!sourceVessel) return;

    const flowRate = session.flow_ml_s;
    const liquidColorHex = sourceVessel.liquidColor || '#38bdf8';

    // 1. CALCULATE EXIT BALLISTICS AT SPOUT LIP
    // Use the exact trajectory that classifies the inventory transfer.
    const trajectory = session.trajectory;
    if (!trajectory) return;
    const [lipX, lipY, lipZ] = trajectory.exitPos;
    const [targetX, targetY, targetZ] = trajectory.impactPos;
    const [v0x, v0y, v0z] = trajectory.exitVel;
    const flightTime = trajectory.timeOfFlight;
    const targetMouthR = targetVessel ? getWorldVesselProfile(targetVessel.type, targetVessel.capacity_ml).mouthR : 0.4;
    const landsInLiquid = !!targetVessel && trajectory.targetVesselId === targetVessel.id && targetVessel.volume_ml > 0 && trajectory.detailKind === 'liquid';
    if (!wasStreamingRef.current) {
      pourAudio.startPourStream(320); wasStreamingRef.current = true;
    }
    if (targetVessel) pourAudio.updateFillRatio(occupiedLiquidVolume(targetVessel) / targetVessel.capacity_ml, flowRate);

    // Continuous vs Dripping Regime
    const isDrippingRegime = flowRate < 1.2 || session.phase === 'dripping';

    // 3. RENDER CONTINUOUS BALLISTIC STREAM WITH TRUE CURVED PARABOLIC ARCS & HYDRODYNAMIC NARROWING
    if (!isDrippingRegime && streamMeshRef.current) {
      streamMeshRef.current.visible = true;
      streamMeshRef.current.position.set(0, 0, 0);
      streamMeshRef.current.rotation.set(0, 0, 0);
      streamMeshRef.current.scale.set(1, 1, 1);

      const posAttr = streamGeometry.attributes.position;
      const posArray = posAttr.array as Float32Array;

      // Cross-sections along the pouring stream.
      const radialSegs = 16;
      const heightSegs = STREAM_SEGMENTS; // 24

      // Update each height ring of the cylinder
      for (let j = 0; j <= heightSegs; j++) {
        const s = j / heightSegs; // 0 at top, 1 at bottom
        const t = s * flightTime;

        // True ballistic parabolic trajectory point connecting lip (s=0) to recipient surface (s=1)
        const cx = lipX + v0x * t;
        const cy = lipY + v0y * t - 0.5 * SCENE_GRAVITY * t * t;
        const cz = lipZ + v0z * t;

        // Q = A*v, with ring planes perpendicular to the local velocity.
        const vy = v0y - SCENE_GRAVITY * t;
        const speed = Math.hypot(v0x, vy, v0z);
        const currentR = streamRadiusForFlow(flowRate, speed);
        const horizontal = Math.hypot(v0x, v0z);
        const ux = horizontal > 1e-9 ? -v0z / horizontal : 1;
        const uz = horizontal > 1e-9 ? v0x / horizontal : 0;
        const bx = vy / speed * uz;
        const by = (v0z * ux - v0x * uz) / speed;
        const bz = -vy / speed * ux;

        for (let i = 0; i <= radialSegs; i++) {
          const vertexIdx = (j * (radialSegs + 1) + i) * 3;
          if (vertexIdx + 2 < posArray.length) {
            const phi = (i / radialSegs) * Math.PI * 2;
            posArray[vertexIdx] = cx + (Math.cos(phi) * ux + Math.sin(phi) * bx) * currentR;
            posArray[vertexIdx + 1] = cy + Math.sin(phi) * by * currentR;
            posArray[vertexIdx + 2] = cz + (Math.cos(phi) * uz + Math.sin(phi) * bz) * currentR;
          }
        }
      }

      posAttr.needsUpdate = true;
      streamGeometry.computeVertexNormals();

      const mat = streamMeshRef.current.material as THREE.MeshPhysicalMaterial;
      if (mat) {
        mat.color.set(liquidColorHex);
        mat.opacity = sourceVessel.liquidOpacity || 0.88;
      }
    } else if (streamMeshRef.current) {
      streamMeshRef.current.visible = false;
    }

    // 4. NOMINAL LOW-FLOW LIQUID PACKETS
    if (isDrippingRegime && flowRate > 0.01) {
      dropletSpawnTimer.current += dt * flowRate / NOMINAL_DROP_ML;
      dropletSpawnTimer.current = Math.min(MAX_DROPLETS, dropletSpawnTimer.current);
      while (dropletSpawnTimer.current >= 1.0) {
        dropletSpawnTimer.current -= 1.0;

        // Find available droplet slot
        const slot = droplets.current.find(d => !d.active);
        if (slot) {
          slot.active = true;
          slot.x = lipX;
          slot.y = lipY;
          slot.z = lipZ;
          slot.vx = v0x; slot.vy = v0y; slot.vz = v0z;
          slot.radius = liquidDropRadius(NOMINAL_DROP_ML);
          slot.hitsLiquid = landsInLiquid;
          slot.targetY = targetY;
          slot.color = liquidColorHex;
        }
      }
    }

    // Update active droplets
    if (dropletsMeshRef.current) {
      let activeCount = 0;
      for (let i = 0; i < MAX_DROPLETS; i++) {
        const d = droplets.current[i];
        if (d.active) {
          dropletsMeshRef.current.setColorAt(i, scratchColor.set(d.color));
          activeCount++;
          d.y += d.vy * dt - 0.5 * SCENE_GRAVITY * dt * dt;
          d.vy -= SCENE_GRAVITY * dt;
          d.x += d.vx * dt;
          d.z += d.vz * dt;

          if (d.y <= d.targetY) {
            d.active = false;
            scratchPos.set(0, -9999, 0);
            scratchScale.set(0, 0, 0);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            dropletsMeshRef.current.setMatrixAt(i, scratchMat4);

            // Trigger micro-impact ripple
            if (d.hitsLiquid && rippleMeshRef.current) {
              rippleMeshRef.current.visible = true;
            }
          } else {
            scratchPos.set(d.x, d.y, d.z);
            const sy = Math.max(1.0, Math.min(2, 1.0 + Math.abs(d.vy) * METERS_PER_SCENE_UNIT * 1.5));
            const sx = 1.0 / Math.sqrt(sy);
            scratchScale.set(d.radius * sx, d.radius * sy, d.radius * sx);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
          }
        }
      }
      dropletsMeshRef.current.instanceMatrix.needsUpdate = true;
      if (dropletsMeshRef.current.instanceColor) dropletsMeshRef.current.instanceColor.needsUpdate = true;
      dropletsMeshRef.current.visible = activeCount > 0;
    }

    // 5. CONCENTRIC IMPACT RIPPLES ON RECIPIENT LIQUID SURFACE
    if (rippleMeshRef.current) {
      const isImpacting = landsInLiquid && (flowRate > 0.05 || droplets.current.some(d => d.active && Math.abs(d.y - targetY) < 0.1));
      if (isImpacting) {
        rippleMeshRef.current.visible = true;
        rippleMeshRef.current.position.set(targetX, targetY + 0.004, targetZ);

        const rippleFreq = flowRate > 5.0 ? 22 : 14;
        const pulse = 0.5 + 0.5 * Math.sin(time * rippleFreq);
        const rMax = targetMouthR * Math.min(0.85, 0.35 + flowRate * 0.04);
        const currentR = rMax * (0.65 + 0.35 * pulse);

        rippleMeshRef.current.scale.set(currentR, currentR, 1);
        const mat = rippleMeshRef.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.color.set(liquidColorHex);
          mat.opacity = Math.min(0.75, 0.35 + flowRate * 0.04);
        }
      } else {
        rippleMeshRef.current.visible = false;
      }
    }

    if (secondaryRippleRef.current && rippleMeshRef.current?.visible) {
      secondaryRippleRef.current.visible = true;
      secondaryRippleRef.current.position.set(targetX, targetY + 0.003, targetZ);
      const pulse2 = 0.5 + 0.5 * Math.sin(time * 18 - 1.2);
      const r2 = targetMouthR * 0.6 * (0.5 + 0.5 * pulse2);
      secondaryRippleRef.current.scale.set(r2, r2, 1);
      const mat2 = secondaryRippleRef.current.material as THREE.MeshBasicMaterial;
      if (mat2) {
        mat2.color.set(liquidColorHex);
        mat2.opacity = 0.35 * pulse2;
      }
    } else if (secondaryRippleRef.current) {
      secondaryRippleRef.current.visible = false;
    }
  });

  return (
    <group name="physical_pour_stream_system">
      <PourTransitRenderer />
      {/* 1. Continuous Hydrodynamic Stream Column */}
      <mesh
        ref={streamMeshRef}
        geometry={streamGeometry}
        frustumCulled={false}
        visible={false}
        renderOrder={6}
      >
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.06}
          metalness={0.02}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          transmission={0.45}
          ior={1.333}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Instanced low-flow liquid packets */}
      <instancedMesh
        ref={dropletsMeshRef}
        args={[undefined, undefined, MAX_DROPLETS]}
        frustumCulled={false}
        visible={false}
        renderOrder={6}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.08}
          clearcoat={0.9}
          transmission={0.4}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 3. Primary Surface Impact Ripple Ring */}
      <mesh
        ref={rippleMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        renderOrder={5}
      >
        <ringGeometry args={[0.55, 1.0, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.65}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Secondary Outward Wave Ring */}
      <mesh
        ref={secondaryRippleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        renderOrder={5}
      >
        <ringGeometry args={[0.7, 1.0, 24]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});
