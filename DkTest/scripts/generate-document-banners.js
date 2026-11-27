import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import jpeg from "jpeg-js";
import { decode } from "fast-png";

const OUT_DIR = path.join(process.cwd(), "public", "images", "documents");
fs.mkdirSync(OUT_DIR, { recursive: true });

const banners = [
  {
    key: "library-hub",
    tag: "THƯ VIỆN HỌC LIỆU",
    title: "Kho Tài Liệu",
    subtitle: "Đề thi  •  Chuyên đề  •  Ebook 10, 11, 12",
    accent: "#0d9488",
    soft: "#ccfbf1",
    badge: "PDF",
  },
  {
    key: "math",
    tag: "KHO TÀI LIỆU",
    title: "Môn Toán Học",
    subtitle: "Đề kiểm tra  •  Chuyên đề  •  Giải tích & Hình học",
    accent: "#2563eb",
    soft: "#dbeafe",
    badge: "TOÁN",
  },
  {
    key: "literature",
    tag: "KHO TÀI LIỆU",
    title: "Môn Ngữ Văn",
    subtitle: "Đọc hiểu  •  Nghị luận  •  Tác phẩm chọn lọc",
    accent: "#e11d48",
    soft: "#ffe4e6",
    badge: "VĂN",
  },
  {
    key: "english",
    tag: "KHO TÀI LIỆU",
    title: "Môn Tiếng Anh",
    subtitle: "Từ vựng  •  Ngữ pháp  •  Đề luyện thi chuẩn",
    accent: "#0284c7",
    soft: "#e0f2fe",
    badge: "ANH",
  },
  {
    key: "physics",
    tag: "KHO TÀI LIỆU",
    title: "Môn Vật Lý",
    subtitle: "Lý thuyết trọng tâm  •  Bài tập  •  Đề thi thử",
    accent: "#4f46e5",
    soft: "#e0e7ff",
    badge: "VẬT LÝ",
  },
  {
    key: "chemistry",
    tag: "KHO TÀI LIỆU",
    title: "Môn Hóa Học",
    subtitle: "Hữu cơ  •  Vô cơ  •  Chuỗi phản ứng & Đề thi",
    accent: "#059669",
    soft: "#d1fae5",
    badge: "HÓA",
  },
  {
    key: "biology",
    tag: "KHO TÀI LIỆU",
    title: "Môn Sinh Học",
    subtitle: "Di truyền  •  Sinh thái  •  Sổ tay lý thuyết",
    accent: "#16a34a",
    soft: "#dcfce7",
    badge: "SINH",
  },
  {
    key: "history",
    tag: "KHO TÀI LIỆU",
    title: "Môn Lịch Sử",
    subtitle: "Lịch sử Việt Nam  •  Thế giới  •  Hệ thống đề",
    accent: "#d97706",
    soft: "#fef3c7",
    badge: "LỊCH SỬ",
  },
  {
    key: "geography",
    tag: "KHO TÀI LIỆU",
    title: "Môn Địa Lý",
    subtitle: "Địa lý tự nhiên  •  Kinh tế  •  Kỹ năng biểu đồ",
    accent: "#0d9488",
    soft: "#ccfbf1",
    badge: "ĐỊA LÝ",
  },
  {
    key: "civics",
    tag: "KHO TÀI LIỆU",
    title: "KT & Pháp Luật",
    subtitle: "Giáo dục kinh tế  •  Pháp luật  •  Đề ôn tập",
    accent: "#7c3aed",
    soft: "#ede9fe",
    badge: "KT&PL",
  },
  {
    key: "informatics",
    tag: "KHO TÀI LIỆU",
    title: "Môn Tin Học",
    subtitle: "Thuật toán  •  Lập trình  •  Cơ sở dữ liệu",
    accent: "#0891b2",
    soft: "#cffafe",
    badge: "TIN HỌC",
  },
  {
    key: "technology",
    tag: "KHO TÀI LIỆU",
    title: "Môn Công Nghệ",
    subtitle: "Thiết kế kỹ thuật  •  Điện tử  •  Đề kiểm tra",
    accent: "#ea580c",
    soft: "#ffedd5",
    badge: "CN",
  },
  {
    key: "dgnl",
    tag: "KHO TÀI LIỆU",
    title: "Đánh Giá Năng Lực",
    subtitle: "HSA  •  V-ACT  •  TSA  •  VSAT",
    accent: "#ca8a04",
    soft: "#fef9c3",
    badge: "ĐGNL",
  },
  {
    key: "default",
    tag: "KHO TÀI LIỆU",
    title: "Tài Liệu Học Tập",
    subtitle: "Đọc trực tuyến  •  Tải PDF miễn phí trên DkTEST",
    accent: "#0f766e",
    soft: "#ccfbf1",
    badge: "PDF",
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

function buildMinimalistDocSvg(cfg) {
  const titleSize = cfg.title.length > 15 ? 66 : 74;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="paperBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
  </defs>

  <!-- Minimalist Clean Paper Canvas -->
  <rect width="1200" height="630" fill="url(#paperBg)"/>

  <!-- Subtle Outer Frame -->
  <rect x="36" y="36" width="1128" height="558" rx="32" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Left Minimalist Accent Strip -->
  <rect x="36" y="136" width="8" height="140" rx="4" fill="${cfg.accent}"/>

  <!-- Top Brand & Tag -->
  <g transform="translate(96, 108)">
    <text x="0" y="28" fill="${cfg.accent}" font-size="22" font-weight="800" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">DkTEST  •  ${escapeXml(cfg.tag)}</text>
  </g>

  <!-- Calm Editorial Title -->
  <text x="96" y="274" fill="#0f172a" font-size="${titleSize}" font-weight="800" font-family="Segoe UI, Arial, sans-serif" letter-spacing="-1">${escapeXml(cfg.title)}</text>

  <!-- Minimal Divider -->
  <rect x="96" y="314" width="88" height="6" rx="3" fill="${cfg.accent}"/>

  <!-- Clean Subtitle -->
  <text x="96" y="380" fill="#475569" font-size="28" font-weight="500" font-family="Segoe UI, Arial, sans-serif">${escapeXml(cfg.subtitle)}</text>

  <!-- Simple Footer Note -->
  <g transform="translate(96, 488)">
    <rect x="0" y="0" width="248" height="46" rx="23" fill="${cfg.soft}"/>
    <text x="124" y="30" text-anchor="middle" fill="${cfg.accent}" font-size="19" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Đọc &amp; Tải PDF chuẩn</text>
  </g>

  <!-- Minimalist A4 Document Sheet Silhouette on Right -->
  <g transform="translate(836, 118)">
    <!-- Back sheet shadow -->
    <rect x="26" y="18" width="236" height="330" rx="22" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
    <!-- Front clean sheet -->
    <rect x="0" y="0" width="236" height="330" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="2.5"/>
    <!-- Badge pill -->
    <rect x="28" y="32" width="96" height="38" rx="12" fill="${cfg.soft}"/>
    <text x="76" y="57" text-anchor="middle" fill="${cfg.accent}" font-size="18" font-weight="800" font-family="Segoe UI, Arial, sans-serif">${escapeXml(cfg.badge)}</text>
    <!-- Minimalist text lines -->
    <rect x="28" y="102" width="180" height="12" rx="6" fill="#334155" opacity="0.82"/>
    <rect x="28" y="130" width="144" height="10" rx="5" fill="#94a3b8" opacity="0.65"/>
    <rect x="28" y="168" width="180" height="9" rx="4.5" fill="#cbd5e1"/>
    <rect x="28" y="190" width="166" height="9" rx="4.5" fill="#cbd5e1"/>
    <rect x="28" y="212" width="174" height="9" rx="4.5" fill="#cbd5e1"/>
    <rect x="28" y="234" width="120" height="9" rx="4.5" fill="#cbd5e1"/>
    <!-- Bottom accent bar inside sheet -->
    <rect x="28" y="282" width="64" height="8" rx="4" fill="${cfg.accent}" opacity="0.8"/>
  </g>
</svg>`;
}

for (const b of banners) {
  const svg = buildMinimalistDocSvg(b);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  const decoded = decode(pngBuffer);
  const jpg = jpeg.encode(
    {
      data: Buffer.from(decoded.data),
      width: decoded.width,
      height: decoded.height,
    },
    90
  );
  const outPath = path.join(OUT_DIR, `${b.key}.jpg`);
  fs.writeFileSync(outPath, jpg.data);
  console.log(`[DocBanners] Generated ${b.key}.jpg (${Math.round(jpg.data.length / 1024)} KB)`);
}
