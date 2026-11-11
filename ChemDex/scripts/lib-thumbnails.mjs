import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function classifySubstance(s, element, ions) {
  if (element) {
    const cat = element.category ?? '';
    const catVi = element.category_vi ?? '';
    if (cat === 'alkali-metal' || catVi.includes('kiềm') && !catVi.includes('thổ')) return 'alkali';
    if (cat === 'alkaline-earth-metal' || catVi.includes('kiềm thổ')) return 'alkaline-earth';
    if (cat === 'transition-metal' || catVi.includes('chuyển tiếp')) return 'transition';
    if (cat === 'post-transition-metal' || catVi.includes('hậu chuyển tiếp')) return 'post-transition';
    if (cat === 'metalloid' || catVi.includes('á kim') || catVi.includes('bán dẫn')) return 'metalloid';
    if (cat === 'halogen' || catVi.includes('halogen')) return 'halogen';
    if (cat === 'noble-gas' || catVi.includes('khí hiếm') || catVi.includes('khí trơ')) return 'noble-gas';
    if (cat === 'lanthanide' || catVi.includes('lantan')) return 'lanthanide';
    if (cat === 'actinide' || catVi.includes('actini')) return 'actinide';
    return 'nonmetal';
  }

  const f = s.formula || '';
  if (s.family === 'organic') {
    if (/C\d+H\d+O\d+/.test(f) && (f.includes('O6') || f.includes('O5') || f.includes('O11'))) return 'carbohydrate';
    if (f.includes('COO') || /^C\d+H\d+O2$/.test(f)) return 'ester';
    if (/COOH$/.test(f) || f === 'HCOOH' || f === 'CH3COOH' || f === 'C2H4O2') return 'carboxylic-acid';
    if (/CHO$/.test(f) || f === 'HCHO' || f === 'CH3CHO') return 'aldehyde';
    if (/CO/.test(f) && !f.includes('COOH') && !f.includes('COO')) return 'ketone';
    if (/OH$/.test(f) || /C\d+H\d+O$/.test(f)) return 'alcohol';
    if (/NH2|NH|N\(/.test(f)) return 'amine';
    if (f === 'C6H6' || f === 'C7H8' || f === 'C8H10' || /benzen|toluen/i.test(s.name_vi || '')) return 'aromatic';
    if (/C\d+H2\d+$/.test(f) || /etilen|propen|buten/i.test(s.name_vi || '')) return 'alkene';
    if (/axetilen|axetylen|ankin/i.test(s.name_vi || '') || f === 'C2H2') return 'alkyne';
    if (s.material || s.kind === 'polymer' || (s.modelNote && s.modelNote.includes('đơn vị lặp'))) return 'polymer';
    return 'alkane';
  }

  if (s.kind === 'crystal' || s.kind === 'mineral') return 'crystal';
  if (ions || /^(Na|K|Ca|Ba|Mg|Al|Fe|Cu|Zn)[A-Z]/.test(f)) return 'salt';
  if (/^H[A-Z]/.test(f)) return 'acid';
  if (/OH\)?$/.test(f)) return 'base';
  return 'inorganic';
}

