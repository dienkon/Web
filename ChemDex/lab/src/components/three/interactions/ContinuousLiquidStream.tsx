import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ContinuousLiquidStreamProps {
  fromPos: [number, number, number];
  toPos: [number, number, number];
  color: string;
  flowRate: number; // mL/s
  thickness?: number;
  active: boolean;
}

// Pre-allocated reusable module vectors to avoid GC allocations in useFrame
const _streamStart = new THREE.Vector3();
const _streamEnd = new THREE.Vector3();
const _streamMid = new THREE.Vector3();
const _streamLerp = new THREE.Vector3();

export const ContinuousLiquidStream = React.memo(function ContinuousLiquidStream({
  fromPos,
  toPos,
  color,
  flowRate,
  thickness = 0.045,
  active,
}: ContinuousLiquidStreamProps) {
  const groupRef = useRef<THREE.Group>(null);
  const streamMeshRef = useRef<THREE.Mesh>(null);
  const splashInstancedRef = useRef<THREE.InstancedMesh>(null);
  const dropletInstancedRef = useRef<THREE.InstancedMesh>(null);
  const rippleMeshRef = useRef<THREE.Mesh>(null);

  const splashCount = 16;
  const dropletCount = 18;

  // Reusable object for InstancedMesh matrix updating
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-allocated particles data
  const splashParticles = useMemo(() => {
    return Array.from({ length: splashCount }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.06 + Math.random() * 0.22,
      speed: 0.9 + Math.random() * 1.5,
      yVel: 0.35 + Math.random() * 0.9,
      size: 0.02 + Math.random() * 0.025,
      life: Math.random(),
    }));
  }, [splashCount]);

  const streamDroplets = useMemo(() => {
    return Array.from({ length: dropletCount }).map(() => ({
      offsetAlong: Math.random(),
      lateralSpread: (Math.random() - 0.5) * 0.07,
      size: 0.018 + Math.random() * 0.022,
      speed: 1.6 + Math.random() * 1.6,
    }));
  }, [dropletCount]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (!active || flowRate <= 0.1) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;

    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Reuse pre-allocated vectors
    _streamStart.set(fromPos[0], fromPos[1], fromPos[2]);
    _streamEnd.set(toPos[0], toPos[1], toPos[2]);
    const distance = _streamStart.distanceTo(_streamEnd);

    if (streamMeshRef.current && distance > 0.1) {
      // Parabolic curvature interpolation: gravity sag increases with horizontal distance
      _streamMid.addVectors(_streamStart, _streamEnd).multiplyScalar(0.5);
      const horizDist = Math.hypot(_streamEnd.x - _streamStart.x, _streamEnd.z - _streamStart.z);
      _streamMid.y -= Math.min(0.25, horizDist * 0.09);

      streamMeshRef.current.position.copy(_streamMid);
      streamMeshRef.current.lookAt(_streamEnd);
      streamMeshRef.current.rotateX(Math.PI / 2);

      // Jet wobble & dynamic thickness based on flow rate (Rayleigh-Plateau contraction)
      const wobble = Math.sin(time * 30) * 0.004;
      const normalizedRate = Math.min(1.0, flowRate / 30);
      const streamRad = thickness * (0.65 + 0.35 * normalizedRate) + wobble;
      streamMeshRef.current.scale.set(streamRad, distance * 0.48, streamRad);
    }

    // Impact surface ripple pulsation
    if (rippleMeshRef.current) {
      const ripplePhase = (time * 6) % 1;
      const rScale = 0.08 + ripplePhase * 0.28;
      rippleMeshRef.current.position.set(toPos[0], toPos[1] + 0.01, toPos[2]);
      rippleMeshRef.current.scale.set(rScale, rScale, rScale);
      const mat = rippleMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = (1 - ripplePhase) * 0.55;
      }
    }

    // Update Splash droplets on target surface
    if (splashInstancedRef.current) {
      splashParticles.forEach((p, idx) => {
        p.life = (p.life + dt * p.speed) % 1.0;
        const currentDist = p.radius * p.life;
        const height = Math.sin(p.life * Math.PI) * 0.14 * p.yVel;

        const px = toPos[0] + Math.cos(p.angle) * currentDist;
        const py = toPos[1] + height;
        const pz = toPos[2] + Math.sin(p.angle) * currentDist;

        dummy.position.set(px, py, pz);
        const scale = p.size * (1 - p.life * 0.65);
        dummy.scale.setScalar(Math.max(0.001, scale));
        dummy.updateMatrix();
        splashInstancedRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      splashInstancedRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update airborne stream droplets with Rayleigh-Plateau breakup at lower half
    if (dropletInstancedRef.current) {
      streamDroplets.forEach((d, idx) => {
        d.offsetAlong = (d.offsetAlong + dt * d.speed) % 1.0;
        _streamLerp.lerpVectors(_streamStart, _streamEnd, d.offsetAlong);

        // Parabolic gravity droop along trajectory
        const arc = Math.sin(d.offsetAlong * Math.PI) * 0.08;
        _streamLerp.y -= arc;

        // Rayleigh-Plateau droplet spray width increases near bottom of stream
        const breakupSpread = d.offsetAlong > 0.5 ? (d.offsetAlong - 0.5) * 2.0 : 0.0;
        _streamLerp.x += (Math.sin(time * 16 + idx) * d.lateralSpread) * (1.0 + breakupSpread * 1.5);
        _streamLerp.z += (Math.cos(time * 16 + idx) * d.lateralSpread) * (1.0 + breakupSpread * 1.5);

        dummy.position.copy(_streamLerp);
        dummy.scale.setScalar(d.size * (1.0 + breakupSpread * 0.4));
        dummy.updateMatrix();
        dropletInstancedRef.current!.setMatrixAt(idx, dummy.matrix);
      });
      dropletInstancedRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central continuous fluid jet column */}
      <mesh ref={streamMeshRef}>
        <cylinderGeometry args={[1, 0.7, 1, 16, 8, true]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.82}
          roughness={0.06}
          transmission={0.4}
          ior={1.38}
          clearcoat={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Surface impact ripple ring */}
      <mesh ref={rippleMeshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.04, 0.08, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Instanced splashing crowns and airborne breakup droplets */}
      <instancedMesh ref={splashInstancedRef} args={[undefined, undefined, splashCount]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.88}
          roughness={0.08}
          clearcoat={0.9}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh ref={dropletInstancedRef} args={[undefined, undefined, dropletCount]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.88}
          roughness={0.08}
          clearcoat={0.9}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
});
