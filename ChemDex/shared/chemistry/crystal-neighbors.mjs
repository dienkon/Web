// Display connectivity, separate from the source CIF and chemical bond orders.
// Nonmetal contacts use covalent-radius cutoffs; ionic/metallic contacts use
// the local first coordination shell. Periodic images are explicit, never a
// cubic minimum-image shortcut (which fails for oblique cells).
const radii={H:.31,B:.84,C:.76,N:.71,O:.66,F:.57,Si:1.11,P:1.07,S:1.05,Cl:1.02,Ge:1.20,As:1.19,Se:1.20,Br:1.20,Te:1.38,I:1.39};
const cache=new WeakMap();
export const crystalCartesian=(data,f)=>data.basis.map(row=>row.reduce((s,v,i)=>s+v*f[i],0));
const key=p=>p.map(v=>Math.floor(v/4)).join(',');

export function periodicCrystalNeighbors(data){
  if(cache.has(data))return cache.get(data);
  const atoms=data.atoms,buckets=new Map(),candidates=[],nearest=atoms.map(()=>Infinity),maxDistance=7.5;
  // Enough images to cover the search sphere even for small/oblique cells.
  const [a,b,c]=data.basis[0].map((_,i)=>data.basis.map(row=>row[i]));
  const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const volume=Math.abs(a.reduce((s,v,i)=>s+v*cross(b,c)[i],0));
  const range=[cross(b,c),cross(c,a),cross(a,b)].map(v=>Math.ceil(maxDistance*Math.hypot(...v)/volume));
  for(let x=-range[0];x<=range[0];x++)for(let y=-range[1];y<=range[1];y++)for(let z=-range[2];z<=range[2];z++){
    for(let j=0;j<atoms.length;j++){
      const position=crystalCartesian(data,atoms[j].fractional.map((f,k)=>f+[x,y,z][k])),k=key(position);
      if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push({j,shift:[x,y,z],position});
    }
  }
  for(let i=0;i<atoms.length;i++){
    const atom=atoms[i],position=crystalCartesian(data,atom.fractional),bin=position.map(v=>Math.floor(v/4));
    for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++)for(const image of buckets.get(bin.map((v,k)=>v+[x,y,z][k]).join(','))??[]){
      const other=atoms[image.j],d=Math.hypot(...position.map((v,k)=>v-image.position[k]));
      const radius=radii[atom.element]&&radii[other.element]?(radii[atom.element]+radii[other.element]):null;
      // Exclude self, coincident alternatives and implausibly overlapping sites.
      if(d<Math.max(.45,radius?radius*.65:.6)||d>maxDistance)continue;
      nearest[i]=Math.min(nearest[i],d);
      candidates.push({a:i,b:image.j,shift:image.shift,distance:d,radius});
    }
  }
  const pureHydrogen=atoms.every(a=>a.element==='H');
  const hasAnions=atoms.some(a=>['O','S','Se','Te','F','Cl','Br','I','N'].includes(a.element));
  const result=candidates.filter(e=>{
    const first=atoms[e.a],second=atoms[e.b];
    if(first.element==='H'&&second.element==='H'&&!pureHydrogen)return false;
    // Some real homonuclear bonds (notably F2) are longer than a simple
    // covalent-radius sum. Keep a mutually nearest pair in that case.
    if(e.radius)return e.distance<=e.radius*1.20||e.distance<=Math.min(nearest[e.a],nearest[e.b])*1.08+1e-6;
    if(hasAnions&&!radii[first.element]&&!radii[second.element])return false;
    if(hasAnions&&(first.element==='H'||second.element==='H'))return false;
    return e.distance<=Math.max(nearest[e.a],nearest[e.b])*(hasAnions?1.20:1.08)+1e-6;
  });
  cache.set(data,result);return result;
}

function clipSegment(a,b,limit){
  let low=0,high=1;
  for(let k=0;k<3;k++){
    const delta=b[k]-a[k];
    if(Math.abs(delta)<1e-10){if(a[k]<-1e-7||a[k]>limit+1e-7)return null;continue;}
    const t0=-a[k]/delta,t1=(limit-a[k])/delta;
    low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));
    if(high-low<1e-7)return null;
  }
  return [a.map((v,k)=>v+(b[k]-v)*low),a.map((v,k)=>v+(b[k]-v)*high)];
}

