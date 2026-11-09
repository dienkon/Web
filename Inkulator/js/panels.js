(function (root) {
  "use strict";
  let libraryFilter = "";
  const el = () => document.getElementById("panel-content"),
    esc = (s) => App.escape(s);
  function geometry(mode = "geometry") {
    const solid = mode === "solid";
    const target = Store.selected().find(
      (o) => o.type === (solid ? "solid" : "geometry"),
    );
    el().innerHTML =
      '<div id="geometry-properties"></div><div class="segmented"><button data-action="panel" data-panel="geometry" class="' +
      (!solid ? "active" : "") +
      '">Hình phẳng 2D</button><button data-action="panel" data-panel="solid" class="' +
      (solid ? "active" : "") +
      '">Không gian 3D</button></div><label class="field"><input id="geometry-search" placeholder="Tìm hình học…" aria-label="Tìm hình học"></label><p class="hint">Nhấp hoặc kéo hình vào trang. Chọn hình trên trang để chỉnh thuộc tính.</p><div id="geometry-library" class="library-grid"></div>';
    if (target) properties(target);
    const search = document.getElementById("geometry-search");
    search.value = libraryFilter;
    search.oninput = () => {
      libraryFilter = search.value;
      library(solid);
    };
    library(solid);
  }
  function library(solid) {
    const container = document.getElementById("geometry-library");
    container.replaceChildren();
    const normalize = (s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .toLowerCase();
    const catalog = solid ? Geometry.solidCatalog : Geometry.flatCatalog;
    for (const [kind, name] of catalog) {
      if (!normalize(name).includes(normalize(libraryFilter))) continue;
      const b = document.createElement("button");
      b.className = "library-item";
      b.draggable = true;
      const canvas = document.createElement("canvas");
      canvas.width = 188;
      canvas.height = 150;
      const label = document.createElement("span");
      label.textContent = name;
      b.append(canvas, label);
      if(solid) {
        const caption=document.createElement("small");
        caption.className="solid-notation";
        caption.textContent={cube:"ABCD.A′B′C′D′",box:"ABCD.A′B′C′D′",pyramid:"S.ABCD · S trên tâm đáy","right-pyramid":"S.ABCD · SA ⟂ đáy","s-abcd-rec":"S.ABCD · đáy chữ nhật","s-abc-right":"S.ABC · SA ⟂ (ABC)","tri-pyramid":"S.ABC · đáy tam giác đều",tetrahedron:"S.ABC · mọi cạnh bằng nhau","tri-prism":"ABC.A′B′C′","hex-prism":"ABCDEF.A′B′C′D′E′F′",cylinder:"Hai đáy elip · trục đứng",cone:"Đỉnh S · tâm đáy O",sphere:"Tâm O · bán kính r"}[kind] || "Nét khuất tự động";
        b.append(caption);b.title=name+" · "+caption.textContent;
      }
      const o = makeGeometry(kind, solid);
      o.position = { x: 0, y: 0 };
      o.size = { w: 188, h: 150 };
      const ctx = canvas.getContext("2d");
      Renderer.drawObject(ctx, o);
      b.onclick = () => insert(kind, solid);
      b.ondragstart = (e) =>
        e.dataTransfer.setData(
          "application/x-scrble-shape",
          JSON.stringify({ kind, solid }),
        );
      container.append(b);
    }
  }
  function makeGeometry(kind, solid) {
    return Store.object(
      solid ? "solid" : "geometry",
      solid
        ? {
            kind,
            params: { a: 4, b: 3, h: ["pyramid","right-pyramid","s-abcd-rec","s-abc-right","tri-pyramid","cone"].includes(kind) ? 3.5 : kind === "box" ? 3 : 5 },
            rotation: Geometry.defaultRotation(kind),
            projection: Geometry.defaultProjection(kind),
            live: false,
            faces: false,
            edges: true,
            hiddenEdges: true,
            labels: true,
            faceColor: "#111111",
            faceOpacity: 0,
            aux: [],
          }
        : { ...Geometry.flat(kind), fillOpacity: 0 },
      {
        size: { w: solid ? 370 : 340, h: solid ? 320 : 300 },
        style: { color: "#111111", width: 2.6, opacity: 1 },
      },
    );
  }
  function insert(kind, solid, point) {
    const o = makeGeometry(kind, solid);
    o.position = point || App.insertPosition(o.size.w, o.size.h);
    Store.add(o);
    geometry(solid ? "solid" : "geometry");
    App.toast(
      solid
        ? "Đã chèn hình chiếu tĩnh, nét đen rõ. Chọn Xoay 3D để chỉnh góc nhìn."
        : "Đã chèn hình. Kéo các nút tròn để thay đổi đỉnh.",
    );
  }
  function properties(o) {
    const solid = o.type === "solid",
      d = o.data,
      G = Geometry;
    const round =
      solid && ["sphere", "cylinder", "cone", "cone-frustum"].includes(d.kind);
    const catalog = solid ? G.solidCatalog : G.flatCatalog,
      name = catalog.find(([k]) => k === d.kind)?.[1] || "Hình học";
    const box = document.getElementById("geometry-properties");
    box.innerHTML =
      '<h3 style="margin-top:0">' +
      esc(name) +
      '</h3><p class="hint">' +
      (solid
        ? d.live
          ? "Live 3D · mô hình tọa độ; kéo để xoay."
          : "Hình chiếu tĩnh · giữ nguyên góc nhìn."
        : "Đỉnh và đường phụ dùng tọa độ toán học. Đơn vị tùy chọn.") +
      '</p><div id="geometry-fields"></div><div id="geometry-measurement" class="result-box"></div><div class="tiny-buttons" id="geometry-toggles"></div><div ' +
      (round ? "hidden" : "") +
      '><h3>Dựng đường phụ</h3><div class="field-row"><select id="aux-a" aria-label="Đỉnh đầu"></select><select id="aux-b" aria-label="Đỉnh cuối"></select></div><div class="tiny-buttons"><button id="aux-segment">Nối hai đỉnh</button><button id="aux-midpoint">Trung điểm</button>' +
      (solid &&
      [
        "pyramid",
        "right-pyramid",
        "s-abc-right",
        "tri-pyramid",
        "s-abcd-rec",
        "tetrahedron",
      ].includes(d.kind)
        ? '<button id="aux-height">Đường cao</button>'
        : "") +
      '<button id="aux-clear">Xóa đường phụ</button></div><div id="coordinate-measurement" class="hint" style="margin-top:12px"></div>' +
      (solid
        ? '<label class="field"><span>Chọn mặt để khảo sát</span><select id="face-select"></select></label><div id="face-measurement" class="hint"></div>'
        : "") +
      '</div><div class="panel-divider"></div>';
    const fields = document.getElementById("geometry-fields");
    if (solid) {
      if (["sphere", "cylinder", "cone", "cone-frustum"].includes(d.kind)) {
        const card = document.createElement("div");
        card.className = "round-controls";
        card.innerHTML =
          "<h3>Hình tròn xoay rõ nét</h3>" +
          [
            ["showRadius", "Hiện bán kính r"],
            ...(d.kind === "sphere"
              ? [
                  ["equator", "Đường xích đạo"],
                  ["meridian", "Một đường kinh tuyến"],
                ]
              : [["showHeight", "Hiện đường cao h"]]),
          ]
            .map(
              ([key, label]) =>
                '<label class="field-row"><input type="checkbox" data-round="' +
                key +
                '" ' +
                ((d[key] ?? (d.kind === "sphere" && key !== "meridian"))
                  ? "checked"
                  : "") +
                "><span>" +
                label +
                "</span></label>",
            )
            .join("");
        fields.before(card);
        card
          .querySelectorAll("[data-round]")
          .forEach(
            (input) =>
              (input.onchange = () =>
                Store.transaction(
                  () => (d[input.dataset.round] = input.checked),
                )),
          );
      }
      fields.innerHTML =
        '<div class="field-row">' +
        ["a", "b", "h"]
          .filter(
            (k) =>
              k === "a" ||
              (k === "b" &&
                ["box", "cone-frustum", "s-abc-right", "s-abcd-rec"].includes(
                  d.kind,
                )) ||
              (k === "h" &&
                !["cube", "tetrahedron", "sphere", "axes"].includes(d.kind)),
          )
          .map(
            (k) =>
              '<label class="field"><span>' +
              (round && k === "a"
                ? d.kind === "cone-frustum"
                  ? "R"
                  : "r"
                : round && k === "b"
                  ? "r"
                  : k) +
              '</span><input type="number" data-dimension="' +
              k +
              '" min="0.01" max="10000" step="any" value="' +
              d.params[k] +
              '"></label>',
          )
          .join("") +
        '</div><label class="field"><span>Độ đục mặt · 0 = nền trong suốt</span><input id="face-opacity" type="range" min="0" max="1" step=".02" value="' +
        d.faceOpacity +
        '"></label><label class="field-row"><span>Màu mặt</span><input id="face-color" type="color" value="' +
        (d.faceColor || "#438b73") +
        '"></label>';
      fields.querySelectorAll("[data-dimension]").forEach(
        (input) =>
          (input.onchange = () => {
            const value = Number(input.value);
            if (!(value > 0 && value <= 10000))
              return App.toast("Kích thước cần trong khoảng (0,10000].");
            Store.transaction(
              () => (d.params[input.dataset.dimension] = value),
            );
            measure();
          }),
      );
      document.getElementById("face-opacity").onchange = (e) =>
        Store.transaction(() => (d.faceOpacity = Number(e.target.value)));
      document.getElementById("face-color").onchange = (e) =>
        Store.transaction(() => (d.faceColor = e.target.value));
    } else {
      fields.innerHTML = d.points
        .map(
          (p, i) =>
            '<div class="field-row"><span style="flex:0 0 16px">' +
            String.fromCharCode(65 + i) +
            '</span><input aria-label="Hoành độ ' +
            String.fromCharCode(65 + i) +
            '" type="number" step="any" data-vertex="' +
            i +
            '" data-axis="0" value="' +
            Number(p[0].toFixed(4)) +
            '"><input aria-label="Tung độ ' +
            String.fromCharCode(65 + i) +
            '" type="number" step="any" data-vertex="' +
            i +
            '" data-axis="1" value="' +
            Number(p[1].toFixed(4)) +
            '"></div>',
        )
        .join("");
      fields.querySelectorAll("input").forEach(
        (input) =>
          (input.onchange = () => {
            const v = Number(input.value);
            if (!Number.isFinite(v) || Math.abs(v) > 10000)
              return App.toast("Tọa độ không hợp lệ.");
            Store.transaction(() => {
              const p = d.points[Number(input.dataset.vertex)].slice();
              p[Number(input.dataset.axis)] = v;
              root.CanvasEngine.setVertex(o, Number(input.dataset.vertex), p);
            });
            measure();
          }),
      );
    }
    const toggles = document.getElementById("geometry-toggles");
    for (const [key, label] of solid
      ? [
          ["faces", "Mặt"],
          ["edges", "Cạnh"],
          ["hiddenEdges", "Cạnh khuất"],
          ["labels", "Tên đỉnh"],
        ]
      : [
          ["labels", "Tên điểm"],
          ["measures", "Số đo cạnh"],
        ]) {
      const button = document.createElement("button");
      button.textContent = label;
      button.classList.toggle("active", !!d[key]);
      button.onclick = () => {
        Store.transaction(() => {
          d[key] = !d[key];
          if (key === "faces" && d.faces && !d.faceOpacity)
            d.faceOpacity = 0.12;
        });
        if (key === "faces")
          document.getElementById("face-opacity").value = d.faceOpacity;
        button.classList.toggle("active", !!d[key]);
      };
      toggles.append(button);
    }
    if (solid) {
      const reset = document.createElement("button");
      reset.textContent = "Góc nhìn gốc";
      reset.onclick = () =>
        Store.transaction(() => {
          d.rotation = Geometry.defaultRotation(d.kind);
          d.projection = Geometry.defaultProjection(d.kind);
        });
      toggles.append(reset);
      for(const [label,id] of [["⟳ Góc xoay","angles"],["Aa Vị trí tên đỉnh","label-position"]]){const b=document.createElement("button");b.textContent=label;b.onclick=e=>{e.stopPropagation();GeometryControls.adjust(o,id,b);};toggles.append(b);}

      const staticButton = document.createElement("button");
      staticButton.textContent = d.live
        ? "Chuyển hình chiếu tĩnh"
        : "Bật Live 3D";
      staticButton.onclick = () => {
        Store.transaction(() => {
          d.live = !d.live;
          if (d.live) d.projection = "orthographic";
        });
        geometry("solid");
      };
      toggles.append(staticButton);
    }
    const vertices = solid ? G.mesh(d.kind, d.params).vertices : d.points;
    const labels = solid
      ? G.mesh(d.kind, d.params).labels
      : d.points.map((_, i) => String.fromCharCode(65 + i));
    for (const id of ["aux-a", "aux-b"]) {
      const select = document.getElementById(id);
      vertices
        .slice(0, solid && vertices.length > 20 ? 0 : vertices.length)
        .forEach((v, i) => {
          const opt = document.createElement("option");
          opt.value = i;
          opt.textContent =
            (labels[i] || "P" + i) +
            " (" +
            v.map((x) => Number(x.toFixed(2))).join(", ") +
            ")";
          select.append(opt);
        });
    }
    document.getElementById("aux-b").selectedIndex = 1;
    const getPair = () => {
      const a = Number(document.getElementById("aux-a").value),
        b = Number(document.getElementById("aux-b").value);
      if (a === b || !vertices[a] || !vertices[b])
        throw Error("Chọn hai đỉnh khác nhau.");
      return { a, b };
    };
    for (const type of ["segment", "midpoint"])
      document.getElementById("aux-" + type).onclick = () => {
        try {
          const pair = getPair();
          Store.transaction(() =>
            d.aux.push({ type, ...pair, label: "M" + (d.aux.length || "") }),
          );
          measure();
        } catch (e) {
          App.toast(e.message);
        }
      };
    document
      .getElementById("aux-height")
      ?.addEventListener("click", () =>
        Store.transaction(() => d.aux.push({ type: "height" })),
      );
    document.getElementById("aux-clear").onclick = () =>
      Store.transaction(() => (d.aux = []));
    function measure() {
      const m = solid
          ? G.solidMeasurements(d.kind, d.params)
          : G.flatMeasurements(d),
        fmt = MathEngine.format;
      document.getElementById("geometry-measurement").textContent = solid
        ? (m.volume !== undefined
            ? "V ≈ " +
              fmt(m.volume) +
              " đv³\nS toàn phần ≈ " +
              fmt(m.area) +
              " đv²\n"
            : "") + m.formula
        : "Chu vi ≈ " +
          fmt(m.perimeter) +
          " đv\nDiện tích ≈ " +
          fmt(m.area) +
          " đv²";
      const updatePair = () => {
        try {
          const { a, b } = getPair(),
            vv = solid ? G.mesh(d.kind, d.params).vertices : d.points;
          document.getElementById("coordinate-measurement").textContent =
            "Khoảng cách hai điểm ≈ " +
            fmt(G.norm(G.sub(vv[a], vv[b]))) +
            " đv";
        } catch (_) {
          document.getElementById("coordinate-measurement").textContent =
            "Khối tròn xoay: dùng tham số r, h; chưa hỗ trợ chọn đỉnh phụ.";
        }
      };
      document.getElementById("aux-a").onchange = document.getElementById(
        "aux-b",
      ).onchange = updatePair;
      updatePair();
      if (solid) faceUI();
    }
    function faceUI() {
      const model = G.mesh(d.kind, d.params),
        select = document.getElementById("face-select"),
        old = select.value;
      select.replaceChildren();
      if (model.faces.length > 20) {
        document.getElementById("face-measurement").textContent =
          "Chọn mặt hiện hỗ trợ khối đa diện.";
        return;
      }
      model.faces.forEach((f, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = f.map((j) => model.labels[j] || j).join("");
        select.append(opt);
      });
      if (old) select.value = old;
      select.onchange = () => {
        const f = model.faces[Number(select.value)];
        if (!f) return;
        const A = model.vertices[f[0]],
          B = model.vertices[f[1]],
          C = model.vertices[f[2]],
          normal = G.cross(G.sub(B, A), G.sub(C, A));
        let area = 0;
        for (let i = 1; i < f.length - 1; i++)
          area +=
            G.norm(
              G.cross(
                G.sub(model.vertices[f[i]], A),
                G.sub(model.vertices[f[i + 1]], A),
              ),
            ) / 2;
        const pointIndex = Number(document.getElementById("aux-a").value),
          P = model.vertices[pointIndex] || A,
          dist = Math.abs(G.dot(normal, G.sub(P, A))) / G.norm(normal);
        document.getElementById("face-measurement").textContent =
          "S mặt ≈ " +
          MathEngine.format(area) +
          "; pháp tuyến n = (" +
          normal.map((v) => Number(v.toFixed(4))).join(", ") +
          "); khoảng cách từ đỉnh đầu tới mặt phẳng ≈ " +
          MathEngine.format(dist);
      };
      select.onchange();
    }
    measure();
    if (!solid) {
      const extra = document.createElement("div");
      extra.innerHTML =
        '<label class="field"><span>Qua đỉnh (cho đường song song / vuông góc)</span><select id="aux-c">' +
        d.points
          .map(
            (_, i) =>
              '<option value="' +
              i +
              '">' +
              String.fromCharCode(65 + i) +
              "</option>",
          )
          .join("") +
        '</select></label><div class="tiny-buttons"><button id="aux-parallel">Song song AB</button><button id="aux-perpendicular">Vuông góc AB</button></div>';
      box.append(extra);
      for (const type of ["parallel", "perpendicular"])
        document.getElementById("aux-" + type).onclick = () => {
          try {
            const pair = getPair(),
              c = Number(document.getElementById("aux-c").value);
            Store.transaction(() => d.aux.push({ type, ...pair, c }));
          } catch (e) {
            App.toast(e.message);
          }
        };
    }
    if (solid) {
      document.getElementById("face-select").addEventListener("change", (e) => {
        const index = Number(e.target.value);
        if (Number.isInteger(index))
          Store.transaction(() => (d.selectedFace = index));
      });
      const extra = document.createElement("div");
      extra.innerHTML =
        '<h3>Vectơ theo tọa độ</h3><p class="hint">u = AB theo hai đỉnh đã chọn. Nhập v để tính tích và góc; không dùng tọa độ pixel.</p><label class="field"><span>v = (x, y, z)</span><input id="vector-v" value="0, 0, 1"></label><button class="secondary full" id="vector-measure">Tính u · v, u × v và góc</button><div id="vector-result" class="result-box" hidden></div>';
      extra.hidden = round;
      box.append(extra);
      document.getElementById("vector-measure").onclick = () => {
        try {
          const { a, b } = getPair(),
            vv = G.mesh(d.kind, d.params).vertices,
            u = G.sub(vv[b], vv[a]),
            v = document
              .getElementById("vector-v")
              .value.split(",")
              .map(Number);
          if (v.length !== 3 || v.some((x) => !Number.isFinite(x)))
            throw Error("Nhập 3 tọa độ, ngăn bằng dấu phẩy.");
          const dot = G.dot(u, v),
            cross = G.cross(u, v),
            norm = G.norm(u) * G.norm(v);
          if (norm === 0) throw Error("Góc không xác định với vectơ không.");
          const angle =
              (Math.acos(Math.max(-1, Math.min(1, dot / norm))) * 180) /
              Math.PI,
            out = document.getElementById("vector-result");
          out.hidden = false;
          out.textContent =
            "u = (" +
            u.map(MathEngine.format).join(", ") +
            ")\nu · v = " +
            MathEngine.format(dot) +
            "\nu × v = (" +
            cross.map(MathEngine.format).join(", ") +
            ")\nGóc ≈ " +
            MathEngine.format(angle) +
            "°\n" +
            (Math.abs(dot) < 1e-9 * norm
              ? "Vuông góc (dung sai 10⁻⁹)"
              : "Không vuông góc") +
            "\n" +
            (G.norm(cross) < 1e-9 * norm
              ? "Song song (dung sai 10⁻⁹)"
              : "Không song song");
        } catch (e) {
          App.toast(e.message);
        }
      };
    }
    root.TeacherGeometry?.mountPanel(o);
  }
  function paper() {
    const p = Store.current();
    el().innerHTML =
      '<p class="hint">Một không gian phù hợp cho mỗi cách suy nghĩ.</p><div class="paper-grid">' +
      [
        ["grid", "Ô ly nhỏ"],
        ["large", "Ô ly lớn"],
        ["blank", "Giấy trắng"],
        ["lines", "Kẻ ngang"],
        ["dots", "Giấy chấm"],
        ["axes", "Tọa độ Oxy"],
        ["dark", "Giấy tối"],
      ]
        .map(
          ([id, name]) =>
            '<button class="paper-option ' +
            (p.paper === id ? "active" : "") +
            '" data-paper="' +
            id +
            '"><div class="paper-sample ' +
            id +
            '"></div>' +
            name +
            "</button>",
        )
        .join("") +
      '</div><label class="field"><span>Kích thước trang xuất / in</span><select id="paper-size"><option value="a4">A4 · 1200 × 1700</option><option value="a3">A3 · 1700 × 2400</option><option value="wide">Ngang · 1700 × 1200</option><option value="infinite">Không gian rộng · 4000 × 4000</option></select></label><label class="field"><span>Kích thước ô ly</span><input id="paper-grid-size" type="range" min="12" max="60" value="' +
      Store.state.settings.gridSize +
      '"></label><label class="field-row"><input type="checkbox" id="paper-title" ' +
      (p.showTitle ? "checked" : "") +
      '><span>Hiện vùng tiêu đề</span></label><p class="hint">Bạn có thể kéo vùng nhìn tự do. Viền đứt nét là ranh giới trang khi xuất; chỉ nội dung trong viền được xuất.</p>';
    el()
      .querySelectorAll("[data-paper]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            Store.transaction(() => (p.paper = b.dataset.paper));
            paper();
          }),
      );
    const select = document.getElementById("paper-size");
    select.value =
      p.width === 1700
        ? p.height === 1200
          ? "wide"
          : "a3"
        : p.width === 4000
          ? "infinite"
          : "a4";
    select.onchange = () => {
      const sizes = {
        a4: [1200, 1700],
        a3: [1700, 2400],
        wide: [1700, 1200],
        infinite: [4000, 4000],
      };
      Store.transaction(() => ([p.width, p.height] = sizes[select.value]));
    };
    document.getElementById("paper-grid-size").oninput = (e) => {
      Store.state.settings.gridSize = Number(e.target.value);
      Renderer.request();
      Store.scheduleSave();
    };
    document.getElementById("paper-title").onchange = (e) =>
      Store.transaction(() => (p.showTitle = e.target.checked));
  }
  function layers() {
    el().innerHTML =
      '<p class="hint">Các đối tượng cùng chia sẻ hệ tọa độ trang. Lớp ở trên trong danh sách được vẽ phía trước.</p><div id="layer-list"></div><p class="hint">Nền giấy luôn ở dưới cùng. Nét bút trên ảnh hoặc hình học được lưu riêng.</p>';
    const labels = {
      ink: "Nét bút",
      geometry: "Hình học",
      graph: "Đồ thị",
      annotation: "Chú thích",
      image: "Ảnh",
    };
    [...Store.current().layers].reverse().forEach((l) => {
      const row = document.createElement("div");
      row.className = "layer-row";
      row.innerHTML =
        '<button title="Ẩn / hiện">' +
        (l.visible ? "◉" : "○") +
        "</button><span>" +
        labels[l.id] +
        '</span><button title="Khóa / mở khóa">' +
        (l.locked ? "▣" : "▢") +
        '</button><button title="Đưa lớp lên">↑</button><button title="Đưa lớp xuống">↓</button>';
      const buttons = row.querySelectorAll("button");
      buttons[0].onclick = () => {
        Store.transaction(() => (l.visible = !l.visible));
        layersWithLocks();
      };
      buttons[1].onclick = () => {
        Store.transaction(() => (l.locked = !l.locked));
        layersWithLocks();
      };
      buttons[2].onclick = () => reorder(1);
      buttons[3].onclick = () => reorder(-1);
      function reorder(delta) {
        const arr = Store.current().layers,
          i = arr.indexOf(l),
          j = i + delta;
        if (j < 0 || j >= arr.length) return;
        Store.transaction(() => ([arr[i], arr[j]] = [arr[j], arr[i]]));
        layersWithLocks();
      }
      document.getElementById("layer-list").append(row);
    });
  }
  function settings() {
    const s = Store.state.settings;
    el().innerHTML =
      '<label class="field"><span>Giao diện</span><select id="setting-theme"><option value="light">Sáng</option><option value="dark">Tối</option></select></label><label class="field-row"><input id="setting-touch" type="checkbox" ' +
      (s.touchInk ? "checked" : "") +
      '><span>Cho phép viết bằng ngón tay</span></label><p class="hint">Khi tắt, chạm dùng để kéo trang; bút cảm ứng vẫn viết được. Khi đang viết bằng bút, bỏ qua ngón tay.</p><label class="field-row"><input id="setting-smart" type="checkbox" ' +
      (s.smartShape ? "checked" : "") +
      '><span>Smart Shape · nhận dạng nét thẳng / hình kín</span></label><label class="field"><span>Độ mượt</span><input id="setting-smoothing" type="range" min="0" max=".85" step=".05" value="' +
      s.smoothing +
      '"></label><label class="field"><span>Độ nhạy áp lực</span><input id="setting-pressure" type="range" min=".3" max="2" step=".1" value="' +
      s.penSensitivity +
      '"></label><label class="field"><span>Tự động lưu (giây)</span><input id="setting-save" type="number" min="1" max="300" step="1" value="' +
      s.autosave / 1000 +
      '"></label><label class="field"><span>Giới hạn Undo</span><input id="setting-history" type="number" min="10" max="100" value="' +
      s.historyLimit +
      '"></label><div class="panel-divider"></div><p class="hint">Ngôn ngữ: Tiếng Việt. Dữ liệu chỉ lưu trên trình duyệt này, không đồng bộ qua mạng. Nên tải tệp .smath.json định kỳ; lưu tự động phụ thuộc quyền và dung lượng trình duyệt.</p><button class="secondary full" data-action="save">Tải bản sao lưu sổ tay</button><button class="secondary full" data-action="backup-all">Sao lưu tất cả sổ tay</button>';
    document.getElementById("setting-theme").value = s.theme;
    document.getElementById("setting-theme").onchange = (e) => {
      s.theme = e.target.value;
      document.body.classList.toggle("dark", s.theme === "dark");
      Store.scheduleSave();
    };
    for (const [id, key] of [
      ["touch", "touchInk"],
      ["smart", "smartShape"],
    ])
      document.getElementById("setting-" + id).onchange = (e) => {
        s[key] = e.target.checked;
        Store.scheduleSave();
      };
    for (const [id, key, min, max, mul] of [
      ["smoothing", "smoothing", 0, 0.85, 1],
      ["pressure", "penSensitivity", 0.3, 2, 1],
      ["save", "autosave", 1000, 300000, 1000],
      ["history", "historyLimit", 10, 2000, 1],
    ])
      document.getElementById("setting-" + id).onchange = (e) => {
        s[key] = Math.max(
          min,
          Math.min(max, Number(e.target.value) * mul || min),
        );
        Store.scheduleSave();
      };
  }
  function math() {
    el().innerHTML =
      '<p class="hint">Chèn công thức hoặc bảng vào cùng trang viết. Nhấp đúp đối tượng để sửa nội dung.</p><label class="field"><span>Mẫu toán học</span><select id="math-template"><option value="text">Ký hiệu / LaTeX cơ bản</option><option value="fraction">Phân số</option><option value="sqrt">Căn thức</option><option value="integral">Tích phân</option><option value="limit">Giới hạn</option><option value="sigma">Tổng Sigma</option><option value="vector">Vectơ</option><option value="matrix">Ma trận</option><option value="system">Hệ phương trình</option><option value="variation">Bảng biến thiên</option><option value="sign">Bảng xét dấu</option><option value="values">Bảng giá trị</option></select></label><label class="field"><span id="math-entry-label">Nội dung</span><textarea id="math-entry" rows="6">f(x) = x² − 3x + 2</textarea></label><div class="tiny-buttons" id="math-symbols"></div><label class="field"><span>Cỡ chữ</span><input id="math-font" type="number" min="10" max="72" value="22"></label><button id="math-insert" class="primary full">Chèn vào trang</button><p class="hint">Bảng: mỗi dòng là một hàng, dùng | để chia ô. Dấu và giá trị do bạn nhập, ứng dụng không tự suy ra bảng biến thiên.</p>';
    const templates = {
      text: "f(x) = x² − 3x + 2",
      fraction: "x + 1\nx − 2",
      sqrt: "x² + 1",
      integral: "∫₀¹ x² dx",
      limit: "lim (x → +∞) 1/x = 0",
      sigma: "Σ (k = 1 → n) k = n(n+1)/2",
      vector: "a⃗ = (1; 2; 3)",
      matrix: "1 | 2\n3 | 4",
      system: "x + y = 3\n2x − y = 0",
      variation: "x | −∞ | 1 | +∞\nf′(x) | − | 0 | +\nf(x) | +∞ ↘ | 2 | ↗ +∞",
      sign: "x | −∞ | 1 | 2 | +∞\nf(x) | + | 0 | − | 0 | +",
      values: "x | −2 | −1 | 0 | 1 | 2\nf(x) | 4 | 1 | 0 | 1 | 4",
    };
    const composer = document.createElement("section");
    composer.className = "formula-card";
    composer.innerHTML =
      '<h3 style="margin-top:0">Công thức đẹp · tự nhận dạng</h3><textarea id="formula-quick" rows="3" aria-label="Công thức tự định dạng">f(x)=(x^2+1)/(x-2)</textarea><div id="formula-quick-preview" class="formula-preview"></div><button class="primary full" id="formula-quick-insert">Chèn công thức đã dàn</button><div class="tiny-buttons" style="margin-top:10px"><button data-latex-sample="fraction">Phân số / căn</button><button data-latex-sample="integral">Tích phân</button><button data-latex-sample="system">Hệ phương trình</button><button data-latex-sample="matrix">Ma trận</button></div>';
    el().prepend(composer);
    const quick = document.getElementById("formula-quick"),
      updateQuick = () => {
        document.getElementById("formula-quick-insert").disabled =
          !Formulas.preview(
            document.getElementById("formula-quick-preview"),
            quick.value,
          );
      };
    quick.oninput = updateQuick;
    document.getElementById("formula-quick-insert").onclick = () => {
      try {
        Formulas.insert(quick.value);
      } catch (e) {
        App.toast(e.message);
      }
    };
    const samples = {
      fraction: "f(x)=sqrt(x^2+1)/(x-2)",
      integral: "\\int_0^1 x^2\\,dx=\\frac{1}{3}",
      system: "\\begin{cases}x+y=3\\\\2x-y=0\\end{cases}",
      matrix: "\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}",
    };
    composer.querySelectorAll("[data-latex-sample]").forEach(
      (b) =>
        (b.onclick = () => {
          quick.value = samples[b.dataset.latexSample];
          updateQuick();
        }),
    );
    updateQuick();
    document.getElementById("math-template").onchange = (e) => {
      document.getElementById("math-entry").value = templates[e.target.value];
      document.getElementById("math-entry-label").textContent =
        e.target.value === "fraction"
          ? "Tử số (dòng 1), mẫu số (dòng 2)"
          : "Nội dung";
    };
    for (const symbol of [
      "π",
      "√",
      "∞",
      "∫",
      "Σ",
      "≤",
      "≥",
      "≠",
      "∈",
      "∅",
      "⊥",
      "∥",
      "Δ",
      "α",
      "β",
      "θ",
      "²",
      "³",
      "↗",
      "↘",
    ]) {
      const b = document.createElement("button");
      b.textContent = symbol;
      b.onclick = () => {
        const t = document.getElementById("math-entry");
        t.setRangeText(symbol, t.selectionStart, t.selectionEnd, "end");
        t.focus();
      };
      document.getElementById("math-symbols").append(b);
    }
    document.getElementById("math-insert").onclick = () => {
      const kind = document.getElementById("math-template").value,
        text = document.getElementById("math-entry").value,
        fontSize = Math.max(
          10,
          Math.min(
            72,
            Number(document.getElementById("math-font").value) || 22,
          ),
        );
      if (!text.trim()) return;
      let data = { text, math: true, fontSize };
      if (kind === "fraction") {
        const parts = text.split("\n");
        if (parts.length !== 2 || parts.some((s) => !s.trim()))
          return App.toast("Nhập đúng 2 dòng: tử số và mẫu số.");
        data.layout = { kind: "fraction", top: parts[0], bottom: parts[1] };
      }
      if (kind === "sqrt") data.layout = { kind: "sqrt", value: text };
      if (["matrix", "variation", "sign", "values"].includes(kind)) {
        data.table = text
          .split("\n")
          .map((r) => r.split("|").map((c) => c.trim()));
        data.matrix = kind === "matrix";
      }
      const rows = text.split("\n").length,
        w = data.table
          ? Math.max(320, Math.max(...data.table.map((r) => r.length)) * 90)
          : Math.max(
              180,
              Math.min(
                650,
                Math.max(...text.split("\n").map((r) => r.length)) *
                  fontSize *
                  0.6,
              ),
            ),
        h =
          data.layout?.kind === "fraction"
            ? fontSize * 3
            : data.table
              ? data.table.length * 45
              : Math.max(fontSize * 2, rows * fontSize * 1.5);
      Store.add(
        Store.object("text", data, {
          position: App.insertPosition(w, h),
          size: { w, h },
        }),
      );
    };
  }
  function layersWithLocks() {
    layers();
    const locked = Store.current().objects.filter((o) => o.locked);
    if (!locked.length) return;
    const heading = document.createElement("h3");
    heading.textContent = "Đối tượng đã khóa";
    el().append(heading);
    locked.forEach((o, i) => {
      const button = document.createElement("button");
      button.className = "menu-item secondary";
      button.textContent = "Mở khóa " + o.type + " " + (i + 1);
      button.onclick = () => {
        Store.transaction(() => (o.locked = false));
        layersWithLocks();
      };
      el().append(button);
    });
  }
  root.Panels = {
    geometry,
    insert,
    makeGeometry,
    paper,
    layers: layersWithLocks,
    settings,
    math,
  };
})(window);
