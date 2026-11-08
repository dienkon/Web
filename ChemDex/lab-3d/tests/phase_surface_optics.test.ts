import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { shadeFoamCells, FOAM_CELL_DIAMETER_M } from '../src/vfx/materials/foamAppearance';
import { iceSurfaceFinish, shadeIceInterior } from '../src/vfx/materials/iceAppearance';
import { stockSolidMaterial } from '../src/science/stockAppearance';
import { findChemical } from '../src/data/chemicals';

const shader = () => ({ vertexShader: THREE.ShaderLib.physical.vertexShader,
  fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} } as Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0]);

describe('foam, ice and macroscopic stock surface optics', () => {
  it('keeps the foam cell field inside the standard lit material, with no new opacity or gas source', () => {
    expect(FOAM_CELL_DIAMETER_M).toBeGreaterThan(0);
    for (const top of [false, true]) {
      const s = shader(); shadeFoamCells(s, { value: 12 }, { value: 1 }, top);
      expect(s.fragmentShader).toContain('#include <lights_physical_fragment>');
      expect(s.fragmentShader).toContain('#include <tonemapping_fragment>');
      expect(s.fragmentShader).toContain('#include <colorspace_fragment>');
      expect(s.fragmentShader).not.toContain('diffuseColor.a *=');
      expect(s.fragmentShader).not.toContain('uniform float uTime');
    }
  });
  it('only uses the wet finish with an actual liquid phase at the melt boundary', () => {
    expect(iceSurfaceFinish(-10, 0).wet).toBe(false);
    expect(iceSurfaceFinish(0, 0).wet).toBe(false);
    expect(iceSurfaceFinish(-10, 20).wet).toBe(false);
    expect(iceSurfaceFinish(0, 20).wet).toBe(true);
    expect(iceSurfaceFinish(0, 20).roughness).toBeLessThan(iceSurfaceFinish(-10, 0).roughness);
    const s = shader(); shadeIceInterior(s);
    expect(s.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(s.fragmentShader).not.toContain('uniform float uTime');
  });
  it('adds directional metal highlights while keeping ionic hydrates dielectric', () => {
    const foil = stockSolidMaterial(findChemical('Al (foil)'), 'FOIL');
    const hydrate = stockSolidMaterial(findChemical('CuSO4·5H2O'), 'HYDRATE_CRYSTAL');
    expect(foil.anisotropy).toBeGreaterThan(0);
    expect(hydrate.anisotropy).toBe(0); expect(hydrate.metalness).toBe(0);
    expect(hydrate.flatShading).toBe(true);
    expect(stockSolidMaterial(findChemical('Mg (powder)'), 'POWDER').anisotropy).toBe(0);
  });
});
