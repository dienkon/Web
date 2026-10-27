import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { NOISE_GLSL } from '../glsl/noise.glsl';
import { useQualityStore } from '../quality';
import { useAppStore } from '../../store/useAppStore';
import { sampleFlameEmission } from '../../engine/flameEmission';

interface ProceduralFlameProps {
  burnerId: string;
  intensity?: number; // 1 to 5
  position?: [number, number, number];
  scale?: number;
}

const FlameVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FlameFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uFlameColor;
uniform float uColorOverride;
varying vec2 vUv;
varying vec3 vWorldPos;

${NOISE_GLSL}

void main() {
  float h = vUv.y; // 0 (base) to 1 (flame tip)
  vec2 p = vUv - vec2(0.5, 0.0);

  // Animate turbulence along vertical flame axis
  float n = fbm(vec3(p.x * 4.5, h * 3.2 - uTime * 2.6, uTime * 0.45));
  float width = mix(0.28, 0.015, pow(h, 0.75)) * (0.75 + 0.35 * uIntensity);
  
  float d = abs(p.x + (n - 0.5) * 0.28 * h) / max(0.001, width);
  float body = (1.0 - smoothstep(0.0, 1.0, d)) * (1.0 - smoothstep(0.5, 1.0, h + (n - 0.5) * 0.28));
  
  // Real laboratory alcohol/Bunsen flame: clean blue base, bright core, warm plume tip
  vec3 defaultCol = mix(vec3(0.22, 0.55, 1.0), vec3(1.0, 0.88, 0.35), smoothstep(0.04, 0.42, h));
  defaultCol = mix(defaultCol, vec3(1.0, 0.42, 0.08), smoothstep(0.55, 0.95, h));

  // Qualitative observed emission colors; RGB is not a single spectral line.
  vec3 emissionCol = mix(vec3(0.18, 0.45, 0.95), uFlameColor, smoothstep(0.08, 0.38, h));
  emissionCol = mix(emissionCol, uFlameColor * 1.25 + vec3(0.15), smoothstep(0.45, 0.88, h));
  vec3 col = mix(defaultCol, emissionCol, uColorOverride);
  
  // High intensity core glow for bloom capture
  float coreGlow = (1.0 - smoothstep(0.0, 0.6, d)) * (1.0 - h * 0.5);
  vec3 finalColor = col * (1.4 + 2.5 * coreGlow);
  float alpha = body * 0.92;

  gl_FragColor = vec4(finalColor, alpha);
  #include <colorspace_fragment>
}
`;

export const ProceduralFlame = React.memo(function ProceduralFlame({
  burnerId,
  intensity = 3,
  position = [0, 0, 0],
  scale = 1.0,
}: ProceduralFlameProps) {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const effectiveTier = useQualityStore(s => s.effectiveTier);

  const emission = useAppStore(state => state.burners[burnerId]?.flameEmission);
  const targetEmissionColorRef = useRef(new THREE.Color('#fb923c'));
  const defaultLightColor = useMemo(() => new THREE.Color('#fb923c'), []);

  // Shader uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uFlameColor: { value: new THREE.Color('#fb923c') },
    uColorOverride: { value: 0.0 },
  }), []);

  const flameMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: FlameVertexShader,
      fragmentShader: FlameFragmentShader,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }, [uniforms]);

  // Pre-allocated cross plane geometry
  const planeGeom = useMemo(() => {
    // 0.45 width x 0.85 height, origin anchored at base
    const geom = new THREE.PlaneGeometry(0.48, 0.85, 12, 16);
    geom.translate(0, 0.85 / 2, 0);
    return geom;
  }, []);

  // Both planes share component-owned resources. Keep intensity/scale changes
  // on uniforms/transforms and release the GPU resources once on unmount.
  useEffect(() => () => { flameMaterial.dispose(); planeGeom.dispose(); }, [flameMaterial, planeGeom]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    flameMaterial.uniforms.uTime.value = t;
    flameMaterial.uniforms.uIntensity.value = intensity;

    const mix = sampleFlameEmission(emission, performance.now());
    flameMaterial.uniforms.uColorOverride.value = mix;
    if (emission && mix > 0) {
      targetEmissionColorRef.current.set(emission.color);
      flameMaterial.uniforms.uFlameColor.value.copy(targetEmissionColorRef.current);
    }

    // Organic light flicker + spectral color shift
    if (lightRef.current) {
      const flicker = Math.sin(t * 14) * 0.15 + Math.cos(t * 22) * 0.12;
      lightRef.current.intensity = (2.2 + flicker) * (intensity / 3) * (1.0 + flameMaterial.uniforms.uColorOverride.value * 0.35);
      lightRef.current.color.copy(defaultLightColor).lerp(
        targetEmissionColorRef.current,
        flameMaterial.uniforms.uColorOverride.value
      );
    }

    // Keep billboards aligned or slowly oscillating
    if (meshRef1.current && meshRef2.current) {
      meshRef1.current.rotation.y = state.camera.rotation.y;
      meshRef2.current.rotation.y = state.camera.rotation.y + Math.PI / 2;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Primary Cross-Plane Procedural Flame */}
      <mesh ref={meshRef1} geometry={planeGeom} material={flameMaterial} dispose={null} />
      <mesh ref={meshRef2} geometry={planeGeom} material={flameMaterial} dispose={null} />

      {/* Illuminating Flame Point Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.35, 0]}
        color="#fb923c"
        intensity={2.4 * (intensity / 3)}
        distance={4.5}
        decay={2}
        castShadow={false}
      />

      {/* High-tier & Ultra-tier Heat-Haze Distortion Quad above flame */}
      {(effectiveTier === 'high' || effectiveTier === 'ultra') && (
        <mesh position={[0, 0.85, 0]}>
          <planeGeometry args={[0.35 * scale, 0.45]} />
          <MeshTransmissionMaterial
            distortion={0.18}
            distortionScale={0.55}
            temporalDistortion={0.35}
            transmission={1.0}
            thickness={0.06}
            ior={1.0}
            roughness={0.05}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
});
