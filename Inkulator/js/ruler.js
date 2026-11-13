(function(root){
  "use strict";
  let host,kind="ruler",angle=0,length=420,x=0,y=0,drag=null,positioned=false;
  const rad=()=>angle*Math.PI/180;
  function init(){
    host=document.createElement("section");host.id="teaching-ruler";host.hidden=true;
    host.innerHTML='<div class="ruler-body"></div><div class="ruler-controls"><button class="ruler-grip" title="Kéo để di chuyển">✥</button><select aria-label="Loại thước"><option value="ruler">Thước thẳng</option><option value="square">Ê ke 45°</option><option value="triangle">Ê ke 30° / 60°</option><option value="protractor">Thước đo góc</option></select><input aria-label="Góc xoay thước" type="number" min="-360" max="360" value="0" step="1"><span>°</span><input aria-label="Chiều dài thước" title="Chiều dài thước" type="range" min="180" max="700" value="420"><button data-ruler="draw" title="Kẻ cạnh thước lên trang">╱</button><button data-ruler="close" title="Cất thước">×</button></div>';
    Renderer.area.append(host);
    for(const [value,text] of [['compass','Compa'],['parabola','Thước parabol']]){const option=document.createElement('option');option.value=value;option.textContent=text;host.querySelector('select').append(option);}
    host.querySelector("select").onchange=e=>{kind=e.target.value;render();};
    host.querySelector('input[type="number"]').oninput=e=>{if(!Number.isFinite(e.target.valueAsNumber))return;angle=e.target.valueAsNumber;render();};
    host.querySelector('input[type="range"]').oninput=e=>{length=Number(e.target.value);render();};
    host.querySelector('[data-ruler="close"]').onclick=toggle;
    host.querySelector('[data-ruler="draw"]').onclick=draw;
    const grip=host.querySelector(".ruler-grip");
    grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,y:e.clientY,left:x,top:y};grip.setPointerCapture(e.pointerId);};
    grip.onpointermove=e=>{if(!drag)return;x=Math.max(10,Math.min(Renderer.area.clientWidth-100,drag.left+e.clientX-drag.x));y=Math.max(30,Math.min(Renderer.area.clientHeight-100,drag.top+e.clientY-drag.y));render();};
    grip.onpointerup=grip.onpointercancel=()=>drag=null;
    host.querySelector(".ruler-body").onwheel=e=>{e.preventDefault();angle+=(e.deltaY>0?1:-1)*(e.shiftKey?15:1);host.querySelector('input[type="number"]').value=angle;render();};
    render();
  }
  function render(){
    if(!host)return;host.style.left=x+"px";host.style.top=y+"px";
    const h=kind==="ruler"?55:kind==="triangle"?length/Math.sqrt(3):length/2;
    let path=kind==="ruler"?`M0 0H${length}V55H0Z`:kind==="protractor"?`M0 0A${length/2} ${length/2} 0 0 1 ${length} 0Z`:`M0 0H${length}L0 ${h}Z`;
    if(kind==='compass')path=`M0 0L${length/4} ${-h*.7}L${length/2} 0L${length/4} ${-h*.6}Z`;
    if(kind==='parabola')path=`M0 ${h}Q${length/2} ${-h} ${length} ${h}L${length} ${h+12}Q${length/2} ${-h+12} 0 ${h+12}Z`;
    let ticks="";
    if(kind==="protractor"){
      for(let d=0;d<=180;d+=5){const a=d*Math.PI/180,r=length/2,inner=r-(d%10?10:18),cx=r;const X=t=>cx+Math.cos(a)*t,Y=t=>-Math.sin(a)*t;ticks+=`<path d="M${X(r)} ${Y(r)}L${X(inner)} ${Y(inner)}"/>`;if(d%30===0)ticks+=`<text x="${X(r-30)}" y="${Y(r-30)+4}" text-anchor="middle">${d}°</text>`;}
    }else for(let n=0;n<=Math.floor(length/10);n++){const px=n*10;ticks+=`<path d="M${px} 0v${n%5?10:20}"/>`;if(n%10===0)ticks+=`<text x="${px+3}" y="36">${n/10}</text>`;}
    if(kind==='compass'||kind==='parabola')ticks='';
    const above=kind==='protractor'||kind==='compass';
    host.querySelector(".ruler-body").innerHTML=`<svg width="${length+12}" height="${h+24}" viewBox="-6 ${above?-h-6:-6} ${length+12} ${h+24}" style="position:absolute;left:-6px;top:${above?-h-6:-6}px;transform:rotate(${angle}deg);transform-origin:6px ${above?h+6:6}px"><path class="ruler-surface" d="${path}"/>${ticks}</svg>`;
    host.querySelector(".ruler-controls").style.marginTop=(kind==="protractor"?8:h+12)+"px";
  }
  function toggle(){Store.state.ruler=!Store.state.ruler;if(Store.state.ruler){if(!positioned){x=Math.max(20,(Renderer.area.clientWidth-length)/2);y=Math.max(180,Renderer.area.clientHeight*.4);positioned=true;}x=Math.min(x,Renderer.area.clientWidth-200);y=Math.min(y,Renderer.area.clientHeight-150);}host.hidden=!Store.state.ruler;document.querySelectorAll('[data-action="ruler"]').forEach(b=>b.classList.toggle("active",Store.state.ruler));Renderer.request();render();}
  function endpoints(){const v=Store.state.viewport,a=rad();return [{x:(x-v.x)/v.zoom,y:(y-v.y)/v.zoom},{x:(x+length*Math.cos(a)-v.x)/v.zoom,y:(y+length*Math.sin(a)-v.y)/v.zoom}];}
  function worldPoint(px,py){const a=rad(),v=Store.state.viewport;return {x:(x+px*Math.cos(a)-py*Math.sin(a)-v.x)/v.zoom,y:(y+px*Math.sin(a)+py*Math.cos(a)-v.y)/v.zoom};}
  function curvePoints(){return Array.from({length:181},(_,i)=>{if(kind==='compass'){const a=i*2*Math.PI/180;return worldPoint(length/2*Math.cos(a),length/2*Math.sin(a));}if(kind==='protractor'){const a=Math.PI-i*Math.PI/180;return worldPoint(length/2+length/2*Math.cos(a),-length/2*Math.sin(a));}const px=i*length/180;return worldPoint(px,length/2*((px-length/2)/(length/2))**2);});}
  function closest(p,points){let best=null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],q=project(p,{a,b}),distance=Math.hypot(q.x-p.x,q.y-p.y);if(!best||distance<best.distance)best={...q,distance};}return best;}
  function snapLine(p){if(!Store.state.ruler||host.hidden)return null;if(['compass','parabola','protractor'].includes(kind)){const curve=curvePoints(),q=closest(p,curve);if(q.distance*Store.state.viewport.zoom<18)return {curve};if(kind!=='protractor')return null;}const lines=[endpoints()];if(['square','triangle'].includes(kind)){const h=kind==='triangle'?length/Math.sqrt(3):length/2,A=worldPoint(0,0),B=worldPoint(length,0),C=worldPoint(0,h);lines.push([A,C],[B,C]);}for(const [a,b] of lines){const q=project(p,{a,b});if(Math.hypot(q.x-p.x,q.y-p.y)*Store.state.viewport.zoom<18)return {a,b};}return null;}
  function project(p,line){if(line.curve)return closest(p,line.curve);const {a,b}=line,dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return {x:a.x+t*dx,y:a.y+t*dy};}
  function draw(){
    const layer=Store.current().layers.find(l=>l.id==="ink");if(layer.locked||!layer.visible)return App.toast("Lớp nét bút đang khóa hoặc ẩn.");
    const points=['compass','parabola','protractor'].includes(kind)?curvePoints():endpoints(),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),w=Math.max(1,Math.max(...points.map(p=>p.x))-left),h=Math.max(1,Math.max(...points.map(p=>p.y))-top);
    Store.add(Store.object("stroke",{pen:"ballpoint",points:points.map(p=>[p.x-left,p.y-top,.5]),baseSize:{w,h}},{position:{x:left,y:top},size:{w,h}}));
  }
  root.RulerStudio={init,toggle,snapLine,project,endpoints};
})(window);
