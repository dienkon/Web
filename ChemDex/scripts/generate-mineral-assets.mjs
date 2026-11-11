import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'assets/periodic-table/minerals');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.join(root, 'assets/periodic-table/diagrams'), { recursive: true });
const catalog = JSON.parse(await fs.readFile(path.join(root, 'data/mineral-models.json'), 'utf8'));
let seed = 1;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const meshes = [];
function add(geometry, position, scale, rotation, color, metalness = .12, roughness = .58) {
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  g.applyMatrix4(matrix); g.computeVertexNormals();
  meshes.push({ geometry: g, color, metalness, roughness });
}

function crystal(habit, x, y, z, scale, color, spin = 0) {
  const rotation = [(random() - .5) * .38, spin, (random() - .5) * .3];
  if (['hexagonal', 'quartz', 'prismatic', 'needles', 'blades'].includes(habit)) {
    const sides = habit === 'hexagonal' || habit === 'quartz' ? 6 : 4;
    const thin = habit === 'needles' ? .13 : habit === 'blades' ? .16 : .42;
    const wide = habit === 'blades' ? .70 : thin;
    add(new THREE.CylinderGeometry(1, 1, 2, sides, 1, false), [x,y,z], [wide*scale,1.5*scale,thin*scale], rotation, color, .18, .36);
    if (habit === 'quartz' || habit === 'prismatic' || habit === 'needles') {
      add(new THREE.ConeGeometry(1, .9, sides), [x,y+1.5*scale+.22*scale,z], [wide*scale,.5*scale,thin*scale], rotation, color, .18, .36);
    }
    // Fine parallel growth striations follow the prism axis.
    for (let k=0;k<3;k++) add(new THREE.CylinderGeometry(.009,.009,2,5),[x+(k-1)*wide*scale*.4,y,z+thin*scale*.93],[1,1.1*scale,1],rotation,color,.12,.72);
  } else if (habit === 'cubic' || habit === 'rhombohedral') {
    const geo = new THREE.BoxGeometry(1.5,1.5,1.5);
    if (habit === 'rhombohedral') { const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+.42*p.getY(i)); }
    add(geo,[x,y,z],[scale,scale,scale],rotation,color,.36,.37);
    for(let k=0;k<4;k++)add(new THREE.BoxGeometry(1.44,.012,.006),[x,y+(k-1.5)*.22*scale,z+.755*scale],[scale,1,1],[0,0,0],color,.18,.8);
  } else if (habit === 'octahedral' || habit === 'bipyramid' || habit === 'tetrahedral') {
    add(habit === 'tetrahedral' ? new THREE.TetrahedronGeometry(1.1) : new THREE.OctahedronGeometry(1.1),[x,y,z],[scale,scale*(habit==='bipyramid'?1.8:1),scale],rotation,color,.3,.35);
  } else if (habit === 'plates') {
    for(let k=0;k<5;k++)add(new THREE.CylinderGeometry(1,1,.12,6),[x,y+k*.10*scale,z],[scale*(1-k*.07),scale,scale*(1-k*.07)],[rotation[0]+.25,spin+k*.13,.18],color,.65,.36);
  } else {
    const geo = new THREE.IcosahedronGeometry(1, habit==='nugget'?2:1);
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);const noise=1+.12*Math.sin(v.x*13+v.y*17+v.z*23);p.setXYZ(i,v.x*noise,v.y*noise,v.z*noise);}
    add(geo,[x,y,z],[scale,scale*.7,scale],rotation,color,habit==='nugget'?.82:.15,habit==='nugget'?.28:.9);
  }
}

function glb(model) {
  const binary=[], views=[], accessors=[], primitives=[], materials=[];
  let offset=0;
  function append(array,type,itemSize) {
    const buf=Buffer.from(array.buffer,array.byteOffset,array.byteLength);
    const index=views.length; views.push({buffer:0,byteOffset:offset,byteLength:buf.length,target:34962});
    binary.push(buf);offset+=buf.length;
    const pad=(4-offset%4)%4;if(pad){binary.push(Buffer.alloc(pad));offset+=pad;}
    const entry={bufferView:index,componentType:5126,count:array.length/itemSize,type};
    if(type==='VEC3'){
      entry.min=[Infinity,Infinity,Infinity];entry.max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<array.length;i++) {const j=i%3;entry.min[j]=Math.min(entry.min[j],array[i]);entry.max[j]=Math.max(entry.max[j],array[i]);}
    }
    accessors.push(entry);return accessors.length-1;
  }
  for(const mesh of meshes){
    const c=new THREE.Color(mesh.color);
    materials.push({name:model.name,pbrMetallicRoughness:{baseColorFactor:[c.r,c.g,c.b,1],metallicFactor:mesh.metalness,roughnessFactor:mesh.roughness},doubleSided:false});
    primitives.push({attributes:{POSITION:append(mesh.geometry.attributes.position.array,'VEC3',3),NORMAL:append(mesh.geometry.attributes.normal.array,'VEC3',3)},material:materials.length-1,mode:4});
  }
  const doc={asset:{version:'2.0',generator:'ChemDex mineral morphology generator 2026-11-11',copyright:'ChemDex — original schematic geometry'},
    scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:model.name}],meshes:[{primitives}],materials,accessors,bufferViews:views,buffers:[{byteLength:offset}],
    extras:{mineral:model.name,formula:model.formula,crystalSystem:model.crystalSystem,source:model.source,disclaimer:model.disclaimer}};
  let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=Buffer.concat(binary);const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);
  const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,jh,json,bh,bin]);
}

