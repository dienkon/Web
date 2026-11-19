import * as THREE from 'three';
import { random, drawnTexture } from './materials.js';

export const swarmGLSL = `
  vec3 cluster(float id, float t, float spread) {
    float a = id * 2.399963;
    float b = sin(id*1.731);
    vec3 nest = vec3(cos(a)*(1.3+mod(id,4.0)*.63), sin(a)*(.88+mod(id,4.0)*.42), b*1.48);
    vec3 flow = vec3(1.1*sin(t*.63+a)+cos(t*.29+a)*.65, sin(t*.91+a)*.75, cos(t*.67+a)*1.25);
    return nest + flow*spread + vec3(spread*.68, spread*.27, spread*1.25);
  }
  float flap(float id, float t) {
    return sin(t*(9.5 + mod(id, 6.)*.82) + id*1.63);
  }
`;

export function swarmPoint(id, t, spread, out) {
  const a = id * 2.399963;
  return out.set(
    Math.cos(a) * (1.3 + (id % 4) * .63) + spread * (1.1 * Math.sin(t * .63 + a) + Math.cos(t * .29 + a) * .65 + .68),
    Math.sin(a) * (.88 + (id % 4) * .42) + spread * (Math.sin(t * .91 + a) * .75 + .27),
    Math.sin(id * 1.731) * 1.48 + spread * (Math.cos(t * .67 + a) * 1.25 + 1.25),
  );
}

function wings() {
  return drawnTexture(256, 256, (ctx) => {
    ctx.translate(0, 256);
    ctx.scale(1, -1);
    const paint = ctx.createLinearGradient(0, 100, 225, 190);
    paint.addColorStop(0, '#d88555');
    paint.addColorStop(.46, '#f5bc72');
    paint.addColorStop(.78, '#fff0ab');
    paint.addColorStop(1, '#d898e1');
    ctx.beginPath();
    ctx.moveTo(6, 106);
    ctx.bezierCurveTo(34, 229, 198, 266, 244, 226);
    ctx.bezierCurveTo(261, 195, 204, 144, 144, 109);
    ctx.bezierCurveTo(214, 82, 167, 8, 105, 17);
    ctx.bezierCurveTo(45, 15, 15, 71, 6, 106);
    ctx.closePath();
    ctx.fillStyle = paint;
    ctx.fill();
    ctx.strokeStyle = '#fff1c0';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const [x, y, radius] of [[224,215,5],[209,202,5],[192,185,4],[166,176,4],[134,48,7],[146,73,4],[95,31,4]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 1.4, .5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff0b7';
      ctx.fill();
    }
    ctx.strokeStyle = '#832e56aa';
    ctx.lineWidth = 1.5;
    for (const [x, y] of [[225,226],[204,180],[161,152],[143,107],[159,60],[104,23]]) {
      ctx.beginPath(); ctx.moveTo(8, 105); ctx.quadraticCurveTo(x * .54, y * .83, x, y); ctx.stroke();
    }
  });
}

export const butterflyCount = 26;

export function makeSwarm(amount = butterflyCount) {
  const rand = random(15);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,-.48,0, 1,-.48,-.09, 1,.52,.09, 0,.52,0,
    0,-.48,0, -1,-.48,-.09, -1,.52,.09, 0,.52,0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0,0, 1,0, 1,1, 0,1, 0,0, 1,0, 1,1, 0,1,
  ], 2));
  geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6]);
  const ids = new Float32Array(amount);
  const sizes = new Float32Array(amount);
  for (let i = 0; i < amount; i++) { ids[i] = i; sizes[i] = .16 + rand() * .18; }
  geometry.setAttribute('ident', new THREE.InstancedBufferAttribute(ids, 1));
  geometry.setAttribute('wingSize', new THREE.InstancedBufferAttribute(sizes, 1));
  geometry.instanceCount = amount;
  const uniforms = { clock: { value: 0 }, spread: { value: 0 }, opacity: { value: 0 }, atlas: { value: wings() } };
  const material = new THREE.ShaderMaterial({
    uniforms, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    vertexShader: `
      uniform float clock, spread; attribute float ident, wingSize; varying vec2 coords; varying float tint;
      ${swarmGLSL}
      void main() {
        vec3 p = position;
        float f = flap(ident,clock)*.88;
        p.z += abs(p.x)*sin(f);
        p.x *= cos(f);
        p.y += .13*sin(ident + clock);
        float tilt = sin(ident*1.71+clock*.78)*.46;
        p.xy = mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p.xy;
        p = p*wingSize + cluster(ident,clock,spread);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
        coords = uv; tint = fract(ident*.47);
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas; uniform float opacity; varying vec2 coords; varying float tint;
      void main() {
        vec4 c = texture2D(atlas,coords);
        if (c.a < .03) discard;
        c.rgb *= mix(vec3(1.28,.95,.77),vec3(.94,.77,1.28),tint);
        gl_FragColor = vec4(c.rgb,c.a*opacity);
        #include <colorspace_fragment>
      }
    `,
  });
  const butterflies = new THREE.Mesh(geometry, material);
  butterflies.frustumCulled = false;
  const trailGeometry = new THREE.BufferGeometry();
  const pointsPerTrail = 11;
  const positions = new Float32Array(amount * pointsPerTrail * 3);
  const trailAlpha = new Float32Array(amount * pointsPerTrail);
  const trailIndices = [];
  for (let id = 0; id < amount; id++) {
    for (let j = 0; j < pointsPerTrail; j++) {
      const index = id * pointsPerTrail + j;
      trailAlpha[index] = (1 - j / (pointsPerTrail - 1)) ** 2;
      if (j > 0) trailIndices.push(index - 1, index);
    }
  }
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  trailGeometry.setAttribute('intensity', new THREE.BufferAttribute(trailAlpha,1));
  trailGeometry.setIndex(trailIndices);
  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: { opacity: uniforms.opacity },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float intensity; varying float strength;
      void main() { strength=intensity; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      uniform float opacity; varying float strength;
      void main() { gl_FragColor=vec4(1.,.69,.39,strength*opacity*.37); }
    `,
  });
  const trail = new THREE.LineSegments(trailGeometry, trailMaterial);
  trail.frustumCulled = false;
  const group = new THREE.Group();
  group.add(trail, butterflies);
  const point = new THREE.Vector3();
  return {
    group,
    update(time, opacity, spread) {
      group.visible = opacity > .005;
      if (!group.visible) return;
      uniforms.clock.value = time;
      uniforms.opacity.value = opacity;
      uniforms.spread.value = spread;
      for (let id = 0; id < amount; id++) {
        for (let j = 0; j < pointsPerTrail; j++) {
          swarmPoint(id, time - j * .065, spread, point);
          point.toArray(positions, (id * pointsPerTrail + j) * 3);
        }
      }
      trailGeometry.attributes.position.needsUpdate = true;
    },
  };
}
