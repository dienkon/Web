(function (root) {
  "use strict";
  const model = {
    angle: "DEG",
    mode: "CALC",
    expression: "",
    result: null,
    exact: null,
    showExact: false,
    history: [],
    memory: { Ans: 0, M: 0, A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, X: 0, Y: 0 },
    lastText: "",
  };
  let win,
    drag = null;
  function open() {
    win = document.getElementById("calculator");
    if (!win.hidden) {
      win.hidden = true;
      return;
    }
    win.hidden = false;
    Store.state.calculator = model;
    render();
  }
  function render() {
    win.innerHTML =
      '<div class="calc-heading"><b>MÁY TÍNH KHOA HỌC</b><span><button id="calc-pin" title="Ghim">⌖</button><button id="calc-min" title="Thu nhỏ">−</button><button id="calc-close" title="Đóng">×</button></span></div><div class="calc-body"><div class="calc-modebar"><select id="calc-mode" aria-label="Chế độ máy tính">' +
      [
        "CALC",
        "EQUATION",
        "SOLVE",
        "TABLE",
        "MATRIX",
        "VECTOR",
        "COMPLEX",
        "STATISTICS",
      ]
        .map(
          (m) =>
            "<option" +
            (m === model.mode ? " selected" : "") +
            ">" +
            m +
            "</option>",
        )
        .join("") +
      '</select><button id="calc-angle">' +
      model.angle +
      '</button><button id="calc-sd">S⇔D</button></div><div id="calc-mode-content"></div><div class="calc-history" id="calc-history"></div></div>';
    win.querySelector("#calc-close").onclick = () => (win.hidden = true);
    win.querySelector("#calc-min").onclick = () =>
      win.classList.toggle("minimized");
    win.querySelector("#calc-pin").onclick = () =>
      win.classList.toggle("pinned");
    win.querySelector("#calc-mode").onchange = (e) => {
      model.mode = e.target.value;
      renderMode();
    };
    win.querySelector("#calc-angle").onclick = (e) => {
      model.angle = model.angle === "DEG" ? "RAD" : "DEG";
      e.target.textContent = model.angle;
    };
    win.querySelector("#calc-sd").onclick = () => {
      if (model.exact === null)
        return App.toast("Kết quả này chỉ có biểu diễn số gần đúng.");
      model.showExact = !model.showExact;
      updateResult();
    };
    const head = win.querySelector(".calc-heading");
    head.onpointerdown = (e) => {
      if (e.target.closest("button") || win.classList.contains("pinned"))
        return;
      const r = win.getBoundingClientRect();
      drag = { x: e.clientX - r.left, y: e.clientY - r.top };
      head.setPointerCapture(e.pointerId);
    };
    head.onpointermove = (e) => {
      if (!drag) return;
      win.style.left =
        Math.max(0, Math.min(innerWidth - 80, e.clientX - drag.x)) + "px";
      win.style.top =
        Math.max(0, Math.min(innerHeight - 50, e.clientY - drag.y)) + "px";
      win.style.right = "auto";
    };
    head.onpointerup = head.onpointercancel = () => (drag = null);
    renderMode();
  }
  function renderMode() {
    const el = win.querySelector("#calc-mode-content");
    const advanced = ["EQUATION", "SOLVE", "TABLE", "STATISTICS"].includes(
      model.mode,
    );
    if (advanced) {
      advancedMode(el);
      return;
    }
    el.innerHTML =
      '<div class="calc-screen"><input id="calc-input" aria-label="Biểu thức máy tính" autocomplete="off" spellcheck="false" maxlength="600"><div id="calc-result" class="calc-result">0</div></div><div class="calc-keys" id="calc-keys"></div><div class="field-row"><button id="calc-insert" class="secondary">Chèn kết quả</button><button id="calc-plot" class="secondary">Vẽ hàm số</button></div><div class="tiny-buttons"><button id="calc-sto">STO</button><button id="calc-rcl">RCL</button><select id="calc-memory" aria-label="Ô nhớ">' +
      ["A", "B", "C", "D", "E", "F", "X", "Y", "M"]
        .map((x) => "<option>" + x + "</option>")
        .join("") +
      '</select></div><p id="calc-hint" class="hint"></p>';
    const input = el.querySelector("#calc-input");
    input.value = model.expression;
    input.oninput = () => (model.expression = input.value);
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        calculate();
      }
      if (e.key === "Escape") win.hidden = true;
    };
    let keys = [
      ["sin", "sin("],
      ["cos", "cos("],
      ["tan", "tan("],
      ["√", "sqrt("],
      ["x²", "^2"],
      ["log", "log10("],
      ["ln", "log("],
      ["(", "("],
      [")", ")"],
      ["n!", "!"],
      ["7", "7"],
      ["8", "8"],
      ["9", "9"],
      ["DEL", "DEL"],
      ["AC", "AC"],
      ["4", "4"],
      ["5", "5"],
      ["6", "6"],
      ["×", "*"],
      ["÷", "/"],
      ["1", "1"],
      ["2", "2"],
      ["3", "3"],
      ["+", "+"],
      ["−", "-"],
      ["0", "0"],
      [".", "."],
      ["π", "pi"],
      ["Ans", "Ans"],
      ["=", "="],
    ];
    if (model.mode === "MATRIX")
      keys = [
        ["det", "det("],
        ["inv", "inv("],
        ["T", "transpose("],
        ["[", "["],
        ["]", "]"],
        ...keys.slice(10),
      ];
    if (model.mode === "VECTOR")
      keys = [
        ["dot", "dot("],
        ["cross", "cross("],
        ["norm", "norm("],
        ["[", "["],
        ["]", "]"],
        ...keys.slice(10),
      ];
    if (model.mode === "COMPLEX")
      keys = [
        ["i", "i"],
        ["abs", "abs("],
        ["arg", "arg("],
        ["conj", "conj("],
        ["re", "re("],
        ...keys.slice(10),
      ];
    keys.forEach(([label, value]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.className = /^\d$/.test(label)
        ? "number"
        : label === "="
          ? "equals"
          : "";
      b.onclick = () => {
        if (value === "=") return calculate();
        if (value === "AC") {
          input.value = "";
          model.expression = "";
          model.result = null;
          model.lastText = "";
          model.exact = null;
          updateResult();
          return;
        }
        if (value === "DEL") {
          const end = input.selectionStart;
          input.setRangeText(
            "",
            Math.max(0, end - 1),
            input.selectionEnd,
            "end",
          );
        } else
          input.setRangeText(
            value,
            input.selectionStart,
            input.selectionEnd,
            "end",
          );
        model.expression = input.value;
        input.focus();
      };
      el.querySelector("#calc-keys").append(b);
    });
    el.querySelector("#calc-insert").onclick = () => {
      if (model.lastText) App.insertText(model.lastText, true);
      else App.toast("Hãy tính một biểu thức trước.");
    };
    el.querySelector("#calc-plot").onclick = () => {
      App.openPanel("graph");
      const field = document.querySelector(
        "#graph-expressions input[type=text]",
      );
      if (field) {
        field.value = model.expression || "x^2";
        field.dispatchEvent(new Event("input"));
      }
    };
    el.querySelector("#calc-sto").onclick = () => {
      if (model.result === null) return App.toast("Chưa có kết quả.");
      const key = el.querySelector("#calc-memory").value;
      model.memory[key] = model.result;
      App.toast("Đã lưu vào " + key);
    };
    el.querySelector("#calc-rcl").onclick = () => {
      input.setRangeText(
        el.querySelector("#calc-memory").value,
        input.selectionStart,
        input.selectionEnd,
        "end",
      );
      model.expression = input.value;
      input.focus();
    };
    const hint = {
      CALC: "C(n,k), P(n,k), gcd(a,b), lcm(a,b), nthRoot(x,n). Dùng / để nhập phân số; % là phép chia lấy dư.",
      MATRIX:
        "Ma trận tối đa 4×4. Ví dụ: det([[1,2],[3,4]]). Cộng, trừ, nhân và inv(), transpose().",
      VECTOR:
        "Ví dụ: dot([1,2,3],[4,5,6]); cross([1,0,0],[0,1,0]); norm([3,4]).",
      COMPLEX:
        "Ví dụ: (2+3i)/(1-i), conj(2+3i), re(2+3i), abs(3+4i). arg() trả radian.",
    };
    el.querySelector("#calc-hint").textContent = hint[model.mode];
    updateResult();
    renderHistory();
  }
  function calculate() {
    try {
      const input = win.querySelector("#calc-input");
      model.expression = input.value;
      model.result = MathEngine.evaluate(
        model.expression,
        model.memory,
        model.angle,
      );
      const formatted = MathEngine.format(model.result);
      model.exact = MathEngine.exact(model.expression);
      model.showExact = model.exact !== null && model.exact.includes("/");
      model.memory.Ans = model.result;
      model.lastText =
        model.expression +
        " = " +
        (model.showExact ? model.exact : formatted) +
        (model.exact === null ? " (giá trị số)" : "");
      model.history.unshift({
        expression: model.expression,
        result: formatted,
        angle: model.angle,
      });
      model.history = model.history.slice(0, 40);
      updateResult();
      renderHistory();
    } catch (e) {
      model.result = null;
      model.exact = null;
      model.lastText = "";
      win.querySelector("#calc-result").textContent = "Lỗi";
      App.toast(e.message);
    }
  }
  function updateResult() {
    const el = win?.querySelector("#calc-result");
    if (!el) return;
    try {
      el.textContent =
        model.result === null
          ? "0"
          : model.showExact && model.exact !== null
            ? model.exact
            : MathEngine.format(model.result);
    } catch (e) {
      el.textContent = e.message;
    }
  }
  function renderHistory() {
    const el = win.querySelector("#calc-history");
    el.replaceChildren();
    model.history.forEach((h) => {
      const b = document.createElement("button");
      b.textContent = h.expression + " = " + h.result + " · " + h.angle;
      b.onclick = () => {
        model.expression = h.expression;
        model.mode = "CALC";
        render();
      };
      el.append(b);
    });
  }
  function advancedMode(el) {
    let form = "";
    switch (model.mode) {
      case "EQUATION":
        form =
          '<label class="field"><span>Chọn dạng phương trình</span><select id="equation-type"><option value="poly">Đa thức bậc 1, 2, 3</option><option value="system">Hệ tuyến tính 2–3 ẩn</option></select></label><label class="field"><span>Hệ số a,b,c,… hoặc ma trận A</span><textarea id="advanced-input" rows="3">1, -5, 6</textarea></label><label class="field"><span>Vế phải b (chỉ cho hệ tuyến tính)</span><input id="system-b" value="[1,2]"></label><p class="hint">Đa thức: 1, -5, 6 nghĩa là x² − 5x + 6 = 0. Hệ: [[1,2],[3,4]] và [5,6].</p>';
        break;
      case "SOLVE":
        form =
          '<label class="field"><span>Phương trình theo x</span><input id="advanced-input" value="x^3-2x-5=0"></label><label class="field"><span>Giá trị khởi tạo x₀</span><input id="solve-initial" type="number" value="2" step="any"></label><p class="hint">Newton có kiểm tra hội tụ; kết quả là nghiệm gần đúng.</p>';
        break;
      case "TABLE":
        form =
          '<label class="field"><span>f(x)</span><input id="advanced-input" value="x^2+2x"></label><div class="field-row"><label>Đầu <input id="table-start" type="number" value="-3" style="width:70px"></label><label>Cuối <input id="table-end" type="number" value="3" style="width:70px"></label><label>Bước <input id="table-step" type="number" value="1" step="any" style="width:70px"></label></div>';
        break;
      case "STATISTICS":
        form =
          '<label class="field"><span>Dữ liệu, ngăn bằng dấu phẩy</span><textarea id="advanced-input" rows="3">1,2,3,4,5</textarea></label><label class="field"><span>Y cho hồi quy tuyến tính (tùy chọn)</span><input id="statistics-y" placeholder="2,4,6,8,10"></label><p class="hint">Phương sai và độ lệch chuẩn của tổng thể (chia n).</p>';
        break;
    }
    el.innerHTML =
      form +
      '<button id="advanced-evaluate" class="primary full">Tính toán</button><pre id="advanced-output" class="result-box" hidden></pre><button id="advanced-insert" class="secondary full" hidden>Chèn kết quả vào trang</button>';
    if (model.mode === "EQUATION")
      el.querySelector("#equation-type").onchange = (e) => {
        el.querySelector("#advanced-input").value =
          e.target.value === "poly" ? "1,-5,6" : "[[1,2],[3,4]]";
      };
    el.querySelector("#advanced-evaluate").onclick = () => {
      try {
        const raw = el.querySelector("#advanced-input").value.trim(),
          m = MathEngine.math,
          fmt = MathEngine.format;
        let output = "";
        const list = (s) => {
          const a = s
            .split(/[\s,;]+/)
            .filter(Boolean)
            .map(Number);
          if (
            !a.length ||
            a.length > 1000 ||
            a.some((v) => !Number.isFinite(v))
          )
            throw Error("Nhập tối đa 1000 số hữu hạn.");
          return a;
        };
        if (model.mode === "EQUATION") {
          if (el.querySelector("#equation-type").value === "poly") {
            const coef = list(raw);
            if (coef.length < 2 || coef.length > 4)
              throw Error("Nhập 2–4 hệ số.");
            const rr = MathEngine.polynomial(coef);
            output =
              typeof rr === "string"
                ? rr
                : rr.map((r, i) => "x" + (i + 1) + " ≈ " + fmt(r)).join("\n");
          } else {
            const a = JSON.parse(raw),
              b = JSON.parse(el.querySelector("#system-b").value);
            if (
              !Array.isArray(a) ||
              ![2, 3].includes(a.length) ||
              a.some(
                (row) =>
                  !Array.isArray(row) ||
                  row.length !== a.length ||
                  row.some((v) => typeof v !== "number" || !Number.isFinite(v)),
              ) ||
              !Array.isArray(b) ||
              b.length !== a.length ||
              b.some((v) => typeof v !== "number" || !Number.isFinite(v))
            )
              throw Error(
                "Hệ số cần là ma trận vuông 2×2 hoặc 3×3 và vectơ b tương ứng.",
              );
            if (Math.abs(m.det(a)) < 1e-12) {
              const aug = a.map((r, i) => [...r, b[i]]);
              const rank = (matrix) => {
                let r = 0;
                matrix = matrix.map((row) => row.slice());
                for (
                  let c = 0;
                  c < matrix[0].length && r < matrix.length;
                  c++
                ) {
                  let pivot = r;
                  for (let i = r + 1; i < matrix.length; i++)
                    if (Math.abs(matrix[i][c]) > Math.abs(matrix[pivot][c]))
                      pivot = i;
                  if (Math.abs(matrix[pivot][c]) < 1e-10) continue;
                  [matrix[r], matrix[pivot]] = [matrix[pivot], matrix[r]];
                  for (let i = r + 1; i < matrix.length; i++) {
                    const f = matrix[i][c] / matrix[r][c];
                    for (let j = c; j < matrix[0].length; j++)
                      matrix[i][j] -= f * matrix[r][j];
                  }
                  r++;
                }
                return r;
              };
              output = rank(a) === rank(aug) ? "Vô số nghiệm" : "Vô nghiệm";
            } else
              output = m
                .lusolve(a, b)
                .map((v, i) => "x" + (i + 1) + " ≈ " + fmt(v[0]))
                .join("\n");
          }
        }
        if (model.mode === "SOLVE") {
          const parts = raw.split("=");
          if (parts.length > 2) throw Error("Phương trình chỉ có một dấu =.");
          const f = MathEngine.compile(
            parts.length === 2 ? "(" + parts[0] + ")-(" + parts[1] + ")" : raw,
          );
          const initial = Number(el.querySelector("#solve-initial").value);
          output = "x ≈ " + fmt(MathEngine.solve((x) => f({ x }), initial));
        }
        if (model.mode === "TABLE") {
          const start = Number(el.querySelector("#table-start").value),
            end = Number(el.querySelector("#table-end").value),
            step = Number(el.querySelector("#table-step").value);
          if (
            ![start, end, step].every(Number.isFinite) ||
            step <= 0 ||
            end < start ||
            (end - start) / step > 200
          )
            throw Error("Bước phải > 0, cuối ≥ đầu; tối đa 201 hàng.");
          const fn = MathEngine.compile(raw),
            rows = [];
          for (let i = 0; i <= Math.floor((end - start) / step + 1e-9); i++) {
            const x = start + i * step,
              y = fn({ x });
            rows.push(
              fmt(x).padEnd(12) +
                (Number.isFinite(y) ? fmt(y) : "Không xác định"),
            );
          }
          output = "x           f(x)\n" + rows.join("\n");
        }
        if (model.mode === "STATISTICS") {
          const x = list(raw),
            mean = m.mean(x),
            variance = x.reduce((s, v) => s + (v - mean) ** 2, 0) / x.length;
          output =
            "n = " +
            x.length +
            "\nTrung bình = " +
            fmt(mean) +
            "\nTrung vị = " +
            fmt(m.median(x)) +
            "\nPhương sai = " +
            fmt(variance) +
            "\nĐộ lệch chuẩn = " +
            fmt(Math.sqrt(variance)) +
            "\nMin = " +
            Math.min(...x) +
            "; Max = " +
            Math.max(...x);
          const yr = el.querySelector("#statistics-y").value.trim();
          if (yr) {
            const y = list(yr);
            if (y.length !== x.length)
              throw Error("X và Y cần cùng số phần tử.");
            const ym = m.mean(y),
              den = x.reduce((s, v) => s + (v - mean) ** 2, 0);
            if (den === 0) throw Error("X không có biến thiên.");
            const slope =
              x.reduce((s, v, i) => s + (v - mean) * (y[i] - ym), 0) / den;
            output +=
              "\nHồi quy: y ≈ " + fmt(slope) + "x + " + fmt(ym - slope * mean);
          }
        }
        const out = el.querySelector("#advanced-output");
        out.hidden = false;
        out.textContent = output;
        const insert = el.querySelector("#advanced-insert");
        insert.hidden = false;
        insert.onclick = () =>
          App.insertText(model.mode + "\n" + raw + "\n" + output, true);
        model.lastText = output;
      } catch (e) {
        el.querySelector("#advanced-output").hidden = true;
        el.querySelector("#advanced-insert").hidden = true;
        App.toast(e.message);
      }
    };
  }
  root.Calculator = { open, model };
})(window);
