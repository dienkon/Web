import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { useAppStore } from '../../store/useAppStore';
import { vesselContours } from '../../science/vesselContours';
import { vesselInterior } from '../../science/vesselDimensions';
import { vesselBodyTransform } from '../../science/vesselScale';
import { WALL_CONTACT_ANGLE, wallDropCap, wallSurfaceFrame } from '../../science/wallDropletGeometry';

/** Read-only projection of engine-owned finite beads. A spherical cap sits on
 * the local wall tangent plane; there is no modulo animation or drainage here. */
export const WallCondensateDroplets = React.memo(function WallCondensateDroplets({ vessel }: { vessel: VesselState }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const geometry = useMemo(() => {
    const cap = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, WALL_CONTACT_ANGLE);
    cap.translate(0, -Math.cos(WALL_CONTACT_ANGLE), 0);
    cap.rotateX(Math.PI / 2);
    return cap;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!mesh.current) return;
    const live = useAppStore.getState().vessels[vessel.id];
    if (!live || live.isShattered) { mesh.current.visible = false; return; }
    let count = 0;
    for (const side of ['inner', 'outer'] as const) {
      const beads = side === 'inner' ? live.wallCondensation?.innerBeads : live.wallCondensation?.outerBeads;
      const points = side === 'inner' ? vesselInterior(live.type).points : vesselContours(live.type).outer;
      for (const bead of beads ?? []) {
        if (!(bead.mass_g > 1e-12) || count >= 96) continue;
        const frame = wallSurfaceFrame(points, bead.y, bead.theta);
        normal.fromArray(frame.normal).multiplyScalar(side === 'inner' ? -1 : 1);
        scratch.position.fromArray(frame.position).addScaledVector(normal, 0.0001);
        scratch.quaternion.setFromUnitVectors(zAxis, normal);
        scratch.scale.setScalar(wallDropCap(bead.mass_g).radius_m / vesselBodyTransform(live).metersPerLocalUnit);
        scratch.updateMatrix();
        mesh.current.setMatrixAt(count++, scratch.matrix);
      }
    }
    mesh.current.count = count;
    mesh.current.visible = count > 0;
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 96]} geometry={geometry} frustumCulled={false} renderOrder={5}>
    <meshPhysicalMaterial color="#e8f5ff" roughness={0.07} transmission={0.9} ior={1.333}
      transparent opacity={0.8} depthWrite={false} clearcoat={1} />
  </instancedMesh>;
});
