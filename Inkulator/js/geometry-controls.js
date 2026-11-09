(function(root) {
  "use strict";
  let open=false, objectId="", lastTab="construct",manualPosition=null;
  const icons={move:"✥",orbit:"⟳",segment:"╱",midpoint:"•",rename:"Aa",view:"▱",more:"⋯",finish:"✓",delete:"⌫",circumcircle:"◯",properties:"⚙"};
  const measure=new Set(["measure","angle","distancePlane","linePlaneAngle","planeAngle","commonPerpendicular"]);
  const marks=new Set(["rightAngle","equalTick","parallelArrow","highlightPlane"]);
  const categoryFor=mode=>measure.has(mode)?"measure":marks.has(mode)?"marks":"construct";
  function round(node,icon,label) {
    node.type="button";node.classList.add("geo-round");
    const title=label || node.title || node.textContent.trim();
    node.title=title;node.setAttribute("aria-label",title);node.textContent=icon;
    return node;
  }
  function action(name,icon,title) {
    const node=document.createElement("button");node.dataset.action=name;
    return round(node,icon,title);
  }
  function enhance(bar,o,available,titles,interaction) {
    if(objectId!==o.id) {objectId=o.id;open=false;lastTab="construct";manualPosition=null;}
    const modeButton=mode=>{
      let node=bar.querySelector('[data-geo-mode="'+mode+'"]');
      if(!node && available.includes(mode)) {
        node=document.createElement("button");node.dataset.geoMode=mode;
        node.onclick=()=>TeacherGeometry.setMode(mode,o);
      }
      return node ? round(node,icons[mode] || "△",titles[mode]) : null;
    };
    const more=round(bar.querySelector("#geo-more") || document.createElement("button"),icons.more,"Công cụ hình học");
    more.id="geo-more";more.onclick=()=>showMenu(o,available,titles);
    const view=bar.querySelector("#geo-view");
    const finish=round(bar.querySelector("#geo-finish"),icons.finish,"Xong · bỏ công cụ dựng");
    const ring=[action("move-selection",icons.move,"Di chuyển hình"),
      modeButton(o.type==="solid"?"orbit":"circumcircle"),modeButton("segment"),modeButton("midpoint"),modeButton("rename"),
      view ? round(view,icons.view,"Hướng nhìn") : action("edit-selection",icons.properties,"Thuộc tính hình"),
      more,action("delete",icons.delete,"Xóa hình")].filter(Boolean);
    const hint=bar.querySelector(".geometry-instruction"), ratio=bar.querySelector(".geo-ratio-controls"), line=bar.querySelector("#geo-inline-line-mode");
    bar.replaceChildren();bar.classList.add("radial-geometry");bar.classList.toggle("wheel-open",open);
    const hub=document.createElement("button");hub.id="geo-hub";
    round(hub,interaction ? icons[interaction.mode] || "△" : o.type==="solid"?"⬡":"△","Mở / thu gọn công cụ hình học");
    hub.setAttribute("aria-expanded",String(open));hub.onclick=()=>{open=!open;enhanceFromState();};
    hub.title="Chạm mở công cụ · kéo để dời khỏi hình";
    let drag=null,suppressClick=false;
    hub.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,left:parseFloat(bar.style.left)||0,top:parseFloat(bar.style.top)||0};hub.setPointerCapture(e.pointerId);};
    hub.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<8&&!suppressClick)return;suppressClick=true;manualPosition={x:drag.left+dx,y:drag.top+dy};position();};
    hub.onpointerup=()=>{drag=null;};hub.onpointercancel=()=>{drag=null;suppressClick=false;};
    hub.onclick=()=>{if(suppressClick){suppressClick=false;return;}open=!open;enhanceFromState();};
    const wheel=document.createElement("div");wheel.className="geo-wheel";wheel.hidden=!open;
    ring.forEach((node,i)=>{
      const angle=(-90+i*360/ring.length)*Math.PI/180;
      node.style.left=(94+70*Math.cos(angle))+"px";node.style.top=(94+70*Math.sin(angle))+"px";
      wheel.append(node);
    });
    const detail=document.createElement("div");detail.className="geo-step-bubble";
    if(hint?.textContent.trim()) detail.append(hint);
    if(ratio) detail.append(ratio);
    if(line) {line.title="Kiểu nét dựng";detail.append(line);}
    detail.hidden=!detail.childElementCount;
    bar.append(wheel,hub);
    if(interaction) {finish.classList.add("geo-finish-badge");bar.append(finish);}
    bar.append(detail);
    position();
  }
  function enhanceFromState() {TeacherGeometry.renderToolbar();Renderer.requestOverlay();}
  function showMenu(o,available,titles,tab=lastTab) {
    lastTab=tab;
    const anchor=document.getElementById("geo-more");
    const pop=App.popover(anchor,'<div class="geo-tool-tabs">'+[["construct","Dựng hình"],["measure","Đo"],["marks","Ký hiệu"],["edit","Chỉnh hình"]].map(([id,name])=>'<button data-geo-tab="'+id+'" class="'+(id===tab?"active":"")+'">'+name+'</button>').join("")+'</div><div class="geo-menu-grid"></div>');
    const grid=pop.querySelector(".geo-menu-grid");
    if(tab!=="edit") {
      for(const mode of available.filter(mode=>mode!=="orbit" && categoryFor(mode)===tab)) {
        const b=document.createElement("button");b.dataset.geoMode=mode;b.textContent=titles[mode];
        b.onclick=()=>{App.closePopover();TeacherGeometry.setMode(mode,o);};grid.append(b);
      }
    } else {
      const options=[
        ["focus","⌖ Phóng vừa hình"],["duplicate","⧉ Nhân bản"],["labels",o.data.labels===false?"Aa Hiện tên điểm":"Aa Ẩn tên điểm"],
        ["last","↶ Xóa nét dựng cuối"],["clear","⌫ Xóa nét dựng thêm"],
        ["label-position","Aa Vị trí tên đỉnh"],
        ...(o.type==="solid"?[["angles","⟳ Chỉnh góc nhìn"],["hidden",o.data.hiddenEdges===false?"┄ Hiện nét khuất":"┄ Ẩn nét khuất"]]:[]),
      ];
      for(const [id,label] of options) {const b=document.createElement("button");b.dataset.geoAction=id;b.textContent=label;b.onclick=e=>{e.stopPropagation();if(id==="label-position"||id==="angles")return adjust(o,id,b);edit(o,id);App.closePopover();};grid.append(b);}
      for(const [id,label] of [["transform-selection","⤢ Kích thước"],["edit-selection","⚙ Thuộc tính"],["copy","⧉ Sao chép"],["lock","▣ Khóa hình"],["delete","⌫ Xóa hình"]]) {
        const b=document.createElement("button");b.dataset.action=id;b.textContent=label;grid.append(b);
      }
      const palette=document.createElement("div");palette.className="geo-quick-colors";
      for(const color of ["#111111","#ce453d","#2674b8","#197d66","#ab752c"]) {
        const b=document.createElement("button");b.style.background=color;b.title="Màu "+color;b.setAttribute("aria-label",b.title);
        b.onclick=()=>{App.setColor(color);App.closePopover();};palette.append(b);
      }
      grid.append(palette);
    }
    pop.querySelectorAll("[data-geo-tab]").forEach(b=>b.onclick=e=>{e.stopPropagation();showMenu(o,available,titles,b.dataset.geoTab);});
    const r=anchor.getBoundingClientRect();
    pop.style.left=Math.max(12,Math.min(r.left,innerWidth-pop.offsetWidth-12))+"px";
    pop.style.top=Math.max(12,Math.min(r.bottom+10,innerHeight-pop.offsetHeight-24))+"px";
  }
  function adjust(o,id,anchor){
    if(id==="angles"){
      const pop=App.popover(anchor,'<h3>Góc nhìn hình không gian</h3><div class="tiny-buttons"><button data-turn="-15">↶ 15°</button><button data-turn="15">↷ 15°</button><button id="geo-reset-angle">Góc bài tập</button></div><label class="field"><span>Xoay đáy</span><input id="geo-yaw" type="range" min="-180" max="180" step="1"></label><label class="field"><span>Độ nghiêng hình chiếu</span><input id="geo-pitch" type="range" min="-80" max="80" step="1"></label>');
      const yaw=pop.querySelector("#geo-yaw"),pitch=pop.querySelector("#geo-pitch");
      const sync=()=>{yaw.value=o.data.rotation[1]*180/Math.PI;pitch.value=o.data.rotation[0]*180/Math.PI;};sync();
      for(const b of pop.querySelectorAll("[data-turn]"))b.onclick=()=>{Store.transaction(()=>o.data.rotation[1]+=Number(b.dataset.turn)*Math.PI/180);sync();};
      yaw.onchange=pitch.onchange=()=>Store.transaction(()=>{o.data.rotation=[Number(pitch.value)*Math.PI/180,Number(yaw.value)*Math.PI/180];});
      pop.querySelector("#geo-reset-angle").onclick=()=>{Store.transaction(()=>{o.data.rotation=Geometry.defaultRotation(o.data.kind);o.rotation=Geometry.defaultDrawingRotation(o.data.kind);o.data.projection=Geometry.defaultProjection(o.data.kind);});sync();};return;
    }
    const points=TeacherGeometry.points(o).filter(p=>p.key.startsWith("v:"));
    const pop=App.popover(anchor,'<h3>Vị trí tên đỉnh</h3><label class="field"><span>Đỉnh</span><select id="geo-label-vertex"></select></label><div class="geo-label-directions"></div><button id="geo-label-auto" class="full">Tự tránh cạnh và tên khác</button>');
    const select=pop.querySelector("select");for(const p of points){const opt=document.createElement("option");opt.value=p.key.slice(2);opt.textContent=p.label;select.append(opt);}
    for(const [label,x,y] of [["↖",-25,-12],["↑",-6,-18],["↗",12,-12],["←",-28,5],["→",14,5],["↙",-25,26],["↓",-6,30],["↘",12,26]]){const b=document.createElement("button");b.textContent=label;b.title="Đặt tên về hướng "+label;b.onclick=()=>Store.transaction(()=>{o.data.labelOffsets||={};o.data.labelOffsets[select.value]={x,y};});pop.querySelector(".geo-label-directions").append(b);}
    pop.querySelector("#geo-label-auto").onclick=()=>Store.transaction(()=>{if(o.data.labelOffsets)delete o.data.labelOffsets[select.value];});
  }
  function edit(o,id) {
    if(id==="focus") {
      const b=Renderer.selectionBounds(o),v=Store.state.viewport,area=Renderer.area;
      const corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>Renderer.worldPoint(o,p));
      const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
      const z=Math.min(4,(area.clientWidth-120)/Math.max(w,1),(area.clientHeight-180)/Math.max(h,1));
      Store.state.viewMode="manual";Store.state.viewport={zoom:Math.max(.2,z),x:area.clientWidth/2-(left+w/2)*z,y:(area.clientHeight-40)/2-(top+h/2)*z};
      App.updateZoom();Renderer.request();return;
    }
    if(id==="duplicate") {const copy=Store.clone(o);copy.id=Store.uid();copy.position.x+=24/Store.state.viewport.zoom;copy.position.y+=24/Store.state.viewport.zoom;copy.zIndex=Store.current().objects.length;Store.add(copy);return;}
    Store.transaction(()=>{
      if(id==="labels") o.data.labels=o.data.labels===false;
      if(id==="hidden") o.data.hiddenEdges=o.data.hiddenEdges===false;
      if(id==="last") { if(o.data.constructions?.length)o.data.constructions.pop();else o.data.aux?.pop(); }
      if(id==="clear") {o.data.constructions=[];o.data.aux=[];}
    });
  }
  function position() {
    const selected=Store.selected(),bar=document.getElementById("geometry-toolbar"),selection=document.getElementById("selection-tools");
    const o=selected.length===1 ? selected[0] : null;
    const one=o && ["solid","geometry"].includes(o.type) && !o.locked && !bar.hidden;
    selection.classList.toggle("near-geometry",!!one);
    if(!one) {selection.style.left="";selection.style.top="";selection.style.bottom="";if(!o)objectId="";return;}
    bar.classList.add("near-geometry");
    const b=Renderer.selectionBounds(o),v=Store.state.viewport,area=Renderer.area;
    const corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>Renderer.worldPoint(o,p));
    const xs=corners.map(p=>p.x*v.zoom+v.x),ys=corners.map(p=>p.y*v.zoom+v.y);
    const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),size=open?188:52;
    // Reserve space for vertex names, corner handles and the rotation handle.
    const gap=62,midX=(left+right-size)/2,midY=(top+bottom-size)/2;
    const avoid={x:left-gap,y:top-gap,w:right-left+gap*2,h:bottom-top+gap*2};
    const clamp=p=>({x:Math.max(68,Math.min(p.x,area.clientWidth-size-18)),y:Math.max(16,Math.min(p.y,area.clientHeight-size-68))});
    const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    const candidates=[{x:right+gap,y:midY},{x:left-size-gap,y:midY},{x:midX,y:bottom+gap},{x:midX,y:top-size-gap},{x:area.clientWidth-size-18,y:16},{x:68,y:16}].map(clamp);
    const dock=document.getElementById("pen-dock")?.getBoundingClientRect(),areaRect=area.getBoundingClientRect();
    const obstruction=dock?{x:dock.left-areaRect.left,y:dock.top-areaRect.top,w:dock.width,h:dock.height}:null;
    const score=p=>overlap({...p,w:size,h:size},avoid)*10+(obstruction?overlap({...p,w:size,h:size},obstruction)*20:0);
    const chosen=manualPosition?clamp(manualPosition):candidates.reduce((best,p)=>score(p)<score(best)?p:best,candidates[0]);
    let x=chosen.x,y=chosen.y;
    const bubble=bar.querySelector(".geo-step-bubble");
    const extra=bubble && !bubble.hidden ? bubble.offsetHeight+12 : 0;
    x=Math.max(68,Math.min(x,area.clientWidth-size-16));y=Math.max(12,Math.min(y,area.clientHeight-size-60));
    bar.style.left=x+"px";bar.style.top=y+"px";bar.style.bottom="auto";
    if(bubble) {
      const width=Math.min(260,area.clientWidth-80);bubble.style.width=width+"px";
      bubble.style.left=Math.max(-x+12,Math.min(size/2-width/2,area.clientWidth-x-width-12))+"px";
      let hintY=Math.max(bottom+36,y+size+8);
      if(hintY+bubble.offsetHeight>area.clientHeight-56) hintY=Math.min(top-bubble.offsetHeight-42,y-bubble.offsetHeight-8);
      hintY=Math.max(12,Math.min(hintY,area.clientHeight-bubble.offsetHeight-56));
      bubble.style.top=(hintY-y)+"px";
    }
  }
  root.GeometryControls={adjust,enhance,position,categoryFor,collapse(){open=false;},edit};
})(window);
