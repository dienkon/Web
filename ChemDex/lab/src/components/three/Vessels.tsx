import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide } from 'three';
import * as THREE from 'three';
import { useAppStore, getChemical } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { getReagentBottleLabelTexture, getVesselGraduationTexture } from '../../vfx/textures';
import { useQualityStore } from '../../vfx/quality';
import { getGlassMaterials, getCeramicMaterials, createVesselLatheGeometry } from '../../vfx/materials/glass';
import { RealisticLiquid } from '../../vfx/materials/liquid';
import { Bubbles, GasPlume, Precipitate } from '../../vfx/particles';
import { PourController } from '../../pour/controller/PourController';
import { SolidContentsRenderer } from './SolidContentsRenderer';
import { VesselState } from '../../types/chemistry';
import { openRadialMenu } from '../../ui/RadialMenu';

// Glassware material reference matching active high-tier physical glass
export const glassMaterial = getGlassMaterials('high').front as MeshPhysicalMaterial;


// Lightweight Standard material for background/decorative bottles on shelf
export const shelfGlassMaterial = new MeshStandardMaterial({
  color: '#e2e8f0',
  transparent: true,
  opacity: 0.6,
  roughness: 0.12,
  metalness: 0.15,
  side: DoubleSide
});

export const shelfLiquidMaterial = new MeshStandardMaterial({
  transparent: true,
  opacity: 0.85,
  roughness: 0.2
});

const EMPTY_DISSOLVING: Record<string, number> = {};

// Real laboratory glass stirring rod with smooth rotation animation
export const StirringRod = React.memo(function StirringRod({ height = 2.5, isStirring }: { height?: number; isStirring: boolean }) {
  const rodRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!rodRef.current) return;
    if (isStirring) {
      const t = state.clock.elapsedTime * 8;
      rodRef.current.position.x = Math.cos(t) * 0.22;
      rodRef.current.position.z = Math.sin(t) * 0.22;
      rodRef.current.rotation.z = -0.22 + Math.cos(t) * 0.08;
      rodRef.current.rotation.x = Math.sin(t) * 0.08;
    } else {
      rodRef.current.position.x = 0.22;
      rodRef.current.position.z = 0.08;
      rodRef.current.rotation.z = -0.25;
      rodRef.current.rotation.x = 0.05;
    }
  });

  return (
    <group ref={rodRef} position={[0, 0.45, 0]}>
      <mesh>
        <cylinderGeometry args={[0.032, 0.032, height, 16]} />
        <meshPhysicalMaterial 
          transmission={0.94}
          opacity={0.8}
          roughness={0.06}
          ior={1.5}
          transparent
          depthWrite={false}
          color="#bae6fd"
        />
      </mesh>
      <mesh position={[0, -height / 2, 0]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshPhysicalMaterial 
          transmission={0.94}
          opacity={0.8}
          roughness={0.06}
          transparent
          depthWrite={false}
          color="#bae6fd"
        />
      </mesh>
    </group>
  );
});

const _particleMatrix = new THREE.Matrix4();
const _particlePos = new THREE.Vector3();
const _particleQuat = new THREE.Quaternion();
const _particleScale = new THREE.Vector3();
const _particleEuler = new THREE.Euler();

// Authentic etched volumetric graduation scale decal
export const VesselGraduations = React.memo(function VesselGraduations({
  type,
  capacity_ml,
  radius,
  height,
  yOffset = 0,
}: {
  type: 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  capacity_ml: number;
  radius: number;
  height: number;
  yOffset?: number;
}) {
  const gradTexture = useMemo(
    () => getVesselGraduationTexture(capacity_ml, type),
    [capacity_ml, type]
  );

  return (
    <mesh position={[0, yOffset, 0]} renderOrder={4}>
      <cylinderGeometry
        args={[radius + 0.003, radius + 0.003, height, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.9]}
      />
      <meshBasicMaterial
        map={gradTexture}
        transparent
        opacity={0.85}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

// Dissolving Solid Particles with InstancedMesh polyhedrals and zero GC
export const SolidParticles = React.memo(function SolidParticles({
  substance,
  color,
  radius = 0.7,
  baseY = -0.92,
  dissolveProgress = 0,
  isStirring = false,
}: {
  substance: string;
  color: string;
  radius?: number;
  baseY?: number;
  dissolveProgress?: number;
  isStirring?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 16;
  const isCubic = substance === 'NaCl';

  const particleData = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < substance.length; i++) {
      seed = (seed * 31 + substance.charCodeAt(i)) & 0xffffff;
    }
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: count }).map((_, j) => {
      const angle = pseudoRandom(j * 5) * Math.PI * 2;
      const dist = Math.sqrt(pseudoRandom(j * 5 + 1)) * radius * 0.75;
      const yOffset = pseudoRandom(j * 5 + 2) * 0.06;
      const baseScale = 0.14 + pseudoRandom(j * 5 + 3) * 0.06;
      const rotX = pseudoRandom(j * 5 + 4) * Math.PI;
      const rotY = pseudoRandom(j * 5 + 5) * Math.PI;
      const rotZ = pseudoRandom(j * 5 + 6) * Math.PI;
      return {
        x: Math.cos(angle) * dist,
        y: yOffset,
        z: Math.sin(angle) * dist,
        baseScale,
        rotX,
        rotY,
        rotZ,
      };
    });
  }, [substance, radius]);

  const currentScale = Math.max(0, 1 - dissolveProgress);

  useFrame((state) => {
    if (!meshRef.current || currentScale <= 0.01) return;
    const mesh = meshRef.current;
    const stirRot = isStirring ? state.clock.elapsedTime * 4.5 : 0;

    for (let i = 0; i < count; i++) {
      const p = particleData[i];
      const s = p.baseScale * currentScale;

      _particlePos.set(
        Math.cos(stirRot) * p.x - Math.sin(stirRot) * p.z,
        baseY + p.y,
        Math.sin(stirRot) * p.x + Math.cos(stirRot) * p.z
      );
      _particleEuler.set(p.rotX, p.rotY + stirRot, p.rotZ);
      _particleQuat.setFromEuler(_particleEuler);
      _particleScale.set(s, s, s);

      _particleMatrix.compose(_particlePos, _particleQuat, _particleScale);
      mesh.setMatrixAt(i, _particleMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (currentScale <= 0.01) return null;

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} renderOrder={3}>
        {isCubic ? <boxGeometry args={[1, 1, 1]} /> : <icosahedronGeometry args={[1, 0]} />}
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.15} />
      </instancedMesh>
    </group>
  );
});


export const GasParticles = React.memo(function GasParticles({ color = '#ffffff', isBubbles = false }: { color?: string, isBubbles?: boolean }) {
  if (isBubbles) {
    return <Bubbles liquidBottomY={-0.6} surfaceY={0.6} radius={0.55} color={color} active />;
  }
  return <GasPlume origin={[0, 0, 0]} color={color} active />;
});


