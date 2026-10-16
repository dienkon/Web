import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { useQualityStore, getQualitySettings } from '../vfx/quality';
import { getGlassMaterials, createVesselLatheGeometry } from '../vfx/materials/glass';
import { lessonRuntime } from './runtime';
import { tickLessonLab, useLessonLabStore } from './labBridge';
import { requireLessonDefinition } from './catalog';
import { lessonParticleBudget } from './chemistry/optics';

const BUBBLE_COUNT = 64;
const bubbleVertex = `
attribute float aSize;
varying float vLife;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = clamp(aSize * 180.0 / max(0.1, -viewPosition.z), 1.0, 18.0);
  vLife = aSize;
}`;
const bubbleFragment = `
varying float vLife;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float radius = length(uv);
  if (radius > 1.0 || vLife <= 0.0) discard;
  float ring = smoothstep(0.55, 0.92, radius) * (1.0 - smoothstep(0.92, 1.0, radius));
  float highlight = exp(-dot(uv - vec2(-0.3, 0.35), uv - vec2(-0.3, 0.35)) * 22.0);
  gl_FragColor = vec4(vec3(0.82, 0.94, 1.0), ring * 0.5 + highlight * 0.3);
}`;

function deterministicFraction(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 374761393)) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function LessonCondensation({ sessionId }: { sessionId: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const transform = useMemo(() => new THREE.Object3D(), []);
  const cachedAmount = useRef(-1);
  const cachedSeed = useRef(-1);
  const dropCount = 20;
  useFrame(() => {
    const session = lessonRuntime.get(sessionId);
    const target = mesh.current;
    if (!session || !target) return;
    const amount = session.visuals.condensation;
    target.visible = amount > 0.01;
    if (!target.visible) return;
    // Condensation is a cold-wall observation, separate from gas generation.
    // Update only after a meaningful change, rather than rewriting all matrices
    // every frame while a completed sample remains on the workbench.
    const quantized = Math.round(amount * 40) / 40;
    if (quantized === cachedAmount.current && session.seed === cachedSeed.current) return;
    cachedAmount.current = quantized;
    cachedSeed.current = session.seed;
    const count = Math.max(1, Math.round(dropCount * quantized));
    target.count = count;
    for (let index = 0; index < count; index++) {
      const fraction = deterministicFraction(session.seed + 13, index);
      const angle = fraction * Math.PI * 2;
      const height = 0.35 + deterministicFraction(session.seed + 19, index) * 0.48;
      const size = 0.018 + deterministicFraction(session.seed + 29, index) * 0.018;
      transform.position.set(Math.cos(angle) * 0.66, height, Math.sin(angle) * 0.66);
      transform.scale.set(size, size * 1.45, size);
      transform.rotation.set(0, -angle, 0);
      transform.updateMatrix();
      target.setMatrixAt(index, transform.matrix);
    }
    target.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, dropCount]} visible={false} frustumCulled={false} raycast={() => null}>
    <sphereGeometry args={[1, 8, 6]} />
    <meshStandardMaterial color="#e9f6ff" transparent opacity={0.55} roughness={0.12} depthWrite={false} />
  </instancedMesh>;
}

function LessonBubbles({ sessionId }: { sessionId: string }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry();
    value.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BUBBLE_COUNT * 3), 3));
    value.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(BUBBLE_COUNT), 1));
    value.setDrawRange(0, 0);
    return value;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    const session = lessonRuntime.get(sessionId);
    if (!session || !points.current) return;
    const quality = getQualitySettings(useQualityStore.getState().effectiveTier);
    const count = session.volume_ml > 0
      ? lessonParticleBudget(session.visuals.gasRate_mol_s, quality.particleMultiplier, BUBBLE_COUNT)
      : 0;
    points.current.visible = count > 0;
    geometry.setDrawRange(0, count);
    if (!count) return;
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizes = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const time = clock.elapsedTime;
    for (let index = 0; index < count; index++) {
      const seed = deterministicFraction(session.seed, index);
      const phase = (time * (0.4 + seed * 0.3) + seed * 7) % 1;
      const angle = seed * Math.PI * 2 + Math.sin(time + index) * 0.12;
      const radius = 0.08 + deterministicFraction(session.seed + 5, index) * 0.35;
      positions.setXYZ(index, Math.cos(angle) * radius, -0.72 + phase * 0.9, Math.sin(angle) * radius);
      sizes.setX(index, (0.4 + seed * 0.45) * Math.sin(Math.PI * Math.min(0.99, phase + 0.05)));
    }
    positions.needsUpdate = true;
    sizes.needsUpdate = true;
  });
  return <points ref={points} geometry={geometry} frustumCulled={false}>
    <shaderMaterial vertexShader={bubbleVertex} fragmentShader={bubbleFragment} transparent depthWrite={false} />
  </points>;
}

