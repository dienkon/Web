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
test("Intersections of two lines are exact and update with their endpoints", () => {
  const o = {
    type: "geometry",
    data: {
      kind: "square",
      points: [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
      constructions: [
        {
          id: "I",
          type: "intersection",
          refs: ["v:0", "v:2", "v:1", "v:3"],
          label: "I",
        },
      ],
    },
  };
  Constructions.validate(o.data);
  let r = Constructions.build(o);
  assert.deepEqual(r.points.get("c:I").coords, [2, 2]);
  o.data.points[2] = [8, 4];
  r = Constructions.build(o);
  close(r.points.get("c:I").coords[0], 8 / 3);
  close(r.points.get("c:I").coords[1], 4 / 3);
});
test("3D line intersections reject projected crossings of skew lines", () => {
  assert.deepEqual(
    Constructions.intersection([0, 0, 0], [4, 4, 4], [0, 4, 0], [4, 0, 4]),
    [2, 2, 2],
  );
  assert.throws(
    () =>
      Constructions.intersection([0, 0, 0], [4, 4, 4], [0, 4, 1], [4, 0, 1]),
    /chéo nhau/,
  );
});
test("Parallel, coincident and zero-length lines do not invent intersection points", () => {
  assert.throws(
    () => Constructions.intersection([0, 0], [4, 0], [0, 1], [4, 1]),
    /song song/,
  );
  assert.throws(
    () => Constructions.intersection([0, 0], [4, 0], [1, 0], [6, 0]),
    /trùng nhau/,
  );
  assert.throws(
    () => Constructions.intersection([0, 0], [0, 0], [0, 1], [4, 1]),
    /trùng nhau/,
  );
});
test("Centroids are dependent points usable by connecting segments", () => {
  const o = flat();
  o.data.points = [
    [0, 0],
    [6, 0],
    [0, 3],
  ];
  o.data.constructions = [
    { id: "G", type: "centroid", refs: ["v:0", "v:1", "v:2"], label: "G" },
    { id: "AG", type: "segment", refs: ["v:0", "c:G"] },
  ];
  Constructions.validate(o.data);
  let r = Constructions.build(o);
  assert.deepEqual(r.points.get("c:G").coords, [2, 1]);
  assert.equal(r.items[0].medians.length, 3);
  close(r.items[1].length, Math.sqrt(5));
  o.data.points[1] = [9, 0];
  r = Constructions.build(o);
  assert.deepEqual(r.points.get("c:G").coords, [3, 1]);
  o.data.points[2] = [3, 0];
  assert.match(Constructions.build(o).warnings[0].message, /thẳng hàng/);
});
test("Medians and internal angle bisectors use actual triangle coordinates", () => {
  const o = flat();
  o.data.points = [
    [4, 0],
    [0, 0],
    [0, 3],
  ];
  o.data.constructions = [
    { id: "M", type: "median", refs: ["v:0", "v:1", "v:2"] },
    { id: "D", type: "bisector", refs: ["v:0", "v:1", "v:2"] },
  ];
  const r = Constructions.build(o);
  assert.deepEqual(r.points.get("c:M").coords, [0, 1.5]);
  const d = r.points.get("c:D").coords;
  close(d[0], 12 / 7);
  close(d[1], 12 / 7);
  const u = Geometry.sub(o.data.points[0], o.data.points[1]),
    v = Geometry.sub(o.data.points[2], o.data.points[1]);
  close(
    Geometry.dot(u, d) / Geometry.norm(u),
    Geometry.dot(v, d) / Geometry.norm(v),
  );
});
test("Intersections can depend on constructed parallel lines and survive validation", () => {
  const o = {
    type: "geometry",
    data: {
      kind: "square",
      points: [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
      constructions: [
        { id: "p", type: "parallel", refs: ["v:0", "v:1", "v:3"] },
        {
          id: "I",
          type: "intersection",
          refs: ["c:p:A", "c:p:B", "v:0", "v:2"],
        },
      ],
    },
  };
  Constructions.validate(o.data);
  assert.deepEqual(Constructions.build(o).points.get("c:I").coords, [4, 4]);
  o.data.points[3] = [0, 6];
  assert.deepEqual(Constructions.build(o).points.get("c:I").coords, [6, 6]);
  o.data.constructions.reverse();
  assert.throws(() => Constructions.validate(o.data), /tham chiếu/);
});
test("Teacher geometry: rightAngle, equalTick, parallelArrow, and altitude", () => {
  const o = flat();
  o.data.constructions = [
    { id: "ra", type: "rightAngle", refs: ["v:1", "v:0", "v:2"] },
    { id: "eq", type: "equalTick", refs: ["v:0", "v:1"], tickCount: 2 },
    { id: "pa", type: "parallelArrow", refs: ["v:0", "v:1"], arrowCount: 1 },
    { id: "alt", type: "altitude", refs: ["v:2", "v:0", "v:1"] },
  ];
  Constructions.validate(o.data);
  const r = Constructions.build(o);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.items[0].type, "rightAngle");
  assert.equal(r.items[1].tickCount, 2);
  assert.equal(r.items[2].arrowCount, 1);
  const foot = r.points.get("c:alt").coords;
  close(foot[1], 0); // Foot on horizontal base [0,0] to [5,0]
});
test("Teacher geometry: orthocenter and incenter", () => {
  const o = {
    type: "geometry",
    data: {
      kind: "right",
      points: [
        [0, 0],
        [4, 0],
        [0, 3],
      ],
      constructions: [
        { id: "ortho", type: "orthocenter", refs: ["v:0", "v:1", "v:2"] },
        { id: "inc", type: "incenter", refs: ["v:0", "v:1", "v:2"] },
      ],
    },
  };
  Constructions.validate(o.data);
  const r = Constructions.build(o);
  assert.equal(r.warnings.length, 0);
  // Orthocenter of right triangle at right-angle vertex [0, 0]
  assert.deepEqual(r.points.get("c:ortho").coords, [0, 0]);
  // Incenter of 3-4-5 right triangle at [1, 1]
  close(r.points.get("c:inc").coords[0], 1);
  close(r.points.get("c:inc").coords[1], 1);
});
test("Teacher geometry: custom vertex labels and solid S.ABC pyramid", () => {
  const o = {
    type: "solid",
    data: {
      kind: "s-abc-right",
      params: { a: 4, b: 3, h: 5 },
      vertexLabels: { 0: "A", 1: "B", 2: "C", 3: "S" },
      constructions: [
        { id: "M", type: "midpoint", refs: ["v:1", "v:2"], label: "M" },
        { id: "AM", type: "segment", refs: ["v:0", "c:M"] },
      ],
    },
  };
  Constructions.validate(o.data, true);
  const r = Constructions.build(o);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.points.get("v:3").label, "S");
  assert.deepEqual(r.points.get("c:M").coords, [2, 1.5, 0]);
  const m = Geometry.solidMeasurements("s-abc-right", o.data.params);
  close(m.volume, 10); // (1/2 * 4 * 3) * 5 / 3 = 10
});
console.log(count + " construction tests passed.");
