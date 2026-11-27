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

function buildDuckRaceBanner() {
  const ducks = [
    { x: 700, y: 160, ring: "#f43f5e", num: 1 },
    { x: 870, y: 270, ring: "#0ea5e9", num: 7 },
    { x: 745, y: 390, ring: "#10b981", num: 3 },
  ]
    .map(
      (d) => `
      <g transform="translate(${d.x},${d.y})">
        <ellipse cx="95" cy="95" rx="78" ry="20" fill="#ffffff" opacity="0.35"/>
        <ellipse cx="95" cy="86" rx="64" ry="24" fill="${d.ring}" stroke="#ffffff" stroke-width="5"/>
        <ellipse cx="92" cy="64" rx="46" ry="30" fill="#fde047" stroke="#ca8a04" stroke-width="3"/>
        <circle cx="132" cy="36" r="24" fill="#fde047" stroke="#ca8a04" stroke-width="3"/>
        <rect x="128" y="28" width="22" height="10" rx="3" fill="#0f172a"/>
        <path d="M 152 36 Q 176 34 176 44 Q 174 52 152 48 Z" fill="#f97316"/>
        <circle cx="72" cy="66" r="16" fill="#ffffff"/>
        <text x="72" y="73" text-anchor="middle" fill="#0f172a" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${d.num}</text>
      </g>`
    )
    .join("");

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c4a6e"/>
      <stop offset="55%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <path d="M 620 0 L 1200 0 L 1200 630 L 560 630 Z" fill="#0ea5e9" opacity="0.35"/>
  <path d="M 610 180 Q 780 140 940 190 T 1200 180" fill="none" stroke="#bae6fd" stroke-width="8" opacity="0.5"/>
  <path d="M 590 330 Q 760 290 920 340 T 1200 330" fill="none" stroke="#bae6fd" stroke-width="8" opacity="0.5"/>
  <path d="M 570 480 Q 740 440 900 490 T 1200 480" fill="none" stroke="#bae6fd" stroke-width="8" opacity="0.5"/>
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#fde047"/>
  <text x="215" y="101" text-anchor="middle" fill="#0c4a6e" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">ĐUA VỊT</text>
  <text x="70" y="298" fill="#fde047" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">VƯỢT THÁC</text>
  <text x="70" y="366" fill="#e0f2fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Đàn vịt kính râm cưỡi phao lao qua thác nước</text>
  <text x="70" y="406" fill="#e0f2fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Đua chia bảng loại trực tiếp • Bứt tốc cực vui!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.18)" stroke="#bae6fd" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">64 TAY ĐUA</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.18)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">MIỄN PHÍ 100%</text>
  ${ducks}
</svg>`;
}

function buildPlinkoDropBanner() {
  const pegs = [];
  for (let r = 0; r < 6; r++) {
    const count = r + 3;
    for (let c = 0; c < count; c++) {
      const px = 900 + (c - (count - 1) / 2) * 62;
      const py = 125 + r * 56;
      pegs.push(`<circle cx="${px}" cy="${py}" r="8" fill="#e2e8f0" stroke="#38bdf8" stroke-width="3"/>`);
    }
  }
  const slotColors = ["#ec4899", "#8b5cf6", "#0ea5e9", "#f59e0b", "#10b981", "#f97316", "#f43f5e"];
  const slots = slotColors
    .map((col, idx) => {
      const sx = 668 + idx * 68;
      return `<rect x="${sx}" y="476" width="60" height="68" rx="14" fill="${col}" stroke="${idx === 3 ? "#fef08a" : "#ffffff"}" stroke-width="${idx === 3 ? 5 : 2}"/>
      <text x="${sx + 30}" y="518" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="900" font-family="Segoe UI, Arial, sans-serif">${idx + 1}</text>`;
    })
    .join("");

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="55%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#831843"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="900" cy="315" r="275" fill="#d946ef" opacity="0.18"/>
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#f0abfc"/>
  <text x="215" y="101" text-anchor="middle" fill="#3b0764" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif">THẢ BÓNG</text>
  <text x="70" y="298" fill="#fde047" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif">ZICZAC NEON</text>
  <text x="70" y="366" fill="#f5d0fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Bóng vàng nảy qua tháp đinh Plinko 7 tầng</text>
  <text x="70" y="406" fill="#f5d0fe" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Dự đoán đúng ô đáp • Nhận quà ví liền tay!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#f5d0fe" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">7 Ô NEON</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">MIỄN PHÍ 100%</text>
  ${pegs.join("")}
  <circle cx="918" cy="260" r="22" fill="#facc15" stroke="#ffffff" stroke-width="5"/>
  ${slots}
</svg>`;
}

