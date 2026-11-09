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
    const p=Store.page("Câu hỏi "+(pages.filter(page=>page.questionSource?.pageId===source.id && (!page.questionSource.rootId || page.questionSource.rootId===page.id)).length+1));
    p.showTitle=false;
    const b=region.world;
    const v=Store.state.viewport,anchor=region.anchor||{x:b.x,y:Math.max(8,b.y-42/v.zoom)};
    p.questionSource={pageId:source.id,rootId:p.id,x:b.x,y:b.y,w:b.w,h:b.h,buttonX:Math.max(8,Math.min(source.width-100,anchor.x)),buttonY:Math.max(8,anchor.y)};
    const w=Math.min(p.width-100,Math.max(900,image.naturalWidth)),h=w*image.naturalHeight/image.naturalWidth;
    p.height=Math.max(p.height,Math.ceil(h+650));
    p.objects.push(Store.object("image",{src:region.src},{position:{x:50,y:60},size:{w,h}}));
    Store.transaction(()=>{pages.push(p);Store.state.pageIndex=pages.length-1;Store.state.selection=[];});
    PageFlow.invalidateLayout();PageFlow.fit("page");
    App.toast("Trang câu hỏi đã sẵn sàng. Đang đọc số câu/ý…");
    identify(region,p.id);
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
    for(const [id,button] of existing)if(!keep.has(id)){button.remove();previews.delete(id);}
    position();
  }
  function position(){
    if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!links)return;
      const visible=PageFlow.visible(),v=Store.state.viewport;
      for(const button of links.children){
        const p=Store.book().pages.find(p=>p.id===button.dataset.questionId),r=p?.questionSource,item=r&&visible.find(item=>item.page.id===r.pageId);
        button.hidden=!item;if(!item)continue;
        const point=previews.get(p.id)||{x:r.buttonX??r.x,y:r.buttonY??Math.max(8,r.y-60)},x=(item.x+point.x)*v.zoom+v.x,y=(item.y+point.y)*v.zoom+v.y;
        Object.assign(button.style,{left:x+"px",top:y+"px"});
        button.hidden=x>Renderer.area.clientWidth||y>Renderer.area.clientHeight||x+(button.offsetWidth||150)<0||y+32<0;
      }
    });
  }
  root.QuestionPages={init,create,open,close,position,identify};
})(window);