// Selection & Magnetic Drop Target Indicator with high visual fidelity
export const VesselFloorRing = React.memo(function VesselFloorRing({ 
  isSelected, 
  isDropTarget, 
  isChemicalDrop,
  isNearestPourTarget 
}: { 
  isSelected: boolean; 
  isDropTarget: boolean; 
  isChemicalDrop?: boolean;
  isNearestPourTarget?: boolean;
}) {
  if (!isSelected && !isDropTarget && !isChemicalDrop && !isNearestPourTarget) return null;
  
  const ringColor = isNearestPourTarget 
    ? '#10b981' 
    : isChemicalDrop 
      ? '#06b6d4' 
      : isDropTarget 
        ? '#6366f1' 
        : '#3b82f6';

  return (
    <group position={[0, -1.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer Pulse Ring */}
      <mesh>
        <ringGeometry args={[1.2, isNearestPourTarget ? 1.5 : (isChemicalDrop ? 1.45 : 1.35), 32]} />
        <meshBasicMaterial 
          color={ringColor} 
          side={DoubleSide} 
          transparent 
          opacity={isNearestPourTarget ? 0.95 : (isChemicalDrop ? 0.9 : 0.75)} 
        />
      </mesh>

      {/* Crosshair / Target reticle for nearest pour recipient */}
      {isNearestPourTarget && (
        <group>
          <mesh rotation={[0, 0, 0]}>
            <ringGeometry args={[1.52, 1.58, 32]} />
            <meshBasicMaterial color="#34d399" side={DoubleSide} transparent opacity={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <ringGeometry args={[1.65, 1.72, 4]} />
            <meshBasicMaterial color="#10b981" side={DoubleSide} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Selected Vessel Corner Accents */}
      {isSelected && !isNearestPourTarget && (
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <ringGeometry args={[1.4, 1.46, 4]} />
          <meshBasicMaterial color="#60a5fa" side={DoubleSide} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
});

export interface BottleProps {
  position: [number, number, number];
  color?: string;
  formula?: string;
  name?: string;
  hazard?: 'toxic' | 'corrosive' | 'flammable' | 'oxidizer' | 'safe';
  isAmber?: boolean;
}

// Background reagent shelf bottles with authentic GHS labels and glass material
export const Bottle = React.memo(function Bottle({
  position,
  color = '#ffffff',
  formula = 'Reagent',
  name = 'Chemical Reagent',
  hazard = 'safe',
  isAmber = false,
}: BottleProps) {
  const labelMap = useMemo(
    () => getReagentBottleLabelTexture(name, formula, hazard),
    [name, formula, hazard]
  );

  const glassColor = isAmber ? '#92400e' : '#f8fafc';

  return (
    <group position={position}>
      {/* Bottle Glass Body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.38, 1.25, 20]} />
        <meshPhysicalMaterial
          color={glassColor}
          roughness={isAmber ? 0.16 : 0.08}
          transmission={isAmber ? 0.35 : 0.88}
          thickness={0.2}
          ior={1.5}
          transparent
          opacity={isAmber ? 0.92 : 0.65}
          depthWrite={false}
        />
      </mesh>

      {/* Shoulder & Neck */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.32, 0.35, 20]} />
        <meshPhysicalMaterial
          color={glassColor}
          roughness={isAmber ? 0.16 : 0.08}
          transmission={isAmber ? 0.35 : 0.88}
          thickness={0.2}
          ior={1.5}
          transparent
          opacity={isAmber ? 0.92 : 0.65}
          depthWrite={false}
        />
      </mesh>

      {/* Ground Glass Stopper / Cap */}
      <mesh position={[0, 0.96, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.22, 16]} />
        <meshStandardMaterial
          color={isAmber ? '#451a03' : '#334155'}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Chemical Liquid Inside */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.85, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.88}
          roughness={0.2}
          metalness={0.05}
        />
      </mesh>

      {/* Authentic Printed Chemical Label */}
      <mesh position={[0, -0.05, 0.385]}>
        <planeGeometry args={[0.48, 0.28]} />
        <meshStandardMaterial map={labelMap} transparent roughness={0.4} />
      </mesh>

    </group>
  );
});


// HIGH-FIDELITY LIQUID RENDERER WITH MENISCUS, FLUID LERP, AND REFRACTION
export const VesselLiquid = React.memo(function VesselLiquid({
  vesselId,
  baseY,
  maxHeight,
  radiusBottom,
  radiusTop = radiusBottom,
  isConical = false,
}: {
  vesselId: string;
  baseY: number;
  maxHeight: number;
  radiusBottom: number;
  radiusTop?: number;
  isConical?: boolean;
}) {
  const targetVolume = useAppStore(state => state.vessels[vesselId]?.volume ?? 0);
  const targetColor = useAppStore(state => state.vessels[vesselId]?.liquidColor || '#38bdf8');
  const isStirring = useAppStore(state => state.stirringVesselId === vesselId);
  const timeScale = useAppStore(state => state.timeScale);

  const groupRef = useRef<THREE.Group>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);
  const meniscusRef = useRef<THREE.Mesh>(null);
  const meniscusMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const liquidMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const currentVolume = useRef(targetVolume);
  const currentColor = useRef(new THREE.Color(targetColor));

  useFrame((state, delta) => {
    const volDiff = Math.abs(currentVolume.current - targetVolume);
    const targetColorObj = new THREE.Color(targetColor);
    const colDiff = Math.abs(currentColor.current.r - targetColorObj.r) +
      Math.abs(currentColor.current.g - targetColorObj.g) +
      Math.abs(currentColor.current.b - targetColorObj.b);

    const dt = Math.min(delta, 0.05) * timeScale;

    if (volDiff > 0.002) {
      currentVolume.current = THREE.MathUtils.lerp(currentVolume.current, targetVolume, dt * 5.0);
    } else {
      currentVolume.current = targetVolume;
    }

    if (colDiff > 0.002) {
      currentColor.current.lerp(targetColorObj, dt * 5.0);
    }

    const v = currentVolume.current;
    if (groupRef.current) {
      if (v > 0.005) {
        groupRef.current.visible = true;
        const h = Math.max(0.02, v * maxHeight);
        
        if (cylinderRef.current) {
          cylinderRef.current.scale.set(1, h, 1);
          cylinderRef.current.position.set(0, baseY + h / 2, 0);
        }

        if (meniscusRef.current) {
          meniscusRef.current.position.set(0, baseY + h, 0);
          if (isStirring) {
            meniscusRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 14) * 0.04;
          }
          if (isConical) {
            const currentR = radiusBottom - (radiusBottom - radiusTop) * v;
            meniscusRef.current.scale.set(currentR / radiusBottom, currentR / radiusBottom, 1);
          }
        }

        if (liquidMaterialRef.current) {
          liquidMaterialRef.current.color.copy(currentColor.current);
        }
        if (meniscusMaterialRef.current) {
          meniscusMaterialRef.current.color.copy(currentColor.current);
        }
      } else {
        groupRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={groupRef} visible={targetVolume > 0.005}>
      {/* Liquid Column Body */}
      <mesh ref={cylinderRef} renderOrder={2}>
        <cylinderGeometry args={[radiusTop, radiusBottom, 1, 32]} />
        <meshStandardMaterial
          ref={liquidMaterialRef}
          color={targetColor}
          transparent
          opacity={0.88}
          roughness={0.12}
          metalness={0.06}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Meniscus Top Surface Disc */}
      <mesh ref={meniscusRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[radiusBottom * 0.99, 32]} />
        <meshStandardMaterial
          ref={meniscusMaterialRef}
          color={targetColor}
          transparent
          opacity={0.92}
          roughness={0.08}
          metalness={0.1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

// BEAKER (Standard 100mL or 250mL)
export const Beaker = React.memo(function Beaker({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const isStirring = useAppStore(state => state.stirringVesselId === id);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[id]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;

  const setSelectedVesselId = useAppStore(state => state.setSelectedVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('beaker', 36), []);

  useFrame((_, delta) => {
    // Auto-return upright if not actively hovered or selected
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]} 
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget} 
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.9} />
      ) : (
        <>
          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Physics-based Sloshing Liquid with Meniscus & Caustics */}
          <RealisticLiquid vesselId={id} vesselType="beaker" baseY={-0.96} maxHeight={1.88} capacity_ml={vessel.capacity_ml || 250} />

          {/* 3. Authentic Printed Graduation Decal */}
          <VesselGraduations type="beaker" capacity_ml={vessel.capacity_ml || 250} radius={1.0} height={1.7} yOffset={0} />

          {/* 4. Front Glass Outer Surface (renderOrder 6 - sits on top without occluding liquid) */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Realistic 3D Solid Contents: Powder Mounds, Metal Chunks, Crystal Facets */}
          <SolidContentsRenderer vesselId={id} radius={0.82} baseY={-0.95} />

          {/* Stirring Glass Rod Effect */}
          {isStirring && (
            <StirringRod height={2.4} isStirring={isStirring} />
          )}

          {/* Dynamic Falling Precipitate Particles (e.g. Golden Rain PbI2, BaSO4, AgCl, Cu(OH)2, Fe(OH)3, CaCO3, Cu) */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={
                vessel.precipitateSubstance ||
                (vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('KI'))
                  ? 'PbI2'
                  : vessel.substances?.some(s => s.includes('Ag'))
                  ? 'AgCl'
                  : vessel.substances?.some(s => s.includes('Cu')) && vessel.substances?.some(s => s.includes('Fe'))
                  ? 'Cu'
                  : vessel.substances?.some(s => s.includes('Cu'))
                  ? 'Cu(OH)2'
                  : vessel.substances?.some(s => s.includes('FeCl3'))
                  ? 'Fe(OH)3'
                  : 'BaSO4')
              }
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor}
              radius={0.78}
              liquidTopY={-0.96 + 1.88 * Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 250))) - 0.04}
              liquidBottomY={-0.88}
              rate={vessel.substances?.some(s => s.includes('Pb') || s.includes('I')) ? 46 : 28}
              active={true}
            />
          )}

          {/* Precipitate Mound / Sediment Bed Layer */}
          {vessel.hasPrecipitate && (
            <mesh position={[0, -0.92, 0]} renderOrder={4}>
              <cylinderGeometry args={[0.92, 0.95, 0.12, 32]} />
              <meshStandardMaterial 
                color={vessel.precipitateColor || '#ffffff'} 
                roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.22 : 0.92}
                metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.88 : 0.05}
              />
            </mesh>
          )}

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.82}
            fogHeight={1.1}
            fogY={0.4}
            stainRadius={0.95}
            stainBaseY={-0.95}
            stainHeightRange={1.8}
            fumeY={1.1}
            surgeRadius={0.65}
            surgeY={-0.3}
          />
        </>
      )}
    </group>
  );
});


