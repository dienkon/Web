(function (root) {
  "use strict";
  const documents = new Map(),
    renders = new Map(),
    pending = new Map(),
    errorsShown = new Set();
  let importing = false;
  const decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function base64(bytes) {
    let result = "";
    for (let i = 0; i < bytes.length; i += 32768)
      result += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(result);
  }
  class OfflineBinaryFactory {
    async fetch({ kind, filename }) {
      const folder =
        kind === "cMapUrl"
          ? "cmaps"
          : kind === "standardFontDataUrl"
            ? "standard_fonts"
            : kind === "wasmUrl"
              ? "wasm"
              : null;
      const data = folder && root.PDFOfflineAssets?.[folder]?.[filename];
      if (!data)
        throw Error(
          "PDF cần tài nguyên chưa có trong gói offline: " + filename,
        );
      return decode(data);
    }
  }
  async function open(data, key) {
    if (documents.has(key)) return documents.get(key);
    const task = pdfjsLib.getDocument({
      data: data.slice(),
      isEvalSupported: false,
      useWorkerFetch: false,
      useWasm: true,
      // Large scans must be resized by PDF.js rather than silently omitted.
      maxImageSize: -1,
      canvasMaxAreaInBytes: 67108864,
      useSystemFonts: true,
      enableXfa: false,
      disableFontFace: false,
      BinaryDataFactory: OfflineBinaryFactory,
      cMapUrl: "embedded/",
      standardFontDataUrl: "embedded/",
      verbosity: 0,
    });
    const promise = task.promise;
    documents.set(key, promise);
    try {
      await promise;
      if (documents.size > 5) {
        const old = documents.keys().next().value;
        if (old !== key) {
          documents
            .get(old)
            .then((d) => d.destroy())
            .catch(() => {});
          documents.delete(old);
        }
      }
    } catch (e) {
      documents.delete(key);
      throw e;
    }
    return promise;
  }
  function asset(o) {
    const a = Store.book().assets?.[o.data.assetId];
    if (!a) throw Error("Không tìm được PDF gốc.");
    return a;
  }
  function bytes(a) {
    return decode(a.data.slice(a.data.indexOf(",") + 1));
  }
  async function getDocument(o) {
    const key = Store.book().id + "|" + o.data.assetId;
    if (documents.has(key)) return documents.get(key);
    let a = asset(o);
    if (!a.data && a.inIDB && root.AssetStorage) {
      const val = await root.AssetStorage.get(o.data.assetId);
      if (val) a.data = val;
    }
    return open(bytes(a), key);
  }
  async function raster(doc, pageNumber, rotation, maxSize = 2200) {
    const p = await doc.getPage(pageNumber),
      view = p.getViewport({ scale: 1, rotation }),
      scale = Math.min(4096, maxSize) / Math.max(view.width, view.height),
      viewport = p.getViewport({ scale, rotation }),
      canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    try {
      await p.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
        background: "#ffffff",
      }).promise;
      return canvas;
    } catch (e) {
      canvas.width = canvas.height = 1;
      throw e;
    }
  }
  function cacheKey(o, size) {
    return (
      Store.book().id +
      "|" +
      o.data.assetId +
      ":" +
      o.data.pageNumber +
      ":" +
      o.data.pageRotation +
      ":" +
      size
    );
  }
  async function prepare(o, maxSize = 2400) {
    const size = Math.min(4096, Math.max(500, Math.ceil(maxSize / 500) * 500)),
      key = cacheKey(o, size);
    if (renders.has(key)) return renders.get(key);
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      const doc = await getDocument(o),
        canvas = await raster(
          doc,
          o.data.pageNumber,
          o.data.pageRotation,
          size,
        );
      while (
        renders.size &&
        (renders.size >= 6 ||
          [...renders.values()].reduce(
            (n, c) => n + c.width * c.height,
            canvas.width * canvas.height,
          ) > (Store.state.settings.performance === "economy" ? 4e6 : 8e6))
      ) {
        const old = renders.keys().next().value;
        renders.get(old).width = renders.get(old).height = 1;
        renders.delete(old);
      }
      renders.set(key, canvas);
      Renderer.request();
      return canvas;
    })();
    pending.set(key, task);
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  }
  const previewImages = new Map();
  async function snapshotImage(o,size=2000){const doc=await getDocument(o);return raster(doc,o.data.pageNumber,o.data.pageRotation,Math.max(500,Math.min(3200,size)));}
  function draw(ctx, o) {
    const screen = ctx.canvas?.id === "ink-canvas";
    const zoom = ctx.getTransform
        ? Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
        : 1,
      target = Math.min(
        4096,
        Math.max(
          1000,
          Math.ceil((Math.max(o.size.w, o.size.h) * zoom) / 500) * 500,
        ),
      ),
      key = cacheKey(o, target);
    let image = renders.get(key);
    if (!image) {
      let best = 0;
      for (const [k, c] of renders)
        if (
          k.startsWith(
            Store.book().id +
              "|" +
              o.data.assetId +
              ":" +
              o.data.pageNumber +
              ":" +
              o.data.pageRotation +
              ":",
          ) &&
          c.width > best
        ) {
          image = c;
          best = c.width;
        }
      if (!image && o.data.preview) {
        image = previewImages.get(o.data.preview);
        if (!image) {
          image = new Image();
          image.onload = () => Renderer.request();
          image.src = o.data.preview;
          if (previewImages.size >= 10)
            previewImages.delete(previewImages.keys().next().value);
          previewImages.set(o.data.preview, image);
        }
      }
      if (
        !screen &&
        !ctx.canvas?.classList.contains("page-thumb") &&
        (!image || target > (o.data.previewSize || 700))
      )
        prepare(o, target).catch((e) => {
          if (!errorsShown.has(o.id)) {
            errorsShown.add(o.id);
            App.toast("PDF: " + e.message, 7000);
          }
        });
    }
    ctx.save();
    if (typeof o.style?.opacity === "number") {
      ctx.globalAlpha = Math.max(0.05, Math.min(1, o.style.opacity));
    }
    if (
      image &&
      (image instanceof HTMLCanvasElement ||
        (image.complete && image.naturalWidth))
    )
      ctx.drawImage(image, 0, 0, o.size.w, o.size.h);
    else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, o.size.w, o.size.h);
      ctx.fillStyle = "#86978e";
      ctx.font = "16px Segoe UI";
      ctx.fillText("Trang " + o.data.pageNumber + " · Đang tải PDF…", 30, 55);
    }
    if (screen) root.PDFTiles?.draw(ctx, o);
    ctx.restore();
  }
  function parseRange(text, count) {
    const result = new Set();
    for (const part of text.split(",")) {
      const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw Error("Khoảng trang chưa đúng. Ví dụ: 1-3, 5.");
      const a = Number(m[1]),
        b = Number(m[2] || m[1]);
      if (a < 1 || b < a || b > count)
        throw Error("Chọn trang hợp lệ (từ 1 đến " + count + ").");
      for (let i = a; i <= b; i++) result.add(i);
    }
    if (!result.size) throw Error("Hãy chọn ít nhất 1 trang.");
    return [...result].sort((a, b) => a - b);
  }
  async function importFile(file) {
    if (importing) return App.toast("Một tệp PDF đang được xử lý.");
    importing = true;
    let key;
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      if (!new TextDecoder().decode(data.slice(0, 1024)).includes("%PDF-"))
        throw Error("Tệp không có nội dung PDF hợp lệ.");
      key = Store.uid();
      App.toast("Đang đọc PDF (" + (file.size / (1024 * 1024)).toFixed(1) + " MB)…");
      let doc;
      try {
        doc = await open(data, key);
      } catch (e) {
        throw Error(
          e.name === "PasswordException"
            ? "PDF có mật khẩu. Hãy mở khóa tệp bằng trình đọc PDF rồi nhập lại."
            : "Không đọc được PDF: " + e.message,
        );
      }
      const first = await doc.getPage(1),
        thumb = await raster(doc, 1, first.rotate, 700),
        preview = thumb.toDataURL("image/png");
      thumb.width = thumb.height = 1;
      const selected = await App.dialog(
        "Chèn tài liệu PDF",
        '<div class="pdf-import-summary"><img src="' +
          preview +
          '" alt="Xem trước trang đầu"><div><b>' +
          App.escape(file.name) +
          "</b><p>" +
          doc.numPages +
          " trang · " +
          (file.size / 1024 / 1024).toFixed(1) +
          ' MB</p><span class="badge">Không giới hạn dung lượng · Offline</span></div></div><label class="field"><span>Trang cần nhập</span><input name="range" id="pdf-range" value="1' +
          (doc.numPages > 1
            ? "-" + doc.numPages
            : "") +
          '" required></label><label class="field"><span>Cách chèn</span><select name="placement"><option value="pages">Mỗi trang PDF → một trang sổ tay mới</option><option value="current">Chèn 1 trang PDF vào trang đang mở</option></select></label><p class="hint">Cuộn liên tục qua các trang. Hỗ trợ tài liệu dung lượng lớn, xử lý mượt mà theo viewport.</p><p class="hint">Nền PDF được khóa để viết, highlight và chèn hình học đồ nét lên trên.</p>',
        "Chèn PDF",
      );
      if (!selected) return;
      const pages = parseRange(selected.range, doc.numPages);
      if (selected.placement === "current" && pages.length !== 1)
        throw Error("Chế độ chèn vào trang hiện tại cần chọn đúng 1 trang.");
      const notebookId = Store.book().id,
        created = [],
        objects = [];
      const base64Data = "data:application/pdf;base64," + base64(data);
      const a = {
        type: "application/pdf",
        name: file.name.slice(0, 250),
        data: base64Data,
        pages: doc.numPages,
        inIDB: true,
      };
      if (root.AssetStorage) {
        root.AssetStorage.put(key, base64Data).catch(() => {});
      }
      for (const [i, num] of pages.entries()) {
        if (pages.length > 5 && i % 5 === 0)
          App.toast("Đang dựng PDF " + (i + 1) + " / " + pages.length + "…");
        const source = await doc.getPage(num),
          v = source.getViewport({ scale: 1 }),
          w = 1200,
          h = (1200 * v.height) / v.width;
        if (h > 10000 || h < 100)
          throw Error(
            "Tỷ lệ trang PDF quá lớn; hãy cắt trang trong trình đọc PDF rồi nhập lại.",
          );
        const d = {
            assetId: key,
            pageNumber: num,
            pageRotation: source.rotate,
            sourceRotation: source.rotate,
            previewSize: 700,
            ...(num === 1 ? { preview } : {}),
            sourceName: file.name.slice(0, 250),
          },
          o = Store.object("pdf", d, {
            position: { x: 0, y: 0 },
            size: { w, h },
            style: { color: "#111111", width: 2.5, opacity: 1 },
            locked: true,
          });
        const p = Store.page(file.name.replace(/\.pdf$/i, "") + " · " + num);
        p.paper = "blank";
        p.showTitle = false;
        p.width = w;
        p.height = h;
        p.objects = [o];
        created.push(p);
        objects.push(o);
      }
      if (Store.book().id !== notebookId)
        throw Error("Sổ tay đã thay đổi trong khi nhập. Hãy nhập lại PDF.");
      Store.transaction(() => {
        Store.book().assets = Store.book().assets || {};
        Store.book().assets[key] = a;
        if (selected.placement === "pages") {
          Store.book().pages.push(...created);
          Store.state.pageIndex = Store.book().pages.length - created.length;
          Store.state.selection = [];
          PageFlow.fit("page");
        } else {
          const o = objects[0],
            scale = Math.min(
              1,
              (Store.current().width - 80) / o.size.w,
              900 / o.size.h,
            );
          o.size.w *= scale;
          o.size.h *= scale;
          o.position = App.insertPosition(o.size.w, o.size.h);
          Store.current().objects.push(o);
        }
      });
      if (documents.has(key)) {
        documents.set(Store.book().id + "|" + key, documents.get(key));
        documents.delete(key);
      }
      App.closePanel();
      App.updateZoom();
      Store.save();
      App.toast(
        "Đã chèn " +
          pages.length +
          " trang PDF không giới hạn. Có thể dùng bút hoặc hình học đồ trực tiếp lên bài toán!",
        6000,
      );
      return true;
    } catch (e) {
      App.toast(e.message, 8500);
      return false;
    } finally {
      importing = false;
    }
  }
  function currentPDF() {
    return (
      Store.selected().find((o) => o.type === "pdf") ||
      Store.current().objects.find((o) => o.type === "pdf")
    );
  }
  function toggleTraceMode(o = currentPDF()) {
    if (!o) return App.toast("Chọn hoặc mở một trang PDF để đồ hình.");
    Store.transaction(() => {
      const isDimmed = (o.style.opacity ?? 1) < 0.85;
      o.style.opacity = isDimmed ? 1 : 0.5;
      o.locked = true;
    });
    if ((o.style.opacity ?? 1) < 0.85) {
      App.setTool("pen");
      App.toast("✏️ Đã bật chế độ đồ hình: Nền PDF làm mờ 50% và khóa cố định, chuyển sang bút để viết giải hoặc đồ lại nét!", 5000);
    } else {
      App.toast("Đã tắt chế độ đồ hình (Nền PDF khôi phục 100% độ nét).", 4000);
    }
    Store.emit();
    panel();
    Renderer.request();
  }
  function setOpacity(o, val) {
    if (!o) return;
    Store.transaction(() => {
      o.style.opacity = val;
    });
    Store.emit();
    panel();
    Renderer.request();
  }
  async function snipDiagram(o = currentPDF()) {
    if (!o) return App.toast("Không tìm thấy trang PDF.");
    try {
      App.toast("Đang trích xuất hình vẽ bài toán…");
      const doc = await getDocument(o),
        canvas = await raster(doc, o.data.pageNumber, o.data.pageRotation, 1800),
        dataUrl = canvas.toDataURL("image/png");
      canvas.width = canvas.height = 1;
      const imgObj = Store.object(
        "image",
        {
          src: dataUrl,
          title: "Hình trích từ PDF trang " + o.data.pageNumber,
        },
        {
          position: App.insertPosition(500, 400),
          size: { w: 500, h: 400 },
          style: { color: "#111111", width: 2, opacity: 1 },
        },
      );
      Store.transaction(() => {
        Store.current().objects.push(imgObj);
        Store.state.selection = [imgObj.id];
      });
      App.toast("Đã tạo vùng hình học độc lập từ PDF để giáo viên giảng bài và đồ nét!", 5000);
      Store.emit();
    } catch (e) {
      App.toast("Lỗi trích xuất: " + e.message);
    }
  }
  function panel() {
    const el = document.getElementById("panel-content"),
      o = currentPDF();
    el.innerHTML =
      '<button class="primary full" data-action="import-pdf">+ Chọn PDF từ máy (Không giới hạn dung lượng)</button><p class="hint">Viết, highlight, chèn hình và công thức trên lớp riêng. Hỗ trợ đồ hình trực tiếp lên trang PDF.</p>';
    if (!o) return;
    const a = asset(o),
      card = document.createElement("div"),
      curOp = o.style.opacity ?? 1,
      isTracing = curOp < 0.85;
    card.innerHTML =
      '<div class="panel-divider"></div><h3>' +
      App.escape(a.name) +
      '</h3><p class="hint">Trang nguồn ' +
      o.data.pageNumber +
      " / " +
      a.pages +
      ' · Không giới hạn kích thước · Nét gốc vector</p><div class="teacher-card" style="margin-bottom:12px;background:var(--bg-accent,#f0f7f4);padding:10px;border-radius:8px"><div class="teacher-card-title" style="font-weight:600;margin-bottom:6px">CHẾ ĐỘ ĐỒ HÌNH TRÊN PDF</div><button id="pdf-trace-toggle" class="primary full" style="margin-bottom:8px">' +
      (isTracing ? "✓ Đang ở Chế độ đồ hình (Nhấp để tắt)" : "✏️ Bật Chế độ đồ hình (Mờ nền để vẽ đè)") +
      '</button><div class="tiny-buttons"><span style="font-size:12px;align-self:center">Độ mờ nền:</span><button id="pdf-op-100" class="' +
      (curOp >= 0.95 ? "active" : "") +
      '">100%</button><button id="pdf-op-70" class="' +
      (curOp >= 0.65 && curOp < 0.85 ? "active" : "") +
      '">70%</button><button id="pdf-op-50" class="' +
      (curOp >= 0.45 && curOp < 0.65 ? "active" : "") +
      '">50%</button><button id="pdf-op-30" class="' +
      (curOp < 0.45 ? "active" : "") +
      '">30%</button></div><button id="pdf-snip" class="secondary full" style="margin-top:8px">✂️ Trích xuất hình bài toán ra khung vẽ độc lập</button></div><div class="tiny-buttons"><button id="pdf-unlock">' +
      (o.locked ? "Mở khóa để di chuyển" : "Khóa nền để ghi chú") +
      '</button><button id="pdf-rotate">Xoay trang 90°</button><button id="pdf-original">Tải PDF gốc</button></div><button id="pdf-text" class="secondary full">Trích xuất văn bản để chỉnh sửa</button><div id="pdf-text-result" hidden><textarea id="pdf-extracted" rows="10" aria-label="Văn bản trích xuất"></textarea><div class="field-row"><button id="pdf-insert-text" class="secondary">Chèn văn bản</button><button id="pdf-format-text" class="secondary">Dàn công thức</button></div></div>';
    el.append(card);
    document.getElementById("pdf-trace-toggle").onclick = () => toggleTraceMode(o);
    document.getElementById("pdf-op-100").onclick = () => setOpacity(o, 1.0);
    document.getElementById("pdf-op-70").onclick = () => setOpacity(o, 0.7);
    document.getElementById("pdf-op-50").onclick = () => setOpacity(o, 0.5);
    document.getElementById("pdf-op-30").onclick = () => setOpacity(o, 0.3);
    document.getElementById("pdf-snip").onclick = () => snipDiagram(o);
    document.getElementById("pdf-unlock").onclick = () => {
      Store.transaction(() => (o.locked = !o.locked));
      Store.state.selection = o.locked ? [] : [o.id];
      Store.state.tool = o.locked ? "pen" : "select";
      Store.emit();
      panel();
    };
    document.getElementById("pdf-rotate").onclick = async () => {
      const rotation = (o.data.pageRotation + 90) % 360;
      try {
        const doc = await getDocument(o),
          c = await raster(doc, o.data.pageNumber, rotation, 2400);
        Store.transaction(() => {
          o.data.pageRotation = rotation;
          o.data.preview = c.toDataURL("image/png");
          [o.size.w, o.size.h] = [o.size.h, o.size.w];
          if (o.position.x === 0 && o.position.y === 0) {
            [Store.current().width, Store.current().height] = [
              Store.current().height,
              Store.current().width,
            ];
          }
        });
        c.width = c.height = 1;
      } catch (e) {
        App.toast(e.message);
      }
    };
    document.getElementById("pdf-original").onclick = () =>
      Exporter.download(bytes(a), a.name, "application/pdf");
    document.getElementById("pdf-text").onclick = async () => {
      try {
        const doc = await getDocument(o),
          page = await doc.getPage(o.data.pageNumber),
          content = await page.getTextContent(),
          text = content.items
            .map((i) => i.str + (i.hasEOL ? "\n" : " "))
            .join("")
            .trim();
        document.getElementById("pdf-text-result").hidden = false;
        document.getElementById("pdf-extracted").value =
          text ||
          "PDF này là ảnh quét hoặc không có lớp văn bản. Chưa hỗ trợ OCR ảnh quét.";
      } catch (e) {
        App.toast(e.message);
      }
    };
    document.getElementById("pdf-insert-text").onclick = () =>
      App.insertText(document.getElementById("pdf-extracted").value);
    document.getElementById("pdf-format-text").onclick = () => {
      Formulas.textEditor(
        {
          type: "draft",
          data: { text: document.getElementById("pdf-extracted").value },
        },
        null,
        true,
      );
    };
  }
  async function exportVectorPage(doc, page, p, size, sourceCache = new Map()) {
    const s = Math.min(size[0] / p.width, size[1] / p.height),
      ox = (size[0] - p.width * s) / 2,
      oy = (size[1] - p.height * s) / 2,
      scale = Math.min(2, 3000 / Math.max(p.width, p.height));
    const rasterLayer = async (objects, background = false) => {
      if (!objects.length && !background) return;
      const canvas = Renderer.pageCanvas(p, scale, {
          background,
          backgroundOnly: background,
          objects: objects.length ? objects : undefined,
          omitTitle: true,
        }),
        image = await doc.embedPng(canvas.toDataURL("image/png"));
      page.drawImage(image, {
        x: ox,
        y: oy,
        width: p.width * s,
        height: p.height * s,
      });
      canvas.width = canvas.height = 1;
    };
    await rasterLayer([], true);
    let batch = [];
    const objects = p.layers
      .filter((l) => l.visible)
      .flatMap((l) =>
        p.objects
          .filter((o) => o.layer === l.id && o.visible !== false)
          .sort((a, b) => a.zIndex - b.zIndex),
      );
    for (const o of objects) {
      if (o.type !== "pdf") {
        batch.push(o);
        continue;
      }
      await rasterLayer(batch);
      batch = [];
      const a = asset(o);
      let original = sourceCache.get(o.data.assetId);
      if (!original) {
        original = await PDFLib.PDFDocument.load(bytes(a));
        sourceCache.set(o.data.assetId, original);
      }
      const [embedded] = await doc.embedPdf(original, [o.data.pageNumber - 1]),
        r = o.data.pageRotation,
        angle = -(o.rotation + r),
        rad = (angle * Math.PI) / 180,
        w = (r % 180 ? o.size.h : o.size.w) * s,
        h = (r % 180 ? o.size.w : o.size.h) * s,
        cx = ox + (o.position.x + o.size.w / 2) * s,
        cy = oy + (p.height - o.position.y - o.size.h / 2) * s;
      page.drawPage(embedded, {
        x: cx - (w / 2) * Math.cos(rad) + (h / 2) * Math.sin(rad),
        y: cy - (w / 2) * Math.sin(rad) - (h / 2) * Math.cos(rad),
        width: w,
        height: h,
        rotate: PDFLib.degrees(angle),
        opacity: o.style.opacity,
      });
    }
    await rasterLayer(batch);
    if (p.showTitle && p.title) {
      const canvas = Renderer.pageCanvas({ ...p, objects: [] }, scale, {
          background: false,
          omitTitle: false,
        }),
        image = await doc.embedPng(canvas.toDataURL("image/png"));
      page.drawImage(image, {
        x: ox,
        y: oy,
        width: p.width * s,
        height: p.height * s,
      });
      canvas.width = canvas.height = 1;
    }
  }
  root.PDFStudio = {
    open,
    bytes,
    asset,
    getDocument,
    raster,
    prepare,
    snapshotImage,
    draw,
    parseRange,
    importFile,
    panel,
    exportVectorPage,
    toggleTraceMode,
    setOpacity,
    snipDiagram,
  };
})(window);
