import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bubbleOpacity, precipitateOpacity, precipitateFinish, withParticleOpacity } from '../src/simulation/render/particleAppearance';
import { createPrecipitateGeometry } from '../src/simulation/render/precipitateGeometry';
import { PRECIPITATE_PROFILES } from '../src/simulation/core/SimulationConfig';
import { getBenchNormalTexture } from '../src/vfx/materials/benchNormal';
import { liquidOpacity, suspensionColorWeight } from '../src/science/liquidOptics';

describe('state-driven optical particles', () => {
  it('keeps dissolved color in a clear sample and pigment color in an opaque suspension', () => {
    for (const hex of ['#ffffff', '#38bdf8', '#0f172a']) {
      expect(suspensionColorWeight(hex, 0)).toBe(0);
      expect(suspensionColorWeight(hex, 1)).toBe(1);
      expect(suspensionColorWeight(hex, NaN)).toBe(0);
    }
  });
  it('composites pigment with the transparent solvent without diluting chroma twice', () => {
    const t = 0.25, alpha = liquidOpacity('#ffffff', t);
    const weight = suspensionColorWeight('#ffffff', t);
    // Pure red scatter plus neutral clear water. Premultiplied green only
    // comes from the retained solvent fraction, not from a second white mix.
    const green = (1 - weight) * alpha;
    expect(green).toBeCloseTo(liquidOpacity('#ffffff', 0) * (1 - t), 12);
    expect(weight).toBeGreaterThan(0.7);
    expect(suspensionColorWeight('#38bdf8', t)).toBeLessThan(weight);
  });
  it('uses upward tangent-space bench normals, with neutral color space and filtered mipmaps', () => {
    const texture = getBenchNormalTexture(), bytes = texture.image.data;
    expect(getBenchNormalTexture()).toBe(texture);
    expect(texture.colorSpace).toBe(THREE.NoColorSpace);
    expect(texture.generateMipmaps).toBe(true);
    for (let i = 0; i < bytes.length; i += 4) {
      expect(Math.abs(bytes[i] - 127.5)).toBeLessThan(6);
      expect(Math.abs(bytes[i + 1] - 127.5)).toBeLessThan(6);
      expect(bytes[i + 2]).toBeGreaterThanOrEqual(254);
    }
  });
  it('honors physical burst drainage and rejects invalid opacity without creating a second gas clock', () => {
    expect([0.88, 0.44, 0].map(value => bubbleOpacity({ opacity: value }))).toEqual([0.88, 0.44, 0]);
    expect(bubbleOpacity({ opacity: NaN })).toBe(0);
    expect(bubbleOpacity({ opacity: 2 })).toBe(1);
  });
  it('keeps every reduced/full aggregate inside its unit contact envelope', () => {
    for (const profile of Object.values(PRECIPITATE_PROFILES)) for (const detail of ['full', 'reduced'] as const) {
      const geometry = createPrecipitateGeometry(profile, detail);
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        expect(Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i))).toBeLessThanOrEqual(1.00001);
      }
      geometry.dispose();
    }
  });
  it('keeps opacity and specular response tied to each species profile', () => {
    for (const p of Object.values(PRECIPITATE_PROFILES)) {
      const finish = precipitateFinish(p);
      expect(finish.metalness).toBe(p.metalness ?? 0);
      expect(finish.specularIntensity).toBe(p.specularReflectivity);
      expect(precipitateOpacity({ opacity: 0 }, p)).toBe(0);
      expect(precipitateOpacity({ opacity: 0.92 }, p)).toBeCloseTo(p.morphology === 'gel_like' ? 0.6256 : 0.92, 10);
    }
  });
  it('preserves prior shader modifications and Three color/lighting transforms', () => {
    const material = new THREE.MeshPhysicalMaterial();
    material.onBeforeCompile = s => { s.uniforms.retained = { value: 17 }; };
    withParticleOpacity(material);
    const shader = { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} as Record<string, unknown> };
    material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0], null!);
    expect(shader.uniforms.retained).toEqual({ value: 17 });
    expect(shader.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(shader.fragmentShader).toContain('#include <colorspace_fragment>');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= clamp(vParticleOpacity');
    material.dispose();
  });
});
