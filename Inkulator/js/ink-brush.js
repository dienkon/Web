(function (root) {
  "use strict";
  const catalog = [
    ["ballpoint", "Bút bi · nét đều", 2.5], ["fountain", "Bút mực · áp lực", 3],
    ["pencil", "Bút chì", 2], ["marker", "Bút lông", 4],
    ["fineliner", "Bút kỹ thuật · nét mảnh", 1.2], ["brush", "Bút cọ · thuôn nét", 5],
    ["calligraphy", "Calligraphy Pen · Bút thư pháp", 6], ["soft-pencil", "Bút chì mềm · nét đậm nhạt", 4],
    ["dashed", "Bút nét đứt", 2.5], ["dotted", "Bút nét chấm", 2.5],
  ];
  const variablePens = new Set(["fountain", "brush", "calligraphy"]);
  const paths = new Map();
  let cachedPoints = 0;

  function midpoint(a, b) {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  function disk(path, x, y, radius) {
    path.moveTo(x + radius, y);
    path.arc(x, y, radius, 0, Math.PI * 2);
    path.closePath();
  }
  function ribbon(path, a, b, startRadius, endRadius) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (!length) return;
    const nx = -dy / length, ny = dx / length;
    path.moveTo(a[0] - nx * startRadius, a[1] - ny * startRadius);
    path.lineTo(b[0] - nx * endRadius, b[1] - ny * endRadius);
    path.lineTo(b[0] + nx * endRadius, b[1] + ny * endRadius);
    path.lineTo(a[0] + nx * startRadius, a[1] + ny * startRadius);
    path.closePath();
    disk(path, b[0], b[1], endRadius);
  }
  function radius(type, width, previous, sample, oldRadius) {
    const pressure = Math.max(0.05, Math.min(1, sample[2] ?? 0.5));
    let factor = 0.25 + 1.5 * pressure;
    if (type === "brush") factor = 0.2 + 1.8 * pressure;
    if (type === "calligraphy") {
      const dx = sample[0] - previous[0], dy = sample[1] - previous[1];
      const tilt = Math.abs(dy - dx) / (Math.SQRT2 * Math.hypot(dx, dy) || 1);
      factor = (0.25 + 1.6 * tilt) * (0.65 + 0.7 * pressure);
    }
    return 0.48 * oldRadius + 0.52 * Math.max(0.125, width * factor / 2);
  }
  function variablePath(points, type, width, live) {
    const brush = type === "brush";
    const state = live || {};
    if (!state.path) {
      const startRadius = width * (brush ? 0.3 : 1) / 2;
      Object.assign(state, {path: new Path2D(), next: 1, position: points[0], radius: width / 2,
        drawnRadius: startRadius});
      disk(state.path, points[0][0], points[0][1], startRadius);
    }
    function extend(path, until, pen) {
      for (; pen.next < until; pen.next++) {
        const i = pen.next, last = i === points.length - 1;
        const position = last ? points[i] : midpoint(points[i], points[i + 1]);
        const nextRadius = radius(type, width, points[i - 1], points[i], pen.radius);
        const taper = brush ? Math.min(1, 0.3 + i / 5, 0.3 + (points.length - 1 - i) / 5) : 1;
        const drawnRadius = Math.max(0.125, nextRadius * taper);
        ribbon(path, pen.position, position, pen.drawnRadius, drawnRadius);
        pen.position = position;
        pen.radius = nextRadius;
        pen.drawnRadius = drawnRadius;
      }
    }
    if (!live) {
      extend(state.path, points.length, state);
      return state.path;
    }
    extend(state.path, points.length - (brush ? 4 : 1), state);
    const preview = new Path2D(state.path);
    extend(preview, points.length, { ...state });
    return preview;
  }
  function centerPath(points, live) {
    const state = live || {};
    if (!state.path) {
      state.path = new Path2D();
      state.path.moveTo(...points[0].slice(0, 2));
      state.next = 1;
    }
    if (points.length > 2) {
      if (state.next === 1) state.path.lineTo(...midpoint(points[0], points[1]));
      for (; state.next < points.length - 1; state.next++) {
        const a = points[state.next], b = points[state.next + 1];
        state.path.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      }
    }
    const path = live ? new Path2D(state.path) : state.path;
    const end = points[points.length - 1];
    path.lineTo(end[0], end[1]);
    return path;
  }
  function strokePath(points, type, width, live) {
    const variable = variablePens.has(type);
    const build = () => variable ? variablePath(points, type, width, live) : centerPath(points, live);
    if (live || points.length < 3) return build();
    const cached = paths.get(points);
    const budget = root.Store?.economyMode() ? 24000 : 96000;
    if (cached) {
      paths.delete(points);
      cachedPoints -= cached.length;
    }
    const usable = cached && cached.variable === variable && cached.length === points.length &&
      (!variable || (cached.type === type && cached.width === width));
    const path = usable ? cached.path : build();
    if (points.length <= budget) {
      paths.set(points, { length: points.length, path, type, width, variable });
      cachedPoints += points.length;
    }
    while (cachedPoints > budget) {
      const key = paths.keys().next().value;
      cachedPoints -= paths.get(key).length;
      paths.delete(key);
    }
    return path;
  }
  function draw(ctx, points, type, width, live) {
    if (!points.length) return;
    ctx.save();
    ctx.lineJoin = ctx.lineCap = "round";
    if (type === "highlighter") ctx.globalAlpha *= 0.28;
    if (type === "pencil") ctx.globalAlpha *= 0.7;
    if (type === "marker") width *= 2;
    if (type === "fineliner") width *= 0.65;
    if (type === "soft-pencil") { width *= 1.4; ctx.globalAlpha *= 0.42; }
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0][0], points[0][1], width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const path = strokePath(points, type, width, live);
      if (variablePens.has(type)) ctx.fill(path);
      else {
        ctx.lineWidth = width;
        if (type === "dashed") ctx.setLineDash([width * 4, width * 2.6]);
        if (type === "dotted") ctx.setLineDash([0.01, width * 2.5]);
        ctx.stroke(path);
        if (type === "soft-pencil") {
          ctx.lineWidth = width * 0.28;
          ctx.globalAlpha *= 0.8;
          ctx.stroke(path);
        }
      }
    }
    ctx.restore();
  }
  root.InkBrush = { catalog, draw };
})(typeof window !== "undefined" ? window : globalThis);
