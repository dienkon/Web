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
      maxImageSize: 30000000,
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
    const a = asset(o);
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
    const size = Math.min(4096, Math.max(1000, Math.ceil(maxSize / 500) * 500)),
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
          ) > 32000000)
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
  function draw(ctx, o) {
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
      if (target > (o.data.previewSize || 1600))
        prepare(o, target).catch((e) => {
          if (!errorsShown.has(o.id)) {
            errorsShown.add(o.id);
            App.toast("PDF: " + e.message, 7000);
          }
        });
    }
    if (
      image &&
      (image instanceof HTMLCanvasElement ||
        (image.complete && image.naturalWidth))
    )
      ctx.drawImage(image, 0, 0, o.size.w, o.size.h);
  }
  function parseRange(text, count) {
    const result = new Set();
    for (const part of text.split(",")) {
      const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw Error("Khoảng trang chưa đúng. Ví dụ: 1-3, 5.");
      const a = Number(m[1]),
        b = Number(m[2] || m[1]);
      if (a < 1 || b < a || b > count || b - a > 29)
        throw Error("Chọn trang hợp lệ, tối đa 30 trang mỗi lần nhập.");
      for (let i = a; i <= b; i++) result.add(i);
    }
    if (!result.size || result.size > 30) throw Error("Chọn 1–30 trang.");
    return [...result].sort((a, b) => a - b);
  }
  async function importFile(file) {
    if (importing) return App.toast("Một tệp PDF đang được xử lý.");
    importing = true;
    let key;
    try {
      if (file.size > 40 * 1024 * 1024) throw Error("PDF tối đa 40 MB.");
      const data = new Uint8Array(await file.arrayBuffer());
      if (!new TextDecoder().decode(data.slice(0, 1024)).includes("%PDF-"))
        throw Error("Tệp không có nội dung PDF hợp lệ.");
      key = Store.uid();
      App.toast("Đang đọc PDF trên thiết bị…");
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
          ' MB</p><span class="badge">Xử lý hoàn toàn offline</span></div></div><label class="field"><span>Trang cần nhập · tối đa 30 trang / lần</span><input name="range" id="pdf-range" value="1' +
          (doc.numPages > 1 ? "-" + Math.min(doc.numPages, 30) : "") +
          '" required></label><label class="field"><span>Cách chèn</span><select name="placement"><option value="pages">Mỗi trang PDF → một trang sổ tay mới</option><option value="current">Chèn 1 trang PDF vào trang đang mở</option></select></label><label class="field"><span>Độ nét bản xem trước</span><select name="quality"><option value="2400">Cao · 2400 px, giữ PDF gốc để zoom / xuất</option><option value="1600">Gọn nhẹ · 1600 px</option></select></label><p class="hint">Nền PDF được khóa để viết, highlight và chèn công thức lên trên. PDF gốc được giữ nguyên để xuất lại rõ nét; đây không phải trình sửa từng ký tự trong PDF.</p>',
        "Chèn PDF",
      );
      if (!selected) return;
      const pages = parseRange(selected.range, doc.numPages);
      if (selected.placement === "current" && pages.length !== 1)
        throw Error("Chế độ chèn vào trang hiện tại cần chọn đúng 1 trang.");
      if (Store.book().pages.length + pages.length > 300)
        throw Error("Sổ tay tối đa 300 trang.");
      const notebookId = Store.book().id,
        created = [],
        objects = [];
      const a = {
        type: "application/pdf",
        name: file.name.slice(0, 250),
        data: "data:application/pdf;base64," + base64(data),
        pages: doc.numPages,
      };
      for (const [i, num] of pages.entries()) {
        App.toast("Đang dựng PDF " + (i + 1) + " / " + pages.length + "…");
        const source = await doc.getPage(num),
          v = source.getViewport({ scale: 1 }),
          canvas = await raster(
            doc,
            num,
            source.rotate,
            Number(selected.quality),
          ),
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
            previewSize: Number(selected.quality),
            preview: canvas.toDataURL("image/png"),
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
        canvas.width = canvas.height = 1;
      }
      if (Store.book().id !== notebookId)
        throw Error("Sổ tay đã thay đổi trong khi nhập. Hãy nhập lại PDF.");
      const sourceSize=Object.values(Store.book().assets||{}).reduce((n,a)=>n+a.data.length,0)+a.data.length;
      if(sourceSize>80e6||sourceSize+Store.snapshot().length+JSON.stringify(created).length>90e6)
        throw Error('Sổ tay quá lớn để sao lưu và mở lại an toàn. Hãy tạo sổ tay mới hoặc chọn ít trang PDF hơn. Nội dung hiện tại được giữ nguyên.');
      Store.transaction(() => {
        Store.book().assets = Store.book().assets || {};
        Store.book().assets[key] = a;
        if (selected.placement === "pages") {
          Store.book().pages.push(...created);
          Store.state.pageIndex = Store.book().pages.length - created.length;
          Store.state.selection = [];
          Store.state.viewport = {
            x: 20,
            y: 20,
            zoom: Math.min(
              1,
              (Renderer.area.clientWidth - 40) / created[0].width,
            ),
          };
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
          " trang PDF. Viết trực tiếp lên tài liệu; Ctrl+S để sao lưu.",
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
  function panel() {
    const el = document.getElementById("panel-content"),
      o = currentPDF();
    el.innerHTML =
      '<button class="primary full" data-action="import-pdf">+ Chọn PDF từ máy</button><p class="hint">Viết, highlight, chèn hình và công thức trên lớp riêng. PDF gốc không bị tẩy hoặc ghi đè.</p>';
    if (!o) return;
    const a = asset(o),
      card = document.createElement("div");
    card.innerHTML =
      '<div class="panel-divider"></div><h3>' +
      App.escape(a.name) +
      '</h3><p class="hint">Trang nguồn ' +
      o.data.pageNumber +
      " / " +
      a.pages +
      ' · nét gốc được giữ khi xuất PDF</p><div class="tiny-buttons"><button id="pdf-unlock">' +
      (o.locked ? "Mở khóa để di chuyển" : "Khóa nền để ghi chú") +
      '</button><button id="pdf-rotate">Xoay trang 90°</button><button id="pdf-original">Tải PDF gốc</button></div><button id="pdf-text" class="secondary full">Trích xuất văn bản để chỉnh sửa</button><div id="pdf-text-result" hidden><textarea id="pdf-extracted" rows="10" aria-label="Văn bản trích xuất"></textarea><div class="field-row"><button id="pdf-insert-text" class="secondary">Chèn văn bản</button><button id="pdf-format-text" class="secondary">Dàn công thức</button></div></div>';
    el.append(card);
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
    draw,
    parseRange,
    importFile,
    panel,
    exportVectorPage,
  };
})(window);
