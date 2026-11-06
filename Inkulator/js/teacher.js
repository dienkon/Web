(function (root) {
  "use strict";
  const titles = {
    segment: "Nối điểm",
    midpoint: "Trung điểm",
    measure: "Đo cạnh",
    perpendicular: "Vuông góc",
    parallel: "Song song",
    angle: "Đo góc",
    circumcircle: "Tròn qua 3 điểm",
    section: "Thiết diện",
    orbit: "Xoay 3D",
    intersection: "Giao điểm",
    centroid: "Trọng tâm",
    median: "Trung tuyến",
    bisector: "Phân giác",
    rightAngle: "Góc vuông ∟",
    equalTick: "Bằng nhau =",
    parallelArrow: "Song song //",
    altitude: "Đường cao AH",
    orthocenter: "Trực tâm H",
    incenter: "Tâm nội tiếp I",
    highlightPlane: "Tô mặt phẳng",
  };
  let interaction = null,
    hovered = null;
  function target() {
    return (
      Store.current().objects.find((o) => o.id === interaction?.objectId) ||
      Store.selected().find((o) => ["geometry", "solid"].includes(o.type))
    );
  }
  function project(o, coords) {
    if (o.type === "geometry")
      return coords.map((p) => Renderer.flatPoint(o, p));
    const model = Geometry.mesh(o.data.kind, o.data.params);
    return Geometry.project(
      coords,
      o.data.rotation,
      o.size.w,
      o.size.h,
      model.vertices,
      o.data.projection,
    ).points;
  }
  function points(o) {
    const result = Constructions.build(o),
      all = [...result.points.values()].filter(
        (p) => !p.aliasOf && !p.internal,
      ),
      screen = project(
        o,
        all.map((p) => p.coords),
      );
    return all.map((p, i) => ({
      ...p,
      local: screen[i],
      world: Renderer.worldPoint(o, { x: screen[i][0], y: screen[i][1] }),
    }));
  }
  function nearest(o, p) {
    const threshold = 18 / Store.state.viewport.zoom;
    let best = null;
    for (const point of points(o)) {
      const distance = Math.hypot(point.world.x - p.x, point.world.y - p.y);
      if (distance < threshold && (!best || distance < best.distance))
        best = { ...point, distance };
    }
    return best;
  }
  function lines(o) {
    const r = Constructions.build(o),
      found = [],
      seen = new Set();
    const add = (refs, label) => {
      const a = r.points.get(refs[0]),
        b = r.points.get(refs[1]);
      if (!a || !b || Geometry.norm(Geometry.sub(a.coords, b.coords)) < 1e-8)
        return;
      const key = refs.slice().sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      const local = project(o, [a.coords, b.coords]);
      found.push({
        key,
        refs,
        label: label || a.label + b.label,
        local,
        world: local.map((p) => Renderer.worldPoint(o, { x: p[0], y: p[1] })),
      });
    };
    const n =
      o.type === "solid" ? r.model.vertices.length : o.data.points.length;
    const edges =
      o.type === "solid"
        ? r.model.edges
        : ["circle", "incircle", "circumcircle"].includes(o.data.kind) &&
            n !== 3
          ? []
          : Array.from({ length: n }, (_, i) => [i, (i + 1) % n]);
    edges.forEach(([a, b]) => add(["v:" + a, "v:" + b]));
    (o.data.aux || []).forEach((a) => {
      if (a.type === "segment") add(["v:" + a.a, "v:" + a.b]);
    });
    if (r.points.has("base:M")) add(["v:0", "base:M"]);
    if (r.points.has("base:H")) add(["v:0", "base:H"]);
    if (r.points.has("base:G"))
      for (let i = 0; i < 3; i++) add(["v:" + i, "base:G"]);
    for (const item of r.items) {
      if (["segment", "measure"].includes(item.type)) add(item.refs);
      if (item.endpointRefs)
        add(
          item.endpointRefs,
          item.type === "parallel"
            ? "Song song qua " + r.points.get(item.refs[2]).label
            : undefined,
        );
      if (item.type === "centroid" && item.showMedians !== false)
        item.refs.forEach((ref, i) =>
          add(
            [ref, "c:" + item.id + ":M" + i],
            r.points.get(ref).label + " · trung tuyến",
          ),
        );
      if (item.type === "section")
        item.points.forEach((_, i) =>
          add([
            "c:" + item.id + ":" + i,
            "c:" + item.id + ":" + ((i + 1) % item.points.length),
          ]),
        );
    }
    return found;
  }
  function nearestLine(o, p) {
    let best = null;
    for (const line of lines(o)) {
      const [a, b] = line.world,
        dx = b.x - a.x,
        dy = b.y - a.y,
        n = dx * dx + dy * dy;
      const t = n
        ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n))
        : 0;
      const distance = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
      if (
        distance < 16 / Store.state.viewport.zoom &&
        (!best || distance < best.distance)
      )
        best = { ...line, distance };
    }
    return best;
  }
  function status() {
    if (!interaction) return "Chọn công cụ rồi nhấp các điểm trên hình.";
    if (interaction.mode === "orbit")
      return "Kéo hình để chỉnh góc nhìn. Thả chuột để giữ hình tĩnh.";
    if (interaction.mode === "intersection" && interaction.linePicks?.length)
      return (
        "Đã chọn " + interaction.linePicks[0].label + " · chạm đường thứ hai"
      );
    if (interaction.mode === "intersection" && !interaction.picked.length)
      return "Chạm 2 đường để lấy giao điểm · hoặc chọn lần lượt A, B, C, D";
    const o = target(),
      all = o ? Constructions.build(o).points : new Map(),
      picked = interaction.picked.map((k) => all.get(k)?.label || "?");
    const n = Constructions.operations[interaction.mode];
    return (
      titles[interaction.mode] +
      " · " +
      (picked.length ? picked.join(" → ") + " → " : "") +
      "chọn " +
      (n - picked.length) +
      " điểm" +
      (["parallel", "perpendicular"].includes(interaction.mode)
        ? " (2 điểm của đường, rồi điểm đi qua)"
        : "") +
      (["angle", "bisector", "rightAngle"].includes(interaction.mode)
        ? " (đỉnh góc ở điểm thứ hai)"
        : interaction.mode === "altitude"
          ? " (đỉnh A chọn trước, rồi 2 điểm đáy B, C)"
          : interaction.mode === "median"
            ? " (đỉnh xuất phát chọn trước)"
            : ["equalTick", "parallelArrow"].includes(interaction.mode)
              ? " (chọn 2 điểm của đoạn thẳng)"
              : "")
    );
  }
  function setMode(mode, o = target()) {
    o = Store.current().objects.find((item) => item.id === o?.id);
    if (!o || o.locked) return App.toast("Chọn một hình học chưa khóa.");
    if (mode === "orbit" && o.data.projection === "oblique")
      Store.transaction(() => {
        o.data.projection = "orthographic";
      });
    if (o.type === "solid" && mode === "circumcircle") return;
    if (o.type === "geometry" && ["section", "orbit"].includes(mode)) return;
    if (
      o.type === "solid" &&
      Geometry.mesh(o.data.kind, o.data.params).vertices.length > 20 &&
      mode !== "orbit"
    )
      return App.toast("Thao tác chọn đỉnh hiện hỗ trợ các khối đa diện.");
    App.setTool("select");
    Store.state.selection = [o.id];
    interaction =
      interaction?.mode === mode && interaction.objectId === o.id
        ? null
        : {
            mode,
            objectId: o.id,
            picked: [],
            lineMode: interaction?.lineMode || "auto",
          };
    Store.state.transformMode = mode === "orbit" ? "orbit" : "auto";
    Store.state.geometryInteraction = interaction;
    hovered = null;
    renderToolbar();
    Renderer.request();
  }
  function cancel() {
    interaction = null;
    hovered = null;
    Store.state.geometryInteraction = null;
    renderToolbar();
    Renderer.request();
  }
  function pick(key) {
    const o = target();
    if (!o || !interaction || interaction.mode === "orbit") return;
    if (interaction.picked.includes(key) && interaction.mode !== "intersection")
      return App.toast("Chọn các điểm khác nhau.");
    interaction.picked.push(key);
    completePicked();
  }
  function pickLine(key) {
    const o = target();
    if (!o || interaction?.mode !== "intersection") return;
    const line = lines(o).find((l) => l.key === key);
    if (!line) return;
    interaction.linePicks = interaction.linePicks || [];
    if (interaction.linePicks.some((l) => l.key === key))
      return App.toast("Chọn một đường khác.");
    if (!interaction.linePicks.length) interaction.picked = [];
    interaction.linePicks.push(line);
    interaction.picked.push(...line.refs);
    completePicked();
  }
  function completePicked() {
    const o = target();
    if (!o || !interaction) return;
    if (
      interaction.picked.length === Constructions.operations[interaction.mode]
    ) {
      const c = {
        id: Store.uid(),
        type: interaction.mode,
        refs: [...interaction.picked],
        lineMode: interaction.lineMode || "auto",
        dashed: interaction.lineMode === "dashed",
        showMeasure: interaction.mode === "measure",
        ...(interaction.mode === "centroid" ? { showMedians: true } : {}),
      };
      const labels = new Set(
        [...Constructions.build(o).points.values()].map((p) => p.label),
      );
      if (
        [
          "midpoint",
          "perpendicular",
          "circumcircle",
          "intersection",
          "centroid",
          "median",
          "bisector",
          "altitude",
          "orthocenter",
          "incenter",
        ].includes(c.type)
      ) {
        const candidates =
          c.type === "centroid"
            ? ["G", "G₁", "G₂"]
            : c.type === "intersection"
              ? ["I", "J", "K", "T"]
              : c.type === "bisector"
                ? ["D", "E", "F", "T"]
                : ["perpendicular", "altitude", "orthocenter"].includes(c.type)
                  ? ["H", "K", "L", "T"]
                  : c.type === "circumcircle" || c.type === "incenter"
                    ? ["O", "I", "J"]
                    : ["M", "N", "P", "Q", "R"];
        c.label =
          candidates.find((s) => !labels.has(s)) ||
          "M" + (o.data.constructions?.length || 0);
      }
      if (c.type === "section") c.label = "P";
      const temporary = Store.clone(o);
      temporary.data.constructions = [
        ...(temporary.data.constructions || []),
        c,
      ];
      const result = Constructions.build(temporary),
        warning = result.warnings.find((w) => w.id === c.id);
      interaction.picked = [];
      interaction.linePicks = [];
      if (warning) {
        App.toast(warning.message, 5000);
        renderToolbar();
        return;
      }
      const duplicate = (o.data.constructions || []).find(
        (d) => d.type === c.type && d.refs.join("|") === c.refs.join("|"),
      );
      if (!duplicate)
        Store.transaction(() => {
          o.data.constructions = o.data.constructions || [];
          o.data.constructions.push(c);
        });
      const item = result.items.find((i) => i.id === c.id);
      App.toast(
        c.type === "section"
          ? "Thiết diện " +
              item.points.length +
              " đỉnh · S ≈ " +
              MathEngine.format(item.area) +
              " đv²"
          : c.type === "angle"
            ? "Góc ≈ " + MathEngine.format(item.angle) + "°"
            : "Đã dựng " +
              titles[c.type].toLocaleLowerCase() +
              ". Các điểm phụ sẽ tự cập nhật.",
      );
      if (["geometry", "solid"].includes(Store.state.panel))
        App.refreshGeometry();
    }
    renderToolbar();
    Renderer.request();
  }
  function handleDown(e, p) {
    if (!interaction || interaction.mode === "orbit" || e.button !== 0)
      return false;
    const o = target();
    if (!o) {
      cancel();
      return false;
    }
    if (interaction.mode === "intersection") {
      const line = nearestLine(o, p);
      if (line) {
        pickLine(line.key);
        return true;
      }
    }
    const hit = nearest(o, p);
    if (hit) pick(hit.key);
    else
      App.toast(
        interaction.mode === "intersection"
          ? "Chạm gần đường trên hình, hoặc chọn đường từ danh sách."
          : "Nhấp gần đỉnh hoặc điểm phụ; con trỏ sẽ tự bắt điểm.",
      );
    return true;
  }
  function hover(p) {
    const o = target();
    if (!o || !interaction || interaction.mode === "orbit") {
      if (hovered) {
        hovered = null;
        Renderer.request();
      }
      return;
    }
    const next =
      interaction.mode === "intersection" ? nearestLine(o, p) : nearest(o, p);
    if (next?.key !== hovered?.key) {
      hovered = next;
      Renderer.request();
    }
  }
  function drawLabel(
    ctx,
    text,
    q,
    center,
    occupied = [],
    others = [],
    edges = [],
  ) {
    ctx.save();
    ctx.font = "italic 18px Georgia";
    ctx.textBaseline = "alphabetic";
    const width = ctx.measureText?.(text)?.width || text.length * 10,
      height = 20,
      dx = q[0] - center[0],
      dy = q[1] - center[1],
      sx = dx >= 0 ? 1 : -1,
      sy = dy >= 0 ? 1 : -1;
    const candidates = [
      [sx * 9, sy > 0 ? 24 : -10],
      [-sx * (width + 8), sy > 0 ? 24 : -10],
      [sx * 12, 5],
      [-width / 2, sy > 0 ? 27 : -13],
      [-sx * (width + 8), 5],
      [sx * 12, -15],
    ];
    let choice = null;
    for (const [ox, oy] of candidates) {
      const box = { x: q[0] + ox, y: q[1] + oy - height, w: width, h: height },
        overlap = occupied.filter(
          (b) =>
            box.x < b.x + b.w &&
            box.x + box.w > b.x &&
            box.y < b.y + b.h &&
            box.y + box.h > b.y,
        ).length,
        cover = others.filter(
          (p) =>
            p !== q &&
            p[0] > box.x - 3 &&
            p[0] < box.x + box.w + 3 &&
            p[1] > box.y - 3 &&
            p[1] < box.y + box.h + 3,
        ).length,
        crossings = edges.filter(({ a, b }) => {
          let low = 0,
            high = 1;
          for (let axis = 0; axis < 2; axis++) {
            const min = (axis ? box.y : box.x) - 2,
              max = min + (axis ? box.h : box.w) + 4,
              delta = b[axis] - a[axis];
            if (Math.abs(delta) < 1e-9) {
              if (a[axis] < min || a[axis] > max) return false;
            } else {
              const t0 = (min - a[axis]) / delta,
                t1 = (max - a[axis]) / delta;
              low = Math.max(low, Math.min(t0, t1));
              high = Math.min(high, Math.max(t0, t1));
              if (high < low) return false;
            }
          }
          return true;
        }).length,
        score = overlap * 100 + cover * 80 + crossings * 25;
      if (!choice || score < choice.score) choice = { box, ox, oy, score };
    }
    occupied.push(choice.box);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.strokeText?.(text, q[0] + choice.ox, q[1] + choice.oy);
    ctx.fillText(text, q[0] + choice.ox, q[1] + choice.oy);
    ctx.restore();
  }
  function draw(ctx, o) {
    if (o.type === "solid" && !o.data.constructions?.length) return;
    const result = Constructions.build(o),
      all = [...result.points.values()],
      locations = project(
        o,
        all.map((p) => p.coords),
      ),
      map = new Map(all.map((p, i) => [p.key, locations[i]])),
      center = [o.size.w / 2, o.size.h / 2],
      occupied = [];
    const line = (a, b, dashed = false) => {
      ctx.setLineDash(dashed ? [8, 5] : []);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const spatial = o.type === "solid" ? SolidView.forObject(o) : null;
    const modelLine = (A, B, item, width = Math.max(2, o.style.width)) => {
      const mode = item.lineMode || (item.dashed ? "dashed" : "auto");
      if (spatial)
        SolidView.trace(ctx, spatial.segments(A, B), {
          width,
          hiddenEdges: o.data.hiddenEdges !== false,
          mode,
        });
      else line(...project(o, [A, B]), mode === "dashed");
    };
    ctx.save();
    ctx.strokeStyle = o.style.color;
    ctx.fillStyle = o.style.color;
    ctx.lineWidth = Math.max(2, o.style.width);
    ctx.globalAlpha = o.style.opacity ?? 1;
    const maxStep =
      typeof o.data.currentStep === "number" ? o.data.currentStep : Infinity;
    for (const [idx, item] of result.items.entries()) {
      if (idx >= maxStep) break;
      const q = item.refs.map((k) => map.get(k));
      if (["segment", "measure"].includes(item.type)) {
        modelLine(...item.coords, item);
        if (item.showMeasure || item.type === "measure") {
          const m = [(q[0][0] + q[1][0]) / 2, (q[0][1] + q[1][1]) / 2];
          drawLabel(
            ctx,
            Number(item.length.toFixed(3)).toString(),
            m,
            center,
            occupied,
            locations,
          );
        }
      }
      if (item.type === "rightAngle") {
        const [a, b, c] = q;
        if (a && b && c) {
          const d1 = [a[0] - b[0], a[1] - b[1]],
            d2 = [c[0] - b[0], c[1] - b[1]],
            n1 = Math.hypot(...d1),
            n2 = Math.hypot(...d2);
          if (n1 > 0 && n2 > 0) {
            const sz = Math.min(14, n1 * 0.35, n2 * 0.35),
              u = [d1[0] * (sz / n1), d1[1] * (sz / n1)],
              v = [d2[0] * (sz / n2), d2[1] * (sz / n2)];
            ctx.save();
            ctx.lineWidth = Math.max(1.8, o.style.width * 0.85);
            ctx.beginPath();
            ctx.moveTo(b[0] + u[0], b[1] + u[1]);
            ctx.lineTo(b[0] + u[0] + v[0], b[1] + u[1] + v[1]);
            ctx.lineTo(b[0] + v[0], b[1] + v[1]);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(
              b[0] + (u[0] + v[0]) * 0.45,
              b[1] + (u[1] + v[1]) * 0.45,
              1.6,
              0,
              Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
          }
        }
      }
      if (item.type === "equalTick") {
        const [a, b] = q;
        if (a && b) {
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            len = Math.hypot(dx, dy);
          if (len > 0) {
            const ux = dx / len,
              uy = dy / len,
              px = -uy,
              py = ux,
              tickLen = 6,
              cnt = item.tickCount || 1;
            ctx.save();
            ctx.lineWidth = Math.max(1.8, o.style.width * 0.9);
            if (cnt === 1) {
              ctx.beginPath();
              ctx.moveTo(mid[0] - px * tickLen, mid[1] - py * tickLen);
              ctx.lineTo(mid[0] + px * tickLen, mid[1] + py * tickLen);
              ctx.stroke();
            } else if (cnt === 2) {
              for (const off of [-2.5, 2.5]) {
                const mx = mid[0] + ux * off,
                  my = mid[1] + uy * off;
                ctx.beginPath();
                ctx.moveTo(mx - px * tickLen, my - py * tickLen);
                ctx.lineTo(mx + px * tickLen, my + py * tickLen);
                ctx.stroke();
              }
            } else {
              const sz = 4.5;
              ctx.beginPath();
              ctx.moveTo(mid[0] - px * sz - ux * sz, mid[1] - py * sz - uy * sz);
              ctx.lineTo(mid[0] + px * sz + ux * sz, mid[1] + py * sz + uy * sz);
              ctx.moveTo(mid[0] - px * sz + ux * sz, mid[1] - py * sz + uy * sz);
              ctx.lineTo(mid[0] + px * sz - ux * sz, mid[1] + py * sz - uy * sz);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
      if (item.type === "parallelArrow") {
        const [a, b] = q;
        if (a && b) {
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            len = Math.hypot(dx, dy);
          if (len > 0) {
            const ux = dx / len,
              uy = dy / len,
              px = -uy,
              py = ux,
              arrowSz = 6.5;
            ctx.save();
            ctx.lineWidth = Math.max(1.8, o.style.width * 0.85);
            ctx.beginPath();
            ctx.moveTo(
              mid[0] - ux * arrowSz + px * arrowSz,
              mid[1] - uy * arrowSz + py * arrowSz,
            );
            ctx.lineTo(mid[0] + ux * arrowSz, mid[1] + uy * arrowSz);
            ctx.lineTo(
              mid[0] - ux * arrowSz - px * arrowSz,
              mid[1] - uy * arrowSz - py * arrowSz,
            );
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      if (item.type === "altitude") {
        modelLine(...item.endpoints, item);
        const pp = project(o, item.endpoints);
        const foot = pp[1],
          apex = pp[0],
          baseP = map.get(item.refs[1]),
          baseQ = map.get(item.refs[2]);
        if (foot && baseP && baseQ) {
          const ab = [baseQ[0] - baseP[0], baseQ[1] - baseP[1]],
            side = [apex[0] - foot[0], apex[1] - foot[1]],
            na = Math.hypot(...ab),
            ns = Math.hypot(...side);
          if (na > 0 && ns > 0) {
            const u = [ab[0] * (10 / na), ab[1] * (10 / na)],
              v = [side[0] * (10 / ns), side[1] * (10 / ns)];
            ctx.save();
            ctx.lineWidth = Math.max(1.5, o.style.width * 0.75);
            ctx.beginPath();
            ctx.moveTo(foot[0] + u[0], foot[1] + u[1]);
            ctx.lineTo(foot[0] + u[0] + v[0], foot[1] + u[1] + v[1]);
            ctx.lineTo(foot[0] + v[0], foot[1] + v[1]);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      if (item.type === "orthocenter") {
        ctx.save();
        ctx.lineWidth = Math.max(1.6, o.style.width * 0.7);
        item.altitudes.forEach((pair) =>
          modelLine(...pair, item, ctx.lineWidth),
        );
        ctx.restore();
      }
      if (item.type === "incenter") {
        const [c, rp] = project(o, [
          item.center,
          [item.center[0] + item.radius, item.center[1]],
        ]);
        ctx.setLineDash(item.dashed ? [8, 5] : []);
        ctx.beginPath();
        ctx.arc(...c, Math.hypot(rp[0] - c[0], rp[1] - c[1]), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (item.type === "highlightPlane") {
        const pp = project(o, item.points);
        ctx.save();
        ctx.fillStyle = item.color || "#e8b84b35";
        ctx.beginPath();
        pp.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#b67a2f";
        ctx.lineWidth = Math.max(1.5, o.style.width * 0.75);
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.restore();
      }
      if (["median", "bisector"].includes(item.type))
        modelLine(...item.endpoints, item);
      if (item.type === "centroid" && item.showMedians !== false) {
        ctx.save();
        ctx.lineWidth = Math.max(1.7, o.style.width * 0.7);
        item.medians.forEach((pair) => modelLine(...pair, item, ctx.lineWidth));
        ctx.restore();
      }
      if (["parallel", "perpendicular"].includes(item.type)) {
        const pp = project(o, item.endpoints);
        modelLine(...item.endpoints, item);
        if (item.type === "perpendicular" && o.type === "geometry") {
          const foot = pp[1],
            ab = Geometry.sub(q[1], q[0]),
            side = Geometry.sub(pp[0], foot),
            na = Geometry.norm(ab),
            ns = Geometry.norm(side);
          if (na > 0 && ns > 0) {
            const u = Geometry.scale(ab, 10 / na),
              v = Geometry.scale(side, 10 / ns);
            ctx.beginPath();
            ctx.moveTo(foot[0] + u[0], foot[1] + u[1]);
            ctx.lineTo(foot[0] + u[0] + v[0], foot[1] + u[1] + v[1]);
            ctx.lineTo(foot[0] + v[0], foot[1] + v[1]);
            ctx.stroke();
          }
        }
      }
      if (item.type === "angle") {
        const [a, b, c] = q,
          aa = Math.atan2(a[1] - b[1], a[0] - b[0]),
          cc = Math.atan2(c[1] - b[1], c[0] - b[0]),
          radius = Math.min(
            32,
            Geometry.norm(Geometry.sub(a, b)) * 0.28,
            Geometry.norm(Geometry.sub(c, b)) * 0.28,
          );
        let delta = ((cc - aa + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const t = aa + (delta * i) / 30,
            x = b[0] + radius * Math.cos(t),
            y = b[1] + radius * Math.sin(t);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        drawLabel(
          ctx,
          Number(item.angle.toFixed(1)) + "°",
          [
            b[0] + (radius + 14) * Math.cos(aa + delta / 2),
            b[1] + (radius + 14) * Math.sin(aa + delta / 2),
          ],
          center,
          occupied,
          locations,
        );
      }
      if (item.type === "circumcircle") {
        const [c, rp] = project(o, [
          item.center,
          [item.center[0] + item.radius, item.center[1]],
        ]);
        ctx.setLineDash(item.dashed ? [8, 5] : []);
        ctx.beginPath();
        ctx.arc(...c, Math.hypot(rp[0] - c[0], rp[1] - c[1]), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (item.type === "section") {
        const pp = project(o, item.points);
        ctx.save();
        ctx.lineWidth = Math.max(3, o.style.width + 1);
        ctx.beginPath();
        pp.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
        ctx.closePath();
        if (o.data.sectionFill) {
          ctx.fillStyle = "#d4a35c30";
          ctx.fill();
        }
        if (spatial) {
          const edges = [];
          for (let i = 0; i < item.points.length; i++)
            edges.push(
              ...spatial.segments(
                item.points[i],
                item.points[(i + 1) % item.points.length],
              ),
            );
          SolidView.trace(ctx, edges, {
            width: Math.max(3, o.style.width + 1),
            hiddenEdges: o.data.hiddenEdges !== false,
            mode: item.lineMode || "auto",
          });
        } else ctx.stroke();
        ctx.restore();
      }
    }
    all.forEach((p, i) => {
      if (
        p.aliasOf ||
        p.internal ||
        !p.derived ||
        p.key.startsWith("legacy:") ||
        p.key === "base:M"
      )
        return;
      const q = locations[i];
      ctx.beginPath();
      ctx.arc(...q, 3.1, 0, Math.PI * 2);
      ctx.fill();
      if (o.data.labels !== false)
        drawLabel(ctx, p.label, q, center, occupied, locations);
    });
    ctx.restore();
  }
  function drawOverlay(ctx) {
    const o = target();
    if (!o || !interaction) return;
    const pts = points(o),
      zoom = Store.state.viewport.zoom;
    ctx.save();
    if (interaction.mode === "intersection") {
      const selected = new Set((interaction.linePicks || []).map((l) => l.key));
      for (const line of lines(o))
        if (selected.has(line.key) || hovered?.key === line.key) {
          ctx.strokeStyle = selected.has(line.key) ? "#b67a2f" : "#187d68";
          ctx.lineWidth = 5 / zoom;
          ctx.globalAlpha = 0.55;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(line.world[0].x, line.world[0].y);
          ctx.lineTo(line.world[1].x, line.world[1].y);
          ctx.stroke();
        }
      ctx.globalAlpha = 1;
    }
    for (const p of pts) {
      const selected = interaction.picked.includes(p.key),
        hover = hovered?.key === p.key;
      ctx.strokeStyle = selected ? "#b67a2f" : "#187d68";
      ctx.fillStyle = selected ? "#fff0cf" : "#ffffff";
      ctx.lineWidth = (hover ? 2 : 1.2) / zoom;
      ctx.beginPath();
      ctx.arc(
        p.world.x,
        p.world.y,
        (hover ? 9 : selected ? 7 : 4.5) / zoom,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
      if (hover) {
        ctx.font = 12 / zoom + "px Segoe UI";
        ctx.fillStyle = "#187d68";
        ctx.fillText(
          p.label +
            " (" +
            p.coords.map((v) => Number(v.toFixed(2))).join("; ") +
            ")",
          p.world.x + 14 / zoom,
          p.world.y - 12 / zoom,
        );
      }
    }
    if (interaction.picked.length === 1 && hovered) {
      const a = pts.find((p) => p.key === interaction.picked[0]);
      if (a) {
        ctx.strokeStyle = "#187d68";
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.moveTo(a.world.x, a.world.y);
        ctx.lineTo(hovered.world.x, hovered.world.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function renderToolbar() {
    const bar = document.getElementById("geometry-toolbar");
    if (!bar) return;
    const o = target();
    if (
      !o ||
      o.locked ||
      !["geometry", "solid"].includes(o.type) ||
      !Store.state.selection.includes(o.id)
    ) {
      bar.hidden = true;
      interaction = null;
      hovered = null;
      Store.state.geometryInteraction = null;
      return;
    }
    bar.hidden = false;
    const solid = o.type === "solid",
      available =
        solid &&
        ["sphere", "cylinder", "cone", "cone-frustum"].includes(o.data.kind)
          ? ["orbit"]
          : [
              "segment",
              "midpoint",
              "altitude",
              "rightAngle",
              "equalTick",
              "parallelArrow",
              "perpendicular",
              "parallel",
              "angle",
              "measure",
              "intersection",
              "centroid",
              "orthocenter",
              "median",
              "bisector",
              "highlightPlane",
              ...(solid ? ["section", "orbit"] : ["incenter", "circumcircle"]),
            ],
      keys =
        available.length === 1
          ? available
          : ["segment", "midpoint", ...(solid ? ["orbit"] : ["centroid"])],
      extras = available.filter((k) => !keys.includes(k));
    const totalSteps = (o.data.constructions || []).length;
    const curStep =
      typeof o.data.currentStep === "number" ? o.data.currentStep : totalSteps;
    const stepper =
      totalSteps > 0
        ? '<div class="geometry-stepper" style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;padding-left:8px;border-left:1px solid #c2d2c8;">' +
          '<span style="font-size:11px;color:#2f5344;font-weight:600">BƯỚC GIẢNG:</span>' +
          '<span id="geo-step-prev" role="button" tabindex="0" class="stepper-btn" style="cursor:pointer;padding:2px 6px;border-radius:4px;background:#e2ece6" title="Bước giảng trước">⏮</span>' +
          '<span style="font-size:12px;font-weight:600;min-width:38px;text-align:center">' +
          Math.min(curStep, totalSteps) +
          "/" +
          totalSteps +
          "</span>" +
          '<span id="geo-step-next" role="button" tabindex="0" class="stepper-btn" style="cursor:pointer;padding:2px 6px;border-radius:4px;background:#e2ece6" title="Bước giảng sau">⏭</span>' +
          '<span id="geo-step-all" role="button" tabindex="0" class="stepper-btn ' +
          (typeof o.data.currentStep !== "number" ? "active" : "") +
          '" style="cursor:pointer;padding:2px 6px;border-radius:4px;background:#e2ece6" title="Hiện toàn bộ hình">Hiện hết</span>' +
          "</div>"
        : "";
    bar.innerHTML =
      '<div class="geometry-toolbar-buttons">' +
      keys
        .map(
          (k) =>
            '<button data-geo-mode="' +
            k +
            '" class="' +
            (interaction?.mode === k ? "active" : "") +
            '" title="' +
            titles[k] +
            '">' +
            titles[k] +
            "</button>",
        )
        .join("") +
      (extras.length
        ? '<button id="geo-more" class="' +
          (extras.includes(interaction?.mode) ? "active" : "") +
          '" aria-haspopup="true">' +
          App.escape(
            extras.includes(interaction?.mode)
              ? titles[interaction.mode]
              : "Thêm công cụ",
          ) +
          " ▾</button>"
        : "") +
      stepper +
      '<button id="geo-finish" title="Thoát công cụ dựng">✓ Xong</button>' +
      (interaction &&
      [
        "segment",
        "measure",
        "parallel",
        "perpendicular",
        "median",
        "bisector",
        "altitude",
        "section",
        "circumcircle",
      ].includes(interaction.mode)
        ? '<select id="geo-inline-line-mode" aria-label="Kiểu nét đường nối"><option value="auto">Nét tự động</option><option value="solid">Luôn nét liền</option><option value="dashed">Luôn nét đứt</option></select>'
        : "") +
      '</div><div class="geometry-instruction">' +
      (interaction ? App.escape(status()) : "") +
      "</div>";
    bar
      .querySelectorAll("[data-geo-mode]")
      .forEach((b) => (b.onclick = () => setMode(b.dataset.geoMode, o)));
    bar.querySelector("#geo-finish").onclick = cancel;
    const prevBtn = bar.querySelector("#geo-step-prev");
    if (prevBtn)
      prevBtn.onclick = () => {
        Store.transaction(() => {
          o.data.currentStep = Math.max(
            1,
            (typeof o.data.currentStep === "number"
              ? o.data.currentStep
              : totalSteps) - 1,
          );
        });
        renderToolbar();
        Renderer.request();
      };
    const nextBtn = bar.querySelector("#geo-step-next");
    if (nextBtn)
      nextBtn.onclick = () => {
        Store.transaction(() => {
          o.data.currentStep = Math.min(
            totalSteps,
            (typeof o.data.currentStep === "number"
              ? o.data.currentStep
              : 0) + 1,
          );
        });
        renderToolbar();
        Renderer.request();
      };
    const allBtn = bar.querySelector("#geo-step-all");
    if (allBtn)
      allBtn.onclick = () => {
        Store.transaction(() => {
          delete o.data.currentStep;
        });
        renderToolbar();
        Renderer.request();
      };
    const more = bar.querySelector("#geo-more");
    if (more)
      more.onclick = () => {
        const popover = App.popover(
          more,
          '<h3>Dựng hình & đo</h3><div class="geo-menu-grid">' +
            extras
              .map(
                (k) =>
                  '<button data-geo-mode="' +
                  k +
                  '" class="' +
                  (interaction?.mode === k ? "active" : "") +
                  '">' +
                  titles[k] +
                  "</button>",
              )
              .join("") +
            "</div>",
        );
        popover.querySelectorAll("[data-geo-mode]").forEach(
          (b) =>
            (b.onclick = () => {
              App.closePopover();
              setMode(b.dataset.geoMode, o);
            }),
        );
      };
    const lineChoice = bar.querySelector("#geo-inline-line-mode");
    if (lineChoice) {
      lineChoice.value = interaction.lineMode || "auto";
      lineChoice.onchange = (e) => {
        interaction.lineMode = e.target.value;
      };
    }
  }
  function mountPanel(o) {
    const host = document.getElementById("geometry-properties");
    if (!host) return;
    if (
      o.type === "solid" &&
      ["sphere", "cylinder", "cone", "cone-frustum"].includes(o.data.kind)
    ) {
      const card = document.createElement("section");
      card.className = "teacher-card";
      card.innerHTML =
        '<div class="teacher-card-title">HÌNH TRÒN XOAY <span>Nét khuất tự động</span></div><p class="hint">Kéo để xoay bằng công cụ riêng; thông số r / h dùng đơn vị toán học. Đường bao, vành tròn và đường sinh được giữ rõ nét.</p><div class="tiny-buttons"><button id="round-orbit">Xoay 3D bằng bút</button><button data-action="move-selection">Di chuyển hình</button><button id="round-camera">Góc nhìn chuẩn</button></div>';
      host.prepend(card);
      card.querySelector("#round-orbit").onclick = () => setMode("orbit", o);
      card.querySelector("#round-camera").onclick = () =>
        Store.transaction(() => (o.data.rotation = [-0.45, -0.55]));
      return;
    }
    const vList = points(o).filter((p) => !p.derived);
    const renameHtml =
      vList.length > 0
        ? '<div style="margin:8px 0;padding:8px;background:var(--bg-accent,#f0f7f4);border-radius:6px;">' +
          '<span style="font-size:12px;font-weight:600;color:var(--text-primary,#203328)">Đổi tên đỉnh hình học:</span>' +
          '<div style="margin-top:5px;display:flex;gap:6px">' +
          '<select id="geo-rename-select" style="flex:1">' +
          vList
            .map(
              (p, idx) =>
                '<option value="' + idx + '">' + App.escape(p.label) + "</option>",
            )
            .join("") +
          '</select>' +
          '<input id="geo-rename-input" placeholder="Tên mới" style="width:75px">' +
          '<button id="geo-rename-btn" class="secondary" style="padding:2px 8px">Lưu</button>' +
          "</div></div>"
        : "";
    const box = document.createElement("section");
    box.className = "teacher-card";
    box.innerHTML =
      '<div class="teacher-card-title">DỰNG HÌNH <span>Bắt điểm</span></div>' +
      renameHtml +
      '<details class="geo-details"><summary>Điểm, đường & phép dựng</summary><p class="hint">Dùng danh sách khi các đỉnh hoặc đường chồng nhau.</p><select id="geo-point-choice" aria-label="Điểm để dựng">' +
      points(o)
        .map(
          (p) =>
            '<option value="' +
            App.escape(p.key) +
            '">' +
            App.escape(p.label) +
            " (" +
            p.coords.map((v) => Number(v.toFixed(2))).join("; ") +
            ")</option>",
        )
        .join("") +
      '</select><button id="geo-pick-list" class="secondary full">Chọn điểm này cho phép dựng</button><label class="field"><span>Kiểu nét cho đường nối mới</span><select id="geo-line-mode"><option value="auto">Tự động · thấy = liền, khuất = đứt</option><option value="solid">Luôn nét liền</option><option value="dashed">Luôn nét đứt</option></select></label><div id="geo-construction-list"></div><button id="geo-clean-style" class="secondary full">Nét đen đậm · nền trong suốt</button>' +
      (o.type === "solid"
        ? '<div class="tiny-buttons" style="margin-top:12px"><button data-camera="standard">Góc chuẩn</button><button data-camera="front">Mặt trước</button><button data-camera="top">Nhìn từ trên</button></div><label class="field-row"><input id="geo-section-fill" type="checkbox" ' +
          (o.data.sectionFill ? "checked" : "") +
          "><span>Tô nhẹ thiết diện</span></label>"
        : "") +
      "</details>";
    host.prepend(box);
    const renameBtn = box.querySelector("#geo-rename-btn");
    if (renameBtn) {
      renameBtn.onclick = () => {
        const idx = Number(box.querySelector("#geo-rename-select").value);
        const val = box.querySelector("#geo-rename-input").value.trim();
        if (!val) return App.toast("Nhập tên mới cho đỉnh.");
        Store.transaction(() => {
          o.data.vertexLabels = o.data.vertexLabels || {};
          o.data.vertexLabels[idx] = val;
        });
        App.toast("Đã đổi tên đỉnh thành " + val);
        mountPanel(o);
        renderToolbar();
        Renderer.request();
      };
    }
    const lineList = document.createElement("div");
    lineList.innerHTML =
      '<label class="field"><span>Giao điểm · chọn hai đường</span><select id="geo-line-choice" aria-label="Đường để lấy giao điểm">' +
      lines(o)
        .map(
          (l) =>
            '<option value="' +
            App.escape(l.key) +
            '">' +
            App.escape(l.label) +
            "</option>",
        )
        .join("") +
      '</select></label><button id="geo-pick-line" class="secondary full">Chọn đường này</button>';
    box.querySelector("#geo-pick-list").after(lineList);
    box.querySelector("#geo-pick-line").onclick = () => {
      if (interaction?.mode !== "intersection") setMode("intersection", o);
      pickLine(box.querySelector("#geo-line-choice").value);
    };
    box.querySelector("#geo-pick-list").onclick = () => {
      if (!interaction || interaction.objectId !== o.id)
        return App.toast("Chọn công cụ ở thanh dựng hình trước.");
      pick(box.querySelector("#geo-point-choice").value);
    };
    box.querySelector("#geo-line-mode").value = interaction?.lineMode || "auto";
    box.querySelector("#geo-line-mode").onchange = (e) => {
      if (interaction) interaction.lineMode = e.target.value;
    };
    box.querySelector("#geo-clean-style").onclick = () =>
      Store.transaction(() => {
        o.style = { color: "#111111", width: 2.6, opacity: 1 };
        o.data.fillOpacity = 0;
        o.data.sectionFill = false;
        delete o.data.selectedFace;
        if (o.type === "solid") {
          o.data.faces = false;
          o.data.faceOpacity = 0;
          o.data.live = false;
        }
      });
    const result = Constructions.build(o),
      list = box.querySelector("#geo-construction-list");
    for (const c of o.data.constructions || []) {
      const item = result.items.find((i) => i.id === c.id),
        warning = result.warnings.find((i) => i.id === c.id),
        row = document.createElement("div");
      row.className = "construction-row";
      row.innerHTML =
        "<span>" +
        App.escape(
          titles[c.type] +
            " " +
            c.refs.map((k) => result.points.get(k)?.label || "?").join("–"),
        ) +
        (item?.area !== undefined
          ? "<small>S ≈ " + Number(item.area.toFixed(4)) + "</small>"
          : "") +
        (warning
          ? '<small class="error">' + App.escape(warning.message) + "</small>"
          : "") +
        '</span><button title="Xóa phép dựng và các phép dựng phụ thuộc">×</button>';
      row.querySelector("button").onclick = () => {
        Store.transaction(() => {
          const removed = new Set([c.id]);
          o.data.constructions = o.data.constructions.filter((i) => {
            if (
              removed.has(i.id) ||
              i.refs.some((ref) =>
                [...removed].some(
                  (id) => ref === "c:" + id || ref.startsWith("c:" + id + ":"),
                ),
              )
            ) {
              removed.add(i.id);
              return false;
            }
            return true;
          });
        });
        App.refreshGeometry();
      };
      list.append(row);
    }
    box.querySelectorAll("[data-camera]").forEach(
      (b) =>
        (b.onclick = () =>
          Store.transaction(() => {
            o.data.projection =
              b.dataset.camera === "standard"
                ? Geometry.defaultProjection(o.data.kind)
                : "orthographic";
            o.data.rotation = {
              standard: Geometry.defaultRotation(o.data.kind),
              front: [0, 0],
              top: [-Math.PI / 2, 0],
            }[b.dataset.camera];
          })),
    );
    box
      .querySelector("#geo-section-fill")
      ?.addEventListener("change", (e) =>
        Store.transaction(() => (o.data.sectionFill = e.target.checked)),
      );
  }
  function init() {
    document.addEventListener("statechange", renderToolbar);
  }
  root.TeacherGeometry = {
    init,
    points,
    lines,
    project,
    setMode,
    pick,
    cancel,
    hover,
    handleDown,
    draw,
    drawOverlay,
    drawLabel,
    mountPanel,
    renderToolbar,
    get active() {
      return interaction;
    },
    get orbit() {
      return interaction?.mode === "orbit";
    },
  };
})(window);