function buildPenaltyShootoutBanner() {
  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="55%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Goal Frame -->
  <rect x="650" y="130" width="470" height="270" rx="12" fill="rgba(15,23,42,0.55)" stroke="#ffffff" stroke-width="12"/>
  <line x1="806" y1="130" x2="806" y2="400" stroke="#ffffff" stroke-width="2" opacity="0.3"/>
  <line x1="962" y1="130" x2="962" y2="400" stroke="#ffffff" stroke-width="2" opacity="0.3"/>
  <line x1="650" y1="265" x2="1120" y2="265" stroke="#ffffff" stroke-width="2" opacity="0.3"/>
  <!-- Winning Targets -->
  <circle cx="715" cy="190" r="38" fill="#10b981" stroke="#fef08a" stroke-width="5"/>
  <circle cx="1055" cy="340" r="38" fill="#10b981" stroke="#fef08a" stroke-width="5"/>
  <!-- Soccer Ball -->
  <circle cx="885" cy="495" r="48" fill="#ffffff" stroke="#0f172a" stroke-width="6"/>
  <polygon points="885,468 908,484 899,511 871,511 862,484" fill="#0f172a"/>
  <path d="M 885 495 Q 800 350 715 190" fill="none" stroke="#fde047" stroke-width="6" stroke-dasharray="12 10"/>
  <!-- Left Text -->
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#fde047"/>
  <text x="215" y="101" text-anchor="middle" fill="#064e3b" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif">SÚT LUÂN LƯU</text>
  <text x="70" y="298" fill="#fde047" font-size="64" font-weight="900" font-family="Segoe UI, Arial, sans-serif">SIÊU CÚP</text>
  <text x="70" y="366" fill="#d1fae5" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Chọn 1 trong 5 góc khung thành — 2 góc VÀO LƯỚI</text>
  <text x="70" y="406" fill="#d1fae5" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Đánh bại thủ môn • Vỡ òa cầu trường rực lửa!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#a7f3d0" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">5 GÓC SÚT</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">TỶ LỆ 40% THẮNG</text>
</svg>`;
}

function buildClawMachineBanner() {
  const capsuleColors = ["#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#0ea5e9", "#f43f5e"];
  const capsules = capsuleColors
    .map((c, idx) => {
      const cx = 720 + (idx % 3) * 125;
      const cy = 380 + Math.floor(idx / 3) * 95;
      return `<circle cx="${cx}" cy="${cy}" r="42" fill="${c}" stroke="#ffffff" stroke-width="5"/>
      <path d="M ${cx - 42} ${cy} L ${cx + 42} ${cy}" stroke="#ffffff" stroke-width="4" opacity="0.6"/>`;
    })
    .join("");

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#500724"/>
      <stop offset="55%" stop-color="#9d174d"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Arcade Cabinet -->
  <rect x="650" y="80" width="440" height="475" rx="34" fill="rgba(15,23,42,0.55)" stroke="#f472b6" stroke-width="8"/>
  <line x1="845" y1="88" x2="845" y2="215" stroke="#cbd5e1" stroke-width="8"/>
  <path d="M 845 215 L 800 265 M 845 215 L 890 265" stroke="#fde047" stroke-width="9" stroke-linecap="round"/>
  <circle cx="845" cy="268" r="36" fill="#facc15" stroke="#ffffff" stroke-width="5"/>
  ${capsules}
  <!-- Left Text -->
  <rect x="70" y="72" width="290" height="44" rx="22" fill="#fbcfe8"/>
  <text x="215" y="101" text-anchor="middle" fill="#831843" font-size="20" font-weight="900" font-family="Segoe UI, Arial, sans-serif">DKTEST MINIGAME LIVE</text>
  <text x="70" y="220" fill="#ffffff" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">GẮP THÚ</text>
  <text x="70" y="298" fill="#fde047" font-size="68" font-weight="900" font-family="Segoe UI, Arial, sans-serif">NHÂN PHẨM</text>
  <text x="70" y="366" fill="#fce7f3" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">8 thú bông siêu cưng trong tủ kính Arcade</text>
  <text x="70" y="406" fill="#fce7f3" font-size="26" font-weight="600" font-family="Segoe UI, Arial, sans-serif">Càng gắp tự động thả rơi • Hồi hộp từng giây!</text>
  <rect x="70" y="468" width="210" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fbcfe8" stroke-width="2"/>
  <text x="175" y="503" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">8 THÚ BÔNG</text>
  <rect x="300" y="468" width="220" height="54" rx="18" fill="rgba(255,255,255,0.16)" stroke="#fde047" stroke-width="2"/>
  <text x="410" y="503" text-anchor="middle" fill="#fef08a" font-size="21" font-weight="800" font-family="Segoe UI, Arial, sans-serif">MIỄN PHÍ 100%</text>
</svg>`;
}

renderJpg(buildWheelBanner(), path.join(OUT_DIR, "lucky-wheel.jpg"));
renderJpg(buildTreasureBanner(), path.join(OUT_DIR, "treasure-flip.jpg"));
renderJpg(buildMysteryBoxBanner(), path.join(OUT_DIR, "mystery-box.jpg"));
renderJpg(buildDuckRaceBanner(), path.join(OUT_DIR, "duck-race.jpg"));
renderJpg(buildPlinkoDropBanner(), path.join(OUT_DIR, "plinko-drop.jpg"));
renderJpg(buildPenaltyShootoutBanner(), path.join(OUT_DIR, "penalty-shootout.jpg"));
renderJpg(buildClawMachineBanner(), path.join(OUT_DIR, "claw-machine.jpg"));
