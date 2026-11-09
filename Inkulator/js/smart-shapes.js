(function(root){
  "use strict";
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function edgeDistance(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);}
  function simplify(points,tolerance){
    if(points.length<3)return points;
    let index=0,max=0;for(let i=1;i<points.length-1;i++){const d=edgeDistance(points[i],points[0],points.at(-1));if(d>max){max=d;index=i;}}
    return max>tolerance?[...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)]:[points[0],points.at(-1)];
  }
  function resample(points,count=80){
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i],points[i-1]));
    const length=lengths.at(-1);if(!length)return [];
    let index=1;return Array.from({length:count},(_,i)=>{const target=length*i/(count-1);while(index<lengths.length-1&&lengths[index]<target)index++;const t=(target-lengths[index-1])/(lengths[index]-lengths[index-1]||1);return [points[index-1][0]+t*(points[index][0]-points[index-1][0]),points[index-1][1]+t*(points[index][1]-points[index-1][1])];});
  }
  function detect(input,zoom=1){
    const points=[];for(const p of input||[])if(Array.isArray(p)&&p.slice(0,2).every(Number.isFinite)&&(!points.length||distance(p,points.at(-1))>.15/zoom))points.push(p.slice(0,2));
    if(points.length<2)return null;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top,diag=Math.hypot(w,h);
    if(diag*zoom<18)return null;
    const a=points[0],b=points.at(-1),chord=distance(a,b),length=points.slice(1).reduce((s,p,i)=>s+distance(p,points[i]),0);
    if(chord>diag*.8&&length/chord<1.08&&points.every(p=>edgeDistance(p,a,b)<Math.max(2/zoom,diag*.035))){
      return {kind:"line",position:{x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1])},size:{w:Math.max(.1,Math.abs(b[0]-a[0])),h:Math.max(.1,Math.abs(b[1]-a[1]))},data:{flip:(b[0]-a[0])*(b[1]-a[1])<0}};
    }
    if(points.length<6||chord>Math.max(9/zoom,diag*.16)||length<diag*1.9||length>diag*4.3)return null;
    const samples=resample([...points,a]),center=[(left+Math.max(...xs))/2,(top+Math.max(...ys))/2];
    const mx=samples.reduce((s,p)=>s+p[0],0)/samples.length,my=samples.reduce((s,p)=>s+p[1],0)/samples.length;
    const xx=samples.reduce((s,p)=>s+(p[0]-mx)**2,0),yy=samples.reduce((s,p)=>s+(p[1]-my)**2,0),xy=samples.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
    const theta=.5*Math.atan2(2*xy,xx-yy),cos=Math.cos(theta),sin=Math.sin(theta),rotated=samples.map(p=>[(p[0]-mx)*cos+(p[1]-my)*sin,-(p[0]-mx)*sin+(p[1]-my)*cos]);
    const ux=rotated.map(p=>p[0]),uy=rotated.map(p=>p[1]),cx=(Math.min(...ux)+Math.max(...ux))/2,cy=(Math.min(...uy)+Math.max(...uy))/2,rx=(Math.max(...ux)-Math.min(...ux))/2,ry=(Math.max(...uy)-Math.min(...uy))/2;
    const error=rotated.reduce((s,p)=>s+Math.abs(Math.hypot((p[0]-cx)/rx,(p[1]-cy)/ry)-1),0)/samples.length;
    const occupied=new Set(rotated.map(p=>Math.floor((Math.atan2((p[1]-cy)/ry,(p[0]-cx)/rx)+Math.PI)/(2*Math.PI)*16)%16));
    if(rx>6/zoom&&ry>6/zoom&&error<.065&&occupied.size>=14){
      const circle=rx/ry>.88&&rx/ry<1.14,r=circle?(rx+ry)/2:rx,s=circle?r:ry,px=mx+cx*cos-cy*sin,py=my+cx*sin+cy*cos;
      return {kind:circle?"circle":"ellipse",position:{x:px-r,y:py-s},size:{w:2*r,h:2*s},rotation:circle?0:theta*180/Math.PI};
    }
    // Split the closed loop at its two most distant points, so a start halfway
    // along a side does not turn a rectangle into a five-corner polygon.
    let start=0,end=1,max=0;for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){const d=distance(samples[i],samples[j]);if(d>max){max=d;start=i;end=j;}}
    const ring=[...samples.slice(start),...samples.slice(0,start)],split=end-start;
    let vertices=[...simplify(ring.slice(0,split+1),diag*.035).slice(0,-1),...simplify([...ring.slice(split),ring[0]],diag*.035).slice(0,-1)];
    let changed=true;while(changed&&vertices.length>3){changed=false;for(let i=0;i<vertices.length;i++)if(edgeDistance(vertices[i],vertices[(i+vertices.length-1)%vertices.length],vertices[(i+1)%vertices.length])<diag*.045){vertices.splice(i,1);changed=true;break;}}
    if(vertices.length<3||vertices.length>4)return null;
    const signs=vertices.map((p,i)=>{const q=vertices[(i+1)%vertices.length],r=vertices[(i+2)%vertices.length];return Math.sign((q[0]-p[0])*(r[1]-q[1])-(q[1]-p[1])*(r[0]-q[0]));});
    if(signs.some(s=>s!==signs[0])||vertices.some((p,i)=>distance(p,vertices[(i+1)%vertices.length])<diag*.14))return null;
    const errors=samples.map(p=>Math.min(...vertices.map((v,i)=>edgeDistance(p,v,vertices[(i+1)%vertices.length]))));
    if(errors.reduce((s,d)=>s+d,0)/errors.length>diag*.025||Math.max(...errors)>diag*.08)return null;
    if(vertices.length===4){
      const edges=vertices.map((p,i)=>{const q=vertices[(i+1)%4];return [q[0]-p[0],q[1]-p[1]];});
      const orthogonal=edges.every((e,i)=>Math.abs(e[0]*edges[(i+1)%4][0]+e[1]*edges[(i+1)%4][1])/(Math.hypot(...e)*Math.hypot(...edges[(i+1)%4]))<.22);
      if(orthogonal){const rw=(Math.hypot(...edges[0])+Math.hypot(...edges[2]))/2,rh=(Math.hypot(...edges[1])+Math.hypot(...edges[3]))/2,x=vertices.reduce((s,p)=>s+p[0],0)/4,y=vertices.reduce((s,p)=>s+p[1],0)/4;return {kind:"rectangle",position:{x:x-rw/2,y:y-rh/2},size:{w:rw,h:rh},rotation:Math.atan2(edges[0][1],edges[0][0])*180/Math.PI};}
    }
    return {kind:"polygon",position:{x:left,y:top},size:{w,h},data:{vertices:vertices.map(p=>[(p[0]-left)/w,(p[1]-top)/h]),smartKind:vertices.length===3?"triangle":"quadrilateral"}};
  }
  root.SmartShapes={detect};
})(typeof window!=="undefined"?window:globalThis);
