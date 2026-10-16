import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { findChemical } from '../../data/chemicals';
import type { SpillState } from '../../types/chemistry';

/** A bounded, static instanced deposit; no perpetual particle emitter or per-frame allocation. */
export function SpilledSolids({ spill }: { spill: SpillState }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const grains = useMemo(() => {
    const solids = (spill.contents ?? []).filter(item => item.mass_g > 0
      && (item.phase === 's' || item.state === 's' || item.state === 'solid'));
    const mass = solids.reduce((sum, item) => sum + item.mass_g, 0);
    const dryUnspecifiedMass = spill.volume_ml === 0 && !spill.contents?.length ? spill.mass_g : 0;
    const total = mass || dryUnspecifiedMass;
    if (total <= 0) return [];
    const count = Math.min(96, Math.max(6, Math.ceil(Math.sqrt(total) * 20)));
    const radius = Math.max(0.04, spill.radius * 0.75);
    return Array.from({ length: count }, (_, i) => {
      const fraction = (i + 0.5) / count;
      const angle = i * 2.399963229728653;
      const distance = radius * Math.sqrt(fraction);
      const size = Math.min(0.055, Math.max(0.006, Math.cbrt(total / count) * 0.035));
      let entry = solids[0], accumulated = 0;
      for (const solid of solids) {
        accumulated += solid.mass_g;
        if (accumulated >= fraction * mass) { entry = solid; break; }
      }
      return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, size,
        color: entry ? findChemical(entry.formula).color : spill.color };
    });
  }, [spill.contents, spill.mass_g, spill.volume_ml, spill.radius, spill.color]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < grains.length; i++) {
      const grain = grains[i];
      transform.position.set(grain.x, grain.size * 0.55 + 0.002, grain.z);
      transform.rotation.set(i * 0.7, i * 1.3, i * 0.4);
      transform.scale.set(grain.size, grain.size * 0.6, grain.size);
      transform.updateMatrix();
      mesh.current.setMatrixAt(i, transform.matrix);
      mesh.current.setColorAt(i, color.set(grain.color || '#cbd5e1'));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [grains]);
  if (!grains.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, grains.length]} receiveShadow>
    <dodecahedronGeometry args={[1, 0]} />
    <meshStandardMaterial roughness={0.8} />
  </instancedMesh>;
}
