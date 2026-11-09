(function(root){
  "use strict";
  let header, links, frame=0;
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
    if(pages.length>=300)throw Error("Sổ tay đã đạt giới hạn 300 trang.");
    if(!source)throw Error("Trang nguồn không còn tồn tại.");
    if(source.questionSource)throw Error("Đóng trang câu hỏi trước khi chụp câu tiếp theo.");
    CanvasEngine.finishActive();
    const image=new Image();image.src=region.src;await image.decode();
    if(Store.book().id!==region.bookId||Store.book().pages!==pages||!pages.includes(source)||pages.length>=300)throw Error("Tài liệu nguồn vừa thay đổi.");
    const p=Store.page("Câu hỏi "+(pages.filter(page=>page.questionSource?.pageId===source.id && (!page.questionSource.rootId || page.questionSource.rootId===page.id)).length+1));
    p.showTitle=false;
    const b=region.world;
    p.questionSource={pageId:source.id,rootId:p.id,x:b.x,y:b.y,w:b.w,h:b.h};
    const w=Math.min(p.width-100,Math.max(900,image.naturalWidth)),h=w*image.naturalHeight/image.naturalWidth;
    p.height=Math.max(p.height,Math.ceil(h+650));
    p.objects.push(Store.object("image",{src:region.src},{position:{x:50,y:60},size:{w,h}}));
    Store.transaction(()=>{pages.push(p);Store.state.pageIndex=pages.length-1;Store.state.selection=[];});
    PageFlow.invalidateLayout();PageFlow.fit("page");
    App.toast("Trang câu hỏi đã sẵn sàng. Đóng × để trở về tài liệu.");
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
  function refresh(){
    if(!header)return;
    header.hidden=!sourceOf(Store.current());links.replaceChildren();
    for(const p of Store.book().pages){if(!sourceOf(p))continue;
      if(p.questionSource.rootId && p.questionSource.rootId!==p.id && Store.book().pages.some(root=>root.id===p.questionSource.rootId))continue;
      const b=document.createElement("button");b.className="question-page-link";b.dataset.questionId=p.id;
      b.textContent="↗ "+p.title;b.title="Mở trang câu hỏi để viết và giảng bài";b.onclick=()=>open(p.id);links.append(b);
    }position();
  }
  function position(){
    if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!links)return;
      const visible=PageFlow.visible(),v=Store.state.viewport,placed=[];
      for(const b of links.children){
        const p=Store.book().pages.find(p=>p.id===b.dataset.questionId),r=p?.questionSource,item=r&&visible.find(item=>item.page.id===r.pageId);
        b.hidden=!item;if(!item)continue;
        const x=(item.x+r.x)*v.zoom+v.x,y=(item.y+r.y)*v.zoom+v.y,w=r.w*v.zoom,h=r.h*v.zoom;
        const bw=b.offsetWidth||130,bh=32,aw=Renderer.area.clientWidth,ah=Renderer.area.clientHeight;
        const source=item.page;
        const occupied=source.objects.map(o=>({x:(item.x+o.position.x)*v.zoom+v.x,y:(item.y+o.position.y)*v.zoom+v.y,w:o.size.w*v.zoom,h:o.size.h*v.zoom}));
        const overlap=(a,c)=>Math.max(0,Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x))*Math.max(0,Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y));
        const candidates=[{x:x+w+8,y},{x:x-bw-8,y},{x,y:y+h+8},{x,y:y-bh-8}];
        for(let offset=1;offset<=8;offset++)for(const side of [-1,1])candidates.push({x:x+w+8,y:y+side*offset*(bh+8)});
        let best;for(const candidate of candidates){const rect={x:Math.max(8,Math.min(aw-bw-12,candidate.x)),y:Math.max(48,Math.min(ah-bh-65,candidate.y)),w:bw,h:bh};const score=overlap(rect,{x,y,w,h})*2+occupied.reduce((s,o)=>s+overlap(rect,o),0)+placed.reduce((s,o)=>s+overlap(rect,o)*10,0);if(!best||score<best.score)best={...rect,score};}
        Object.assign(b.style,{left:best.x+"px",top:best.y+"px"});placed.push(best);
      }
    });
  }
  root.QuestionPages={init,create,open,close,position};
})(window);
