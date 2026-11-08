import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { SpillState } from '../../types/chemistry';
import { stockGeometry } from '../../physical/stockAdapter';
import { getSolidMorphology, findChemical } from '../../data/chemicals';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { METERS_PER_SCENE_UNIT, siPointToScene } from '../../science/sceneUnits';
import { presentedStockPose } from '../../physical/stockPresentation';

export function StockSpillGrain({ spill }: { spill: SpillState }) {
  const mesh = useRef<Mesh>(null);
  const p = spill.stockMotion!, material = stockSolidMaterial(findChemical(p.formula), getSolidMorphology(p.formula));
  useFrame(() => {
    if (!mesh.current) return;
    const pose = presentedStockPose(p); mesh.current.position.fromArray(siPointToScene(pose.position_m)); mesh.current.quaternion.fromArray(pose.rotation);
  });
  return <mesh ref={mesh} name={`escaped_${p.id}`} position={siPointToScene(p.position_m)} quaternion={p.rotation}
    scale={p.scale_m / METERS_PER_SCENE_UNIT} geometry={stockGeometry(p.formula)} castShadow receiveShadow>
    <meshPhysicalMaterial color={material.color} roughness={material.roughness} metalness={material.metalness}
      specularIntensity={material.specularIntensity} flatShading={material.flatShading} />
  </mesh>;
}
