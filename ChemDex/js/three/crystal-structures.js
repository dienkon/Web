import * as THREE from "three";

function v(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

function addAtomMesh(group, position, color, radius = 0.22) {
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.08,
    clearcoat: 0.45,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 28), mat);
  sphere.position.copy(position);
  group.add(sphere);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.18, 18, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
    }),
  );
  glow.position.copy(position);
  group.add(glow);
  return sphere;
}

function addBond(group, from, to, color = 0x8cc7ff, opacity = 0.28) {
  const lineGeo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    }),
  );
  group.add(line);
  return line;
}

export function createCubeOutline(
  size = 4.2,
  color = 0x8cc7ff,
  opacity = 0.28,
) {
  const group = new THREE.Group();
  const s = size / 2;
  const pts = [
    v(-s, -s, -s),
    v(s, -s, -s),
    v(s, s, -s),
    v(-s, s, -s),
    v(-s, -s, s),
    v(s, -s, s),
    v(s, s, s),
    v(-s, s, s),
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  edges.forEach(([a, b]) => addBond(group, pts[a], pts[b], color, opacity));
  return group;
}

function cubeCorners(size = 4.2) {
  const s = size / 2;
  return [
    v(-s, -s, -s),
    v(s, -s, -s),
    v(s, s, -s),
    v(-s, s, -s),
    v(-s, -s, s),
    v(s, -s, s),
    v(s, s, s),
    v(-s, s, s),
  ];
}

function faceCenters(size = 4.2) {
  const s = size / 2;
  return [
    v(0, 0, s),
    v(0, 0, -s),
    v(0, s, 0),
    v(0, -s, 0),
    v(s, 0, 0),
    v(-s, 0, 0),
  ];
}

// -----------------------------------------------------
// CÁC HÀM XÂY DỰNG MẠNG TINH THỂ CƠ BẢN VÀ PHỨC TẠP
// -----------------------------------------------------

function buildGenericCube(group) {
  const corners = cubeCorners();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.2));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.4));
}

function buildBCC(group) {
  const corners = cubeCorners();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.2));
  const c = v(0, 0, 0);
  addAtomMesh(group, c, 0xe9f7ff, 0.34);
  // Nối tâm với 8 góc
  corners.forEach((p) => addBond(group, p, c, 0x6fb6ff, 0.25));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.25));
}

function buildFCC(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.19));
  faces.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.24));

  // Tạo đường nối chữ X trên các mặt của FCC cho chuẩn xác
  const s = 4.2 / 2;
  const cutoff = s * Math.sqrt(2) * 1.05;
  faces.forEach((f) => {
    corners.forEach((c) => {
      if (f.distanceTo(c) < cutoff) addBond(group, f, c, 0xffd166, 0.2);
    });
  });
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.4));
}

function buildNaCl(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  const naColor = 0x89c7ff;
  const clColor = 0xc58bff;

  corners.forEach((p) => addAtomMesh(group, p, naColor, 0.18));
  faces.forEach((p) => addAtomMesh(group, p, naColor, 0.18));

  // Tâm và các cạnh trung tâm
  const centerEdges = [
    v(0, 0, 0),
    v(2.1, 0, 0),
    v(-2.1, 0, 0),
    v(0, 2.1, 0),
    v(0, -2.1, 0),
    v(0, 0, 2.1),
    v(0, 0, -2.1),
  ];
  centerEdges.forEach((p) => addAtomMesh(group, p, clColor, 0.22));

  // Nối khung cơ bản của lưới NaCl
  addBond(group, v(-2.1, 0, 0), v(2.1, 0, 0), 0x7ee7ff, 0.3);
  addBond(group, v(0, -2.1, 0), v(0, 2.1, 0), 0x7ee7ff, 0.3);
  addBond(group, v(0, 0, -2.1), v(0, 0, 2.1), 0x7ee7ff, 0.3);

  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.4));
}

function buildCsCl(group) {
  const corners = cubeCorners();
  corners.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.18));
  const c = v(0, 0, 0);
  addAtomMesh(group, c, 0x89c7ff, 0.36);
  corners.forEach((p) => addBond(group, p, c, 0x7ee7ff, 0.25));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.4));
}

