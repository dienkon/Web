(function(root){
  "use strict";
  const names={solve:"Giải bài",hint:"Gợi ý",latex:"Đẹp công thức",draw:"Vẽ hình",check:"Kiểm tra bài",similar:"Bài tương tự"};
  const icons={solve:"=",hint:"?",latex:"∑",draw:"△",check:"✓",similar:"↗"};
  let region=null,result=null,busy=false,generation=0,inkTimer=0,inkBatch=[],autoNotice=false;
  const bridge=()=>root.InkulatorDesktop?.gemini||root.GeminiWeb;
  function init(){
    const b=document.createElement("button");b.dataset.action="ai-region";b.title="Khoanh vùng · trợ lý Toán 12";b.setAttribute("aria-label",b.title);b.textContent="✦";
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM20 2v4M18 4h4"/></svg>';
    document.querySelector('.workspace-tabs [data-action="capture"]').after(b);
    document.addEventListener("inkcommitted",event=>{
      if(!Store.state.settings.handwritingAI||!bridge()||navigator.onLine===false)return;
      clearTimeout(inkTimer);
      for(const item of event.detail||[])if(item.object.type==="stroke")inkBatch.push({bookId:Store.book().id,pageId:item.pageId,id:item.object.id});
      inkTimer=setTimeout(autoRecognize,2600);
    });
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){document.getElementById("ai-region-wheel")?.remove();}});
    window.addEventListener("offline",()=>{document.getElementById("ai-region-wheel")?.remove();if(busy)cancel();});
  }
  function start(){
    if(busy)return App.toast("Đang xử lý vùng trước. Có thể hủy trong bảng AI.");
    if(!bridge())return App.toast("Trợ lý Gemini hiện dùng trên bản cài Windows. Các công cụ vẽ vẫn hoạt động ngoại tuyến.");
    if(navigator.onLine===false)return App.toast("Đang ngoại tuyến. Có Internet rồi có thể dùng trợ lý; nét viết vẫn giữ nguyên.");
    document.getElementById("ai-region-wheel")?.remove();
    CaptureStudio.start({onCapture:showWheel});
  }
  function showWheel(value){
    if(!value.inkIds&&value.bookId===Store.book().id){const page=Store.book().pages.find(p=>p.id===value.pageId),b=value.world;const strokes=(page?.objects||[]).filter(o=>o.type==="stroke"&&o.position.x>=b.x&&o.position.y>=b.y&&o.position.x+o.size.w<=b.x+b.w&&o.position.y+o.size.h<=b.y+b.h);value.inkIds=strokes.map(o=>o.id);value.fingerprints=Object.fromEntries(strokes.map(o=>[o.id,JSON.stringify(o)]));}
    region=value;result=null;
    const wheel=document.createElement("section");wheel.id="ai-region-wheel";wheel.setAttribute("aria-label","Thao tác với vùng đã khoanh");
    const title=document.createElement("button");title.className="ai-wheel-center";title.textContent="×";title.title="Bỏ vùng chọn";title.onclick=()=>wheel.remove();wheel.append(title);
    Object.keys(names).forEach((action,i)=>{
      const b=document.createElement("button"),angle=(-90+i*60)*Math.PI/180;b.dataset.aiAction=action;b.title=names[action];b.innerHTML='<span aria-hidden="true">'+icons[action]+'</span><small>'+names[action]+'</small>';
      b.style.left=(112+76*Math.cos(angle))+"px";b.style.top=(112+76*Math.sin(angle))+"px";b.onclick=()=>{wheel.remove();ask(action,value);};wheel.append(b);
    });
    const area=Renderer.area,r=value.rect;let x=r.x+r.w+24,y=r.y+r.h/2-112;
    if(x+224>area.clientWidth-12)x=r.x-248;
    if(x<12){x=area.clientWidth-236;y=Math.min(r.y+r.h+24,area.clientHeight-280);}
    wheel.style.left=Math.max(12,Math.min(x,area.clientWidth-236))+"px";wheel.style.top=Math.max(12,Math.min(y,area.clientHeight-280))+"px";area.append(wheel);
  }
  function createPanel(){
    let panel=document.getElementById("teaching-ai");if(panel)return panel;
    panel=document.createElement("section");panel.id="teaching-ai";panel.className="teaching-ai";panel.hidden=true;
    panel.innerHTML='<header><strong>Trợ lý Toán 12</strong><button id="ai-close" title="Đóng">×</button></header><div id="ai-status" role="status"></div><div id="ai-result"></div><footer><button id="ai-cancel">Hủy yêu cầu</button><button id="ai-retry">Thử lại</button></footer>';
    document.body.append(panel);panel.querySelector("#ai-close").onclick=()=>{if(busy)cancel();panel.hidden=true;};panel.querySelector("#ai-cancel").onclick=cancel;return panel;
  }
  async function ask(action,value){
    if(busy)return;
    if(!bridge())return App.toast("Cần bản Windows để dùng Gemini.");
    if(navigator.onLine===false)return App.toast("Không có Internet. Vùng viết được giữ nguyên.");
    const current=++generation;region=value;result=null;busy=true;
    const panel=createPanel();panel.hidden=false;
    const status=panel.querySelector("#ai-status"),content=panel.querySelector("#ai-result");status.textContent="Đang "+names[action].toLowerCase()+" · Gemini 3.5 Flash-Lite…";content.replaceChildren();
    const image=document.createElement("img");image.className="ai-source-image";image.src=value.src;image.alt="Vùng được gửi tới Gemini";content.append(image);
    panel.querySelector("#ai-cancel").hidden=false;panel.querySelector("#ai-retry").hidden=true;
    try{
      const answer=await bridge().ask({action,src:value.src});if(generation!==current)return;
      result=answer;status.textContent="Kiểm tra kết quả trước khi chèn vào trang.";renderResult(content,answer,value,action);
    }catch(error){if(generation===current){status.textContent=error.message;panel.querySelector("#ai-retry").hidden=false;panel.querySelector("#ai-retry").onclick=()=>ask(action,value);}}
    finally{if(generation===current){busy=false;panel.querySelector("#ai-cancel").hidden=true;}}
  }
  function cancel(){generation++;busy=false;bridge()?.cancel().catch(()=>{});const status=document.getElementById("ai-status");if(status)status.textContent="Đã hủy. Vùng viết được giữ nguyên.";const button=document.getElementById("ai-cancel");if(button)button.hidden=true;}
  function destination(value,source=false){
    if(Store.book().id!==value.bookId)throw Error("Đã chuyển sổ tay. Trở về sổ chứa vùng đã khoanh trước khi chèn.");
    const index=Store.book().pages.findIndex(p=>p.id===value.pageId);if(index<0)throw Error("Trang nguồn đã bị xóa.");
    if(source&&index!==Store.state.pageIndex)Store.switchPage(index);
    return Store.current();
  }
  function button(parent,text,fn){const b=document.createElement("button");b.textContent=text;b.onclick=()=>Promise.resolve().then(fn).catch(e=>App.toast(e.message,7000));parent.append(b);return b;}
  function paragraph(parent,text,tag="p"){if(!text)return;const p=document.createElement(tag);p.textContent=text;parent.append(p);}
  function renderResult(content,answer,value,action){
    paragraph(content,answer.title,"h3");paragraph(content,answer.transcription);paragraph(content,answer.explanation);
    for(const warning of answer.warnings||[])paragraph(content,"Lưu ý: "+warning);
    if(answer.latex){const field=document.createElement("textarea");field.id="ai-latex";field.rows=4;field.value=answer.latex;field.setAttribute("aria-label","LaTeX nhận diện, có thể sửa");content.append(field);const preview=document.createElement("div");preview.className="formula-preview";content.append(preview);const update=()=>Formulas.preview(preview,field.value);field.oninput=update;update();
      button(content,"Chèn công thức đẹp",()=>{destination(value);Formulas.insert(field.value,{position:App.insertPosition(450,100)});App.toast("Đã chèn công thức; nét gốc được giữ nguyên.");});
      if(action==="latex")button(content,"Thay nét trong vùng bằng công thức",()=>replaceInk(value,field.value));
    }
    for(const step of answer.steps||[]){paragraph(content,step.title,"h4");paragraph(content,step.text);if(step.latex){const p=document.createElement("div");p.className="formula-preview";Formulas.preview(p,step.latex);content.append(p);}}
    if(action!=="latex")button(content,"Chèn nội dung vào trang",()=>insertAnswer(value,answer));
    for(const diagram of answer.diagrams||[]){
      try{const o=makeDiagram(diagram),c=document.createElement("canvas");c.width=300;c.height=220;o.size={w:300,h:220};o.position={x:0,y:0};Renderer.drawObject(c.getContext("2d"),o);content.append(c);paragraph(content,diagram.caption);button(content,"Chèn hình chỉnh sửa được",()=>{destination(value);const shape=makeDiagram(diagram);shape.position=App.insertPosition(shape.size.w,shape.size.h);Store.add(shape);App.setTool("select");});}catch{paragraph(content,"Hình gợi ý chưa tương thích. Chọn mẫu trong thư viện hình học.");}
    }
  }
  function makeDiagram(d){
    const catalog=d.solid?Geometry.solidCatalog:Geometry.flatCatalog;
    if(!catalog.some(([kind])=>kind===d.kind))throw Error("Mẫu hình chưa hỗ trợ.");
    const o=Panels.makeGeometry(d.kind,d.solid);
    if(Array.isArray(d.labels)&&d.labels.length){o.data.vertexLabels={};d.labels.slice(0,16).forEach((label,i)=>{if(typeof label==="string"&&label.trim().length<=12)o.data.vertexLabels[i]=label.trim();});}
    return o;
  }
  function replaceInk(value,tex){
    const page=destination(value,true),wanted=value.inkIds?new Set(value.inkIds):null,b=value.world;
    const ids=page.objects.filter(o=>o.type==="stroke"&&!o.locked&&page.layers.some(l=>l.id===o.layer&&!l.locked&&l.visible)&& (wanted?wanted.has(o.id):o.position.x>=b.x&&o.position.y>=b.y&&o.position.x+o.size.w<=b.x+b.w&&o.position.y+o.size.h<=b.y+b.h)).map(o=>o.id);
    if(!ids.length)throw Error("Chưa có nét viết nằm trọn trong vùng. Dùng Chèn công thức để giữ nét gốc.");
    if(value.inkIds&&ids.length!==value.inkIds.length)throw Error("Nét gốc đã thay đổi. Hãy nhận diện lại trước khi thay.");
    if(value.fingerprints&&ids.some(id=>JSON.stringify(page.objects.find(o=>o.id===id))!==value.fingerprints[id]))throw Error("Nét gốc đã thay đổi. Hãy nhận diện lại trước khi thay.");
    const render=Formulas.render(tex,Store.state.color,26),first=page.objects.find(o=>o.id===ids[0]);
    const object=Store.object("formula",{text:tex,tex:render.tex,fontSize:26},{position:{...first.position},size:{w:render.w,h:render.h},style:{color:Store.state.color,width:2,opacity:1}});
    Store.transaction(()=>{page.objects=page.objects.filter(o=>!ids.includes(o.id));page.objects.push(object);Store.state.selection=[object.id];});App.setTool("select");App.toast("Đã thay công thức. Undo để lấy lại nét viết.");
  }
  function insertAnswer(value,answer){
    const page=destination(value),startIndex=Store.state.pageIndex,start=App.insertPosition(600,300),newPages=[],entries=[],width=Math.min(760,page.width-100);let target=page,y=Math.max(60,Math.min(start.y,page.height-160));
    const room=height=>{if(y+height<=target.height-60)return;if(Store.book().pages.length+newPages.length>=300)throw Error("Sổ tay đã đạt giới hạn 300 trang.");target=Store.page();Object.assign(target,{width:page.width,height:page.height,paper:page.paper,showTitle:false});newPages.push(target);y=60;};
    const addText=text=>{if(!text)return;const limit=Math.max(10,Math.floor(width/12)),lines=String(text).split("\n").flatMap(line=>{const words=line.split(/\s+/),rows=[];let row="";for(const word of words){if((row+word).length>limit){rows.push(row);row="";}row+=(row?" ":"")+word;}rows.push(row);return rows;});const perPage=Math.max(1,Math.floor((page.height-140)/28));for(let i=0;i<lines.length;i+=perPage){const chunk=lines.slice(i,i+perPage),height=Math.max(32,chunk.length*28);room(height);entries.push({page:target,object:Store.object("text",{text:chunk.join("\n"),fontSize:22},{position:{x:60,y},size:{w:width,h:height}})});y+=height+12;}};
    const addMath=tex=>{if(!tex)return;let r;try{r=Formulas.render(tex,"#111111",26);}catch{addText(tex);return;}const scale=Math.min(1,width/r.w,(page.height-140)/r.h);room(r.h*scale);entries.push({page:target,object:Store.object("formula",{text:tex,tex:r.tex,fontSize:26},{position:{x:60,y},size:{w:r.w*scale,h:r.h*scale}})});y+=r.h*scale+16;};
    addText(answer.title);addText(answer.transcription);addText(answer.explanation);addMath(answer.latex);
    for(const step of answer.steps||[]){addText(step.title);addText(step.text);addMath(step.latex);}
    Store.transaction(()=>{Store.book().pages.splice(startIndex+1,0,...newPages);for(const entry of entries)entry.page.objects.push(entry.object);Store.state.selection=entries.filter(entry=>entry.page===page).map(entry=>entry.object.id);});PageFlow.fit("page");App.setTool("select");App.toast("Đã chèn nội dung"+(newPages.length?" và thêm "+newPages.length+" trang":"")+". Có thể Undo.");
  }
  async function autoRecognize(){
    if(!Store.state.settings.handwritingAI||navigator.onLine===false){inkBatch=[];return;}
    if(busy||CanvasEngine.interacting){inkTimer=setTimeout(autoRecognize,1500);return;}
    const batch=inkBatch;inkBatch=[];if(!batch.length)return;
    if(batch.some(item=>item.bookId!==Store.book().id||item.pageId!==Store.current().id))return;
    const ids=new Set(batch.map(item=>item.id)),objects=Store.current().objects.filter(o=>ids.has(o.id)&&o.type==="stroke");if(!objects.length)return;
    const x=Math.min(...objects.map(o=>o.position.x))-20,y=Math.min(...objects.map(o=>o.position.y))-20,w=Math.max(...objects.map(o=>o.position.x+o.size.w))-x+20,h=Math.max(...objects.map(o=>o.position.y+o.size.h))-y+20;
    if(w>2200||h>2200)return;
    const scale=Math.min(2,1600/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.ceil(Math.max(20,w)*scale);c.height=Math.ceil(Math.max(20,h)*scale);const ctx=c.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,c.width,c.height);ctx.scale(scale,scale);ctx.translate(-x,-y);objects.forEach(o=>Renderer.drawObject(ctx,o));
    if(!autoNotice){App.toast("Đang nhận diện công thức. Kiểm tra bản dàn trước khi thay nét.");autoNotice=true;}
    await ask("latex",{src:c.toDataURL("image/png"),bookId:Store.book().id,pageId:Store.current().id,world:{x,y,w,h},inkIds:objects.map(o=>o.id),fingerprints:Object.fromEntries(objects.map(o=>[o.id,JSON.stringify(o)]))});
  }
  async function settings(){
    const host=document.getElementById("panel-content"),section=document.createElement("section");section.className="ai-settings";
    section.innerHTML='<h3>Gemini · trợ lý Toán 12</h3><label class="field-row"><input id="setting-handwriting-ai" type="checkbox"><span>Nhận diện công thức viết tay khi dừng bút</span></label><p class="hint">Mặc định tắt. Khi bật và có Internet, vùng nét vừa viết được gửi tới Google để nhận diện; xem và sửa LaTeX trước khi thay nét. Công cụ khoanh vùng chỉ gửi vùng bạn chọn khi bấm một tác vụ.</p><label class="field"><span>Model</span><input readonly value="gemini-3.5-flash-lite"></label><label class="field"><span>Khóa API Gemini</span><input id="gemini-key" type="password" autocomplete="off" placeholder="Nhập khóa mới để thay đổi"></label><div class="tiny-buttons"><button id="gemini-key-save">Lưu khóa</button><button id="gemini-key-check">Kiểm tra kết nối</button><button id="gemini-key-remove">Xóa khóa</button></div><p id="gemini-key-status" class="hint" role="status"></p>';
    host.append(section);section.querySelector("#setting-handwriting-ai").checked=!!Store.state.settings.handwritingAI;
    section.querySelector("#setting-handwriting-ai").onchange=e=>{Store.state.settings.handwritingAI=e.target.checked;clearTimeout(inkTimer);inkBatch=[];Store.scheduleSave();};
    const status=section.querySelector("#gemini-key-status"),input=section.querySelector("#gemini-key");
    if(!bridge()){status.textContent="Cấu hình khóa trên bản Windows; khóa không nằm trong tệp sổ tay.";section.querySelectorAll("button").forEach(b=>b.disabled=true);return;}
    const update=async()=>{const s=await bridge().status();status.textContent=s.configured?(root.InkulatorDesktop?.gemini?"Đã có khóa, được mã hóa trên máy này.":"Đã có khóa trong phiên này; đóng/tải lại trang sẽ xóa khóa."):"Chưa có khóa API.";};
    for(const [id,fn] of [["save",async()=>{if(!input.value.trim())throw Error("Nhập khóa trước khi lưu.");await bridge().key(input.value.trim());input.value="";await update();}],["remove",async()=>{await bridge().key("");input.value="";await update();}],["check",async()=>{status.textContent="Đang kiểm tra…";await bridge().check();status.textContent="Kết nối Gemini 3.5 Flash-Lite thành công.";}]])section.querySelector("#gemini-key-"+id).onclick=async()=>{try{await fn();}catch(e){status.textContent=e.message;}};
    update().catch(e=>status.textContent=e.message);
  }
  root.TeachingAI={init,start,settings,ask,showWheel,replaceInk,makeDiagram,insertAnswer,get busy(){return busy;},get result(){return result;}};
})(window);
