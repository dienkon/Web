import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide } from 'three';
import * as THREE from 'three';
import { useAppStore, getChemical } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { getReagentBottleLabelTexture, getVesselGraduationTexture } from '../../vfx/textures';
import { useQualityStore } from '../../vfx/quality';
import { getGlassMaterials, createVesselLatheGeometry } from '../../vfx/materials/glass';
import { RealisticLiquid } from '../../vfx/materials/liquid';
import { Bubbles, GasPlume, Precipitate } from '../../vfx/particles';
import { PourController } from '../../pour/controller/PourController';
import { SolidContentsRenderer } from './SolidContentsRenderer';

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
      const baseScale = 0.045 + pseudoRandom(j * 5 + 3) * 0.035;
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
        openVesselInfo(id);
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

      {/* Dynamic Falling Precipitate Particles (e.g. Golden Rain PbI2, BaSO4, AgCl, Cu(OH)2) */}
      {vessel.hasPrecipitate && (
        <Precipitate
          vesselId={id}
          substance={
            vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('I'))
              ? 'PbI2'
              : (vessel.precipitateColor || 'BaSO4')
          }
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
            roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.22 : 0.92}
            metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.88 : 0.05}
          />
        </mesh>
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
        openVesselInfo(id);
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
            vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('I'))
              ? 'PbI2'
              : (vessel.precipitateColor || 'BaSO4')
          }
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
            roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.22 : 0.92}
            metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.88 : 0.05}
          />
        </mesh>
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
        openVesselInfo(id);
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
            vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24' || vessel.substances?.some(s => s.includes('Pb') || s.includes('I'))
              ? 'PbI2'
              : (vessel.precipitateColor || 'BaSO4')
          }
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
            roughness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.22 : 0.8}
            metalness={(vessel.precipitateColor === '#facc15' || vessel.precipitateColor === '#fbbf24') ? 0.88 : 0.05}
          />
        </mesh>
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
        openVesselInfo(id);
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
        <SolidParticles 
          substance="precipitate" 
          color={vessel.precipitateColor || '#cbd5e1'} 
          radius={0.22} 
          baseY={-0.92} 
          isStirring={isStirring}
        />
      )}

      {/* Realistic 3D Solid Contents: Powder Mounds, Metal Chunks, Crystal Facets */}
      <SolidContentsRenderer vesselId={id} radius={0.24} baseY={-0.92} />
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
