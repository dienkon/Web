import React, { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SpillState } from '../../types/chemistry';
import type { SessileDropShape } from '../../science/sessileDrop';
import { createSodiumMotion, stepSodiumMotion } from '../../science/sodiumMotion';
import { spillSodiumBody } from '../../vfx/geometry/spillSodium';
import { applySodiumPelletShape } from '../../vfx/geometry/sodiumPellet';
import { useAppStore } from '../../store/useAppStore';
import { simulationFrameDt } from '../../core/clock';

export interface SpillSodiumContactPoint { active: boolean; x: number; y: number; z: number; radius: number }

/** Read-only metal, motion and contact anchor. Chemistry owns every gram. */
export function SpilledSodium({ spill, drop, airSpeed_m_s, contact }: { spill: SpillState; drop: SessileDropShape | null;
  airSpeed_m_s: number; contact: MutableRefObject<SpillSodiumContactPoint> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const motion = useRef(createSodiumMotion(spill.id));
  useEffect(() => () => { geometry.dispose(); contact.current.active = false; }, [geometry, contact]);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    const dt = simulationFrameDt(delta, useAppStore.getState());
    const before = spillSodiumBody(spill, drop, motion.current.x, motion.current.z, airSpeed_m_s);
    if (before.active && spill.sodiumContact?.regime !== 'disruptive')
      stepSodiumMotion(motion.current, dt, before.boundary, 0.6 + before.melt * 0.5);
    const body = spillSodiumBody(spill, drop, motion.current.x, motion.current.z, airSpeed_m_s);
    motion.current.x = body.x; motion.current.z = body.z;
    mesh.current.visible = body.mass_g > 1e-10;
    mesh.current.position.set(body.x, body.centerY, body.z);
    mesh.current.scale.setScalar(body.radius);
    if (body.active) mesh.current.rotation.y += dt * (1 + body.melt * 4);
    applySodiumPelletShape(geometry, body.shape);
    (mesh.current.material as THREE.MeshStandardMaterial).roughness = 0.32 - body.melt * 0.23;
    Object.assign(contact.current, { active: body.active, x: body.x, y: body.surface, z: body.z, radius: body.horizontalRadius });
  });
  return <mesh name={`spill-sodium:${spill.id}`} ref={mesh} geometry={geometry} visible={false} castShadow receiveShadow>
    <meshStandardMaterial color="#d1d5db" metalness={0.82} roughness={0.32} />
  </mesh>;
}
