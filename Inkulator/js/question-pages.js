(function(root){
  "use strict";
  let header, links, frame=0,suppressUntil=0;
  const previews=new Map();
  function init(){
    header=document.createElement("div");header.id="question-page-header";header.hidden=true;
    header.innerHTML='<strong>Trang câu hỏi</strong><button title="Đóng và trở lại tài liệu" aria-label="Đóng trang câu hỏi">×</button>';
    header.querySelector("button").onclick=close;
    links=document.createElement("div");links.id="question-page-links";
    Renderer.area.append(header,links);
    document.addEventListener("statechange",refresh);
    new ResizeObserver(position).observe(Renderer.area);
    refresh();
  }
  function sourceOf(p){return p.questionSource&&Store.book().pages.find(page=>page.id===p.questionSource.pageId);}
  async function create(region){
    if(Store.book().id!==region.bookId)throw Error("Đã chuyển sổ tay.");
    const pages=Store.book().pages,source=pages.find(p=>p.id===region.pageId);
    if(pages.length>=2000)throw Error("Sổ tay đã đạt giới hạn 2.000 trang.");
    if(!source)throw Error("Trang nguồn không còn tồn tại.");
    if(source.questionSource)throw Error("Đóng trang câu hỏi trước khi chụp câu tiếp theo.");
    CanvasEngine.finishActive();
    const image=new Image();image.src=region.src;await image.decode();
    if(Store.book().id!==region.bookId||Store.book().pages!==pages||!pages.includes(source)||pages.length>=2000)throw Error("Tài liệu nguồn vừa thay đổi.");
    const b=region.world,cut=Math.max(0,Math.min(source.height,b.y+b.h+20)),offset=Math.min(60,cut)-cut,top=[],bottom=[];
    // Clip in page coordinates, retaining the original vector PDF and editable ink.
    const slice=(o,y0,y1)=>{const c=o.clip||{x:-o.position.x,y:-o.position.y,w:source.width,h:source.height},lo=Math.max(y0,o.position.y+c.y),hi=Math.min(y1,o.position.y+c.y+c.h);if(hi<=lo)return null;const copy=Store.clone(o);copy.clip={x:c.x,y:lo-o.position.y,w:c.w,h:hi-lo};return copy;};
    for(const o of source.objects){
      const corners=[{x:0,y:0},{x:o.size.w,y:0},{x:o.size.w,y:o.size.h},{x:0,y:o.size.h}].map(p=>Renderer.worldPoint(o,p));
      const lo=Math.max(0,Math.min(...corners.map(p=>p.y)),o.clip?o.position.y+o.clip.y:-Infinity),hi=Math.min(source.height,Math.max(...corners.map(p=>p.y)),o.clip?o.position.y+o.clip.y+o.clip.h:Infinity);
      if(hi<=cut){top.push(o);continue;}if(lo>=cut){const copy=Store.clone(o);copy.position.y+=offset;bottom.push(copy);continue;}
      const a=slice(o,0,cut),z=slice(o,cut,source.height);if(a)top.push(a);if(z){z.id=Store.uid();z.position.y+=offset;bottom.push(z);}
    }
    const continuation=Store.page(source.title?source.title+' · tiếp':'Nội dung tiếp theo');Object.assign(continuation,{width:source.width,height:source.height,paper:source.paper,showTitle:false,layers:Store.clone(source.layers),objects:bottom});
    const oldRegions=source.inlineQuestions||[],moved=oldRegions.filter(q=>q.y>=cut),kept=oldRegions.filter(q=>q.y<cut),question=kept.find(q=>Math.abs(q.x-b.x)+Math.abs(q.y-b.y)+Math.abs(q.w-b.w)+Math.abs(q.h-b.h)<4)||{id:Store.uid(),title:'Câu hỏi '+(oldRegions.length+1),...b,buttonX:b.x,buttonY:Math.max(8,b.y-42/Store.state.viewport.zoom)};
    if(!kept.includes(question))kept.push(question);
    Store.transaction(()=>{source.objects=top;source.inlineQuestions=kept;if(bottom.length){continuation.inlineQuestions=moved.map(q=>({...q,y:q.y+offset,buttonY:(q.buttonY??q.y)+offset}));pages.splice(pages.indexOf(source)+1,0,continuation);}Store.state.pageIndex=pages.indexOf(source);Store.state.selection=[];});
    PageFlow.invalidateLayout();PageFlow.keepZoom();
    App.toast(bottom.length?'Đã giữ câu hỏi tại chỗ và chuyển phần bên dưới sang trang kế. Có thể Undo.':'Phía dưới câu hỏi đã có chỗ trống để giải.');
    identifyInline(region,source.id,question.id);
  }
  async function identifyInline(region,pageId,id){let result;try{result=await QuestionOCR.recognize(region);}catch{return;}if(Store.book().id!==region.bookId)return;const q=Store.book().pages.find(p=>p.id===pageId)?.inlineQuestions?.find(q=>q.id===id);if(!q)return;q.ocrText=String(result.text||'').slice(0,4000);q.ocrEngine=result.engine||'';if(result.label&&!q.manualTitle)q.title=result.label;Store.book().modified=new Date().toISOString();Store.state.dirty=true;Store.invalidateSnapshot();Store.emit();Store.scheduleSave();}
  function attachInline(button,pageId,id){
    const get=()=>Store.book().pages.find(p=>p.id===pageId)?.inlineQuestions?.find(q=>q.id===id);let drag=null,moved=false;
    button.onclick=()=>{if(performance.now()<suppressUntil)return;const q=get(),p=Store.book().pages.find(p=>p.id===pageId);if(!q||!p)return;Store.switchPage(Store.book().pages.indexOf(p));const v=Store.state.viewport;v.y=Renderer.area.clientHeight*.3-q.y*v.zoom;Store.state.viewMode='manual';Renderer.request();position();};
    button.onpointerdown=e=>{if(e.button!==0)return;const q=get();if(!q)return;e.stopPropagation();drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:q.buttonX,oy:q.buttonY,z:Store.state.viewport.zoom};moved=false;button.setPointerCapture(e.pointerId);};
    button.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved||=Math.hypot(dx,dy)>5;if(!moved)return;previews.set(id,{x:Math.max(0,drag.ox+dx/drag.z),y:Math.max(0,drag.oy+dy/drag.z)});position();};
    button.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;if(!moved)return;suppressUntil=performance.now()+350;const q=get(),point=previews.get(id);previews.delete(id);if(q&&point)Store.transaction(()=>{q.buttonX=point.x;q.buttonY=point.y;});};
    button.onpointercancel=()=>{drag=null;previews.delete(id);position();};
    button.oncontextmenu=async e=>{e.preventDefault();const q=get();if(!q)return;const result=await App.dialog('Đổi tên câu/ý','<label class="field"><span>Tên câu hỏi</span><input name="title" maxlength="150" value="'+App.escape(q.title)+'"></label>');const live=get();if(result?.title?.trim()&&live)Store.transaction(()=>{live.title=result.title.trim();live.manualTitle=true;});};
  }
  function open(id){
    const index=Store.book().pages.findIndex(p=>p.id===id);if(index<0)return;
    CanvasEngine.finishActive();TeacherGeometry.cancel();Store.switchPage(index);
  }
  function close(){
    const p=Store.current(),source=sourceOf(p);if(!source)return;
    CanvasEngine.finishActive();TeacherGeometry.cancel();
    const b=p.questionSource,index=Store.book().pages.indexOf(source);
    Store.switchPage(index);
    const z=Store.state.viewport.zoom;
    Store.state.viewMode="manual";
    Store.state.viewport.y=Math.min(40,Renderer.area.clientHeight/2-(b.y+b.h/2)*z);
    Renderer.request();position();
  }
  async function identify(region,id){
    let result;try{result=await QuestionOCR.recognize(region);}catch{return;}
    if(Store.book().id!==region.bookId)return;
    const p=Store.book().pages.find(p=>p.id===id);if(!p?.questionSource)return;
    p.questionSource.ocrText=String(result.text||"").slice(0,4000);p.questionSource.ocrEngine=result.engine||"";
    if(result.label&&!p.questionSource.manualTitle){p.title=result.label;for(const q of Store.book().pages)if(q.id!==p.id&&q.questionSource?.rootId===p.id)q.title=result.label+" · tiếp";}
    Store.book().modified=new Date().toISOString();Store.state.dirty=true;Store.invalidateSnapshot();Store.emit();Store.scheduleSave();
  }
  function attachDrag(button,page){
    const id=page.id;
    let drag=null,moved=false;
    button.onpointerdown=e=>{if(e.button!==0)return;page=Store.book().pages.find(p=>p.id===id);if(!page?.questionSource)return;e.stopPropagation();const r=page.questionSource;drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:r.buttonX??r.x,oy:r.buttonY??Math.max(8,r.y-60),zoom:Store.state.viewport.zoom};moved=false;button.setPointerCapture(e.pointerId);};
    button.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(!moved)return;
      const source=sourceOf(page);previews.set(page.id,{x:Math.max(0,Math.min(source.width-20,drag.ox+dx/drag.zoom)),y:Math.max(0,Math.min(source.height-20,drag.oy+dy/drag.zoom))});position();
    };
    button.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;if(!moved)return;e.preventDefault();e.stopPropagation();suppressUntil=performance.now()+350;const point=previews.get(page.id);previews.delete(page.id);const current=Store.book().pages.find(p=>p.id===page.id);if(current&&point)Store.transaction(()=>{current.questionSource.buttonX=point.x;current.questionSource.buttonY=point.y;});};
    button.onpointercancel=()=>{drag=null;previews.delete(page.id);position();};
    button.onlostpointercapture=()=>{if(drag){drag=null;previews.delete(id);position();}};
    button.oncontextmenu=async e=>{e.preventDefault();e.stopPropagation();page=Store.book().pages.find(p=>p.id===id);if(!page?.questionSource)return;const value=await App.dialog("Đổi tên câu/ý",'<label class="field"><span>Tên nút / trang câu hỏi</span><input name="title" maxlength="150" value="'+App.escape(page.title)+'"></label>');if(value?.title?.trim()){const live=Store.book().pages.find(p=>p.id===page.id);if(live)Store.transaction(()=>{live.title=value.title.trim();live.questionSource.manualTitle=true;});}};
  }
  function refresh(){
    if(!header)return;
    header.hidden=!sourceOf(Store.current());header.querySelector("strong").textContent=Store.current().questionSource?Store.current().title:"Trang câu hỏi";
    const existing=new Map([...links.children].map(button=>[button.dataset.questionId,button])),keep=new Set();
    for(const p of Store.book().pages){if(!sourceOf(p))continue;
      if(p.questionSource.rootId && p.questionSource.rootId!==p.id && Store.book().pages.some(root=>root.id===p.questionSource.rootId))continue;
      let button=existing.get(p.id);if(!button){button=document.createElement("button");button.className="question-page-link";button.dataset.questionId=p.id;button.title="Mở trang câu hỏi · kéo để di chuyển · chuột phải đổi tên";button.onclick=()=>{if(performance.now()>=suppressUntil)open(p.id);};attachDrag(button,p);links.append(button);}
      button.textContent="↗ "+p.title;keep.add(p.id);
    }
    for(const p of Store.book().pages)for(const q of p.inlineQuestions||[]){let button=existing.get(q.id);if(!button){button=document.createElement('button');button.className='question-page-link';button.dataset.questionId=q.id;button.dataset.inlinePage=p.id;button.title='Tới câu hỏi · kéo để di chuyển · chuột phải đổi tên';attachInline(button,p.id,q.id);links.append(button);}button.textContent=q.title;keep.add(q.id);}
    for(const [id,button] of existing)if(!keep.has(id)){button.remove();previews.delete(id);}
    position();
  }
  function position(){
    if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!links)return;
      const visible=PageFlow.visible(),v=Store.state.viewport;
      for(const button of links.children){
        const p=Store.book().pages.find(p=>p.id===(button.dataset.inlinePage||button.dataset.questionId)),r=button.dataset.inlinePage?p?.inlineQuestions?.find(q=>q.id===button.dataset.questionId):p?.questionSource,item=r&&visible.find(item=>item.page.id===(button.dataset.inlinePage||r.pageId));
        button.hidden=!item;if(!item)continue;
        const point=previews.get(button.dataset.questionId)||{x:r.buttonX??r.x,y:r.buttonY??Math.max(8,r.y-60)},x=(item.x+point.x)*v.zoom+v.x,y=(item.y+point.y)*v.zoom+v.y;
        Object.assign(button.style,{left:x+"px",top:y+"px"});
        button.hidden=x>Renderer.area.clientWidth||y>Renderer.area.clientHeight||x+(button.offsetWidth||150)<0||y+32<0;
      }
    });
  }
  root.QuestionPages={init,create,open,close,position,identify};
})(window);
