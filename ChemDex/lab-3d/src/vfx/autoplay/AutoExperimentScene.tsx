import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AutoExperiment, AUTO_TIMING, donorHome } from './AutoExperiment';
import { createVesselLatheGeometry, getGlassMaterials } from '../materials/glass';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { GasCloudLayer } from '../particles/GasPlume';
import { GAS_FUME_TABLE } from '../catalog/gasTable';
import { createSedimentGeometry } from '../../simulation/effects/sedimentGeometry';
import { AutoPrecipitateLayer } from './AutoPrecipitateLayer';
import { AutoLiquid } from './AutoLiquid';
import { AutoSolidContents, AutoSolidDonor, AutoSolidFlights } from './AutoSolidContents';
import { getLessonDefinition } from '../../lesson/catalog';
import { useQualityStore } from '../quality';
import { useRenderDpr } from '../../render/renderResolution';
import { FrameTelemetry } from '../../render/FrameTelemetry';
import { getSoftParticleTexture } from '../textures';
import { getVesselProfile } from '../../pour/physics/profiles';
import { solveLevel } from '../../pour/physics/retained';
import { AutoGasApparatus, AutoGasReceiver } from './AutoGasApparatus';
import { gasSourceHome, gasVolumeMl } from './gasDelivery';

const gasSpecies = [...Object.entries(GAS_FUME_TABLE).filter(([s, v]) => s !== 'H2O' && v.visible).map(([s]) => s), 'MgO'];
const cameraPoses: Record<string, [[number, number, number], [number, number, number]]> = {
  wide: [[5.8, 4.3, 8.5], [-0.8, 1.1, 0]], transfer: [[4.2, 3.7, 6.1], [-0.5, 1.7, 0]],
  close: [[3.4, 2.7, 5.3], [0, 0.95, 0]], surface: [[3.1, 4.3, 4.6], [0, 1.5, 0]],
};
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
  const tier = useQualityStore(s => s.effectiveTier);
  const segments = tier === 'potato' || tier === 'low' ? 24 : 48;
  const geometry = useMemo(() => createVesselLatheGeometry(small ? 'flask' : 'beaker', segments), [small, segments]);
  // The opaque low-tier glass hides the experiment; these cached materials
  // use a single transparent surface pass without refraction render targets.
  const glass = getGlassMaterials(tier === 'potato' || tier === 'low' ? 'medium' : tier);
  useEffect(() => () => { geometry.outer.dispose(); geometry.inner.dispose(); }, [geometry]);
  return <group><mesh geometry={geometry.inner} material={glass.back} renderOrder={8} dispose={null} />
    {children}<mesh geometry={geometry.outer} material={glass.front} renderOrder={9} dispose={null} /></group>;
}
function DonorLiquid({ experiment: e, index }: { experiment: AutoExperiment; index: number }) {
  const root = useRef<THREE.Group>(null), surface = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null), cache = useRef({ fraction: -1, tilt: -1, c: 0 });
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const clips = useMemo(() => [plane], [plane]);
  const geometry = useMemo(() => {
    const profile = getVesselProfile('flask');
    return new THREE.LatheGeometry([...(profile.contour ?? []).map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0, 1.48)], 32);
  }, []);
  const scratch = useMemo(() => ({ normal: new THREE.Vector3(), z: new THREE.Vector3(0, 0, 1), origin: new THREE.Vector3() }), []);
  const water = e.donors[index].row.formula === 'H2O';
  const uniforms = useMemo(() => ({ uBody: { value: new THREE.Matrix4() }, uColor: { value: new THREE.Color(e.donors[index].color) }, uOpacity: { value: water ? 0.16 : 0.58 } }), [e, index, water]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    if (!root.current || !surface.current || !body.current) return;
    const d = e.donors[index], fraction = d.row.mass_g > 0 ? d.remaining / d.row.mass_g : 0;
    root.current.visible = fraction > 1e-5;
    if (!root.current.visible) return;
    const tilt = index === e.donorIndex ? e.donorPose.tilt : 0;
    if (cache.current.fraction !== fraction || cache.current.tilt !== tilt) {
      const profile = getVesselProfile('flask');
      cache.current = { fraction, tilt, c: solveLevel(profile, Math.abs(tilt), profile.capacity_ml * 0.4 * fraction).c };
    }
    scratch.normal.set(Math.sin(tilt), Math.cos(tilt), 0);
    root.current.getWorldPosition(scratch.origin);
    plane.constant = scratch.origin.y + cache.current.c * 0.6;
    surface.current.position.copy(scratch.normal).multiplyScalar(cache.current.c);
    surface.current.quaternion.setFromUnitVectors(scratch.z, scratch.normal);
    surface.current.updateMatrix(); uniforms.uBody.value.copy(surface.current.matrix);
  });
  return <group ref={root}>
    <mesh ref={body} geometry={geometry} renderOrder={3}><meshStandardMaterial color={e.donors[index].color} clippingPlanes={clips} side={THREE.DoubleSide} transparent opacity={water ? 0.1 : 0.4} roughness={0.1} depthWrite={false} /></mesh>
    <mesh ref={surface} renderOrder={4}><planeGeometry args={[4, 4]} /><shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide}
      vertexShader={`uniform mat4 uBody; varying vec3 vBody; void main() { vBody = (uBody * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`}
      fragmentShader={`uniform vec3 uColor; uniform float uOpacity; varying vec3 vBody; void main() { if (vBody.y < -.96 || vBody.y > 1.48) discard; float r = vBody.y < .7 ? mix(1.215, .35, (vBody.y + .96) / 1.66) : .35; if (dot(vBody.xz, vBody.xz) > r * r) discard; gl_FragColor = vec4(uColor, uOpacity);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`} />
    </mesh>
  </group>;
}
function Particles({ experiment }: { experiment: AutoExperiment }) {
  const bubbles = useRef<THREE.InstancedMesh>(null), bed = useRef<THREE.Mesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []), color = useMemo(() => new THREE.Color(), []);
  const bedThickness = useRef(-1);
  useEffect(() => () => bed.current?.geometry.dispose(), []);
  useFrame(() => {
    if (bubbles.current) {
      let count = 0;
      for (const p of experiment.physics.boilingSystem.bubbles) {
        if (count >= 100) break;
        scratch.position.set(p.x, p.y, p.z); scratch.rotation.set(0, 0, 0);
        scratch.scale.set(p.radius, p.radius * p.aspectRatio, p.radius); scratch.updateMatrix();
        bubbles.current.setMatrixAt(count++, scratch.matrix);
      }
      bubbles.current.count = count; bubbles.current.visible = count > 0;
      if (count) bubbles.current.instanceMatrix.needsUpdate = true;
    }
    if (bed.current) {
      const s = experiment.physics.sedimentBed;
      bed.current.visible = s.amount_g > 1e-9;
      if (Math.abs(s.thickness - bedThickness.current) > 1e-5) {
        bed.current.geometry.dispose(); bed.current.geometry = createSedimentGeometry('beaker', getVesselProfile('beaker', 100).baseY + s.thickness);
        bedThickness.current = s.thickness;
      }
      (bed.current.material as THREE.MeshStandardMaterial).color.set(s.color);
      const material = bed.current.material as THREE.MeshStandardMaterial;
      const aerosol = experiment.program.id === 'nh3_hcl' && experiment.sample.volume_ml < 0.01;
      if (material.transparent !== aerosol) { material.transparent = aerosol; material.depthWrite = !aerosol; material.needsUpdate = true; }
      material.roughness = s.roughness; material.metalness = s.metalness;
      material.opacity = aerosol
        ? -Math.expm1(-experiment.aerosolDeposited_g / 0.015) : 1;
    }
  });
  return <>
    {[...new Set(experiment.program.chemistry.species.filter(s => s.phase === 's').map(s => s.formula))].map(formula =>
      <AutoPrecipitateLayer key={formula} experiment={experiment} formula={formula} />)}
    <instancedMesh ref={bubbles} args={[undefined, undefined, 100]} frustumCulled={false} renderOrder={6}>
      <sphereGeometry args={[1, 10, 8]} /><meshPhysicalMaterial color="#ccefff" transparent opacity={0.34} roughness={0.02} metalness={0.1} clearcoat={1} depthWrite={false} />
    </instancedMesh>
    <mesh ref={bed} name="auto_sediment_bed" visible={false}><bufferGeometry /><meshStandardMaterial color="white" roughness={0.85} transparent depthWrite={false} /></mesh>
  </>;
}
function Specimen({ experiment: e }: { experiment: AutoExperiment }) {
  const mirror = useRef<THREE.Mesh>(null), layer = useRef<THREE.Mesh>(null);
  useFrame(() => {
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
    <AutoSolidContents experiment={e} />
    <mesh ref={mirror} visible={false}><cylinderGeometry args={[0.96, 0.96, 1.25, 48, 1, true, 0, Math.PI * 1.2]} /><meshStandardMaterial color="#dce5ed" metalness={1} roughness={0.1} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh ref={layer} visible={false} renderOrder={4}><cylinderGeometry args={[0.84, 0.84, 1, 48]} /><meshStandardMaterial color="#f4dfa8" transparent opacity={0.65} depthWrite={false} /></mesh>
  </>;
}
function Donor({ experiment: e, index }: { experiment: AutoExperiment; index: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const active = index === e.donorIndex;
    const pose = active ? e.donorPose : { position: donorHome(index), tilt: 0 };
    group.current.position.set(...pose.position); group.current.rotation.z = pose.tilt;
    if (e.phase === 'prepare') {
      const t = Math.max(0, Math.min(1, (e.phaseTime - index * 0.1) / 0.7));
      group.current.position.x -= (1 - t) * 1.5;
      group.current.position.y += (1 - t) * 0.6;
    }
  });
  const donor = e.donors[index];
  if (donor.row.phase === 'g') return <AutoGasApparatus experiment={e} index={index}><ChemicalLabel text={`${donor.row.formula} · ${gasVolumeMl(donor.row.moles).toFixed(1)} mL`} position={[0, 0, 0]} /></AutoGasApparatus>;
  return <group ref={group} scale={0.6} position={donorHome(index)} name={`auto_donor_${index}`}>
    <Glass small>{donor.row.phase === 's' ? <AutoSolidDonor experiment={e} index={index} /> : donor.row.phase !== 'g' ? <DonorLiquid experiment={e} index={index} /> : null}</Glass>
    <ChemicalLabel text={donor.row.formula} position={[0, -0.1, 0.65]} />
    {donor.row.phase === 'g' && <mesh position={[0, 1.55, 0]}><cylinderGeometry args={[0.2, 0.25, 0.12, 16]} /><meshStandardMaterial color="#537b88" metalness={0.8} roughness={0.25} /></mesh>}
  </group>;
}

/** Every segment starts at the actual pouring edge. Flight time delays contact
 * and lets the final tail drain before the donor is righted and returned. */
function Transfer({ experiment: e }: { experiment: AutoExperiment }) {
  const stream = useRef<THREE.InstancedMesh>(null);
  const splash = useRef<THREE.InstancedMesh>(null), ripples = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), direction: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0), object: new THREE.Object3D() }), []);
  const samplePath = (t: number, out: THREE.Vector3, lip: [number, number, number], surface: number) => {
    // The jet leaves tangentially, then accelerates down to the liquid surface.
    out.set(lip[0] + 0.12 * t, lip[1] + (surface - lip[1]) * t * t, lip[2]);
  };
  useFrame(() => {
    const donor = e.donors[e.donorIndex], phase = donor?.row.phase;
    const active = e.streamActive, lip = e.donorLip, surface = 1.04 + vesselLiquidSurfaceY(e.sample);
    const contact = e.phase === 'dose' && e.phaseTime >= AUTO_TIMING.tilt + AUTO_TIMING.flight && donor?.fraction < 1;
    const object = scratch.object;
    if (stream.current) {
      let count = 0;
      if (active && phase !== 's' && phase !== 'g') for (let i = 0; i < 16; i++) {
        const t = (i + 0.5) / 16, age = e.phaseTime - AUTO_TIMING.tilt - AUTO_TIMING.flight * t;
        if (age < 0 || age > AUTO_TIMING.flow) continue;
        samplePath(i / 16, scratch.a, lip, surface); samplePath((i + 1) / 16, scratch.b, lip, surface);
        object.position.copy(scratch.a).add(scratch.b).multiplyScalar(0.5);
        scratch.direction.subVectors(scratch.b, scratch.a); const length = scratch.direction.length();
        object.quaternion.setFromUnitVectors(scratch.up, scratch.direction.normalize());
        const width = 0.019 * Math.max(0.25, Math.sin(Math.PI * age / AUTO_TIMING.flow)) / Math.sqrt(0.8 + t);
        object.scale.set(width, length * 1.06, width); object.updateMatrix(); stream.current.setMatrixAt(count++, object.matrix);
      }
      stream.current.count = count; stream.current.visible = count > 0;
      if (count) stream.current.instanceMatrix.needsUpdate = true;
      const material = stream.current.material as THREE.MeshStandardMaterial;
      material.color.set(donor?.color ?? '#dbeafe'); material.opacity = phase === 'g' ? 0.18 : 0.78;
    }
    if (splash.current) {
      let count = 0;
      if (contact && phase !== 'g' && phase !== 's') for (let i = 0; i < 16; i++) {
        const t = (e.elapsed * 2.2 + i / 16) % 1, angle = i * 2.399;
        object.position.set(lip[0] + 0.12 + Math.cos(angle) * t * 0.18, surface + Math.sin(t * Math.PI) * 0.13,
          lip[2] + Math.sin(angle) * t * 0.18);
        object.rotation.set(0, 0, 0); object.scale.set(0.009 * (1 - t), 0.016 * (1 - t), 0.009 * (1 - t));
        object.updateMatrix(); splash.current.setMatrixAt(count++, object.matrix);
      }
      splash.current.count = count; splash.current.visible = count > 0;
      if (count) splash.current.instanceMatrix.needsUpdate = true;
      (splash.current.material as THREE.MeshStandardMaterial).color.set(donor?.color ?? '#dbeafe');
    }
    if (ripples.current) {
      ripples.current.visible = !!contact && e.sample.volume_ml > 0.01;
      if (ripples.current.visible) for (let i = 0; i < 3; i++) {
        const t = (e.elapsed * 1.5 + i / 3) % 1;
        object.position.set(lip[0] + 0.12, surface + 0.006 + i * 0.001, lip[2]); object.rotation.set(-Math.PI / 2, 0, 0);
        object.scale.setScalar(0.03 + t * 0.28); object.updateMatrix(); ripples.current.setMatrixAt(i, object.matrix);
      }
      ripples.current.instanceMatrix.needsUpdate = !!ripples.current.visible;
    }
  });
  return <>
    <instancedMesh ref={stream} args={[undefined, undefined, 16]} frustumCulled={false} visible={false} name="auto_transfer_stream"><cylinderGeometry args={[1, 1, 1, 8]} /><meshStandardMaterial transparent opacity={0.78} roughness={0.1} metalness={0.1} depthWrite={false} /></instancedMesh>
    {e.donors.map((donor, index) => donor.solid && <AutoSolidFlights key={index} experiment={e} index={index} />)}
    <instancedMesh ref={splash} args={[undefined, undefined, 16]} frustumCulled={false} visible={false}><sphereGeometry args={[1, 6, 4]} /><meshStandardMaterial transparent opacity={0.55} depthWrite={false} /></instancedMesh>
    <instancedMesh ref={ripples} args={[undefined, undefined, 3]} count={3} frustumCulled={false} visible={false}><ringGeometry args={[0.92, 1, 32]} /><meshBasicMaterial color="#c4e9ef" transparent opacity={0.23} depthWrite={false} side={THREE.DoubleSide} /></instancedMesh>
  </>;
}
function ConditionTools({ experiment: e }: { experiment: AutoExperiment }) {
  const flame = useRef<THREE.Mesh>(null), heat = useRef<THREE.Mesh>(null), rod = useRef<THREE.Group>(null);
  const heating = (e.program.chemistry.conditions?.minTemp_c ?? 25) > 25
    || !!getLessonDefinition(e.program.id)?.conditions.some(c => c.kind === 'temperature' && (c.minimum ?? 25) > 25);
  const ignition = e.program.chemistry.conditions?.activation === 'ignition' || e.program.chemistry.representation === 'emission';
  const stirring = e.program.chemistry.representation !== 'emission' && e.donors.some(d => d.row.phase === 'aq' || d.row.phase === 'l');
  const flameColor = e.program.visual.timeline.find(a => a.atom === 'flameCone')?.params.flameColor;
  useFrame(() => {
    if (flame.current) {
      flame.current.visible = e.flame && ignition;
      flame.current.scale.y = 1 + Math.sin(e.elapsed * 17) * 0.06;
      (flame.current.material as THREE.MeshBasicMaterial).color.set(e.lessonVisuals?.flameColor
        ?? (e.program.id === 'mg_o2_burn' ? '#fff4e1' : typeof flameColor === 'string' ? flameColor : '#57c9ff'));
    }
    if (heat.current) {
      (heat.current.material as THREE.MeshBasicMaterial).opacity = e.flame ? 0.3 + 0.12 * Math.sin(e.elapsed * 5) : 0.05;
    }
    if (rod.current) {
      const t = e.phase === 'condition' ? Math.min(1, e.phaseTime / 1.4) : e.phase === 'react' ? 1
        : e.phase === 'observe' ? Math.max(0, 1 - e.phaseTime / 1.4) : 0;
      const f = t * t * (3 - 2 * t), angle = e.physics.vortex.phase_rad;
      rod.current.position.set(2.1 * (1 - f) + Math.cos(angle) * 0.16 * f, 0.07 + f * 1.2 + Math.sin(t * Math.PI), -1.3 * (1 - f) + Math.sin(angle) * 0.16 * f);
      rod.current.rotation.set(0, 0, (1 - f) * Math.PI / 2 + f * 0.12);
    }
  });
  return <>
    {(heating || ignition) && <mesh ref={heat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}><ringGeometry args={[0.97, 1.08, 48]} /><meshBasicMaterial color="#ff9b44" transparent opacity={0.05} depthWrite={false} /></mesh>}
    {ignition && <mesh ref={flame} position={[0.5, 0.38, 0]} visible={false}><coneGeometry args={[0.08, 0.45, 16]} /><meshBasicMaterial color="#38bdf8" transparent opacity={0.85} depthWrite={false} /></mesh>}
    {stirring && <group ref={rod}><mesh><cylinderGeometry args={[0.025, 0.025, 1.95, 12]} /><meshPhysicalMaterial color="#d9eff8" transparent opacity={0.55} roughness={0.05} depthWrite={false} /></mesh></group>}
  </>;
}
function BenchShadows({ experiment: e }: { experiment: AutoExperiment }) {
  const mesh = useRef<THREE.InstancedMesh>(null), scratch = useMemo(() => new THREE.Object3D(), []);
  const texture = useMemo(() => getSoftParticleTexture(64), []);
  useFrame(() => {
    if (!mesh.current) return;
    for (let i = 0; i <= e.donors.length; i++) {
      const position = i === e.donors.length ? [0, 1.04, 0] : i === e.donorIndex ? e.donorPose.position
        : e.donors[i].row.phase === 'g' ? gasSourceHome(e.gasOrdinal(i), e.donors[i].row.moles) : donorHome(i);
      scratch.position.set(position[0], 0.006, position[2]); scratch.rotation.set(-Math.PI / 2, 0, 0);
      scratch.scale.setScalar(i === e.donors.length ? 2.8 : 1.7); scratch.updateMatrix(); mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, e.donors.length + 1]} count={e.donors.length + 1} frustumCulled={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={texture} color="#000000" transparent opacity={0.4} depthWrite={false} /></instancedMesh>;
}
function Choreography({ experiment: e }: { experiment: AutoExperiment }) {
  return <>
    {e.donors.map((d, i) => <Donor key={`${d.row.formula}:${i}`} experiment={e} index={i} />)}
    <Transfer experiment={e} /><ConditionTools experiment={e} /><BenchShadows experiment={e} />
    {e.hasGasSupply && <AutoGasReceiver experiment={e} />}
  </>;
}
function Receiver({ experiment: e }: { experiment: AutoExperiment }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (root.current) root.current.position.y = 1.04 + (e.phase === 'prepare' ? Math.max(0, 1 - e.phaseTime / 1.2) ** 2 * 0.6 : 0);
  });
  return <group ref={root} position={[0, 1.04, 0]}><Glass><AutoLiquid experiment={e} /><Specimen experiment={e} /><Particles experiment={e} /></Glass></group>;
}
function Director({ experiment: e }: { experiment: AutoExperiment }) {
  const controls = useRef<any>(null);
  const invalidate = useThree(s => s.invalidate);
  const position = useMemo(() => new THREE.Vector3(), []), target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, delta) => {
    if (!document.hidden) e.tick(delta);
    if (controls.current) controls.current.enabled = !e.automaticCamera;
    if (e.automaticCamera) {
      const pose = cameraPoses[e.camera]; position.set(...pose[0]); target.set(...pose[1]);
      const portrait = size.width < size.height * 0.85;
      if (portrait) {
        position.set(2.5, e.camera === 'surface' ? 4.3 : 3.4, e.camera === 'wide' ? 12 : e.camera === 'transfer' ? 9.5 : 8);
        target.set(e.camera === 'wide' ? -0.6 : 0, 1.3, 0);
      }
      const perspective = camera as THREE.PerspectiveCamera;
      if (perspective.fov !== (portrait ? 45 : 38)) { perspective.fov = portrait ? 45 : 38; perspective.updateProjectionMatrix(); }
      const alpha = 1 - Math.exp(-delta * 2.4);
      camera.position.lerp(position, alpha); controls.current?.target.lerp(target, alpha); controls.current?.update();
      if (e.paused && camera.position.distanceToSquared(position) > 0.00001) invalidate();
    }
  }, -3);
  return <OrbitControls ref={controls} makeDefault target={[-0.8, 1.1, 0]} enabled={!e.automaticCamera} minDistance={2.5} maxDistance={16} maxPolarAngle={1.5} />;
}
function AutoRenderActivity({ experiment: e }: { experiment: AutoExperiment }) {
  const { gl, setFrameloop, invalidate } = useThree();
  useEffect(() => {
    let contextLost = false, previousView = '', previousMode = '';
    const update = () => {
      const mode = document.hidden || contextLost ? 'never' : e.paused ? 'demand' : 'always';
      if (mode !== previousMode) { previousMode = mode; setFrameloop(mode); if (mode !== 'never') invalidate(); }
      const view = `${e.camera}:${e.automaticCamera}`;
      if (view !== previousView && mode !== 'never') { previousView = view; invalidate(); }
    };
    const lost = (event: Event) => { event.preventDefault(); contextLost = true; update(); };
    const restored = () => { contextLost = false; update(); };
    const timer = window.setInterval(update, 100);
    document.addEventListener('visibilitychange', update);
    gl.domElement.addEventListener('webglcontextlost', lost); gl.domElement.addEventListener('webglcontextrestored', restored);
    update();
    return () => {
      clearInterval(timer); document.removeEventListener('visibilitychange', update);
      gl.domElement.removeEventListener('webglcontextlost', lost); gl.domElement.removeEventListener('webglcontextrestored', restored);
    };
  }, [e, gl, setFrameloop, invalidate]);
  return null;
}
export const AutoExperimentScene = React.memo(function AutoExperimentScene({ experiment, runKey = experiment.program.id }: { experiment: AutoExperiment; runKey?: number | string }) {
  const container = useRef<HTMLDivElement>(null), tier = useQualityStore(s => s.effectiveTier);
  const dpr = useRenderDpr(container, tier);
  useEffect(() => {
    let active = true;
    void experiment.stocks.initialize().catch(error => {
      if (active) { experiment.error = error instanceof Error ? error.message : 'Không thể khởi tạo vật lí chất rắn.'; experiment.phase = 'error'; }
    });
    return () => { active = false; experiment.stocks.dispose(); };
  }, [experiment]);
  const species = useMemo(() => {
    const present = new Set([...experiment.program.chemistry.species.map(s => s.formula), ...experiment.program.visual.after.gasesOffgassed.map(g => g.species)]);
    return gasSpecies.filter(s => present.has(s));
  }, [experiment]);
  return <div ref={container} className="h-full w-full"><Canvas camera={{ position: [5.8, 4.3, 8.5], fov: 38, near: 0.05, far: 70 }} dpr={dpr} gl={{ antialias: true, alpha: false }}
    onCreated={({ gl }) => {
      gl.localClippingEnabled = true;
      const context = gl.getContext(), extension = context.getExtension('WEBGL_debug_renderer_info');
      if (extension) useQualityStore.getState().configureRenderer(String(context.getParameter(extension.UNMASKED_RENDERER_WEBGL)));
    }}>
    <FrameTelemetry /><AutoRenderActivity experiment={experiment} />
    <color attach="background" args={['#091321']} /><fog attach="fog" args={['#091321', 14, 30]} />
    <ambientLight intensity={0.8} /><directionalLight position={[4, 8, 4]} intensity={3} color="#d7efff" />
    <pointLight position={[-4, 4, -2]} intensity={40} color="#72d9ff" /><pointLight position={[3, 3, -4]} intensity={25} color="#ffc992" />
    <Environment resolution={128} frames={1}><Lightformer intensity={4} position={[0, 5, -4]} scale={[8, 4, 1]} />
      <Lightformer intensity={2} position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[3, 5, 1]} /></Environment>
    <Director experiment={experiment} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#162637" metalness={0.2} roughness={0.42} /></mesh>
    <gridHelper args={[16, 32, '#284254', '#1b3040']} position={[0, 0.002, 0]} />
    <group key={runKey}>
    <Receiver experiment={experiment} />
    <Choreography experiment={experiment} />
    <group>{species.map(species => <GasCloudLayer key={species} species={species} repository={experiment.clouds} />)}</group>
    </group>
  </Canvas></div>;
});
