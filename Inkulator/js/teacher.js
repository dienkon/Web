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
    ).points;
  }
  function points(o) {
    const result = Constructions.build(o),
      all = [...result.points.values()].filter((p) => !p.aliasOf),
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
  function status() {
    if (!interaction) return "Chọn công cụ rồi nhấp các điểm trên hình.";
    if (interaction.mode === "orbit")
      return "Kéo hình để chỉnh góc nhìn. Thả chuột để giữ hình tĩnh.";
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
      (interaction.mode === "angle" ? " (đỉnh góc ở điểm thứ hai)" : "")
    );
  }
  function setMode(mode, o = target()) {
    if (!o || o.locked) return App.toast("Chọn một hình học chưa khóa.");
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
        : { mode, objectId: o.id, picked: [], dashed: false };
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
    if (interaction.picked.includes(key))
      return App.toast("Chọn các điểm khác nhau.");
    interaction.picked.push(key);
    if (
      interaction.picked.length === Constructions.operations[interaction.mode]
    ) {
      const c = {
        id: Store.uid(),
        type: interaction.mode,
        refs: [...interaction.picked],
        dashed: interaction.dashed,
        showMeasure: interaction.mode === "measure",
      };
      const labels = new Set(
        [...Constructions.build(o).points.values()].map((p) => p.label),
      );
      if (["midpoint", "perpendicular", "circumcircle"].includes(c.type)) {
        const candidates =
          c.type === "perpendicular"
            ? ["H", "K", "L", "T"]
            : c.type === "circumcircle"
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
    const hit = nearest(o, p);
    if (hit) pick(hit.key);
    else App.toast("Nhấp gần đỉnh hoặc điểm phụ; con trỏ sẽ tự bắt điểm.");
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
    const next = nearest(o, p);
    if (next?.key !== hovered?.key) {
      hovered = next;
      Renderer.request();
    }
  }
  function drawLabel(ctx, text, q, center, occupied = [], others = []) {
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
        score = overlap * 100 + cover * 80;
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
    ctx.save();
    ctx.strokeStyle = o.style.color;
    ctx.fillStyle = o.style.color;
    ctx.lineWidth = Math.max(2, o.style.width);
    ctx.globalAlpha = o.style.opacity ?? 1;
    for (const item of result.items) {
      const q = item.refs.map((k) => map.get(k));
      if (["segment", "measure"].includes(item.type)) {
        line(...q, item.dashed);
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
      if (["parallel", "perpendicular"].includes(item.type)) {
        const pp = project(o, item.endpoints);
        line(...pp, item.dashed);
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
        ctx.stroke();
        ctx.restore();
      }
    }
    all.forEach((p, i) => {
      if (
        p.aliasOf ||
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
      keys = [
        "segment",
        "midpoint",
        "measure",
        "perpendicular",
        "parallel",
        "angle",
        ...(solid ? ["section", "orbit"] : ["circumcircle"]),
      ];
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
      '<button id="geo-finish" title="Thoát công cụ dựng">✓ Xong</button></div><div class="geometry-instruction">' +
      App.escape(status()) +
      "</div>";
    bar
      .querySelectorAll("[data-geo-mode]")
      .forEach((b) => (b.onclick = () => setMode(b.dataset.geoMode, o)));
    bar.querySelector("#geo-finish").onclick = cancel;
  }
  function mountPanel(o) {
    const host = document.getElementById("geometry-properties");
    if (!host) return;
    const box = document.createElement("section");
    box.className = "teacher-card";
    box.innerHTML =
      '<div class="teacher-card-title">DỰNG HÌNH THÔNG MINH <span>Bắt điểm</span></div><p class="hint">Chọn công cụ ở thanh nổi, rồi nhấp các đỉnh / trung điểm trên hình. Có thể chọn điểm từ danh sách khi các đỉnh chồng nhau.</p><select id="geo-point-choice" aria-label="Điểm để dựng">' +
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
      '</select><button id="geo-pick-list" class="secondary full">Chọn điểm này cho phép dựng</button><label class="field-row"><input id="geo-dashed" type="checkbox" ' +
      (interaction?.dashed ? "checked" : "") +
      '><span>Đường phụ nét đứt</span></label><div id="geo-construction-list"></div><button id="geo-clean-style" class="secondary full">Nét đen đậm · nền trong suốt</button>' +
      (o.type === "solid"
        ? '<div class="tiny-buttons" style="margin-top:12px"><button data-camera="standard">Góc chuẩn</button><button data-camera="front">Mặt trước</button><button data-camera="top">Nhìn từ trên</button></div><label class="field-row"><input id="geo-section-fill" type="checkbox" ' +
          (o.data.sectionFill ? "checked" : "") +
          "><span>Tô nhẹ thiết diện</span></label>"
        : "");
    host.prepend(box);
    box.querySelector("#geo-pick-list").onclick = () => {
      if (!interaction || interaction.objectId !== o.id)
        return App.toast("Chọn công cụ ở thanh dựng hình trước.");
      pick(box.querySelector("#geo-point-choice").value);
    };
    box.querySelector("#geo-dashed").onchange = (e) => {
      if (interaction) interaction.dashed = e.target.checked;
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
          Store.transaction(
            () =>
              (o.data.rotation = {
                standard: [-0.45, -0.55],
                front: [0, 0],
                top: [-Math.PI / 2, 0],
              }[b.dataset.camera]),
          )),
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
