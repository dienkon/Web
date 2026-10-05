import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticlePool, ParticleState } from './ParticlePool';
import { useQualityStore, QUALITY_CONFIGS } from '../quality';
import { useAppStore } from '../../store/useAppStore';

export type PrecipitateMorphologyType =
  | 'FINE_POWDER'       // e.g. BaSO4, fine micro-crystals with high turbidity
  | 'FLOC'              // e.g. Fe(OH)3, fluffy aggregates
  | 'CURD'              // e.g. AgCl, dense curd-like chunks
  | 'GEL'               // e.g. Cu(OH)2, semi-transparent gelatinous floc
  | 'CRYSTAL_PLATE'     // e.g. PbI2 Golden Rain, hexagonal flat platelets
  | 'CRYSTAL_ROD'       // e.g. CaSO4, prismatic needle micro-crystals
  | 'IRREGULAR_GRAIN'   // e.g. CaCO3, angular polyhedral grains
  | 'METALLIC_DEPOSIT'; // e.g. Cu on Fe, rough metallic micro-flakes

export interface PrecipitateProps {
  vesselId?: string;
  substance?: string; // 'PbI2' | 'BaSO4' | 'AgCl' | 'Cu(OH)2' | string
  morphology?: PrecipitateMorphologyType;
  color?: string;
  radius?: number;
  liquidTopY?: number;
  liquidBottomY?: number;
  rate?: number;
  active?: boolean;
}

export function resolveMorphology(substance?: string, explicit?: PrecipitateMorphologyType): PrecipitateMorphologyType {
  if (explicit) return explicit;
  const s = (substance || '').toLowerCase();
  if (s.includes('pbi2') || s.includes('lead') || s.includes('gold')) return 'CRYSTAL_PLATE';
  if (s.includes('cu(oh)2') || s.includes('al(oh)3') || s.includes('gel')) return 'GEL';
  if (s.includes('agcl') || s.includes('curd')) return 'CURD';
  if (s.includes('fe(oh)3') || s.includes('floc')) return 'FLOC';
  if (s.includes('caso4') || s.includes('rod') || s.includes('needle')) return 'CRYSTAL_ROD';
  if (s.includes('caco3') || s.includes('mno2') || s.includes('grain')) return 'IRREGULAR_GRAIN';
  if (s.includes('cu') || s.includes('fe') || s.includes('metal')) return 'METALLIC_DEPOSIT';
  return 'FINE_POWDER';
}

