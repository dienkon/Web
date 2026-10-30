import { simulationFrameDt } from '../core/clock';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { isSodiumWaterReaction, sodiumMetalMass } from '../science/sodiumWater';
import { sodiumWaterGasMolesPerSecond } from '../engine/sodiumWaterPlan';
import { vesselLiquidSurfaceY, vesselWorldLiquidSurfaceY } from '../science/vesselGeometry';
import { getVesselProfile, getWorldVesselProfile } from '../pour/physics/profiles';
import { VesselEffectsFrame } from '../simulation/render/VesselEffectsFrame';
import { vfxBus } from './bus';
import { getReactionVfxRecipe, sampleRecipeProgress, ReactionVfxRecipe } from './recipes/reactionVfx';
import { getGenericVfxRecipe } from './recipes/generic';
import { GasClouds, Sparks, Foam, Splash, AcidSplatter } from './particles';
import { PhysicalSimulationRenderer } from '../simulation/render/PhysicalSimulationRenderer';
import { labSound } from '../utils/audio';
import { reactionSimulationEngine } from './reactions/ReactionSimulationEngine';
import { programPlayer } from './programs/player/ProgramPlayer';
import { LedgerView } from './catalog/types';
import { resolveReactionEmission, reactionIsEmitting } from './reactionActivity';
import { buildProgramLedgerView, programAppearanceChanges } from './programs/player/authoritativeView';
import { metalAcidProgressRate, metalAcidMaximumExtent } from '../engine/metalAcidPlan';
import { waterVisualState } from './waterVisualState';
import { SimulationEngine } from '../simulation/core/SimulationEngine';
import { gasVisualState } from './gasVisualState';

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
  const startedRuns = useRef(new Map<string, string>());
  const liveVesselIds = Object.keys(vessels).join('\u0000');
  useEffect(() => {
    SimulationEngine.pruneManagers(new Set(Object.keys(useAppStore.getState().vessels)));
  }, [liveVesselIds]);

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

      // The source requests any liquid glyphs through acid:splatter separately.
      // A flash alone must not synthesize a sulfuric-acid burst.
    });

    const unsubSparks = vfxBus.on('sparks', (e) => {
      flashIntensityRef.current = Math.max(flashIntensityRef.current, 1.8);
      if (e.color) flashColorRef.current.set(e.color);
    });

    return () => {
      unsubExplosion();
      unsubSparks();
    };
  }, [addSpill]);

  useFrame((_, delta) => {
    const live = useAppStore.getState();
    const activeKinetics = live.activeKinetics;
    const vessels = live.vessels;
    const dt = simulationFrameDt(delta, live);
    if (!Number.isFinite(dt) || dt <= 0) return;
    reactionSimulationEngine.retainVessels(new Set(Object.entries(activeKinetics)
      .filter(([, kinetics]) => reactionIsEmitting(kinetics)).map(([id]) => id)));
    for (const id of startedRuns.current.keys()) {
      if (!reactionIsEmitting(activeKinetics[id])) startedRuns.current.delete(id);
    }

    // 1. Sync active kinetics with dedicated ReactionSimulationEngine controllers
    for (const [vesselId, kinetics] of Object.entries(activeKinetics)) {
      if (reactionIsEmitting(kinetics) && kinetics.reactionId) {
        let runtime = reactionSimulationEngine.getRuntime(vesselId);
        const runKey = `${kinetics.reactionId}:${kinetics.startTime}`;
        if (startedRuns.current.get(vesselId) !== runKey) {
          startedRuns.current.set(vesselId, runKey);
          runtime = reactionSimulationEngine.startReaction(vesselId, kinetics.reactionId, {
            duration: kinetics.duration || 5.0,
            progress: kinetics.progress || 0.0,
            targetColor: kinetics.targetLiquidColor,
            temperature: vessels[vesselId]?.temperature_c ?? 25,
          });
        }
        if (runtime) {
          runtime.chemistryProgress = kinetics.progress;
          runtime.progress = kinetics.progress;
          runtime.elapsed = kinetics.progress * runtime.duration;
          if (kinetics.rateModel === 'metal_hcl' && vessels[vesselId]) {
            runtime.customData.chemistryProgress = kinetics.progress;
            runtime.customData.chemistryRate = metalAcidProgressRate(kinetics, vessels[vesselId], live.stirringVesselId === vesselId);
            runtime.customData.gasMolesPerSecond = runtime.customData.chemistryRate * metalAcidMaximumExtent(kinetics);
          }
          if (isSodiumWaterReaction(kinetics.reactionId)) {
            const vessel = vessels[vesselId];
            runtime.customData.chemistryProgress = kinetics.progress;
            runtime.customData.gasMolesPerSecond = sodiumWaterGasMolesPerSecond(kinetics);
            if (kinetics.initialVesselBaseline) runtime.customData.initialMass_g = sodiumMetalMass(kinetics.initialVesselBaseline);

          }
        }
      }
    }

    // 2. Step fixed-timestep reaction simulation engine
    reactionSimulationEngine.update(dt, 1.0);

    // 2b. Sync active ReactionProgram timelines with ProgramPlayer
    const ledgerViews: Record<string, LedgerView> = {};
    for (const [vesselId, kinetics] of Object.entries(activeKinetics)) {
      if (reactionIsEmitting(kinetics) && kinetics.program) {
        const runKey = `${kinetics.reactionId}:${kinetics.startTime}`;
        const v = vessels[vesselId];
        programPlayer.ensureProgram(vesselId, kinetics.program, runKey, {
            position: v ? v.position : [0, 0, 0],
            dimensions: {
              radius: 0.045,
              height: 0.12,
              liquidY: v ? 0.02 + 0.08 * (v.volume || 0.5) : 0.05,
              mouthY: 0.12
            }
          });
        if (v) ledgerViews[vesselId] = buildProgramLedgerView(v, kinetics);
      }
    }
    for (const session of programPlayer.getAllSessions()) {
      if (!reactionIsEmitting(activeKinetics[session.vesselId])) {
        programPlayer.stopProgram(session.vesselId);
      }
    }
    const patches = programPlayer.update(dt, ledgerViews);
    const storeVessels = useAppStore.getState().vessels;
    let opticalVessels = storeVessels;
    for (const [vesselId, patch] of Object.entries(patches)) {
      const vessel = storeVessels[vesselId], program = activeKinetics[vesselId]?.program;
      if (!vessel || !program) continue;
      const appearance = programAppearanceChanges(vessel, patch, program);
      if (Object.keys(appearance).length) {
        if (opticalVessels === storeVessels) opticalVessels = { ...storeVessels };
        opticalVessels[vesselId] = { ...vessel, ...appearance };
      }
    }
    if (opticalVessels !== storeVessels) useAppStore.setState({ vessels: opticalVessels });

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
      <GasClouds />
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
        if (vesselId.startsWith('lesson_vessel_')) return null;
        // If vessel is shattered, completely suppress all ongoing and active reaction effects
        if (vessel.isShattered) {
          return null;
        }

        const kinetics = activeKinetics[vesselId];
        const emission = resolveReactionEmission(vessel, kinetics, useAppStore.getState().isSimulationPaused);
        const hasLiquid = (vessel.volume_ml ?? 0) > 0.5;
        const measuredGas = gasVisualState(vessel);
        const isHotOrActive = (hasLiquid && vessel.isBoiling) || (hasLiquid && vessel.hasGas)
          || (hasLiquid && vessel.hasPrecipitate) || vessel.isExplosion || waterVisualState(vessel).mistRate > 0;
        const rawRecipe: ReactionVfxRecipe | null = kinetics?.reactionId 
          ? getReactionVfxRecipe(kinetics.reactionId)
          : (kinetics ? getGenericVfxRecipe(null, vessel) : (isHotOrActive ? getGenericVfxRecipe(null, vessel) : null));

        const manager = SimulationEngine.findManager(vesselId), plume = manager?.evaporationSystem;
        const hasAirborneTail = !!plume && (plume.particles.length > 0 || plume.pendingSeconds > 1e-12)
          || (manager?.boilingSystem.bubbles.length ?? 0) > 0;
        if (!rawRecipe && !isHotOrActive && !hasAirborneTail && measuredGas.visible.length === 0 && measuredGas.bubbleRate === 0) {
          return null;
        }

        const activeRecipe = rawRecipe || getGenericVfxRecipe(null, vessel);
        const progress = kinetics ? kinetics.progress : 1.0;
        const sampled = sampleRecipeProgress(activeRecipe, progress);
        const simRuntime = reactionSimulationEngine.getRuntime(vesselId);

        const pos = vessel.position;
        const localProfile = getVesselProfile(vessel.type, vessel.capacity_ml);
        const worldProfile = getWorldVesselProfile(vessel.type, vessel.capacity_ml);
        const liquidTopY = pos[1] + vesselWorldLiquidSurfaceY(vessel);
        const mouthY = pos[1] + worldProfile.lipLocal[1];

        const effectiveBubbleRate = !isSodiumWaterReaction(kinetics?.reactionId) && hasLiquid ? measuredGas.bubbleRate : 0;

        const effectivePrecipitate = hasLiquid && emission.precipitating && ((simRuntime && (simRuntime.precipitateRate > 0 || simRuntime.turbidity > 0.05))
          || sampled.precipitateActive
          || !!activeRecipe.precipitate);

        const effectiveFoamRate = hasLiquid && emission.running ? (sampled.foamRate > 0 ? sampled.foamRate : (activeRecipe.foam?.active ? 20 : 0)) : 0;

        return (
          <group key={vesselId} position={pos}>
            {/* Core Realistic Chemical Simulation: Multi-stage Boiling, Stokes Precipitation, Sediment Bed, Clausius-Clapeyron Evaporation */}
            <VesselEffectsFrame vessel={vessel}><PhysicalSimulationRenderer
              vesselId={vesselId}
              baseY={localProfile.baseY}
              mouthY={localProfile.baseY + localProfile.H}
              radius={localProfile.r(vesselLiquidSurfaceY(vessel))}
              mouthRadius={localProfile.mouthR}
              color={sampled.bubblesColor || '#ffffff'}
              reactionGasRate={effectiveBubbleRate}
              reactionPrecipitateActive={effectivePrecipitate}
              reactionPrecipitateSubstance={vessel.precipitateSubstance || sampled.precipitateSubstance || activeRecipe.precipitate?.substance}
            /></VesselEffectsFrame>

            {/* 8-Morphology Precipitate Particle Cascades (PbI2 Golden Rain, AgCl Curd, Fe(OH)3 Floc, Cu(OH)2 Gel, etc.) */}
            {/* Finite-mass suspended solids are rendered once by PhysicalSimulationRenderer. */}

            {/* Gas-Specific Effervescence Bubbles with Worthington Micro-Jets & Minnaert Pops */}
            {/* Thermal and chemical bubbles share the physical renderer. */}

            {/* Water-vapor visuals are emitted once by the physical renderer,
                using the authoritative finite evaporation rate. */}

            {/* Colored exhaust belongs to the room, independently of this
                conditional reaction/source tree. */}

            {/* Declarative Sparks & Energetic Micro-Flashes */}
            {(emission.running && (activeRecipe.sparks?.active || !!simRuntime?.customData?.hasSparks)) && (
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
                radius={worldProfile.r(vesselWorldLiquidSurfaceY(vessel))}
                capacity_ml={vessel.capacity_ml}
                active={true}
              />
            )}

            {/* 7. Special Effect: Endothermic Frost */}
            {activeRecipe.specialEffect === 'frost' && vessel.temperature_c <= 0 && (
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
