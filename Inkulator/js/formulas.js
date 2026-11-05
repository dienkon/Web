(function (root) {
  "use strict";
  const cache = new Map(),
    functions = new Set(
      "sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs exp log log10 log2 min max".split(
        " ",
      ),
    );
  function toTex(source) {
    let text = String(source)
      .trim()
      .replace(/^\$\$?([\s\S]*?)\$\$?$/, "$1")
      .replace(/^\\\[([\s\S]*)\\\]$/, "$1")
      .trim();
    if (!text || text.length > 4000)
      throw Error("Công thức cần có 1–4000 ký tự.");
    if (
      /\\(?:require|href|url|includegraphics|html|class|style|cssId|def|gdef|newcommand|renewcommand|catcode|input|write|special)\b/i.test(
        text,
      )
    )
      throw Error(
        "Chỉ cho phép công thức toán; không chèn liên kết, macro hoặc mã lệnh.",
      );
    if (text.includes("\\") || /[{}]/.test(text)) return text;
    text = text
      .replace(/π/g, "pi")
      .replace(
        /[αβγδθλφσω]/g,
        (c) =>
          ({
            α: "alpha",
            β: "beta",
            γ: "gamma",
            δ: "delta",
            θ: "theta",
            λ: "lambda",
            φ: "phi",
            σ: "sigma",
            ω: "omega",
          })[c],
      )
      .replace(/∞/g, "Infinity")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/√\s*\(/g, "sqrt(");
    const format = (line) => {
      const parts = line.split(/(?<![<>=!])=(?!=)/);
      if (parts.length > 2) throw Error("Mỗi dòng chỉ có một dấu bằng.");
      const convert = (part) => {
        const tree = MathEngine.math.parse(part);
        let count = 0;
        const visit = (n, depth = 0) => {
          if (++count > 180 || depth > 24)
            throw Error("Công thức quá phức tạp.");
          if (
            ![
              "SymbolNode",
              "ConstantNode",
              "OperatorNode",
              "ParenthesisNode",
              "FunctionNode",
              "ArrayNode",
            ].includes(n.type)
          )
            throw Error("Cú pháp chưa phù hợp để dàn công thức.");
          if (
            n.isSymbolNode &&
            !/^([A-Za-z](?:_\w{1,12})?|pi|theta|alpha|beta|gamma|delta|lambda|phi|sigma|omega|infty|Infinity)$/.test(
              n.name,
            ) &&
            !functions.has(n.name)
          )
            throw Error(
              "Đây có vẻ là văn bản; bỏ chọn tự định dạng để chèn chữ thường.",
            );
          if (
            n.isFunctionNode &&
            !functions.has(n.fn.name) &&
            !/^\w$/.test(n.fn.name)
          )
            throw Error("Hàm chưa hỗ trợ trong nhận dạng tự động.");
          n.forEach?.((child) => visit(child, depth + 1));
        };
        visit(tree);
        return tree
          .toTex({ parenthesis: "auto", implicit: "hide" })
          .replace(/\\mathrm\{([fgh])\}(?=\\left)/g, "$1");
      };
      return parts.map(convert).join(" = ");
    };
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 25) throw Error("Tối đa 25 dòng công thức.");
    const result = lines.map(format);
    return result.length > 1
      ? "\\begin{aligned}" +
          result.map((t) => t.replace(" = ", " &= ")).join(" \\\\ ") +
          "\\end{aligned}"
      : result[0];
  }
  function detect(text) {
    return (
      /[=^/√∫Σ]|\\(?:frac|sqrt|int|sum|begin)|\b(?:sin|cos|tan|log)\(/.test(
        text,
      ) && !/[\u0300-\u036fđĐ]/.test(text.normalize("NFD"))
    );
  }
  function render(source, color = "#111111", font = 26) {
    const tex = toTex(source),
      key = tex + "|" + color + "|" + font;
    let result = cache.get(key);
    if (result) return result;
    if (!root.MathTypesetter) throw Error("Bộ dàn công thức chưa được tải.");
    const markup = MathTypesetter.render(tex),
      parsed = new DOMParser().parseFromString(markup, "image/svg+xml"),
      svg = parsed.documentElement;
    if (
      svg.nodeName !== "svg" ||
      svg.querySelector("parsererror,[data-mjx-error]")
    )
      throw Error(
        svg.querySelector("[data-mjx-error]")?.getAttribute("data-mjx-error") ||
          "Cú pháp LaTeX chưa đúng.",
      );
    const box = svg.getAttribute("viewBox")?.split(/\s+/).map(Number);
    if (
      !box ||
      box.length !== 4 ||
      box.some((v) => !Number.isFinite(v)) ||
      box[2] <= 0 ||
      box[3] <= 0
    )
      throw Error("Công thức không tạo được bố cục hợp lệ.");
    const scale = font / 1000,
      w = Math.max(25, box[2] * scale),
      h = Math.max(font, box[3] * scale);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(w + 12));
    svg.setAttribute("height", String(h + 12));
    svg.setAttribute(
      "viewBox",
      [
        box[0] - 6 / scale,
        box[1] - 6 / scale,
        box[2] + 12 / scale,
        box[3] + 12 / scale,
      ].join(" "),
    );
    svg.style.color = color;
    for (const node of svg.querySelectorAll("*")) {
      for (const attr of [...node.attributes])
        if (/^on/i.test(attr.name) || /href$/i.test(attr.name))
          node.removeAttribute(attr.name);
    }
    const clean = new XMLSerializer().serializeToString(svg),
      src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clean),
      image = new Image();
    const ready = new Promise((resolve, reject) => {
      image.onload = () => {
        root.Renderer?.request();
        resolve(image);
      };
      image.onerror = () => reject(Error("Không dựng được ảnh công thức."));
      image.src = src;
    });
    ready.catch(() => {});
    result = { tex, svg: clean, src, image, ready, w: w + 12, h: h + 12 };
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key, result);
    return result;
  }
  function draw(ctx, o) {
    try {
      const r = render(
        o.data.tex || o.data.text,
        o.style.color,
        o.data.fontSize || 26,
      );
      if (r.image.complete && r.image.naturalWidth)
        ctx.drawImage(r.image, 0, 0, o.size.w, o.size.h);
    } catch (_) {
      ctx.font = "16px Segoe UI";
      ctx.fillText("Công thức cần kiểm tra", 0, 18);
    }
  }
  async function prepare(o) {
    if (o.type === "formula")
      await render(
        o.data.tex || o.data.text,
        o.style.color,
        o.data.fontSize || 26,
      ).ready;
  }
  function preview(container, source, color = "#111111", font = 26) {
    try {
      const r = render(source, color, font);
      container.replaceChildren();
      const img = new Image();
      img.src = r.src;
      img.alt = source;
      container.append(img);
      return r;
    } catch (error) {
      container.textContent = error.message;
      return null;
    }
  }
  function insert(source, opts = {}) {
    const r = render(source, opts.color || "#111111", opts.fontSize || 26),
      max = Math.min(950, Store.current().width - 80),
      scale = Math.min(1, max / r.w),
      w = r.w * scale,
      h = r.h * scale;
    return Store.add(
      Store.object(
        "formula",
        { text: source, tex: r.tex, fontSize: opts.fontSize || 26 },
        {
          position: opts.position || App.insertPosition(w, h),
          size: { w, h },
          style: { color: opts.color || "#111111", width: 2, opacity: 1 },
        },
      ),
    );
  }
  async function textEditor(o = null, p = null, force = false) {
    const source = o?.data.text || "",
      isMath = force || o?.type === "formula" || detect(source);
    if (o?.type === "draft") o = null;
    const pending = App.dialog(
      o
        ? "Chỉnh sửa văn bản / công thức"
        : force
          ? "Soạn công thức toán"
          : "Chèn văn bản / công thức",
      '<label class="field"><span>Nhập biểu thức hoặc LaTeX · ví dụ f(x)=(x^2+1)/(x-2)</span><textarea name="text" id="formula-source" rows="5" maxlength="4000">' +
        App.escape(source) +
        '</textarea></label><div class="field-row"><label><input name="format" type="checkbox" id="formula-auto" ' +
        (isMath ? "checked" : "") +
        '> Tự nhận dạng & dàn công thức</label><label>Cỡ chữ <input name="fontSize" id="formula-font" type="number" min="12" max="72" value="' +
        (o?.data.fontSize || 26) +
        '" style="width:65px"></label></div><div id="formula-preview" class="formula-preview"></div><p class="hint">Phân số, căn, mũ, tích phân, hệ phương trình và ma trận. Nhận dạng biểu thức gõ; nét viết tay vẫn được giữ nguyên.</p>',
      "Chèn / cập nhật",
    );
    const input = document.getElementById("formula-source"),
      auto = document.getElementById("formula-auto"),
      font = document.getElementById("formula-font"),
      box = document.getElementById("formula-preview");
    let userToggled = false,
      current = null;
    const update = () => {
      if (!userToggled && !o && !force) auto.checked = detect(input.value);
      current = auto.checked
        ? preview(
            box,
            input.value,
            o?.style.color || "#111111",
            Number(font.value) || 26,
          )
        : null;
      if (!auto.checked)
        box.textContent = input.value || "Văn bản thường sẽ được giữ nguyên.";
    };
    input.oninput = update;
    font.oninput = update;
    auto.onchange = () => {
      userToggled = true;
      update();
    };
    update();
    const form = document.querySelector("#dialog form"),
      guard = (e) => {
        if (e.submitter?.value === "ok" && auto.checked && !current) {
          e.preventDefault();
          input.focus();
        }
      };
    form.addEventListener("submit", guard);
    const r = await pending;
    form.removeEventListener("submit", guard);
    if (!r || !r.text.trim()) return;
    const fontSize = Math.max(12, Math.min(72, Number(r.fontSize) || 26));
    if (r.format === "on") {
      const rendered = render(r.text, o?.style.color || "#111111", fontSize),
        scale = Math.min(1, (Store.current().width - 80) / rendered.w),
        size = { w: rendered.w * scale, h: rendered.h * scale };
      if (o)
        Store.transaction(() => {
          o.type = "formula";
          o.data = { text: r.text, tex: rendered.tex, fontSize };
          o.size = size;
        });
      else insert(r.text, { fontSize, position: p });
    } else {
      const rows = r.text.split("\n"),
        w = Math.max(
          160,
          Math.min(
            900,
            Math.max(...rows.map((l) => l.length)) * fontSize * 0.55,
          ),
        ),
        h = Math.max(40, rows.length * fontSize * 1.5),
        data = { text: r.text, fontSize, baseWidth: w };
      if (o)
        Store.transaction(() => {
          o.type = "text";
          o.data = data;
          o.size = { w, h };
        });
      else
        Store.add(
          Store.object("text", data, {
            position: p || App.insertPosition(w, h),
            size: { w, h },
          }),
        );
    }
  }
  root.Formulas = {
    toTex,
    detect,
    render,
    draw,
    prepare,
    preview,
    insert,
    textEditor,
  };
})(window);