function buildDiamond(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18));
  faces.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18)); // FCC base

  const q = 4.2 / 4; // 1/4 của size
  // 4 nguyên tử bên trong tạo cấu trúc tứ diện
  const inner = [v(q, q, q), v(q, -q, -q), v(-q, q, -q), v(-q, -q, q)];

  inner.forEach((p) => addAtomMesh(group, p, 0xc58bff, 0.2));

  // Tính khoảng cách bond cho cấu trúc tứ diện
  const bondDist = Math.sqrt(3) * q * 1.05;
  const allOuterAtoms = [...corners, ...faces];

  inner.forEach((inAtom) => {
    allOuterAtoms.forEach((outAtom) => {
      if (inAtom.distanceTo(outAtom) < bondDist) {
        addBond(group, inAtom, outAtom, 0x9ad7ff, 0.4);
      }
    });
  });
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.25));
}

function buildZincBlende(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18));
  faces.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18));

  const q = 4.2 / 4;
  const tetra = [v(q, q, q), v(q, -q, -q), v(-q, q, -q), v(-q, -q, q)];

  tetra.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.17));

  const bondDist = Math.sqrt(3) * q * 1.05;
  const allOuterAtoms = [...corners, ...faces];
  tetra.forEach((inAtom) => {
    allOuterAtoms.forEach((outAtom) => {
      if (inAtom.distanceTo(outAtom) < bondDist) {
        addBond(group, inAtom, outAtom, 0xffd166, 0.3);
      }
    });
  });
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.25));
}

// -----------------------------------------------------
// CẤU TRÚC LỤC GIÁC (MỚI & CẬP NHẬT)
// -----------------------------------------------------

// Mạng lục giác đơn giản (Đúng chuẩn hình ảnh yêu cầu)
function buildSimpleHexagonal(group) {
  const r = 2.0;
  const h = 4.2;
  const top = [],
    bot = [];

  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    top.push(v(r * Math.cos(a), h / 2, r * Math.sin(a)));
    bot.push(v(r * Math.cos(a), -h / 2, r * Math.sin(a)));
  }

  const topC = v(0, h / 2, 0);
  const botC = v(0, -h / 2, 0);

  // Render nguyên tử
  [...top, ...bot, topC, botC].forEach((p) =>
    addAtomMesh(group, p, 0x89c7ff, 0.2),
  );

  // Render các đường nối (Bonds)
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    // Viền lục giác trên & dưới
    addBond(group, top[i], top[next], 0x8cc7ff, 0.35);
    addBond(group, bot[i], bot[next], 0x8cc7ff, 0.35);
    // Cột dọc
    addBond(group, top[i], bot[i], 0x8cc7ff, 0.35);
    // Nan hoa nối vào tâm
    addBond(group, top[i], topC, 0x8cc7ff, 0.25);
    addBond(group, bot[i], botC, 0x8cc7ff, 0.25);
  }
}

// Mạng Lục giác xếp chặt (HCP) - Dựa trên form lục giác chuẩn
function buildHCP(group) {
  const r = 2.0;
  const h = 4.2;

  const top = [];
  const bot = [];

  // Lục giác trên và dưới
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;

    top.push(v(r * Math.cos(a), h / 2, r * Math.sin(a)));

    bot.push(v(r * Math.cos(a), -h / 2, r * Math.sin(a)));
  }

  const topC = v(0, h / 2, 0);
  const botC = v(0, -h / 2, 0);

  // Các nút mạng
  [...top, ...bot, topC, botC].forEach((p) =>
    addAtomMesh(group, p, 0x89c7ff, 0.2),
  );

  // Khung ngoài HCP
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;

    // Vòng trên
    addBond(group, top[i], top[next], 0x8cc7ff, 0.3);

    // Vòng dưới
    addBond(group, bot[i], bot[next], 0x8cc7ff, 0.3);

    // Cột đứng
    addBond(group, top[i], bot[i], 0x8cc7ff, 0.15);

    // Nối tâm trên
    addBond(group, top[i], topC, 0x8cc7ff, 0.2);

    // Nối tâm dưới
    addBond(group, bot[i], botC, 0x8cc7ff, 0.2);
  }

  // ==========================================
  // 3 nguyên tử lớp giữa (đặc trưng HCP)
  // ==========================================
  const mid = [];
  const dist = r / Math.sqrt(3);

  for (let i = 0; i < 3; i++) {
    const a = (Math.PI / 3) * (2 * i) + Math.PI / 6;

    mid.push(v(dist * Math.cos(a), 0, dist * Math.sin(a)));
  }

  // Vẽ các nguyên tử giữa
  mid.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.2));

  // Tam giác giữa
  addBond(group, mid[0], mid[1], 0xffd166, 0.3);
  addBond(group, mid[1], mid[2], 0xffd166, 0.3);
  addBond(group, mid[2], mid[0], 0xffd166, 0.3);
}

