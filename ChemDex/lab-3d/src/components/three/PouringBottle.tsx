import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical, getSolidMorphology, SolidMorphology } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { useQualityStore } from '../../vfx/quality';
import { getGlassMaterials, createVesselLatheGeometry } from '../../vfx/materials/glass';
import { vesselWorldLiquidSurfaceY, liquidGeometry } from '../../science/vesselGeometry';
import { fallingContactTime, dropSchedule, landedDropFraction, SCENE_GRAVITY, stockLiquidPacket, stockArrivedFraction, STOCK_RELEASE_START_S, STOCK_RELEASE_END_S } from '../../handling/doseTiming';
import { createStockSolidGeometry, stockSolidChunkCount } from './stockSolidGeometry';
import { stockSolidMaterial } from '../../science/stockAppearance';
import { solidSceneVolume } from '../../science/vesselDimensions';
import { liquidOpacity } from '../../science/liquidOptics';
import { getWorldVesselProfile } from '../../pour/physics/profiles';
import { vesselBodyTransform } from '../../science/vesselScale';
import { VesselBodyScale } from './VesselBodyScale';

// Reagent bottle glass material: highly transparent, specular clearcoat, non-occluding
const reagentBottleGlass = new THREE.MeshPhysicalMaterial({
  transparent: true,
  opacity: 0.28,
  roughness: 0.08,
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  depthWrite: false,
});

const _scratchMat4 = new THREE.Matrix4();
const _scratchPos = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3();
const _scratchEuler = new THREE.Euler();

/**
 * REAGENT DISPENSING ANIMATION (Chemical Bottle, Indicator Dropper, or Solid Spatula)
 */
