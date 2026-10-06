import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { vfxBus } from './bus';
import { getReactionVfxRecipe, sampleRecipeProgress, ReactionVfxRecipe } from './recipes/reactionVfx';
import { getGenericVfxRecipe } from './recipes/generic';
import { Bubbles, GasPlume, Steam, Precipitate, Sparks, Foam, Splash, AcidSplatter } from './particles';
import { PhysicalSimulationRenderer } from '../simulation/render/PhysicalSimulationRenderer';
import { labSound } from '../utils/audio';
import { reactionSimulationEngine } from './reactions/ReactionSimulationEngine';
import { programPlayer } from './programs/player/ProgramPlayer';
import { LedgerView } from './catalog/types';

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

      // Trigger high-velocity ballistic acid splatter with visible trajectory arcs & workbench landings
      vfxBus.emit('acid:splatter', {
        vesselId: e.vesselId,
        position: [e.position[0], e.position[1] + (e.position[1] < 0 ? 0.85 : 0.45), e.position[2]],
        count: 100,
        speed: 5.2,
        color: e.color || '#fca5a5',
        substances: ['H2SO4'],
        isAcid: true
      });
    });

    const unsubBurst = vfxBus.on('particle:burst', () => {
      if (Math.random() < 0.4) {
        flashIntensityRef.current = Math.max(flashIntensityRef.current, 1.5);
      }
    });

    const unsubSparks = vfxBus.on('sparks', (e) => {
      flashIntensityRef.current = Math.max(flashIntensityRef.current, 1.8);
      if (e.color) flashColorRef.current.set(e.color);
    });

    return () => {
      unsubExplosion();
      unsubBurst();
      unsubSparks();
    };
  }, [addSpill]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // 1. Sync active kinetics with dedicated ReactionSimulationEngine controllers
    for (const [vesselId, kinetics] of Object.entries(activeKinetics)) {
      if (kinetics && kinetics.reactionId) {
        let runtime = reactionSimulationEngine.getRuntime(vesselId);
        if (!runtime || runtime.reactionId !== kinetics.reactionId) {
          runtime = reactionSimulationEngine.startReaction(vesselId, kinetics.reactionId, {
            duration: kinetics.duration || 5.0,
            progress: kinetics.progress || 0.0,
            targetColor: kinetics.targetLiquidColor,
            temperature: kinetics.targetTemp || vessels[vesselId]?.temperature_c || 25,
          });
        }
        if (runtime) {
          runtime.progress = kinetics.progress;
          runtime.elapsed = kinetics.progress * runtime.duration;
        }
      }
    }

    // 2. Step fixed-timestep reaction simulation engine
    reactionSimulationEngine.update(dt, 1.0);

    // 2b. Sync active ReactionProgram timelines with ProgramPlayer
    const ledgerViews: Record<string, LedgerView> = {};
    for (const [vesselId, kinetics] of Object.entries(activeKinetics)) {
      if (kinetics && kinetics.program) {
        let session = programPlayer.getSession(vesselId);
        if (!session || session.program.id !== kinetics.program.id) {
          const v = vessels[vesselId];
          session = programPlayer.startProgram(vesselId, kinetics.program, {
            position: v ? v.position : [0, 0, 0],
            dimensions: {
              radius: 0.045,
              height: 0.12,
              liquidY: v ? 0.02 + 0.08 * (v.volume || 0.5) : 0.05,
              mouthY: 0.12
            }
          });
        }
        const v = vessels[vesselId];
        ledgerViews[vesselId] = {
          time_s: session ? session.elapsed_s : 0,
          temperature_c: v?.temperature_c || 25,
          pressure_atm: 1.0,
          pH: v?.ph || 7.0,
          turbidity: v?.turbidity || 0,
          liquidColor: v?.liquidColor || '#38bdf8',
          gasHoldup: v?.hasGas ? 0.2 : 0,
          foam_ml: v?.foam_ml || 0,
          speciesAmounts: {},
          speciesRates: {},
          heatRate_W: 0
        };
      }
    }
    for (const session of programPlayer.getAllSessions()) {
      if (!activeKinetics[session.vesselId]) {
        programPlayer.stopProgram(session.vesselId);
      }
    }
    const patches = programPlayer.update(dt, ledgerViews);
    const storeVessels = useAppStore.getState().vessels;
    for (const [vesselId, patch] of Object.entries(patches)) {
      const v = storeVessels[vesselId];
      if (!v) continue;
      if (patch.turbidity !== undefined) v.turbidity = patch.turbidity;
      if (patch.liquidColor !== undefined) v.liquidColor = patch.liquidColor;
      if (patch.liquidOpacity !== undefined) v.liquidOpacity = patch.liquidOpacity;
      if (patch.foam_ml !== undefined) v.foam_ml = patch.foam_ml;
      if (patch.temperature_c !== undefined) v.temperature_c = patch.temperature_c;
      if (patch.residues !== undefined) v.residues = patch.residues;
    }

    // 3. Decay flash flare without React state dispatch
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
          mesh.position.set(sw.x, -1.155, sw.z);
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

      {/* Global Ballistic Acid Splatter System with Visible Trajectory Arcs & Workbench Landings */}
      <AcidSplatter />

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
        // If vessel is shattered, completely suppress all ongoing and active reaction effects
        if (vessel.isShattered) {
          return null;
        }

        const kinetics = activeKinetics[vesselId];
        const hasLiquid = (vessel.volume_ml ?? 0) > 0.5;
        const isHotOrActive = (hasLiquid && vessel.isBoiling) || (hasLiquid && vessel.hasGas) || (hasLiquid && vessel.hasPrecipitate) || vessel.isExplosion || (hasLiquid && vessel.temperature_c >= 48);
        const rawRecipe: ReactionVfxRecipe | null = kinetics?.reactionId 
          ? getReactionVfxRecipe(kinetics.reactionId)
          : (kinetics ? getGenericVfxRecipe(null, vessel) : (isHotOrActive ? getGenericVfxRecipe(null, vessel) : null));

        if (!rawRecipe && !isHotOrActive) {
          return null;
        }

        const activeRecipe = rawRecipe || getGenericVfxRecipe(null, vessel);
        const progress = kinetics ? kinetics.progress : 1.0;
        const sampled = sampleRecipeProgress(activeRecipe, progress);
        const simRuntime = reactionSimulationEngine.getRuntime(vesselId);

        const pos = vessel.position;
        const volumeFrac = Math.max(0.1, Math.min(1.0, (vessel.volume_ml || 0) / (vessel.capacity_ml || 100)));
        const liquidTopY = pos[1] - 0.9 + volumeFrac * 1.5;
        const mouthY = pos[1] + (vessel.type === 'cylinder' ? 1.7 : vessel.type === 'flask' ? 1.45 : 1.0);
        const vesselRadius = vessel.type === 'test_tube' ? 0.18 : 0.6;

        const effectiveBubbleRate = hasLiquid ? (simRuntime && simRuntime.gasGenerationRate > 0
          ? simRuntime.gasGenerationRate * 45
          : (sampled.bubblesRate > 0 ? sampled.bubblesRate : (activeRecipe.bubbles?.rate || 0))) : 0;

        const effectiveGasDensity = hasLiquid ? (simRuntime && simRuntime.gasGenerationRate > 0
          ? Math.min(1.0, simRuntime.gasGenerationRate * 0.75)
          : (sampled.gasDensity > 0 ? sampled.gasDensity : (activeRecipe.gasPlume ? 0.5 : 0))) : 0;

        const effectiveGasColor = (simRuntime?.customData?.gasColor as string)
          || sampled.gasColor
          || activeRecipe.gasPlume?.color
          || '#ffffff';

        const effectivePrecipitate = hasLiquid && ((simRuntime && (simRuntime.precipitateRate > 0 || simRuntime.turbidity > 0.05))
          || sampled.precipitateActive
          || !!activeRecipe.precipitate);

        const effectiveFoamRate = hasLiquid ? (sampled.foamRate > 0 ? sampled.foamRate : (activeRecipe.foam?.active ? 20 : 0)) : 0;
        const effectiveSteamActive = hasLiquid && (sampled.steamDensity > 0 || !!activeRecipe.steam?.active || vessel.isBoiling || (vessel.temperature_c ?? 25) >= 48);
        const effectiveGasSpecies = (simRuntime?.customData?.gasSpecies as string) || activeRecipe.bubbles?.gasType || 'gas';

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
              reactionPrecipitateSubstance={vessel.precipitateSubstance || sampled.precipitateSubstance || activeRecipe.precipitate?.substance}
            />

            {/* Gas-Specific Effervescence Bubbles with Worthington Micro-Jets & Minnaert Pops */}
            {effectiveBubbleRate > 0 && (
              <Bubbles
                vesselId={vesselId}
                rate={Math.min(60, effectiveBubbleRate * 0.7)}
                liquidBottomY={-0.85}
                surfaceY={liquidTopY - pos[1]}
                radius={vesselRadius * 0.78}
                gasType={effectiveGasSpecies}
                color={sampled.bubblesColor || activeRecipe.bubbles?.color || '#e0f2fe'}
                active={true}
              />
            )}

            {/* Thermal Steam & Exothermic Water Vapor Plume */}
            {effectiveSteamActive && (
              <Steam
                vesselId={vesselId}
                origin={[0, 0, 0]}
                surfaceY={liquidTopY - pos[1]}
                radius={vesselRadius * 0.75}
                temperature_c={Math.max(vessel.temperature_c || 25, sampled.steamDensity > 0 ? 78 : 25)}
                active={true}
              />
            )}

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

            {/* Declarative Sparks & Energetic Micro-Flashes */}
            {(activeRecipe.sparks?.active || !!simRuntime?.customData?.hasSparks) && (
              <Sparks
                origin={[0, liquidTopY - pos[1], 0]}
                rate={activeRecipe.sparks?.rate || 30}
                burstCount={activeRecipe.sparks?.burstCount || 15}
                color={activeRecipe.sparks?.color || (simRuntime?.customData?.sparkColor as string) || '#f59e0b'}
                active={true}
              />
            )}

            {/* 6. Foam */}
            {((vessel.foam_ml && vessel.foam_ml > 0.05) || effectiveFoamRate > 0) && (
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
