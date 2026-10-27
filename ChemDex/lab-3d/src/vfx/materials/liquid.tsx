import { simulationFrameDt } from '../../core/clock';
import { stepDampedOscillator, frameSmoothing } from '../../science/dampedOscillator';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical } from '../../store/useAppStore';
import { useQualityStore } from '../quality';
import { NOISE_GLSL } from '../glsl/noise.glsl';
import { getVesselInnerRadius } from './glass';
import { getCausticTexture } from '../textures';
import { SimulationEngine } from '../../simulation/core/SimulationEngine';
import { liquidSurfaceVolume } from '../../engine/waterPhase';
import { PourController } from '../../pour/controller/PourController';
import { vfxBus } from '../bus';
import { reactionSimulationEngine } from '../reactions/ReactionSimulationEngine';
import { solveLevel } from '../../pour/physics/retained';
import { getVesselProfile } from '../../pour/physics/profiles';

import { VesselType } from '../../types/chemistry';
import { liquidGeometry, liquidLevelForVolume, vesselInterior } from '../../science/vesselDimensions';
import { isSodiumWaterReaction } from '../../science/sodiumWater';
import { currentMixedPrecipitateTurbidity } from '../../simulation/render/precipitateTurbidity';
import { supernatantColor } from '../../science/supernatantAppearance';

interface LiquidProps {
  vesselId: string;
  vesselType: VesselType;
  capacity_ml?: number;
  volumeOverride_ml?: number;
  bottomVolume_ml?: number;
  colorOverride?: string;
}

// Scratch transforms reused between animation frames.
const _scratchPos = new THREE.Vector3();
const _scratchVel = new THREE.Vector3();
const _scratchAccel = new THREE.Vector3();
const _scratchNormal = new THREE.Vector3();
const _localPlane = new THREE.Plane();
const _scratchTargetColor = new THREE.Color();
const _scratchQuat = new THREE.Quaternion();

