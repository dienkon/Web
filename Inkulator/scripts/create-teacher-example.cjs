const fs = require("node:fs"),
  path = require("node:path");
require("../js/geometry.js");
require("../js/constructions.js");
require("../js/state.js");
const S = Store,
  p = S.current(),
  n = S.book();
n.title = "Dựng hình thông minh · Sổ tay giáo viên";
p.title = "Trung điểm, đường cao & thiết diện";
p.objects = [];
function text(text, x, y, w, h, fontSize = 20) {
  p.objects.push(
    S.object(
      "text",
      { text, fontSize, baseWidth: w },
      {
        position: { x, y },
        size: { w, h },
        style: { color: "#111111", width: 2.6, opacity: 1 },
      },
    ),
  );
}
text("01  HÌNH PHẲNG · PHỤ THUỘC THEO ĐỊNH NGHĨA", 60, 155, 540, 40, 14);
const triangle = S.object(
  "geometry",
  {
    ...Geometry.flat("triangle"),
    fillOpacity: 0,
    constructions: [
      { id: "midBC", type: "midpoint", refs: ["v:1", "v:2"], label: "M" },
      { id: "lineAM", type: "segment", refs: ["v:0", "c:midBC"] },
      {
        id: "height",
        type: "perpendicular",
        refs: ["v:0", "v:1", "v:2"],
        label: "H",
        dashed: true,
      },
      { id: "angle", type: "angle", refs: ["v:0", "v:1", "v:2"] },
    ],
  },
  {
    position: { x: 40, y: 230 },
    size: { w: 530, h: 410 },
    style: { color: "#111111", width: 2.6, opacity: 1 },
  },
);
p.objects.push(triangle);
text(
  "M là trung điểm BC; CH ⊥ AB.\nKéo một đỉnh: hình và số đo tự cập nhật.",
  60,
  670,
  540,
  80,
  18,
);
text("02  KHÔNG GIAN · THIẾT DIỆN QUA 3 ĐIỂM", 650, 155, 520, 40, 14);
const cube = S.object(
  "solid",
  {
    kind: "cube",
    params: { a: 4, b: 4, h: 4 },
    rotation: [-0.45, -0.55],
    live: false,
    faces: false,
    edges: true,
    hiddenEdges: true,
    labels: true,
    faceColor: "#111111",
    faceOpacity: 0,
    aux: [],
    sectionFill: true,
    constructions: [
      { id: "M", type: "midpoint", refs: ["v:0", "v:1"], label: "M" },
      { id: "N", type: "midpoint", refs: ["v:0", "v:3"], label: "N" },
      { id: "P", type: "midpoint", refs: ["v:0", "v:4"], label: "P" },
      { id: "plane", type: "section", refs: ["c:M", "c:N", "c:P"], label: "Q" },
    ],
  },
  {
    position: { x: 620, y: 240 },
    size: { w: 530, h: 390 },
    style: { color: "#111111", width: 2.6, opacity: 1 },
  },
);
p.objects.push(cube);
text(
  "M, N, P là trung điểm 3 cạnh qua A.\nMặt phẳng (MNP) cắt khối theo tam giác đều.",
  650,
  670,
  520,
  80,
  18,
);
p.objects.push(
  S.object(
    "formula",
    {
      text: "S_{MNP}=2\\sqrt{3},\\quad V_{ABCD.A^{\\prime}B^{\\prime}C^{\\prime}D^{\\prime}}=64",
      tex: "S_{MNP}=2\\sqrt{3},\\quad V_{ABCD.A^{\\prime}B^{\\prime}C^{\\prime}D^{\\prime}}=64",
      fontSize: 25,
    },
    {
      position: { x: 120, y: 825 },
      size: { w: 950, h: 70 },
      style: { color: "#111111", width: 2.6, opacity: 1 },
    },
  ),
);
fs.writeFileSync(
  path.resolve(__dirname, "../examples/Teacher-Geometry.smath.json"),
  JSON.stringify(S.envelope(), null, 2),
);
console.log("Created Teacher-Geometry.smath.json");
