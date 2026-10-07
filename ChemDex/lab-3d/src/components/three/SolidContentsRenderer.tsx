import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical, getSolidMorphology, SolidMorphology } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { reactionSimulationEngine } from '../../vfx/reactions/ReactionSimulationEngine';
import { PourController } from '../../pour/controller/PourController';

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

// Pseudo-random deterministic hash
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
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
  const activeTool = useAppStore(state => state.activeTool);
  const isStirring = activeTool === 'stirring_rod';

  if (!vessel || !vessel.substances || vessel.substances.length === 0) {
    return null;
  }

  // Filter only solid substances present in the vessel
  const solidSubstances = vessel.substances.filter(sub => {
    const chem = getChemical(sub);
    return chem && chem.type === 'solid';
  });

  if (solidSubstances.length === 0) {
    return null;
  }

  return (
    <group name={`solids_${vesselId}`}>
      {solidSubstances.map((sub, idx) => {
        if (sub === 'Na' || sub === 'K') {
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
            baseY={baseY}
            dissolveProgress={dissolving[sub] || 0}
            isStirring={isStirring}
          />
        );
      })}
    </group>
  );
});

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

  const hasLiquid = (vessel?.volume_ml || 0) > 0.5;
  const volumeFrac = Math.max(0, Math.min(1.0, (vessel?.volume_ml || 0) / (vessel?.capacity_ml || 100)));
  const liquidSurfaceY = baseY + (vessel?.type === 'test_tube' ? 1.6 : 1.88) * volumeFrac;

  const isAlkaliReaction = kinetics?.reactionId && (
    kinetics.reactionId.includes('sodium') ||
    kinetics.reactionId.includes('Na') ||
    kinetics.reactionId.includes('potassium') ||
    kinetics.reactionId.includes('K') ||
    kinetics.reactionId.includes('alkali_metal_water')
  );
  const reactionProgress = isAlkaliReaction ? kinetics.progress : 0;
  const effectiveProgress = Math.max(dissolveProgress, reactionProgress);
  const isConsumed = effectiveProgress >= 0.99;

  // Molten metal droplet scale (shrinks from ~1.0 down to 0)
  const currentScale = Math.max(0.001, 1.0 - effectiveProgress);

  useFrame((state, delta) => {
    if (!groupRef.current || !vessel || isConsumed) return;
    const dt = Math.min(delta, 0.05);
    const m = motion.current;
    const now = state.clock.elapsedTime;

    // Check if ReactionSimulationEngine has dedicated controller running for this vessel
    const simRuntime = reactionSimulationEngine.getRuntime(vesselId);
    const cd = simRuntime?.customData;

    const isReacting = hasLiquid && (effectiveProgress > 0.01 && effectiveProgress < 0.98);
    const isMolten = hasLiquid && (cd?.isMolten ?? (effectiveProgress >= (isPotassium ? 0.12 : 0.28)));
    const isIgnited = hasLiquid && (cd?.isIgnited ?? (effectiveProgress >= (isPotassium ? 0.08 : 0.45) && effectiveProgress <= 0.94));

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
      if (isReacting && now - m.lastTrailDrop > 0.045) {
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
        trailMeshRef.current.visible = count > 0;
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
        const isSteaming = hasLiquid && effectiveProgress > 0.05 && effectiveProgress < 0.95;
        steamRef.current.visible = isSteaming;
        if (isSteaming) {
          const puff = 1.0 + Math.sin(now * 16.0) * 0.22;
          steamRef.current.scale.set(currentScale * 0.8 * puff, currentScale * 1.25 * puff, currentScale * 0.8 * puff);
        }
      }

      // Thermal glow during vigorous reaction
      if (lightRef.current) {
        const isHot = effectiveProgress > 0.35 && effectiveProgress < 0.95;
        lightRef.current.intensity = isHot ? (isIgnited ? 3.6 : 2.0 + Math.random() * 0.8) : 0;
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
      groupRef.current.position.set(0, baseY + 0.065, 0);
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
            color={effectiveProgress >= (isPotassium ? 0.08 : 0.45) && effectiveProgress <= 0.92 ? (isPotassium ? '#e9d5ff' : '#fef08a') : (effectiveProgress >= 0.2 ? '#ffffff' : '#cbd5e1')}
            emissive={effectiveProgress >= (isPotassium ? 0.08 : 0.45) && effectiveProgress <= 0.92 ? emissiveColor : '#000000'}
            emissiveIntensity={effectiveProgress >= (isPotassium ? 0.08 : 0.45) && effectiveProgress <= 0.92 ? 3.0 : 0}
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

const SolidSubstanceMesh = React.memo(function SolidSubstanceMesh({
  vesselId,
  substance,
  vesselRadius,
  baseY,
  dissolveProgress,
  isStirring,
}: SolidSubstanceMeshProps) {
  const chem = getChemical(substance);
  const color = chem?.color || '#e2e8f0';
  const category = chem?.category;
  const vessel = useAppStore(state => state.vessels[vesselId]);
  const isPulverized = vessel?.isPulverized || vessel?.precipitateMorphology === 'POWDER';
  const baseMorphology = getSolidMorphology(substance);
  const morphology: SolidMorphology = isPulverized ? 'POWDER' : baseMorphology;

  const isRibbon = morphology === 'RIBBON';
  const isTurnings = morphology === 'TURNINGS';
  const isFilings = morphology === 'FILINGS';
  const isGranules = morphology === 'GRANULES';
  const isChips = morphology === 'CHIPS';
  const isCubic = morphology === 'CUBIC_CRYSTAL';
  const isPrismatic = morphology === 'PRISMATIC_CRYSTAL';
  const isTabular = morphology === 'TABULAR_CRYSTAL';
  const isHydrate = morphology === 'HYDRATE_CRYSTAL';
  const isIodine = morphology === 'LUSTROUS_PLATES';
  const isPowder = morphology === 'POWDER';
  const isColoredCrystal = isPrismatic || isTabular || isHydrate;

  const moundRef = useRef<THREE.Mesh>(null);
  const chunksRef = useRef<THREE.InstancedMesh>(null);

  const count = isPowder 
    ? 36 
    : (isRibbon ? 10 
    : (isTurnings ? 14 
    : (isFilings ? 36 
    : (isGranules ? 18 
    : (isChips ? 14
    : (isCubic ? 24 
    : (isPrismatic ? 22 
    : (isTabular ? 16 
    : (isHydrate ? 20 
    : 16)))))))));
  const effectiveRadius = Math.min(0.85, vesselRadius * 0.78);
  const vesselScale = Math.min(1.0, Math.max(0.55, vesselRadius / 0.65));

  const hasLiquid = (vessel?.volume_ml || 0) > 0.5;

  // Generate deterministic chunk positions & orientations
  const chunkData = useMemo(() => {
    const seed = hashString(substance);
    const rng = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: count }).map((_, i) => {
      const angle = rng(i * 7) * Math.PI * 2;
      const dist = Math.sqrt(rng(i * 7 + 1)) * effectiveRadius;
      const yOffset = rng(i * 7 + 2) * (isPowder ? 0.08 : 0.05);

      const baseScale = (isRibbon 
        ? (0.24 + rng(i * 7 + 3) * 0.08)
        : (isTurnings 
          ? (0.20 + rng(i * 7 + 3) * 0.07)
          : (isFilings 
            ? (0.16 + rng(i * 7 + 3) * 0.06)
            : (isGranules 
              ? (0.19 + rng(i * 7 + 3) * 0.07) 
              : (isChips 
                ? (0.21 + rng(i * 7 + 3) * 0.08)
                : (isCubic || isPrismatic || isTabular || isHydrate 
                  ? (0.17 + rng(i * 7 + 3) * 0.06) 
                  : (0.07 + rng(i * 7 + 3) * 0.04))))))) * vesselScale;

      return {
        x: Math.cos(angle) * dist,
        y: yOffset,
        z: Math.sin(angle) * dist,
        rotX: rng(i * 7 + 4) * Math.PI,
        rotY: rng(i * 7 + 5) * Math.PI,
        rotZ: rng(i * 7 + 6) * Math.PI,
        scale: baseScale,
      };
    });
  }, [substance, count, effectiveRadius, isRibbon, isTurnings, isFilings, isGranules, isChips, isCubic, isPrismatic, isTabular, isHydrate, isPowder, vesselScale]);

  const content = vessel?.contents?.find(c => 
    c.formula.toLowerCase() === substance.toLowerCase() || 
    c.formula.replace(/\s*\(.*\)/g, '').toLowerCase() === substance.replace(/\s*\(.*\)/g, '').toLowerCase()
  );
  const initMoles = content?.initialMoles || content?.moles;
  const remainingMoleFraction = content 
    ? (content.moles <= 1e-6 ? 0 : (initMoles && initMoles > 1e-6 ? Math.min(1.0, content.moles / initMoles) : 1.0))
    : 1.0;
  // Visual scale follows remaining moles via cubic root (volume ~ r^3), never disappears prematurely
  const currentScale = Math.max(0, Math.min(1.0, Math.cbrt(remainingMoleFraction)));

  useFrame((state) => {
    if (currentScale <= 0.001) return;

    // Physical tilt slide displacement based on vessel rotation (including live pour controller)
    const pourSession = PourController.getSession();
    const tiltZ = (pourSession && pourSession.sourceId === vesselId)
      ? (pourSession.sourceRotationZ ?? -pourSession.tilt)
      : (vessel?.rotationZ || 0);
    const tiltSlideX = Math.sin(tiltZ) * effectiveRadius * 0.45;
    const tiltSlideY = -Math.abs(Math.sin(tiltZ)) * 0.08;

    // 1. Animate central powder mound scale if powder
    if (moundRef.current && isPowder) {
      const moundHeight = 0.28 * currentScale * vesselScale;
      const moundRad = effectiveRadius * 0.92 * Math.sqrt(currentScale);
      moundRef.current.scale.set(moundRad, moundHeight, moundRad);
      moundRef.current.position.set(tiltSlideX, baseY + moundHeight * 0.48 + tiltSlideY, 0);
    }

    // 2. Animate chunks/granules instanced mesh
    if (chunksRef.current) {
      const stirRot = isStirring ? state.clock.elapsedTime * 3.5 : 0;
      const mesh = chunksRef.current;

      for (let i = 0; i < count; i++) {
        const c = chunkData[i];
        const s = c.scale * currentScale;

        const px = Math.cos(stirRot) * c.x - Math.sin(stirRot) * c.z + tiltSlideX;
        const pz = Math.sin(stirRot) * c.x + Math.cos(stirRot) * c.z;
        const py = baseY + c.y + (isPowder ? 0.04 : 0.07) + tiltSlideY;

        _dummyPos.set(px, py, pz);
        _dummyEuler.set(c.rotX, c.rotY + stirRot, c.rotZ);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.set(s, s, s);

        _dummyMat4.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMat4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (currentScale <= 0.001) return null;

  return (
    <group>
      {/* A. Conical Powder Mound (Only for fine powders e.g. CaCO3, MnO2, S, CaO, Fe2O3, etc.) */}
      {isPowder && (
        <mesh ref={moundRef} position={[0, baseY + 0.12, 0]} renderOrder={3}>
          <coneGeometry args={[1.0, 1.0, 24]} />
          <meshStandardMaterial
            color={color}
            roughness={0.96}
            metalness={0.02}
            flatShading={false}
          />
        </mesh>
      )}

      {/* B. Convective Dissolution Halo for Colored Soluble Salts (e.g. CuSO4, KMnO4, K2Cr2O7) */}
      {isColoredCrystal && hasLiquid && dissolveProgress < 0.98 && (
        <mesh position={[0, baseY + 0.08, 0]} renderOrder={2}>
          <sphereGeometry args={[effectiveRadius * 0.85, 20, 20]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35 * Math.min(1.0, currentScale)}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* C. Purple Sublimation Vapor for Iodine when heated (>40°C) */}
      {isIodine && (vessel?.temperature_c || 25) > 40 && (
        <mesh position={[0, baseY + 0.45, 0]} renderOrder={4}>
          <coneGeometry args={[effectiveRadius * 0.75, 0.9, 16]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}

      {/* D. Discrete Solid Chunks / Ribbons / Turnings / Crystals / Pellets / Powder dusting */}
      <instancedMesh
        ref={chunksRef}
        args={[undefined, undefined, count]}
        renderOrder={3}
      >
        {isRibbon ? (
          // Magnesium curled ribbon segment
          <torusGeometry args={[0.75, 0.16, 8, 20, Math.PI * 1.5]} />
        ) : isTurnings ? (
          // Copper curly wire turnings
          <torusGeometry args={[0.70, 0.15, 8, 20, Math.PI * 1.8]} />
        ) : isFilings ? (
          // Fine iron filings / needles
          <cylinderGeometry args={[0.07, 0.07, 1.0, 8]} />
        ) : isGranules ? (
          // Zinc irregular chunks
          <dodecahedronGeometry args={[0.75, 0]} />
        ) : isChips ? (
          // Marble chips / irregular stone chunks
          <dodecahedronGeometry args={[0.85, 0]} />
        ) : isIodine ? (
          // Iodine lustrous plates
          <boxGeometry args={[0.9, 0.25, 0.7]} />
        ) : isCubic ? (
          // NaCl crystal cubes
          <boxGeometry args={[0.85, 0.85, 0.85]} />
        ) : isPrismatic ? (
          // KMnO4 dark purple needles
          <cylinderGeometry args={[0.1, 0.1, 1.25, 6]} />
        ) : isTabular ? (
          // K2Cr2O7 flat orange tabular plates
          <boxGeometry args={[0.85, 0.22, 1.1]} />
        ) : isHydrate ? (
          // Blue vitriol octahedral crystals
          <octahedronGeometry args={[0.85, 0]} />
        ) : (
          // Fine powder granules / dusting
          <dodecahedronGeometry args={[0.6, 0]} />
        )}
        <meshStandardMaterial
          color={
            isTurnings ? '#ea580c' : 
            (isFilings ? '#475569' : 
            (isIodine ? '#3b0764' : 
            (isPrismatic ? '#581c87' : 
            (isTabular ? '#ea580c' : 
            (isChips ? '#f1f5f9' : color)))))
          }
          roughness={
            isRibbon ? 0.18 : 
            (isTurnings ? 0.22 : 
            (isFilings ? 0.35 : 
            (isGranules ? 0.40 : 
            (isChips ? 0.82 :
            (isIodine ? 0.18 : 
            (isPrismatic ? 0.12 : 
            (isTabular ? 0.18 : 
            (isHydrate ? 0.15 : 
            (isCubic ? 0.20 : 0.94)))))))))
          }
          metalness={
            isRibbon ? 0.96 : 
            (isTurnings ? 0.98 : 
            (isFilings ? 0.92 : 
            (isGranules ? 0.88 : 
            (isChips ? 0.02 :
            (isIodine ? 0.75 : 
            (isPrismatic ? 0.65 : 
            (isTabular ? 0.35 : 
            (isHydrate ? 0.12 : 
            (isCubic ? 0.10 : 0.03)))))))))
          }
        />
      </instancedMesh>
    </group>
  );
});
