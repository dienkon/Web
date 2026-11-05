(function (root) {
  "use strict";
  const imageCache = new Map();
  let paper,
    ink,
    pc,
    ic,
    area,
    dpr = 1,
    frame = 0,
    lastPaperKey = "";
  const state = () => Store.state;
  function init() {
    area = document.getElementById("canvas-area");
    paper = document.getElementById("paper-canvas");
    ink = document.getElementById("ink-canvas");
    pc = paper.getContext("2d");
    ic = ink.getContext("2d");
    new ResizeObserver(resize).observe(area);
    resize();
  }
  function resize() {
    const r = area.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 3);
    for (const c of [paper, ink]) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    }
    lastPaperKey = "";
    request();
  }
  function request() {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
  }
  function viewport(ctx) {
    const v = state().viewport;
    ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, dpr * v.x, dpr * v.y);
  }
  function drawPaper(ctx, p, bounds) {
    const isDark = p.paper === "dark";
    ctx.fillStyle = isDark ? "#24342d" : "#fff";
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    if (p.paper === "blank") return;
    const grid = state().settings.gridSize * (p.paper === "large" ? 2 : 1),
      zoom = ctx.getTransform().a;
    ctx.strokeStyle = isDark ? "#3a4e42" : "#e4eae4";
    ctx.fillStyle = isDark ? "#587362" : "#c7d5ca";
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    for (
      let x = Math.floor(bounds.x / grid) * grid;
      x < bounds.x + bounds.w;
      x += grid
    ) {
      if (p.paper === "lines") continue;
      if (p.paper === "dots") {
        for (
          let y = Math.floor(bounds.y / grid) * grid;
          y < bounds.y + bounds.h;
          y += grid
        ) {
          ctx.moveTo(x + 1 / zoom, y);
          ctx.arc(x, y, 1 / zoom, 0, Math.PI * 2);
        }
      } else {
        ctx.moveTo(x, bounds.y);
        ctx.lineTo(x, bounds.y + bounds.h);
      }
    }
    if (p.paper === "dots") {
      ctx.fill();
      return;
    }
    for (
      let y = Math.floor(bounds.y / grid) * grid;
      y < bounds.y + bounds.h;
      y += grid
    ) {
      ctx.moveTo(bounds.x, y);
      ctx.lineTo(bounds.x + bounds.w, y);
    }
    ctx.stroke();
    if (p.paper === "axes") {
      ctx.strokeStyle = "#9eb6a5";
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(p.width / 2, bounds.y);
      ctx.lineTo(p.width / 2, bounds.y + bounds.h);
      ctx.moveTo(bounds.x, p.height / 2);
      ctx.lineTo(bounds.x + bounds.w, p.height / 2);
      ctx.stroke();
    }
  }
  function transform(ctx, o) {
    ctx.translate(o.position.x + o.size.w / 2, o.position.y + o.size.h / 2);
    ctx.rotate(((o.rotation || 0) * Math.PI) / 180);
    ctx.translate(-o.size.w / 2, -o.size.h / 2);
  }
  function localPoint(o, p) {
    const a = (-(o.rotation || 0) * Math.PI) / 180,
      dx = p.x - o.position.x - o.size.w / 2,
      dy = p.y - o.position.y - o.size.h / 2;
    return {
      x: dx * Math.cos(a) - dy * Math.sin(a) + o.size.w / 2,
      y: dx * Math.sin(a) + dy * Math.cos(a) + o.size.h / 2,
    };
  }
  function worldPoint(o, p) {
    const a = ((o.rotation || 0) * Math.PI) / 180,
      dx = p.x - o.size.w / 2,
      dy = p.y - o.size.h / 2;
    return {
      x: o.position.x + o.size.w / 2 + dx * Math.cos(a) - dy * Math.sin(a),
      y: o.position.y + o.size.h / 2 + dx * Math.sin(a) + dy * Math.cos(a),
    };
  }
  function stroke(ctx, o) {
    const p = o.data.points;
    if (!p.length) return;
    const ow = o.data.baseSize?.w || o.size.w,
      oh = o.data.baseSize?.h || o.size.h;
    ctx.scale(o.size.w / ow, o.size.h / oh);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha *=
      o.data.pen === "highlighter" ? 0.28 : o.data.pen === "pencil" ? 0.7 : 1;
    const width = o.style.width * (o.data.pen === "marker" ? 2 : 1);
    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(p[0][0], p[0][1], width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1],
        cur = p[i],
        next = p[Math.min(i + 1, p.length - 1)];
      ctx.lineWidth =
        width * (o.data.pen === "fountain" ? 0.25 + 1.5 * (cur[2] || 0.5) : 1);
      ctx.beginPath();
      if (i === 1) ctx.moveTo(prev[0], prev[1]);
      else ctx.moveTo((p[i - 2][0] + prev[0]) / 2, (p[i - 2][1] + prev[1]) / 2);
      ctx.quadraticCurveTo(
        prev[0],
        prev[1],
        (cur[0] + prev[0]) / 2,
        (cur[1] + prev[1]) / 2,
      );
      if (i === p.length - 1) ctx.lineTo(cur[0], cur[1]);
      ctx.stroke();
    }
  }
  function shape(ctx, o) {
    const { w, h } = o.size,
      d = o.data;
    ctx.beginPath();
    switch (d.kind) {
      case "rectangle":
      case "square":
        ctx.rect(0, 0, w, h);
        break;
      case "circle":
      case "ellipse":
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;
      case "triangle":
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      case "polygon":
        for (let i = 0; i < 6; i++) {
          const x = w / 2 + (w / 2) * Math.cos((i * Math.PI) / 3),
            y = h / 2 + (h / 2) * Math.sin((i * Math.PI) / 3);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        break;
      case "curve":
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(w * 0.2, -h * 0.5, w * 0.8, h * 1.5, w, 0);
        break;
      default: {
        const flip = d.flip,
          sy = flip ? h : 0,
          ey = flip ? 0 : h;
        ctx.moveTo(0, sy);
        ctx.lineTo(w, ey);
        if (d.kind === "dashed") ctx.setLineDash([8, 6]);
        if (d.kind === "arrow" || d.kind === "ray") {
          const angle = Math.atan2(ey - sy, w),
            s = 12;
          ctx.moveTo(
            w - s * Math.cos(angle - 0.45),
            ey - s * Math.sin(angle - 0.45),
          );
          ctx.lineTo(w, ey);
          ctx.lineTo(
            w - s * Math.cos(angle + 0.45),
            ey - s * Math.sin(angle + 0.45),
          );
        }
        break;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function flatPoint(o, p) {
    const b = o.data.frame || [-1, 7, -1, 6],
      w = o.size.w - 50,
      h = o.size.h - 50;
    const s = Math.min(w / (b[1] - b[0]), h / (b[3] - b[2]));
    return [25 + (p[0] - b[0]) * s, 25 + (b[3] - p[1]) * s];
  }
  function unflatPoint(o, p) {
    const b = o.data.frame || [-1, 7, -1, 6],
      s = Math.min(
        (o.size.w - 50) / (b[1] - b[0]),
        (o.size.h - 50) / (b[3] - b[2]),
      );
    return [(p.x - 25) / s + b[0], b[3] - (p.y - 25) / s];
  }
  function geometry(ctx, o) {
    const labelBoxes = [];
    const d = o.data,
      p = d.points.map((p) => flatPoint(o, p)),
      G = Geometry;
    const line = (a, b, dash = false) => {
      ctx.setLineDash(dash ? [6, 5] : []);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const circle = (center, r) => {
      ctx.beginPath();
      ctx.arc(
        ...flatPoint(o, center),
        r * Math.abs(flatPoint(o, [1, 0])[0] - flatPoint(o, [0, 0])[0]),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    };
    if (d.kind === "circle") {
      circle(d.points[0], G.norm(G.sub(d.points[1], d.points[0])));
    } else {
      ctx.beginPath();
      p.forEach((a, i) => (i ? ctx.lineTo(...a) : ctx.moveTo(...a)));
      ctx.closePath();
      if (o.data.fillOpacity > 0) {
        ctx.save();
        ctx.globalAlpha *= o.data.fillOpacity;
        ctx.fillStyle = o.style.color;
        ctx.fill();
        ctx.restore();
      }
      ctx.stroke();
    }
    if (p.length === 3) {
      const t = G.triangleData(d.points);
      ctx.save();
      ctx.strokeStyle = o.style.color;
      ctx.lineWidth = Math.max(1.8, o.style.width * 0.85);
      if (d.kind === "median" || d.kind === "centroid") {
        line(p[0], flatPoint(o, t.midpoint), true);
        if (d.kind === "centroid") {
          line(p[1], flatPoint(o, G.mid(d.points[0], d.points[2])), true);
          line(p[2], flatPoint(o, G.mid(d.points[0], d.points[1])), true);
        }
      }
      if (d.kind === "altitude") line(p[0], flatPoint(o, t.foot), true);
      if (d.kind === "bisector") line(p[0], flatPoint(o, t.bisector), true);
      if (d.kind === "incircle") circle(t.incenter, t.inradius);
      if (d.kind === "circumcircle" && t.circumcenter)
        circle(t.circumcenter, t.circumradius);
      if (d.kind === "median") {
        ctx.fillStyle = o.style.color;
        ctx.font = "italic 15px Georgia";
        const q = flatPoint(o, t.midpoint);
        ctx.fillText("M", q[0] + 5, q[1] + 17);
      }
      ctx.restore();
    }
    for (const aux of d.aux || []) {
      if (aux.type === "segment") line(p[aux.a], p[aux.b], true);
      if (["parallel", "perpendicular"].includes(aux.type)) {
        const A = d.points[aux.a],
          B = d.points[aux.b],
          C = d.points[aux.c],
          ab = G.sub(B, A),
          v = aux.type === "parallel" ? ab : [-ab[1], ab[0]],
          length = G.norm(v);
        if (length > 1e-10) {
          const delta = G.scale(v, 6 / length);
          line(
            flatPoint(o, G.sub(C, delta)),
            flatPoint(o, G.add(C, delta)),
            true,
          );
        }
      }
      if (aux.type === "midpoint") {
        const q = flatPoint(o, G.mid(d.points[aux.a], d.points[aux.b]));
        ctx.beginPath();
        ctx.arc(...q, 3, 0, Math.PI * 2);
        ctx.fillStyle = o.style.color;
        ctx.fill();
        ctx.font = "italic 14px Georgia";
        ctx.fillText(aux.label || "M", q[0] + 6, q[1] - 7);
      }
    }
    p.forEach((a, i) => {
      ctx.fillStyle = o.style.color;
      ctx.beginPath();
      ctx.arc(...a, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (d.labels) {
        if (root.TeacherGeometry)
          TeacherGeometry.drawLabel(
            ctx,
            String.fromCharCode(65 + i),
            a,
            [o.size.w / 2, o.size.h / 2],
            labelBoxes,
            p,
          );
        else {
          ctx.font = "italic 18px Georgia";
          ctx.fillText(String.fromCharCode(65 + i), a[0] + 8, a[1] - 10);
        }
      }
      if (d.measures && d.kind !== "circle") {
        const next = p[(i + 1) % p.length],
          dist = G.norm(G.sub(d.points[i], d.points[(i + 1) % p.length]));
        ctx.font = "11px Segoe UI";
        ctx.fillText(
          dist.toFixed(2),
          (a[0] + next[0]) / 2 + 6,
          (a[1] + next[1]) / 2 - 6,
        );
      }
    });
  }
  function solid(ctx, o) {
    SolidDrawing.draw(ctx, o);
  }
  function text(ctx, o) {
    ctx.fillStyle = o.style.color;
    const font = o.data.fontSize || 20;
    ctx.font =
      (o.data.math ? "" : "400 ") +
      font +
      "px " +
      (o.data.math
        ? 'Consolas, "Segoe UI", monospace'
        : '"Segoe UI", sans-serif');
    ctx.textBaseline = "top";
    const max = o.size.w,
      fontScale = o.size.w / (o.data.baseWidth || o.size.w);
    ctx.scale(fontScale, fontScale);
    const width = max / fontScale;
    if (o.data.table) {
      const rows = o.data.table,
        cols = Math.max(...rows.map((r) => r.length)),
        cw = width / cols,
        ch = font * 2;
      ctx.lineWidth = 1;
      ctx.strokeStyle = o.style.color;
      rows.forEach((row, r) => {
        for (let c = 0; c < cols; c++) {
          if (!o.data.matrix) ctx.strokeRect(c * cw, r * ch, cw, ch);
          ctx.fillText(row[c] || "", c * cw + 9, r * ch + font * 0.5, cw - 16);
        }
      });
      if (o.data.matrix) {
        ctx.font = font * rows.length * 1.5 + "px Georgia";
        ctx.fillText("[", -font, 0);
        ctx.fillText("]", width, 0);
      }
      return;
    }
    if (o.data.layout?.kind === "fraction") {
      ctx.textAlign = "center";
      ctx.fillText(o.data.layout.top, width / 2, 0, width);
      ctx.fillText(o.data.layout.bottom, width / 2, font * 1.8, width);
      ctx.beginPath();
      ctx.moveTo(0, font * 1.5);
      ctx.lineTo(width, font * 1.5);
      ctx.stroke();
      return;
    }
    if (o.data.layout?.kind === "sqrt") {
      ctx.fillText("√", 0, 0);
      ctx.fillText(o.data.layout.value, font, 0, width - font);
      ctx.beginPath();
      ctx.moveTo(font, 0);
      ctx.lineTo(width, 0);
      ctx.stroke();
      return;
    }
    o.data.text
      .split("\n")
      .forEach((line, i) => ctx.fillText(line, 0, i * font * 1.5, width));
  }
  function drawObject(ctx, o) {
    if (o.visible === false) return;
    ctx.save();
    transform(ctx, o);
    ctx.strokeStyle = o.style.color;
    ctx.fillStyle = o.style.color;
    ctx.globalAlpha = o.style.opacity ?? 1;
    ctx.lineWidth = o.style.width || 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    switch (o.type) {
      case "stroke":
        stroke(ctx, o);
        break;
      case "shape":
        shape(ctx, o);
        break;
      case "geometry":
        geometry(ctx, o);
        root.TeacherGeometry?.draw(ctx, o);
        break;
      case "solid":
        solid(ctx, o);
        root.TeacherGeometry?.draw(ctx, o);
        break;
      case "graph":
        root.Graph.drawObject(ctx, o);
        break;
      case "text":
        text(ctx, o);
        break;
      case "formula":
        root.Formulas?.draw(ctx, o);
        break;
      case "pdf":
        root.PDFStudio?.draw(ctx, o);
        break;
      case "image": {
        let img = imageCache.get(o.data.src);
        if (!img) {
          img = new Image();
          img.onload = request;
          img.src = o.data.src;
          imageCache.set(o.data.src, img);
        }
        if (img.complete && img.naturalWidth)
          ctx.drawImage(img, 0, 0, o.size.w, o.size.h);
        break;
      }
      case "group": {
        const s = o.data.originalSize;
        ctx.scale(o.size.w / s.w, o.size.h / s.h);
        o.data.children.forEach((child) => drawObject(ctx, child));
        break;
      }
    }
    ctx.restore();
  }
  function objects(ctx, p) {
    for (const layer of p.layers) {
      if (!layer.visible) continue;
      p.objects
        .filter((o) => o.layer === layer.id)
        .sort((a, b) => a.zIndex - b.zIndex)
        .forEach((o) => drawObject(ctx, o));
    }
  }
  function drawSelection(ctx) {
    const zoom = state().viewport.zoom;
    ctx.save();
    ctx.strokeStyle = "#308e74";
    ctx.lineWidth = 1 / zoom;
    ctx.fillStyle = "#fff";
    for (const o of Store.selected()) {
      ctx.save();
      transform(ctx, o);
      ctx.setLineDash([5 / zoom, 4 / zoom]);
      ctx.strokeRect(
        -5 / zoom,
        -5 / zoom,
        o.size.w + 10 / zoom,
        o.size.h + 10 / zoom,
      );
      ctx.setLineDash([]);
      if (!o.locked) {
        ctx.beginPath();
        ctx.moveTo(o.size.w / 2, 0);
        ctx.lineTo(o.size.w / 2, -22 / zoom);
        ctx.stroke();
        for (const h of CanvasEngine.selectionHandles(o)) {
          ctx.beginPath();
          ctx.arc(
            h.x,
            h.y,
            (h.key === "rotate" ? 6 : 5.5) / zoom,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
        }
        if (o.type === "geometry") {
          o.data.points.forEach((p) => {
            const q = flatPoint(o, p);
            ctx.beginPath();
            ctx.arc(...q, 5 / zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function render() {
    if (!area) return;
    const v = state().viewport,
      w = area.clientWidth,
      h = area.clientHeight,
      p = Store.current(),
      bounds = {
        x: -v.x / v.zoom,
        y: -v.y / v.zoom,
        w: w / v.zoom,
        h: h / v.zoom,
      },
      paperKey = JSON.stringify([
        p.id,
        p.paper,
        p.width,
        p.height,
        state().settings.gridSize,
        v,
        w,
        h,
      ]);
    if (paperKey !== lastPaperKey) {
      pc.setTransform(1, 0, 0, 1, 0, 0);
      pc.clearRect(0, 0, paper.width, paper.height);
      viewport(pc);
      drawPaper(pc, p, bounds);
      pc.save();
      pc.strokeStyle = p.paper === "dark" ? "#5a6b60" : "#cad6cd";
      pc.lineWidth = 1 / v.zoom;
      pc.setLineDash([6, 7]);
      pc.strokeRect(0, 0, p.width, p.height);
      pc.restore();
      lastPaperKey = paperKey;
    }
    ic.setTransform(1, 0, 0, 1, 0, 0);
    ic.clearRect(0, 0, ink.width, ink.height);
    viewport(ic);
    objects(ic, p);
    root.CanvasEngine?.drawOverlay(ic);
    root.TeacherGeometry?.drawOverlay(ic);
    drawSelection(ic);
    if (state().ruler) drawRuler(ic);
    updateTitle();
  }
  function drawRuler(ctx) {
    ctx.save();
    ctx.fillStyle = "#dfeae388";
    ctx.strokeStyle = "#82998a";
    ctx.lineWidth = 1;
    ctx.fillRect(100, 350, 600, 54);
    ctx.strokeRect(100, 350, 600, 54);
    ctx.font = "9px Segoe UI";
    ctx.fillStyle = "#607769";
    for (let i = 0; i <= 60; i++) {
      const x = 100 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x, 350);
      ctx.lineTo(x, 350 + (i % 5 === 0 ? 22 : 12));
      ctx.stroke();
      if (i % 10 === 0) ctx.fillText(i / 10, x + 3, 390);
    }
    ctx.restore();
  }
  function updateTitle() {
    const el = document.getElementById("page-title"),
      p = Store.current(),
      v = state().viewport;
    el.hidden = !p.showTitle;
    el.style.left = v.x + 55 * v.zoom + "px";
    el.style.top = v.y + 30 * v.zoom + "px";
    el.style.width =
      Math.min(p.width - 110, (area.clientWidth - v.x) / v.zoom - 85) * v.zoom +
      "px";
    el.style.height = 90 * v.zoom + "px";
    el.style.fontSize = v.zoom * 13 + "px";
    const input = document.getElementById("page-title-input");
    input.style.fontSize = 25 * v.zoom + "px";
    if (document.activeElement !== input) input.value = p.title;
    document.getElementById("welcome-hint").hidden =
      p.objects.length > 0 ||
      !!p.title ||
      v.zoom !== 1 ||
      v.x !== 0 ||
      v.y !== 0;
  }
  function thumbnail(canvas, p) {
    canvas.width = 240;
    canvas.height = 300;
    const c = canvas.getContext("2d");
    c.setTransform(240 / p.width, 0, 0, 300 / p.height, 0, 0);
    drawPaper(c, p, { x: 0, y: 0, w: p.width, h: p.height });
    objects(c, p);
    if (p.title) {
      c.fillStyle = "#567461";
      c.font = "28px Segoe UI";
      c.fillText(p.title, 50, 80);
    }
  }
  function pageCanvas(p, scale = 1, options = {}) {
    const c = document.createElement("canvas");
    c.width = p.width * scale;
    c.height = p.height * scale;
    const ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    if (options.background !== false)
      drawPaper(ctx, p, { x: 0, y: 0, w: p.width, h: p.height });
    if (options.objects) options.objects.forEach((o) => drawObject(ctx, o));
    else if (!options.backgroundOnly) objects(ctx, p);
    if (p.showTitle && p.title && !options.omitTitle) {
      ctx.fillStyle = p.paper === "dark" ? "#d7e3d9" : "#314f41";
      ctx.font = "25px Segoe UI";
      ctx.fillText(p.title, 70, 88);
    }
    return c;
  }
  function clientPoint(e) {
    const r = area.getBoundingClientRect(),
      v = state().viewport;
    return {
      x: (e.clientX - r.left - v.x) / v.zoom,
      y: (e.clientY - r.top - v.y) / v.zoom,
    };
  }
  async function awaitImages(p) {
    const visit = async (o) => {
      if (o.type === "group") return Promise.all(o.data.children.map(visit));
      if (o.type === "formula") return root.Formulas?.prepare(o);
      if (o.type === "pdf")
        return root.PDFStudio?.prepare(o, Math.max(o.size.w, o.size.h) * 2);
      if (o.type !== "image") return;
      let img = imageCache.get(o.data.src);
      if (img?.complete && img.naturalWidth) return;
      await new Promise((resolve, reject) => {
        img = new Image();
        img.onload = () => {
          imageCache.set(o.data.src, img);
          resolve();
        };
        img.onerror = () => reject(Error("Không đọc được ảnh trong tài liệu."));
        img.src = o.data.src;
      });
    };
    await Promise.all(p.objects.map(visit));
  }
  root.Renderer = {
    init,
    resize,
    request,
    render,
    drawObject,
    objects,
    drawPaper,
    thumbnail,
    pageCanvas,
    awaitImages,
    localPoint,
    worldPoint,
    flatPoint,
    unflatPoint,
    clientPoint,
    get area() {
      return area;
    },
  };
})(window);
