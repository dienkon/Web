/* Orthographic visibility: the observer is at +camera Y; larger depth is nearer. */
(function (root) {
  "use strict";
  const G = root.Geometry,
    cache = new WeakMap();
  function normal(vertices, face) {
    let n = [0, 0, 0];
    for (let i = 0; i < face.length; i++) {
      const p = vertices[face[i]],
        q = vertices[face[(i + 1) % face.length]];
      n[0] += (p[1] - q[1]) * (p[2] + q[2]);
      n[1] += (p[2] - q[2]) * (p[0] + q[0]);
      n[2] += (p[0] - q[0]) * (p[1] + q[1]);
    }
    return n;
  }
  function outwardFaces(vertices, faces) {
    const center = G.scale(
      vertices.reduce((s, p) => G.add(s, p), [0, 0, 0]),
      1 / vertices.length,
    );
    return faces.map((face) => {
      const n = normal(vertices, face),
        c = G.scale(
          face.reduce((s, i) => G.add(s, vertices[i]), [0, 0, 0]),
          1 / face.length,
        );
      return G.dot(n, G.sub(c, center)) < 0
        ? face.slice().reverse()
        : face.slice();
    });
  }
  function hull(points) {
    const p = points
        .map((q) => [q[0], q[1]])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      cross = (a, b, c) =>
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const lo = [],
      hi = [];
    for (const q of p) {
      while (lo.length > 1 && cross(lo.at(-2), lo.at(-1), q) <= 1e-9) lo.pop();
      lo.push(q);
    }
    for (const q of p.slice().reverse()) {
      while (hi.length > 1 && cross(hi.at(-2), hi.at(-1), q) <= 1e-9) hi.pop();
      hi.push(q);
    }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function create(
    kind,
    params,
    rotation,
    width,
    height,
    projection = "orthographic",
  ) {
    const model = G.mesh(kind, params),
      faces = outwardFaces(model.vertices, model.faces),
      pr = G.project(
        model.vertices,
        rotation,
        width,
        height,
        model.vertices,
        projection,
      ),
      extent = Math.max(1, ...model.vertices.map((p) => G.norm(p))),
      eps = extent * 1e-8,
      planes = faces.map((f) => {
        const raw = normal(pr.rotated, f),
          length = G.norm(raw),
          n =
            length > eps
              ? G.scale(raw, (projection === "oblique" ? -1 : 1) / length)
              : [0, 0, 0];
        return {
          face: f,
          n,
          origin: pr.rotated[f[0]],
          valid: length > eps,
          front: n[1] > 1e-9,
          depth: f.reduce((s, i) => s + pr.depths[i], 0) / f.length,
        };
      });
    const camera = (p) => G.camera(G.sub(p, pr.center), rotation, projection),
      screen = (p) => {
        const v = camera(p);
        return [width / 2 + v[0] * pr.scale, height / 2 - v[2] * pr.scale];
      };
    function hiddenAt(point) {
      if (!planes.length) return false;
      const p = camera(point);
      if (kind === "sphere") {
        const radius = params.a,
          radial = p[0] * p[0] + p[2] * p[2];
        return (
          radial < radius * radius - eps &&
          p[1] < Math.sqrt(Math.max(0, radius * radius - radial)) - eps
        );
      }
      let low = -Infinity,
        high = Infinity;
      for (const f of planes) {
        if (!f.valid) continue;
        const d = G.dot(f.n, G.sub(p, f.origin)),
          ny = f.n[1];
        if (Math.abs(ny) < 1e-10) {
          if (d >= -eps) return false;
          continue;
        }
        const t = -d / ny;
        if (ny > 0) high = Math.min(high, t);
        else low = Math.max(low, t);
        if (high - low <= eps) return false;
      }
      return high > eps && high - Math.max(0, low) > eps;
    }
    const outline = hull(pr.points);
    function segments(A, B) {
      const a = camera(A),
        b = camera(B),
        sa = screen(A),
        sb = screen(B),
        delta = G.sub(b, a),
        ts = [0, 1];
      for (const f of planes) {
        if (!f.valid) continue;
        const d = G.dot(f.n, G.sub(a, f.origin)),
          den = G.dot(f.n, delta);
        if (Math.abs(den) > eps) {
          const t = -d / den;
          if (t > 1e-7 && t < 1 - 1e-7) ts.push(t);
        }
      }
      const dx = sb[0] - sa[0],
        dy = sb[1] - sa[1];
      for (let i = 0; i < outline.length; i++) {
        const c = outline[i],
          d = outline[(i + 1) % outline.length],
          ex = d[0] - c[0],
          ey = d[1] - c[1],
          den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const cx = c[0] - sa[0],
          cy = c[1] - sa[1],
          t = (cx * ey - cy * ex) / den,
          u = (cx * dy - cy * dx) / den;
        if (t > 1e-7 && t < 1 - 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) ts.push(t);
      }
      ts.sort((a, b) => a - b);
      const sorted = ts.filter((t, i) => !i || t - ts[i - 1] > 1e-7),
        result = [];
      for (let i = 1; i < sorted.length; i++) {
        const t0 = sorted[i - 1],
          t1 = sorted[i],
          mid = G.add(A, G.scale(G.sub(B, A), (t0 + t1) / 2)),
          hidden = hiddenAt(mid),
          start = [sa[0] + dx * t0, sa[1] + dy * t0],
          end = [sa[0] + dx * t1, sa[1] + dy * t1],
          last = result.at(-1);
        if (last && last.hidden === hidden) last.b = end;
        else result.push({ a: start, b: end, hidden, t0, t1 });
      }
      return result;
    }
    const edges = ["sphere", "cylinder", "cone", "cone-frustum"].includes(kind)
      ? []
      : model.edges.map(([a, b]) => ({
          a: pr.points[a],
          b: pr.points[b],
          indices: [a, b],
          hidden: hiddenAt(G.mid(model.vertices[a], model.vertices[b])),
        }));
    function curve(points, hiddenFn = hiddenAt) {
      const result = [];
      for (let i = 1; i < points.length; i++) {
        const mid = G.mid(points[i - 1], points[i]);
        result.push({
          a: screen(points[i - 1]),
          b: screen(points[i]),
          hidden: hiddenFn(mid),
        });
      }
      return result;
    }
    const angle = rotation[1] + 0.55;
    const tilt=rotation[0]+0.45,kx=0.4*Math.cos(tilt),ky=0.35+0.35*Math.sin(tilt);
    const viewDirection =
      projection === "oblique"
        ? [
            kx * Math.cos(angle) - Math.sin(angle),
            -kx * Math.sin(angle) - Math.cos(angle),
            ky,
          ]
        : [
            -Math.sin(rotation[1]) * Math.cos(rotation[0]),
            Math.cos(rotation[1]) * Math.cos(rotation[0]),
            -Math.sin(rotation[0]),
          ];
    return {
      kind,
      params,
      rotation,
      width,
      height,
      model,
      faces,
      pr,
      planes,
      outline,
      eps,
      screen,
      camera,
      hiddenAt,
      segments,
      edges,
      curve,
      viewDirection,
    };
  }
  function forObject(o) {
    const key = JSON.stringify([
        o.data.kind,
        o.data.params,
        o.data.rotation,
        o.data.projection,
        o.size.w,
        o.size.h,
      ]),
      old = cache.get(o);
    if (old?.key === key) return old.view;
    const view = create(
      o.data.kind,
      o.data.params,
      o.data.rotation,
      o.size.w,
      o.size.h,
      o.data.projection,
    );
    cache.set(o, { key, view });
    return view;
  }
  function trace(
    ctx,
    segments,
    { width = 2.6, hiddenEdges = true, mode = "auto" } = {},
  ) {
    for (const hidden of [true, false]) {
      if (hidden && !hiddenEdges && mode === "auto") continue;
      ctx.save();
      ctx.lineWidth = hidden ? Math.max(1.5, width * 0.75) : width;
      ctx.setLineDash(hidden ? [7, 5] : []);
      ctx.beginPath();
      let end = null;
      for (const s of segments) {
        const dashed =
          mode === "dashed" ? true : mode === "solid" ? false : s.hidden;
        if (dashed !== hidden) continue;
        if (!end || Math.hypot(end[0] - s.a[0], end[1] - s.a[1]) > 1e-6)
          ctx.moveTo(...s.a);
        ctx.lineTo(...s.b);
        end = s.b;
      }
      ctx.stroke();
      ctx.restore();
    }
  }
  function roundSegments(view, data) {
    const { kind, params, viewDirection: v } = view,
      { a: r, b, h } = params,
      steps = 144,
      ring = (radius, z) =>
        Array.from({ length: steps + 1 }, (_, i) => [
          radius * Math.cos((i * 2 * Math.PI) / steps),
          radius * Math.sin((i * 2 * Math.PI) / steps),
          z,
        ]);
    let curves = [],
      outline = [];
    if (kind === "sphere") {
      const center = view.screen([0, 0, 0]),
        radius = view.pr.scale * r;
      outline = Array.from({ length: steps }, (_, i) => ({
        a: [
          center[0] + radius * Math.cos((i * 2 * Math.PI) / steps),
          center[1] + radius * Math.sin((i * 2 * Math.PI) / steps),
        ],
        b: [
          center[0] + radius * Math.cos(((i + 1) * 2 * Math.PI) / steps),
          center[1] + radius * Math.sin(((i + 1) * 2 * Math.PI) / steps),
        ],
        hidden: false,
      }));
      if (data.equator !== false) {
        const p = ring(r, 0);
        curves.push(...view.curve(p, (P) => view.camera(P)[1] < -view.eps));
      }
      if (data.meridian) {
        const p = Array.from({ length: steps + 1 }, (_, i) => [
          r * Math.cos((i * 2 * Math.PI) / steps),
          0,
          r * Math.sin((i * 2 * Math.PI) / steps),
        ]);
        curves.push(...view.curve(p, (P) => view.camera(P)[1] < -view.eps));
      }
      return { curves, outline, center, radius };
    }
    const topR = kind === "cone" ? 0 : kind === "cone-frustum" ? b : r,
      slope = (r - topR) / h,
      sideVisible = (P) =>
        P[0] * v[0] + P[1] * v[1] + Math.hypot(P[0], P[1]) * slope * v[2] >=
        -view.eps;
    curves.push(
      ...view.curve(ring(r, 0), (P) => !(v[2] < -1e-9 || sideVisible(P))),
    );
    if (topR > 0)
      curves.push(
        ...view.curve(ring(topR, h), (P) => !(v[2] > 1e-9 || sideVisible(P))),
      );
    const horizontal = Math.hypot(v[0], v[1]),
      rhs = horizontal > 1e-9 ? (-slope * v[2]) / horizontal : 2;
    if (Math.abs(rhs) < 1) {
      const base = Math.atan2(v[1], v[0]),
        angle = Math.acos(rhs);
      for (const t of [base - angle, base + angle])
        outline.push({
          a: view.screen([r * Math.cos(t), r * Math.sin(t), 0]),
          b: view.screen([topR * Math.cos(t), topR * Math.sin(t), h]),
          hidden: false,
        });
    }
    return { curves, outline };
  }
  root.SolidView = {
    normal,
    outwardFaces,
    create,
    forObject,
    trace,
    roundSegments,
  };
})(typeof window !== "undefined" ? window : globalThis);