// ERLENMEYER FLASK (Conical Flask)
export const Flask = React.memo(function Flask({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const isStirring = useAppStore(state => state.stirringVesselId === id);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[id]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;

  const setSelectedVesselId = useAppStore(state => state.setSelectedVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('flask', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget}
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={1.1} />
      ) : (
        <>
          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Physics-based Sloshing Liquid with Meniscus & Absorption */}
          <RealisticLiquid vesselId={id} vesselType="flask" baseY={-0.96} maxHeight={1.8} capacity_ml={vessel.capacity_ml || 250} />

          {/* 3. Authentic Printed Graduation Decal */}
          <VesselGraduations type="flask" capacity_ml={vessel.capacity_ml || 250} radius={1.22} height={1.4} yOffset={-0.2} />

          {/* 4. Front Glass Outer Surface (renderOrder 6 - sits on top without occluding liquid) */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Realistic 3D Solid Contents: Powder Mounds, Metal Chunks, Crystal Facets */}
          <SolidContentsRenderer vesselId={id} radius={0.92} baseY={-0.96} />

          {/* Stirring Glass Rod */}
          {isStirring && (
            <StirringRod height={2.8} isStirring={isStirring} />
          )}

          {/* Dynamic Falling Precipitate Particles (e.g. Golden Rain PbI2, BaSO4, AgCl, Cu(OH)2) */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={
                vessel.precipitateSubstance ||
                (vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('KI'))
                  ? 'PbI2'
                  : vessel.substances?.some(s => s.includes('Ag'))
                  ? 'AgCl'
                  : vessel.substances?.some(s => s.includes('Cu')) && vessel.substances?.some(s => s.includes('Fe'))
                  ? 'Cu'
                  : vessel.substances?.some(s => s.includes('Cu'))
                  ? 'Cu(OH)2'
                  : vessel.substances?.some(s => s.includes('FeCl3'))
                  ? 'Fe(OH)3'
                  : 'BaSO4')
              }
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor}
              radius={0.88}
              liquidTopY={-0.96 + 1.8 * Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 250))) - 0.04}
              liquidBottomY={-0.88}
              rate={vessel.substances?.some(s => s.includes('Pb') || s.includes('I')) ? 46 : 28}
              active={true}
            />
          )}

          {/* Precipitate Mound / Sediment Bed Layer */}
          {vessel.hasPrecipitate && (
            <mesh position={[0, -0.92, 0]} renderOrder={4}>
              <cylinderGeometry args={[1.15, 1.2, 0.12, 32]} />
              <meshStandardMaterial 
                color={vessel.precipitateColor || '#ffffff'} 
                roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.22 : 0.92}
                metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.88 : 0.05}
              />
            </mesh>
          )}

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.42}
            fogHeight={1.2}
            fogY={0.6}
            stainRadius={0.9}
            stainBaseY={-0.95}
            stainHeightRange={1.6}
            fumeY={1.5}
            surgeRadius={0.5}
            surgeY={-0.2}
          />
        </>
      )}
    </group>
  );
});


// TEST TUBE WITH SUPPORT STAND
export const TestTube = React.memo(function TestTube({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const isStirring = useAppStore(state => state.stirringVesselId === id);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[id]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;

  const setSelectedVesselId = useAppStore(state => state.setSelectedVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('test_tube', 28), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget}
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.35} />
      ) : (
        <>
          {/* Wooden / Acrylic Mini Rack */}
          <mesh position={[0, -0.965, 0]}>
            <boxGeometry args={[1.0, 0.15, 0.8]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[1.0, 0.08, 0.8]} />
            <meshStandardMaterial color="#78350f" roughness={0.7} />
          </mesh>

          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Physics-based Sloshing Liquid with Meniscus & Absorption */}
          <RealisticLiquid vesselId={id} vesselType="test_tube" baseY={-0.6} maxHeight={1.6} capacity_ml={vessel.capacity_ml || 50} />

          {/* 3. Authentic Printed Graduation Decal */}
          <VesselGraduations type="test_tube" capacity_ml={vessel.capacity_ml || 50} radius={0.22} height={1.6} yOffset={0.2} />

          {/* 4. Front Glass Outer Surface (renderOrder 6 - sits on top without occluding liquid) */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Realistic 3D Solid Contents: Powder Mounds, Metal Chunks, Crystal Facets */}
          <SolidContentsRenderer vesselId={id} radius={0.16} baseY={-0.58} />

          {/* Stirring Glass Rod */}
          {isStirring && (
            <StirringRod height={1.8} isStirring={isStirring} />
          )}

          {/* Dynamic Falling Precipitate Particles */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={
                vessel.precipitateSubstance ||
                (vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('KI'))
                  ? 'PbI2'
                  : vessel.substances?.some(s => s.includes('Ag'))
                  ? 'AgCl'
                  : vessel.substances?.some(s => s.includes('Cu')) && vessel.substances?.some(s => s.includes('Fe'))
                  ? 'Cu'
                  : vessel.substances?.some(s => s.includes('Cu'))
                  ? 'Cu(OH)2'
                  : vessel.substances?.some(s => s.includes('FeCl3'))
                  ? 'Fe(OH)3'
                  : 'BaSO4')
              }
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor}
              radius={0.16}
              liquidTopY={-0.6 + 1.6 * Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 50))) - 0.03}
              liquidBottomY={-0.54}
              rate={vessel.substances?.some(s => s.includes('Pb') || s.includes('I')) ? 24 : 14}
              active={true}
            />
          )}

          {/* Precipitate */}
          {vessel.hasPrecipitate && (
            <mesh position={[0, -0.55, 0]} renderOrder={4}>
              <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
              <meshStandardMaterial 
                color={vessel.precipitateColor || '#ffffff'} 
                roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.22 : 0.8}
                metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.precipitateMorphology === 'METALLIC_DEPOSIT') ? 0.88 : 0.05}
              />
            </mesh>
          )}

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.20}
            fogHeight={0.8}
            fogY={0.5}
            stainRadius={0.22}
            stainBaseY={-0.6}
            stainHeightRange={1.6}
            fumeY={1.1}
            surgeRadius={0.18}
            surgeY={-0.2}
          />
        </>
      )}
    </group>
  );
});

// GRADUATED CYLINDER (With volumetric gradations)
export const GraduatedCylinder = React.memo(function GraduatedCylinder({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const isStirring = useAppStore(state => state.stirringVesselId === id);
  const dissolvingMap = useAppStore(state => state.dissolvingSubstances[id]);
  const dissolving = dissolvingMap || EMPTY_DISSOLVING;

  const setSelectedVesselId = useAppStore(state => state.setSelectedVesselId);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('cylinder', 32), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget}
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.55} />
      ) : (
        <>
          {/* Hexagonal Base */}
          <mesh position={[0, -0.965, 0]}>
            <cylinderGeometry args={[0.65, 0.75, 0.15, 6]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} />
          </mesh>

          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Physics-based Sloshing Liquid with Meniscus & Absorption */}
          <RealisticLiquid vesselId={id} vesselType="cylinder" baseY={-0.87} maxHeight={2.4} capacity_ml={vessel.capacity_ml || 100} />

          {/* 3. Authentic Printed Graduation Decal */}
          <VesselGraduations type="cylinder" capacity_ml={vessel.capacity_ml || 100} radius={0.352} height={2.4} yOffset={0.3} />

          {/* 4. Front Glass Outer Surface (renderOrder 6 - sits on top without occluding liquid) */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Laboratory Stirring Rod when active */}
          {isStirring && (
            <group position={[0, -0.9, 0]}>
              <StirringRod height={3.2} isStirring={isStirring} />
            </group>
          )}

          {/* Solid Reactant / Precipitate Particles */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={vessel.precipitateSubstance || 'BaSO4'}
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor || '#cbd5e1'}
              radius={0.22}
              liquidTopY={-0.87 + 2.4 * Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 100))) - 0.04}
              liquidBottomY={-0.85}
              rate={20}
              active={true}
            />
          )}

          {/* Realistic 3D Solid Contents: Powder Mounds, Metal Chunks, Crystal Facets */}
          <SolidContentsRenderer vesselId={id} radius={0.24} baseY={-0.92} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.34}
            fogHeight={1.2}
            fogY={1.2}
            stainRadius={0.35}
            stainBaseY={-0.87}
            stainHeightRange={2.4}
            fumeY={1.6}
            surgeRadius={0.32}
            surgeY={0.0}
          />
        </>
      )}
    </group>
  );
});

