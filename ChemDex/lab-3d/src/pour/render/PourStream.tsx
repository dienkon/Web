import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PourController } from '../controller/PourController';
import { useAppStore } from '../../store/useAppStore';
import { getVesselProfile } from '../physics/profiles';
import { pourAudio } from '../audio/PourAudio';

/**
 * World-space Laminar Flow Stream linking pouring vessel spout to recipient surface.
 */
export const PourStream = React.memo(function PourStream() {
  const streamMeshRef = useRef<THREE.Mesh>(null);
  const rippleMeshRef = useRef<THREE.Mesh>(null);
  const wasStreamingRef = useRef(false);

  useFrame((state) => {
    const session = PourController.getSession();
    const time = state.clock.getElapsedTime();

    if (!session || session.flow_ml_s <= 0.05 || !session.targetId) {
      if (streamMeshRef.current) streamMeshRef.current.visible = false;
      if (rippleMeshRef.current) rippleMeshRef.current.visible = false;
      if (wasStreamingRef.current) {
        pourAudio.stopPourStream();
        wasStreamingRef.current = false;
      }
      return;
    }

    const store = useAppStore.getState();
    const sourceVessel = store.vessels[session.sourceId];
    const targetVessel = store.vessels[session.targetId];

    if (!sourceVessel || !targetVessel) {
      if (streamMeshRef.current) streamMeshRef.current.visible = false;
      if (rippleMeshRef.current) rippleMeshRef.current.visible = false;
      return;
    }

    const srcProfile = getVesselProfile(sourceVessel.type);
    const tgtProfile = getVesselProfile(targetVessel.type);

    // Audio acoustic feedback
    const fillRatio = targetVessel.volume_ml / targetVessel.capacity_ml;
    if (!wasStreamingRef.current) {
      pourAudio.startPourStream(320 + fillRatio * 600);
      wasStreamingRef.current = true;
    } else {
      pourAudio.updateFillRatio(fillRatio, session.flow_ml_s);
    }

    // World coordinates of source lip
    const theta = -session.tilt;
    const lipLocal = srcProfile.lipLocal;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const lipX = sourceVessel.position[0] + (lipLocal[0] * cosT - lipLocal[1] * sinT);
    const lipY = sourceVessel.position[1] + (lipLocal[0] * sinT + lipLocal[1] * cosT);
    const lipZ = sourceVessel.position[2];

    // World coordinates of target surface
    const tgtX = targetVessel.position[0];
    const tgtZ = targetVessel.position[2];
    const volFrac = Math.max(0.06, Math.min(0.95, targetVessel.volume_ml / targetVessel.capacity_ml));
    const tgtLiquidSurfaceY = targetVessel.position[1] - 0.92 + volFrac * (tgtProfile.lipLocal[1] + 0.8);

    const dx = tgtX - lipX;
    const dy = tgtLiquidSurfaceY - lipY;
    const streamLength = Math.hypot(dx, dy);
    const midX = (lipX + tgtX) / 2;
    const midY = (lipY + tgtLiquidSurfaceY) / 2;
    const streamAngle = Math.atan2(dx, -dy);

    // Fluid thickness and wobble
    const streamWidth = Math.max(0.6, Math.min(1.8, session.flow_ml_s / 12));
    const wobble = Math.sin(time * 28) * 0.005;

    if (streamMeshRef.current) {
      streamMeshRef.current.visible = true;
      streamMeshRef.current.position.set(midX, midY, lipZ);
      streamMeshRef.current.rotation.z = streamAngle;
      streamMeshRef.current.scale.set(streamWidth + wobble, streamLength, streamWidth + wobble);
      const mat = streamMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.set(sourceVessel.liquidColor || '#38bdf8');
      }
    }

    // Impact ripple
    if (rippleMeshRef.current) {
      rippleMeshRef.current.visible = true;
      rippleMeshRef.current.position.set(tgtX, tgtLiquidSurfaceY + 0.005, tgtZ);
      const rippleRadius = tgtProfile.mouthR * (0.35 + Math.sin(time * 16) * 0.08);
      rippleMeshRef.current.scale.set(rippleRadius, rippleRadius, 1);
      const mat = rippleMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.color.set(sourceVessel.liquidColor || '#38bdf8');
      }
    }
  });

  return (
    <group>
      {/* Stream Cylinder Mesh */}
      <mesh ref={streamMeshRef} visible={false} renderOrder={4}>
        <cylinderGeometry args={[0.048, 0.03, 1.0, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.88}
          roughness={0.08}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>

      {/* Surface Impact Ripple Ring */}
      <mesh ref={rippleMeshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={4}>
        <ringGeometry args={[0.6, 1.0, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.65}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});
