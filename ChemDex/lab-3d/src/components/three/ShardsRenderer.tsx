import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shardManager, ShardInstance } from '../../damage/Shards';

/**
 * ShardsRenderer Component (K4.2 & K4.4)
 * Renders Voronoi physical broken glass shards resulting from drop impact,
 * thermal shock, or overpressure shattering on the laboratory bench.
 */
export const ShardsRenderer = React.memo(function ShardsRenderer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  // Irregular sharp shard geometry
  const shardGeom = useMemo(() => {
    return new THREE.TetrahedronGeometry(1.0, 0);
  }, []);

  useFrame((_, delta) => {
    // Tick physical trajectory for all active flying / bouncing shards
    shardManager.update(delta);

    if (!meshRef.current) return;
    const shards = shardManager.getShards();
    const count = shards.length;

    for (let i = 0; i < 600; i++) {
      if (i < count) {
        const s = shards[i];
        pos.set(...s.position);
        euler.set(...s.rotation);
        quat.setFromEuler(euler);
        const sSize = s.size || 0.05;
        scale.set(sSize, sSize * 0.4, sSize * 1.4); // Flake/splinter shape
        matrix.compose(pos, quat, scale);
      } else {
        // Hide unused instances below bench
        pos.set(0, -999, 0);
        scale.set(0, 0, 0);
        matrix.compose(pos, quat, scale);
      }
      meshRef.current.setMatrixAt(i, matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[shardGeom, undefined, 600]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color="#e2e8f0"
        transmission={0.92}
        opacity={0.85}
        roughness={0.12}
        ior={1.52}
        transparent
        depthWrite={false}
      />
    </instancedMesh>
  );
});
