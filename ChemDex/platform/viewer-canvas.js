// Software projection of the same 3D coordinates for devices without WebGL.
export function readSDF(raw) {
  const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/),atoms=[],bonds=[];
  if(lines[3]?.includes('V3000')) {
    let state='';
    for(const line of lines) {
      if(line.includes('BEGIN ATOM')){state='atom';continue;}
      if(line.includes('BEGIN BOND')){state='bond';continue;}
      if(line.includes('END ')){state='';continue;}
      const parts=line.trim().split(/\s+/);
      if(state==='atom') atoms.push({elem:parts[3],x:Number(parts[4]),y:Number(parts[5]),z:Number(parts[6])});
      if(state==='bond') bonds.push({a:Number(parts[4])-1,b:Number(parts[5])-1,order:Number(parts[3])});
    }
  } else {
    const n=Number(lines[3]?.slice(0,3)),m=Number(lines[3]?.slice(3,6));
    for(const line of lines.slice(4,4+n))atoms.push({elem:line.slice(31,34).trim(),x:Number(line.slice(0,10)),y:Number(line.slice(10,20)),z:Number(line.slice(20,30))});
    for(const line of lines.slice(4+n,4+n+m))bonds.push({a:Number(line.slice(0,3))-1,b:Number(line.slice(3,6))-1,order:Number(line.slice(6,9))});
  }
  if(!atoms.length || atoms.some(a=>![a.x,a.y,a.z].every(Number.isFinite)))throw new Error('Không đọc được tọa độ cấu trúc.');
  return {atoms,bonds};
}
export function createCanvasViewer(host, model, onPick) {
  const canvas=document.createElement('canvas');host.append(canvas);canvas.style.cssText='display:block;width:100%;height:100%;touch-action:none';
  const ctx=canvas.getContext('2d'), colors={H:'#e2e8f0',C:'#64748b',O:'#ef4444',N:'#3b82f6',S:'#facc15',Cl:'#34d399',Na:'#a78bfa',P:'#fb923c',Fe:'#f97316',Cu:'#d97706',Br:'#b45309'};
  let ax=.35,ay=.5,zoom=1,drag=null,moved=false,points=[],options={hydrogen:true,labels:false,style:'ball'};
  const center=['x','y','z'].map(k=>model.atoms.reduce((n,a)=>n+a[k],0)/model.atoms.length);
  const radius=Math.max(2,...model.atoms.map(a=>Math.hypot(a.x-center[0],a.y-center[1],a.z-center[2])));
  function draw() {
    const w=canvas.width,h=canvas.height,scale=Math.min(w,h)*.34/radius*zoom;
    ctx.fillStyle='#172235';ctx.fillRect(0,0,w,h);
    points=model.atoms.map((a,index)=>{
      const x=a.x-center[0],y=a.y-center[1],z=a.z-center[2],xx=x*Math.cos(ay)+z*Math.sin(ay),zz=-x*Math.sin(ay)+z*Math.cos(ay);
      return {x:w/2+xx*scale,y:h/2+(y*Math.cos(ax)-zz*Math.sin(ax))*scale,z:y*Math.sin(ax)+zz*Math.cos(ax),index,a};
    });
    if(options.style!=='sphere')for(const b of model.bonds){const a=points[b.a],c=points[b.b];if(!a||!c||!options.hydrogen&&(a.a.elem==='H'||c.a.elem==='H'))continue;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.strokeStyle='#a8b6ca';ctx.lineWidth=Math.max(2,scale*.1);ctx.stroke();}
    for(const p of [...points].sort((a,b)=>a.z-b.z)) {
      if(!options.hydrogen&&p.a.elem==='H')continue;
      const r=Math.max(3,Math.min(35,scale*(options.style==='sphere'?.8:options.style==='stick'?.14:.32)*(p.a.elem==='H'?.65:1)));
      const color=colors[p.a.elem]??'#a78bfa',gradient=ctx.createRadialGradient(p.x-r*.35,p.y-r*.35,r*.05,p.x,p.y,r);
      gradient.addColorStop(0,'#fff');gradient.addColorStop(.3,color);gradient.addColorStop(1,'#172235');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();p.r=r;
      if(options.labels){ctx.fillStyle='#e2e8f0';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(p.a.elem,p.x,p.y-r-5);}
    }
    ctx.fillStyle='#94a3b8';ctx.font='11px system-ui';ctx.fillText('Kéo để xoay · Cuộn để phóng to · Chế độ tương thích',14,h-15);
  }
  const resize=()=>{canvas.width=Math.max(1,host.clientWidth);canvas.height=Math.max(1,host.clientHeight);draw();};
  canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};moved=false;canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved ||= Math.abs(dx)+Math.abs(dy)>2;ay+=dx*.01;ax+=dy*.01;drag={x:e.clientX,y:e.clientY};draw();};
  canvas.onpointerup=e=>{if(!moved){const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;const point=[...points].sort((a,b)=>b.z-a.z).find(p=>(options.hydrogen||p.a.elem!=='H')&&Math.hypot(p.x-x,p.y-y)<Math.max(p.r??0,12));if(point)onPick({...point.a,index:point.index});}drag=null;};
  canvas.onpointercancel=()=>{drag=null;};
  canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.2,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));draw();};
  resize();
  return {resize,style:next=>{options=next;draw();},reset:()=>{ax=.35;ay=.5;zoom=1;draw();},pngURI:()=>canvas.toDataURL('image/png'),destroy:()=>canvas.remove()};
}
