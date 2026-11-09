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
  const pointers = new Map();
  const activePaths = new WeakMap();
  const S = () => Store.state,
    dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function selectionHandles(o) {
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
      const q = Renderer.localPoint(o, p),
        pad = 7 / S().viewport.zoom;
      if (o.type === "stroke") {
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
        q.x >= -pad &&
        q.y >= -pad &&
        q.x <= o.size.w + pad &&
        q.y <= o.size.h + pad
      )
        return o;
    }
    return null;
  }
  function down(e) {
    if (e.button === 2) return;
    document.getElementById("canvas-context").hidden = true;
    App.closePopover();
    if (e.pointerType === "touch" && (penActive || performance.now() - lastPenTime < 450)) return;
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
    const p = Renderer.clientPoint(e);
    let mode = S().tool;
    if (
      space ||
      e.button === 1 ||
      (e.pointerType === "touch" && !S().settings.touchInk)
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
      before: ["pen", "highlighter", "laser", "pan"].includes(mode) ? null : Store.snapshot(),
      inkToken: ["pen", "highlighter"].includes(mode) ? Store.beginInk() : null,
      pageIndex: S().pageIndex,
      client: { x: e.clientX, y: e.clientY },
      viewport: { ...S().viewport },
      moved: false,
    };
    if (mode === "pan") {
      S().viewMode = "manual";
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
      Renderer.requestOverlay();
      return;
    }
    if (mode === "select") {
      const selected = Store.selected();
      for (const o of selected) {
        if (!layerEditable(o)) continue;
        const q = Renderer.localPoint(o, p),
          tolerance = 12 / S().viewport.zoom;
        const handle = selectionHandles(o).find(
          (h) => dist(q, h) < tolerance + 4 / S().viewport.zoom,
        );
        if (handle) {
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
        return q.x >= 0 && q.y >= 0 && q.x <= o.size.w && q.y <= o.size.h;
      });
      const o = explicit || hit(p);
      if (o) {
        const already = S().selection.includes(o.id);
        if (e.shiftKey || S().multiSelect) {
          if (already) gesture.toggleId = o.id;
          else S().selection.push(o.id);
        } else if (!already) S().selection = [o.id];
        if (
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
      if (S().eraser !== "rectangle") erase(p);
      return;
    }
    if (mode === "shape") {
      const layer = Store.current().layers.find((l) => l.id === "geometry");
      if (layer.locked || !layer.visible) {
        gesture = null;
        return App.toast("Lớp Hình học đang khóa hoặc ẩn.");
      }
      gesture.draft = shapeFrom(p, p, e.shiftKey);
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
    if (e.pointerType === "pen") lastPenTime = performance.now();
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
    const p = Renderer.clientPoint(e);
    if (!gesture) root.TeacherGeometry?.hover(p);
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const g = gesture;
    g.last = p;
    g.moved = g.moved || dist(g.start, p) > 2;
    if (g.mode === "pan") {
      S().viewport.x = g.viewport.x + e.clientX - g.client.x;
      S().viewport.y = g.viewport.y + e.clientY - g.client.y;
    }
    if (["pen", "highlighter", "laser"].includes(g.mode)) {
      const coalesced = e.getCoalescedEvents?.(),
        events = coalesced?.length ? coalesced : [e];
      for (const item of events) {
        const raw = Renderer.clientPoint(item),
          q = g.rulerLine ? RulerStudio.project(raw,g.rulerLine) : raw,
          prev = g.points.at(-1);
        if (Math.hypot(q.x - prev[0], q.y - prev[1]) < 0.3) continue;
        const factor = 1 - S().settings.smoothing * 0.35;
        g.points.push([
          prev[0] + (q.x - prev[0]) * factor,
          prev[1] + (q.y - prev[1]) * factor,
          pressure(item),
        ]);
      }
      if (g.mode !== "laser") root.PageFlow?.ensureInk(g.points, g.pageIndex);
    }
    if (g.mode === "move") {
      const dx = p.x - g.start.x,
        dy = p.y - g.start.y;
      g.originals.forEach((a) => {
        const o = Store.current().objects.find((o) => o.id === a.id);
        if (o && layerEditable(o)) o.position = { x: a.x + dx, y: a.y + dy };
      });
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
    if (g.mode === "rotate3d")
      g.object.data.rotation = [
        g.rotation[0] + (e.clientY - g.client.y) * 0.009,
        g.rotation[1] + (e.clientX - g.client.x) * 0.009,
      ];
    if (g.mode === "lasso") g.points.push(p);
    if (g.mode === "eraser" && S().eraser !== "rectangle") {
      const steps = Math.max(1, Math.ceil(dist(g.prevErase || g.start, p) / 6)),
        a = g.prevErase || g.start;
      for (let i = 1; i <= steps; i++)
        erase({
          x: a.x + ((p.x - a.x) * i) / steps,
          y: a.y + ((p.y - a.y) * i) / steps,
        });
      g.prevErase = p;
    }
    if (g.mode === "shape") g.draft = shapeFrom(g.start, p, e.shiftKey);
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
    if (gesture?.pointerId === e.pointerId && ["pen", "highlighter", "laser"].includes(gesture.mode)) {
      const raw = Renderer.clientPoint(e), p = gesture.rulerLine ? RulerStudio.project(raw,gesture.rulerLine) : raw, prev = gesture.points.at(-1);
      if (Math.hypot(p.x - prev[0], p.y - prev[1]) > 0.1)
        gesture.points.push([p.x, p.y, prev[2]]);
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
    root.Renderer?.renderOverlay?.();
    if (g.mode === "move" && !g.moved && g.toggleId)
      S().selection = S().selection.filter((id) => id !== g.toggleId);
    if (["pen", "highlighter"].includes(g.mode)) {
      PageFlow.ensureInk(g.points, g.pageIndex);
      const parts = PageFlow.splitInk(g.points, g.pageIndex);
      g.additions = [];
      for (const part of parts) {
        let o = strokeFrom(part.points, g.mode);
        if (parts.length === 1 && S().settings.smartShape && g.mode === "pen" && !e.altKey)
          o = recognize(o, part.points) || o;
        o.zIndex = part.page.objects.length;
        part.page.objects.push(o);
        g.additions.push({ pageId: part.page.id, object: o });
      }
    }
    if (g.mode === "laser") {
      laser = { points: g.points, time: performance.now() };
      clearTimeout(laserTimer);
      laserTimer = setTimeout(() => {
        laser = null;
        Renderer.request();
      }, 1200);
    }
    if (g.mode === "shape") {
      const obj =
        g.moved && g.draft
          ? g.draft
          : shapeFrom(
              g.start,
              { x: g.start.x + 120, y: g.start.y + 120 },
              false,
            );
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
    if (g.mode === "eraser" && S().eraser === "rectangle") {
      const r = rect(g.start, g.last);
      Store.current().objects = Store.current().objects.filter(
        (o) =>
          !(
            o.type === "stroke" &&
            layerEditable(o) &&
            o.position.x < r.x + r.w &&
            o.position.x + o.size.w > r.x &&
            o.position.y < r.y + r.h &&
            o.position.y + o.size.h > r.y
          ),
      );
    }
    const movedIds =
        g.mode === "move" && g.moved ? g.originals.map((o) => o.id) : [],
      destination = movedIds.length
        ? PageFlow.moveAcross(movedIds, g.pageIndex)
        : null;
    if (g.inkToken) Store.commitInk(g.inkToken, g.additions);
    else if (g.before) Store.commit(g.before);
    else Renderer.request();
    root.Renderer?.invalidateCommittedInk?.();
    if (destination !== null) PageFlow.selectMoved(destination, movedIds);
    if (g.mode === "pan")
      root.PageFlow?.settle({ extend: S().viewport.y < g.viewport.y });
    cursor();
    if (
      ["vertex", "rotate3d", "resize", "move"].includes(g.mode) &&
      ["geometry", "solid"].includes(S().panel)
    )
      App.refreshGeometry();
  }
  function rollback() {
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
    root.Renderer?.renderOverlay?.();
    Renderer.request();
  }
  function cancel(e) {
    if (gesture?.pointerId !== e.pointerId && !pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    pinch = null;
    if (gesture?.pointerId === e.pointerId) rollback();
    penActive = false;
    root.Renderer?.renderOverlay?.();
    cursor();
  }
  function strokeFrom(points, mode = "pen", style = null, pen = null) {
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
        pen: pen || (mode === "highlighter" ? "highlighter" : S().pen),
        baseSize: { w, h },
      },
      {
        position: { x: minX, y: minY },
        size: { w, h },
        style: style || {
          color: S().color,
          width: mode === "highlighter" ? Math.max(15, S().width) : S().width,
          opacity: S().opacity,
        },
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
  function erase(p) {
    const radius = Math.max(8, S().width * 3) / S().viewport.zoom,
      objects = Store.current().objects,
      result = [],
      pad = radius + 2;
    for (const o of objects) {
      if (o.type !== "stroke" || !layerEditable(o)) {
        result.push(o);
        continue;
      }
      if (
        p.x < o.position.x - pad ||
        p.x > o.position.x + o.size.w + pad ||
        p.y < o.position.y - pad ||
        p.y > o.position.y + o.size.h + pad
      ) {
        result.push(o);
        continue;
      }
      const pts = o.data.points.map((a) => {
        const q = Renderer.worldPoint(o, {
          x: (a[0] * o.size.w) / (o.data.baseSize?.w || o.size.w),
          y: (a[1] * o.size.h) / (o.data.baseSize?.h || o.size.h),
        });
        return [q.x, q.y, a[2]];
      });
      let intersects = false;
      for (let j = 0; j < pts.length; j++) {
        const a = { x: pts[j][0], y: pts[j][1] },
          b = j ? { x: pts[j - 1][0], y: pts[j - 1][1] } : a;
        if (segmentDistance(p, a, b) < radius) {
          intersects = true;
          break;
        }
      }
      if (!intersects) {
        result.push(o);
        continue;
      }
      if (S().eraser === "stroke") continue;
      const sampled = [];
      for (let j = 0; j < pts.length; j++) {
        if (j === 0) {
          sampled.push(pts[j]);
          continue;
        }
        const a = pts[j - 1],
          b = pts[j],
          n = Math.min(
            4000,
            Math.max(
              1,
              Math.ceil(
                Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(2, radius / 2),
              ),
            ),
          );
        for (let k = 1; k <= n; k++)
          sampled.push([
            a[0] + ((b[0] - a[0]) * k) / n,
            a[1] + ((b[1] - a[1]) * k) / n,
            b[2],
          ]);
      }
      let part = [];
      const flush = () => {
        if (part.length) {
          const sx = o.size.w / (o.data.baseSize?.w || o.size.w),
            sy = o.size.h / (o.data.baseSize?.h || o.size.h);
          const local = part.map((q) => {
            const v = Renderer.localPoint(o, { x: q[0], y: q[1] });
            return [v.x / sx, v.y / sy, q[2]];
          });
          const neo = strokeFrom(local, "pen", { ...o.style }, o.data.pen),
            center = Renderer.worldPoint(o, {
              x: (neo.position.x + neo.size.w / 2) * sx,
              y: (neo.position.y + neo.size.h / 2) * sy,
            });
          neo.size = { w: neo.size.w * sx, h: neo.size.h * sy };
          neo.position = {
            x: center.x - neo.size.w / 2,
            y: center.y - neo.size.h / 2,
          };
          neo.rotation = o.rotation;
          neo.zIndex = o.zIndex;
          result.push(neo);
          part = [];
        }
      };
      for (const q of sampled) {
        if (Math.hypot(q[0] - p.x, q[1] - p.y) <= radius) flush();
        else part.push(q);
      }
      flush();
    }
    Store.current().objects = result;
    Renderer.request();
  }
  function recognize(o, pts) {
    const result=root.SmartShapes?.detect(pts,S().viewport.zoom);
    if(!result)return null;
    return Store.object("shape",{kind:result.kind,filled:false,...result.data},{position:result.position,size:result.size,rotation:result.rotation||0,style:{...o.style},layer:o.layer});
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
    if (S().tool !== "select") { e.preventDefault(); return; }
    if (root.TeacherGeometry?.active) return;
    const o = hit(Renderer.clientPoint(e));
    if (!o) return;
    S().selection = [o.id];
    App.editObject(o);
  }
  function context(e) {
    e.preventDefault();
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
  function drawActiveStroke(ctx, points, mode, isLaserFade = false) {
    if (!points || !points.length) return;
    const isLaser = mode === "laser" || isLaserFade;
    const penType = isLaser ? "pen" : mode === "highlighter" ? "highlighter" : S().pen;
    const color = isLaser ? "#ef6559" : S().color;
    const width = (mode === "highlighter" ? Math.max(15, S().width) : S().width) * (penType === "marker" ? 2 : 1);
    let alpha = (penType === "highlighter" ? 0.28 : penType === "pencil" ? 0.7 : 1) * (S().opacity ?? 1);
    if (isLaserFade) alpha *= 0.6;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if(root.InkBrush?.draw(ctx,points,penType,width)){ctx.restore();return;}

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0][0], points[0][1], width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (penType !== "fountain") {
      ctx.lineWidth = width;
      let cached = activePaths.get(points);
      if (!cached) {
        const path = new Path2D();
        path.moveTo(points[0][0], points[0][1]);
        cached = { path, next: 1, started: false };
        activePaths.set(points, cached);
      }
      if (points.length > 2 && !cached.started) {
        cached.path.lineTo((points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2);
        cached.started = true;
      }
      for (; cached.next < points.length - 1; cached.next++) {
        const a = points[cached.next], b = points[cached.next + 1];
        cached.path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
      const preview = new Path2D(cached.path), end = points.at(-1);
      preview.lineTo(end[0], end[1]);
      ctx.stroke(preview);
    } else {
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1], cur = points[i];
        ctx.lineWidth = width * (0.25 + 1.5 * (cur[2] || 0.5));
        ctx.beginPath();
        if (i === 1) ctx.moveTo(prev[0], prev[1]);
        else ctx.moveTo((points[i - 2][0] + prev[0]) / 2, (points[i - 2][1] + prev[1]) / 2);
        ctx.quadraticCurveTo(prev[0], prev[1], (cur[0] + prev[0]) / 2, (cur[1] + prev[1]) / 2);
        if (i === points.length - 1) ctx.lineTo(cur[0], cur[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawOverlay(ctx) {
    const g = gesture;
    ctx.save();
    if (g?.points && ["pen", "highlighter", "laser"].includes(g.mode)) {
      drawActiveStroke(ctx, g.points, g.mode);
    }
    if (laser) {
      drawActiveStroke(ctx, laser.points, "laser", true);
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
    if (g?.mode === "eraser" && S().eraser === "rectangle") {
      const r = rect(g.start, g.last);
      ctx.fillStyle = "#c8635315";
      ctx.strokeStyle = "#c86353";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
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
      ["pen", "highlighter", "laser", "shape", "lasso"].includes(gesture.mode)
    );
  }
  root.CanvasEngine = {
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
      if (gesture) cancel({ pointerId: gesture.pointerId });
    },
    finishActive() {
      if (gesture) {
        const r = Renderer.area.getBoundingClientRect(), v = S().viewport, p = gesture.last;
        up({ pointerId: gesture.pointerId, pointerType: gesture.pointerType,
          clientX: r.left + v.x + p.x * v.zoom, clientY: r.top + v.y + p.y * v.zoom });
      }
      pointers.clear();
      pinch = null;
      penActive = false;
    },
  };
})(window);
