/* Limited expression-tree interpreter. Never executes user JavaScript. */
(function (root) {
  "use strict";
  const m =
    root.math ||
    (typeof require === "function" ? require("../vendor/math.js") : null);
  const functions = new Set(
    "sin cos tan sinDeg cosDeg tanDeg asin acos atan atan2 sinh cosh tanh sqrt cbrt nthRoot abs exp log log10 log2 floor ceil round sign min max pow factorial combinations permutations gcd lcm det inv transpose trace dot cross norm conj re im arg complex mean median variance std sum prod C P".split(
      " ",
    ),
  );
  const operators = new Set([
    "+",
    "-",
    "*",
    "/",
    "^",
    "%",
    "!",
    "==",
    "!=",
    "<",
    ">",
    "<=",
    ">=",
    "and",
    "or",
    "not",
  ]);
  const aliases = { C: "combinations", P: "permutations" };
  function normalize(text) {
    return String(text)
      .trim()
      .replace(/^[a-zA-Z]\(x\)\s*=\s*/, "")
      .replace(/^y\s*=\s*/, "")
      .replace(/π/g, "pi")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/\b(sin|cos|tan)\(\s*(-?\d+(?:\.\d+)?)\s*°\s*\)/g, "$1Deg($2)")
      .replace(/(\d+(?:\.\d+)?)°/g, "($1*pi/180)");
  }
  function parse(text, symbols = []) {
    const source = normalize(text);
    if (!source || source.length > 600)
      throw Error("Biểu thức phải có 1–600 ký tự.");
    let tree;
    try {
      tree = m.parse(source);
    } catch (_) {
      throw Error("Cú pháp chưa đúng. Hãy kiểm tra ngoặc và tên hàm.");
    }
    let count = 0;
    const allowed = new Set([
      "x",
      "y",
      "a",
      "b",
      "c",
      "d",
      "t",
      "pi",
      "e",
      "i",
      "Ans",
      "M",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "X",
      "Y",
      ...symbols,
    ]);
    function check(n, depth = 0) {
      if (++count > 160 || depth > 22) throw Error("Biểu thức quá phức tạp.");
      switch (n.type) {
        case "ConstantNode":
          if (
            typeof n.value !== "number" ||
            !Number.isFinite(n.value) ||
            Math.abs(n.value) > 1e100
          )
            throw Error("Hằng số không hợp lệ.");
          break;
        case "SymbolNode":
          if (!allowed.has(n.name))
            throw Error("Ký hiệu chưa hỗ trợ: " + n.name);
          break;
        case "OperatorNode":
          if (!operators.has(n.op)) throw Error("Phép toán chưa hỗ trợ.");
          n.args.forEach((a) => check(a, depth + 1));
          break;
        case "FunctionNode":
          if (!n.fn.isSymbolNode || !functions.has(n.fn.name))
            throw Error("Hàm chưa được hỗ trợ.");
          if (n.args.length > 8) throw Error("Quá nhiều đối số.");
          n.args.forEach((a) => check(a, depth + 1));
          break;
        case "ParenthesisNode":
          check(n.content, depth + 1);
          break;
        case "ConditionalNode":
          check(n.condition, depth + 1);
          check(n.trueExpr, depth + 1);
          check(n.falseExpr, depth + 1);
          break;
        case "ArrayNode":
          if (n.items.length > 16) throw Error("Vectơ tối đa 16 phần tử.");
          if (
            n.items.some((a) => a.isArrayNode) &&
            (n.items.length > 4 ||
              n.items.some(
                (a) =>
                  !a.isArrayNode ||
                  a.items.length !== n.items[0].items.length ||
                  a.items.length > 4 ||
                  a.items.some((b) => b.isArrayNode),
              ))
          )
            throw Error("Ma trận tối đa 4×4 và phải có các hàng bằng nhau.");
          n.items.forEach((a) => check(a, depth + 1));
          break;
        default:
          throw Error(
            "Chỉ hỗ trợ biểu thức toán; không cho phép gán, truy cập thuộc tính hoặc mã lệnh.",
          );
      }
    }
    check(tree);
    return tree;
  }
  function run(n, scope, angle, exact) {
    switch (n.type) {
      case "ConstantNode":
        return exact ? m.fraction(String(n.value)) : n.value;
      case "ParenthesisNode":
        return run(n.content, scope, angle, exact);
      case "SymbolNode":
        if (Object.prototype.hasOwnProperty.call(scope, n.name))
          return scope[n.name];
        if (n.name === "pi") return Math.PI;
        if (n.name === "e") return Math.E;
        if (n.name === "i") return m.complex(0, 1);
        throw Error("Chưa gán giá trị cho " + n.name);
      case "ArrayNode":
        return n.items.map((a) => run(a, scope, angle, exact));
      case "ConditionalNode":
        return run(
          run(n.condition, scope, angle, exact) ? n.trueExpr : n.falseExpr,
          scope,
          angle,
          exact,
        );
      case "FunctionNode": {
        if (exact) throw Error("Không phải phép tính hữu tỉ chính xác.");
        let name = aliases[n.fn.name] || n.fn.name;
        let args = n.args.map((a) => run(a, scope, angle, false));
        if (
          ["factorial", "combinations", "permutations"].includes(name) &&
          args.some((x) => !Number.isInteger(x) || x < 0 || x > 170)
        )
          throw Error("Đối số nguyên phải trong khoảng 0–170.");
        if (name.endsWith("Deg")) {
          name = name.slice(0, -3);
          args[0] *= Math.PI / 180;
        } else if (["sin", "cos", "tan"].includes(name) && angle === "DEG")
          args[0] *= Math.PI / 180;
        let result = m[name](...args);
        if (["asin", "acos", "atan", "atan2"].includes(name) && angle === "DEG")
          result *= 180 / Math.PI;
        return result;
      }
      case "OperatorNode": {
        const a = run(n.args[0], scope, angle, exact),
          b = n.args[1] ? run(n.args[1], scope, angle, exact) : undefined;
        switch (n.op) {
          case "+":
            return b === undefined ? a : m.add(a, b);
          case "-":
            return b === undefined ? m.unaryMinus(a) : m.subtract(a, b);
          case "*":
            return m.multiply(a, b);
          case "/":
            return m.divide(a, b);
          case "^": {
            const exponent = Number(b);
            if (Math.abs(exponent) > 1000) throw Error("Số mũ tối đa 1000.");
            if (
              exact &&
              (!Number.isInteger(exponent) || Math.abs(exponent) > 100)
            )
              throw Error("Không phải lũy thừa hữu tỉ.");
            return m.pow(a, exact ? exponent : b);
          }
          case "!":
            if (exact || a < 0 || a > 170 || !Number.isInteger(a))
              throw Error("Giai thừa yêu cầu số nguyên 0–170.");
            return m.factorial(a);
          case "%":
            if (exact) throw Error("Không phải phép tính hữu tỉ.");
            return m.mod(a, b);
          case "==":
            return m.equal(a, b);
          case "!=":
            return !m.equal(a, b);
          case "<":
            return a < b;
          case ">":
            return a > b;
          case "<=":
            return a <= b;
          case ">=":
            return a >= b;
          case "and":
            return a && b;
          case "or":
            return a || b;
          case "not":
            return !a;
        }
      }
    }
    throw Error("Biểu thức không hợp lệ.");
  }
  function evaluate(text, scope = {}, angle = "RAD") {
    return run(parse(text, Object.keys(scope)), scope, angle, false);
  }
  function compile(text) {
    const tree = parse(text);
    return (scope) => {
      try {
        const v = run(tree, scope || {}, "RAD", false);
        return typeof v === "number" && Number.isFinite(v) ? v : NaN;
      } catch (_) {
        return NaN;
      }
    };
  }
  function exact(text) {
    try {
      const tree = parse(text);
      const value = run(tree, {}, "RAD", true);
      if (!m.isFraction(value)) return null;
      return value.toFraction();
    } catch (_) {
      return null;
    }
  }
  function format(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value))
        throw Error("Kết quả không hữu hạn hoặc phép tính không xác định.");
      return m.format(Math.abs(value) < 1e-14 ? 0 : value, { precision: 12 });
    }
    return m.format(value, { precision: 12 });
  }
  function derivative(fn, x) {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    return (fn(x + h) - fn(x - h)) / (2 * h);
  }
  function integral(fn, a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(b - a) > 1e6)
      throw Error("Khoảng tích phân không hợp lệ.");
    if (a === b) return 0;
    let budget = 50000;
    const sample = (x) => {
      if (--budget < 0)
        throw Error("Tích phân không hội tụ trong giới hạn tính toán.");
      const y = fn(x);
      if (!Number.isFinite(y))
        throw Error("Tích phân gặp điểm không xác định.");
      return y;
    };
    const simpson = (a, b, fa, fm, fb) => ((b - a) * (fa + 4 * fm + fb)) / 6;
    function adapt(a, b, fa, fm, fb, whole, tol, depth) {
      const mid = (a + b) / 2,
        fl = sample((a + mid) / 2),
        fr = sample((mid + b) / 2),
        left = simpson(a, mid, fa, fl, fm),
        right = simpson(mid, b, fm, fr, fb),
        delta = left + right - whole;
      if (Math.abs(delta) <= 15 * tol) return left + right + delta / 15;
      if (depth === 0)
        throw Error(
          "Tích phân không hội tụ hoặc có điểm gián đoạn. Hãy kiểm tra miền xác định.",
        );
      return (
        adapt(a, mid, fa, fl, fm, left, tol / 2, depth - 1) +
        adapt(mid, b, fm, fr, fb, right, tol / 2, depth - 1)
      );
    }
    const fa = sample(a),
      fm = sample((a + b) / 2),
      fb = sample(b),
      whole = simpson(a, b, fa, fm, fb),
      value = adapt(a, b, fa, fm, fb, whole, 1e-8, 20);
    if (!Number.isFinite(value)) throw Error("Tích phân không xác định.");
    return value;
  }
  function roots(fn, a = -10, b = 10, steps = 800) {
    const result = [];
    const add = (x) => {
      if (Math.abs(fn(x)) < 1e-6 && !result.some((r) => Math.abs(r - x) < 1e-4))
        result.push(x);
    };
    let x0 = a,
      y0 = fn(a);
    for (let k = 1; k <= steps; k++) {
      const x = a + ((b - a) * k) / steps,
        y = fn(x);
      if (Number.isFinite(y)) {
        if (Math.abs(y) < 1e-8) add(x);
        if (Number.isFinite(y0) && y * y0 < 0) {
          let lo = x0,
            hi = x,
            flo = y0;
          for (let j = 0; j < 50; j++) {
            let mid = (lo + hi) / 2,
              fmid = fn(mid);
            if (!Number.isFinite(fmid)) break;
            if (flo * fmid <= 0) hi = mid;
            else {
              lo = mid;
              flo = fmid;
            }
          }
          add((lo + hi) / 2);
        }
      }
      x0 = x;
      y0 = y;
    }
    return result;
  }
  function solve(fn, initial = 0) {
    let x = initial;
    for (let i = 0; i < 80; i++) {
      let y = fn(x);
      if (Number.isFinite(y) && Math.abs(y) < 1e-10) return x;
      let d = derivative(fn, x);
      if (!Number.isFinite(d) || Math.abs(d) < 1e-12) break;
      x -= y / d;
      if (!Number.isFinite(x) || Math.abs(x) > 1e12) break;
    }
    throw Error("Không hội tụ. Thử giá trị khởi tạo khác.");
  }
  function polynomial(coeff) {
    if (coeff.some((x) => !Number.isFinite(x)))
      throw Error("Hệ số không hợp lệ.");
    while (coeff.length > 1 && coeff[0] === 0) coeff.shift();
    if (coeff.length === 1) {
      if (coeff[0] === 0) return "Vô số nghiệm";
      return "Vô nghiệm";
    }
    if (coeff.length === 2) return [-coeff[1] / coeff[0]];
    if (coeff.length === 3) {
      const [a, b, c] = coeff,
        d = b * b - 4 * a * c;
      if (d < 0)
        return [
          m.divide(m.add(-b, m.complex(0, Math.sqrt(-d))), 2 * a),
          m.divide(m.subtract(-b, m.complex(0, Math.sqrt(-d))), 2 * a),
        ];
      return d === 0
        ? [-b / (2 * a)]
        : [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)];
    }
    const [a, b, c, d] = coeff;
    const p = (3 * a * c - b * b) / (3 * a * a),
      q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a),
      disc = (q * q) / 4 + (p * p * p) / 27,
      shift = b / (3 * a);
    if (disc > 1e-14) {
      const u = Math.cbrt(-q / 2 + Math.sqrt(disc)),
        v = Math.cbrt(-q / 2 - Math.sqrt(disc));
      return [
        u + v - shift,
        m.complex(-(u + v) / 2 - shift, (Math.sqrt(3) * (u - v)) / 2),
        m.complex(-(u + v) / 2 - shift, (-Math.sqrt(3) * (u - v)) / 2),
      ];
    }
    if (Math.abs(p) < 1e-14) return [-shift];
    const r = 2 * Math.sqrt(-p / 3),
      theta = Math.acos(Math.max(-1, Math.min(1, (3 * q) / (p * r)))) / 3;
    return [0, 1, 2].map(
      (k) => r * Math.cos(theta - (2 * k * Math.PI) / 3) - shift,
    );
  }
  root.MathEngine = {
    parse,
    evaluate,
    compile,
    exact,
    format,
    derivative,
    integral,
    roots,
    solve,
    polynomial,
    normalize,
    math: m,
  };
})(typeof window !== "undefined" ? window : globalThis);
