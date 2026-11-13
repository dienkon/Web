(function (root) {
  "use strict";
  const key = "inkulator-latest-capture";
  let latest = null, preferred = false, active = null, preparing = false, serial = 0;
  function init() {
    const button = document.createElement("button");
    button.dataset.action = "capture";
    button.title = "Chụp vùng trang viết";
    button.setAttribute("aria-label", button.title);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h10v10H7z"/></svg>';
    document.querySelector('#pen-dock [data-action="paste-image"]').before(button);
    const modes=document.createElement("button");modes.dataset.action="capture-options";modes.className="capture-mode-trigger";modes.textContent="⌄";modes.title="Chế độ chụp ảnh / chừa chỗ giải câu hỏi";modes.setAttribute("aria-label",modes.title);document.querySelector('.workspace-tabs [data-action="capture"]').after(modes);
    const width = document.createElement("button");
    width.dataset.action = "fit-width"; width.textContent = "↔";
    width.title = "Vừa chiều rộng"; width.setAttribute("aria-label", width.title);
    document.querySelector('.canvas-navigation [data-action="fit"]').after(width);
    const tray = document.createElement("div");
    tray.id = "capture-tray"; tray.hidden = true;
    tray.innerHTML = '<button data-action="paste-capture" title="Dán ảnh vừa chụp" aria-label="Dán ảnh vừa chụp"><img alt="Ảnh vừa chụp"></button><button data-action="download-capture" title="Tải ảnh chụp PNG" aria-label="Tải ảnh chụp PNG">↓</button>';
    Renderer.area.append(tray);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && (active || preparing)) { e.preventDefault(); e.stopImmediatePropagation(); cancel(); }
    }, true);
    new ResizeObserver(() => { if (active) cancel(); }).observe(Renderer.area);
    window.addEventListener("blur", () => { if (active) cancel(); });
    const pending = root.InkulatorDesktop?.readCapture
      ? InkulatorDesktop.readCapture().then(value => value?.src)
      : AssetStorage.get(key);
    const generation = serial;
    Promise.resolve(pending).then(src => {
      if (serial === generation && typeof src === "string" && src.startsWith("data:image/png;base64,")) {
        latest = { src, name: "Inkulator-Capture.png" }; updateTray();
      }
    }).catch(() => {});
  }
  function options(anchor){
    App.popover(anchor,'<h3>Chế độ chụp</h3><button class="menu-item" data-action="capture-image">▣ Chụp ảnh để dán · mặc định</button><button class="menu-item" data-action="capture-question">↗ Chụp câu hỏi · chừa chỗ giải ngay tại đây</button>');
  }
  function updateTray() {
    const tray = document.getElementById("capture-tray");
    if (!tray) return;
    tray.hidden = !latest;
    if (latest) tray.querySelector("img").src = latest.src;
    for (const b of document.querySelectorAll('[data-action="capture"]')) b.classList.toggle("capture-ready", !!latest);
  }
  async function snapshot() {
    const pages = PageFlow.visible(), v = { ...Store.state.viewport };
    const w = Renderer.area.clientWidth, h = Renderer.area.clientHeight;
    const scale = Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(5e6 / (w*h))));
    await Promise.all(pages.map(item => Renderer.awaitImages(item.page,{pdf:false})));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w*scale); canvas.height = Math.round(h*scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e9eeeb"; ctx.fillRect(0,0,canvas.width,canvas.height);
    for (const item of pages) {
      ctx.setTransform(scale*v.zoom,0,0,scale*v.zoom,scale*v.x,scale*v.y);
      ctx.save(); ctx.translate(item.x,item.y);
      ctx.beginPath(); ctx.rect(0,0,item.page.width,item.page.height); ctx.clip();
      Renderer.drawPaper(ctx,item.page,{x:0,y:0,w:item.page.width,h:item.page.height});
      const images=await pdfImages(item.page,scale*v.zoom);
      Renderer.objects(ctx,item.page,{pdfImages:images});
      for(const c of images.values())c.width=c.height=1;
      if(item.page.showTitle && item.page.title) {
        ctx.fillStyle=item.page.paper === "dark" ? "#d7e3d9" : "#314f41";
        ctx.font="25px Segoe UI"; ctx.fillText(item.page.title,70,88);
      }
      ctx.restore();
    }
    return { canvas, w, h, viewport:v,bookId:Store.book().id,pageId:Store.current().id,pages:pages.map(item=>({id:item.page.id,x:item.x,y:item.y,width:item.page.width,height:item.page.height})),areaRect:Renderer.area.getBoundingClientRect().toJSON() };
  }
  async function pdfImages(page,scale){const images=new Map();async function visit(o){if(o.visible===false)return;if(o.type==='pdf')images.set(o.id,await PDFStudio.snapshotImage(o,Math.max(o.size.w,o.size.h)*scale));if(o.type==='group')for(const child of o.data.children)await visit(child);}for(const o of page.objects)if(page.layers.some(l=>l.id===o.layer&&l.visible))await visit(o);return images;}
  async function pageImage(page){if(CanvasEngine.interacting)return null;const budget=Store.state.settings.performance==='economy'?1e6:3e6,scale=Math.min(1,Math.sqrt(budget/(page.width*page.height)));await Renderer.awaitImages(page,{pdf:false});const images=await pdfImages(page,scale);if(CanvasEngine.interacting){for(const c of images.values())c.width=c.height=1;return null;}const canvas=Renderer.pageCanvas(page,scale,{pdfImages:images});const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Không tạo được PNG xem trước.');const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});for(const c of images.values())c.width=c.height=1;canvas.width=canvas.height=1;return src;}
  async function start(options = {}) {
    if(active || preparing) return;
    CanvasEngine.finishActive(); TeacherGeometry.cancel(); App.closePopover(); PenKeyboard.hide();
    const generation = ++serial, bookId = Store.book().id;
    preparing = true;
    App.toast("Đang chuẩn bị ảnh trang viết…");
    try {
      const shot = await snapshot();
      if(serial !== generation || Store.book().id !== bookId) return;
      if(Renderer.area.clientWidth!==shot.w || Renderer.area.clientHeight!==shot.h) throw Error("Vùng viết vừa đổi kích thước. Bấm Chụp lại.");
      const overlay = document.createElement("div");
      overlay.id = "capture-overlay";
      overlay.setAttribute("aria-label", "Kéo hình chữ nhật để chụp trang viết");
      overlay.innerHTML = '<div class="capture-guide">Kéo để chụp vùng · Esc để hủy '+(options.onCapture?'':'<select id="capture-mode" aria-label="Chế độ capture"><option value="image">Ảnh để dán</option><option value="question">Chừa chỗ giải câu hỏi</option></select>')+' <button id="capture-cancel" type="button">×</button></div><div class="capture-box" hidden></div>';
      const r=shot.areaRect;
      shot.canvas.className='capture-frozen';Object.assign(shot.canvas.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
      const reveal=document.createElement('canvas');reveal.className='capture-reveal';reveal.width=shot.canvas.width;reveal.height=shot.canvas.height;reveal.getContext('2d').drawImage(shot.canvas,0,0);Object.assign(reveal.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});reveal.hidden=true;
      overlay.prepend(shot.canvas,reveal); document.body.append(overlay);
      active = { overlay, shot, start: null, pointerId: null, callback:typeof options.onCapture==="function"?options.onCapture:options.mode==="question"?QuestionPages.create:null };
      const mode=overlay.querySelector('#capture-mode');if(mode){mode.value=options.mode||'image';mode.onchange=()=>active.callback=mode.value==='question'?QuestionPages.create:null;}
      const point = e => ({x:Math.max(0,Math.min(shot.w,e.clientX-r.left)),y:Math.max(0,Math.min(shot.h,e.clientY-r.top))});
      const box = overlay.querySelector(".capture-box");
      const rect = p => ({x:Math.min(active.start.x,p.x),y:Math.min(active.start.y,p.y),w:Math.abs(p.x-active.start.x),h:Math.abs(p.y-active.start.y)});
      overlay.querySelector("#capture-cancel").onclick = cancel;
      overlay.oncontextmenu = e => { e.preventDefault(); cancel(); };
      overlay.onpointerdown = e => {
        if(e.button !== 0 || e.target.closest("button,select,option") || active?.start) return;
        e.preventDefault(); active.start=point(e); active.pointerId=e.pointerId;
        overlay.setPointerCapture(e.pointerId); box.hidden=false;
      };
      overlay.onpointermove = e => {
        if(!active?.start || active.pointerId !== e.pointerId) return;
        const b=rect(point(e)); Object.assign(box.style,{left:(b.x+r.left)+"px",top:(b.y+r.top)+"px",width:b.w+"px",height:b.h+"px"});reveal.hidden=false;reveal.style.clipPath='inset('+b.y+'px '+(shot.w-b.x-b.w)+'px '+(shot.h-b.y-b.h)+'px '+b.x+'px)';
      };
      overlay.onpointerup = e => {
        if(!active?.start || active.pointerId !== e.pointerId) return;
        const r=rect(point(e));
        if(r.w<6 || r.h<6) { active.start=null;box.hidden=true;reveal.hidden=true;return App.toast("Kéo một vùng lớn hơn để chụp."); }
        finish(r).catch(error=>App.toast("Không lưu được ảnh chụp: "+error.message));
      };
      overlay.onpointercancel = cancel;
      App.toast("Khoanh vùng hình và nét cần chụp.");
    } catch(error) { App.toast("Chụp vùng: "+error.message); }
    finally { preparing=false; }
  }
  async function finish(rect) {
    const { shot, callback } = active, source=shot.canvas;
    const sx=source.width/shot.w, sy=source.height/shot.h;
    const output=document.createElement("canvas");
    output.width=Math.max(1,Math.round(rect.w*sx)); output.height=Math.max(1,Math.round(rect.h*sy));
    output.getContext("2d").drawImage(source,rect.x*sx,rect.y*sy,rect.w*sx,rect.h*sy,0,0,output.width,output.height);
    const src=output.toDataURL("image/png");output.width=output.height=1;
    if(src.length>7e6) { cancel();throw Error("Vùng chụp quá lớn. Hãy khoanh nhỏ hơn."); }
    if(callback){
      const v=shot.viewport,region={src,rect,bookId:shot.bookId,pageId:shot.pageId,world:{x:(rect.x-v.x)/v.zoom,y:(rect.y-v.y)/v.zoom,w:rect.w/v.zoom,h:rect.h/v.zoom}};
      const sourcePage=shot.pages.find(p=>region.world.x+region.world.w/2>=p.x && region.world.x+region.world.w/2<=p.x+p.width && region.world.y+region.world.h/2>=p.y && region.world.y+region.world.h/2<=p.y+p.height);
      if(sourcePage){region.pageId=sourcePage.id;region.world.x-=sourcePage.x;region.world.y-=sourcePage.y;}
      if(callback===QuestionPages.create){
        const ctx=source.getContext("2d"),candidates=[];
        for(const offset of [42,78,114]){const x=Math.max(0,Math.min(shot.w-160,rect.x)),y=rect.y-offset;if(y<0)continue;const data=ctx.getImageData(Math.round(x*sx),Math.round(y*sy),Math.max(1,Math.round(150*sx)),Math.max(1,Math.round(30*sy))).data;let ink=0;for(let i=0;i<data.length;i+=16)if(data[i]+data[i+1]+data[i+2]<570)ink++;candidates.push({x,y,score:ink+offset*.001});}
        candidates.sort((a,b)=>a.score-b.score);const choice=candidates[0];if(choice)region.anchor={x:(choice.x-v.x)/v.zoom-(sourcePage?.x||0),y:(choice.y-v.y)/v.zoom-(sourcePage?.y||0)};
      }
      cancel();await callback(region);return;
    }
    latest={src,name:"Inkulator-Capture-"+new Date().toISOString().replace(/[:.]/g,"-")+".png"};
    preferred=true; updateTray(); cancel();
    let saved;
    if(root.InkulatorDesktop?.saveCapture) saved=await InkulatorDesktop.saveCapture(src);
    else saved=await AssetStorage.put(key,src);
    App.toast(saved ? "Đã chụp và lưu sẵn. Bấm Dán để chèn ảnh." : "Đã chụp. Ảnh sẵn để Dán trong phiên này.");
  }
  function cancel() {
    serial++; preparing=false;
    if(active){for(const canvas of active.overlay.querySelectorAll("canvas"))canvas.width=canvas.height=1;active.overlay.remove();} active=null;
  }
  async function paste() {
    if(!latest) return App.toast("Chưa có ảnh chụp. Bấm Chụp vùng trước.");
    preferred=false;
    const blob=await (await fetch(latest.src)).blob();
    return ClipboardStudio.insertFile(new File([blob],latest.name,{type:"image/png"}));
  }
  async function download() {
    if(!latest) return;
    Exporter.download(await (await fetch(latest.src)).blob(),latest.name,"image/png");
  }
  root.CaptureStudio={init,start,options,cancel,paste,download,pageImage,releasePreference(){preferred=false;},get preferred(){return preferred;},get latest(){return latest;},get active(){return !!active || preparing;}};
})(window);
