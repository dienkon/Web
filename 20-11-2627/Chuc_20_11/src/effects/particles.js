import * as THREE from 'three';
import { random } from './materials.js';
import { swarmGLSL, butterflyCount } from './flight.js';

function heartPoint(angle, scale, depth, out, index) {
  const sin = Math.sin(angle);
  const cos = Math.cos;
  out[index] = sin ** 3 * 2.14 * scale;
  out[index + 1] = (13 * cos(angle) - 5 * cos(2 * angle) - 2 * cos(3 * angle) - cos(4 * angle)) * .134 * scale + .38;
  out[index + 2] = depth;
}

function heartAngles() {
  const path = [];
  const point = new Float32Array(3);
  let previousX, previousY, distance=0;
  for(let i=0;i<=2048;i++) {
    const angle=i/2048*Math.PI*2;
    heartPoint(angle,1,0,point,0);
    const [x,y]=point;
    if(i) distance+=Math.hypot(x-previousX,y-previousY);
    previousX=x;
    previousY=y;
    path.push({angle,distance});
  }
  let right=1;
  return Array.from({length:1024},(_,index)=>{
    const sample=index/1024*distance;
    while(path[right].distance<sample) right++;
    const a=path[right-1],b=path[right];
    return THREE.MathUtils.lerp(a.angle,b.angle,(sample-a.distance)/(b.distance-a.distance));
  });
}

function typePixels(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 1050;
  canvas.height = 340;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = lines.length === 1 ? '500 310px "Cormorant Garamond", Georgia' : '600 78px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const y = canvas.height / 2 + (index - (lines.length - 1) / 2) * 105;
    ctx.fillText(line, canvas.width / 2, y, canvas.width - 12);
  });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const points = [];
  let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3] < 145) continue;
      points.push([x, y]);
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  const height = Math.max(1, bottom - top);
  return points.map(([x,y]) => [(x - (left + right) / 2) / height, ((top + bottom) / 2 - y) / height]);
}

