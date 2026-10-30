import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical, getSolidMorphology, SolidMorphology } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { solidInventoryFraction } from '../../engine/solidInventory';
import { reactionSimulationEngine } from '../../vfx/reactions/ReactionSimulationEngine';
import { waterPhaseMasses } from '../../engine/waterPhase';
import { liquidGeometry, solidBlockDimensions } from '../../science/vesselDimensions';
import { vesselLiquidSurfaceY } from '../../science/vesselGeometry';
import { ICE_DENSITY_G_ML } from '../../engine/waterProperties';
import { SodiumWaterPellet } from './SodiumWaterPellet';
import { metalSurfaceAppearance } from '../../science/metalSurfaceAppearance';
import { isSuspensionRow } from '../../science/precipitateInventory';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { createStockSolidGeometry, geometryVolume, stockSolidChunkCount } from './stockSolidGeometry';
import { createStockSolidLayout, type StockSolidLayout } from './stockSolidLayout';
import { createPowderPileGeometry } from './powderPileGeometry';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { getPrecipitateProfile } from '../../simulation/core/SimulationConfig';
import { simulationFrameDt } from '../../core/clock';
import { sameMolecularFormula } from '../../science/speciesIdentity';
import { createPrecipitateGeometry } from '../../simulation/render/precipitateGeometry';
import { getNoiseTexture } from '../../vfx/textures';

// Shared scratch objects for zero-allocation per-frame transforms
const _dummyMat4 = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();

interface SolidContentsRendererProps {
  vesselId: string;
  radius?: number;
  baseY?: number;
}

const EMPTY_DISSOLVING: Record<string, number> = {};

export const SolidContentsRenderer = React.memo(function SolidContentsRenderer({
  vesselId,
  radius = 0.75,
  baseY = -0.95,
}: SolidContentsRendererProps) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[vesselId]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;
  const stirringVesselId = useAppStore(state => state.stirringVesselId);
  const isStirring = stirringVesselId === vesselId;

  if (!vessel || !vessel.substances || vessel.substances.length === 0) {
    return null;
  }

  // Filter only solid substances present in the vessel
  const solidSubstances = vessel.substances.filter(sub => {
    const entries = vessel.contents.filter(item => item.formula === sub);
    if (entries.length) return entries.some(item => item.phase === 's' && item.location !== 'filter' && item.mass_g > 0
      && (vessel.volume_ml <= 0.05 || !isSuspensionRow(item, vessel.contents, vessel.precipitateSubstance)));
    const chem = getChemical(sub);
    return chem && chem.type === 'solid' && vessel.volume_ml <= 0.05;
  });

  if (solidSubstances.length === 0) {
    return null;
  }

  return (
    <group name={`solids_${vesselId}`}>
      {solidSubstances.map((sub, idx) => {
        if (sub === 'H2O') return <WaterIceMesh key="water-ice" vesselId={vesselId} />;
        if (sub === 'Na') return <SodiumWaterPellet key={sub} vesselId={vesselId} />;
        if (sub === 'K') {
          return (
            <FloatingAlkaliMetalPellet
              key={`${sub}_${idx}`}
              substance={sub}
              vesselId={vesselId}
              vesselRadius={radius}
              baseY={baseY}
              dissolveProgress={dissolving[sub] || 0}
            />
          );
        }
        return (
          <SolidSubstanceMesh
            key={`${sub}_${idx}`}
            vesselId={vesselId}
            substance={sub}
            vesselRadius={radius}
            baseY={vessel.type === 'filter_funnel' ? baseY : liquidGeometry(vessel.type).floorY}
            dissolveProgress={dissolving[sub] || 0}
            isStirring={isStirring}
          />
        );
      })}
    </group>
  );
});

function WaterIceMesh({ vesselId }: { vesselId: string }) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  if (!vessel || vessel.isShattered) return null;
  const { ice_g } = waterPhaseMasses(vessel);
  if (ice_g <= 1e-10) return null;
  const chunk = solidBlockDimensions(vessel, ice_g / ICE_DENSITY_G_ML);
  const surface = vesselLiquidSurfaceY(vessel);
  const y = Math.max(chunk.floorY + chunk.height / 2, surface + chunk.height * (0.5 - ICE_DENSITY_G_ML));
  return <mesh name="water-ice" position={[0, y, 0]} scale={[chunk.width, chunk.height, chunk.width]} castShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshPhysicalMaterial color="#dbeef5" transmission={0.55} opacity={0.65} transparent
      roughness={0.15} thickness={0.4} ior={1.31} depthWrite={false} />
  </mesh>;
}