export const Precipitate = React.memo(function Precipitate({
  vesselId,
  substance = 'BaSO4',
  morphology: explicitMorphology,
  color,
  radius = 0.55,
  liquidTopY = 0.2,
  liquidBottomY = -0.85,
  rate = 25,
  active = true,
}: PrecipitateProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const effectiveTier = useQualityStore((state) => state.effectiveTier);
  const multiplier = QUALITY_CONFIGS[effectiveTier].particleMultiplier;

  const morphology = useMemo(
    () => resolveMorphology(substance, explicitMorphology),
    [substance, explicitMorphology]
  );

  const isCrystalline = morphology === 'CRYSTAL_PLATE' || morphology === 'CRYSTAL_ROD';
  const isMetallic = morphology === 'METALLIC_DEPOSIT';
  const isGel = morphology === 'GEL';

  const maxCount = useMemo(() => {
    return Math.max(20, Math.floor((effectiveTier === 'high' ? 180 : effectiveTier === 'medium' ? 90 : 40) * multiplier));
  }, [effectiveTier, multiplier]);

  const pool = useMemo(() => new ParticlePool(maxCount), [maxCount]);
  const spawnTimer = useRef(0);

  const particleColor = useMemo(() => {
    if (color) return new THREE.Color(color);
    if (morphology === 'CRYSTAL_PLATE') return new THREE.Color('#fbbf24'); // Golden yellow shimmering flakes
    if (morphology === 'GEL') return new THREE.Color('#0284c7'); // Azure sky-blue gelatinous floc
    if (morphology === 'FLOC') return new THREE.Color('#9a3412'); // Rust reddish-brown floc
    if (morphology === 'METALLIC_DEPOSIT') return new THREE.Color('#b45309'); // Copper metallic
    return new THREE.Color('#f8fafc'); // Milky white curd (BaSO4, AgCl)
  }, [color, morphology]);

  useEffect(() => {
    if (meshRef.current) {
      pool.init(meshRef.current);
    }
    return () => {
      if (meshRef.current) pool.clear(meshRef.current);
    };
  }, [pool]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);

    if (vesselId) {
      const vessel = useAppStore.getState().vessels[vesselId];
      if (vessel && (vessel.isShattered || (vessel.volume_ml ?? 0) <= 0.2)) {
        pool.clear(meshRef.current);
        return;
      }
    }

    if (active && rate > 0) {
      spawnTimer.current += dt * rate * multiplier;

      while (spawnTimer.current >= 1.0) {
        spawnTimer.current -= 1.0;

        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius * 0.85;
        const px = Math.cos(angle) * r;
        const py = liquidTopY - Math.random() * 0.15; // Form near upper reaction mixing zone
        const pz = Math.sin(angle) * r;

        // Stokes drag terminal sedimentation velocity based on morphology and density
        let settlingVy = -0.085;
        let baseSize = 0.022;

        switch (morphology) {
          case 'CRYSTAL_PLATE':
            settlingVy = -(0.065 + Math.random() * 0.04); // Flakes flutter gracefully
            baseSize = 0.028 + Math.random() * 0.022;
            break;
          case 'GEL':
            settlingVy = -(0.045 + Math.random() * 0.03); // Gel settles very slowly
            baseSize = 0.045 + Math.random() * 0.035;
            break;
          case 'FLOC':
            settlingVy = -(0.060 + Math.random() * 0.04);
            baseSize = 0.038 + Math.random() * 0.03;
            break;
          case 'CURD':
            settlingVy = -(0.095 + Math.random() * 0.05);
            baseSize = 0.032 + Math.random() * 0.025;
            break;
          case 'METALLIC_DEPOSIT':
            settlingVy = -(0.14 + Math.random() * 0.06); // Heavy copper/metal sinks rapidly
            baseSize = 0.025 + Math.random() * 0.02;
            break;
          case 'IRREGULAR_GRAIN':
            settlingVy = -(0.11 + Math.random() * 0.05);
            baseSize = 0.026 + Math.random() * 0.02;
            break;
          case 'CRYSTAL_ROD':
            settlingVy = -(0.085 + Math.random() * 0.045);
            baseSize = 0.025 + Math.random() * 0.02;
            break;
          case 'FINE_POWDER':
          default:
            settlingVy = -(0.075 + Math.random() * 0.045);
            baseSize = 0.018 + Math.random() * 0.015;
            break;
        }

        pool.spawn({
          x: px,
          y: py,
          z: pz,
          vx: (Math.random() - 0.5) * (isCrystalline ? 0.05 : 0.025),
          vy: settlingVy,
          vz: (Math.random() - 0.5) * (isCrystalline ? 0.05 : 0.025),
          baseSize,
          size: baseSize,
          life: isCrystalline ? 14.0 : 9.0,
          r: particleColor.r,
          g: particleColor.g,
          b: particleColor.b,
          alpha: isGel ? 0.68 : (morphology === 'FINE_POWDER' ? 0.88 : 0.98),
          rotX: Math.random() * Math.PI * 2,
          rotY: Math.random() * Math.PI * 2,
          rotZ: Math.random() * Math.PI * 2,
          vRotX: isCrystalline ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.5,
          vRotY: isCrystalline ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.5,
          vRotZ: isCrystalline ? (Math.random() - 0.5) * 5.0 : (Math.random() - 0.5) * 1.5,
        });
      }
    }

    pool.update(dt, (p: ParticleState) => {
      // Aerodynamic lateral drift / flutter oscillation for crystal flakes and buoyant gels
      if (p.y > liquidBottomY + 0.02) {
        if (morphology === 'CRYSTAL_PLATE') {
          p.x += Math.sin(p.age * 4.5 + p.rotX) * dt * 0.06;
          p.z += Math.cos(p.age * 4.5 + p.rotZ) * dt * 0.06;
        } else if (morphology === 'GEL') {
          p.x += Math.sin(p.age * 2.5 + p.rotY) * dt * 0.03;
          p.z += Math.cos(p.age * 2.5 + p.rotY) * dt * 0.03;
        }
      }

      // Reached bottom sediment layer
      if (p.y <= liquidBottomY + 0.02) {
        p.vy = 0;
        p.vx = 0;
        p.vz = 0;
        p.vRotX = 0;
        p.vRotY = 0;
        p.vRotZ = 0;
        if (p.age > (isCrystalline ? 16.0 : 8.0)) return false;
      }

      return true;
    }, meshRef.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, maxCount]}
      frustumCulled={false}
      renderOrder={4}
      visible={false}
    >
      {/* Reaction-specific non-spherical particle geometries */}
      {morphology === 'CRYSTAL_PLATE' ? (
        // Authentic hexagonal prism platelet for PbI2 crystalline structure
        <cylinderGeometry args={[1, 1, 0.12, 6]} />
      ) : morphology === 'CRYSTAL_ROD' ? (
        // Prismatic needle rods
        <cylinderGeometry args={[0.25, 0.25, 1.8, 6]} />
      ) : morphology === 'GEL' ? (
        // Soft semi-transparent gelatinous floc
        <icosahedronGeometry args={[0.65, 0]} />
      ) : morphology === 'CURD' ? (
        // Cheese-like irregular curds
        <dodecahedronGeometry args={[0.7, 0]} />
      ) : morphology === 'FLOC' ? (
        // Fluffy aggregated flocs
        <icosahedronGeometry args={[0.75, 0]} />
      ) : morphology === 'METALLIC_DEPOSIT' ? (
        // Rough metallic micro-flakes
        <cylinderGeometry args={[0.6, 0.8, 0.5, 5]} />
      ) : morphology === 'IRREGULAR_GRAIN' ? (
        // Angular mineral grains
        <octahedronGeometry args={[0.6, 0]} />
      ) : (
        // Fine faceted powder grains (BaSO4)
        <dodecahedronGeometry args={[0.45, 0]} />
      )}
      <meshStandardMaterial
        color={particleColor}
        roughness={isCrystalline ? 0.12 : (isMetallic ? 0.25 : (isGel ? 0.45 : 0.88))}
        metalness={isCrystalline ? 0.92 : (isMetallic ? 0.85 : 0.05)}
        transparent
        opacity={isGel ? 0.68 : (morphology === 'FINE_POWDER' ? 0.88 : 0.98)}
        depthWrite={false}
      />
    </instancedMesh>
  );
});
