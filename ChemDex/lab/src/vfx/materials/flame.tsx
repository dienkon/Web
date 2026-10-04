import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { NOISE_GLSL } from '../glsl/noise.glsl';
import { useQualityStore } from '../quality';

interface ProceduralFlameProps {
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
  float body = smoothstep(1.0, 0.0, d) * smoothstep(1.0, 0.5, h + (n - 0.5) * 0.28);
  
  // Real laboratory alcohol flame: clean blue base, bright yellow-white core, warm orange plume tip
  vec3 col = mix(vec3(0.22, 0.55, 1.0), vec3(1.0, 0.88, 0.35), smoothstep(0.04, 0.42, h));
  col = mix(col, vec3(1.0, 0.42, 0.08), smoothstep(0.55, 0.95, h));
  
  // High intensity core glow for bloom capture
  float coreGlow = smoothstep(0.6, 0.0, d) * (1.0 - h * 0.5);
  vec3 finalColor = col * (1.4 + 2.5 * coreGlow);
  float alpha = body * 0.92;

  gl_FragColor = vec4(finalColor, alpha);
  #include <colorspace_fragment>
}
`;

export const ProceduralFlame = React.memo(function ProceduralFlame({
  intensity = 3,
  position = [0, 0, 0],
  scale = 1.0,
}: ProceduralFlameProps) {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const effectiveTier = useQualityStore(s => s.effectiveTier);

  // Shader uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity },
  }), [intensity]);

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
    const geom = new THREE.PlaneGeometry(0.48 * scale, 0.85 * scale, 12, 16);
    geom.translate(0, (0.85 * scale) / 2, 0);
    return geom;
  }, [scale]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    flameMaterial.uniforms.uTime.value = t;
    flameMaterial.uniforms.uIntensity.value = intensity;

    // Organic light flicker
    if (lightRef.current) {
      const flicker = Math.sin(t * 14) * 0.15 + Math.cos(t * 22) * 0.12;
      lightRef.current.intensity = (2.2 + flicker) * (intensity / 3);
    }

    // Keep billboards aligned or slowly oscillating
    if (meshRef1.current && meshRef2.current) {
      meshRef1.current.rotation.y = state.camera.rotation.y;
      meshRef2.current.rotation.y = state.camera.rotation.y + Math.PI / 2;
    }
  });

  return (
    <group position={position}>
      {/* Primary Cross-Plane Procedural Flame */}
      <mesh ref={meshRef1} geometry={planeGeom} material={flameMaterial} />
      <mesh ref={meshRef2} geometry={planeGeom} material={flameMaterial} />

      {/* Illuminating Flame Point Light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.35 * scale, 0]}
        color="#fb923c"
        intensity={2.4 * (intensity / 3)}
        distance={4.5}
        decay={2}
        castShadow={false}
      />

      {/* High-tier Heat-Haze Distortion Quad above flame */}
      {effectiveTier === 'high' && (
        <mesh position={[0, 0.85 * scale, 0]}>
          <planeGeometry args={[0.35 * scale, 0.45 * scale]} />
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
