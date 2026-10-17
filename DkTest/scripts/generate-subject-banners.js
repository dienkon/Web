import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { decode } from 'fast-png';

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'subjects');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Subject Banner Configuration

const subjects = [
  {
    key: 'math',
    aliases: ['toan', 'toan-hoc'],
    title: 'TOÁN HỌC',
    category: 'MÔN HỌC BẮT BUỘC',
    subtitle: 'Đại số • Giải tích • Hình học không gian • Tọa độ Oxyz',
    colorGrad1: '#1e1b4b',
    colorGrad2: '#2563eb',
    colorAccent: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '📐 Công thức KaTeX chuẩn', '📊 Phổ điểm tức thì'],
    iconSvg: `
      <!-- Math Atom/Grid Background -->
      <g stroke="#38bdf8" stroke-width="3" fill="none" opacity="0.85">
        <!-- Coordinate Axes -->
        <line x1="60" y1="200" x2="340" y2="200" stroke-dasharray="6,6" opacity="0.5"/>
        <line x1="200" y1="60" x2="200" y2="340" stroke-dasharray="6,6" opacity="0.5"/>
        <!-- Parabola / Sine Curve -->
        <path d="M 80,300 Q 200,60 320,300" stroke="#60a5fa" stroke-width="5" fill="none"/>
        <!-- Square Root Symbol -->
        <path d="M 90,170 L 110,170 L 130,220 L 155,100 L 260,100" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <!-- Symbols: Pi & Sigma & Integral -->
      <text x="190" y="150" fill="#ffffff" font-size="44" font-weight="bold" font-family="system-ui, sans-serif">x²</text>
      <text x="140" y="270" fill="#93c5fd" font-size="52" font-family="serif" font-style="italic">∑</text>
      <text x="240" y="270" fill="#38bdf8" font-size="52" font-family="serif" font-style="italic">∫</text>
      <text x="255" y="180" fill="#a5b4fc" font-size="46" font-family="serif">π</text>
    `,
  },
  {
    key: 'english',
    aliases: ['tieng-anh', 'anh'],
    title: 'TIẾNG ANH',
    category: 'MÔN NGOẠI NGỮ',
    subtitle: 'Ngữ pháp • Từ vựng chuyên sâu • Đọc hiểu • Luyện đề THPT',
    colorGrad1: '#0c2340',
    colorGrad2: '#0284c7',
    colorAccent: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🎧 Audio & Reading chuẩn', '📊 Giải thích chi tiết'],
    iconSvg: `
      <!-- Speech bubbles & Global nodes -->
      <g stroke="#38bdf8" stroke-width="3" fill="none">
        <circle cx="200" cy="200" r="110" stroke="#0284c7" stroke-width="4" opacity="0.6"/>
        <ellipse cx="200" cy="200" rx="110" ry="45" stroke="#38bdf8" stroke-width="2" opacity="0.5"/>
        <line x1="90" y1="200" x2="310" y2="200" stroke="#38bdf8" stroke-width="2" opacity="0.4"/>
      </g>
      <!-- Speech Bubble -->
      <rect x="110" y="115" width="180" height="110" rx="24" fill="#0f172a" stroke="#38bdf8" stroke-width="5"/>
      <polygon points="150,225 180,225 155,255" fill="#0f172a" stroke="#38bdf8" stroke-width="4"/>
      <text x="200" y="185" fill="#38bdf8" font-size="48" font-weight="900" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="2">EN</text>
      <!-- ABC badge -->
      <rect x="140" y="260" width="120" height="36" rx="18" fill="#0284c7" />
      <text x="200" y="285" fill="#ffffff" font-size="20" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">A • B • C</text>
    `,
  },
  {
    key: 'physics',
    aliases: ['vat-ly', 'ly'],
    title: 'VẬT LÝ',
    category: 'KHOA HỌC TỰ NHIÊN',
    subtitle: 'Cơ học • Dao động điều hòa • Sóng cơ & Sóng ánh sáng • Hạt nhân',
    colorGrad1: '#1e1b4b',
    colorGrad2: '#6366f1',
    colorAccent: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '⚡ Đồ thị dao động chuẩn', '📊 Lời giải chi tiết'],
    iconSvg: `
      <!-- Atom Orbits -->
      <g fill="none" stroke-width="4" stroke-linecap="round">
        <ellipse cx="200" cy="200" rx="130" ry="48" stroke="#818cf8" transform="rotate(0 200 200)"/>
        <ellipse cx="200" cy="200" rx="130" ry="48" stroke="#c084fc" transform="rotate(60 200 200)"/>
        <ellipse cx="200" cy="200" rx="130" ry="48" stroke="#38bdf8" transform="rotate(120 200 200)"/>
      </g>
      <!-- Electrons -->
      <circle cx="330" cy="200" r="9" fill="#38bdf8"/>
      <circle cx="135" cy="90" r="9" fill="#c084fc"/>
      <circle cx="135" cy="310" r="9" fill="#818cf8"/>
      <!-- Nucleus -->
      <circle cx="200" cy="200" r="28" fill="#4f46e5" stroke="#ffffff" stroke-width="4"/>
      <!-- Lightning bolt inside nucleus -->
      <path d="M 202,182 L 192,200 L 202,200 L 198,218 L 210,198 L 200,198 Z" fill="#fbbf24"/>
    `,
  },
  {
    key: 'chemistry',
    aliases: ['hoa-hoc', 'hoa'],
    title: 'HÓA HỌC',
    category: 'KHOA HỌC TỰ NHIÊN',
    subtitle: 'Hóa hữu cơ • Hóa vô cơ • Phản ứng oxi hóa khử • Cân bằng ion',
    colorGrad1: '#064e3b',
    colorGrad2: '#059669',
    colorAccent: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🧪 Bảng tuần hoàn & PTHH', '📊 Phân tích dạng bài'],
    iconSvg: `
      <!-- Benzene Ring Background -->
      <polygon points="200,70 270,110 270,190 200,230 130,190 130,110" fill="none" stroke="#059669" stroke-width="4" stroke-dasharray="8,6" opacity="0.6"/>
      <!-- Erlenmeyer Flask -->
      <path d="M 185,110 L 215,110 L 215,150 L 275,260 A 18 18 0 0 1 260,285 L 140,285 A 18 18 0 0 1 125,260 L 185,150 Z" fill="#0f172a" stroke="#34d399" stroke-width="5" stroke-linejoin="round"/>
      <!-- Liquid in flask -->
      <path d="M 155,225 Q 180,215 200,225 T 245,225 L 258,265 A 10 10 0 0 1 250,277 L 150,277 A 10 10 0 0 1 142,265 Z" fill="#10b981" opacity="0.8"/>
      <!-- Bubbles -->
      <circle cx="180" cy="245" r="7" fill="#ffffff" opacity="0.7"/>
      <circle cx="215" cy="235" r="5" fill="#ffffff" opacity="0.7"/>
      <circle cx="195" cy="190" r="8" fill="#34d399" opacity="0.8"/>
      <circle cx="205" cy="165" r="5" fill="#6ee7b7" opacity="0.9"/>
    `,
  },
  {
    key: 'biology',
    aliases: ['sinh-hoc', 'sinh'],
    title: 'SINH HỌC',
    category: 'KHOA HỌC TỰ NHIÊN',
    subtitle: 'Di truyền học • Sinh học phân tử • Sinh thái học • Tiến hóa',
    colorGrad1: '#14532d',
    colorGrad2: '#16a34a',
    colorAccent: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🧬 Sơ đồ di truyền chuẩn', '📊 Hướng dẫn giải chi tiết'],
    iconSvg: `
      <!-- DNA Strands & Leaf -->
      <g stroke="#4ade80" stroke-width="5" fill="none" stroke-linecap="round">
        <!-- DNA Wave 1 -->
        <path d="M 120,80 Q 200,140 280,80 T 120,200 Q 200,260 280,200 T 120,320" stroke="#22c55e" stroke-width="6"/>
        <!-- DNA Wave 2 -->
        <path d="M 280,80 Q 200,140 120,80 T 280,200 Q 200,260 120,200 T 280,320" stroke="#86efac" stroke-width="6"/>
        <!-- Rungs -->
        <line x1="165" y1="110" x2="235" y2="110" stroke="#ffffff" stroke-width="4"/>
        <line x1="145" y1="170" x2="255" y2="170" stroke="#ffffff" stroke-width="4"/>
        <line x1="145" y1="230" x2="255" y2="230" stroke="#ffffff" stroke-width="4"/>
        <line x1="165" y1="290" x2="235" y2="290" stroke="#ffffff" stroke-width="4"/>
      </g>
      <!-- Central Leaf Motif -->
      <circle cx="200" cy="200" r="32" fill="#15803d" stroke="#4ade80" stroke-width="4"/>
      <path d="M 190,215 Q 190,185 210,185 Q 210,215 190,215 Z" fill="#ffffff"/>
    `,
  },
  {
    key: 'literature',
    aliases: ['ngu-van', 'van'],
    title: 'NGỮ VĂN',
    category: 'KHOA HỌC XÃ HỘI',
    subtitle: 'Đọc hiểu văn bản • Nghị luận xã hội • Nghị luận văn học',
    colorGrad1: '#4c0519',
    colorGrad2: '#be123c',
    colorAccent: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '📖 Trích dẫn tác phẩm chuẩn', '📊 Dàn ý & Gợi ý làm bài'],
    iconSvg: `
      <!-- Open Book -->
      <g stroke="#fb7185" stroke-width="5" fill="none" stroke-linejoin="round">
        <path d="M 200,160 Q 140,140 90,150 L 90,270 Q 140,260 200,280 Q 260,260 310,270 L 310,150 Q 260,140 200,160 Z" fill="#1e1b4b"/>
        <line x1="200" y1="160" x2="200" y2="280" stroke="#ffffff" stroke-width="5"/>
        <!-- Book lines -->
        <line x1="115" y1="180" x2="175" y2="175" stroke="#fb7185" stroke-width="3"/>
        <line x1="115" y1="205" x2="175" y2="200" stroke="#fb7185" stroke-width="3"/>
        <line x1="115" y1="230" x2="165" y2="225" stroke="#fb7185" stroke-width="3"/>
        <line x1="225" y1="175" x2="285" y2="180" stroke="#fb7185" stroke-width="3"/>
        <line x1="225" y1="200" x2="285" y2="205" stroke="#fb7185" stroke-width="3"/>
        <line x1="235" y1="225" x2="285" y2="230" stroke="#fb7185" stroke-width="3"/>
      </g>
      <!-- Quill Pen -->
      <path d="M 250,70 Q 240,110 215,150 L 225,160 Q 260,115 275,75 Z" fill="#f43f5e"/>
      <polygon points="215,150 210,165 225,160" fill="#ffffff"/>
    `,
  },
  {
    key: 'history',
    aliases: ['lich-su', 'su'],
    title: 'LỊCH SỬ',
    category: 'KHOA HỌC XÃ HỘI',
    subtitle: 'Lịch sử Việt Nam • Lịch sử Thế giới • Mốc sự kiện & Ý nghĩa',
    colorGrad1: '#451a03',
    colorGrad2: '#b45309',
    colorAccent: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🏛️ Mốc sự kiện chuẩn xác', '📊 Tổng hợp kiến thức'],
    iconSvg: `
      <!-- Classical Greek / Historical Temple -->
      <g fill="#fbbf24" stroke="#ffffff" stroke-width="2">
        <!-- Roof Pediment -->
        <polygon points="200,90 90,145 310,145" fill="#d97706" stroke="#fbbf24" stroke-width="4"/>
        <rect x="100" y="145" width="200" height="15" fill="#f59e0b"/>
        <!-- 4 Columns -->
        <rect x="115" y="165" width="20" height="95" rx="3" fill="#fbbf24"/>
        <rect x="165" y="165" width="20" height="95" rx="3" fill="#fbbf24"/>
        <rect x="215" y="165" width="20" height="95" rx="3" fill="#fbbf24"/>
        <rect x="265" y="165" width="20" height="95" rx="3" fill="#fbbf24"/>
        <!-- Base Steps -->
        <rect x="100" y="260" width="200" height="14" fill="#f59e0b"/>
        <rect x="85" y="274" width="230" height="16" fill="#d97706"/>
      </g>
      <!-- Timeline Hourglass Accent -->
      <circle cx="200" cy="120" r="10" fill="#ffffff"/>
    `,
  },
  {
    key: 'geography',
    aliases: ['dia-ly', 'dia'],
    title: 'ĐỊA LÝ',
    category: 'KHOA HỌC XÃ HỘI',
    subtitle: 'Địa lý tự nhiên • Dân cư • Kinh tế các vùng • Kỹ năng Atlat',
    colorGrad1: '#042f2e',
    colorGrad2: '#0f766e',
    colorAccent: '#2dd4bf',
    glowColor: 'rgba(45, 212, 191, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🗺️ Kỹ năng Atlat & Biểu đồ', '📊 Nhận xét phân tích'],
    iconSvg: `
      <!-- Globe with Latitude & Longitude -->
      <g stroke="#2dd4bf" stroke-width="4" fill="none">
        <circle cx="200" cy="200" r="105" fill="#0f172a" stroke="#2dd4bf" stroke-width="5"/>
        <ellipse cx="200" cy="200" rx="45" ry="105" stroke="#14b8a6"/>
        <line x1="95" y1="200" x2="305" y2="200" stroke="#14b8a6"/>
        <path d="M 115,150 Q 200,175 285,150" stroke="#0d9488" stroke-dasharray="6,4"/>
        <path d="M 115,250 Q 200,225 285,250" stroke="#0d9488" stroke-dasharray="6,4"/>
      </g>
      <!-- Compass Rose Needle -->
      <polygon points="200,120 215,200 200,185 185,200" fill="#f43f5e"/>
      <polygon points="200,280 215,200 200,215 185,200" fill="#e2e8f0"/>
      <circle cx="200" cy="200" r="8" fill="#ffffff"/>
    `,
  },
  {
    key: 'informatics',
    aliases: ['tin-hoc', 'tin', 'lap-trinh'],
    title: 'TIN HỌC',
    category: 'CÔNG NGHỆ & LẬP TRÌNH',
    subtitle: 'Lập trình Python, C++ • Thuật toán • Cơ sở dữ liệu • Tin học văn phòng',
    colorGrad1: '#030712',
    colorGrad2: '#0891b2',
    colorAccent: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '💻 Trình chấm code tự động', '📊 Test cases chuẩn xác'],
    iconSvg: `
      <!-- Code Terminal Window -->
      <rect x="90" y="100" width="220" height="170" rx="16" fill="#0f172a" stroke="#22d3ee" stroke-width="5"/>
      <rect x="90" y="100" width="220" height="38" rx="16" fill="#1e293b"/>
      <!-- Window Controls -->
      <circle cx="115" cy="119" r="6" fill="#ef4444"/>
      <circle cx="135" cy="119" r="6" fill="#eab308"/>
      <circle cx="155" cy="119" r="6" fill="#22c55e"/>
      <!-- Code Prompt & Brackets -->
      <text x="115" y="175" fill="#22d3ee" font-size="28" font-family="monospace" font-weight="bold">&gt;_</text>
      <text x="155" y="175" fill="#a5f3fc" font-size="24" font-family="monospace">code()</text>
      <text x="120" y="220" fill="#38bdf8" font-size="22" font-family="monospace">{ return 1; }</text>
      <!-- Binary Accent -->
      <text x="100" y="300" fill="#0891b2" font-size="18" font-family="monospace" letter-spacing="4">01001100 01101111</text>
    `,
  },
  {
    key: 'civics',
    aliases: ['gdcd', 'kinh-te-phap-luat'],
    title: 'KINH TẾ & PHÁP LUẬT',
    category: 'KHOA HỌC XÃ HỘI',
    subtitle: 'Giáo dục công dân • Pháp luật & Đời sống • Kinh tế vĩ mô',
    colorGrad1: '#3b0764',
    colorGrad2: '#9333ea',
    colorAccent: '#e879f9',
    glowColor: 'rgba(232, 121, 249, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '⚖️ Tình huống thực tiễn', '📊 Giải thích điều luật'],
    iconSvg: `
      <!-- Scales of Justice -->
      <g stroke="#e879f9" stroke-width="5" fill="none" stroke-linecap="round">
        <!-- Stand Pillar -->
        <line x1="200" y1="90" x2="200" y2="280" stroke="#ffffff" stroke-width="6"/>
        <rect x="150" y="275" width="100" height="15" rx="6" fill="#c026d3"/>
        <!-- Balance Beam -->
        <line x1="110" y1="130" x2="290" y2="130" stroke="#f0abfc" stroke-width="6"/>
        <!-- Left Pan Strings & Pan -->
        <line x1="110" y1="130" x2="90" y2="200" stroke-width="3"/>
        <line x1="110" y1="130" x2="130" y2="200" stroke-width="3"/>
        <path d="M 80,200 Q 110,230 140,200 Z" fill="#9333ea" stroke="#e879f9" stroke-width="4"/>
        <!-- Right Pan Strings & Pan -->
        <line x1="290" y1="130" x2="270" y2="200" stroke-width="3"/>
        <line x1="290" y1="130" x2="310" y2="200" stroke-width="3"/>
        <path d="M 260,200 Q 290,230 320,200 Z" fill="#9333ea" stroke="#e879f9" stroke-width="4"/>
      </g>
      <circle cx="200" cy="95" r="10" fill="#fdf4ff"/>
    `,
  },
  {
    key: 'technology',
    aliases: ['cong-nghe'],
    title: 'CÔNG NGHỆ',
    category: 'KỸ THUẬT & ỨNG DỤNG',
    subtitle: 'Công nghệ cơ khí • Kỹ thuật điện - điện tử • Nông nghiệp công nghệ cao',
    colorGrad1: '#1c1917',
    colorGrad2: '#ea580c',
    colorAccent: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '⚙️ Bản vẽ kỹ thuật chuẩn', '📊 Ứng dụng thực tiễn'],
    iconSvg: `
      <!-- Interlocking Gears -->
      <g fill="#ea580c" stroke="#fed7aa" stroke-width="3">
        <!-- Big Gear -->
        <circle cx="170" cy="180" r="50" fill="#c2410c"/>
        <circle cx="170" cy="180" r="22" fill="#0f172a" stroke="#fed7aa" stroke-width="4"/>
        <!-- Big Gear Teeth -->
        <rect x="160" y="115" width="20" height="20" rx="4"/>
        <rect x="160" y="225" width="20" height="20" rx="4"/>
        <rect x="105" y="170" width="20" height="20" rx="4"/>
        <rect x="215" y="170" width="20" height="20" rx="4"/>
        <!-- Small Gear -->
        <circle cx="255" cy="235" r="35" fill="#f97316"/>
        <circle cx="255" cy="235" r="14" fill="#0f172a" stroke="#fed7aa" stroke-width="3"/>
        <!-- Small Gear Teeth -->
        <rect x="247" y="190" width="16" height="16" rx="3"/>
        <rect x="247" y="264" width="16" height="16" rx="3"/>
        <rect x="210" y="227" width="16" height="16" rx="3"/>
        <rect x="284" y="227" width="16" height="16" rx="3"/>
      </g>
    `,
  },
  {
    key: 'natural-sciences',
    aliases: ['khtn', 'khoa-hoc-tu-nhien'],
    title: 'KHOA HỌC TỰ NHIÊN',
    category: 'MÔN TÍCH HỢP',
    subtitle: 'Vật lý • Hóa học • Sinh học • Đề thi THCS & Chuyên đề tích hợp',
    colorGrad1: '#022c22',
    colorGrad2: '#0d9488',
    colorAccent: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🔬 Kiến thức tích hợp KHTN', '📊 Lời giải chi tiết'],
    iconSvg: `
      <!-- Atom Orbit + Flask + Leaf Hybrid -->
      <ellipse cx="200" cy="190" rx="110" ry="45" fill="none" stroke="#38bdf8" stroke-width="4" transform="rotate(30 200 190)"/>
      <ellipse cx="200" cy="190" rx="110" ry="45" fill="none" stroke="#34d399" stroke-width="4" transform="rotate(-30 200 190)"/>
      <!-- Flask -->
      <path d="M 188,140 L 212,140 L 212,170 L 245,230 A 12 12 0 0 1 235,245 L 165,245 A 12 12 0 0 1 155,230 L 188,170 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="5"/>
      <!-- Green Sprout Leaf inside flask -->
      <path d="M 195,235 Q 185,200 205,190 Q 215,215 195,235 Z" fill="#4ade80"/>
      <circle cx="280" cy="140" r="7" fill="#38bdf8"/>
      <circle cx="120" cy="140" r="7" fill="#34d399"/>
    `,
  },
  {
    key: 'social-sciences',
    aliases: ['khxh', 'lich-su-dia-ly'],
    title: 'LỊCH SỬ & ĐỊA LÝ',
    category: 'MÔN TÍCH HỢP',
    subtitle: 'Lịch sử dân tộc • Địa lý tự nhiên & Kinh tế xã hội • Đề thi tích hợp',
    colorGrad1: '#431407',
    colorGrad2: '#9a3412',
    colorAccent: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🌏 Kiến thức tích hợp KHXH', '📊 Đánh giá năng lực'],
    iconSvg: `
      <!-- Historical Columns + Globe Half -->
      <g stroke="#fbbf24" stroke-width="4" fill="none">
        <circle cx="200" cy="200" r="100" fill="#0f172a" stroke="#f59e0b" stroke-width="4"/>
        <ellipse cx="200" cy="200" rx="40" ry="100" stroke="#d97706"/>
        <line x1="100" y1="200" x2="300" y2="200" stroke="#d97706"/>
      </g>
      <!-- Temple Silhouette in Center -->
      <polygon points="200,125 150,150 250,150" fill="#fbbf24"/>
      <rect x="160" y="155" width="12" height="50" rx="2" fill="#fef08a"/>
      <rect x="182" y="155" width="12" height="50" rx="2" fill="#fef08a"/>
      <rect x="206" y="155" width="12" height="50" rx="2" fill="#fef08a"/>
      <rect x="228" y="155" width="12" height="50" rx="2" fill="#fef08a"/>
      <rect x="145" y="205" width="110" height="10" fill="#fbbf24"/>
    `,
  },
  {
    key: 'default',
    aliases: ['exam-default', 'tong-hop'],
    title: 'ĐỀ THI TRẮC NGHIỆM',
    category: 'KHẢO THÍ CHUẨN HÓA',
    subtitle: 'Ngân hàng đề thi trắc nghiệm • Đánh giá năng lực • Luyện thi THPT Quốc gia',
    colorGrad1: '#0f172a',
    colorGrad2: '#4338ca',
    colorAccent: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.25)',
    pills: ['⏱️ Tính giờ tự động', '🎯 Chuẩn cấu trúc Bộ GD&ĐT', '📊 Phổ điểm & Lời giải'],
    iconSvg: `
      <!-- Graduation Mortarboard & Award Star -->
      <g fill="#818cf8" stroke="#ffffff" stroke-width="3">
        <!-- Mortarboard Diamond -->
        <polygon points="200,110 310,155 200,200 90,155" fill="#4f46e5" stroke="#a5b4fc" stroke-width="5"/>
        <!-- Skullcap -->
        <path d="M 140,180 L 140,225 Q 200,265 260,225 L 260,180" fill="#3730a3" stroke="#a5b4fc" stroke-width="4"/>
        <!-- Tassel -->
        <line x1="200" y1="155" x2="300" y2="185" stroke="#fbbf24" stroke-width="4"/>
        <circle cx="300" cy="205" r="10" fill="#fbbf24"/>
      </g>
      <!-- Star Badge in Center Bottom -->
      <circle cx="200" cy="275" r="28" fill="#fbbf24" stroke="#ffffff" stroke-width="3"/>
      <polygon points="200,253 206,268 223,269 209,280 214,296 200,286 186,296 191,280 177,269 194,268" fill="#ffffff"/>
    `,
  },
];

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateBannerSvg(cfg) {
  const safeTitle = escapeXml(cfg.title);
  const safeSubtitle = escapeXml(cfg.subtitle);
  const safeCategory = escapeXml(cfg.category);
  const safePill0 = escapeXml(cfg.pills[0]);
  const safePill1 = escapeXml(cfg.pills[1]);
  const safePill2 = escapeXml(cfg.pills[2]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="${cfg.colorGrad1}"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>

    <!-- Mesh Accent Gradient -->
    <linearGradient id="meshGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="${cfg.colorGrad2}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${cfg.colorAccent}" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Glowing Accent Gradient for Card/Badges -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${cfg.colorGrad2}"/>
      <stop offset="100%" stop-color="${cfg.colorAccent}"/>
    </linearGradient>

    <!-- Radial Glow Behind Subject Icon -->
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${cfg.colorAccent}" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="${cfg.colorGrad2}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${cfg.colorGrad2}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 1. Background Base -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <rect width="1200" height="630" fill="url(#meshGrad)"/>

  <!-- Geometric Subtle Grid Accents -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="80" y1="0" x2="80" y2="630"/>
    <line x1="240" y1="0" x2="240" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="560" y1="0" x2="560" y2="630"/>
    <line x1="720" y1="0" x2="720" y2="630"/>
    <line x1="880" y1="0" x2="880" y2="630"/>
    <line x1="1040" y1="0" x2="1040" y2="630"/>
    <line x1="0" y1="100" x2="1200" y2="100"/>
    <line x1="0" y1="200" x2="1200" y2="200"/>
    <line x1="0" y1="300" x2="1200" y2="300"/>
    <line x1="0" y1="400" x2="1200" y2="400"/>
    <line x1="0" y1="500" x2="1200" y2="500"/>
  </g>

  <!-- Top Ambient Glow Line -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accentGrad)"/>

  <!-- 2. Header Area -->
  <!-- Brand Badge (Top Left) -->
  <g transform="translate(80, 52)">
    <rect x="0" y="0" width="140" height="42" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <text x="18" y="28" fill="#38bdf8" font-size="20" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1">Dk</text>
    <text x="48" y="28" fill="#ffffff" font-size="20" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1">TEST</text>
    <circle cx="120" cy="21" r="5" fill="#38bdf8"/>
    
    <text x="156" y="27" fill="#94a3b8" font-size="15" font-weight="600" font-family="system-ui, -apple-system, sans-serif" letter-spacing="0.5">NỀN TẢNG KHẢO THÍ &amp; LUYỆN THI TRỰC TUYẾN THÔNG MINH</text>
  </g>

  <!-- Top Right Certification Badge -->
  <g transform="translate(830, 52)">
    <rect x="0" y="0" width="290" height="42" rx="21" fill="rgba(30, 41, 59, 0.7)" stroke="${cfg.colorAccent}" stroke-width="1.5" stroke-opacity="0.6"/>
    <circle cx="24" cy="21" r="7" fill="${cfg.colorAccent}"/>
    <text x="44" y="27" fill="#f1f5f9" font-size="14" font-weight="700" font-family="system-ui, -apple-system, sans-serif">CHUẨN BỘ GIÁO DỤC &amp; ĐÀO TẠO</text>
  </g>

  <!-- 3. Left Content Area -->
  <!-- Category Pill -->
  <g transform="translate(80, 145)">
    <rect x="0" y="0" width="220" height="34" rx="8" fill="url(#accentGrad)"/>
    <text x="110" y="23" fill="#ffffff" font-size="13" font-weight="800" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="1.5">${safeCategory}</text>
  </g>

  <!-- Main Subject Title -->
  <text x="80" y="260" fill="#ffffff" font-size="64" font-weight="900" font-family="system-ui, -apple-system, sans-serif" letter-spacing="-0.5">${safeTitle}</text>

  <!-- Subtitle / Curriculum Outline -->
  <text x="80" y="315" fill="#cbd5e1" font-size="21" font-weight="500" font-family="system-ui, -apple-system, sans-serif">${safeSubtitle}</text>

  <!-- Decorative Separator Line -->
  <line x1="80" y1="355" x2="680" y2="355" stroke="${cfg.colorAccent}" stroke-width="2" stroke-opacity="0.3"/>

  <!-- Feature Badges Row -->
  <g transform="translate(80, 385)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="190" height="42" rx="12" fill="rgba(30, 41, 59, 0.85)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <text x="95" y="26" fill="#f8fafc" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${safePill0}</text>

    <!-- Pill 2 -->
    <rect x="205" y="0" width="220" height="42" rx="12" fill="rgba(30, 41, 59, 0.85)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <text x="315" y="26" fill="#f8fafc" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${safePill1}</text>

    <!-- Pill 3 -->
    <rect x="440" y="0" width="180" height="42" rx="12" fill="rgba(30, 41, 59, 0.85)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    <text x="530" y="26" fill="#f8fafc" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle">${safePill2}</text>
  </g>

  <!-- 4. Right Side Subject Artwork Hub -->
  <g transform="translate(730, 115)">
    <!-- Ambient Radial Glow -->
    <circle cx="200" cy="200" r="190" fill="url(#iconGlow)"/>
    
    <!-- Outer Decorative Concentric Rings -->
    <circle cx="200" cy="200" r="180" fill="none" stroke="${cfg.colorAccent}" stroke-width="1.5" stroke-opacity="0.25" stroke-dasharray="10,8"/>
    <circle cx="200" cy="200" r="150" fill="none" stroke="${cfg.colorGrad2}" stroke-width="2" stroke-opacity="0.35"/>
    
    <!-- Glassmorphism Container Card -->
    <rect x="25" y="25" width="350" height="350" rx="44" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(255, 255, 255, 0.15)" stroke-width="2"/>
    <rect x="25" y="25" width="350" height="350" rx="44" fill="url(#meshGrad)" opacity="0.35"/>

    <!-- Subject Specific SVG Illustration -->
    ${cfg.iconSvg}
  </g>

  <!-- 5. Bottom Interactive Footer Bar -->
  <g transform="translate(80, 520)">
    <!-- Footer Capsule -->
    <rect x="0" y="0" width="1040" height="62" rx="16" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5"/>
    
    <!-- Call to Action Text -->
    <text x="32" y="38" fill="#f8fafc" font-size="17" font-weight="700" font-family="system-ui, -apple-system, sans-serif">
      🚀 <tspan fill="#38bdf8">Vào thi trực tuyến ngay</tspan> — Tự động chấm điểm, phân tích ma trận &amp; lời giải chi tiết
    </text>

    <!-- Platform Domain Badge -->
    <g transform="translate(870, 12)">
      <rect x="0" y="0" width="145" height="38" rx="10" fill="url(#accentGrad)"/>
      <text x="72" y="24" fill="#ffffff" font-size="16" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" letter-spacing="1">dktest.vn</text>
    </g>
  </g>
</svg>
`;
}

console.log('[BannerGen] Starting generation of 14 subject banners...');

for (const sub of subjects) {
  const svg = generateBannerSvg(sub);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngBuffer = resvg.render().asPng();

  // Decode PNG to RGBA pixels and encode to high-quality lightweight JPEG
  const decodedPng = decode(pngBuffer);
  const jpegBuffer = jpeg.encode(
    {
      data: decodedPng.data,
      width: decodedPng.width,
      height: decodedPng.height,
    },
    88
  );

  const primaryJpg = path.join(OUT_DIR, `${sub.key}.jpg`);
  const primaryPng = path.join(OUT_DIR, `${sub.key}.png`);

  fs.writeFileSync(primaryJpg, jpegBuffer.data);
  fs.writeFileSync(primaryPng, pngBuffer);
  console.log(`[BannerGen] Generated ${sub.key}.jpg (${Math.round(jpegBuffer.data.length / 1024)} KB) & ${sub.key}.png`);

  // Also write aliases for full interoperability
  for (const alias of sub.aliases) {
    const aliasJpg = path.join(OUT_DIR, `${alias}.jpg`);
    const aliasPng = path.join(OUT_DIR, `${alias}.png`);
    fs.copyFileSync(primaryJpg, aliasJpg);
    fs.copyFileSync(primaryPng, aliasPng);
  }
}

// Copy to dist/images/subjects if dist exists
const distSubjectsDir = path.join(process.cwd(), 'dist', 'images', 'subjects');
if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
  fs.mkdirSync(distSubjectsDir, { recursive: true });
  const files = fs.readdirSync(OUT_DIR);
  for (const file of files) {
    fs.copyFileSync(path.join(OUT_DIR, file), path.join(distSubjectsDir, file));
  }
  console.log(`[BannerGen] Copied ${files.length} banners to dist/images/subjects`);
}

console.log('[BannerGen] All banners successfully generated and saved!');
