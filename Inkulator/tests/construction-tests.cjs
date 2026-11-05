const assert = require("node:assert/strict");
require("../js/geometry.js");
require("../js/constructions.js");
let count = 0;
const test = (name, fn) => {
    fn();
    count++;
    console.log("PASS", name);
  },
  close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`),
  flat = () => ({ type: "geometry", data: Geometry.flat("triangle") }),
  cube = () => ({
    type: "solid",
    data: {
      kind: "cube",
      params: { a: 4, b: 4, h: 4 },
      rotation: [-0.45, -0.55],
      aux: [],
    },
  });
test("A midpoint and a midpoint of a midpoint are dependent coordinates", () => {
  const o = flat();
  o.data.constructions = [
    { id: "M", type: "midpoint", refs: ["v:0", "v:1"], label: "M" },
    { id: "N", type: "midpoint", refs: ["c:M", "v:2"], label: "N" },
    { id: "AM", type: "segment", refs: ["v:0", "c:N"] },
  ];
  let r = Constructions.build(o);
  assert.equal(r.warnings.length, 0);
  assert.deepEqual(r.points.get("c:M").coords, [2.5, 0]);
  o.data.points[1] = [8, 2];
  r = Constructions.build(o);
  assert.deepEqual(r.points.get("c:M").coords, [4, 1]);
  assert.deepEqual(r.points.get("c:N").coords, [2.8, 2.5]);
});
test("A perpendicular foot is defined by projection, not screen pixels", () => {
  const o = cube();
  o.data.constructions = [
    { id: "H", type: "perpendicular", refs: ["v:0", "v:1", "v:6"], label: "H" },
  ];
  const r = Constructions.build(o),
    foot = r.points.get("c:H").coords;
  assert.deepEqual(foot, [4, 0, 0]);
  close(Geometry.dot(Geometry.sub([4, 4, 4], foot), [4, 0, 0]), 0);
});
test("A parallel line maintains the base direction", () => {
  const o = flat();
  o.data.constructions = [
    { id: "l", type: "parallel", refs: ["v:0", "v:1", "v:2"] },
  ];
  const r = Constructions.build(o).items[0];
  close(r.endpoints[0][1], r.endpoints[1][1]);
});
test("Angle and distance come from the true 3D model", () => {
  const o = cube();
  o.data.constructions = [
    { id: "angle", type: "angle", refs: ["v:0", "v:1", "v:2"] },
    { id: "diagonal", type: "measure", refs: ["v:0", "v:6"] },
  ];
  const r = Constructions.build(o);
  close(r.items[0].angle, 90);
  close(r.items[1].length, 4 * Math.sqrt(3));
});
test("Cube diagonal plane produces a 4-vertex rectangular section", () => {
  const o = cube();
  o.data.constructions = [
    { id: "slice", type: "section", refs: ["v:0", "v:2", "v:6"] },
  ];
  const r = Constructions.build(o).items[0];
  assert.equal(r.points.length, 4);
  close(r.area, 16 * Math.sqrt(2));
});
test("Three edge midpoints create a triangular section, updating when a changes", () => {
  const o = cube();
  o.data.constructions = [
    { id: "M", type: "midpoint", refs: ["v:0", "v:1"] },
    { id: "N", type: "midpoint", refs: ["v:0", "v:3"] },
    { id: "P", type: "midpoint", refs: ["v:0", "v:4"] },
    { id: "slice", type: "section", refs: ["c:M", "c:N", "c:P"] },
  ];
  let r = Constructions.build(o);
  assert.equal(r.items.at(-1).points.length, 3);
  close(r.items.at(-1).area, 2 * Math.sqrt(3));
  o.data.params.a = 8;
  r = Constructions.build(o);
  close(r.items.at(-1).area, 8 * Math.sqrt(3));
});
test("A circle through 3 points is rebuilt correctly", () => {
  const o = flat();
  o.data.points = [
    [0, 0],
    [4, 0],
    [0, 3],
  ];
  o.data.constructions = [
    { id: "circle", type: "circumcircle", refs: ["v:0", "v:1", "v:2"] },
  ];
  const item = Constructions.build(o).items[0];
  assert.deepEqual(item.center, [2, 1.5]);
  close(item.radius, 2.5);
});
test("Collinear planes and zero-length references produce explicit warnings", () => {
  const o = cube();
  o.data.constructions = [
    { id: "M", type: "midpoint", refs: ["v:0", "v:1"] },
    { id: "bad", type: "section", refs: ["v:0", "c:M", "v:1"] },
  ];
  const r = Constructions.build(o);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0].message, /thẳng hàng/);
  assert.equal(r.items.filter((i) => i.type === "section").length, 0);
});
test("Cyclic, forward and duplicate IDs are rejected on import", () => {
  for (const constructions of [
    [{ id: "a", type: "midpoint", refs: ["c:a", "v:0"] }],
    [
      { id: "a", type: "segment", refs: ["v:0", "c:b"] },
      { id: "b", type: "midpoint", refs: ["v:0", "v:1"] },
    ],
    [
      { id: "a", type: "midpoint", refs: ["v:0", "v:1"] },
      { id: "a", type: "midpoint", refs: ["v:1", "v:2"] },
    ],
  ]) {
    const o = flat();
    o.data.constructions = constructions;
    assert.throws(() => Constructions.validate(o.data));
  }
});
test("Projection of added points uses the original camera frame", () => {
  const model = Geometry.mesh("cube", { a: 4, b: 4, h: 4 }),
    base = Geometry.project(model.vertices, [0.3, 0.5], 400, 350),
    withExtra = Geometry.project(
      [...model.vertices, [100, 100, 100]],
      [0.3, 0.5],
      400,
      350,
      model.vertices,
    );
  base.points.forEach((p, i) => {
    close(p[0], withExtra.points[i][0]);
    close(p[1], withExtra.points[i][1]);
  });
});
console.log(count + " construction tests passed.");
