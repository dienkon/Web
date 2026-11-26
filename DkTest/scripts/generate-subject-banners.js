import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import jpeg from "jpeg-js";
import { decode } from "fast-png";

const OUT_DIR = path.join(process.cwd(), "public", "images", "subjects");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Redesigned v2.0.6 Subject Banners:
// Minimalist, vibrant, unmistakably distinct per subject, super legible even at small thumbnail sizes.
const subjects = [
  {
    key: "math",
    aliases: ["toan", "toan-hoc"],
    title: "TOÁN HỌC",
    tag: "MÔN CHÍNH",
    tagline: "Đại số  •  Giải tích  •  Hình học",
    bg1: "#1d4ed8",
    bg2: "#0284c7",
    accent: "#bae6fd",
    pillBg: "#1e3a8a",
    iconColor: "#1d4ed8",
    iconSoft: "#dbeafe",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <g stroke="#93c5fd" stroke-width="5" stroke-dasharray="10,10" opacity="0.7">
        <line x1="76" y1="220" x2="324" y2="220"/>
        <line x1="200" y1="76" x2="200" y2="324"/>
      </g>
      <path d="M 86 296 Q 200 72 314 296" fill="none" stroke="#2563eb" stroke-width="14" stroke-linecap="round"/>
      <circle cx="200" cy="184" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="5"/>
      <text x="108" y="152" fill="#1e3a8a" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">π</text>
      <text x="250" y="154" fill="#0284c7" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif">∑</text>
      <text x="200" y="294" text-anchor="middle" fill="#1d4ed8" font-size="58" font-weight="900" font-family="Segoe UI, Arial, sans-serif">x²</text>
    `,
  },
  {
    key: "english",
    aliases: ["tieng-anh", "anh"],
    title: "TIẾNG ANH",
    tag: "NGOẠI NGỮ",
    tagline: "Grammar  •  Vocabulary  •  Reading",
    bg1: "#0369a1",
    bg2: "#06b6d4",
    accent: "#cffafe",
    pillBg: "#0c4a6e",
    iconColor: "#0369a1",
    iconSoft: "#e0f2fe",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <rect x="78" y="88" width="244" height="156" rx="36" fill="#0284c7"/>
      <polygon points="132,240 176,240 132,292" fill="#0284c7"/>
      <text x="200" y="192" text-anchor="middle" fill="#ffffff" font-size="94" font-weight="900" font-family="Segoe UI, Arial, sans-serif" letter-spacing="4">EN</text>
      <rect x="118" y="294" width="164" height="44" rx="22" fill="#e0f2fe"/>
      <text x="200" y="324" text-anchor="middle" fill="#0369a1" font-size="26" font-weight="900" font-family="Segoe UI, Arial, sans-serif">A • B • C</text>
    `,
  },
  {
    key: "physics",
    aliases: ["vat-ly", "ly"],
    title: "VẬT LÝ",
    tag: "TỰ NHIÊN",
    tagline: "Cơ học  •  Sóng & Điện  •  Hạt nhân",
    bg1: "#4f46e5",
    bg2: "#7c3aed",
    accent: "#ddd6fe",
    pillBg: "#312e81",
    iconColor: "#4f46e5",
    iconSoft: "#ede9fe",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <g fill="none" stroke-width="11" stroke-linecap="round">
        <ellipse cx="200" cy="200" rx="126" ry="48" stroke="#6366f1"/>
        <ellipse cx="200" cy="200" rx="126" ry="48" stroke="#8b5cf6" transform="rotate(60 200 200)"/>
        <ellipse cx="200" cy="200" rx="126" ry="48" stroke="#06b6d4" transform="rotate(120 200 200)"/>
      </g>
      <circle cx="326" cy="200" r="14" fill="#06b6d4"/>
      <circle cx="137" cy="91" r="14" fill="#8b5cf6"/>
      <circle cx="137" cy="309" r="14" fill="#6366f1"/>
      <circle cx="200" cy="200" r="34" fill="#4f46e5"/>
      <polygon points="204,178 186,204 201,204 195,224 216,196 201,196" fill="#fde047"/>
    `,
  },
  {
    key: "chemistry",
    aliases: ["hoa-hoc", "hoa"],
    title: "HÓA HỌC",
    tag: "TỰ NHIÊN",
    tagline: "Hữu cơ  •  Vô cơ  •  Phản ứng",
    bg1: "#047857",
    bg2: "#10b981",
    accent: "#a7f3d0",
    pillBg: "#064e3b",
    iconColor: "#047857",
    iconSoft: "#d1fae5",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <rect x="164" y="76" width="72" height="22" rx="11" fill="#047857"/>
      <path d="M 176 98 L 224 98 L 224 156 L 302 284 A 24 24 0 0 1 282 318 L 118 318 A 24 24 0 0 1 98 284 L 176 156 Z" fill="#ecfdf5" stroke="#047857" stroke-width="12" stroke-linejoin="round"/>
      <path d="M 134 236 Q 170 218 200 236 T 266 236 L 290 278 A 14 14 0 0 1 278 304 L 122 304 A 14 14 0 0 1 110 278 Z" fill="#10b981"/>
      <circle cx="176" cy="266" r="11" fill="#ffffff" opacity="0.85"/>
      <circle cx="222" cy="252" r="8" fill="#ffffff" opacity="0.85"/>
      <circle cx="200" cy="196" r="10" fill="#34d399"/>
      <circle cx="218" cy="166" r="7" fill="#6ee7b7"/>
    `,
  },
  {
    key: "biology",
    aliases: ["sinh-hoc", "sinh"],
    title: "SINH HỌC",
    tag: "TỰ NHIÊN",
    tagline: "Di truyền  •  Tế bào  •  Sinh thái",
    bg1: "#15803d",
    bg2: "#22c55e",
    accent: "#bbf7d0",
    pillBg: "#14532d",
    iconColor: "#15803d",
    iconSoft: "#dcfce7",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <g stroke-linecap="round" fill="none">
        <line x1="146" y1="126" x2="254" y2="126" stroke="#86efac" stroke-width="10"/>
        <line x1="138" y1="200" x2="262" y2="200" stroke="#4ade80" stroke-width="10"/>
        <line x1="146" y1="274" x2="254" y2="274" stroke="#86efac" stroke-width="10"/>
        <path d="M 124 84 C 124 146 276 146 276 200 C 276 254 124 254 124 316" stroke="#16a34a" stroke-width="16"/>
        <path d="M 276 84 C 276 146 124 146 124 200 C 124 254 276 254 276 316" stroke="#15803d" stroke-width="16"/>
      </g>
      <circle cx="200" cy="200" r="30" fill="#15803d"/>
      <path d="M 188 214 Q 186 184 214 184 Q 214 214 188 214 Z" fill="#ffffff"/>
    `,
  },
  {
    key: "literature",
    aliases: ["ngu-van", "van"],
    title: "NGỮ VĂN",
    tag: "XÃ HỘI",
    tagline: "Đọc hiểu  •  Nghị luận  •  Tác phẩm",
    bg1: "#be123c",
    bg2: "#f43f5e",
    accent: "#fecdd3",
    pillBg: "#881337",
    iconColor: "#be123c",
    iconSoft: "#ffe4e6",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <path d="M 200 156 Q 146 132 88 144 L 88 288 Q 146 276 200 300 Q 254 276 312 288 L 312 144 Q 254 132 200 156 Z" fill="#fff1f2" stroke="#be123c" stroke-width="11" stroke-linejoin="round"/>
      <line x1="200" y1="156" x2="200" y2="300" stroke="#be123c" stroke-width="9"/>
      <line x1="116" y1="186" x2="174" y2="180" stroke="#fb7185" stroke-width="8" stroke-linecap="round"/>
      <line x1="116" y1="220" x2="174" y2="214" stroke="#fb7185" stroke-width="8" stroke-linecap="round"/>
      <line x1="226" y1="180" x2="284" y2="186" stroke="#fb7185" stroke-width="8" stroke-linecap="round"/>
      <line x1="226" y1="214" x2="284" y2="220" stroke="#fb7185" stroke-width="8" stroke-linecap="round"/>
      <path d="M 262 72 Q 238 110 212 156 L 230 166 Q 268 122 290 78 Z" fill="#e11d48"/>
    `,
  },
  {
    key: "history",
    aliases: ["lich-su", "su"],
    title: "LỊCH SỬ",
    tag: "XÃ HỘI",
    tagline: "Việt Nam  •  Thế giới  •  Mốc sự kiện",
    bg1: "#b45309",
    bg2: "#f59e0b",
    accent: "#fef3c7",
    pillBg: "#78350f",
    iconColor: "#b45309",
    iconSoft: "#fef3c7",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <polygon points="200,82 88,144 312,144" fill="#d97706"/>
      <rect x="96" y="144" width="208" height="20" rx="6" fill="#b45309"/>
      <rect x="112" y="174" width="26" height="96" rx="6" fill="#f59e0b"/>
      <rect x="162" y="174" width="26" height="96" rx="6" fill="#f59e0b"/>
      <rect x="212" y="174" width="26" height="96" rx="6" fill="#f59e0b"/>
      <rect x="262" y="174" width="26" height="96" rx="6" fill="#f59e0b"/>
      <rect x="94" y="274" width="212" height="18" rx="6" fill="#d97706"/>
      <rect x="78" y="294" width="244" height="22" rx="8" fill="#b45309"/>
      <circle cx="200" cy="120" r="12" fill="#fef3c7"/>
    `,
  },
  {
    key: "geography",
    aliases: ["dia-ly", "dia"],
    title: "ĐỊA LÝ",
    tag: "XÃ HỘI",
    tagline: "Tự nhiên  •  Kinh tế  •  Atlat",
    bg1: "#0f766e",
    bg2: "#14b8a6",
    accent: "#ccfbf1",
    pillBg: "#115e59",
    iconColor: "#0f766e",
    iconSoft: "#ccfbf1",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <circle cx="200" cy="200" r="112" fill="#f0fdfa" stroke="#0f766e" stroke-width="12"/>
      <ellipse cx="200" cy="200" rx="52" ry="112" fill="none" stroke="#14b8a6" stroke-width="8"/>
      <line x1="88" y1="200" x2="312" y2="200" stroke="#14b8a6" stroke-width="8"/>
      <path d="M 110 144 Q 200 172 290 144" fill="none" stroke="#0d9488" stroke-width="7"/>
      <path d="M 110 256 Q 200 228 290 256" fill="none" stroke="#0d9488" stroke-width="7"/>
      <polygon points="200,118 220,200 200,184 180,200" fill="#f43f5e"/>
      <polygon points="200,282 220,200 200,216 180,200" fill="#0f766e"/>
      <circle cx="200" cy="200" r="11" fill="#ffffff" stroke="#0f766e" stroke-width="4"/>
    `,
  },
  {
    key: "informatics",
    aliases: ["tin-hoc", "tin", "lap-trinh"],
    title: "TIN HỌC",
    tag: "CÔNG NGHỆ",
    tagline: "Python • C++ • Thuật toán • CSDL",
    bg1: "#0e7490",
    bg2: "#0284c7",
    accent: "#a5f3fc",
    pillBg: "#164e63",
    iconColor: "#0e7490",
    iconSoft: "#cffafe",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <rect x="74" y="96" width="252" height="208" rx="28" fill="#0f172a"/>
      <circle cx="110" cy="130" r="9" fill="#ef4444"/>
      <circle cx="138" cy="130" r="9" fill="#facc15"/>
      <circle cx="166" cy="130" r="9" fill="#22c55e"/>
      <text x="200" y="238" text-anchor="middle" fill="#22d3ee" font-size="84" font-weight="900" font-family="Consolas, monospace">&lt;/&gt;</text>
    `,
  },
  {
    key: "civics",
    aliases: ["gdcd", "kinh-te-phap-luat"],
    title: "KT & PHÁP LUẬT",
    tag: "XÃ HỘI",
    tagline: "Công dân  •  Pháp luật  •  Kinh tế",
    bg1: "#7e22ce",
    bg2: "#a855f7",
    accent: "#f3e8ff",
    pillBg: "#581c87",
    iconColor: "#7e22ce",
    iconSoft: "#f3e8ff",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <line x1="200" y1="88" x2="200" y2="294" stroke="#7e22ce" stroke-width="14" stroke-linecap="round"/>
      <rect x="136" y="286" width="128" height="24" rx="12" fill="#7e22ce"/>
      <line x1="104" y1="136" x2="296" y2="136" stroke="#a855f7" stroke-width="12" stroke-linecap="round"/>
      <line x1="116" y1="136" x2="94" y2="208" stroke="#9333ea" stroke-width="7"/>
      <line x1="116" y1="136" x2="138" y2="208" stroke="#9333ea" stroke-width="7"/>
      <path d="M 80 208 Q 116 250 152 208 Z" fill="#a855f7"/>
      <line x1="284" y1="136" x2="262" y2="208" stroke="#9333ea" stroke-width="7"/>
      <line x1="284" y1="136" x2="306" y2="208" stroke="#9333ea" stroke-width="7"/>
      <path d="M 248 208 Q 284 250 320 208 Z" fill="#a855f7"/>
      <circle cx="200" cy="92" r="14" fill="#c084fc"/>
    `,
  },
  {
    key: "technology",
    aliases: ["cong-nghe"],
    title: "CÔNG NGHỆ",
    tag: "KỸ THUẬT",
    tagline: "Cơ khí  •  Điện tử  •  Ứng dụng",
    bg1: "#c2410c",
    bg2: "#f97316",
    accent: "#ffedd5",
    pillBg: "#7c2d12",
    iconColor: "#c2410c",
    iconSoft: "#ffedd5",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <g fill="#ea580c">
        <circle cx="168" cy="182" r="62"/>
        <rect x="152" y="102" width="32" height="160" rx="8"/>
        <rect x="88" y="166" width="160" height="32" rx="8"/>
        <rect x="152" y="102" width="32" height="160" rx="8" transform="rotate(45 168 182)"/>
        <rect x="152" y="102" width="32" height="160" rx="8" transform="rotate(-45 168 182)"/>
      </g>
      <circle cx="168" cy="182" r="28" fill="#ffffff"/>
      <g fill="#fb923c">
        <circle cx="266" cy="252" r="42"/>
        <rect x="255" y="198" width="22" height="108" rx="6"/>
        <rect x="212" y="241" width="108" height="22" rx="6"/>
        <rect x="255" y="198" width="22" height="108" rx="6" transform="rotate(45 266 252)"/>
        <rect x="255" y="198" width="22" height="108" rx="6" transform="rotate(-45 266 252)"/>
      </g>
      <circle cx="266" cy="252" r="18" fill="#ffffff"/>
    `,
  },
  {
    key: "natural-sciences",
    aliases: ["khtn", "khoa-hoc-tu-nhien"],
    title: "KHTN TÍCH HỢP",
    tag: "TÍCH HỢP",
    tagline: "Vật lý  •  Hóa học  •  Sinh học",
    bg1: "#0d9488",
    bg2: "#0284c7",
    accent: "#ccfbf1",
    pillBg: "#115e59",
    iconColor: "#0d9488",
    iconSoft: "#ccfbf1",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <ellipse cx="200" cy="196" rx="122" ry="50" fill="none" stroke="#0284c7" stroke-width="10" transform="rotate(30 200 196)"/>
      <ellipse cx="200" cy="196" rx="122" ry="50" fill="none" stroke="#10b981" stroke-width="10" transform="rotate(-30 200 196)"/>
      <path d="M 180 126 L 220 126 L 220 174 L 266 266 A 18 18 0 0 1 250 292 L 150 292 A 18 18 0 0 1 134 266 L 180 174 Z" fill="#f0fdfa" stroke="#0f766e" stroke-width="11" stroke-linejoin="round"/>
      <path d="M 192 272 Q 178 224 214 206 Q 226 244 192 272 Z" fill="#16a34a"/>
    `,
  },
  {
    key: "social-sciences",
    aliases: ["khxh", "lich-su-dia-ly"],
    title: "SỬ & ĐỊA",
    tag: "TÍCH HỢP",
    tagline: "Lịch sử dân tộc  •  Địa lý kinh tế",
    bg1: "#9a3412",
    bg2: "#d97706",
    accent: "#fef3c7",
    pillBg: "#7c2d12",
    iconColor: "#9a3412",
    iconSoft: "#ffedd5",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <circle cx="200" cy="200" r="112" fill="#fffbeb" stroke="#d97706" stroke-width="12"/>
      <ellipse cx="200" cy="200" rx="50" ry="112" fill="none" stroke="#f59e0b" stroke-width="7"/>
      <polygon points="200,116 132,156 268,156" fill="#b45309"/>
      <rect x="148" y="164" width="18" height="72" rx="4" fill="#d97706"/>
      <rect x="180" y="164" width="18" height="72" rx="4" fill="#d97706"/>
      <rect x="212" y="164" width="18" height="72" rx="4" fill="#d97706"/>
      <rect x="244" y="164" width="18" height="72" rx="4" fill="#d97706"/>
      <rect x="132" y="238" width="136" height="18" rx="6" fill="#9a3412"/>
    `,
  },
  {
    key: "default",
    aliases: ["exam-default", "tong-hop"],
    title: "ĐỀ THI DkTEST",
    tag: "KHẢO THÍ",
    tagline: "Luyện thi trực tuyến  •  Chấm điểm tức thì",
    bg1: "#1e40af",
    bg2: "#4f46e5",
    accent: "#dbeafe",
    pillBg: "#1e3a8a",
    iconColor: "#1e40af",
    iconSoft: "#dbeafe",
    iconSvg: `
      <rect x="34" y="34" width="332" height="332" rx="64" fill="#ffffff"/>
      <polygon points="200,98 318,154 200,210 82,154" fill="#2563eb"/>
      <path d="M 134 182 L 134 236 Q 200 282 266 236 L 266 182" fill="#1e40af"/>
      <line x1="296" y1="164" x2="296" y2="232" stroke="#f59e0b" stroke-width="10" stroke-linecap="round"/>
      <circle cx="296" cy="244" r="14" fill="#f59e0b"/>
      <polygon points="200,264 210,286 234,289 216,305 221,329 200,317 179,329 184,305 166,289 190,286" fill="#f59e0b"/>
    `,
  },
];

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateBannerSvg(cfg) {
  const safeTitle = escapeXml(cfg.title);
  const safeTag = escapeXml(cfg.tag);
  const safeTagline = escapeXml(cfg.tagline);
  const titleFontSize = cfg.title.length > 13 ? 72 : cfg.title.length > 10 ? 80 : 90;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cfg.bg1}"/>
      <stop offset="100%" stop-color="${cfg.bg2}"/>
    </linearGradient>
    <radialGradient id="halo" cx="78%" cy="50%" r="42%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Clean Vivid Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>

  <!-- Subtle Decorative Shapes (Minimalist, Zero Visual Clutter) -->
  <circle cx="88" cy="570" r="170" fill="#ffffff" opacity="0.06"/>
  <circle cx="1140" cy="80" r="150" fill="#ffffff" opacity="0.08"/>

  <!-- Top Brand + Category Tag -->
  <g transform="translate(76, 68)">
    <rect x="0" y="0" width="144" height="48" rx="14" fill="#ffffff"/>
    <text x="72" y="33" text-anchor="middle" fill="${cfg.bg1}" font-size="24" font-weight="900" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1">DkTEST</text>

    <rect x="164" y="0" width="166" height="48" rx="24" fill="${cfg.pillBg}" opacity="0.55"/>
    <text x="247" y="32" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="800" font-family="Segoe UI, Arial, sans-serif" letter-spacing="1.5">${safeTag}</text>
  </g>

  <!-- Large Crisp Subject Title -->
  <text x="76" y="292" fill="#ffffff" font-size="${titleFontSize}" font-weight="900" font-family="Segoe UI, Arial, sans-serif" letter-spacing="-1">${safeTitle}</text>

  <!-- Clean Accent Bar -->
  <rect x="76" y="328" width="128" height="10" rx="5" fill="${cfg.accent}"/>

  <!-- Clear Short Tagline -->
  <text x="76" y="400" fill="#ffffff" opacity="0.95" font-size="30" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${safeTagline}</text>

  <!-- Clean Bottom Domain Indicator -->
  <g transform="translate(76, 512)">
    <rect x="0" y="0" width="276" height="54" rx="27" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
    <text x="138" y="35" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="800" font-family="Segoe UI, Arial, sans-serif">Luyện thi trực tuyến</text>
  </g>

  <!-- Right Emblematic Subject Illustration Card (400x400) -->
  <g transform="translate(736, 115)">
    <rect x="16" y="16" width="368" height="368" rx="76" fill="#000000" opacity="0.14"/>
    ${cfg.iconSvg}
  </g>
</svg>`;
}

console.log("[BannerGen] Remaking 14 minimalist vivid subject banners...");

for (const sub of subjects) {
  const svg = generateBannerSvg(sub);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  const decodedPng = decode(pngBuffer);
  const jpegBuffer = jpeg.encode(
    {
      data: Buffer.from(decodedPng.data),
      width: decodedPng.width,
      height: decodedPng.height,
    },
    90
  );

  const primaryJpg = path.join(OUT_DIR, `${sub.key}.jpg`);
  const primaryPng = path.join(OUT_DIR, `${sub.key}.png`);
  fs.writeFileSync(primaryJpg, jpegBuffer.data);
  fs.writeFileSync(primaryPng, pngBuffer);
  console.log(
    `[BannerGen] Generated ${sub.key}.jpg (${Math.round(jpegBuffer.data.length / 1024)} KB)`
  );

  for (const alias of sub.aliases) {
    fs.copyFileSync(primaryJpg, path.join(OUT_DIR, `${alias}.jpg`));
    fs.copyFileSync(primaryPng, path.join(OUT_DIR, `${alias}.png`));
  }
}

const distSubjectsDir = path.join(process.cwd(), "dist", "images", "subjects");
if (fs.existsSync(path.join(process.cwd(), "dist"))) {
  fs.mkdirSync(distSubjectsDir, { recursive: true });
  for (const file of fs.readdirSync(OUT_DIR)) {
    fs.copyFileSync(path.join(OUT_DIR, file), path.join(distSubjectsDir, file));
  }
}

console.log("[BannerGen] All 14 subject banners (+ aliases) remade cleanly!");
