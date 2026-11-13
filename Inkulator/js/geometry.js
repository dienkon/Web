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
    ["right-isosceles", "Tam giác vuông cân"],
    ["square", "Hình vuông"],
    ["rectangle", "Hình chữ nhật"],
    ["parallelogram", "Hình bình hành"],
    ["rhombus", "Hình thoi"],
    ["trapezoid", "Hình thang cân"],
    ["right-trapezoid", "Hình thang vuông"],
    ["pentagon", "Ngũ giác đều"],
    ["hexagon", "Lục giác đều"],
    ["regular-polygon", "Đa giác đều · 3–36 cạnh"],
    ["circle", "Đường tròn"],
    ["trig-circle", "Đường tròn lượng giác"],
    ["cartesian-oxy", "Hệ trục tọa độ Oxy"],
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
    ["s-abc-right", "Chóp S.ABC (SA ⊥ đáy)"],
    ["tri-pyramid", "Chóp tam giác đều"],
    ["s-abcd-rec", "Chóp S.ABCD đáy chữ nhật"],
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
      case "hexagon":
      case "regular-polygon": {
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
      case "right-isosceles":
        points = [
          [0, 4],
          [0, 0],
          [4, 0],
        ];
        break;
      case "right-trapezoid":
        points = [
          [0, 3],
          [4, 3],
          [6, 0],
          [0, 0],
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
      case "trig-circle":
        points = [
          [0, 0],
          [3, 0],
        ];
        break;
      case "cartesian-oxy":
        points = [
          [-4, -4],
          [4, -4],
          [4, 4],
          [-4, 4],
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
      frame:
        kind === "circle" || kind === "trig-circle"
          ? [-4, 4, -4, 4]
          : kind === "cartesian-oxy"
            ? [-5, 5, -5, 5]
            : [-1, 7, -1, 6],
    };
  }
  function flatMeasurements(data) {
    const p = data.points;
    if (data.kind === "circle" || data.kind === "trig-circle") {
      const r = norm(sub(p[1], p[0]));
      return {
        radius: r,
        perimeter: 2 * Math.PI * r,
        area: Math.PI * r * r,
        formula:
          data.kind === "trig-circle"
            ? "Vòng tròn lượng giác đơn vị R=1 (r=" +
              r.toFixed(1) +
              "); x=cos α, y=sin α"
            : undefined,
      };
    }
    if (data.kind === "cartesian-oxy") {
      return {
        perimeter: 32,
        area: 64,
        formula: "Hệ trục Oxy trực chuẩn: hoành độ Ox, tung độ Oy",
      };
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
      case "s-abcd-rec":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [a, b, 0],
          [0, b, 0],
          [0, 0, h],
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
      case "s-abc-right":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [0, b, 0],
          [0, 0, h],
        ];
        faces = [
          [0, 2, 1],
          [0, 1, 3],
          [0, 3, 2],
          [1, 2, 3],
        ];
        labels = ["A", "B", "C", "S"];
        break;
      case "tri-pyramid":
        vertices = [
          [0, 0, 0],
          [a, 0, 0],
          [a / 2, (a * Math.sqrt(3)) / 2, 0],
          [a / 2, (a * Math.sqrt(3)) / 6, h],
        ];
        faces = [
          [0, 2, 1],
          [0, 1, 3],
          [1, 2, 3],
          [2, 0, 3],
        ];
        labels = ["A", "B", "C", "S"];
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
      case "cone": {
        const n = 40;
        // Retain legacy vertex indices for saved auxiliary points. Only vertex n
        // participates as the apex of the surface; the remaining aliases have no edges.
        vertices = [...ring(n, a, 0), ...ring(n, 0, h)];
        faces = [
          Array.from({ length: n }, (_, i) => n - 1 - i),
          ...Array.from({ length: n }, (_, i) => [i, (i + 1) % n, n]),
        ];
        break;
      }
      case "sphere": {
        const lat = 16,
          lon = 28;
        // Keep the original index -> coordinate mapping in saved notebooks.
        // Pole aliases remain addressable, but each cap uses one pole vertex.
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
        const south = lat * lon;
        for (let i = 0; i < lon; i++)
          faces.push([0, lon + i, lon + ((i + 1) % lon)]);
        for (let j = 0; j < lat - 2; j++)
          for (let i = 0; i < lon; i++)
            faces.push([
              (j + 1) * lon + i,
              (j + 2) * lon + i,
              (j + 2) * lon + ((i + 1) % lon),
              (j + 1) * lon + ((i + 1) % lon),
            ]);
        for (let i = 0; i < lon; i++)
          faces.push([
            (lat - 1) * lon + i,
            south,
            (lat - 1) * lon + ((i + 1) % lon),
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
      case "s-abcd-rec":
        return {
          volume: (a * b * h) / 3,
          area:
            a * b +
            (a * h) / 2 +
            (b * h) / 2 +
            (b * Math.hypot(a, h)) / 2 +
            (a * Math.hypot(b, h)) / 2,
          formula: "Đáy ABCD chữ nhật, SA ⊥ (ABCD); V = abh/3",
        };
      case "s-abc-right": {
        const baseArea = (a * b) / 2;
        const hyp = norm(cross([-a, b, 0], [-a, 0, h])) / 2;
        return {
          volume: (baseArea * h) / 3,
          area: baseArea + (a * h) / 2 + (b * h) / 2 + hyp,
          formula: "Đáy ABC vuông tại A, SA ⊥ (ABC); V = abh/6",
        };
      }
      case "tri-pyramid": {
        const triBase = (Math.sqrt(3) * a * a) / 4;
        const slantHeight = Math.hypot(h, (a * Math.sqrt(3)) / 6);
        return {
          volume: (triBase * h) / 3,
          area: triBase + 3 * (a * slantHeight) / 2,
          formula: "Chóp tam giác đều; V = a²h√3/12",
        };
      }
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
  function defaultProjection(kind) {
    return ["sphere", "cylinder", "cone", "cone-frustum", "axes"].includes(kind)
      ? "orthographic"
      : "oblique";
  }
  function defaultRotation(kind) {
    // Prism rings retain their original coordinates; align the view instead.
    return [
      -0.45,
      -0.55 +
        (["right-pyramid","s-abcd-rec","s-abc-right"].includes(kind)
          ? -Math.PI/2
          : kind === "tri-prism"
          ? Math.PI - Math.PI / 12
          : ["tri-pyramid","tetrahedron"].includes(kind)
            ? -Math.PI / 3
          : kind === "hex-prism"
            ? -Math.PI / 4
            : 0),
    ];
  }
  function camera(point, rotation, projection = "orthographic") {
    const [x, y, z] = point;
    if (projection === "oblique") {
      const a = rotation[1] + 0.55,
        u = x * Math.cos(a) - y * Math.sin(a),
        v = x * Math.sin(a) + y * Math.cos(a);
      const tilt=rotation[0]+0.45;
      // Avoid a receding coefficient near tan(30°): it nearly superimposes
      // two vertices of an equilateral triangular base in the textbook view.
      return [u + 0.4 * Math.cos(tilt) * v, -v, z + (0.35 + 0.35*Math.sin(tilt)) * v];
    }
    const [rx, ry] = rotation,
      xx = x * Math.cos(ry) + y * Math.sin(ry),
      yy = -x * Math.sin(ry) + y * Math.cos(ry);
    return [
      xx,
      yy * Math.cos(rx) - z * Math.sin(rx),
      yy * Math.sin(rx) + z * Math.cos(rx),
    ];
  }
  function textbookViews(kind) {
    return [
      {id:"standard",title:"Bài tập · cạnh đáy ngang",rotation:defaultRotation(kind),projection:defaultProjection(kind)},
      {id:"alternate",title:"Đổi hướng đáy",rotation:[-.45,Math.PI/2-.55],projection:"oblique"},
      {id:"spatial",title:"Phối cảnh dễ nhìn",rotation:[-.55,-.65],projection:"orthographic"},
      {id:"front",title:"Nhìn chính diện",rotation:[0,0],projection:"orthographic"},
      {id:"top",title:"Nhìn từ trên",rotation:[-Math.PI/2,0],projection:"orthographic"},
    ];
  }
  function project(
    vertices,
    rotation = [-0.45, -0.55],
    width = 300,
    height = 260,
    frameVertices = vertices,
    projection = "orthographic",
  ) {
    const center = [0, 1, 2].map(
      (i) =>
        (Math.min(...frameVertices.map((v) => v[i])) +
          Math.max(...frameVertices.map((v) => v[i]))) /
        2,
    );
    const extent = Math.max(
        ...frameVertices.map((v) => norm(sub(v, center))),
        0.01,
      ),
      s = (Math.min(width, height) * 0.36) / extent;
    const rotated = vertices.map((v) =>
      camera(sub(v, center), rotation, projection),
    );
    return {
      points: rotated.map((v) => [width / 2 + v[0] * s, height / 2 - v[2] * s]),
      depths: rotated.map((v) => v[1]),
      rotated,
      scale: s,
      center,
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
    camera,
    defaultProjection,
    defaultRotation,
    defaultDrawingRotation:()=>0,
    textbookViews,
    sub,
    add,
    scale,
    dot,
    cross,
    norm,
    mid,
  };
})(typeof window !== "undefined" ? window : globalThis);
