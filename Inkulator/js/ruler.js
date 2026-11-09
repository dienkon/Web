(function(root){
  "use strict";
  let host,kind="ruler",angle=0,length=420,x=0,y=0,drag=null,positioned=false;
  const rad=()=>angle*Math.PI/180;
  function init(){
    host=document.createElement("section");host.id="teaching-ruler";host.hidden=true;
    host.innerHTML='<div class="ruler-body"></div><div class="ruler-controls"><button class="ruler-grip" title="Kéo để di chuyển">✥</button><select aria-label="Loại thước"><option value="ruler">Thước thẳng</option><option value="square">Ê ke 45°</option><option value="triangle">Ê ke 30° / 60°</option><option value="protractor">Thước đo góc</option></select><input aria-label="Góc xoay thước" type="number" min="-360" max="360" value="0" step="1"><span>°</span><input aria-label="Chiều dài thước" title="Chiều dài thước" type="range" min="180" max="700" value="420"><button data-ruler="draw" title="Kẻ cạnh thước lên trang">╱</button><button data-ruler="close" title="Cất thước">×</button></div>';
    Renderer.area.append(host);
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
    let ticks="";
    if(kind==="protractor"){
      for(let d=0;d<=180;d+=5){const a=d*Math.PI/180,r=length/2,inner=r-(d%10?10:18),cx=r;const X=t=>cx+Math.cos(a)*t,Y=t=>-Math.sin(a)*t;ticks+=`<path d="M${X(r)} ${Y(r)}L${X(inner)} ${Y(inner)}"/>`;if(d%30===0)ticks+=`<text x="${X(r-30)}" y="${Y(r-30)+4}" text-anchor="middle">${d}°</text>`;}
    }else for(let n=0;n<=Math.floor(length/10);n++){const px=n*10;ticks+=`<path d="M${px} 0v${n%5?10:20}"/>`;if(n%10===0)ticks+=`<text x="${px+3}" y="36">${n/10}</text>`;}
    host.querySelector(".ruler-body").innerHTML=`<svg width="${length+12}" height="${h+12}" viewBox="-6 ${kind==="protractor"?-h-6:-6} ${length+12} ${h+12}" style="position:absolute;left:-6px;top:${kind==="protractor"?-h-6:-6}px;transform:rotate(${angle}deg);transform-origin:6px ${kind==="protractor"?h+6:6}px"><path class="ruler-surface" d="${path}"/>${ticks}</svg>`;
    host.querySelector(".ruler-controls").style.marginTop=(kind==="protractor"?8:h+12)+"px";
  }
  function toggle(){Store.state.ruler=!Store.state.ruler;if(Store.state.ruler){if(!positioned){x=Math.max(20,(Renderer.area.clientWidth-length)/2);y=Math.max(180,Renderer.area.clientHeight*.4);positioned=true;}x=Math.min(x,Renderer.area.clientWidth-200);y=Math.min(y,Renderer.area.clientHeight-150);}host.hidden=!Store.state.ruler;document.querySelectorAll('[data-action="ruler"]').forEach(b=>b.classList.toggle("active",Store.state.ruler));Renderer.request();render();}
  function endpoints(){const v=Store.state.viewport,a=rad();return [{x:(x-v.x)/v.zoom,y:(y-v.y)/v.zoom},{x:(x+length*Math.cos(a)-v.x)/v.zoom,y:(y+length*Math.sin(a)-v.y)/v.zoom}];}
  function snapLine(p){if(!Store.state.ruler||host.hidden)return null;const [a,b]=endpoints(),dx=b.x-a.x,dy=b.y-a.y,t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy);if(t<0||t>1)return null;const q={x:a.x+t*dx,y:a.y+t*dy};return Math.hypot(q.x-p.x,q.y-p.y)*Store.state.viewport.zoom<18?{a,b}:null;}
  function project(p,line){const {a,b}=line,dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return {x:a.x+t*dx,y:a.y+t*dy};}
  function draw(){
    const layer=Store.current().layers.find(l=>l.id==="ink");if(layer.locked||!layer.visible)return App.toast("Lớp nét bút đang khóa hoặc ẩn.");
    const [a,b]=endpoints(),left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),w=Math.max(1,Math.abs(b.x-a.x)),h=Math.max(1,Math.abs(b.y-a.y));
    Store.add(Store.object("stroke",{pen:"ballpoint",points:[[a.x-left,a.y-top,.5],[b.x-left,b.y-top,.5]],baseSize:{w,h}},{position:{x:left,y:top},size:{w,h}}));
  }
  root.RulerStudio={init,toggle,snapLine,project,endpoints};
})(window);
