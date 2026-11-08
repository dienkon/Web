import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { liquidOptics, blendLiquidOptics } from '../src/pour/physics/mixing';
import { spillAbsorptionPerMeter, spillTransmittance, spillFresnel, SPILL_COLOR_REFERENCE_M } from '../src/science/spillOptics';
import { createSpillOpticalMaterials, shadeSpillVolume } from '../src/vfx/materials/spillOpticalMaterial';
import { METERS_PER_SCENE_UNIT as U } from '../src/science/sceneUnits';

describe('Finite puddle absorption and a single liquid/air interface', () => {
  it('lets colorless water reveal the sample with no fictitious white extinction', () => {
    const coefficient = spillAbsorptionPerMeter('#ffffff');
    expect(spillTransmittance(coefficient, 0.1)).toEqual([1, 1, 1]);
    expect(spillTransmittance(spillAbsorptionPerMeter('#2378e2'), 0)).toEqual([1, 1, 1]);
    expect(spillFresnel(1)).toBeCloseTo(0.02037318784, 9);
    expect(spillFresnel(0)).toBe(1);
  });
  it('matches an independent half/quarter transmission reference and composes consecutive optical paths', () => {
    const saved = { hex: '#abcdef', absorbance: [Math.log(2), Math.log(4), 0] as [number, number, number] };
    const coefficient = spillAbsorptionPerMeter(saved.hex, saved), transmission = spillTransmittance(coefficient, SPILL_COLOR_REFERENCE_M);
    expect(transmission[0]).toBeCloseTo(0.5, 12); expect(transmission[1]).toBeCloseTo(0.25, 12); expect(transmission[2]).toBe(1);
    const a = spillTransmittance(coefficient, 0.001), b = spillTransmittance(coefficient, 0.002), ab = spillTransmittance(coefficient, 0.003);
    for (let i = 0; i < 3; i++) expect(a[i] * b[i]).toBeCloseTo(ab[i], 12);
    expect(spillTransmittance(coefficient, 0.001)[0]).toBeGreaterThan(spillTransmittance(coefficient, 0.003)[0]);
  });
  it('retains unrounded optical mixing and ignores an obsolete color receipt after chemistry changes the color', () => {
    const original = liquidOptics('#123456'), water = liquidOptics('#ffffff');
    const mixed = blendLiquidOptics(original, 1, water, 3), snapshot = structuredClone(mixed);
    const coefficient = spillAbsorptionPerMeter(mixed.hex, mixed);
    for (let i = 0; i < 3; i++) expect(coefficient[i] / spillAbsorptionPerMeter(original.hex, original)[i]).toBeCloseTo(0.25, 12);
    expect(spillAbsorptionPerMeter('#ffffff', mixed)).toEqual([0, 0, 0]); expect(mixed).toEqual(snapshot);
  });
  it('uses scene distances consistently for attenuation and bounds grazing paths by the body diameter', () => {
    for (const refractive of [false, true]) {
      const material = createSpillOpticalMaterials(refractive), coefficient = [200, 100, 0], chord_m = 0.025;
      material.update(coefficient, chord_m);
      if (material.volume instanceof THREE.MeshPhysicalMaterial) {
        expect(material.volume.opacity).toBe(1); expect(material.volume.clearcoat).toBe(0);
        expect(material.volume.attenuationDistance * U).toBe(SPILL_COLOR_REFERENCE_M);
        expect(material.volume.attenuationColor.r).toBeCloseTo(Math.exp(-2), 12);
        const shader = { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader,
          uniforms: {} } as Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0];
        shadeSpillVolume(shader, { value: chord_m / U });
        expect(shader.uniforms.uSpillMaxPath.value * U).toBe(chord_m);
        expect(shader.fragmentShader).toContain('vSpillHeight / max(0.0001, abs(spillRay.y))');
        expect(shader.fragmentShader).toContain('#include <tonemapping_fragment>');
        expect(shader.vertexShader).not.toContain('transformed.y +=');
      } else {
        expect(material.volume.uniforms.uSpillAbsorption.value.x / U).toBeCloseTo(200, 12);
        expect(material.volume.uniforms.uSpillMaxPath.value * U).toBe(chord_m);
        expect(material.reflection!.transmission).toBe(0);
        expect(material.volume.fragmentShader).not.toContain('sampler');
      }
      material.dispose();
    }
  });
});
