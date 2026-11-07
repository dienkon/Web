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
    const width = document.createElement("button");
    width.dataset.action = "fit-width"; width.textContent = "↔";
    width.title = "Vừa chiều rộng"; width.setAttribute("aria-label", width.title);
    document.querySelector('.canvas-navigation [data-action="fit"]').after(width);
    const tray = document.createElement("div");
    tray.id = "capture-tray"; tray.hidden = true;
    tray.innerHTML = '<button data-action="paste-capture" title="Dán ảnh vừa chụp" aria-label="Dán ảnh vừa chụp"><img alt="Ảnh vừa chụp"><span>Dán ảnh chụp</span></button><button data-action="download-capture" title="Tải ảnh chụp PNG" aria-label="Tải ảnh chụp PNG">↓</button>';
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
    await Promise.all(pages.map(item => Renderer.awaitImages(item.page)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w*scale); canvas.height = Math.round(h*scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e9eeeb"; ctx.fillRect(0,0,canvas.width,canvas.height);
    for (const item of pages) {
      ctx.setTransform(scale*v.zoom,0,0,scale*v.zoom,scale*v.x,scale*v.y);
      ctx.save(); ctx.translate(item.x,item.y);
      ctx.beginPath(); ctx.rect(0,0,item.page.width,item.page.height); ctx.clip();
      Renderer.drawPaper(ctx,item.page,{x:0,y:0,w:item.page.width,h:item.page.height});
      Renderer.objects(ctx,item.page);
      if(item.page.showTitle && item.page.title) {
        ctx.fillStyle=item.page.paper === "dark" ? "#d7e3d9" : "#314f41";
        ctx.font="25px Segoe UI"; ctx.fillText(item.page.title,70,88);
      }
      ctx.restore();
    }
    return { canvas, w, h, viewport:v,bookId:Store.book().id,pageId:Store.current().id };
  }
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
      overlay.innerHTML = '<div class="capture-guide">Kéo để chụp vùng · Esc để hủy <button id="capture-cancel" type="button">×</button></div><div class="capture-box" hidden></div>';
      overlay.prepend(shot.canvas); Renderer.area.append(overlay);
      active = { overlay, shot, start: null, pointerId: null, callback:typeof options.onCapture==="function"?options.onCapture:null };
      const point = e => { const r = overlay.getBoundingClientRect(); return {x:Math.max(0,Math.min(shot.w,e.clientX-r.left)),y:Math.max(0,Math.min(shot.h,e.clientY-r.top))}; };
      const box = overlay.querySelector(".capture-box");
      const rect = p => ({x:Math.min(active.start.x,p.x),y:Math.min(active.start.y,p.y),w:Math.abs(p.x-active.start.x),h:Math.abs(p.y-active.start.y)});
      overlay.querySelector("#capture-cancel").onclick = cancel;
      overlay.oncontextmenu = e => { e.preventDefault(); cancel(); };
      overlay.onpointerdown = e => {
        if(e.button !== 0 || e.target.closest("button") || active?.start) return;
        e.preventDefault(); active.start=point(e); active.pointerId=e.pointerId;
        overlay.setPointerCapture(e.pointerId); box.hidden=false;
      };
      overlay.onpointermove = e => {
        if(!active?.start || active.pointerId !== e.pointerId) return;
        const r=rect(point(e)); Object.assign(box.style,{left:r.x+"px",top:r.y+"px",width:r.w+"px",height:r.h+"px"});
      };
      overlay.onpointerup = e => {
        if(!active?.start || active.pointerId !== e.pointerId) return;
        const r=rect(point(e));
        if(r.w<6 || r.h<6) { active.start=null;box.hidden=true;return App.toast("Kéo một vùng lớn hơn để chụp."); }
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
    const src=output.toDataURL("image/png");
    if(src.length>7e6) { cancel();throw Error("Vùng chụp quá lớn. Hãy khoanh nhỏ hơn."); }
    if(callback){
      const v=shot.viewport,region={src,rect,bookId:shot.bookId,pageId:shot.pageId,world:{x:(rect.x-v.x)/v.zoom,y:(rect.y-v.y)/v.zoom,w:rect.w/v.zoom,h:rect.h/v.zoom}};
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
    active?.overlay.remove(); active=null;
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
  root.CaptureStudio={init,start,cancel,paste,download,releasePreference(){preferred=false;},get preferred(){return preferred;},get latest(){return latest;},get active(){return !!active || preparing;}};
})(window);
