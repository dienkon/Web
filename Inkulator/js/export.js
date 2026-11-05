(function (root) {
  "use strict";
  function download(data, name, type) {
    const url = URL.createObjectURL(
        data instanceof Blob ? data : new Blob([data], { type }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function filename() {
    return (
      Store.book()
        .title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .slice(0, 100) || "So-tay"
    );
  }
  function project(snapshot = false) {
    Store.save();
    const stamp = snapshot
      ? "-" + new Date().toISOString().replace(/[:.]/g, "-")
      : "";
    download(
      JSON.stringify(Store.envelope(), null, 2),
      filename() + stamp + ".smath.json",
      "application/json",
    );
    App.toast("Đã xuất sổ tay. Giữ tệp .smath.json để mở và sửa tiếp.");
  }
  function backupAll() {
    download(
      JSON.stringify(
        {
          format: "scrble-math-library",
          version: 1,
          notebooks: Store.state.notebooks.map((n) => Store.envelope(n)),
        },
        null,
        2,
      ),
      "SCRBLE-backup-" + new Date().toISOString().slice(0, 10) + ".json",
      "application/json",
    );
  }
  async function importFile(file) {
    try {
      if (file.size > 100 * 1024 * 1024)
        throw Error("Tệp dự án nhập tối đa 100 MB.");
      const raw = await file.text();
      let data;
      try {
        data = JSON.parse(raw, (key, value) => {
          if (["__proto__", "constructor", "prototype"].includes(key))
            throw Error("Khóa dữ liệu không an toàn.");
          return value;
        });
      } catch (_) {
        throw Error(
          "Tệp JSON lỗi hoặc chứa khóa không hợp lệ. Dữ liệu đang mở không thay đổi.",
        );
      }
      let list;
      if (data.format === "scrble-math-library") {
        if (
          data.version !== 1 ||
          !Array.isArray(data.notebooks) ||
          data.notebooks.length > 100 ||
          !data.notebooks.length
        )
          throw Error("Bản sao lưu thư viện không hợp lệ.");
        list = data.notebooks.map((n) => Store.validate(n));
      } else list = [Store.validate(data)];
      Store.save();
      Store.state.notebooks.push(...list);
      Store.switchBook(Store.state.notebooks.length - list.length);
      App.closePanel();
      App.toast(
        "Đã mở " +
          list.length +
          " sổ tay. Bản đang làm việc vẫn nằm trong thư viện.",
      );
      return true;
    } catch (e) {
      App.toast(e.message, 7000);
      return false;
    }
  }
  async function importImage(file) {
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw Error("Chọn PNG, JPEG hoặc WebP tối đa 5 MB.");
      const src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
        img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(Error("Ảnh không hợp lệ."));
        img.src = src;
      });
      const w = Math.min(600, img.naturalWidth),
        h = (w * img.naturalHeight) / img.naturalWidth;
      const cleaned = await ImageStudio.process(src);
      Store.add(
        Store.object(
          "image",
          {
            src: cleaned.src,
            originalSrc: src,
            processing: { threshold: 195, bold: 1 },
          },
          {
            position: App.insertPosition(w, h),
            size: { w, h },
            style: { color: "#111111", width: 2.6, opacity: 1 },
          },
        ),
      );
      App.toast(
        "Đã chèn bản vẽ nét đen, nền trong suốt. Nhấp đúp để đổi về ảnh màu gốc.",
      );
    } catch (e) {
      App.toast(e.message);
    }
  }
  async function png() {
    try {
      await Renderer.awaitImages(Store.current());
      const c = Renderer.pageCanvas(Store.current(), 1.5);
      c.toBlob((b) => {
        if (b)
          download(
            b,
            filename() + "-trang-" + (Store.state.pageIndex + 1) + ".png",
            "image/png",
          );
        else App.toast("Không tạo được ảnh.");
      });
    } catch (e) {
      App.toast(e.message);
    }
  }
  async function pdf() {
    try {
      const r = await App.dialog(
        "Xuất sổ tay PDF",
        '<label class="field"><span>Khổ giấy</span><select name="size"><option value="A4">A4</option><option value="A3">A3</option></select></label><p class="hint">Mỗi trang sổ tay được đặt vừa khổ giấy, giữ tỷ lệ. Nội dung ngoài ranh giới trang không được xuất.</p>',
        "Xuất PDF",
      );
      if (!r) return;
      App.toast("Đang tạo PDF…");
      const doc = await PDFLib.PDFDocument.create();
      doc.setTitle(Store.book().title);
      doc.setCreator("SCRBLE MATH STUDIO — Offline");
      const sourceCache = new Map();
      for (const p of Store.book().pages) {
        await Renderer.awaitImages(p);
        if (p.objects.some((o) => o.type === "pdf" && o.visible !== false)) {
          const base = r.size === "A3" ? [841.89, 1190.55] : [595.28, 841.89],
            size = p.width > p.height ? [base[1], base[0]] : base,
            page = doc.addPage(size);
          await PDFStudio.exportVectorPage(doc, page, p, size, sourceCache);
          continue;
        }
        const scale = Math.min(1.5, 2400 / Math.max(p.width, p.height)),
          c = Renderer.pageCanvas(p, scale),
          img = await doc.embedPng(c.toDataURL("image/png"));
        const base = r.size === "A3" ? [841.89, 1190.55] : [595.28, 841.89],
          size = p.width > p.height ? [base[1], base[0]] : base,
          page = doc.addPage(size),
          s = Math.min(size[0] / p.width, size[1] / p.height);
        page.drawImage(img, {
          x: (size[0] - p.width * s) / 2,
          y: (size[1] - p.height * s) / 2,
          width: p.width * s,
          height: p.height * s,
        });
        c.width = c.height = 1;
      }
      download(await doc.save(), filename() + ".pdf", "application/pdf");
      App.toast("Đã xuất PDF " + Store.book().pages.length + " trang.");
    } catch (e) {
      App.toast("Xuất PDF: " + e.message);
    }
  }
  async function print() {
    try {
      const container = document.createElement("div");
      container.className = "print-pages";
      container.style.display = "none";
      for (const p of Store.book().pages) {
        await Renderer.awaitImages(p);
        const img = new Image();
        img.src = Renderer.pageCanvas(p).toDataURL("image/png");
        container.append(img);
      }
      document.body.append(container);
      await Promise.all(
        [...container.querySelectorAll("img")].map((i) => i.decode()),
      );
      const cleanup = () => {
        container.remove();
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      window.print();
    } catch (e) {
      App.toast(e.message);
    }
  }
  /* Canvas command adapter keeps strokes, geometry and text as SVG vectors. Graphs/images are embedded. */
  class SVGContext {
    constructor() {
      this.parts = [];
      this.matrix = new DOMMatrix();
      this.stack = [];
      this.path = "";
      this.globalAlpha = 1;
      this.fillStyle = "#000";
      this.strokeStyle = "#000";
      this.lineWidth = 1;
      this.lineCap = "butt";
      this.lineJoin = "miter";
      this.font = "20px Segoe UI";
      this.textBaseline = "alphabetic";
      this.textAlign = "start";
      this.dash = [];
    }
    save() {
      this.stack.push({
        matrix: DOMMatrix.fromMatrix(this.matrix),
        globalAlpha: this.globalAlpha,
        fillStyle: this.fillStyle,
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
        lineCap: this.lineCap,
        lineJoin: this.lineJoin,
        font: this.font,
        textBaseline: this.textBaseline,
        textAlign: this.textAlign,
        dash: [...this.dash],
      });
    }
    restore() {
      Object.assign(this, this.stack.pop());
    }
    getTransform() {
      return this.matrix;
    }
    translate(x, y) {
      this.matrix = this.matrix.translate(x, y);
    }
    scale(x, y) {
      this.matrix = this.matrix.scale(x, y);
    }
    rotate(a) {
      this.matrix = this.matrix.rotate((a * 180) / Math.PI);
    }
    setLineDash(a) {
      this.dash = a;
    }
    beginPath() {
      this.path = "";
    }
    closePath() {
      this.path += " Z";
    }
    moveTo(x, y) {
      this.path += " M" + x + " " + y;
    }
    lineTo(x, y) {
      this.path += " L" + x + " " + y;
    }
    quadraticCurveTo(x1, y1, x, y) {
      this.path += " Q" + [x1, y1, x, y].join(" ");
    }
    bezierCurveTo(...args) {
      this.path += " C" + args.join(" ");
    }
    rect(x, y, w, h) {
      this.path += " M" + x + " " + y + "h" + w + "v" + h + "h" + -w + "Z";
    }
    arc(x, y, r, a, b) {
      this.ellipse(x, y, r, r, 0, a, b);
    }
    ellipse(x, y, rx, ry, rot, a, b) {
      const x0 = x + rx * Math.cos(a),
        y0 = y + ry * Math.sin(a),
        mid = (a + b) / 2,
        xm = x + rx * Math.cos(mid),
        ym = y + ry * Math.sin(mid),
        x1 = x + rx * Math.cos(b),
        y1 = y + ry * Math.sin(b);
      this.moveTo(x0, y0);
      this.path +=
        " A" +
        rx +
        " " +
        ry +
        " " +
        rot +
        " 0 1 " +
        xm +
        " " +
        ym +
        " A" +
        rx +
        " " +
        ry +
        " " +
        rot +
        " 0 1 " +
        x1 +
        " " +
        y1;
    }
    attrs() {
      return (
        ' transform="matrix(' +
        [
          this.matrix.a,
          this.matrix.b,
          this.matrix.c,
          this.matrix.d,
          this.matrix.e,
          this.matrix.f,
        ].join(" ") +
        ')" opacity="' +
        this.globalAlpha +
        '"'
      );
    }
    stroke() {
      this.parts.push(
        '<path d="' +
          this.path +
          '" fill="none" stroke="' +
          this.strokeStyle +
          '" stroke-width="' +
          this.lineWidth +
          '" stroke-linecap="' +
          this.lineCap +
          '" stroke-linejoin="' +
          this.lineJoin +
          '" stroke-dasharray="' +
          this.dash.join(" ") +
          '"' +
          this.attrs() +
          "/>",
      );
    }
    fill() {
      this.parts.push(
        '<path d="' +
          this.path +
          '" fill="' +
          this.fillStyle +
          '"' +
          this.attrs() +
          "/>",
      );
    }
    fillRect(x, y, w, h) {
      this.beginPath();
      this.rect(x, y, w, h);
      this.fill();
    }
    strokeRect(x, y, w, h) {
      this.beginPath();
      this.rect(x, y, w, h);
      this.stroke();
    }
    fillText(text, x, y) {
      const match = this.font.match(/(\d+(?:\.\d+)?)px/),
        size = match ? Number(match[1]) : 20;
      this.parts.push(
        '<text x="' +
          x +
          '" y="' +
          (y + (this.textBaseline === "top" ? size : 0)) +
          '" font-family="Segoe UI, Arial, sans-serif" font-size="' +
          size +
          '" text-anchor="' +
          (this.textAlign === "center" ? "middle" : "start") +
          '" fill="' +
          this.fillStyle +
          '"' +
          this.attrs() +
          ">" +
          App.escape(text) +
          "</text>",
      );
    }
    drawImage(img, x, y, w, h) {
      const src =
        img instanceof HTMLCanvasElement ? img.toDataURL("image/png") : img.src;
      this.parts.push(
        '<image href="' +
          App.escape(src) +
          '" x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          w +
          '" height="' +
          h +
          '"' +
          this.attrs() +
          "/>",
      );
    }
  }
  async function svg() {
    try {
      const p = Store.current();
      await Renderer.awaitImages(p);
      const ctx = new SVGContext();
      Renderer.drawPaper(ctx, p, { x: 0, y: 0, w: p.width, h: p.height });
      Renderer.objects(ctx, p);
      if (p.showTitle && p.title) {
        ctx.fillStyle = "#314f41";
        ctx.font = "25px Segoe UI";
        ctx.fillText(p.title, 70, 88);
      }
      const xml =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        p.width +
        '" height="' +
        p.height +
        '" viewBox="0 0 ' +
        p.width +
        " " +
        p.height +
        '"><defs><clipPath id="page"><rect width="100%" height="100%"/></clipPath></defs><g clip-path="url(#page)">' +
        ctx.parts.join("") +
        "</g></svg>";
      download(xml, filename() + ".svg", "image/svg+xml");
    } catch (e) {
      App.toast("Xuất SVG: " + e.message);
    }
  }
  root.Exporter = {
    project,
    backupAll,
    importFile,
    importImage,
    png,
    pdf,
    svg,
    print,
    download,
    SVGContext,
  };
})(window);
