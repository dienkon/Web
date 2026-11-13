import * as THREE from 'three';
import {SmoothOrbitControls} from './smooth-controls.js';
import {specimenEnvironment} from './specimen-environment.js';
import {crystalDisplayConnections,crystalDisplayHydrogenBonds} from '../../shared/chemistry/crystal-neighbors.mjs';
import {crystalDisplayClusters} from '../../shared/chemistry/crystal-display-clusters.mjs';

const COLORS={H:'#f4f7fa',Li:'#cc83ef',Be:'#a2d666',B:'#e9a590',C:'#667888',N:'#5383ec',O:'#e95354',F:'#90d873',Na:'#ac80ee',Mg:'#76cc92',Al:'#b8bcc7',Si:'#deb899',P:'#eda254',S:'#e4cc4e',Cl:'#75c75f',K:'#ad7cce',Ca:'#80b8ce',Fe:'#cf875c',Ni:'#81b887',Cu:'#c5875e',Zn:'#8bafc8',As:'#c095c1',Se:'#e7a157',Ag:'#d4d9e1',Cd:'#e6cb90',Sn:'#a6b5bf',Sb:'#b2a1c5',Te:'#c6a1a1',Cs:'#9a83da',Ba:'#87b590',W:'#91b0c1',Pt:'#c2c8db',Au:'#dfbb4f',Hg:'#a1afc5',Pb:'#929aae',U:'#8caf7b'};
export const atomColor = element => COLORS[element] ?? new THREE.Color().setHSL(([...element].reduce((n,c)=>n+c.charCodeAt(0)*31,0)%360)/360,.40,.62).getStyle();
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function fractionalPosition(data, frac) {
  return data.basis.map(row=>row.reduce((sum,v,i)=>sum+v*frac[i],0));
}
export function nearestPeriodicDistance(data){
  const translations=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)translations.push(fractionalPosition(data,[x,y,z]));
  let squared=Infinity;
  for(const a of data.atoms)for(const b of data.atoms)for(const shift of translations){
    const dx=a.position[0]-b.position[0]+shift[0],dy=a.position[1]-b.position[1]+shift[1],dz=a.position[2]-b.position[2]+shift[2],d=dx*dx+dy*dy+dz*dz;
    if(d>1e-8&&d<squared)squared=d;
  }
  return Math.sqrt(squared);
}

