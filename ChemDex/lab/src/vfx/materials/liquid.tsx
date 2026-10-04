import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, getChemical } from '../../store/useAppStore';
import { useQualityStore } from '../quality';
import { NOISE_GLSL } from '../glsl/noise.glsl';
import { createVesselLatheGeometry, getVesselInnerRadius } from './glass';
import { getCausticTexture } from '../textures';
import { SimulationEngine } from '../../simulation/core/SimulationEngine';
import { PourController } from '../../pour/controller/PourController';

interface LiquidProps {
  vesselId: string;
  vesselType: 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  baseY: number;
  maxHeight: number;
  capacity_ml?: number;
}

// Reusable scratch objects to guarantee ZERO allocation during animation frames
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
  baseY,
  maxHeight,
  capacity_ml = 250,
}: LiquidProps) {
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

  const effectiveTier = useQualityStore((state) => state.effectiveTier);

  // Dynamic clipping plane dedicated to this vessel's fluid surface
  const clippingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  // Pre-generate lathe geometry for this vessel type
  const { inner: innerGeom } = useMemo(() => {
    return createVesselLatheGeometry(vesselType, 32);
  }, [vesselType]);

  // Caustic texture
  const causticTex = useMemo(() => getCausticTexture(256), []);

  // Uniforms for custom shader modifications
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFillY: { value: baseY },
    uSurfaceRadius: { value: 0.5 },
    uLiquidColor: { value: new THREE.Color('#38bdf8') },
    uTurbidity: { value: 0.0 }, // 0 = clear, 1 = milky BaSO4/AgCl
    uBoilingIntensity: { value: 0.0 },
    uSloshTilt: { value: new THREE.Vector2(0, 0) },
    uSloshSpeed: { value: 0.0 },
    uSloshAngle: { value: 0.0 },
    uPourAgitation: { value: 0.0 },
    uMixingPoint: { value: new THREE.Vector3(0, 0, 0) },
    uMixingRadius: { value: 0.0 },
    uMixingColor: { value: new THREE.Color('#ffffff') },
    uMixingStrength: { value: 0.0 },
  }), [baseY]);

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
      opacity: 0.88,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    mat.customProgramCacheKey = () => 'chemlab_realistic_liquid_v2';

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uFillY = uniforms.uFillY;
      shader.uniforms.uLiquidColor = uniforms.uLiquidColor;
      shader.uniforms.uTurbidity = uniforms.uTurbidity;
      shader.uniforms.uBoilingIntensity = uniforms.uBoilingIntensity;
      shader.uniforms.uMixingPoint = uniforms.uMixingPoint;
      shader.uniforms.uMixingRadius = uniforms.uMixingRadius;
      shader.uniforms.uMixingColor = uniforms.uMixingColor;
      shader.uniforms.uMixingStrength = uniforms.uMixingStrength;

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
        uniform vec3 uLiquidColor;
        uniform float uTurbidity;
        uniform float uBoilingIntensity;
        uniform vec3 uMixingPoint;
        uniform float uMixingRadius;
        uniform vec3 uMixingColor;
        uniform float uMixingStrength;
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
        gl_FragColor.a = max(gl_FragColor.a, 0.85);

        // Local Inflow Mixing Plume (Dynamic non-uniform color diffusion)
        if (uMixingStrength > 0.01 && uMixingRadius > 0.005) {
          float distToPlume = length(vWorldPosition - uMixingPoint);
          float plumeFactor = smoothstep(uMixingRadius, 0.0, distToPlume) * uMixingStrength;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uMixingColor, plumeFactor * 0.85);
        }

        // Turbidity Tyndall scattering for precipitates (BaSO4, AgCl, Cu(OH)2)
        if (uTurbidity > 0.01) {
          vec3 milkyScattering = mix(vec3(0.95), uLiquidColor, 0.4);
          float depthFactor = clamp((uFillY - vWorldPosition.y) * 1.5, 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, milkyScattering, uTurbidity * 0.75 * depthFactor);
          gl_FragColor.a = mix(gl_FragColor.a, 0.98, uTurbidity);
        }

        #include <colorspace_fragment>
        `
      );
    };

    return mat;
  }, [clippingPlane, uniforms]);

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
      shader.uniforms.uSurfaceRadius = uniforms.uSurfaceRadius;
      shader.uniforms.uSloshSpeed = uniforms.uSloshSpeed;
      shader.uniforms.uSloshAngle = uniforms.uSloshAngle;
      shader.uniforms.uPourAgitation = uniforms.uPourAgitation;

      shader.vertexShader = `
        uniform float uTime;
        uniform float uBoilingIntensity;
        uniform float uSurfaceRadius;
        uniform float uSloshSpeed;
        uniform float uSloshAngle;
        uniform float uPourAgitation;
        ${NOISE_GLSL}
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Surface waves + climbing meniscus edge
        float distFromCenter = length(position.xy);
        float normDist = clamp(distFromCenter / max(0.001, uSurfaceRadius), 0.0, 1.0);

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

        // Boiling/effervescence wave displacement
        if (uBoilingIntensity > 0.05) {
          float wave = snoise(vec3(position.xy * 8.0, uTime * 6.0)) * uBoilingIntensity * 0.035;
          transformed.z += wave;
        }
        `
      );
    };

    return mat;
  }, [uniforms]);

  // Smooth fluid level interpolation ref
  const displayedFillFraction = useRef(0);
  const isFillInitialized = useRef(false);

  // Underdamped spring-damper slosh physics in useFrame
  useFrame((state, delta) => {
    const vessel = useAppStore.getState().vessels[vesselId];
    if (!vessel || !meshGroupRef.current) return;

    const timeScale = useAppStore.getState().timeScale || 1.0;
    const isPaused = useAppStore.getState().isSimulationPaused;
    const dt = isPaused ? 0 : Math.min(delta, 0.05) * timeScale;

    uniforms.uTime.value = state.clock.getElapsedTime();

    const volume = vessel.volume_ml ?? 0;
    const capacity = vessel.capacity_ml ?? capacity_ml;
    const targetFillFraction = Math.max(0, Math.min(1.0, volume / capacity));

    // Smooth fluid rise dynamics: liquid level rises gradually when poured into vessel
    if (!isFillInitialized.current) {
      displayedFillFraction.current = targetFillFraction;
      isFillInitialized.current = true;
    } else {
      const fillDiff = targetFillFraction - displayedFillFraction.current;
      if (Math.abs(fillDiff) > 0.0005) {
        // Fluid inflow dâng từ từ smoothly
        const riseSpeed = fillDiff > 0 ? 3.5 : 5.5;
        displayedFillFraction.current += fillDiff * Math.min(1.0, dt * riseSpeed);
        uniforms.uPourAgitation.value = THREE.MathUtils.lerp(uniforms.uPourAgitation.value, Math.min(1.0, Math.abs(fillDiff) * 12.0), 0.18);
      } else {
        displayedFillFraction.current = targetFillFraction;
        uniforms.uPourAgitation.value = THREE.MathUtils.lerp(uniforms.uPourAgitation.value, 0.0, 0.1);
      }
    }

    const fillFraction = displayedFillFraction.current;

    // Check if there is actual liquid solvent present in the vessel
    const hasLiquidSubstance = vessel.substances && vessel.substances.length > 0 && vessel.substances.some((sub) => {
      const c = getChemical(sub);
      return c && c.type !== 'solid';
    });

    // Hide fluid when empty, or if vessel only contains dry solids without solvent
    if (fillFraction <= 0.002 || volume <= 0.05 || (!hasLiquidSubstance && !vessel.liquidColor)) {
      if (liquidMeshRef.current) liquidMeshRef.current.visible = false;
      if (meniscusMeshRef.current) meniscusMeshRef.current.visible = false;
      if (causticMeshRef.current) causticMeshRef.current.visible = false;
      return;
    }

    if (liquidMeshRef.current) liquidMeshRef.current.visible = true;
    if (meniscusMeshRef.current) meniscusMeshRef.current.visible = true;
    if (causticMeshRef.current) causticMeshRef.current.visible = true;

    // Actual liquid fill height in local space using smooth fill fraction
    const fillY = baseY + maxHeight * fillFraction;
    uniforms.uFillY.value = fillY;

    const surfaceR = getVesselInnerRadius(vesselType, fillY - baseY);
    uniforms.uSurfaceRadius.value = surfaceR;

    // Update liquid color and turbidity
    const liquidColorHex = vessel.liquidColor || '#38bdf8';
    _scratchTargetColor.set(liquidColorHex);
    uniforms.uLiquidColor.value.lerp(_scratchTargetColor, 0.1);
    liquidMaterial.color.copy(uniforms.uLiquidColor.value);
    liquidMaterial.attenuationColor.copy(uniforms.uLiquidColor.value);
    meniscusMaterial.color.copy(uniforms.uLiquidColor.value);

    // Dynamic Turbidity & Cloudiness from physical simulation
    const simMgr = SimulationEngine.getManager(vesselId);
    let targetTurbidity = vessel.hasPrecipitate ? 0.85 : 0.0;
    if (simMgr && simMgr.precipitationSystem.cloudiness > 0.001) {
      targetTurbidity = Math.max(targetTurbidity, simMgr.precipitationSystem.cloudiness);
    }
    uniforms.uTurbidity.value = THREE.MathUtils.lerp(uniforms.uTurbidity.value, targetTurbidity, 0.08);

    // Dynamic Boiling intensity from thermal phase & physical bubble engine
    const isTempBoiling = (vessel.temperature_c ?? 25) >= 98;
    let targetBoiling = (vessel.isBoiling || isTempBoiling)
      ? (vessel.boilingIntensity || (isTempBoiling ? Math.min(1.0, (vessel.temperature_c - 95) / 5) : 0.7))
      : 0.0;
    if (simMgr && simMgr.boilingSystem.bubbles.length > 0) {
      targetBoiling = Math.max(targetBoiling, simMgr.boilingSystem.bubbles.length / simMgr.boilingSystem.maxBubbles);
    }
    uniforms.uBoilingIntensity.value = THREE.MathUtils.lerp(uniforms.uBoilingIntensity.value, targetBoiling, 0.1);

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

      const accX = -omega * omega * sl.x - 2 * zeta * omega * sl.vx + forceX;
      const accZ = -omega * omega * sl.z - 2 * zeta * omega * sl.vz + forceZ;

      sl.vx += accX * dt;
      sl.vz += accZ * dt;
      sl.x += sl.vx * dt;
      sl.z += sl.vz * dt;

      // Bound max slosh tilt
      sl.x = Math.max(-0.45, Math.min(0.45, sl.x));
      sl.z = Math.max(-0.45, Math.min(0.45, sl.z));

      // Dynamic motion ripple speed and directional propagation angle
      const sloshSpeed = Math.hypot(sl.vx, sl.vz) + _scratchVel.length() * 0.14;
      const sloshAngle = Math.atan2(sl.vz, sl.vx);
      uniforms.uSloshSpeed.value = THREE.MathUtils.lerp(uniforms.uSloshSpeed.value, Math.min(0.65, sloshSpeed), 0.2);
      uniforms.uSloshAngle.value = sloshAngle;
    } else {
      uniforms.uSloshSpeed.value = THREE.MathUtils.lerp(uniforms.uSloshSpeed.value, 0.0, 0.1);
    }

    // 1. Mixing Plume from active pouring session
    const session = PourController.getSession();
    if (session && session.targetId === vesselId && session.mixingZone?.active) {
      uniforms.uMixingPoint.value.set(...session.mixingZone.point);
      uniforms.uMixingRadius.value = THREE.MathUtils.lerp(uniforms.uMixingRadius.value, session.mixingZone.radius, 0.2);
      _scratchTargetColor.set(session.mixingZone.color);
      uniforms.uMixingColor.value.lerp(_scratchTargetColor, 0.2);
      uniforms.uMixingStrength.value = THREE.MathUtils.lerp(uniforms.uMixingStrength.value, session.mixingZone.intensity, 0.25);
    } else {
      uniforms.uMixingStrength.value = THREE.MathUtils.lerp(uniforms.uMixingStrength.value, 0.0, 0.08);
    }

    // 2. Gravity-aligned clipping plane and meniscus disk
    // Get container world quaternion
    meshGroupRef.current.getWorldQuaternion(_scratchQuat);
    const invContainerQuat = _scratchQuat.clone().invert();

    // World gravity normal with dynamic slosh perturbation
    const worldGravityNormal = new THREE.Vector3(sl.x, -1.0, sl.z).normalize();
    // Transform into local space so that when matrixWorld rotates, the plane normal remains strictly vertical in world space!
    _scratchNormal.copy(worldGravityNormal).applyQuaternion(invContainerQuat);
    _localPlane.normal.copy(_scratchNormal);
    _localPlane.constant = -_scratchNormal.y * fillY;

    // Transform clipping plane into world space for WebGL local clipping
    clippingPlane.copy(_localPlane).applyMatrix4(meshGroupRef.current.matrixWorld);

    // Orient meniscus surface disk according to local upward gravity normal
    if (meniscusMeshRef.current) {
      meniscusMeshRef.current.position.set(0, fillY, 0);
      meniscusMeshRef.current.scale.set(surfaceR, surfaceR, 1.0);

      // Local upward normal
      const localUpNormal = new THREE.Vector3(-sl.x, 1.0, -sl.z).normalize().applyQuaternion(invContainerQuat);
      _scratchQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localUpNormal);
      meniscusMeshRef.current.quaternion.copy(_scratchQuat);
    }

    // Update caustic projector quad under vessel
    if (causticMeshRef.current) {
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
        <circleGeometry args={[1.0, 32]} />
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
