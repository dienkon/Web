import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  isDischarging: boolean;
}

const PARTICLE_COUNT = 120;

export const ExtinguisherStream: React.FC<Props> = ({ isDischarging }) => {
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  // Particle data arrays
  const { positions, velocities, lifetimes, maxLifetimes, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const life = new Float32Array(PARTICLE_COUNT);
    const maxLife = new Float32Array(PARTICLE_COUNT);
    const sz = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Start inactive
      life[i] = 1.0;
      maxLife[i] = 0.4 + Math.random() * 0.3; // short fast bursts
      sz[i] = 0.08 + Math.random() * 0.12;
      pos[i * 3] = 0;
      pos[i * 3 + 1] = -100; // hidden
      pos[i * 3 + 2] = 0;
    }

    return {
      positions: pos,
      velocities: vel,
      lifetimes: life,
      maxLifetimes: maxLife,
      sizes: sz,
    };
  }, []);

  // Frame update: spawn and advance particles
  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;

    // Camera forward and right vectors
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Muzzle origin in front-right of camera (where extinguisher horn is)
    const muzzlePos = camera.position
      .clone()
      .add(fwd.clone().multiplyScalar(0.45))
      .add(right.clone().multiplyScalar(0.12))
      .add(up.clone().multiplyScalar(-0.14));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      lifetimes[i] += delta;

      if (lifetimes[i] >= maxLifetimes[i]) {
        if (isDischarging) {
          // Re-spawn particle from muzzle
          lifetimes[i] = 0;
          positions[i * 3] = muzzlePos.x + (Math.random() - 0.5) * 0.04;
          positions[i * 3 + 1] = muzzlePos.y + (Math.random() - 0.5) * 0.04;
          positions[i * 3 + 2] = muzzlePos.z + (Math.random() - 0.5) * 0.04;

          // Velocity: high speed cone forward
          const spreadX = (Math.random() - 0.5) * 0.45;
          const spreadY = (Math.random() - 0.5) * 0.35;
          const speed = 7.5 + Math.random() * 3.5;

          const pVel = fwd
            .clone()
            .multiplyScalar(speed)
            .add(right.clone().multiplyScalar(spreadX * speed * 0.3))
            .add(up.clone().multiplyScalar(spreadY * speed * 0.3));

          velocities[i * 3] = pVel.x;
          velocities[i * 3 + 1] = pVel.y;
          velocities[i * 3 + 2] = pVel.z;
        } else {
          // Hide particle
          positions[i * 3 + 1] = -100;
        }
      } else {
        // Move existing particle
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.22}
        color="#F8FAFC"
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
