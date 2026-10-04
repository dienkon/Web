import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { vfxBus } from './bus';
import { getReactionVfxRecipe, sampleRecipeProgress, ReactionVfxRecipe } from './recipes/reactionVfx';
import { getGenericVfxRecipe } from './recipes/generic';
import { Bubbles, GasPlume, Steam, Precipitate, Sparks, Foam, Splash } from './particles';
import { PhysicalSimulationRenderer } from '../simulation/render/PhysicalSimulationRenderer';
import { labSound } from '../utils/audio';

// Sodium molten sphere simulation state
interface SodiumDartState {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

// Expanding shockwave ripple on table surface
interface ShockwaveSlot {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export const VfxDirector = React.memo(function VfxDirector() {
  const vessels = useAppStore((state) => state.vessels);
  const activeKinetics = useAppStore((state) => state.activeKinetics);
  const addSpill = useAppStore((state) => state.addSpill);

  // Flash flare light for intense reactions (Mg burning, explosions)
  const flashLightRef = useRef<THREE.PointLight>(null);
  const flashIntensityRef = useRef(0);
  const flashColorRef = useRef(new THREE.Color('#fffbeb'));

  // Pre-allocated shockwave pool for zero-allocation table ripples
  const shockwavesPool = useRef<ShockwaveSlot[]>([
    { active: false, x: 0, z: 0, radius: 0, maxRadius: 3.2, opacity: 0 },
    { active: false, x: 0, z: 0, radius: 0, maxRadius: 3.2, opacity: 0 },
    { active: false, x: 0, z: 0, radius: 0, maxRadius: 3.2, opacity: 0 },
    { active: false, x: 0, z: 0, radius: 0, maxRadius: 3.2, opacity: 0 },
  ]);
  const shockwaveMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockwaveMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  // Sodium dart simulation state per vessel
  const sodiumDarts = useRef<Record<string, SodiumDartState>>({});

  // Listen to explosion events on the bus
  useEffect(() => {
    const unsubExplosion = vfxBus.on('explosion', (e) => {
      flashIntensityRef.current = 4.0;
      flashColorRef.current.set(e.color || '#fee2e2');

      // Spawn shockwave ring in an available slot
      const slot = shockwavesPool.current.find(s => !s.active) || shockwavesPool.current[0];
      if (slot) {
        slot.active = true;
        slot.x = e.position[0];
        slot.z = e.position[2];
        slot.radius = 0.2;
        slot.maxRadius = 3.2;
        slot.opacity = 0.95;
      }

      // Emit splash droplet burst
      vfxBus.emit('particle:burst', {
        position: [e.position[0], e.position[1] + 0.6, e.position[2]],
        count: 120,
        color: e.color || '#fca5a5',
        speed: 3.8
      });

      // Scatter dangerous acid splatters on table
      if (e.isDangerous) {
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 0.6 + Math.random() * 0.9;
          const spillPos: [number, number, number] = [
            e.position[0] + Math.cos(angle) * dist,
            -0.135,
            e.position[2] + Math.sin(angle) * dist
          ];
          addSpill(spillPos, 1.5 + Math.random() * 2.0, ['H2SO4'], '#fca5a5', 'Acid Splatter');
        }
      }
    });

    const unsubBurst = vfxBus.on('particle:burst', () => {
      if (Math.random() < 0.4) {
        flashIntensityRef.current = Math.max(flashIntensityRef.current, 1.5);
      }
    });

    return () => {
      unsubExplosion();
      unsubBurst();
    };
  }, [addSpill]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // Decay flash flare without React state dispatch
    if (flashLightRef.current) {
      if (flashIntensityRef.current > 0.01) {
        flashIntensityRef.current = Math.max(0, flashIntensityRef.current - dt * 6.0);
        flashLightRef.current.intensity = flashIntensityRef.current * 4.5;
        flashLightRef.current.color.copy(flashColorRef.current);
        flashLightRef.current.visible = true;
      } else {
        flashLightRef.current.visible = false;
      }
    }

    // Expand & fade shockwaves directly on meshes (zero state, zero GC)
    for (let i = 0; i < shockwavesPool.current.length; i++) {
      const sw = shockwavesPool.current[i];
      const mesh = shockwaveMeshRefs.current[i];
      const mat = shockwaveMatRefs.current[i];
      if (!mesh || !mat) continue;

      if (sw.active) {
        sw.radius += dt * 4.5;
        sw.opacity -= dt * 1.8;
        if (sw.opacity <= 0.02 || sw.radius >= sw.maxRadius) {
          sw.active = false;
          mesh.visible = false;
        } else {
          mesh.visible = true;
          mesh.position.set(sw.x, -0.13, sw.z);
          mesh.scale.set(sw.radius, sw.radius, 1);
          mat.opacity = sw.opacity * 0.7;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  return (
    <group name="vfx_director_layer">
      {/* Global Splash listener for liquid impacts */}
      <Splash />

      {/* Dynamic Flash Light for exothermic flares & explosions */}
      <pointLight
        ref={flashLightRef}
        position={[0, 2.8, 1]}
        intensity={0}
        color="#fffbeb"
        distance={12}
        visible={false}
      />

      {/* Reusable Shockwave Rings on Workbench Table Surface */}
      {[0, 1, 2, 3].map(i => (
        <mesh
          key={i}
          ref={el => { shockwaveMeshRefs.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -9999, 0]}
          scale={[0, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.88, 1.0, 36]} />
          <meshBasicMaterial
            ref={el => { shockwaveMatRefs.current[i] = el; }}
            color="#fca5a5"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Render active reaction VFX per vessel */}
      {Object.entries(vessels).map(([vesselId, vessel]) => {
        const kinetics = activeKinetics[vesselId];
        const isHotOrActive = vessel.isBoiling || vessel.hasGas || vessel.hasPrecipitate || vessel.isExplosion || vessel.temperature_c >= 48;
        const rawRecipe: ReactionVfxRecipe | null = kinetics?.reactionId 
          ? getReactionVfxRecipe(kinetics.reactionId)
          : (kinetics ? getGenericVfxRecipe(null, vessel) : (isHotOrActive ? getGenericVfxRecipe(null, vessel) : null));

        if (!rawRecipe && !isHotOrActive) {
          return null;
        }

        const activeRecipe = rawRecipe || getGenericVfxRecipe(null, vessel);
        const progress = kinetics ? kinetics.progress : 1.0;
        const sampled = sampleRecipeProgress(activeRecipe, progress);

        const pos = vessel.position;
        const volumeFrac = Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 100)));
        const liquidTopY = pos[1] - 0.9 + volumeFrac * 1.5;
        const mouthY = pos[1] + (vessel.type === 'cylinder' ? 1.7 : vessel.type === 'flask' ? 1.45 : 1.0);
        const vesselRadius = vessel.type === 'test_tube' ? 0.18 : 0.6;

        // Sodium Molten Dart simulation
        let sodiumPos: [number, number, number] = [0, 0, 0];
        const isSodiumDart = activeRecipe.specialEffect === 'sodium_dart';
        if (isSodiumDart) {
          if (!sodiumDarts.current[vesselId]) {
            sodiumDarts.current[vesselId] = { x: 0, z: 0, vx: 0.3, vz: 0.2 };
          }
          const dart = sodiumDarts.current[vesselId];
          // Brownian random kick + friction
          dart.vx += (Math.random() - 0.5) * 0.12;
          dart.vz += (Math.random() - 0.5) * 0.12;
          dart.vx *= 0.92;
          dart.vz *= 0.92;
          dart.x += dart.vx;
          dart.z += dart.vz;

          // Boundary bounce inside vessel
          const maxR = vesselRadius * 0.75;
          const currentR = Math.hypot(dart.x, dart.z);
          if (currentR > maxR) {
            dart.x = (dart.x / currentR) * maxR;
            dart.z = (dart.z / currentR) * maxR;
            dart.vx = -dart.vx * 0.8;
            dart.vz = -dart.vz * 0.8;
          }
          sodiumPos = [dart.x, liquidTopY - pos[1] + 0.04, dart.z];
        }

        const effectiveBubbleRate = sampled.bubblesRate > 0 ? sampled.bubblesRate : (activeRecipe.bubbles?.rate || 0);
        const effectiveGasDensity = sampled.gasDensity > 0 ? sampled.gasDensity : (activeRecipe.gasPlume ? 0.5 : 0);
        const effectiveGasColor = sampled.gasColor || activeRecipe.gasPlume?.color || '#ffffff';
        const effectivePrecipitate = sampled.precipitateActive || !!activeRecipe.precipitate;
        const effectiveFoamRate = sampled.foamRate > 0 ? sampled.foamRate : (activeRecipe.foam?.active ? 20 : 0);

        return (
          <group key={vesselId} position={pos}>
            {/* Core Realistic Chemical Simulation: Multi-stage Boiling, Stokes Precipitation, Sediment Bed, Clausius-Clapeyron Evaporation */}
            <PhysicalSimulationRenderer
              vesselId={vesselId}
              baseY={-0.88}
              mouthY={mouthY - pos[1]}
              radius={vessel.type === 'test_tube' ? 0.14 : vessel.type === 'cylinder' ? 0.28 : vessel.type === 'flask' ? 0.45 : 0.52}
              mouthRadius={vessel.type === 'test_tube' ? 0.12 : vessel.type === 'cylinder' ? 0.25 : 0.35}
              color={sampled.bubblesColor || '#ffffff'}
              reactionGasRate={effectiveBubbleRate}
              reactionPrecipitateActive={effectivePrecipitate}
              reactionPrecipitateSubstance={sampled.precipitateSubstance || activeRecipe.precipitate?.substance}
            />

            {/* Supplementary Reaction Gas Plume (Heavy colored fumes, e.g. NO2 brown gas) */}
            {effectiveGasDensity > 0 && (
              <GasPlume
                vesselId={vesselId}
                origin={[0, 0, 0]}
                surfaceY={liquidTopY - pos[1]}
                radius={vesselRadius * 0.85}
                color={effectiveGasColor}
                density={sampled.gasHeavy ? 'heavy' : (activeRecipe.gasPlume?.density || 'neutral')}
                rate={effectiveGasDensity * 40}
                turbidity={0.7}
                active={true}
              />
            )}

            {/* Supplementary Sparks & Flashes */}
            {(activeRecipe.sparks?.active || isSodiumDart) && (
              <Sparks
                origin={isSodiumDart ? sodiumPos : [0, liquidTopY - pos[1], 0]}
                rate={activeRecipe.sparks?.rate || 30}
                burstCount={activeRecipe.sparks?.burstCount || 15}
                color={activeRecipe.sparks?.color || '#f59e0b'}
                active={true}
              />
            )}

            {/* 6. Foam */}
            {((vessel.foam_ml && vessel.foam_ml > 0.05)) && (
              <Foam
                vesselId={vesselId}
                surfaceY={liquidTopY - pos[1]}
                vesselTopY={mouthY - pos[1]}
                radius={vessel.type === 'test_tube' ? 0.14 : 0.52}
                capacity_ml={vessel.capacity_ml}
                active={true}
              />
            )}

            {/* 7. Special Effect: Endothermic Frost */}
            {activeRecipe.specialEffect === 'frost' && (
              <mesh position={[0, 0, 0]} renderOrder={5}>
                <cylinderGeometry args={[0.99, 0.99, 1.8, 24, 1, true]} />
                <meshStandardMaterial
                  color="#e0f2fe"
                  roughness={0.9}
                  metalness={0.1}
                  transparent
                  opacity={0.55}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
});