function displayPeriodicEdges(data,repeat,edges,directed=false){
  const connections=[],seen=new Set();
  for(const edge of edges){
    const first=data.atoms[edge.a],second=data.atoms[edge.b];
    // Only generate a periodic edge once, then copy and clip at cell faces.
    if(!directed&&(edge.a>edge.b||edge.a===edge.b&&edge.shift.find(v=>v!==0)<0))continue;
    const starts=edge.shift.map(s=>Math.min(0,-s)-1),ends=edge.shift.map(s=>Math.max(repeat,repeat-s));
    for(let x=starts[0];x<=ends[0];x++)for(let y=starts[1];y<=ends[1];y++)for(let z=starts[2];z<=ends[2];z++){
      const a=first.fractional.map((v,k)=>v+[x,y,z][k]),b=second.fractional.map((v,k)=>v+edge.shift[k]+[x,y,z][k]);
      const clipped=clipSegment(a,b,repeat);if(!clipped)continue;
      const signature=clipped.map(p=>p.map(v=>v.toFixed(5)).join(',')).sort().join('|');if(seen.has(signature))continue;seen.add(signature);
      const elements=[first.element,second.element];
      if(edge.donor!==undefined&&!elements.includes(data.atoms[edge.donor].element))elements.push(data.atoms[edge.donor].element);
      connections.push({from:crystalCartesian(data,clipped[0]),to:crystalCartesian(data,clipped[1]),elements,distance:edge.distance});
    }
  }
  return connections;
}

export function crystalDisplayConnections(data,repeat=1,edges=periodicCrystalNeighbors(data)){
  return displayPeriodicEdges(data,repeat,edges);
}

const waterHydrogenCache=new WeakMap();
// A deliberately limited geometric DISPLAY convention for fully occupied,
// proton-ordered, pure H2O crystals. Do not generalize this to arbitrary O/N
// acceptors, hydrates, absent H positions, or proton-disordered averages.
// MDAnalysis: D-H <= 1.2 Å, D-A <= 3.0 Å, D-H-A >= 150 degrees.
// https://docs.mdanalysis.org/stable/documentation_pages/analysis/hydrogenbonds.html
export function periodicWaterHydrogenBonds(data){
  if(waterHydrogenCache.has(data))return waterHydrogenCache.get(data);
  const atoms=data.atoms,oxygen=atoms.map((a,i)=>({...a,i})).filter(a=>a.element==='O'),hydrogen=atoms.map((a,i)=>({...a,i})).filter(a=>a.element==='H');
  const empty=()=>{waterHydrogenCache.set(data,[]);return [];};
  if(!oxygen.length||hydrogen.length!==2*oxygen.length||oxygen.length+hydrogen.length!==atoms.length||atoms.some(a=>a.occupancy!==1))return empty();
  const [a,b,c]=data.basis[0].map((_,i)=>data.basis.map(row=>row[i]));
  const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const volume=Math.abs(a.reduce((s,v,i)=>s+v*cross(b,c)[i],0));
  if(!Number.isFinite(volume)||volume<1e-6)return empty();
  // Reciprocal bounds cover all neighbours in oblique as well as cubic cells.
  const range=[cross(b,c),cross(c,a),cross(a,b)].map(v=>Math.ceil(4.2*Math.hypot(...v)/volume));
  const images=[];
  for(let x=-range[0];x<=range[0];x++)for(let y=-range[1];y<=range[1];y++)for(let z=-range[2];z<=range[2];z++)for(const o of oxygen){
    const shift=[x,y,z];images.push({i:o.i,shift,position:crystalCartesian(data,o.fractional.map((v,k)=>v+shift[k]))});
  }
  const donors=[],counts=new Map();
  for(const h of hydrogen){
    const position=crystalCartesian(data,h.fractional);
    const close=images.filter(o=>{const distance=Math.hypot(...o.position.map((v,k)=>v-position[k]));return distance>=.55&&distance<=1.2;});
    if(close.length!==1)return empty(); // Ambiguous donor: do not invent a water molecule.
    const donor=close[0];counts.set(donor.i,(counts.get(donor.i)??0)+1);donors.push({h,position,donor});
  }
  if(oxygen.some(o=>counts.get(o.i)!==2))return empty();
  const edges=[];
  for(const {h,position,donor}of donors)for(const acceptor of images){
    const vector=acceptor.position.map((v,k)=>v-position[k]),distance=Math.hypot(...vector);
    if(distance<=1.2||Math.hypot(...acceptor.position.map((v,k)=>v-donor.position[k]))>3+1e-8)continue;
    const dh=donor.position.map((v,k)=>v-position[k]);
    const angle=Math.acos(Math.max(-1,Math.min(1,dh.reduce((s,v,k)=>s+v*vector[k],0)/(Math.hypot(...dh)*distance))))*180/Math.PI;
    if(angle<150-1e-8)continue;
    edges.push({a:h.i,b:acceptor.i,shift:acceptor.shift,distance,donor:donor.i,donorShift:donor.shift,angle,donorAcceptorDistance:Math.hypot(...acceptor.position.map((v,k)=>v-donor.position[k]))});
  }
  waterHydrogenCache.set(data,edges);return edges;
}

export function crystalDisplayHydrogenBonds(data,repeat=1,edges=periodicCrystalHydrogenBonds(data)){
  return displayPeriodicEdges(data,repeat,edges,true);
}

export function periodicCrystalHydrogenBonds(data){
  // These triplets have already been validated against original CIF labels,
  // reported geometry, operation IDs and periodic images by the compiler.
  if(data.hydrogenBondGeometry?.origin==='source-cif')return data.hydrogenBondGeometry.edges;
  return periodicWaterHydrogenBonds(data);
}