export const RealisticLiquid = React.memo(function RealisticLiquid({
  vesselId,
  vesselType,
  capacity_ml = 250,
  volumeOverride_ml,
  bottomVolume_ml = 0,
  colorOverride,
}: LiquidProps) {
  const baseY = liquidGeometry(vesselType).floorY;
  const meshGroupRef = useRef<THREE.Group>(null);
  const liquidMeshRef = useRef<THREE.Mesh>(null);
  const meniscusMeshRef = useRef<THREE.Mesh>(null);
  const causticMeshRef = useRef<THREE.Mesh>(null);

  // Slosh spring physics state stored in refs (no GC)
  const slosh = useRef({
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    lastWorldPos: new THREE.Vector3(),
    lastVelocity: new THREE.Vector3(),
    initialized: false,
  });

  // Dynamic capillary surface ripples driven by bubble bursts and surface impulses
  const dynamicRippleRef = useRef(0);

  useEffect(() => {
    const unsub = vfxBus.on('surface:ripple', (e) => {
      if (!e.vesselId || e.vesselId === vesselId) {
        dynamicRippleRef.current = Math.min(1.0, dynamicRippleRef.current + (e.intensity || 0.2) * 0.35);
      }
    });
    const reset = vfxBus.on('vessel:sample-reset', e => {
      if (e.vesselId === vesselId) dynamicRippleRef.current = 0;
    });
    return () => { unsub(); reset(); };
  }, [vesselId]);

  const effectiveTier = useQualityStore((state) => state.effectiveTier);

  // Dynamic clipping plane dedicated to this vessel's fluid surface
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const bottomPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6), []);
  const planeCache = useRef<{ profile: object; tilt: number; volume: number; offset: number; bottom: number; lowerOffset: number } | null>(null);

  // Pre-generate lathe geometry for this vessel type
  const innerGeom = useMemo(() => new THREE.LatheGeometry(vesselInterior(vesselType).points
    .map(([r, y]) => new THREE.Vector2(r, y)), 32), [vesselType]);
  useEffect(() => () => innerGeom.dispose(), [innerGeom]);

  // Caustic texture
  const causticTex = useMemo(() => getCausticTexture(256), []);

  // Uniforms for custom shader modifications
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFillY: { value: baseY },
    uBaseY: { value: baseY },
    uSurfaceRadius: { value: 0.5 },
    uWorldToVessel: { value: new THREE.Matrix4() },
    uInteriorCount: { value: vesselInterior(vesselType).points.length },
    uInterior: { value: Array.from({ length: 32 }, (_, i) => {
      const point = vesselInterior(vesselType).points[i] ?? vesselInterior(vesselType).points.at(-1)!;
      return new THREE.Vector2(point[0], point[1]);
    }) },
    uLiquidColor: { value: new THREE.Color('#38bdf8') },
    uSuspensionColor: { value: new THREE.Color('#f8fafc') },
    uTurbidity: { value: 0.0 }, // 0 = clear, 1 = milky BaSO4/AgCl
    uBoilingIntensity: { value: 0.0 },
    uDynamicRipple: { value: 0.0 },
    uSloshTilt: { value: new THREE.Vector2(0, 0) },
    uSloshSpeed: { value: 0.0 },
    uSloshAngle: { value: 0.0 },
    uPourAgitation: { value: 0.0 },
    uMixingPoint: { value: new THREE.Vector3(0, 0, 0) },
    uMixingRadius: { value: 0.0 },
    uMixingColor: { value: new THREE.Color('#ffffff') },
    uMixingStrength: { value: 0.0 },
    uHasActiveReaction: { value: 0.0 },
    uReactionProgress: { value: 0.0 },
    uReactionInitialColor: { value: new THREE.Color('#38bdf8') },
    uReactionTargetColor: { value: new THREE.Color('#38bdf8') },
  }), [baseY, vesselType]);

  // Liquid Material with physical absorption, clearcoat, and turbidity
  const liquidMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#38bdf8'),
      roughness: 0.08,
      metalness: 0.02,
      specularIntensity: 0.9,
      clearcoat: 0.8,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.85,
      clippingPlanes: [clippingPlane, bottomPlane],
      clipShadows: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    mat.customProgramCacheKey = () => 'chemlab_realistic_liquid_v2';

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uFillY = uniforms.uFillY;
      shader.uniforms.uBaseY = uniforms.uBaseY;
      shader.uniforms.uLiquidColor = uniforms.uLiquidColor;
      shader.uniforms.uSuspensionColor = uniforms.uSuspensionColor;
      shader.uniforms.uTurbidity = uniforms.uTurbidity;
      shader.uniforms.uBoilingIntensity = uniforms.uBoilingIntensity;
      shader.uniforms.uMixingPoint = uniforms.uMixingPoint;
      shader.uniforms.uMixingRadius = uniforms.uMixingRadius;
      shader.uniforms.uMixingColor = uniforms.uMixingColor;
      shader.uniforms.uMixingStrength = uniforms.uMixingStrength;
      shader.uniforms.uHasActiveReaction = uniforms.uHasActiveReaction;
      shader.uniforms.uReactionProgress = uniforms.uReactionProgress;
      shader.uniforms.uReactionInitialColor = uniforms.uReactionInitialColor;
      shader.uniforms.uReactionTargetColor = uniforms.uReactionTargetColor;

      shader.vertexShader = `
        varying vec3 vWorldPosition;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform float uFillY;
        uniform float uBaseY;
        uniform vec3 uLiquidColor;
        uniform vec3 uSuspensionColor;
        uniform float uTurbidity;
        uniform float uBoilingIntensity;
        uniform vec3 uMixingPoint;
        uniform float uMixingRadius;
        uniform vec3 uMixingColor;
        uniform float uMixingStrength;
        uniform float uHasActiveReaction;
        uniform float uReactionProgress;
        uniform vec3 uReactionInitialColor;
        uniform vec3 uReactionTargetColor;
        varying vec3 vWorldPosition;
        ${NOISE_GLSL}
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        vec3 vDir = normalize(vViewPosition);
        float rim = 1.0 - abs(dot(vDir, normal));
        rim = pow(rim, 2.0);

        // Edge internal glow highlight
        gl_FragColor.rgb += uLiquidColor * rim * 0.35;
        gl_FragColor.a = max(gl_FragColor.a, 0.78);

        // Dynamic downward convective color dispersion front during chemical reactions
        if (uHasActiveReaction > 0.01) {
          float liquidHeight = max(0.02, uFillY - uBaseY);
          float normH = clamp((vWorldPosition.y - uBaseY) / liquidHeight, 0.0, 1.0);

          // Front descends from 1.05 down to -0.15 as progress increases
          float frontPos = 1.05 - uReactionProgress * 1.25;

          // 3D procedural noise creates realistic Rayleigh-Taylor convective fingers / plumes
          vec3 nPos = vec3(vWorldPosition.xz * 4.5, vWorldPosition.y * 3.0 - uTime * 0.35);
          float fingering = snoise(nPos) * 0.16 + snoise(nPos * 2.1) * 0.08;

          float plumeFront = smoothstep(frontPos - 0.18 + fingering, frontPos + 0.12 + fingering, normH);
          float bulkDiffusion = pow(uReactionProgress, 1.7);
          float reactionMixFactor = clamp(max(plumeFront, bulkDiffusion), 0.0, 1.0) * uHasActiveReaction;

          vec3 frontColor = mix(uReactionInitialColor, uReactionTargetColor, reactionMixFactor);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, frontColor, uHasActiveReaction * 0.95);
        }

        // Local Inflow Mixing Plume (Dynamic non-uniform color diffusion)
        if (uMixingStrength > 0.01 && uMixingRadius > 0.005) {
          float distToPlume = length(vWorldPosition - uMixingPoint);
          float plumeFactor = (1.0 - smoothstep(0.0, uMixingRadius, distToPlume)) * uMixingStrength;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uMixingColor, plumeFactor * 0.85);
        }

        // Turbidity Tyndall scattering for precipitates (BaSO4, AgCl, Cu(OH)2, PbI2)
        if (uTurbidity > 0.01) {
          vec3 milkyScattering = uSuspensionColor;
          float depthFactor = clamp((uFillY - vWorldPosition.y) * 1.5, 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, milkyScattering, uTurbidity * 0.75 * depthFactor);
          gl_FragColor.a = mix(gl_FragColor.a, 0.98, uTurbidity);
        }

        #include <colorspace_fragment>
        `
      );
    };

    return mat;
  }, [clippingPlane, bottomPlane, uniforms]);

  // Meniscus Surface Disk Material
  const meniscusMaterial = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#38bdf8'),
      roughness: 0.06,
      metalness: 0.02,
      specularIntensity: 0.95,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uBoilingIntensity = uniforms.uBoilingIntensity;
      shader.uniforms.uDynamicRipple = uniforms.uDynamicRipple;
      shader.uniforms.uSurfaceRadius = uniforms.uSurfaceRadius;
      shader.uniforms.uSloshSpeed = uniforms.uSloshSpeed;
      shader.uniforms.uSloshAngle = uniforms.uSloshAngle;
      shader.uniforms.uPourAgitation = uniforms.uPourAgitation;
      shader.uniforms.uWorldToVessel = uniforms.uWorldToVessel;
      shader.uniforms.uInterior = uniforms.uInterior;
      shader.uniforms.uInteriorCount = uniforms.uInteriorCount;

      shader.vertexShader = `
        varying vec3 vCapWorld;
        uniform float uTime;
        uniform float uBoilingIntensity;
        uniform float uDynamicRipple;
        uniform float uSurfaceRadius;
        uniform float uSloshSpeed;
        uniform float uSloshAngle;
        uniform float uPourAgitation;
        ${NOISE_GLSL}
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
        #include <worldpos_vertex>
        vCapWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `);
      shader.fragmentShader = `
        varying vec3 vCapWorld;
        uniform mat4 uWorldToVessel;
        uniform vec2 uInterior[32];
        uniform int uInteriorCount;
        ${shader.fragmentShader}
      `.replace('#include <clipping_planes_fragment>', `
        #include <clipping_planes_fragment>
        vec3 capLocal = (uWorldToVessel * vec4(vCapWorld, 1.0)).xyz;
        if (capLocal.y < uInterior[0].y - 0.0001 || capLocal.y > uInterior[uInteriorCount - 1].y + 0.0001) discard;
        float wallRadius = 0.0;
        for (int i = 1; i < 32; i++) {
          if (i >= uInteriorCount) break;
          vec2 a = uInterior[i - 1], b = uInterior[i];
          if (b.y <= a.y) { if (capLocal.y >= b.y) wallRadius = b.x; continue; }
          if (capLocal.y >= a.y && capLocal.y <= b.y) {
            wallRadius = mix(a.x, b.x, (capLocal.y - a.y) / (b.y - a.y));
            break;
          }
        }
        if (length(capLocal.xz) > wallRadius + 0.0001) discard;
      `);

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Surface waves + climbing meniscus edge
        float distFromCenter = length(position.xy);
        float normDist = clamp(distFromCenter, 0.0, 1.0);

        // Meniscus climbs up ~2.5% at the glass wall boundary
        float meniscusClimb = pow(normDist, 5.0) * 0.024;
        transformed.z += meniscusClimb;

        // Physical slosh motion waves & ripples when moving the container
        if (uSloshSpeed > 0.001) {
          float ripple = sin(normDist * 26.0 - uTime * 15.0) * (1.0 - normDist) * min(0.045, uSloshSpeed * 0.1);
          float angle = atan(position.y, position.x);
          float transverse = cos(angle - uSloshAngle) * normDist * min(0.05, uSloshSpeed * 0.12);
          transformed.z += ripple + transverse;
        }

        // Pouring inflow agitation ripples (when liquid is rising)
        if (uPourAgitation > 0.01) {
          float pourWave = sin(normDist * 32.0 - uTime * 18.0) * (1.0 - normDist) * uPourAgitation * 0.035;
          transformed.z += pourWave;
        }

        // Boiling/effervescence wave displacement & dynamic bubble burst ripples
        if (uBoilingIntensity > 0.05 || uDynamicRipple > 0.01) {
          float totalAgitation = uBoilingIntensity + uDynamicRipple * 0.8;
          float wave = snoise(vec3(position.xy * 8.0, uTime * 6.0)) * totalAgitation * 0.035;
          transformed.z += wave;
        }
        `
      );
    };

    return mat;
  }, [uniforms]);

  const previousFillFraction = useRef<number | null>(null);
  const simulationTime = useRef(0);

  // Underdamped spring-damper slosh physics in useFrame
  useFrame((state, delta) => {
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || !meshGroupRef.current) return;

    const timeScale = useAppStore.getState().timeScale;
    const isPaused = useAppStore.getState().isSimulationPaused;
    const dt = simulationFrameDt(delta, { timeScale, isSimulationPaused: isPaused });

    simulationTime.current += dt;
    uniforms.uTime.value = simulationTime.current;

    // Decay dynamic surface ripples
    dynamicRippleRef.current = Math.max(0, dynamicRippleRef.current - dt * 3.0);
    uniforms.uDynamicRipple.value = dynamicRippleRef.current;

    const volume = volumeOverride_ml ?? liquidSurfaceVolume(vessel);
    const capacity = vessel.capacity_ml ?? capacity_ml;
    const targetFillFraction = Math.max(0, Math.min(1.0, volume / capacity));

    // Finite arrivals already advance inventory gradually. A second display
    // lag separates the water mesh from its physical contacts and floating Na.
    const fillDiff = targetFillFraction - (previousFillFraction.current ?? targetFillFraction);
    previousFillFraction.current = targetFillFraction;
    const agitation = dt > 0 ? Math.min(1, Math.abs(fillDiff) / dt * 0.2) : 0;
    uniforms.uPourAgitation.value = Math.max(agitation, uniforms.uPourAgitation.value * Math.exp(-3 * dt));
    const fillFraction = targetFillFraction;

    // Check if there is actual liquid solvent present in the vessel
    const hasLiquidSubstance = vessel.substances && vessel.substances.length > 0 && vessel.substances.some((sub) => {
      const c = getChemical(sub);
      return c && c.type !== 'solid';
    });

    // Hide fluid when empty, shattered, or if vessel only contains dry solids without solvent
    if (vessel.isShattered || fillFraction <= 0.002 || volume <= 0.05 || (!hasLiquidSubstance && !vessel.liquidColor)) {
      if (liquidMeshRef.current) liquidMeshRef.current.visible = false;
      if (meniscusMeshRef.current) meniscusMeshRef.current.visible = false;
      if (causticMeshRef.current) causticMeshRef.current.visible = false;
      return;
    }

    if (liquidMeshRef.current) liquidMeshRef.current.visible = true;
    if (meniscusMeshRef.current) meniscusMeshRef.current.visible = true;
    if (causticMeshRef.current) causticMeshRef.current.visible = true;

    // Same inventory-derived surface as dosing, recoil and buoyancy.
    const fillY = liquidLevelForVolume(vesselType, volume, capacity);
    uniforms.uFillY.value = fillY;

    const surfaceR = getVesselInnerRadius(vesselType, fillY - baseY);
    uniforms.uSurfaceRadius.value = surfaceR;

    // Update liquid color and turbidity
    const dissolvedColor = vessel.precipitateSubstance ? supernatantColor(vessel.contents, vessel.volume_ml) : null;
    const liquidColorHex = colorOverride || dissolvedColor || vessel.liquidColor || '#38bdf8';
    _scratchTargetColor.set(liquidColorHex);
    uniforms.uLiquidColor.value.lerp(_scratchTargetColor, frameSmoothing(0.1, dt));
    liquidMaterial.color.copy(uniforms.uLiquidColor.value);
    liquidMaterial.attenuationColor.copy(uniforms.uLiquidColor.value);
    meniscusMaterial.color.copy(uniforms.uLiquidColor.value);

    // Dynamic Turbidity & Cloudiness from physical simulation and dedicated reaction controller
    const simMgr = SimulationEngine.getManager(vesselId);
    const simRuntime = reactionSimulationEngine.getRuntime(vesselId);
    let targetTurbidity = (vessel.turbidity !== undefined && vessel.turbidity > 0)
      ? vessel.turbidity
      : (vessel.hasPrecipitate ? 0.85 : 0.0);
    const suspensionTurbidity = currentMixedPrecipitateTurbidity(vessel, simMgr);
    uniforms.uSuspensionColor.value.set(suspensionTurbidity !== null
      ? simMgr.suspensionColor : liquidColorHex);
    if (suspensionTurbidity !== null) targetTurbidity = suspensionTurbidity;
    if (suspensionTurbidity === null && simRuntime && simRuntime.progress < 1.0) {
      // Allow controller-driven turbidity (including stage-2 redissolution in CuSO4+NH3 and Al(OH)3+NaOH)
      if (simRuntime.reactionId.includes('cuso4_nh3') || simRuntime.reactionId === 'al_naoh' || simRuntime.reactionId.includes('al2so4_naoh')) {
        targetTurbidity = simRuntime.turbidity;
      } else {
        targetTurbidity = Math.max(targetTurbidity, simRuntime.turbidity);
      }
    }
    uniforms.uTurbidity.value = THREE.MathUtils.lerp(uniforms.uTurbidity.value, targetTurbidity, 1 - Math.exp(-5 * dt));

    // Dynamic Boiling intensity from thermal phase & physical bubble engine
    // Latent-heat/pressure-aware thermal state owns boiling. Temperature alone
    // (formerly a fixed 98 C threshold) cannot establish a vaporization flux.
    let targetBoiling = vessel.isBoiling ? vessel.boilingIntensity ?? 1 : 0;
    if (vessel.isBoiling && simMgr && simMgr.boilingSystem.bubbles.length > 0) {
      targetBoiling = Math.max(targetBoiling, simMgr.boilingSystem.bubbles.length / simMgr.boilingSystem.maxBubbles);
    }
    if (simRuntime && !isSodiumWaterReaction(simRuntime.reactionId) && simRuntime.surfaceActivity > 0.05) {
      targetBoiling = Math.max(targetBoiling, simRuntime.surfaceActivity * 0.75);
    }
    uniforms.uBoilingIntensity.value = THREE.MathUtils.lerp(uniforms.uBoilingIntensity.value, targetBoiling, 1 - Math.exp(-6 * dt));

    // SLOSH PHYSICS: Measure acceleration of vessel in world coordinates
    meshGroupRef.current.getWorldPosition(_scratchPos);
    const sl = slosh.current;

    if (!sl.initialized) {
      sl.lastWorldPos.copy(_scratchPos);
      sl.initialized = true;
    }

    if (dt > 0.0001) {
      _scratchVel.subVectors(_scratchPos, sl.lastWorldPos).divideScalar(dt);
      _scratchAccel.subVectors(_scratchVel, sl.lastVelocity).divideScalar(dt);
      sl.lastWorldPos.copy(_scratchPos);
      sl.lastVelocity.copy(_scratchVel);

      // Spring-damper equation for fluid surface tilt: acc = -omega^2 * x - 2 * zeta * omega * v + f_ext
      const omega = 8.5; // Natural slosh frequency
      const zeta = 0.38; // Damping ratio
      const forceX = -Math.max(-4.0, Math.min(4.0, _scratchAccel.x * 0.12));
      const forceZ = -Math.max(-4.0, Math.min(4.0, _scratchAccel.z * 0.12));

      const xStep = stepDampedOscillator(sl.x, sl.vx, dt, omega, zeta, forceX);
      const zStep = stepDampedOscillator(sl.z, sl.vz, dt, omega, zeta, forceZ);
      sl.x = xStep.x; sl.vx = xStep.velocity;
      sl.z = zStep.x; sl.vz = zStep.velocity;

      // Bound max slosh tilt
      sl.x = Math.max(-0.45, Math.min(0.45, sl.x));
      sl.z = Math.max(-0.45, Math.min(0.45, sl.z));

      // Dynamic motion ripple speed and directional propagation angle
      const sloshSpeed = Math.hypot(sl.vx, sl.vz) + _scratchVel.length() * 0.14;
      const sloshAngle = Math.atan2(sl.vz, sl.vx);
      uniforms.uSloshSpeed.value = THREE.MathUtils.lerp(uniforms.uSloshSpeed.value, Math.min(0.65, sloshSpeed), frameSmoothing(0.2, dt));
      uniforms.uSloshAngle.value = sloshAngle;
    } else {
      sl.lastWorldPos.copy(_scratchPos);
      sl.lastVelocity.set(0, 0, 0);
      uniforms.uSloshSpeed.value = THREE.MathUtils.lerp(uniforms.uSloshSpeed.value, 0.0, frameSmoothing(0.1, dt));
    }

    // 1. Mixing Plume from active pouring session
    const session = PourController.getSession();
    if (session && session.targetId === vesselId && session.mixingZone?.active) {
      uniforms.uMixingPoint.value.set(...session.mixingZone.point);
      uniforms.uMixingRadius.value = THREE.MathUtils.lerp(uniforms.uMixingRadius.value, session.mixingZone.radius, frameSmoothing(0.2, dt));
      _scratchTargetColor.set(session.mixingZone.color);
      uniforms.uMixingColor.value.lerp(_scratchTargetColor, frameSmoothing(0.2, dt));
      uniforms.uMixingStrength.value = THREE.MathUtils.lerp(uniforms.uMixingStrength.value, session.mixingZone.intensity, frameSmoothing(0.25, dt));
    } else {
      uniforms.uMixingStrength.value = THREE.MathUtils.lerp(uniforms.uMixingStrength.value, 0.0, frameSmoothing(0.08, dt));
    }

    // 1b. Downward convective color dispersion from active reaction kinetics
    const kinetics = useAppStore.getState().activeKinetics[vesselId];
    uniforms.uBaseY.value = baseY;
    if (kinetics && kinetics.progress < 1.0) {
      const rxId = (kinetics.reactionId || '').toLowerCase();
      let effectiveShaderProgress = kinetics.progress;
      if (rxId.includes('iodine_clock') || rxId.includes('kio3+nahso3')) {
        effectiveShaderProgress = kinetics.progress < 0.70 ? 0.0 : Math.min(1.0, (kinetics.progress - 0.70) / 0.06);
      } else if (rxId.includes('kmno4_oxalic') || rxId.includes('kmno4+h2c2o4')) {
        effectiveShaderProgress = 1.0 / (1.0 + Math.exp(-12.0 * (kinetics.progress - 0.52)));
      }
      uniforms.uHasActiveReaction.value = THREE.MathUtils.lerp(uniforms.uHasActiveReaction.value, 1.0, frameSmoothing(0.2, dt));
      uniforms.uReactionProgress.value = effectiveShaderProgress;
      if (kinetics.initialLiquidColor) {
        _scratchTargetColor.set(kinetics.initialLiquidColor);
        uniforms.uReactionInitialColor.value.copy(_scratchTargetColor);
      }
      if (kinetics.targetLiquidColor) {
        _scratchTargetColor.set(kinetics.targetLiquidColor);
        uniforms.uReactionTargetColor.value.copy(_scratchTargetColor);
      }
    } else {
      uniforms.uHasActiveReaction.value = THREE.MathUtils.lerp(uniforms.uHasActiveReaction.value, 0.0, frameSmoothing(0.08, dt));
    }

    // 2. Gravity-aligned clipping plane and meniscus disk
    // World gravity normal with dynamic slosh perturbation (points strictly downward in world space)
    const worldGravityNormal = new THREE.Vector3(sl.x, -1.0, sl.z).normalize();
    
    // Solve the plane inside the rotated reservoir, keeping geometric volume.
    meshGroupRef.current.getWorldQuaternion(_scratchQuat);
    const invContainerQuat = _scratchQuat.clone().invert();
    const localUpNormal = worldGravityNormal.clone().negate().applyQuaternion(invContainerQuat).normalize();
    const tilt = Math.atan2(Math.hypot(localUpNormal.x, localUpNormal.z), localUpNormal.y);
    const profile = getVesselProfile(vesselType, capacity);
    const cached = planeCache.current;
    if (!cached || cached.profile !== profile || cached.tilt !== tilt || cached.volume !== volume || cached.bottom !== bottomVolume_ml) {
      planeCache.current = { profile, tilt, volume, bottom: bottomVolume_ml,
        offset: tilt < 1e-8 ? fillY : solveLevel(profile, tilt, volume).c,
        lowerOffset: bottomVolume_ml > 0 ? tilt < 1e-8 ? liquidLevelForVolume(vesselType, bottomVolume_ml, capacity)
          : solveLevel(profile, tilt, bottomVolume_ml).c : 0 };
    }
    const plane = planeCache.current!;
    const localSurfPt = localUpNormal.clone().multiplyScalar(plane.offset);
    const worldSurfPt = localSurfPt.clone().applyMatrix4(meshGroupRef.current.matrixWorld);
    clippingPlane.setFromNormalAndCoplanarPoint(worldGravityNormal, worldSurfPt);
    if (bottomVolume_ml > 0) {
      const bottomPoint = localUpNormal.clone().multiplyScalar(plane.lowerOffset).applyMatrix4(meshGroupRef.current.matrixWorld);
      bottomPlane.setFromNormalAndCoplanarPoint(worldGravityNormal.clone().negate(), bottomPoint);
    } else bottomPlane.constant = 1e6;
    uniforms.uWorldToVessel.value.copy(meshGroupRef.current.matrixWorld).invert();

    // Orient meniscus surface disk according to local upward gravity normal
    if (meniscusMeshRef.current) {
      if (volume <= 0.05 || fillFraction <= 0.001) {
        meniscusMeshRef.current.visible = false;
      } else {
        meniscusMeshRef.current.visible = true;
        meniscusMeshRef.current.position.copy(localSurfPt);

        // Meniscus surface scale according to vessel inner geometry
        const interior = vesselInterior(vesselType);
        const capRadius = tilt < 1e-8 ? surfaceR : Math.hypot(interior.maximumRadius, Math.max(Math.abs(interior.floorY), Math.abs(interior.topY)));
        meniscusMeshRef.current.scale.set(capRadius, capRadius, 1.0);

        // World up (0, 1, 0) transformed into local container space
        _scratchQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localUpNormal);
        meniscusMeshRef.current.quaternion.copy(_scratchQuat);
      }
    }

    // Update caustic projector quad under vessel
    if (causticMeshRef.current) {
      causticMeshRef.current.visible = bottomVolume_ml <= 0;
      causticMeshRef.current.position.set(0, -1.155 - vessel.position[1], 0);
      const causticIntensity = Math.min(1.0, fillFraction * 1.5);
      const mat = causticMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(uniforms.uLiquidColor.value);
      mat.opacity = 0.45 * causticIntensity;
    }
  });

  return (
    <group ref={meshGroupRef}>
      {/* Liquid Body Mesh with Clipping Plane */}
      <mesh
        ref={liquidMeshRef}
        geometry={innerGeom}
        material={liquidMaterial}
        renderOrder={2}
      />

      {/* Surface Meniscus Disc */}
      <mesh
        ref={meniscusMeshRef}
        material={meniscusMaterial}
        renderOrder={3}
      >
        <ringGeometry args={[0, 1.0, 48, 12]} />
      </mesh>

      {/* Realistic Dynamic Caustic Shadow Quad on Workbench */}
      <mesh
        ref={causticMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial
          map={causticTex}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          opacity={0.35}
        />
      </mesh>
    </group>
  );
});