// Published metric and explicit symmetry-expanded sites; no inferred lattice type.
// Spheres are a visual key, not ionic radii or thermal ellipsoids. Occupancy is
// represented as sphere sectors, including vacancies, rather than random atoms.
export function buildPublishedCrystal(data, repeat=1, options={}) {
  if (![1,2].includes(repeat)) throw Error('Crystal repeat must be 1 or 2');
  const group=new THREE.Group();group.name=data.mineralName;
  const clusterPlan=crystalDisplayClusters(data,repeat),completeClusters=options.completeClusters!==false&&clusterPlan.additions.length>0;
  const [segments,rings]=options.instanced&&data.atoms.length*repeat**3+(completeClusters?clusterPlan.additions.length:0)>1500?[10,8]:[16,10];
  const geometries=new Map(),materials=new Map();
  const material=(element)=>{
    if(!materials.has(element))materials.set(element,element==='Vacancy' ? new THREE.LineBasicMaterial({color:'#536778'}) : new THREE.MeshStandardMaterial({color:atomColor(element),roughness:.40,metalness:.1,side:THREE.DoubleSide}));
    return materials.get(element);
  };
  const unique=[];
  for (const [sourceAtomIndex,atom] of data.atoms.entries()) {
    let site=unique.find(s=>s.fractional.every((v,i)=>Math.abs(v-atom.fractional[i])<2e-5));
    if (!site) {site={fractional:atom.fractional,species:[]};unique.push(site);}
    site.species.push({...atom,sourceAtomIndex});
  }
  let spheres=0,occupiedSpheres=0;
  const batches=new Map(),displaySites=[];
  for(const site of unique) {
    const offsets=site.fractional.map(v=>Array.from({length:repeat+(Math.abs(v)<2e-6?1:0)},(_,i)=>i));
    for(const x of offsets[0])for(const y of offsets[1])for(const z of offsets[2]) {
      const shift=[x,y,z];displaySites.push({fractional:site.fractional.map((v,i)=>v+shift[i]),unitCellFractional:site.fractional,shift,species:site.species});
    }
  }
  if(completeClusters)for(const image of clusterPlan.additions){
    const atom=data.atoms[image.index];displaySites.push({fractional:image.fractional,unitCellFractional:atom.fractional,shift:image.shift,species:[{...atom,sourceAtomIndex:image.index}]});
  }
  for(const site of displaySites){
      const position=fractionalPosition(data,site.fractional);
      let start=0;
      const species=[...site.species];
      const vacancy=1-species.reduce((sum,s)=>sum+s.occupancy,0);
      if(vacancy>.005)species.push({element:'Vacancy',occupancy:vacancy,label:'Vị trí trống'});
      for(const atom of species) {
        const portion=Math.min(atom.occupancy,1-start);if(portion<=0)continue;
        const vacancy=atom.element==='Vacancy';
        if(!vacancy)occupiedSpheres++;
        const key=`${vacancy?'wire':'sphere'}:${start.toFixed(7)}:${portion.toFixed(7)}`;
        if(!geometries.has(key)) {
          const sphere=new THREE.SphereGeometry(.32,segments,rings,start*Math.PI*2,portion*Math.PI*2);
          geometries.set(key,vacancy ? new THREE.WireframeGeometry(sphere) : sphere);
          if(vacancy)sphere.dispose();
        }
        const info={kind:'atom',label:atom.label,element:atom.element,occupancy:atom.occupancy,
          fractional:site.fractional,unitCellFractional:site.unitCellFractional,cellShift:site.shift,sourceAtomIndex:atom.sourceAtomIndex,position};
        if(options.instanced){
          const batchKey=`${key}:${atom.element}`;
          if(!batches.has(batchKey))batches.set(batchKey,{key,element:atom.element,atoms:[]});
          batches.get(batchKey).atoms.push(info);spheres++;start+=portion;continue;
        }
        const mesh=vacancy ? new THREE.LineSegments(geometries.get(key),material(atom.element)) : new THREE.Mesh(geometries.get(key),material(atom.element));
        mesh.position.set(...position);mesh.name=`${atom.label} · ${atom.element} · ${atom.occupancy}`;
        mesh.userData=info;
        if(vacancy)mesh.visible=options.showVacancies===true;
        mesh.scale.setScalar(options.radiusScale??1);group.add(mesh);spheres++;start+=portion;
      }
  }
  const matrix=new THREE.Matrix4(),scale=new THREE.Vector3().setScalar(options.radiusScale??1),rotation=new THREE.Quaternion();
  for(const batch of batches.values()){
    let geometry=geometries.get(batch.key),mat;
    if(batch.element==='Vacancy'){
      // Instanced wireframe mesh keeps vacancies visible without hundreds of
      // separate line objects. Reuse its sphere sector, not the wire vertices.
      const [,start,portion]=batch.key.split(':');
      geometry=new THREE.SphereGeometry(.32,segments,rings,Number(start)*Math.PI*2,Number(portion)*Math.PI*2);
      mat=new THREE.MeshBasicMaterial({color:'#9cabb4',wireframe:true});
    }else mat=material(batch.element);
    const mesh=new THREE.InstancedMesh(geometry,mat,batch.atoms.length);
    mesh.name=`${batch.element} · ${batch.atoms.length} vị trí`;
    mesh.userData={kind:'atom',element:batch.element};mesh.atomInstances=batch.atoms;
    if(batch.element==='Vacancy')mesh.visible=options.showVacancies===true;
    batch.atoms.forEach((atom,i)=>{matrix.compose(new THREE.Vector3(...atom.position),rotation,scale);mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  // Source coordinates and source bond orders are unchanged. These rods are
  // an explicitly labelled display layer and can be hidden independently.
  const connections=completeClusters?clusterPlan.connections:crystalDisplayConnections(data,repeat),links=new THREE.Group();links.name='Đường nối lân cận';links.userData.kind='connections';
  const linkGeometry=new THREE.CylinderGeometry(1,1,1,6),linkMaterial=new THREE.MeshStandardMaterial({color:'#627d89',roughness:.7});
  const connectionBatches=new Map();
  for(const edge of connections){const key=[...edge.elements].sort().join('-');if(!connectionBatches.has(key))connectionBatches.set(key,[]);connectionBatches.get(key).push(edge);}
  for(const edges of connectionBatches.values()){
    const mesh=new THREE.InstancedMesh(linkGeometry,linkMaterial,edges.length);mesh.userData={kind:'connection-batch',elements:edges[0].elements};mesh.connectionInstances=edges;
    const yAxis=new THREE.Vector3(0,1,0);
    edges.forEach((edge,i)=>{const a=new THREE.Vector3(...edge.from),b=new THREE.Vector3(...edge.to),delta=b.clone().sub(a);matrix.compose(a.add(b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(yAxis,delta.clone().normalize()),new THREE.Vector3(.055,delta.length(),.055));mesh.setMatrixAt(i,matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();links.add(mesh);
  }
  if(!connections.length){linkGeometry.dispose();linkMaterial.dispose();}
  links.visible=options.showConnections!==false;group.add(links);
  // Hydrogen contacts stay separate from solid coordination/covalent rods.
  // One instanced batch per participating element set keeps rotation cheap.
  const hydrogenBonds=completeClusters?clusterPlan.hydrogenBonds:crystalDisplayHydrogenBonds(data,repeat),hydrogenLinks=new THREE.Group();
  const publishedHydrogen=data.hydrogenBondGeometry?.origin==='source-cif';
  const hydrogenBondEvidence=hydrogenBonds.length?(publishedHydrogen?'source-cif':'water-geometric'):null;
  hydrogenLinks.name=`Liên kết hydrogen · nét đứt · ${publishedHydrogen?'bảng CIF nguồn':'tiêu chí hình học'}`;hydrogenLinks.userData.kind='hydrogen-bonds';
  const hydrogenBatches=new Map();
  for(const edge of hydrogenBonds){const key=[...edge.elements].sort().join('-');if(!hydrogenBatches.has(key))hydrogenBatches.set(key,[]);hydrogenBatches.get(key).push(edge);}
  if(hydrogenBonds.length){
    const geometry=new THREE.CylinderGeometry(1,1,1,6),material=new THREE.MeshStandardMaterial({color:'#087e8b',roughness:.7}),yAxis=new THREE.Vector3(0,1,0);
    for(const edges of hydrogenBatches.values()){
      const dashes=[];
      for(const edge of edges){
        const a=new THREE.Vector3(...edge.from),delta=new THREE.Vector3(...edge.to).sub(a),length=delta.length(),count=Math.max(1,Math.ceil(length/.28));
        for(let i=0;i<count;i++)dashes.push({position:a.clone().addScaledVector(delta,(i+.5)/count),direction:delta.clone().normalize(),length:length/count*.55});
      }
      const mesh=new THREE.InstancedMesh(geometry,material,dashes.length);
      mesh.name='Liên kết hydrogen';mesh.userData={kind:'connection-batch',elements:edges[0].elements,interaction:`hydrogen-bond-${hydrogenBondEvidence}`};
      dashes.forEach((dash,i)=>{matrix.compose(dash.position,new THREE.Quaternion().setFromUnitVectors(yAxis,dash.direction),new THREE.Vector3(.035,dash.length,.035));mesh.setMatrixAt(i,matrix);});
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();hydrogenLinks.add(mesh);
    }
  }
  hydrogenLinks.visible=options.showHydrogenBonds!==false;group.add(hydrogenLinks);
  const frame=new THREE.Group();frame.name='Ô mạng và các trục a, b, c';
  const cylinder=new THREE.CylinderGeometry(1,1,1,8);
  const line=(from,to,color,radius=.018)=>{
    const a=new THREE.Vector3(...fractionalPosition(data,from)),b=new THREE.Vector3(...fractionalPosition(data,to));
    const mesh=new THREE.Mesh(cylinder,new THREE.MeshStandardMaterial({color,roughness:.8}));
    mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,a.distanceTo(b),radius);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());frame.add(mesh);
  };
  for(let i=0;i<=repeat;i++)for(let j=0;j<=repeat;j++)for(let axis=0;axis<3;axis++){
    const other=[0,1,2].filter(n=>n!==axis),a=[0,0,0],b=[0,0,0];
    a[other[0]]=b[other[0]]=i;a[other[1]]=b[other[1]]=j;b[axis]=repeat;
    line(a,b,'#638295',.012);
  }
  for(let axis=0;axis<3;axis++){const end=[0,0,0];end[axis]=repeat;line([0,0,0],end,['#e66c75','#7acb8e','#69a8ef'][axis],.035);}
  frame.visible=options.showCell!==false;group.add(frame);
  group.position.set(...fractionalPosition(data,[-repeat/2,-repeat/2,-repeat/2]));
  group.userData={amcsdId:data.amcsdId,codId:data.codId,referenceId:data.referenceId??`amcsd:${data.amcsdId}`,evidence:data.evidence,source:data.source,formula:data.formula,cell:data.cell,spaceGroup:data.spaceGroup,reference:data.reference,repeat,
    originalSiteCount:data.siteCount,displaySpheres:spheres,displayAtoms:occupiedSpheres,vacancySpheres:spheres-occupiedSpheres,displayConnections:connections.length,displayHydrogenBonds:hydrogenBonds.length,hydrogenBondEvidence,completeClusters,canCompleteClusters:clusterPlan.additions.length>0,boundaryCopies:completeClusters?clusterPlan.additions.length:0,interpretation:'Published periodic atomic structure. Boundary sites repeated for viewing; sphere size/color illustrative. '+(completeClusters?'Finite neighbour clusters are completed across cell faces by integer translations; one hydrogen-neighbour shell is included. Extra display atoms do not change unit-cell contents. ':'')+'Rods are distance-based display neighbours, not assigned chemical bond orders. '+(publishedHydrogen?'Dashed hydrogen bonds reproduce the original CIF geom_hbond table and its space-group images.':'Dashed H···O contacts in fully occupied ordered pure-water crystals use geometric display criteria: O-H <= 1.2 A, O···O <= 3.0 A, O-H···O >= 150 degrees; not a universal hydrogen-bond classifier.')};
  if(options.instanced)for(const [key,geometry]of geometries)if(key.startsWith('wire:'))geometry.dispose();
  return group;
}

export function disposeCrystal(group) {
  const geometries=new Set(),materials=new Set();
  group?.traverse(node=>{if(node.isInstancedMesh)node.dispose();if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

export function frameCrystal(camera,controls,object,aspect) {
  const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(1.4,.9,1.8).normalize();
  camera.up.set(0,0,1);camera.aspect=aspect;camera.position.copy(center).add(direction);camera.lookAt(center);
  const inverse=camera.quaternion.clone().invert(),tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*aspect;
  let distance=.1;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const point=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);
    distance=Math.max(distance,Math.abs(point.x)/tanH+point.z,Math.abs(point.y)/tanV+point.z);
  }
  distance*=1.14;camera.position.copy(center).add(direction.multiplyScalar(distance));
  camera.near=Math.max(distance/200,.001);camera.far=distance*100;camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.syncFromCamera?.();
  controls.saveHome?.();
  controls.update();
  return distance;
}

export function mountPublishedCrystal(container, meta) {
  const prototype=meta.evidence==='reference-prototype';
  const identity=meta.codId?`COD ${meta.codId}`:meta.amcsdId?`AMCSD ${meta.amcsdId}`:'Thông số tài liệu tham chiếu';
  const evidence=prototype?'Prototype có chú thích nguồn':meta.evidence==='literature-compilation'?'Dữ liệu tài liệu tổng hợp':'Cấu trúc đã công bố';
  const wiki=meta.wikiComparison;
  const wikiMetrics=wiki?.metrics?.length?`<div class="crystal-site-table"><table><thead><tr><th>Trục CIF / Wiki</th><th>CIF (Å)</th><th>Wiki (Å)</th></tr></thead><tbody>${wiki.metrics.map(m=>`<tr><td>${esc(m.axis)} / ${esc(m.wikiAxis)}</td><td>${Number(m.modelAngstrom).toLocaleString('vi-VN',{maximumFractionDigits:6})}</td><td>${Number(m.wikiAngstrom).toLocaleString('vi-VN',{maximumFractionDigits:6})}</td></tr>`).join('')}</tbody></table></div>`:'';
  const wikiLinks=(wiki?.additionalSources??[]).map(s=>` · <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('');
  const metric=Object.entries(meta.cell).map(([key,v])=>`${key} = ${Number(v).toLocaleString('vi-VN',{maximumFractionDigits:6})}${['a','b','c'].includes(key)?' Å':'°'}`).join(' · ');
  container.innerHTML=`<div class="published-crystal" data-crystal-id="${esc(meta.id)}">
    <div class="crystal-heading">
      <div class="crystal-title-row"><strong>${esc(meta.mineralName)}</strong><span class="crystal-sg-pill">${esc(meta.spaceGroup)}</span></div>
      <span class="crystal-meta-sub">${esc(identity)} · ${esc(evidence)}</span>
    </div>
    <div class="published-crystal-stage"><img src="${esc(meta.preview)}" alt="Ô mạng ${esc(meta.mineralName)} theo tọa độ công bố" loading="lazy"><button type="button" data-crystal-start>Xem mạng tinh thể 3D</button></div>
    <div class="crystal-controls">
      <button type="button" data-crystal-connections aria-pressed="true" disabled>Ẩn đường nối</button>
      <button type="button" data-crystal-rotate aria-pressed="false" disabled>Tự động xoay</button>
      <button type="button" data-crystal-repeat disabled>Hiện 2 × 2 × 2 ô</button>
      <button type="button" data-crystal-cell aria-pressed="false" disabled>Hiện khung ô mạng</button>
      <button type="button" data-crystal-pack aria-pressed="false" disabled title="Cầu tiếp xúc dùng nửa khoảng cách láng giềng gần nhất; áp dụng cho ô đơn chất có vị trí đầy.">Cầu tiếp xúc</button>
      <button type="button" data-crystal-atoms aria-pressed="true" disabled>Ẩn nguyên tử</button>
      <button type="button" data-crystal-environment aria-pressed="false" disabled>Hiện cảnh trưng bày</button>
      <button type="button" data-crystal-hydrogen-bonds aria-pressed="true" disabled hidden>Ẩn liên kết hydrogen</button>
      <button type="button" data-crystal-clusters aria-pressed="true" disabled hidden>Cắt tại biên ô</button>
      <button type="button" data-crystal-vacancies aria-pressed="false" disabled hidden>Hiện vị trí trống</button>
      <button type="button" data-crystal-reset disabled>Đặt lại góc nhìn</button>
      <button type="button" data-crystal-fullscreen disabled>Toàn màn hình</button>
    </div>
    <div class="crystal-info-row">
      <p class="crystal-metric">${esc(metric)} · V = ${meta.volume.toFixed(3)} Å³ · ${meta.siteCount} vị trí/ô</p>
      <div class="crystal-legend" aria-label="Màu nguyên tử và trục mạng"><span style="color:#e66c75">a</span><span style="color:#7acb8e">b</span><span style="color:#69a8ef">c</span></div>
    </div>
    <output class="crystal-selection" data-crystal-selection>Chọn một nguyên tử trên mô hình để xem tọa độ và độ chiếm chỗ.</output>
    <p class="crystal-status" role="status">Kéo tự do 360° · Cuộn để thu/phóng · Chuột phải trượt khung hình.</p>
    ${meta.note?`<p class="crystal-note">${esc(meta.note)}</p>`:''}${meta.limitations?`<p class="crystal-note">${esc(meta.limitations)}</p>`:''}
    <div class="crystal-accordions">
      <details class="crystal-display-notes"><summary>Quy ước hiển thị</summary><p>Đường nối giúp đọc các cặp lân cận trong mạng tuần hoàn; dùng ngưỡng bán kính cộng hóa trị cho phi kim và lớp lân cận gần cho ion/kim loại. Đây không phải phép xác định bậc liên kết. Đường qua mặt ô được cắt tại biên. Cầu, màu và cảnh trưng bày là quy ước; tọa độ và độ chiếm chỗ giữ theo nguồn.</p></details>
      ${wiki?`<details class="crystal-wiki-reference"><summary>Đối chiếu cấu trúc trên Wikipedia</summary><p>${wiki.phases.map(p=>esc(`${p.prefix} ${p.type} ${p.pearson}`)).join(' · ')}</p>${wikiMetrics}<ul>${wiki.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p><a href="${esc(wiki.article)}" target="_blank" rel="noopener noreferrer">Bài Wiki ↗</a> · <a href="${esc(wiki.template)}?oldid=${wiki.revisionId}" target="_blank" rel="noopener noreferrer">Phiên bản infobox đã đối chiếu ↗</a>${wikiLinks}</p></details>`:''}
      <details class="crystal-evidence"><summary>Nguồn, điều kiện mẫu và tọa độ</summary><p>${esc(meta.reference.authors.join(', '))} (${meta.reference.year}). ${esc(meta.reference.title)}. ${esc([meta.reference.journal,meta.reference.volume,meta.reference.pages].filter(Boolean).join(', '))}.</p><p>${prototype?'Vị trí Wyckoff lý tưởng của prototype; thông số mạng lấy từ tài liệu tham chiếu được nêu bên dưới. Không có bộ tinh chỉnh nguyên tử thực nghiệm riêng trong mô hình này.':meta.codId?'Khai triển đối xứng từ CIF gốc; file CIF tải xuống giữ nguyên độ chính xác, độ bất định và ghi chú xử lý H của nguồn. Các cầu không phải ellipsoid nhiệt.':'Giữ các điều kiện ghi trong bản gốc; nguồn không ghi nhiệt độ/áp suất thì không tự gán 25 °C / 1 atm. Dữ liệu truyền tải làm tròn tọa độ phân số tới 0,00000025; không có độ bất định hay ellipsoid nhiệt.'}</p>${meta.conditions?.temperatureK?`<p>Nhiệt độ nguồn: ${esc(meta.conditions.temperatureK)} K${meta.conditions.pressureKPa?` · Áp suất nguồn: ${esc(meta.conditions.pressureKPa)} kPa`:''}${meta.conditions.hydrogenTreatment?` · Xử lý H: ${esc(meta.conditions.hydrogenTreatment)}`:''}.</p>`:''}<div class="crystal-downloads"><a href="${esc(meta.cif)}" download>Tải CIF</a><a href="${esc(meta.data)}" download>Tải tọa độ JSON</a><a href="${esc(meta.model)}" download>Tải mạng tinh thể GLB</a><a href="${esc(meta.source)}" target="_blank" rel="noopener noreferrer">${prototype?'Nguồn tham chiếu':meta.codId?'COD':'AMCSD'} ↗</a>${meta.reference.doi?`<a href="https://doi.org/${esc(meta.reference.doi)}" target="_blank" rel="noopener noreferrer">Bài nghiên cứu ↗</a>`:''}</div><div data-crystal-sites></div></details>
    </div>
  </div>`;
  const stage=container.querySelector('.published-crystal-stage'),status=container.querySelector('[role=status]');
  const displayNotes=container.querySelector('.crystal-display-notes');
  let environment, showEnvironment = false, showAtoms = true, showConnections=true, showHydrogenBonds=true, showCompleteClusters=true, showVacancies=false, autoRotate=false, renderNeeded=true;
  const hiddenElements = new Set();
  let renderer,scene,camera,controls,current,data,resizeObserver,visibilityObserver,raf=0,destroyed=false,visible=true,repeat=1,showCell=false,packed=false,packingScale=1,pendingFit=true,pickedHighlight=null;
  const invalidate=()=>{renderNeeded=true;};
  const rotating=container.querySelector('[data-crystal-rotate]');
  const fit=()=>{
    const rect=stage.getBoundingClientRect();if(rect.width<1||rect.height<1){pendingFit=true;return;}
    frameCrystal(camera,controls,current,rect.width/rect.height);pendingFit=false;
    controls?.handleResize();invalidate();
  };
  const clearSelectionHalo=()=>{
    if(pickedHighlight){
      try{
        pickedHighlight.mesh.setColorAt(pickedHighlight.instanceId,new THREE.Color(1,1,1));
        if(pickedHighlight.mesh.instanceColor)pickedHighlight.mesh.instanceColor.needsUpdate=true;
      }catch{}
      pickedHighlight=null;
      invalidate();
    }
  };
  const applyAtomVisibility = () => {current?.traverse(node => {
    if (node.userData.kind === 'atom') node.visible = showAtoms && (node.userData.element!=='Vacancy'||showVacancies) && !hiddenElements.has(node.userData.element);
    if(node.userData.kind==='connection-batch')node.visible=showAtoms&&node.userData.elements.every(e=>!hiddenElements.has(e));
  });invalidate();};
  const rebuild=()=>{
    clearSelectionHalo();
    if(current){scene.remove(current);disposeCrystal(current);}
    current=buildPublishedCrystal(data,repeat,{instanced:true,showCell,showConnections,showHydrogenBonds,showVacancies,completeClusters:showCompleteClusters,radiusScale:packed?packingScale:1});scene.add(current);fit();applyAtomVisibility();
    if(environment){scene.remove(environment);disposeCrystal(environment);}
    environment=showEnvironment?specimenEnvironment(current,'z'):null;if(environment)scene.add(environment);invalidate();
    stage.dataset.displayAtoms=String(current.userData.displayAtoms);stage.dataset.displayConnections=String(current.userData.displayConnections);
    stage.dataset.displayHydrogenBonds=String(current.userData.displayHydrogenBonds);
    stage.dataset.hydrogenBondEvidence=current.userData.hydrogenBondEvidence??'none';
    stage.dataset.boundaryCopies=String(current.userData.boundaryCopies);stage.dataset.completeClusters=String(current.userData.completeClusters);
    container.querySelector('[data-crystal-clusters]').hidden=!current.userData.canCompleteClusters;
    container.querySelector('[data-crystal-hydrogen-bonds]').hidden=!current.userData.displayHydrogenBonds;
    container.querySelector('[data-crystal-vacancies]').hidden=!current.userData.vacancySpheres;
  };
  container.querySelector('[data-crystal-start]').addEventListener('click',async event=>{
    event.currentTarget.disabled=true;status.textContent='Đang tải tọa độ tinh thể…';
    try {
      const response=await fetch(meta.data);if(!response.ok)throw Error(`HTTP ${response.status}`);data=await response.json();if(destroyed)return;
      renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      scene=new THREE.Scene();scene.background=new THREE.Color('#f5fafc');
      scene.add(new THREE.HemisphereLight('#ffffff','#8ba5b0',2.4));
      const keyLight=new THREE.DirectionalLight('#ffffff',2.1);keyLight.position.set(3,6,8);scene.add(keyLight);
      const rimLight=new THREE.DirectionalLight('#bae6fd',0.85);rimLight.position.set(-5,-4,-6);scene.add(rimLight);
      camera=new THREE.PerspectiveCamera(36,1,.01,1000);
      controls=new SmoothOrbitControls(camera,renderer.domElement,{
        rotateSpeed:1.05,
        zoomSpeed:1.0,
        panSpeed:0.9,
        spinAxis:new THREE.Vector3(0,0,1),
        autoRotateSpeed:0.42,
        pauseAutoRotateOnStart:true,
      });
      controls.addEventListener('change',invalidate);
      controls.addEventListener('start',()=>{
        autoRotate=false;
        rotating.textContent='Tự động xoay';
        rotating.setAttribute('aria-pressed','false');
        invalidate();
      });
      stage.replaceChildren(renderer.domElement);
      const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null,dragged=false;
      renderer.domElement.addEventListener('pointerdown',event=>{pointerStart=[event.clientX,event.clientY];dragged=false;});
      renderer.domElement.addEventListener('pointermove',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>5)dragged=true;});
      renderer.domElement.addEventListener('dblclick',()=>{controls?.reset(0.32);invalidate();});
      renderer.domElement.addEventListener('pointerup',event=>{
        if(!pointerStart||dragged||Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>5){pointerStart=null;return;}pointerStart=null;
        const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        raycaster.setFromCamera(pointer,camera);
        const targets=current.children.filter(n=>n.visible&&n.userData.kind==='atom'&&n.userData.element!=='Vacancy');
        const hit=raycaster.intersectObjects(targets,false)[0];
        if(hit){
          const atom=hit.object.atomInstances?.[hit.instanceId]??hit.object.userData,fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:6});
          container.querySelector('[data-crystal-selection]').textContent=`${atom.label} · ${atom.element} · chiếm chỗ ${fmt(atom.occupancy*100)}% · phân số (${atom.fractional.map(fmt).join('; ')}) · Cartesian (${atom.position.map(fmt).join('; ')}) Å`;
          clearSelectionHalo();
          if(hit.object.isInstancedMesh&&Number.isInteger(hit.instanceId)){
            hit.object.setColorAt(hit.instanceId,new THREE.Color(1.75,2.15,2.5));
            if(hit.object.instanceColor)hit.object.instanceColor.needsUpdate=true;
            pickedHighlight={mesh:hit.object,instanceId:hit.instanceId};
            invalidate();
          }
        }
      });
      resizeObserver=new ResizeObserver(()=>{const r=stage.getBoundingClientRect();if(r.width<1||r.height<1)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();controls.handleResize();if(pendingFit&&current)fit();invalidate();});resizeObserver.observe(stage);
      visibilityObserver=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);visibilityObserver.observe(stage);
      rebuild();
      if(current.userData.canCompleteClusters)displayNotes.insertAdjacentHTML('beforeend','<p>Chế độ trọn cụm bổ sung các bản sao tịnh tiến qua biên để tránh cắt ngang nhóm nguyên tử; dữ liệu hydrogen có thêm một lớp cụm cho/nhận lân cận. Các bản sao ngoài ô không làm tăng thành phần ô cơ sở. Chỉ khép cụm hữu hạn có vị trí đầy; mạng kéo dài vô hạn và dữ liệu bán phần giữ cách cắt tại mặt ô. Dùng “Cắt tại biên ô” để trở về hình ô mạng.</p>');
      if(current.userData.hydrogenBondEvidence==='source-cif')displayNotes.insertAdjacentHTML('beforeend','<p>Nét đứt xanh: liên kết hydrogen trong bảng geom_hbond của CIF nguồn, khai triển cùng các phép đối xứng và tịnh tiến của ô mạng. Không tự thêm những liên kết hydrogen khác chưa được bảng nguồn ghi nhận. Cách xác định vị trí H và điều kiện mẫu nằm trong phần nguồn bên dưới.</p>');
      else if(current.userData.displayHydrogenBonds)displayNotes.insertAdjacentHTML('beforeend','<p>Nét đứt xanh: H···O giữa các phân tử nước trong pha băng đang chọn; thanh liền: O–H trong phân tử. Lớp nét đứt áp dụng cho dữ liệu H₂O có đủ H, vị trí đầy và mỗi O gắn hai H: O–H ≤ 1,2 Å, O···O ≤ 3,0 Å, góc O–H···O ≥ 150°. Đây là quy ước hình học để đọc mạng, không phải tiêu chuẩn chứng minh mọi liên kết hydrogen. <a href="https://docs.mdanalysis.org/stable/documentation_pages/analysis/hydrogenbonds.html" target="_blank" rel="noopener noreferrer">Tiêu chí tham khảo ↗</a></p>');
      container.querySelectorAll('.crystal-controls button').forEach(b=>b.disabled=false);
      container.querySelector('[data-crystal-pack]').disabled=Object.keys(data.cellComposition).length!==1||data.atoms.some(a=>a.occupancy<.999);
      status.textContent='Sẵn sàng · Kéo để xoay 360° · Cuộn để thu/phóng · Nhấp 2 lần để đặt lại.';status.dataset.state='ready';
      const legend=container.querySelector('.crystal-legend');
      for(const element of Object.keys(data.cellComposition)){
        const button=document.createElement('button');button.type='button';button.style.color='#224c5d';button.style.boxShadow=`inset 3px 0 ${atomColor(element)}`;button.textContent=`● ${element}`;button.title=`Ẩn/hiện nguyên tử ${element}`;button.setAttribute('aria-pressed','true');
        button.addEventListener('click',()=>{hiddenElements.has(element)?hiddenElements.delete(element):hiddenElements.add(element);button.setAttribute('aria-pressed',String(!hiddenElements.has(element)));applyAtomVisibility();});legend.append(button);
      }
      container.querySelector('[data-crystal-sites]').innerHTML=`<p>${data.asymmetricSites.length} vị trí bất đối xứng · ${data.symmetryOperations.length} phép đối xứng · ${data.mixedSiteCount} vị trí có nhiều loại nguyên tử. Trọng số thành phần trong ô: ${esc(Object.entries(data.cellComposition).map(([e,n])=>`${e}: ${n}`).join('; '))}.</p><div class="crystal-site-table"><table><thead><tr><th>Vị trí</th><th>Nguyên tố</th><th>x</th><th>y</th><th>z</th><th>Chiếm chỗ</th></tr></thead><tbody>${data.asymmetricSites.map(s=>`<tr><td>${esc(s.label)}</td><td>${esc(s.element)}</td>${s.fractional.map(v=>`<td>${v}</td>`).join('')}<td>${s.occupancy}</td></tr>`).join('')}</tbody></table></div>`;
      let lastTime=performance.now();
      const loop=now=>{if(destroyed)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
        if(visible&&document.visibilityState!=='hidden'){
          controls.autoRotate=autoRotate;
          const moved=controls.update(dt);
          if(moved)invalidate();
          if(renderNeeded){renderer.render(scene,camera);stage.dataset.drawCalls=String(renderer.info.render.calls);renderNeeded=false;}
        }raf=requestAnimationFrame(loop);
      };raf=requestAnimationFrame(loop);
    }catch(error){if(!destroyed){status.textContent=`Không tải được mạng tinh thể: ${error.message}. Có thể tải CIF ở phần nguồn.`;container.querySelector('[data-crystal-start]')?.removeAttribute('disabled');renderer?.dispose();}}
  });
  rotating.addEventListener('click',()=>{autoRotate=!autoRotate;if(controls)controls.autoRotate=autoRotate;rotating.textContent=autoRotate?'Tạm dừng xoay':'Tự động xoay';rotating.setAttribute('aria-pressed',String(autoRotate));invalidate();});
  container.querySelector('[data-crystal-connections]').addEventListener('click',event=>{showConnections=!showConnections;current.children.find(c=>c.userData.kind==='connections').visible=showConnections;event.currentTarget.textContent=showConnections?'Ẩn đường nối':'Hiện đường nối';event.currentTarget.setAttribute('aria-pressed',String(showConnections));invalidate();});
  container.querySelector('[data-crystal-hydrogen-bonds]').addEventListener('click',event=>{showHydrogenBonds=!showHydrogenBonds;current.children.find(c=>c.userData.kind==='hydrogen-bonds').visible=showHydrogenBonds;event.currentTarget.textContent=showHydrogenBonds?'Ẩn liên kết hydrogen':'Hiện liên kết hydrogen';event.currentTarget.setAttribute('aria-pressed',String(showHydrogenBonds));invalidate();});
  container.querySelector('[data-crystal-clusters]').addEventListener('click',event=>{showCompleteClusters=!showCompleteClusters;rebuild();event.currentTarget.textContent=showCompleteClusters?'Cắt tại biên ô':'Hiện trọn cụm';event.currentTarget.setAttribute('aria-pressed',String(showCompleteClusters));});
  container.querySelector('[data-crystal-vacancies]').addEventListener('click',event=>{showVacancies=!showVacancies;applyAtomVisibility();event.currentTarget.textContent=showVacancies?'Ẩn vị trí trống':'Hiện vị trí trống';event.currentTarget.setAttribute('aria-pressed',String(showVacancies));});
  container.querySelector('[data-crystal-repeat]').addEventListener('click',event=>{repeat=repeat===1?2:1;rebuild();event.currentTarget.textContent=repeat===1?'Hiện 2 × 2 × 2 ô':'Hiện 1 ô mạng';});
  container.querySelector('[data-crystal-pack]').addEventListener('click',event=>{
    packed=!packed;if(packed)packingScale=nearestPeriodicDistance(data)/(.32*2);
    rebuild();event.currentTarget.textContent=packed?'Cầu nhỏ':'Cầu tiếp xúc';event.currentTarget.setAttribute('aria-pressed',String(packed));
    container.querySelector('[data-crystal-selection]').textContent=packed?'Cầu tiếp xúc có bán kính bằng nửa khoảng cách láng giềng gần nhất trong mạng tuần hoàn; đây là mô hình đóng gói, không phải mật độ electron.':'Chọn một nguyên tử để xem tọa độ và độ chiếm chỗ.';
  });
  container.querySelector('[data-crystal-cell]').addEventListener('click',event=>{showCell=!showCell;current.children.find(c=>c.name==='Ô mạng và các trục a, b, c').visible=showCell;event.currentTarget.textContent=showCell?'Ẩn khung ô mạng':'Hiện khung ô mạng';event.currentTarget.setAttribute('aria-pressed',String(showCell));invalidate();});
  container.querySelector('[data-crystal-reset]').addEventListener('click',()=>controls?controls.reset(0.32):fit());
  container.querySelector('[data-crystal-atoms]').addEventListener('click',event=>{showAtoms=!showAtoms;applyAtomVisibility();event.currentTarget.textContent=showAtoms?'Ẩn nguyên tử':'Hiện nguyên tử';event.currentTarget.setAttribute('aria-pressed',String(showAtoms));});
  container.querySelector('[data-crystal-environment]').addEventListener('click',event=>{showEnvironment=!showEnvironment;if(showEnvironment&&!environment){environment=specimenEnvironment(current,'z');scene.add(environment);}if(environment)environment.visible=showEnvironment;event.currentTarget.textContent=showEnvironment?'Ẩn cảnh trưng bày':'Hiện cảnh trưng bày';event.currentTarget.setAttribute('aria-pressed',String(showEnvironment));invalidate();});
  container.querySelector('[data-crystal-fullscreen]').addEventListener('click',()=>{stage.requestFullscreen?.().catch(()=>{});});
  return {destroy(){destroyed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();visibilityObserver?.disconnect();controls?.dispose();pickedHighlight=null;disposeCrystal(current);disposeCrystal(environment);renderer?.dispose();container.replaceChildren();}};
}