interface FloatingAlkaliMetalPelletProps {
  substance?: 'Na' | 'K' | string;
  vesselId: string;
  vesselRadius: number;
  baseY: number;
  dissolveProgress: number;
}

const MAX_SODIUM_TRAIL = 60;

export const FloatingAlkaliMetalPellet = React.memo(function FloatingAlkaliMetalPellet({
  substance = 'Na',
  vesselId,
  vesselRadius,
  baseY,
  dissolveProgress,
}: FloatingAlkaliMetalPelletProps) {
  const isPotassium = substance === 'K';
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);
  const flameGroupRef = useRef<THREE.Group>(null);
  const steamRef = useRef<THREE.Mesh>(null);
  const meniscusGroupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lastSoundTime = useRef(0);

  // Motion physics ref (zero GC)
  const motion = useRef({
    x: 0,
    z: 0,
    vx: isPotassium ? 0.48 : 0.35,
    vz: isPotassium ? 0.32 : 0.22,
    spin: 0,
    trail: [] as Array<{ x: number; z: number; age: number; maxAge: number }>,
    lastTrailDrop: 0,
  });

  const vessel = useAppStore(state => state.vessels[vesselId]);
  const kinetics = useAppStore(state => state.activeKinetics[vesselId]);

  const hasLiquid = (vessel?.volume_ml || 0) > 0.5 && !!vessel?.contents.some(c => c.formula === 'H2O' && c.phase === 'l' && c.mass_g > 0);
  const hasIndicator = !!vessel?.contents.some(c => c.formula === 'Phenolphthalein' && c.moles > 1e-12);
  const liquidSurfaceY = vessel ? vesselLiquidSurfaceY(vessel) : baseY;

  const isAlkaliReaction = ['k_h2o', 'potassium_water_reaction', 'K+H2O', 'potassium_water',
    'na_h2o', 'sodium_water', 'alkali_metal_water_na', 'Na+H2O', 'sodium_water_reaction', 'alkali_metal_water'].includes(kinetics?.reactionId ?? '');
  const reactionProgress = isAlkaliReaction ? kinetics.progress : 0;
  const inventoryFraction = solidInventoryFraction(vessel?.contents ?? [], substance);
  const effectiveProgress = inventoryFraction === null ? Math.max(dissolveProgress, reactionProgress) : 1 - inventoryFraction;
  const metalMass = (vessel?.contents ?? []).filter(c => c.formula === substance && c.phase === 's')
    .reduce((sum, c) => sum + Math.max(0, c.mass_g), 0);
  const isConsumed = metalMass <= 1e-10;

  // Molten metal droplet scale (shrinks from ~1.0 down to 0)
  const currentScale = vessel ? Math.cbrt(solidSceneVolume(vessel, metalMass / (isPotassium ? 0.862 : 0.971)) / (4 * Math.PI / 3)) / 0.13 : 0;

  useFrame((state, delta) => {
    if (!groupRef.current || !vessel || isConsumed) return;
    const dt = simulationFrameDt(delta, useAppStore.getState());
    const m = motion.current;
    const now = state.clock.elapsedTime;

    // Check if ReactionSimulationEngine has dedicated controller running for this vessel
    const simRuntime = reactionSimulationEngine.getRuntime(vesselId);
    const cd = simRuntime?.customData;

    const isReacting = hasLiquid && !!isAlkaliReaction && reactionProgress > 0 && reactionProgress < 1;
    const isMolten = isReacting && (cd?.isMolten ?? (effectiveProgress >= (isPotassium ? 0.12 : 0.28)));
    const isIgnited = isReacting && (cd?.isIgnited ?? (effectiveProgress >= (isPotassium ? 0.08 : 0.45) && effectiveProgress <= 0.94));

    const outerFlameColor = isPotassium ? '#c084fc' : '#fbbf24';
    const innerFlameColor = isPotassium ? '#f3e8ff' : '#fffbeb';
    const lightColor = isPotassium ? '#d8b4fe' : '#fbbf24';
    const emissiveColor = isPotassium ? '#c084fc' : '#d97706';

    if (hasLiquid) {
      if (cd && typeof cd.x === 'number' && typeof cd.z === 'number') {
        // Synchronize directly with ReactionSimulationEngine
        m.x = cd.x;
        m.z = cd.z;
        m.vx = cd.vx || 0;
        m.vz = cd.vz || 0;
      } else {
        // Fallback local stochastic jet dynamics
        const kickStrength = isReacting ? (isIgnited ? (isPotassium ? 4.8 : 3.4) : (isPotassium ? 3.0 : 2.4)) : 0.25;
        m.vx += (Math.random() - 0.5) * kickStrength * dt;
        m.vz += (Math.random() - 0.5) * kickStrength * dt;

        // Leidenfrost micro-gas cushion damping (low drag ~80% friction reduction)
        const dampingFactor = isReacting ? 0.94 : 0.86;
        const damping = Math.pow(dampingFactor, dt * 60);
        m.vx *= damping;
        m.vz *= damping;

        m.x += m.vx * dt;
        m.z += m.vz * dt;

        // Elastic wall reflection
        const maxR = vesselRadius * 0.72;
        const curDist = Math.hypot(m.x, m.z);
        if (curDist > maxR) {
          m.x = (m.x / curDist) * maxR;
          m.z = (m.z / curDist) * maxR;
          m.vx = -m.vx * 0.82;
          m.vz = -m.vz * 0.82;
        }
      }

      m.spin += dt * (isMolten ? (isPotassium ? 32.0 : 24.0) : 9.0);

      // Record swirling phenolphthalein trail in water wake
      if (isReacting && hasIndicator && now - m.lastTrailDrop > 0.045 && dt > 0) {
        m.lastTrailDrop = now;
        m.trail.push({ x: m.x, z: m.z, age: 0, maxAge: 2.2 });
      }

      // Age and clean trail
      for (let i = 0; i < m.trail.length; i++) {
        m.trail[i].age += dt;
      }
      while (m.trail.length > 0 && m.trail[0].age > m.trail[0].maxAge) {
        m.trail.shift();
      }

      // Update 60-slot InstancedMesh for swirling phenolphthalein trail (zero-GC, 60fps)
      if (trailMeshRef.current) {
        const count = m.trail.length;
        for (let i = 0; i < MAX_SODIUM_TRAIL; i++) {
          if (i < count) {
            const pt = m.trail[i];
            const frac = pt.age / pt.maxAge;
            const trailR = 0.045 * (1.0 + frac * 1.5);
            _dummyPos.set(pt.x, liquidSurfaceY + 0.002, pt.z);
            _dummyEuler.set(-Math.PI / 2, 0, 0);
            _dummyQuat.setFromEuler(_dummyEuler);
            _dummyScale.set(trailR, trailR, trailR);
            _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
            trailMeshRef.current.setMatrixAt(i, _dummyMat4);
          } else {
            _dummyPos.set(0, -9999, 0);
            _dummyScale.set(0, 0, 0);
            _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
            trailMeshRef.current.setMatrixAt(i, _dummyMat4);
          }
        }
        trailMeshRef.current.instanceMatrix.needsUpdate = true;
        trailMeshRef.current.visible = hasIndicator && count > 0;
      }

      // Slight floating meniscus bobbing
      const bobbing = Math.sin(now * 14.0) * 0.003;
      groupRef.current.position.set(m.x, liquidSurfaceY + 0.03 + bobbing, m.z);
      groupRef.current.rotation.y = m.spin;

      // Update Molten / Solid Pellet Mesh
      if (meshRef.current) {
        if (isMolten) {
          // Centrifugal oblate flattening: flattened vertically, bulging equator
          meshRef.current.scale.set(currentScale * 1.15, currentScale * 0.85, currentScale * 1.15);
        } else {
          // Irregular faceted solid block
          meshRef.current.scale.set(currentScale * 1.12, currentScale * 0.68, currentScale * 0.96);
        }
      }

      // Update Meniscus Depression Ring scale
      if (meniscusGroupRef.current) {
        meniscusGroupRef.current.scale.set(currentScale, currentScale, currentScale);
        meniscusGroupRef.current.visible = hasLiquid && !isConsumed;
      }

      // Update Alkali Metal Flame Cone & Core with turbulent flicker
      if (flameGroupRef.current) {
        flameGroupRef.current.visible = isIgnited;
        if (isIgnited) {
          const flicker = 1.0 + Math.sin(now * 45.0) * 0.16 + (Math.random() - 0.5) * 0.22;
          flameGroupRef.current.scale.set(currentScale * flicker, currentScale * flicker * 1.3, currentScale * flicker);
          flameGroupRef.current.position.y = 0.11 * currentScale + Math.sin(now * 25.0) * 0.004;
        }
      }

      // Update Micro-Steam puff
      if (steamRef.current) {
        const isSteaming = isReacting && (vessel.waterVaporOutflow_g_s ?? 0) > 1e-8;
        steamRef.current.visible = isSteaming;
        if (isSteaming) {
          const puff = 1.0 + Math.sin(now * 16.0) * 0.22;
          steamRef.current.scale.set(currentScale * 0.8 * puff, currentScale * 1.25 * puff, currentScale * 0.8 * puff);
        }
      }

      // Thermal glow during vigorous reaction
      if (lightRef.current) {
        lightRef.current.intensity = isIgnited ? 2.5 : 0;
      }

      // Continuous procedural audio sizzle and micro-pops
      if (isReacting) {
        if (now - lastSoundTime.current > (isPotassium ? 0.32 : 0.42)) {
          labSound.playSodiumSizzlePop(isPotassium ? 0.5 : 0.4, isIgnited ? 0.85 : 0.5);
          lastSoundTime.current = now;
        }
      }
    } else {
      // Dry vessel: exactly 1 metallic pellet resting quietly on the floor
      groupRef.current.position.set(0, baseY + 0.13 * currentScale, 0);
      if (lightRef.current) lightRef.current.intensity = 0;
      if (trailMeshRef.current) trailMeshRef.current.visible = false;
      if (flameGroupRef.current) flameGroupRef.current.visible = false;
      if (steamRef.current) steamRef.current.visible = false;
      if (meniscusGroupRef.current) meniscusGroupRef.current.visible = false;
    }
  });

  if (isConsumed) return null;

  const outerFlameColor = isPotassium ? '#c084fc' : '#fbbf24';
  const innerFlameColor = isPotassium ? '#f3e8ff' : '#fffbeb';
  const lightColor = isPotassium ? '#d8b4fe' : '#fbbf24';
  const emissiveColor = isPotassium ? '#c084fc' : '#d97706';

  return (
    <>
      {/* 0. Swirling Alkaline Phenolphthalein Trail across water surface (InstancedMesh) */}
      <instancedMesh
        ref={trailMeshRef}
        args={[undefined, undefined, MAX_SODIUM_TRAIL]}
        frustumCulled={false}
        renderOrder={4}
        visible={false}
      >
        <circleGeometry args={[1.0, 16]} />
        <meshBasicMaterial
          color="#f43f5e"
          transparent
          opacity={0.65}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <group ref={groupRef} position={[0, hasLiquid ? liquidSurfaceY + 0.03 : baseY + 0.065, 0]}>
        {/* 1. Low-profile cut block melting into a shimmering mercury-like liquid droplet */}
        <mesh
          ref={meshRef}
          scale={[currentScale, currentScale, currentScale]}
        >
          {effectiveProgress >= (isPotassium ? 0.12 : 0.28) ? (
            <sphereGeometry args={[0.13, 24, 24]} />
          ) : (
            <dodecahedronGeometry args={[0.13, 0]} />
          )}
          <meshStandardMaterial
            color="#bfc2c5"
            emissive="#000000"
            emissiveIntensity={0}
            roughness={effectiveProgress >= 0.2 ? 0.02 : 0.28}
            metalness={1.0}
          />
        </mesh>

        {/* 2. Surface Meniscus Depression Ring & Capillary Ripple Ring */}
        <group ref={meniscusGroupRef} position={[0, -0.02, 0]}>
          {/* Dark meniscus indentation */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.06, 0.16, 32]} />
            <meshBasicMaterial color="#0284c7" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* Outer reflective capillary ripple */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0.16, 0.30, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>

        {/* 3. Localized Characteristic Flame Cone (Lilac for K, Yellow for Na) & Inner Core */}
        <group ref={flameGroupRef} position={[0, 0.11 * currentScale, 0]} visible={false}>
          {/* Outer Characteristic Flame Cone */}
          <mesh scale={[0.9, 1.35, 0.9]}>
            <coneGeometry args={[0.09, 0.28, 16]} />
            <meshBasicMaterial color={outerFlameColor} transparent opacity={0.85} depthWrite={false} />
          </mesh>
          {/* Inner White-Hot Core */}
          <mesh scale={[0.45, 0.9, 0.45]}>
            <coneGeometry args={[0.05, 0.18, 12]} />
            <meshBasicMaterial color={innerFlameColor} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        </group>

        {/* 4. Exothermic Glow PointLight */}
        <pointLight
          ref={lightRef}
          color={lightColor}
          intensity={0}
          distance={2.4}
        />

        {/* 5. Trailing Micro-Steam puff when reacting */}
        <mesh ref={steamRef} position={[0, 0.08, 0]} visible={false}>
          <coneGeometry args={[0.06, 0.16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.32} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
});