const PALETTES = {
  alkali: {
    start: '#c2410c',
    end: '#7f1d1d',
    badge: 'KIM LOẠI KIỀM · NHÓM IA',
    accent: '#fef08a',
    theme: 'alkali',
  },
  'alkaline-earth': {
    start: '#b45309',
    end: '#14532d',
    badge: 'KIM LOẠI KIỀM THỔ · NHÓM IIA',
    accent: '#fde047',
    theme: 'alkaline-earth',
  },
  transition: {
    start: '#1d4ed8',
    end: '#581c87',
    badge: 'KIM LOẠI CHUYỂN TIẾP · D-BLOCK',
    accent: '#93c5fd',
    theme: 'transition',
  },
  'post-transition': {
    start: '#0f766e',
    end: '#1e3a8a',
    badge: 'KIM LOẠI HẬU CHUYỂN TIẾP · P-BLOCK',
    accent: '#5eead4',
    theme: 'post-transition',
  },
  metalloid: {
    start: '#334155',
    end: '#0369a1',
    badge: 'Á KIM · BÁN DẪN ĐIỆN TỬ',
    accent: '#38bdf8',
    theme: 'metalloid',
  },
  halogen: {
    start: '#047857',
    end: '#6b21a8',
    badge: 'NHÓM HALOGEN · NHÓM VIIA',
    accent: '#6ee7b7',
    theme: 'halogen',
  },
  'noble-gas': {
    start: '#312e81',
    end: '#4c1d95',
    badge: 'KHÍ HIẾM · KHÍ TRƠ (NHÓM VIIIA)',
    accent: '#c4b5fd',
    theme: 'noble-gas',
  },
  lanthanide: {
    start: '#701a75',
    end: '#1e1b4b',
    badge: 'HỌ LANTAN · ĐẤT HIẾM 4f',
    accent: '#f0abfc',
    theme: 'lanthanide',
  },
  actinide: {
    start: '#881337',
    end: '#09090b',
    badge: 'HỌ ACTINI · NĂNG LƯỢNG HẠT NHÂN 5f',
    accent: '#f472b6',
    theme: 'actinide',
  },
  nonmetal: {
    start: '#0e7490',
    end: '#1e1b4b',
    badge: 'PHI KIM · LIÊN KẾT CỘNG HÓA TRỊ',
    accent: '#67e8f9',
    theme: 'nonmetal',
  },
  alkane: {
    start: '#047857',
    end: '#0f172a',
    badge: 'HIĐROCACBON NO · ANKAN',
    accent: '#6ee7b7',
    theme: 'alkane',
  },
  alkene: {
    start: '#0284c7',
    end: '#065f46',
    badge: 'HIĐROCACBON KHÔNG NO · ANKEN',
    accent: '#38bdf8',
    theme: 'alkene',
  },
  alkyne: {
    start: '#6d28d9',
    end: '#1e1b4b',
    badge: 'HIĐROCACBON LIÊN KẾT BA · ANKIN',
    accent: '#c084fc',
    theme: 'alkyne',
  },
  aromatic: {
    start: '#0369a1',
    end: '#312e81',
    badge: 'HỢP CHẤT THƠM · VÒNG BENZEN',
    accent: '#7dd3fc',
    theme: 'aromatic',
  },
  alcohol: {
    start: '#0d9488',
    end: '#0369a1',
    badge: 'ANCOL & DẪN XUẤT · NHÓM —OH',
    accent: '#5eead4',
    theme: 'alcohol',
  },
  aldehyde: {
    start: '#b45309',
    end: '#78350f',
    badge: 'ANĐEHIT · TRÁNG GƯƠNG —CH=O',
    accent: '#fde047',
    theme: 'aldehyde',
  },
  ketone: {
    start: '#a21caf',
    end: '#4c1d95',
    badge: 'XETON · CACBONYL >C=O NỘI MẠCH',
    accent: '#f0abfc',
    theme: 'ketone',
  },
  'carboxylic-acid': {
    start: '#b91c1c',
    end: '#450a0a',
    badge: 'AXIT CACBOXYLIC · NHÓM —COOH',
    accent: '#fca5a5',
    theme: 'carboxylic-acid',
  },
  ester: {
    start: '#be185d',
    end: '#9a3412',
    badge: 'ESTE HƯƠNG LIỆU · CẦU NỐI —COO—',
    accent: '#fbcfe8',
    theme: 'ester',
  },
  amine: {
    start: '#3730a3',
    end: '#0e7490',
    badge: 'AMIN · BAZƠ HỮU CƠ CHỨA NITƠ',
    accent: '#a5b4fc',
    theme: 'amine',
  },
  polymer: {
    start: '#0f766e',
    end: '#172554',
    badge: 'POLYME · VẬT LIỆU CAO PHÂN TỬ',
    accent: '#5eead4',
    theme: 'polymer',
  },
  carbohydrate: {
    start: '#15803d',
    end: '#854d0e',
    badge: 'CACBOHIĐRAT · VÒNG ĐƯỜNG SINH HỌC',
    accent: '#bbf7d0',
    theme: 'carbohydrate',
  },
  crystal: {
    start: '#0369a1',
    end: '#064e3b',
    badge: 'MẠNG TINH THỂ · KHOÁNG VẬT TỰ NHIÊN',
    accent: '#7dd3fc',
    theme: 'crystal',
  },
  salt: {
    start: '#1e40af',
    end: '#0f766e',
    badge: 'HỢP CHẤT ION · LIÊN KẾT ĐIỆN HÓA',
    accent: '#93c5fd',
    theme: 'salt',
  },
  acid: {
    start: '#991b1b',
    end: '#1e3a8a',
    badge: 'AXIT VÔ CƠ · PROTON H⁺ LINH ĐỘNG',
    accent: '#fca5a5',
    theme: 'acid',
  },
  base: {
    start: '#0369a1',
    end: '#6b21a8',
    badge: 'BAZƠ & KIỀM · ANION HIĐROXIT —OH',
    accent: '#93c5fd',
    theme: 'base',
  },
  inorganic: {
    start: '#1e293b',
    end: '#0e7490',
    badge: 'HỢP CHẤT HÓA HỌC CHUYÊN KHẢO',
    accent: '#38bdf8',
    theme: 'inorganic',
  },
};

