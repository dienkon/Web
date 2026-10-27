import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_ACTIVE_SHARDS, shardManager } from '../../damage/Shards';
import { simulationFrameDt } from '../../core/clock';
import { useAppStore } from '../../store/useAppStore';

/**
 * ShardsRenderer Component (K4.2 & K4.4)
 * Renders illustrative tetrahedral glass glyphs resulting from drop impact,
 * thermal shock, or overpressure shattering on the laboratory bench.
 */
export const ShardsRenderer = React.memo(function ShardsRenderer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const renderedSourceIds = useRef<string[]>([]);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const vertex = useMemo(() => new THREE.Vector3(), []);

  // Irregular sharp shard geometry
  const shardGeom = useMemo(() => {
    return new THREE.TetrahedronGeometry(1.0, 0);
  }, []);

  useFrame((_, delta) => {
    // Tick physical trajectory for all active flying / bouncing shards
    if (shardManager.update(simulationFrameDt(delta, useAppStore.getState()))) {
      useAppStore.getState().checkpointGlassDebris();
    }

    if (!meshRef.current) return;
    const shards = shardManager.getShards();
    const count = shards.length;
    renderedSourceIds.current = shards.map(s => s.sourceVesselId);
    meshRef.current.count = count;
    meshRef.current.boundingSphere = null;

    for (let i = 0; i < MAX_ACTIVE_SHARDS; i++) {
      if (i < count) {
        const s = shards[i];
        pos.set(...s.position);
        euler.set(...s.rotation);
        quat.setFromEuler(euler);
        const sSize = s.size || 0.05;
        scale.set(sSize, sSize * 0.4, sSize * 1.4); // Flake/splinter shape
        // The trajectory tracks the glyph's lower support. Offset its center
        // by the actual rotated mesh extent so settled glass does not clip.
        let minY = Infinity;
        const vertices = shardGeom.getAttribute('position');
        for (let j = 0; j < vertices.count; j++) {
          vertex.fromBufferAttribute(vertices, j).multiply(scale).applyQuaternion(quat);
          minY = Math.min(minY, vertex.y);
        }
        pos.y -= minY;
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
      args={[shardGeom, undefined, MAX_ACTIVE_SHARDS]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onClick={e => {
        const sourceId = e.instanceId === undefined ? undefined : renderedSourceIds.current[e.instanceId];
        if (sourceId && useAppStore.getState().vessels[sourceId]) {
          e.stopPropagation();
          useAppStore.getState().openVesselInfo(sourceId);
        }
      }}
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
