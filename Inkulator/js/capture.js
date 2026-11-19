(function (root) {
  "use strict";
  const key = "inkulator-latest-capture";
  let latest = null, preferred = false, active = null, serial = 0;
  function init() {
    const button = document.createElement("button");
    button.dataset.action = "capture";
    button.title = "Chụp vùng trang viết";
    button.setAttribute("aria-label", button.title);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h10v10H7z"/></svg>';
    document.querySelector('#pen-dock [data-action="paste-image"]').before(button);
    const modes=document.createElement("button");modes.dataset.action="capture-options";modes.className="capture-mode-trigger";modes.textContent="⌄";modes.title="Chế độ chụp ảnh / chừa chỗ giải câu hỏi";modes.setAttribute("aria-label",modes.title);document.querySelector('.workspace-tabs [data-action="capture"]').after(modes);
    const tray = document.createElement("div");
    tray.id = "capture-tray"; tray.hidden = true;
    tray.innerHTML = '<button data-action="paste-capture" title="Dán ảnh vừa chụp" aria-label="Dán ảnh vừa chụp"><img alt="Ảnh vừa chụp"></button><button data-action="download-capture" title="Tải ảnh chụp PNG" aria-label="Tải ảnh chụp PNG">↓</button>';
    Renderer.area.append(tray);
    document.addEventListener("keydown", e => {
      if (!active) return;
      e.stopImmediatePropagation();
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
      else if (e.key !== "Tab" && !active.overlay.contains(e.target)) e.preventDefault();
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
    const entries = [["image", "▣ Ảnh để dán"], ["question", "↗ Chừa chỗ giải câu hỏi"]];
    App.popover(anchor, '<h3>Chế độ chụp</h3>' + entries.map(([id, label]) =>
      '<button class="menu-item" data-action="capture-' + id + '">' + label +
      (Store.state.settings.captureMode === id ? ' · mặc định' : '') + '</button>').join(''));
  }
  function updateTray() {
    const tray = document.getElementById("capture-tray");
    if (!tray) return;
    tray.hidden = !latest;
    if (latest) tray.querySelector("img").src = latest.src;
    for (const b of document.querySelectorAll('[data-action="capture"]')) b.classList.toggle("capture-ready", !!latest);
  }
  async function snapshot(rect, session) {
    const v = { ...Store.state.viewport }, pages = PageFlow.visible();
    const left = (rect.x - v.x) / v.zoom, top = (rect.y - v.y) / v.zoom;
    const right = left + rect.w / v.zoom, bottom = top + rect.h / v.zoom;
    const visible = pages.filter(({page, x, y}) => x < right && x + page.width > left && y < bottom && y + page.height > top);
    const budget = Store.economyMode() ? 2e6 : 5e6;
    const scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(budget / (rect.w * rect.h)));
    await Promise.all(visible.map(item => Renderer.awaitImages(item.page, { pdf: false })));
    if (active !== session) return null;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.w * scale);
    canvas.height = Math.round(rect.h * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e9eeeb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
      for (const { page, x, y } of visible) {
        const images = await pdfImages(page, scale * v.zoom);
        try {
          if (active !== session) return null;
          const z = scale * v.zoom;
          ctx.save();
          ctx.setTransform(z, 0, 0, z, scale * (v.x - rect.x) + z * x, scale * (v.y - rect.y) + z * y);
          ctx.beginPath(); ctx.rect(0, 0, page.width, page.height); ctx.clip();
          const x0 = Math.max(0, left - x), y0 = Math.max(0, top - y);
          Renderer.drawPaper(ctx, page, { x: x0, y: y0, w: Math.min(page.width, right - x) - x0, h: Math.min(page.height, bottom - y) - y0 });
          Renderer.objects(ctx, page, { pdfImages: images });
          ctx.restore();
        } finally { releaseImages(images); }
      }
      return { src: await png(canvas, 5.2e6), viewport: v, pages: visible };
    } finally { canvas.width = canvas.height = 1; }
  }
  function releaseImages(images) {
    for (const canvas of images.values()) canvas.width = canvas.height = 1;
  }
  async function pdfImages(page, scale) {
    const images = new Map(), visible = new Set(page.layers.filter(layer => layer.visible).map(layer => layer.id));
    const maxSize = Store.economyMode() ? 2200 : 3200;
    async function visit(o) {
      if (o.visible === false) return;
      if (o.type === "pdf") images.set(o.id, await PDFStudio.snapshotImage(o, Math.min(maxSize, Math.max(o.size.w, o.size.h) * scale)));
      if (o.type === "group") for (const child of o.data.children) await visit(child);
    }
    try {
      for (const o of page.objects) if (visible.has(o.layer)) await visit(o);
      return images;
    } catch (error) {
      releaseImages(images);
      throw error;
    }
  }
  async function png(canvas, maxBytes = Infinity) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    canvas.width = canvas.height = 1;
    if (!blob) throw Error("Không tạo được ảnh PNG.");
    if (blob.size > maxBytes) throw Error("Vùng chụp quá lớn. Hãy khoanh nhỏ hơn.");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  async function pageImage(page) {
    if (CanvasEngine.interacting) return null;
    const budget = Store.economyMode() ? 1e6 : 3e6;
    const scale = Math.min(1, Math.sqrt(budget / (page.width * page.height)));
    await Renderer.awaitImages(page, { pdf: false });
    if (CanvasEngine.interacting) return null;
    const images = await pdfImages(page, scale);
    try {
      if (CanvasEngine.interacting) return null;
      return await png(Renderer.pageCanvas(page, scale, { pdfImages: images }));
    } finally { releaseImages(images); }
  }
  function start(options = {}) {
    if (active) return;
    CanvasEngine.finishActive(); TeacherGeometry.cancel(); App.closePopover(); PenKeyboard.hide();
    serial++;
    const r = Renderer.area.getBoundingClientRect(), overlay = document.createElement("div");
    overlay.id = "capture-overlay";
    overlay.setAttribute("aria-label", "Kéo hình chữ nhật để chụp trang viết");
    overlay.innerHTML = '<div class="capture-shade"></div><div class="capture-guide">Kéo để chụp vùng · Esc để hủy ' +
      (options.onCapture ? '' : '<select id="capture-mode" aria-label="Chế độ chụp"><option value="image">Ảnh để dán</option><option value="question">Chừa chỗ giải câu hỏi</option></select>') +
      ' <button id="capture-cancel" type="button" aria-label="Hủy chụp">×</button></div><div class="capture-box" hidden></div>';
    document.body.append(overlay);
    const session = { overlay, frame: 0, bookId: Store.book().id, pageId: Store.current().id };
    active = session;
    const mode = overlay.querySelector("select");
    if (mode) mode.value = options.mode || Store.state.settings.captureMode;
    const box = overlay.querySelector(".capture-box"), shade = overlay.querySelector(".capture-shade");
    const point = e => ({ x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)) });
    const rect = p => ({ x: Math.min(session.start.x, p.x), y: Math.min(session.start.y, p.y), w: Math.abs(p.x - session.start.x), h: Math.abs(p.y - session.start.y) });
    const paint = () => {
      session.frame = 0;
      const b = session.rect, left = b.x + r.left, top = b.y + r.top;
      const right = left + b.w, bottom = top + b.h;
      box.hidden = false;
      box.style.transform = `translate(${left}px, ${top}px)`;
      box.style.width = b.w + "px";
      box.style.height = b.h + "px";
      shade.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px, 0 0)`;
    };
    overlay.querySelector("#capture-cancel").onclick = cancel;
    const keyTarget = mode || overlay.querySelector("#capture-cancel");
    keyTarget.focus({preventScroll:true});
    overlay.oncontextmenu = e => { e.preventDefault(); cancel(); };
    overlay.addEventListener("wheel", e => { if (!e.target.closest("select")) e.preventDefault(); }, { passive: false });
    overlay.onpointerdown = e => {
      if (e.button !== 0 || e.target.closest("button,select,option") || session.start) return;
      e.preventDefault();
      session.start = point(e);
      session.pointerId = e.pointerId;
      overlay.setPointerCapture(e.pointerId);
    };
    overlay.onpointermove = e => {
      if (session.pointerId !== e.pointerId) return;
      session.rect = rect(point(e));
      if (!session.frame) session.frame = requestAnimationFrame(paint);
    };
    overlay.onpointerup = e => {
      if (session.pointerId !== e.pointerId) return;
      session.pointerId = null;
      cancelAnimationFrame(session.frame);
      session.frame = 0;
      session.rect = rect(point(e));
      if (session.rect.w < 6 || session.rect.h < 6) {
        session.start = null;
        box.hidden = true;
        shade.style.clipPath = "";
        return App.toast("Kéo một vùng lớn hơn để chụp.");
      }
      paint();
      const callback = options.onCapture || (mode?.value === "question" ? QuestionPages.create : null);
      finish(session, callback).catch(error => {
        if (active === session) cancel();
        App.toast("Không lưu được ảnh chụp: " + error.message);
      });
    };
    overlay.onpointercancel = cancel;
  }
  async function finish(session, callback) {
    const rect = session.rect, shot = await snapshot(rect, session);
    if (active !== session) return;
    cancel();
    if (!shot || Store.book().id !== session.bookId || Store.current().id !== session.pageId) return;
    const { src, viewport, pages } = shot;
    if (callback) {
      const world = { x: (rect.x - viewport.x) / viewport.zoom, y: (rect.y - viewport.y) / viewport.zoom, w: rect.w / viewport.zoom, h: rect.h / viewport.zoom };
      const cx = world.x + world.w / 2, cy = world.y + world.h / 2;
      const source = pages.find(({ x, y, page }) => cx >= x && cy >= y && cx <= x + page.width && cy <= y + page.height);
      const sourceOffset = source ? { x: source.x, y: source.y } : null;
      if (source) { world.x -= source.x; world.y -= source.y; }
      return callback({ src, rect, viewport, world, sourceOffset, bookId: session.bookId, pageId: source?.page.id || session.pageId });
    }
    latest = { src, name: "Inkulator-Capture-" + new Date().toISOString().replace(/[:.]/g, "-") + ".png" };
    preferred = true;
    updateTray();
    const saved = root.InkulatorDesktop?.saveCapture ? await InkulatorDesktop.saveCapture(src) : await AssetStorage.put(key, src);
    App.toast(saved ? "Đã chụp và lưu sẵn. Bấm Dán để chèn ảnh." : "Đã chụp. Ảnh sẵn để Dán trong phiên này.");
  }
  function cancel() {
    serial++;
    if (active) { cancelAnimationFrame(active.frame); active.overlay.remove(); }
    active = null;
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
  root.CaptureStudio={init,start,options,cancel,paste,download,pageImage,releasePreference(){preferred=false;},get preferred(){return preferred;},get latest(){return latest;},get active(){return !!active;}};
})(window);