export function generateArticleSvg({
  slug,
  formula,
  prettyFormula,
  name,
  element,
  ions,
  subject,
  mass,
}) {
  const kindKey = classifySubstance(subject, element, ions);
  const palette = PALETTES[kindKey] || PALETTES.inorganic;

  const hash = createHash('md5').update(slug).digest('hex');
  const seed = parseInt(hash.slice(0, 6), 16);
  const rot = (seed % 40) - 20;
  const numGridLines = 3 + (seed % 4);

  // Background subtle coordinate grid
  let gridSvg = '';
  for (let i = 0; i < numGridLines; i++) {
    const x = 50 + ((seed * (i + 1) * 37) % 700);
    gridSvg += `<line x1="${x}" y1="0" x2="${x}" y2="450" stroke="#ffffff" stroke-width="0.75" stroke-dasharray="4,8" opacity="0.08"/>`;
  }

  // Right graphic: tailored per classification
  let rightGraphic = '';
  if (element) {
    const z = element.z;
    const sym = element.symbol;
    const massStr = typeof element.mass === 'number' ? element.mass.toFixed(2) : '';
    rightGraphic = `
      <!-- Element Tile Showcase -->
      <g transform="translate(160, 155)">
        <!-- Orbital path rings -->
        <ellipse cx="0" cy="0" rx="90" ry="40" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.4" transform="rotate(${rot})"/>
        <ellipse cx="0" cy="0" rx="90" ry="40" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.4" transform="rotate(${rot + 60})"/>
        <ellipse cx="0" cy="0" rx="90" ry="40" fill="none" stroke="${palette.accent}" stroke-width="1.5" opacity="0.4" transform="rotate(${rot + 120})"/>
        
        <!-- Periodic Card -->
        <rect x="-65" y="-75" width="130" height="150" rx="16" fill="#0f172a" fill-opacity="0.85" stroke="${palette.accent}" stroke-width="2.5"/>
        <text x="-48" y="-45" fill="${palette.accent}" font-family="sans-serif" font-weight="900" font-size="16">${z}</text>
        <text x="0" y="15" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="48">${sym}</text>
        <text x="0" y="42" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-weight="700" font-size="12">${escapeXml(name.slice(0, 16))}</text>
        <text x="0" y="60" text-anchor="middle" fill="${palette.accent}" font-family="sans-serif" font-weight="800" font-size="11">${massStr}</text>
      </g>
    `;
  } else if (kindKey === 'crystal' || kindKey === 'salt') {
    rightGraphic = `
      <!-- Crystal Lattice Unit Cell Showcase -->
      <g transform="translate(160, 155)">
        <polygon points="0,-70 65,-35 0,0 -65,-35" fill="none" stroke="#ffffff" stroke-width="2"/>
        <polygon points="-65,-35 0,0 0,70 -65,35" fill="none" stroke="#ffffff" stroke-width="2"/>
        <polygon points="65,-35 0,0 0,70 65,35" fill="none" stroke="#ffffff" stroke-width="2"/>
        <!-- Lattice sphere vertices -->
        <circle cx="0" cy="-70" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <circle cx="65" cy="-35" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
        <circle cx="-65" cy="-35" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
        <circle cx="0" cy="0" r="15" fill="#fde047" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="0" cy="70" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <circle cx="-65" cy="35" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
        <circle cx="65" cy="35" r="10" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
        <!-- Formula text -->
        <text x="0" y="105" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="16">${escapeXml(prettyFormula)}</text>
      </g>
    `;
  } else if (kindKey === 'aromatic') {
    rightGraphic = `
      <!-- Benzene ring / Aromatic sextet -->
      <g transform="translate(160, 150)">
        <polygon points="0,-65 56,-32 56,32 0,65 -56,32 -56,-32" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"/>
        <circle cx="0" cy="0" r="38" fill="none" stroke="${palette.accent}" stroke-width="3" stroke-dasharray="6,4"/>
        <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="11">6π</text>
        <text x="0" y="98" text-anchor="middle" fill="${palette.accent}" font-family="sans-serif" font-weight="800" font-size="16">${escapeXml(prettyFormula)}</text>
      </g>
    `;
  } else if (kindKey === 'ester' || kindKey === 'carboxylic-acid' || kindKey === 'aldehyde' || kindKey === 'ketone') {
    rightGraphic = `
      <!-- Carbonyl & Functional Group Showcase -->
      <g transform="translate(160, 150)">
        <circle cx="-25" cy="0" r="22" fill="#be185d" stroke="#ffffff" stroke-width="2.5"/>
        <text x="-25" y="6" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">C</text>
        <line x1="-25" y1="-22" x2="-25" y2="-65" stroke="#ef4444" stroke-width="5"/>
        <circle cx="-25" cy="-70" r="16" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <text x="-25" y="-65" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">=O</text>
        <line x1="-3" y1="0" x2="40" y2="0" stroke="#ffffff" stroke-width="5"/>
        <circle cx="50" cy="0" r="18" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
        <text x="50" y="5" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">-O-</text>
        <line x1="68" y1="0" x2="95" y2="0" stroke="#ffffff" stroke-width="4"/>
        <circle cx="102" cy="0" r="12" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5"/>
        <text x="0" y="98" text-anchor="middle" fill="${palette.accent}" font-family="sans-serif" font-weight="800" font-size="16">${escapeXml(prettyFormula)}</text>
      </g>
    `;
  } else {
    rightGraphic = `
      <!-- Molecular Bond Geometry Showcase -->
      <g transform="translate(160, 150)">
        <line x1="0" y1="0" x2="0" y2="-65" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line x1="0" y1="0" x2="-55" y2="45" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line x1="0" y1="0" x2="55" y2="45" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="26" fill="#0284c7" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="0" cy="-65" r="16" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <circle cx="-55" cy="45" r="16" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <circle cx="55" cy="45" r="16" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <text x="0" y="6" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="16">●</text>
        <text x="0" y="98" text-anchor="middle" fill="${palette.accent}" font-family="sans-serif" font-weight="800" font-size="16">${escapeXml(prettyFormula)}</text>
      </g>
    `;
  }

  // Display Name truncation
  const displayName = name.length > 24 ? name.slice(0, 23) + '…' : name;
  const massLabel = typeof mass === 'number' && Number.isFinite(mass)
    ? `M = ${mass.toFixed(2)} g/mol`
    : element
      ? `Z = ${element.z}`
      : 'Hồ sơ chuyên khảo';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.start}"/>
      <stop offset="100%" stop-color="${palette.end}"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="800" height="450" rx="24" fill="url(#bg)"/>
  ${gridSvg}
  <circle cx="710" cy="65" r="180" fill="#ffffff" opacity="0.05"/>
  <circle cx="110" cy="390" r="190" fill="#ffffff" opacity="0.04"/>
  
  <!-- Left Identity Column -->
  <g transform="translate(48, 90)">
    <rect x="0" y="0" width="auto" height="24" rx="6" fill="#ffffff" fill-opacity="0.15"/>
    <text x="8" y="16" fill="${palette.accent}" font-family="system-ui, sans-serif" font-weight="800" font-size="10.5" letter-spacing="0.8">${escapeXml(palette.badge)}</text>
    
    <!-- Big Chemical Formula -->
    <text x="0" y="75" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="42" letter-spacing="1">
      ${escapeXml(prettyFormula)}
    </text>
    
    <!-- Substance Name -->
    <text x="0" y="118" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="22">
      ${escapeXml(displayName)}
    </text>
    
    <!-- Specs and reading badge -->
    <g transform="translate(0, 155)">
      <rect x="0" y="0" width="150" height="28" rx="8" fill="#000000" fill-opacity="0.3" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1"/>
      <text x="12" y="18" fill="#e2e8f0" font-family="sans-serif" font-weight="700" font-size="12">${escapeXml(massLabel)}</text>
      
      <rect x="160" y="0" width="140" height="28" rx="8" fill="#fde047" fill-opacity="0.2" stroke="#fde047" stroke-opacity="0.4" stroke-width="1"/>
      <text x="172" y="18" fill="#fef08a" font-family="sans-serif" font-weight="700" font-size="12">1.000+ từ · Khảo cứu</text>
    </g>
    
    <text x="0" y="235" fill="#e0f2fe" opacity="0.9" font-family="system-ui, sans-serif" font-weight="500" font-size="13">
      Tài liệu số hóa · Cấu trúc 3D &amp; Phản ứng thực nghiệm
    </text>
  </g>
  
  <!-- Right Graphic Box -->
  <rect x="435" y="54" width="320" height="342" rx="22" fill="#0f172a" fill-opacity="0.38" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5"/>
  <g transform="translate(435, 54)">
    ${rightGraphic}
    <text x="160" y="318" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-weight="600" font-size="11.5">ChemDex Digital Reference Library</text>
  </g>
</svg>`;
}
