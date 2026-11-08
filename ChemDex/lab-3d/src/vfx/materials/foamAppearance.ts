import type * as THREE from 'three';

/** Representative film cells, not a measured detergent microstructure. The
 * finite gas ledger and clipped layer own volume; this shader only shades it. */
export const FOAM_CELL_DIAMETER_M = 0.0015;
type Shader = Parameters<THREE.MeshPhysicalMaterial['onBeforeCompile']>[0];

export function shadeFoamCells(shader: Shader, scale: THREE.IUniform<number>, capRadius: THREE.IUniform<number>, surface: boolean) {
  shader.uniforms.uFoamCellScale = scale;
  shader.uniforms.uFoamCapRadius = capRadius;
  shader.vertexShader = `varying vec3 vFoamPoint;\n${shader.vertexShader}`
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFoamPoint = position;');
  shader.fragmentShader = `
    varying vec3 vFoamPoint;
    uniform float uFoamCellScale;
    uniform float uFoamCapRadius;
    vec2 foamSeed(vec2 p) {
      return 0.5 + 0.33 * sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))));
    }
    vec2 foamCell(vec2 point) {
      vec2 base = floor(point), local = fract(point);
      float nearest = 8.0, second = 8.0;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 delta = offset + foamSeed(base + offset) - local;
        float d = dot(delta, delta);
        second = max(nearest, min(second, d)); nearest = min(nearest, d);
      }
      return vec2(nearest, max(0.0, second - nearest));
    }
    ${shader.fragmentShader}`;
  const point = surface ? 'vFoamPoint.xy * uFoamCapRadius'
    : 'vec2(atan(vFoamPoint.z, vFoamPoint.x + 1e-8) * length(vFoamPoint.xz), vFoamPoint.y)';
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    vec2 foam = foamCell((${point}) * uFoamCellScale);
    float foamWall = 1.0 - smoothstep(0.015, 0.11, foam.y);
    diffuseColor.rgb *= 1.0 - foamWall * 0.42;
  `).replace('#include <roughnessmap_fragment>', `
    #include <roughnessmap_fragment>
    roughnessFactor = mix(0.48, 0.2, foamWall);
  `).replace('#include <normal_fragment_maps>', `
    #include <normal_fragment_maps>
    // Optical film relief in world scene units. Derivatives follow the view
    // and the existing surface normal; they do not move the volume boundary.
    float foamRelief = 0.001 * (1.0 - smoothstep(0.0, 0.5, foam.x));
    vec3 foamDx = dFdx(-vViewPosition), foamDy = dFdy(-vViewPosition);
    vec3 foamR1 = cross(foamDy, normal), foamR2 = cross(normal, foamDx);
    float foamDet = dot(foamDx, foamR1) * faceDirection;
    if (abs(foamDet) > 1e-12) normal = normalize(abs(foamDet) * normal - sign(foamDet)
      * (dFdx(foamRelief) * foamR1 + dFdy(foamRelief) * foamR2));
  `);
}
