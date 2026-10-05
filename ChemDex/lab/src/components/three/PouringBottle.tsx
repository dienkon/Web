import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical, getSolidMorphology, SolidMorphology } from '../../store/useAppStore';
import { labSound } from '../../utils/audio';
import { useQualityStore } from '../../vfx/quality';
import { getGlassMaterials, createVesselLatheGeometry } from '../../vfx/materials/glass';

// Helper to determine vessel rim height and mouth radius based on glassware geometry
function getVesselMouthMetrics(type: string = 'beaker') {
  switch (type) {
    case 'cylinder':
      return { offset: 1.7, radius: 0.35 };
    case 'flask':
      return { offset: 1.5, radius: 0.42 };
    case 'test_tube':
      return { offset: 1.2, radius: 0.22 };
    case 'beaker':
    default:
      return { offset: 1.0, radius: 0.95 };
  }
}

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
  chemical, 
  targetId, 
  amount = 20,
  onComplete 
}: { 
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
  const startTime = useRef(Date.now());
  const soundPlayedRef = useRef(false);
  const lastDropIndexRef = useRef(-1);

  // Target vessel properties
  const targetVessel = useAppStore(state => state.vessels[targetId]);
  const targetX = targetVessel ? targetVessel.position[0] : 0;
  const targetY = targetVessel ? targetVessel.position[1] : -0.135;
  const targetZ = targetVessel ? targetVessel.position[2] : 0;

  const targetType = targetVessel?.type || 'beaker';
  const metrics = getVesselMouthMetrics(targetType);
  const mouthY = targetY + metrics.offset;
  const mouthRadius = metrics.radius;

  // Solid chunks falling simulation data (28 discrete chunks)
  const solidChunkCount = 28;
  const solidChunksData = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const spreadR = Math.sqrt((i + 1) / 28) * (mouthRadius * 0.42);
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
  }, [mouthRadius]);

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    const time = state.clock.getElapsedTime();

    // Calculate current liquid surface elevation inside recipient vessel
    const currentVol = targetVessel ? targetVessel.volume_ml : 0;
    const capacity = targetVessel ? targetVessel.capacity_ml : 100;
    const volumeRatio = Math.max(0.06, Math.min(0.94, currentVol / capacity));
    const liquidSurfaceY = targetY - 0.92 + volumeRatio * (metrics.offset + 0.8);

    // ============================================================
    // 1. SOLID REAGENT DISPENSING (Micro-spatula powder addition)
    // ============================================================
    // ============================================================
    // 1. SOLID REAGENT DISPENSING (Micro-spatula chunk cascade)
    // ============================================================
    if (type === 'solid') {
      if (!groupRef.current) return;

      const hasWater = targetVessel && (targetVessel.volume_ml > 0.05) && targetVessel.substances.some(s => getChemical(s)?.type !== 'solid');
      const bottomY = targetY - 0.95;
      const actualSurfaceY = hasWater ? liquidSurfaceY : bottomY;

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
      } else if (elapsed < 1.4) {
        if (!soundPlayedRef.current) {
          soundPlayedRef.current = true;
          if (morphology === 'GRANULES' || morphology === 'CHIPS') {
            if (hasWater) {
              labSound.playDroplet();
            } else {
              labSound.playTap();
            }
          } else if (morphology === 'RIBBON' || morphology === 'TURNINGS' || morphology === 'FILINGS') {
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
        const t = (elapsed - 0.25) / 1.15;
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

          const g = 9.2; // gravity acceleration
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

            // Check water entry
            if (hasWater && currentChunkY <= actualSurfaceY) {
              const airTime = Math.sqrt(Math.max(0, 2 * (tipY - actualSurfaceY) / g));
              const waterTime = dtChunk - airTime;
              const sinkSpeed = 0.75; // slowed by water drag
              currentChunkY = actualSurfaceY - sinkSpeed * waterTime;

              if (waterTime > 0 && waterTime < 0.22) {
                anyWaterSplash = true;
                splashX = currentChunkX;
                splashZ = currentChunkZ;
              }
            }

            // Settle on bottom
            const targetFloorY = bottomY + c.size * 0.5 + c.pileY;
            if (currentChunkY <= targetFloorY) {
              currentChunkY = targetFloorY;
            }

            _scratchEuler.set(dtChunk * c.spinX, dtChunk * c.spinY, dtChunk * c.spinZ);
            _scratchQuat.setFromEuler(_scratchEuler);
            _scratchScale.set(c.size, c.size, c.size);
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
      } else if (elapsed < 1.7) {
        // Retract spatula and depart
        const t = THREE.MathUtils.smoothstep((elapsed - 1.4) / 0.3, 0, 1);
        groupRef.current.position.set(
          THREE.MathUtils.lerp(targetX + 0.45, targetX + 2.0, t),
          THREE.MathUtils.lerp(mouthY + 0.55, mouthY + 1.8, t),
          targetZ
        );
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0.55, 0, t);
        if (rippleRef.current) rippleRef.current.visible = false;
      } else {
        onComplete();
      }
      return;
    }

    // ============================================================
    // 2. INDICATOR DROPPER / PIPETTE DISPENSING
    // ============================================================
    if (isDropper) {
      if (!groupRef.current) return;

      if (elapsed < 0.6) {
        // Fly in centered vertically above vessel opening
        const t = THREE.MathUtils.smoothstep(elapsed / 0.6, 0, 1);
        groupRef.current.position.set(
          targetX,
          THREE.MathUtils.lerp(mouthY + 3.0, mouthY + 1.45, t),
          targetZ
        );
        if (dropRef.current) dropRef.current.visible = false;
        if (rippleRef.current) rippleRef.current.visible = false;
      } else if (elapsed < 2.4) {
        // Hover and rhythmic drop formation & detachment
        groupRef.current.position.set(targetX, mouthY + 1.45, targetZ);
        const dropIndex = Math.floor((elapsed - 0.6) / 0.6);
        const cycleProgress = ((elapsed - 0.6) % 0.6) / 0.6; // 3 drops over 1.8s
        const tipY = mouthY + 0.45;

        if (dropIndex !== lastDropIndexRef.current && cycleProgress > 0.45) {
          lastDropIndexRef.current = dropIndex;
          labSound.playDrop();
        }

        if (dropRef.current) {
          dropRef.current.visible = true;
          // Drop falls straight down from capillary tip to liquid surface
          const fallDistance = tipY - liquidSurfaceY;
          const currentDropY = tipY - Math.pow(cycleProgress, 1.8) * fallDistance;
          dropRef.current.position.set(targetX, currentDropY, targetZ);

          // Teardrop elongation
          const stretch = 1.0 + Math.sin(cycleProgress * Math.PI) * 0.8;
          dropRef.current.scale.set(0.04 / Math.sqrt(stretch), 0.04 * stretch, 0.04 / Math.sqrt(stretch));
        }

        // Concentric ripple on liquid surface upon impact
        if (rippleRef.current) {
          if (cycleProgress > 0.82) {
            const rippleFrac = (cycleProgress - 0.82) / 0.18;
            rippleRef.current.visible = true;
            rippleRef.current.position.set(targetX, liquidSurfaceY + 0.005, targetZ);
            const rScale = THREE.MathUtils.lerp(0.04, mouthRadius * 0.55, rippleFrac);
            rippleRef.current.scale.set(rScale, rScale, 1);
            const mat = rippleRef.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = (1 - rippleFrac) * 0.7;
          } else {
            rippleRef.current.visible = false;
          }
        }
      } else if (elapsed < 3.0) {
        // Ascend and exit
        const t = THREE.MathUtils.smoothstep((elapsed - 2.4) / 0.6, 0, 1);
        groupRef.current.position.set(
          targetX,
          THREE.MathUtils.lerp(mouthY + 1.45, mouthY + 3.2, t),
          targetZ
        );
        if (dropRef.current) dropRef.current.visible = false;
        if (rippleRef.current) rippleRef.current.visible = false;
      } else {
        onComplete();
      }
      return;
    }

    // ============================================================
    // 3. CHEMICAL REAGENT BOTTLE (Laminar Stream & Surface Ripple)
    // ============================================================
    if (!groupRef.current) return;

    if (elapsed < 0.65) {
      // Fly bottle from shelf to vessel rim
      const t = THREE.MathUtils.smoothstep(elapsed / 0.65, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(targetX + 2.4, targetX + 0.82, t),
        THREE.MathUtils.lerp(mouthY + 2.0, mouthY + 0.62, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.15, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
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

      // Spout tip in world coordinates
      const spoutX = targetX + 0.82 - Math.sin(tiltAngle) * 0.98;
      const spoutY = mouthY + 0.62 + Math.cos(tiltAngle) * 0.98;

      if (streamRef.current) {
        if (isStreaming) {
          streamRef.current.visible = true;
          // Connecting stream directly from spout to target vessel center
          const dx = targetX - spoutX;
          const dy = liquidSurfaceY - spoutY;
          const streamLength = Math.hypot(dx, dy);
          const midX = (spoutX + targetX) / 2;
          const midY = (spoutY + liquidSurfaceY) / 2;
          const streamAngle = Math.atan2(dx, -dy);

          // Subtle fluid wobble
          const wobble = Math.sin(time * 28) * 0.006;
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
          rippleRef.current.position.set(targetX, liquidSurfaceY + 0.005, targetZ);
          const rippleRadius = mouthRadius * (0.28 + Math.sin(time * 16) * 0.06);
          rippleRef.current.scale.set(rippleRadius, rippleRadius, 1);
        } else {
          rippleRef.current.visible = false;
        }
      }
    } else if (elapsed < 2.95) {
      // Right the bottle upright and depart
      const t = THREE.MathUtils.smoothstep((elapsed - 2.35) / 0.6, 0, 1);
      groupRef.current.position.set(
        THREE.MathUtils.lerp(targetX + 0.82, targetX + 2.5, t),
        THREE.MathUtils.lerp(mouthY + 0.62, mouthY + 2.2, t),
        targetZ
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(1.18, 0, t);
      if (streamRef.current) streamRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    } else {
      onComplete();
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
          {morphology === 'RIBBON' ? (
            <mesh position={[-0.2, 0.08, 0]} rotation={[0.4, 0.2, -0.6]}>
              <torusGeometry args={[0.16, 0.04, 6, 16, Math.PI * 1.5]} />
              <meshStandardMaterial color={color} roughness={0.18} metalness={0.96} />
            </mesh>
          ) : morphology === 'TURNINGS' ? (
            <mesh position={[-0.2, 0.08, 0]} rotation={[0.2, 0.5, -0.4]}>
              <torusGeometry args={[0.14, 0.035, 6, 16, Math.PI * 1.8]} />
              <meshStandardMaterial color="#ea580c" roughness={0.22} metalness={0.98} />
            </mesh>
          ) : morphology === 'FILINGS' ? (
            <mesh position={[-0.2, 0.06, 0]} scale={[1.1, 0.6, 0.9]}>
              <sphereGeometry args={[0.13, 12, 12]} />
              <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.92} />
            </mesh>
          ) : morphology === 'GRANULES' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <dodecahedronGeometry args={[0.14, 0]} />
              <meshStandardMaterial color={color} roughness={0.4} metalness={0.88} />
            </mesh>
          ) : morphology === 'CHIPS' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <dodecahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.82} metalness={0.02} />
            </mesh>
          ) : morphology === 'CUBIC_CRYSTAL' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
            </mesh>
          ) : morphology === 'PRISMATIC_CRYSTAL' ? (
            <mesh position={[-0.2, 0.06, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
              <meshStandardMaterial color="#581c87" roughness={0.12} metalness={0.65} />
            </mesh>
          ) : morphology === 'TABULAR_CRYSTAL' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <boxGeometry args={[0.22, 0.05, 0.18]} />
              <meshStandardMaterial color="#ea580c" roughness={0.18} metalness={0.35} />
            </mesh>
          ) : morphology === 'HYDRATE_CRYSTAL' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <octahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color={color} roughness={0.15} metalness={0.12} />
            </mesh>
          ) : morphology === 'LUSTROUS_PLATES' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <boxGeometry args={[0.22, 0.05, 0.16]} />
              <meshStandardMaterial color="#3b0764" roughness={0.18} metalness={0.75} />
            </mesh>
          ) : morphology === 'PELLET' ? (
            <mesh position={[-0.2, 0.06, 0]}>
              <boxGeometry args={[0.16, 0.14, 0.16]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.9} />
            </mesh>
          ) : (
            <mesh position={[-0.2, 0.06, 0]} scale={[1.2, 0.65, 0.95]}>
              <sphereGeometry args={[0.15, 16, 12]} />
              <meshStandardMaterial color={color} roughness={0.96} metalness={0.02} />
            </mesh>
          )}
        </group>

        {/* Dynamic Falling Solid Particles (InstancedMesh, matches morphology) */}
        <instancedMesh
          ref={solidInstancedRef}
          args={[undefined, undefined, solidChunkCount]}
          renderOrder={5}
          visible={false}
        >
          {morphology === 'RIBBON' ? (
            <torusGeometry args={[0.75, 0.16, 8, 20, Math.PI * 1.5]} />
          ) : morphology === 'TURNINGS' ? (
            <torusGeometry args={[0.70, 0.15, 8, 20, Math.PI * 1.8]} />
          ) : morphology === 'FILINGS' ? (
            <cylinderGeometry args={[0.07, 0.07, 1.0, 8]} />
          ) : morphology === 'GRANULES' ? (
            <dodecahedronGeometry args={[0.75, 0]} />
          ) : morphology === 'CHIPS' ? (
            <dodecahedronGeometry args={[0.85, 0]} />
          ) : morphology === 'CUBIC_CRYSTAL' ? (
            <boxGeometry args={[0.85, 0.85, 0.85]} />
          ) : morphology === 'PRISMATIC_CRYSTAL' ? (
            <cylinderGeometry args={[0.1, 0.1, 1.25, 6]} />
          ) : morphology === 'TABULAR_CRYSTAL' ? (
            <boxGeometry args={[0.85, 0.22, 1.1]} />
          ) : morphology === 'HYDRATE_CRYSTAL' ? (
            <octahedronGeometry args={[0.85, 0]} />
          ) : morphology === 'LUSTROUS_PLATES' ? (
            <boxGeometry args={[0.9, 0.25, 0.7]} />
          ) : (
            <dodecahedronGeometry args={[0.55, 0]} />
          )}
          <meshStandardMaterial
            color={
              morphology === 'TURNINGS' ? '#ea580c' : 
              (morphology === 'FILINGS' ? '#475569' : 
              (morphology === 'LUSTROUS_PLATES' ? '#3b0764' : 
              (morphology === 'PRISMATIC_CRYSTAL' ? '#581c87' : 
              (morphology === 'TABULAR_CRYSTAL' ? '#ea580c' : 
              (morphology === 'CHIPS' ? '#f1f5f9' : color)))))
            }
            roughness={
              morphology === 'RIBBON' ? 0.18 : 
              (morphology === 'TURNINGS' ? 0.22 : 
              (morphology === 'FILINGS' ? 0.35 : 
              (morphology === 'GRANULES' ? 0.40 : 
              (morphology === 'CHIPS' ? 0.82 :
              (morphology === 'LUSTROUS_PLATES' ? 0.18 : 
              (morphology === 'PRISMATIC_CRYSTAL' ? 0.12 : 
              (morphology === 'TABULAR_CRYSTAL' ? 0.18 : 
              (morphology === 'HYDRATE_CRYSTAL' ? 0.15 : 
              (morphology === 'CUBIC_CRYSTAL' ? 0.20 : 0.96)))))))))
            }
            metalness={
              morphology === 'RIBBON' ? 0.96 : 
              (morphology === 'TURNINGS' ? 0.98 : 
              (morphology === 'FILINGS' ? 0.92 : 
              (morphology === 'GRANULES' ? 0.88 : 
              (morphology === 'CHIPS' ? 0.02 :
              (morphology === 'LUSTROUS_PLATES' ? 0.75 : 
              (morphology === 'PRISMATIC_CRYSTAL' ? 0.65 : 
              (morphology === 'TABULAR_CRYSTAL' ? 0.35 : 
              (morphology === 'HYDRATE_CRYSTAL' ? 0.12 : 
              (morphology === 'CUBIC_CRYSTAL' ? 0.10 : 0.02)))))))))
            }
          />
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
            <meshStandardMaterial color={color} transparent opacity={0.88} roughness={0.12} depthWrite={false} />
          </mesh>
        </group>

        {/* Falling Indicator Drop (World space) */}
        <mesh ref={dropRef} visible={false}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshStandardMaterial color={color} transparent opacity={0.92} roughness={0.1} depthWrite={false} />
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
          <meshStandardMaterial color={color} transparent opacity={0.88} roughness={0.12} depthWrite={false} />
        </mesh>
        {/* Reagent Label */}
        <mesh position={[0, 0, 0.36]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.42, 0.28]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* World-space Laminar Flow Stream (Pinpoint Spout to Recipient Liquid Connection) */}
      <mesh ref={streamRef} visible={false}>
        <cylinderGeometry args={[0.042, 0.028, 1.0, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.88}
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

  const toMetrics = getVesselMouthMetrics(toType);
  const fromMetrics = getVesselMouthMetrics(fromType);

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
    const toVol = toVessel ? toVessel.volume_ml : 0;
    const toCap = toVessel ? toVessel.capacity_ml : 100;
    const toRatio = Math.max(0.06, Math.min(0.95, toVol / toCap));
    const toLiquidSurfaceY = targetY - 0.92 + toRatio * (toMetrics.offset + 0.8);

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
        {/* Inner and Outer Glassware Shells */}
        <mesh geometry={latheGeom.inner} material={glassMats.back} renderOrder={1} />
        <mesh geometry={latheGeom.outer} material={glassMats.front} renderOrder={6} castShadow receiveShadow />

        {/* Draining Liquid inside Source Vessel */}
        <mesh ref={liquidMeshRef} position={[0, -0.3, 0]} renderOrder={3}>
          <cylinderGeometry args={[fromMetrics.radius * 0.88, fromMetrics.radius * 0.88, 0.8, 20]} />
          <meshStandardMaterial
            color={liquidColor}
            transparent
            opacity={0.88}
            roughness={0.12}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* World-space Laminar Liquid Stream (Connecting Lip directly to Recipient Surface) */}
      <mesh ref={streamRef} visible={false}>
        <cylinderGeometry args={[0.048, 0.032, 1.0, 16]} />
        <meshStandardMaterial
          color={liquidColor}
          transparent
          opacity={0.88}
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
