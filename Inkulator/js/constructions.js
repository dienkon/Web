(function (root) {
  "use strict";
  const G = root.Geometry,
    EPS = 1e-8;
  const operations = {
    freePoint: 0,
    vector: 2,
    translate: 3,
    rotate: 2,
    reflectLine: 3,
    segment: 2,
    midpoint: 2,
    perpendicularBisector: 2,
    circleCenter: 2,
    reflectPoint: 2,
    dividePoint: 2,
    linePlane: 5,
    planePlane: 6,
    projectPlane: 4,
    distancePlane: 4,
    linePlaneAngle: 5,
    planeAngle: 6,
    commonPerpendicular: 4,
    tangent: 3,
    measure: 2,
    perpendicular: 3,
    parallel: 3,
    angle: 3,
    circumcircle: 3,
    section: 3,
    intersection: 4,
    centroid: 3,
    median: 3,
    bisector: 3,
    rightAngle: 3,
    equalTick: 2,
    parallelArrow: 2,
    altitude: 3,
    orthocenter: 3,
    incenter: 3,
    highlightPlane: 3,
  };
  function intersection(A, B, C, D) {
    const u = G.sub(B, A),
      v = G.sub(D, C),
      w = G.sub(C, A),
      aa = G.dot(u, u),
      bb = G.dot(v, v),
      ab = G.dot(u, v),
      den = aa * bb - ab * ab;
    if (aa < EPS * EPS || bb < EPS * EPS)
      throw Error("Không xác định được đường qua hai điểm trùng nhau.");
    if (Math.abs(den) <= 1e-12 * aa * bb)
      throw Error(
        "Hai đường song song hoặc trùng nhau; không có giao điểm duy nhất.",
      );
    const wu = G.dot(w, u),
      wv = G.dot(w, v),
      t = (wu * bb - wv * ab) / den,
      s = (wu * ab - wv * aa) / den,
      P = G.add(A, G.scale(u, t)),
      Q = G.add(C, G.scale(v, s));
    if (G.norm(G.sub(P, Q)) > 1e-7 * Math.max(1, Math.sqrt(aa), Math.sqrt(bb)))
      throw Error("Hai đường chéo nhau trong không gian, không có giao điểm.");
    return G.mid(P, Q);
  }
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
  function plane(A, B, C) {
    if (A.length !== 3) throw Error("Phép dựng này cần hình không gian.");
    const u = G.sub(B,A), v = G.sub(C,A), n = G.cross(u,v), length = G.norm(n);
    if (length <= EPS * Math.max(1, G.norm(u)*G.norm(v)))
      throw Error("Ba điểm thẳng hàng hoặc trùng nhau; chưa xác định được mặt phẳng.");
    return G.scale(n,1/length);
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
        d.vertexLabels?.[i] ||
          (solid ? model.labels[i] || "P" + (i + 1) : Geometry.vertexLabel(i)),
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
          !Object.hasOwn(operations,c.type) ||
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
        if(c.type==='freePoint'){
          if(!Array.isArray(c.point)||c.point.length!==(solid?3:2)||c.point.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw Error('Tọa độ điểm không hợp lệ.');
          item.point=c.point.slice();named('c:'+c.id,c.label||'P',item.point);
        }
        if(c.type==='vector')item.endpoints=p;
        if(c.type==='translate'){item.point=G.add(p[0],G.sub(p[2],p[1]));named('c:'+c.id,c.label||'P′',item.point);}
        if(c.type==='rotate'){
          if(solid)throw Error('Phép quay quanh tâm áp dụng cho hình phẳng.');
          const a=(c.rotationAngle??60)*Math.PI/180,u=G.sub(p[0],p[1]);item.point=G.add(p[1],[u[0]*Math.cos(a)-u[1]*Math.sin(a),u[0]*Math.sin(a)+u[1]*Math.cos(a)]);named('c:'+c.id,c.label||'P′',item.point);
        }
        if(c.type==='reflectLine'){
          const u=G.sub(p[2],p[1]),den=G.dot(u,u);if(den<EPS)throw Error('Trục đối xứng cần hai điểm phân biệt.');
          const foot=G.add(p[1],G.scale(u,G.dot(G.sub(p[0],p[1]),u)/den));item.point=G.sub(G.scale(foot,2),p[0]);named('c:'+c.id,c.label||'P′',item.point);
        }
        if (c.type === "midpoint") {
          item.point = G.mid(p[0], p[1]);
          named("c:" + c.id, c.label || "M", item.point);
        }
        if (c.type === "perpendicularBisector") {
          if (solid) throw Error("Trung trực hiện áp dụng cho hình phẳng.");
          const ab = G.sub(p[1], p[0]), len = G.norm(ab);
          if (len < EPS) throw Error("Trung trực cần hai điểm phân biệt.");
          item.point = G.mid(p[0], p[1]);
          const normal = [-ab[1], ab[0]];
          item.endpoints = [G.sub(item.point, normal), G.add(item.point, normal)];
          item.endpointRefs = ["c:" + c.id + ":A", "c:" + c.id + ":B"];
          named("c:" + c.id, c.label || "M", item.point);
          item.endpoints.forEach((P, i) => {
            named(item.endpointRefs[i], "", P);
            points.get(item.endpointRefs[i]).internal = true;
          });
        }
        if (c.type === "circleCenter") {
          if (solid) throw Error("Đường tròn tâm–điểm hiện áp dụng cho hình phẳng.");
          item.center = p[0];
          item.radius = G.norm(G.sub(p[1], p[0]));
          if (item.radius < EPS) throw Error("Bán kính phải lớn hơn không.");
        }
        if (c.type === "reflectPoint") {
          item.point = G.sub(G.scale(p[1], 2), p[0]);
          named("c:" + c.id, c.label || "P′", item.point);
        }
        if (c.type === "dividePoint") {
          const t = c.ratio ?? 0.5;
          if (!Number.isFinite(t) || t <= 0 || t >= 1) throw Error("Tỉ lệ phải nằm giữa 0 và 1.");
          if (G.norm(G.sub(p[1],p[0])) < EPS) throw Error("Chọn hai đầu cạnh phân biệt.");
          item.point = G.add(p[0],G.scale(G.sub(p[1],p[0]),t));
          named("c:"+c.id,c.label || "M",item.point);
        }
        if (["projectPlane","distancePlane"].includes(c.type)) {
          const n = plane(p[1],p[2],p[3]);
          const signed = G.dot(n,G.sub(p[0],p[1]));
          item.point = G.sub(p[0],G.scale(n,signed));
          item.length = Math.abs(signed);
          item.endpoints = [p[0],item.point];
          item.endpointRefs = [c.refs[0],"c:"+c.id];
          item.planePoints = p.slice(1);
          named("c:"+c.id,c.label || "H",item.point);
        }
        if (["linePlane","linePlaneAngle"].includes(c.type)) {
          const n = plane(p[2],p[3],p[4]), u = G.sub(p[1],p[0]), length = G.norm(u);
          if (length < EPS) throw Error("Đường thẳng cần hai điểm phân biệt.");
          const den = G.dot(n,u);
          item.planePoints = p.slice(2);
          if (c.type === "linePlaneAngle") {
            item.angle = Math.asin(Math.min(1,Math.abs(den)/length))*180/Math.PI;
          } else {
            if (Math.abs(den) <= EPS*length) throw Error("Đường song song hoặc nằm trong mặt phẳng; không có một giao điểm duy nhất.");
            item.point = G.add(p[0],G.scale(u,G.dot(n,G.sub(p[2],p[0]))/den));
            item.endpoints = [p[0],item.point];
            item.endpointRefs = [c.refs[0],"c:"+c.id];
            named("c:"+c.id,c.label || "I",item.point);
          }
        }
        if (["planePlane","planeAngle"].includes(c.type)) {
          const n1 = plane(p[0],p[1],p[2]), n2 = plane(p[3],p[4],p[5]);
          item.planes = [p.slice(0,3),p.slice(3)];
          if (c.type === "planeAngle") {
            item.angle = Math.acos(Math.min(1,Math.abs(G.dot(n1,n2))))*180/Math.PI;
          } else {
            const u = G.cross(n1,n2), den = G.dot(u,u);
            if (den <= EPS*EPS) throw Error("Hai mặt phẳng song song hoặc trùng nhau; không có giao tuyến duy nhất.");
            const d1 = G.dot(n1,p[0]), d2 = G.dot(n2,p[3]);
            const point = G.scale(G.add(G.scale(G.cross(n2,u),d1),G.scale(G.cross(u,n1),d2)),1/den);
            const center = G.scale(p.reduce((a,b)=>G.add(a,b),[0,0,0]),1/6);
            const nearest = G.add(point,G.scale(u,G.dot(G.sub(center,point),u)/den));
            const radius = Math.max(1,...model.vertices.map(v=>G.norm(G.sub(v,center))))*1.15;
            const direction = G.scale(u,radius/Math.sqrt(den));
            item.endpoints = [G.sub(nearest,direction),G.add(nearest,direction)];
            item.endpointRefs = ["c:"+c.id+":A","c:"+c.id+":B"];
            item.endpoints.forEach((P,i)=>{named(item.endpointRefs[i],"",P);points.get(item.endpointRefs[i]).internal=true;});
          }
        }
        if (c.type === "commonPerpendicular") {
          if (!solid) throw Error("Vuông góc chung áp dụng cho hai đường chéo nhau trong không gian.");
          const u=G.sub(p[1],p[0]),v=G.sub(p[3],p[2]),w=G.sub(p[2],p[0]);
          const aa=G.dot(u,u),bb=G.dot(v,v),ab=G.dot(u,v),den=aa*bb-ab*ab;
          if (aa<EPS*EPS || bb<EPS*EPS || Math.abs(den)<=1e-12*aa*bb) throw Error("Chọn hai đường khác không và không song song.");
          const wu=G.dot(w,u),wv=G.dot(w,v);
          const H=G.add(p[0],G.scale(u,(wu*bb-wv*ab)/den));
          const K=G.add(p[2],G.scale(v,(wu*ab-wv*aa)/den));
          item.length=G.norm(G.sub(K,H));
          if(item.length<EPS) throw Error("Hai đường cắt nhau; khoảng cách bằng 0, không có đoạn vuông góc chung khác không.");
          item.endpoints=[H,K]; item.endpointRefs=["c:"+c.id+":H","c:"+c.id+":K"];
          named(item.endpointRefs[0],c.label || "H",H); named(item.endpointRefs[1],c.secondLabel || "K",K);
        }
        if (c.type === "tangent") {
          if(solid) throw Error("Tiếp tuyến đường tròn áp dụng cho hình phẳng.");
          const radius=G.norm(G.sub(p[1],p[0])),u=G.sub(p[2],p[0]),d2=G.dot(u,u);
          if(radius<EPS || d2<radius*radius*(1-1e-10)) throw Error("Bán kính phải dương và điểm tiếp tuyến phải nằm trên hoặc ngoài đường tròn.");
          const foot=G.add(p[0],G.scale(u,radius*radius/d2));
          const k=radius*Math.sqrt(Math.max(0,d2-radius*radius))/d2;
          const perp=[-u[1],u[0]];
          item.tangentPoints=[G.add(foot,G.scale(perp,k)),G.sub(foot,G.scale(perp,k))];
          item.pairs=item.tangentPoints.map(T=>[p[2],T]);
          if(k<EPS) { item.tangentPoints=item.tangentPoints.slice(0,1); item.pairs=[[G.sub(p[2],perp),G.add(p[2],perp)]]; }
          item.tangentPoints.forEach((T,i)=>named("c:"+c.id+":T"+(i+1),i ? c.secondLabel || "T₂" : c.label || "T₁",T));
        }
        if (c.type === "intersection") {
          item.point = intersection(...p);
          named("c:" + c.id, c.label || "I", item.point);
        }
        if (["centroid", "median", "bisector"].includes(c.type)) {
          const u = G.sub(p[1], p[0]),
            v = G.sub(p[2], p[0]),
            cross =
              u.length === 2
                ? Math.abs(u[0] * v[1] - u[1] * v[0])
                : G.norm(G.cross(u, v));
          if (
            G.norm(u) < EPS ||
            G.norm(v) < EPS ||
            cross <= EPS * G.norm(u) * G.norm(v)
          )
            throw Error("Ba điểm thẳng hàng; hãy chọn một tam giác.");
        }
        if (c.type === "centroid") {
          item.point = G.scale(G.add(G.add(p[0], p[1]), p[2]), 1 / 3);
          item.medians = p.map((P, i) => [
            P,
            G.mid(p[(i + 1) % 3], p[(i + 2) % 3]),
          ]);
          item.medians.forEach((pair, i) => {
            const key = "c:" + c.id + ":M" + i;
            named(key, "", pair[1]);
            points.get(key).internal = true;
          });
          named("c:" + c.id, c.label || "G", item.point);
        }
        if (c.type === "median" || c.type === "bisector") {
          if (c.type === "median") {
            item.foot = G.mid(p[1], p[2]);
            item.endpoints = [p[0], item.foot];
            item.endpointRefs = [c.refs[0], "c:" + c.id];
          } else {
            const a = G.norm(G.sub(p[0], p[1])),
              b = G.norm(G.sub(p[2], p[1]));
            if (a < EPS || b < EPS)
              throw Error("Phân giác cần hai cạnh khác không.");
            const u = G.scale(G.sub(p[0], p[1]), 1 / a),
              v = G.scale(G.sub(p[2], p[1]), 1 / b);
            if (G.norm(G.add(u, v)) < EPS)
              throw Error(
                "Góc bẹt không xác định phân giác trong của tam giác.",
              );
            item.foot = G.scale(
              G.add(G.scale(p[0], b), G.scale(p[2], a)),
              1 / (a + b),
            );
            item.endpoints = [p[1], item.foot];
            item.endpointRefs = [c.refs[1], "c:" + c.id];
          }
          named(
            "c:" + c.id,
            c.label || (c.type === "median" ? "M" : "D"),
            item.foot,
          );
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
            item.endpointRefs = ["c:" + c.id + ":A", "c:" + c.id + ":B"];
            item.endpoints.forEach((P, i) => {
              const key = item.endpointRefs[i];
              named(key, "", P);
              points.get(key).internal = true;
            });
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
            item.endpointRefs = [c.refs[2], "c:" + c.id];
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
        if (c.type === "rightAngle") {
          const u = G.sub(p[0], p[1]),
            v = G.sub(p[2], p[1]),
            nu = G.norm(u),
            nv = G.norm(v);
          if (nu < EPS || nv < EPS) throw Error("Điểm cạnh góc vuông trùng đỉnh.");
          item.vertex = p[1];
          item.a = p[0];
          item.c = p[2];
          item.angle =
            (Math.acos(Math.max(-1, Math.min(1, G.dot(u, v) / (nu * nv)))) *
              180) /
            Math.PI;
        }
        if (c.type === "equalTick") {
          item.length = G.norm(G.sub(p[1], p[0]));
          if (item.length < EPS) throw Error("Hai điểm trùng nhau.");
          item.endpoints = [p[0], p[1]];
          item.tickCount = c.tickCount || 1;
        }
        if (c.type === "parallelArrow") {
          item.length = G.norm(G.sub(p[1], p[0]));
          if (item.length < EPS) throw Error("Hai điểm trùng nhau.");
          item.endpoints = [p[0], p[1]];
          item.arrowCount = c.arrowCount || 1;
        }
        if (c.type === "altitude") {
          const bc = G.sub(p[2], p[1]),
            den = G.dot(bc, bc);
          if (den < EPS) throw Error("Cạnh đáy không xác định.");
          item.foot = G.add(
            p[1],
            G.scale(bc, G.dot(G.sub(p[0], p[1]), bc) / den),
          );
          item.endpoints = [p[0], item.foot];
          item.endpointRefs = [c.refs[0], "c:" + c.id];
          named("c:" + c.id, c.label || "H", item.foot);
        }
        if (c.type === "orthocenter") {
          const bc = G.sub(p[2], p[1]),
            denA = G.dot(bc, bc),
            ca = G.sub(p[0], p[2]),
            denB = G.dot(ca, ca);
          if (denA < EPS || denB < EPS) throw Error("Tam giác không hợp lệ.");
          const Ha = G.add(
              p[1],
              G.scale(bc, G.dot(G.sub(p[0], p[1]), bc) / denA),
            ),
            Hb = G.add(
              p[2],
              G.scale(ca, G.dot(G.sub(p[1], p[2]), ca) / denB),
            );
          item.point = intersection(p[0], Ha, p[1], Hb);
          item.altitudes = [
            [p[0], Ha],
            [p[1], Hb],
          ];
          named("c:" + c.id, c.label || "H", item.point);
        }
        if (c.type === "incenter") {
          if (solid) throw Error("Đường tròn nội tiếp hỗ trợ hình phẳng.");
          const t = G.triangleData(p);
          if (!t.incenter || !Number.isFinite(t.inradius))
            throw Error("Ba điểm thẳng hàng.");
          item.center = t.incenter;
          item.radius = t.inradius;
          named("c:" + c.id, c.label || "I", item.center);
        }
        if (c.type === "highlightPlane") {
          item.points = p;
          item.color = c.color || "#e8b84b30";
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
        (c.lineMode !== undefined &&
          !["auto", "solid", "dashed"].includes(c.lineMode)) ||
        !Object.hasOwn(operations,c.type) ||
        !Array.isArray(c.refs) ||
        c.refs.length !== operations[c.type] ||
        c.refs.some((r) => typeof r !== "string" || r.length > 100) ||
        (c.type==='freePoint'&&(!Array.isArray(c.point)||c.point.length!==(solid?3:2)||c.point.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))) ||
        (c.rotationAngle!==undefined&&(!Number.isFinite(c.rotationAngle)||Math.abs(c.rotationAngle)>36000)) ||
        (c.planeLabel!==undefined&&(typeof c.planeLabel!=='string'||c.planeLabel.length>24)) ||
        (c.ratio !== undefined && (!Number.isFinite(c.ratio) || c.ratio <= 0 || c.ratio >= 1)) ||
        (c.secondLabel !== undefined && (typeof c.secondLabel !== "string" || c.secondLabel.length > 16)) ||
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
      if (
        [
          "freePoint","translate","rotate","reflectLine",
          "midpoint",
          "perpendicularBisector",
          "reflectPoint",
          "dividePoint",
          "linePlane",
          "projectPlane",
          "distancePlane",
          "perpendicular",
          "circumcircle",
          "intersection",
          "centroid",
          "median",
          "bisector",
          "altitude",
          "orthocenter",
          "incenter",
        ].includes(c.type)
      )
        known.add("c:" + c.id);
      if (["parallel", "perpendicularBisector"].includes(c.type)) {
        known.add("c:" + c.id + ":A");
        known.add("c:" + c.id + ":B");
      }
      if(c.type === "planePlane") for(const suffix of [":A",":B"]) known.add("c:"+c.id+suffix);
      if(c.type === "commonPerpendicular") for(const suffix of [":H",":K"]) known.add("c:"+c.id+suffix);
      if(c.type === "tangent") for(const suffix of [":T1",":T2"]) known.add("c:"+c.id+suffix);
      if (c.type === "centroid")
        for (let i = 0; i < 3; i++) known.add("c:" + c.id + ":M" + i);
      if (c.type === "section")
        for (let i = 0; i < 40; i++) known.add("c:" + c.id + ":" + i);
    }
  }
  root.Constructions = { operations, section, intersection, build, validate };
})(typeof window !== "undefined" ? window : globalThis);
