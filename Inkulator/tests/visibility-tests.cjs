const assert = require("node:assert/strict");
require("../js/geometry.js");
require("../js/solid-view.js");
const G = Geometry,
  V = SolidView;
let count = 0;
const test = (name, fn) => {
    fn();
    count++;
    console.log("PASS", name);
  },
  close = (a, b, t = 1e-7) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`),
  cube = (r = [-0.45, -0.55]) =>
    V.create("cube", { a: 4, b: 3, h: 6 }, r, 400, 350);
test("Standard cube view has 3 hidden edges meeting at rear vertex A", () => {
  const v = cube(),
    keys = v.edges
      .filter((e) => e.hidden)
      .map((e) => e.indices.join("-"))
      .sort();
  assert.deepEqual(keys, ["0-1", "0-3", "0-4"]);
  assert.ok(v.planes[1].front);
  assert.ok(!v.planes[0].front);
});
test("Textbook defaults keep a base edge horizontal, heights vertical and rear D hidden", () => {
  const v = V.create(
    "cube",
    { a: 4, b: 3, h: 6 },
    G.defaultRotation("cube"),
    400,
    350,
    "oblique",
  );
  close(v.pr.points[0][1], v.pr.points[1][1]);
  close(v.pr.points[2][1], v.pr.points[3][1]);
  close(v.pr.points[0][0], v.pr.points[4][0]);
  assert.deepEqual(
    v.edges
      .filter((e) => e.hidden)
      .map((e) => e.indices.join("-"))
      .sort(),
    ["0-3", "2-3", "3-7"],
  );
  for (const kind of [
    "cube",
    "box",
    "pyramid",
    "right-pyramid",
    "tetrahedron",
    "tri-prism",
    "hex-prism",
    "frustum",
  ]) {
    const view = V.create(
      kind,
      { a: 4, b: 3, h: 6 },
      G.defaultRotation(kind),
      400,
      350,
      G.defaultProjection(kind),
    );
    assert.ok(
      view.edges.some((e) => {
        const [a, b] = e.indices;
        return (
          Math.abs(view.model.vertices[a][2]) < 1e-7 &&
          Math.abs(view.model.vertices[b][2]) < 1e-7 &&
          Math.abs(e.a[1] - e.b[1]) < 1e-7
        );
      }),
      kind,
    );
  }
});
test("Coordinate axes have no opaque faces and remain solid at every angle", () => {
  for (const rotation of [
    [-0.45, -0.55],
    [0, 0],
    [1.1, 2.4],
  ]) {
    const v = V.create("axes", { a: 4, b: 3, h: 6 }, rotation, 400, 350);
    assert.equal(v.edges.length, 3);
    assert.ok(v.edges.every((e) => !e.hidden));
    assert.ok(v.segments([0, 0, 0], [4, 0, 0]).every((s) => !s.hidden));
  }
});
test("Triangular defaults keep the third base vertex clear of the opposite apex edge",()=>{
  for(const kind of ["tri-pyramid","tetrahedron"]){
    const v=V.create(kind,{a:4,b:3,h:3.5},G.defaultRotation(kind),370,320,G.defaultProjection(kind)),[A,B,C,S]=v.pr.points;
    const dx=S[0]-B[0],dy=S[1]-B[1],t=Math.max(0,Math.min(1,((C[0]-B[0])*dx+(C[1]-B[1])*dy)/(dx*dx+dy*dy)));
    assert.ok(Math.hypot(C[0]-B[0]-t*dx,C[1]-B[1]-t*dy)>16,kind+" has a distinct projected C instead of a nearly coincident edge");
    assert.ok(Math.hypot(C[0]-A[0],C[1]-A[1])>30);
  }
});
test("Camera looking from above sees the top face and hides the bottom center", () => {
  const v = cube([-Math.PI / 2, 0]);
  assert.ok(v.planes[1].front);
  assert.ok(!v.planes[0].front);
  assert.equal(v.hiddenAt([2, 2, 0]), true);
  assert.equal(v.hiddenAt([2, 2, 4]), false);
});
test("Base diagonal is dashed, top diagonal solid, space diagonal hidden", () => {
  const v = cube();
  assert.ok(v.segments([0, 0, 0], [4, 4, 0]).every((s) => s.hidden));
  assert.ok(v.segments([0, 0, 4], [4, 4, 4]).every((s) => !s.hidden));
  assert.ok(v.segments([0, 0, 0], [4, 4, 4]).every((s) => s.hidden));
});
test("A line crossing behind the solid is split into visible/hidden/visible intervals", () => {
  const parts = cube().segments([-20, -20, 0], [12, 12, 0]);
  assert.deepEqual(
    parts.map((p) => p.hidden),
    [false, true, false],
  );
});
function triangleHit(origin, dir, A, B, C) {
  const e1 = G.sub(B, A),
    e2 = G.sub(C, A),
    h = G.cross(dir, e2),
    det = G.dot(e1, h);
  if (Math.abs(det) < 1e-9) return false;
  const s = G.sub(origin, A),
    u = G.dot(s, h) / det;
  if (u < 1e-8 || u > 1 - 1e-8) return false;
  const q = G.cross(s, e1),
    v = G.dot(dir, q) / det;
  if (v < 1e-8 || u + v > 1 - 1e-8) return false;
  return G.dot(e2, q) / det > 1e-7;
}
test("Visibility matches independent ray/triangle intersections over many rotations", () => {
  for (const projection of ["orthographic", "oblique"])
    for (const kind of [
      "cube",
      "box",
      "pyramid",
      "right-pyramid",
      "tetrahedron",
      "tri-prism",
      "hex-prism",
      "frustum",
    ])
      for (let i = 0; i < 18; i++) {
        const view = V.create(
            kind,
            { a: 4, b: 3, h: 6 },
            [-1.1 + i * 0.131, -2.6 + i * 0.317],
            400,
            350,
            projection,
          ),
          model = view.model;
        for (let j = 0; j < 7; j++) {
          const point = [-0.35 + j * 0.83, 0.27 + j * 0.41, -0.24 + j * 0.77],
            oracle = model.faces.some((f) => {
              for (let k = 1; k < f.length - 1; k++)
                if (
                  triangleHit(
                    point,
                    view.viewDirection,
                    model.vertices[f[0]],
                    model.vertices[f[k]],
                    model.vertices[f[k + 1]],
                  )
                )
                  return true;
              return false;
            });
          assert.equal(
            view.hiddenAt(point),
            oracle,
            kind + " rotation " + i + " point " + j,
          );
        }
      }
});
test("Outward face orientation is stable for every mesh, even if winding is reversed", () => {
  for (const [kind] of G.solidCatalog) {
    const model = G.mesh(kind, { a: 4, b: 3, h: 6 });
    if (!model.faces.length) continue;
    const faces = V.outwardFaces(
        model.vertices,
        model.faces.map((f) => f.slice().reverse()),
      ),
      center = G.scale(
        model.vertices.reduce((s, p) => G.add(s, p), [0, 0, 0]),
        1 / model.vertices.length,
      );
    for (const f of faces) {
      const n = V.normal(model.vertices, f),
        c = G.scale(
          f.reduce((s, i) => G.add(s, model.vertices[i]), [0, 0, 0]),
          1 / f.length,
        );
      assert.ok(G.dot(n, G.sub(c, center)) >= -1e-7, kind);
    }
  }
});
test("Sphere surface has single poles, nonzero edges and watertight topology", () => {
  const m = G.mesh("sphere", { a: 3, b: 3, h: 3 });
  m.vertices.forEach((p) => close(G.norm(p), 3));
  const used = new Set(m.faces.flat());
  assert.equal(used.size - m.edges.length + m.faces.length, 2);
  for (const [a, b] of m.edges)
    assert.ok(G.norm(G.sub(m.vertices[a], m.vertices[b])) > 1e-6);
  const refs = new Map();
  for (const f of m.faces)
    for (let i = 0; i < f.length; i++) {
      const k = [f[i], f[(i + 1) % f.length]].sort((a, b) => a - b).join(",");
      refs.set(k, (refs.get(k) || 0) + 1);
    }
  assert.ok([...refs.values()].every((n) => n === 2));
  // Old saved vertex references keep the same mathematical coordinates.
  assert.equal(m.vertices.length, 17 * 28);
  for (let j = 0; j <= 16; j++)
    for (let i = 0; i < 28; i++) {
      const p = m.vertices[j * 28 + i];
      close(
        p[0],
        3 * Math.sin((j * Math.PI) / 16) * Math.cos((i * 2 * Math.PI) / 28),
      );
      close(
        p[1],
        3 * Math.sin((j * Math.PI) / 16) * Math.sin((i * 2 * Math.PI) / 28),
      );
      close(p[2], 3 * Math.cos((j * Math.PI) / 16));
    }
  const cone = G.mesh("cone", { a: 3, b: 2, h: 6 });
  assert.equal(cone.vertices.length, 80);
  for (let i = 40; i < 80; i++)
    cone.vertices[i].forEach((v, j) => close(v, [0, 0, 6][j]));
  for (const [a, b] of cone.edges)
    assert.ok(G.norm(G.sub(cone.vertices[a], cone.vertices[b])) > 1e-6);
});
test("Sphere drawing is a circular contour and one correctly split equator", () => {
  for (const rot of [
    [-0.45, -0.55],
    [0.4, 1.4],
    [-1.1, -2.3],
  ]) {
    const v = V.create("sphere", { a: 3, b: 3, h: 3 }, rot, 400, 350),
      round = V.roundSegments(v, {});
    assert.equal(round.outline.length, 144);
    assert.equal(round.curves.length, 144);
    for (const s of round.outline) {
      assert.equal(s.hidden, false);
      close(
        Math.hypot(s.a[0] - round.center[0], s.a[1] - round.center[1]),
        round.radius,
      );
    }
    assert.ok(
      round.curves.some((s) => s.hidden) && round.curves.some((s) => !s.hidden),
    );
  }
});
test("Round solids use only ring curves and two tangent generators", () => {
  for (const kind of ["cylinder", "cone", "cone-frustum"]) {
    const v = V.create(kind, { a: 4, b: 2, h: 6 }, [-0.45, -0.55], 400, 350),
      drawing = V.roundSegments(v, {});
    assert.equal(drawing.outline.length, 2);
    assert.ok(drawing.curves.length <= 288);
    assert.ok(drawing.outline.every((s) => !s.hidden));
  }
});
test("Recreating views rapidly never changes the same orientation result", () => {
  const expected = cube().edges.map((e) => e.hidden);
  for (let i = 0; i < 100; i++) {
    cube([i * 0.137, i * 0.319]);
    assert.deepEqual(
      cube().edges.map((e) => e.hidden),
      expected,
    );
  }
});
console.log(count + " hidden-line geometry tests passed.");
