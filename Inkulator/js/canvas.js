(function (root) {
  "use strict";
  let canvas,
    gesture = null,
    space = false,
    penActive = false,
    laser = null,
    laserTimer = 0,
    pinch = null;
  let lastPenTime = -Infinity;
  let glide = 0;
  const pointers = new Map();
  const areaErasers = new Set(["rectangle", "square", "circle"]);
  const S = () => Store.state,
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inkModes = new Set(["pen", "highlighter", "laser"]);
  function selectionHandles(o) {
    const ends = Renderer.lineEnds(o);
    if (ends) return ends.map((p, i) => ({ ...p, key: "end" + i }));
    const z = S().viewport.zoom, b = Renderer.selectionBounds(o);
    return [
      { key: "tl", x: b.x, y: b.y },
      { key: "tr", x: b.x + b.w, y: b.y },
      { key: "br", x: b.x + b.w, y: b.y + b.h },
      { key: "bl", x: b.x, y: b.y + b.h },
      { key: "rotate", x: b.x + b.w / 2, y: b.y - 28 / z },
    ];
  }
  function init() {
    canvas = document.getElementById("ink-canvas");
    cursor();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", (e) => {
      if (gesture?.pointerId === e.pointerId) cancel(e);
    });
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("dblclick", doubleClick);
    canvas.addEventListener("contextmenu", context);
    canvas.addEventListener("dragover", (e) => {
      if ([...e.dataTransfer.types].includes("Files")) e.preventDefault();
      if (e.dataTransfer.types.includes("application/x-scrble-shape"))
        e.preventDefault();
    });
    canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      root.PageFlow?.activateAt(e.clientX, e.clientY);
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name))
          PDFStudio.importFile(file);
        else if (file.type.startsWith("image/")) Exporter.importImage(file);
        else Exporter.importFile(file);
        return;
      }
      try {
        const data = JSON.parse(
          e.dataTransfer.getData("application/x-scrble-shape"),
        );
        const catalog = data.solid
          ? Geometry.solidCatalog
          : Geometry.flatCatalog;
        if (!catalog.some(([k]) => k === data.kind)) return;
        const p = Renderer.clientPoint(e);
        Panels.insert(data.kind, !!data.solid, { x: p.x - 160, y: p.y - 130 });
      } catch (_) {}
    });
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !App.isEditing(e.target)) {
        space = true;
        canvas.style.cursor = "grab";
        e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        space = false;
        cursor();
      }
    });
    window.addEventListener("blur", () => {
      space = false;
      if (gesture) root.CanvasEngine.finishActive();
      pointers.clear();
    });
  }
  function layerEditable(o) {
    const l = Store.current().layers.find((l) => l.id === o.layer);
    return !o.locked && o.visible !== false && l?.visible && !l.locked;
  }
  function hit(p) {
    const pge = Store.current();
    const sorted = pge.layers.flatMap((l) =>
      l.visible
        ? pge.objects
            .filter((o) => o.layer === l.id)
            .sort((a, b) => a.zIndex - b.zIndex)
        : [],
    );
    for (let i = sorted.length - 1; i >= 0; i--) {
      const o = sorted[i];
      if (!layerEditable(o)) continue;
      if(o.clip&&(p.x<o.position.x+o.clip.x||p.x>o.position.x+o.clip.x+o.clip.w||p.y<o.position.y+o.clip.y||p.y>o.position.y+o.clip.y+o.clip.h))continue;
      const q = Renderer.localPoint(o, p),
        pad = 7 / S().viewport.zoom,
        box=o.type==='solid'?Renderer.selectionBounds(o):{x:0,y:0,w:o.size.w,h:o.size.h};
      const ends = Renderer.lineEnds(o);
      if (ends) {
        if (segmentDistance(q, ...ends) <= pad + o.style.width / 2) return o;
      } else if (o.type === "stroke") {
        const pts = o.data.points,
          sx = o.size.w / (o.data.baseSize?.w || o.size.w),
          sy = o.size.h / (o.data.baseSize?.h || o.size.h);
        for (let j = 1; j < pts.length; j++)
          if (
            segmentDistance(
              q,
              { x: pts[j - 1][0] * sx, y: pts[j - 1][1] * sy },
              { x: pts[j][0] * sx, y: pts[j][1] * sy },
            ) < Math.max(pad, o.style.width)
          )
            return o;
        if (
          pts.length === 1 &&
          Math.hypot(q.x - pts[0][0] * sx, q.y - pts[0][1] * sy) < pad
        )
          return o;
      } else if (
        q.x >= box.x-pad &&
        q.y >= box.y-pad &&
        q.x <= box.x+box.w + pad &&
        q.y <= box.y+box.h + pad
      )
        return o;
    }
    return null;
  }
  function down(e) {
    const penPan = e.pointerType === "pen" && !S().settings.canvasMenu && (e.button === 2 || (e.buttons & 2));
    if (e.button === 2 && !penPan) return;
    if (e.pointerType === "touch" && (penActive || performance.now() - lastPenTime < 180)) return;
    stopGlide();
    document.getElementById("canvas-context").hidden = true;
    App.closePopover();
    // A palm or another pointer must never replace an unfinished pen stroke.
    if (gesture && e.pointerType !== "touch" && !(e.pointerType === "pen" && gesture.pointerType === "touch")) return;
    if (e.pointerType === "pen" && (gesture || pinch)) {
      if (gesture) rollback();
      pointers.clear();
      pinch = null;
    }
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === "touch" && pointers.size === 2) {
      if (gesture) rollback();
      const pp = [...pointers.values()],
        r = Renderer.area.getBoundingClientRect(),
        cx = (pp[0].x + pp[1].x) / 2 - r.left,
        cy = (pp[0].y + pp[1].y) / 2 - r.top;
      pinch = {
        distance: dist(pp[0], pp[1]),
        zoom: S().viewport.zoom,
        world: {
          x: (cx - S().viewport.x) / S().viewport.zoom,
          y: (cy - S().viewport.y) / S().viewport.zoom,
        },
      };
      gesture = null;
      return;
    }
    if (e.pointerType === "pen") {
      penActive = true;
      lastPenTime = performance.now();
    }
    if (!gesture) root.PageFlow?.activateAt(e.clientX, e.clientY);
    const bounds = Renderer.area.getBoundingClientRect();
    const p = Renderer.clientPoint(e, bounds);
    let mode = S().tool;
    if (
      penPan || space ||
      e.button === 1 ||
      (e.pointerType === "touch" && !S().settings.touchInk && !["select", "eraser"].includes(mode))
    )
      mode = "pan";
    if (e.button === 5 || e.buttons === 32) mode = "eraser";
    if (mode === "select" && root.TeacherGeometry?.handleDown(e, p)) return;
    gesture = {
      mode,
      pointerType: e.pointerType,
      pointerId: e.pointerId,
      start: p,
      last: p,
      before: ["pen", "highlighter", "laser", "pan", "eraser"].includes(mode) ? null : Store.snapshot(),
      inkToken: ["pen", "highlighter"].includes(mode) ? Store.beginInk() : null,
      pageIndex: S().pageIndex,
      client: { x: e.clientX, y: e.clientY },
      viewport: { ...S().viewport },
      bounds,
      moved: false,
    };
    if (mode === "pan") {
      S().viewMode = "manual";
      gesture.pan = { x: e.clientX, y: e.clientY, time: performance.now(), speed: 0 };
      canvas.style.cursor = "grabbing";
      return;
    }
    if (mode === "text") {
      gesture = null;
      App.editText(null, p);
      return;
    }
    if (mode === "pen" || mode === "highlighter" || mode === "laser") {
      const layer = Store.current().layers.find((l) => l.id === "ink");
      if (layer.locked || !layer.visible) {
        gesture = null;
        return App.toast("Lớp Nét bút đang khóa hoặc ẩn.");
      }
      gesture.rulerLine = mode !== "laser" ? root.RulerStudio?.snapLine(p) : null;
      const first = gesture.rulerLine ? RulerStudio.project(p,gesture.rulerLine) : p;
      gesture.points = [[first.x, first.y, pressure(e)]];
      gesture.inkBottom = first.y;
      gesture.brush = penStyle(mode);
      gesture.path = {};
      Renderer.requestInkOverlay();
      return;
    }
    if (mode === "select") {
      const selected = Store.selected();
      for (const o of selected) {
        if (!layerEditable(o)) continue;
        const construction=root.GeometryLab?.draggable(o,p);
        if(construction){gesture.mode='construction-point';gesture.object=o;gesture.construction=construction;return;}
        const q = Renderer.localPoint(o, p),
          tolerance = 12 / S().viewport.zoom;
        let handle = null, distance = tolerance + 4 / S().viewport.zoom;
        for (const candidate of selectionHandles(o)) {
          const d = dist(q, candidate);
          if (d < distance) {
            handle = candidate;
            distance = d;
          }
        }
        if (handle) {
          const ends = Renderer.lineEnds(o);
          if (ends) {
            gesture.mode = "line-end";
            gesture.object = o;
            gesture.end = handle.key === "end0" ? 0 : 1;
            gesture.endpoints = ends.map((point) => Renderer.worldPoint(o, point));
            return;
          }
          gesture.mode = handle.key === "rotate" ? "rotate2d" : "resize";
          gesture.handle = handle.key;
          gesture.object = o;
          gesture.original = Store.clone(o);
          gesture.bounds = Renderer.selectionBounds(o);
          if (handle.key === "rotate") {
            gesture.center = Renderer.worldPoint(o, {
              x: o.size.w / 2,
              y: o.size.h / 2,
            });
            gesture.startAngle = Math.atan2(
              p.y - gesture.center.y,
              p.x - gesture.center.x,
            );
          }
          return;
        }
        if (o.type === "geometry") {
          const index = o.data.points.findIndex((v) => {
            const [x, y] = Renderer.flatPoint(o, v);
            return dist(q, { x, y }) < tolerance;
          });
          if (index >= 0) {
            gesture.mode = "vertex";
            gesture.object = o;
            gesture.vertex = index;
            return;
          }
        }
      }
      const explicit = S().transformMode !== "auto" && selected.find((o) => {
        if (!layerEditable(o)) return false;
        const q = Renderer.localPoint(o, p);
        const ends = Renderer.lineEnds(o);
        if (ends) return segmentDistance(q, ...ends) <= 7 / S().viewport.zoom + o.style.width / 2;
        return q.x >= 0 && q.y >= 0 && q.x <= o.size.w && q.y <= o.size.h;
      });
      const o = explicit || hit(p);
      if (o) {
        const already = S().selection.includes(o.id);
        if (e.shiftKey || S().multiSelect) {
          if (already) gesture.toggleId = o.id;
          else S().selection.push(o.id);
        } else if (!already) S().selection = [o.id];
        if(o.type==='graph'&&o.data.revolution?.enabled&&already&&S().transformMode!=='move'){
          gesture.mode='revolution3d';gesture.object=o;gesture.rotation=[...o.data.revolution.rotation];
        }else if (
          o.type === "solid" &&
          (o.data.live || root.TeacherGeometry?.orbit) &&
          already &&
          S().transformMode !== "move" &&
          !e.altKey
        ) {
          const q = Renderer.localPoint(o, p),
            border =
              q.x < 20 ||
              q.x > o.size.w - 20 ||
              q.y < 20 ||
              q.y > o.size.h - 20;
          if (!border) {
            gesture.mode = "rotate3d";
            gesture.object = o;
            gesture.rotation = [...o.data.rotation];
          } else gesture.mode = "move";
        } else gesture.mode = "move";
        gesture.originals = Store.selected().map((o) => ({
          id: o.id,
          x: o.position.x,
          y: o.position.y,
        }));
        Store.emit();
      } else {
        if (!e.shiftKey && !S().multiSelect) S().selection = [];
        gesture.mode = "marquee";
        Store.emit();
      }
      return;
    }
    if (mode === "lasso") {
      gesture.points = [p];
      if (!e.shiftKey && !S().multiSelect) S().selection = [];
      return;
    }
    if (mode === "eraser") {
      gesture.eraser = S().eraser;
      if (!areaErasers.has(gesture.eraser)) erase(p);
      return;
    }
    if (mode === "shape") {
      const layer = Store.current().layers.find((l) => l.id === "geometry");
      if (layer.locked || !layer.visible) {
        gesture = null;
        return App.toast("Lớp Hình học đang khóa hoặc ẩn.");
      }
      // A tap only positions the pen. Shapes begin after an intentional drag.
      gesture.draft = null;
    }
  }
  function pressure(e) {
    return Math.max(
      0.05,
      Math.min(
        1,
        (e.pointerType === "pen" ? e.pressure || 0.5 : 0.5) *
          S().settings.penSensitivity,
      ),
    );
  }
  function move(e) {
    if (pointers.has(e.pointerId))
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      S().viewMode = "manual";
      const pp = [...pointers.values()],
        r = Renderer.area.getBoundingClientRect(),
        z = Math.max(
          0.2,
          Math.min(4, (pinch.zoom * dist(pp[0], pp[1])) / pinch.distance),
        ),
        cx = (pp[0].x + pp[1].x) / 2 - r.left,
        cy = (pp[0].y + pp[1].y) / 2 - r.top;
      S().viewport = {
        zoom: z,
        x: cx - pinch.world.x * z,
        y: cy - pinch.world.y * z,
      };
      Renderer.request();
      App.updateZoom();
      return;
    }
    if (!gesture) {
      if (root.TeacherGeometry?.active) TeacherGeometry.hover(Renderer.clientPoint(e));
      return;
    }
    if (gesture.pointerId !== e.pointerId) return;
    const g = gesture;
    if (g.mode === "pan") {
      S().viewport.x = g.viewport.x + e.clientX - g.client.x;
      S().viewport.y = g.viewport.y + e.clientY - g.client.y;
      const sample = g.pan, now = performance.now(), dy = e.clientY - sample.y;
      sample.x = e.clientX;
      if (dy) {
        const speed = dy / Math.max(8, now - sample.time);
        sample.speed = Math.max(-3, Math.min(3, (now - sample.time > 100 ? 0 : sample.speed * .35) + speed * .65));
        sample.y = e.clientY;
        sample.time = now;
      }
      Renderer.request();
      return;
    }
    const bounds = inkModes.has(g.mode) ? g.bounds : Renderer.area.getBoundingClientRect();
    const p = Renderer.clientPoint(e, bounds);
    g.last = p;
    g.moved = g.moved || dist(g.start, p) > 2;
    if (inkModes.has(g.mode)) {
      const coalesced = e.getCoalescedEvents?.();
      const smoothing = 1 - S().settings.smoothing * 0.35;
      const separation = (Store.economyMode() ? 0.65 : 0.4) / S().viewport.zoom;
      const separationSquared = separation * separation;
      const startCount = g.points.length;
      for (const item of coalesced?.length ? coalesced : [e]) {
        const raw = item === e ? p : Renderer.clientPoint(item, bounds);
        const q = g.rulerLine ? RulerStudio.project(raw, g.rulerLine) : raw;
        const prev = g.points[g.points.length - 1];
        const dx = q.x - prev[0], dy = q.y - prev[1];
        if (dx * dx + dy * dy < separationSquared) continue;
        const y = prev[1] + dy * smoothing;
        g.points.push([prev[0] + dx * smoothing, y, pressure(item)]);
        g.inkBottom = Math.max(g.inkBottom, y);
      }
      if (g.points.length !== startCount) {
        if (g.mode !== "laser") root.PageFlow?.ensureInk(g.inkBottom, g.pageIndex);
        Renderer.requestInkOverlay();
      }
      return;
    }
    if (g.mode === "move") {
      const dx = p.x - g.start.x,
        dy = p.y - g.start.y;
      g.originals.forEach((a) => {
        const o = Store.current().objects.find((o) => o.id === a.id);
        if (o && layerEditable(o)) o.position = { x: a.x + dx, y: a.y + dy };
      });
    }
    if (g.mode === "line-end") {
      const point = g.endpoints[g.end];
      const moved = { x: point.x + p.x - g.start.x, y: point.y + p.y - g.start.y };
      const [a, b] = g.end === 0 ? [moved, g.endpoints[1]] : [g.endpoints[0], moved];
      setLine(g.object, a, b, e.shiftKey || S().geometrySnap, g.end);
    }
    if (g.mode === "resize" && g.object.type === "solid") {
      const o = g.object, a = g.original, b = g.bounds;
      const q = Renderer.localPoint(a, p), left = g.handle.includes("l"), top = g.handle.startsWith("t");
      const localAnchor = { x: left ? b.x + b.w : b.x, y: top ? b.y + b.h : b.y };
      const anchor = Renderer.worldPoint(a, localAnchor);
      const dx = (q.x - localAnchor.x) * (left ? -1 : 1);
      const dy = (q.y - localAnchor.y) * (top ? -1 : 1);
      const k = Math.max(20 / Math.min(a.size.w, a.size.h), (dx * b.w + dy * b.h) / (b.w*b.w + b.h*b.h));
      o.size = { w: a.size.w * k, h: a.size.h * k };
      const angle = a.rotation * Math.PI / 180;
      const cx = o.size.w / 2 - localAnchor.x * k, cy = o.size.h / 2 - localAnchor.y * k;
      o.position = { x: anchor.x + cx*Math.cos(angle) - cy*Math.sin(angle) - o.size.w/2,
        y: anchor.y + cx*Math.sin(angle) + cy*Math.cos(angle) - o.size.h/2 };
    }
    if (g.mode === "resize" && g.object.type !== "solid") {
      const o = g.object,
        q = Renderer.localPoint(g.original, p),
        left = g.handle.includes("l"),
        top = g.handle.startsWith("t"),
        ow = g.original.size.w,
        oh = g.original.size.h,
        anchorLocal = { x: left ? ow : 0, y: top ? oh : 0 },
        anchor = Renderer.worldPoint(g.original, anchorLocal),
        dx = left ? ow - q.x : q.x,
        dy = top ? oh - q.y : q.y,
        keep =
          o.type === "group" || e.shiftKey || (!e.altKey && S().aspectLocked);
      let w = Math.max(20, dx),
        h = Math.max(20, dy);
      if (keep) {
        const ratio = Math.max(
          20 / Math.min(ow, oh),
          (dx * ow + dy * oh) / (ow * ow + oh * oh),
        );
        w = ow * ratio;
        h = oh * ratio;
      }
      const rot = (o.rotation * Math.PI) / 180,
        ax = left ? w : 0,
        ay = top ? h : 0,
        localCenter = { x: w / 2 - ax, y: h / 2 - ay };
      o.size = { w, h };
      o.position = {
        x:
          anchor.x +
          localCenter.x * Math.cos(rot) -
          localCenter.y * Math.sin(rot) -
          w / 2,
        y:
          anchor.y +
          localCenter.x * Math.sin(rot) +
          localCenter.y * Math.cos(rot) -
          h / 2,
      };
    }
    if (g.mode === "rotate2d") {
      let angle =
        g.original.rotation +
        ((Math.atan2(p.y - g.center.y, p.x - g.center.x) - g.startAngle) *
          180) /
          Math.PI;
      if (e.shiftKey || S().geometrySnap) angle = Math.round(angle / 15) * 15;
      g.object.rotation = angle;
    }
    if (g.mode === "vertex") {
      const q = Renderer.localPoint(g.object, p),
        v = Renderer.unflatPoint(g.object, q);
      setVertex(
        g.object,
        g.vertex,
        e.shiftKey || S().geometrySnap
          ? v.map((x) => Math.round(x * 2) / 2)
          : v,
      );
    }
    if(g.mode==='construction-point')root.GeometryLab?.dragPoint(g.object,g.construction,p);
    if (g.mode === "rotate3d")
      g.object.data.rotation = [
        g.rotation[0] + (e.clientY - g.client.y) * 0.009,
        g.rotation[1] + (e.clientX - g.client.x) * 0.009,
      ];
    if(g.mode==='revolution3d')g.object.data.revolution.rotation=[g.rotation[0]+(e.clientY-g.client.y)*.009,g.rotation[1]+(e.clientX-g.client.x)*.009];
    if (g.mode === "lasso") g.points.push(p);
    if (g.mode === "eraser" && !areaErasers.has(g.eraser)) {
      erase(g.prevErase || g.start, p);
      g.prevErase = p;
      return;
    }
    if (g.mode === "shape" && Math.hypot(e.clientX-g.client.x,e.clientY-g.client.y)>=6)
      g.draft = shapeFrom(g.start, p, e.shiftKey);
    if (isDrawing()) {
      Renderer.requestOverlay();
    } else {
      Renderer.request();
    }
  }
  function setVertex(o, index, point) {
    const d = o.data,
      p = d.points,
      old = p[index],
      kind = d.kind;
    point = point.map((v) => Math.max(-10000, Math.min(10000, v)));
    if(['regular-polygon','pentagon','hexagon'].includes(kind)){
      const center=Geometry.scale(p.reduce((sum,v)=>Geometry.add(sum,v),[0,0]),1/p.length),radius=Geometry.norm(Geometry.sub(point,center)),angle=Math.atan2(point[1]-center[1],point[0]-center[0]);
      if(radius<.01)return;d.points=p.map((_,i)=>[center[0]+radius*Math.cos(angle+(i-index)*2*Math.PI/p.length),center[1]+radius*Math.sin(angle+(i-index)*2*Math.PI/p.length)]);return;
    }
    if (["square", "rectangle"].includes(kind)) {
      const opposite = p[(index + 2) % 4],
        x = point[0],
        y = point[1];
      if (kind === "square") {
        const size = Math.max(
          0.01,
          Math.max(Math.abs(x - opposite[0]), Math.abs(y - opposite[1])),
        );
        point = [
          opposite[0] + Math.sign(x - opposite[0] || 1) * size,
          opposite[1] + Math.sign(y - opposite[1] || 1) * size,
        ];
      }
      p[index] = point;
      const next = (index + 1) % 4,
        prev = (index + 3) % 4;
      if (index % 2 === 0) {
        p[next] = [opposite[0], point[1]];
        p[prev] = [point[0], opposite[1]];
      } else {
        p[next] = [point[0], opposite[1]];
        p[prev] = [opposite[0], point[1]];
      }
      return;
    }
    if (["equilateral", "isosceles", "right"].includes(kind)) {
      p[index] = point;
      const A = p[0],
        B = p[1];
      if (kind === "equilateral") {
        const dx = B[0] - A[0],
          dy = B[1] - A[1];
        if (index === 2) {
          const mid = Geometry.mid(A, B),
            r = Geometry.norm(Geometry.sub(point, mid)) / Math.sqrt(3);
          p[0] = [mid[0] - r, mid[1]];
          p[1] = [mid[0] + r, mid[1]];
          p[2] = [mid[0], mid[1] + r * Math.sqrt(3)];
        } else
          p[2] = [
            (A[0] + B[0]) / 2 - ((B[1] - A[1]) * Math.sqrt(3)) / 2,
            (A[1] + B[1]) / 2 + ((B[0] - A[0]) * Math.sqrt(3)) / 2,
          ];
      }
      if (kind === "isosceles") {
        const mid = Geometry.mid(A, B),
          ab = Geometry.sub(B, A),
          len = Geometry.norm(ab) || 1,
          height = Geometry.norm(Geometry.sub(p[2], mid));
        p[2] = [
          mid[0] - (ab[1] / len) * height,
          mid[1] + (ab[0] / len) * height,
        ];
      }
      if (kind === "right") {
        const ab = Geometry.sub(B, A),
          len = Geometry.norm(ab) || 1,
          h = Geometry.norm(Geometry.sub(p[2], A));
        p[2] = [A[0] - (ab[1] / len) * h, A[1] + (ab[0] / len) * h];
      }
      return;
    }
    if (
      ["parallelogram", "rhombus", "trapezoid", "pentagon", "hexagon"].includes(
        kind,
      )
    ) {
      const delta = Geometry.sub(point, old);
      d.points = p.map((v) => Geometry.add(v, delta));
      return;
    }
    p[index] = point;
  }
  function up(e) {
    if (gesture?.pointerId === e.pointerId && gesture.mode === "pan" &&
        (e.clientX !== gesture.pan.x || e.clientY !== gesture.pan.y)) move(e);
    if (gesture?.pointerId === e.pointerId &&
        ["line-end", "move", "eraser", "shape"].includes(gesture.mode)) {
      const p = Renderer.clientPoint(e);
      if (dist(p, gesture.last) > 0.01) move(e);
    }
    if (gesture?.pointerId === e.pointerId && ["pen", "highlighter", "laser"].includes(gesture.mode)) {
      const raw = Renderer.clientPoint(e), p = gesture.rulerLine ? RulerStudio.project(raw,gesture.rulerLine) : raw, prev = gesture.points.at(-1);
      if (Math.hypot(p.x - prev[0], p.y - prev[1]) > 0.1) {
        gesture.points.push([p.x, p.y, prev[2]]);
        gesture.inkBottom = Math.max(gesture.inkBottom, p.y);
      }
    }
    pointers.delete(e.pointerId);
    if (e.pointerType === "pen") {
      penActive = false;
      lastPenTime = performance.now();
    }
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      gesture = null;
      root.Renderer?.renderOverlay?.();
      root.PageFlow?.settle();
      return;
    }
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const g = gesture;
    gesture = null;
    if (g.brush) root.PDFTiles?.resume();
    if (g.mode === "move" && !g.moved && g.toggleId)
      S().selection = S().selection.filter((id) => id !== g.toggleId);
    if (["pen", "highlighter"].includes(g.mode)) {
      PageFlow.ensureInk(g.inkBottom, g.pageIndex);
      const parts = PageFlow.splitInk(g.points, g.pageIndex);
      g.additions = [];
      for (const part of parts) {
        let o = strokeFrom(part.points, g.brush.style, g.brush.pen);
        if (parts.length === 1 && S().settings.smartShape && g.mode === "pen" && !e.altKey)
          o = recognize(o, part.points, g.brush.pen) || o;
        o.zIndex = part.page.objects.length;
        part.page.objects.push(o);
        g.additions.push({ pageId: part.page.id, object: o });
      }
    }
    if (g.mode === "laser") {
      laser = { points: g.points, brush: g.brush, path: g.path };
      clearTimeout(laserTimer);
      laserTimer = setTimeout(() => {
        laser = null;
        Renderer.request();
      }, 1200);
    }
    if (g.mode === "shape") {
      const obj = g.draft && Math.hypot(e.clientX-g.client.x,e.clientY-g.client.y)>=6 ? g.draft : null;
      if (obj) {
        Store.current().objects.push(obj);
        S().selection = [obj.id];
      }
    }
    if (g.mode === "marquee") {
      const box=rect(g.start,g.last);
      if(box.w+box.h>8/S().viewport.zoom)for(const o of Store.current().objects){if(!layerEditable(o))continue;const b=Renderer.selectionBounds(o),points=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>Renderer.worldPoint(o,p));const xs=points.map(p=>p.x),ys=points.map(p=>p.y);if(Math.max(...xs)>=box.x&&Math.min(...xs)<=box.x+box.w&&Math.max(...ys)>=box.y&&Math.min(...ys)<=box.y+box.h)S().selection.push(o.id);}
      S().selection=[...new Set(S().selection)];
    }
    if (g.mode === "lasso" && g.points.length > 2) {
      const polygon = g.points;
      for (const o of Store.current().objects) {
        if (!layerEditable(o)) continue;
        const candidates = [
          { x: o.size.w / 2, y: o.size.h / 2 },
          { x: 0, y: 0 },
          { x: o.size.w, y: 0 },
          { x: o.size.w, y: o.size.h },
          { x: 0, y: o.size.h },
        ].map((p) => Renderer.worldPoint(o, p));
        if (candidates.some((p) => inside(p, polygon)))
          S().selection.push(o.id);
      }
      S().selection = [...new Set(S().selection)];
    }
    if (g.mode === "eraser" && areaErasers.has(g.eraser) && dist(g.start, g.last) * S().viewport.zoom >= 3)
      g.before = eraseArea(eraserBounds(g), g.eraser === "circle");
    const movedIds =
        g.mode === "move" && g.moved ? g.originals.map((o) => o.id) : [],
      destination = movedIds.length
        ? PageFlow.moveAcross(movedIds, g.pageIndex)
        : null;
    if (g.inkToken) {
      Store.commitInk(g.inkToken, g.additions);
      if (!g.additions.length) Renderer.requestOverlay();
    }
    else if (g.before) Store.commit(g.before);
    else if (g.mode === "eraser") Renderer.requestOverlay();
    else Renderer.request();
    if (destination !== null) PageFlow.selectMoved(destination, movedIds);
    if (g.mode === "pan") {
      const speed = g.pan.speed;
      if ((g.pointerType === "pen" || g.pointerType === "touch") && performance.now() - g.pan.time < 85 && Math.abs(speed) > .23)
        startGlide(speed);
      else PageFlow.settle({ extend: S().viewport.y < g.viewport.y });
    }
    cursor();
    if (
      ["vertex", "construction-point", "rotate3d", "resize", "move"].includes(g.mode) &&
      ["geometry", "solid"].includes(S().panel)
    )
      App.refreshGeometry();
  }
  function stopGlide() {
    if (!glide) return;
    cancelAnimationFrame(glide);
    glide = 0;
    PageFlow.settle();
  }
  function startGlide(speed) {
    const book = Store.book(), viewport = S().viewport, start = performance.now();
    let last = start;
    const step = (now) => {
      glide = 0;
      if (Store.book() !== book || S().viewport !== viewport || gesture) return;
      const dt = Math.max(0, Math.min(32, now - last));
      last = now;
      viewport.y += speed * dt;
      speed *= Math.exp(-dt / 105);
      if (Math.abs(speed) > .12 && now - start < 350) glide = requestAnimationFrame(step);
      else PageFlow.settle({ extend: speed < 0 });
      Renderer.request();
    };
    glide = requestAnimationFrame(step);
  }
  function rollback() {
    const wasInking = !!gesture?.brush;
    if (gesture?.inkToken) Store.cancelInk(gesture.inkToken);
    if (gesture?.before) {
      const saved = Store.restoreSnapshot(gesture.before);
      Store.state.notebooks[Store.state.active] = {
        ...saved,
        assets: Store.book().assets || {},
      };
      Store.invalidateSnapshot();
      root.PageFlow?.invalidateLayout();
    }
    gesture = null;
    if (wasInking) root.PDFTiles?.resume();
    root.Renderer?.renderOverlay?.();
    Renderer.request();
  }
  function cancel(e) {
    if (gesture?.pointerId !== e.pointerId && !pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    pinch = null;
    if (gesture?.pointerId === e.pointerId) rollback();
    else Renderer.requestOverlay();
    penActive = false;
    cursor();
  }
  function strokeFrom(points, style, pen) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const x = points[i][0],
        y = points[i][1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!isFinite(minX)) {
      minX = minY = 0;
      maxX = maxY = 0.1;
    }
    const w = Math.max(0.1, maxX - minX),
      h = Math.max(0.1, maxY - minY);
    const pts = new Array(points.length);
    for (let i = 0; i < points.length; i++) {
      pts[i] = [points[i][0] - minX, points[i][1] - minY, points[i][2] ?? 0.5];
    }
    return Store.object(
      "stroke",
      {
        points: pts,
        pen,
        baseSize: { w, h },
      },
      {
        position: { x: minX, y: minY },
        size: { w, h },
        style: { ...style },
      },
    );
  }
  function rect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.max(0.1, Math.abs(a.x - b.x)),
      h: Math.max(0.1, Math.abs(a.y - b.y)),
    };
  }
  function eraserBounds(g) {
    if (g.eraser === "rectangle") return rect(g.start, g.last);
    const dx = g.last.x - g.start.x, dy = g.last.y - g.start.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return rect(g.start, { x: g.start.x + Math.sign(dx || 1) * side, y: g.start.y + Math.sign(dy || 1) * side });
  }
  function boxRange(a, b, r, pad) {
    let low = 0, high = 1;
    for (const [start, end, min, max] of [
      [a.x, b.x, r.x - pad, r.x + r.w + pad],
      [a.y, b.y, r.y - pad, r.y + r.h + pad],
    ]) {
      const d = end - start;
      if (!d) {
        if (start < min || start > max) return null;
        continue;
      }
      const t0 = (min - start) / d, t1 = (max - start) / d;
      low = Math.max(low, Math.min(t0, t1));
      high = Math.min(high, Math.max(t0, t1));
      if (low > high) return null;
    }
    return [low, high];
  }
  function eraseArea(r, circle) {
    const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const page = Store.current();
    const remaining = page.objects.filter((o) => {
      if (o.type !== "stroke" || !layerEditable(o)) return true;
      const sx = o.size.w / (o.data.baseSize?.w || o.size.w);
      const sy = o.size.h / (o.data.baseSize?.h || o.size.h);
      const pad = o.style.width * Math.max(sx, sy) * (o.data.pen === "marker" ? 1 : 0.5);
      const x = o.position.x + o.size.w / 2, y = o.position.y + o.size.h / 2;
      const reach = Math.hypot(o.size.w, o.size.h) / 2 + pad;
      if (x + reach < r.x || y + reach < r.y || x - reach > r.x + r.w || y - reach > r.y + r.h) return true;
      const clip = strokeClip(o);
      let previous;
      for (const [px, py] of o.data.points) {
        const point = Renderer.worldPoint(o, { x: px * sx, y: py * sy });
        const a = previous || point;
        const range = circle ? circleRange(a, point, center, r.w / 2 + pad) : boxRange(a, point, r, pad);
        if (clipRange(range, a, point, clip)) return false;
        previous = point;
      }
      return true;
    });
    if (remaining.length === page.objects.length) return null;
    const before = Store.snapshot();
    page.objects = remaining;
    return before;
  }
  function setLine(o, a, b, snap, movingEnd = 1) {
    if (snap) {
      const fixed = movingEnd ? a : b, point = movingEnd ? b : a;
      const dx = point.x - fixed.x, dy = point.y - fixed.y;
      const step = Math.PI / 12;
      const angle = Math.round(Math.atan2(dy, dx) / step) * step;
      const length = Math.hypot(dx, dy);
      const snapped = { x: fixed.x + Math.cos(angle) * length, y: fixed.y + Math.sin(angle) * length };
      if (movingEnd) b = snapped;
      else a = snapped;
    }
    const box = rect(a, b);
    o.rotation = 0;
    o.position = { x: box.x, y: box.y };
    o.size = { w: box.w, h: box.h };
    o.data.dirX = b.x < a.x ? -1 : 1;
    o.data.dirY = b.y < a.y ? -1 : 1;
    o.data.flip = o.data.dirX !== o.data.dirY;
  }
  function shapeFrom(a, b, shift) {
    let dx = b.x - a.x,
      dy = b.y - a.y;
    const kind = S().shape || "rectangle";
    const filled = !!S().shapeFilled;
    const isLineLike = [
      "line",
      "arrow",
      "double-arrow",
      "ray",
      "dashed",
      "dotted",
    ].includes(kind);

    if (shift && isLineLike) {
      const angle =
        (Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * Math.PI) / 12;
      const len = Math.hypot(dx, dy);
      b = { x: a.x + Math.cos(angle) * len, y: a.y + Math.sin(angle) * len };
      dx = b.x - a.x;
      dy = b.y - a.y;
    } else if (
      shift ||
      [
        "square",
        "circle",
        "star",
        "pentagon",
        "hexagon",
        "heptagon",
        "octagon",
        "decagon",
      ].includes(kind)
    ) {
      if (!isLineLike && kind !== "curve") {
        const side = Math.max(Math.abs(dx), Math.abs(dy));
        b = {
          x: a.x + Math.sign(dx || 1) * side,
          y: a.y + Math.sign(dy || 1) * side,
        };
        dx = b.x - a.x;
        dy = b.y - a.y;
      }
    }
    const r = rect(a, b);
    return Store.object(
      "shape",
      {
        kind,
        filled,
        dirX: Math.sign(dx || 1),
        dirY: Math.sign(dy || 1),
        flip: (b.x - a.x) * (b.y - a.y) < 0,
      },
      { position: { x: r.x, y: r.y }, size: { w: r.w, h: r.h } },
    );
  }
  function segmentDistance(p, a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function circleRange(a, b, center, radius) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const x = a.x - center.x, y = a.y - center.y;
    const lengthSquared = dx * dx + dy * dy;
    const offset = x * x + y * y - radius * radius;
    if (!lengthSquared) return offset <= 0 ? [0, 1] : null;
    const projection = x * dx + y * dy;
    const discriminant = projection * projection - lengthSquared * offset;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    const low = Math.max(0, (-projection - root) / lengthSquared);
    const high = Math.min(1, (-projection + root) / lengthSquared);
    return low <= high ? [low, high] : null;
  }
  function interpolate(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pressure: a.pressure + (b.pressure - a.pressure) * t };
  }
  function strokeClip(o) {
    return o.clip && { x: o.position.x + o.clip.x, y: o.position.y + o.clip.y, w: o.clip.w, h: o.clip.h };
  }
  function clipRange(range, a, b, clip) {
    if (!range || !clip) return range;
    const visible = boxRange(a, b, clip, 0);
    if (!visible) return null;
    const low = Math.max(visible[0], range[0]), high = Math.min(visible[1], range[1]);
    return low <= high ? [low, high] : null;
  }
  function erase(start, end = start) {
    const radius = Math.max(8, S().width * 3) / S().viewport.zoom;
    const length = dist(start, end), dx = length ? (end.x - start.x) / length : 1;
    const dy = length ? (end.y - start.y) / length : 0;
    const aligned = (p) => {
      const x = p.x - start.x, y = p.y - start.y;
      return {x: x * dx + y * dy, y: y * dx - x * dy};
    };
    const middle = {x: 0, y: -radius, w: length, h: 2 * radius};
    const sweep = rect(start, end);
    const page = Store.current(), result = [];
    let changed = false;
    for (const o of page.objects) {
      if (o.type !== "stroke" || !layerEditable(o) || !o.data.points.length) {
        result.push(o);
        continue;
      }
      const x = o.position.x + o.size.w / 2, y = o.position.y + o.size.h / 2;
      const reach = Math.hypot(o.size.w, o.size.h) / 2 + radius;
      if (x + reach < sweep.x || x - reach > sweep.x + sweep.w ||
          y + reach < sweep.y || y - reach > sweep.y + sweep.h) {
        result.push(o);
        continue;
      }
      const sx = o.size.w / (o.data.baseSize?.w || o.size.w);
      const sy = o.size.h / (o.data.baseSize?.h || o.size.h);
      const clip = strokeClip(o);
      const world = ([x, y, pressure = 0.5]) => ({ ...Renderer.worldPoint(o, { x: x * sx, y: y * sy }), pressure });
      const points = o.data.points;
      const parts = [];
      let part = [], removed = false, a = world(points[0]);
      for (let i = points.length === 1 ? 0 : 1; i < points.length; i++) {
        const b = i ? world(points[i]) : a;
        const ranges = length ? [
          boxRange(aligned(a), aligned(b), middle, 0),
          circleRange(a, b, start, radius),
          circleRange(a, b, end, radius),
        ].filter(Boolean) : [circleRange(a, b, start, radius)].filter(Boolean);
        const range = ranges.length ? clipRange([
          Math.min(...ranges.map((r) => r[0])),
          Math.max(...ranges.map((r) => r[1])),
        ], a, b, clip) : null;
        if (range) {
          removed = true;
          if (gesture.eraser === "stroke") break;
          if (range[0] > 0) {
            if (!part.length) part.push(a);
            part.push(interpolate(a, b, range[0]));
          }
          if (part.length) parts.push(part);
          part = range[1] < 1 ? [interpolate(a, b, range[1]), b] : [];
        } else if (gesture.eraser !== "stroke") {
          if (!part.length) part.push(a);
          if (i) part.push(b);
        }
        a = b;
      }
      if (!removed) {
        result.push(o);
        continue;
      }
      changed = true;
      if (gesture.eraser === "stroke") continue;
      if (part.length) parts.push(part);
      for (const segment of parts) {
        const local = segment.map((p) => {
          const q = Renderer.localPoint(o, p);
          return [q.x / sx, q.y / sy, p.pressure];
        });
        const fragment = strokeFrom(local, o.style, o.data.pen);
        const center = Renderer.worldPoint(o, {
          x: (fragment.position.x + fragment.size.w / 2) * sx,
          y: (fragment.position.y + fragment.size.h / 2) * sy,
        });
        fragment.size = { w: fragment.size.w * sx, h: fragment.size.h * sy };
        fragment.position = { x: center.x - fragment.size.w / 2, y: center.y - fragment.size.h / 2 };
        fragment.rotation = o.rotation;
        fragment.zIndex = o.zIndex;
        fragment.layer = o.layer;
        if (clip) fragment.clip = { ...clip, x: clip.x - fragment.position.x, y: clip.y - fragment.position.y };
        result.push(fragment);
      }
    }
    if (changed) {
      gesture.before ||= Store.snapshot();
      page.objects = result;
      Renderer.request();
    }
  }
  function recognize(o, pts, pen) {
    const result=root.SmartShapes?.detect(pts,S().viewport.zoom);
    if(!result)return null;
    const pattern = ["dashed", "dotted"].includes(pen) ? pen : undefined;
    const kind = result.kind === "line" && pattern ? pattern : result.kind;
    return Store.object("shape",{kind,filled:false,...result.data,...(result.kind !== "line" && pattern ? {pattern} : {})},{position:result.position,size:result.size,rotation:result.rotation||0,style:{...o.style},layer:o.layer});
  }
  function inside(p, poly) {
    let result = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        result = !result;
    }
    return result;
  }
  function wheel(e) {
    e.preventDefault();
    stopGlide();
    S().viewMode = "manual";
    const v = S().viewport;
    if (e.ctrlKey) {
      const r = Renderer.area.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top;
      zoomAt(v.zoom * Math.exp(-e.deltaY * 0.0015), x, y);
    } else {
      v.x -= e.deltaX;
      v.y -= e.deltaY;
      root.PageFlow?.settle({ extend: e.deltaY > 0 });
      Renderer.request();
    }
  }
  function zoomAt(
    z,
    x = Renderer.area.clientWidth / 2,
    y = Renderer.area.clientHeight / 2,
  ) {
    S().viewMode = "manual";
    const v = S().viewport,
      wx = (x - v.x) / v.zoom,
      wy = (y - v.y) / v.zoom;
    v.zoom = Math.max(0.2, Math.min(4, z));
    v.x = x - wx * v.zoom;
    v.y = y - wy * v.zoom;
    root.PageFlow?.settle();
    Renderer.request();
    App.updateZoom();
  }
  function doubleClick(e) {
    // Dots and short pen strokes generate native dblclick events too.
    // Editing is an explicit action in selection mode only.
    if (!S().settings.canvasMenu || S().tool !== "select") { e.preventDefault(); return; }
    if(root.GeometryLab?.renamePlaneAt(Renderer.clientPoint(e)))return;
    if (root.TeacherGeometry?.active) return;
    const o = hit(Renderer.clientPoint(e));
    if (!o) return;
    S().selection = [o.id];
    App.editObject(o);
  }
  function context(e) {
    e.preventDefault();
    if (!S().settings.canvasMenu || gesture || pinch || e.pointerType === "touch") return;
    root.PageFlow?.activateAt(e.clientX, e.clientY);
    const o = hit(Renderer.clientPoint(e));
    if (o) {
      if (!S().selection.includes(o.id)) S().selection = [o.id];
      Store.emit();
    }
    const menu = document.getElementById("canvas-context");
    menu.innerHTML = (
      o
        ? [
            ["edit-selection", "Chỉnh sửa"],
            ["copy", "Sao chép"],
            ["cut", "Cắt"],
            ["delete", "Xóa"],
            ["lock", "Khóa đối tượng"],
            ["front", "Đưa lên trên"],
            ["back", "Đưa xuống dưới"],
            ["add-page", "Thêm trang ngay sau"],
            ["page-delete", "Xóa trang này"],
          ]
        : [
            ["paste", "Dán"],
            ["add-page", "Thêm trang"],
            ["page-delete", "Xóa trang này"],
          ]
    )
      .map(
        ([action, label]) =>
          '<button data-action="' + action + '" data-index="' + S().pageIndex + '">' + label + "</button>",
      )
      .join("");
    menu.hidden = false;
    menu.style.left = Math.min(e.clientX, innerWidth - 200) + "px";
    menu.style.top =
      Math.min(e.clientY, innerHeight - menu.offsetHeight - 35) + "px";
  }
  function penStyle(mode) {
    const highlighter = mode === "highlighter";
    const laser = mode === "laser";
    return {
      pen: laser ? "ballpoint" : highlighter ? "highlighter" : S().pen,
      style: {
        color: laser ? "#ef6559" : highlighter ? S().settings.highlighterColor : S().color,
        width: highlighter ? S().settings.highlighterWidth : S().width,
        opacity: highlighter ? 1 : S().opacity ?? 1,
      },
    };
  }
  function drawActiveStroke(ctx, input, opacity = 1) {
    const { points, brush, path } = input;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = brush.style.color;
    ctx.globalAlpha *= brush.style.opacity * opacity;
    InkBrush.draw(ctx, points, brush.pen, brush.style.width, path);
    ctx.restore();
  }
  function drawOverlay(ctx) {
    const g = gesture;
    ctx.save();
    if (g?.points && ["pen", "highlighter", "laser"].includes(g.mode)) {
      drawActiveStroke(ctx, g);
    }
    if (laser) {
      drawActiveStroke(ctx, laser, 0.6);
    }
    if (g?.mode === "shape" && g.draft) Renderer.drawObject(ctx, g.draft);
    if(g?.mode==='marquee'){const b=rect(g.start,g.last);ctx.fillStyle='#0070c018';ctx.strokeStyle='#0070c0';ctx.lineWidth=1.5/S().viewport.zoom;ctx.setLineDash([6/S().viewport.zoom,4/S().viewport.zoom]);ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);}
    if (g?.mode === "lasso" && g.points) {
      ctx.strokeStyle = "#39967c";
      ctx.fillStyle = "#3394770b";
      ctx.lineWidth = 1 / S().viewport.zoom;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      g.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (g?.mode === "eraser" && areaErasers.has(g.eraser)) {
      const r = eraserBounds(g);
      ctx.fillStyle = "#68746e24";
      ctx.strokeStyle = "#68746e";
      ctx.lineWidth = 1.5 / S().viewport.zoom;
      ctx.beginPath();
      if (g.eraser === "circle")
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, 0, 2 * Math.PI);
      else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  function cursor() {
    if (canvas)
      canvas.style.cursor = ["select", "lasso"].includes(S().tool)
        ? "default"
        : S().tool === "pan"
          ? "grab"
          : "default";
  }
  function isDrawing() {
    return !!(
      gesture &&
      (["pen", "highlighter", "laser", "shape", "lasso", "marquee"].includes(gesture.mode) ||
       (gesture.mode === "eraser" && areaErasers.has(gesture.eraser)))
    );
  }
  root.CanvasEngine = {
    get inking() { return !!gesture?.brush; },
    get activeInk() {
      return !laser && gesture?.brush ? gesture : null;
    },
    get interacting() {
      return !!gesture || !!pinch;
    },
    get penActive() {
      return penActive;
    },
    isDrawing,
    selectionHandles,
    init,
    hit,
    setVertex,
    drawOverlay,
    zoomAt,
    cursor,
    cancelActive() {
      stopGlide();
      if (gesture) cancel({ pointerId: gesture.pointerId });
    },
    finishActive() {
      if (gesture) {
        const r = Renderer.area.getBoundingClientRect(), v = S().viewport, p = gesture.last;
        up({ pointerId: gesture.pointerId, pointerType: gesture.pointerType,
          clientX: gesture.pan?.x ?? r.left + v.x + p.x * v.zoom,
          clientY: gesture.pan?.y ?? r.top + v.y + p.y * v.zoom });
      }
      pointers.clear();
      pinch = null;
      penActive = false;
      stopGlide();
    },
  };
})(window);