function buildWurtzite(group) {
  buildHCP(group);
  const r = 2.0 / Math.sqrt(3);
  const offsetZ = 1.0;
  const midInner = [];

  for (let i = 0; i < 3; i++) {
    const a = (Math.PI / 3) * (2 * i) + Math.PI / 6;
    midInner.push(v(r * Math.cos(a), offsetZ, r * Math.sin(a)));
  }
  midInner.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.17));
  // Nối (bản giản lược cho đồ họa)
  midInner.forEach((p) => addBond(group, p, v(0, 4.2 / 2, 0), 0x7dd3fc, 0.2));
}

// -----------------------------------------------------
// CÁC MẠNG KHÁC (ĐÃ CHUẨN HÓA BOND)
// -----------------------------------------------------

function buildFluorite(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18));
  faces.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.18));

  const q = 4.2 / 4;
  const tetra = [
    v(q, q, q),
    v(q, -q, -q),
    v(-q, q, -q),
    v(-q, -q, q),
    v(-q, -q, -q),
    v(-q, q, q),
    v(q, -q, q),
    v(q, q, -q), // 8 lỗ trống tứ diện
  ];

  tetra.forEach((p) => addAtomMesh(group, p, 0xc58bff, 0.18));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.3));
}

function buildAntifluorite(group) {
  const corners = cubeCorners();
  const faces = faceCenters();
  corners.forEach((p) => addAtomMesh(group, p, 0xc58bff, 0.25));
  faces.forEach((p) => addAtomMesh(group, p, 0xc58bff, 0.25));

  const q = 4.2 / 4;
  const tetra = [
    v(q, q, q),
    v(q, -q, -q),
    v(-q, q, -q),
    v(-q, -q, q),
    v(-q, -q, -q),
    v(-q, q, q),
    v(q, -q, q),
    v(q, q, -q),
  ];
  tetra.forEach((p) => addAtomMesh(group, p, 0xffca6f, 0.16));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.3));
}

function buildRutile(group) {
  const corners = cubeCorners();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.16));
  const center = v(0, 0, 0);
  addAtomMesh(group, center, 0xe9f7ff, 0.27);

  addAtomMesh(group, v(0, -1.5, 0), 0xffca6f, 0.23);
  addAtomMesh(group, v(0, 1.5, 0), 0xffca6f, 0.23);
  addBond(group, v(0, -1.5, 0), v(0, 1.5, 0), 0xffd166, 0.3);
  corners.forEach((p) => addBond(group, center, p, 0x8cc7ff, 0.15));
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.25));
}

function buildPerovskite(group) {
  const corners = cubeCorners();
  corners.forEach((p) => addAtomMesh(group, p, 0x89c7ff, 0.16));
  addAtomMesh(group, v(0, 0, 0), 0xe9f7ff, 0.3);
  faceCenters().forEach((p) => {
    addAtomMesh(group, p, 0xffca6f, 0.18);
    addBond(group, p, v(0, 0, 0), 0x7dd3fc, 0.2);
  });
  group.add(createCubeOutline(4.2, 0x8cc7ff, 0.3));
}

