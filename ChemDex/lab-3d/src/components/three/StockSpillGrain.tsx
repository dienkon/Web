import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3, type Mesh } from 'three';
import type { SpillState, VesselState } from '../../types/chemistry';
import { stockGeometry } from '../../physical/stockAdapter';
import { getSolidMorphology, findChemical } from '../../data/chemicals';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { METERS_PER_SCENE_UNIT, siPointToScene } from '../../science/sceneUnits';
import { presentedStockPose } from '../../physical/stockPresentation';
import { MetalDepositLayers } from './MetalDepositLayer';
import { powderCarrierAppearance } from './ContactPowder';
import { supportPlaneScene } from '../../core/labGeometry';

export function StockSpillGrain({ spill }: { spill: SpillState }) {
  const mesh = useRef<Mesh>(null);
  const p = spill.stockMotion!, material = stockSolidMaterial(findChemical(p.formula), getSolidMorphology(p.formula));
  const view = { ...spill, contents: spill.contents ?? [], stockMotion: { tick: 0, grains: [p] } } as unknown as VesselState;
  const density = findChemical(p.formula).density ?? 1;
  const appearance = powderCarrierAppearance(view, p.id, p.mass_g, density, material.color);
  const coreScale = p.scale_m / METERS_PER_SCENE_UNIT;
  const scale = p.powder ? coreScale * Math.cbrt(appearance.volume_ml / (p.mass_g / density)) : coreScale;
  const coatingFrame = () => {
    if (p.powder || !(p.mass_g > 0)) return null;
    const pose = presentedStockPose(p), position = siPointToScene(pose.position_m);
    const matrix = new Matrix4().compose(new Vector3(...position), new Quaternion(...pose.rotation), new Vector3(coreScale, coreScale, coreScale));
    return { vessel: view, geometry: stockGeometry(p.formula), carriers: [{ id: p.id, matrix, share: 1 }],
      worldSpace: true, supportFloorY: supportPlaneScene(position) };
  };
  useFrame(() => {
    if (!mesh.current) return;
    const pose = presentedStockPose(p); mesh.current.position.fromArray(siPointToScene(pose.position_m)); mesh.current.quaternion.fromArray(pose.rotation);
  });
  return <group><mesh ref={mesh} name={`escaped_${p.id}`} position={siPointToScene(p.position_m)} quaternion={p.rotation}
    scale={scale} geometry={stockGeometry(p.formula)} castShadow receiveShadow>
    <meshPhysicalMaterial color={p.powder ? appearance.color : material.color} roughness={material.roughness} metalness={material.metalness}
      specularIntensity={material.specularIntensity} flatShading={material.flatShading} />
  </mesh><MetalDepositLayers substrate={p.formula} readFrame={coatingFrame} capacity={1} /></group>;
}
