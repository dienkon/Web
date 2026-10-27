import { simulationFrameDt } from '../../core/clock';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VesselState } from '../../types/chemistry';
import { vesselContours, vesselOuterDimensions } from '../../science/vesselContours';
import { contourRadius } from '../../science/vesselDimensions';
import { calculateOverflowProfile } from '../../science/overflowPhysics';
import { vfxBus } from '../../vfx/bus';
import { labSound } from '../../utils/audio';
import { useAppStore } from '../../store/useAppStore';
import { LAB_PHYSICS } from '../../engine/interactionEngine';

interface VesselWallOverflowProps {
  vessel: VesselState;
}

interface ActiveOverflow {
  vesselId: string;
  startTime: number;
  duration_ms: number;
  volume_ml: number;
  color: string;
  angle: number;
}

const STREAMS_COUNT = 6;
const SLICES_PER_STREAM = 22;
const TOTAL_VERTICES = STREAMS_COUNT * (SLICES_PER_STREAM + 1) * 2;
const TOTAL_INDICES = STREAMS_COUNT * SLICES_PER_STREAM * 6;
const DROPLET_COUNT = 12;
const FALLING_DRIPS_COUNT = 8;
const SPLASH_RINGS_COUNT = 6;

export const VesselWallOverflow = React.memo(function VesselWallOverflow({ vessel }: VesselWallOverflowProps) {
  const groupRef = useRef<THREE.Group>(null);
  const streamsMeshRef = useRef<THREE.Mesh>(null);
  const crestMeshRef = useRef<THREE.Mesh>(null);
  const dropletsGroupRef = useRef<THREE.Group>(null);
  const fallingDripsGroupRef = useRef<THREE.Group>(null);
  const splashesGroupRef = useRef<THREE.Group>(null);

  const simulationTimeRef = useRef(Date.now());
  const seenTimestampRef = useRef<number | undefined>(undefined);
  const activeRef = useRef<ActiveOverflow | null>(null);
  const opacityRef = useRef(0);
  const lastSoundTimeRef = useRef(0);
  const lastSoundRegimeRankRef = useRef<number>(0);

  // Vessel outer dimensions
  const dimensions = useMemo(() => {
    return vesselOuterDimensions(vessel.type);
  }, [vessel.type]);

  const { outer } = useMemo(() => {
    return vesselContours(vessel.type);
  }, [vessel.type]);

  // Shared high-performance MeshPhysicalMaterial across streams, crest, droplets, and falling drips
  const fluidMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      transmission: 0.92,
      roughness: 0.03,
      metalness: 0.01,
      ior: 1.333,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Shared basic material for tabletop splash ripples
  const splashMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Procedural streams buffer geometry
  const streamsGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(TOTAL_VERTICES * 3);
    const normals = new Float32Array(TOTAL_VERTICES * 3);
    const uvs = new Float32Array(TOTAL_VERTICES * 2);
    const indices = new Uint32Array(TOTAL_INDICES);

    let idx = 0;
    for (let s = 0; s < STREAMS_COUNT; s++) {
      const baseVertex = s * (SLICES_PER_STREAM + 1) * 2;
      for (let sl = 0; sl < SLICES_PER_STREAM; sl++) {
        const v0 = baseVertex + sl * 2;
        const v1 = v0 + 1;
        const v2 = v0 + 2;
        const v3 = v0 + 3;

        // Two triangles per quad
        indices[idx++] = v0;
        indices[idx++] = v2;
        indices[idx++] = v1;

        indices[idx++] = v1;
        indices[idx++] = v2;
        indices[idx++] = v3;
      }
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2).setUsage(THREE.StaticDrawUsage));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    return geom;
  }, []);

  // Rim overflow crest lip geometry with positions and normals
  const crestGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const segs = 32;
    const pos = new Float32Array((segs + 1) * 2 * 3);
    const norms = new Float32Array((segs + 1) * 2 * 3);
    const indices = new Uint32Array(segs * 6);
    let idx = 0;
    for (let i = 0; i < segs; i++) {
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = v0 + 2;
      const v3 = v0 + 3;
      indices[idx++] = v0;
      indices[idx++] = v2;
      indices[idx++] = v1;
      indices[idx++] = v1;
      indices[idx++] = v2;
      indices[idx++] = v3;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('normal', new THREE.BufferAttribute(norms, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    return geom;
  }, []);

  // Droplet beads along the wall
  const dropletData = useMemo(() => {
    return Array.from({ length: DROPLET_COUNT }).map((_, i) => ({
      streamIndex: i % STREAMS_COUNT,
      speed: 0.35 + (i % 5) * 0.12,
      phase: (i * 0.233) % 1.0,
      size: 0.012 + (i % 4) * 0.005,
      angleJitter: ((i % 3) - 1) * 0.04,
    }));
  }, []);

  // Falling drips beneath the vessel base down to the table
  const fallingDripData = useMemo(() => {
    return Array.from({ length: FALLING_DRIPS_COUNT }).map((_, i) => ({
      streamIndex: i % STREAMS_COUNT,
      phase: (i * 0.317) % 1.0,
      speed: 1.2 + (i % 3) * 0.4,
      size: 0.016 + (i % 3) * 0.004,
    }));
  }, []);

  // Splash rings on the tabletop
  const splashRingData = useMemo(() => {
    return Array.from({ length: SPLASH_RINGS_COUNT }).map((_, i) => ({
      streamIndex: i % STREAMS_COUNT,
      phase: (i * 0.412) % 1.0,
      maxRadius: 0.05 + (i % 3) * 0.02,
    }));
  }, []);

  // Listen to vfxBus for overflow events
  useEffect(() => {
    const unsub = vfxBus.on('vessel:overflow', (data) => {
      if (data.vesselId === vessel.id && !vessel.isShattered
        && Number.isFinite(data.volume_ml) && data.volume_ml! > 0
        && (data.angle === undefined || Number.isFinite(data.angle))
        && (data.duration_s === undefined || (Number.isFinite(data.duration_s) && data.duration_s > 0))) {
        const now = simulationTimeRef.current;
        const vol = data.volume_ml!;
        // Illustrative duration envelope, not a solved wall-film flow time:
        // Minor (~0.1 - 2 mL): 1.8 - 2.8s
        // Moderate (~3 - 10 mL): 3.0 - 4.5s
        // Surge (>15 - 50 mL): 4.5 - 7.5s
        const dur = data.duration_s 
          ? data.duration_s * 1000 
          : (vol <= 2.0 
              ? Math.max(1800, 1500 + vol * 600)
              : (vol <= 12.0 
                  ? Math.max(2800, 2400 + (vol - 2) * 190)
                  : Math.min(8000, 4500 + (vol - 12) * 85)));

        // Local angle: if data.angle is provided (in world space), convert to local by subtracting vessel.rotationY
        const localAngle = data.angle !== undefined
          ? (data.angle - (vessel.rotationY || 0))
          : 0; // Default to spout lip along local +X

        if (activeRef.current && activeRef.current.vesselId === vessel.id) {
          // Continuous pouring: extend duration and update volume/color without resetting cascade head
          const currentElapsed = now - activeRef.current.startTime;
          activeRef.current.duration_ms = Math.max(activeRef.current.duration_ms, currentElapsed + dur);
          activeRef.current.volume_ml += vol;
          if (data.color) activeRef.current.color = data.color;
        } else {
          activeRef.current = {
            vesselId: vessel.id,
            startTime: now,
            duration_ms: dur,
            volume_ml: vol,
            color: data.color || vessel.liquidColor || '#38bdf8',
            angle: localAngle,
          };
        }

        // Realistic differentiated acoustic feedback with immediate regime escalation
        const profile = calculateOverflowProfile(activeRef.current.volume_ml);
        const rank = profile.regime === 'surge' ? 3 : (profile.regime === 'moderate' ? 2 : 1);
        const shouldPlay = (rank > lastSoundRegimeRankRef.current) || (now - lastSoundTimeRef.current > profile.soundInterval_ms);
        if (shouldPlay) {
          labSound.playOverflow(activeRef.current.volume_ml);
          lastSoundTimeRef.current = now;
          lastSoundRegimeRankRef.current = rank;
        }
      }
    });

    const reset = vfxBus.on('vessel:sample-reset', data => {
      if (data.vesselId !== vessel.id) return;
      activeRef.current = null; opacityRef.current = 0;
      if (groupRef.current) groupRef.current.visible = false;
      seenTimestampRef.current = vessel.overflowTimestamp;
    });
    return () => { unsub(); reset(); };
  }, [vessel.id, vessel.liquidColor, vessel.rotationY, vessel.isShattered]);

  // Main animation loop
  useFrame((state, delta) => {
    const simulation = useAppStore.getState();
    if (simulation.isSimulationPaused) return;
    const dt = simulationFrameDt(delta, simulation);
    simulationTimeRef.current += dt * 1000;
    if (vessel.isShattered) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    const now = simulationTimeRef.current;
    let currentOverflow = activeRef.current;

    // Check if vessel state overflow_ml is active
    if (!currentOverflow && Number.isFinite(vessel.overflow_ml) && vessel.overflow_ml! > 0
      && Number.isFinite(vessel.overflowTimestamp) && vessel.overflowTimestamp! > 0 && seenTimestampRef.current !== vessel.overflowTimestamp) {
      seenTimestampRef.current = vessel.overflowTimestamp;
      const elapsed = Math.max(0, Date.now() - vessel.overflowTimestamp!);
      const vol = vessel.overflow_ml!;
      const dur = (vol <= 2.0 
        ? Math.max(1800, 1500 + vol * 600)
        : (vol <= 12.0 
            ? Math.max(2800, 2400 + (vol - 2) * 190)
            : Math.min(8000, 4500 + (vol - 12) * 85)));
      if (elapsed < dur) {
        currentOverflow = {
          vesselId: vessel.id,
          startTime: now - elapsed,
          duration_ms: dur,
          volume_ml: vol,
          color: vessel.liquidColor || '#38bdf8',
          angle: 0,
        };
        activeRef.current = currentOverflow;
      }
    }

    if (!currentOverflow) {
      lastSoundRegimeRankRef.current = 0;
      if (opacityRef.current > 0.01) {
        opacityRef.current = Math.max(0, opacityRef.current - dt * 3);
        fluidMaterial.opacity = opacityRef.current;
        splashMaterial.opacity = opacityRef.current * 0.6;
      } else {
        if (groupRef.current && groupRef.current.visible) {
          groupRef.current.visible = false;
        }
      }
      return;
    }

    const elapsed = now - currentOverflow.startTime;
    if (elapsed >= currentOverflow.duration_ms) {
      activeRef.current = null;
      lastSoundRegimeRankRef.current = 0;
      return;
    }

    // Active overflow animation
    if (groupRef.current) groupRef.current.visible = true;

    // Smooth envelope: ramp up in 180ms, stay, and fade out at the end
    const progress = elapsed / currentOverflow.duration_ms;
    let targetOpacity = 0.94;
    if (progress < 0.08) {
      targetOpacity = (progress / 0.08) * 0.94;
    } else if (progress > 0.75) {
      targetOpacity = (1.0 - (progress - 0.75) / 0.25) * 0.94;
    }
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 1 - Math.exp(-dt * 13.4));

    const fluidColor = new THREE.Color(currentOverflow.color || vessel.liquidColor || '#38bdf8');
    fluidMaterial.opacity = opacityRef.current;
    fluidMaterial.color.copy(fluidColor);
    splashMaterial.color.copy(fluidColor);

    const time = now / 1000;
    const topY = dimensions.topY;
    const bottomY = dimensions.bottomY;
    const height = topY - bottomY;
    const centerAngle = currentOverflow.angle;

    // Presentation profile driven only by the explicit released volume.
    const profile = calculateOverflowProfile(currentOverflow.volume_ml);

    // Audio repetition during ongoing cascade or surge with immediate regime escalation
    const rank = profile.regime === 'surge' ? 3 : (profile.regime === 'moderate' ? 2 : 1);
    const audioIntervalPassed = now - lastSoundTimeRef.current > profile.soundInterval_ms;
    const isEscalating = rank > lastSoundRegimeRankRef.current;
    if ((isEscalating || audioIntervalPassed) && elapsed < currentOverflow.duration_ms - 400) {
      labSound.playOverflow(currentOverflow.volume_ml);
      lastSoundTimeRef.current = now;
      lastSoundRegimeRankRef.current = rank;
    }

    // Physical leading edge: stream head descent duration scales by regime:
    // Minor: ~600-750ms slower sliding trickle due to capillary drag
    // Moderate: ~320-420ms steady downward velocity
    // Surge: ~170-240ms rapid downward rush
    const headDescentMs = profile.headDescentDuration_ms;
    const headFrac = Math.min(1.0, Math.pow(Math.min(1.0, elapsed / headDescentMs), 1.25));
    const leadingY = topY - headFrac * height;

    // Physical trailing edge: stream thins from top down in the final drain phase
    const drainDurationMs = profile.regime === 'minor' ? 350 : (profile.regime === 'moderate' ? 500 : 700);
    const timeLeft = currentOverflow.duration_ms - elapsed;
    const tailFrac = timeLeft < drainDurationMs ? 1.0 - (timeLeft / drainDurationMs) : 0;
    const trailingY = topY - Math.pow(tailFrac, 1.2) * height;

    // 1. Update Rivulet Ribbon Geometries along outer wall contour
    const posAttr = streamsGeometry.attributes.position as THREE.BufferAttribute;
    const normAttr = streamsGeometry.attributes.normal as THREE.BufferAttribute;
    const uvAttr = streamsGeometry.attributes.uv as THREE.BufferAttribute;

    const posArray = posAttr.array as Float32Array;
    const normArray = normAttr.array as Float32Array;
    const uvArray = uvAttr.array as Float32Array;

    let vOffset = 0;
    let uvOffset = 0;

    const activeStreams = profile.activeStreamsCount;
    const minActiveIdx = Math.floor((STREAMS_COUNT - activeStreams) / 2);
    const maxActiveIdx = minActiveIdx + activeStreams - 1;

    for (let s = 0; s < STREAMS_COUNT; s++) {
      const isStreamActiveInRegime = (s >= minActiveIdx && s <= maxActiveIdx);
      const streamRelIdx = s - (STREAMS_COUNT - 1) / 2;
      const streamAngle = centerAngle + streamRelIdx * profile.streamSpacingRad;

      for (let sl = 0; sl <= SLICES_PER_STREAM; sl++) {
        const frac = sl / SLICES_PER_STREAM;
        const sliceNominalY = topY - frac * height;

        // Clamp slice Y to leading edge front and trailing edge drain
        const y = Math.max(bottomY, Math.min(topY, Math.max(leadingY, sliceNominalY)));
        const isSliceActive = isStreamActiveInRegime && (sliceNominalY >= leadingY) && (sliceNominalY <= trailingY);

        // Exact outer radius from physical contour plus 3.5mm offset
        const baseR = contourRadius(outer, y) + 0.0035;

        // Accurate wall surface normal from contour slope dr/dy
        const rAbove = contourRadius(outer, Math.min(topY, y + 0.04));
        const dr_dy = (rAbove - contourRadius(outer, y)) / 0.04;
        const normLen = Math.hypot(1, dr_dy);
        const nr = 1 / normLen;
        const ny = -dr_dy / normLen;

        // Meander wave as liquid tracks surface irregularities
        const meanderAmp = profile.regime === 'minor' ? 0.02 : (profile.regime === 'surge' ? 0.06 : 0.04);
        const meander = meanderAmp * Math.sin(y * 7.5 + s * 2.1 + time * 1.5);
        const theta = streamAngle + meander;

        // Width and thickness variation (pulsing fluid waves, collapsing if inactive to zero-area degenerate quads)
        const wave = Math.sin(y * profile.waveFrequency - time * profile.waveSpeed + s * 1.8);
        const streamWidth = isSliceActive
          ? (profile.streamWidthBase + profile.streamWidthWave * wave) * (1.0 - frac * 0.20)
          : 0;
        const thickness = isSliceActive
          ? (profile.streamThickness + (profile.streamThickness * 0.4) * Math.cos(y * profile.waveFrequency - time * profile.waveSpeed + s))
          : 0;

        const halfAngle = isSliceActive ? streamWidth / (2 * Math.max(0.1, baseR)) : 0;
        const rEffective = baseR + thickness;

        const leftAngle = theta - halfAngle;
        const rightAngle = theta + halfAngle;

        // Left vertex
        const lx = Math.cos(leftAngle) * rEffective;
        const lz = Math.sin(leftAngle) * rEffective;

        // Right vertex
        const rx = Math.cos(rightAngle) * rEffective;
        const rz = Math.sin(rightAngle) * rEffective;

        posArray[vOffset] = lx;
        posArray[vOffset + 1] = y;
        posArray[vOffset + 2] = lz;

        posArray[vOffset + 3] = rx;
        posArray[vOffset + 4] = y;
        posArray[vOffset + 5] = rz;

        // True normal pointing outward & matching glass curvature
        normArray[vOffset] = Math.cos(leftAngle) * nr;
        normArray[vOffset + 1] = ny;
        normArray[vOffset + 2] = Math.sin(leftAngle) * nr;

        normArray[vOffset + 3] = Math.cos(rightAngle) * nr;
        normArray[vOffset + 4] = ny;
        normArray[vOffset + 5] = Math.sin(rightAngle) * nr;

        // UVs
        const vCoord = frac * 3.5 - time * 2.5;
        uvArray[uvOffset] = 0;
        uvArray[uvOffset + 1] = vCoord;

        uvArray[uvOffset + 2] = 1;
        uvArray[uvOffset + 3] = vCoord;

        vOffset += 6;
        uvOffset += 4;
      }
    }

    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;

    // 2. Update Rim Overflow Crest Lip (Liquid crowning over the rim)
    const crestPosAttr = crestGeometry.attributes.position as THREE.BufferAttribute;
    const crestNormAttr = crestGeometry.attributes.normal as THREE.BufferAttribute;
    const crestPosArray = crestPosAttr.array as Float32Array;
    const crestNormArray = crestNormAttr.array as Float32Array;
    const rimRadius = dimensions.rimRadius;
    const segs = 32;
    const arcSpan = profile.crestArcSpanRad;
    const crestHeight = profile.crestHeight;
    const crestLipSpread = profile.crestLipSpread;
    let cIdx = 0;

    // Crest height decreases as stream drains
    const crestDrainFade = Math.max(0, 1.0 - tailFrac * 1.5);

    for (let i = 0; i <= segs; i++) {
      const aFrac = (i / segs) - 0.5;
      const a = centerAngle + aFrac * arcSpan;
      const bell = Math.cos(aFrac * Math.PI) * crestDrainFade;

      const rInner = (rimRadius - 0.015) + (1 - bell) * 0.005;
      const rOuter = (rimRadius + 0.004) + bell * crestLipSpread;

      const yInner = topY + bell * crestHeight;
      const yOuter = topY - bell * (crestHeight * 4.5 + 0.01);

      crestPosArray[cIdx] = Math.cos(a) * rInner;
      crestPosArray[cIdx + 1] = yInner;
      crestPosArray[cIdx + 2] = Math.sin(a) * rInner;

      crestPosArray[cIdx + 3] = Math.cos(a) * rOuter;
      crestPosArray[cIdx + 4] = yOuter;
      crestPosArray[cIdx + 5] = Math.sin(a) * rOuter;

      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      crestNormArray[cIdx] = cosA * 0.4;
      crestNormArray[cIdx + 1] = 0.9;
      crestNormArray[cIdx + 2] = sinA * 0.4;

      crestNormArray[cIdx + 3] = cosA * 0.8;
      crestNormArray[cIdx + 4] = 0.3;
      crestNormArray[cIdx + 5] = sinA * 0.8;

      cIdx += 6;
    }
    crestPosAttr.needsUpdate = true;
    crestNormAttr.needsUpdate = true;

    // 3. Update Droplet Beads sliding down the wall
    if (dropletsGroupRef.current) {
      const children = dropletsGroupRef.current.children;
      const activeDropletsCount = profile.activeDropletsCount;
      for (let i = 0; i < DROPLET_COUNT && i < children.length; i++) {
        const drop = children[i] as THREE.Mesh;
        if (i >= activeDropletsCount) {
          drop.visible = false;
          continue;
        }
        const data = dropletData[i];
        // Spatial alignment: strictly map to currently active stream ribbons
        const activeStreamIdx = minActiveIdx + (i % activeStreams);
        const streamRelIdx = activeStreamIdx - (STREAMS_COUNT - 1) / 2;
        const streamAngle = centerAngle + streamRelIdx * profile.streamSpacingRad + data.angleJitter;

        const effectiveSpeed = data.speed * profile.dropletSpeedScale;
        const cycle = ((time * effectiveSpeed + data.phase) % 1.0);
        const y = topY - cycle * height;
        const r = contourRadius(outer, y) + 0.0045;

        // Droplets only exist on the wetted portion of the glass
        const dropActive = (y >= leadingY) && (y <= trailingY);
        drop.visible = dropActive;

        if (dropActive) {
          drop.position.set(Math.cos(streamAngle) * r, y, Math.sin(streamAngle) * r);
          const wobbleAmp = profile.regime === 'surge' ? 0.35 : (profile.regime === 'minor' ? 0.08 : 0.20);
          const wobble = 1.0 + wobbleAmp * Math.sin(time * 16.0 + i);
          const dropSize = data.size * profile.dropletSizeScale;
          drop.scale.set(dropSize * wobble, dropSize * 1.3, dropSize * wobble);
        }
      }
    }

    // 4. Update Falling Drips beneath the base down to table (active once stream hits table)
    const localTableY = LAB_PHYSICS.TABLE_SURFACE_Y - vessel.position[1];
    const dropFallDist = Math.max(0.01, bottomY - localTableY);
    const tableReached = elapsed >= profile.headDescentDuration_ms;

    if (fallingDripsGroupRef.current) {
      fallingDripsGroupRef.current.visible = tableReached && (tailFrac < 0.9);
      if (tableReached && tailFrac < 0.9) {
        const children = fallingDripsGroupRef.current.children;
        const activeDripsCount = profile.activeFallingDripsCount;
        for (let i = 0; i < FALLING_DRIPS_COUNT && i < children.length; i++) {
          const drip = children[i] as THREE.Mesh;
          if (i >= activeDripsCount) {
            drip.visible = false;
            continue;
          }
          const data = fallingDripData[i];
          // Spatial alignment: strictly map falling drips beneath active streams
          const activeStreamIdx = minActiveIdx + (i % activeStreams);
          const streamRelIdx = activeStreamIdx - (STREAMS_COUNT - 1) / 2;
          const streamAngle = centerAngle + streamRelIdx * profile.streamSpacingRad;
          const baseR = dimensions.baseRadius + 0.003;

          const dripSpeed = profile.regime === 'minor' ? data.speed * 0.65 : (profile.regime === 'surge' ? data.speed * 1.5 : data.speed);
          const cycle = ((time * dripSpeed + data.phase) % 1.0);

          // For minor overflow: intermittent dripping cadence ("nhỏ giọt ngắt quãng")
          if (profile.isIntermittentDripping && cycle > 0.42) {
            drip.visible = false;
            continue;
          }
          drip.visible = true;

          // Quadratic acceleration under gravity
          const fallFrac = cycle * cycle;
          const y = bottomY - fallFrac * dropFallDist;

          drip.position.set(Math.cos(streamAngle) * baseR, y, Math.sin(streamAngle) * baseR);
          const stretch = 1.0 + fallFrac * profile.dripStretchFactor;
          const dripSize = data.size * profile.dripSizeScale;
          drip.scale.set(dripSize, dripSize * stretch, dripSize);
        }
      }
    }

    // 5. Update Splash Ripples on the tabletop
    if (splashesGroupRef.current) {
      splashesGroupRef.current.visible = tableReached && (tailFrac < 0.9);
      if (tableReached && tailFrac < 0.9) {
        const children = splashesGroupRef.current.children;
        const activeRingsCount = profile.activeSplashRingsCount;
        for (let i = 0; i < SPLASH_RINGS_COUNT && i < children.length; i++) {
          const ring = children[i] as THREE.Mesh;
          if (i >= activeRingsCount) {
            ring.visible = false;
            continue;
          }
          const data = splashRingData[i];
          // Spatial alignment: strictly map splash rings beneath active streams
          const activeStreamIdx = minActiveIdx + (i % activeStreams);
          const streamRelIdx = activeStreamIdx - (STREAMS_COUNT - 1) / 2;
          const streamAngle = centerAngle + streamRelIdx * profile.streamSpacingRad;
          const baseR = dimensions.baseRadius + 0.004;

          const ringSpeed = profile.regime === 'surge' ? 2.6 : 1.8;
          const cycle = ((time * ringSpeed + data.phase) % 1.0);
          const radius = cycle * data.maxRadius * profile.splashRingMaxRadiusScale;
          const ringOpacity = (1.0 - cycle) * 0.7 * opacityRef.current * profile.splashRingOpacityScale;

          ring.position.set(Math.cos(streamAngle) * baseR, localTableY + 0.001, Math.sin(streamAngle) * baseR);
          ring.scale.set(radius, radius, radius);

          const mat = ring.material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.opacity = ringOpacity;
            mat.color.copy(fluidColor);
          }
        }
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* 1. Cascading Outer Wall Rivulets */}
      <mesh
        ref={streamsMeshRef}
        geometry={streamsGeometry}
        material={fluidMaterial}
        renderOrder={7}
      />

      {/* 2. Rim Overflow Crest Lip */}
      <mesh
        ref={crestMeshRef}
        geometry={crestGeometry}
        material={fluidMaterial}
        renderOrder={7}
      />

      {/* 3. Sliding Droplets / Tears on Outer Glass Wall */}
      <group ref={dropletsGroupRef}>
        {Array.from({ length: DROPLET_COUNT }).map((_, i) => (
          <mesh
            key={i}
            material={fluidMaterial}
            renderOrder={8}
          >
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
        ))}
      </group>

      {/* 4. Falling Drips beneath the Base Rim */}
      <group ref={fallingDripsGroupRef}>
        {Array.from({ length: FALLING_DRIPS_COUNT }).map((_, i) => (
          <mesh
            key={i}
            material={fluidMaterial}
            renderOrder={8}
          >
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        ))}
      </group>

      {/* 5. Splash Rings on Tabletop beneath Drips */}
      <group ref={splashesGroupRef}>
        {Array.from({ length: SPLASH_RINGS_COUNT }).map((_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            material={splashMaterial}
            renderOrder={8}
          >
            <ringGeometry args={[0.7, 1.0, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

export default VesselWallOverflow;