function buildHexLayer(
  group,
  { y = 0, r = 1.45, atomColor = 0x89c7ff, bondColor = 0x8cc7ff },
) {
  const ring = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ring.push(v(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  ring.forEach((p, i) => {
    addAtomMesh(group, p, atomColor, 0.18);
    addBond(group, p, ring[(i + 1) % ring.length], bondColor, 0.25);
  });
  return ring;
}

function buildGraphite(group) {
  const layers = [-1.5, 0, 1.5];
  layers.forEach((y, idx) => {
    const ring = buildHexLayer(group, {
      y,
      r: 1.8,
      atomColor: idx === 1 ? 0xe9f7ff : 0x89c7ff,
      bondColor: 0x8cc7ff,
    });
    // Nối các lớp với nhau tạo thành mạng tinh thể
    if (idx < 2) {
      ring.forEach((p) =>
        addBond(group, p, v(p.x, layers[idx + 1], p.z), 0x6fb6ff, 0.1),
      );
    }
  });
}

// -----------------------------------------------------
// TỪ ĐIỂN VÀ CÁC HÀM XUẤT (EXPORTS)
// -----------------------------------------------------

export const CRYSTAL_STRUCTURE_LIBRARY = {
  sc: { title: "Lập phương đơn", build: buildGenericCube },
  bcc: { title: "Lập phương tâm khối", build: buildBCC },
  fcc: { title: "Lập phương tâm diện", build: buildFCC },
  hcp: { title: "Lục giác xếp chặt", build: buildHCP },
  sh: { title: "Lục giác đơn giản", build: buildSimpleHexagonal }, // <--- ĐÃ UPDATE MỚI
  diamond: { title: "Cấu trúc kim cương", build: buildDiamond },
  nacl: { title: "Muối ăn (NaCl)", build: buildNaCl },
  cscl: { title: "CsCl", build: buildCsCl },
  zincblende: { title: "Zinc blende", build: buildZincBlende },
  wurtzite: { title: "Wurtzite", build: buildWurtzite },
  fluorite: { title: "Fluorite", build: buildFluorite },
  antifluorite: { title: "Antifluorite", build: buildAntifluorite },
  rutile: { title: "Rutile", build: buildRutile },
  perovskite: { title: "Perovskite", build: buildPerovskite },
  graphite: { title: "Graphite", build: buildGraphite },
  hex: { title: "Mạng lục giác", build: buildHCP },
  gray: { title: "Dạng xám lớp chồng", build: buildGraphite },
  molecular: { title: "Mạng phân tử", build: buildGenericCube },
  unknown: { title: "Mạng tinh thể", build: buildGenericCube },
};

export function inferCrystalStructureKey(el = {}) {
  const raw = [
    el?.structure?.lattice,
    el?.structure?.latticeType,
    el?.structure?.crystal,
    el?.structure?.crystalType,
    el?.general?.crystalStructure,
    el?.general?.lattice,
    el?.lattice,
    el?.solid?.lattice,
    el?.structureType,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    .join(" ");

  if (/sh|simple hexagonal|lục giác đơn giản/.test(raw)) return "sh"; // <--- ĐÃ UPDATE NHẬN DIỆN
  if (/nacl|rock\s*salt|muối|halite/.test(raw)) return "nacl";
  if (/cscl/.test(raw)) return "cscl";
  if (/zinc|blende|sphalerite|sfalerit/.test(raw)) return "zincblende";
  if (/wurtzite|lục giác zinc/.test(raw)) return "wurtzite";
  if (/diamond|kim cương/.test(raw)) return "diamond";
  if (/fluorite|canxi florua|caf2/.test(raw)) return "fluorite";
  if (/antifluorite/.test(raw)) return "antifluorite";
  if (/rutile|tio2/.test(raw)) return "rutile";
  if (/perovskite/.test(raw)) return "perovskite";
  if (/graphite|than chì/.test(raw)) return "graphite";
  if (/hcp|hexagonal close packed|lục giác xếp chặt/.test(raw)) return "hcp";
  if (/bcc|body|tâm khối/.test(raw)) return "bcc";
  if (/fcc|face|tâm diện/.test(raw)) return "fcc";
  if (/sc|simple cubic|lập phương đơn/.test(raw)) return "sc";
  if (/molecular/.test(raw)) return "molecular";
  if (/hex|lục giác/.test(raw)) return "hex";
  if (/gray/.test(raw)) return "gray";

  return raw ? raw.split(/\s+/)[0] : "unknown";
}

export function inferCrystalStructureTitle(el = {}, key = "unknown") {
  return (
    el?.structure?.latticeLabel ||
    el?.structure?.crystalLabel ||
    el?.general?.crystalStructure ||
    CRYSTAL_STRUCTURE_LIBRARY[key]?.title ||
    "Mạng tinh thể"
  );
}

export function buildCrystalGroup(key = "unknown", el = {}) {
  const group = new THREE.Group();
  const resolved = inferCrystalStructureKey({ ...el, structureType: key });
  const def =
    CRYSTAL_STRUCTURE_LIBRARY[resolved] || CRYSTAL_STRUCTURE_LIBRARY.unknown;
  def.build(group, el);
  return group;
}