export function makeParticles(maximum) {
  const rand = random(2011);
  const scatter = new Float32Array(maximum * 3);
  const target = new Float32Array(maximum * 3);
  const wing = new Float32Array(maximum * 3);
  const seedTarget = new Float32Array(maximum * 3);
  const type = new Float32Array(maximum * 3);
  const colors = new Float32Array(maximum * 3);
  const size = new Float32Array(maximum);
  const phase = new Float32Array(maximum);
  const seed = new Float32Array(maximum);
  const angles = heartAngles();
  const palette = ['#ffd486', '#ffad6e', '#fff0b4', '#ed8ab8', '#ffdcb4', '#a9adf3'].map((color) => new THREE.Color(color));
  for (let i = 0; i < maximum; i++) {
    const j = i * 3;
    scatter[j] = (rand() - .5) * 20;
    scatter[j + 1] = (rand() - .48) * 12;
    scatter[j + 2] = (rand() - .58) * 11;
    const a = angles[Math.floor(rand() * angles.length)];
    const perimeter = rand() > .34;
    const radial = perimeter ? .89 + rand() * .17 : .24 + Math.sqrt(rand()) * .73;
    heartPoint(a, radial, (rand() - .5) * Math.sqrt(Math.max(.13, 1.05 - radial)) * 2.9, target, j);
    const lobe = rand() > .32;
    const theta = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand());
    wing[j] = (rand() > .5 ? 1 : -1) * (.13 + rr * Math.cos(theta) * (lobe ? .16 : .095));
    wing[j + 1] = (lobe ? .055 : -.07) + rr * Math.sin(theta) * (lobe ? .145 : .087);
    wing[j + 2] = (rand() - .5) * .055;
    seedTarget[j] = (rand() - .5) * 13;
    seedTarget[j + 1] = -2.45 + rand() * .35;
    seedTarget[j + 2] = (rand() - .75) * 7;
    palette[Math.floor(rand() * palette.length)].toArray(colors, j);
    size[i] = .42 + rand() ** 3 * 2.95;
    phase[i] = rand() * Math.PI * 2;
    seed[i] = rand();
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, values, components] of [
    ['position', scatter, 3], ['targetPosition', target, 3], ['wingTarget', wing, 3],
    ['seedTarget', seedTarget, 3], ['typeTarget', type, 3], ['color', colors, 3],
    ['size', size, 1], ['phase', phase, 1], ['randomSeed', seed, 1],
  ]) geometry.setAttribute(name, new THREE.BufferAttribute(values, components));
  const uniforms = {
    clock: { value: 0 }, heart: { value: 0 }, morph: { value: 0 }, flight: { value: 0 },
    textMorph: { value: 0 }, sink: { value: 0 }, burst: { value: 0 }, density: { value: 1 },
    strength: { value: .5 }, pixelRatio: { value: 1 }, typeSize: { value: 1 },
    typeCenter: { value: new THREE.Vector3() }, orbit: { value: 0 }, still: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 targetPosition, wingTarget, seedTarget, typeTarget, color;
      attribute float size, phase, randomSeed;
      uniform float clock, heart, morph, flight, textMorph, sink, burst, density, strength, pixelRatio, typeSize, orbit, still;
      uniform vec3 typeCenter;
      varying vec3 tint; varying float intensity; varying float sparkle;
      ${swarmGLSL}
      vec3 drift(vec3 p, float t) {
        return vec3(sin(p.y*1.8+t)*cos(p.z*.92-t*.47),sin(p.x*1.36-t*.9)*cos(p.z+t*.5),cos(p.x*.65+p.y*.8+t*.8));
      }
      void main() {
        float t = clock;
        float pulse = pow(max(0.,sin(t*2.1)),13.)*.06*(1.-still);
        float sling = 1.-smoothstep(.38,1.,morph);
        vec3 target = targetPosition*(1.+pulse*sling);
        float escaping = step(.969, randomSeed)*pow(.5+.5*sin(t*.87+phase),5.)*(1.-still);
        target += normalize(targetPosition+vec3(.001)) * escaping * (.4+randomSeed);
        target += drift(target,t*.65+phase)*.043*(1.-still);
        float curl = sin(heart*3.14159)*(2.6+randomSeed);
        vec3 loose = position;
        loose.xz = mat2(cos(curl),-sin(curl),sin(curl),cos(curl))*loose.xz;
        loose += drift(position,t*.45+phase)*.19;
        vec3 point = mix(loose,target,heart);
        float id = floor(randomSeed*${butterflyCount}.);
        vec3 wings = wingTarget;
        float f = flap(id,t)*.88;
        wings.z += abs(wings.x)*sin(f);
        wings.x *= cos(f);
        wings += cluster(id,t,flight);
        float arc = sin(morph*3.14159);
        point = mix(point,wings,morph) + arc*vec3(
          cos(phase+morph*8.+point.y)*1.25, sin(phase+morph*8.+point.x)*1.05, sin(phase+morph*8.+point.x)*1.4
        );
        point += burst*vec3(cos(phase)*(1.+randomSeed*2.),sin(phase)*(1.+randomSeed*1.6),randomSeed*2.);
        vec3 origin = vec3(.2,1.25,1.8);
        vec3 confluence = mix(origin,seedTarget,sink);
        confluence.x += sin(sink*3.14159)*sin(phase+sink*6.)*1.45;
        confluence.y += sin(sink*3.14159)*(.7+cos(phase)*.8);
        point = mix(point,confluence,step(.0001,sink));
        point = mix(point, typeTarget*typeSize + typeCenter, textMorph);
        float cs=cos(orbit*(1.-textMorph)); float sn=sin(orbit*(1.-textMorph));
        point.xz = mat2(cs,-sn,sn,cs)*point.xz;
        vec4 mv = modelViewMatrix*vec4(point,1.);
        gl_Position=projectionMatrix*mv;
        float core = exp(-abs(targetPosition.z)*1.65)*.41;
        float enabled = step(randomSeed,density);
        gl_PointSize = clamp(size*pixelRatio*(14.5/max(2.,-mv.z))*(.85+heart*.3+textMorph*.15),1.,7.)*enabled;
        tint = color;
        sparkle = .72+.28*sin(t*(.91+randomSeed*2.)+phase);
        intensity = strength*(.36+core+size*.13)*enabled;
      }
    `,
    fragmentShader: `
      varying vec3 tint; varying float intensity, sparkle;
      void main() {
        float d = length(gl_PointCoord-.5)*2.;
        if(d>1.) discard;
        float falloff = exp(-d*d*4.3)*(1.-smoothstep(.45,1.,d));
        gl_FragColor = vec4(tint*(1.05+.6*falloff),falloff*intensity*sparkle);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const types = new Map();
  return {
    points, uniforms,
    drawCount(count) { geometry.setDrawRange(0, count); },
    type(lines) {
      const key = lines.join('\n');
      if (!types.has(key)) types.set(key, typePixels(lines));
      const pixels = types.get(key);
      if (!pixels.length) return;
      const choose = random(508);
      for (let i = 0; i < maximum; i++) {
        const [x, y] = pixels[Math.floor(choose() * pixels.length)];
        type[i * 3] = x;
        type[i * 3 + 1] = y;
        type[i * 3 + 2] = (choose() - .5) * .16;
      }
      geometry.attributes.typeTarget.needsUpdate = true;
      return pixels.reduce((width, [x]) => Math.max(width, Math.abs(x) * 2), 1);
    },
    seeds(positions) {
      for (let i = 0; i < maximum; i++) {
        const plant = positions[i % positions.length];
        seedTarget[i * 3] = plant.x + Math.sin(i * 7.7) * .09;
        seedTarget[i * 3 + 1] = plant.y + .09 + Math.cos(i * 5.2) * .07;
        seedTarget[i * 3 + 2] = plant.z + Math.sin(i * 4.9) * .08;
      }
      geometry.attributes.seedTarget.needsUpdate = true;
    },
  };
}

export function makeRipples() {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { clock: { value: 0 }, strength: { value: 0 } },
    vertexShader: `
      varying vec2 coords; void main() { coords=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
    `,
    fragmentShader: `
      uniform float clock,strength; varying vec2 coords;
      void main(){
        float d=length(coords-.5)*2.;
        float ring=fract((clock-.73)*.334);
        float a=exp(-pow((d-ring)*87.,2.))*(1.-ring)*(1.-ring)*strength;
        gl_FragColor=vec4(1.,.65,.31,a*.4);
      }
    `,
  });
  const ripple = new THREE.Mesh(new THREE.PlaneGeometry(9,9), material);
  ripple.rotation.x = -Math.PI / 2.6;
  ripple.position.y = -2.22;
  ripple.position.z = -.7;
  return ripple;
}

export function makeFinalHeart() {
  const rand=random(389);
  const angles=heartAngles();
  const data=new Float32Array(1200*3);
  for(let i=0;i<1200;i++) {
    const a=angles[Math.floor(rand()*angles.length)];
    heartPoint(a,.83+rand()*.22,(rand()-.5)*.64,data,i*3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data,3));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{clock:{value:0},opacity:{value:0},ratio:{value:1}},
    vertexShader:`
      uniform float clock,ratio; varying float glint;
      void main(){
        vec3 p=position;
        p.xy*=1.+pow(max(0.,sin(clock*2.1)),8.)*.045;
        glint=.72+.28*sin(clock+position.x*7.+position.z*5.);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        gl_PointSize=1.8*ratio;
      }
    `,
    fragmentShader:`
      uniform float opacity; varying float glint;
      void main(){float f=max(0.,1.-length(gl_PointCoord-.5)*2.);gl_FragColor=vec4(1.,.75,.43,f*f*glint*opacity);}
    `,
  });
  const heart=new THREE.Points(geometry,material);
  heart.scale.setScalar(.14);
  return heart;
}