// Backward compatible alias
export const FloatingSodiumPellet = FloatingAlkaliMetalPellet;

interface SolidSubstanceMeshProps {
  vesselId: string;
  substance: string;
  vesselRadius: number;
  baseY: number;
  dissolveProgress: number;
  isStirring: boolean;
}

export const SolidSubstanceMesh = React.memo(function SolidSubstanceMesh({
  vesselId, substance, vesselRadius, baseY, isStirring,
}: SolidSubstanceMeshProps) {
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const stockChemical = getChemical(substance);
  const chemical = stockChemical?.type === 'solid' ? stockChemical : getChemical(`${substance} (s)`);
  const rows = vessel?.contents.filter(c => c.formula === substance && c.phase === 's'
    && c.location !== 'filter' && c.location !== 'foam'
    && (vessel.volume_ml <= 0.05 || !isSuspensionRow(c, vessel.contents, vessel.precipitateSubstance))) ?? [];
  const mass = rows.reduce((sum, row) => sum + Math.max(0, row.mass_g), 0);
  const product = rows.some(c => c.solidOrigin === 'precipitate') ? getPrecipitateProfile(substance) : null;
  const density = product && product.modelBasis !== 'generic_fallback'
    ? product.particleDensity_g_cm3 : chemical?.type === 'solid' ? chemical.density : undefined;
  const pulverized = vessel?.isPulverized;
  const morphology: SolidMorphology = pulverized || product ? 'POWDER' : getSolidMorphology(substance);
  const material = stockSolidMaterial(chemical, morphology);
  if (product) { material.color = product.color; material.roughness = product.roughness; material.metalness = product.metalness ?? 0; }
  const coating = vessel ? metalSurfaceAppearance(vessel) : null;
  const attachment = coating && sameMolecularFormula(coating.substrate, substance) ? coating : null;
  const powder = morphology === 'POWDER';
  const grainTexture = useMemo(() => getNoiseTexture(128, 128), []);
  const color = powder && attachment ? new THREE.Color(material.color).lerp(new THREE.Color(attachment.color), attachment.colorFraction) : material.color;
  const geometry = useMemo(() => createStockSolidGeometry(morphology, substance), [morphology, substance]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const sceneVolume = vessel && density && density > 0 ? solidSceneVolume(vessel, mass / density) : 0;
  const initialMass = rows.reduce((sum, row) => sum + Math.max(row.mass_g, row.initialMass_g
    ?? (row.initialMoles !== undefined && chemical ? row.initialMoles * chemical.molarMass : row.mass_g)), 0);
  const initialSceneVolume = vessel && density && density > 0 ? solidSceneVolume(vessel, initialMass / density) : 0;
  const layout = useMemo(() => !powder && vessel ? createStockSolidLayout(vessel.type, morphology, geometry,
    sceneVolume, initialSceneVolume, baseY, !vessel.isSealed) : null,
    [powder, vessel?.type, vessel?.isSealed, morphology, geometry, sceneVolume, initialSceneVolume, baseY]);
  const count = Math.max(1, layout?.pieces.length ?? stockSolidChunkCount(morphology));
  // A vessel may contain both filings and a nail of the same metal. Partition
  // the shared deposit by surviving substrate mass instead of drawing it twice.
  const attachedSceneVolume = attachment && vessel ? solidSceneVolume(vessel,
    attachment.attachedMass_g * mass / attachment.substrateMass_g / getPrecipitateProfile(attachment.product).particleDensity_g_cm3) : 0;
  const powderGeometry = useMemo(() => powder && sceneVolume > 0 && vessel
    ? createPowderPileGeometry(vessel.type, (sceneVolume + attachedSceneVolume) / 0.55, vesselRadius * 0.85) : null,
    [powder, sceneVolume, attachedSceneVolume, vessel?.type, vesselRadius]);
  useEffect(() => () => powderGeometry?.dispose(), [powderGeometry]);
  const chunksRef = useRef<THREE.InstancedMesh>(null);
  const depositRef = useRef<THREE.InstancedMesh>(null);
  const depositGeometry = useMemo(() => {
    if (!attachment) return null;
    const g = createPrecipitateGeometry(getPrecipitateProfile(attachment.product));
    const scale = Math.cbrt(1 / geometryVolume(g));
    g.scale(scale, scale, scale); g.computeBoundingSphere();
    return g;
  }, [attachment?.product]);
  useEffect(() => () => depositGeometry?.dispose(), [depositGeometry]);
  const depositScratch = useMemo(() => ({ anchor: new THREE.Vector3(), normal: new THREE.Vector3(),
    matrix: new THREE.Matrix4(), scale: new THREE.Vector3() }), []);
  const uploaded = useRef<{ mesh: THREE.InstancedMesh; deposit: THREE.InstancedMesh | null;
    layout: StockSolidLayout; attached: number } | null>(null);

  useFrame(() => {
    if (!chunksRef.current || powder || !layout) return;
    const previous = uploaded.current;
    if (previous?.mesh === chunksRef.current && previous.deposit === depositRef.current
      && previous.layout === layout && previous.attached === attachedSceneVolume) return;
    chunksRef.current.visible = sceneVolume > 0;
    chunksRef.current.userData.stockSolid = { status: layout.status, materialSceneVolume: sceneVolume, initialSceneVolume,
      pieces: layout.pieces.length, poseBasis: 'body-fixed-envelope-reference' };
    const depositScale = Math.cbrt(attachedSceneVolume / (count * 4));
    for (let i = 0; i < layout.pieces.length; i++) {
      _dummyMat4.copy(layout.pieces[i].matrix);
      _dummyMat4.decompose(_dummyPos, _dummyQuat, _dummyScale);
      chunksRef.current.setMatrixAt(i, _dummyMat4);
      if (depositRef.current && depositGeometry && depositScale > 0) {
        const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
        for (let j = 0; j < 4; j++) {
          const vertex = (i * 37 + j * 17) % positions.count;
          depositScratch.anchor.fromBufferAttribute(positions, vertex).applyMatrix4(_dummyMat4);
          depositScratch.normal.fromBufferAttribute(normals, vertex).transformDirection(_dummyMat4);
          depositScratch.anchor.addScaledVector(depositScratch.normal, depositScale * 0.3);
          // A surface aggregate cannot grow through the vessel floor.
          depositScratch.anchor.y = Math.max(baseY + depositScale * depositGeometry.boundingSphere!.radius,
            depositScratch.anchor.y);
          depositScratch.scale.setScalar(depositScale);
          depositScratch.matrix.compose(depositScratch.anchor, _dummyQuat, depositScratch.scale);
          depositRef.current.setMatrixAt(i * 4 + j, depositScratch.matrix);
        }
      }
    }
    chunksRef.current.instanceMatrix.needsUpdate = true;
    if (depositRef.current) depositRef.current.instanceMatrix.needsUpdate = true;
    uploaded.current = { mesh: chunksRef.current, deposit: depositRef.current, layout, attached: attachedSceneVolume };
  });

  if (!(sceneVolume > 0)) return null;
  return <group name={`stock-solid-${substance}`}>
    {powder && powderGeometry ? <mesh geometry={powderGeometry} renderOrder={3}>
      <meshStandardMaterial color={color} roughness={material.roughness} metalness={material.metalness}
        bumpMap={grainTexture} bumpScale={0.003} />
    </mesh> : <instancedMesh ref={chunksRef} name={`stock_solid_${vesselId}_${substance}`} args={[geometry, undefined, count]} renderOrder={3}>
      <meshStandardMaterial color={color} roughness={material.roughness} metalness={material.metalness} />
    </instancedMesh>}
    {!powder && attachment && depositGeometry && <instancedMesh ref={depositRef}
      name={`stock_coating_${vesselId}_${substance}`}
      args={[depositGeometry, undefined, count * 4]} renderOrder={3}>
      <meshStandardMaterial color={attachment.color} metalness={0.9} roughness={0.6} />
    </instancedMesh>}
  </group>;
});
