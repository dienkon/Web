(function (root) {
  "use strict";
  const imageCache = new Map();
  function rememberImage(src,img) {
    imageCache.delete(src);imageCache.set(src,img);
    const budget=state().settings.performance === "economy" ? 16e6 : 48e6;
    let bytes=[...imageCache.values()].reduce((sum,value)=>sum+value.naturalWidth*value.naturalHeight*4,0);
    const pinned=new Set();
    const visit=o=>{if(o.type==="image")pinned.add(o.data.src);if(o.type==="group")o.data.children.forEach(visit);};
    for(const item of root.PageFlow?.visible?.()||[])item.page.objects.forEach(visit);
    while(imageCache.size>1 && (imageCache.size>24 || bytes>budget)){
      const key=[...imageCache.keys()].find(key=>key!==src&&!pinned.has(key));
      if(!key)break;
      const old=imageCache.get(key);
      bytes-=old.naturalWidth*old.naturalHeight*4;imageCache.delete(key);
    }
  }
  let layerCache = new WeakMap();
  const strokePaths = new WeakMap();
  let paper,
    ink,
    overlay,
    pc,
    ic,
    oc,
    area,
    dpr = 1,
    frame = 0,
    overlayFrame = 0,
    lastPaperKey = "";
  const state = () => Store.state;
  function init() {
    area = document.getElementById("canvas-area");
    paper = document.getElementById("paper-canvas");
    ink = document.getElementById("ink-canvas");
    overlay = document.getElementById("overlay-canvas");
    if (!overlay && area) {
      overlay = document.createElement("canvas");
      overlay.id = "overlay-canvas";
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.pointerEvents = "none";
      area.appendChild(overlay);
    }
    pc = paper.getContext("2d");
    ic = ink.getContext("2d");
    oc = overlay ? overlay.getContext("2d") : null;
    new ResizeObserver(resize).observe(area);
    document.addEventListener("statechange", () => { layerCache = new WeakMap(); });
    resize();
  }
  function resize() {
    const r = area.getBoundingClientRect();
    const mode = state().settings.performance;
    const weakDevice = navigator.deviceMemory <= 4 || navigator.hardwareConcurrency <= 4;
    const cap = mode === "quality" ? 3 : mode === "economy" || weakDevice ? 1.5 : 2;
    const pixelBudget = mode === "economy" ? 2.5e6 : 5e6;
    dpr = Math.max(1, Math.min(devicePixelRatio || 1, cap, Math.sqrt(pixelBudget / Math.max(1, r.width * r.height))));
    for (const c of [paper, ink, overlay]) {
      if (c) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
    }
    lastPaperKey = "";
    if (state().viewMode !== "manual") root.PageFlow?.fit?.(state().viewMode || "page");
    request();
    requestOverlay();
  }
  function request() {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
  }
  function requestOverlay() {
    if (!overlayFrame)
      overlayFrame = requestAnimationFrame(() => {
        overlayFrame = 0;
        renderOverlay();
      });
  }
  function renderOverlay() {
    if (!oc || !overlay) return;
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.clearRect(0, 0, overlay.width, overlay.height);
    viewport(oc);
    root.CanvasEngine?.drawOverlay(oc);
    root.TeacherGeometry?.drawOverlay(oc);
    root.TeacherGeometry?.positionTools?.();
    root.QuestionPages?.position();
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
    if(root.InkBrush?.draw(ctx,p,o.data.pen,o.style.width))return;
    ctx.globalAlpha *=
      o.data.pen === "highlighter" ? 0.28 : o.data.pen === "pencil" ? 0.7 : 1;
    const width = o.style.width * (o.data.pen === "marker" ? 2 : 1);
    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(p[0][0], p[0][1], width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (o.data.pen !== "fountain") {
      ctx.lineWidth = width;
      const cached = strokePaths.get(o.data);
      if (cached && cached.points === p && cached.length === p.length) {
        ctx.stroke(cached.path);
        return;
      }
      const path = new Path2D();
      path.moveTo(p[0][0], p[0][1]);
      if (p.length === 2) {
        path.lineTo(p[1][0], p[1][1]);
      } else {
        path.lineTo((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2);
        for (let i = 1; i < p.length - 1; i++) {
          const xc = (p[i][0] + p[i + 1][0]) / 2;
          const yc = (p[i][1] + p[i + 1][1]) / 2;
          path.quadraticCurveTo(p[i][0], p[i][1], xc, yc);
        }
        path.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
      }
      strokePaths.set(o.data, { path, points: p, length: p.length });
      ctx.stroke(path);
      return;
    }
    for (let i = 1; i < p.length; i++) {
      const prev = p[i - 1],
        cur = p[i];
      ctx.lineWidth =
        width * (0.25 + 1.5 * (cur[2] || 0.5));
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
        ctx.ellipse(
          w / 2,
          h / 2,
          Math.max(0.1, w / 2),
          Math.max(0.1, h / 2),
          0,
          0,
          Math.PI * 2,
        );
        break;
      case "pill": {
        const r = Math.min(w, h) / 2;
        if (w >= h) {
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(r, h);
          ctx.arc(r, h - r, r, Math.PI / 2, (3 * Math.PI) / 2);
        } else {
          ctx.moveTo(0, r);
          ctx.lineTo(0, h - r);
          ctx.arc(r, h - r, r, Math.PI / 2, Math.PI);
          ctx.lineTo(w, h - r);
          ctx.arc(r, r, r, 0, -Math.PI / 2);
        }
        ctx.closePath();
        break;
      }
      case "triangle":
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      case "triangle-right":
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h / 2);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      case "right-triangle":
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(w, h);
        ctx.closePath();
        break;
      case "diamond":
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h / 2);
        ctx.lineTo(w / 2, h);
        ctx.lineTo(0, h / 2);
        ctx.closePath();
        break;
      case "pentagon":
      case "hexagon":
      case "polygon":
      case "heptagon":
      case "octagon":
      case "decagon": {
        if(Array.isArray(d.vertices)){
          d.vertices.forEach((p,i)=>i?ctx.lineTo(p[0]*w,p[1]*h):ctx.moveTo(p[0]*w,p[1]*h));ctx.closePath();break;
        }
        const sides =
          {
            pentagon: 5,
            hexagon: 6,
            polygon: 6,
            heptagon: 7,
            octagon: 8,
            decagon: 10,
          }[d.kind] || 6;
        const cx = w / 2,
          cy = h / 2,
          rx = w / 2,
          ry = h / 2;
        for (let i = 0; i < sides; i++) {
          const ang = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
          const x = cx + rx * Math.cos(ang),
            y = cy + ry * Math.sin(ang);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case "star": {
        const cx = w / 2,
          cy = h / 2,
          rx = w / 2,
          ry = h / 2;
        const irx = rx * 0.382,
          iry = ry * 0.382;
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const rX = i % 2 === 0 ? rx : irx;
          const rY = i % 2 === 0 ? ry : iry;
          const x = cx + rX * Math.cos(ang),
            y = cy + rY * Math.sin(ang);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        break;
      }
      case "curve":
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(w * 0.2, -h * 0.5, w * 0.8, h * 1.5, w, 0);
        break;
      default: {
        const sx = (d.dirX ?? 1) >= 0 ? 0 : w;
        const sy = (d.dirY ?? 1) >= 0 ? 0 : h;
        const ex = (d.dirX ?? 1) >= 0 ? w : 0;
        const ey = (d.dirY ?? 1) >= 0 ? h : 0;
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        if (d.kind === "dashed") ctx.setLineDash([10, 7]);
        else if (d.kind === "dotted") ctx.setLineDash([2, 5]);

        const drawArrowHead = (tipX, tipY, fromX, fromY) => {
          const ang = Math.atan2(tipY - fromY, tipX - fromX);
          const s = Math.max(10, Math.min(26, (o.style.width || 2) * 5 + 6));
          ctx.moveTo(
            tipX - s * Math.cos(ang - 0.45),
            tipY - s * Math.sin(ang - 0.45),
          );
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(
            tipX - s * Math.cos(ang + 0.45),
            tipY - s * Math.sin(ang + 0.45),
          );
        };
        if (
          d.kind === "arrow" ||
          d.kind === "double-arrow" ||
          d.kind === "ray"
        ) {
          drawArrowHead(ex, ey, sx, sy);
        }
        if (d.kind === "double-arrow") {
          drawArrowHead(sx, sy, ex, ey);
        }
        if (d.kind === "ray") {
          const dotRadius = Math.max(3, (o.style.width || 2) * 1.4);
          ctx.moveTo(sx + dotRadius, sy);
          ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
        }
        break;
      }
    }
    if (d.filled) {
      ctx.fillStyle = o.style.color;
      ctx.fill();
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
    if (d.kind === "circle" || d.kind === "trig-circle") {
      const r = G.norm(G.sub(d.points[1], d.points[0]));
      circle(d.points[0], r);
      if (d.kind === "trig-circle") {
        const c = flatPoint(o, d.points[0]),
          rx = r * Math.abs(flatPoint(o, [1, 0])[0] - flatPoint(o, [0, 0])[0]);
        ctx.save();
        ctx.strokeStyle = o.style.color;
        ctx.lineWidth = 1.3;
        // Cos axis (horizontal)
        ctx.beginPath();
        ctx.moveTo(c[0] - rx * 1.25, c[1]);
        ctx.lineTo(c[0] + rx * 1.25, c[1]);
        ctx.stroke();
        // Arrow for cos
        ctx.beginPath();
        ctx.moveTo(c[0] + rx * 1.25 - 6, c[1] - 4);
        ctx.lineTo(c[0] + rx * 1.25, c[1]);
        ctx.lineTo(c[0] + rx * 1.25 - 6, c[1] + 4);
        ctx.stroke();
        // Sin axis (vertical)
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] + rx * 1.25);
        ctx.lineTo(c[0], c[1] - rx * 1.25);
        ctx.stroke();
        // Arrow for sin
        ctx.beginPath();
        ctx.moveTo(c[0] - 4, c[1] - rx * 1.25 + 6);
        ctx.lineTo(c[0], c[1] - rx * 1.25);
        ctx.lineTo(c[0] + 4, c[1] - rx * 1.25 + 6);
        ctx.stroke();
        // Axis labels
        ctx.font = "italic 14px Georgia";
        ctx.fillStyle = o.style.color;
        ctx.fillText("cos", c[0] + rx * 1.26 + 2, c[1] + 4);
        ctx.fillText("sin", c[0] - 14, c[1] - rx * 1.26 - 4);
        ctx.fillText("O", c[0] - 14, c[1] + 14);
        // Special angles on unit circle
        const angles = [
          [0, "0"],
          [Math.PI / 6, "π/6 (30°)"],
          [Math.PI / 4, "π/4 (45°)"],
          [Math.PI / 3, "π/3 (60°)"],
          [Math.PI / 2, "π/2 (90°)"],
          [(2 * Math.PI) / 3, "2π/3"],
          [(3 * Math.PI) / 4, "3π/4"],
          [(5 * Math.PI) / 6, "5π/6"],
          [Math.PI, "π (180°)"],
          [(3 * Math.PI) / 2, "3π/2 (270°)"],
        ];
        ctx.font = "11px Segoe UI";
        for (const [ang, label] of angles) {
          const px = c[0] + rx * Math.cos(ang),
            py = c[1] - rx * Math.sin(ang);
          ctx.beginPath();
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
          ctx.fill();
          if (
            [
              "0",
              "π/6 (30°)",
              "π/4 (45°)",
              "π/3 (60°)",
              "π/2 (90°)",
              "π (180°)",
              "3π/2 (270°)",
            ].includes(label)
          ) {
            const tx = c[0] + (rx + 18) * Math.cos(ang),
              ty = c[1] - (rx + 18) * Math.sin(ang);
            ctx.fillText(label, tx - 12, ty + 4);
          }
        }
        ctx.restore();
      }
    } else if (d.kind === "cartesian-oxy") {
      const c = flatPoint(o, [0, 0]);
      ctx.save();
      // Grid
      ctx.strokeStyle = "#82998a33";
      ctx.lineWidth = 0.8;
      for (let i = -4; i <= 4; i++) {
        const x = flatPoint(o, [i, 0])[0],
          y = flatPoint(o, [0, i])[1];
        ctx.beginPath();
        ctx.moveTo(x, flatPoint(o, [0, -4.2])[1]);
        ctx.lineTo(x, flatPoint(o, [0, 4.2])[1]);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(flatPoint(o, [-4.2, 0])[0], y);
        ctx.lineTo(flatPoint(o, [4.2, 0])[0], y);
        ctx.stroke();
      }
      // Main axes
      ctx.strokeStyle = o.style.color;
      ctx.lineWidth = 1.8;
      // Ox
      ctx.beginPath();
      ctx.moveTo(flatPoint(o, [-4.6, 0])[0], c[1]);
      ctx.lineTo(flatPoint(o, [4.6, 0])[0], c[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(flatPoint(o, [4.6, 0])[0] - 6, c[1] - 4);
      ctx.lineTo(flatPoint(o, [4.6, 0])[0], c[1]);
      ctx.lineTo(flatPoint(o, [4.6, 0])[0] - 6, c[1] + 4);
      ctx.stroke();
      // Oy
      ctx.beginPath();
      ctx.moveTo(c[0], flatPoint(o, [0, -4.6])[1]);
      ctx.lineTo(c[0], flatPoint(o, [0, 4.6])[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c[0] - 4, flatPoint(o, [0, 4.6])[1] + 6);
      ctx.lineTo(c[0], flatPoint(o, [0, 4.6])[1]);
      ctx.lineTo(c[0] + 4, flatPoint(o, [0, 4.6])[1] + 6);
      ctx.stroke();
      // Labels and numbers
      ctx.font = "italic 14px Georgia";
      ctx.fillStyle = o.style.color;
      ctx.fillText("x", flatPoint(o, [4.6, 0])[0] + 4, c[1] + 4);
      ctx.fillText("y", c[0] + 6, flatPoint(o, [0, 4.6])[1] - 4);
      ctx.fillText("O", c[0] - 14, c[1] + 14);
      ctx.font = "10px Segoe UI";
      for (let i = -4; i <= 4; i++) {
        if (i !== 0) {
          ctx.fillText(String(i), flatPoint(o, [i, 0])[0] - 3, c[1] + 13);
          ctx.fillText(String(i), c[0] - 16, flatPoint(o, [0, i])[1] + 4);
        }
      }
      ctx.restore();
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
        const vName = d.vertexLabels?.[i] || String.fromCharCode(65 + i);
        if (root.TeacherGeometry)
          TeacherGeometry.drawLabel(
            ctx,
            vName,
            a,
            [o.size.w / 2, o.size.h / 2],
            labelBoxes,
            p,
            [],
            d.labelOffsets?.[i],
          );
        else {
          ctx.font = "italic 18px Georgia";
          ctx.fillText(vName, a[0] + 8, a[1] - 10);
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
  function drawObject(ctx, o, options = {}) {
    if (o.visible === false) return;
    ctx.save();
    if(o.clip){ctx.beginPath();ctx.rect(o.position.x+o.clip.x,o.position.y+o.clip.y,o.clip.w,o.clip.h);ctx.clip();}
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
        if(options.pdfImages?.has(o.id))ctx.drawImage(options.pdfImages.get(o.id),0,0,o.size.w,o.size.h);
        else root.PDFStudio?.draw(ctx, o);
        break;
      case "image": {
        let img = imageCache.get(o.data.src);
        if (!img) {
          img = new Image();
          img.onload = () => {rememberImage(o.data.src,img);request();};
          img.src = o.data.src;
          rememberImage(o.data.src, img);
        }
        if (img.complete && img.naturalWidth)
          ctx.drawImage(img, 0, 0, o.size.w, o.size.h);
        break;
      }
      case "group": {
        const s = o.data.originalSize;
        ctx.scale(o.size.w / s.w, o.size.h / s.h);
        o.data.children.forEach((child) => drawObject(ctx, child, options));
        break;
      }
    }
    ctx.restore();
  }
  function getLayerObjects(p) {
    const cached = layerCache.get(p);
    if (cached && cached.objects === p.objects && cached.version === p.objects.length) {
      return cached.map;
    }
    const map = {};
    for (let i = 0; i < p.layers.length; i++) {
      const l = p.layers[i];
      if (l.visible) map[l.id] = [];
    }
    for (let i = 0; i < p.objects.length; i++) {
      const o = p.objects[i];
      const arr = map[o.layer];
      if (arr) arr.push(o);
    }
    for (const key in map) {
      map[key].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    }
    layerCache.set(p, { objects: p.objects, version: p.objects.length, map });
    return map;
  }
  function objects(ctx, p, options = {}) {
    const layerMap = getLayerObjects(p);
    // Exports and thumbnails draw the full page, regardless of the viewport.
    const t = ctx === ic ? ctx.getTransform() : null;
    const bounds = t ? { x: -t.e / t.a, y: -t.f / t.d,
      w: ink.width / t.a, h: ink.height / t.d } : null;
    for (let i = 0; i < p.layers.length; i++) {
      const layer = p.layers[i];
      if (!layer.visible) continue;
      const list = layerMap[layer.id];
      if (!list) continue;
      for (let j = 0; j < list.length; j++) {
        const o = list[j];
        if (bounds && o.type === "stroke") {
          const radius = Math.hypot(o.size.w, o.size.h) / 2 + o.style.width * 3;
          const x = o.position.x + o.size.w / 2, y = o.position.y + o.size.h / 2;
          if (x + radius < bounds.x || x - radius > bounds.x + bounds.w ||
              y + radius < bounds.y || y - radius > bounds.y + bounds.h) continue;
        }
        drawObject(ctx, o, options);
      }
    }
  }
  function drawSelection(ctx) {
    const zoom = state().viewport.zoom;
    ctx.save();
    ctx.strokeStyle = "#308e74";
    ctx.lineWidth = 1 / zoom;
    ctx.fillStyle = "#fff";
    for (const o of Store.selected()) {
      const b = selectionBounds(o);
      ctx.save();
      transform(ctx, o);
      ctx.setLineDash([5 / zoom, 4 / zoom]);
      ctx.strokeRect(
        b.x - 5 / zoom,
        b.y - 5 / zoom,
        b.w + 10 / zoom,
        b.h + 10 / zoom,
      );
      ctx.setLineDash([]);
      if (!o.locked) {
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, b.y);
        ctx.lineTo(b.x + b.w / 2, b.y - 22 / zoom);
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
  function selectionBounds(o) {
    if (o.type !== "solid") return { x: 0, y: 0, w: o.size.w, h: o.size.h };
    const view = SolidView.forObject(o), pts = [...view.pr.points];
    if (["sphere", "cone", "cylinder", "cone-frustum"].includes(o.data.kind)) {
      const round = SolidView.roundSegments(view, o.data);
      for (const s of [...round.outline, ...round.curves]) pts.push(s.a, s.b);
    }
    if (o.data.constructions?.length) {
      const result = Constructions.build(o);
      for (const p of result.points.values()) pts.push(view.screen(p.coords));
      for (const item of result.items)
        for (const p of item.endpoints || item.points || []) pts.push(view.screen(p));
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(1, Math.max(...xs) - x), h: Math.max(1, Math.max(...ys) - y) };
  }
  function render() {
    if (!area) return;
    if (root.PageFlow?.enabled()) return renderFlow();
    root.PageFlow?.update();
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
    root.PDFTiles?.beginFrame();
    objects(ic, p);
    root.PDFTiles?.endFrame();
    drawSelection(ic);
    updateTitle();
    renderOverlay();
  }
  function renderFlow() {
    const pages = PageFlow.visible(),
      v = state().viewport;
    const flowPaperKey = `${pages.map((p) => `${p.index}:${p.x}:${p.y}:${p.page.paper}:${p.page.width}:${p.page.height}`).join(",")}|${v.x}|${v.y}|${v.zoom}|${paper.width}|${paper.height}|${state().settings.gridSize}`;
    if (flowPaperKey !== lastPaperKey) {
      pc.setTransform(1, 0, 0, 1, 0, 0);
      pc.clearRect(0, 0, paper.width, paper.height);
      pc.fillStyle = "#e9eeeb";
      pc.fillRect(0, 0, paper.width, paper.height);
      for (const item of pages) {
        viewport(pc);
        pc.save();
        pc.translate(item.x, item.y);
        drawPaper(pc, item.page, {
          x: 0,
          y: 0,
          w: item.page.width,
          h: item.page.height,
        });
        pc.strokeStyle = "#cbd5cf";
        pc.lineWidth = 1 / v.zoom;
        pc.strokeRect(0, 0, item.page.width, item.page.height);
        pc.restore();
      }
      lastPaperKey = flowPaperKey;
    }

    ic.setTransform(1, 0, 0, 1, 0, 0);
    ic.clearRect(0, 0, ink.width, ink.height);
    root.PDFTiles?.beginFrame();
    for (const item of pages) {
      viewport(ic);
      ic.save();
      ic.translate(item.x, item.y);
      ic.beginPath();
      ic.rect(0, 0, item.page.width, item.page.height);
      ic.clip();
      objects(ic, item.page);
      ic.restore();
    }
    root.PDFTiles?.endFrame();

    viewport(ic);
    drawSelection(ic);
    updateTitle();
    PageFlow.update();
    renderOverlay();
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
    if (options.objects) options.objects.forEach((o) => drawObject(ctx, o, options));
    else if (!options.backgroundOnly) objects(ctx, p, options);
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
  async function awaitImages(p, options = {}) {
    const visit = async (o) => {
      if (o.type === "group") return Promise.all(o.data.children.map(visit));
      if (o.type === "formula") return root.Formulas?.prepare(o);
      if (o.type === "pdf" && options.pdf !== false)
        return root.PDFStudio?.prepare(o, Math.max(o.size.w, o.size.h) * 2);
      if (o.type !== "image") return;
      let img = imageCache.get(o.data.src);
      if (img?.complete && img.naturalWidth) return;
      await new Promise((resolve, reject) => {
        img = new Image();
        img.onload = () => {
          rememberImage(o.data.src, img);
          resolve();
        };
        img.onerror = () => reject(Error("Không đọc được ảnh trong tài liệu."));
        img.src = o.data.src;
      });
    };
    await Promise.all(p.objects.map(visit));
  }
  root.Renderer = {
    selectionBounds,
    init,
    resize,
    request,
    requestOverlay,
    render,
    renderOverlay,
    invalidateCommittedInk: () => { layerCache = new WeakMap(); },
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
