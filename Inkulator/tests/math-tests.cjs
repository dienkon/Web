const assert = require("node:assert/strict");
const memory = new Map();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    setItem: (k, v) => memory.set(k, v),
    getItem: (k) => memory.get(k) || null,
    removeItem: (k) => memory.delete(k),
  },
  configurable: true,
});
require("../js/math-engine.js");
require("../js/geometry.js");
require("../js/state.js");
const E = globalThis.MathEngine,
  G = globalThis.Geometry,
  S = globalThis.Store;
let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log("PASS", name);
};
const close = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} ≠ ${b}`);
test("Exact fraction: 1/2 + 1/3 = 5/6", () =>
  assert.equal(E.exact("1/2+1/3"), "5/6"));
test("Arithmetic, powers, precedence and implicit multiplication", () => {
  assert.equal(E.evaluate("2^10"), 1024);
  assert.equal(E.evaluate("-2^2"), -4);
  assert.equal(E.evaluate("2x+1", { x: 3 }), 7);
  assert.equal(E.evaluate("2^3^2"), 512);
});
test("DEG and RAD remain distinct, explicit ° is respected", () => {
  close(E.evaluate("sin(30)", {}, "DEG"), 0.5);
  close(E.evaluate("cos(60)", {}, "DEG"), 0.5);
  close(E.evaluate("sin(pi/6)", {}, "RAD"), 0.5);
  close(E.evaluate("sin(30°)", {}, "DEG"), 0.5);
  close(E.evaluate("sin(30°)", {}, "RAD"), 0.5);
  assert.notEqual(E.evaluate("sin(30)", {}, "RAD"), 0.5);
});
test("Factorial, combinations, permutations and GCD", () => {
  assert.equal(E.evaluate("5!"), 120);
  assert.equal(E.evaluate("C(5,2)"), 10);
  assert.equal(E.evaluate("P(5,2)"), 20);
  assert.equal(E.evaluate("gcd(12,18)"), 6);
});
test("No fabricated exactness for irrational / decimal fallback", () => {
  assert.equal(E.exact("sqrt(2)"), null);
  assert.equal(E.exact("sin(30)"), null);
  assert.equal(E.exact("0.1+0.2"), "3/10");
  assert.equal(E.exact("4^(1/2)"), null);
});
test("Quadratic roots 2, 3; cubic and degenerate equations", () => {
  assert.deepEqual(E.polynomial([1, -5, 6]), [2, 3]);
  const roots = E.polynomial([1, -6, 11, -6]).sort((a, b) => a - b);
  roots.forEach((r, i) => close(r, i + 1));
  assert.equal(E.polynomial([0, 0, 0]), "Vô số nghiệm");
  assert.equal(E.polynomial([0, 0, 1]), "Vô nghiệm");
  assert.equal(E.polynomial([1, 0, 1])[0].im, 1);
});
test("Matrix determinant, inverse, vectors, complex", () => {
  close(E.evaluate("det([[1,2],[3,4]])"), -2);
  close(E.evaluate("norm([3,4])"), 5);
  close(E.evaluate("dot([1,2],[3,4])"), 11);
  assert.deepEqual(E.evaluate("cross([1,0,0],[0,1,0])"), [0, 0, 1]);
  close(E.evaluate("abs(3+4i)"), 5);
  E.evaluate("inv([[1,0],[0,2]])")
    .flat()
    .forEach((v, i) => close(v, [1, 0, 0, 0.5][i]));
});
test("Numerical roots, derivative, integral, Newton convergence", () => {
  const f = (x) => x * x - 4;
  const r = E.roots(f, -5, 5);
  assert.equal(r.length, 2);
  close(r[0], -2);
  close(r[1], 2);
  close(
    E.derivative((x) => x * x, 3),
    6,
    1e-6,
  );
  close(
    E.integral((x) => x * x, 0, 1),
    1 / 3,
    1e-10,
  );
  close(
    E.solve((x) => x * x * x - 2 * x - 5, 2),
    2.0945514815,
    1e-8,
  );
  assert.throws(() => E.solve((x) => x * x + 1, 0), /hội tụ/);
});
test("No false pole roots; piecewise and parameterized functions", () => {
  assert.equal(E.roots((x) => 1 / (x - 2), -5, 5).length, 0);
  close(E.compile("a*x^2+b*x+c")({ a: 2, b: 1, c: -1, x: 3 }), 20);
  close(E.compile("x < 0 ? -x : x")({ x: -4 }), 4);
});
test("Integration rejects poles and reverses limits correctly", () => {
  assert.throws(
    () => E.integral((x) => 1 / (x - 0.1234567), 0, 1),
    /hội tụ|gián đoạn|xác định/,
  );
  close(
    E.integral((x) => x * x, 1, 0),
    -1 / 3,
  );
  close(E.integral(Math.sin, 0, Math.PI), 2, 1e-8);
});
test("Security: rejects assignment, property access, blocks, unknown calls and huge complexity", () => {
  for (const expression of [
    "x=2",
    'import("x")',
    'parse("x")',
    'evaluate("2")',
    "x.constructor",
    "[1,2][1]",
    "1;2",
    "foo(1)",
    "2^10001",
    "factorial(1000000)",
  ])
    assert.throws(() => E.evaluate(expression), undefined, expression);
  assert.throws(() => E.evaluate("(".repeat(25) + "1" + ")".repeat(25)));
  assert.throws(() => E.evaluate("det([[1,2],[3]])"));
});
test("Cube a=3 has volume 27 and surface 54", () => {
  const r = G.solidMeasurements("cube", { a: 3, b: 3, h: 3 });
  close(r.volume, 27);
  close(r.area, 54);
});
test("Right pyramid AB=4, SA=6 perpendicular: V=32", () => {
  const r = G.solidMeasurements("right-pyramid", { a: 4, b: 3, h: 6 }),
    mesh = G.mesh("right-pyramid", { a: 4, b: 3, h: 6 });
  close(r.volume, 32);
  assert.deepEqual(mesh.vertices[4], [0, 0, 6]);
  close(
    G.dot(
      G.sub(mesh.vertices[4], mesh.vertices[0]),
      G.sub(mesh.vertices[1], mesh.vertices[0]),
    ),
    0,
  );
});
test("Every solid has finite real 3D model and projections", () => {
  for (const [kind] of G.solidCatalog) {
    const m = G.mesh(kind, { a: 3, b: 2, h: 5 });
    assert.ok(m.vertices.length >= 4);
    assert.ok(m.vertices.flat().every(Number.isFinite));
    const p = G.project(m.vertices, [0.4, 0.7], 400, 300);
    assert.ok(p.points.flat().every(Number.isFinite));
    if (kind !== "axes") {
      const v = G.solidMeasurements(kind, { a: 3, b: 2, h: 5 });
      assert.ok(v.volume > 0 && v.area > 0, kind);
    }
  }
});
test("Dynamic triangle dependent constructions and area", () => {
  const p = [
      [0, 0],
      [4, 0],
      [0, 3],
    ],
    d = G.triangleData(p);
  assert.deepEqual(d.midpoint, [2, 1.5]);
  close(d.inradius, 1);
  close(G.flatMeasurements({ kind: "triangle", points: p }).area, 6);
  p[1] = [6, 0];
  assert.deepEqual(G.triangleData(p).midpoint, [3, 1.5]);
});
test("Every 2D catalog entry has valid finite coordinates", () => {
  for (const [kind] of G.flatCatalog) {
    const data = G.flat(kind);
    assert.ok(data.points.flat().every(Number.isFinite), kind);
    assert.ok(G.flatMeasurements(data).area > 0, kind);
  }
});
test("JSON roundtrip retains typed editable objects and transforms", () => {
  const n = S.book();
  n.pages[0].objects = [
    S.object("solid", {
      kind: "cube",
      params: { a: 3, b: 3, h: 3 },
      rotation: [0.1, 0.7],
      aux: [],
      live: true,
    }),
    S.object("geometry", G.flat("median")),
    S.object("text", { text: "Toán tiếng Việt: ∫ √ π", fontSize: 22 }),
  ];
  const restored = S.validate(JSON.parse(JSON.stringify(S.envelope())));
  assert.deepEqual(
    restored.pages[0].objects.map((o) => o.data),
    n.pages[0].objects.map((o) => o.data),
  );
  assert.notEqual(restored.id, n.id);
});
test("Import rejects unsupported version and invalid coordinates", () => {
  const raw = S.envelope();
  raw.version = 2;
  assert.throws(() => S.validate(raw), /phiên bản/);
  raw.version = 1;
  raw.notebook.pages[0].objects[0].position.x = Infinity;
  assert.throws(() => S.validate(raw), /Tọa độ/);
});
test("Import rejects corrupt table and invalid auxiliary references", () => {
  const raw = S.envelope();
  raw.notebook.pages[0].objects = [
    S.object("text", { text: "x", table: "invalid" }),
  ];
  assert.throws(() => S.validate(raw), /Bảng/);
  raw.notebook.pages[0].objects = [
    S.object("geometry", {
      ...G.flat("median"),
      aux: [{ type: "segment", a: 0, b: 99 }],
    }),
  ];
  assert.throws(() => S.validate(raw), /Đường phụ/);
});
test("Local restoration preserves document, page, object IDs and dates", () => {
  const before = S.clone(S.book());
  S.save();
  S.load();
  assert.equal(S.book().id, before.id);
  assert.equal(S.current().id, before.pages[0].id);
  assert.equal(S.current().objects[0].id, before.pages[0].objects[0].id);
  assert.equal(S.book().created, before.created);
});
test("Unified history covers objects, styles and pages", () => {
  S.transaction(() => (S.current().objects[0].position.x = 100));
  S.transaction(() => (S.current().objects[0].style.color = "#ff0000"));
  S.undo();
  assert.notEqual(S.current().objects[0].style.color, "#ff0000");
  S.undo();
  assert.equal(S.current().objects[0].position.x, 150);
  S.redo();
  assert.equal(S.current().objects[0].position.x, 100);
});
test("Store: deleteBook removes notebooks and resets empty book when deleting last", () => {
  const nb1 = S.notebook();
  nb1.title = "Book 1";
  const nb2 = S.notebook();
  nb2.title = "Book 2";
  S.state.notebooks = [nb1, nb2];
  S.state.active = 1;
  assert.equal(S.state.notebooks.length, 2);
  const ok = S.deleteBook(1);
  assert.equal(ok, true);
  assert.equal(S.state.notebooks.length, 1);
  assert.equal(S.state.active, 0);
  assert.equal(S.book().title, "Book 1");
  const ok2 = S.deleteBook(0);
  assert.equal(ok2, true);
  assert.equal(S.state.notebooks.length, 1);
  assert.equal(S.book().title, "Sổ tay Toán học");
});
console.log(`\n${passed} tests passed.`);
