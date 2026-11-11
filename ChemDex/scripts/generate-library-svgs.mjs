import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'trung-tam/public/assets/library');
fs.mkdirSync(outDir, { recursive: true });

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cardSvg({
  gradientStart,
  gradientEnd,
  tagText,
  tagColor = '#fde047',
  titleLine1,
  titleLine2 = '',
  descLines = [],
  rightGraphic = '',
  caption = '',
}) {
  const descSpans = descLines
    .map(
      (line, i) =>
        `<tspan x="0" dy="${i === 0 ? 0 : 21}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradientStart}"/>
      <stop offset="100%" stop-color="${gradientEnd}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="800" height="450" rx="24" fill="url(#bg)"/>
  <circle cx="710" cy="65" r="170" fill="#ffffff" opacity="0.06"/>
  <circle cx="120" cy="390" r="190" fill="#ffffff" opacity="0.05"/>
  <g transform="translate(48, 108)">
    <text x="0" y="0" fill="${tagColor}" font-family="system-ui, sans-serif" font-weight="800" font-size="11" letter-spacing="1">${escapeXml(tagText)}</text>
    <text x="0" y="38" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="800" font-size="24">
      <tspan x="0" dy="0">${escapeXml(titleLine1)}</tspan>
      ${titleLine2 ? `<tspan x="0" dy="32">${escapeXml(titleLine2)}</tspan>` : ''}
    </text>
    <text x="0" y="${titleLine2 ? 140 : 110}" fill="#e0f2fe" font-family="system-ui, sans-serif" font-weight="500" font-size="13.5" opacity="0.95">
      ${descSpans}
    </text>
  </g>
  <rect x="435" y="54" width="320" height="342" rx="22" fill="#0f172a" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.5"/>
  <g transform="translate(435, 54)">
    ${rightGraphic}
    ${
      caption
        ? `<text x="160" y="318" text-anchor="middle" fill="#f8fafc" opacity="0.85" font-family="sans-serif" font-weight="600" font-size="11.5">${escapeXml(caption)}</text>`
        : ''
    }
  </g>
</svg>`;
}

const SVGS = {
  // ==========================================
  // 1. ELEMENT CATEGORIES
  // ==========================================
  'element-alkali.svg': cardSvg({
    gradientStart: '#ea580c',
    gradientEnd: '#b91c1c',
    tagText: 'NGUYÊN TỐ HÓA HỌC · KIM LOẠI KIỀM (NHÓM IA)',
    tagColor: '#fef08a',
    titleLine1: 'Hoạt Tính Mãnh Liệt &',
    titleLine2: 'Sắc Màu Ngọn Lửa Đặc Trưng',
    descLines: [
      'Chỉ với 1 electron hóa trị ở lớp ngoài cùng (ns¹),',
      'các kim loại kiềm giải phóng năng lượng dữ dội',
      'khi tiếp xúc với nước, tạo ngọn lửa rực rỡ.',
    ],
    rightGraphic: `
      <!-- Flame & Alkali Ion motif -->
      <path d="M160 40 Q210 130 190 190 Q240 200 230 250 Q210 290 160 290 Q110 290 90 250 Q80 200 130 190 Q110 130 160 40 Z" fill="#fbbf24" opacity="0.85" filter="url(#glow)"/>
      <path d="M160 90 Q195 150 180 200 Q210 210 200 250 Q190 280 160 280 Q130 280 120 250 Q110 210 140 200 Q125 150 160 90 Z" fill="#f97316"/>
      <path d="M160 150 Q180 190 170 230 Q185 240 180 260 Q170 275 160 275 Q150 275 140 260 Q135 240 150 230 Q140 190 160 150 Z" fill="#ffffff"/>
      <circle cx="160" cy="180" r="32" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
      <text x="160" y="186" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">M⁺ + e⁻</text>
    `,
    caption: 'Cấu hình ns¹ · Năng lượng ion hóa thấp · Mạng BCC',
  }),

  'element-alkaline-earth.svg': cardSvg({
    gradientStart: '#d97706',
    gradientEnd: '#4d7c0f',
    tagText: 'NGUYÊN TỐ HÓA HỌC · KIM LOẠI KIỀM THỔ (NHÓM IIA)',
    tagColor: '#fef08a',
    titleLine1: 'Khung Xương Trái Đất &',
    titleLine2: 'Hóa Trị II Bền Vững',
    descLines: [
      'Từ các vách đá vôi canxi hùng vĩ đến ngọn lửa trắng',
      'chói lòa của magie, nhóm IIA định hình nên cấu trúc',
      'địa chất và khung xương sinh học.',
    ],
    rightGraphic: `
      <!-- Mineral crystal cube & divalent cation -->
      <polygon points="160,70 240,115 160,160 80,115" fill="#fef08a" stroke="#ffffff" stroke-width="2"/>
      <polygon points="80,115 160,160 160,250 80,205" fill="#ca8a04" stroke="#ffffff" stroke-width="2"/>
      <polygon points="240,115 160,160 160,250 240,205" fill="#eab308" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="160" r="28" fill="#15803d" stroke="#ffffff" stroke-width="2.5"/>
      <text x="160" y="166" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="15">M²⁺</text>
      <!-- sparkles -->
      <circle cx="100" cy="80" r="3" fill="#ffffff"/>
      <circle cx="230" cy="75" r="4" fill="#ffffff"/>
      <circle cx="210" cy="240" r="3" fill="#ffffff"/>
    `,
    caption: 'Cấu hình ns² · Mạng tinh thể đá vôi & khoáng silicat',
  }),

  'element-transition.svg': cardSvg({
    gradientStart: '#1d4ed8',
    gradientEnd: '#7e22ce',
    tagText: 'NGUYÊN TỐ HÓA HỌC · KIM LOẠI CHUYỂN TIẾP (KHỐI D)',
    tagColor: '#93c5fd',
    titleLine1: 'Vũ Điệu Obitan d &',
    titleLine2: 'Thế Giới Phức Chất Sặc Sỡ',
    descLines: [
      'Sự điền electron vào phân lớp d tạo nên khả năng',
      'nhiều trạng thái oxi hóa, hoạt tính xúc tác vô song',
      'và màu sắc phong phú của các ion phức.',
    ],
    rightGraphic: `
      <!-- Octahedral complex structure -->
      <circle cx="160" cy="155" r="34" fill="#6366f1" stroke="#ffffff" stroke-width="2.5"/>
      <text x="160" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">[M-dⁿ]</text>
      <!-- Ligands -->
      <line x1="160" y1="121" x2="160" y2="70" stroke="#a5b4fc" stroke-width="3"/>
      <circle cx="160" cy="65" r="14" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="160" y1="189" x2="160" y2="240" stroke="#a5b4fc" stroke-width="3"/>
      <circle cx="160" cy="245" r="14" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="126" y1="155" x2="75" y2="155" stroke="#a5b4fc" stroke-width="3"/>
      <circle cx="70" cy="155" r="14" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="194" y1="155" x2="245" y2="155" stroke="#a5b4fc" stroke-width="3"/>
      <circle cx="250" cy="155" r="14" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5"/>
      <!-- Diagonal ligands for 3D depth -->
      <line x1="135" y1="135" x2="105" y2="105" stroke="#a5b4fc" stroke-width="2.5" stroke-dasharray="3,3"/>
      <circle cx="100" cy="100" r="12" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="185" y1="175" x2="215" y2="205" stroke="#a5b4fc" stroke-width="2.5"/>
      <circle cx="220" cy="210" r="12" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
    `,
    caption: 'Chuyển d-d · Trường phối tử bát diện · Xúc tác công nghiệp',
  }),

  'element-post-transition.svg': cardSvg({
    gradientStart: '#0f766e',
    gradientEnd: '#1e3a8a',
    tagText: 'NGUYÊN TỐ HÓA HỌC · KIM LOẠI HẬU CHUYỂN TIẾP',
    tagColor: '#5eead4',
    titleLine1: 'Tính Lưỡng Tính &',
    titleLine2: 'Hợp Kim Nhẹ Công Nghệ Cao',
    descLines: [
      'Nằm giữa kim loại d và á kim, nhóm nhôm, thiếc, chì',
      'sở hữu tính chất cơ học linh hoạt, khả năng tạo màng',
      'oxit tự bảo vệ và tính lưỡng tính đặc trưng.',
    ],
    rightGraphic: `
      <!-- Ingot and Passivation layer -->
      <polygon points="90,110 210,110 240,180 60,180" fill="#cbd5e1" stroke="#ffffff" stroke-width="2"/>
      <polygon points="60,180 240,180 230,220 70,220" fill="#94a3b8" stroke="#ffffff" stroke-width="2"/>
      <text x="150" y="155" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="20">Al / Sn / Pb</text>
      <!-- Shield badge for passivation -->
      <circle cx="230" cy="100" r="26" fill="#0ea5e9" stroke="#ffffff" stroke-width="2"/>
      <path d="M230 85 L245 92 L245 106 Q245 118 230 124 Q215 118 215 106 L215 92 Z" fill="#ffffff"/>
    `,
    caption: 'Màng thụ động oxit · Tính lưỡng tính · Điểm nóng chảy biến thiên',
  }),

  'element-metalloid.svg': cardSvg({
    gradientStart: '#334155',
    gradientEnd: '#0284c7',
    tagText: 'NGUYÊN TỐ HÓA HỌC · Á KIM (BÁN DẪN)',
    tagColor: '#38bdf8',
    titleLine1: 'Cầu Nối Bán Dẫn &',
    titleLine2: 'Trái Tim Kỷ Nguyên Kỹ Thuật Số',
    descLines: [
      'Mang bản chất lưỡng nghi giữa kim loại và phi kim,',
      'silic, gecmani và bo làm chủ khả năng dẫn điện',
      'theo nhiệt độ, khởi sinh toàn bộ ngành vi mạch.',
    ],
    rightGraphic: `
      <!-- Silicon wafer and circuit grid -->
      <circle cx="160" cy="155" r="85" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
      <path d="M90 155 L230 155 M160 85 L160 225 M110 110 L210 200 M110 200 L210 110" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="4,4"/>
      <rect x="135" y="130" width="50" height="50" rx="8" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="18">Si / Ge</text>
      <circle cx="135" cy="130" r="4" fill="#fde047"/>
      <circle cx="185" cy="130" r="4" fill="#fde047"/>
      <circle cx="135" cy="180" r="4" fill="#fde047"/>
      <circle cx="185" cy="180" r="4" fill="#fde047"/>
    `,
    caption: 'Vùng cấm năng lượng Eg · Mạng kim cương · Tinh thể đơn tinh khiết',
  }),

  'element-halogen.svg': cardSvg({
    gradientStart: '#047857',
    gradientEnd: '#581c87',
    tagText: 'NGUYÊN TỐ HÓA HỌC · NHÓM HALOGEN (NHÓM VIIA)',
    tagColor: '#a7f3d0',
    titleLine1: 'Sức Hút Electron Cực Đại &',
    titleLine2: 'Họ Muối Biển Đa Sắc',
    descLines: [
      'Với 7 electron hóa trị (ns²np⁵), halogen khao khát',
      'thu thêm 1 electron để đạt bát bền vững, tạo nên',
      'các phân tử X₂ từ khí lục nhạt đến tinh thể tím ngắt.',
    ],
    rightGraphic: `
      <!-- Halogen Diatomic molecule with electron clouds -->
      <ellipse cx="125" cy="155" rx="42" ry="48" fill="#10b981" opacity="0.8" stroke="#ffffff" stroke-width="2"/>
      <ellipse cx="195" cy="155" rx="42" ry="48" fill="#a855f7" opacity="0.8" stroke="#ffffff" stroke-width="2"/>
      <circle cx="125" cy="155" r="16" fill="#047857" stroke="#ffffff" stroke-width="2"/>
      <text x="125" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">X</text>
      <circle cx="195" cy="155" r="16" fill="#6b21a8" stroke="#ffffff" stroke-width="2"/>
      <text x="195" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">X</text>
      <!-- Overlapping shared electron pair -->
      <circle cx="155" cy="145" r="4" fill="#fef08a"/>
      <circle cx="165" cy="165" r="4" fill="#fef08a"/>
      <text x="160" y="240" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="800" font-size="16">F₂ · Cl₂ · Br₂ · I₂</text>
    `,
    caption: 'Độ âm điện cao nhất · Tính oxi hóa mạnh · Liên kết đơn X-X',
  }),

  'element-noble-gas.svg': cardSvg({
    gradientStart: '#312e81',
    gradientEnd: '#4c1d95',
    tagText: 'NGUYÊN TỐ HÓA HỌC · KHÍ HIẾM (NHÓM VIIIA)',
    tagColor: '#c4b5fd',
    titleLine1: 'Bát Tử Hoàn Hảo &',
    titleLine2: 'Ánh Sáng Plasma Rực Rỡ',
    descLines: [
      'Cấu hình 8 electron bão hòa (ns²np⁶) mang lại sự trơ',
      'tuyệt đối về hóa học, nhưng khi bị kích thích điện tích,',
      'chúng thắp sáng thế giới bằng các dải quang phổ tuyệt mỹ.',
    ],
    rightGraphic: `
      <!-- Discharge glow tube -->
      <rect x="75" y="130" width="170" height="50" rx="25" fill="#818cf8" opacity="0.9" filter="url(#glow)" stroke="#ffffff" stroke-width="2"/>
      <circle cx="100" cy="155" r="16" fill="#c084fc"/>
      <circle cx="160" cy="155" r="16" fill="#ec4899"/>
      <circle cx="220" cy="155" r="16" fill="#38bdf8"/>
      <text x="160" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">He · Ne · Ar · Kr · Xe</text>
      <!-- Concentric stable orbital shells -->
      <circle cx="160" cy="155" r="75" fill="none" stroke="#e0e7ff" stroke-width="1.5" stroke-dasharray="5,5"/>
    `,
    caption: 'Lớp vỏ bão hòa ns²np⁶ · Đơn nguyên tử · Phổ phát xạ kích thích',
  }),

  'element-lanthanide.svg': cardSvg({
    gradientStart: '#701a75',
    gradientEnd: '#1e1b4b',
    tagText: 'NGUYÊN TỐ HÓA HỌC · HỌ LANTAN (ĐẤT HIẾM 4f)',
    tagColor: '#f0abfc',
    titleLine1: 'Bí Ẩn Phân Lớp 4f &',
    titleLine2: 'Công Nghệ Từ Tính Siêu Cường',
    descLines: [
      'Các electron lặn sâu trong phân lớp 4f tạo ra hiệu ứng',
      'co lantanit đặc biệt, từ tính cực mạnh của nam châm',
      'Neodymi và bột huỳnh quang quang học độ phân giải cao.',
    ],
    rightGraphic: `
      <!-- Magnetic field lines and rare-earth crystal -->
      <path d="M70 155 C70 80, 250 80, 250 155 C250 230, 70 230, 70 155 Z" fill="none" stroke="#e879f9" stroke-width="2" stroke-dasharray="4,4"/>
      <path d="M90 155 C90 105, 230 105, 230 155 C230 205, 90 205, 90 155 Z" fill="none" stroke="#c084fc" stroke-width="2"/>
      <rect x="120" y="130" width="80" height="50" rx="8" fill="#4a044e" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">Nd / Eu / La</text>
    `,
    caption: 'Co lantanit · Phát quang huỳnh quang sắc nét · Nam châm siêu mạnh',
  }),

  'element-actinide.svg': cardSvg({
    gradientStart: '#831843',
    gradientEnd: '#0f172a',
    tagText: 'NGUYÊN TỐ HÓA HỌC · HỌ ACTINI (HẠT NHÂN 5f)',
    tagColor: '#f472b6',
    titleLine1: 'Năng Lượng Phân Hạch Hạt Nhân &',
    titleLine2: 'Giới Hạn Nặng Của Vật Chất',
    descLines: [
      'Gồm urani, thori và các nguyên tố siêu urani tổng hợp,',
      'họ Actini chứa đựng nguồn năng lượng hạt nhân khổng lồ',
      'và chuỗi phân rã phóng xạ tự nhiên của vỏ Trái Đất.',
    ],
    rightGraphic: `
      <!-- Trefoil radiation symbol inside atomic nucleus -->
      <circle cx="160" cy="155" r="70" fill="none" stroke="#f472b6" stroke-width="2" stroke-dasharray="6,4"/>
      <circle cx="160" cy="155" r="18" fill="#fde047" stroke="#000000" stroke-width="2"/>
      <!-- Trefoil blades -->
      <path d="M160 130 L140 85 A50 50 0 0 1 180 85 Z" fill="#fde047"/>
      <path d="M142 165 L100 190 A50 50 0 0 1 80 155 Z" fill="#fde047"/>
      <path d="M178 165 L220 190 A50 50 0 0 0 240 155 Z" fill="#fde047"/>
      <text x="160" y="250" text-anchor="middle" fill="#fbcfe8" font-family="sans-serif" font-weight="900" font-size="16">U · Pu · Th · Ac</text>
    `,
    caption: 'Phân rã alpha/beta · Phân hạch neutron · Năng lượng liên kết hạt nhân',
  }),

  // ==========================================
  // 2. ORGANIC FUNCTIONAL FAMILIES
  // ==========================================
  'organic-alkane.svg': cardSvg({
    gradientStart: '#047857',
    gradientEnd: '#1e293b',
    tagText: 'HÓA HỌC HỮU CƠ · HIĐROCACBON NO (ANKAN)',
    tagColor: '#6ee7b7',
    titleLine1: 'Khung Xương Sp³ Gập Ghềnh &',
    titleLine2: 'Nhiên Liệu Hóa Thạch Cơ Bản',
    descLines: [
      'Liên kết đơn C-C và C-H bền vững với góc tứ diện',
      '109,5° tạo nên mạch cacbon zíc zắc trơ về mặt hóa học,',
      'lưu giữ mật độ năng lượng cháy khổng lồ.',
    ],
    rightGraphic: `
      <!-- Zigzag alkane chain -->
      <polyline points="70,185 115,125 160,185 205,125 250,185" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="70" cy="185" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="115" cy="125" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="185" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="205" cy="125" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="250" cy="185" r="14" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="245" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="800" font-size="18">CₙH₂ₙ₊₂ · sp³ Tetrahedral</text>
    `,
    caption: 'Góc liên kết 109,5° · Phản ứng thế halogen (SR) · Cháy tỏa nhiệt lớn',
  }),

  'organic-alkene.svg': cardSvg({
    gradientStart: '#0284c7',
    gradientEnd: '#065f46',
    tagText: 'HÓA HỌC HỮU CƠ · HIĐROCACBON KHÔNG NO (ANKEN)',
    tagColor: '#38bdf8',
    titleLine1: 'Liên Kết Đôi C=C Phẳng &',
    titleLine2: 'Phản Ứng Cộng Điện Tử Hóa',
    descLines: [
      'Sự kết hợp giữa 1 liên kết σ bền và 1 liên kết π lỏng lẻo',
      'trên mặt phẳng tam giác sp² biến anken thành trung tâm',
      'của phản ứng cộng và trùng hợp cao phân tử.',
    ],
    rightGraphic: `
      <!-- Double bond C=C with pi clouds -->
      <line x1="105" y1="145" x2="215" y2="145" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
      <line x1="105" y1="165" x2="215" y2="165" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
      <circle cx="105" cy="155" r="22" fill="#0284c7" stroke="#ffffff" stroke-width="2.5"/>
      <text x="105" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <circle cx="215" cy="155" r="22" fill="#0284c7" stroke="#ffffff" stroke-width="2.5"/>
      <text x="215" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <!-- Pi bond overlap lobes -->
      <ellipse cx="160" cy="115" rx="35" ry="18" fill="#38bdf8" opacity="0.6"/>
      <ellipse cx="160" cy="195" rx="35" ry="18" fill="#38bdf8" opacity="0.6"/>
      <text x="160" y="248" text-anchor="middle" fill="#7dd3fc" font-family="sans-serif" font-weight="800" font-size="16">CₙH₂ₙ · C=C Phẳng 120°</text>
    `,
    caption: 'Lai hóa sp² · Cộng Br₂ làm mất màu · Quy tắc Markovnikov',
  }),

  'organic-alkyne.svg': cardSvg({
    gradientStart: '#7c3aed',
    gradientEnd: '#1e1b4b',
    tagText: 'HÓA HỌC HỮU CƠ · HIĐROCACBON NỐI BA (ANKIN)',
    tagColor: '#ddd6fe',
    titleLine1: 'Liên Kết Ba C≡C Thẳng Hàng &',
    titleLine2: 'Ngọn Lửa Hàn 3000°C',
    descLines: [
      'Lai hóa sp tuyến tính (góc 180°) với 2 liên kết π vuông góc',
      'bao quanh trục σ, tạo ra liên kết ngắn, mật độ electron',
      'cực cao và ngọn lửa axetylen nhiệt độ kỷ lục.',
    ],
    rightGraphic: `
      <!-- Triple bond straight line -->
      <line x1="85" y1="145" x2="235" y2="145" stroke="#ffffff" stroke-width="4"/>
      <line x1="85" y1="155" x2="235" y2="155" stroke="#c084fc" stroke-width="5"/>
      <line x1="85" y1="165" x2="235" y2="165" stroke="#ffffff" stroke-width="4"/>
      <circle cx="85" cy="155" r="22" fill="#6d28d9" stroke="#ffffff" stroke-width="2.5"/>
      <text x="85" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <circle cx="235" cy="155" r="22" fill="#6d28d9" stroke="#ffffff" stroke-width="2.5"/>
      <text x="235" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <!-- Linear geometry arrows -->
      <text x="160" y="115" text-anchor="middle" fill="#fde047" font-family="sans-serif" font-weight="900" font-size="18">180° Thẳng Hàng</text>
      <text x="160" y="248" text-anchor="middle" fill="#e9d5ff" font-family="sans-serif" font-weight="800" font-size="16">CₙH₂ₙ₋₂ · H-C≡C-H</text>
    `,
    caption: 'Lai hóa sp · 1σ + 2π hình trụ · Thế ion kim loại (AgNO₃/NH₃)',
  }),

  'organic-aromatic.svg': cardSvg({
    gradientStart: '#0369a1',
    gradientEnd: '#4338ca',
    tagText: 'HÓA HỌC HỮU CƠ · HỢP CHẤT THƠM (AREN)',
    tagColor: '#bae6fd',
    titleLine1: 'Vòng Benzen Kekulé &',
    titleLine2: 'Hệ Electron π Giải Tỏa',
    descLines: [
      'Quy tắc thơm Hückel (4n+2) biến vòng benzen 6 cạnh',
      'thành một pháo đài bền vững, ưu tiên phản ứng thế',
      'hơn phản ứng cộng, cội nguồn ngành hóa dầu & phẩm nhuộm.',
    ],
    rightGraphic: `
      <!-- Benzene regular hexagon with aromatic circle -->
      <polygon points="160,85 225,120 225,190 160,225 95,190 95,120" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="160" cy="155" r="42" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8,5"/>
      <circle cx="160" cy="155" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="12">6π</text>
      <text x="160" y="258" text-anchor="middle" fill="#e0f2fe" font-family="sans-serif" font-weight="800" font-size="16">Hệ thơm 6e π liên hợp</text>
    `,
    caption: 'Quy tắc Hückel 4n+2 · Bền nhiệt động · Phản ứng thế ái điện tử SEAr',
  }),

  'organic-alcohol.svg': cardSvg({
    gradientStart: '#0d9488',
    gradientEnd: '#0369a1',
    tagText: 'HÓA HỌC HỮU CƠ · ANCOL & PHENOL (NHÓM -OH)',
    tagColor: '#99f6e4',
    titleLine1: 'Mạng Liên Kết Hiđro &',
    titleLine2: 'Nhóm Hiđroxyl Linh Động',
    descLines: [
      'Nhóm -OH phân cực mạnh hình thành mạng lưới',
      'liên kết hiđro liên phân tử kỳ diệu, nâng vọt nhiệt độ',
      'sôi và tạo khả năng hòa tan vô tận trong nước.',
    ],
    rightGraphic: `
      <!-- Molecule with -O-H and Hydrogen bonding dots -->
      <line x1="80" y1="155" x2="135" y2="155" stroke="#ffffff" stroke-width="6"/>
      <circle cx="75" cy="155" r="18" fill="#14b8a6" stroke="#ffffff" stroke-width="2"/>
      <text x="75" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">R</text>
      <circle cx="145" cy="155" r="22" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
      <text x="145" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">O</text>
      <line x1="160" y1="140" x2="195" y2="115" stroke="#ffffff" stroke-width="5"/>
      <circle cx="205" cy="110" r="14" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
      <text x="205" y="115" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="12">H</text>
      <!-- Hydrogen bond dashed line to another oxygen -->
      <line x1="218" y1="110" x2="260" y2="110" stroke="#fef08a" stroke-width="3" stroke-dasharray="4,4"/>
      <circle cx="270" cy="110" r="12" fill="#ef4444" opacity="0.6"/>
      <text x="160" y="245" text-anchor="middle" fill="#ccfbf1" font-family="sans-serif" font-weight="800" font-size="16">R—O—H · Liên kết H···O</text>
    `,
    caption: 'Liên kết hiđro liên phân tử · Tác dụng Na giải phóng H₂ · Oxi hóa thành aldehyde',
  }),

  'organic-aldehyde.svg': cardSvg({
    gradientStart: '#b45309',
    gradientEnd: '#854d0e',
    tagText: 'HÓA HỌC HỮU CƠ · ANĐEHIT (NHÓM -CH=O)',
    tagColor: '#fde047',
    titleLine1: 'Phản Ứng Tráng Bạc &',
    titleLine2: 'Liên Kết Cacbonyl Đầu Mạch',
    descLines: [
      'Nhóm chức -CH=O giàu tính khử dễ dàng khử ion Ag⁺',
      'thành lớp kim loại bạc lấp lánh như gương, mở ra',
      'kỹ thuật nhận biết kinh điển trong hóa hữu cơ.',
    ],
    rightGraphic: `
      <!-- Silver mirror flask with shiny Ag layer -->
      <path d="M140 70 L180 70 L180 100 L220 180 Q230 200 220 220 Q210 240 160 240 Q110 240 100 220 Q90 200 100 180 L140 100 Z" fill="#78350f" stroke="#ffffff" stroke-width="2"/>
      <!-- Silver mirror coating inside bottom -->
      <path d="M100 200 Q110 240 160 240 Q210 240 220 200 C200 215 120 215 100 200 Z" fill="#e2e8f0" stroke="#ffffff" stroke-width="2" filter="url(#glow)"/>
      <text x="160" y="225" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="16">Ag↓ Tráng Bạc</text>
      <text x="160" y="150" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="800" font-size="16">R—CH=O</text>
    `,
    caption: 'Phản ứng tráng gương Tollens · Thuốc thử Fehling đỏ gạch · Tính khử mạnh',
  }),

  'organic-ketone.svg': cardSvg({
    gradientStart: '#c026d3',
    gradientEnd: '#4c1d95',
    tagText: 'HÓA HỌC HỮU CƠ · XETON (NHÓM C=O NỘI MẠCH)',
    tagColor: '#f5d0fe',
    titleLine1: 'Liên Kết Cacbonyl Phân Cực &',
    titleLine2: 'Dung Môi Công Nghiệp Đa Năng',
    descLines: [
      'Nằm kẹp giữa hai gốc hiđrocacbon, nhóm C=O của xeton',
      'mang moment lưỡng cực lớn nhưng không bị oxi hóa',
      'bởi thuốc thử thông thường, tạo độ ổn định tuyệt vời.',
    ],
    rightGraphic: `
      <!-- Carbonyl center R-C(=O)-R' -->
      <circle cx="160" cy="155" r="24" fill="#9333ea" stroke="#ffffff" stroke-width="2.5"/>
      <text x="160" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <!-- Oxygen on top -->
      <line x1="154" y1="131" x2="154" y2="85" stroke="#ef4444" stroke-width="4"/>
      <line x1="166" y1="131" x2="166" y2="85" stroke="#ef4444" stroke-width="4"/>
      <circle cx="160" cy="78" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="84" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">O</text>
      <!-- Radicals left & right -->
      <line x1="136" y1="165" x2="85" y2="195" stroke="#ffffff" stroke-width="5"/>
      <circle cx="75" cy="200" r="16" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
      <text x="75" y="205" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="14">R</text>
      <line x1="184" y1="165" x2="235" y2="195" stroke="#ffffff" stroke-width="5"/>
      <circle cx="245" cy="200" r="16" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
      <text x="245" y="205" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="14">R'</text>
      <text x="160" y="252" text-anchor="middle" fill="#f0abfc" font-family="sans-serif" font-weight="800" font-size="15">R—CO—R' (Axeton)</text>
    `,
    caption: 'Lưỡng cực C⁺=O⁻ · Bền với tác nhân oxi hóa yếu · Phản ứng iodoform',
  }),

  'organic-carboxylic-acid.svg': cardSvg({
    gradientStart: '#b91c1c',
    gradientEnd: '#4c0519',
    tagText: 'HÓA HỌC HỮU CƠ · AXIT CACBOXYLIC (NHÓM -COOH)',
    tagColor: '#fca5a5',
    titleLine1: 'Hiệu Ứng Cộng Hưởng Axit &',
    titleLine2: 'Proton H⁺ Linh Động Nhất',
    descLines: [
      'Nhóm cacbonyl C=O hút mạnh electron làm liên kết O-H',
      'phân cực sâu sắc; ion cacboxylat R-COO⁻ sau phân li',
      'được bền hóa giải tỏa đối xứng trên 2 nguyên tử oxi.',
    ],
    rightGraphic: `
      <!-- -COOH resonance hybrid -->
      <circle cx="140" cy="155" r="24" fill="#991b1b" stroke="#ffffff" stroke-width="2.5"/>
      <text x="140" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <line x1="156" y1="140" x2="200" y2="105" stroke="#ffffff" stroke-width="5"/>
      <circle cx="210" cy="98" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <text x="210" y="104" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">O</text>
      <line x1="156" y1="170" x2="200" y2="205" stroke="#ffffff" stroke-width="5"/>
      <circle cx="210" cy="212" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <text x="210" y="218" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">O</text>
      <!-- Detached proton H+ -->
      <circle cx="265" cy="212" r="12" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
      <text x="265" y="216" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="12">H⁺</text>
      <text x="160" y="258" text-anchor="middle" fill="#fecaca" font-family="sans-serif" font-weight="800" font-size="15">R—COOH ⇌ R—COO⁻ + H⁺</text>
    `,
    caption: 'Quỳ tím hóa đỏ · Phản ứng este hóa xúc tác H₂SO₄ · Đime hóa liên kết H',
  }),

  'organic-ester.svg': cardSvg({
    gradientStart: '#db2777',
    gradientEnd: '#ea580c',
    tagText: 'HÓA HỌC HỮU CƠ · ESTE & DẪN XUẤT HƯƠNG LIỆU',
    tagColor: '#fbcfe8',
    titleLine1: 'Cầu Nối Este C(=O)O &',
    titleLine2: 'Hương Thơm Trái Cây Tự Nhiên',
    descLines: [
      'Sản phẩm ngưng tụ giữa axit cacboxylic và ancol tạo nên',
      'những hợp chất thơm ngọt ngào của chuối chín, táo tây',
      'và tinh hoa của ngành hương liệu - mỹ phẩm.',
    ],
    rightGraphic: `
      <!-- Ester functional group with fruit aroma spiral -->
      <circle cx="130" cy="155" r="22" fill="#be185d" stroke="#ffffff" stroke-width="2.5"/>
      <text x="130" y="161" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <!-- Carbonyl Oxygen -->
      <line x1="130" y1="133" x2="130" y2="90" stroke="#f43f5e" stroke-width="5"/>
      <circle cx="130" cy="85" r="16" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
      <text x="130" y="90" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">=O</text>
      <!-- Bridging Oxygen -->
      <line x1="152" y1="155" x2="195" y2="155" stroke="#ffffff" stroke-width="5"/>
      <circle cx="205" cy="155" r="18" fill="#fb923c" stroke="#ffffff" stroke-width="2"/>
      <text x="205" y="160" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">-O-</text>
      <line x1="223" y1="155" x2="260" y2="155" stroke="#ffffff" stroke-width="5"/>
      <circle cx="265" cy="155" r="14" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
      <text x="265" y="159" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="11">R'</text>
      <text x="160" y="248" text-anchor="middle" fill="#fdf2f8" font-family="sans-serif" font-weight="800" font-size="16">R—COO—R' (Este Hóa)</text>
    `,
    caption: 'Thủy phân thuận nghịch trong axit · Xà phòng hóa trong kiềm · Mùi thơm hoa quả',
  }),

  'organic-amine.svg': cardSvg({
    gradientStart: '#4338ca',
    gradientEnd: '#0e7490',
    tagText: 'HÓA HỌC HỮU CƠ · AMIN & DẪN XUẤT CHỨA NITƠ',
    tagColor: '#a5b4fc',
    titleLine1: 'Đôi Điện Tử Tự Do Trên Nitơ &',
    titleLine2: 'Tính Bazơ Hữu Cơ Cơ Bản',
    descLines: [
      'Cặp electron tự do chưa liên kết của nguyên tử nitơ',
      'dễ dàng nhận proton H⁺ hoặc tạo phức phối trí với kim',
      'loại, làm nền tảng cho axit amin và protein sự sống.',
    ],
    rightGraphic: `
      <!-- Nitrogen with lone pair and three bonds (Pyramidal) -->
      <circle cx="160" cy="140" r="26" fill="#3730a3" stroke="#ffffff" stroke-width="2.5"/>
      <text x="160" y="146" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="18">N</text>
      <!-- Lone pair electron cloud on top -->
      <ellipse cx="160" cy="95" rx="16" ry="12" fill="#fde047" opacity="0.9" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="154" cy="95" r="3" fill="#1e1b4b"/>
      <circle cx="166" cy="95" r="3" fill="#1e1b4b"/>
      <!-- 3 bonds -->
      <line x1="140" y1="158" x2="100" y2="195" stroke="#ffffff" stroke-width="5"/>
      <circle cx="95" cy="200" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <text x="95" y="204" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="11">R</text>
      <line x1="160" y1="166" x2="160" y2="215" stroke="#ffffff" stroke-width="5"/>
      <circle cx="160" cy="220" r="14" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="224" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="11">H</text>
      <line x1="180" y1="158" x2="220" y2="195" stroke="#ffffff" stroke-width="5"/>
      <circle cx="225" cy="200" r="14" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
      <text x="225" y="204" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="11">H</text>
      <text x="160" y="260" text-anchor="middle" fill="#e0e7ff" font-family="sans-serif" font-weight="800" font-size="15">R—NH₂ · Tính Bazơ</text>
    `,
    caption: 'Nhận proton H⁺ · Quỳ tím hóa xanh · Phản ứng tạo muối amoni & peptit',
  }),

  'organic-polymer.svg': cardSvg({
    gradientStart: '#0f766e',
    gradientEnd: '#1e3a8a',
    tagText: 'HÓA HỌC HỮU CƠ · CHẤT CAO PHÂN TỬ (POLYMER)',
    tagColor: '#5eead4',
    titleLine1: 'Mắt Xích Lặp Vô Tận &',
    titleLine2: 'Kỷ Nguyên Vật Liệu Tổng Hợp',
    descLines: [
      'Hàng nghìn mắt xích monome liên kết cộng hóa trị chặt',
      'chẽ tạo nên chuỗi đại phân tử dẻo dai, bền nhiệt và',
      'định hình nên toàn bộ ngành nhựa, cao su và tơ sợi.',
    ],
    rightGraphic: `
      <!-- Intertwined macromolecular chains -->
      <path d="M60 140 Q110 90 160 140 T260 140" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>
      <path d="M60 170 Q110 220 160 170 T260 170" fill="none" stroke="#f472b6" stroke-width="6" stroke-linecap="round"/>
      <!-- Repeating brackets [ -M- ]n -->
      <text x="160" y="162" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="22">[— CH₂—CH₂ —]ₙ</text>
      <rect x="80" y="110" width="160" height="90" rx="8" fill="none" stroke="#fde047" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="160" y="250" text-anchor="middle" fill="#a5f3fc" font-family="sans-serif" font-weight="800" font-size="15">Trùng Hợp &amp; Trùng Ngưng</text>
    `,
    caption: 'Độ polime hóa n · Cấu trúc mạch không phân nhánh / mạng lưới không gian',
  }),

  'organic-carbohydrate.svg': cardSvg({
    gradientStart: '#15803d',
    gradientEnd: '#a16207',
    tagText: 'HÓA HỌC HỮU CƠ · CACBOHIĐRAT (GLUXIT)',
    tagColor: '#bbf7d0',
    titleLine1: 'Quang Hợp Năng Lượng Mặt Trời &',
    titleLine2: 'Vòng Đường Đa Chức Sinh Học',
    descLines: [
      'Từ monome glucozơ đến tinh bột và xenlulozơ cấu tạo',
      'vách tế bào thực vật, cacbohiđrat là kho dự trữ năng lượng',
      'và khung đỡ sinh học bền bỉ nhất của hành tinh.',
    ],
    rightGraphic: `
      <!-- Pyranose ring with -OH groups -->
      <polygon points="160,105 215,130 215,185 160,210 105,185 105,130" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"/>
      <circle cx="215" cy="130" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
      <text x="215" y="135" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="12">O</text>
      <circle cx="160" cy="105" r="10" fill="#22c55e"/>
      <circle cx="105" cy="130" r="10" fill="#22c55e"/>
      <circle cx="105" cy="185" r="10" fill="#22c55e"/>
      <circle cx="160" cy="210" r="10" fill="#22c55e"/>
      <text x="160" y="160" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="900" font-size="16">C₆H₁₂O₆</text>
      <text x="160" y="250" text-anchor="middle" fill="#dcfce7" font-family="sans-serif" font-weight="800" font-size="15">Glucozơ · Tinh Bột · Xenlulozơ</text>
    `,
    caption: 'Vòng glucopiranoxơ · Cầu nối glicozit · Nguồn năng lượng ATP sinh học',
  }),

  // ==========================================
  // 3. HISTORICAL LABORATORY SETUPS
  // ==========================================
  'apparatus-alembic.svg': cardSvg({
    gradientStart: '#7c2d12',
    gradientEnd: '#1c1917',
    tagText: 'DI SẢN THỰC NGHIỆM · BÌNH CHƯNG CỔ CONG (ALEMBIC)',
    tagColor: '#fed7aa',
    titleLine1: 'Nghệ Thuật Chưng Cất Giả Kim &',
    titleLine2: 'Sự Ra Đời Của Hóa Chất Tinh Khiết',
    descLines: [
      'Được hoàn thiện bởi Jabir ibn Hayyan thế kỷ VIII,',
      'bình chưng cổ cong alembic và retort thủy tinh cho phép',
      'tách biệt cồn, axit nitric và vitriol từ khoáng thô.',
    ],
    rightGraphic: `
      <!-- Alembic with retort body and long curved beak -->
      <path d="M120 220 C100 180, 100 130, 140 100 C180 80, 200 100, 210 130 C220 170, 260 210, 270 240 L250 245 C235 220, 205 180, 195 140 C170 120, 140 140, 130 180 C125 200, 130 220, 120 220 Z" fill="#ea580c" stroke="#ffffff" stroke-width="2"/>
      <!-- Flask base -->
      <ellipse cx="140" cy="215" rx="35" ry="18" fill="#c2410c" stroke="#ffffff" stroke-width="2"/>
      <!-- Boiling liquid inside flask -->
      <ellipse cx="140" cy="218" rx="25" ry="10" fill="#fde047" opacity="0.8"/>
      <!-- Receiver flask at beak end -->
      <ellipse cx="270" cy="260" rx="18" ry="15" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
      <text x="160" y="270" text-anchor="middle" fill="#ffedd5" font-family="sans-serif" font-weight="800" font-size="15">Chưng cất phân đoạn cổ điển</text>
    `,
    caption: 'Bình cổ cong Retort · Chưng cất tinh dầu & axit khoáng · Lò luyện giả kim',
  }),

  'apparatus-eudiometer.svg': cardSvg({
    gradientStart: '#1e3a8a',
    gradientEnd: '#0f172a',
    tagText: 'DI SẢN THỰC NGHIỆM · KHÍ KẾ TỬ PHÂN NỔ ĐIỆN (EUDIOMETER)',
    tagColor: '#93c5fd',
    titleLine1: 'Tia Lửa Điện Phóng Khí &',
    titleLine2: 'Giải Mã Bản Chất Của Nước',
    descLines: [
      'Ống eudiometer của Alessandro Volta và Henry Cavendish',
      'dùng tia lửa điện đốt nổ hỗn hợp 2 phần H₂ và 1 phần O₂,',
      'chứng minh nước là hợp chất chứ không phải nguyên tố sơ khai.',
    ],
    rightGraphic: `
      <!-- Graduated eudiometer tube in trough with spark electrodes -->
      <rect x="135" y="65" width="50" height="175" rx="8" fill="#1e293b" stroke="#ffffff" stroke-width="2.5"/>
      <!-- Graduation ticks -->
      <line x1="140" y1="90" x2="152" y2="90" stroke="#93c5fd" stroke-width="2"/>
      <line x1="140" y1="115" x2="152" y2="115" stroke="#93c5fd" stroke-width="2"/>
      <line x1="140" y1="140" x2="152" y2="140" stroke="#93c5fd" stroke-width="2"/>
      <line x1="140" y1="165" x2="152" y2="165" stroke="#93c5fd" stroke-width="2"/>
      <!-- Electrodes with electric spark in middle -->
      <line x1="100" y1="100" x2="148" y2="100" stroke="#fde047" stroke-width="3"/>
      <line x1="220" y1="100" x2="172" y2="100" stroke="#fde047" stroke-width="3"/>
      <path d="M150 96 L157 104 L164 96 L170 102" stroke="#ffffff" stroke-width="3" fill="none" filter="url(#glow)"/>
      <!-- Mercury trough below -->
      <rect x="90" y="235" width="140" height="35" rx="6" fill="#64748b" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="258" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">2H₂ + O₂ ➔ 2H₂O</text>
    `,
    caption: 'Đo tỷ lệ thể tích khí chính xác · Đốt cháy bằng tia lửa điện · Cavendish 1784',
  }),

  'apparatus-voltaic-pile.svg': cardSvg({
    gradientStart: '#854d0e',
    gradientEnd: '#1e3a8a',
    tagText: 'DI SẢN THỰC NGHIỆM · CỘT PIN VOLTA & ĐIỆN PHÂN DAVY',
    tagColor: '#fef08a',
    titleLine1: 'Dòng Điện Hóa Học Đầu Tiên &',
    titleLine2: 'Cuộc Khai Sinh Kim Loại Kiềm',
    descLines: [
      'Năm 1800, Alessandro Volta xếp chồng đĩa kẽm, bạc',
      'và vải tẩm nước muối; Humphry Davy dùng dòng điện này',
      'bẻ gãy potash và soda, cô lập Na, K, Ca, Mg, Ba, Sr.',
    ],
    rightGraphic: `
      <!-- Alternating metal discs in a vertical stack -->
      <g transform="translate(160, 60)">
        <ellipse cx="0" cy="30" rx="45" ry="12" fill="#cbd5e1" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="45" rx="45" ry="12" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="60" rx="45" ry="12" fill="#cbd5e1" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="75" rx="45" ry="12" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="90" rx="45" ry="12" fill="#cbd5e1" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="105" rx="45" ry="12" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="120" rx="45" ry="12" fill="#cbd5e1" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="0" cy="135" rx="45" ry="12" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
        <!-- Anode & Cathode wires -->
        <path d="M-45 30 L-75 30 L-75 160 L-30 160" fill="none" stroke="#ef4444" stroke-width="3"/>
        <path d="M45 135 L75 135 L75 160 L30 160" fill="none" stroke="#3b82f6" stroke-width="3"/>
        <circle cx="0" cy="160" r="16" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="165" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="14">⚡</text>
      </g>
      <text x="160" y="260" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-weight="800" font-size="15">Cột Pin Volta (1800) &amp; Điện Phân Davy</text>
    `,
    caption: 'Thế điện cực oxy hóa khử Zn/Cu · Điện phân muối nóng chảy · Davy 1807',
  }),

  'apparatus-spectroscope.svg': cardSvg({
    gradientStart: '#312e81',
    gradientEnd: '#065f46',
    tagText: 'DI SẢN THỰC NGHIỆM · QUANG PHỔ KẾ LĂNG KÍNH (SPECTROSCOPE)',
    tagColor: '#6ee7b7',
    titleLine1: 'Lăng Kính Phân Tích Ánh Sáng &',
    titleLine2: 'Dấu Vân Tay Của Nguyên Tử',
    descLines: [
      'Robert Bunsen và Gustav Kirchhoff (1859) kết hợp ngọn',
      'lửa sạch với lăng kính quang sai, biến vạch phổ phát xạ',
      'thành phương tiện định danh nguyên tố từ Trái Đất đến Mặt Trời.',
    ],
    rightGraphic: `
      <!-- Prism splitting white light beam into rainbow spectrum -->
      <polygon points="160,80 220,180 100,180" fill="#1e1b4b" stroke="#38bdf8" stroke-width="2.5"/>
      <!-- Incoming flame beam -->
      <line x1="60" y1="150" x2="135" y2="140" stroke="#fef08a" stroke-width="4"/>
      <!-- Dispersed colored beams leaving prism -->
      <line x1="180" y1="140" x2="260" y2="100" stroke="#ef4444" stroke-width="3"/>
      <line x1="180" y1="145" x2="260" y2="125" stroke="#f59e0b" stroke-width="3"/>
      <line x1="180" y1="150" x2="260" y2="150" stroke="#10b981" stroke-width="3"/>
      <line x1="180" y1="155" x2="260" y2="175" stroke="#06b6d4" stroke-width="3"/>
      <line x1="180" y1="160" x2="260" y2="200" stroke="#8b5cf6" stroke-width="3"/>
      <text x="160" y="245" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="15">Vạch Phổ Phát Xạ Nguyên Tử</text>
    `,
    caption: 'Tán sắc lăng kính flint · Vạch Fraunhofer · Phát hiện Cs, Rb, He vũ trụ',
  }),

  'apparatus-calorimeter.svg': cardSvg({
    gradientStart: '#0f172a',
    gradientEnd: '#0369a1',
    tagText: 'DI SẢN THỰC NGHIỆM · NHIỆT LƯỢNG KẾ NƯỚC ĐÁ (CALORIMETER)',
    tagColor: '#bae6fd',
    titleLine1: 'Cân Đo Lượng Nhiệt Phản Ứng &',
    titleLine2: 'Bình Minh Của Nhiệt Động Học',
    descLines: [
      'Antoine Lavoisier và Pierre-Simon Laplace (1780) chế tạo',
      'nhiệt lượng kế vỏ băng kép: khối lượng nước đá tan chảy',
      'đo lường chính xác enthalpy phản ứng và hô hấp tế bào.',
    ],
    rightGraphic: `
      <!-- Double-walled ice calorimeter bucket -->
      <rect x="100" y="80" width="120" height="140" rx="12" fill="#0f172a" stroke="#ffffff" stroke-width="2.5"/>
      <rect x="120" y="100" width="80" height="100" rx="8" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
      <!-- Inner reaction chamber -->
      <circle cx="160" cy="150" r="22" fill="#f97316" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="155" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">ΔH°</text>
      <!-- Ice cubes motif in jacket -->
      <rect x="105" y="110" width="10" height="10" fill="#e0f2fe"/>
      <rect x="105" y="150" width="10" height="10" fill="#e0f2fe"/>
      <rect x="205" y="110" width="10" height="10" fill="#e0f2fe"/>
      <rect x="205" y="150" width="10" height="10" fill="#e0f2fe"/>
      <!-- Water drainage tube -->
      <line x1="160" y1="220" x2="160" y2="250" stroke="#38bdf8" stroke-width="4"/>
      <text x="160" y="265" text-anchor="middle" fill="#e0f2fe" font-family="sans-serif" font-weight="800" font-size="14">Nước đá tan chảy: Q = m · Lf</text>
    `,
    caption: 'Định luật Hess · Enthalpy tạo thành ΔfH° · Lavoisier & Laplace 1780',
  }),

  'apparatus-autoclave-retort.svg': cardSvg({
    gradientStart: '#1c1917',
    gradientEnd: '#431407',
    tagText: 'DI SẢN THỰC NGHIỆM · LÒ NỒI HẤP ÁP SUẤT CAO (AUTOCLAVE)',
    tagColor: '#fed7aa',
    titleLine1: 'Nhiệt Áp Siêu Tới Hạn &',
    titleLine2: 'Khuất Phục Khí Nitơ Khí Quyển',
    descLines: [
      'Từ bình nung chịu áp của Papin đến tháp tổng hợp thép',
      'đặc chủng của Haber và Bosch (200 atm, 500°C), công nghệ',
      'cao áp giải phóng hàng triệu tấn amoniac nuôi sống nhân loại.',
    ],
    rightGraphic: `
      <!-- Heavy steel autoclave pressure vessel with pressure gauge -->
      <rect x="110" y="90" width="100" height="135" rx="20" fill="#3f3f46" stroke="#ffffff" stroke-width="3"/>
      <!-- Bolts on flange -->
      <circle cx="125" cy="100" r="4" fill="#ffffff"/>
      <circle cx="160" cy="100" r="4" fill="#ffffff"/>
      <circle cx="195" cy="100" r="4" fill="#ffffff"/>
      <!-- Pressure Dial Gauge on top -->
      <circle cx="160" cy="65" r="22" fill="#ffffff" stroke="#71717a" stroke-width="3"/>
      <line x1="160" y1="65" x2="172" y2="55" stroke="#ef4444" stroke-width="3"/>
      <text x="160" y="70" text-anchor="middle" fill="#000000" font-family="sans-serif" font-weight="900" font-size="10">200 bar</text>
      <!-- Glowing core inside -->
      <ellipse cx="160" cy="160" rx="30" ry="40" fill="#ea580c" opacity="0.85" filter="url(#glow)"/>
      <text x="160" y="165" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="14">Fe xúc tác</text>
      <text x="160" y="255" text-anchor="middle" fill="#fdba74" font-family="sans-serif" font-weight="800" font-size="15">N₂ + 3H₂ ⇌ 2NH₃ (Haber-Bosch)</text>
    `,
    caption: 'Áp suất 200 bar · Nhiệt độ 450°C · Cân bằng Le Chatelier công nghiệp',
  }),

  // ==========================================
  // 4. SPATIAL CRYSTAL LATTICES & ORBITALS
  // ==========================================
  'crystal-fcc.svg': cardSvg({
    gradientStart: '#1e3a8a',
    gradientEnd: '#0284c7',
    tagText: 'CẤU TRÚC KHÔNG GIAN · TINH THỂ LẬP PHƯƠNG TÂM DIỆN (FCC)',
    tagColor: '#7dd3fc',
    titleLine1: 'Mạng Lập Phương Tâm Diện &',
    titleLine2: 'Độ Đặc Khít Tối Đa 74%',
    descLines: [
      'Với các nguyên tử tại 8 đỉnh và tâm của 6 mặt lập phương,',
      'mạng FCC (A1) là cấu trúc của đồng, bạc, vàng, nhôm với',
      'số phối trí 12 và độ dẻo cơ học vượt trội.',
    ],
    rightGraphic: `
      <!-- Isometric FCC unit cell -->
      <g transform="translate(160, 150)">
        <!-- Cube back edges -->
        <line x1="-50" y1="-50" x2="-50" y2="30" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="-50" y1="-50" x2="30" y2="-50" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,3"/>
        <line x1="-50" y1="30" x2="30" y2="30" stroke="#38bdf8" stroke-width="2"/>
        <!-- Cube front square -->
        <rect x="-30" y="-30" width="80" height="80" fill="none" stroke="#ffffff" stroke-width="2"/>
        <!-- Connectors -->
        <line x1="-50" y1="-50" x2="-30" y2="-30" stroke="#ffffff" stroke-width="2"/>
        <line x1="30" y1="-50" x2="50" y2="-30" stroke="#ffffff" stroke-width="2"/>
        <line x1="30" y1="30" x2="50" y2="50" stroke="#ffffff" stroke-width="2"/>
        <!-- Face centered spheres -->
        <circle cx="10" cy="10" r="14" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
        <circle cx="10" cy="-40" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="-40" cy="-10" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="40" cy="-10" r="12" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
        <circle cx="10" cy="40" r="12" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
        <!-- Corner atoms -->
        <circle cx="-30" cy="-30" r="12" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
        <circle cx="50" cy="-30" r="12" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
        <circle cx="-30" cy="50" r="12" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
        <circle cx="50" cy="50" r="12" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      </g>
      <text x="160" y="255" text-anchor="middle" fill="#bae6fd" font-family="sans-serif" font-weight="800" font-size="15">Cu · Ag · Au · Al (Số phối trí CN = 12)</text>
    `,
    caption: 'Hệ tinh thể lập phương · Độ chiếm chỗ k = 0,74 · Mặt phẳng trượt {111}',
  }),

  'crystal-bcc.svg': cardSvg({
    gradientStart: '#0f172a',
    gradientEnd: '#4f46e5',
    tagText: 'CẤU TRÚC KHÔNG GIAN · TINH THỂ LẬP PHƯƠNG TÂM KHỐI (BCC)',
    tagColor: '#a5b4fc',
    titleLine1: 'Nguyên Tử Trung Tâm Khối &',
    titleLine2: 'Độ Cứng Vững Của Sắt Thép',
    descLines: [
      '8 đỉnh lập phương bao quanh 1 nguyên tử nằm ngay tại',
      'tâm hình học khối, tạo nên cấu trúc BCC (A2) của sắt alpha,',
      'crom, vonfam với độ bền kéo và độ cứng ưu việt.',
    ],
    rightGraphic: `
      <!-- Isometric BCC unit cell -->
      <g transform="translate(160, 150)">
        <rect x="-40" y="-40" width="80" height="80" fill="none" stroke="#ffffff" stroke-width="2"/>
        <rect x="-20" y="-20" width="80" height="80" fill="none" stroke="#818cf8" stroke-width="2"/>
        <line x1="-40" y1="-40" x2="-20" y2="-20" stroke="#ffffff" stroke-width="2"/>
        <line x1="40" y1="-40" x2="60" y2="-20" stroke="#ffffff" stroke-width="2"/>
        <line x1="-40" y1="40" x2="-20" y2="60" stroke="#ffffff" stroke-width="2"/>
        <line x1="40" y1="40" x2="60" y2="60" stroke="#ffffff" stroke-width="2"/>
        <!-- Central body atom -->
        <circle cx="10" cy="10" r="18" fill="#ef4444" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
        <!-- Diagonal bonds connecting center to corners -->
        <line x1="10" y1="10" x2="-40" y2="-40" stroke="#fca5a5" stroke-width="2" stroke-dasharray="3,3"/>
        <line x1="10" y1="10" x2="60" y2="60" stroke="#fca5a5" stroke-width="2"/>
        <!-- Corner atoms -->
        <circle cx="-40" cy="-40" r="11" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="40" cy="-40" r="11" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="-40" cy="40" r="11" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="40" cy="40" r="11" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="60" cy="60" r="11" fill="#4f46e5" stroke="#ffffff" stroke-width="1.5"/>
      </g>
      <text x="160" y="255" text-anchor="middle" fill="#c7d2fe" font-family="sans-serif" font-weight="800" font-size="15">α-Fe · Cr · W · Na (Số phối trí CN = 8)</text>
    `,
    caption: 'Độ đặc khít k = 0,68 · Hướng tiếp xúc đường chéo chính [111]',
  }),

  'crystal-hcp.svg': cardSvg({
    gradientStart: '#065f46',
    gradientEnd: '#0f766e',
    tagText: 'CẤU TRÚC KHÔNG GIAN · LỤC PHƯƠNG XẾP CHẶT (HCP)',
    tagColor: '#a7f3d0',
    titleLine1: 'Lăng Trụ Lục Lăng Đối Xứng &',
    titleLine2: 'Trật Tự Lớp Xếp ABABAB',
    descLines: [
      'Các mặt lục giác xếp chồng so le ABABAB với tỷ lệ',
      'c/a lý tưởng 1,633 đem lại độ đặc khít 74% trong các',
      'kim loại nhẹ như magie, titan và kẽm.',
    ],
    rightGraphic: `
      <!-- HCP Prism representation -->
      <polygon points="160,75 210,95 210,130 160,150 110,130 110,95" fill="none" stroke="#ffffff" stroke-width="2"/>
      <polygon points="160,165 210,185 210,220 160,240 110,220 110,185" fill="none" stroke="#ffffff" stroke-width="2"/>
      <line x1="110" y1="95" x2="110" y2="185" stroke="#34d399" stroke-width="1.5"/>
      <line x1="210" y1="95" x2="210" y2="185" stroke="#34d399" stroke-width="1.5"/>
      <line x1="160" y1="150" x2="160" y2="240" stroke="#34d399" stroke-width="1.5"/>
      <!-- Mid-plane 3 atoms B -->
      <circle cx="145" cy="145" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="175" cy="145" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="160" cy="165" r="10" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>
      <!-- Top/bottom center atoms A -->
      <circle cx="160" cy="112" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="202" r="12" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <text x="160" y="260" text-anchor="middle" fill="#d1fae5" font-family="sans-serif" font-weight="800" font-size="15">Mg · Ti · Zn (Lớp xếp so le ABABAB)</text>
    `,
    caption: 'Độ chiếm chỗ k = 0,74 · Tỷ lệ chiều cao c/a = 1,633 · Số phối trí 12',
  }),

  'crystal-diamond.svg': cardSvg({
    gradientStart: '#0f172a',
    gradientEnd: '#0284c7',
    tagText: 'CẤU TRÚC KHÔNG GIAN · MẠNG TINH THỂ KIM CƯƠNG',
    tagColor: '#38bdf8',
    titleLine1: 'Tứ Diện Cộng Hóa Trị Sp³ &',
    titleLine2: 'Độ Cứng Vô Song Của Cacbon',
    descLines: [
      'Mỗi nguyên tử cacbon liên kết cộng hóa trị với 4 nguyên',
      'tử láng giềng ở đỉnh tứ diện đều; mạng 3D liên tục',
      'tạo nên độ cứng 10 thang Mohs và độ tán sắc quang học rực rỡ.',
    ],
    rightGraphic: `
      <!-- Tetrahedral diamond coordination -->
      <circle cx="160" cy="155" r="22" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
      <text x="160" y="161" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="16">C</text>
      <!-- 4 tetrahedral ligands -->
      <line x1="160" y1="133" x2="160" y2="75" stroke="#ffffff" stroke-width="5"/>
      <circle cx="160" cy="70" r="16" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <line x1="142" y1="168" x2="95" y2="210" stroke="#ffffff" stroke-width="5"/>
      <circle cx="90" cy="215" r="16" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <line x1="178" y1="168" x2="225" y2="210" stroke="#ffffff" stroke-width="5"/>
      <circle cx="230" cy="215" r="16" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
      <line x1="172" y1="145" x2="215" y2="125" stroke="#ffffff" stroke-width="4" stroke-dasharray="3,3"/>
      <circle cx="220" cy="120" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="1.5"/>
      <text x="160" y="258" text-anchor="middle" fill="#e0f2fe" font-family="sans-serif" font-weight="800" font-size="15">Kim Cương &amp; Silic Đơn Tinh Thể</text>
    `,
    caption: 'Khoảng cách liên kết C-C = 1,54 Å · Góc 109,5° · Tinh thể nguyên tử cộng hóa trị',
  }),

  'crystal-perovskite.svg': cardSvg({
    gradientStart: '#7e22ce',
    gradientEnd: '#0f172a',
    tagText: 'CẤU TRÚC KHÔNG GIAN · TINH THỂ PEROVSKITE (ABX₃)',
    tagColor: '#e9d5ff',
    titleLine1: 'Khung Bát Diện BX₆ &',
    titleLine2: 'Cuộc Cách Mạng Pin Mặt Trời',
    descLines: [
      'Công thức ABX₃ với khung lồng bát diện chung đỉnh',
      'ôm trọn cation kích thước lớn A ở tâm, mở ra thế hệ',
      'vật liệu siêu dẫn nhiệt độ cao và pin mặt trời hiệu suất kỷ lục.',
    ],
    rightGraphic: `
      <!-- Perovskite unit cell: central A cation inside BX6 octahedron -->
      <g transform="translate(160, 145)">
        <rect x="-45" y="-45" width="90" height="90" fill="none" stroke="#a855f7" stroke-width="2"/>
        <!-- Central A cation (e.g. Ca2+, CH3NH3+) -->
        <circle cx="0" cy="0" r="22" fill="#fde047" stroke="#ffffff" stroke-width="2.5" filter="url(#glow)"/>
        <text x="0" y="5" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="900" font-size="14">A</text>
        <!-- B cations at corners -->
        <circle cx="-45" cy="-45" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="45" cy="-45" r="10" fill="#38bdf8" stroke-width="1.5" stroke="#ffffff"/>
        <circle cx="-45" cy="45" r="10" fill="#38bdf8" stroke-width="1.5" stroke="#ffffff"/>
        <circle cx="45" cy="45" r="10" fill="#38bdf8" stroke-width="1.5" stroke="#ffffff"/>
        <!-- X anions at edge centers -->
        <circle cx="0" cy="-45" r="8" fill="#ef4444"/>
        <circle cx="0" cy="45" r="8" fill="#ef4444"/>
        <circle cx="-45" cy="0" r="8" fill="#ef4444"/>
        <circle cx="45" cy="0" r="8" fill="#ef4444"/>
      </g>
      <text x="160" y="255" text-anchor="middle" fill="#f3e8ff" font-family="sans-serif" font-weight="800" font-size="15">CaTiO₃ · MAPbI₃ (Pin Mặt Trời 30%+)</text>
    `,
    caption: 'Hệ số dung sai Goldschmidt t · Cấu trúc phối trí bát diện BX₆ chung đỉnh',
  }),

  'orbital-hybridization.svg': cardSvg({
    gradientStart: '#1d4ed8',
    gradientEnd: '#0f766e',
    tagText: 'HÓA HỌC LƯỢNG TỬ · THUYẾT LAI HÓA OBITAN (PAULING 1931)',
    tagColor: '#6ee7b7',
    titleLine1: 'Tổ Hợp Hàm Sóng s & p',
    titleLine2: 'Định Hướng Không Gian Phân Tử',
    descLines: [
      'Sự pha trộn giữa 1 obitan hình cầu s và các obitan số 8 nổi p',
      'tạo ra các obitan lai hóa sp, sp², sp³ bất đối xứng với',
      'độ xen phủ electron cực đại hướng về các đỉnh hình học.',
    ],
    rightGraphic: `
      <!-- sp3 Hybridized lobes oriented tetrahedrally -->
      <g transform="translate(160, 150)">
        <ellipse cx="0" cy="-45" rx="18" ry="35" fill="#38bdf8" opacity="0.85" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="-40" cy="30" rx="35" ry="18" fill="#34d399" opacity="0.85" stroke="#ffffff" stroke-width="1.5"/>
        <ellipse cx="40" cy="30" rx="35" ry="18" fill="#f472b6" opacity="0.85" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="14" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="10">C</text>
      </g>
      <text x="160" y="255" text-anchor="middle" fill="#a7f3d0" font-family="sans-serif" font-weight="800" font-size="15">Lai hóa sp (180°) · sp² (120°) · sp³ (109,5°)</text>
    `,
    caption: 'Độ xen phủ cực đại · Thuyết hóa trị VB · Linus Pauling Nobel 1954',
  }),

  'orbital-pi-conjugation.svg': cardSvg({
    gradientStart: '#4c1d95',
    gradientEnd: '#be185d',
    tagText: 'HÓA HỌC LƯỢNG TỬ · HỆ ELECTRON π LIÊN HỢP GIẢI TỎA',
    tagColor: '#fbcfe8',
    titleLine1: 'Đám Mây π Song Song &',
    titleLine2: 'Sự Thu Hẹp Khoảng Trống HOMO-LUMO',
    descLines: [
      'Khi các obitan p thuần khiết xếp song song kề cận,',
      'các electron π không thuộc về riêng hai nguyên tử mà',
      'chuyển động tự do trên toàn bộ khung phân tử.',
    ],
    rightGraphic: `
      <!-- Conjugated p orbitals with upper and lower cloud bands -->
      <g transform="translate(75, 145)">
        <rect x="15" y="-55" width="140" height="25" rx="10" fill="#a855f7" opacity="0.75" filter="url(#glow)"/>
        <line x1="25" y1="-30" x2="25" y2="30" stroke="#ffffff" stroke-width="4"/>
        <circle cx="25" cy="0" r="10" fill="#3b82f6"/>
        <line x1="65" y1="-30" x2="65" y2="30" stroke="#ffffff" stroke-width="4"/>
        <circle cx="65" cy="0" r="10" fill="#3b82f6"/>
        <line x1="105" y1="-30" x2="105" y2="30" stroke="#ffffff" stroke-width="4"/>
        <circle cx="105" cy="0" r="10" fill="#3b82f6"/>
        <line x1="145" y1="-30" x2="145" y2="30" stroke="#ffffff" stroke-width="4"/>
        <circle cx="145" cy="0" r="10" fill="#3b82f6"/>
        <rect x="15" y="30" width="140" height="25" rx="10" fill="#ec4899" opacity="0.75" filter="url(#glow)"/>
      </g>
      <text x="160" y="255" text-anchor="middle" fill="#fdf2f8" font-family="sans-serif" font-weight="800" font-size="15">Buta-1,3-dien · Polyme dẫn điện (Heeger)</text>
    `,
    caption: 'Obitan phân tử MO · Cộng hưởng hóa học · Màu sắc chất hữu cơ',
  }),
};

let writtenCount = 0;
for (const [filename, svgContent] of Object.entries(SVGS)) {
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, svgContent.trim() + '\n', 'utf8');
  writtenCount++;
}

console.log(`Generated ${writtenCount} rich thematic SVGs in trung-tam/public/assets/library/`);
