import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SedimentBedState } from '../core/SimulationTypes';
import { useAppStore } from '../../store/useAppStore';
import { vesselInterior } from '../../science/vesselDimensions';
import { createSedimentGeometry } from '../effects/sedimentGeometry';
import { createClippedSedimentGeometry } from '../effects/clippedSedimentGeometry';

export interface SedimentMeshProps {
  vesselId: string;
  baseY: number;
  radius: number;
  sedimentBed?: SedimentBedState;
}

/**
 * 3D Physical sediment bed accumulating on the vessel floor
 */
export const SedimentMesh = React.memo(function SedimentMesh({
  vesselId,
  baseY,
  radius,
  sedimentBed
}: SedimentMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorObj = useRef(new THREE.Color('#f8fafc'));
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const geometryKey = useRef('');
  useEffect(() => () => geometryRef.current?.dispose(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const thickness = sedimentBed?.thickness || 0;
    const amount = sedimentBed?.amount_g || 0;

    if (amount <= 1e-9 || thickness <= 0) {
      meshRef.current.visible = false;
      return;
    }

    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || vessel.isShattered || vessel.volume_ml <= 0.2) { meshRef.current.visible = false; return; }
    const floor = vesselInterior(vessel.type).floorY;
    const plane = sedimentBed?.surfacePlane;
    const key = plane ? `${vessel.type}:${plane.normal.join(':')}:${plane.offset}` : `${vessel.type}:${thickness}`;
    if (key !== geometryKey.current) {
      const geometry = plane ? createClippedSedimentGeometry(vessel.type, plane) : createSedimentGeometry(vessel.type, floor + thickness);
      geometryRef.current?.dispose();
      geometryRef.current = geometry;
      meshRef.current.geometry = geometry;
      geometryKey.current = key;
    }
    meshRef.current.visible = true;

    if (sedimentBed?.color) {
      colorObj.current.set(sedimentBed.color);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.copy(colorObj.current);
        mat.roughness = sedimentBed.roughness ?? 0.85;
        mat.metalness = sedimentBed.metalness ?? 0;
      }
    }
  });

  return (
    <mesh ref={meshRef} name={`sediment_bed_${vesselId}`} visible={false} renderOrder={3}>
      <meshStandardMaterial
        color="#f8fafc"
        roughness={0.85}
        metalness={0.08}
        transparent
        opacity={0.96}
        depthWrite={false}
      />
    </mesh>
  );
});
