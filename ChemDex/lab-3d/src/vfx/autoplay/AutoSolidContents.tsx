import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AutoExperiment } from './AutoExperiment';
import { autoSolid, solidFlightPosition } from './autoSolid';

function useSolidMaterial(formula: string) {
  const material = useMemo(() => new THREE.MeshPhysicalMaterial(autoSolid(formula).material), [formula]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function AutoSolidDonor({ experiment: e, index }: { experiment: AutoExperiment; index: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null), donor = e.donors[index];
  const solid = autoSolid(donor.row.formula), material = useSolidMaterial(donor.row.formula);
  useFrame(() => {
    if (!mesh.current || !donor.solid) return;
    let count = 0;
    for (let i = donor.solid.released; i < donor.solid.pieces.length; i++) mesh.current.setMatrixAt(count++, donor.solid.pieces[i]);
    mesh.current.count = count; mesh.current.visible = count > 0;
    if (count) mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name={`auto_donor_solid_${index}`} args={[solid.geometry, material, Math.max(1, donor.solid?.pieces.length ?? 0)]}
    count={0} frustumCulled={false} dispose={null} />;
}

export function AutoSolidFlights({ experiment: e, index }: { experiment: AutoExperiment; index: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null), donor = e.donors[index];
  const solid = autoSolid(donor.row.formula), material = useSolidMaterial(donor.row.formula);
  const object = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!mesh.current || !donor.solid) return;
    let count = 0;
    if (e.donorIndex === index && e.phase === 'dose') for (const flight of donor.solid.flights) {
      if (flight.arrived) continue;
      solidFlightPosition(flight, e.phaseTime, object.position);
      object.quaternion.copy(flight.rotation); object.scale.setScalar(flight.scale); object.updateMatrix();
      mesh.current.setMatrixAt(count++, object.matrix);
    }
    mesh.current.count = count; mesh.current.visible = count > 0;
    if (count) mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} name={`auto_transfer_solid_${index}`} args={[solid.geometry, material, Math.max(1, donor.solid?.pieces.length ?? 0)]}
    count={0} frustumCulled={false} dispose={null} />;
}
