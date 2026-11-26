import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import jpeg from "jpeg-js";
import { decode } from "fast-png";

const OUT_DIR = path.join(process.cwd(), "public", "images", "minigames");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function renderJpg(svg, outPath) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  const decoded = decode(pngBuffer);
  const rawImageData = {
    data: Buffer.from(decoded.data),
    width: decoded.width,
    height: decoded.height,
  };
  const jpegData = jpeg.encode(rawImageData, 90);
  fs.writeFileSync(outPath, jpegData.data);
  console.log(`Generated ${outPath} (${(jpegData.data.length / 1024).toFixed(1)} KB)`);
}

function buildWheelBanner() {
  const colors = ["#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#f97316", "#10b981", "#ef4444", "#6366f1"];
  const cx = 910;
  const cy = 315;
  const r = 215;
  const sectors = colors
    .map((fill, i) => {
      const a0 = ((i * 45 - 90) * Math.PI) / 180;
      const a1 = (((i + 1) * 45 - 90) * Math.PI) / 180;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      return `<path d="M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${fill}" stroke="#ffffff" stroke-width="5"/>`;
    })
    .join("");

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a044e"/>
      <stop offset="50%" stop-color="#701a75"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
    <radialGradient id="glow" cx="76%" cy="50%" r="42%">
      <stop offset="0%" stop-color="#f0abfc" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#4a044e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g opacity="0.18" fill="#fde047">
    <circle cx="130" cy="110" r="14"/><circle cx="620" cy="95" r="10"/><circle cx="560" cy="540" r="16"/>
    <circle cx="1120" cy="110" r="12"/><circle cx="1140" cy="520" r="18"/>
  </g>
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#facc15"/>
  <text x="215" y="101" text-anchor="middle" fill="#422006" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">VÒNG QUAY</text>
  <text x="70" y="298" fill="#fde047" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">SIÊU TỐC</text>
  <text x="70" y="366" fill="#f5d0fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Chọn miễn phí 1 trong 8 biểu tượng may mắn</text>
  <text x="70" y="406" fill="#f5d0fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Quay trực tiếp 60fps • Quà cộng thẳng Ví DkTEST</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#f5d0fe" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">MIỄN PHÍ 100%</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">CHAT REALTIME</text>

  <!-- Wheel -->
  <circle cx="${cx}" cy="${cy}" r="${r + 22}" fill="#fbbf24" opacity="0.25"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="#fde047" stroke="#ffffff" stroke-width="6"/>
  ${sectors}
  <circle cx="${cx}" cy="${cy}" r="42" fill="#1e1b4b" stroke="#fde047" stroke-width="7"/>
  <text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="#fef08a" font-size="28" font-weight="900" font-family="Segoe UI, Arial, sans-serif">Dk</text>
  <!-- Top Pointer -->
  <polygon points="${cx},${cy - r + 26} ${cx - 24},${cy - r - 28} ${cx + 24},${cy - r - 28}" fill="#facc15" stroke="#ffffff" stroke-width="5"/>
</svg>`;
}

function buildTreasureBanner() {
  const chests = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col + 1;
      const x = 685 + col * 150;
      const y = 105 + row * 146;
      const isGold = idx === 2 || idx === 5;
      chests.push(`
        <g transform="translate(${x},${y})">
          <rect width="128" height="122" rx="22" fill="${isGold ? "#f59e0b" : "#292524"}" stroke="${isGold ? "#fef08a" : "#fbbf24"}" stroke-width="${isGold ? 5 : 3}" opacity="${isGold ? 1 : 0.92}"/>
          <rect x="24" y="42" width="80" height="48" rx="10" fill="${isGold ? "#fef08a" : "#92400e"}" stroke="${isGold ? "#b45309" : "#f59e0b"}" stroke-width="4"/>
          <path d="M 24 56 L 104 56" stroke="${isGold ? "#b45309" : "#fde68a"}" stroke-width="4"/>
          <rect x="56" y="49" width="16" height="16" rx="4" fill="#fbbf24" stroke="#78350f" stroke-width="2"/>
          <text x="16" y="28" fill="${isGold ? "#451a03" : "#fde68a"}" font-size="18" font-weight="900" font-family="Segoe UI, Arial, sans-serif">#${idx}</text>
          ${isGold ? `<polygon points="64,12 72,26 88,28 76,38 79,54 64,46 49,54 52,38 40,28 56,26" fill="#ffffff" opacity="0.9"/>` : ""}
        </g>`);
    }
  }
  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="55%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="910" cy="315" r="290" fill="#fbbf24" opacity="0.16"/>
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#fbbf24"/>
  <text x="215" y="101" text-anchor="middle" fill="#451a03" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">LẬT THẺ</text>
  <text x="70" y="298" fill="#fde047" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">KHO BÁU</text>
  <text x="70" y="366" fill="#fef3c7" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">9 rương bí mật — 2 Kim Cương Vàng ẩn giấu</text>
  <text x="70" y="406" fill="#fef3c7" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Lật mở 3D đồng loạt • Tỷ lệ trúng cực cao!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.14)" stroke="#fde68a" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">9 RƯƠNG 3D</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.14)" stroke="#fbbf24" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fde047" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">MIỄN PHÍ 100%</text>
  ${chests.join("")}
</svg>`;
}

function buildMysteryBoxBanner() {
  const palette = ["#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"];
  const boxes = palette
    .map((color, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 675 + col * 155;
      const y = 145 + row * 195;
      const isStar = i === 1;
      return `
      <g transform="translate(${x},${y})">
        <rect width="134" height="162" rx="24" fill="${color}" stroke="${isStar ? "#fef08a" : "#ffffff"}" stroke-width="${isStar ? 6 : 3}"/>
        <rect x="54" y="0" width="26" height="162" fill="#ffffff" opacity="0.28"/>
        <rect x="0" y="66" width="134" height="24" fill="#ffffff" opacity="0.28"/>
        <circle cx="67" cy="78" r="22" fill="#ffffff"/>
        <text x="67" y="88" text-anchor="middle" fill="${color}" font-size="26" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${isStar ? "★" : i + 1}</text>
      </g>`;
    })
    .join("");

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#881337"/>
      <stop offset="55%" stop-color="#be185d"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="910" cy="315" r="290" fill="#f472b6" opacity="0.24"/>
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#ffffff"/>
  <text x="215" y="101" text-anchor="middle" fill="#9d174d" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">ĐẬP HỘP</text>
  <text x="70" y="298" fill="#fde047" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">BÍ ẨN</text>
  <text x="70" y="366" fill="#fbcfe8" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">6 hộp quà sắc màu rực rỡ — chọn hộp may mắn</text>
  <text x="70" y="406" fill="#fbcfe8" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Bung pháo hoa trực tiếp tìm Hộp Đặc Biệt!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fbcfe8" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">6 HỘP QUÀ</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">PHÁO HOA LIVE</text>
  ${boxes}
</svg>`;
}

renderJpg(buildWheelBanner(), path.join(OUT_DIR, "lucky-wheel.jpg"));
renderJpg(buildTreasureBanner(), path.join(OUT_DIR, "treasure-flip.jpg"));
renderJpg(buildMysteryBoxBanner(), path.join(OUT_DIR, "mystery-box.jpg"));
