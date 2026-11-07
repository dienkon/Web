(function (root) {
  "use strict";
  const uid = () =>
    root.crypto?.randomUUID?.() ||
    "id-" + Date.now().toString(36) + "-" + ++uid.counter;
  uid.counter = 0;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const page = (title = "") => ({
    id: uid(),
    title,
    paper: "grid",
    width: 1200,
    height: 1700,
    showTitle: true,
    objects: [],
    layers: ["image", "geometry", "graph", "ink", "annotation"].map((id) => ({
      id,
      visible: true,
      locked: false,
    })),
  });
  const notebook = (title = "Sổ tay Toán học") => ({
    id: uid(),
    title,
    folder: "",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    pages: [page()],
    assets: {},
  });
  const defaults = {
    theme: "light",
    gridSize: 25,
    smoothing: 0.5,
    penSensitivity: 1,
    autosave: 30000,
    historyLimit: 500,
    performance: "auto",
    inkPerformanceV2: true,
    touchInk: false,
    smartShape: false,
    animations: true,
    autoPages: true,
  };
  const state = {
    notebooks: [notebook()],
    active: 0,
    pageIndex: 0,
    tool: "pen",
    pen: "ballpoint",
    color: "#111111",
    width: 2.5,
    opacity: 1,
    eraser: "partial",
    shape: "rectangle",
    shapeFilled: false,
    selection: [],
    multiSelect: false,
    transformMode: "auto",
    aspectLocked: true,
    geometrySnap: false,
    history: [],
    future: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    viewMode: "page",
    settings: { ...defaults },
    storageAvailable: true,
    panel: null,
    clipboard: [],
    ruler: false,
    protractor: false,
    dirty: false,
  };
  function book() {
    return state.notebooks[state.active];
  }
  function current() {
    return book().pages[state.pageIndex];
  }
  function emit() {
    const p = current();
    state.selection = state.selection.filter((id) =>
      p.objects.some(
        (o) =>
          o.id === id &&
          p.layers.some((l) => l.id === o.layer && l.visible && !l.locked),
      ),
    );
    if (root.document) root.document.dispatchEvent(new Event("statechange"));
  }
  let cachedSnapshot = null;
  function invalidateSnapshot() {
    cachedSnapshot = null;
  }
  function snapshot() {
    if (cachedSnapshot !== null) return cachedSnapshot;
    const { assets, ...content } = book();
    cachedSnapshot = JSON.stringify(content);
    return cachedSnapshot;
  }
  function transaction(fn) {
    const before = snapshot();
    invalidateSnapshot();
    fn();
    const after = snapshot();
    if (after === before) {
      emit();
      return false;
    }
    state.history.push(before);
    trimHistory();
    state.future = [];
    book().modified = new Date().toISOString();
    invalidateSnapshot();
    state.dirty = true;
    emit();
    scheduleSave();
    return true;
  }
  function commit(before) {
    invalidateSnapshot();
    const after = snapshot();
    if (after !== before) {
      state.history.push(before);
      trimHistory();
      state.future = [];
      book().modified = new Date().toISOString();
      invalidateSnapshot();
      state.dirty = true;
      scheduleSave();
    }
    emit();
  }
  function undo() {
    if (!state.history.length) return;
    if (state.history.at(-1)?.kind === "ink") {
      const entry = state.history.pop();
      applyInk(entry, false);
      state.future.push(entry);
      trimHistory();
      afterHistory();
      return;
    }
    state.future.push(snapshot());
    trimHistory();
    state.notebooks[state.active] = {
      ...JSON.parse(state.history.pop()),
      assets: book().assets || {},
    };
    afterHistory();
  }
  function redo() {
    if (!state.future.length) return;
    if (state.future.at(-1)?.kind === "ink") {
      const entry = state.future.pop();
      applyInk(entry, true);
      state.history.push(entry);
      trimHistory();
      afterHistory();
      return;
    }
    state.history.push(snapshot());
    trimHistory();
    state.notebooks[state.active] = {
      ...JSON.parse(state.future.pop()),
      assets: book().assets || {},
    };
    afterHistory();
  }
  function afterHistory() {
    state.pageIndex = Math.min(state.pageIndex, book().pages.length - 1);
    state.selection = [];
    state.dirty = true;
    invalidateSnapshot();
    emit();
    scheduleSave();
  }
  function trimHistory() {
    for (const list of [state.history, state.future]) {
      const bytes = (entry) => typeof entry === "string" ? entry.length : entry.bytes;
      let size = list.reduce((n, entry) => n + bytes(entry), 0);
      while (
        list.length > 1 &&
        (list.length > state.settings.historyLimit || size > 32e6)
      )
        size -= bytes(list.shift());
    }
  }
  // Ink history holds only the new objects, never a copy of the whole notebook.
  // Clone at the boundary so subsequent transforms cannot alter the undo entry.
  function beginInk() {
    return { pageCount: book().pages.length, pageIndex: state.pageIndex };
  }
  function cancelInk(token) {
    book().pages.splice(token.pageCount);
    state.pageIndex = token.pageIndex;
    invalidateSnapshot();
    root.PageFlow?.invalidateLayout();
  }
  function commitInk(token, additions) {
    if (!additions.length && book().pages.length === token.pageCount) return;
    const entry = {
      kind: "ink",
      additions: clone(additions),
      pages: book().pages.slice(token.pageCount).map((p) => clone({ ...p, objects: [] })),
      beforeIndex: token.pageIndex,
      afterIndex: state.pageIndex,
    };
    entry.bytes = JSON.stringify(entry).length;
    state.history.push(entry);
    state.future = [];
    trimHistory();
    invalidateSnapshot();
    book().modified = new Date().toISOString();
    state.dirty = true;
    emit();
    scheduleSave();
  }
  function applyInk(entry, forward) {
    if (forward) {
      book().pages.push(...clone(entry.pages));
      for (const { pageId, object } of entry.additions) {
        const p = book().pages.find((p) => p.id === pageId);
        if (p) p.objects.push(clone(object));
      }
    } else {
      const ids = new Set(entry.additions.map((a) => a.object.id));
      const pages = new Set(entry.pages.map((p) => p.id));
      for (const p of book().pages) p.objects = p.objects.filter((o) => !ids.has(o.id));
      book().pages = book().pages.filter((p) => !pages.has(p.id));
    }
    state.pageIndex = forward ? entry.afterIndex : entry.beforeIndex;
    book().modified = new Date().toISOString();
    root.PageFlow?.invalidateLayout();
  }
  function object(type, data = {}, opts = {}) {
    const layer = {
      stroke: "ink",
      shape: "geometry",
      geometry: "geometry",
      solid: "geometry",
      graph: "graph",
      text: "annotation",
      image: "image",
      pdf: "image",
      formula: "annotation",
      group: "annotation",
    }[type];
    return {
      id: uid(),
      type,
      position: { x: 150, y: 180 },
      size: { w: 350, h: 280 },
      rotation: 0,
      style: { color: state.color, width: state.width, opacity: state.opacity },
      zIndex: current().objects.length,
      locked: false,
      visible: true,
      layer,
      data,
      ...opts,
    };
  }
  function add(obj) {
    transaction(() => current().objects.push(obj));
    state.selection = [obj.id];
    if (root.App) root.App.setTool("select");
    return obj;
  }
  function selected() {
    return current().objects.filter((o) => state.selection.includes(o.id));
  }
  function clearHistory() {
    state.history = [];
    state.future = [];
    state.selection = [];
  }
  function switchPage(i) {
    state.pageIndex = Math.max(0, Math.min(i, book().pages.length - 1));
    state.selection = [];
    state.viewport = { x: 0, y: 0, zoom: 1 };
    root.PageFlow?.fit?.("page");
    emit();
    scheduleSave();
  }
  function switchBook(i) {
    state.active = Math.max(0, Math.min(i, state.notebooks.length - 1));
    state.pageIndex = 0;
    clearHistory();
    invalidateSnapshot();
    state.viewport = { x: 0, y: 0, zoom: 1 };
    root.PageFlow?.fit?.("page");
    emit();
    scheduleSave();
  }
  function deleteBook(index) {
    if (index < 0 || index >= state.notebooks.length) return false;
    const removed = state.notebooks[index];
    if (removed && removed.assets) {
      for (const id of Object.keys(removed.assets)) {
        AssetStorage.remove(id);
      }
    }
    if (state.notebooks.length <= 1) {
      state.notebooks = [notebook()];
      state.active = 0;
    } else {
      state.notebooks.splice(index, 1);
      if (state.active === index) {
        state.active = Math.max(0, index - 1);
      } else if (state.active > index) {
        state.active--;
      }
    }
    state.pageIndex = 0;
    clearHistory();
    invalidateSnapshot();
    state.viewport = { x: 0, y: 0, zoom: 1 };
    state.dirty = true;
    root.PageFlow?.fit?.("page");
    emit();
    save();
    return true;
  }
  const colors = /^#[0-9a-fA-F]{3,8}$/;
  const AssetStorage = {
    dbPromise: null,
    getDB() {
      if (this.dbPromise) return this.dbPromise;
      if (typeof indexedDB === "undefined") return Promise.resolve(null);
      this.dbPromise = new Promise((resolve) => {
        try {
          const req = indexedDB.open("scrble-assets-db", 1);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("assets")) {
              db.createObjectStore("assets");
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
      return this.dbPromise;
    },
    async put(id, data) {
      if (!id || !data) return;
      try {
        const db = await this.getDB();
        if (!db) return;
        return new Promise((resolve) => {
          const tx = db.transaction("assets", "readwrite");
          tx.objectStore("assets").put(data, id);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (_) {}
    },
    async get(id) {
      if (!id) return null;
      try {
        const db = await this.getDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction("assets", "readonly");
          const req = tx.objectStore("assets").get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (_) {
        return null;
      }
    },
    async remove(id) {
      if (!id) return;
      try {
        const db = await this.getDB();
        if (!db) return;
        const tx = db.transaction("assets", "readwrite");
        tx.objectStore("assets").delete(id);
      } catch (_) {}
    },
  };
  root.AssetStorage = AssetStorage;

  function validate(value, preserveIds = false) {
    if (!value || value.format !== "scrble-math")
      throw Error("Không phải tệp .smath.json hợp lệ.");
    if (value.version !== 1)
      throw Error(
        "Chỉ hỗ trợ định dạng phiên bản 1. Không thay đổi dữ liệu hiện tại.",
      );
    const n = value.notebook;
    if (
      !n ||
      typeof n.title !== "string" ||
      n.title.length > 300 ||
      !Array.isArray(n.pages) ||
      n.pages.length < 1 ||
      n.pages.length > 100000
    )
      throw Error(
        "Sổ tay hoặc danh sách trang không hợp lệ.",
      );
    const types = new Set([
      "stroke",
      "shape",
      "geometry",
      "solid",
      "graph",
      "text",
      "image",
      "group",
      "pdf",
      "formula",
    ]);
    const assets = value.assets || n.assets || {};
    if (
      !assets ||
      typeof assets !== "object" ||
      Array.isArray(assets) ||
      Object.keys(assets).length > 500
    )
      throw Error("Tài nguyên tài liệu không hợp lệ.");
    const cleanAssets = Object.create(null);
    for (const [id, a] of Object.entries(assets)) {
      if (
        !/^[A-Za-z0-9_-]{1,100}$/.test(id) ||
        ["__proto__", "constructor", "prototype"].includes(id) ||
        !a ||
        a.type !== "application/pdf" ||
        typeof a.name !== "string" ||
        a.name.length > 250 ||
        !Number.isInteger(a.pages) ||
        a.pages < 1 ||
        a.pages > 100000
      )
        throw Error("PDF nhúng không hợp lệ.");
      if (a.data !== undefined) {
        if (
          typeof a.data !== "string" ||
          !/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(a.data)
        )
          throw Error("PDF nhúng không hợp lệ.");
      }
      cleanAssets[id] = {
        type: a.type,
        name: a.name,
        pages: a.pages,
        ...(a.data ? { data: a.data } : {}),
        ...(a.inIDB ? { inIDB: true } : {}),
        ...(a.preview ? { preview: a.preview } : {}),
      };
    }
    let total = 0,
      points = 0;
    function boundedNum(v, min, max) {
      return (
        typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
      );
    }
    function clean(o, depth = 0) {
      if (!o || !types.has(o.type) || depth > 4 || ++total > 15000)
        throw Error("Đối tượng không hợp lệ hoặc tài liệu quá lớn.");
      if (
        !o.position ||
        !boundedNum(o.position.x, -1e6, 1e6) ||
        !boundedNum(o.position.y, -1e6, 1e6) ||
        !o.size ||
        !boundedNum(o.size.w, 0.001, 1e5) ||
        !boundedNum(o.size.h, 0.001, 1e5) ||
        !boundedNum(o.rotation || 0, -1e5, 1e5)
      )
        throw Error("Tọa độ đối tượng không hợp lệ.");
      if (
        !o.style ||
        !colors.test(o.style.color) ||
        !boundedNum(o.style.width, 0.1, 100) ||
        !boundedNum(o.style.opacity, 0, 1)
      )
        throw Error("Kiểu nét không hợp lệ.");
      const d = o.data;
      if (!d || typeof d !== "object") throw Error("Thiếu dữ liệu đối tượng.");
      if (o.type === "stroke") {
        if (!Array.isArray(d.points) || d.points.length > 50000)
          throw Error("Nét quá lớn.");
        points += d.points.length;
        if (points > 500000) throw Error("Tài liệu quá nhiều điểm.");
        if (
          d.points.some(
            (p) =>
              !Array.isArray(p) ||
              p.length < 2 ||
              p.length > 3 ||
              p.some((v) => !boundedNum(v, -1e6, 1e6)),
          )
        )
          throw Error("Điểm bút không hợp lệ.");
      }
      if (
        o.type === "shape" &&
        ![
          "line",
          "ray",
          "arrow",
          "double-arrow",
          "dashed",
          "dotted",
          "rectangle",
          "square",
          "circle",
          "ellipse",
          "pill",
          "triangle",
          "triangle-right",
          "right-triangle",
          "diamond",
          "pentagon",
          "hexagon",
          "heptagon",
          "octagon",
          "decagon",
          "star",
          "polygon",
          "curve",
        ].includes(d.kind)
      )
        throw Error("Hình chưa hỗ trợ.");
      if (o.type === "geometry") {
        if (
          !root.Geometry.flatCatalog.some(([k]) => k === d.kind) ||
          !Array.isArray(d.points) ||
          d.points.length < 2 ||
          d.points.length > 16 ||
          d.points.some(
            (p) =>
              !Array.isArray(p) ||
              p.length !== 2 ||
              p.some((x) => !boundedNum(x, -10000, 10000)),
          )
        )
          throw Error("Hình học phẳng không hợp lệ.");
      }
      if (o.type === "solid") {
        if (
          d.projection !== undefined &&
          !["orthographic", "oblique"].includes(d.projection)
        )
          throw Error("Phép chiếu không hợp lệ.");
        if (
          !root.Geometry.solidCatalog.some(([k]) => k === d.kind) ||
          !Array.isArray(d.rotation) ||
          d.rotation.length !== 2 ||
          d.rotation.some((x) => !boundedNum(x, -1e5, 1e5))
        )
          throw Error("Khối không hợp lệ.");
        root.Geometry.mesh(d.kind, d.params);
      }
      if (
        ["geometry", "solid"].includes(o.type) &&
        d.constructions !== undefined
      ) {
        if (!root.Constructions) throw Error("Bộ dựng hình chưa sẵn sàng.");
        root.Constructions.validate(d, o.type === "solid");
      }
      if (o.type === "formula") {
        if (
          typeof d.text !== "string" ||
          d.text.length > 4000 ||
          typeof d.tex !== "string" ||
          d.tex.length > 12000 ||
          !boundedNum(d.fontSize, 12, 72) ||
          /\\(?:require|href|url|includegraphics|html|class|style|cssId|def|gdef|newcommand|renewcommand|catcode|input|write|special)\b/i.test(
            d.tex,
          )
        )
          throw Error("Công thức không hợp lệ.");
      }
      if (o.type === "pdf") {
        const a = cleanAssets[d.assetId];
        if (
          !a ||
          !Number.isInteger(d.pageNumber) ||
          d.pageNumber < 1 ||
          d.pageNumber > a.pages ||
          ![0, 90, 180, 270].includes(d.pageRotation) ||
          (d.preview !== undefined &&
            (typeof d.preview !== "string" ||
              !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.preview) ||
              d.preview.length > 12e6))
        )
          throw Error("Trang PDF hoặc PDF gốc không hợp lệ.");
      }
      if (o.type === "graph") {
        if (
          !Array.isArray(d.expressions) ||
          d.expressions.length < 1 ||
          d.expressions.length > 8 ||
          d.expressions.some(
            (e) => typeof e.text !== "string" || !colors.test(e.color),
          )
        )
          throw Error("Đồ thị không hợp lệ.");
        d.expressions.forEach((e) => {
          const parts = e.text.split("=");
          if (parts.length > 2) throw Error("Phương trình không hợp lệ.");
          root.MathEngine.parse(
            parts.length === 2 && !/^(y|[a-z]\(x\))\s*=/.test(e.text)
              ? "(" + parts[0] + ")-(" + parts[1] + ")"
              : e.text,
          );
        });
        if (
          !d.view ||
          !["xmin", "xmax", "ymin", "ymax"].every((k) =>
            boundedNum(d.view[k], -1e8, 1e8),
          ) ||
          d.view.xmax <= d.view.xmin ||
          d.view.ymax <= d.view.ymin
        )
          throw Error("Khoảng nhìn không hợp lệ.");
        if (
          d.params &&
          Object.values(d.params).some((v) => !boundedNum(v, -1e6, 1e6))
        )
          throw Error("Tham số không hợp lệ.");
      }
      if (
        o.type === "text" &&
        (typeof d.text !== "string" || d.text.length > 20000)
      )
        throw Error("Văn bản không hợp lệ.");
      if (
        o.type === "image" &&
        (typeof d.src !== "string" ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(d.src) ||
          d.src.length > 8e6)
      )
        throw Error("Chỉ nhận ảnh PNG, JPEG, WebP nhúng cục bộ.");
      if (
        o.type === "image" &&
        d.originalSrc !== undefined &&
        (typeof d.originalSrc !== "string" ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
            d.originalSrc,
          ) ||
          d.originalSrc.length > 8e6)
      )
        throw Error("Ảnh gốc không hợp lệ.");
      if (
        o.type === "stroke" &&
        d.baseSize &&
        (!boundedNum(d.baseSize.w, 0.001, 1e5) ||
          !boundedNum(d.baseSize.h, 0.001, 1e5))
      )
        throw Error("Kích thước nét không hợp lệ.");
      if (
        o.type === "geometry" &&
        d.frame &&
        (!Array.isArray(d.frame) ||
          d.frame.length !== 4 ||
          d.frame.some((v) => !boundedNum(v, -1e5, 1e5)) ||
          d.frame[1] <= d.frame[0] ||
          d.frame[3] <= d.frame[2])
      )
        throw Error("Khung hình không hợp lệ.");
      if (["geometry", "solid"].includes(o.type)) {
        const count =
          o.type === "geometry"
            ? d.points.length
            : root.Geometry.mesh(d.kind, d.params).vertices.length;
        if (d.aux === undefined) d.aux = [];
        if (
          !Array.isArray(d.aux) ||
          d.aux.length > 200 ||
          d.aux.some(
            (a) =>
              !a ||
              ![
                "segment",
                "midpoint",
                "height",
                "parallel",
                "perpendicular",
              ].includes(a.type) ||
              (a.type !== "height" &&
                (!Number.isInteger(a.a) ||
                  !Number.isInteger(a.b) ||
                  a.a < 0 ||
                  a.b < 0 ||
                  a.a >= count ||
                  a.b >= count ||
                  a.a === a.b)) ||
              (["parallel", "perpendicular"].includes(a.type) &&
                (!Number.isInteger(a.c) || a.c < 0 || a.c >= count)),
          )
        )
          throw Error("Đường phụ không hợp lệ.");
      }
      if (
        o.type === "solid" &&
        ((d.faceColor !== undefined && !colors.test(d.faceColor)) ||
          (d.faceOpacity !== undefined && !boundedNum(d.faceOpacity, 0, 1)))
      )
        throw Error("Kiểu mặt không hợp lệ.");
      if (o.type === "text") {
        if (d.fontSize !== undefined && !boundedNum(d.fontSize, 5, 200))
          throw Error("Cỡ chữ không hợp lệ.");
        if (d.baseWidth !== undefined && !boundedNum(d.baseWidth, 0.01, 1e5))
          throw Error("Kích thước chữ không hợp lệ.");
        if (
          d.table &&
          (!Array.isArray(d.table) ||
            !d.table.length ||
            d.table.length > 100 ||
            d.table.some(
              (r) =>
                !Array.isArray(r) ||
                !r.length ||
                r.length > 30 ||
                r.some((c) => typeof c !== "string" || c.length > 300),
            ))
        )
          throw Error("Bảng không hợp lệ.");
        if (
          d.layout &&
          (!["fraction", "sqrt"].includes(d.layout.kind) ||
            (d.layout.kind === "fraction" &&
              (typeof d.layout.top !== "string" ||
                typeof d.layout.bottom !== "string")) ||
            (d.layout.kind === "sqrt" && typeof d.layout.value !== "string"))
        )
          throw Error("Công thức không hợp lệ.");
      }
      if (o.type === "graph") {
        if (
          d.markers &&
          (!Array.isArray(d.markers) ||
            d.markers.length > 100 ||
            d.markers.some(
              (p) =>
                !p ||
                !boundedNum(p.x, -1e10, 1e10) ||
                !boundedNum(p.y, -1e10, 1e10),
            ))
        )
          throw Error("Điểm đánh dấu không hợp lệ.");
        if (
          d.tangent &&
          !["x", "y", "slope"].every((k) =>
            boundedNum(d.tangent[k], -1e12, 1e12),
          )
        )
          throw Error("Tiếp tuyến không hợp lệ.");
        if (
          d.shade &&
          !["a", "b"].every((k) => boundedNum(d.shade[k], -1e8, 1e8))
        )
          throw Error("Khoảng tô không hợp lệ.");
      }
      if (o.type === "group") {
        if (
          !Array.isArray(d.children) ||
          d.children.length > 500 ||
          !d.originalSize ||
          !boundedNum(d.originalSize.w, 0.001, 1e5) ||
          !boundedNum(d.originalSize.h, 0.001, 1e5)
        )
          throw Error("Nhóm không hợp lệ.");
        d.children = d.children.map((c) => clean(c, depth + 1));
      }
      const result = {
        id:
          preserveIds && typeof o.id === "string" ? o.id.slice(0, 100) : uid(),
        type: o.type,
        position: { ...o.position },
        size: { ...o.size },
        rotation: o.rotation || 0,
        style: {
          color: o.style.color,
          width: o.style.width,
          opacity: o.style.opacity,
        },
        zIndex: boundedNum(o.zIndex, -1e9, 1e9) ? o.zIndex : total,
        locked: !!o.locked,
        visible: o.visible !== false,
        layer: ["ink", "geometry", "graph", "image", "annotation"].includes(
          o.layer,
        )
          ? o.layer
          : "annotation",
        data: clone(d),
      };
      return result;
    }
    const result = {
      ...notebook(n.title),
      id: preserveIds && typeof n.id === "string" ? n.id.slice(0, 100) : uid(),
      created:
        typeof n.created === "string" && Number.isFinite(Date.parse(n.created))
          ? n.created
          : new Date().toISOString(),
      modified:
        typeof n.modified === "string" &&
        Number.isFinite(Date.parse(n.modified))
          ? n.modified
          : new Date().toISOString(),
      folder: typeof n.folder === "string" ? n.folder.slice(0, 100) : "",
      assets: cleanAssets,
      pages: n.pages.map((p) => {
        if (
          typeof p.title !== "string" ||
          p.title.length > 300 ||
          !Array.isArray(p.objects) ||
          !boundedNum(p.width, 100, 10000) ||
          !boundedNum(p.height, 100, 20000)
        )
          throw Error("Trang không hợp lệ.");
        const cleanPage = page(p.title);
        if (preserveIds && typeof p.id === "string")
          cleanPage.id = p.id.slice(0, 100);
        cleanPage.width = p.width;
        cleanPage.height = p.height;
        cleanPage.paper = [
          "blank",
          "grid",
          "large",
          "lines",
          "dots",
          "axes",
          "dark",
        ].includes(p.paper)
          ? p.paper
          : "grid";
        cleanPage.showTitle = p.showTitle !== false;
        cleanPage.objects = p.objects.map((o) => clean(o));
        if (Array.isArray(p.layers) && p.layers.length === 5) {
          const ids = p.layers.map((l) => l.id);
          if (
            new Set(ids).size === 5 &&
            ids.every((id) => cleanPage.layers.some((l) => l.id === id))
          )
            cleanPage.layers = p.layers.map((l) => ({
              id: l.id,
              visible: l.visible !== false,
              locked: !!l.locked,
            }));
        }
        return cleanPage;
      }),
    };
    return result;
  }
  function envelope(n = book()) {
    const notebook = clone(n),
      assets = notebook.assets || {};
    delete notebook.assets;
    return {
      format: "scrble-math",
      version: 1,
      notebook,
      settings: clone(state.settings),
      assets,
    };
  }
  let timer, idleSave;
  function scheduleSave() {
    clearTimeout(timer);
    if (idleSave && root.cancelIdleCallback) root.cancelIdleCallback(idleSave);
    timer = setTimeout(() => {
      if (root.CanvasEngine?.interacting) return scheduleSave();
      if (root.requestIdleCallback)
        idleSave = root.requestIdleCallback(() => { idleSave = 0; save(); }, { timeout: 3000 });
      else save();
    }, state.settings.autosave);
    timer.unref?.();
  }
  function save() {
    if (root.CanvasEngine?.interacting) {
      scheduleSave();
      return state.storageAvailable;
    }
    try {
      if (state.loadError) throw Error("Giữ nguyên bản lưu lỗi để phục hồi.");
      for (const nb of state.notebooks) {
        if (nb.assets) {
          for (const [id, a] of Object.entries(nb.assets)) {
            if (a.data && a.data.length > 50000) {
              AssetStorage.put(id, a.data);
              a.inIDB = true;
            }
          }
        }
      }
      const notebooksToStore = state.notebooks.map((nb) => {
        let stripped = nb.assets;
        if (nb.assets) {
          stripped = {};
          for (const [id, a] of Object.entries(nb.assets)) {
            if (a.inIDB || (a.data && a.data.length > 50000)) {
              stripped[id] = {
                type: a.type,
                name: a.name,
                pages: a.pages,
                inIDB: true,
                ...(a.preview ? { preview: a.preview } : {}),
              };
            } else {
              stripped[id] = a;
            }
          }
        }
        return {
          ...nb,
          assets: stripped,
        };
      });
      const data = JSON.stringify({
        format: "scrble-math-library",
        version: 1,
        notebooks: notebooksToStore,
        active: state.active,
        pageIndex: state.pageIndex,
        settings: state.settings,
      });
      if (data.length > 8e6) throw Error("Quota");
      localStorage.setItem("scrble-math-library-v1", data);
      root.InkulatorDesktop?.flush().catch(() => {});
      state.storageAvailable = true;
      state.dirty = false;
    } catch (_) {
      state.storageAvailable = false;
    }
    if (root.App) root.App.updateSaveState();
    return state.storageAvailable;
  }
  function load() {
    try {
      localStorage.setItem("scrble-probe", "1");
      localStorage.removeItem("scrble-probe");
      const raw = localStorage.getItem("scrble-math-library-v1");
      if (!raw) return;
      const lib = JSON.parse(raw);
      if (
        lib.version !== 1 ||
        !Array.isArray(lib.notebooks) ||
        !lib.notebooks.length ||
        lib.notebooks.length > 100
      )
        throw Error("Invalid library");
      const books = lib.notebooks.map((n) =>
        validate({ format: "scrble-math", version: 1, notebook: n }, true),
      );
      state.notebooks = books;
      for (const b of state.notebooks) {
        if (b.assets) {
          for (const [id, a] of Object.entries(b.assets)) {
            if (!a.data && a.inIDB) {
              AssetStorage.get(id).then((val) => {
                if (val) {
                  a.data = val;
                  if (root.Renderer) root.Renderer.request();
                }
              }).catch(() => {});
            }
          }
        }
      }
      state.active = Number.isInteger(lib.active)
        ? Math.min(Math.max(0, lib.active), books.length - 1)
        : 0;
      state.pageIndex = Number.isInteger(lib.pageIndex)
        ? Math.min(Math.max(0, lib.pageIndex), book().pages.length - 1)
        : 0;
      if (lib.settings) {
        for (const k of [
          "theme",
          "touchInk",
          "smartShape",
          "animations",
          "autoPages",
          "performance",
        ])
          if (typeof lib.settings[k] === typeof defaults[k])
            state.settings[k] = lib.settings[k];
        for (const k of [
          "gridSize",
          "smoothing",
          "penSensitivity",
          "autosave",
          "historyLimit",
        ])
          if (Number.isFinite(lib.settings[k]))
            state.settings[k] = lib.settings[k];
        state.settings.gridSize = Math.max(
          10,
          Math.min(100, state.settings.gridSize),
        );
        state.settings.autosave = Math.max(
          1000,
          Math.min(300000, state.settings.autosave),
        );
        state.settings.historyLimit = Math.max(
          10,
          Math.min(2000, state.settings.historyLimit),
        );
        if (!["auto", "economy", "quality"].includes(state.settings.performance))
          state.settings.performance = "auto";
        // Upgrade old defaults once; keep user preferences on subsequent launches.
        if (!lib.settings.inkPerformanceV2) {
          if (state.settings.autosave <= 2000) state.settings.autosave = defaults.autosave;
          if (state.settings.historyLimit <= 60) state.settings.historyLimit = defaults.historyLimit;
        }
        state.settings.inkPerformanceV2 = true;
        if (
          lib.settings.penPresets &&
          typeof lib.settings.penPresets === "object"
        ) {
          const valid = {};
          for (const k of ["ballpoint", "fountain", "pencil", "marker"]) {
            const p = lib.settings.penPresets[k];
            if (
              p &&
              colors.test(p.color) &&
              Number.isFinite(p.width) &&
              p.width >= 0.5 &&
              p.width <= 25 &&
              Number.isFinite(p.opacity) &&
              p.opacity >= 0.1 &&
              p.opacity <= 1
            )
              valid[k] = p;
          }
          state.settings.penPresets = valid;
        }
      }
    } catch (error) {
      state.storageAvailable = false;
      state.loadError =
        "Không khôi phục được lưu trữ: " +
        error.message +
        ". Dữ liệu cũ được giữ nguyên; hãy mở bản sao lưu .smath.json.";
    }
  }
  root.Store = {
    snapshot,
    state,
    uid,
    clone,
    page,
    notebook,
    book,
    current,
    emit,
    transaction,
    commit,
    beginInk,
    commitInk,
    cancelInk,
    invalidateSnapshot,
    undo,
    redo,
    object,
    add,
    selected,
    clearHistory,
    switchPage,
    switchBook,
    deleteBook,
    validate,
    envelope,
    scheduleSave,
    save,
    load,
  };
})(typeof window !== "undefined" ? window : globalThis);
