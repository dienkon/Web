import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const targetDirs = [
  path.join(root, 'trung-tam/public/assets/library/substances'),
  path.join(root, 'assets/library/substances'),
  path.join(root, 'public/assets/library/substances'),
];
if (fs.existsSync(path.join(root, 'dist'))) {
  targetDirs.push(path.join(root, 'dist/assets/library/substances'));
}

for (const d of targetDirs) {
  fs.mkdirSync(d, { recursive: true });
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SPECIFIC_PHYSICAL_ASSETS = {
  // WATER
  'chat-nuoc': {
    badge: 'VẬT CHẤT CỦA SỰ SỐNG · NƯỚC TINH KHIẾT',
    subtitle: 'Meniscus trong suốt & Giọt nước vỡ bọt sóng',
    bgStart: '#0284c7',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    graphic: `
      <!-- Water Droplet & Ripple Basin -->
      <path d="M160 50 C160 50, 220 140, 220 180 A60 60 0 1 1 100 180 C100 140, 160 50, 160 50 Z" fill="#38bdf8" fill-opacity="0.85" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <ellipse cx="140" cy="160" rx="15" ry="30" fill="#ffffff" fill-opacity="0.6" transform="rotate(-30 140 160)"/>
      <!-- Ripples -->
      <ellipse cx="160" cy="270" rx="100" ry="25" fill="none" stroke="#7dd3fc" stroke-width="2.5" opacity="0.6"/>
      <ellipse cx="160" cy="270" rx="60" ry="15" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">Liên kết Hiđro liên phân tử · Sức căng bề mặt lớn</text>
    `,
  },
  'nuoc-h2o': {
    badge: 'VẬT CHẤT CỦA SỰ SỐNG · NƯỚC TINH KHIẾT',
    subtitle: 'Meniscus trong suốt & Giọt nước vỡ bọt sóng',
    bgStart: '#0284c7',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    graphic: `
      <!-- Water Droplet & Ripple Basin -->
      <path d="M160 50 C160 50, 220 140, 220 180 A60 60 0 1 1 100 180 C100 140, 160 50, 160 50 Z" fill="#38bdf8" fill-opacity="0.85" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <ellipse cx="140" cy="160" rx="15" ry="30" fill="#ffffff" fill-opacity="0.6" transform="rotate(-30 140 160)"/>
      <ellipse cx="160" cy="270" rx="100" ry="25" fill="none" stroke="#7dd3fc" stroke-width="2.5" opacity="0.6"/>
      <ellipse cx="160" cy="270" rx="60" ry="15" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">H₂O lỏng · Dung môi phân cực phổ quát</text>
    `,
  },
  // SALT / NACL
  'chat-natri-clorua': {
    badge: 'KHOÁNG VẬT QUẶNG TỰ NHIÊN · MUỐI MỎ HALIT',
    subtitle: 'Tinh thể lập phương trong suốt & Cánh đồng muối biển',
    bgStart: '#0284c7',
    bgEnd: '#1e3a8a',
    accent: '#93c5fd',
    graphic: `
      <!-- Halite cubic crystal cluster -->
      <polygon points="160,60 235,100 160,140 85,100" fill="#e0f2fe" stroke="#ffffff" stroke-width="2"/>
      <polygon points="85,100 160,140 160,225 85,185" fill="#93c5fd" stroke="#ffffff" stroke-width="2"/>
      <polygon points="235,100 160,140 160,225 235,185" fill="#60a5fa" stroke="#ffffff" stroke-width="2"/>
      <!-- Smaller nested crystal -->
      <polygon points="210,180 260,205 210,230 160,205" fill="#f8fafc" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="160,205 210,230 210,270 160,245" fill="#cbd5e1" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="260,205 210,230 210,270 260,245" fill="#94a3b8" stroke="#ffffff" stroke-width="1.5"/>
      <text x="160" y="315" text-anchor="middle" fill="#dbeafe" font-family="sans-serif" font-weight="800" font-size="13.5">Mạng lập phương tâm diện (FCC) · Mỏ muối Halit</text>
    `,
  },
  'natri-clorua-nacl': {
    badge: 'KHOÁNG VẬT QUẶNG TỰ NHIÊN · MUỐI MỎ HALIT',
    subtitle: 'Tinh thể lập phương trong suốt & Cánh đồng muối biển',
    bgStart: '#0284c7',
    bgEnd: '#1e3a8a',
    accent: '#93c5fd',
    graphic: `
      <!-- Halite cubic crystal cluster -->
      <polygon points="160,60 235,100 160,140 85,100" fill="#e0f2fe" stroke="#ffffff" stroke-width="2"/>
      <polygon points="85,100 160,140 160,225 85,185" fill="#93c5fd" stroke="#ffffff" stroke-width="2"/>
      <polygon points="235,100 160,140 160,225 235,185" fill="#60a5fa" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="315" text-anchor="middle" fill="#dbeafe" font-family="sans-serif" font-weight="800" font-size="13.5">NaCl tinh khiết · Tinh thể lập phương đối xứng</text>
    `,
  },
  // AMMONIA
  'chat-amoniac': {
    badge: 'KHÍ CÔNG NGHIỆP CỐT LÕI · QUY TRÌNH HABER-BOSCH',
    subtitle: 'Khí bốc mùi khai nồng & Tháp áp suất xúc tác Fe',
    bgStart: '#0369a1',
    bgEnd: '#1e1b4b',
    accent: '#67e8f9',
    graphic: `
      <!-- Catalytic High Pressure Reactor Tower & Mist -->
      <rect x="120" y="70" width="80" height="180" rx="16" fill="#334155" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="160" cy="110" r="18" fill="#38bdf8" opacity="0.8" filter="url(#glow)"/>
      <text x="160" y="115" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="12">NH₃</text>
      <!-- Steam / Gas dispersion plume -->
      <path d="M160 70 Q190 40 220 50 T260 30" fill="none" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <path d="M160 70 Q130 40 100 50 T60 30" fill="none" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <text x="160" y="315" text-anchor="middle" fill="#cffafe" font-family="sans-serif" font-weight="800" font-size="13.5">N₂ + 3H₂ ⇌ 2NH₃ (200 atm, 450°C, xúc tác Fe)</text>
    `,
  },
  'amoniac-nh3': {
    badge: 'KHÍ CÔNG NGHIỆP CỐT LÕI · QUY TRÌNH HABER-BOSCH',
    subtitle: 'Khí bốc mùi khai nồng & Tháp áp suất xúc tác Fe',
    bgStart: '#0369a1',
    bgEnd: '#1e1b4b',
    accent: '#67e8f9',
    graphic: `
      <rect x="120" y="70" width="80" height="180" rx="16" fill="#334155" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="160" cy="110" r="18" fill="#38bdf8" opacity="0.8" filter="url(#glow)"/>
      <text x="160" y="115" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="12">NH₃</text>
      <text x="160" y="315" text-anchor="middle" fill="#cffafe" font-family="sans-serif" font-weight="800" font-size="13.5">Amoniac lỏng &amp; Phân bón đạm cho nhân loại</text>
    `,
  },
  // GOLD
  'vang-au': {
    badge: 'KIM LOẠI QUÝ HIẾM BẬC NHẤT · VÀNG NGUYÊN CHẤT',
    subtitle: 'Thỏi vàng ròng 999.9 lấp lánh & Vỉa vàng sa khoáng',
    bgStart: '#b45309',
    bgEnd: '#78350f',
    accent: '#fef08a',
    graphic: `
      <!-- Gold Ingot 999.9 -->
      <polygon points="100,140 220,140 250,210 70,210" fill="#fde047" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <polygon points="70,210 250,210 240,245 80,245" fill="#ca8a04" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="180" text-anchor="middle" fill="#78350f" font-family="sans-serif" font-weight="900" font-size="20">AU 999.9</text>
      <circle cx="120" cy="100" r="16" fill="#fef08a" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="210" cy="95" r="12" fill="#fef08a" stroke="#ffffff" stroke-width="1.5"/>
      <text x="160" y="315" text-anchor="middle" fill="#fef9c3" font-family="sans-serif" font-weight="800" font-size="13.5">Mạng FCC · Độ trơ hóa học tuyệt đối · Ánh kim lộng lẫy</text>
    `,
  },
  // COPPER
  'dong-cu': {
    badge: 'KIM LOẠI DẪN ĐIỆN VĨ ĐẠI · ĐỒNG NGUYÊN CHẤT',
    subtitle: 'Mạch quặng malachit xanh lục & Thỏi đồng đỏ cam',
    bgStart: '#c2410c',
    bgEnd: '#064e3b',
    accent: '#fdba74',
    graphic: `
      <!-- Pure Copper Ingot + Malachite Green Rock -->
      <polygon points="90,140 200,140 230,200 60,200" fill="#ea580c" stroke="#ffffff" stroke-width="2.5"/>
      <polygon points="60,200 230,200 220,230 70,230" fill="#9a3412" stroke="#ffffff" stroke-width="2"/>
      <!-- Malachite green ore rock -->
      <path d="M190 120 Q230 90 260 130 Q270 180 230 190 Z" fill="#059669" stroke="#ffffff" stroke-width="2"/>
      <text x="145" y="175" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="18">Cu 99.99%</text>
      <text x="160" y="315" text-anchor="middle" fill="#fed7aa" font-family="sans-serif" font-weight="800" font-size="13.5">Dẫn điện &amp; dẫn nhiệt vượt trội · Quặng Cancopirit / Malachit</text>
    `,
  },
  // IRON
  'sat-fe': {
    badge: 'TRỤ CỘT NỀN LUYỆN KIM · SẮT & QUẶNG HEMATIT',
    subtitle: 'Vỉa quặng hematit đỏ nâu & Tia lửa lò cao luyện thép',
    bgStart: '#450a0a',
    bgEnd: '#1c1917',
    accent: '#fca5a5',
    graphic: `
      <!-- Hematite mineral rock + Steel sparks -->
      <path d="M80 180 Q100 100 160 90 Q220 80 240 150 Q250 220 170 230 Q100 240 80 180 Z" fill="#7f1d1d" stroke="#ffffff" stroke-width="2"/>
      <!-- Molten iron pour stream with sparks -->
      <path d="M160 90 L160 230" stroke="#f97316" stroke-width="6" stroke-linecap="round" filter="url(#glow)"/>
      <circle cx="140" cy="120" r="4" fill="#fef08a"/>
      <circle cx="185" cy="140" r="4" fill="#fef08a"/>
      <circle cx="130" cy="180" r="3" fill="#fef08a"/>
      <circle cx="190" cy="200" r="5" fill="#fef08a"/>
      <text x="160" y="315" text-anchor="middle" fill="#fecaca" font-family="sans-serif" font-weight="800" font-size="13.5">Quặng Hematit Fe₂O₃ · Magnetit Fe₃O₄ · Lò cao luyện gang thép</text>
    `,
  },
  // MERCURY
  'thuy-ngan-hg': {
    badge: 'KIM LOẠI LỎNG DUY NHẤT · THỦY NGÂN ÓNG ÁNH',
    subtitle: 'Giọt kim loại lỏng trôi lăn & Quặng chu sa đỏ thắm',
    bgStart: '#334155',
    bgEnd: '#0f172a',
    accent: '#cbd5e1',
    graphic: `
      <!-- Liquid mercury droplet with high surface tension -->
      <ellipse cx="160" cy="160" rx="65" ry="50" fill="#94a3b8" stroke="#ffffff" stroke-width="3" filter="url(#glow)"/>
      <ellipse cx="145" cy="145" rx="20" ry="12" fill="#ffffff" fill-opacity="0.75" transform="rotate(-20 145 145)"/>
      <!-- Small mercury satellites -->
      <circle cx="85" cy="185" r="16" fill="#94a3b8" stroke="#ffffff" stroke-width="2"/>
      <circle cx="235" cy="180" r="20" fill="#94a3b8" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="315" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-weight="800" font-size="13.5">Điểm nóng chảy -38.8°C · Quặng chu sa Cinnabar (HgS)</text>
    `,
  },
  // SODIUM
  'natri-na': {
    badge: 'KIM LOẠI KIỀM MÃNH LIỆT · NATRI TINH KHIẾT',
    subtitle: 'Thanh kim loại mềm cắt trong dầu & Ngọn lửa vàng rực 589 nm',
    bgStart: '#ea580c',
    bgEnd: '#7c2d12',
    accent: '#fde047',
    graphic: `
      <!-- Sodium chunk sliced in oil + Yellow flame -->
      <polygon points="80,150 170,120 220,180 130,210" fill="#e2e8f0" stroke="#ffffff" stroke-width="2.5"/>
      <!-- Yellow flame emission -->
      <path d="M180 80 Q220 30 200 130 Q240 140 210 180 Z" fill="#fde047" opacity="0.9" filter="url(#glow)"/>
      <text x="160" y="315" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="800" font-size="13.5">Bảo quản ngập trong dầu hỏa · Phổ phát xạ D-line 589 nm</text>
    `,
  },
  // ETHANOL
  'chat-etanol': {
    badge: 'HỢP CHẤT CỒN QUEN THUỘC · RƯỢU ETYLIC',
    subtitle: 'Nước cồn chưng cất trong suốt & Ngọn lửa xanh lam nhạt',
    bgStart: '#0f766e',
    bgEnd: '#0f172a',
    accent: '#2dd4bf',
    graphic: `
      <!-- Spirit burner with pale blue flame -->
      <ellipse cx="160" cy="200" rx="55" ry="35" fill="#334155" stroke="#ffffff" stroke-width="2"/>
      <!-- Wick -->
      <rect x="154" y="160" width="12" height="30" fill="#f8fafc"/>
      <!-- Pale blue flame -->
      <path d="M160 70 Q195 130 180 160 Q160 170 140 160 Q125 130 160 70 Z" fill="#38bdf8" opacity="0.85" filter="url(#glow)"/>
      <path d="M160 110 Q180 140 170 160 Q160 165 150 160 Q140 140 160 110 Z" fill="#ffffff" opacity="0.9"/>
      <text x="160" y="315" text-anchor="middle" fill="#ccfbf1" font-family="sans-serif" font-weight="800" font-size="13.5">C₂H₅OH · Lên men tinh bột &amp; ngọn lửa cháy sạch không khói</text>
    `,
  },
  'etanol-c2h5oh': {
    badge: 'HỢP CHẤT CỒN QUEN THUỘC · RƯỢU ETYLIC',
    subtitle: 'Nước cồn chưng cất trong suốt & Ngọn lửa xanh lam nhạt',
    bgStart: '#0f766e',
    bgEnd: '#0f172a',
    accent: '#2dd4bf',
    graphic: `
      <ellipse cx="160" cy="200" rx="55" ry="35" fill="#334155" stroke="#ffffff" stroke-width="2"/>
      <rect x="154" y="160" width="12" height="30" fill="#f8fafc"/>
      <path d="M160 70 Q195 130 180 160 Q160 170 140 160 Q125 130 160 70 Z" fill="#38bdf8" opacity="0.85" filter="url(#glow)"/>
      <text x="160" y="315" text-anchor="middle" fill="#ccfbf1" font-family="sans-serif" font-weight="800" font-size="13.5">Nhiên liệu sinh học ethanol E5 · Dung môi dược phẩm</text>
    `,
  },
  // METHANE
  'chat-metan': {
    badge: 'HIĐROCACBON ĐẦU DÃY · KHÍ THIÊN NHIÊN METAN',
    subtitle: 'Ngọn lửa khí đốt màu xanh biếc & Nguồn năng lượng sạch',
    bgStart: '#0284c7',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    graphic: `
      <!-- Blue Gas Flame Ring -->
      <ellipse cx="160" cy="220" rx="70" ry="25" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <path d="M160 60 Q200 140 190 200 Q160 215 130 200 Q120 140 160 60 Z" fill="#0284c7" opacity="0.9" filter="url(#glow)"/>
      <path d="M160 110 Q180 160 175 200 Q160 210 145 200 Q140 160 160 110 Z" fill="#38bdf8" opacity="0.95"/>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">CH₄ + 2O₂ ➔ CO₂ + 2H₂O (ΔrH°298 = -890.3 kJ/mol)</text>
    `,
  },
  'metan-ch4': {
    badge: 'HIĐROCACBON ĐẦU DÃY · KHÍ THIÊN NHIÊN METAN',
    subtitle: 'Ngọn lửa khí đốt màu xanh biếc & Nguồn năng lượng sạch',
    bgStart: '#0284c7',
    bgEnd: '#0f172a',
    accent: '#38bdf8',
    graphic: `
      <ellipse cx="160" cy="220" rx="70" ry="25" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
      <path d="M160 60 Q200 140 190 200 Q160 215 130 200 Q120 140 160 60 Z" fill="#0284c7" opacity="0.9" filter="url(#glow)"/>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">Khí bioga hầm ủ hữu cơ &amp; Khí thiên nhiên hóa lỏng (LNG)</text>
    `,
  },
  // CO2
  'carbon-dioxide-co2': {
    badge: 'KHÍ NHÀ KÍNH & CÔNG NGHỆ BĂNG KHÔ · CACBON DIOXIT',
    subtitle: 'Băng khô CO2 thăng hoa cuồn cuộn & Bình dập lửa',
    bgStart: '#334155',
    bgEnd: '#0f172a',
    accent: '#94a3b8',
    graphic: `
      <!-- Dry Ice Sublimation Plume + Fire Extinguisher -->
      <rect x="100" y="160" width="120" height="70" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
      <path d="M120 160 Q100 100 130 70 Q160 40 180 80 Q210 100 200 160 Z" fill="#e2e8f0" opacity="0.6" filter="url(#glow)"/>
      <text x="160" y="200" text-anchor="middle" fill="#1e293b" font-family="sans-serif" font-weight="900" font-size="16">DRY ICE -78.5°C</text>
      <text x="160" y="315" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-weight="800" font-size="13.5">Thăng hoa trực tiếp rắn ➔ khí · Khí dập tắt đám cháy</text>
    `,
  },
  // DIAMOND / CARBON
  'carbon-c': {
    badge: 'VẬT LIỆU KỶ NGUYÊN CỦA CACBON · KIM CƯƠNG & THAN CHÌ',
    subtitle: 'Kim cương giác cắt lấp lánh & Tấm than chì đen mờ',
    bgStart: '#0f172a',
    bgEnd: '#0284c7',
    accent: '#38bdf8',
    graphic: `
      <!-- Faceted Diamond Gemstone -->
      <polygon points="160,70 230,120 160,230 90,120" fill="#38bdf8" fill-opacity="0.8" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <line x1="90" y1="120" x2="230" y2="120" stroke="#ffffff" stroke-width="2"/>
      <line x1="160" y1="70" x2="160" y2="230" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="125,120 160,70 195,120 160,230" fill="#e0f2fe" fill-opacity="0.5"/>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">Độ cứng 10 thang Mohs · Hai thù hình kỳ diệu: Kim cương &amp; Graphit</text>
    `,
  },
  // IODINE
  'iot-i': {
    badge: 'HALOGEN TINH THỂ TÍM · IOT NGUYÊN CHẤT',
    subtitle: 'Hơi tím thăng hoa huyền ảo & Tinh thể đen ánh kim',
    bgStart: '#581c87',
    bgEnd: '#1e1b4b',
    accent: '#d8b4fe',
    graphic: `
      <!-- Iodine Flask with rising Violet Fumes -->
      <path d="M120 220 L140 140 L180 140 L200 220 Z" fill="#3b0764" stroke="#ffffff" stroke-width="2"/>
      <path d="M140 140 Q110 90 140 50 Q170 80 160 140 Z" fill="#c084fc" opacity="0.8" filter="url(#glow)"/>
      <path d="M160 140 Q190 90 180 40 Q210 70 180 140 Z" fill="#d8b4fe" opacity="0.6" filter="url(#glow)"/>
      <text x="160" y="315" text-anchor="middle" fill="#f3e8ff" font-family="sans-serif" font-weight="800" font-size="13.5">Thăng hoa tím ngắt · Chiết xuất từ tro rong biển Courtois 1811</text>
    `,
  },
  // SULFUR
  'luu-huynh-s': {
    badge: 'KHOÁNG VẬT NÚI LỬA NGUYÊN SINH · LƯU HUỲNH VÀNG',
    subtitle: 'Tinh thể lưu huỳnh vàng chanh & Ngọn lửa lam huyền bí',
    bgStart: '#ca8a04',
    bgEnd: '#1c1917',
    accent: '#fef08a',
    graphic: `
      <!-- Rhombic Sulfur Crystal Matrix -->
      <polygon points="160,70 230,130 160,190 90,130" fill="#facc15" stroke="#ffffff" stroke-width="2.5"/>
      <polygon points="90,130 160,190 160,250 90,190" fill="#eab308" stroke="#ffffff" stroke-width="2"/>
      <polygon points="230,130 160,190 160,250 230,190" fill="#ca8a04" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="315" text-anchor="middle" fill="#fef9c3" font-family="sans-serif" font-weight="800" font-size="13.5">Tinh thể hình thoi α-S₈ · Khói SO₂ tẩy uế sử thi Odyssey</text>
    `,
  },
  // POTASSIUM PERMANGANATE
  'thuoc-tim-kmno4': {
    badge: 'CHẤT OXI HÓA QUANG PHỔ · THUỐC TÍM (KMnO₄)',
    subtitle: 'Tinh thể kim tím ánh kim & Dung dịch cánh sen rực rỡ',
    bgStart: '#701a75',
    bgEnd: '#3b0764',
    accent: '#f472b6',
    graphic: `
      <!-- Beaker with dissolving magenta plumes -->
      <rect x="110" y="90" width="100" height="150" rx="10" fill="#0f172a" fill-opacity="0.4" stroke="#ffffff" stroke-width="2"/>
      <path d="M120 230 Q140 180 160 210 Q180 170 200 230 Z" fill="#ec4899" opacity="0.9" filter="url(#glow)"/>
      <circle cx="160" cy="225" r="8" fill="#4a044e" stroke="#ffffff" stroke-width="1.5"/>
      <text x="160" y="315" text-anchor="middle" fill="#fbcfe8" font-family="sans-serif" font-weight="800" font-size="13.5">Oxi hóa mạnh trong môi trường axit · Thuốc sát trùng kinh điển</text>
    `,
  },
  // COPPER SULFATE
  'dong-ii-sunfat-cuso4': {
    badge: 'TINH THỂ KHOÁNG VẬT LỘNG LẪY · ĐỒNG(II) SUNFAT',
    subtitle: 'Tinh thể đá thanh phàn xanh lam thẫm ngậm nước',
    bgStart: '#1d4ed8',
    bgEnd: '#0e7490',
    accent: '#60a5fa',
    graphic: `
      <!-- Deep Blue Triclinic Crystals of CuSO4.5H2O -->
      <polygon points="160,60 240,120 180,220 80,180" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <polygon points="160,60 180,220 120,230 80,180" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>
      <polygon points="160,60 240,120 220,180 180,220" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="315" text-anchor="middle" fill="#bfdbfe" font-family="sans-serif" font-weight="800" font-size="13.5">CuSO₄·5H₂O · Tinh thể tam tà xanh lam đậm</text>
    `,
  },
};

function generateSubstanceCardSvg({ slug, name, formula, prettyFormula, element, s }) {
  const specific = SPECIFIC_PHYSICAL_ASSETS[slug];
  if (specific) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${specific.bgStart}"/>
      <stop offset="100%" stop-color="${specific.bgEnd}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="450" rx="24" fill="url(#bg)"/>
  <circle cx="700" cy="70" r="160" fill="#ffffff" opacity="0.05"/>
  <circle cx="100" cy="380" r="180" fill="#ffffff" opacity="0.04"/>
  
  <!-- Left Identity Column -->
  <g transform="translate(48, 80)">
    <rect x="0" y="0" width="auto" height="24" rx="6" fill="#ffffff" fill-opacity="0.15"/>
    <text x="10" y="16" fill="${specific.accent}" font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="0.8">${escapeXml(specific.badge)}</text>
    
    <text x="0" y="70" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="44" letter-spacing="1">
      ${escapeXml(prettyFormula)}
    </text>
    
    <text x="0" y="112" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="22">
      ${escapeXml(name.length > 25 ? name.slice(0, 24) + '…' : name)}
    </text>
    
    <text x="0" y="145" fill="${specific.accent}" font-family="system-ui, sans-serif" font-weight="600" font-size="14">
      ${escapeXml(specific.subtitle)}
    </text>
    
    <g transform="translate(0, 175)">
      <rect x="0" y="0" width="160" height="32" rx="8" fill="#000000" fill-opacity="0.35" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1"/>
      <text x="14" y="21" fill="#e2e8f0" font-family="sans-serif" font-weight="700" font-size="12.5">Thực tế hóa học</text>
      
      <rect x="175" y="0" width="145" height="32" rx="8" fill="#fde047" fill-opacity="0.2" stroke="#fde047" stroke-opacity="0.4" stroke-width="1"/>
      <text x="187" y="21" fill="#fef08a" font-family="sans-serif" font-weight="700" font-size="12.5">Tư liệu bách khoa</text>
    </g>
  </g>
  
  <!-- Right Graphic Showcase Box -->
  <rect x="435" y="54" width="320" height="342" rx="22" fill="#0f172a" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
  <g transform="translate(435, 54)">
    ${specific.graphic}
  </g>
</svg>`;
  }

  // GENERAL PHYSICAL ENGINE
  const isOrganic = s?.family === 'organic';
  const isMetal = element && ['alkali-metal', 'alkaline-earth-metal', 'transition-metal', 'post-transition-metal'].includes(element.category);
  const isGas = element && ['noble-gas', 'diatomic-nonmetal'].includes(element.category) || formula === 'O2' || formula === 'N2' || formula === 'H2' || formula === 'Cl2' || formula === 'F2';
  const isAcid = /^H[A-Z]/.test(formula) || /COOH/.test(formula);

  let bgStart = '#1e293b';
  let bgEnd = '#0f766e';
  let accent = '#38bdf8';
  let badge = 'HỒ SƠ VẬT LÝ & HÓA HỌC THỰC TẾ';
  let desc = 'Hình thái tồn tại tự nhiên & Ứng dụng';
  let graphic = '';

  const hash = createHash('md5').update(slug).digest('hex');
  const seed = parseInt(hash.slice(0, 6), 16);

  if (isMetal) {
    bgStart = '#78350f';
    bgEnd = '#1e293b';
    accent = '#fde047';
    badge = 'ĐƠN CHẤT KIM LOẠI · MẠNG TINH THỂ CƯỜNG LỰC';
    desc = 'Ánh kim bề mặt · Quặng mỏ tự nhiên & Đúc thỏi';
    graphic = `
      <!-- Metal Specimen Ingot & Mineral Matrix -->
      <polygon points="90,120 210,120 240,180 60,180" fill="#cbd5e1" stroke="#ffffff" stroke-width="2.5"/>
      <polygon points="60,180 240,180 230,220 70,220" fill="#94a3b8" stroke="#ffffff" stroke-width="2"/>
      <text x="150" y="155" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="22">${escapeXml(formula)}</text>
      <!-- Mineral rock backing -->
      <path d="M190 70 Q240 50 260 100 Q270 140 230 150 Z" fill="#64748b" opacity="0.8"/>
      <text x="160" y="315" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="800" font-size="13.5">Ánh kim đặc trưng · Khối tinh thể đặc khít</text>
    `;
  } else if (isGas) {
    bgStart = '#1e1b4b';
    bgEnd = '#0369a1';
    accent = '#67e8f9';
    badge = 'THỂ KHÍ LINH ĐỘNG · BÌNH CHỨA ÁP SUẤT CAO';
    desc = 'Phổ phát xạ kích thích & Dòng khí thiên nhiên';
    graphic = `
      <!-- Gas Cylinder / Ampoule -->
      <rect x="125" y="70" width="70" height="175" rx="35" fill="#38bdf8" fill-opacity="0.3" stroke="#ffffff" stroke-width="2.5"/>
      <ellipse cx="160" cy="155" rx="25" ry="50" fill="#a5f3fc" opacity="0.75" filter="url(#glow)"/>
      <text x="160" y="160" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="18">${escapeXml(prettyFormula)}</text>
      <text x="160" y="315" text-anchor="middle" fill="#cffafe" font-family="sans-serif" font-weight="800" font-size="13.5">Khí nén áp suất · Chuyển động Brown hỗn loạn</text>
    `;
  } else if (isAcid) {
    bgStart = '#831843';
    bgEnd = '#1e1b4b';
    accent = '#f472b6';
    badge = 'DUNG DỊCH AXIT HOẠT TÍNH · PROTON LINH ĐỘNG';
    desc = 'Bình thủy tinh nắp nhám & Khói sủi bọt phản ứng';
    graphic = `
      <!-- Acid Reagent Bottle with Fumes -->
      <path d="M130 90 L190 90 L190 120 L220 160 L220 240 L100 240 L100 160 L130 120 Z" fill="#4c0519" stroke="#ffffff" stroke-width="2.5"/>
      <rect x="145" y="70" width="30" height="20" rx="4" fill="#ffffff"/>
      <ellipse cx="160" cy="200" rx="45" ry="25" fill="#f43f5e" opacity="0.8" filter="url(#glow)"/>
      <text x="160" y="205" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">AXIT pH &lt; 7</text>
      <text x="160" y="315" text-anchor="middle" fill="#fbcfe8" font-family="sans-serif" font-weight="800" font-size="13.5">Ăn mòn hóa học · Đổi màu quỳ tím sang đỏ rực</text>
    `;
  } else if (isOrganic) {
    bgStart = '#065f46';
    bgEnd = '#0f172a';
    accent = '#6ee7b7';
    badge = 'HÓA HỌC HỮU CƠ · BỘ KHUNG CACBON 3D';
    desc = 'Hương liệu tự nhiên, Polyme & Dẫn xuất đời sống';
    graphic = `
      <!-- Organic Molecular Skeleton & Flask -->
      <polygon points="160,85 220,120 220,190 160,225 100,190 100,120" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="160" cy="85" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="220" cy="120" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="220" cy="190" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="225" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="100" cy="190" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="100" cy="120" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="160" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="900" font-size="15">sp³-sp²</text>
      <text x="160" y="315" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="800" font-size="13.5">Cấu trúc không gian 3 chiều · Hợp chất gốc Carbon</text>
    `;
  } else {
    // Mineral Salt Crystal Matrix
    bgStart = '#0284c7';
    bgEnd = '#064e3b';
    accent = '#7dd3fc';
    badge = 'KHOÁNG VẬT & MUỐI TINH THỂ TỰ NHIÊN';
    desc = 'Mạng lưới ion đối xứng & Khối khoáng vật địa chất';
    graphic = `
      <!-- Natural Mineral Specimen Crystal -->
      <polygon points="160,65 245,115 195,225 85,175" fill="#0284c7" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <polygon points="160,65 195,225 135,245 85,175" fill="#0369a1" stroke="#ffffff" stroke-width="2"/>
      <polygon points="160,65 245,115 235,185 195,225" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="155" r="18" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="161" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="13">ION</text>
      <text x="160" y="315" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="13.5">Cấu trúc tinh thể tự nhiên · Năng lượng mạng lưới</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgStart}"/>
      <stop offset="100%" stop-color="${bgEnd}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="450" rx="24" fill="url(#bg)"/>
  <circle cx="700" cy="70" r="160" fill="#ffffff" opacity="0.05"/>
  <circle cx="100" cy="380" r="180" fill="#ffffff" opacity="0.04"/>
  
  <g transform="translate(48, 80)">
    <rect x="0" y="0" width="auto" height="24" rx="6" fill="#ffffff" fill-opacity="0.15"/>
    <text x="10" y="16" fill="${accent}" font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="0.8">${escapeXml(badge)}</text>
    
    <text x="0" y="70" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="44" letter-spacing="1">
      ${escapeXml(prettyFormula)}
    </text>
    
    <text x="0" y="112" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="22">
      ${escapeXml(name.length > 25 ? name.slice(0, 24) + '…' : name)}
    </text>
    
    <text x="0" y="145" fill="${accent}" font-family="system-ui, sans-serif" font-weight="600" font-size="14">
      ${escapeXml(desc)}
    </text>
    
    <g transform="translate(0, 175)">
      <rect x="0" y="0" width="160" height="32" rx="8" fill="#000000" fill-opacity="0.35" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1"/>
      <text x="14" y="21" fill="#e2e8f0" font-family="sans-serif" font-weight="700" font-size="12.5">Thực tế hóa học</text>
      
      <rect x="175" y="0" width="145" height="32" rx="8" fill="#fde047" fill-opacity="0.2" stroke="#fde047" stroke-opacity="0.4" stroke-width="1"/>
      <text x="187" y="21" fill="#fef08a" font-family="sans-serif" font-weight="700" font-size="12.5">Tư liệu bách khoa</text>
    </g>
  </g>
  
  <rect x="435" y="54" width="320" height="342" rx="22" fill="#0f172a" fill-opacity="0.45" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
  <g transform="translate(435, 54)">
    ${graphic}
  </g>
</svg>`;
}

// Load all docs to generate SVGs for every single substance
const allDocs = [
  ...JSON.parse(fs.readFileSync('trung-tam/src/data/index.json', 'utf8')),
  ...JSON.parse(fs.readFileSync('trung-tam/src/data/reference-index.generated.json', 'utf8')),
];

const elements = JSON.parse(fs.readFileSync('shared/elements.json', 'utf8'));
const byElement = new Map(elements.map((e) => [e.symbol, e]));

let generatedCount = 0;
const seenSlugs = new Set();

for (const doc of allDocs) {
  const slug = doc.slug ?? doc.id;
  if (seenSlugs.has(slug)) continue;
  seenSlugs.add(slug);

  const rawFormula = doc.chemicalFormula
    ? doc.chemicalFormula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(c)])
    : 'Hỗn hợp';
  const name = doc.title.split('(')[0].trim();
  const el = byElement.get(rawFormula) ?? null;

  const svgContent = generateSubstanceCardSvg({
    slug,
    name,
    formula: rawFormula,
    prettyFormula: doc.chemicalFormula || rawFormula,
    element: el,
    s: { formula: rawFormula, name_vi: name },
  });

  for (const dir of targetDirs) {
    fs.writeFileSync(path.join(dir, `${slug}.svg`), svgContent.trim() + '\n', 'utf8');
  }
  generatedCount++;
}

// Also create default.svg fallback
const defaultSvg = generateSubstanceCardSvg({
  slug: 'default',
  name: 'Hợp Chất Hóa Học ChemDex',
  formula: 'ChemDex',
  prettyFormula: 'ChemDex',
  element: null,
  s: null,
});
for (const dir of targetDirs) {
  fs.writeFileSync(path.join(dir, 'default.svg'), defaultSvg.trim() + '\n', 'utf8');
}

console.log(`Generated ${generatedCount} authentic physical reality SVGs across ${targetDirs.length} target directories.`);