function LessonVessel({ sessionId }: { sessionId: string }) {
  const session = lessonRuntime.get(sessionId);
  const vesselId = session?.vesselId ?? '';
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const selected = useAppStore(state => state.selectedVesselId === vesselId);
  const tier = useQualityStore(state => state.effectiveTier);
  const vesselType = vessel?.type ?? 'beaker';
  const geometry = useMemo(() => createVesselLatheGeometry(vesselType, 24), [vesselType]);
  useEffect(() => () => {
    geometry.outer.dispose();
    geometry.inner.dispose();
  }, [geometry]);
  const glass = useMemo(() => getGlassMaterials(tier), [tier]);
  const liquid = useRef<THREE.MeshStandardMaterial>(null);
  const flame = useRef<THREE.Mesh>(null);
  const flameMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const sediment = useRef<THREE.Mesh>(null);
  const sedimentMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const solid = useRef<THREE.Mesh>(null);
  const solidMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const deposition = useRef<THREE.Mesh>(null);
  const upperPhase = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const current = lessonRuntime.get(sessionId);
    if (!current) return;
    const visuals = current.visuals;
    if (liquid.current) {
      liquid.current.color.set(visuals.color);
      liquid.current.opacity = 0.3 + visuals.turbidity * 0.5;
      liquid.current.roughness = 0.08 + visuals.turbidity * 0.25;
    }
    if (flame.current && flameMaterial.current) {
      flame.current.visible = visuals.flame > 0.001;
      const flicker = 1 + Math.sin(clock.elapsedTime * 15 + current.seed) * 0.08;
      flame.current.scale.set(0.8, (0.3 + visuals.flame * 0.6) * flicker, 0.8);
      flameMaterial.current.color.set(visuals.flameColor);
      flameMaterial.current.opacity = 0.45 + visuals.flame * 0.2;
    }
    if (sediment.current && sedimentMaterial.current) {
      sediment.current.visible = visuals.precipitate_g > 1e-9;
      sediment.current.scale.y = Math.max(0.1, Math.min(3, Math.cbrt(visuals.precipitate_g) * 2));
      sedimentMaterial.current.color.set(visuals.precipitateColor);
    }
    if (solid.current && solidMaterial.current) {
      solid.current.visible = visuals.solidRemaining_g > 1e-9;
      const size = Math.min(0.4, Math.cbrt(Math.max(0, visuals.solidRemaining_g)) * 0.3);
      solid.current.scale.setScalar(size);
      solidMaterial.current.color.set(visuals.solidColor);
    }
    if (deposition.current) {
      deposition.current.visible = visuals.deposition > 0.001;
      deposition.current.scale.setScalar(Math.max(0.01, visuals.deposition));
    }
    if (upperPhase.current) {
      upperPhase.current.visible = visuals.phaseSplit > 0.01;
      upperPhase.current.scale.y = Math.max(0.01, visuals.phaseSplit);
    }
    const state = useAppStore.getState();
    if (group.current && state.vessels[vesselId]) {
      group.current.position.set(...state.vessels[vesselId].position);
      group.current.rotation.y = state.vessels[vesselId].rotationY ?? 0;
    }
  });
  if (!session || !vessel) return null;
  const definition = requireLessonDefinition(session.definitionId);
  return <group ref={group} position={vessel.position} name={`lesson-scene-${sessionId}`}
    onPointerDown={event => {
      event.stopPropagation();
      const state = useAppStore.getState();
      state.setSelectedVesselId(vesselId);
      useLessonLabStore.getState().select(sessionId);
      if (state.moveMode && !vessel.isLocked) state.setDraggingVesselId(vesselId);
    }}>
    <mesh geometry={geometry.outer} material={glass.front} dispose={null} />
    <mesh geometry={geometry.inner} material={glass.back} dispose={null} />
    <mesh position={[0, -0.3, 0]} visible={session.volume_ml > 0}>
      <cylinderGeometry args={[0.62, 0.6, 1.15, 24]} />
      <meshStandardMaterial ref={liquid} color={definition.initialColor} transparent opacity={0.3} depthWrite={false} />
    </mesh>
    <mesh position={[0, -0.86, 0]} ref={sediment} visible={false}>
      <cylinderGeometry args={[0.48, 0.5, 0.06, 20]} />
      <meshStandardMaterial ref={sedimentMaterial} color="#ffffff" roughness={0.85} />
    </mesh>
    <mesh position={[0.12, -0.68, 0]} ref={solid}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial ref={solidMaterial} color="#ffffff" roughness={0.72} />
    </mesh>
    <mesh position={[0.12, -0.65, 0]} ref={deposition} visible={false}>
      <sphereGeometry args={[0.23, 14, 10]} />
      <meshStandardMaterial color="#b85d37" roughness={0.3} metalness={0.8} />
    </mesh>
    <mesh position={[0, 0.28, 0]} ref={upperPhase} visible={false}>
      <cylinderGeometry args={[0.6, 0.6, 0.12, 20]} />
      <meshStandardMaterial color="#f2ecd8" transparent opacity={0.45} roughness={0.05} depthWrite={false} />
    </mesh>
    <mesh position={[0, 0.85, 0]} ref={flame} visible={false}>
      <coneGeometry args={[0.22, 1, 14, 1, true]} />
      <meshBasicMaterial ref={flameMaterial} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <LessonBubbles sessionId={sessionId} />
    <LessonCondensation sessionId={sessionId} />
    {selected && <mesh position={[0, -0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.75, 0.79, 40]} />
      <meshBasicMaterial color="#14b8a6" transparent opacity={0.8} />
    </mesh>}
    <Html position={[0, 1.25, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
      <span className="whitespace-nowrap rounded bg-white/90 border border-teal-300 px-2 py-1 text-[10px] text-teal-900">
        {definition.title_vi}
      </span>
    </Html>
  </group>;
}

export function LessonScene() {
  const sessionIds = useLessonLabStore(state => state.sessionIds);
  useFrame((_, delta) => tickLessonLab(delta));
  return <group name="lesson-simulation-layer">
    {sessionIds.map(id => <LessonVessel key={id} sessionId={id} />)}
  </group>;
}
