import React, { useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { SessileDropShape } from '../../science/sessileDrop';
import type { spillSuspensionAppearance } from '../../science/spillSuspension';
import { getNoiseTexture } from '../../vfx/textures';
import { METERS_PER_SCENE_UNIT as U } from '../../science/sceneUnits';

/** 28 degree repose is the existing illustrative dry-powder assumption. */
export function powderPileDimensions(bulkVolume_m3: number) {
  const tangent = Math.tan(28 * Math.PI / 180);
  const radius_m = Math.cbrt(3 * Math.max(0, bulkVolume_m3) / (Math.PI * tangent));
  return { radius_m, height_m: radius_m * tangent };
}

export function PowderDeposit({ id, bulkVolume_m3, color }: { id: string; bulkVolume_m3: number; color: THREE.Color }) {
  const texture = useMemo(() => getNoiseTexture(128, 128), []);
  if (!(bulkVolume_m3 > 0)) return null;
  const { radius_m, height_m } = powderPileDimensions(bulkVolume_m3);
  return <mesh name={`spill-powder:${id}`} position={[0, height_m / U / 2, 0]} scale={[radius_m / U, height_m / U, radius_m / U]} receiveShadow>
    <coneGeometry args={[1, 1, 48]} />
    <meshStandardMaterial color={color} roughness={0.98} bumpMap={texture} bumpScale={0.001} />
  </mesh>;
}

export function weightedSpillColor(samples: { color: string; weight: number }[]) {
  const color = new THREE.Color(0, 0, 0), part = new THREE.Color(); let sum = 0;
  for (const sample of samples) if (sample.weight > 0) { part.set(sample.color).multiplyScalar(sample.weight); color.add(part); sum += sample.weight; }
  return sum > 0 ? color.multiplyScalar(1 / sum) : color.set('#ffffff');
}

/** Full-footprint wet bed. Scaling a closed volume mesh in y preserves its
 * volume exactly (within the existing tessellation error), without rebuilding
 * thousands of triangles on each mass update. Grain noise is visual only. */
export function SpillPrecipitateBed({ id, appearance, drop, geometry }: { id: string;
  appearance: ReturnType<typeof spillSuspensionAppearance>; drop: SessileDropShape | null; geometry: THREE.BufferGeometry | null }) {
  const texture = useMemo(() => getNoiseTexture(128, 128), []);
  const color = useMemo(() => weightedSpillColor(appearance.bed), [appearance]);
  const extinction = useMemo(() => ({ value: 0 }), []);
  useLayoutEffect(() => { extinction.value = appearance.bedExtinction_per_m; }, [appearance, extinction]);
  const shadeCoverage = useMemo(() => (shader: Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0]) => {
    shader.uniforms.uBedExtinction = extinction;
    shader.vertexShader = `varying float vBedDepth_m;\n${shader.vertexShader}`.replace('#include <begin_vertex>',
      `#include <begin_vertex>\nvBedDepth_m = max(position.y, 0.0) * length(modelMatrix[1].xyz) * ${U};`);
    shader.fragmentShader = `varying float vBedDepth_m;\nuniform float uBedExtinction;\n${shader.fragmentShader}`
      .replace('#include <alphahash_fragment>', 'diffuseColor.a *= 1.0 - exp(-uBedExtinction * vBedDepth_m);\n#include <alphahash_fragment>');
  }, [extinction]);
  if (!(appearance.bedVolume_m3 > 0)) return null;
  if (!drop || !geometry) return <PowderDeposit id={`precipitate:${id}`} bulkVolume_m3={appearance.bedVolume_m3} color={color} />;
  return <mesh name={`spill-sediment:${id}`} geometry={geometry} scale={[1, appearance.bedVolume_m3 / drop.volume_m3, 1]} receiveShadow>
    <meshStandardMaterial color={color} roughness={0.9} bumpMap={texture} bumpScale={0.001} alphaHash
      onBeforeCompile={shadeCoverage} customProgramCacheKey={() => 'finite-spill-bed-coverage-v1'} />
  </mesh>;
}
