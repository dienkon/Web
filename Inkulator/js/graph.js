(function (root) {
  "use strict";
  const palette = ["#111111", "#cd6961", "#5e80bd", "#b7963c", "#9a72b6"];
  const cache = new Map(),
    compiled = new Map();
  let editing = null,
    preview = null,
    drag = null;
  let draft = fresh();
  function fresh() {
    return {
      expressions: [{ text: "x^2 - 3x + 2", color: palette[0], visible: true }],
      view: { xmin: -6, xmax: 6, ymin: -4, ymax: 8 },
      params: { a: 1, b: 0, c: 0 },
      markers: [],
      axes: true,
      grid: false,
      axisWidth: 1.8,
      transparent: true,
      tangent: null,
      shade: null,
    };
  }
  function expression(text) {
    if (compiled.has(text)) return compiled.get(text);
    const raw = text.trim().replace(/≤/g,'<=').replace(/≥/g,'>='),
      implicit = raw.includes("=") && !/^(y|[a-z]\(x\))\s*=/.test(raw);
    let result;
    const inequality=raw.match(/^(.+?)(<=|>=|<|>)(.+)$/);
    if(inequality){result={fn:MathEngine.compile('('+inequality[1]+')-('+inequality[3]+')'),implicit:true,inequality:inequality[2]};}
    else if (implicit) {
      const parts = raw.split("=");
      if (parts.length !== 2) throw Error("Phương trình chỉ có một dấu =.");
      result = {
        fn: MathEngine.compile("(" + parts[0] + ")-(" + parts[1] + ")"),
        implicit: true,
      };
    } else result = { fn: MathEngine.compile(raw), implicit: false };
    if (compiled.size > 100) compiled.clear();
    compiled.set(text, result);
    return result;
  }
  function mapping(view, w, h) {
    return {
      x: (x) => ((x - view.xmin) / (view.xmax - view.xmin)) * w,
      y: (y) => h - ((y - view.ymin) / (view.ymax - view.ymin)) * h,
      ix: (x) => view.xmin + (x / w) * (view.xmax - view.xmin),
      iy: (y) => view.ymax - (y / h) * (view.ymax - view.ymin),
    };
  }
  function step(span) {
    const raw = span / 8,
      p = Math.pow(10, Math.floor(Math.log10(raw))),
      r = raw / p;
    return (r < 2 ? 1 : r < 5 ? 2 : 5) * p;
  }
  function draw(ctx, data, w, h) {
    if(data.revolution?.enabled&&root.CalculusLab)return CalculusLab.drawRevolution(ctx,data,w,h);
    const v = data.view,
      map = mapping(v, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = "#fff";
    if (!data.transparent) ctx.fillRect(0, 0, w, h);
    root.CalculusLab?.drawInequalities(ctx,data,w,h);
    const gx = step(v.xmax - v.xmin),
      gy = step(v.ymax - v.ymin);
    ctx.strokeStyle = "#e9eeea";
    ctx.lineWidth = 0.8;
    ctx.font = "9px Segoe UI";
    ctx.fillStyle = "#8a9c8f";
    ctx.beginPath();
    if (data.grid === true) for (let x = Math.ceil(v.xmin / gx) * gx; x < v.xmax; x += gx) {
      const px = map.x(x);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    if (data.grid === true) for (let y = Math.ceil(v.ymin / gy) * gy; y < v.ymax; y += gy) {
      const py = map.y(y);
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();
    if (data.axes !== false) {
      ctx.strokeStyle = "#202833";
      ctx.fillStyle = "#202833";
      ctx.lineWidth = data.axisWidth || 1.8;
      ctx.beginPath();
      ctx.moveTo(map.x(0), 0);
      ctx.lineTo(map.x(0), h);
      ctx.moveTo(0, map.y(0));
      ctx.lineTo(w, map.y(0));
      ctx.stroke();
      const ox = map.x(0), oy = map.y(0);
      ctx.beginPath();
      if (oy >= 0 && oy <= h) { ctx.moveTo(w-8,oy-4);ctx.lineTo(w-1,oy);ctx.lineTo(w-8,oy+4);ctx.fillText("x",w-12,Math.max(12,oy-8)); }
      if (ox >= 0 && ox <= w) { ctx.moveTo(ox-4,8);ctx.lineTo(ox,1);ctx.lineTo(ox+4,8);ctx.fillText("y",Math.min(w-12,ox+8),12); }
      ctx.stroke();
      if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) ctx.fillText("O",ox-12,oy+13);
      for (let x = Math.ceil(v.xmin / gx) * gx; x < v.xmax; x += gx)
        if (Math.abs(x) > gx / 2)
          ctx.fillText(
            Number(x.toPrecision(5)),
            map.x(x) + 3,
            Math.max(12, Math.min(h - 7, map.y(0) + 12)),
          );
      for (let y = Math.ceil(v.ymin / gy) * gy; y < v.ymax; y += gy)
        if (Math.abs(y) > gy / 2)
          ctx.fillText(
            Number(y.toPrecision(5)),
            Math.max(4, Math.min(w - 25, map.x(0) + 5)),
            map.y(y) - 4,
          );
    }
    const params = { a: 1, b: 0, c: 0, d: 1, t: 1, ...data.params };
    for (const e of data.expressions) {
      if (!e.visible) continue;
      let item;
      try {
        item = expression(e.text);
      } catch (_) {
        continue;
      }
      const fn = (x) => item.fn({ ...params, x });
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(item.inequality&& !item.inequality.includes('=')?[6,4]:[]);
      ctx.beginPath();
      if (item.implicit) {
        const n = 65,
          dx = (v.xmax - v.xmin) / n,
          dy = (v.ymax - v.ymin) / n;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            const x = v.xmin + i * dx,
              y = v.ymin + j * dy,
              pts = [
                [x, y],
                [x + dx, y],
                [x + dx, y + dy],
                [x, y + dy],
              ],
              vals = pts.map(([x, y]) => item.fn({ ...params, x, y })),
              hits = [];
            for (let k = 0; k < 4; k++) {
              const l = (k + 1) % 4;
              if (
                Number.isFinite(vals[k]) &&
                Number.isFinite(vals[l]) &&
                vals[k] * vals[l] < 0
              ) {
                const t = vals[k] / (vals[k] - vals[l]);
                hits.push([
                  map.x(pts[k][0] + t * (pts[l][0] - pts[k][0])),
                  map.y(pts[k][1] + t * (pts[l][1] - pts[k][1])),
                ]);
              }
            }
            if (hits.length === 2) {
              ctx.moveTo(...hits[0]);
              ctx.lineTo(...hits[1]);
            }
          }
      } else {
        const n = Math.min(1200, Math.max(350, Math.round(w * 1.5))),
          dx = (v.xmax - v.xmin) / n;
        function segment(x0, y0, x1, y1, depth) {
          const xm = (x0 + x1) / 2,
            ym = fn(xm);
          if (
            !Number.isFinite(y0) ||
            !Number.isFinite(y1) ||
            !Number.isFinite(ym)
          )
            return;
          const p0 = map.y(y0),
            p1 = map.y(y1),
            pm = map.y(ym),
            error = Math.abs(pm - (p0 + p1) / 2);
          if (error > 1.5 || Math.abs(p1 - p0) > h * 0.3) {
            if (depth < 5) {
              segment(x0, y0, xm, ym, depth + 1);
              segment(xm, ym, x1, y1, depth + 1);
            }
            return;
          }
          if (Math.abs(p0) > h * 10 || Math.abs(p1) > h * 10) return;
          ctx.moveTo(map.x(x0), p0);
          ctx.lineTo(map.x(x1), p1);
        }
        let x = v.xmin,
          y = fn(x);
        for (let k = 1; k <= n; k++) {
          const nx = v.xmin + k * dx,
            ny = fn(nx);
          segment(x, y, nx, ny, 0);
          x = nx;
          y = ny;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (data.shade) {
      try {
        const item = expression(data.expressions[0].text),
          s = data.shade;
        if (!item.implicit) {
          ctx.fillStyle = data.expressions[0].color + "22";
          ctx.beginPath();
          ctx.moveTo(map.x(s.a), map.y(s.between===1 ? expression(data.expressions[1].text).fn({...params,x:s.a}) : 0));
          for (let i = 0; i <= 300; i++) {
            const x = s.a + ((s.b - s.a) * i) / 300,
              y = item.fn({ ...params, x });
            if (Number.isFinite(y)) ctx.lineTo(map.x(x), map.y(y));
          }
          if(s.between===1){const second=expression(data.expressions[1].text);for(let i=300;i>=0;i--){const x=s.a+(s.b-s.a)*i/300,y=second.fn({...params,x});if(Number.isFinite(y))ctx.lineTo(map.x(x),map.y(y));}}
          else ctx.lineTo(map.x(s.b), map.y(0));
          ctx.closePath();
          ctx.fill();
        }
      } catch (_) {}
    }
    if (data.tangent) {
      const { x, y, slope } = data.tangent;
      ctx.strokeStyle = "#c9944d";
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, map.y(y + slope * (v.xmin - x)));
      ctx.lineTo(w, map.y(y + slope * (v.xmax - x)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const p of data.markers || []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      ctx.fillStyle = "#b27348";
      ctx.beginPath();
      ctx.arc(map.x(p.x), map.y(p.y), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "9px Segoe UI";
      ctx.fillText(
        "(" + Number(p.x.toFixed(3)) + ", " + Number(p.y.toFixed(3)) + ")",
        map.x(p.x) + 5,
        map.y(p.y) - 7,
      );
    }
    root.CalculusLab?.drawAsymptotes(ctx,data,w,h);
    ctx.restore();
  }
  function drawObject(ctx, o) {
    const key =
      JSON.stringify(o.data) +
      Math.round(o.size.w) +
      "," +
      Math.round(o.size.h);
    let c = cache.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.min(1600, Math.max(300, o.size.w * 2));
      c.height = Math.min(1200, Math.max(250, o.size.h * 2));
      const cc = c.getContext("2d");
      cc.scale(c.width / o.size.w, c.height / o.size.h);
      draw(cc, o.data, o.size.w, o.size.h);
      const budget = root.Store?.state.settings.performance === "economy" ? 2e6 : 6e6;
      while (cache.size && [...cache.values()].reduce((sum, item) => sum + item.width*item.height, c.width*c.height) > budget) {
        const oldest = cache.keys().next().value, old = cache.get(oldest);
        old.width = old.height = 1; cache.delete(oldest);
      }
      cache.set(key, c);
    }
    ctx.drawImage(c, 0, 0, o.size.w, o.size.h);
  }
  function panel(obj = null) {
    editing = obj?.id || null;
    draft = obj ? Store.clone(obj.data) : fresh();
    const el = document.getElementById("panel-content");
    el.innerHTML =
      '<p class="hint">Từ công thức đến hình dung. Nhập hàm số hoặc phương trình theo x, y.</p><div id="graph-expressions"></div><button class="secondary full" id="graph-add">+ Thêm biểu thức</button><div id="graph-error" class="error"></div><div id="graph-parameters"></div><canvas id="graph-preview" class="graph-preview" width="600" height="480" aria-label="Xem trước đồ thị"></canvas><div class="field-row"><button class="secondary" id="graph-reset">Về gốc</button><label><input type="checkbox" id="graph-axes" checked> Hiện trục</label></div><p class="hint">Kéo để di chuyển · Lăn chuột để zoom · Nhấp để đánh dấu tọa độ. Đơn vị góc: radian.</p><button id="graph-insert" class="primary full">' +
      (editing ? "Cập nhật đồ thị" : "Chèn vào trang") +
      '</button><div class="panel-divider"></div><h3>Khảo sát số · biểu thức thứ nhất</h3><div class="field-row"><label>x₀ <input id="graph-x0" type="number" value="1" step="any" style="width:85px"></label><button id="graph-tangent" class="secondary">Tiếp tuyến</button></div><div class="field-row"><label>a <input id="graph-a" type="number" value="0" step="any" style="width:80px"></label><label>b <input id="graph-b" type="number" value="2" step="any" style="width:80px"></label></div><div class="tiny-buttons"><button id="graph-roots">Nghiệm Ox ≈</button><button id="graph-extrema">Cực trị ≈</button><button id="graph-intersections">Giao điểm ≈</button><button id="graph-integral">Tích phân ≈</button><button id="graph-table">Bảng giá trị</button></div><div id="graph-analysis" class="result-box" hidden></div><button id="graph-insert-analysis" class="secondary full" hidden>Chèn kết quả khảo sát</button>';
    const tools=document.createElement("section");tools.className="graph-options";
    tools.innerHTML='<label class="field"><span>Mẫu đồ thị</span><select id="graph-template"><option value="">Chọn mẫu…</option><option value="x^2-3x+2">Parabol</option><option value="x^3-3x">Hàm bậc ba</option><option value="(x+1)/(x-2)">Hàm phân thức</option><option value="sin(x)">Lượng giác</option><option value="exp(x)">Hàm mũ</option><option value="log(x)">Logarit</option><option value="x^2+y^2=9">Đường tròn ẩn</option><option value="x^2/9+y^2/4=1">Elip</option></select></label><div class="field-row"><label><input id="graph-grid" type="checkbox"> Lưới</label><label><input id="graph-background" type="checkbox"> Nền trắng</label></div><details class="graph-advanced"><summary>Trục & công cụ nâng cao</summary><label class="field"><span>Độ đậm trục</span><input id="graph-axis-width" type="range" min="1" max="4" step="0.2"></label><div id="graph-range" class="graph-range"></div><div class="tiny-buttons"><button id="graph-square">Đơn vị hai trục bằng nhau</button><button id="graph-clear">Xóa điểm / tiếp tuyến / vùng tô</button><button id="graph-derivative">Thêm đồ thị đạo hàm</button><button id="graph-area-between">Diện tích giữa hai hàm ≈</button></div></details>';
    document.getElementById("graph-preview").before(tools);
    const grid=tools.querySelector("#graph-grid");grid.checked=draft.grid===true;grid.onchange=()=>{draft.grid=grid.checked;update();};
    const background=tools.querySelector("#graph-background");background.checked=!draft.transparent;background.onchange=()=>{draft.transparent=!background.checked;update();};
    const axis=tools.querySelector("#graph-axis-width");axis.value=draft.axisWidth||1.8;axis.oninput=()=>{draft.axisWidth=Number(axis.value);update();};
    tools.querySelector("#graph-template").onchange=e=>{if(!e.target.value)return;draft.expressions[0].text=e.target.value;expressionsUI();};
    for(const name of ["xmin","xmax","ymin","ymax"]){const label=document.createElement("label");label.textContent=name+" ";const input=document.createElement("input");input.type="number";input.step="any";input.value=draft.view[name];input.id="graph-"+name;label.append(input);tools.querySelector("#graph-range").append(label);input.onchange=()=>{const next={...draft.view,[name]:Number(input.value)};if(!input.value||!Object.values(next).every(Number.isFinite)||next.xmax-next.xmin<1e-6||next.ymax-next.ymin<1e-6||Object.values(next).some(v=>Math.abs(v)>1e7)){input.value=draft.view[name];return App.toast("Khoảng trục không hợp lệ.");}draft.view=next;update();};}
    tools.querySelector("#graph-square").onclick=()=>{const v=draft.view,cy=(v.ymax+v.ymin)/2,half=(v.xmax-v.xmin)*.75/2;v.ymin=cy-half;v.ymax=cy+half;update();};
    tools.querySelector("#graph-clear").onclick=()=>{draft.markers=[];draft.tangent=null;draft.shade=null;update();};
    tools.querySelector("#graph-derivative").onclick=()=>analyze("derivative");
    tools.querySelector("#graph-area-between").onclick=()=>analyze("area-between");
    preview = document.getElementById("graph-preview");
    expressionsUI();
    document.getElementById("graph-add").onclick = () => {
      if (draft.expressions.length >= 8)
        return App.toast("Tối đa 8 biểu thức.");
      draft.expressions.push({
        text: "sin(x)",
        color: palette[draft.expressions.length % palette.length],
        visible: true,
      });
      expressionsUI();
    };
    document.getElementById("graph-axes").checked = draft.axes !== false;
    document.getElementById("graph-axes").onchange = (e) => {
      draft.axes = e.target.checked;
      update();
    };
    document.getElementById("graph-reset").onclick = () => {
      draft.view = fresh().view;
      update();
    };
    document.getElementById("graph-insert").onclick = insert;
    for (const action of [
      "roots",
      "extrema",
      "intersections",
      "integral",
      "tangent",
      "table",
    ])
      document.getElementById("graph-" + action).onclick = () =>
        analyze(action);
    preview.onpointerdown = (e) => {
      preview.setPointerCapture(e.pointerId);
      drag = { x: e.offsetX, y: e.offsetY, v: { ...draft.view }, moved: false };
    };
    preview.onpointermove = (e) => {
      if (!drag) return;
      const dx = e.offsetX - drag.x,
        dy = e.offsetY - drag.y,
        v = drag.v;
      drag.moved = drag.moved || Math.hypot(dx, dy) > 3;
      const sx = (v.xmax - v.xmin) / preview.clientWidth,
        sy = (v.ymax - v.ymin) / preview.clientHeight;
      draft.view = {
        xmin: v.xmin - dx * sx,
        xmax: v.xmax - dx * sx,
        ymin: v.ymin + dy * sy,
        ymax: v.ymax + dy * sy,
      };
      update();
    };
    preview.onpointerup = (e) => {
      if (drag && !drag.moved) {
        const map = mapping(
            draft.view,
            preview.clientWidth,
            preview.clientHeight,
          ),
          x = map.ix(e.offsetX);
        let y = map.iy(e.offsetY);
        try {
          const f = expression(draft.expressions[0].text);
          if (!f.implicit) y = f.fn({ ...draft.params, x });
        } catch (_) {}
        if (Number.isFinite(y)) draft.markers.push({ x, y });
        if (draft.markers.length > 30) draft.markers.shift();
        update();
      }
      drag = null;
    };
    preview.onpointercancel = () => (drag = null);
    preview.onwheel = (e) => {
      e.preventDefault();
      const v = draft.view,
        map = mapping(v, preview.clientWidth, preview.clientHeight),
        x = map.ix(e.offsetX),
        y = map.iy(e.offsetY),
        s = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      if ((v.xmax - v.xmin) * s < 1e-5 || (v.xmax - v.xmin) * s > 1e7) return;
      draft.view = {
        xmin: x + (v.xmin - x) * s,
        xmax: x + (v.xmax - x) * s,
        ymin: y + (v.ymin - y) * s,
        ymax: y + (v.ymax - y) * s,
      };
      update();
    };
    root.CalculusLab?.mount(el,draft,update);
    update();
  }
  function expressionsUI() {
    const el = document.getElementById("graph-expressions");
    el.replaceChildren();
    draft.expressions.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "graph-expression";
      row.innerHTML =
        '<input type="checkbox" aria-label="Hiện đồ thị ' +
        (i + 1) +
        '"><input type="color" aria-label="Màu đồ thị"><input type="text" aria-label="Biểu thức ' +
        (i + 1) +
        '" maxlength="600"><button title="Xóa biểu thức">×</button>';
      const inputs = row.querySelectorAll("input");
      inputs[0].checked = e.visible;
      inputs[1].value = e.color;
      inputs[2].value = e.text;
      inputs[0].onchange = () => {
        e.visible = inputs[0].checked;
        update();
      };
      inputs[1].oninput = () => {
        e.color = inputs[1].value;
        update();
      };
      inputs[2].oninput = () => {
        e.text = inputs[2].value;
        update();
        parametersUI();
      };
      inputs[2].onkeydown = (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          update();
        }
      };
      row.querySelector("button").onclick = () => {
        if (draft.expressions.length === 1) return;
        draft.expressions.splice(i, 1);
        expressionsUI();
      };
      el.append(row);
    });
    parametersUI();
    update();
  }
  function parametersUI() {
    const el = document.getElementById("graph-parameters");
    el.replaceChildren();
    const text = draft.expressions.map((e) => e.text).join(" ");
    for (const name of ["a", "b", "c", "d", "t"])
      if (new RegExp("\\b" + name + "\\b").test(text)) {
        if (draft.params[name] === undefined) draft.params[name] = 1;
        const row = document.createElement("label");
        row.className = "field";
        row.innerHTML =
          "<span>" +
          name +
          ' = <output></output></span><input type="range" min="-10" max="10" step="0.1">';
        row.querySelector("input").value = draft.params[name];
        row.querySelector("output").textContent = draft.params[name];
        row.querySelector("input").oninput = (e) => {
          draft.params[name] = Number(e.target.value);
          row.querySelector("output").textContent = e.target.value;
          update();
        };
        el.append(row);
      }
  }
  function update() {
    if (!preview?.isConnected) return;
    for(const name of ["xmin","xmax","ymin","ymax"]){const input=document.getElementById("graph-"+name);if(input&&document.activeElement!==input)input.value=Number(draft.view[name].toPrecision(8));}
    const errors = [];
    draft.expressions.forEach((e, i) => {
      try {
        expression(e.text);
      } catch (error) {
        errors.push(i + 1 + ": " + error.message);
      }
    });
    document.getElementById("graph-error").textContent = errors.join("\n");
    document.getElementById("graph-insert").disabled = errors.length > 0;
    const ctx = preview.getContext("2d");
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 300, 240);
    draw(ctx, draft, 300, 240);
  }
  function insert() {
    try {
      draft.expressions.forEach((e) => expression(e.text));
      if (editing) {
        const o = Store.current().objects.find((o) => o.id === editing);
        if (!o) throw Error("Đồ thị đã bị xóa.");
        Store.transaction(() => (o.data = Store.clone(draft)));
      } else
        Store.add(
          Store.object("graph", Store.clone(draft), {
            position: App.insertPosition(440, 330),
            size: { w: 440, h: 330 },
            style: { color: "#111111", width: 2.6, opacity: 1 },
          }),
        );
      App.toast(
        editing ? "Đã cập nhật đồ thị." : "Đã chèn đồ thị. Nhấp đúp để sửa.",
      );
    } catch (e) {
      App.toast(e.message);
    }
  }
  function analyze(action) {
    try {
      const item = expression(draft.expressions[0].text);
      if (item.implicit) throw Error("Khảo sát số áp dụng cho hàm y = f(x).");
      const f = (x) => item.fn({ ...draft.params, x }),
        v = draft.view,
        x0 = Number(document.getElementById("graph-x0").value),
        a = Number(document.getElementById("graph-a").value),
        b = Number(document.getElementById("graph-b").value),
        fmt = MathEngine.format;
      let text = "";
      if (action === "derivative") {
        if(draft.expressions.length>=8)throw Error("Tối đa 8 biểu thức.");
        const source=draft.expressions[0].text.replace(/^y\s*=/,"");
        const derivative=MathEngine.math.derivative(MathEngine.parse(source,["x","a","b","c","d","t"]),"x").toString();
        draft.expressions.push({text:String(derivative),color:palette[draft.expressions.length%palette.length],visible:true});
        expressionsUI();text="Đạo hàm: "+derivative;
      }
      if (action === "area-between") {
        if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error("Cần b > a, hữu hạn.");
        if(draft.expressions.length<2)throw Error("Cần hai hàm số.");
        const second=expression(draft.expressions[1].text);if(second.implicit)throw Error("Cần hai hàm y = f(x).");
        const value=MathEngine.integral(x=>Math.abs(f(x)-second.fn({...draft.params,x})),a,b);
        draft.shade={a,b,between:1};
        text="Diện tích giữa hai hàm trên ["+a+", "+b+"] ≈ "+fmt(value)+". Áp dụng cho hàm liên tục.";
      }
      if (action === "roots") {
        const rr = MathEngine.roots(f, v.xmin, v.xmax);
        text =
          "Nghiệm gần đúng trong khoảng nhìn:\n" +
          (rr.length
            ? rr.map((x) => "x ≈ " + fmt(x)).join("\n")
            : "Chưa tìm được nghiệm đổi dấu hoặc trùng điểm lấy mẫu.");
        draft.markers = rr.map((x) => ({ x, y: 0 }));
      }
      if (action === "extrema") {
        const rr = MathEngine.roots(
          (x) => MathEngine.derivative(f, x),
          v.xmin,
          v.xmax,
        ).filter((x) => {
          const h = 1e-3;
          return (
            MathEngine.derivative(f, x - h) * MathEngine.derivative(f, x + h) <
            0
          );
        });
        text =
          "Cực trị số tìm được:\n" +
          (rr.map((x) => "(" + fmt(x) + ", " + fmt(f(x)) + ") ≈").join("\n") ||
            "Chưa tìm được.");
        draft.markers = rr.map((x) => ({ x, y: f(x) }));
      }
      if (action === "intersections") {
        if (draft.expressions.length < 2) throw Error("Cần hai hàm số.");
        const second = expression(draft.expressions[1].text);
        if (second.implicit) throw Error("Cần hai hàm y = f(x).");
        const rr = MathEngine.roots(
          (x) => f(x) - second.fn({ ...draft.params, x }),
          v.xmin,
          v.xmax,
        );
        text =
          "Giao điểm gần đúng:\n" +
          (rr.map((x) => "(" + fmt(x) + ", " + fmt(f(x)) + ")").join("\n") ||
            "Chưa tìm được.");
        draft.markers = rr.map((x) => ({ x, y: f(x) }));
      }
      if (action === "tangent") {
        const y = f(x0),
          slope = MathEngine.derivative(f, x0);
        if (!Number.isFinite(y) || !Number.isFinite(slope))
          throw Error("Hàm không xác định tại x₀.");
        draft.tangent = { x: x0, y, slope };
        text =
          "Đạo hàm số: f′(" +
          fmt(x0) +
          ") ≈ " +
          fmt(slope) +
          "\nTiếp tuyến: y ≈ " +
          fmt(slope) +
          "(x − " +
          fmt(x0) +
          ") + " +
          fmt(y);
      }
      if (action === "integral") {
        const value = MathEngine.integral(f, a, b);
        draft.shade = { a, b };
        text =
          "∫ từ " +
          a +
          " đến " +
          b +
          " ≈ " +
          fmt(value) +
          "\nSimpson thích nghi · sai số mục tiêu 10⁻⁸. Chỉ dùng với hàm liên tục trên [a,b].";
      }
      if (action === "table") {
        if (b <= a) throw Error("Cần b > a.");
        text =
          "x          f(x)\n" +
          Array.from({ length: 11 }, (_, i) => {
            const x = a + ((b - a) * i) / 10,
              y = f(x);
            return (
              Number(x.toFixed(4)).toString().padEnd(10) +
              " " +
              (Number.isFinite(y) ? fmt(y) : "Không xác định")
            );
          }).join("\n");
      }
      const out = document.getElementById("graph-analysis");
      out.hidden = false;
      out.textContent = text;
      const insert = document.getElementById("graph-insert-analysis");
      insert.hidden = false;
      insert.onclick = () => App.insertText(text, true);
      update();
    } catch (e) {
      document.getElementById("graph-error").textContent = e.message;
      document.getElementById("graph-analysis").hidden = true;
      document.getElementById("graph-insert-analysis").hidden = true;
    }
  }
  root.Graph = { draw, drawObject, panel, expression, fresh };
})(window);