// WATCH GLASS (Shallow glass dish for observing crystallization / evaporation)
export const WatchGlass = React.memo(function WatchGlass({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('watch_glass', 32), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget} 
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.85} />
      ) : (
        <>
          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Thin Liquid Pool */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="watch_glass" 
            baseY={-0.12} 
            maxHeight={0.16} 
            capacity_ml={vessel.capacity_ml || 40} 
          />

          {/* 3. Front Glass Outer Surface */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* 4. Precipitate & Solid crystals */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={vessel.precipitateSubstance || 'BaSO4'}
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor || '#cbd5e1'}
              radius={0.85}
              liquidTopY={0.02}
              liquidBottomY={-0.12}
              rate={15}
              active={true}
            />
          )}

          <SolidContentsRenderer vesselId={id} radius={0.75} baseY={-0.14} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.7}
            fogHeight={0.3}
            fogY={0.2}
            stainRadius={0.8}
            stainBaseY={-0.12}
            stainHeightRange={0.2}
            fumeY={0.4}
            surgeRadius={0.4}
            surgeY={-0.05}
          />
        </>
      )}
    </group>
  );
});

// EVAPORATING DISH (Glazed porcelain basin with pouring spout for heating/evaporating)
export const EvaporatingDish = React.memo(function EvaporatingDish({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);
  const isStirring = useAppStore(state => state.stirringVesselId === id);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const ceramicMats = useMemo(() => getCeramicMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('evaporating_dish', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget} 
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.85} color="#f8fafc" />
      ) : (
        <>
          {/* Porcelain Glazed Body */}
          <mesh geometry={latheGeom.outer} material={ceramicMats.front} renderOrder={2} castShadow receiveShadow />

          {/* Liquid Contents */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="evaporating_dish" 
            baseY={-0.38} 
            maxHeight={0.68} 
            capacity_ml={vessel.capacity_ml || 100} 
          />

          {/* Stirring Rod if active */}
          {isStirring && (
            <group position={[0, -0.4, 0]}>
              <StirringRod height={2.0} isStirring={isStirring} />
            </group>
          )}

          {/* Precipitate & Solid Residue / Crystals */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={vessel.precipitateSubstance || 'NaCl'}
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor || '#cbd5e1'}
              radius={0.7}
              liquidTopY={-0.38 + 0.68 * Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 100)))}
              liquidBottomY={-0.38}
              rate={20}
              active={true}
            />
          )}

          <SolidContentsRenderer vesselId={id} radius={0.75} baseY={-0.38} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.7}
            fogHeight={0.5}
            fogY={0.3}
            stainRadius={0.75}
            stainBaseY={-0.38}
            stainHeightRange={0.65}
            fumeY={0.6}
            surgeRadius={0.45}
            surgeY={-0.2}
          />
        </>
      )}
    </group>
  );
});

// PORCELAIN CRUCIBLE (High-temperature ceramic cup with porcelain lid)
export const Crucible = React.memo(function Crucible({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const ceramicMats = useMemo(() => getCeramicMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('crucible', 32), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget} 
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.6} color="#f8fafc" />
      ) : (
        <>
          {/* Porcelain Crucible Body */}
          <mesh geometry={latheGeom.outer} material={ceramicMats.front} renderOrder={2} castShadow receiveShadow />

          {/* Porcelain Lid (resting on top rim, slightly ajar for air/gas escape) */}
          <group position={[0.08, 0.54, 0]} rotation={[0, 0, 0.14]}>
            <mesh material={ceramicMats.front} castShadow>
              <cylinderGeometry args={[0.74, 0.74, 0.05, 32]} />
            </mesh>
            {/* Lid Handle Knob */}
            <mesh position={[0, 0.08, 0]} material={ceramicMats.front} castShadow>
              <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>
          </group>

          {/* Liquid or Molten Flux */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="crucible" 
            baseY={-0.55} 
            maxHeight={1.0} 
            capacity_ml={vessel.capacity_ml || 50} 
          />

          {/* Solid Contents (salts, metals, oxides) */}
          <SolidContentsRenderer vesselId={id} radius={0.45} baseY={-0.55} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.45}
            fogHeight={0.6}
            fogY={0.4}
            stainRadius={0.48}
            stainBaseY={-0.55}
            stainHeightRange={0.9}
            fumeY={0.7}
            surgeRadius={0.35}
            surgeY={-0.3}
          />
        </>
      )}
    </group>
  );
});

// PETRI DISH (Flat shallow circular glass culture / crystallization dish)
export const PetriDish = React.memo(function PetriDish({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('petri_dish', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { 
        e.stopPropagation(); 
        openVesselInfo(id); 
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        openRadialMenu(e.clientX, e.clientY, id);
      }}
      onPointerDown={(e) => { 
        e.stopPropagation();
        openVesselInfo(id);
        if (moveMode && !vessel.isLocked) {
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVesselId(id);
        document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer');
      }}
      onPointerOut={() => {
        setHoveredVesselId(null);
        document.body.style.cursor = 'auto';
      }}
    >
      <VesselFloorRing 
        isSelected={isSelected} 
        isDropTarget={isDropTarget} 
        isChemicalDrop={isChemicalDrop}
        isNearestPourTarget={isNearestPourTarget} 
      />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.95} />
      ) : (
        <>
          {/* 1. Back Glass Inner Surface */}
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* 2. Liquid Layer */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="petri_dish" 
            baseY={-0.18} 
            maxHeight={0.36} 
            capacity_ml={vessel.capacity_ml || 60} 
          />

          {/* 3. Front Glass Outer Surface */}
          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* 4. Glass Petri Dish Lid (offset to show dish interior) */}
          <mesh position={[0.22, 0.24, 0.12]} rotation={[0.08, 0.12, 0]} material={glassMats.front} renderOrder={7}>
            <cylinderGeometry args={[1.22, 1.22, 0.08, 36, 1, true]} />
          </mesh>
          <mesh position={[0.22, 0.28, 0.12]} rotation={[-Math.PI / 2 + 0.08, 0.12, 0]} material={glassMats.front} renderOrder={7}>
            <circleGeometry args={[1.22, 36]} />
          </mesh>

          {/* Precipitate & Solid crystals */}
          {vessel.hasPrecipitate && (
            <Precipitate
              vesselId={id}
              substance={vessel.precipitateSubstance || 'AgCl'}
              morphology={vessel.precipitateMorphology as any}
              color={vessel.precipitateColor || '#ffffff'}
              radius={0.9}
              liquidTopY={0.08}
              liquidBottomY={-0.18}
              rate={15}
              active={true}
            />
          )}

          <SolidContentsRenderer vesselId={id} radius={0.85} baseY={-0.18} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.85}
            fogHeight={0.4}
            fogY={0.2}
            stainRadius={0.9}
            stainBaseY={-0.18}
            stainHeightRange={0.3}
            fumeY={0.4}
            surgeRadius={0.45}
            surgeY={-0.1}
          />
        </>
      )}
    </group>
  );
});

// Re-export interactive instruments
export { InteractiveBuretteApparatus as BuretteApparatus } from './interactions/InteractiveBuretteApparatus';
export { InteractiveDigitalBalance as DigitalBalance } from './interactions/InteractiveDigitalBalance';

// BUNSEN BURNER (Interactive Heating Element)
export const BunsenBurner = React.memo(function BunsenBurner({ id, position, isOn }: { id: string, position: [number, number, number], isOn: boolean }) {
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const toggleBurner = useAppStore(state => state.toggleBurner);
  
  const renderPos = isDragging ? [position[0], position[1] + 0.4, position[2]] as [number, number, number] : position;

  return (
    <group 
      position={renderPos}
      onDoubleClick={(e) => { e.stopPropagation(); toggleBurner(id); }}
      onPointerDown={(e) => {
        if (moveMode) {
          e.stopPropagation();
          setDraggingVesselId(id);
        }
      }}
      onPointerOver={() => document.body.style.cursor = moveMode ? 'grab' : 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      {/* Cast Heavy Base */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.5, 0.65, 0.2, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.6} />
      </mesh>
      {/* Burner Barrel Tube */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 1.0, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Tripod Stand */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.65, 0.05, 16, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.5} />
      </mesh>
      <mesh position={[-0.55, 0.5, -0.3]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.55, 0.5, -0.3]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.5, 0.55]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Flame Simulation with Dynamic Light */}
      {isOn && (
        <group position={[0, 1.2, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.22, 0.7, 16]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <coneGeometry args={[0.12, 0.35, 16]} />
            <meshBasicMaterial color="#93c5fd" transparent opacity={0.9} />
          </mesh>
          <pointLight position={[0, 0.3, 0]} color="#60a5fa" intensity={2.0} distance={4} />
        </group>
      )}
    </group>
  );
});

// REALISTIC PHYSICAL PHENOMENA VISUAL COMPONENTS