export const AddingAnimation = React.memo(function AddingAnimation({ 
  doseId,
  chemical, 
  targetId, 
  amount = 20,
  onComplete 
}: { 
  doseId: number;
  chemical: string; 
  targetId: string; 
  amount?: number;
  onComplete: () => void; 
}) {
  const chemData = getChemical(chemical);
  const color = chemData.color || '#38bdf8';
  const type = chemData.type;
  const isDropper = chemData.category === 'indicator' || chemical === 'Phenolphthalein' || chemical === 'MethylOrange';
  const morphology: SolidMorphology = getSolidMorphology(chemical);

  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const dropRef = useRef<THREE.Mesh>(null);
  const solidInstancedRef = useRef<THREE.InstancedMesh>(null);
  const elapsedTime = useRef(0);
  const soundPlayedRef = useRef(false);
  const lastDropIndexRef = useRef(-1);
  const lastContactFraction = useRef(0);
  const deliveryRef = useRef<Promise<void>>(Promise.resolve());
  const completingRef = useRef(false);
  const stockStreamGeometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.03, 1, 12, 24, true), []);
  useEffect(() => () => stockStreamGeometry.dispose(), [stockStreamGeometry]);

  // Target vessel properties
  const targetVessel = useAppStore(state => state.vessels[targetId]);
  const targetX = targetVessel ? targetVessel.position[0] : 0;
  const targetY = targetVessel ? targetVessel.position[1] : -0.135;
  const targetZ = targetVessel ? targetVessel.position[2] : 0;

  const targetType = targetVessel?.type || 'beaker';
  const targetProfile = getWorldVesselProfile(targetType, targetVessel?.capacity_ml);
  const body = targetVessel ? vesselBodyTransform(targetVessel) : { scale: 1, offsetY: 0 };
  const mouthY = targetY + targetProfile.lipLocal[1];
  const mouthRadius = targetProfile.mouthR;
  const initialSurface = useRef(targetVessel ? vesselWorldLiquidSurfaceY(targetVessel) : liquidGeometry(targetType).floorY);
  const payloadRef = useRef<THREE.Group>(null);
  const payloadMeshRef = useRef<THREE.InstancedMesh>(null);
  const solidGeometry = useMemo(() => type === 'solid' ? createStockSolidGeometry(morphology, chemical) : null,
    [type, morphology, chemical]);
  useEffect(() => () => solidGeometry?.dispose(), [solidGeometry]);
  const solidMaterial = stockSolidMaterial(chemData, morphology);

  // Solid chunks falling simulation data (28 discrete chunks)
  const solidChunkCount = stockSolidChunkCount(morphology);
  const solidChunkScale = targetVessel && chemData.density ? Math.cbrt(solidSceneVolume(targetVessel,
    amount / chemData.density) / solidChunkCount) * body.scale : 0;
  const solidChunksData = useMemo(() => {
    return Array.from({ length: solidChunkCount }).map((_, i) => {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const spreadR = Math.sqrt((i + 1) / solidChunkCount) * (mouthRadius * 0.42);
      return {
        stagger: 0.22 + i * 0.038,
        offsetX: Math.cos(angle) * spreadR,
        offsetZ: Math.sin(angle) * spreadR,
        vx: (Math.random() - 0.5) * 0.06,
        vz: (Math.random() - 0.5) * 0.06,
        size: 0.09 + (i % 5) * 0.025,
        spinX: (Math.random() - 0.5) * 8.0,
        spinY: (Math.random() - 0.5) * 8.0,
        spinZ: (Math.random() - 0.5) * 8.0,
        pileY: ((i % 4) * 0.025),
      };
    });
  }, [mouthRadius, solidChunkCount]);

  useFrame((state, delta) => {
    const live = useAppStore.getState();
    if (completingRef.current) return;
    if (live.isSimulationPaused) return;
    elapsedTime.current += simulationFrameDt(delta, live);
    const elapsed = elapsedTime.current;
    const time = elapsed;
    if (!live.vessels[targetId] || live.vessels[targetId].isShattered) { onComplete(); return; }
    const deliver = (fraction: number) => {
      if (fraction <= lastContactFraction.current) return;
      lastContactFraction.current = fraction;
      deliveryRef.current = live.advancePourContact(doseId, fraction);
    };
    // A cloud/local resolver can finish after the last visual contact. Retain
    // the dose until its serialized writes have drained; a no-op contact must
    // not replace that pending promise with an already-resolved one.
    const complete = () => {
      if (lastContactFraction.current < 1) return;
      completingRef.current = true;
      void deliveryRef.current.then(onComplete);
    };

    // Calculate current liquid surface elevation inside recipient vessel
    const liquidSurfaceY = targetY + (targetVessel ? vesselWorldLiquidSurfaceY(targetVessel) : -0.96);

    // ============================================================
    // 1. SOLID REAGENT DISPENSING (Micro-spatula powder addition)
    // ============================================================
    // ============================================================
    // 1. SOLID REAGENT DISPENSING (Micro-spatula chunk cascade)
    // ============================================================
    if (type === 'solid') {
      if (!groupRef.current) return;

      const hasWater = targetVessel && (targetVessel.volume_ml > 0.05) && targetVessel.substances.some(s => getChemical(s)?.type !== 'solid');
      const bottomY = targetY + body.offsetY + body.scale * liquidGeometry(targetType).floorY;
      const actualSurfaceY = hasWater ? liquidSurfaceY : bottomY;
      const flightTime = fallingContactTime(mouthY + 0.55 - actualSurfaceY);
      const landedCount = solidChunksData.filter(chunk => elapsed >= chunk.stagger + flightTime).length;
      deliver(landedCount / solidChunkCount);
      if (payloadRef.current) payloadRef.current.visible = elapsed < solidChunksData[solidChunkCount - 1].stagger;
      if (payloadMeshRef.current) {
        for (let i = 0; i < solidChunkCount; i++) {
          _scratchPos.set(-0.2 + (i % 4 - 1.5) * 0.055, 0.06 + Math.floor(i / 12) * 0.03, (Math.floor(i / 4) % 3 - 1) * 0.035);
          _scratchEuler.set(0.4, 0.2, morphology === 'NAIL' ? Math.PI / 2 : -0.6);
          _scratchQuat.setFromEuler(_scratchEuler);
          _scratchScale.setScalar(elapsed < solidChunksData[i].stagger ? solidChunkScale : 0);
          _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
          payloadMeshRef.current.setMatrixAt(i, _scratchMat4);
        }
        payloadMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      const retractStart = Math.max(1.4, solidChunksData[solidChunkCount - 1].stagger + flightTime + 0.1);

      if (elapsed < 0.25) {
        // Approach vessel mouth from upper-right
        const t = THREE.MathUtils.smoothstep(elapsed / 0.25, 0, 1);
        groupRef.current.position.set(
          THREE.MathUtils.lerp(targetX + 1.8, targetX + 0.45, t),
          THREE.MathUtils.lerp(mouthY + 1.4, mouthY + 0.55, t),
          targetZ
        );
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.25, t);
        if (solidInstancedRef.current) solidInstancedRef.current.visible = false;
        if (rippleRef.current) rippleRef.current.visible = false;
      } else if (elapsed < retractStart) {
        if (!soundPlayedRef.current) {
          soundPlayedRef.current = true;
          if (morphology === 'GRANULES' || morphology === 'CHIPS') {
            if (hasWater) {
              labSound.playDroplet();
            } else {
              labSound.playTap();
            }
          } else if (['RIBBON', 'TURNINGS', 'FILINGS', 'NAIL', 'FOIL'].includes(morphology)) {
            labSound.playTap();
          } else if (morphology === 'PELLET') {
            if (hasWater && (chemical === 'Na' || chemical === 'K')) {
              labSound.playDroplet();
              labSound.playSodiumSizzlePop(0.35);
            } else {
              labSound.playTap();
            }
          } else {
            labSound.playPowder();
          }
        }

        // Tapping / vibrating spatula directly above vessel opening
        const t = (elapsed - 0.25) / Math.max(0.1, retractStart - 0.25);
        const tapVibe = Math.sin(time * 36) * 0.02;
        const pourTilt = THREE.MathUtils.lerp(0.25, 0.55, Math.min(1, t * 1.5));
        groupRef.current.position.set(targetX + 0.45, mouthY + 0.55, targetZ);
        groupRef.current.rotation.z = pourTilt + tapVibe;

        // Animate falling solid chunks/granules
        if (solidInstancedRef.current) {
          solidInstancedRef.current.visible = true;
          let anyWaterSplash = false;
          let splashX = targetX;
          let splashZ = targetZ;

          const g = SCENE_GRAVITY;
          const tipX = targetX + 0.15;
          const tipY = mouthY + 0.55;
          const tipZ = targetZ;

          for (let i = 0; i < solidChunkCount; i++) {
            const c = solidChunksData[i];
            const dtChunk = elapsed - c.stagger;

            if (dtChunk <= 0) {
              // Not yet fallen
              _scratchScale.set(0, 0, 0);
              _scratchPos.set(0, -9999, 0);
              _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
              solidInstancedRef.current.setMatrixAt(i, _scratchMat4);
              continue;
            }

            // Fall in air
            const airFallDist = 0.5 * g * dtChunk * dtChunk;
            let currentChunkY = tipY - airFallDist;
            let currentChunkX = tipX + c.offsetX + c.vx * dtChunk;
            let currentChunkZ = tipZ + c.offsetZ + c.vz * dtChunk;

            // A landed chunk now belongs to the finite vessel inventory;
            // hide its airborne proxy instead of drawing it twice.
            if (currentChunkY <= actualSurfaceY) {
              if (hasWater && dtChunk - flightTime < 0.15) {
                anyWaterSplash = true; splashX = currentChunkX; splashZ = currentChunkZ;
              }
              _scratchScale.set(0, 0, 0); _scratchPos.set(0, -9999, 0);
              _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
              solidInstancedRef.current.setMatrixAt(i, _scratchMat4);
              continue;
            }

            _scratchEuler.set(dtChunk * c.spinX, dtChunk * c.spinY, dtChunk * c.spinZ);
            _scratchQuat.setFromEuler(_scratchEuler);
            _scratchScale.setScalar(solidChunkScale);
            _scratchPos.set(currentChunkX, currentChunkY, currentChunkZ);
            _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
            solidInstancedRef.current.setMatrixAt(i, _scratchMat4);
          }
          solidInstancedRef.current.instanceMatrix.needsUpdate = true;

          // Water impact ripple
          if (rippleRef.current && hasWater) {
            if (anyWaterSplash) {
              rippleRef.current.visible = true;
              rippleRef.current.position.set(splashX, actualSurfaceY + 0.005, splashZ);
              const rPulse = mouthRadius * (0.15 + (Math.sin(time * 24) * 0.5 + 0.5) * 0.25);
              rippleRef.current.scale.set(rPulse, rPulse, 1);
              const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
              if (mat) mat.opacity = 0.85;
            } else {
              rippleRef.current.visible = false;
            }
          }
        }
      } else if (elapsed < retractStart + 0.3) {
        // Retract spatula and depart
        const t = THREE.MathUtils.smoothstep((elapsed - retractStart) / 0.3, 0, 1);
        groupRef.current.position.set(
          THREE.MathUtils.lerp(targetX + 0.45, targetX + 2.0, t),
          THREE.MathUtils.lerp(mouthY + 0.55, mouthY + 1.8, t),
          targetZ
        );
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0.55, 0, t);
        if (rippleRef.current) rippleRef.current.visible = false;
      } else {
        complete();
      }
      return;
    }

    // ============================================================
    // 2. INDICATOR DROPPER / PIPETTE DISPENSING
    // ============================================================
    if (isDropper) {
      if (!groupRef.current) return;

      const tipY = mouthY + 0.45;
      const fallHeight = tipY - (targetY + initialSurface.current);
      const schedule = dropSchedule(amount, fallHeight);
      const landedFraction = landedDropFraction(elapsed, amount, fallHeight);
      deliver(landedFraction);
      const exitStart = schedule.lastImpact + 0.25;
      if (elapsed < 0.6) {
        const t = THREE.MathUtils.smoothstep(elapsed / 0.6, 0, 1);
        groupRef.current.position.set(targetX, THREE.MathUtils.lerp(mouthY + 3, mouthY + 1.45, t), targetZ);
        if (dropRef.current) dropRef.current.visible = false;
      } else if (elapsed < exitStart) {
        groupRef.current.position.set(targetX, mouthY + 1.45, targetZ);
        const index = Math.min(schedule.count - 1, Math.max(0, Math.floor((elapsed - schedule.releaseStart) / schedule.period)));
        const fallTime = elapsed - schedule.releaseStart - index * schedule.period;
        const falling = fallTime >= 0 && fallTime < schedule.flightTime;
        if (index !== lastDropIndexRef.current && falling) {
          lastDropIndexRef.current = index; labSound.playDrop();
        }
        if (dropRef.current) {
          dropRef.current.visible = falling;
          dropRef.current.position.set(targetX, tipY - 0.5 * SCENE_GRAVITY * Math.max(0, fallTime) ** 2, targetZ);
          const stretch = 1 + Math.min(0.7, Math.max(0, fallTime));
          dropRef.current.scale.set(0.035 / Math.sqrt(stretch), 0.035 * stretch, 0.035 / Math.sqrt(stretch));
        }
        if (rippleRef.current) {
          const sinceImpact = fallTime - schedule.flightTime;
          rippleRef.current.visible = sinceImpact >= 0 && sinceImpact < 0.25 && (targetVessel?.volume_ml ?? 0) > 0;
          rippleRef.current.position.set(targetX, liquidSurfaceY + 0.005, targetZ);
          const f = Math.max(0, Math.min(1, sinceImpact / 0.25));
          rippleRef.current.scale.setScalar(0.04 + mouthRadius * f * 0.5);
          (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - f) * 0.5;
        }
      } else if (elapsed < exitStart + 0.6) {
        const t = THREE.MathUtils.smoothstep((elapsed - exitStart) / 0.6, 0, 1);
        groupRef.current.position.set(targetX, THREE.MathUtils.lerp(mouthY + 1.45, mouthY + 3.2, t), targetZ);
        if (dropRef.current) dropRef.current.visible = false;
        if (rippleRef.current) rippleRef.current.visible = false;
      } else complete();
      return;
    }

    // ============================================================
    // 3. CHEMICAL REAGENT BOTTLE (Laminar Stream & Surface Ripple)
    // ============================================================
    if (!groupRef.current) return;

    const fractionAtSurface = stockArrivedFraction(elapsed, mouthY, liquidSurfaceY);
    deliver(fractionAtSurface);
    const finishTime = Math.max(2.95, stockLiquidPacket(STOCK_RELEASE_END_S, mouthY, liquidSurfaceY).impactTime + 0.1);
    // Render only packets that have actually left the lip and have not landed.
    // The front advances toward the liquid; the final tail falls after righting.
    const youngest = Math.min(elapsed, STOCK_RELEASE_END_S);
    const oldest = STOCK_RELEASE_START_S + fractionAtSurface * (STOCK_RELEASE_END_S - STOCK_RELEASE_START_S);
    const visibleStream = youngest > oldest && elapsed > STOCK_RELEASE_START_S && fractionAtSurface < 1;
    if (streamRef.current) {
      streamRef.current.visible = visibleStream;
      streamRef.current.position.set(0, 0, 0); streamRef.current.rotation.set(0, 0, 0); streamRef.current.scale.setScalar(1);
      if (visibleStream) {
        const vertices = stockStreamGeometry.attributes.position;
        for (let ring = 0; ring <= 24; ring++) {
          const release = youngest + (oldest - youngest) * ring / 24;
          const packet = stockLiquidPacket(release, mouthY, liquidSurfaceY);
          const age = Math.max(0, Math.min(packet.flightTime, elapsed - release));
          const x = targetX + packet.x + packet.vx * age;
          const y = packet.y + packet.vy * age - 0.5 * SCENE_GRAVITY * age * age;
          const speedRatio = Math.hypot(packet.vx, packet.vy - SCENE_GRAVITY * age) / Math.hypot(packet.vx, packet.vy);
          const radius = Math.max(0.006, Math.min(0.06, 0.03 * Math.sqrt(amount / 20)) / Math.sqrt(speedRatio));
          for (let side = 0; side <= 12; side++) {
            const angle = side / 12 * Math.PI * 2;
            vertices.setXYZ(ring * 13 + side, x + Math.cos(angle) * radius, y, targetZ + Math.sin(angle) * radius);
          }
        }
        vertices.needsUpdate = true; stockStreamGeometry.computeVertexNormals();
      }
    }
    if (rippleRef.current) {
      rippleRef.current.visible = fractionAtSurface > 0 && fractionAtSurface < 1 && (targetVessel?.volume_ml ?? 0) > 0;
      rippleRef.current.position.set(targetX, liquidSurfaceY + 0.005, targetZ);
      rippleRef.current.scale.setScalar(mouthRadius * (0.22 + Math.sin(time * 16) * 0.04));
    }

    if (elapsed < 0.65) {
      // Fly bottle from shelf to vessel rim
      const t = THREE.MathUtils.smoothstep(elapsed / 0.65, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(targetX + 2.4, targetX + 0.82, t),
        THREE.MathUtils.lerp(mouthY + 2.0, mouthY + 0.62, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.15, t);
    } else if (elapsed < 2.35) {
      // Pouring Phase: Bottle tilts left towards beaker mouth
      const t = (elapsed - 0.65) / 1.7;
      const tiltAngle = THREE.MathUtils.smoothstep(Math.min(1, t * 2.2), 0, 1) * 1.18; // ~67° tilt
      groupRef.current.position.set(targetX + 0.82, mouthY + 0.62, targetZ);
      groupRef.current.rotation.z = tiltAngle;

      const isStreaming = t > 0.12 && t < 0.92;

      if (isStreaming && !soundPlayedRef.current) {
        soundPlayedRef.current = true;
        labSound.playPour(1.4);
      }

    } else if (elapsed < finishTime) {
      // Right the bottle upright and depart
      const t = THREE.MathUtils.smoothstep((elapsed - 2.35) / 0.6, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(targetX + 0.82, targetX + 2.5, t),
        THREE.MathUtils.lerp(mouthY + 0.62, mouthY + 2.2, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(1.18, 0, t);
    } else {
      complete();
    }
  });

  // Solid spatula mode
  if (type === 'solid') {
    return (
      <group>
        <group ref={groupRef}>
          {/* Laboratory Spatula Handle & Blade */}
          <mesh position={[0.4, 0.2, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
            <boxGeometry args={[1.5, 0.035, 0.16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Blade scoop with solid reagent resting on it matching authentic morphology */}
          <group ref={payloadRef}>
          <instancedMesh ref={payloadMeshRef} args={[solidGeometry!, undefined, solidChunkCount]}>
            <meshStandardMaterial color={solidMaterial.color} roughness={solidMaterial.roughness} metalness={solidMaterial.metalness} />
          </instancedMesh>
          </group>
        </group>

        {/* Dynamic Falling Solid Particles (InstancedMesh, matches morphology) */}
        <instancedMesh
          ref={solidInstancedRef}
          args={[undefined, undefined, solidChunkCount]}
          renderOrder={5}
          visible={false}
        >
          <primitive object={solidGeometry!} attach="geometry" />
          <meshStandardMaterial color={solidMaterial.color} roughness={solidMaterial.roughness} metalness={solidMaterial.metalness} />
        </instancedMesh>

        {/* Dynamic Concentric Water Surface Ripple on Impact */}
        <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={4}>
          <ringGeometry args={[0.04, 0.25, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  // Dropper / Pipette mode
  if (isDropper) {
    return (
      <group>
        <group ref={groupRef}>
          {/* Rubber Bulb */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#dc2626" roughness={0.45} />
          </mesh>
          {/* Glass Pipette Tube */}
          <mesh material={reagentBottleGlass} position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 1.5, 16]} />
          </mesh>
          {/* Tapered Capillary Tip */}
          <mesh material={reagentBottleGlass} position={[0, -0.75, 0]}>
            <cylinderGeometry args={[0.045, 0.015, 0.25, 16]} />
          </mesh>
          {/* Chemical Indicator inside Pipette Column */}
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.9, 16]} />
            <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0)} roughness={0.12} depthWrite={false} />
          </mesh>
        </group>

        {/* Falling Indicator Drop (World space) */}
        <mesh ref={dropRef} visible={false}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0, true)} roughness={0.1} depthWrite={false} />
        </mesh>

        {/* Concentric Impact Ripple Ring on Liquid Surface */}
        <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.7, 1.0, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  // Liquid reagent bottle mode
  return (
    <group>
      {/* Reagent Bottle Assembly */}
      <group ref={groupRef}>
        {/* Glass Bottle Body */}
        <mesh material={reagentBottleGlass} castShadow>
          <cylinderGeometry args={[0.34, 0.38, 1.15, 24]} />
        </mesh>
        {/* Bottle Neck */}
        <mesh material={reagentBottleGlass} position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.12, 0.28, 0.38, 24]} />
        </mesh>
        {/* Spout Rim */}
        <mesh material={reagentBottleGlass} position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.11, 0.022, 8, 24]} />
        </mesh>
        {/* Chemical Liquid Inside Reagent Bottle */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.31, 0.35, 0.85, 24]} />
          <meshStandardMaterial color={color} transparent opacity={liquidOpacity(color, 0)} roughness={0.12} depthWrite={false} />
        </mesh>
        {/* Reagent Label */}
        <mesh position={[0, 0, 0.36]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.42, 0.28]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* World-space Laminar Flow Stream (Pinpoint Spout to Recipient Liquid Connection) */}
      <mesh ref={streamRef} geometry={stockStreamGeometry} frustumCulled={false} visible={false} dispose={null}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={liquidOpacity(color, 0, true)}
          roughness={0.08}
          metalness={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Impact Ripple Ring on Recipient Liquid Surface */}
      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

