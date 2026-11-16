import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { useVesselVisualRuntime, useVesselVisualStore } from '../../simulation/render/VesselVisualContext';
import { stockLocalMatrix } from '../../physical/stockCoordinates';
import { createPowderContactGeometry } from './powderContactGeometry';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { getNoiseTexture } from '../../vfx/textures';
import { PourController } from '../../pour/controller/PourController';
import { renderedVesselBody } from '../../simulation/render/vesselBodyFrames';
import { presentedStockLocalMatrix } from '../../physical/stockPresentation';
import { moveCarriedVesselIds } from '../../physical/carriedVessels';
import { attachedMetalForCarrier, attachedMetalMassForCarrier, DEPOSIT_DENSITY_G_ML } from '../../science/metalSurfaceAppearance';

export function powderCarrierAppearance(vessel: VesselState, id: string, coreMass_g: number, density: number, color: THREE.ColorRepresentation) {
  const coating = attachedMetalForCarrier(vessel, id), tint = new THREE.Color(color);
  let total = coreMass_g;
  for (const product of Object.keys(DEPOSIT_DENSITY_G_ML)) {
    const mass = attachedMetalMassForCarrier(vessel, id, product);
    if (!(mass > 0)) continue;
    total += mass; tint.lerp(new THREE.Color(product === 'Ag' ? '#cbd5e1' : product === 'Pb' ? '#676b70' : '#b87346'), mass / total);
  }
  return { volume_ml: coreMass_g / density + coating.volume_ml, color: tint, coatingMass_g: coating.mass_g };
}

/** Contact envelopes keep the local carrier's finish, rather than tinting dry
 * grains elsewhere in the pile when one wet carrier receives a deposit. */
export function colorPowderContactGeometry(geometry: THREE.BufferGeometry, anchors: { x: number; z: number; color: THREE.Color }[]) {
  const position = geometry.getAttribute('position'), colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    let closest = anchors[0], distance = Infinity;
    for (const anchor of anchors) {
      const d = (position.getX(i) - anchor.x) ** 2 + (position.getZ(i) - anchor.z) ** 2;
      if (d < distance) { distance = d; closest = anchor; }
    }
    closest.color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function ContactPowder({ vessel, formula, mass_g, density, color }: {
  vessel: VesselState; formula: string; mass_g: number; density: number; color: THREE.ColorRepresentation;
}) {
  const visualStore = useVesselVisualStore(), visualRuntime = useVesselVisualRuntime();
  const mesh = useRef<THREE.InstancedMesh>(null), texture = useMemo(() => getNoiseTexture(128, 128), []);
  const poses = vessel.stockMotion!.grains.filter(p => p.formula === formula && p.mass_g > 0), represented = poses.reduce((s, p) => s + p.mass_g, 0);
  const factor = represented > 0 ? Math.min(1, mass_g / represented) : 0;
  const app = visualStore.getState(), carried = moveCarriedVesselIds(app).has(vessel.id);
  const session = visualRuntime?.externallyStepped ? null : PourController.getSession();
  const renderedUp = visualRuntime?.externallyStepped ? undefined : renderedVesselBody(vessel.id)?.getWorldQuaternion(new THREE.Quaternion());
  const tilted = renderedUp && new THREE.Vector3(0, 1, 0).applyQuaternion(renderedUp).y < Math.cos(0.16)
    || Math.abs(vessel.rotationZ ?? 0) > 0.16 || session?.sourceId === vessel.id && Math.abs(session.tilt) > 0.16
    || vessel.physicalMotion && Math.abs(vessel.physicalMotion.rotation[0]) + Math.abs(vessel.physicalMotion.rotation[2]) > 0.08;
  const localMatrix = (pose: typeof poses[number], carried: boolean) => visualRuntime?.externallyStepped
    ? stockLocalMatrix(vessel, pose) : presentedStockLocalMatrix(vessel, pose, renderedVesselBody(vessel.id)?.matrixWorld, carried);
  const particles = poses.map(p => {
    const matrix = localMatrix({ ...p, scale_m: p.scale_m * Math.cbrt(factor) }, carried), position = new THREE.Vector3().setFromMatrixPosition(matrix);
    const appearance = powderCarrierAppearance(vessel, p.id, p.mass_g * factor, density, color);
    const radius = Math.cbrt(solidSceneVolume(vessel, appearance.volume_ml) * 3 / (4 * Math.PI));
    const resting = !tilted && p.contacting === true && (p.sleeping || Math.hypot(...p.velocity_m_s) < 0.012);
    return { p, matrix, position, radius, resting, appearance };
  });
  const restingVolume = particles.filter(p => p.resting).reduce((s, p) => s + p.appearance.volume_ml, 0);
  const key = particles.filter(p => p.resting).map(p => [p.p.id, p.position.x.toFixed(3), p.position.y.toFixed(3), p.position.z.toFixed(3), p.radius.toFixed(6), p.appearance.color.getHexString()].join(':')).join('|');
  const geometry = useMemo(() => {
    const resting = particles.filter(p => p.resting), result = createPowderContactGeometry(vessel.type, solidSceneVolume(vessel, restingVolume) / 0.55,
      resting.map(p => ({ x: p.position.x, y: p.position.y, z: p.position.z, radius: p.radius })));
    if (result) colorPowderContactGeometry(result, resting.map(p => ({ x: p.position.x, z: p.position.z, color: p.appearance.color })));
    return result;
  }, [vessel.type, key, restingVolume]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useFrame(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    const app = visualStore.getState(), carried = moveCarriedVesselIds(app).has(vessel.id);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; scale.setScalar(p.resting ? 0 : p.radius);
      const position = new THREE.Vector3().setFromMatrixPosition(localMatrix(p.p, carried));
      matrix.compose(position, rotation, scale); mesh.current.setMatrixAt(i, matrix);
      mesh.current.setColorAt(i, p.appearance.color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return <group name={`contact_powder_${vessel.id}_${formula}`}>
    {geometry && <mesh geometry={geometry} renderOrder={3}><meshStandardMaterial vertexColors roughness={0.95} bumpMap={texture} bumpScale={0.003} /></mesh>}
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, particles.length)]} frustumCulled={false} renderOrder={3}>
      <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial roughness={0.98} bumpMap={texture} bumpScale={0.002} />
    </instancedMesh>
  </group>;
}