const stats=[];
for(const model of catalog.models){
  meshes.length=0;seed=[...model.id].reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0;
  const matrix=new THREE.IcosahedronGeometry(2,2);
  add(matrix,[0,-.75,0],[1,.22,.77],[.1,.15,.07],model.habit==='nugget'?'#554d40':'#45434a',.12,.96);
  for(let i=0;i<11;i++){
    const angle=i*2.399963;const radius=Math.sqrt(i/11)*1.45;
    const size=.3+random()*.48+(i===0?.45:0);
    crystal(model.habit,Math.cos(angle)*radius,-.22+size*.65,Math.sin(angle)*radius*.7,size,model.color,random()*Math.PI);
  }
  // Small intergrown crystals add detail at the contact with the matrix.
  for(let i=0;i<24;i++) {const a=random()*Math.PI*2,r=.4+random()*1.5;crystal(model.habit,Math.cos(a)*r,-.4,Math.sin(a)*r*.72,.06+random()*.11,model.color,random()*6.28);}
  const bytes=glb(model);await fs.writeFile(path.join(output,model.id+'.glb'),bytes);
  stats.push({id:model.id,meshes:meshes.length,triangles:meshes.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0),bytes:bytes.length});
  for(const mesh of meshes)mesh.geometry.dispose();
}

const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const meta of JSON.parse(await fs.readFile(path.join(root,'data/manifest.json'),'utf8'))){
  const el=JSON.parse(await fs.readFile(path.join(root,'data',meta.file),'utf8'));
  const color=el.occurrence.mineral.color??'#63cbd1';
  const shells=el.structure.shells;
  const rings=shells.map((n,i)=>{const r=18+i*12;return `<circle cx="466" cy="180" r="${r}" fill="none" stroke="${color}" stroke-opacity=".24"/>`+Array.from({length:n},(_,j)=>{const a=j/n*Math.PI*2+i*.28;return `<circle cx="${466+Math.cos(a)*r}" cy="${180+Math.sin(a)*r}" r="2.3" fill="${color}"/>`;}).join('');}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${esc(el.nameVi)} — sơ đồ minh họa"><defs><radialGradient id="bg"><stop stop-color="#183341"/><stop offset="1" stop-color="#0c1420"/></radialGradient></defs><rect width="640" height="360" fill="url(#bg)"/><path d="M32 44H608" stroke="#304454"/><text x="34" y="32" fill="#9cb7c8" font-family="sans-serif" font-size="12" letter-spacing="3">CHEMDEX · ELEMENT STUDY</text><text x="38" y="89" fill="${color}" font-family="sans-serif" font-size="20">${el.number}</text><text x="32" y="211" fill="#ecf5f8" font-family="sans-serif" font-weight="700" font-size="126">${el.symbol}</text><text x="39" y="252" fill="#e1edf3" font-family="sans-serif" font-size="24">${esc(el.nameVi)}</text><text x="39" y="282" fill="#9cb7c8" font-family="sans-serif" font-size="16">${esc(el.nameEn)}</text>${rings}<circle cx="466" cy="180" r="12" fill="${color}"/><text x="38" y="331" fill="#8ca5b6" font-family="sans-serif" font-size="12">Sơ đồ lớp electron · Không phải ảnh mẫu vật · Không theo tỉ lệ</text></svg>`;
  await fs.writeFile(path.join(root,`assets/periodic-table/diagrams/${String(el.number).padStart(3,'0')}_${el.symbol}.svg`),svg);
}
await fs.writeFile(path.join(root,'docs/periodic-table-audit/2026-11-11/model-generation.json'),JSON.stringify({date:'2026-11-11',models:stats,diagrams:118,interpretation:'Schematic crystal habits, approximate colors, arbitrary scale; no crystallographic atomic coordinates or specimen scans.'},null,2)+'\n');
console.log(JSON.stringify({models:stats.length,diagrams:118,triangles:stats.reduce((n,s)=>n+s.triangles,0),bytes:stats.reduce((n,s)=>n+s.bytes,0)}));