// 1. Shattered Glass Debris Shards (for overpressure/thermal shock shattered vessels)
export const VesselShatteredShards = React.memo(function VesselShatteredShards({ radius = 0.8, color = '#bae6fd' }: { radius?: number; color?: string }) {
  const shards = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (Math.sin(i * 3.14) * 0.3);
      const r = (0.15 + (i % 5) * 0.18) * radius;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const size = 0.08 + (i % 3) * 0.06;
      const rot = [Math.sin(i) * 0.4, (i * 0.7), Math.cos(i) * 0.4] as [number, number, number];
      return { x, z, size, rot };
    });
  }, [radius]);

  return (
    <group position={[0, -0.92, 0]}>
      {shards.map((s, idx) => (
        <mesh key={idx} position={[s.x, 0.015, s.z]} rotation={s.rot} castShadow>
          <coneGeometry args={[s.size, s.size * 0.4, 3]} />
          <meshPhysicalMaterial 
            roughness={0.06}
            transmission={0.92}
            ior={1.52}
            color={color}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
});

// 2. Headspace Condensation Fogging Mist (for warm/boiling vessels T > 55°C)
export const CondensationFog = React.memo(function CondensationFog({
  radius = 0.35,
  height = 0.8,
  yOffset = 0.6,
  intensity = 0.7
}: {
  radius?: number;
  height?: number;
  yOffset?: number;
  intensity?: number;
}) {
  return (
    <group position={[0, yOffset, 0]}>
      <mesh>
        <cylinderGeometry args={[radius * 0.98, radius * 0.98, height, 24, 1, true]} />
        <meshStandardMaterial 
          color="#f8fafc"
          roughness={0.7}
          metalness={0.05}
          transparent
          opacity={Math.min(0.65, Math.max(0.08, intensity * 0.65))}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
});

// 3. Wall Staining Evaporative Waterline Ring (for dried solute deposits)
export const WallStainRing = React.memo(function WallStainRing({
  radius = 0.95,
  y = 0.0,
  color = '#0284c7',
  intensity = 0.6
}: {
  radius?: number;
  y?: number;
  color?: string;
  intensity?: number;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.96, radius * 1.01, 32]} />
      <meshBasicMaterial 
        color={color}
        transparent
        opacity={Math.min(0.85, Math.max(0.1, intensity * 0.85))}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
});

// 4. Acid/Base Fuming Aerosol Plume (for open conc HCl, HNO3, NH3)
export const AcidBaseFume = React.memo(function AcidBaseFume({
  yOffset = 1.0,
  color = '#f8fafc',
  intensity = 0.8
}: {
  yOffset?: number;
  color?: string;
  intensity?: number;
}) {
  const plumeRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (plumeRef.current) {
      const t = state.clock.elapsedTime * 1.5;
      plumeRef.current.position.y = yOffset + Math.sin(t) * 0.04;
      plumeRef.current.rotation.y = t * 0.2;
    }
  });

  return (
    <group ref={plumeRef} position={[0, yOffset, 0]}>
      {[0, 0.22, 0.48].map((y, idx) => (
        <mesh key={idx} position={[Math.sin(idx * 2) * 0.03, y, Math.cos(idx * 2) * 0.03]}>
          <sphereGeometry args={[0.10 + idx * 0.09, 12, 12]} />
          <meshBasicMaterial 
            color={color}
            transparent
            opacity={Math.min(0.45, Math.max(0.05, (0.45 - idx * 0.12) * intensity))}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
});

// 5. Boiling Bumping Violent Ebullition Surge Burst (without nucleation)
export const BoilingBumpingBurst = React.memo(function BoilingBumpingBurst({
  radius = 0.5,
  yOffset = 0.0
}: {
  radius?: number;
  yOffset?: number;
}) {
  const surgeRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (surgeRef.current) {
      const t = (state.clock.elapsedTime * 6) % 1.5;
      const progress = t / 1.5;
      surgeRef.current.position.y = yOffset + progress * 0.45;
      surgeRef.current.scale.set(1 + progress * 0.8, 1 + progress * 1.5, 1 + progress * 0.8);
    }
  });

  return (
    <group ref={surgeRef} position={[0, yOffset, 0]}>
      <mesh>
        <sphereGeometry args={[radius * 0.7, 16, 16]} />
        <meshPhysicalMaterial 
          color="#bae6fd" 
          transmission={0.85} 
          roughness={0.1} 
          transparent 
          opacity={0.7} 
          depthWrite={false} 
        />
      </mesh>
    </group>
  );
});

// 6. Unified Physical Phenomena Renderer (Mist Fog, Wall Residue Stain Ring, Acid Fume, Bumping Surge, Stopper Seal)
export const VesselPhysicalEffects = React.memo(function VesselPhysicalEffects({
  vessel,
  fogRadius = 0.45,
  fogHeight = 1.0,
  fogY = 0.5,
  stainRadius = 0.8,
  stainBaseY = -0.9,
  stainHeightRange = 1.6,
  fumeY = 1.4,
  surgeRadius = 0.4,
  surgeY = -0.5
}: {
  vessel: VesselState;
  fogRadius?: number;
  fogHeight?: number;
  fogY?: number;
  stainRadius?: number;
  stainBaseY?: number;
  stainHeightRange?: number;
  fumeY?: number;
  surgeRadius?: number;
  surgeY?: number;
}) {
  if (vessel.isShattered) return null;

  const hasLiquid = vessel.volume_ml > 0.5;

  return (
    <>
      {hasLiquid && (vessel.temperature_c > 55 || (vessel.condensationMist || 0) > 0) && (
        <CondensationFog 
          radius={fogRadius} 
          height={fogHeight} 
          yOffset={fogY} 
          intensity={vessel.condensationMist || ((vessel.temperature_c - 55) / 35)} 
        />
      )}
      {(vessel.stainIntensity || 0) > 0 && (
        <WallStainRing 
          radius={stainRadius} 
          y={stainBaseY + stainHeightRange * (vessel.stainHeight || 0.4)} 
          color={vessel.stainColor || '#0284c7'} 
          intensity={vessel.stainIntensity} 
        />
      )}
      {hasLiquid && (vessel.fumingIntensity || 0) > 0 && !vessel.isSealed && (
        <AcidBaseFume 
          yOffset={fumeY} 
          color={vessel.fumingColor || '#f8fafc'} 
          intensity={vessel.fumingIntensity} 
        />
      )}
      {hasLiquid && vessel.bumpingSurge && (
        <BoilingBumpingBurst 
          radius={surgeRadius} 
          yOffset={surgeY} 
        />
      )}
      {/* Rubber Stopper for Sealed Containers with Overpressure Stress Indicator */}
      {vessel.isSealed && (
        <group position={[0, fumeY - 0.05, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[fogRadius * 0.52, fogRadius * 0.40, 0.22, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[fogRadius * 0.65, fogRadius * 0.65, 0.08, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          {(vessel.internalPressure_atm || 1.0) > 1.8 && (
            <mesh position={[0, 0.20, 0]}>
              <ringGeometry args={[0.08, 0.14, 16]} />
              <meshBasicMaterial color="#ef4444" side={DoubleSide} />
            </mesh>
          )}
        </group>
      )}
    </>
  );
});

// ====================================================================================
// NEW LABORATORY APPARATUS COMPONENTS (>20 DISTINCT LABORATORY INSTRUMENTS)
// ====================================================================================

// 1. VOLUMETRIC FLASK (Bình định mức - 100mL calibrated measuring flask)
export const VolumetricFlask = React.memo(function VolumetricFlask({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const invertVolumetricFlask = useAppStore(state => state.invertVolumetricFlask);

  const [tiltAngle, setTiltAngle] = useState(0);
  const [invertTimer, setInvertTimer] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('volumetric_flask', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }
    if (invertTimer > 0) {
      setInvertTimer(prev => Math.max(0, prev - delta));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        let rotZ = 0;
        let rotX = 0;
        let animY = renderPos[1];
        if (invertTimer > 0) {
          // Smooth 180° flip animation up, upside down, gentle shake, and return upright
          const t = 1 - (invertTimer / 1.4);
          const flip = Math.sin(t * Math.PI); // 0 -> 1 -> 0
          rotZ = flip * Math.PI;
          rotX = Math.sin(t * Math.PI * 4) * 0.12 * flip; // gentle mixing oscillation
          animY += flip * 0.65;
        }
        groupRef.current.position.set(renderPos[0], animY, renderPos[2]);
        groupRef.current.rotation.set(tiltAngle + rotX, vessel?.rotationY || 0, rotZ);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onContextMenu={(e) => { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.preventDefault(); openRadialMenu(e.clientX, e.clientY, id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={isChemicalDrop} isNearestPourTarget={isNearestPourTarget} />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.9} />
      ) : (
        <>
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          <RealisticLiquid 
            vesselId={id} 
            vesselType="volumetric_flask" 
            baseY={-0.95} 
            maxHeight={2.8} 
            capacity_ml={vessel.capacity_ml || 100} 
          />

          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* 100mL Etched Ring Calibration Mark */}
          <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.176, 0.186, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} side={DoubleSide} />
          </mesh>

          {/* Frosted Hexagonal Glass Ground Stopper */}
          <group 
            position={[0, vessel.isSealed ? 1.96 : 2.06, 0]}
            onClick={(e) => { 
              e.stopPropagation(); 
              setInvertTimer(1.4);
              invertVolumetricFlask(id); 
            }}
            onPointerOver={(e) => { 
              e.stopPropagation(); 
              document.body.style.cursor = 'pointer'; 
            }}
            onPointerOut={() => { 
              document.body.style.cursor = 'auto'; 
            }}
          >
            <mesh material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.17, 0.14, 0.22, 16]} />
            </mesh>
            <mesh position={[0, 0.18, 0]} material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.12, 6]} />
            </mesh>
          </group>

          {/* Real-world effects: Condensation, Stain, Fume, Solids */}
          {(vessel.temperature_c > 55 || (vessel.condensationMist || 0) > 0) && (
            <CondensationFog radius={0.18} height={1.1} yOffset={1.3} intensity={vessel.condensationMist || ((vessel.temperature_c - 55) / 35)} />
          )}
          {(vessel.stainIntensity || 0) > 0 && (
            <WallStainRing radius={0.65} y={-0.95 + 2.8 * (vessel.stainHeight || 0.4)} color={vessel.stainColor || '#0284c7'} intensity={vessel.stainIntensity} />
          )}
          {(vessel.fumingIntensity || 0) > 0 && (
            <AcidBaseFume yOffset={2.2} color={vessel.fumingColor || '#f8fafc'} intensity={vessel.fumingIntensity} />
          )}

          <SolidContentsRenderer vesselId={id} radius={0.65} baseY={-0.95} />
        </>
      )}
    </group>
  );
});

// 2. SEPARATORY FUNNEL (Phễu chiết quả lê - 150mL liquid-liquid extraction funnel)
export const SeparatoryFunnel = React.memo(function SeparatoryFunnel({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const toggleStopcock = useAppStore(state => state.toggleStopcock);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('separatory_funnel', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onContextMenu={(e) => { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.preventDefault(); openRadialMenu(e.clientX, e.clientY, id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={isChemicalDrop} isNearestPourTarget={isNearestPourTarget} />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.9} />
      ) : (
        <>
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          {/* Lower Aqueous Phase */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="separatory_funnel" 
            baseY={-0.45} 
            maxHeight={1.9} 
            capacity_ml={vessel.capacity_ml || 150} 
          />

          {/* Immiscible Organic Upper Phase (e.g. Hexane / Oil layer) */}
          {(vessel.immiscibleOrganicVolume_ml || 0) > 0 && (
            <group position={[0, -0.45 + 1.9 * Math.min(0.75, (vessel.volume_ml || 0) / (vessel.capacity_ml || 150)) + 0.16, 0]}>
              <mesh>
                <cylinderGeometry args={[0.82, 0.78, 0.32, 32]} />
                <meshPhysicalMaterial 
                  color={vessel.immiscibleOrganicColor || '#fef08a'} 
                  roughness={0.08} 
                  transmission={0.88} 
                  transparent 
                  opacity={0.85} 
                />
              </mesh>
              <mesh position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.01, 0.78, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} side={DoubleSide} />
              </mesh>
            </group>
          )}

          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Authentic Cast Iron Retort Stand & Ring Clamp Support */}
          <group position={[0, 0, 0]}>
            {/* Cast Iron Retort Base */}
            <mesh position={[-0.85, -1.22, 0]} receiveShadow castShadow>
              <boxGeometry args={[1.35, 0.12, 0.95]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.75} />
            </mesh>
            {/* Vertical Steel Support Rod */}
            <mesh position={[-1.25, 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 3.4, 16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.9} />
            </mesh>
            {/* Steel Top Cap */}
            <mesh position={[-1.25, 2.15, 0]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Bosshead Clamp */}
            <mesh position={[-1.25, 0.65, 0]} castShadow>
              <boxGeometry args={[0.13, 0.13, 0.13]} />
              <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.7} />
            </mesh>
            {/* Bosshead Thumbscrew */}
            <mesh position={[-1.33, 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.025, 0.025, 0.12, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            {/* Retort Ring Extension Arm */}
            <mesh position={[-1.08, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.28, 12]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
            </mesh>
            {/* Support Iron Ring Encircling Pear Funnel Bulb */}
            <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.94, 0.04, 16, 36]} />
              <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.75} />
            </mesh>
          </group>

          {/* PTFE Stopcock Valve Body & Turn Handle */}
          <group position={[0, -0.45, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={glassMats.front}>
              <cylinderGeometry args={[0.16, 0.16, 0.44, 16]} />
            </mesh>
            <group 
              position={[0, 0, 0.24]} 
              rotation={[0, 0, vessel.stopcockOpen ? Math.PI / 2 : 0]}
              onClick={(e) => { 
                e.stopPropagation(); 
                toggleStopcock(id); 
              }}
              onPointerOver={(e) => { 
                e.stopPropagation(); 
                document.body.style.cursor = 'pointer'; 
              }}
              onPointerOut={() => { 
                document.body.style.cursor = 'auto'; 
              }}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.07, 0.07, 0.52, 16]} />
                <meshStandardMaterial color={vessel.stopcockOpen ? "#16a34a" : "#2563eb"} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.18, 0]} castShadow>
                <boxGeometry args={[0.24, 0.12, 0.12]} />
                <meshStandardMaterial color={vessel.stopcockOpen ? "#15803d" : "#1d4ed8"} roughness={0.3} />
              </mesh>
            </group>
          </group>

          {/* Stopcock Draining Liquid Stream when open */}
          {vessel.stopcockOpen && (vessel.volume_ml > 0) && (
            <mesh position={[0, -1.55, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.6, 12]} />
              <meshBasicMaterial color={vessel.liquidColor || '#38bdf8'} transparent opacity={0.8} />
            </mesh>
          )}

          {/* Ground Glass Stopper on Top */}
          <group position={[0, 1.88, 0]}>
            <mesh material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.24, 0.19, 0.22, 16]} />
            </mesh>
            <mesh position={[0, 0.18, 0]} material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.34, 0.34, 0.12, 6]} />
            </mesh>
          </group>

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.5}
            fogHeight={0.8}
            fogY={1.0}
            stainRadius={0.75}
            stainBaseY={-0.45}
            stainHeightRange={1.8}
            fumeY={2.0}
            surgeRadius={0.4}
            surgeY={0.2}
          />
        </>
      )}
    </group>
  );
});

