(function (root) {
  "use strict";
  const icons = {
    menu: "M3 6h18M3 12h18M3 18h18",
    new: "M14 2H5v20h14V7zM14 2v6h6M8 15h8M12 11v8",
    open: "M3 7h7l2 2h9l-3 11H3zM3 7V4h7l2 3h7v2",
    save: "M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-7h10v7",
    undo: "M8 4L3 9l5 5M3 9h11a7 7 0 0 1 0 14",
    redo: "M16 4l5 5-5 5M21 9H10a7 7 0 0 0 0 14",
    copy: "M8 8h13v13H8zM16 8V3H3v13h5",
    paste: "M8 5H4v17h16V5h-4M8 3h8v5H8zM8 12h8M8 16h8",
    settings: "M5 3v18M12 3v18M19 3v18M2 8h6M9 16h6M16 10h6",
    pen: "M4 17L16 3l5 5L8 21H3zM14 5l5 5M4 17l4 4",
    highlighter: "M4 16L14 4l6 5-10 12zM4 16l6 5M2 22h11",
    eraser: "M3 14L14 3l8 8L11 22H9zM8 9l8 8M11 22h11",
    select: "M5 2l14 12-7 1-3 7z",
    lasso:
      "M8 18c-7-1-8-12 2-15 9-3 15 5 10 11-3 4-11 4-14 0-4-5 3-7 4-3 2 5-2 10-6 12",
    shape: "M4 4h16v16H4z",
    text: "M3 4h18M12 4v17M8 21h8",
    pan: "M5 11V7a2 2 0 0 1 4 0V4a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v4a2 2 0 0 1 4 0v6l-5 6H9l-7-8a2 2 0 0 1 3-3l4 4V7",
    ruler: "M3 16L16 3l6 6L9 22zM7 12l3 3M11 8l3 3M15 4l3 3",
    image: "M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M16 7h.01",
  };
  const tools = {
    pen: "Bút bi",
    highlighter: "Bút đánh dấu",
    eraser: "Tẩy",
    select: "Chọn / di chuyển",
    lasso: "Khoanh vùng",
    shape: "Hình dạng",
    text: "Văn bản",
    pan: "Kéo trang",
    laser: "Bút laser",
  };
  const names = {
    graph: ["GRAPH STUDIO", "Đồ thị hàm số"],
    geometry: ["GEOMETRY LIBRARY", "Hình học phẳng"],
    solid: ["SPATIAL GEOMETRY", "Hình học không gian"],
    paper: ["YOUR WORKSPACE", "Kiểu giấy"],
    layers: ["LAYER MANAGER", "Quản lý lớp"],
    settings: ["PREFERENCES", "Cài đặt"],
    math: ["MATH TOOLS", "Công cụ toán"],
    pdf: ["PDF WORKSPACE", "Tài liệu PDF"],
    image: ["CLEAN DIAGRAM", "Chỉnh ảnh / tách nền"],
  };
  let toastTimer = 0,
    pagesVisible = true,
    refreshTimer = 0,
    thumbObserver,
    pageListKey = "";
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const svg = (id) =>
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    icons[id] +
    '"/></svg>';
  function button(icon, label, action, extra = "") {
    return (
      '<button class="icon-button" data-action="' +
      action +
      '" title="' +
      label +
      '" aria-label="' +
      label +
      '" ' +
      extra +
      ">" +
      svg(icon) +
      "</button>"
    );
  }
  function init() {
    Store.load();
    DocumentFiles.loadPreferences();
    document.body.classList.toggle(
      "dark",
      Store.state.settings.theme === "dark",
    );
    document.getElementById("file-tools").innerHTML =
      button("menu", "Menu sổ tay", "menu") +
      button("new", "Sổ tay mới (Ctrl+N)", "new") +
      button("open", "Mở tệp (Ctrl+O)", "open") +
      button("save", "Lưu tệp (Ctrl+S)", "save") +
      button("undo", "Hoàn tác (Ctrl+Z)", "undo") +
      button("redo", "Làm lại (Ctrl+Y)", "redo") +
      button("settings", "Cài đặt", "panel", 'data-panel="settings"');
    document.getElementById("ink-tools").innerHTML =
      button("pen", "Bút viết (P)", "tool", 'data-tool="pen"') +
      '<button class="pen-types-trigger" data-action="pen-types" title="Chọn loại bút" aria-label="Chọn loại bút">⌄</button>' +
      button("highlighter", "Đánh dấu", "tool", 'data-tool="highlighter"') +
      button(
        "eraser",
        "Tẩy (E) · nhấp lại để chọn kiểu tẩy",
        "tool",
        'data-tool="eraser"',
      ) +
      button("select", "Chọn (S)", "tool", 'data-tool="select"') +
      button("lasso", "Khoanh vùng", "tool", 'data-tool="lasso"');
    document.getElementById("object-tools").innerHTML =
      button("shape", "Hình dạng", "shapes", 'id="shape-tool-btn" data-tool="shape"') +
      button("text", "Chèn văn bản", "tool", 'data-tool="text"') +
      button("ruler", "Thước (R)", "ruler") +
      button("pan", "Kéo trang", "tool", 'data-tool="pan"');
    const colors = document.getElementById("colors");
    for (const color of [
      "#111111",
      "#008000",
      "#0070c0",
      "#c00000",
      "#ffc000",
      "#7030a0",
    ]) {
      const b = document.createElement("button");
      b.className = "swatch";
      b.style.backgroundColor = color;
      b.dataset.color = color;
      b.title = "Màu " + color;
      b.setAttribute("aria-label", b.title);
      b.onclick = () => setColor(color);
      colors.append(b);
    }
    const custom = document.createElement("button");
    custom.className = "swatch";
    custom.style.background =
      "conic-gradient(#c00000,#ffc000,#008000,#0070c0,#7030a0,#c00000)";
    custom.title = "Chọn màu khác";
    custom.onclick = () => widthPopover(custom);
    colors.append(custom);
    document.getElementById("width-button").onclick = (e) =>
      widthPopover(e.currentTarget);
    Renderer.init();
    PageFlow.init();
    CanvasEngine.init();
    TeacherGeometry.init();
    ClipboardStudio.init();
    PenKeyboard.init();
    PenTools.init();
    WorkspaceUI.init();
    CaptureStudio.init();
    QuestionPages.init();
    RulerStudio.init();
    NativeCalculators.init();
    TeachingAI.init();
    ColorIcons.init();
    DocumentFiles.init().catch(error=>toast("Lưu tài liệu: "+error.message,7000));
    updateShapeButton();
    document.addEventListener("fullscreenchange", () => {
      const active = !!document.fullscreenElement,
        b = document.getElementById("fullscreen-toggle");
      b.setAttribute("aria-pressed", String(active));
      b.title = active ? "Thoát toàn màn hình" : "Toàn màn hình";
      b.setAttribute("aria-label", b.title);
      b.textContent = active ? "⤢" : "⛶";
      b.classList.toggle("active", active);
      Renderer.resize();
    });
    document.addEventListener("statechange", stateChanged);
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b) {
        dispatch(b.dataset.action, b);
        document.getElementById("canvas-context").hidden = true;
      }
      if (
        !e.target.closest(".popover") &&
        !e.target.closest("#toolbar") &&
        !e.target.closest('[data-action="calculator-models"],[data-action="calculator"],[data-action="capture-options"]') &&
        !e.target.closest(
          "#pen-keyboard,#pen-dock,#selection-tools,#geometry-toolbar",
        ) &&
        !e.target.closest(".page-more") &&
        !(e.target.id === "ink-canvas" && TeacherGeometry.active?.mode === "rename")
      )
        closePopover();
      if (!e.target.closest("#canvas-context"))
        document.getElementById("canvas-context").hidden = true;
    });
    document.addEventListener("keydown", keyDown);
    document.getElementById("notebook-title").onchange = (e) => {
      const title =
        e.target.value.trim().slice(0, 300) || "Sổ tay chưa đặt tên";
      Store.transaction(() => (Store.book().title = title));
    };
    document.getElementById("page-title-input").onchange = (e) =>
      Store.transaction(
        () => (Store.current().title = e.target.value.slice(0, 300)),
      );
    document.getElementById("open-file").onchange = (e) => {
      if (e.target.files[0]) Exporter.importFile(e.target.files[0]);
      e.target.value = "";
    };
    document.getElementById("image-file").onchange = (e) => {
      if (e.target.files[0]) Exporter.importImage(e.target.files[0]);
      e.target.value = "";
    };
    document.getElementById("pdf-file").onchange = (e) => {
      if (e.target.files[0]) PDFStudio.importFile(e.target.files[0]);
      e.target.value = "";
    };
    window.addEventListener("beforeunload", (e) => {
      if(root.InkulatorDesktop?.documents)return;
      CanvasEngine.finishActive();
      if (Store.state.dirty && !Store.save()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    window.addEventListener("pagehide", () => Store.save());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        CanvasEngine.finishActive();
        Store.save();
      }
    });
    stateChanged();
    renderPages();
    if (Store.state.loadError) toast(Store.state.loadError, 12000);
    else if (!Store.state.storageAvailable)
      toast(
        "Trình duyệt chặn lưu tự động. Hãy dùng Ctrl+S để tải bản sao lưu.",
        9000,
      );
    root.Scrble = {
      Store,
      MathEngine,
      Geometry,
      Graph,
      Calculator,
      CasioStudio,
      Renderer,
      CanvasEngine,
      TeacherGeometry,
      Constructions,
      PDFStudio,
      Formulas,
    };
  }
  function stateChanged() {
    Renderer.request();
    const s = Store.state;
    const title = document.getElementById("notebook-title");
    if (document.activeElement !== title) title.value = Store.book().title;
    document.title = Store.book().title + " — Inkulator";
    document
      .querySelectorAll("[data-tool]")
      .forEach((b) => b.classList.toggle("active", b.dataset.tool === s.tool));
    document
      .querySelectorAll("[data-color]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.color === s.color),
      );
    document
      .querySelectorAll('[data-action="undo"]')
      .forEach((b) => (b.disabled = !s.history.length));
    document
      .querySelectorAll('[data-action="redo"]')
      .forEach((b) => (b.disabled = !s.future.length));
    document.getElementById("ink-canvas").setAttribute(
      "aria-label",
      s.tool === "pen"
        ? {
            ballpoint: "Bút bi",
            fountain: "Bút mực",
            pencil: "Bút chì",
            marker: "Bút lông",
          }[s.pen] || root.InkBrush?.catalog.find(p=>p[0]===s.pen)?.[1] || "Bút"
        : tools[s.tool],
    );
    document.getElementById("width-label").textContent = s.width;
    document.getElementById("width-dot").style.background = s.color;
    document.getElementById("width-dot").style.width =
      Math.min(12, s.width + 2) + "px";
    document.getElementById("width-dot").style.height =
      Math.min(12, s.width + 2) + "px";
    document.getElementById("page-counter").textContent =
      Store.current().questionSource ? Store.current().title : (Store.book().pages.slice(0,s.pageIndex+1).filter(p=>!p.questionSource).length + " / " + Store.book().pages.filter(p=>!p.questionSource).length);
    updateSaveState();
    updateZoom();
    selectionUI();
    document
      .querySelectorAll('[data-action="move-selection"]')
      .forEach((b) => b.classList.toggle("active", s.transformMode === "move"));
    updateShapeButton();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(renderPages, 1000);
  }
  function updateSaveState() {
    const s = Store.state;
    document.getElementById("save-state").textContent = !s.storageAvailable
      ? "Cần lưu tệp thủ công"
      : s.dirty
        ? "Đang chờ lưu…"
        : "Đã lưu trên thiết bị";
    if(root.InkulatorDesktop?.documents&&root.DocumentFiles?.status)document.getElementById("save-state").textContent=s.dirty&&DocumentFiles.status==="Đã lưu tệp trên máy"?"Đang chờ lưu…":DocumentFiles.status;
  }
  function updateZoom() {
    document.getElementById("zoom-button").textContent =
      Math.round(Store.state.viewport.zoom * 100) + "%";
  }
  function renderPages() {
    if (document.getElementById("pages-sidebar").hidden) return;
    if (CanvasEngine.interacting) {
      refreshTimer = setTimeout(renderPages, 1000);
      return;
    }
    const list = document.getElementById("page-list");
    const pages=Store.book().pages,key=JSON.stringify([Store.book().id,pages.map(p=>[p.id,p.title,p.width,p.height,p.paper,!!p.questionSource])]);
    if(key===pageListKey && list.children.length){
      const byId=new Map(pages.map((p,i)=>[p.id,{p,i}]));
      for(const card of list.children){const entry=byId.get(card.dataset.pageId);if(!entry)continue;card.classList.toggle("active",entry.i===Store.state.pageIndex);const c=card.querySelector("canvas");c.notebookPage=entry.p;if(entry.i===Store.state.pageIndex)Renderer.thumbnail(c,entry.p);}
      return;
    }
    pageListKey=key;
    thumbObserver?.disconnect();
    thumbObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const c = entry.target,
              p = c.notebookPage;
            thumbObserver.unobserve(c);
            Renderer.thumbnail(c, p);
            const pdfs = p.objects.filter((o) => o.type === "pdf");
            const ready = pdfs.length
              ? Promise.all(pdfs.map((o) => PDFStudio.prepare(o, 500)))
              : Renderer.awaitImages(p);
            ready
              .then(() => {
                if (c.isConnected) Renderer.thumbnail(c, p);
              })
              .catch(() => {});
          }
      },
      { root: document.getElementById("page-list") },
    );
    list.replaceChildren();
    let displayIndex=0;
    Store.book().pages.forEach((p, i) => {
      if (p.questionSource) return;
      const numberIndex=++displayIndex;
      const b = document.createElement("div");
      b.className =
        "page-card" + (i === Store.state.pageIndex ? " active" : "");
      b.dataset.pageId=p.id;
      b.tabIndex = 0;
      b.setAttribute("role", "button");
      b.setAttribute(
        "aria-label",
        "Trang " + numberIndex + ": " + (p.title || "Chưa đặt tiêu đề"),
      );
      const c = document.createElement("canvas");
      c.className = "page-thumb";
      b.append(c);
      c.width = c.height = 1;
      c.notebookPage = p;
      thumbObserver.observe(c);
      const label = document.createElement("div");
      label.className = "page-card-label";
      const title = document.createElement("span");
      title.textContent = p.title || "Trang " + numberIndex;
      const number = document.createElement("small");
      number.textContent = String(numberIndex).padStart(2, "0");
      label.append(title, number);
      b.append(label);
      const more = document.createElement("button");
      more.className = "page-more";
      more.textContent = "···";
      more.title = "Tùy chọn trang";
      more.onclick = (e) => {
        e.stopPropagation();
        pageMenu(i, more);
      };
      b.append(more);
      b.onclick = () => {
        CanvasEngine.cancelActive();
        Store.switchPage(i);
        closePanel();
      };
      b.oncontextmenu = (e) => { e.preventDefault(); pageMenu(i, b); };
      b.onkeydown = (e) => {
        if (e.key === "Enter") b.click();
      };
      b.draggable = true;
      b.ondragstart = (e) =>
        e.dataTransfer.setData("application/x-scrble-page", i);
      b.ondragover = (e) => e.preventDefault();
      b.ondrop = (e) => {
        e.preventDefault();
        const from = Number(
          e.dataTransfer.getData("application/x-scrble-page"),
        );
        if (
          !Number.isInteger(from) ||
          from < 0 ||
          from >= Store.book().pages.length ||
          from === i
        )
          return;
        const currentId = Store.current().id;
        Store.transaction(() => {
          const a = Store.book().pages;
          const [p] = a.splice(from, 1);
          a.splice(i, 0, p);
          Store.state.pageIndex = a.findIndex((p) => p.id === currentId);
        });
      };
      list.append(b);
    });
  }
  function pageMenu(index, anchor) {
    popover(
      anchor,
      [
        ["page-insert", "Thêm trang ngay sau"],
        ["page-rename", "Đổi tiêu đề"],
        ["page-duplicate", "Nhân bản trang"],
        ["page-up", "Đưa lên"],
        ["page-down", "Đưa xuống"],
        ["page-delete", "Xóa trang"],
      ]
        .map(
          ([action, label]) =>
            '<button class="menu-item" data-action="' +
            action +
            '" data-index="' +
            index +
            '">' +
            label +
            "</button>",
        )
        .join(""),
    );
  }
  async function pageAction(action, index) {
    const p = Store.book().pages[index];
    if (!p) return;
    if (action === "page-insert") { addPage(index); closePopover(); return; }
    if (action === "page-rename") {
      const r = await dialog(
        "Đổi tiêu đề trang",
        '<label class="field"><span>Tiêu đề</span><input name="title" maxlength="300" value="' +
          escape(p.title) +
          '"></label>',
      );
      if (r) Store.transaction(() => (p.title = r.title));
    }
    if (action === "page-duplicate")
      Store.transaction(() => {
        const copy = Store.clone(p);
        copy.id = Store.uid();
        copy.title = p.title ? p.title + " (bản sao)" : "";
        copy.objects.forEach((o) => (o.id = Store.uid()));
        Store.book().pages.splice(index + 1, 0, copy);
        Store.state.pageIndex = index + 1;
        Store.state.selection = [];
      });
    if (action === "page-delete") {
      if (Store.book().pages.length === 1)
        return toast("Sổ tay phải có ít nhất một trang.");
      const r = await dialog(
        "Xóa trang?",
        "<p>Trang “" +
          escape(p.title || String(index + 1)) +
          "” sẽ bị xóa. Có thể hoàn tác bằng Ctrl+Z.</p>",
        "Xóa trang",
      );
      if (r)
        Store.transaction(() => {
          const activeId = Store.current().id;
          Store.book().pages.splice(index, 1);
          for(const page of Store.book().pages)if(page.questionSource?.pageId===p.id)delete page.questionSource;
          for(const page of Store.book().pages)if(page.questionSource?.rootId===p.id)delete page.questionSource.rootId;
          const next = Store.book().pages.findIndex(page => page.id === activeId);
          Store.state.pageIndex = next < 0 ? Math.min(index, Store.book().pages.length - 1) : next;
          Store.state.selection = [];
        });
    }
    if (action === "page-up" || action === "page-down") {
      const j = index + (action === "page-up" ? -1 : 1),
        arr = Store.book().pages;
      if (j < 0 || j >= arr.length) return;
      const active = Store.current().id;
      Store.transaction(() => {
        [arr[index], arr[j]] = [arr[j], arr[index]];
        Store.state.pageIndex = arr.findIndex((p) => p.id === active);
      });
    }
    closePopover();
  }
  function toast(text, ms = 3500) {
    const el = document.getElementById("toast");
    el.textContent = text;
    el.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("visible"), ms);
  }
  function addPage(index = Store.state.pageIndex) {
    if(Store.book().pages.length>=2000)return toast("Sổ tay đã đạt giới hạn 2.000 trang.");
    CanvasEngine.finishActive();
    Store.transaction(() => {
      const source = Store.book().pages[index], p = Store.page();
      if (source) Object.assign(p, {width: source.width, height: source.height});
      if(source?.questionSource){p.questionSource={...source.questionSource,rootId:source.questionSource.rootId || source.id};p.title=source.title+" · tiếp";p.showTitle=false;}
      Store.book().pages.splice(index + 1, 0, p);
      Store.state.pageIndex = index + 1;
      Store.state.selection = [];
    });
    PageFlow.invalidateLayout(); PageFlow.fit("page");
  }
  function popover(anchor, html) {
    const el = document.getElementById("popover");
    el.innerHTML = html;
    el.hidden = false;
    el.scrollTop = 0;
    el.style.left = "12px";
    el.style.right = "auto";
    el.style.maxWidth = Math.max(200,innerWidth-24)+"px";
    const r = anchor.getBoundingClientRect();
    el.style.left =
      Math.max(10, Math.min(innerWidth - el.offsetWidth - 12, r.left)) + "px";
    el.style.top =
      Math.max(12,Math.min(innerHeight - el.offsetHeight - 24, r.bottom + 10)) + "px";
    el.style.right = "auto";
    return el;
  }
  function closePopover() {
    const el = document.getElementById("popover");
    el.hidden = true;
    el.classList.remove("shape-popover");
  }
  function menu(anchor) {
    const groups=[
      ["Tài liệu",[["new","Sổ tay mới","Ctrl+N"],["library","Thư viện sổ tay"],["open","Mở tài liệu .ink / .smath.json","Ctrl+O"],["save","Lưu tài liệu","Ctrl+S"],...(root.InkulatorDesktop?.documents?[["save-as","Lưu thành…","Ctrl+Shift+S"],["local-documents","Tài liệu trên máy"]]:[]),["snapshot","Xuất bản snapshot .ink"],["backup-all","Sao lưu tất cả sổ tay"]]],
      ["Xuất / In",[["export-png","Trang → PNG"],["export-svg","Trang → SVG"],["export-pdf","Sổ tay → PDF"],["print","In sổ tay"]]],
      ["Chèn",[["image","Ảnh từ máy"],["import-pdf","PDF từ máy"],["formula","Công thức đẹp"],["calculator","Máy tính & công cụ toán"],["paste-image","Dán ảnh từ bộ nhớ đệm"]]],
      ["Thao tác",[["copy","Sao chép đối tượng","Ctrl+C"],["paste","Dán ảnh / văn bản / đối tượng","Ctrl+V"],["select-all","Chọn tất cả đối tượng","Ctrl+A"],["fullscreen","Toàn màn hình"],["pen-options","Thao tác bằng bút…"],["pen-keyboard","Bàn phím trên màn hình"],["help","Hướng dẫn","?"]]]
    ];
    const pop=popover(anchor,'<div class="compact-file-menu"><input id="file-menu-search" type="search" placeholder="Tìm thao tác…" aria-label="Tìm thao tác"><div class="file-menu-tabs"></div><div class="file-menu-actions"></div></div>');
    const tabs=pop.querySelector(".file-menu-tabs"),actions=pop.querySelector(".file-menu-actions"),search=pop.querySelector("input");let active=0;
    const render=()=>{actions.replaceChildren();tabs.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===active));const query=search.value.trim().toLocaleLowerCase("vi");for(const [group,entries] of (query?groups:[groups[active]])){for(const [action,label,key] of entries){if(query&&!label.toLocaleLowerCase("vi").includes(query))continue;const b=document.createElement("button");b.className="menu-item";b.dataset.action=action;b.append(document.createTextNode(label));const shortcut=document.createElement("small");shortcut.textContent=key||"";b.append(shortcut);actions.append(b);}}};
    groups.forEach(([label],i)=>{const b=document.createElement("button");b.textContent=label;b.onclick=()=>{active=i;search.value="";render();};tabs.append(b);});
    search.oninput=render;render();
  }
  function setTool(tool) {
    if(tool==="pen" && Store.state.tool==="pen")return penTypes(document.querySelector('#ink-tools [data-tool="pen"]'));
    CanvasEngine.cancelActive();
    if (tool !== "select") root.TeacherGeometry?.cancel();
    if (tool !== "select") Store.state.transformMode = "auto";
    if (tool === "eraser" && Store.state.tool === "eraser") {
      const anchor = document.querySelector('[data-tool="eraser"]');
      const el = popover(
        anchor,
        "<h3>Kiểu tẩy</h3>" +
          [
            ["partial", "Tẩy một phần nét"],
            ["stroke", "Tẩy toàn bộ nét"],
            ["rectangle", "Tẩy vùng chữ nhật"],
          ]
            .map(
              ([id, name]) =>
                '<button class="menu-item ' +
                (Store.state.eraser === id ? "active" : "") +
                '" data-eraser="' +
                id +
                '">' +
                name +
                "</button>",
            )
            .join(""),
      );
      el.querySelectorAll("[data-eraser]").forEach(
        (b) =>
          (b.onclick = () => {
            Store.state.eraser = b.dataset.eraser;
            closePopover();
          }),
      );
      return;
    }
    Store.state.tool = tool;
    if (!["select", "lasso"].includes(tool)) Store.state.selection = [];
    CanvasEngine.cursor();
    Store.emit();
  }
  function setColor(color) {
    Store.state.color = color;
    if (Store.selected().length)
      Store.transaction(() =>
        Store.selected()
          .filter((o) => !o.locked)
          .forEach((o) => (o.style.color = color)),
      );
    else Store.emit();
  }
  function widthPopover(anchor) {
    const s = Store.state;
    const el = popover(
      anchor,
      '<h3>Thiết lập bút</h3><label class="field"><span>Loại bút</span><select id="pen-type"><option value="ballpoint">Bút bi · nét đều</option><option value="fountain">Bút mực · áp lực</option><option value="pencil">Bút chì</option><option value="marker">Bút lông</option></select></label><label class="field"><span>Độ dày <output id="pen-width-output">' +
        s.width +
        '</output> px</span><input id="pen-width" type="range" min=".5" max="25" step=".5" value="' +
        s.width +
        '"></label><label class="field"><span>Độ trong suốt</span><input id="pen-opacity" type="range" min=".1" max="1" step=".05" value="' +
        s.opacity +
        '"></label><label class="field-row"><span>Màu tùy chọn</span><input id="pen-color" type="color" value="' +
        s.color +
        '"></label><button class="menu-item" id="laser-tool">Bút laser tạm thời</button>',
    );
    const penSelect=document.getElementById("pen-type");penSelect.replaceChildren();
    for(const [id,label] of InkBrush.catalog){const option=document.createElement("option");option.value=id;option.textContent=label;penSelect.append(option);}
    const smart=document.createElement("label");smart.className="field-row";smart.innerHTML='<input id="pen-smart-shape" type="checkbox"> Smart Shape · sửa nét thành hình';el.querySelector("h3").after(smart);smart.querySelector("input").checked=!!s.settings.smartShape;smart.querySelector("input").onchange=e=>{s.settings.smartShape=e.target.checked;Store.scheduleSave();};
    const rememberPen=()=>{s.settings.activePen=s.pen;(s.settings.penPresets||={})[s.pen]={color:s.color,width:s.width,opacity:s.opacity};Store.scheduleSave();};
    document.getElementById("pen-type").value = s.pen;
    document.getElementById("pen-type").onchange = (e) => {
      const presets = s.settings.penPresets || {};
      presets[s.pen] = { color: s.color, width: s.width, opacity: s.opacity };
      s.pen = e.target.value;
      const next = presets[s.pen] || {color:s.color,width:InkBrush.catalog.find(p=>p[0]===s.pen)?.[2]||2.5,opacity:1};
      if (next) {
        s.color = next.color;
        s.width = next.width;
        s.opacity = next.opacity;
      }
      presets[s.pen]={color:s.color,width:s.width,opacity:s.opacity};s.settings.penPresets = presets;
      rememberPen();
      setTool("pen");
      widthPopover(anchor);
    };
    document.getElementById("pen-width").oninput = (e) => {
      s.width = Number(e.target.value);
      document.getElementById("pen-width-output").textContent = s.width;
      rememberPen();
      Store.emit();
    };
    document.getElementById("pen-width").onchange = () => {
      if (Store.selected().length)
        Store.transaction(() =>
          Store.selected()
            .filter((o) => !o.locked)
            .forEach((o) => (o.style.width = s.width)),
        );
    };
    document.getElementById("pen-opacity").oninput = (e) => {
      s.opacity = Number(e.target.value);
      rememberPen();Store.emit();
    };
    document.getElementById("pen-opacity").onchange = () => {
      if (Store.selected().length)
        Store.transaction(() =>
          Store.selected()
            .filter((o) => !o.locked)
            .forEach((o) => (o.style.opacity = s.opacity)),
        );
    };
    document.getElementById("pen-color").oninput = (e) => {setColor(e.target.value);rememberPen();};
    document.getElementById("laser-tool").onclick = () => {
      setTool("laser");
      closePopover();
    };
  }
  function penTypes(anchor){
    const pop=popover(anchor,'<h3>Chọn loại bút</h3><div class="pen-types-grid"></div><button class="menu-item" id="pen-types-settings">Độ dày màu và Smart Shape…</button>');
    for(const [id,label,defaultWidth] of InkBrush.catalog){
      const button=document.createElement("button");button.className="pen-type-option";button.dataset.penType=id;button.title=label;button.setAttribute("aria-pressed",String(Store.state.pen===id));
      const canvas=document.createElement("canvas");canvas.width=150;canvas.height=40;const points=Array.from({length:50},(_,i)=>[5+i*2.8,20+Math.sin(i/8)*8,.1+i/60]);
      Renderer.drawObject(canvas.getContext("2d"),Store.object("stroke",{pen:id,points,baseSize:{w:150,h:40}},{position:{x:0,y:0},size:{w:150,h:40},style:{color:Store.state.color,width:4,opacity:1}}));
      const name=document.createElement("span");name.textContent=label.split(" · ")[0];button.append(canvas,name);
      button.onclick=e=>{e.stopPropagation();CanvasEngine.finishActive();TeacherGeometry.cancel();const s=Store.state,presets=s.settings.penPresets||={};presets[s.pen]={color:s.color,width:s.width,opacity:s.opacity};s.pen=id;s.settings.activePen=id;const preset=presets[id]||{color:s.color,width:defaultWidth,opacity:1};Object.assign(s,preset);presets[id]={...preset};s.tool="pen";s.selection=[];CanvasEngine.cursor();Store.scheduleSave();Store.emit();closePopover();};pop.querySelector('.pen-types-grid').append(button);
    }
    pop.querySelector('#pen-types-settings').onclick=e=>{e.stopPropagation();widthPopover(anchor);};
    const bounds=anchor.getBoundingClientRect();pop.style.left=Math.max(10,Math.min(bounds.left,innerWidth-pop.offsetWidth-12))+"px";pop.style.top=Math.max(10,Math.min(bounds.bottom+8,innerHeight-pop.offsetHeight-20))+"px";
  }
  const shapeItems = [
    // Row 1: Text & Lines
    { id: "text", action: "text", title: "Chèn văn bản (T)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M5 4h14v3h-5.5v13h-3V7H5V4z"/></svg>' },
    { id: "line", kind: "line", filled: false, title: "Đoạn thẳng", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>' },
    { id: "dashed", kind: "dashed", filled: false, title: "Nét đứt", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3.5 3"><line x1="5" y1="19" x2="19" y2="5"/></svg>' },
    { id: "dotted", kind: "dotted", filled: false, title: "Nét chấm", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="0.1 4"><line x1="5" y1="19" x2="19" y2="5"/></svg>' },
    { id: "arrow", kind: "arrow", filled: false, title: "Mũi tên", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><polyline points="14 18 6 18 6 10"/></svg>' },
    { id: "double-arrow", kind: "double-arrow", filled: false, title: "Mũi tên 2 đầu", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"><line x1="6" y1="18" x2="18" y2="6"/><polyline points="11 6 18 6 18 13"/><polyline points="13 18 6 18 6 11"/></svg>' },
    { id: "ray", kind: "ray", filled: false, title: "Tia (gốc điểm)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="6" cy="18" r="2.5" fill="none" stroke-width="2"/><line x1="8" y1="16" x2="18" y2="6"/><polyline points="13 6 18 6 18 11"/></svg>' },

    // Row 2: Outlined Basic Shapes
    { id: "circle", kind: "circle", filled: false, title: "Hình tròn", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="8"/></svg>' },
    { id: "ellipse", kind: "ellipse", filled: false, title: "Elip / Bầu dục", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><ellipse cx="12" cy="12" rx="9" ry="5.5"/></svg>' },
    { id: "pill", kind: "pill", filled: false, title: "Hình viên thuốc / Bo góc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="7" width="18" height="10" rx="5" ry="5"/></svg>' },
    { id: "rectangle", kind: "rectangle", filled: false, title: "Hình vuông / chữ nhật", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>' },
    { id: "triangle-right", kind: "triangle-right", filled: false, title: "Tam giác hướng phải", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="6 4 20 12 6 20"/></svg>' },
    { id: "triangle", kind: "triangle", filled: false, title: "Tam giác đều / cân", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 4 21 20 3 20"/></svg>' },
    { id: "right-triangle", kind: "right-triangle", filled: false, title: "Tam giác vuông", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="5 4 5 20 20 20"/></svg>' },

    // Row 3: Outlined Polygons & Star
    { id: "diamond", kind: "diamond", filled: false, title: "Hình thoi", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 3 21 12 12 21 3 12"/></svg>' },
    { id: "pentagon", kind: "pentagon", filled: false, title: "Ngũ giác (5 cạnh)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 3 21 9.5 17.5 20 6.5 20 3 9.5"/></svg>' },
    { id: "hexagon", kind: "hexagon", filled: false, title: "Lục giác (6 cạnh)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5"/></svg>' },
    { id: "heptagon", kind: "heptagon", filled: false, title: "Thất giác (7 cạnh)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 3 19.8 6.8 21.6 15.3 16.2 21 7.8 21 2.4 15.3 4.2 6.8"/></svg>' },
    { id: "octagon", kind: "octagon", filled: false, title: "Bát giác (8 cạnh)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="8.5 3 15.5 3 21 8.5 21 15.5 15.5 21 8.5 21 3 15.5 3 8.5"/></svg>' },
    { id: "decagon", kind: "decagon", filled: false, title: "Thập giác (10 cạnh)", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"><polygon points="12 3 17.3 4.7 20.8 9.1 21.2 14.7 18.3 19.3 13.5 21 8.5 21 3.7 19.3 2.8 14.7 3.2 9.1 6.7 4.7"/></svg>' },
    { id: "star", kind: "star", filled: false, title: "Ngôi sao 5 cánh", svg: '<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"><polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.3 5.5 21 7 14 2 9.3 9 8.5"/></svg>' },

    // Row 4: Filled Basic Shapes
    { id: "circle-filled", kind: "circle", filled: true, title: "Hình tròn đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>' },
    { id: "ellipse-filled", kind: "ellipse", filled: true, title: "Elip đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><ellipse cx="12" cy="12" rx="9" ry="5.5"/></svg>' },
    { id: "pill-filled", kind: "pill", filled: true, title: "Hình viên thuốc đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="3" y="7" width="18" height="10" rx="5" ry="5"/></svg>' },
    { id: "rectangle-filled", kind: "rectangle", filled: true, title: "Hình vuông / chữ nhật đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>' },
    { id: "triangle-right-filled", kind: "triangle-right", filled: true, title: "Tam giác hướng phải đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>' },
    { id: "triangle-filled", kind: "triangle", filled: true, title: "Tam giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 4 21 20 3 20"/></svg>' },
    { id: "right-triangle-filled", kind: "right-triangle", filled: true, title: "Tam giác vuông đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="5 4 5 20 20 20"/></svg>' },

    // Row 5: Filled Polygons & Star
    { id: "diamond-filled", kind: "diamond", filled: true, title: "Hình thoi đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 3 21 12 12 21 3 12"/></svg>' },
    { id: "pentagon-filled", kind: "pentagon", filled: true, title: "Ngũ giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 3 21 9.5 17.5 20 6.5 20 3 9.5"/></svg>' },
    { id: "hexagon-filled", kind: "hexagon", filled: true, title: "Lục giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5"/></svg>' },
    { id: "heptagon-filled", kind: "heptagon", filled: true, title: "Thất giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 3 19.8 6.8 21.6 15.3 16.2 21 7.8 21 2.4 15.3 4.2 6.8"/></svg>' },
    { id: "octagon-filled", kind: "octagon", filled: true, title: "Bát giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="8.5 3 15.5 3 21 8.5 21 15.5 15.5 21 8.5 21 3 15.5 3 8.5"/></svg>' },
    { id: "decagon-filled", kind: "decagon", filled: true, title: "Thập giác đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 3 17.3 4.7 20.8 9.1 21.2 14.7 18.3 19.3 13.5 21 8.5 21 3.7 19.3 2.8 14.7 3.2 9.1 6.7 4.7"/></svg>' },
    { id: "star-filled", kind: "star", filled: true, title: "Ngôi sao đặc", svg: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14 18.5 21 12 17.3 5.5 21 7 14 2 9.3 9 8.5"/></svg>' },
  ];
  function updateShapeButton() {
    const btn =
      document.getElementById("shape-tool-btn") ||
      document.querySelector('[data-action="shapes"]');
    if (!btn) return;
    const curKind = Store.state.shape || "rectangle";
    const curFilled = !!Store.state.shapeFilled;
    const active = Store.state.tool === "shape";
    btn.classList.toggle("active", active);
    const item =
      shapeItems.find(
        (s) => s.kind === curKind && !!s.filled === curFilled,
      ) ||
      shapeItems.find((s) => s.kind === curKind) ||
      shapeItems[10];
    if (item && item.svg) {
      btn.innerHTML = item.svg;
    }
  }
  function shapes(anchor) {
    const curKind = Store.state.shape || "rectangle";
    const curFilled = !!Store.state.shapeFilled;
    const isText = Store.state.tool === "text";

    const gridHtml = shapeItems
      .map((item) => {
        let isSelected = false;
        if (item.action === "text") {
          isSelected = isText;
        } else {
          isSelected =
            !isText && item.kind === curKind && !!item.filled === curFilled;
        }
        return (
          '<button class="shape-palette-btn' +
          (isSelected ? " selected" : "") +
          '" data-shape="' +
          item.id +
          '"' +
          (item.action ? ' data-shape-action="' + item.action + '"' : "") +
          (item.kind ? ' data-shape-kind="' + item.kind + '"' : "") +
          (item.filled !== undefined
            ? ' data-shape-filled="' + item.filled + '"'
            : "") +
          ' title="' +
          item.title +
          '" aria-label="' +
          item.title +
          '">' +
          item.svg +
          "</button>"
        );
      })
      .join("");

    const el = popover(
      anchor,
      '<div class="shape-palette-grid">' + gridHtml + "</div>",
    );
    el.classList.add("shape-popover");

    el.querySelectorAll(".shape-palette-btn").forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.shapeAction === "text") {
          setTool("text");
        } else {
          Store.state.shape = btn.dataset.shapeKind || "rectangle";
          Store.state.shapeFilled = btn.dataset.shapeFilled === "true";
          setTool("shape");
        }
        updateShapeButton();
        closePopover();
      };
    });
  }
  function openPanel(id, obj = null) {
    CanvasEngine.cancelActive();
    const panel = document.getElementById("panel");
    if (!names[id]) return;
    Store.state.panel = id;
    WorkspaceUI.rememberPanel(id);
    panel.hidden = false;
    document.getElementById("panel-eyebrow").textContent = names[id][0];
    document.getElementById("panel-title").textContent = names[id][1];
    if (id === "graph") Graph.panel(obj);
    else if (id === "pdf") PDFStudio.panel();
    else if (id === "image" && obj) ImageStudio.panel(obj);
    else if (id === "geometry" || id === "solid") Panels.geometry(id);
    else Panels[id]();
    if (id === "settings") WorkspaceUI.settings();
    if (id === "settings") TeachingAI.settings();
    if (id === "settings") DocumentFiles.settings().catch(e=>toast(e.message));
    document
      .querySelectorAll('[data-action="panel"]')
      .forEach((b) => b.classList.toggle("active", b.dataset.panel === id));
  }
  function closePanel() {
    if (root.PenKeyboard?.target?.closest("#panel")) PenKeyboard.hide();
    document.getElementById("panel").hidden = true;
    Store.state.panel = null;
    document
      .querySelectorAll('[data-action="panel"]')
      .forEach((b) => b.classList.remove("active"));
  }
  function refreshGeometry() {
    if (["geometry", "solid"].includes(Store.state.panel))
      Panels.geometry(Store.state.panel);
  }
  function insertPosition(w = 350, h = 280) {
    const v = Store.state.viewport,
      area = Renderer.area;
    return {
      x: Math.max(20, (area.clientWidth / 2 - v.x) / v.zoom - w / 2),
      y: Math.max(160, (area.clientHeight / 2 - v.y) / v.zoom - h / 2),
    };
  }
  function insertText(text, math = false) {
    const lines = text.split("\n"),
      fontSize = math ? 18 : 22,
      w = Math.max(
        180,
        Math.min(
          850,
          Math.max(...lines.map((l) => l.length)) * fontSize * 0.62,
        ),
      ),
      h = Math.max(40, lines.length * fontSize * 1.5);
    Store.add(
      Store.object(
        "text",
        { text: latex(text), math, fontSize, baseWidth: w },
        { position: insertPosition(w, h), size: { w, h } },
      ),
    );
  }
  function latex(t) {
    return t
      .replace(
        /\\(pi|alpha|beta|theta|infty|int|sum|sqrt|times|cdot|leq|geq|neq|perp|parallel)\b/g,
        (_, k) =>
          ({
            pi: "π",
            alpha: "α",
            beta: "β",
            theta: "θ",
            infty: "∞",
            int: "∫",
            sum: "Σ",
            sqrt: "√",
            times: "×",
            cdot: "·",
            leq: "≤",
            geq: "≥",
            neq: "≠",
            perp: "⊥",
            parallel: "∥",
          })[k],
      )
      .replace(/\^2/g, "²")
      .replace(/\^3/g, "³");
  }
  async function editText(o, p = null) {
    if (root.Formulas && !o?.data.table && !o?.data.layout)
      return Formulas.textEditor(o, p);
    const r = await dialog(
      o ? "Chỉnh sửa nội dung" : "Chèn văn bản",
      '<label class="field"><span>Nội dung (hỗ trợ ký hiệu Unicode, LaTeX cơ bản)</span><textarea name="text" rows="7" maxlength="20000">' +
        escape(o?.data.text || "") +
        '</textarea></label><label class="field"><span>Cỡ chữ</span><input type="number" name="fontSize" min="10" max="72" value="' +
        (o?.data.fontSize || 22) +
        '"></label>',
      "Chèn / cập nhật",
    );
    if (!r || !r.text.trim()) return;
    const fontSize = Math.max(10, Math.min(72, Number(r.fontSize) || 22));
    if (o)
      Store.transaction(() => {
        o.data.text = latex(r.text);
        o.data.fontSize = fontSize;
        if (o.data.table)
          o.data.table = r.text
            .split("\n")
            .map((row) => row.split("|").map((c) => c.trim()));
        if (o.data.layout?.kind === "fraction") {
          const parts = r.text.split("\n");
          o.data.layout.top = parts[0] || "";
          o.data.layout.bottom = parts[1] || "";
        }
        if (o.data.layout?.kind === "sqrt") o.data.layout.value = r.text;
      });
    else {
      const lines = r.text.split("\n"),
        w = Math.max(
          180,
          Math.min(
            750,
            Math.max(...lines.map((l) => l.length)) * fontSize * 0.62,
          ),
        ),
        h = lines.length * fontSize * 1.5;
      Store.add(
        Store.object(
          "text",
          { text: latex(r.text), fontSize, baseWidth: w },
          {
            position: p ? { x: p.x, y: p.y } : insertPosition(w, h),
            size: { w, h },
          },
        ),
      );
    }
  }
  function editObject(o) {
    if (o.type === "graph") openPanel("graph", o);
    else if (o.type === "solid" || o.type === "geometry")
      openPanel(o.type === "solid" ? "solid" : "geometry");
    else if (o.type === "text") editText(o);
    else if (o.type === "formula") Formulas.textEditor(o);
    else if (o.type === "pdf") openPanel("pdf");
    else if (o.type === "image") openPanel("image", o);
    else
      toast(
        "Dùng nút vuông để đổi kích thước; dùng thanh công cụ để đổi màu, độ dày hoặc xoay.",
      );
  }
  function selectionUI() {
    const el = document.getElementById("selection-tools"),
      selected = Store.selected();
    el.hidden = !selected.length;
    if (!selected.length) return;
    el.innerHTML =
      '<button data-action="edit-selection" title="Chỉnh sửa">✎</button><button data-action="copy" title="Sao chép">Sao chép</button><button data-action="delete" title="Xóa">Xóa</button><button data-action="rotate-left" title="Xoay −15°">↶</button><button data-action="rotate-right" title="Xoay +15°">↷</button><button data-action="scale-down" title="Thu nhỏ 10%">−</button><button data-action="scale-up" title="Phóng to 10%">+</button>' +
      (selected.length > 1
        ? '<button data-action="group">Nhóm</button>'
        : selected[0].type === "group"
          ? '<button data-action="ungroup">Bỏ nhóm</button>'
          : "") +
      '<button data-action="lock">' +
      (selected.every((o) => o.locked) ? "Mở khóa" : "Khóa") +
      "</button>";
    el.innerHTML =
      '<button data-action="move-selection" title="Kéo di chuyển, không xoay">✥ Di chuyển</button><button data-action="transform-selection" title="Vị trí / kích thước">⤢ Kích thước</button>' +
      (selected[0].type === "solid"
        ? '<button data-action="orbit-selection">⟳ Xoay 3D</button>'
        : "") +
      el.innerHTML;
    if (
      selected.length === 1 &&
      selected[0].type === "text" &&
      Formulas.detect(selected[0].data.text)
    )
      el.innerHTML +=
        '<button data-action="format-selection">ƒx Dàn công thức</button>';
  }
  function copy() {
    Store.state.clipboard = Store.clone(Store.selected());
    if (Store.state.clipboard.length) {
      ClipboardStudio.markInternal();
      toast(
        "Đã sao chép " +
          Store.state.clipboard.length +
          " đối tượng trong ứng dụng.",
      );
    }
  }
  function paste() {
    if (!Store.state.clipboard.length)
      return toast("Bộ nhớ sao chép trong ứng dụng đang trống.");
    const copies = Store.clone(Store.state.clipboard);
    copies.forEach((o) => {
      o.id = Store.uid();
      o.position.x += 25;
      o.position.y += 25;
      o.locked = false;
      o.zIndex = Store.current().objects.length + copies.indexOf(o);
    });
    Store.transaction(() => Store.current().objects.push(...copies));
    Store.state.clipboard = Store.clone(copies);
    Store.state.selection = copies.map((o) => o.id);
    Store.state.tool = "select";
    Store.emit();
  }
  function remove() {
    const ids = Store.selected()
      .filter((o) => !o.locked)
      .map((o) => o.id);
    Store.transaction(() => {
      Store.current().objects = Store.current().objects.filter(
        (o) => !ids.includes(o.id),
      );
      Store.state.selection = [];
    });
  }
  function group() {
    const objects = Store.selected().filter((o) => !o.locked);
    if (objects.length < 2) return;
    const corners = objects.flatMap((o) =>
        [
          { x: 0, y: 0 },
          { x: o.size.w, y: 0 },
          { x: o.size.w, y: o.size.h },
          { x: 0, y: o.size.h },
        ].map((q) => Renderer.worldPoint(o, q)),
      ),
      minX = Math.min(...corners.map((p) => p.x)),
      minY = Math.min(...corners.map((p) => p.y)),
      w = Math.max(...corners.map((p) => p.x)) - minX,
      h = Math.max(...corners.map((p) => p.y)) - minY;
    const children = Store.clone(objects);
    children.forEach((o) => {
      o.position.x -= minX;
      o.position.y -= minY;
    });
    const g = Store.object(
        "group",
        { children, originalSize: { w, h } },
        { position: { x: minX, y: minY }, size: { w, h } },
      ),
      ids = objects.map((o) => o.id);
    Store.transaction(() => {
      Store.current().objects = Store.current().objects.filter(
        (o) => !ids.includes(o.id),
      );
      Store.current().objects.push(g);
      Store.state.selection = [g.id];
    });
  }
  function ungroup() {
    const g = Store.selected()[0];
    if (!g || g.type !== "group" || g.locked) return;
    const scale = g.size.w / g.data.originalSize.w,
      children = Store.clone(g.data.children);
    children.forEach((o) => {
      const center = Renderer.worldPoint(g, {
        x: (o.position.x + o.size.w / 2) * scale,
        y: (o.position.y + o.size.h / 2) * scale,
      });
      o.size.w *= scale;
      o.size.h *= scale;
      o.position = { x: center.x - o.size.w / 2, y: center.y - o.size.h / 2 };
      o.rotation += g.rotation;
      o.id = Store.uid();
    });
    Store.transaction(() => {
      Store.current().objects = Store.current().objects.filter(
        (o) => o.id !== g.id,
      );
      Store.current().objects.push(...children);
      Store.state.selection = children.map((o) => o.id);
    });
  }
  async function newNotebook() {
    const r = await dialog(
      "Tạo sổ tay mới",
      '<label class="field"><span>Tên sổ tay</span><input name="title" value="Sổ tay Toán học" maxlength="300" required></label><label class="field"><span>Thư mục (tùy chọn)</span><input name="folder" maxlength="100" placeholder="Ví dụ: Toán 12"></label>',
      "Tạo sổ tay",
    );
    if (r) {
      Store.save();
      const n = Store.notebook(r.title.trim() || "Sổ tay mới");
      n.folder = r.folder;
      Store.state.notebooks.push(n);
      Store.switchBook(Store.state.notebooks.length - 1);
      closePanel();
    }
  }
  function renderLibraryCards() {
    return Store.state.notebooks
      .map(
        (n, i) =>
          '<div class="library-card' +
          (i === Store.state.active ? " active" : "") +
          '" data-card="' +
          i +
          '" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:' +
          (i === Store.state.active ? "#308e7414" : "#f9fbfa") +
          ";border:1px solid " +
          (i === Store.state.active ? "#308e74" : "#e0e7e3") +
          ';border-radius:8px;margin-bottom:8px;"><div class="library-info" data-book="' +
          i +
          '" style="flex:1;text-align:left;cursor:pointer;"><b style="display:block;font-size:14px;color:' +
          (i === Store.state.active ? "#1c614f" : "inherit") +
          ';">' +
          escape(n.title) +
          (i === Store.state.active
            ? ' <span style="font-size:11px;font-weight:normal;padding:2px 6px;background:#308e74;color:#fff;border-radius:4px;margin-left:6px;">Đang mở</span>'
            : "") +
          '</b><small style="color:#728a7e;font-size:12px;">' +
          escape(n.folder || "Chưa phân thư mục") +
          " · " +
          n.pages.length +
          ' trang</small></div><div class="library-actions" style="display:flex;gap:6px;align-items:center;"><button type="button" class="btn-open-book" data-book="' +
          i +
          '" style="padding:6px 12px;border:1px solid #c7d5ca;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;">' +
          (i === Store.state.active ? "Đang mở" : "Mở →") +
          '</button><button type="button" class="btn-delete-book" data-delete-book="' +
          i +
          '" title="Xóa sổ tay này" style="padding:6px 10px;border:1px solid #f2c8c5;border-radius:6px;background:#fdf2f0;color:#c85550;cursor:pointer;font-size:12px;">🗑 Xóa</button></div></div>',
      )
      .join("");
  }
  async function library() {
    const html =
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;"><label class="field" style="flex:1;margin:0;"><span>Tìm theo tên / thư mục</span><input id="library-search" autocomplete="off"></label><button id="library-new" type="button" style="padding:8px 14px;font-size:13px;background:#308e74;color:#fff;border:none;border-radius:6px;cursor:pointer;align-self:flex-end;">+ Sổ tay mới</button><button id="library-cleanup" type="button" title="Xóa tất cả sổ tay cũ khác để giải phóng bộ nhớ" style="padding:8px 12px;font-size:13px;background:#fdf2f0;color:#c85550;border:1px solid #f2c8c5;border-radius:6px;cursor:pointer;align-self:flex-end;">🧹 Dọn dẹp</button></div><div id="notebook-library" style="max-height:55vh;overflow-y:auto;padding-right:4px;">' +
      renderLibraryCards() +
      "</div>";
    const r = await dialog("Thư viện sổ tay", html, "Đóng");
    return r;
  }
  function promptConfirm(message) {
    try {
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        return window.confirm(message);
      }
    } catch (_) {}
    return true;
  }
  function dialog(title, html, confirmLabel = "Xác nhận") {
    const d = document.getElementById("dialog");
    if (d.open) d.close("cancel");
    document.getElementById("dialog-content").innerHTML =
      "<h2>" + escape(title) + "</h2>" + html;
    document.getElementById("dialog-confirm").textContent = confirmLabel;
    d.returnValue = "";
    return new Promise((resolve) => {
      const close = () => {
        d.removeEventListener("close", close);
        resolve(
          d.returnValue === "ok"
            ? Object.fromEntries(new FormData(d.querySelector("form")))
            : null,
        );
      };
      d.addEventListener("close", close);
      d.showModal();
      const search = document.getElementById("library-search");
      const bindLibraryEvents = () => {
        d.querySelectorAll("[data-book]").forEach(
          (b) =>
            (b.onclick = () => {
              Store.save();
              Store.switchBook(Number(b.dataset.book));
              closePanel();
              d.close("cancel");
            }),
        );
        d.querySelectorAll("[data-delete-book]").forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            const idx = Number(b.dataset.deleteBook);
            const targetNb = Store.state.notebooks[idx];
            if (!targetNb) return;
            const ok = promptConfirm(
              'Bạn có chắc muốn xóa sổ tay "' +
                targetNb.title +
                '"?\nToàn bộ trang và tài nguyên của sổ tay này sẽ bị xóa khỏi bộ nhớ thiết bị.',
            );
            if (!ok) return;
            Store.deleteBook(idx);
            toast('Đã xóa sổ tay "' + targetNb.title + '".');
            const libContainer = document.getElementById("notebook-library");
            if (libContainer) {
              libContainer.innerHTML = renderLibraryCards();
              bindLibraryEvents();
            }
          };
        });
      };
      if (search) {
        search.oninput = () => {
          const q = search.value.toLocaleLowerCase();
          d.querySelectorAll(".library-card, [data-book]").forEach((b) => {
            b.hidden = !b.textContent.toLocaleLowerCase().includes(q);
          });
        };
        const btnNew = document.getElementById("library-new");
        if (btnNew) {
          btnNew.onclick = () => {
            const nb = Store.notebook();
            nb.title = "Sổ tay " + (Store.state.notebooks.length + 1);
            Store.state.notebooks.push(nb);
            Store.switchBook(Store.state.notebooks.length - 1);
            closePanel();
            d.close("cancel");
            toast("Đã tạo sổ tay mới.");
          };
        }
        const btnCleanup = document.getElementById("library-cleanup");
        if (btnCleanup) {
          btnCleanup.onclick = () => {
            if (Store.state.notebooks.length <= 1) {
              return toast("Thư viện hiện chỉ có 1 sổ tay.");
            }
            const count = Store.state.notebooks.length - 1;
            const ok = promptConfirm(
              "Dọn dẹp thư viện?\nSẽ xóa " +
                count +
                ' sổ tay cũ khác để giải phóng bộ nhớ và tăng tốc độ vẽ tối đa, chỉ giữ lại sổ tay đang mở "' +
                Store.book().title +
                '".',
            );
            if (!ok) return;
            const current = Store.book();
            for (let i = 0; i < Store.state.notebooks.length; i++) {
              if (i !== Store.state.active) {
                const nb = Store.state.notebooks[i];
                if (nb && nb.assets) {
                  for (const id of Object.keys(nb.assets))
                    AssetStorage.remove(id);
                }
              }
            }
            Store.state.notebooks = [current];
            Store.state.active = 0;
            Store.save();
            toast("Đã dọn dẹp " + count + " sổ tay cũ.");
            const libContainer = document.getElementById("notebook-library");
            if (libContainer) {
              libContainer.innerHTML = renderLibraryCards();
              bindLibraryEvents();
            }
          };
        }
        bindLibraryEvents();
      }
    });
  }
  function help() {
    dialog(
      "Không gian toán học của bạn",
      '<p class="hint">SCRBLE MATH STUDIO hoạt động hoàn toàn trên thiết bị, kể cả khi mở trực tiếp index.html. Hãy lưu bản sao .smath.json để bảo vệ bài học.</p><table class="help-table">' +
        [
          ["P / E / S", "Bút / Tẩy / Chọn"],
          ["G / H / C", "Đồ thị / Hình học / Máy tính"],
          [
            "Giao điểm",
            "Dựng & đo → Giao điểm, rồi chạm hai đường thẳng trong hình đang chọn.",
          ],
          [
            "Trọng tâm",
            "Chọn ba đỉnh để dựng G; dùng Nối điểm để nối một đỉnh với G.",
          ],
          [
            "Trang nối liền",
            "Cuộn xuống cuối tự thêm trang; viết và kéo hình qua ranh giới trang. Tối đa 2.000 trang/sổ tay.",
          ],
          [
            "Toàn màn hình",
            "Nút ⛶ trên thanh công cụ bật / thoát toàn màn hình bằng bút.",
          ],
          ["Ctrl+S / Ctrl+O", "Tải bản sao / Mở tệp"],
          ["Ctrl+Z / Ctrl+Y", "Hoàn tác / Làm lại"],
          [
            "Ctrl+C / X / V",
            "Sao chép / Cắt / Dán ảnh, văn bản hoặc đối tượng",
          ],
          [
            "Dán ảnh",
            "Nút ở header hoặc thanh bút; ảnh chọn sẵn để kéo / đổi cỡ",
          ],
          [
            "Thanh bút ⋯",
            "Chọn nhiều, giữ tỷ lệ, bắt tọa độ, sao chép và bỏ chọn",
          ],
          [
            "Bàn phím ⌨",
            "Toán / ABC / số / tiếng Việt; tự mở khi bút chạm ô nhập",
          ],
          ["Space + kéo", "Kéo trang"],
          ["Ctrl + lăn chuột", "Zoom tại vị trí con trỏ"],
          ["Shift khi vẽ hình", "Khóa góc / tỷ lệ"],
          [
            "Khối 3D đã chọn",
            "Nút Xoay 3D / Di chuyển; nét khuất tự cập nhật theo góc nhìn",
          ],
          [
            "Kích thước",
            "Bốn nút góc hoặc nhập rộng / cao / vị trí bằng bàn phím bút",
          ],
          ["Nhấp đúp", "Sửa đồ thị, hình học hoặc văn bản"],
          ["Delete / Esc", "Xóa chọn / Hủy thao tác"],
        ]
          .map(([a, b]) => "<tr><td>" + a + "</td><td>" + b + "</td></tr>")
          .join("") +
        '</table><p class="hint">PDF: chèn tài liệu để viết / highlight, giữ bản gốc khi xuất; chưa sửa trực tiếp từng ký tự. Công thức: tự dàn biểu thức gõ hoặc LaTeX, chưa nhận dạng toàn bộ chữ viết tay. Thiết diện hỗ trợ khối đa diện qua 3 điểm. Khảo sát số có dung sai; kiểm tra miền xác định trước khi tích phân.</p>',
      "Đã hiểu",
    );
  }
  function fit() {
    PageFlow.fit("page");
  }
  function dispatch(action, b) {
    if(b?.closest?.("#popover"))closePopover();
    if (
      [
        "tool",
        "move-selection",
        "select-all",
        "finish-action",
        "image",
        "paste-image",
        "import-pdf",
      ].includes(action)
    )
      PenKeyboard.hide();
    if (action.startsWith("page-"))
      return pageAction(action, Number(b.dataset.index));
    switch (action) {
      case "pen-types":
        return penTypes(b);
      case "menu":
        return menu(b);
      case "new":
        return newNotebook();
      case "open":
        if(root.InkulatorDesktop?.documents)return DocumentFiles.open().catch(e=>toast(e.message));
        return document.getElementById("open-file").click();
      case "save":
        return Exporter.project();
      case "save-as":
        return DocumentFiles.saveAs().catch(e=>toast(e.message));
      case "local-documents":
        return DocumentFiles.panel().catch(e=>toast(e.message));
      case "ai-region":
        return TeachingAI.start();
      case "calculator-models":
        return NativeCalculators.panel(b);
      case "snapshot":
        return Exporter.project(true);
      case "backup-all":
        return Exporter.backupAll();
      case "undo":
        CanvasEngine.cancelActive();
        return Store.undo();
      case "redo":
        CanvasEngine.cancelActive();
        return Store.redo();
      case "copy":
        return copy();
      case "paste":
        return ClipboardStudio.read();
      case "paste-image":
        return ClipboardStudio.read({ imagesOnly: true });
      case "capture":
      case "capture-image":
        return CaptureStudio.start();
      case "capture-question":
        return CaptureStudio.start({mode:"question"});
      case "capture-options":
        return CaptureStudio.options(b);
      case "paste-capture":
        return CaptureStudio.paste();
      case "download-capture":
        return CaptureStudio.download();
      case "pen-keyboard":
        return PenKeyboard.visible ? PenKeyboard.hide() : PenKeyboard.show();
      case "pen-options":
        return PenTools.options(
          b?.getBoundingClientRect
            ? b
            : document.querySelector('[data-action="pen-options"]'),
        );
      case "toggle-dock":
        document.getElementById("pen-dock").classList.toggle("collapsed");
        return;
      case "transform-selection":
        return PenTools.transform(b?.getBoundingClientRect ? b : null);
      case "move-selection":
        TeacherGeometry.cancel();
        Store.state.transformMode = "move";
        setTool("select");
        return;
      case "orbit-selection":
        if (Store.selected()[0]?.type === "solid")
          TeacherGeometry.setMode("orbit", Store.selected()[0]);
        return;
      case "select-all":
        TeacherGeometry.cancel();
        setTool("select");
        Store.state.selection = Store.current()
          .objects.filter(
            (o) =>
              !o.locked &&
              o.visible !== false &&
              Store.current().layers.some(
                (l) => l.id === o.layer && l.visible && !l.locked,
              ),
          )
          .map((o) => o.id);
        Store.emit();
        return;
      case "finish-action":
        TeacherGeometry.cancel();
        CanvasEngine.cancelActive();
        Store.state.selection = [];
        closePanel();
        closePopover();
        Store.emit();
        return;
      case "cut":
        copy();
        return remove();
      case "delete":
        return remove();
      case "tool":
        return setTool(b.dataset.tool);
      case "shapes":
        return shapes(b);
      case "panel":
        return openPanel(b.dataset.panel);
      case "close-panel":
        return closePanel();
      case "calculator":
        return NativeCalculators.panel(b?.getBoundingClientRect ? b : document.querySelector('.workspace-tabs [data-action="calculator"]'));
      case "calculator-tools":
        return CasioStudio.tools();
      case "pages":
        pagesVisible = !pagesVisible;
        document.getElementById("pages-sidebar").hidden = !pagesVisible;
        if (pagesVisible) renderPages();
        return;
      case "add-page":
        return addPage();
      case "ruler":
        return RulerStudio.toggle();
      case "zoom-in":
        return CanvasEngine.zoomAt(Store.state.viewport.zoom * 1.15);
      case "zoom-out":
        return CanvasEngine.zoomAt(Store.state.viewport.zoom / 1.15);
      case "reset-zoom":
        Store.state.viewMode = "manual";
        Store.state.viewport = { x: (Renderer.area.clientWidth - Store.current().width) / 2, y: 20, zoom: 1 };
        Renderer.request();
        updateZoom();
        return;
      case "fit":
        return fit();
      case "fit-width":
        return PageFlow.fit("width");
      case "fullscreen":
        (document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen()
        ).catch(() =>
          toast("Trình duyệt chưa cho phép toàn màn hình trong cửa sổ này."),
        );
        return;
      case "help":
        return help();
      case "image":
        return document.getElementById("image-file").click();
      case "import-pdf":
        return document.getElementById("pdf-file").click();
      case "formula":
        return Formulas.textEditor(null, null, true);
      case "format-selection": {
        const o = Store.selected()[0];
        if (o) return Formulas.textEditor(o, null, true);
        return;
      }
      case "previous-page":
      case "next-page":
        return PageFlow.go(
          Store.state.pageIndex + (action === "next-page" ? 1 : -1),
        );
      case "export-png":
        return Exporter.png();
      case "export-svg":
        return Exporter.svg();
      case "export-pdf":
        return Exporter.pdf();
      case "print":
        return Exporter.print();
      case "edit-selection":
        if (Store.selected()[0]) return editObject(Store.selected()[0]);
        return;
      case "rotate-left":
      case "rotate-right":
        return Store.transaction(() =>
          Store.selected()
            .filter((o) => !o.locked)
            .forEach(
              (o) => (o.rotation += action === "rotate-left" ? -15 : 15),
            ),
        );
      case "scale-up":
      case "scale-down": {
        const f = action === "scale-up" ? 1.1 : 1 / 1.1;
        return Store.transaction(() =>
          Store.selected()
            .filter((o) => !o.locked)
            .forEach((o) => {
              o.size.w *= f;
              o.size.h *= f;
            }),
        );
      }
      case "group":
        return group();
      case "ungroup":
        return ungroup();
      case "lock": {
        const selected = Store.selected(),
          lock = !selected.every((o) => o.locked);
        return Store.transaction(() =>
          selected.forEach((o) => (o.locked = lock)),
        );
      }
      case "front":
      case "back":
        return Store.transaction(() =>
          Store.selected()
            .filter((o) => !o.locked)
            .forEach(
              (o) =>
                (o.zIndex =
                  action === "front"
                    ? Math.max(
                        ...Store.current().objects.map((o) => o.zIndex),
                      ) + 1
                    : Math.min(
                        ...Store.current().objects.map((o) => o.zIndex),
                      ) - 1),
            ),
        );
      case "library":
        return library();
    }
  }
  function isEditing(t) {
    return !!t.closest?.('input,textarea,select,[contenteditable="true"]');
  }
  function keyDown(e) {
    if (isEditing(e.target) || document.getElementById("dialog").open) return;
    const key = e.key.toLowerCase(),
      ctrl = e.ctrlKey || e.metaKey;
    let action = null;
    if (ctrl) {
      if (key === "v") {
        ClipboardStudio.nativeKey();
        return;
      }
      if (key === "c") {
        copy();
        return;
      }
      action = {
        n: "new",
        o: "open",
        s: e.shiftKey&&root.InkulatorDesktop?.documents?"save-as":"save",
        z: e.shiftKey ? "redo" : "undo",
        y: "redo",
        c: "copy",
        v: "paste",
        x: "cut",
      }[key];
      if (key === "a") {
        e.preventDefault();
        Store.state.selection = Store.current()
          .objects.filter(
            (o) =>
              !o.locked &&
              o.visible !== false &&
              Store.current().layers.some(
                (l) => l.id === o.layer && l.visible && !l.locked,
              ),
          )
          .map((o) => o.id);
        Store.state.tool = "select";
        Store.emit();
        return;
      }
    } else {
      if (key === "delete" || key === "backspace") action = "delete";
      if (key === "p") setTool("pen");
      if (key === "e") setTool("eraser");
      if (key === "s") setTool("select");
      if (key === "g") openPanel("graph");
      if (key === "h") openPanel("geometry");
      if (key === "c") CasioStudio.open();
      if (key === "r") action = "ruler";
      if (key === "?") action = "help";
      if (key === "escape") {
        TeacherGeometry.cancel();
        CanvasEngine.cancelActive();
        Store.state.selection = [];
        closePanel();
        closePopover();
        Store.emit();
      }
    }
    if (action) {
      e.preventDefault();
      dispatch(
        action,
        document.querySelector('[data-action="' + action + '"]') || {},
      );
    }
  }
  root.App = {
    pasteInternal: paste,
    init,
    escape,
    toast,
    popover,
    closePopover,
    setTool,
    setColor,
    openPanel,
    closePanel,
    refreshGeometry,
    insertPosition,
    insertText,
    editText,
    editObject,
    dialog,
    isEditing,
    updateSaveState,
    updateZoom,
    dispatch,
  };
  document.addEventListener("DOMContentLoaded", init);
})(window);
