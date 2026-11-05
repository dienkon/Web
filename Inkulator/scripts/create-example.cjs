const fs = require("node:fs");
const path = require("node:path");
require("../js/math-engine.js");
require("../js/geometry.js");
require("../js/state.js");
const S = Store,
  n = S.book(),
  p = S.current();
n.title = "Toán 12 · Đạo hàm & không gian";
n.folder = "Bài học mẫu";
p.title = "Khảo sát hàm số & hình học không gian";
p.objects = [];
function text(content, x, y, w, h, color = "#355d49", size = 22) {
  p.objects.push(
    S.object(
      "text",
      { text: content, math: true, fontSize: size, baseWidth: w },
      {
        position: { x, y },
        size: { w, h },
        style: { color, width: 2, opacity: 1 },
      },
    ),
  );
}
text("01   KHẢO SÁT HÀM SỐ", 60, 160, 550, 40, "#7b9383", 15);
text("f(x) = x³ − 3x", 60, 205, 500, 45, "#2b5d46", 28);
p.objects.push(
  S.object(
    "graph",
    {
      expressions: [
        { text: "x^3-3x", color: "#27836d", visible: true },
        { text: "x", color: "#cd8370", visible: true },
      ],
      view: { xmin: -3.5, xmax: 3.5, ymin: -4, ymax: 4 },
      params: {},
      markers: [
        { x: -1, y: 2 },
        { x: 1, y: -2 },
      ],
      axes: true,
      tangent: null,
      shade: null,
    },
    { position: { x: 60, y: 275 }, size: { w: 550, h: 340 } },
  ),
);
text(
  "f′(x) = 3x² − 3 = 0  ⇔  x = ±1\nCực đại: (−1; 2) · Cực tiểu: (1; −2)",
  60,
  650,
  560,
  85,
  "#536b5d",
  19,
);
text("02   CHÓP S.ABCD · SA ⊥ ĐÁY", 685, 160, 450, 40, "#7b9383", 15);
text("AB = 4; SA = 6", 685, 205, 400, 45, "#2b5d46", 25);
p.objects.push(
  S.object(
    "solid",
    {
      kind: "right-pyramid",
      params: { a: 4, b: 3, h: 6 },
      rotation: [-0.32, -0.7],
      live: true,
      faces: true,
      edges: true,
      hiddenEdges: true,
      labels: true,
      faceColor: "#438b73",
      faceOpacity: 0.11,
      aux: [{ type: "height" }, { type: "midpoint", a: 1, b: 2, label: "M" }],
    },
    {
      position: { x: 670, y: 275 },
      size: { w: 470, h: 340 },
      style: { color: "#426b54", width: 1.8, opacity: 1 },
    },
  ),
);
text(
  "V = ⅓ · Sđáy · h\n   = ⅓ · 4² · 6 = 32 đv³",
  685,
  650,
  430,
  85,
  "#536b5d",
  21,
);
text(
  "Ghi nhớ: đạo hàm cho biết chiều biến thiên của hàm số.\nVới hình chóp, xác định đúng đường cao trước khi tính thể tích.",
  60,
  825,
  1060,
  100,
  "#718b79",
  20,
);
const out = path.resolve(__dirname, "../examples");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "Toan-12.smath.json"),
  JSON.stringify(S.envelope(), null, 2),
);
console.log("Created examples/Toan-12.smath.json");
