import * as THREE from 'three';
import { asset, memories } from '../config.js';
import { glow } from '../effects/materials.js';

const spacing = 2.53;
const stripLean = (u) => Math.sin(u * Math.PI * 7.5) * .38;

function stripMaterial(rows) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: true,
    uniforms: { rows: { value: rows }, darkness: { value: 1 }, opacity: { value: 1 }, roll: { value: 0 }, focusX: { value: 0 }, clock: { value: 0 } },
    vertexShader: `
      uniform float roll, focusX, clock;
      varying vec2 coords; varying vec3 world;
      void main() {
        coords=uv;
        vec3 p=position;
        p.y+=sin(uv.x*19.+clock*.8)*.045;
        float angle=(p.x-focusX)*.62;
        float radius=(1.12+(uv.y-.5)*.37)*max(.08,1.-roll*.88);
        vec3 coil=vec3(focusX+cos(angle)*radius,(uv.x-.5)*1.02+sin(angle)*radius,sin(angle*.91)*radius);
        p=mix(p,coil,roll);
        world=(modelViewMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*vec4(world,1.);
      }
    `,
    fragmentShader: `
      uniform float rows,darkness,opacity; varying vec2 coords; varying vec3 world;
      void main() {
        vec2 p=coords; float edge=abs(p.y-.5);
        float teeth=abs(fract(p.x*rows)-.5);
        if (teeth<.275 && abs(edge-.392)<.040) discard;
        float rail=(1.-smoothstep(.004,.019,abs(edge-.469)))*.43;
        float rim=(1.-smoothstep(.002,.01,abs(edge-.34)))*.16;
        float d=exp(-abs(world.x-1.5)*.13);
        vec3 body=vec3(.017,.010,.026)+(rail+rim+d*.085)*vec3(.66,.36,.18);
        gl_FragColor=vec4(body*darkness,opacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

function ribbonGeometry(curve, width, segments) {
  const coords = [], uv = [], index = [];
  for (let segment = 0; segment <= segments; segment++) {
    const u = segment / segments;
    const point = curve.getPoint(u);
    const lean = stripLean(u);
    for (const side of [-1, 1]) {
      coords.push(point.x + lean * side, point.y + width / 2 * side, point.z + lean * side * .75);
      uv.push(u, (side + 1) / 2);
    }
    const i = segment * 2;
    if (segment < segments) index.push(i,i+2,i+1,i+1,i+2,i+3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

function imageGeometry(curve, center, u, row, segments) {
  const coords=[], uv=[], index=[];
  const height=row ? 1.13 : 1.36;
  const widthRatio=2.11/spacing;
  const half=widthRatio*.5/segments;
  for(let i=0;i<=12;i++){
    const a=i/12;
    const along=u+(2*a-1)*half;
    const p=curve.getPoint(along);
    const lean=stripLean(along)*height/(row?1.72:2.02);
    for(const sign of [-1,1]){
      coords.push(p.x-center.x+lean*sign,p.y-center.y+height*.5*sign,p.z-center.z+lean*sign*.75);
      uv.push(a,(sign+1)/2);
    }
    const j=i*2;
    if(i<12) index.push(j,j+2,j+1,j+1,j+2,j+3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(index);
  return geometry;
}

export function makeFilm(onRedraw) {
  const group = new THREE.Group();
  const track = new THREE.Group();
  const background = new THREE.Group();
  group.add(background, track);
  const loader = new THREE.TextureLoader();
  const maps = new Map();
  const frames = [];
  const near = new Set();
  const position = new THREE.Vector3();
  const focusGlow = glow('#f0a954', 4.65);
  focusGlow.position.set(2.5, -.15, -5);
  group.add(focusGlow);
  let closed = false;

  for (const [row, layer, plane] of [[0, track, 0], [1, background, -5]]) {
    const nodes = [];
    const count = memories.length;
    for (let i = -1; i <= count; i++) {
      const phase = i * .57 + row * 1.8;
      nodes.push(new THREE.Vector3(spacing * i, Math.sin(phase) * .98 + row * 2.86, Math.cos(phase) * 1.90 + plane));
    }
    const curve = new THREE.CatmullRomCurve3(nodes);
    const strip = new THREE.Mesh(ribbonGeometry(curve, row === 0 ? 2.02 : 1.72, 206), stripMaterial((count + 1) * 5));
    strip.material.uniforms.darkness.value = row === 0 ? 1 : .54;
    layer.add(strip);

    for (let i = 0; i < count; i++) {
      const u = (i + 1) / (nodes.length - 1);
      curve.getPoint(u, position);
      const material = new THREE.MeshBasicMaterial({
        color: row === 0 ? '#b18c6d' : '#6a4e56',
        side: THREE.DoubleSide, transparent: true, fog: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      const defocus = { value: 0 };
      material.onBeforeCompile = (shader) => {
        shader.uniforms.defocus = defocus;
        shader.fragmentShader = 'uniform float defocus;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            diffuseColor *= texture2D(map,vMapUv,defocus);
          #endif
        `);
      };
      const frame = new THREE.Mesh(imageGeometry(curve,position,u,row,nodes.length-1), material);
      frame.position.copy(position);
      frame.position.z += .095;
      frame.userData = { memory: i, row, x: frame.position.x, y: frame.position.y, z: frame.position.z, defocus };
      layer.add(frame);
      frames.push(frame);
    }
  }

  function load(index) {
    if (maps.has(index)) return;
    const variants = frames.filter((frame) => frame.userData.memory === index);
    const map = loader.load(asset(memories[index].image), () => {
      if (closed) { map.dispose(); return; }
      for (const frame of variants) {
        frame.material.map = map;
        frame.material.needsUpdate = true;
      }
      onRedraw();
    });
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    maps.set(index, map);
  }

  return {
    group,
    frames,
    close() { closed = true; for (const map of maps.values()) map.dispose(); },
    update(time, index, focus, roll, drag, compact) {
      const center = compact ? 0 : 3.15;
      track.position.set(center - index * spacing, compact ? -.78 : -.14, 0);
      background.position.set(center + 1.1 - index * spacing * .94, compact ? -.5 : -.24, 0);
      track.rotation.y = drag * .13;
      background.rotation.y = drag * .09;
      focusGlow.position.x = center;
      focusGlow.position.y = compact ? -.9 : -.1;
      near.clear();
      for (const frame of frames) {
        const { memory, row, x, y, z, defocus } = frame.userData;
        const distance = Math.abs(memory - index);
        if (distance < 3.45) near.add(memory);
        frame.visible = distance < 5.6 || roll > .01;
        if (!frame.visible) continue;
        const selected = Math.max(0, 1 - distance * 1.2) * (1 - row);
        defocus.value = Math.min(2.8,distance*.63+row*.75+focus*(1-selected)*.82);
        const coil = Math.max(0, roll - memory * .012) ** 1.2;
        frame.material.opacity = (1 - coil * .96) * (row ? .56 : Math.max(.28, 1 - distance * .16));
        const brightness = (row ? .58 : .69 + selected * .45) * (1 + focus * selected * .14);
        frame.material.color.setRGB(brightness, brightness * .92, brightness * .83);
        frame.position.set(
          x + (index * spacing - x) * coil,
          y + Math.sin(time * .43 + memory) * .022 - y * coil + Math.sin(memory) * coil,
          z + focus * selected * 1.25 + coil * Math.cos(memory * .67) * 2.5,
        );
        frame.rotation.z = coil * (memory * .45 + 1);
        frame.scale.setScalar(1 - .83 * coil);
      }
      for (const index of near) load(index);
      for (const layer of [track, background]) {
        const strip = layer.children[0];
        strip.material.uniforms.opacity.value = 1 - THREE.MathUtils.smoothstep(roll,.55,1);
        strip.material.uniforms.roll.value = roll;
        strip.material.uniforms.focusX.value = index * spacing;
        strip.material.uniforms.clock.value = time;
        strip.rotation.x = roll * .62;
        strip.visible = roll < .98;
      }
    },
  };
}