// 3. FILTER FUNNEL (Phễu lọc thủy tinh có giấy lọc - 75mL filtration funnel)
export const FilterFunnel = React.memo(function FilterFunnel({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('filter_funnel', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onContextMenu={(e) => { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.preventDefault(); openRadialMenu(e.clientX, e.clientY, id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={isChemicalDrop} isNearestPourTarget={isNearestPourTarget} />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.8} />
      ) : (
        <>
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Standalone Retort Support Ring Stand when resting on workbench table */}
          {position[1] < 0.35 && (
            <group position={[0, 0, 0]}>
              {/* Heavy Cast Iron Base Plate */}
              <mesh position={[-0.65, -1.12, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.9, 0.08, 0.7]} />
                <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.7} />
              </mesh>
              {/* Vertical Support Rod */}
              <mesh position={[-0.9, 0.05, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 2.3, 16]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.85} />
              </mesh>
              {/* Rod Top Cap */}
              <mesh position={[-0.9, 1.2, 0]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
              </mesh>
              {/* Bosshead Clamp */}
              <mesh position={[-0.9, 0.22, 0]} castShadow>
                <boxGeometry args={[0.10, 0.10, 0.10]} />
                <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.6} />
              </mesh>
              {/* Bosshead Thumbscrew */}
              <mesh position={[-0.97, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.09, 12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
              </mesh>
              {/* Ring Extension Arm */}
              <mesh position={[-0.72, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.028, 0.028, 0.32, 12]} />
                <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
              </mesh>
              {/* Support Iron Ring Cradling Funnel Cone */}
              <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.46, 0.035, 16, 32]} />
                <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.75} />
              </mesh>
            </group>
          )}

          {/* Porous White Cellulose Filter Paper Cone */}
          <mesh position={[0, 0.38, 0]}>
            <coneGeometry args={[0.88, 0.82, 32, 1, true]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.92} side={DoubleSide} />
          </mesh>

          {/* Retained Precipitate Cake on Filter Paper Cone */}
          {((vessel.filterPaperResidue_g || 0) > 0 || (vessel.hasPrecipitate && (vessel.precipitateAmount_g || 0) > 0)) && (
            <mesh position={[0, 0.28, 0]}>
              <coneGeometry args={[0.82, 0.62, 32, 1, true]} />
              <meshStandardMaterial 
                color={vessel.precipitateColor || '#fef08a'} 
                roughness={0.96} 
                side={DoubleSide} 
              />
            </mesh>
          )}

          {/* Liquid Pool inside Filter Paper */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="filter_funnel" 
            baseY={-0.10} 
            maxHeight={0.95} 
            capacity_ml={vessel.capacity_ml || 75} 
          />

          {/* Filtrate droplets dripping from stem tip */}
          {(vessel.volume_ml > 0 || vessel.isFiltrating) && (
            <group position={[0, -1.35, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshBasicMaterial color={vessel.liquidColor || '#38bdf8'} transparent opacity={0.85} />
              </mesh>
            </group>
          )}

          <SolidContentsRenderer vesselId={id} radius={0.45} baseY={0.08} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.6}
            fogHeight={0.6}
            fogY={0.8}
            stainRadius={0.7}
            stainBaseY={-0.10}
            stainHeightRange={0.9}
            fumeY={1.2}
            surgeRadius={0.35}
            surgeY={0.2}
          />
        </>
      )}
    </group>
  );
});

