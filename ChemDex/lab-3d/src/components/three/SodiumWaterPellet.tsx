import { simulationFrameDt } from '../../core/clock';
import { hydrogenExhaustAnchor } from '../../engine/hydrogenExhaustCombustion';
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { reactionSimulationEngine } from '../../vfx/reactions/ReactionSimulationEngine';
import { isSodiumWaterReaction, sodiumPelletThermal, sodiumMetalMass } from '../../science/sodiumWater';
import { sodiumSurfaceRadius } from '../../science/vesselGeometry';
import { applySodiumPelletShape, sodiumPelletPlacement } from '../../vfx/geometry/sodiumPellet';
import { sodiumWaterGasMolesPerSecond } from '../../engine/sodiumWaterPlan';
import { createProceduralFlameMaterial } from '../../vfx/materials/flameShader';
import { labSound } from '../../utils/audio';

const TRAIL_COUNT = 60;
const BUBBLE_COUNT = 24;

/** All coordinates are vessel-local. The pellet, bubbles, and wake share one
 * liquid contact point; only actual inventory supplies the visible metal. */
export function SodiumWaterPellet({ vesselId }: { vesselId: string }) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const pellet = useRef<THREE.Mesh>(null);
  const meniscus = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const motion = useRef({ x: 0, z: 0, time: 0, lastDrop: 0, lastSound: 0,
    gasCredit: 0, nextBubble: 0,
    gas: Array.from({ length: BUBBLE_COUNT }, () => ({ x: 0, z: 0, y: 0, size: 0, age: 0, life: 0 })),
    points: [] as { x: number; z: number; age: number }[] });
  const scratch = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const flameMaterial = useMemo(() => createProceduralFlameMaterial(), []);
  useEffect(() => () => { geometry.dispose(); flameMaterial.dispose(); }, [geometry, flameMaterial]);

  useFrame((_, delta) => {
    const state = useAppStore.getState();
    const v = state.vessels[vesselId];
    if (!v || !pellet.current) return;
    const kinetics = state.activeKinetics[vesselId];
    const runtime = reactionSimulationEngine.getRuntime(vesselId);
    const data = isSodiumWaterReaction(runtime?.reactionId) ? runtime?.customData : undefined;

    if (v.isShattered) {
      pellet.current.visible = false;
      if (meniscus.current) meniscus.current.visible = false;
      if (flame.current) flame.current.visible = false;
      if (bubbles.current) bubbles.current.visible = false;
      if (trail.current) trail.current.visible = false;
      if (light.current) light.current.intensity = 0;
      return;
    }

    const mass = sodiumMetalMass(v);
    const active = isSodiumWaterReaction(kinetics?.reactionId) && (kinetics?.progress ?? 1) < 1;
    const hasIndicator = v.contents.some(item => item.formula === 'Phenolphthalein' && item.moles > 1e-12);
    const paused = state.isSimulationPaused;
    const dt = simulationFrameDt(delta, state);
    const m = motion.current;
    m.time += dt;
    const initialMass = kinetics?.initialVesselBaseline ? sodiumMetalMass(kinetics.initialVesselBaseline) : mass;
    const reactedFraction = initialMass > 0 ? Math.max(0, Math.min(1, 1 - mass / initialMass)) : 0;
    const thermal = sodiumPelletThermal(reactedFraction, v.temperature_c, v.environment?.airSpeed_m_s);
    const melt = active ? data?.meltFactor ?? thermal.meltFactor : 0;
    const body = sodiumPelletPlacement(v, mass, melt);
    const { radius, surface, floor, hasWater } = body;
    const flamePower_W = v.hydrogenCombustion?.power_W ?? 0;
    const ignited = active && hasWater && !v.isSealed && v.hydrogenCombustion?.burning === true && flamePower_W > 0;
    const maxRadius = Math.max(0, sodiumSurfaceRadius(v) - body.horizontalRadius);
    if (data && typeof data.x === 'number' && typeof data.z === 'number' && hasWater) {
      m.x = data.x;
      m.z = data.z;
    } else if (active && hasWater) {
      // Autonomous orbital skittering fallback ("chạy vòng vòng")
      const orbitSpeed = (3.2 + melt * 1.8);
      const orbitAngle = m.time * orbitSpeed;
      const breathingRadius = maxRadius * (0.55 + 0.38 * Math.sin(m.time * 1.5));
      m.x = Math.cos(orbitAngle) * breathingRadius;
      m.z = Math.sin(orbitAngle) * breathingRadius;
    } else if (!hasWater) {
      m.x = 0;
      m.z = 0;
    }
    const distance = Math.hypot(m.x, m.z);
    if (distance > maxRadius && maxRadius > 0) { m.x *= maxRadius / distance; m.z *= maxRadius / distance; }
    pellet.current.visible = mass > 1e-10;
    pellet.current.position.set(m.x, body.centerY, m.z);
    pellet.current.scale.setScalar(radius);
    pellet.current.rotation.y = active ? m.time * (1 + melt * 4) : 0;
    applySodiumPelletShape(geometry, body.shape);
    const material = pellet.current.material as THREE.MeshStandardMaterial;
    material.roughness = 0.32 - melt * 0.23;
    // Molten sodium at ~98 °C is silvery, without visible incandescence.
    material.emissiveIntensity = 0;

    if (meniscus.current) {
      meniscus.current.visible = hasWater && mass > 1e-10;
      meniscus.current.position.set(m.x, surface + 0.002, m.z);
      meniscus.current.scale.setScalar(radius * 1.5);
    }
    if (active && hasWater && hasIndicator && m.time - m.lastDrop >= 0.06 && dt > 0) {
      m.lastDrop = m.time;
      m.points.push({ x: m.x, z: m.z, age: 0 });
      if (m.points.length > TRAIL_COUNT) m.points.shift();
    }
    for (const point of m.points) point.age += dt;
    m.points = m.points.filter(point => point.age < 2.2);
    if (trail.current) {
      trail.current.visible = hasWater && hasIndicator && m.points.length > 0;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const point = m.points[i];
        scratch.rotation.set(-Math.PI / 2, 0, 0);
        scratch.position.set(point?.x ?? 0, surface + 0.003, point?.z ?? 0);
        const edge = point ? Math.max(0, sodiumSurfaceRadius(v) - Math.hypot(point.x, point.z)) : 0;
        const size = point ? Math.min(edge, 0.05 + point.age * 0.08) * Math.sqrt(1 - point.age / 2.2) : 0;
        scratch.scale.setScalar(size); scratch.updateMatrix();
        trail.current.setMatrixAt(i, scratch.matrix);
      }
      trail.current.instanceMatrix.needsUpdate = true;
    }
    if (bubbles.current) {
      // Particles represent 0.05 mL gas packets, NOT individual molecular bubbles.
      // The finite H2 ledger sets emission; a full pool discards visual packets.
      const gasMl_s = active && hasWater && kinetics ? sodiumWaterGasMolesPerSecond(kinetics)
        * 82.057 * (v.temperature_c + 273.15) / (v.environment?.pressure_atm ?? 1) : 0;
      m.gasCredit = gasMl_s > 0 ? Math.min(BUBBLE_COUNT, m.gasCredit + gasMl_s / 0.05 * dt) : 0;
      const depth = Math.max(0, surface - floor);
      for (let i = 0; i < BUBBLE_COUNT; i++) {
        const bubble = m.gas[i];
        if (bubble.life > 0) { bubble.age += dt; if (bubble.age >= bubble.life) bubble.life = 0; }
        if (!bubble.life && m.gasCredit >= 1 && dt > 0 && depth > 1e-6) {
          m.gasCredit -= 1;
          const angle = m.nextBubble++ * 2.39996;
          bubble.size = Math.min(radius * 0.16, 0.01, depth * 0.2);
          const spread = body.horizontalRadius + bubble.size;
          bubble.x = m.x + Math.cos(angle) * spread; bubble.z = m.z + Math.sin(angle) * spread;
          const distance = Math.hypot(bubble.x, bubble.z), edge = Math.max(0, sodiumSurfaceRadius(v) - bubble.size);
          if (distance > edge) { bubble.x *= edge / distance; bubble.z *= edge / distance; }
          bubble.y = Math.max(floor + bubble.size, Math.min(surface - bubble.size, body.bottomY + radius * 0.3));
          bubble.age = 0; bubble.life = Math.max(0.025, (surface - bubble.y) / 0.15);
        }
        const phase = bubble.life > 0 ? bubble.age / bubble.life : 1;
        scratch.rotation.set(0, 0, 0);
        scratch.position.set(bubble.x, bubble.y + (surface - bubble.y) * phase, bubble.z);
        const bubbleSize = hasWater && bubble.life > 0 ? bubble.size * Math.sin(Math.PI * phase) : 0;
        scratch.scale.setScalar(bubbleSize); scratch.updateMatrix();
        bubbles.current.setMatrixAt(i, scratch.matrix);
      }
      bubbles.current.visible = hasWater && m.gas.some(bubble => bubble.life > 0);
      bubbles.current.instanceMatrix.needsUpdate = true;
    }
    if (flame.current) {
      flame.current.visible = ignited;
      const flameScale = 0.7 * Math.cbrt(Math.max(0, flamePower_W) / 75); // illustrative optical scale, not a flame-height law
      const [x, y, z] = hydrogenExhaustAnchor(v, [m.x, m.z]);
      flame.current.position.set(x, y + 0.325 * flameScale, z);
      flame.current.scale.setScalar(flameScale);
      flameMaterial.uniforms.uTime.value = m.time;
      flameMaterial.uniforms.uIntensity.value = Math.min(2.5, flamePower_W / 75);
    }
    if (light.current) {
      const [x, y, z] = hydrogenExhaustAnchor(v, [m.x, m.z]);
      light.current.position.set(x, y + 0.1, z);
      const baseLight = Math.min(0.6, 0.15 * flamePower_W / 75);
      const flickerFreq = 32;
      light.current.intensity = ignited ? baseLight * (1 + Math.sin(m.time * flickerFreq) * 0.12) : 0;
      light.current.distance = 2;
    }
    if (active && hasWater && !paused && !runtime && m.time - m.lastSound > 0.45 && !v.isShattered) {
      labSound.playSodiumSizzlePop(0.25, 0); m.lastSound = m.time;
    }
  });

  if (!vessel) return null;
  return <group name={`sodium-contact-${vesselId}`}>
    <mesh ref={pellet} name="sodium-metal" geometry={geometry} castShadow dispose={null}>
      <meshStandardMaterial color="#cbd5df" metalness={0.92} roughness={0.28} />
    </mesh>
    <mesh ref={meniscus} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.55, 1, 32]} />
      <meshBasicMaterial color="#c4d6df" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <instancedMesh ref={trail} args={[undefined, undefined, TRAIL_COUNT]} visible={false} frustumCulled={false}>
      <circleGeometry args={[1, 20]} />
      <meshBasicMaterial color="#ec4899" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
    <instancedMesh ref={bubbles} args={[undefined, undefined, BUBBLE_COUNT]} visible={false} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshPhysicalMaterial color="#f8fafc" transparent opacity={0.55} roughness={0.06} metalness={0.1} depthWrite={false} />
    </instancedMesh>
    <mesh ref={flame} material={flameMaterial} visible={false} dispose={null}>
      <coneGeometry args={[0.1, 0.65, 16, 24]} />
    </mesh>
    <pointLight ref={light} color="#9ccfff" intensity={0} distance={2} />
  </group>;
}