/**
 * INTER-VESSEL POURING ANIMATION (Pouring from Vessel A directly into Vessel B)
 */
export const VesselPourAnimation = React.memo(function VesselPourAnimation({
  fromId,
  toId,
  onComplete
}: {
  fromId: string;
  toId: string;
  onComplete: () => void;
}) {
  const fromVessel = useAppStore(state => state.vessels[fromId]);
  const toVessel = useAppStore(state => state.vessels[toId]);

  const groupRef = useRef<THREE.Group>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const liquidMeshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());

  const effectiveTier = useQualityStore(state => state.effectiveTier);
  const glassMats = useMemo(() => getGlassMaterials(effectiveTier), [effectiveTier]);

  const fromType = fromVessel?.type || 'beaker';
  const toType = toVessel?.type || 'beaker';
  const validFromType = (fromType === 'burette' ? 'cylinder' : fromType) as 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  const latheGeom = useMemo(() => createVesselLatheGeometry(validFromType, 32), [validFromType]);

  const toProfile = getWorldVesselProfile(toType, toVessel?.capacity_ml);
  const fromProfile = getWorldVesselProfile(fromType, fromVessel?.capacity_ml);
  const toMetrics = { offset: toProfile.lipLocal[1], radius: toProfile.mouthR };
  const fromMetrics = { offset: fromProfile.lipLocal[1], radius: fromProfile.mouthR };

  if (!fromVessel || !toVessel) return null;

  const targetX = toVessel.position[0];
  const targetY = toVessel.position[1];
  const targetZ = toVessel.position[2];
  const liquidColor = fromVessel.liquidColor || '#38bdf8';

  const toMouthY = targetY + toMetrics.offset;
  const toMouthRadius = toMetrics.radius;

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const time = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    // Target liquid surface elevation
    const toLiquidSurfaceY = targetY + vesselWorldLiquidSurfaceY(toVessel);

    // Initial position on table
    const startX = fromVessel.position[0];
    const startY = fromVessel.position[1];
    const startZ = fromVessel.position[2];

    // Pour hover coordinates (resting spout lip over recipient mouth rim)
    const pourX = targetX - toMouthRadius * 0.7 - fromMetrics.radius * 0.5;
    const pourY = toMouthY + 0.45;

    if (elapsed < 0.65) {
      // Step 1: Smoothly lift source vessel from workbench to recipient rim
      const t = THREE.MathUtils.smoothstep(elapsed / 0.65, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(startX, pourX, t),
        THREE.MathUtils.lerp(startY, pourY, t),
        THREE.MathUtils.lerp(startZ, targetZ, t)
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(0, -0.15, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    } else if (elapsed < 2.3) {
      // Step 2: Pouring Phase (tilt steepness, laminar stream straight down)
      const t = (elapsed - 0.65) / 1.65;
      const pourAngle = THREE.MathUtils.smoothstep(Math.min(1, t * 1.8), 0, 1) * 1.25; // ~72° tilt
      groupRef.current.position.set(pourX, pourY, targetZ);
      groupRef.current.rotation.z = -pourAngle;

      const isStreaming = t > 0.08 && t < 0.94;

      // Lip position in world space
      const lipX = targetX - toMouthRadius * 0.35;
      const lipY = toMouthY + 0.22;

      if (streamRef.current) {
        if (isStreaming) {
          streamRef.current.visible = true;
          const dx = targetX - lipX;
          const dy = toLiquidSurfaceY - lipY;
          const streamLength = Math.hypot(dx, dy);
          const midX = (lipX + targetX) / 2;
          const midY = (lipY + toLiquidSurfaceY) / 2;
          const streamAngle = Math.atan2(dx, -dy);

          const wobble = Math.sin(time * 26) * 0.006;
          streamRef.current.position.set(midX, midY, targetZ);
          streamRef.current.rotation.z = streamAngle;
          streamRef.current.scale.set(1 + wobble, streamLength, 1 + wobble);
        } else {
          streamRef.current.visible = false;
        }
      }

      if (rippleRef.current) {
        if (isStreaming) {
          rippleRef.current.visible = true;
          rippleRef.current.position.set(targetX, toLiquidSurfaceY + 0.005, targetZ);
          const rippleRadius = toMouthRadius * (0.35 + Math.sin(time * 16) * 0.08);
          rippleRef.current.scale.set(rippleRadius, rippleRadius, 1);
        } else {
          rippleRef.current.visible = false;
        }
      }

      // Visually drain liquid from pouring container
      if (liquidMeshRef.current) {
        const drain = Math.max(0.04, (1 - t) * 0.9);
        liquidMeshRef.current.scale.set(drain, drain, drain);
      }
    } else if (elapsed < 2.9) {
      // Step 3: Un-tilt and settle gracefully onto workbench adjacent to recipient
      const t = THREE.MathUtils.smoothstep((elapsed - 2.3) / 0.6, 0, 1);
      const settleX = targetX - toMouthRadius - fromMetrics.radius - 0.5;
      groupRef.current.position.set(
        THREE.MathUtils.lerp(pourX, settleX, t),
        THREE.MathUtils.lerp(pourY, -0.135, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(-1.25, 0, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    } else {
      // Step 4: Pouring is complete -> fire reaction & volume transfer
      onComplete();
    }
  });

  return (
    <group>
      {/* Animated Pouring Source Vessel with Authentic Lathe Geometry */}
      <group ref={groupRef} position={fromVessel.position}>
        <VesselBodyScale vessel={fromVessel}>
        {/* Inner and Outer Glassware Shells */}
        <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
        <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

        {/* Draining Liquid inside Source Vessel */}
        <mesh ref={liquidMeshRef} position={[0, -0.3, 0]} renderOrder={3}>
          <cylinderGeometry args={[fromMetrics.radius / vesselBodyTransform(fromVessel).scale * 0.88, fromMetrics.radius / vesselBodyTransform(fromVessel).scale * 0.88, 0.8, 20]} />
          <meshStandardMaterial
            color={liquidColor}
            transparent
            opacity={liquidOpacity(liquidColor, fromVessel.turbidity ?? 0)}
            roughness={0.12}
            depthWrite={false}
          />
        </mesh>
        </VesselBodyScale>
      </group>

      {/* World-space Laminar Liquid Stream (Connecting Lip directly to Recipient Surface) */}
      <mesh ref={streamRef} visible={false}>
        <cylinderGeometry args={[0.048, 0.032, 1.0, 16]} />
        <meshStandardMaterial
          color={liquidColor}
          transparent
          opacity={liquidOpacity(liquidColor, fromVessel.turbidity ?? 0, true)}
          roughness={0.08}
          metalness={0.04}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Impact Ripple Ring on Recipient Surface */}
      <mesh ref={rippleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial color={liquidColor} transparent opacity={0.65} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});
