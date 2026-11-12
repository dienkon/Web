import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {specimenEnvironment} from './specimen-environment.js';

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
  const geometries=new Map(),materials=new Map();
  const material=(element)=>{
    if(!materials.has(element))materials.set(element,element==='Vacancy' ? new THREE.LineBasicMaterial({color:'#536778'}) : new THREE.MeshStandardMaterial({color:atomColor(element),roughness:.40,metalness:.1,side:THREE.DoubleSide}));
    return materials.get(element);
  };
  const unique=[];
  for (const atom of data.atoms) {
    let site=unique.find(s=>s.fractional.every((v,i)=>Math.abs(v-atom.fractional[i])<2e-5));
    if (!site) {site={fractional:atom.fractional,species:[]};unique.push(site);}
    site.species.push(atom);
  }
  let spheres=0;
  for(const site of unique) {
    const offsets=site.fractional.map(v=>Array.from({length:repeat+(Math.abs(v)<2e-6?1:0)},(_,i)=>i));
    for(const x of offsets[0])for(const y of offsets[1])for(const z of offsets[2]) {
      const position=fractionalPosition(data,site.fractional.map((v,i)=>v+[x,y,z][i]));
      let start=0;
      const species=[...site.species];
      const vacancy=1-species.reduce((sum,s)=>sum+s.occupancy,0);
      if(vacancy>.005)species.push({element:'Vacancy',occupancy:vacancy,label:'Vị trí trống'});
      for(const atom of species) {
        const portion=Math.min(atom.occupancy,1-start);if(portion<=0)continue;
        const vacancy=atom.element==='Vacancy';
        const key=`${vacancy?'wire':'sphere'}:${start.toFixed(7)}:${portion.toFixed(7)}`;
        if(!geometries.has(key)) {
          const sphere=new THREE.SphereGeometry(.32,20,14,start*Math.PI*2,portion*Math.PI*2);
          geometries.set(key,vacancy ? new THREE.WireframeGeometry(sphere) : sphere);
          if(vacancy)sphere.dispose();
        }
        const mesh=vacancy ? new THREE.LineSegments(geometries.get(key),material(atom.element)) : new THREE.Mesh(geometries.get(key),material(atom.element));
        mesh.position.set(...position);mesh.name=`${atom.label} · ${atom.element} · ${atom.occupancy}`;
        mesh.userData={kind:'atom',label:atom.label,element:atom.element,occupancy:atom.occupancy,
          fractional:site.fractional.map((v,i)=>v+[x,y,z][i]),unitCellFractional:site.fractional,position};
        mesh.scale.setScalar(options.radiusScale??1);group.add(mesh);spheres++;start+=portion;
      }
    }
  }
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
  group.userData={amcsdId:data.amcsdId,referenceId:data.referenceId??`amcsd:${data.amcsdId}`,evidence:data.evidence,source:data.source,formula:data.formula,cell:data.cell,spaceGroup:data.spaceGroup,reference:data.reference,repeat,
    originalSiteCount:data.siteCount,displaySpheres:spheres,interpretation:'Published periodic atomic structure. Boundary sites repeated for viewing; sphere size/color illustrative. No specimen surface, thermal ellipsoids or invented bonds.'};
  return group;
}

export function disposeCrystal(group) {
  const geometries=new Set(),materials=new Set();
  group?.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});
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
  controls.target.copy(center);controls.update();return distance;
}

