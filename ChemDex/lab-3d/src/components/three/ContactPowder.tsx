import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { stockLocalMatrix } from '../../physical/stockCoordinates';
import { createPowderContactGeometry } from './powderContactGeometry';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { getNoiseTexture } from '../../vfx/textures';
import { PourController } from '../../pour/controller/PourController';
import { renderedVesselBody } from '../../simulation/render/vesselBodyFrames';
import { presentedStockPose } from '../../physical/stockPresentation';

export function ContactPowder({ vessel, formula, mass_g, density, color }: {
  vessel: VesselState; formula: string; mass_g: number; density: number; color: THREE.ColorRepresentation;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null), texture = useMemo(() => getNoiseTexture(128, 128), []);
  const poses = vessel.stockMotion!.grains.filter(p => p.formula === formula), represented = poses.reduce((s, p) => s + p.mass_g, 0);
  const factor = represented > 0 ? mass_g / represented : 0;
  const session = PourController.getSession();
  const renderedUp = renderedVesselBody(vessel.id)?.getWorldQuaternion(new THREE.Quaternion());
  const tilted = renderedUp && new THREE.Vector3(0, 1, 0).applyQuaternion(renderedUp).y < Math.cos(0.16)
    || Math.abs(vessel.rotationZ ?? 0) > 0.16 || session?.sourceId === vessel.id && Math.abs(session.tilt) > 0.16
    || vessel.physicalMotion && Math.abs(vessel.physicalMotion.rotation[0]) + Math.abs(vessel.physicalMotion.rotation[2]) > 0.08;
  const particles = poses.map(p => {
    const matrix = stockLocalMatrix(vessel, { ...p, scale_m: p.scale_m * Math.cbrt(factor) }), position = new THREE.Vector3().setFromMatrixPosition(matrix);
    const radius = Math.cbrt(solidSceneVolume(vessel, p.mass_g * factor / density) * 3 / (4 * Math.PI));
    const resting = !tilted && p.contacting === true && (p.sleeping || Math.hypot(...p.velocity_m_s) < 0.012);
    return { p, matrix, position, radius, resting };
  });
  const restingMass = particles.filter(p => p.resting).reduce((s, p) => s + p.p.mass_g * factor, 0);
  const key = particles.filter(p => p.resting).map(p => [p.p.id, p.position.x.toFixed(3), p.position.y.toFixed(3), p.position.z.toFixed(3), p.radius.toFixed(6)].join(':')).join('|');
  const geometry = useMemo(() => createPowderContactGeometry(vessel.type, solidSceneVolume(vessel, restingMass / density) / 0.55,
    particles.filter(p => p.resting).map(p => ({ x: p.position.x, y: p.position.y, z: p.position.z, radius: p.radius }))), [vessel.type, key, restingMass, density]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useFrame(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]; scale.setScalar(p.resting ? 0 : p.radius);
      const position = new THREE.Vector3().setFromMatrixPosition(stockLocalMatrix(vessel, presentedStockPose(p.p), renderedVesselBody(vessel.id)?.matrixWorld));
      matrix.compose(position, rotation, scale); mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <group name={`contact_powder_${vessel.id}_${formula}`}>
    {geometry && <mesh geometry={geometry} renderOrder={3}><meshStandardMaterial color={color} roughness={0.95} bumpMap={texture} bumpScale={0.003} /></mesh>}
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, particles.length)]} frustumCulled={false} renderOrder={3}>
      <sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={color} roughness={0.98} bumpMap={texture} bumpScale={0.002} />
    </instancedMesh>
  </group>;
}
