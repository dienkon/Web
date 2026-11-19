import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random } from '../effects/materials.js';

const species = [
  { color:'#ffc451', center:'#6c3b29', layers:[[15,.54,.20,.39,.06],[12,.43,.17,.32,.13]] },
  { color:'#e86588', center:'#9d254b', layers:[[9,.40,.29,.22,.13],[8,.31,.25,.17,.24],[6,.21,.19,.10,.34]] },
  { color:'#ec9fd7', center:'#ffd977', layers:[[10,.53,.20,.29,.14],[9,.46,.17,.19,.28],[6,.34,.135,.12,.39]] },
  { color:'#f4baa1', center:'#f28692', layers:[[13,.36,.24,.24,.15],[11,.30,.21,.17,.25],[6,.22,.18,.10,.33]] },
];

function petalGeometry(length, width, curl, frill) {
  const geometry = new THREE.PlaneGeometry(1,1,9,9);
  const coords = geometry.attributes.position;
  for (let index=0;index<coords.count;index++) {
    const u=coords.getX(index)*2;
    const v=coords.getY(index)+.5;
    const shape=Math.sin(Math.PI*v)**.68;
    coords.setXYZ(index,u*width*shape,Math.sin(v*Math.PI)*curl*.25+v*v*curl+frill*Math.cos(u*11)*v**5,v*length);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function bloomGeometry(type) {
  const petals = [];
  for (const [count,length,width,start,level] of species[type].layers) {
    for (let i=0;i<count;i++) {
      const angle=i/count*Math.PI*2+level;
      const petal=petalGeometry(length,width,type===0 ? .08 : .33,type===3 ? .076 : .012);
      petal.translate(0,1+level,start*.64);
      petal.rotateY(angle);
      petals.push(petal);
    }
  }
  const geometry=mergeGeometries(petals);
  for(const petal of petals) petal.dispose();
  return geometry;
}

function leaves() {
  const first=petalGeometry(.54,.17,.12,0);
  first.rotateX(-.41);
  first.rotateY(.9);
  first.translate(0,.38,0);
  const second=petalGeometry(.43,.14,.12,0);
  second.rotateX(-.42);
  second.rotateY(-1.79);
  second.translate(0,.64,0);
  const result=mergeGeometries([first,second]);
  first.dispose();second.dispose();
  return result;
}

function swayingMaterial(color, time, growth, kind, glow) {
  const material = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: glow, roughness: .77, side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.gardenTime=time;
    shader.uniforms.growth=growth;
    shader.vertexShader = 'uniform float gardenTime, growth;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 root=instanceMatrix[3].xyz;
      float phase=root.x*.886+root.z*.51;
      float delay=fract(sin(phase*78.47)*4532.81)*.44;
      float bloom=smoothstep(delay,delay+.53,growth);
      float stem=smoothstep(delay*.77,delay*.77+.46,growth);
      ${kind === 'bloom' ? 'transformed.xz*=max(.002,bloom); transformed.y=(transformed.y-1.)*max(.002,bloom)+1.;' :
        kind === 'leaf' ? 'transformed.xz*=max(.002,smoothstep(delay+.13,delay+.55,growth));' : ''}
      transformed.y*=max(.002,stem);
      transformed.x+=sin(gardenTime*1.32+phase)*pow(max(0.,transformed.y),1.45)*.071;
      transformed.z+=cos(gardenTime*.83+phase)*max(0.,transformed.y)*.039;
    `);
  };
  material.customProgramCacheKey=()=>kind;
  return material;
}

export function makeGarden(maximum) {
  const group = new THREE.Group();
  const rand = random(711);
  const time = { value: 0 }, growth = { value: 0 };
  const skeleton = new THREE.CylinderGeometry(.023,.039,1.09,7);
  skeleton.translate(0,.55,0);
  const foliage = leaves();
  const rings = [];
  const positions = [];
  const focus = new THREE.Object3D();
  for (let i=0;i<maximum;i++) {
    const table = i < 8;
    const type = i % species.length;
    const x = table ? (i%4-1.48)*1.63 + (i>3 ? .57 : 0) : (rand()-.5)*16.6;
    const z = table ? 2.2-(i>>2)*2.68+Math.sin(i*2.7)*.51 : -1-rand()*14;
    const y = -2.82+(rand()-.5)*.36;
    const scale = table ? .81+rand()*.46 : .39+rand()*.7;
    positions.push(new THREE.Vector3(x,y,z));
    rings.push({ type, x,y,z,scale,angle:rand()*6.28, wish:i });
  }
  const meshes=[];
  for (const [i,{color,center}] of species.entries()) {
    const plants=rings.filter(({type})=>type===i);
    const disk = new THREE.SphereGeometry(i===0 ? .32 : .18,12,8);
    disk.scale(1,.29,1);
    disk.translate(0,1.19+(i===0 ? 0 : .14),0);
    for (const [geometry, material, clickable] of [
      [skeleton,swayingMaterial('#558568',time,growth,'stem',.13),false],
      [foliage,swayingMaterial('#61a084',time,growth,'leaf',.13),false],
      [bloomGeometry(i),swayingMaterial(color,time,growth,'bloom',.23),true],
      [disk,swayingMaterial(center,time,growth,'bloom',i===2 ? .30 : .18),true],
    ]) {
      const instances=new THREE.InstancedMesh(geometry,material,plants.length);
      plants.forEach((plant,j)=>{
        focus.position.set(plant.x,plant.y,plant.z);
        focus.rotation.set(.24+Math.sin(plant.angle)*.22,plant.angle,Math.sin(j*1.8)*.21);
        focus.scale.set(plant.scale,plant.scale*(1.14+.25*Math.sin(j*2.4)),plant.scale);
        focus.updateMatrix();
        instances.setMatrixAt(j,focus.matrix);
      });
      if(clickable) {
        instances.userData.plants=plants;
        meshes.push(instances);
      }
      group.add(instances);
    }
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(46,31),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{time},
    vertexShader:`varying vec2 coords;void main(){coords=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 coords;uniform float time;
      void main(){
        float b=exp(-abs(coords.x-.50)*5.0)*sin(coords.y*83.+time*.8+sin(coords.x*19.)*2.);
        float pulse=pow(max(b,0.),7.);
        gl_FragColor=vec4(.13+pulse*.3,.13+pulse*.09,.26+pulse*.2,(.23+pulse*.28)*sin(coords.y*3.14159));
      }
    `,
  }));
  ground.rotation.x=-Math.PI/2;
  ground.position.set(0,-2.93,-7);
  group.add(ground);
  return {
    group, meshes, positions,
    update(clock, progress) { time.value=clock; growth.value=progress; },
  };
}
