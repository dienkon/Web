import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildCrystalGroup,
  createCubeOutline,
} from "./three/crystal-structures.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { detailedData, elNames, elSymbols, categories } from "../data/index.js";

// Khởi tạo 118 nguyên tố với layout logic & data cơ bản
const allElements = elNames.map((name, i) => {
  let z = i + 1;
  let el = {
    number: z,
    symbol: elSymbols[i],
    nameVi: name,
    nameEn: elSymbols[i],
    mass: 0,
    category: "unknown",
    hasData: false,
  };

  // Layout Algorithm & Category Basic Setup
  if (z >= 1 && z <= 2) {
    el.ypos = 1;
    el.xpos = z === 1 ? 1 : 18;
    el.category = z === 1 ? "phi-kim" : "khi-hiem";
  } else if (z >= 3 && z <= 10) {
    el.ypos = 2;
    el.xpos = z <= 4 ? z - 2 : z + 8;
  } else if (z >= 11 && z <= 18) {
    el.ypos = 3;
    el.xpos = z <= 12 ? z - 10 : z;
  } else if (z >= 19 && z <= 36) {
    el.ypos = 4;
    el.xpos = z - 18;
  } else if (z >= 37 && z <= 54) {
    el.ypos = 5;
    el.xpos = z - 36;
  } else if (z >= 55 && z <= 86) {
    if (z >= 55 && z <= 56) {
      el.ypos = 6;
      el.xpos = z - 54;
    } else if (z >= 57 && z <= 71) {
      el.ypos = 9;
      el.xpos = z - 57 + 4;
      el.category = "lanthanide";
    } else {
      el.ypos = 6;
      el.xpos = z - 71 + 3;
    }
  } else if (z >= 87 && z <= 118) {
    if (z >= 87 && z <= 88) {
      el.ypos = 7;
      el.xpos = z - 86;
    } else if (z >= 89 && z <= 103) {
      el.ypos = 10;
      el.xpos = z - 89 + 4;
      el.category = "actinide";
    } else {
      el.ypos = 7;
      el.xpos = z - 103 + 3;
    }
  }
  // Shift Grid to make room for row/col labels (labels take row 1 and col 1)
  if (el.xpos) el.xpos += 1;
  if (el.ypos) el.ypos += 1;
  return el;
});
// Data chi tiết một số chất (Mock Data with rich HTML to demonstrate styling capabilities)
// Map detailed data into allElements
detailedData.forEach((d) => {
  let target = allElements.find((e) => e.number === d.number);
  if (target) Object.assign(target, d);
});

let elementsMap = new Map();
allElements.forEach((el) => elementsMap.set(el.symbol, el));

const SUBSCRIPT_MAP = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

const SUPERSCRIPT_MAP = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

const NOBLE_GAS_SHELLS = {
  He: [2],
  Ne: [2, 8],
  Ar: [2, 8, 8],
  Kr: [2, 8, 18, 8],
  Xe: [2, 8, 18, 18, 8],
  Rn: [2, 8, 18, 32, 18, 8],
  Og: [2, 8, 18, 32, 32, 18, 8],
};

const NOBLE_GAS_ORBITALS = {
  He: [{ shell: 1, orbital: "s", count: 2 }],
  Ne: [
    { shell: 1, orbital: "s", count: 2 },
    { shell: 2, orbital: "s", count: 2 },
    { shell: 2, orbital: "p", count: 6 },
  ],
  Ar: [
    { shell: 1, orbital: "s", count: 2 },
    { shell: 2, orbital: "s", count: 2 },
    { shell: 2, orbital: "p", count: 6 },
    { shell: 3, orbital: "s", count: 2 },
    { shell: 3, orbital: "p", count: 6 },
  ],
  Kr: [
    { shell: 1, orbital: "s", count: 2 },
    { shell: 2, orbital: "s", count: 2 },
    { shell: 2, orbital: "p", count: 6 },
    { shell: 3, orbital: "s", count: 2 },
    { shell: 3, orbital: "p", count: 6 },
    { shell: 3, orbital: "d", count: 10 },
    { shell: 4, orbital: "s", count: 2 },
    { shell: 4, orbital: "p", count: 6 },
  ],
  Xe: [
    { shell: 1, orbital: "s", count: 2 },
    { shell: 2, orbital: "s", count: 2 },
    { shell: 2, orbital: "p", count: 6 },
    { shell: 3, orbital: "s", count: 2 },
    { shell: 3, orbital: "p", count: 6 },
    { shell: 3, orbital: "d", count: 10 },
    { shell: 4, orbital: "s", count: 2 },
    { shell: 4, orbital: "p", count: 6 },
    { shell: 4, orbital: "d", count: 10 },
    { shell: 5, orbital: "s", count: 2 },
    { shell: 5, orbital: "p", count: 6 },
  ],
  Rn: [
    { shell: 1, orbital: "s", count: 2 },
    { shell: 2, orbital: "s", count: 2 },
    { shell: 2, orbital: "p", count: 6 },
    { shell: 3, orbital: "s", count: 2 },
    { shell: 3, orbital: "p", count: 6 },
    { shell: 3, orbital: "d", count: 10 },
    { shell: 4, orbital: "s", count: 2 },
    { shell: 4, orbital: "p", count: 6 },
    { shell: 4, orbital: "d", count: 10 },
    { shell: 4, orbital: "f", count: 14 },
    { shell: 5, orbital: "s", count: 2 },
    { shell: 5, orbital: "p", count: 6 },
    { shell: 5, orbital: "d", count: 10 },
    { shell: 6, orbital: "s", count: 2 },
    { shell: 6, orbital: "p", count: 6 },
  ],
};

function normalizeText(value = "") {
  return String(value)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (m) => SUBSCRIPT_MAP[m] || m)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (m) => SUPERSCRIPT_MAP[m] || m);
}

function escapeLatexText(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/([{}_#%&$])/g, "\\$1")
    .replace(/\^/g, "\\^{}");
}

function chemToLatexFormula(text = "") {
  return normalizeText(text)
    .replace(/\s+/g, " ")
    .replace(/([A-Z][a-z]?)(\d+)/g, "$1_{$2}")
    .replace(/([)\]])(\d+)/g, "$1_{$2}")
    .replace(/\^([0-9+-]+)/g, "^{$1}");
}

function getReactionLabels(r = {}) {
  const above = r.catalyst || r.condition || r.cat || "";
  const below =
    r.conditionBelow || r.temperature || r.pressure || r.solvent || "";
  return {
    above: escapeLatexText(normalizeText(above)),
    below: escapeLatexText(normalizeText(below)),
  };
}

function buildReactionLatex(r = {}) {
  const rawInput = normalizeReactionText(r.eq || r.equation || "");
  const raw = rawInput
    .replace(/\\xrightleftharpoons(?:\[[^\]]*\])?\{[^}]*\}/g, "⇌")
    .replace(/\\xrightarrow(?:\[[^\]]*\])?\{[^}]*\}/g, "→")
    .replace(/\\rightleftharpoons|\\leftrightarrow|\\rightarrow/g, "→")
    .replace(/^[\[\(]\s*|\s*[\]\)]$/g, "");

  const splitArrow = raw.split(/(?:→|->|⇌|↔|=)/, 2);
  const leftRaw = (splitArrow[0] || "").trim();
  const rightRaw = (splitArrow[1] || "").trim();
  const left = formatChemicalFormulaHtml(leftRaw);
  const right = formatChemicalFormulaHtml(rightRaw);
  const above = escapeHtml(
    normalizeText(r.catalyst || r.condition || r.cat || ""),
  );
  const below = escapeHtml(
    normalizeText(
      r.conditionBelow || r.temperature || r.pressure || r.solvent || "",
    ),
  );

  const arrowSymbol = raw.includes("⇌") || raw.includes("↔") ? "⇌" : "→";
  const hasLabels = Boolean(above || below);
  const arrowHtml = hasLabels
    ? `<span class="inline-flex flex-col items-center justify-center mx-2 align-middle text-center leading-none"><span class="text-[11px] text-slate-300 min-h-[1em]">${above || "&nbsp;"}</span><span class="text-2xl leading-none">${arrowSymbol}</span><span class="text-[11px] text-slate-300 min-h-[1em]">${below || "&nbsp;"}</span></span>`
    : `<span class="mx-2 text-2xl leading-none align-middle">${arrowSymbol}</span>`;

  return `${left} ${arrowHtml} ${right}`.trim();
}

