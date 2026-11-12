// Decorative geometry is kept outside the molecular model, picking and exports.
export function molecularStudio(model) {
  const atoms=model?.atoms ?? [];
  if(!atoms.length || atoms.some(a=>!['x','y','z'].every(k=>Number.isFinite(a[k]))))return [];
  const min=['x','y','z'].map(k=>Math.min(...atoms.map(a=>a[k])));
  const max=['x','y','z'].map(k=>Math.max(...atoms.map(a=>a[k])));
  const span=Math.max(3,...max.map((v,i)=>v-min[i]));
  const x=(min[0]+max[0])/2,z=(min[2]+max[2])/2,y=min[1]-span*.32;
  const vector=(x,y,z)=>({x,y,z});
  const cylinder=(cx,cy,cz,radius,height,color)=>({kind:'cylinder',spec:{start:vector(cx,cy,cz),end:vector(cx,cy+height,cz),radius,color,fromCap:1,toCap:1}});
  return [
    {kind:'box',spec:{center:vector(x,y-span*.18,z),dimensions:{w:span*2.6,h:span*.05,d:span*2.2},color:'#b4cdd0'}},
    cylinder(x,y-span*.14,z,span*.76,span*.10,'#678d97'),
    cylinder(x,y-span*.04,z,span*.72,span*.045,'#d7e8e8'),
    ...[0,1,2].flatMap(i=>[
      cylinder(x+span*(.95+i*.16),y-span*.15,z-span*.7,span*.045,span*.25,'#c2dce3'),
      cylinder(x+span*(.95+i*.16),y+span*.10,z-span*.7,span*.05,span*.025,'#297c8c'),
    ]),
  ];
}

export function mountMolecularStudio(viewer,model) {
  const shapes=molecularStudio(model).map(({kind,spec})=>kind==='box'?viewer.addBox(spec):viewer.addCylinder(spec));
  // The molecular fit uses a narrow depth slab. The studio lies outside that
  // slab, so expand clipping without changing the molecule's zoom or position.
  const spans=['x','y','z'].map(k=>Math.max(...model.atoms.map(a=>a[k]))-Math.min(...model.atoms.map(a=>a[k])));
  const depth=Math.max(12,4*Math.max(...spans));
  viewer.setSlab(-depth,depth);
  return {destroy(){for(const shape of shapes)viewer.removeShape(shape);}};
}

export function drawMolecularStudio(ctx,model,project) {
  const faces=[];
  const face=(points,color)=>{
    const projected=points.map(project);
    faces.push({points:projected,color,depth:projected.reduce((n,p)=>n+p.z,0)/projected.length});
  };
  for(const {kind,spec}of molecularStudio(model)){
    if(kind==='box'){
      const {center:c,dimensions:d}=spec;
      const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,z])=>({x:c.x+x*d.w/2,y:c.y+y*d.h/2,z:c.z+z*d.d/2}));
      for(const corners of [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]])face(corners.map(i=>p[i]),spec.color);
    }else{
      const ring=y=>Array.from({length:20},(_,i)=>({x:spec.start.x+Math.cos(i*Math.PI/10)*spec.radius,y,z:spec.start.z+Math.sin(i*Math.PI/10)*spec.radius}));
      const a=ring(spec.start.y),b=ring(spec.end.y);
      face(a,spec.color);face(b,spec.color);
      for(let i=0;i<20;i++)face([a[i],a[(i+1)%20],b[(i+1)%20],b[i]],spec.color);
    }
  }
  for(const {points,color}of faces.sort((a,b)=>a.depth-b.depth)){
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#597e8733';ctx.lineWidth=.5;ctx.stroke();
  }
}
