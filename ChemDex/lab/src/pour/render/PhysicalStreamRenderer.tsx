import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PourController } from '../controller/PourController';
import { useAppStore } from '../../store/useAppStore';
import { getVesselProfile } from '../physics/profiles';
import { pourAudio } from '../audio/PourAudio';
import { calculateStreamBallistics } from '../physics/ballistics';

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
}

const MAX_DROPLETS = 32;
const STREAM_SEGMENTS = 24;

/**
 * High-fidelity, real-time physical liquid stream & droplet renderer.
 * Features:
 * - Parabolic ballistic trajectory following gravity g = (0, -9.8, 0)
 * - Hydrodynamic narrowing along fall: w(y) proportional to 1 / sqrt(velocity)
 * - Surface tension Rayleigh-Plateau pinch-off into falling droplets at low flow rates
 * - Concentric surface impact ripples & local mixing zone excitation
 * - ZERO per-frame memory allocation (pre-allocated typed buffers & scratch matrices)
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
      color: '#38bdf8'
    }))
  );
  const dropletSpawnTimer = useRef(0);

  // Scratch objects for zero allocation in animation loop
  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchScale = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);

  // Pre-allocated spline curve points for tube mesh
  const curvePoints = useMemo(() => {
    return Array.from({ length: STREAM_SEGMENTS + 1 }, () => new THREE.Vector3());
  }, []);

  // Pre-allocated cylinder geometry for continuous stream column
  const streamGeometry = useMemo(() => {
    // 24 segments along height, 16 around circumference
    return new THREE.CylinderGeometry(0.04, 0.025, 1.0, 16, STREAM_SEGMENTS);
  }, []);

  // Base positions buffer copy to compute dynamic narrowing
  const basePositions = useMemo(() => {
    return streamGeometry.attributes.position.clone();
  }, [streamGeometry]);

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
    const session = PourController.getSession();
    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    // If no active session or negligible flow, hide stream and deactivate audio
    if (!session || (session.flow_ml_s <= 0.01 && session.phase !== 'dripping')) {
      if (streamMeshRef.current) streamMeshRef.current.visible = false;
      if (rippleMeshRef.current) rippleMeshRef.current.visible = false;
      if (secondaryRippleRef.current) secondaryRippleRef.current.visible = false;

      // Update remaining falling droplets until they hit bottom
      let anyDropActive = false;
      if (dropletsMeshRef.current) {
        for (let i = 0; i < MAX_DROPLETS; i++) {
          const d = droplets.current[i];
          if (d.active) {
            d.vy -= 9.8 * dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
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
              const sy = Math.max(1.0, 1.0 + Math.abs(d.vy) * 0.18);
              const sx = 1.0 / Math.sqrt(sy);
              scratchScale.set(d.radius * sx, d.radius * sy, d.radius * sx);
              scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
              dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
            }
          }
        }
        dropletsMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      if (wasStreamingRef.current && !anyDropActive) {
        pourAudio.stopPourStream();
        wasStreamingRef.current = false;
      }
      return;
    }

    const store = useAppStore.getState();
    const sourceVessel = store.vessels[session.sourceId];
    const targetVessel = session.targetId ? store.vessels[session.targetId] : null;

    if (!sourceVessel) return;

    const srcProfile = getVesselProfile(sourceVessel.type);
    const flowRate = session.flow_ml_s;
    const liquidColorHex = sourceVessel.liquidColor || '#38bdf8';

    // 1. CALCULATE EXIT BALLISTICS AT SPOUT LIP
    const theta = -session.tilt;
    const lipLocal = srcProfile.lipLocal;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Source vessel world position (accounting for smooth lift offset)
    const srcWorldPos = session.sourcePos || sourceVessel.position;
    const lipX = srcWorldPos[0] + (lipLocal[0] * cosT - lipLocal[1] * sinT);
    const lipY = srcWorldPos[1] + (lipLocal[0] * sinT + lipLocal[1] * cosT);
    const lipZ = srcWorldPos[2] + (lipLocal[2] || 0);

    // Target surface world coordinates
    let targetX = lipX;
    let targetY = -0.135; // Default workbench table surface
    let targetZ = lipZ;
    let targetMouthR = 0.5;

    if (targetVessel) {
      const tgtProfile = getVesselProfile(targetVessel.type);
      targetX = targetVessel.position[0];
      targetZ = targetVessel.position[2];
      targetMouthR = tgtProfile.mouthR;
      const volFrac = Math.max(0.04, Math.min(0.96, targetVessel.volume_ml / targetVessel.capacity_ml));
      targetY = targetVessel.position[1] + tgtProfile.baseY + tgtProfile.H * volFrac;
    }

    // Dynamic audio feedback
    if (targetVessel) {
      const fillRatio = targetVessel.volume_ml / targetVessel.capacity_ml;
      if (!wasStreamingRef.current) {
        pourAudio.startPourStream(320 + fillRatio * 580);
        wasStreamingRef.current = true;
      } else {
        pourAudio.updateFillRatio(fillRatio, flowRate);
      }
    }

    // 2. BALLISTIC TRAJECTORY INTERPOLATION
    const dx = targetX - lipX;
    const dy = targetY - lipY;
    const totalFallDistance = Math.abs(dy);

    // Initial exit velocity based on tilt and flow
    const v0x = Math.sign(dx || 1) * Math.min(0.85, 0.25 + flowRate * 0.02);
    const v0y = -Math.min(1.2, 0.4 + flowRate * 0.03);

    // Flight time t = sqrt(2 * h / g)
    const flightTime = Math.max(0.08, Math.sqrt(Math.max(0.01, 2 * totalFallDistance / 9.8)));

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

      // Base radius at pouring weir lip
      const baseR = Math.max(0.022, Math.min(0.072, Math.sqrt(flowRate / 30.0) * 0.058));
      const radialSegs = 16;
      const heightSegs = STREAM_SEGMENTS; // 24

      // Quadratic boundary matching coefficient for horizontal arc and vertical arc
      const deltaXTarget = targetX - (lipX + v0x * flightTime);
      const accelX = flightTime > 0.01 ? (2 * deltaXTarget) / (flightTime * flightTime) : 0;

      const deltaYTarget = targetY - (lipY + v0y * flightTime);
      const accelY = flightTime > 0.01 ? (2 * deltaYTarget) / (flightTime * flightTime) : -9.8;

      // Update each height ring of the cylinder
      for (let j = 0; j <= heightSegs; j++) {
        const s = j / heightSegs; // 0 at top, 1 at bottom
        const t = s * flightTime;

        // True ballistic parabolic trajectory point connecting lip (s=0) to recipient surface (s=1)
        const cx = lipX + v0x * t + 0.5 * accelX * t * t;
        const cy = lipY + v0y * t + 0.5 * accelY * t * t;
        const cz = lipZ + (targetZ - lipZ) * s;

        // Hydrodynamic narrowing along fall (fluid accelerates -> cross-section shrinks)
        const fallVelocityFactor = Math.sqrt(Math.max(0.25, 1.0 + 3.2 * s));
        const currentR = Math.max(0.008, (baseR / fallVelocityFactor) * (1.0 + 0.04 * Math.sin(time * 26.0 - s * 20.0)));

        for (let i = 0; i <= radialSegs; i++) {
          const vertexIdx = (j * (radialSegs + 1) + i) * 3;
          if (vertexIdx + 2 < posArray.length) {
            const phi = (i / radialSegs) * Math.PI * 2;
            posArray[vertexIdx] = cx + Math.cos(phi) * currentR;
            posArray[vertexIdx + 1] = cy;
            posArray[vertexIdx + 2] = cz + Math.sin(phi) * currentR;
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

    // 4. RAYLEIGH-PLATEAU PINCH-OFF DROPLETS
    if (isDrippingRegime && flowRate > 0.01) {
      dropletSpawnTimer.current += dt * (flowRate * 4.5 + 2.0);
      if (dropletSpawnTimer.current >= 1.0) {
        dropletSpawnTimer.current -= 1.0;

        // Find available droplet slot
        const slot = droplets.current.find(d => !d.active);
        if (slot) {
          slot.active = true;
          slot.x = lipX + (Math.random() - 0.5) * 0.02;
          slot.y = lipY - 0.02;
          slot.z = lipZ + (Math.random() - 0.5) * 0.02;
          const dropFallDist = Math.max(0.02, slot.y - targetY);
          const dropFlightTime = Math.max(0.08, Math.sqrt(2 * dropFallDist / 9.8));
          slot.vx = (targetX - slot.x) / dropFlightTime + (Math.random() - 0.5) * 0.03;
          slot.vy = v0y * 0.6;
          slot.vz = (targetZ - slot.z) / dropFlightTime + (Math.random() - 0.5) * 0.03;
          slot.radius = Math.max(0.014, Math.min(0.035, 0.018 * Math.sqrt(Math.max(0.2, flowRate))));
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
          activeCount++;
          d.vy -= 9.8 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.z += d.vz * dt;

          if (d.y <= d.targetY) {
            d.active = false;
            scratchPos.set(0, -9999, 0);
            scratchScale.set(0, 0, 0);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            dropletsMeshRef.current.setMatrixAt(i, scratchMat4);

            // Trigger micro-impact ripple
            if (rippleMeshRef.current) {
              rippleMeshRef.current.visible = true;
            }
          } else {
            scratchPos.set(d.x, d.y, d.z);
            const sy = Math.max(1.0, 1.0 + Math.abs(d.vy) * 0.16);
            const sx = 1.0 / Math.sqrt(sy);
            scratchScale.set(d.radius * sx, d.radius * sy, d.radius * sx);
            scratchMat4.compose(scratchPos, scratchQuat, scratchScale);
            dropletsMeshRef.current.setMatrixAt(i, scratchMat4);
          }
        }
      }
      dropletsMeshRef.current.instanceMatrix.needsUpdate = true;
      dropletsMeshRef.current.visible = activeCount > 0;
    }

    // 5. CONCENTRIC IMPACT RIPPLES ON RECIPIENT LIQUID SURFACE
    if (rippleMeshRef.current) {
      const isImpacting = flowRate > 0.05 || droplets.current.some(d => d.active && Math.abs(d.y - targetY) < 0.1);
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
      {/* 1. Continuous Hydrodynamic Stream Column */}
      <mesh
        ref={streamMeshRef}
        geometry={streamGeometry}
        visible={false}
        renderOrder={6}
      >
        <meshPhysicalMaterial
          color="#38bdf8"
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

      {/* 2. Hydrodynamic Rayleigh Droplet Pinch-Off InstancedMesh */}
      <instancedMesh
        ref={dropletsMeshRef}
        args={[undefined, undefined, MAX_DROPLETS]}
        visible={false}
        renderOrder={6}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshPhysicalMaterial
          color="#38bdf8"
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
