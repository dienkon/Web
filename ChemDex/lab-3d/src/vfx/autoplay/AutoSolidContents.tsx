import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AutoExperiment } from './AutoExperiment';
import { autoSolid, solidFlightPosition } from './autoSolid';
import { stockLocalMatrix } from '../../physical/stockCoordinates';
import { solidSceneVolume, vesselInterior } from '../../science/vesselDimensions';
import { createStockSolidLayout } from '../../components/three/stockSolidLayout';
import { createPowderContactGeometry } from '../../components/three/powderContactGeometry';
import { createPowderPileGeometry } from '../../components/three/powderPileGeometry';
import { isSuspensionRow } from '../../science/precipitateInventory';
import { metalSurfaceAppearance } from '../../science/metalSurfaceAppearance';
import { sameMolecularFormula } from '../../science/speciesIdentity';
import { getNoiseTexture } from '../textures';

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

function AutoStockLayer({ experiment: e, formula }: { experiment: AutoExperiment; formula: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null), powder = useRef<THREE.Mesh>(null);
  const material = useSolidMaterial(formula), noise = useMemo(() => getNoiseTexture(128, 128), []);
  const powderGeometry = useRef<THREE.BufferGeometry>(null);
  const emptyGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const cache = useRef({ powderKey: '', time: -1, initialMass: 0 });
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), rotation: new THREE.Quaternion(), scale: new THREE.Vector3(), matrix: new THREE.Matrix4() }), []);
  useEffect(() => () => { powderGeometry.current?.dispose(); emptyGeometry.dispose(); }, [emptyGeometry]);
  useFrame(() => {
    const target = mesh.current, bed = powder.current;
    if (!target || !bed) return;
    const v = e.sample, sedimentOwnsProduct = e.physics.precipitationSystems.has(formula);
    // The shared sediment system also owns dry reaction residue. Rendering a
    // second stock pile would display the same product mass twice.
    const rows = v.contents.filter(c => c.formula === formula && c.phase === 's' && c.mass_g > 1e-10
      && (!c.location || c.location === 'bulk')
      && !((v.volume_ml > 0.05 || sedimentOwnsProduct) && isSuspensionRow(c, v.contents, v.precipitateSubstance)));
    const mass = rows.reduce((sum, c) => sum + c.mass_g, 0), product = rows.length > 0 && rows.every(c => c.solidOrigin === 'precipitate');
    target.visible = mass > 0; bed.visible = false; target.count = 0;
    if (!(mass > 0)) { cache.current.initialMass = 0; return; }
    const solid = autoSolid(formula, product), isPowder = solid.morphology === 'POWDER';
    target.geometry = solid.geometry;
    if (material.bumpMap !== (isPowder ? noise : null) || material.flatShading !== solid.material.flatShading) material.needsUpdate = true;
    const { color, ...finish } = solid.material;
    Object.assign(material, finish); material.color.set(color);
    material.bumpMap = isPowder ? noise : null; material.bumpScale = 0.003;
    const coating = metalSurfaceAppearance(v);
    if (coating && sameMolecularFormula(coating.substrate, formula)) material.color.lerp(new THREE.Color(coating.color), coating.colorFraction);
    const poses = product ? [] : e.stocks.grains.filter(p => p.formula === formula);
    const represented = poses.reduce((sum, p) => sum + p.mass_g, 0), factor = represented > 0 ? mass / represented : 1;
    const anchors: { x: number; y: number; z: number; radius: number }[] = [];
    let count = 0, restingMass = 0;
    for (const p of poses) {
      const matrix = stockLocalMatrix(v, { ...p, scale_m: p.scale_m * Math.cbrt(factor) });
      const resting = isPowder && p.contacting && (p.sleeping || Math.hypot(...p.velocity_m_s) < 0.012);
      if (resting) {
        scratch.position.setFromMatrixPosition(matrix);
        anchors.push({ ...scratch.position, radius: Math.cbrt(solidSceneVolume(v, p.mass_g * factor / solid.density) * 3 / (4 * Math.PI)) });
        restingMass += p.mass_g * factor;
      } else if (count < target.instanceMatrix.count) target.setMatrixAt(count++, matrix);
    }
    cache.current.initialMass = Math.max(mass, cache.current.initialMass);
    if (!poses.length && !isPowder) {
      const layout = createStockSolidLayout(v.type, solid.morphology, solid.geometry, solidSceneVolume(v, mass / solid.density),
        solidSceneVolume(v, cache.current.initialMass / solid.density), undefined, true, solid.fixedCount);
      for (const p of layout.pieces) if (count < target.instanceMatrix.count) target.setMatrixAt(count++, p.matrix);
    }
    if (isPowder && (!poses.length || restingMass > 0)) {
      const bulk = solidSceneVolume(v, (poses.length ? restingMass : mass) / solid.density) / 0.55;
      const key = `${bulk}:${anchors.map(a => `${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)}`).join('|')}`;
      if (key !== cache.current.powderKey && (e.paused || e.elapsed - cache.current.time >= 0.1 || cache.current.time < 0)) {
        powderGeometry.current?.dispose();
        powderGeometry.current = anchors.length ? createPowderContactGeometry(v.type, bulk, anchors)!
          : createPowderPileGeometry(v.type, bulk, vesselInterior(v.type).maximumRadius * 0.85);
        bed.geometry = powderGeometry.current;
        cache.current.powderKey = key; cache.current.time = e.elapsed;
      }
      bed.visible = !!bed.geometry.getAttribute('position');
    }
    target.count = count; target.visible = count > 0;
    if (count) target.instanceMatrix.needsUpdate = true;
  });
  return <group name={`auto_stock_${formula}`}>
    <instancedMesh ref={mesh} args={[autoSolid(formula).geometry, material, 1024]} count={0} visible={false} frustumCulled={false} dispose={null} />
    <mesh ref={powder} geometry={emptyGeometry} material={material} visible={false} dispose={null} />
  </group>;
}

export function AutoSolidContents({ experiment: e }: { experiment: AutoExperiment }) {
  const formulas = useMemo(() => [...new Set([...e.donors.filter(d => d.solid).map(d => d.row.formula),
    ...e.program.chemistry.species.filter(s => s.phase === 's').map(s => s.formula)])], [e]);
  return <>{formulas.map(formula => <AutoStockLayer key={formula} experiment={e} formula={formula} />)}</>;
}