export function mountPublishedCrystal(container, meta) {
  const prototype=meta.evidence==='reference-prototype';
  const identity=meta.amcsdId?`AMCSD ${meta.amcsdId}`:'Thông số tài liệu tham chiếu';
  const evidence=prototype?'Prototype có chú thích nguồn':meta.evidence==='literature-compilation'?'Dữ liệu tài liệu tổng hợp':'Cấu trúc đã công bố';
  const wiki=meta.wikiComparison;
  const wikiMetrics=wiki?.metrics?.length?`<div class="crystal-site-table"><table><thead><tr><th>Trục CIF / Wiki</th><th>CIF (Å)</th><th>Wiki (Å)</th></tr></thead><tbody>${wiki.metrics.map(m=>`<tr><td>${esc(m.axis)} / ${esc(m.wikiAxis)}</td><td>${Number(m.modelAngstrom).toLocaleString('vi-VN',{maximumFractionDigits:6})}</td><td>${Number(m.wikiAngstrom).toLocaleString('vi-VN',{maximumFractionDigits:6})}</td></tr>`).join('')}</tbody></table></div>`:'';
  const wikiLinks=(wiki?.additionalSources??[]).map(s=>` · <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`).join('');
  const metric=Object.entries(meta.cell).map(([key,v])=>`${key} = ${Number(v).toLocaleString('vi-VN',{maximumFractionDigits:6})}${['a','b','c'].includes(key)?' Å':'°'}`).join(' · ');
  container.innerHTML=`<div class="published-crystal" data-crystal-id="${esc(meta.id)}">
    <div class="crystal-heading"><strong>${esc(meta.mineralName)} · ${esc(meta.spaceGroup)}</strong><span>${esc(identity)} · ${esc(evidence)}</span></div>
    <div class="published-crystal-stage"><img src="${esc(meta.preview)}" alt="Ô mạng ${esc(meta.mineralName)} theo tọa độ công bố" loading="lazy"><button type="button" data-crystal-start>Xem mạng tinh thể 3D</button></div>
    <div class="crystal-controls"><button type="button" data-crystal-rotate aria-pressed="false" disabled>Tự động xoay</button><button type="button" data-crystal-repeat disabled>Hiện 2 × 2 × 2 ô</button><button type="button" data-crystal-cell aria-pressed="true" disabled>Ẩn khung ô mạng</button><button type="button" data-crystal-pack aria-pressed="false" disabled title="Cầu tiếp xúc dùng nửa khoảng cách láng giềng gần nhất; áp dụng cho ô đơn chất có vị trí đầy.">Cầu tiếp xúc</button><button type="button" data-crystal-reset disabled>Đặt lại góc nhìn</button></div>
    <p class="crystal-metric">${esc(metric)} · V = ${meta.volume.toFixed(3)} Å³ · ${meta.siteCount} vị trí/ô</p>
    <div class="crystal-legend" aria-label="Màu nguyên tử và trục mạng"><span style="color:#e66c75">a</span><span style="color:#7acb8e">b</span><span style="color:#69a8ef">c</span></div>
    <output class="crystal-selection" data-crystal-selection>Chọn một nguyên tử trên mô hình để xem tọa độ và độ chiếm chỗ.</output>
    <p class="crystal-status" role="status">Kéo để xoay · Cuộn để thu/phóng. Bán kính và màu cầu là quy ước hiển thị; phần cầu thể hiện độ chiếm chỗ, lưới tối là vị trí trống. Các nguyên tử trên biên được lặp để khép ô. Không vẽ liên kết suy đoán.</p>
    ${meta.note?`<p class="crystal-note">${esc(meta.note)}</p>`:''}${meta.limitations?`<p class="crystal-note">${esc(meta.limitations)}</p>`:''}
    ${wiki?`<details class="crystal-wiki-reference"><summary>Đối chiếu cấu trúc trên Wikipedia</summary><p>${wiki.phases.map(p=>esc(`${p.prefix} ${p.type} ${p.pearson}`)).join(' · ')}</p>${wikiMetrics}<ul>${wiki.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><p><a href="${esc(wiki.article)}" target="_blank" rel="noopener noreferrer">Bài Wiki ↗</a> · <a href="${esc(wiki.template)}?oldid=${wiki.revisionId}" target="_blank" rel="noopener noreferrer">Phiên bản infobox đã đối chiếu ↗</a>${wikiLinks}</p></details>`:''}
    <details class="crystal-evidence"><summary>Nguồn, điều kiện mẫu và tọa độ</summary><p>${esc(meta.reference.authors.join(', '))} (${meta.reference.year}). ${esc(meta.reference.title)}. ${esc([meta.reference.journal,meta.reference.volume,meta.reference.pages].filter(Boolean).join(', '))}.</p><p>${prototype?'Vị trí Wyckoff lý tưởng của prototype; thông số mạng lấy từ tài liệu tham chiếu được nêu bên dưới. Không có bộ tinh chỉnh nguyên tử thực nghiệm riêng trong mô hình này.':'Giữ các điều kiện ghi trong bản gốc; nguồn không ghi nhiệt độ/áp suất thì không tự gán 25 °C / 1 atm. Dữ liệu truyền tải làm tròn tọa độ phân số tới 0,00000025; không có độ bất định hay ellipsoid nhiệt.'}</p><div class="crystal-downloads"><a href="${esc(meta.cif)}" download>Tải CIF</a><a href="${esc(meta.data)}" download>Tải tọa độ JSON</a><a href="${esc(meta.model)}" download>Tải mạng tinh thể GLB</a><a href="${esc(meta.source)}" target="_blank" rel="noopener noreferrer">${prototype?'Nguồn tham chiếu':'AMCSD'} ↗</a></div><div data-crystal-sites></div></details>
  </div>`;
  const stage=container.querySelector('.published-crystal-stage'),status=container.querySelector('[role=status]');
  container.querySelector('.crystal-controls').insertAdjacentHTML('beforeend', '<button type="button" data-crystal-atoms aria-pressed="true" disabled>Ẩn nguyên tử</button><button type="button" data-crystal-environment aria-pressed="true" disabled>Ẩn cảnh trưng bày</button><button type="button" data-crystal-fullscreen disabled>Toàn màn hình</button>');
  status.textContent = 'Kéo để xoay · Cuộn để thu/phóng · Chọn nguyên tử để xem tọa độ.';
  const displayNotes = document.createElement('details'); displayNotes.className = 'crystal-display-notes';
  displayNotes.innerHTML = '<summary>Quy ước hiển thị</summary><p>Cầu và màu là ký hiệu. Phần cầu thể hiện độ chiếm chỗ; lưới tối là vị trí trống. Nguyên tử biên được lặp để khép ô. Cảnh trưng bày là minh họa; không thuộc dữ liệu cấu trúc. Không suy diễn liên kết hay mật độ electron.</p>';
  status.after(displayNotes);
  let environment, showEnvironment = true, showAtoms = true;
  const hiddenElements = new Set();
  let renderer,scene,camera,controls,current,data,resizeObserver,visibilityObserver,raf=0,destroyed=false,visible=true,repeat=1,showCell=true,packed=false,packingScale=1;
  const rotating=container.querySelector('[data-crystal-rotate]');
  const fit=()=>{
    const rect=stage.getBoundingClientRect();frameCrystal(camera,controls,current,rect.width/Math.max(rect.height,1));
  };
  const applyAtomVisibility = () => current?.traverse(node => { if (node.userData.kind === 'atom') node.visible = showAtoms && !hiddenElements.has(node.userData.element); });
  const rebuild=()=>{
    if(current){scene.remove(current);disposeCrystal(current);}
    current=buildPublishedCrystal(data,repeat,{showCell,radiusScale:packed?packingScale:1});scene.add(current);fit();applyAtomVisibility();
    if(environment){scene.remove(environment);disposeCrystal(environment);}
    environment=specimenEnvironment(current,'z');environment.visible=showEnvironment;scene.add(environment);
  };
  container.querySelector('[data-crystal-start]').addEventListener('click',async event=>{
    event.currentTarget.disabled=true;status.textContent='Đang tải tọa độ tinh thể…';
    try {
      const response=await fetch(meta.data);if(!response.ok)throw Error(`HTTP ${response.status}`);data=await response.json();if(destroyed)return;
      renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
      scene=new THREE.Scene();scene.background=new THREE.Color('#dce8eb');scene.add(new THREE.HemisphereLight('#f2f6ff','#536f79',2));
      const light=new THREE.DirectionalLight('#ffffff',2.2);light.position.set(3,6,8);scene.add(light);
      camera=new THREE.PerspectiveCamera(36,1,.01,1000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=false;
      stage.replaceChildren(renderer.domElement);
      const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null;
      renderer.domElement.addEventListener('pointerdown',event=>pointerStart=[event.clientX,event.clientY]);
      renderer.domElement.addEventListener('pointerup',event=>{
        if(!pointerStart||Math.hypot(event.clientX-pointerStart[0],event.clientY-pointerStart[1])>5)return;
        const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
        raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(current,true).find(h=>h.object.visible&&h.object.userData.kind==='atom'&&h.object.userData.element!=='Vacancy');
        if(hit){const atom=hit.object.userData,fmt=n=>Number(n).toLocaleString('vi-VN',{maximumFractionDigits:6});container.querySelector('[data-crystal-selection]').textContent=`${atom.label} · ${atom.element} · chiếm chỗ ${fmt(atom.occupancy*100)}% · phân số (${atom.fractional.map(fmt).join('; ')}) · Cartesian (${atom.position.map(fmt).join('; ')}) Å`;}
      });
      resizeObserver=new ResizeObserver(()=>{const r=stage.getBoundingClientRect();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();});resizeObserver.observe(stage);
      visibilityObserver=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);visibilityObserver.observe(stage);
      rebuild();
      container.querySelectorAll('.crystal-controls button').forEach(b=>b.disabled=false);
      container.querySelector('[data-crystal-pack]').disabled=Object.keys(data.cellComposition).length!==1||data.atoms.some(a=>a.occupancy<.999);
      status.textContent='Tọa độ sẵn sàng · Kéo để xoay · Cuộn để thu/phóng.';status.dataset.state='ready';
      const legend=container.querySelector('.crystal-legend');
      for(const element of Object.keys(data.cellComposition)){
        const button=document.createElement('button');button.type='button';button.style.color=atomColor(element);button.textContent=`● ${element}`;button.title=`Ẩn/hiện nguyên tử ${element}`;button.setAttribute('aria-pressed','true');
        button.addEventListener('click',()=>{hiddenElements.has(element)?hiddenElements.delete(element):hiddenElements.add(element);button.setAttribute('aria-pressed',String(!hiddenElements.has(element)));applyAtomVisibility();});legend.append(button);
      }
      container.querySelector('[data-crystal-sites]').innerHTML=`<p>${data.asymmetricSites.length} vị trí bất đối xứng · ${data.symmetryOperations.length} phép đối xứng · ${data.mixedSiteCount} vị trí có nhiều loại nguyên tử. Trọng số thành phần trong ô: ${esc(Object.entries(data.cellComposition).map(([e,n])=>`${e}: ${n}`).join('; '))}.</p><div class="crystal-site-table"><table><thead><tr><th>Vị trí</th><th>Nguyên tố</th><th>x</th><th>y</th><th>z</th><th>Chiếm chỗ</th></tr></thead><tbody>${data.asymmetricSites.map(s=>`<tr><td>${esc(s.label)}</td><td>${esc(s.element)}</td>${s.fractional.map(v=>`<td>${v}</td>`).join('')}<td>${s.occupancy}</td></tr>`).join('')}</tbody></table></div>`;
      const loop=()=>{if(destroyed)return;if(visible){controls.update();renderer.render(scene,camera);}raf=requestAnimationFrame(loop);};loop();
    }catch(error){if(!destroyed){status.textContent=`Không tải được mạng tinh thể: ${error.message}. Có thể tải CIF ở phần nguồn.`;container.querySelector('[data-crystal-start]')?.removeAttribute('disabled');renderer?.dispose();}}
  });
  rotating.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;rotating.textContent=controls.autoRotate?'Tạm dừng xoay':'Tự động xoay';rotating.setAttribute('aria-pressed',String(controls.autoRotate));});
  container.querySelector('[data-crystal-repeat]').addEventListener('click',event=>{repeat=repeat===1?2:1;rebuild();event.currentTarget.textContent=repeat===1?'Hiện 2 × 2 × 2 ô':'Hiện 1 ô mạng';});
  container.querySelector('[data-crystal-pack]').addEventListener('click',event=>{
    packed=!packed;if(packed)packingScale=nearestPeriodicDistance(data)/(.32*2);
    rebuild();event.currentTarget.textContent=packed?'Cầu nhỏ':'Cầu tiếp xúc';event.currentTarget.setAttribute('aria-pressed',String(packed));
    container.querySelector('[data-crystal-selection]').textContent=packed?'Cầu tiếp xúc có bán kính bằng nửa khoảng cách láng giềng gần nhất trong mạng tuần hoàn; đây là mô hình đóng gói, không phải mật độ electron.':'Chọn một nguyên tử để xem tọa độ và độ chiếm chỗ.';
  });
  container.querySelector('[data-crystal-cell]').addEventListener('click',event=>{showCell=!showCell;current.children.find(c=>c.name==='Ô mạng và các trục a, b, c').visible=showCell;event.currentTarget.textContent=showCell?'Ẩn khung ô mạng':'Hiện khung ô mạng';event.currentTarget.setAttribute('aria-pressed',String(showCell));});
  container.querySelector('[data-crystal-reset]').addEventListener('click',fit);
  container.querySelector('[data-crystal-atoms]').addEventListener('click',event=>{showAtoms=!showAtoms;applyAtomVisibility();event.currentTarget.textContent=showAtoms?'Ẩn nguyên tử':'Hiện nguyên tử';event.currentTarget.setAttribute('aria-pressed',String(showAtoms));});
  container.querySelector('[data-crystal-environment]').addEventListener('click',event=>{showEnvironment=!showEnvironment;if(environment)environment.visible=showEnvironment;scene.background.set(showEnvironment?'#dce8eb':'#0c1520');event.currentTarget.textContent=showEnvironment?'Ẩn cảnh trưng bày':'Hiện cảnh trưng bày';event.currentTarget.setAttribute('aria-pressed',String(showEnvironment));});
  container.querySelector('[data-crystal-fullscreen]').addEventListener('click',()=>{stage.requestFullscreen?.().catch(()=>{});});
  return {destroy(){destroyed=true;cancelAnimationFrame(raf);resizeObserver?.disconnect();visibilityObserver?.disconnect();controls?.dispose();disposeCrystal(current);disposeCrystal(environment);renderer?.dispose();container.replaceChildren();}};
}