function parseElectronShellsFromConfig(config = "", atomicNumber = 0) {
  if (Array.isArray(config)) return config.slice();
  if (!config) return fillShellsByAtomicNumber(atomicNumber);

  const named = config.match(/\[(He|Ne|Ar|Kr|Xe|Rn|Og)\]/);
  let shells = named ? (NOBLE_GAS_SHELLS[named[1]] || []).slice() : [];
  const parsed = {};
  const parts = normalizeText(config).split(/\s+/).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)[spdfg](\d+)$/i);
    if (!m) continue;
    const shell = Number(m[1]);
    const count = Number(m[2]);
    parsed[shell] = (parsed[shell] || 0) + count;
  }

  const maxShell = Math.max(
    ...Object.keys(parsed).map(Number),
    shells.length,
    0,
  );
  for (let i = shells.length + 1; i <= maxShell; i++) shells[i - 1] = 0;
  Object.keys(parsed).forEach((k) => {
    shells[Number(k) - 1] = parsed[k];
  });

  if (!shells.length || shells.reduce((a, b) => a + b, 0) < atomicNumber) {
    return fillShellsByAtomicNumber(atomicNumber);
  }
  return shells;
}

function fillShellsByAtomicNumber(z = 0) {
  const caps = [2, 8, 18, 32, 32, 18, 8];
  const shells = [];
  let remaining = Math.max(0, z);
  for (const cap of caps) {
    if (!remaining) break;
    const count = Math.min(cap, remaining);
    shells.push(count);
    remaining -= count;
  }
  return shells.length ? shells : [1];
}

function getElectronConfigText(el) {
  return (
    el?.general?.electronConfig ||
    el?.general?.electron ||
    el?.electronConfig ||
    el?.structure?.electronConfig ||
    "Đang cập nhật"
  );
}

function getElementElectronShells(el) {
  return (
    el?.structure?.shells ||
    el?.general?.shells ||
    parseElectronShellsFromConfig(getElectronConfigText(el), el?.number || 0)
  );
}

