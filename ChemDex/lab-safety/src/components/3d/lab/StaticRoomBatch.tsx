import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildStaticGeometryBatch } from './staticGeometryBatch';

/** Batch immutable pieces relative to this group. Keep moving children in their
 * own local batch so drawers and stools retain their parent-driven motion. */
export function StaticRoomBatch({ children, id }: { children: React.ReactNode; id: string }) {
  const root = useRef<THREE.Group>(null);
  const ready = useRef(false);
  const cleanup = useRef<() => void>(() => {});
  const metadata = useMemo(() => ({ staticBatchRoot: true }), []);
  useLayoutEffect(() => {
    ready.current = false;
    return () => { cleanup.current(); cleanup.current = () => {}; };
  }, [id]);
  useFrame(() => {
    if (ready.current || !root.current?.children.length) return;
    ready.current = true;
    cleanup.current = buildStaticGeometryBatch(root.current, id);
  });
  return <group ref={root} name={`lab-static-${id}`} userData={metadata}>{children}</group>;
}
