(function (root) {
  "use strict";
  const G = root.Geometry,
    EPS = 1e-8;
  const operations = {
    segment: 2,
    midpoint: 2,
    measure: 2,
    perpendicular: 3,
    parallel: 3,
    angle: 3,
    circumcircle: 3,
    section: 3,
  };
  function section(model, A, B, C) {
    const normal = G.cross(G.sub(B, A), G.sub(C, A)),
      length = G.norm(normal);
    if (length < EPS)
      throw Error("Ba điểm thẳng hàng; không xác định được mặt phẳng.");
    const n = G.scale(normal, 1 / length),
      points = [],
      radius = Math.max(1, ...model.vertices.map((v) => G.norm(v))),
      tol = EPS * radius;
    const add = (p) => {
      if (!points.some((q) => G.norm(G.sub(p, q)) < tol * 10)) points.push(p);
    };
    for (const [i, j] of model.edges) {
      const a = model.vertices[i],
        b = model.vertices[j],
        da = G.dot(n, G.sub(a, A)),
        db = G.dot(n, G.sub(b, A));
      if (Math.abs(da) < tol) add(a);
      if (Math.abs(db) < tol) add(b);
      if (da * db < 0) {
        const t = da / (da - db);
        add(G.add(a, G.scale(G.sub(b, a), t)));
      }
    }
    if (points.length < 3)
      throw Error("Mặt phẳng không tạo thành thiết diện đa giác của khối này.");
    const center = G.scale(
        points.reduce((sum, p) => G.add(sum, p), [0, 0, 0]),
        1 / points.length,
      ),
      u = G.scale(
        G.sub(points[0], center),
        1 / G.norm(G.sub(points[0], center)),
      ),
      v = G.cross(n, u);
    points.sort(
      (p, q) =>
        Math.atan2(G.dot(G.sub(p, center), v), G.dot(G.sub(p, center), u)) -
        Math.atan2(G.dot(G.sub(q, center), v), G.dot(G.sub(q, center), u)),
    );
    let area = 0;
    for (let i = 0; i < points.length; i++)
      area +=
        G.norm(
          G.cross(
            G.sub(points[i], center),
            G.sub(points[(i + 1) % points.length], center),
          ),
        ) / 2;
    return { points, normal: n, area };
  }
  function build(o) {
    const solid = o.type === "solid",
      d = o.data,
      model = solid ? G.mesh(d.kind, d.params) : null,
      vertices = solid ? model.vertices : d.points,
      points = new Map(),
      items = [],
      warnings = [];
    const named = (key, label, coords, derived = true) => {
      if (coords && coords.every(Number.isFinite))
        points.set(key, { key, label, coords, derived });
    };
    vertices.forEach((p, i) =>
      named(
        "v:" + i,
        solid ? model.labels[i] || "P" + (i + 1) : String.fromCharCode(65 + i),
        p,
        false,
      ),
    );
    for (const [i, a] of (d.aux || []).entries())
      if (a.type === "midpoint" && vertices[a.a] && vertices[a.b])
        named(
          "legacy:" + i,
          a.label || "M",
          G.mid(vertices[a.a], vertices[a.b]),
        );
    if (!solid && vertices.length === 3) {
      const t = G.triangleData(vertices);
      if (["median", "centroid"].includes(d.kind))
        named("base:M", "M", t.midpoint);
      if (d.kind === "altitude") named("base:H", "H", t.foot);
      if (d.kind === "incircle") named("base:I", "I", t.incenter);
      if (d.kind === "circumcircle") named("base:O", "O", t.circumcenter);
      if (d.kind === "centroid") named("base:G", "G", t.centroid);
    }
    for (const c of d.constructions || []) {
      try {
        if (
          !operations[c.type] ||
          !Array.isArray(c.refs) ||
          c.refs.length !== operations[c.type]
        )
          throw Error("Phép dựng không hợp lệ.");
        const source = c.refs.map((key) => {
            const p = points.get(key);
            if (!p) throw Error("Điểm phụ thuộc không xác định.");
            return p;
          }),
          p = source.map((p) => p.coords),
          item = { ...c, source, coords: p };
        if (c.type === "midpoint") {
          item.point = G.mid(p[0], p[1]);
          named("c:" + c.id, c.label || "M", item.point);
        }
        if (["segment", "measure"].includes(c.type)) {
          item.length = G.norm(G.sub(p[1], p[0]));
          if (item.length < EPS) throw Error("Hai điểm trùng nhau.");
        }
        if (c.type === "angle") {
          const a = G.sub(p[0], p[1]),
            b = G.sub(p[2], p[1]),
            n = G.norm(a) * G.norm(b);
          if (n < EPS)
            throw Error("Góc không xác định với hai điểm trùng nhau.");
          item.angle =
            (Math.acos(Math.max(-1, Math.min(1, G.dot(a, b) / n))) * 180) /
            Math.PI;
        }
        if (["parallel", "perpendicular"].includes(c.type)) {
          const ab = G.sub(p[1], p[0]),
            den = G.dot(ab, ab);
          if (den < EPS) throw Error("Hai điểm của đường thẳng trùng nhau.");
          if (c.type === "parallel") {
            item.endpoints = [G.sub(p[2], ab), G.add(p[2], ab)];
          } else {
            item.foot = G.add(
              p[0],
              G.scale(ab, G.dot(G.sub(p[2], p[0]), ab) / den),
            );
            if (G.norm(G.sub(p[2], item.foot)) < EPS)
              throw Error(
                "Điểm đang nằm trên đường thẳng; hãy chọn điểm nằm ngoài đường.",
              );
            item.endpoints = [p[2], item.foot];
            named("c:" + c.id, c.label || "H", item.foot);
          }
        }
        if (c.type === "circumcircle") {
          if (solid)
            throw Error("Đường tròn qua ba điểm hiện hỗ trợ hình phẳng.");
          const t = G.triangleData(p);
          if (!t.circumcenter || !Number.isFinite(t.circumradius))
            throw Error("Ba điểm thẳng hàng.");
          item.center = t.circumcenter;
          item.radius = t.circumradius;
          named("c:" + c.id, c.label || "O", item.center);
        }
        if (c.type === "section") {
          if (!solid || model.vertices.length > 20)
            throw Error(
              "Thiết diện hiện hỗ trợ các khối đa diện trong thư viện.",
            );
          Object.assign(item, section(model, ...p));
          item.points.forEach((v, i) => {
            const same = [...points.values()].find(
              (p) => G.norm(G.sub(p.coords, v)) < EPS,
            );
            const key = "c:" + c.id + ":" + i;
            named(key, same ? same.label : (c.label || "P") + (i + 1), v);
            if (same) points.get(key).aliasOf = same.key;
          });
        }
        items.push(item);
      } catch (e) {
        warnings.push({ id: c.id, message: e.message });
      }
    }
    return { points, items, warnings, model };
  }
  function validate(data, solid = false) {
    if (data.constructions === undefined) return;
    if (!Array.isArray(data.constructions) || data.constructions.length > 150)
      throw Error("Tối đa 150 phép dựng trên mỗi hình.");
    const ids = new Set();
    for (const c of data.constructions) {
      if (
        !c ||
        typeof c.id !== "string" ||
        c.id.length > 80 ||
        ids.has(c.id) ||
        !operations[c.type] ||
        !Array.isArray(c.refs) ||
        c.refs.length !== operations[c.type] ||
        c.refs.some((r) => typeof r !== "string" || r.length > 100) ||
        (c.label !== undefined &&
          (typeof c.label !== "string" || c.label.length > 16))
      )
        throw Error("Dữ liệu phép dựng không hợp lệ.");
      ids.add(c.id);
    }
    // Degeneracy after moving vertices is valid, but forward/cyclic references are not.
    const known = new Set(
      (solid ? G.mesh(data.kind, data.params).vertices : data.points).map(
        (_, i) => "v:" + i,
      ),
    );
    (data.aux || []).forEach((a, i) => {
      if (a.type === "midpoint") known.add("legacy:" + i);
    });
    if (!solid && data.points.length === 3) {
      if (["median", "centroid"].includes(data.kind)) known.add("base:M");
      const names = {
        altitude: "H",
        incircle: "I",
        circumcircle: "O",
        centroid: "G",
      };
      if (names[data.kind]) known.add("base:" + names[data.kind]);
    }
    for (const c of data.constructions) {
      if (c.refs.some((r) => !known.has(r)))
        throw Error("Phép dựng có tham chiếu vòng hoặc điểm chưa tồn tại.");
      if (["midpoint", "perpendicular", "circumcircle"].includes(c.type))
        known.add("c:" + c.id);
      if (c.type === "section")
        for (let i = 0; i < 40; i++) known.add("c:" + c.id + ":" + i);
    }
  }
  root.Constructions = { operations, section, build, validate };
})(typeof window !== "undefined" ? window : globalThis);
