(function (root) {
  "use strict";
  function draw(ctx, o) {
    const d = o.data,
      v = SolidView.forObject(o),
      G = Geometry,
      p = v.pr.points,
      labels = [],
      rounded = ["sphere", "cylinder", "cone", "cone-frustum"].includes(d.kind),
      width = Math.max(2, o.style.width),
      center = [o.size.w / 2, o.size.h / 2];
    const label = (text, point) => {
      ctx.save();
      ctx.fillStyle = o.style.color;
      if (root.TeacherGeometry)
        TeacherGeometry.drawLabel(ctx, text, point, center, labels, p, v.edges);
      else {
        ctx.font = "italic 17px Georgia";
        ctx.fillText(text, point[0] + 7, point[1] - 8);
      }
      ctx.restore();
    };
    const point = (q, text) => {
      ctx.beginPath();
      ctx.arc(...q, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = o.style.color;
      ctx.fill();
      if (d.labels !== false && text) label(text, q);
    };
    if (d.kind === "sphere") {
      const round = SolidView.roundSegments(v, d);
      if (d.faces) {
        ctx.save();
        ctx.globalAlpha *= d.faceOpacity || 0.12;
        ctx.fillStyle = d.faceColor || o.style.color;
        ctx.beginPath();
        ctx.arc(...round.center, round.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (d.edges !== false) {
        SolidView.trace(ctx, round.curves, {
          width,
          hiddenEdges: d.hiddenEdges !== false,
        });
        SolidView.trace(ctx, round.outline, { width, hiddenEdges: true });
      }
      if (d.center !== false) point(round.center, "O");
      if (d.showRadius !== false) {
        const q = v.screen([d.params.a, 0, 0]);
        SolidView.trace(ctx, v.segments([0, 0, 0], [d.params.a, 0, 0]), {
          width: Math.max(1.5, width * 0.7),
          hiddenEdges: true,
        });
        label("r", [
          (round.center[0] + q[0]) / 2,
          (round.center[1] + q[1]) / 2,
        ]);
      }
      return;
    }
    if (d.faces !== false || Number.isInteger(d.selectedFace)) {
      for (const f of v.planes.slice().sort((a, b) => a.depth - b.depth)) {
        const index = v.planes.indexOf(f);
        if (
          !f.valid ||
          !f.front ||
          (d.faces === false && index !== d.selectedFace)
        )
          continue;
        ctx.save();
        ctx.globalAlpha *=
          index === d.selectedFace ? 0.24 : (d.faceOpacity ?? 0.12);
        ctx.fillStyle =
          index === d.selectedFace ? "#d5a35b" : d.faceColor || o.style.color;
        ctx.beginPath();
        f.face.forEach((i, k) =>
          k ? ctx.lineTo(...p[i]) : ctx.moveTo(...p[i]),
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    if (d.edges !== false) {
      if (rounded) {
        const round = SolidView.roundSegments(v, d);
        SolidView.trace(ctx, round.curves, {
          width,
          hiddenEdges: d.hiddenEdges !== false,
        });
        SolidView.trace(ctx, round.outline, { width });
      } else
        SolidView.trace(ctx, v.edges, {
          width,
          hiddenEdges: d.hiddenEdges !== false,
        });
    }
    if (!rounded && d.labels !== false)
      v.model.labels.forEach((name, i) =>
        point(p[i], d.vertexLabels?.[i] || name),
      );
    if (rounded) {
      if (d.kind === "cone") point(v.screen([0, 0, d.params.h]), "S");
      if (d.center) point(v.screen([0, 0, 0]), "O");
      if (d.showRadius) {
        const A = [0, 0, 0],
          B = [d.params.a, 0, 0],
          a = v.screen(A),
          b = v.screen(B);
        SolidView.trace(ctx, v.segments(A, B), {
          width: width * 0.75,
          hiddenEdges: true,
        });
        label("r", G.mid(a, b));
      }
      if (d.showHeight) {
        const A = [0, 0, 0],
          B = [0, 0, d.params.h];
        SolidView.trace(ctx, v.segments(A, B), {
          width: width * 0.75,
          hiddenEdges: true,
        });
        label("h", G.mid(v.screen(A), v.screen(B)));
      }
    }
    for (const a of d.aux || []) {
      let A, B;
      if (a.type === "segment") {
        A = v.model.vertices[a.a];
        B = v.model.vertices[a.b];
      } else if (a.type === "height") {
        A = v.model.vertices.at(-1);
        B = [A[0], A[1], 0];
      } else if (
        a.type === "midpoint" &&
        v.model.vertices[a.a] &&
        v.model.vertices[a.b]
      )
        point(
          v.screen(G.mid(v.model.vertices[a.a], v.model.vertices[a.b])),
          a.label || "M",
        );
      if (A && B)
        SolidView.trace(ctx, v.segments(A, B), {
          width: Math.max(1.8, width * 0.85),
          hiddenEdges: d.hiddenEdges !== false,
          mode: a.lineMode || "auto",
        });
    }
  }
  root.SolidDrawing = { draw };
})(window);
