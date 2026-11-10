import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { AutoExperiment } from './AutoExperiment';
import { createVesselLatheGeometry, getGlassMaterials } from '../materials/glass';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { GasCloudLayer } from '../particles/GasPlume';
import { GAS_FUME_TABLE } from '../catalog/gasTable';
import { createSedimentGeometry } from '../../simulation/effects/sedimentGeometry';
import { readablePrecipitateRadius } from '../../simulation/render/precipitateReadability';
import { metalSurfaceAppearance } from '../../science/metalSurfaceAppearance';

const gasSpecies = [...Object.entries(GAS_FUME_TABLE).filter(([s, v]) => s !== 'H2O' && v.visible).map(([s]) => s), 'MgO'];
function ChemicalLabel({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#071423'; ctx.beginPath(); ctx.roundRect(2, 2, 380, 92, 16); ctx.fill();
    ctx.strokeStyle = '#66bacd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e6faff'; ctx.font = '600 30px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 48, 350);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[1.25, 0.31, 1]} renderOrder={12}><spriteMaterial map={texture} transparent depthWrite={false} /></sprite>;
}
function Glass({ children, small = false }: { children?: React.ReactNode; small?: boolean }) {
  const geometry = useMemo(() => createVesselLatheGeometry(small ? 'flask' : 'beaker', 48), [small]);
  const glass = getGlassMaterials('high');
  useEffect(() => () => { geometry.outer.dispose(); geometry.inner.dispose(); }, [geometry]);
  return <group><mesh geometry={geometry.inner} material={glass.back} renderOrder={8} dispose={null} />
    {children}<mesh geometry={geometry.outer} material={glass.front} renderOrder={9} dispose={null} /></group>;
}
function Fluid({ experiment }: { experiment: AutoExperiment }) {
  const mesh = useRef<THREE.Mesh>(null), material = useRef<THREE.MeshPhysicalMaterial>(null);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    if (!mesh.current || !material.current) return;
    const sample = experiment.sample, y = vesselLiquidSurfaceY(sample), height = Math.max(0, y + 1.02);
    mesh.current.visible = sample.volume_ml > 0.01;
    mesh.current.position.y = -1.02 + height / 2; mesh.current.scale.y = Math.max(0.001, height);
    color.set(sample.liquidColor ?? '#dcecf4');
    const haze = Math.max(experiment.physics.cloudiness, sample.turbidity ?? 0);
    if (haze > 0) color.lerp(new THREE.Color(experiment.physics.suspensionColor), Math.min(0.8, haze));
    material.current.color.copy(color); material.current.opacity = Math.min(0.94, 0.28 + haze * 0.65);
    material.current.roughness = 0.08 + haze * 0.5;
  });
  return <mesh ref={mesh} renderOrder={3}><cylinderGeometry args={[0.85, 0.85, 1, 64]} />
    <meshPhysicalMaterial ref={material} color="#dcecf4" transparent opacity={0.4} depthWrite={false} roughness={0.1} clearcoat={0.8} />
  </mesh>;
}
function DonorFill({ experiment, index }: { experiment: AutoExperiment; index: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const target = mesh.current, d = experiment.donors[index]; if (!target || !d) return;
    const fraction = d.row.mass_g > 0 ? d.remaining / d.row.mass_g : 0;
    target.visible = fraction > 1e-5 && d.row.phase !== 'g';
    const height = 0.9 * Math.max(0.02, fraction);
    target.scale.y = height; target.position.y = -0.85 + height / 2;
    (target.material as THREE.MeshStandardMaterial).color.set(d.color);
  });
  return <mesh ref={mesh} renderOrder={3}><cylinderGeometry args={[0.4, 0.55, 1, 24]} /><meshStandardMaterial color="white" transparent opacity={0.7} roughness={0.3} depthWrite={false} /></mesh>;
}
function Particles({ experiment }: { experiment: AutoExperiment }) {
  const solids = useRef<THREE.InstancedMesh>(null), bubbles = useRef<THREE.InstancedMesh>(null), bed = useRef<THREE.Mesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []), color = useMemo(() => new THREE.Color(), []);
  const bedThickness = useRef(-1);
  useEffect(() => () => bed.current?.geometry.dispose(), []);
  useFrame(() => {
    if (solids.current) {
      let count = 0;
      for (const s of experiment.physics.precipitationSystems.values()) for (const p of s.particles) {
        if (count >= 600) break;
        scratch.position.set(p.x, p.y, p.z);
        scratch.rotation.set(p.brownianSeed, p.age * 0.4, p.brownianSeed * 0.6);
        scratch.scale.setScalar(readablePrecipitateRadius(p, s.profile, s.renderBounds));
        scratch.updateMatrix(); solids.current.setMatrixAt(count, scratch.matrix);
        solids.current.setColorAt(count++, color.set(s.profile.color));
      }
      solids.current.count = count; solids.current.instanceMatrix.needsUpdate = true;
      if (solids.current.instanceColor) solids.current.instanceColor.needsUpdate = true;
    }
    if (bubbles.current) {
      let count = 0;
      for (const p of experiment.physics.boilingSystem.bubbles) {
        if (count >= 100) break;
        scratch.position.set(p.x, p.y, p.z); scratch.rotation.set(0, 0, 0);
        scratch.scale.set(p.radius, p.radius * p.aspectRatio, p.radius); scratch.updateMatrix();
        bubbles.current.setMatrixAt(count++, scratch.matrix);
      }
      bubbles.current.count = count; bubbles.current.instanceMatrix.needsUpdate = true;
    }
    if (bed.current) {
      const s = experiment.physics.sedimentBed;
      bed.current.visible = s.amount_g > 1e-9;
      if (Math.abs(s.thickness - bedThickness.current) > 1e-5) {
        bed.current.geometry.dispose(); bed.current.geometry = createSedimentGeometry('beaker', -1.02 + s.thickness);
        bedThickness.current = s.thickness;
      }
      (bed.current.material as THREE.MeshStandardMaterial).color.set(s.color);
    }
  });
  return <>
    <instancedMesh ref={solids} args={[undefined, undefined, 600]} frustumCulled={false} renderOrder={5}>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial vertexColors transparent opacity={0.85} roughness={0.65} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={bubbles} args={[undefined, undefined, 100]} frustumCulled={false} renderOrder={6}>
      <sphereGeometry args={[1, 10, 8]} /><meshPhysicalMaterial color="#ccefff" transparent opacity={0.34} roughness={0.02} metalness={0.1} clearcoat={1} depthWrite={false} />
    </instancedMesh>
    <mesh ref={bed} visible={false}><bufferGeometry /><meshStandardMaterial color="white" roughness={0.85} /></mesh>
  </>;
}
function Specimen({ experiment: e }: { experiment: AutoExperiment }) {
  const stocks = useRef<THREE.InstancedMesh>(null), mirror = useRef<THREE.Mesh>(null), layer = useRef<THREE.Mesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []), color = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    if (stocks.current) {
      const coating = metalSurfaceAppearance(e.sample);
      const rows = e.sample.contents.filter(c => c.phase === 's' && c.mass_g > 1e-10 && c.solidOrigin !== 'precipitate');
      let i = 0;
      for (const row of rows) {
        if (i >= 12) break;
        const size = Math.min(0.3, 0.15 * Math.cbrt(row.mass_g / 0.05));
        transform.position.set((i % 3 - 1) * 0.26, -0.94 + size * 0.5, Math.floor(i / 3) * 0.2);
        transform.scale.set(size, size * 0.5, size * 0.8); transform.rotation.set(i * 0.4, i * 1.2, 0.2); transform.updateMatrix();
        stocks.current.setMatrixAt(i, transform.matrix);
        const base = e.program.chemistry.species.find(s => s.formula === row.formula)?.colorHex
          ?? (row.formula === 'Cu' ? '#b87346' : ['Fe', 'Zn', 'Mg', 'Al'].includes(row.formula) ? '#a4b0bd' : '#e5e7eb');
        color.set(base); if (coating?.substrate === row.formula) color.lerp(new THREE.Color(coating.color), Math.min(1, coating.colorFraction * 2));
        stocks.current.setColorAt(i++, color);
      }
      stocks.current.count = i; stocks.current.instanceMatrix.needsUpdate = true;
      if (stocks.current.instanceColor) stocks.current.instanceColor.needsUpdate = true;
    }
    if (mirror.current) {
      const deposition = e.lessonVisuals?.deposition ?? 0;
      mirror.current.visible = deposition > 0.001;
      (mirror.current.material as THREE.MeshStandardMaterial).opacity = deposition * 0.85;
    }
    if (layer.current) {
      const split = e.lessonVisuals?.phaseSplit ?? 0;
      layer.current.visible = split > 0.001;
      layer.current.position.y = vesselLiquidSurfaceY(e.sample) - 0.06; layer.current.scale.y = Math.max(0.001, split * 0.2);
    }
  });
  return <>
    <instancedMesh ref={stocks} args={[undefined, undefined, 12]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial vertexColors roughness={0.4} metalness={0.35} /></instancedMesh>
    <mesh ref={mirror} visible={false}><cylinderGeometry args={[0.96, 0.96, 1.25, 48, 1, true, 0, Math.PI * 1.2]} /><meshStandardMaterial color="#dce5ed" metalness={1} roughness={0.1} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh ref={layer} visible={false} renderOrder={4}><cylinderGeometry args={[0.84, 0.84, 1, 48]} /><meshStandardMaterial color="#f4dfa8" transparent opacity={0.65} depthWrite={false} /></mesh>
  </>;
}
function Choreography({ experiment: e }: { experiment: AutoExperiment }) {
  const actor = useRef<THREE.Group>(null), stream = useRef<THREE.Mesh>(null), flame = useRef<THREE.Mesh>(null);
  const powder = useRef<THREE.InstancedMesh>(null), grain = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), direction: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }), []);
  useFrame(() => {
    if (actor.current) { actor.current.position.set(...e.donorPose.position); actor.current.rotation.z = e.donorPose.tilt; }
    if (stream.current) {
      const active = e.phase === 'dose' && e.phaseTime > 0.2 && e.phaseTime < 2.4;
      const phase = e.donors[e.donorIndex]?.row.phase;
      stream.current.visible = active && phase !== 's';
      scratch.a.set(-0.05, 2.95, 0); scratch.b.set(0, 1.04 + vesselLiquidSurfaceY(e.sample), 0);
      stream.current.position.copy(scratch.a).add(scratch.b).multiplyScalar(0.5);
      scratch.direction.subVectors(scratch.b, scratch.a);
      stream.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction.clone().normalize());
      stream.current.scale.set(0.024, scratch.direction.length(), 0.024);
      (stream.current.material as THREE.MeshStandardMaterial).color.set(e.donors[e.donorIndex]?.color ?? '#dbeafe');
      (stream.current.material as THREE.MeshStandardMaterial).opacity = phase === 'g' ? 0.08 : 0.72;
    }
    if (powder.current) {
      const active = e.phase === 'dose' && e.phaseTime > 0.2 && e.donors[e.donorIndex]?.row.phase === 's';
      powder.current.count = active ? 24 : 0;
      for (let i = 0; active && i < 24; i++) {
        const t = (e.phaseTime * 1.4 + i / 24) % 1;
        grain.position.set(-0.12 + Math.sin(i * 7.3) * 0.04, 2.95 - t * 2, Math.cos(i * 3.7) * 0.06);
        grain.scale.setScalar(0.016); grain.rotation.set(i, i * 2, e.elapsed); grain.updateMatrix(); powder.current.setMatrixAt(i, grain.matrix);
      }
      powder.current.instanceMatrix.needsUpdate = true;
      (powder.current.material as THREE.MeshStandardMaterial).color.set(e.donors[e.donorIndex]?.color ?? '#ffffff');
    }
    if (flame.current) {
      flame.current.visible = e.flame;
      flame.current.scale.set(1, 1 + Math.sin(e.elapsed * 17) * 0.06, 1);
      const authored = e.program.visual.timeline.find(a => a.atom === 'flameCone')?.params.flameColor;
      (flame.current.material as THREE.MeshBasicMaterial).color.set(e.lessonVisuals?.flameColor
        ?? (e.program.id === 'mg_o2_burn' ? '#fff4e1' : typeof authored === 'string' ? authored : '#57c9ff'));
    }
  });
  return <>
    {e.donors.map((d, i) => <group key={`${d.row.formula}:${i}`} position={[-3.1 + i % 3 * 0.8, 0.63, -1.8 - Math.floor(i / 3) * 1.1]} visible={i !== e.donorIndex} scale={0.6}>
      <Glass small><DonorFill experiment={e} index={i} /></Glass><ChemicalLabel text={d.row.formula} position={[0, -0.1, 0.55]} />
    </group>)}
    <group ref={actor} scale={0.6} visible={e.donorIndex < e.donors.length}>
      <Glass small><DonorFill experiment={e} index={e.donorIndex} /></Glass><ChemicalLabel text={e.donors[e.donorIndex]?.row.formula ?? ''} position={[0, 0, 0.6]} />
      <mesh position={[0, 1.35, 0]}><torusGeometry args={[0.3, 0.025, 8, 32]} /><meshBasicMaterial color="#67e8f9" transparent opacity={0.7} /></mesh>
    </group>
    <mesh ref={stream} visible={false}><cylinderGeometry args={[1, 1, 1, 10]} /><meshStandardMaterial transparent opacity={0.72} depthWrite={false} /></mesh>
    <instancedMesh ref={powder} args={[undefined, undefined, 24]} frustumCulled={false}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.7} /></instancedMesh>
    <mesh ref={flame} position={[0, 0.27, 0]} visible={false}><coneGeometry args={[0.13, 0.65, 24]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.85} depthWrite={false} /></mesh>
    <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.45, 0.5, 0.1, 40]} /><meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} /></mesh>
  </>;
}
function Director({ experiment: e }: { experiment: AutoExperiment }) {
  const controls = useRef<any>(null);
  const position = useMemo(() => new THREE.Vector3(), []), target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, delta) => {
    e.tick(delta);
      const poses = { wide: [[5.8, 4.3, 8.5], [-0.8, 1.1, 0]], transfer: [[4.2, 3.7, 6.1], [-0.5, 1.7, 0]],
      close: [[3.4, 2.7, 5.3], [0, 0.95, 0]], surface: [[3.1, 4.3, 4.6], [0, 1.5, 0]] };
    if (e.automaticCamera) {
      const pose = poses[e.camera]; position.set(...pose[0] as [number, number, number]); target.set(...pose[1] as [number, number, number]);
      const portrait = size.width < size.height * 0.85;
      if (portrait) {
        position.set(2.5, e.camera === 'surface' ? 4.3 : 3.4, e.camera === 'wide' ? 12 : e.camera === 'transfer' ? 9.5 : 8);
        target.set(e.camera === 'wide' ? -0.6 : 0, 1.3, 0);
      }
      const perspective = camera as THREE.PerspectiveCamera;
      if (perspective.fov !== (portrait ? 45 : 38)) { perspective.fov = portrait ? 45 : 38; perspective.updateProjectionMatrix(); }
      const alpha = 1 - Math.exp(-delta * 2.4);
      camera.position.lerp(position, alpha); controls.current?.target.lerp(target, alpha); controls.current?.update();
    }
  }, -3);
  return <OrbitControls ref={controls} makeDefault target={[-0.8, 1.1, 0]} enabled={!e.automaticCamera} minDistance={2.5} maxDistance={16} maxPolarAngle={1.5} />;
}
export function AutoExperimentScene({ experiment }: { experiment: AutoExperiment }) {
  return <Canvas camera={{ position: [5.8, 4.3, 8.5], fov: 38, near: 0.05, far: 70 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={['#091321']} /><fog attach="fog" args={['#091321', 14, 30]} />
    <ambientLight intensity={0.8} /><directionalLight position={[4, 8, 4]} intensity={3} color="#d7efff" />
    <pointLight position={[-4, 4, -2]} intensity={40} color="#72d9ff" /><pointLight position={[3, 3, -4]} intensity={25} color="#ffc992" />
    <Environment resolution={128} frames={1}><Lightformer intensity={4} position={[0, 5, -4]} scale={[8, 4, 1]} />
      <Lightformer intensity={2} position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[3, 5, 1]} /></Environment>
    <Director experiment={experiment} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#162637" metalness={0.2} roughness={0.42} /></mesh>
    <gridHelper args={[16, 32, '#284254', '#1b3040']} position={[0, 0.002, 0]} />
    <ContactShadows position={[0, 0.005, 0]} opacity={0.45} scale={16} blur={2.5} far={5} frames={1} resolution={256} />
    <group position={[0, 1.04, 0]}><Glass><Fluid experiment={experiment} /><Specimen experiment={experiment} /><Particles experiment={experiment} /></Glass></group>
    <Choreography experiment={experiment} />
    <group>{gasSpecies.map(species => <GasCloudLayer key={species} species={species} repository={experiment.clouds} />)}</group>
  </Canvas>;
}