function inferLatticeKey(el) {
  const raw = [
    el?.structure?.lattice,
    el?.structure?.latticeType,
    el?.structure?.crystal,
    el?.structure?.crystalType,
    el?.general?.crystalStructure,
    el?.general?.lattice,
    el?.lattice,
    el?.solid?.lattice,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    .join(" ");

  if (/nacl|rock\s*salt|muối|halite/.test(raw)) return "nacl";
  if (/cscl/.test(raw)) return "cscl";
  if (/diamond|kim cương/.test(raw)) return "diamond";
  if (/bcc|body|tâm khối/.test(raw)) return "bcc";
  if (/fcc|face|tâm diện/.test(raw)) return "fcc";
  if (/hcp|hexagonal close packed|lục giác/.test(raw)) return "hcp";
  if (/sc|simple cubic|lập phương đơn/.test(raw)) return "sc";
  return raw ? raw.split(/\s+/)[0] : "bcc";
}

function inferLatticeTitle(el, key) {
  const labels = {
    sc: "Lập phương đơn",
    bcc: "Lập phương tâm khối",
    fcc: "Lập phương tâm diện",
    hcp: "Lục giác xếp chặt",
    diamond: "Cấu trúc kim cương",
    nacl: "Muối ăn (NaCl)",
    cscl: "CsCl",
  };
  return (
    el?.structure?.latticeLabel ||
    el?.structure?.crystalLabel ||
    el?.general?.crystalStructure ||
    labels[key] ||
    "Mạng tinh thể"
  );
}

function normalizeReactionText(text = "") {
  return String(text)
    .replace(/&rarr;|→/g, "→")
    .replace(/&harr;|⇌/g, "⇌")
    .replace(/&uarr;|↑/g, "↑")
    .replace(/&darr;|↓/g, "↓")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function addAtomMesh(group, position, color, radius = 0.24) {
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

function addFaceDots(group, positions, color, radius = 0.2) {
  positions.forEach((p) =>
    addAtomMesh(group, new THREE.Vector3(...p), color, radius),
  );
}

function createFrame(group, size = 4.2, color = 0x8cc7ff, opacity = 0.28) {
  group.add(createCubeOutline(size, color, opacity));
}

function addOctahedralConnectors(group, points, center, color = 0x6fb6ff) {
  points.forEach((p) =>
    addBond(group, new THREE.Vector3(...p), center, color, 0.12),
  );
}

function buildLatticeGroup(key, el) {
  return buildCrystalGroup(key, el);
}

function guessMediaKind(value = "", fallback = "image") {
  const text = String(value || "")
    .toLowerCase()
    .trim();
  if (!text) return fallback;
  if (
    /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(text) ||
    /(^|[?&])type=video/i.test(text) ||
    /^(blob:|data:video)/i.test(text) ||
    /youtube\.com|youtu\.be|vimeo\.com/i.test(text)
  ) {
    return "video";
  }
  return fallback;
}

function getYouTubeEmbedUrl(url = "") {
  const s = String(url || "").trim();
  const m =
    s.match(/youtu\.be\/([\w-]+)/i) ||
    s.match(/[?&]v=([\w-]+)/i) ||
    s.match(/youtube\.com\/shorts\/([\w-]+)/i) ||
    s.match(/youtube\.com\/embed\/([\w-]+)/i);
  if (!m) return "";
  return `https://www.youtube.com/embed/${m[1]}`;
}

function renderMediaPreview(src = "", alt = "", kindHint = "image") {
  const kind = guessMediaKind(src, kindHint);
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt || "Media");
  if (kind === "video") {
    const yt = getYouTubeEmbedUrl(src);
    if (yt) {
      return `<iframe class="w-full h-full" src="${escapeHtml(yt)}" title="${safeAlt}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    return `<video controls playsinline preload="metadata" class="w-full h-full object-cover bg-black"><source src="${safeSrc}"></video>`;
  }
  return `<img src="${safeSrc}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="${safeAlt}" loading="lazy" onerror="this.closest('.media-fallback')?.classList.remove('hidden'); this.classList.add('hidden');"><div class="media-fallback hidden w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">Không tải được media</div>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChemicalFormulaHtml(text = "") {
  let s = normalizeReactionText(text).replace(/^[\[\(]\s*|\s*[\]\)]$/g, "");
  s = escapeHtml(s);
  s = s
    .replace(/_\{([^}]+)\}/g, "<sub>$1</sub>")
    .replace(/_([0-9]+)/g, "<sub>$1</sub>")
    .replace(/\^\{([^}]+)\}/g, "<sup>$1</sup>")
    .replace(/\^([0-9+-]+)/g, "<sup>$1</sup>")
    .replace(/([A-Za-z\)])([0-9]+)/g, "$1<sub>$2</sub>");
  return s;
}

function mediaToCards(source, options = {}) {
  const {
    defaultTitle = "Hình ảnh / video",
    emptyText = "Chưa có dữ liệu.",
    kindHint = null,
  } = options;

  const items = [];

  const pushItem = (item, titleFallback) => {
    if (!item) return;
    if (typeof item === "string") {
      items.push({
        title: titleFallback || defaultTitle,
        src: item,
        kind: guessMediaKind(item, kindHint || "image"),
      });
      return;
    }
    if (typeof item !== "object") return;
    const src = item.src || item.url || item.media || item.link || "";
    if (!src) return;
    items.push({
      title: item.title || item.name || titleFallback || defaultTitle,
      desc: item.desc || item.note || item.caption || "",
      src,
      kind: item.kind || item.type || guessMediaKind(src, kindHint || "image"),
    });
  };

  if (!source) {
    return {
      html: `<p class="text-slate-500 italic">${escapeHtml(emptyText)}</p>`,
      count: 0,
    };
  }

  if (Array.isArray(source)) {
    source.forEach((item, idx) => pushItem(item, `${defaultTitle} ${idx + 1}`));
  } else if (typeof source === "object") {
    if (source.items && Array.isArray(source.items)) {
      source.items.forEach((item, idx) =>
        pushItem(item, `${defaultTitle} ${idx + 1}`),
      );
    } else if (source.src || source.url || source.media) {
      pushItem(source, defaultTitle);
    } else {
      Object.entries(source).forEach(([key, value]) => {
        if (!value) return;
        if (Array.isArray(value)) {
          value.forEach((item, idx) => pushItem(item, `${key} ${idx + 1}`));
          return;
        }
        if (typeof value === "string") {
          pushItem(
            {
              title: key.replace(/_/g, " "),
              src: value,
            },
            key.replace(/_/g, " "),
          );
        }
      });
    }
  } else if (typeof source === "string") {
    pushItem(source, defaultTitle);
  }

  if (!items.length) {
    return {
      html: `<p class="text-slate-500 italic">${escapeHtml(emptyText)}</p>`,
      count: 0,
    };
  }

  const html = items
    .map((item) => {
      const preview = renderMediaPreview(item.src, item.title, item.kind);
      return `
  <div class="glass overflow-hidden rounded-2xl border border-slate-700 group">
    <div class="h-[300px] bg-slate-800 overflow-hidden media-fallback relative">
      ${preview}
    </div>
    <div class="p-4 border-t border-slate-700/60 bg-slate-900/60">
      <div class="font-semibold text-white text-sm">${escapeHtml(item.title || defaultTitle)}</div>
      ${item.desc ? `<p class="text-slate-400 text-xs leading-relaxed mt-1">${escapeHtml(item.desc)}</p>` : ""}
    </div>
  </div>
`;
    })
    .join("");

  return { html, count: items.length };
}

function getReactionMediaBlocks(reaction = {}, reactionIndex = 0) {
  const raw = [
    ...(Array.isArray(reaction.mediaBlocks) ? reaction.mediaBlocks : []),
    ...(Array.isArray(reaction.blocks) ? reaction.blocks : []),
  ];
  if (!raw.length && reaction.video) {
    raw.push({
      type: "video",
      src: reaction.video,
      title: reaction.type || "Video minh họa",
    });
  }
  if (!raw.length && Array.isArray(reaction.videos)) {
    raw.push(
      ...reaction.videos.map((item, idx) =>
        typeof item === "object"
          ? item
          : {
              type: "video",
              src: item,
              title: `${reaction.type || "Video minh họa"} ${idx + 1}`,
            },
      ),
    );
  }
  if (!raw.length && Array.isArray(reaction.media)) raw.push(...reaction.media);

  return raw
    .map((block, idx) => {
      if (!block) return null;
      const type =
        String(block.type || block.kind || "").toLowerCase() || "video";
      const src =
        block.src ||
        block.url ||
        block.link ||
        block.media ||
        block.modelPath ||
        block.path ||
        "";
      return {
        ...block,
        _idx: `reaction-${reactionIndex}-${idx}`,
        _reactionIndex: reactionIndex,
        section: "reaction",
        type,
        title:
          block.title ||
          block.name ||
          reaction.type ||
          `${type.toUpperCase()} ${idx + 1}`,
        desc: block.desc || block.description || block.note || "",
        src,
      };
    })
    .filter(
      (block) =>
        block && (block.src || block.type === "text" || block.type === "html"),
    );
}

function renderReactionMediaBlocks(reaction = {}, reactionIndex = 0, el = {}) {
  const blocks = getReactionMediaBlocks(reaction, reactionIndex);
  if (!blocks.length) return "";
  return blocks
    .map((block, idx) => {
      const id = `reaction-media-${el.symbol || "el"}-${reactionIndex}-${idx}`;
      return `
        <section class="mt-4" data-reaction-media="${id}">
          <div class="detail-media-block">
            <div class="detail-media-head">
              <div>
                <div class="detail-media-title">${escapeHtml(block.title)}</div>
                ${block.desc ? `<div class="detail-media-desc">${escapeHtml(block.desc)}</div>` : ""}
              </div>
              <span class="visual-badge shrink-0">${escapeHtml(block.type.toUpperCase())}</span>
            </div>
            <div class="detail-media-body">
              <div id="${id}"></div>
            </div>
          </div>
        </section>
      `;
    })
    .join("");
}

function renderEquationBlock(r = {}, options = {}) {
  const el = options.el || {};
  const reactionIndex = Number(options.index ?? r._idx ?? 0);
  const eqHtml = buildReactionLatex(r);
  const relatedBtn = r.related
    ? `<button onclick="interlinkElement('${escapeHtml(r.related)}')" class="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-300 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-full transition-colors">Xem ${escapeHtml(r.related)}</button>`
    : "";
  const reactionMediaHtml = renderReactionMediaBlocks(r, reactionIndex, el);
  if (false)
    mediaToCards(r.video || r.media || r.videos, {
      defaultTitle: r.type || "Video minh họa",
      emptyText: "",
      kindHint: "video",
    });
  return `
          <div class="bg-slate-800/40 p-5 rounded-xl border border-slate-700 mb-4">
            <span class="text-xs font-bold px-3 py-1 bg-slate-700 rounded-full text-slate-300 mb-3 inline-block">${escapeHtml(r.type || "Phản ứng")}</span>
            <div class="equation-latex text-xl md:text-2xl font-mono text-emerald-300 mb-3 font-bold bg-slate-900 p-4 rounded-lg overflow-x-auto">${eqHtml}</div>
            <p class="text-slate-400 mb-2">${escapeHtml(r.desc || "")}</p>
            ${relatedBtn}
            ${reactionMediaHtml}
          </div>
        `;
}

function createElectronWidget(container, el) {
  const shellCounts = getElementElectronShells(el).filter((n) => n > 0);
  const configText = getElectronConfigText(el);
  const wrap = container;
  wrap.innerHTML = "";
  wrap.style.position = "relative";
  wrap.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "0";

  const toolbar = document.createElement("div");
  toolbar.className =
    "absolute right-3 top-3 z-20 flex items-center gap-2 flex-wrap justify-end";

  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.className = "visual-badge px-3 py-2";
  zoomOutBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-minus"></i>';

  const zoomInBtn = document.createElement("button");
  zoomInBtn.className = "visual-badge px-3 py-2";
  zoomInBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i>';

  const resetBtn = document.createElement("button");
  resetBtn.className = "visual-badge px-3 py-2";
  resetBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "visual-badge px-3 py-2";
  zoomLabel.textContent = "100%";

  toolbar.append(zoomOutBtn, zoomLabel, zoomInBtn, resetBtn);

  const badge = document.createElement("div");
  // badge.className =
  //   "absolute left-3 top-3 z-10 visual-badge max-w-[75%] break-words";
  // badge.innerHTML = `<i class="fa-solid fa-atoms"></i> <span class="font-mono">${escapeHtml(configText)}</span>`;

  const info = document.createElement("div");
  info.className = "absolute left-3 bottom-3 z-10 max-w-[75%]";

  wrap.append(badge, toolbar, info, canvas);

  const ctx = canvas.getContext("2d");
  let raf = 0;
  let zoom = 1;
  const MIN_ZOOM = 0.72;
  const MAX_ZOOM = 1.9;
  let wheelHandler = null;

  const clampZoom = () => {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };

  const resize = () => {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const orbitalsByShell = getElectronOrbitalLayout(el);
  const shellMeta = shellCounts.map((count, idx) => ({
    shell: idx + 1,
    label: ELECTRON_SHELL_LABELS[idx] || `N${idx + 1}`,
    count,
    segments: orbitalsByShell.get(idx + 1) || [],
  }));

  const drawLegend = () => {
    const chips = [
      ["s", ORBITAL_COLORS.s],
      ["p", ORBITAL_COLORS.p],
      ["d", ORBITAL_COLORS.d],
      ["f", ORBITAL_COLORS.f],
    ]
      .map(
        ([label, color]) => `
                
              `,
      )
      .join("");

    info.innerHTML = `
            <div class="flex flex-wrap gap-2 w-full">
              ${chips}
            </div>
          `;
  };

  const draw = (t) => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const available = Math.min(w, h) * 0.42;
    const ringStep = Math.max(
      20,
      available / Math.max(shellMeta.length + 1, 3),
    );
    const nucleusScale = 0.78 + zoom * 0.28;
    const nucleusRadius = Math.max(10, Math.min(w, h) * 0.055 * nucleusScale);

    const grad = ctx.createRadialGradient(
      cx,
      cy,
      Math.max(0, nucleusRadius * 0.4),
      cx,
      cy,
      Math.max(w, h) * 0.52,
    );
    grad.addColorStop(0, "rgba(59,130,246,0.14)");
    grad.addColorStop(0.55, "rgba(14,165,233,0.06)");
    grad.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    shellMeta.forEach((item, idx) => {
      const shellTotal = Math.max(1, item.count || 0);
      const segments = item.segments.length
        ? item.segments
        : [{ orbital: "s", count: shellTotal }];
      const electronTotal = segments.reduce(
        (sum, seg) => sum + Math.max(0, Number(seg.count) || 0),
        0,
      );
      const radius = ringStep * (idx + 1) * zoom;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle =
        idx % 2 === 0 ? "rgba(148,163,184,0.42)" : "rgba(125,211,252,0.28)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      const labelAngle = -Math.PI / 10;
      const lx = cx + Math.cos(labelAngle) * (radius + 18);
      const ly = cy + Math.sin(labelAngle) * (radius + 18);
      ctx.save();
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillStyle = "rgba(226,232,240,0.86)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.label, lx, ly);
      ctx.restore();

      const expanded = segments.flatMap((seg) =>
        Array.from({ length: Math.max(0, Number(seg.count) || 0) }, () => ({
          orbital: String(seg.orbital || "s").toLowerCase(),
        })),
      );

      while (expanded.length < shellTotal) {
        expanded.push({ orbital: "s" });
      }

      const speed = 0.55 / (idx + 1);
      const total = Math.max(shellTotal, electronTotal, expanded.length, 1);
      for (let i = 0; i < total; i++) {
        const source = expanded[i] || { orbital: "s" };
        const palette =
          ORBITAL_COLORS[source.orbital] || ORBITAL_COLORS.default;
        const angle = (Math.PI * 2 * i) / total + t * 0.0015 * speed;
        const ex = cx + Math.cos(angle) * radius;
        const ey = cy + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(3, 4.8 - idx * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = palette;
        ctx.fill();
      }
    });

    ctx.beginPath();
    ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(248,113,113,0.94)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, nucleusRadius * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = `${Math.max(12, Math.round(nucleusRadius * 0.48))}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(el.symbol || el.number || "•"), cx, cy);

    drawLegend();
  };

  const loop = (t) => {
    draw(t || 0);
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(wrap);

  const applyZoom = (delta) => {
    zoom += delta;
    clampZoom();
  };

  wheelHandler = (ev) => {
    ev.preventDefault();
    applyZoom(ev.deltaY > 0 ? -0.06 : 0.06);
  };
  wrap.addEventListener("wheel", wheelHandler, { passive: false });

  zoomOutBtn.addEventListener("click", () => applyZoom(-0.12));
  zoomInBtn.addEventListener("click", () => applyZoom(0.12));
  resetBtn.addEventListener("click", () => {
    zoom = 1;
    clampZoom();
  });

  clampZoom();
  resize();
  loop();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (wheelHandler) wrap.removeEventListener("wheel", wheelHandler);
      wrap.innerHTML = "";
    },
  };
}

function createCrystalWidget(container, el) {
  const latticeKey = inferLatticeKey(el);
  const title = inferLatticeTitle(el, latticeKey);

  const wrap = container;
  wrap.innerHTML = "";
  wrap.style.position = "relative";
  wrap.style.overflow = "hidden";

  const label = document.createElement("div");
  label.className = "absolute left-3 top-3 z-10 visual-badge";
  label.innerHTML = `<i class="fa-solid fa-cube"></i> ${title}`;
  wrap.appendChild(label);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06101d);
  scene.fog = new THREE.Fog(0x06101d, 10, 24);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(7, 5.5, 7);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.zIndex = "0";
  wrap.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const hemi = new THREE.HemisphereLight(0xcfefff, 0x08111d, 1.2);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
  dir.position.set(8, 10, 6);
  scene.add(dir);

  const root = new THREE.Group();
  root.add(buildLatticeGroup(latticeKey, el));
  scene.add(root);

  const sizeFit = () => {
    const rect = wrap.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(sizeFit);
  ro.observe(wrap);
  sizeFit();

  let raf = 0;
  const loop = () => {
    root.rotation.y += 0.003;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      wrap.innerHTML = "";
    },
  };
}

function mountDetailVisuals(el) {
  if (window.__electronWidget) {
    window.__electronWidget.destroy();
    window.__electronWidget = null;
  }
  if (window.__crystalWidget) {
    window.__crystalWidget.destroy();
    window.__crystalWidget = null;
  }

  const electronContainer = document.getElementById("electron-widget");
  const crystalContainer = document.getElementById("crystal-widget");
  if (electronContainer)
    window.__electronWidget = createElectronWidget(electronContainer, el);
  if (crystalContainer)
    window.__crystalWidget = createCrystalWidget(crystalContainer, el);

  const article = document.getElementById("article-content");
  const typeset = () => {
    if (window.MathJax?.typesetPromise && article) {
      return window.MathJax.typesetPromise([article]).catch(() => {});
    }
    return Promise.resolve();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      typeset();
    });
  });
}

const ELECTRON_SHELL_LABELS = ["K", "L", "M", "N", "O", "P", "Q"];
const ORBITAL_COLORS = {
  s: "#60a5fa",
  p: "#34d399",
  d: "#f59e0b",
  f: "#f472b6",
  g: "#a78bfa",
  default: "#93c5fd",
};

function normalizeSectionKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/^sec-/, "")
    .trim();
}

function parseTimecodeToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);

  const hmsMatch = raw.match(
    /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i,
  );
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const h = Number(hmsMatch[1] || 0);
    const m = Number(hmsMatch[2] || 0);
    const s = Number(hmsMatch[3] || 0);
    return h * 3600 + m * 60 + s;
  }

  const parts = raw.split(":").map((p) => p.trim());
  if (
    parts.length >= 2 &&
    parts.length <= 3 &&
    parts.every((p) => p !== "" && !Number.isNaN(Number(p)))
  ) {
    return parts.reduce((total, part) => total * 60 + Number(part), 0);
  }

  const compact = raw.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?(?:\s*(\d+)\s*s)?$/i);
  if (compact) {
    return (
      Number(compact[1] || 0) * 3600 +
      Number(compact[2] || 0) * 60 +
      Number(compact[3] || 0)
    );
  }

  return null;
}

function formatDurationShort(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const QUIZ_TYPE_LABELS = {
  single: "Trắc nghiệm 1 đáp án đúng",
  multiple: "Trắc nghiệm nhiều đáp án đúng",
  boolean: "Câu hỏi đúng/sai",
  short: "Câu hỏi trả lời ngắn",
};

function normalizeQuizType(value = "") {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (
    [
      "multiple",
      "multi",
      "multi-select",
      "checkbox",
      "many",
      "multi_answer",
    ].includes(v)
  )
    return "multiple";
  if (
    [
      "boolean",
      "truefalse",
      "true-false",
      "true_false",
      "dung-sai",
      "đúng/sai",
      "đúng sai",
    ].includes(v)
  )
    return "boolean";
  if (
    [
      "short",
      "short-answer",
      "short_answer",
      "text",
      "answer",
      "ngan",
      "ngắn",
    ].includes(v)
  )
    return "short";
  return "single";
}

function normalizeAnswerText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeQuizAnswers(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function quizAnswerToIndices(answer, optionTexts = []) {
  const list = normalizeQuizAnswers(answer);
  if (!list.length) return [];
  return list
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (typeof item === "string" && /^\d+$/.test(item.trim()))
        return Number(item);
      const normalized = normalizeAnswerText(item);
      const idx = optionTexts.findIndex(
        (opt) => normalizeAnswerText(opt) === normalized,
      );
      return idx;
    })
    .filter((idx) => Number.isInteger(idx) && idx >= 0);
}

function isQuizAnswerCorrect(cue, selectedValues) {
  const type = normalizeQuizType(cue.type);
  const optionTexts = Array.isArray(cue.options) ? cue.options : [];
  const rawAnswer =
    cue.answer ??
    cue.correct ??
    cue.correctAnswer ??
    cue.correctIndex ??
    cue.correctIndexes ??
    cue.correctAnswers ??
    cue.expected ??
    cue.rightAnswer;

  if (type === "single" || type === "boolean") {
    const selectedIndex = Number(selectedValues?.[0]);
    const selectedText = normalizeAnswerText(
      selectedValues?.[1] ?? selectedValues?.[0],
    );

    if (typeof rawAnswer === "boolean") {
      return (
        selectedIndex === (rawAnswer ? 0 : 1) ||
        selectedText === normalizeAnswerText(rawAnswer ? "đúng" : "sai") ||
        selectedText === normalizeAnswerText(rawAnswer ? "true" : "false")
      );
    }
    if (typeof rawAnswer === "number" && Number.isFinite(rawAnswer)) {
      return Number(selectedValues?.[0]) === rawAnswer;
    }
    if (typeof rawAnswer === "string" && /^\d+$/.test(rawAnswer.trim())) {
      return Number(selectedValues?.[0]) === Number(rawAnswer.trim());
    }
    const expectedText = normalizeAnswerText(rawAnswer);
    return (
      selectedText === expectedText ||
      Number(selectedValues?.[0]) === Number(rawAnswer)
    );
  }

  if (type === "multiple") {
    const expectedIndices = quizAnswerToIndices(rawAnswer, optionTexts);
    const selectedIndices = normalizeQuizAnswers(selectedValues)
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0)
      .sort((a, b) => a - b);
    return (
      expectedIndices.length > 0 &&
      expectedIndices.sort((a, b) => a - b).join(",") ===
        selectedIndices.join(",")
    );
  }

  const accepted = normalizeQuizAnswers(
    cue.acceptedAnswers ??
      cue.accepted ??
      cue.answers ??
      cue.correctTexts ??
      rawAnswer,
  ).map((x) => normalizeAnswerText(x));
  const selected = normalizeAnswerText(selectedValues?.[0]);
  return (
    accepted.includes(selected) ||
    accepted.includes(normalizeAnswerText(rawAnswer))
  );
}

function formatQuizAnswerHint(cue) {
  const type = normalizeQuizType(cue.type);
  if (type === "multiple") return "Chọn tất cả đáp án đúng rồi bấm Kiểm tra.";
  if (type === "short") return "Nhập câu trả lời ngắn rồi bấm Kiểm tra.";
  return "Chọn một đáp án đúng.";
}

function getDetailMediaBlocks(el) {
  const raw = [
    ...(Array.isArray(el?.mediaBlocks) ? el.mediaBlocks : []),
    ...(Array.isArray(el?.media) ? el.media : []),
    ...(Array.isArray(el?.blocks) ? el.blocks : []),
  ];
  return raw
    .map((block, idx) => {
      if (!block) return null;
      const type =
        String(block.type || block.kind || "").toLowerCase() || "image";
      const section = normalizeSectionKey(
        block.section ||
          block.anchor ||
          block.insertAfter ||
          block.position ||
          "general",
      );
      const title =
        block.title || block.name || `${type.toUpperCase()} ${idx + 1}`;
      const desc = block.desc || block.description || block.note || "";
      const src =
        block.src ||
        block.url ||
        block.link ||
        block.media ||
        block.modelPath ||
        block.path ||
        "";
      return {
        ...block,
        _idx: idx,
        type,
        section,
        title,
        desc,
        src,
      };
    })
    .filter(
      (block) =>
        block && (block.src || block.type === "text" || block.type === "html"),
    );
}

function renderDetailMediaBlocks(el, sectionKey) {
  const blocks = getDetailMediaBlocks(el).filter(
    (block) => block.section === normalizeSectionKey(sectionKey),
  );
  if (!blocks.length) return "";
  return blocks
    .map((block) => {
      const id = `detail-media-${el.symbol}-${block._idx}`;
      return `
              <section class="scroll-mt-24 mt-6" data-detail-media="${id}">
                <div class="detail-media-block">
                  <div class="detail-media-head">
                    <div>
                      <div class="detail-media-title">${escapeHtml(block.title)}</div>
                      ${block.desc ? `<div class="detail-media-desc">${escapeHtml(block.desc)}</div>` : ""}
                    </div>
                    <span class="visual-badge shrink-0">${escapeHtml(block.type.toUpperCase())}</span>
                  </div>
                  <div class="detail-media-body">
                    <div id="${id}"></div>
                  </div>
                </div>
              </section>
            `;
    })
    .join("");
}

function resolveModelPath(el, block = {}) {
  const direct =
    block.modelPath ||
    block.model ||
    block.src ||
    block.url ||
    block.path ||
    "";
  if (direct) return direct;
  const z = String(el?.number || "").padStart(3, "0");
  const symbol = String(el?.symbol || "").toLowerCase();
  const name = String(el?.nameVi || el?.nameEn || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const assetModelBase =
    el?.assets?.model ||
    `./assets/elements/${el?.assetFolder || `${z}_${name}`}/model`;
  const candidates = [
    `${assetModelBase}/${z}_${symbol}.glb`,
    `${assetModelBase}/${z}_${symbol}.gltf`,
    `${assetModelBase}/${Number(el?.number || 0)}_${el?.symbol || ""}.glb`,
    `${assetModelBase}/${Number(el?.number || 0)}_${el?.symbol || ""}.gltf`,
    `${assetModelBase}/${z}.glb`,
    `${assetModelBase}/${z}.gltf`,
    `${assetModelBase}/${symbol}.glb`,
    `${assetModelBase}/${symbol}.gltf`,
    `${assetModelBase}/${name}.glb`,
    `${assetModelBase}/${name}.gltf`,
  ];
  return candidates[0];
}

function getElectronOrbitalLayout(el) {
  const config = normalizeText(getElectronConfigText(el));
  const named = config.match(/\[(He|Ne|Ar|Kr|Xe|Rn|Og)\]/);
  const segments = named
    ? (NOBLE_GAS_ORBITALS[named[1]] || []).map((seg) => ({ ...seg }))
    : [];
  const re = /(\d+)([spdfg])(\d+)/gi;
  let m;
  while ((m = re.exec(config))) {
    segments.push({
      shell: Number(m[1]),
      orbital: String(m[2]).toLowerCase(),
      count: Number(m[3]),
    });
  }
  if (!segments.length) {
    const shellCounts = getElementElectronShells(el).filter((n) => n > 0);
    shellCounts.forEach((count, idx) => {
      segments.push({
        shell: idx + 1,
        orbital: idx === 0 ? "s" : "p",
        count,
      });
    });
  }

  const map = new Map();
  for (const seg of segments) {
    if (!map.has(seg.shell)) map.set(seg.shell, []);
    map.get(seg.shell).push(seg);
  }
  return map;
}

function renderSectionVideoHints(block) {
  const cues = Array.isArray(block.cues)
    ? block.cues
    : Array.isArray(block.questions)
      ? block.questions
      : Array.isArray(block.popups)
        ? block.popups
        : [];
  if (!cues.length) return "";
  return `
          <div class="mt-4 grid gap-2">
            ${cues
              .map((cue) => {
                const at =
                  cue.at ??
                  cue.time ??
                  cue.start ??
                  cue.timestamp ??
                  cue.timecode ??
                  cue.mark;
                const secs = parseTimecodeToSeconds(at);
                const type =
                  QUIZ_TYPE_LABELS[
                    normalizeQuizType(cue.type || cue.questionType || cue.kind)
                  ] || "Câu hỏi";
                return `
                 
                `;
              })
              .join("")}
          </div>
        `;
}

function ensureYoutubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (window.__ytPromise) return window.__ytPromise;
  window.__ytPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
    if (window.YT && window.YT.Player) resolve(window.YT);
  });
  return window.__ytPromise;
}

function getYoutubeId(url = "") {
  const s = String(url || "").trim();
  const m =
    s.match(/youtu\.be\/([\w-]+)/i) ||
    s.match(/[?&]v=([\w-]+)/i) ||
    s.match(/youtube\.com\/shorts\/([\w-]+)/i) ||
    s.match(/youtube\.com\/embed\/([\w-]+)/i);
  return m ? m[1] : "";
}

function createVideoQuizBlock(container, block, el) {
  const src = String(block.src || block.url || block.link || "").trim();
  const cues = (
    Array.isArray(block.cues)
      ? block.cues
      : Array.isArray(block.questions)
        ? block.questions
        : Array.isArray(block.popups)
          ? block.popups
          : []
  )
    .map((cue, idx) => {
      const seconds = parseTimecodeToSeconds(
        cue.at ??
          cue.time ??
          cue.start ??
          cue.timestamp ??
          cue.timecode ??
          cue.mark,
      );
      const options = Array.isArray(cue.options)
        ? cue.options.map((opt) =>
            typeof opt === "object"
              ? String(opt.text || opt.label || opt.title || "").trim()
              : String(opt || "").trim(),
          )
        : [];
      return {
        id: cue.id || `cue-${idx}`,
        seconds,
        type: normalizeQuizType(cue.type || cue.questionType || cue.kind),
        question: String(cue.question || cue.text || cue.prompt || "").trim(),
        options: options.filter(Boolean),
        answer:
          cue.answer ??
          cue.correct ??
          cue.correctIndex ??
          cue.correctIndices ??
          cue.correctAnswers ??
          cue.expected ??
          cue.rightAnswer ??
          cue.solution ??
          "",
        acceptedAnswers:
          cue.acceptedAnswers || cue.accepted || cue.answers || [],
        explain: cue.explain || cue.feedback || cue.note || "",
        shown: false,
        done: false,
      };
    })
    .filter((cue) => cue.seconds != null && cue.question);

  const youtubeId = getYoutubeId(src);
  const isYoutube = Boolean(youtubeId);
  const isDirectVideo =
    /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(src) ||
    src.startsWith("blob:") ||
    src.startsWith("data:video");

  container.innerHTML = `
  <div class="grid gap-4">
    <div class="video-shell relative overflow-hidden">
      <div id="video-host-${el.symbol}-${block._idx}" class="video-player-host"></div>
      <div class="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-black/30"></div>
      <div id="video-overlay-hint-${el.symbol}-${block._idx}" class="absolute inset-0 z-20 flex items-center justify-center text-white/80 text-sm pointer-events-none">Chưa tải video</div>
      <div id="video-tap-layer-${el.symbol}-${block._idx}" class="absolute inset-0 z-20 cursor-pointer"></div>

      <div id="video-loading-${el.symbol}-${block._idx}" class="absolute inset-0 z-30 hidden items-center justify-center bg-black/35 text-white">
        <div class="flex items-center gap-3 rounded-2xl bg-black/55 px-4 py-3 backdrop-blur-sm shadow-lg">
          <span class="loader-ring" aria-hidden="true"></span>
          <span class="text-sm font-medium">Đang tải video...</span>
        </div>
      </div>

      <div id="video-controls-${el.symbol}-${block._idx}" class="absolute inset-x-0 bottom-0 z-40 pointer-events-none opacity-100 transition-all duration-300 ease-out">
        <div class="h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 px-3 md:px-4 pb-3 pointer-events-auto text-white">
          <input id="video-seek-${el.symbol}-${block._idx}" type="range" min="0" max="1000" value="0" class="w-full accent-white mb-2" />
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <button id="video-play-${el.symbol}-${block._idx}" class="rounded-full bg-white/10 hover:bg-white/20 w-10 h-10 inline-flex items-center justify-center" aria-label="Play">▶</button>
              <button id="video-back-${el.symbol}-${block._idx}" class="rounded-full bg-white/10 hover:bg-white/20 w-10 h-10 inline-flex items-center justify-center" aria-label="Back 10 seconds">↺</button>
              <button id="video-forward-${el.symbol}-${block._idx}" class="rounded-full bg-white/10 hover:bg-white/20 w-10 h-10 inline-flex items-center justify-center" aria-label="Forward 10 seconds">↻</button>
              <span id="video-time-${el.symbol}-${block._idx}" class="text-sm font-medium tabular-nums">0:00 / 0:00</span>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <label class="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                <select id="video-speed-${el.symbol}-${block._idx}" class="rounded-lg bg-transparent border border-white/20 px-2 py-1 text-sm outline-none">
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1" selected>1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="1.75">1.75x</option>
                  <option value="2">2x</option>
                </select>
              </label>
              <button id="video-fs-${el.symbol}-${block._idx}" class="rounded-full bg-white/10 hover:bg-white/20 w-10 h-10 inline-flex items-center justify-center" aria-label="Full screen">⛶</button>
            </div>
          </div>
        </div>
      </div>

      <div id="video-modal-${el.symbol}-${block._idx}" class="absolute inset-0 hidden items-stretch justify-center z-50 overflow-hidden bg-black/60 backdrop-blur-[1px] p-3 md:p-4">
        <div class="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
          <div class="shrink-0 px-5 py-4 border-b bg-slate-50 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p id="video-meta-${el.symbol}-${block._idx}" class="text-sm text-slate-600 mt-1 leading-relaxed"></p>
            </div>
            <button id="video-close-${el.symbol}-${block._idx}" class="shrink-0 rounded-full w-10 h-10 inline-flex items-center justify-center hover:bg-slate-200 text-slate-600 text-2xl leading-none" aria-label="Đóng">×</button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            <div class="rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-100 p-4">
              <p id="video-question-${el.symbol}-${block._idx}" class="text-base md:text-lg font-semibold leading-8 text-slate-900"></p>
              <p id="video-hint-${el.symbol}-${block._idx}" class="text-sm md:text-base text-slate-600 mt-2 leading-relaxed"></p>
            </div>

            <div id="video-options-${el.symbol}-${block._idx}" class="grid gap-2"></div>

            <div id="video-feedback-${el.symbol}-${block._idx}" class="hidden rounded-2xl px-4 py-3 text-sm border"></div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button id="video-skip-${el.symbol}-${block._idx}" class="rounded-xl border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 text-slate-700">Bỏ qua</button>
              <button id="video-confirm-${el.symbol}-${block._idx}" class="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-400 shadow-sm">Xác nhận trả lời</button>
              <button id="video-next-${el.symbol}-${block._idx}" class="hidden rounded-xl bg-slate-900 text-white px-4 py-2 font-medium hover:bg-slate-800">Tiếp tục</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${block.desc ? `<div class="detail-media-note">${escapeHtml(block.desc)}</div>` : ""}
    ${renderSectionVideoHints(block)}
  </div>
`;

  const host = container.querySelector(
    `#video-host-${el.symbol}-${block._idx}`,
  );
  const shell = container.querySelector(".video-shell");
  const overlayHint = container.querySelector(
    `#video-overlay-hint-${el.symbol}-${block._idx}`,
  );
  const tapLayer = container.querySelector(
    `#video-tap-layer-${el.symbol}-${block._idx}`,
  );
  const loading = container.querySelector(
    `#video-loading-${el.symbol}-${block._idx}`,
  );
  const controls = container.querySelector(
    `#video-controls-${el.symbol}-${block._idx}`,
  );
  const seekBar = container.querySelector(
    `#video-seek-${el.symbol}-${block._idx}`,
  );
  const playBtn = container.querySelector(
    `#video-play-${el.symbol}-${block._idx}`,
  );
  const backBtn = container.querySelector(
    `#video-back-${el.symbol}-${block._idx}`,
  );
  const forwardBtn = container.querySelector(
    `#video-forward-${el.symbol}-${block._idx}`,
  );
  const timeLabel = container.querySelector(
    `#video-time-${el.symbol}-${block._idx}`,
  );
  const speedSelect = container.querySelector(
    `#video-speed-${el.symbol}-${block._idx}`,
  );
  const fsBtn = container.querySelector(`#video-fs-${el.symbol}-${block._idx}`);
  const modal = container.querySelector(
    `#video-modal-${el.symbol}-${block._idx}`,
  );
  const meta = container.querySelector(
    `#video-meta-${el.symbol}-${block._idx}`,
  );
  const questionText = container.querySelector(
    `#video-question-${el.symbol}-${block._idx}`,
  );
  const hintText = container.querySelector(
    `#video-hint-${el.symbol}-${block._idx}`,
  );
  const optsWrap = container.querySelector(
    `#video-options-${el.symbol}-${block._idx}`,
  );
  const feedback = container.querySelector(
    `#video-feedback-${el.symbol}-${block._idx}`,
  );
  const skipBtn = container.querySelector(
    `#video-skip-${el.symbol}-${block._idx}`,
  );
  const confirmBtn = container.querySelector(
    `#video-confirm-${el.symbol}-${block._idx}`,
  );
  const nextBtn = container.querySelector(
    `#video-next-${el.symbol}-${block._idx}`,
  );
  const closeBtn = container.querySelector(
    `#video-close-${el.symbol}-${block._idx}`,
  );

  let currentCue = null;
  let currentSelection = [];
  let checker = null;
  let uiTimer = null;
  let player = null;
  let controlsHideTimer = null;
  let controlsVisible = true;
  let currentVideoDuration = 0;
  let currentVideoTime = 0;
  let answeredCurrentCue = false;
  const played = new Set();

  const isHtmlVideo = () =>
    player &&
    typeof player.tagName === "string" &&
    player.tagName.toLowerCase() === "video";

  const getCurrentTime = () => {
    try {
      if (player?.getCurrentTime) return Number(player.getCurrentTime()) || 0;
      if (isHtmlVideo()) return Number(player.currentTime) || 0;
    } catch {}
    return currentVideoTime || 0;
  };

  const getDuration = () => {
    try {
      if (player?.getDuration) return Number(player.getDuration()) || 0;
      if (isHtmlVideo()) return Number(player.duration) || 0;
    } catch {}
    return currentVideoDuration || 0;
  };

  const isPlaying = () => {
    try {
      if (window.YT && player?.getPlayerState) {
        return player.getPlayerState() === YT.PlayerState.PLAYING;
      }
      if (isHtmlVideo()) return !player.paused && !player.ended;
    } catch {}
    return false;
  };

  const setPlayIcon = () => {
    playBtn.textContent = isPlaying() ? "❚❚" : "▶";
  };

  const showLoading = (message = "Đang tải video...") => {
    loading.querySelector("span.text-sm")?.textContent &&
      (loading.querySelector("span.text-sm").textContent = message);
    loading.classList.remove("hidden");
    loading.classList.add("flex");
  };

  const hideLoading = () => {
    loading.classList.add("hidden");
    loading.classList.remove("flex");
  };

  const showControls = () => {
    controlsVisible = true;
    if (controlsHideTimer) clearTimeout(controlsHideTimer);
    controls.classList.remove(
      "opacity-0",
      "translate-y-2",
      "pointer-events-none",
    );
    controls.classList.add("opacity-100", "translate-y-0");
  };

  const hideControls = () => {
    controlsVisible = false;
    controls.classList.add("opacity-0", "translate-y-2", "pointer-events-none");
    controls.classList.remove("opacity-100", "translate-y-0");
  };

  const scheduleControlsHide = () => {
    showControls();
    if (controlsHideTimer) clearTimeout(controlsHideTimer);
    controlsHideTimer = setTimeout(() => {
      if (!modal.classList.contains("hidden")) return;
      if (isPlaying()) hideControls();
    }, 1800);
  };

  const resumePlayback = () => {
    if (window.YT && player?.playVideo) player.playVideo();
    else if (isHtmlVideo()) player.play().catch(() => {});
  };

  const pausePlayback = () => {
    if (window.YT && player?.pauseVideo) player.pauseVideo();
    else if (isHtmlVideo()) player.pause();
  };

  const seekTo = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    if (window.YT && player?.seekTo) player.seekTo(safe, true);
    else if (isHtmlVideo()) player.currentTime = safe;
  };

  const setSpeed = (rate) => {
    const speed = Number(rate) || 1;
    if (window.YT && player?.setPlaybackRate) player.setPlaybackRate(speed);
    else if (isHtmlVideo()) player.playbackRate = speed;
  };

  const syncControlsUI = () => {
    const duration = getDuration();
    const current = getCurrentTime();
    currentVideoDuration = duration;
    currentVideoTime = current;
    if (duration > 0) {
      seekBar.value = String(
        Math.max(0, Math.min(1000, Math.round((current / duration) * 1000))),
      );
      timeLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }
    setPlayIcon();
  };

  const safeFullscreenTarget = () => shell || container;

  const requestFullscreen = async () => {
    const target = safeFullscreenTarget();
    try {
      if (target.requestFullscreen) return await target.requestFullscreen();
      if (target.webkitRequestFullscreen)
        return await target.webkitRequestFullscreen();
    } catch {}
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen)
        await document.exitFullscreen();
      else if (
        document.webkitFullscreenElement &&
        document.webkitExitFullscreen
      )
        await document.webkitExitFullscreen();
    } catch {}
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      await exitFullscreen();
      return;
    }
    await requestFullscreen();
  };

  const formatCorrectAnswer = (cue) => {
    const type = normalizeQuizType(cue.type);
    const optionTexts = Array.isArray(cue.options) ? cue.options : [];
    const rawAnswer =
      cue.answer ??
      cue.correct ??
      cue.correctAnswer ??
      cue.correctIndex ??
      cue.correctIndexes ??
      cue.correctAnswers ??
      cue.expected ??
      cue.rightAnswer ??
      cue.solution ??
      cue.acceptedAnswers ??
      cue.accepted ??
      cue.answers ??
      "";

    if (type === "multiple") {
      const indices = quizAnswerToIndices(rawAnswer, optionTexts);
      if (indices.length)
        return indices.map((i) => optionTexts[i] ?? String(i + 1)).join(", ");
      if (Array.isArray(rawAnswer))
        return rawAnswer.map((x) => String(x)).join(", ");
      return String(rawAnswer || "Chưa rõ").trim();
    }
    if (type === "short") {
      const accepted = normalizeQuizAnswers(
        cue.acceptedAnswers ||
          cue.accepted ||
          cue.answers ||
          cue.correctTexts ||
          rawAnswer,
      )
        .map((x) => String(x).trim())
        .filter(Boolean);
      return accepted.length
        ? accepted.join(", ")
        : String(rawAnswer || "Chưa rõ").trim();
    }
    if (typeof rawAnswer === "number" && optionTexts[rawAnswer] != null) {
      return optionTexts[rawAnswer];
    }
    if (typeof rawAnswer === "string" && /^\d+$/.test(rawAnswer.trim())) {
      const idx = Number(rawAnswer.trim());
      if (optionTexts[idx] != null) return optionTexts[idx];
    }
    if (typeof rawAnswer === "boolean") return rawAnswer ? "Đúng" : "Sai";
    return String(rawAnswer || "Chưa rõ").trim();
  };

  const setFeedback = (isCorrect, message, answerText, extraHtml = "") => {
    feedback.className = `rounded-2xl px-4 py-3 text-sm border ${
      isCorrect
        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
        : "bg-rose-50 border-rose-200 text-rose-900"
    }`;
    feedback.innerHTML = `
            <div class="font-semibold text-base">${isCorrect ? "Chính xác" : "Chưa đúng"}</div>
            <div class="mt-1 leading-relaxed">${escapeHtml(message)}</div>
            <div class="mt-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
              <div class="text-[11px] uppercase tracking-[0.2em] text-slate-500">Đáp án đúng</div>
              <div class="mt-1 font-semibold text-slate-900">${escapeHtml(answerText)}</div>
            </div>
            ${extraHtml}
          `;
    feedback.classList.remove("hidden");
  };

  const resetQuestionUi = () => {
    currentSelection = [];
    answeredCurrentCue = false;
    feedback.classList.add("hidden");
    feedback.innerHTML = "";
    nextBtn.classList.add("hidden");
    confirmBtn.classList.remove("hidden");
    confirmBtn.disabled = false;
    optsWrap.querySelectorAll("button, input").forEach((el) => {
      el.disabled = false;
    });
  };

  const collectSelected = (type) => {
    if (type === "short") {
      return [optsWrap.querySelector("input[data-short-answer]")?.value || ""];
    }
    if (type === "multiple") {
      return currentSelection.slice();
    }
    const idx = currentSelection.length ? currentSelection[0] : "";
    const text =
      idx !== "" && currentCue?.options?.[Number(idx)] != null
        ? currentCue.options[Number(idx)]
        : "";
    return [String(idx), text];
  };

  const renderOptions = (cue) => {
    const type = normalizeQuizType(cue.type);
    const options = cue.options.length
      ? cue.options
      : type === "boolean"
        ? ["Đúng", "Sai"]
        : [];

    if (type === "short") {
      optsWrap.innerHTML = `
              <label class="block">
                <span class="block text-sm text-slate-500 mb-2 font-medium">Nhập câu trả lời</span>
                <input data-short-answer class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-sky-400" placeholder="Câu trả lời ngắn..." />
              </label>
            `;
      return;
    }

    optsWrap.innerHTML = `
            <div class="grid gap-2">
              ${options
                .map(
                  (opt, idx) => `
                    <button type="button" data-option-index="${idx}" class="rounded-2xl border border-slate-200 px-4 py-3 text-left text-slate-800 bg-white hover:bg-sky-50 transition-colors break-words">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold mr-3 align-top">${idx + 1}</span>
                      <span class="inline-block max-w-[calc(100%-2.5rem)] align-top">${escapeHtml(opt)}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          `;

    const updateChoiceState = () => {
      optsWrap.querySelectorAll("[data-option-index]").forEach((btn) => {
        const idx = String(btn.getAttribute("data-option-index") || "");
        const active =
          type === "multiple"
            ? currentSelection.includes(idx)
            : currentSelection[0] === idx;
        btn.classList.toggle("ring-2", active);
        btn.classList.toggle("ring-sky-400", active);
        btn.classList.toggle("bg-sky-50", active);
        btn.classList.toggle("border-sky-300", active);
      });
    };

    optsWrap.querySelectorAll("[data-option-index]").forEach((btn) => {
      btn.onclick = () => {
        const idx = String(btn.getAttribute("data-option-index") || "");
        if (type === "multiple") {
          if (currentSelection.includes(idx)) {
            currentSelection = currentSelection.filter((x) => x !== idx);
          } else {
            currentSelection = [...currentSelection, idx];
          }
        } else {
          currentSelection = [idx];
        }
        updateChoiceState();
      };
    });

    updateChoiceState();
  };

  const lockOptions = () => {
    optsWrap.querySelectorAll("button, input").forEach((el) => {
      el.disabled = true;
      el.classList.add("pointer-events-none");
    });
  };

  const confirmAnswer = () => {
    if (!currentCue) return;
    const type = normalizeQuizType(currentCue.type);
    const selected = collectSelected(type);
    const hasSelection =
      type === "short"
        ? String(selected[0]).trim().length > 0
        : selected.some((x) => String(x).trim().length > 0);

    if (!hasSelection) {
      setFeedback(
        false,
        "Hãy chọn hoặc nhập câu trả lời trước khi xác nhận.",
        formatCorrectAnswer(currentCue),
      );
      return;
    }

    const ok = isQuizAnswerCorrect(currentCue, selected);
    const explanation = currentCue.explain
      ? `<div class="mt-3 text-slate-700 leading-relaxed"><span class="font-semibold">Giải thích:</span> ${escapeHtml(currentCue.explain)}</div>`
      : `<div class="mt-3 text-slate-500">Chưa có phần giải thích bổ sung.</div>`;
    setFeedback(
      ok,
      ok ? "Bạn đã chọn đúng." : "Bạn chưa chọn đúng đáp án.",
      formatCorrectAnswer(currentCue),
      explanation,
    );
    answeredCurrentCue = true;
    lockOptions();
    confirmBtn.classList.add("hidden");
    nextBtn.classList.remove("hidden");
  };

  const hideModal = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    currentCue = null;
    currentSelection = [];
    answeredCurrentCue = false;
    feedback.classList.add("hidden");
    feedback.innerHTML = "";
    nextBtn.classList.add("hidden");
    confirmBtn.classList.remove("hidden");
    confirmBtn.disabled = false;
    optsWrap.innerHTML = "";
    hintText.textContent = "";
  };

  const showModal = (cue) => {
    currentCue = cue;
    currentSelection = [];
    answeredCurrentCue = false;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    const type = normalizeQuizType(cue.type);
    meta.textContent = ``;
    questionText.textContent = cue.question;
    hintText.textContent = formatQuizAnswerHint(cue);
    feedback.classList.add("hidden");
    feedback.innerHTML = "";
    nextBtn.classList.add("hidden");
    confirmBtn.classList.remove("hidden");
    renderOptions(cue);
    pausePlayback();
    showControls();
  };

  const checkCues = () => {
    let current = 0;
    current = getCurrentTime();
    for (const cue of cues) {
      if (cue.done || played.has(cue.id) || current < cue.seconds) continue;
      played.add(cue.id);
      showModal(cue);
      break;
    }
  };

  closeBtn.onclick = () => {
    hideModal();
    resumePlayback();
  };
  skipBtn.onclick = () => {
    hideModal();
    resumePlayback();
  };
  confirmBtn.onclick = confirmAnswer;
  nextBtn.onclick = () => {
    hideModal();
    resumePlayback();
  };

  playBtn.onclick = () => {
    if (isPlaying()) pausePlayback();
    else resumePlayback();
    setPlayIcon();
  };
  backBtn.onclick = () => seekTo(getCurrentTime() - 10);
  forwardBtn.onclick = () => seekTo(getCurrentTime() + 10);
  fsBtn.onclick = toggleFullscreen;
  tapLayer.onclick = () => {
    if (isPlaying()) pausePlayback();
    else resumePlayback();
    setPlayIcon();
    scheduleControlsHide();
  };
  shell.addEventListener("mousemove", scheduleControlsHide);
  shell.addEventListener("mouseenter", showControls);
  shell.addEventListener("mouseleave", () => {
    if (!modal.classList.contains("hidden")) return;
    if (isPlaying()) hideControls();
  });
  seekBar.addEventListener("input", () => {
    const duration = getDuration();
    if (!duration) return;
    seekTo((Number(seekBar.value) / 1000) * duration);
  });
  speedSelect.addEventListener("change", () => setSpeed(speedSelect.value));

  const tickUI = () => {
    syncControlsUI();
    if (!modal.classList.contains("hidden")) showControls();
  };

  const startUiTimer = () => {
    if (uiTimer) clearInterval(uiTimer);
    uiTimer = setInterval(tickUI, 250);
  };

  const startCueTimer = () => {
    if (checker) clearInterval(checker);
    checker = setInterval(checkCues, 400);
  };

  const stopCueTimer = () => {
    if (checker) clearInterval(checker);
    checker = null;
  };

  const setupVideoElement = (video) => {
    player = video;
    video.addEventListener("loadedmetadata", () => {
      currentVideoDuration = Number(video.duration) || 0;
      hideLoading();
      syncControlsUI();
    });
    video.addEventListener("timeupdate", () => {
      currentVideoTime = Number(video.currentTime) || 0;
      checkCues();
      syncControlsUI();
    });
    video.addEventListener("play", () => {
      showControls();
      startCueTimer();
      syncControlsUI();
    });
    video.addEventListener("pause", () => {
      stopCueTimer();
      syncControlsUI();
    });
    video.addEventListener("ended", () => {
      stopCueTimer();
      syncControlsUI();
    });
    video.addEventListener("canplay", hideLoading);
  };

  const loadDirectVideo = () => {
    host.innerHTML = `
            <video class="w-full h-full object-cover bg-black" playsinline preload="metadata" src="${escapeHtml(src)}"></video>
          `;
    const video = host.querySelector("video");
    setupVideoElement(video);
    overlayHint.classList.add("hidden");
    hideOverlay();
    startUiTimer();
  };

  const loadYoutube = () => {
    showLoading("Đang tải video YouTube...");
    ensureYoutubeApi().then(() => {
      try {
        player = new YT.Player(host, {
          videoId: youtubeId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            controls: 0,
            fs: 0,
            iv_load_policy: 3,
            disablekb: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              player = event.target;
              hideLoading();
              overlayHint.classList.add("hidden");
              startUiTimer();
              startCueTimer();
              syncControlsUI();
            },
            onStateChange: () => {
              syncControlsUI();
              if (
                player?.getPlayerState &&
                player.getPlayerState() === YT.PlayerState.PLAYING
              ) {
                startCueTimer();
              } else {
                stopCueTimer();
              }
            },
          },
        });
      } catch {
        hideLoading();
        overlayHint.textContent = "Không thể tải YouTube. Hãy thử lại.";
      }
    });
  };

  const init = () => {
    showLoading(isYoutube ? "Đang tải video YouTube..." : "Đang tải video...");
    overlayHint.classList.remove("hidden");
    overlayHint.textContent = "Chưa tải video";
    if (isYoutube) loadYoutube();
    else if (isDirectVideo) loadDirectVideo();
    else {
      host.innerHTML = `
              <div class="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-300 p-6 text-center">
                <div>
                  <div class="text-lg font-semibold mb-2">Nguồn video không hợp lệ</div>
                  <div class="text-sm text-slate-400">Vui lòng kiểm tra lại đường dẫn video.</div>
                </div>
              </div>
            `;
      hideLoading();
      overlayHint.classList.remove("hidden");
      overlayHint.textContent = "Không có video hợp lệ";
    }
  };

  init();
  showControls();
  scheduleControlsHide();

  return {
    destroy() {
      if (checker) clearInterval(checker);
      if (uiTimer) clearInterval(uiTimer);
      if (controlsHideTimer) clearTimeout(controlsHideTimer);
      try {
        if (player?.destroy) player.destroy();
        else if (isHtmlVideo() && player.pause) player.pause();
      } catch {}
      host.innerHTML = "";
      container.innerHTML = "";
    },
  };
}

// --- RENDER BẢNG TUẦN HOÀN KÈM HEADER CỘT/HÀNG ---
// --- RENDER BẢNG TUẦN HOÀN KÈM HEADER CỘT/HÀNG ---
const tableContainer = document.getElementById("periodic-table");
function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export {
  detailedData,
  elNames,
  elSymbols,
  categories,
  allElements,
  elementsMap,
  SUBSCRIPT_MAP,
  SUPERSCRIPT_MAP,
  NOBLE_GAS_SHELLS,
  ELECTRON_SHELL_LABELS,
  ORBITAL_COLORS,
  QUIZ_TYPE_LABELS,
  normalizeText,
  escapeLatexText,
  chemToLatexFormula,
  getReactionLabels,
  buildReactionLatex,
  parseElectronShellsFromConfig,
  fillShellsByAtomicNumber,
  getElectronConfigText,
  getElementElectronShells,
  inferLatticeKey,
  inferLatticeTitle,
  normalizeReactionText,
  escapeHtml,
  guessMediaKind,
  getYouTubeEmbedUrl,
  renderMediaPreview,
  formatChemicalFormulaHtml,
  mediaToCards,
  renderEquationBlock,
  getReactionMediaBlocks,
  renderReactionMediaBlocks,
  normalizeSectionKey,
  parseTimecodeToSeconds,
  formatDurationShort,
  normalizeQuizType,
  normalizeAnswerText,
  normalizeQuizAnswers,
  quizAnswerToIndices,
  isQuizAnswerCorrect,
  formatQuizAnswerHint,
  getDetailMediaBlocks,
  renderDetailMediaBlocks,
  resolveModelPath,
  getElectronOrbitalLayout,
  renderSectionVideoHints,
  ensureYoutubeApi,
  getYoutubeId,
  createElectronWidget,
  createCrystalWidget,
  mountDetailVisuals,
  addAtomMesh,
  addBond,
  addFaceDots,
  createFrame,
  addOctahedralConnectors,
  buildLatticeGroup,
  createVideoQuizBlock,
  formatTime,
};