// 4. MORTAR & PESTLE (Cối và chày sứ nghiền hóa chất - 80mL porcelain mortar)
export const MortarPestle = React.memo(function MortarPestle({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const grindMortar = useAppStore(state => state.grindMortar);

  const [tiltAngle, setTiltAngle] = useState(0);
  const [grindTimer, setGrindTimer] = useState(0);
  const groupRef = useRef<THREE.Group>(null);
  const pestleRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const ceramicMats = useMemo(() => getCeramicMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('mortar_pestle', 36), []);

  useFrame((state, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }
    if (grindTimer > 0) {
      setGrindTimer(prev => Math.max(0, prev - delta));
    }

    if (groupRef.current) {
      const session = PourController.getSession();
      if (session && session.sourceId === id && session.sourcePos) {
        groupRef.current.position.set(...session.sourcePos);
        groupRef.current.rotation.set(0, vessel?.rotationY || 0, session.sourceRotationZ || -session.tilt);
      } else {
        const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
        groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
        groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
      }
    }

    if (pestleRef.current) {
      if (grindTimer > 0) {
        // High-speed energetic circular grinding animation against bowl basin
        const t = state.clock.elapsedTime * 18;
        const radius = 0.22 + Math.sin(t * 0.5) * 0.08;
        pestleRef.current.position.x = Math.cos(t) * radius;
        pestleRef.current.position.z = Math.sin(t) * radius;
        pestleRef.current.position.y = 0.18 + Math.abs(Math.sin(t * 2)) * 0.04;
        pestleRef.current.rotation.y = t * 1.5;
        pestleRef.current.rotation.z = -0.38 + Math.cos(t) * 0.12;
        pestleRef.current.rotation.x = Math.sin(t) * 0.12;
      } else if (isSelected || isHovered) {
        const t = state.clock.elapsedTime * 5;
        pestleRef.current.position.x = 0.15 + Math.cos(t) * 0.10;
        pestleRef.current.position.y = 0.22;
        pestleRef.current.position.z = Math.sin(t) * 0.10;
        pestleRef.current.rotation.x = 0.12;
        pestleRef.current.rotation.y = t * 0.7;
        pestleRef.current.rotation.z = -0.32 + Math.sin(t) * 0.06;
      } else {
        pestleRef.current.position.set(0.18, 0.22, 0);
        pestleRef.current.rotation.set(0.12, 0, -0.38);
      }
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onContextMenu={(e) => { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.preventDefault(); openRadialMenu(e.clientX, e.clientY, id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={isChemicalDrop} isNearestPourTarget={isNearestPourTarget} />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.75} color="#f8fafc" />
      ) : (
        <>
          {/* Heavy Glazed Porcelain Body */}
          <mesh geometry={latheGeom.outer} material={ceramicMats.front} renderOrder={2} castShadow receiveShadow />

          {/* Rough Unglazed Grinding Basin Floor */}
          <mesh position={[0, -0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 32]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.95} metalness={0.0} />
          </mesh>

          {/* Liquid Contents (if paste/slurry) */}
          <RealisticLiquid 
            vesselId={id} 
            vesselType="mortar_pestle" 
            baseY={-0.42} 
            maxHeight={0.72} 
            capacity_ml={vessel.capacity_ml || 80} 
          />

          {/* Porcelain Pestle Rod */}
          <group 
            ref={pestleRef} 
            position={[0.18, 0.22, 0]} 
            rotation={[0.12, 0, -0.38]}
            onClick={(e) => { 
              e.stopPropagation(); 
              grindMortar(id); 
              setGrindTimer(1.8);
            }}
            onPointerOver={(e) => { 
              e.stopPropagation(); 
              document.body.style.cursor = 'pointer'; 
            }}
            onPointerOut={() => { 
              document.body.style.cursor = 'auto'; 
            }}
          >
            <mesh position={[0, -0.42, 0]} material={ceramicMats.front} castShadow>
              <sphereGeometry args={[0.22, 24, 24]} />
            </mesh>
            <mesh position={[0, 0.24, 0]} material={ceramicMats.front} castShadow>
              <cylinderGeometry args={[0.11, 0.16, 1.25, 24]} />
            </mesh>
            <mesh position={[0, 0.90, 0]} material={ceramicMats.front} castShadow>
              <sphereGeometry args={[0.15, 16, 16]} />
            </mesh>
          </group>

          {/* Solid Crystals or Pulverized Powder */}
          <SolidContentsRenderer vesselId={id} radius={0.65} baseY={-0.42} />

          {/* Real-World Mechanisms: Condensation, Stain, Fume, Boiling Bumping */}
          <VesselPhysicalEffects 
            vessel={vessel}
            fogRadius={0.55}
            fogHeight={0.5}
            fogY={0.3}
            stainRadius={0.6}
            stainBaseY={-0.42}
            stainHeightRange={0.7}
            fumeY={0.6}
            surgeRadius={0.35}
            surgeY={-0.2}
          />
        </>
      )}
    </group>
  );
});

// 5. LIEBIG CONDENSER (Ống sinh hàn Liebig - 120mL cooling condenser)
export const LiebigCondenser = React.memo(function LiebigCondenser({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const isChemicalDrop = useAppStore(state => !!state.isDraggingChemical && (state.hoveredVesselId === id || state.selectedVesselId === id));
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const toggleCondenserWater = useAppStore(state => state.toggleCondenserWater);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);
  const latheGeom = useMemo(() => createVesselLatheGeometry('condenser', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
      groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
      groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      rotation={[0, vessel.rotationY || 0, 0]}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onContextMenu={(e) => { e.stopPropagation(); if (e.nativeEvent) e.nativeEvent.preventDefault(); openRadialMenu(e.clientX, e.clientY, id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={isChemicalDrop} isNearestPourTarget={isNearestPourTarget} />

      {vessel.isShattered ? (
        <VesselShatteredShards radius={0.7} />
      ) : (
        <>
          {effectiveTier !== 'low' && (
            <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
          )}

          <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

          {/* Shimmering Cooling Water Sleeve */}
          <mesh 
            position={[0, 0.22, 0]}
            onClick={(e) => { e.stopPropagation(); toggleCondenserWater(id); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <cylinderGeometry args={[0.34, 0.34, 2.05, 32, 1, true]} />
            <meshPhysicalMaterial 
              color={vessel.coolingWaterActive ? "#38bdf8" : "#bae6fd"} 
              transmission={vessel.coolingWaterActive ? 0.72 : 0.92} 
              roughness={vessel.coolingWaterActive ? 0.08 : 0.05} 
              transparent 
              opacity={vessel.coolingWaterActive ? 0.75 : 0.35} 
              ior={1.33} 
            />
          </mesh>

          {/* Water Inlet Nipple (Bottom) & Outlet Nipple (Top) */}
          <group 
            position={[0.38, -0.65, 0]} 
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => { e.stopPropagation(); toggleCondenserWater(id); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <mesh material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.35, 16]} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.14, 16]} />
              <meshStandardMaterial color={vessel.coolingWaterActive ? "#0284c7" : "#f97316"} roughness={0.6} />
            </mesh>
          </group>

          <group 
            position={[-0.38, 1.05, 0]} 
            rotation={[0, 0, -Math.PI / 2]}
            onClick={(e) => { e.stopPropagation(); toggleCondenserWater(id); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <mesh material={glassMats.front} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.35, 16]} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.14, 16]} />
              <meshStandardMaterial color={vessel.coolingWaterActive ? "#0284c7" : "#f97316"} roughness={0.6} />
            </mesh>
          </group>

          {/* Laboratory Clamp Stand Support */}
          <group position={[-0.55, 0.2, 0]}>
            <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.38, 0.04, 12, 24, Math.PI]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.5, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>

          <RealisticLiquid 
            vesselId={id} 
            vesselType="condenser" 
            baseY={-1.25} 
            maxHeight={2.9} 
            capacity_ml={vessel.capacity_ml || 120} 
          />

          <CondensationFog radius={0.14} height={2.5} yOffset={0.2} intensity={0.65} />
        </>
      )}
    </group>
  );
});

// 6. TEST TUBE RACK (Giá để ống nghiệm gỗ/acrylic - holds multiple test tubes)
export const TestTubeRack = React.memo(function TestTubeRack({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const placeTestTubeInRack = useAppStore(state => state.placeTestTubeInRack);
  const removeTestTubeFromRack = useAppStore(state => state.removeTestTubeFromRack);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
  const vessels = useAppStore(state => state.vessels);

  const groupRef = useRef<THREE.Group>(null);
  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);

  useFrame(() => {
    if (groupRef.current) {
      const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
      groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={false} isNearestPourTarget={isNearestPourTarget} />

      {/* Wooden Lab Base Plate */}
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.2, 0.12, 0.9]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      {/* Wooden Top Shelf Plate */}
      <mesh position={[0, 0.65, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.2, 0.10, 0.9]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>

      {/* 4 Vertical Pillar Posts */}
      {[-0.95, 0.95].map((x, i) => (
        [-0.32, 0.32].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0.25, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.6} />
          </mesh>
        ))
      ))}

      {/* 4 Interactive Test Tube Rack Slots */}
      {[-0.65, -0.22, 0.22, 0.65].map((x, idx) => {
        const slottedTubeId = vessel.slottedTestTubeIds?.[idx];
        return (
          <group 
            key={idx} 
            position={[x, 0.66, 0]}
            onClick={(e) => {
              e.stopPropagation();
              if (slottedTubeId) {
                removeTestTubeFromRack(id, slottedTubeId);
              } else if (selectedVesselId && vessels[selectedVesselId]?.type === 'test_tube') {
                placeTestTubeInRack(id, selectedVesselId);
              }
            }}
            onPointerOver={(e) => { 
              e.stopPropagation(); 
              document.body.style.cursor = 'pointer'; 
            }}
            onPointerOut={() => { 
              document.body.style.cursor = 'auto'; 
            }}
          >
            {/* Slot aperture ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.13, 0.17, 24]} />
              <meshStandardMaterial color="#451a03" roughness={0.8} side={DoubleSide} />
            </mesh>
            {/* Visual indicator when empty */}
            {!slottedTubeId && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.12, 16]} />
                <meshBasicMaterial color="#1e1b4b" transparent opacity={0.3} side={DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 4 Drying Pegs */}
      {[-0.65, -0.22, 0.22, 0.65].map((x, idx) => (
        <mesh key={`peg-${idx}`} position={[x, 0.35, -0.32]} rotation={[0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.55, 12]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
});

// 7. WASH BOTTLE (Bình tia nước cất PE - 250mL squeeze wash bottle)
export const WashBottle = React.memo(function WashBottle({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isDropTarget = useAppStore(state => !!state.draggingVesselId && state.draggingVesselId !== id);
  const isNearestPourTarget = useAppStore(state => state.nearestPourTargetId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const squirtWashBottle = useAppStore(state => state.squirtWashBottle);

  const [tiltAngle, setTiltAngle] = useState(0);
  const groupRef = useRef<THREE.Group>(null);
  const latheGeom = useMemo(() => createVesselLatheGeometry('wash_bottle', 36), []);

  useFrame((_, delta) => {
    if (tiltAngle > 0 && !isSelected && !isHovered) {
      setTiltAngle(prev => Math.max(0, prev - delta * 2.5));
    }

    if (groupRef.current) {
      const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
      groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
      groupRef.current.rotation.set(tiltAngle, vessel?.rotationY || 0, 0);
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); openVesselInfo(id); }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={isDropTarget} isChemicalDrop={false} isNearestPourTarget={isNearestPourTarget} />

      {/* Translucent LDPE Plastic Body */}
      <mesh geometry={latheGeom.outer} castShadow receiveShadow>
        <meshPhysicalMaterial 
          color="#f8fafc"
          roughness={0.35}
          transmission={0.75}
          ior={1.5}
          transparent
          opacity={0.78}
        />
      </mesh>

      {/* Liquid Contents inside */}
      <RealisticLiquid 
        vesselId={id} 
        vesselType="wash_bottle" 
        baseY={-0.95} 
        maxHeight={1.8} 
        capacity_ml={vessel.capacity_ml || 250} 
      />

      {/* Red Threaded Cap & Squeeze Trigger */}
      <group 
        position={[0, 1.38, 0]}
        onClick={(e) => { e.stopPropagation(); squirtWashBottle(id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.34, 0.34, 0.18, 24]} />
          <meshStandardMaterial color="#ef4444" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.10, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.3} />
        </mesh>
      </group>

      {/* Internal Siphon Tube */}
      <mesh position={[0.04, 0.15, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.1, 12]} />
        <meshPhysicalMaterial color="#e2e8f0" transmission={0.9} roughness={0.2} transparent opacity={0.6} />
      </mesh>

      {/* Angled Curved Swan-Neck Dispensing Tube */}
      <group 
        position={[0.06, 1.48, 0]}
        onClick={(e) => { e.stopPropagation(); squirtWashBottle(id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.44, 16]} />
          <meshPhysicalMaterial color="#f8fafc" transmission={0.8} roughness={0.2} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.18, 0.42, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.04, 0.045, 0.45, 16]} />
          <meshPhysicalMaterial color="#f8fafc" transmission={0.8} roughness={0.2} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.34, 0.48, 0]} rotation={[0, 0, -Math.PI / 2.5]} castShadow>
          <coneGeometry args={[0.045, 0.18, 16]} />
          <meshStandardMaterial color="#ef4444" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
});

// 8. LAB TONGS (Kẹp gắp chén nung / kẹp cốc - stainless steel laboratory tongs)
export const LabTongs = React.memo(function LabTongs({ position, id }: { position: [number, number, number], id: string }) {
  const isSelected = useAppStore(state => state.selectedVesselId === id);
  const isDragging = useAppStore(state => state.draggingVesselId === id);
  const isHovered = useAppStore(state => state.hoveredVesselId === id);
  const moveMode = useAppStore(state => state.moveMode);
  const vessel = useAppStore(state => state.vessels[id]);

  const setDraggingVesselId = useAppStore(state => state.setDraggingVesselId);
  const setHoveredVesselId = useAppStore(state => state.setHoveredVesselId);
  const openVesselInfo = useAppStore(state => state.openVesselInfo);
  const toggleGripWithTongs = useAppStore(state => state.toggleGripWithTongs);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const renderPos = isDragging ? [position[0], position[1] + 0.35, position[2]] : position;
      groupRef.current.position.set(renderPos[0], renderPos[1], renderPos[2]);
    }
  });

  if (!vessel) return null;

  return (
    <group 
      ref={groupRef}
      position={position}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (vessel.grippedVesselId) {
          toggleGripWithTongs(id, vessel.grippedVesselId);
        } else if (selectedVesselId && selectedVesselId !== id) {
          toggleGripWithTongs(id, selectedVesselId);
        } else {
          openVesselInfo(id); 
        }
      }}
      onPointerDown={(e) => { e.stopPropagation(); openVesselInfo(id); if (moveMode && !vessel.isLocked) setDraggingVesselId(id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHoveredVesselId(id); document.body.style.cursor = vessel.isLocked ? 'not-allowed' : (moveMode ? 'grab' : 'pointer'); }}
      onPointerOut={() => { setHoveredVesselId(null); document.body.style.cursor = 'auto'; }}
    >
      <VesselFloorRing isSelected={isSelected} isDropTarget={false} isChemicalDrop={false} isNearestPourTarget={false} />

      {/* Stainless Steel Scissor Laboratory Tongs */}
      <group position={[0, 0.45, 0]}>
        {/* Pivot Rivet */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Arm A */}
        <group position={[0, 0, 0.03]} rotation={[0, 0, 0.15]}>
          <mesh position={[-0.15, -0.55, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 1.1, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[-0.25, -1.15, 0]} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.18, 0.03, 12, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.15, 0.45, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.9, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.22, 0.95, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <torusGeometry args={[0.22, 0.032, 12, 24, Math.PI * 0.7]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>

        {/* Arm B */}
        <group position={[0, 0, -0.03]} rotation={[0, 0, -0.15]}>
          <mesh position={[0.15, -0.55, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 1.1, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.25, -1.15, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <torusGeometry args={[0.18, 0.03, 12, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[-0.15, 0.45, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.9, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[-0.22, 0.95, 0]} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.22, 0.032, 12, 24, Math.PI * 0.7]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  );
});
