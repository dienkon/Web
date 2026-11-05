(function (root) {
  "use strict";
  const sub = (a, b) => a.map((v, i) => v - b[i]),
    add = (a, b) => a.map((v, i) => v + b[i]),
    scale = (a, s) => a.map((v) => v * s),
    dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ],
    norm = (a) => Math.hypot(...a),
    mid = (a, b) => scale(add(a, b), 0.5);
  const flatCatalog = [
    ["triangle", "Tam giác ABC"],
    ["equilateral", "Tam giác đều"],
    ["isosceles", "Tam giác cân"],
    ["right", "Tam giác vuông"],
    ["square", "Hình vuông"],
    ["rectangle", "Hình chữ nhật"],
    ["parallelogram", "Hình bình hành"],
    ["rhombus", "Hình thoi"],
    ["trapezoid", "Hình thang cân"],
    ["pentagon", "Ngũ giác đều"],
    ["hexagon", "Lục giác đều"],
    ["circle", "Đường tròn"],
    ["median", "Tam giác · trung tuyến"],
    ["altitude", "Tam giác · đường cao"],
    ["bisector", "Tam giác · phân giác"],
    ["incircle", "Đường tròn nội tiếp"],
    ["circumcircle", "Đường tròn ngoại tiếp"],
    ["centroid", "Trọng tâm tam giác"],
  ];
  const solidCatalog = [
    ["cube", "Hình lập phương"],
    ["box", "Hình hộp chữ nhật"],
    ["pyramid", "Chóp đáy vuông"],
    ["right-pyramid", "Chóp SA ⊥ đáy"],
    ["tetrahedron", "Tứ diện đều"],
    ["tri-prism", "Lăng trụ tam giác"],
    ["hex-prism", "Lăng trụ lục giác"],
    ["frustum", "Chóp cụt"],
    ["cylinder", "Hình trụ"],
    ["cone", "Hình nón"],
    ["cone-frustum", "Hình nón cụt"],
    ["sphere", "Hình cầu"],
    ["axes", "Hệ trục Oxyz"],
  ];
  function flat(kind) {
    let points;
    switch (kind) {
      case "square":
        points = [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 4],
        ];
        break;
      case "rectangle":
        points = [
          [0, 0],
          [6, 0],
          [6, 3],
          [0, 3],
        ];
        break;
      case "parallelogram":
        points = [
          [0, 0],
          [5, 0],
          [6, 3],
          [1, 3],
        ];
        break;
      case "rhombus":
        points = [
          [0, 2],
          [3, 0],
          [6, 2],
          [3, 4],
        ];
        break;
      case "trapezoid":
        points = [
          [0, 0],
          [6, 0],
          [4.5, 3],
          [1.5, 3],
        ];
        break;
      case "pentagon":
      case "hexagon": {
        const n = kind === "pentagon" ? 5 : 6;
        points = Array.from({ length: n }, (_, i) => [
          3 + 3 * Math.cos((2 * Math.PI * i) / n),
          3 + 3 * Math.sin((2 * Math.PI * i) / n),
        ]);
        break;
      }
      case "right":
        points = [
          [0, 0],
          [5, 0],
          [0, 4],
        ];
        break;
      case "equilateral":
        points = [
          [0, 0],
          [4, 0],
          [2, Math.sqrt(12)],
        ];
        break;
      case "isosceles":
        points = [
          [0, 0],
          [5, 0],
          [2.5, 4],
        ];
        break;
      case "circle":
        points = [
          [0, 0],
          [3, 0],
        ];
        break;
      default:
        points = [
          [0, 0],
          [5, 0],
          [1.6, 4],
        ];
    }
    return {
      kind,
      points,
      labels: true,
      measures: false,
      aux: [],
      unit: "đv",
      frame: kind === "circle" ? [-4, 4, -4, 4] : [-1, 7, -1, 6],
    };
  }
  function flatMeasurements(data) {
    const p = data.points;
    if (data.kind === "circle") {
      const r = norm(sub(p[1], p[0]));
      return { radius: r, perimeter: 2 * Math.PI * r, area: Math.PI * r * r };
    }
    return {
      perimeter: p.reduce(
        (s, a, i) => s + norm(sub(a, p[(i + 1) % p.length])),
        0,
      ),
      area:
        Math.abs(
          p.reduce(
            (s, a, i) =>
              s +
              a[0] * p[(i + 1) % p.length][1] -
              a[1] * p[(i + 1) % p.length][0],
            0,
          ),
        ) / 2,
    };
  }
  function triangleData(p) {
    const [A, B, C] = p,
      a = norm(sub(B, C)),
      b = norm(sub(A, C)),
      c = norm(sub(A, B)),
      s = (a + b + c) / 2,
      area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    const incenter = scale(
      add(add(scale(A, a), scale(B, b)), scale(C, c)),
      1 / (a + b + c),
    );
    const D =
      2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const sq = (p) => dot(p, p);
    let circumcenter = null;
    if (Math.abs(D) > 1e-8)
      circumcenter = [
        (sq(A) * (B[1] - C[1]) +
          sq(B) * (C[1] - A[1]) +
          sq(C) * (A[1] - B[1])) /
          D,
        (sq(A) * (C[0] - B[0]) +
          sq(B) * (A[0] - C[0]) +
          sq(C) * (B[0] - A[0])) /
          D,
      ];
    const bc = sub(C, B),
      foot = add(B, scale(bc, dot(sub(A, B), bc) / dot(bc, bc)));
    return {
      incenter,
      inradius: area / s,
      circumcenter,
      circumradius: circumcenter ? norm(sub(A, circumcenter)) : 0,
      midpoint: mid(B, C),
      centroid: scale(add(add(A, B), C), 1 / 3),
      foot,
      bisector: scale(add(scale(B, b), scale(C, c)), 1 / (b + c)),
    };
  }
  function mesh(kind, params = { a: 4, b: 3, h: 6 }) {
    let { a = 4, b = 3, h = 6 } = params,
      vertices = [],
      faces = [],
      labels = [];
    if (![a, b, h].every((x) => Number.isFinite(x) && x > 0 && x <= 10000))
      throw Error("Kích thước phải lớn hơn 0 và không quá 10000.");
    const ring = (n, r, z, offset = 0) =>
      Array.from({ length: n }, (_, i) => [
        r * Math.cos(offset + (2 * Math.PI * i) / n),
        r * Math.sin(offset + (2 * Math.PI * i) / n),
        z,
      ]);
    switch (kind) {
      case "cube":
      case "box":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [a, kind === "cube" ? a : b, 0],
          [0, kind === "cube" ? a : b, 0],
          [0, 0, kind === "cube" ? a : h],
          [a, 0, kind === "cube" ? a : h],
          [a, kind === "cube" ? a : b, kind === "cube" ? a : h],
          [0, kind === "cube" ? a : b, kind === "cube" ? a : h],
        ];
        faces = [
          [0, 3, 2, 1],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [1, 2, 6, 5],
          [2, 3, 7, 6],
          [3, 0, 4, 7],
        ];
        labels = ["A", "B", "C", "D", "A′", "B′", "C′", "D′"];
        break;
      case "pyramid":
      case "right-pyramid":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [a, a, 0],
          [0, a, 0],
          kind === "right-pyramid" ? [0, 0, h] : [a / 2, a / 2, h],
        ];
        faces = [
          [0, 3, 2, 1],
          [0, 1, 4],
          [1, 2, 4],
          [2, 3, 4],
          [3, 0, 4],
        ];
        labels = ["A", "B", "C", "D", "S"];
        break;
      case "tetrahedron":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [a / 2, (a * Math.sqrt(3)) / 2, 0],
          [a / 2, (a * Math.sqrt(3)) / 6, a * Math.sqrt(2 / 3)],
        ];
        faces = [
          [0, 2, 1],
          [0, 1, 3],
          [1, 2, 3],
          [2, 0, 3],
        ];
        labels = ["A", "B", "C", "S"];
        break;
      case "tri-prism":
      case "hex-prism":
      case "frustum": {
        const n = kind === "tri-prism" ? 3 : kind === "hex-prism" ? 6 : 4,
          r = a / (2 * Math.sin(Math.PI / n));
        vertices = [
          ...ring(n, r, 0, Math.PI / 4),
          ...ring(n, kind === "frustum" ? r * 0.5 : r, h, Math.PI / 4),
        ];
        faces = [
          Array.from({ length: n }, (_, i) => n - i - 1),
          Array.from({ length: n }, (_, i) => n + i),
          ...Array.from({ length: n }, (_, i) => [
            i,
            (i + 1) % n,
            ((i + 1) % n) + n,
            i + n,
          ]),
        ];
        labels = vertices.map(
          (_, i) => String.fromCharCode(65 + (i % n)) + (i >= n ? "′" : ""),
        );
        break;
      }
      case "cylinder":
      case "cone":
      case "cone-frustum": {
        const n = 40;
        vertices = [
          ...ring(n, a, 0),
          ...ring(n, kind === "cone" ? 0 : kind === "cone-frustum" ? b : a, h),
        ];
        faces = [
          Array.from({ length: n }, (_, i) => n - i - 1),
          Array.from({ length: n }, (_, i) => n + i),
          ...Array.from({ length: n }, (_, i) => [
            i,
            (i + 1) % n,
            ((i + 1) % n) + n,
            i + n,
          ]),
        ];
        break;
      }
      case "sphere": {
        const lat = 16,
          lon = 28;
        for (let j = 0; j <= lat; j++)
          for (let i = 0; i < lon; i++)
            vertices.push([
              a *
                Math.sin((j * Math.PI) / lat) *
                Math.cos((i * 2 * Math.PI) / lon),
              a *
                Math.sin((j * Math.PI) / lat) *
                Math.sin((i * 2 * Math.PI) / lon),
              a * Math.cos((j * Math.PI) / lat),
            ]);
        for (let j = 0; j < lat; j++)
          for (let i = 0; i < lon; i++)
            faces.push([
              j * lon + i,
              j * lon + ((i + 1) % lon),
              (j + 1) * lon + ((i + 1) % lon),
              (j + 1) * lon + i,
            ]);
        break;
      }
      case "axes":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [0, a, 0],
          [0, 0, a],
        ];
        labels = ["O", "x", "y", "z"];
        break;
      default:
        throw Error("Khối chưa hỗ trợ.");
    }
    const edges = [],
      seen = new Set();
    for (const f of faces)
      for (let i = 0; i < f.length; i++) {
        const pair = [f[i], f[(i + 1) % f.length]].sort((a, b) => a - b),
          key = pair.join(",");
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(pair);
        }
      }
    if (kind === "axes") edges.push([0, 1], [0, 2], [0, 3]);
    return { vertices, faces, edges, labels };
  }
  function solidMeasurements(kind, p) {
    const { a, b, h } = p;
    switch (kind) {
      case "cube":
        return { volume: a ** 3, area: 6 * a * a, formula: "V = a³; S = 6a²" };
      case "box":
        return {
          volume: a * b * h,
          area: 2 * (a * b + a * h + b * h),
          formula: "V = abh; S = 2(ab + ah + bh)",
        };
      case "pyramid":
        return {
          volume: (a * a * h) / 3,
          area: a * a + 2 * a * Math.hypot(h, a / 2),
          formula: "V = a²h/3; chân đường cao ở tâm đáy",
        };
      case "right-pyramid":
        return {
          volume: (a * a * h) / 3,
          area: a * a + a * h + a * Math.hypot(a, h),
          formula: "V = a²h/3; SA ⊥ (ABCD), SA = h",
        };
      case "tetrahedron":
        return {
          volume: a ** 3 / (6 * Math.sqrt(2)),
          area: Math.sqrt(3) * a * a,
          formula: "V = a³/(6√2); S = √3 a²",
        };
      case "cylinder":
        return {
          volume: Math.PI * a * a * h,
          area: 2 * Math.PI * a * (a + h),
          formula: "a = r; V = πr²h; S = 2πr(r+h)",
        };
      case "cone":
        return {
          volume: (Math.PI * a * a * h) / 3,
          area: Math.PI * a * (a + Math.hypot(a, h)),
          formula: "a = r; V = πr²h/3; S = πr(r+l)",
        };
      case "sphere":
        return {
          volume: (4 * Math.PI * a ** 3) / 3,
          area: 4 * Math.PI * a * a,
          formula: "a = r; V = 4πr³/3; S = 4πr²",
        };
      case "cone-frustum":
        return {
          volume: (Math.PI * h * (a * a + a * b + b * b)) / 3,
          area:
            Math.PI * (a + b) * Math.hypot(a - b, h) +
            Math.PI * (a * a + b * b),
          formula: "a = R, b = r; V = πh(R²+Rr+r²)/3",
        };
      case "tri-prism":
        return {
          volume: (Math.sqrt(3) * a * a * h) / 4,
          area: (Math.sqrt(3) * a * a) / 2 + 3 * a * h,
          formula: "Lăng trụ đứng, đáy đều; V = Sđáy h",
        };
      case "hex-prism":
        return {
          volume: (3 * Math.sqrt(3) * a * a * h) / 2,
          area: 3 * Math.sqrt(3) * a * a + 6 * a * h,
          formula: "Lăng trụ đứng, đáy lục giác đều",
        };
      case "frustum":
        return {
          volume: (h * a * a * 7) / 12,
          area: 1.25 * a * a + 3 * a * Math.hypot(h, a / 4),
          formula: "Hai đáy vuông cạnh a và a/2",
        };
      default:
        return { formula: "Hệ trục tọa độ trực chuẩn" };
    }
  }
  function project(
    vertices,
    rotation = [-0.45, -0.55],
    width = 300,
    height = 260,
  ) {
    const center = [0, 1, 2].map(
      (i) =>
        (Math.min(...vertices.map((v) => v[i])) +
          Math.max(...vertices.map((v) => v[i]))) /
        2,
    );
    const extent = Math.max(...vertices.map((v) => norm(sub(v, center))), 0.01),
      s = (Math.min(width, height) * 0.36) / extent;
    const [rx, ry] = rotation;
    const rotated = vertices.map((v) => {
      let [x, y, z] = sub(v, center);
      let xx = x * Math.cos(ry) + y * Math.sin(ry),
        yy = -x * Math.sin(ry) + y * Math.cos(ry);
      return [
        xx,
        yy * Math.cos(rx) - z * Math.sin(rx),
        yy * Math.sin(rx) + z * Math.cos(rx),
      ];
    });
    return {
      points: rotated.map((v) => [width / 2 + v[0] * s, height / 2 - v[2] * s]),
      depths: rotated.map((v) => v[1]),
      rotated,
      scale: s,
    };
  }
  root.Geometry = {
    flatCatalog,
    solidCatalog,
    flat,
    flatMeasurements,
    triangleData,
    mesh,
    solidMeasurements,
    project,
    sub,
    add,
    scale,
    dot,
    cross,
    norm,
    mid,
  };
})(typeof window !== "undefined" ? window : globalThis);
