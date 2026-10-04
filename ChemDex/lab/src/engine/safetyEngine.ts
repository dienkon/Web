import { GHSHazard, PPEItem } from '../types/chemistry';
import { findChemical } from '../data/chemicals';

export interface SafetyViolation {
  level: 'CRITICAL' | 'WARNING' | 'NOTICE';
  title_en: string;
  title_vi: string;
  message_en: string;
  message_vi: string;
  recommendedPpe: PPEItem[];
  ruleCode: string;
}

export function checkSafetyViolations(
  substances: string[], 
  isHeated: boolean, 
  temp_c: number,
  isVesselClosed: boolean = false
): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  const lowerSubs = substances.map(s => s.toLowerCase());

  // 1. Check Water added into Concentrated Sulfuric Acid
  if (lowerSubs.some(s => s.includes('h2so4 (conc)')) && lowerSubs.some(s => s === 'h2o' || s === 'distilled water')) {
    violations.push({
      level: 'CRITICAL',
      title_en: 'Severe Splatter Hazard: Water in Conc. Acid',
      title_vi: 'Hiểm họa bắn bỏng axit: Nước đổ vào Axit Đặc',
      message_en: 'Water must NEVER be poured into concentrated sulfuric acid! Intense hydration heat causes explosive steam boiling and throws corrosive acid droplets. Always pour acid into water slowly!',
      message_vi: 'Tuyệt đối KHÔNG đổ nước vào axit sunfuric đặc! Nhiệt hòa tan cực lớn làm nước sôi nổ bùng bắn axit ăn mòn vào người. Luôn rót axit từ từ vào nước!',
      recommendedPpe: ['goggles', 'gloves', 'fume_hood', 'lab_coat'],
      ruleCode: 'SAFE_ACID_DILUTION'
    });
  }

  // 2. Alkali Metals (Na, K) in Water
  if ((lowerSubs.includes('na') || lowerSubs.includes('k')) && lowerSubs.some(s => s === 'h2o' || s === 'distilled water')) {
    violations.push({
      level: 'CRITICAL',
      title_en: 'Explosive Metal-Water Fire Hazard',
      title_vi: 'Nguy cơ bốc cháy nổ kim loại kiềm với nước',
      message_en: 'Sodium and Potassium react with violent exothermicity with water, generating explosive H2 gas that can ignite immediately! Use tiny quantities under safety screen.',
      message_vi: 'Natri và Kali tác dụng tỏa nhiệt dữ dội với nước giải phóng khí H2 dễ cháy nổ tức thì! Chỉ dùng mẩu nhỏ cỡ hạt gạo và che chắn cẩn thận.',
      recommendedPpe: ['goggles', 'gloves', 'fume_hood'],
      ruleCode: 'ALKALI_WATER_EXPLOSION'
    });
  }

  // 3. Hydrogen Gas near Open Flame
  if (isHeated && (lowerSubs.includes('zn') || lowerSubs.includes('mg')) && lowerSubs.some(s => s.includes('hcl'))) {
    violations.push({
      level: 'WARNING',
      title_en: 'Flammable Hydrogen Gas near Open Flame',
      title_vi: 'Khí Hiđro dễ nổ cạnh ngọn lửa mở',
      message_en: 'Reaction generates flammable H2 gas. Bunsen burner flame nearby risks detonating the hydrogen-air mixture (pop test hazard).',
      message_vi: 'Phản ứng đang sinh khí H2 dễ cháy nổ. Ngọn lửa đèn cồn đặt quá gần có thể làm bốc cháy hỗn hợp khí.',
      recommendedPpe: ['goggles', 'fume_hood'],
      ruleCode: 'H2_FLAME_PROXIMITY'
    });
  }

  // 4. Heating Closed Vessel
  if (isHeated && isVesselClosed) {
    violations.push({
      level: 'CRITICAL',
      title_en: 'Pressure Explosion Hazard',
      title_vi: 'Nguy cơ nổ vỡ do tăng áp suất',
      message_en: 'Never heat a closed or sealed container! Thermal vapor expansion can shatter glassware violently.',
      message_vi: 'Tuyệt đối không đun nóng bình thí nghiệm đậy kín nút! Hơi giãn nở áp suất cao sẽ làm nổ vỡ tan tành bình thủy tinh.',
      recommendedPpe: ['goggles', 'fume_hood'],
      ruleCode: 'CLOSED_VESSEL_HEATING'
    });
  }

  // 5. Heavy Metal Disposal (Pb, Ba)
  if (lowerSubs.some(s => s.includes('pb') || s.includes('bacl2'))) {
    violations.push({
      level: 'NOTICE',
      title_en: 'Heavy Metal Environmental Protocol',
      title_vi: 'Quy định thu gom chất thải kim loại nặng',
      message_en: 'Barium and Lead salts are toxic pollutants. Do not wash down sink; pour into marked hazardous chemical waste jug.',
      message_vi: 'Muối Chì và Bari là chất thải kim loại nặng độc hại. Không xả trực tiếp vào cống bồn rửa; đổ vào can thu gom chuyên dụng.',
      recommendedPpe: ['gloves'],
      ruleCode: 'HEAVY_METAL_WASTE'
    });
  }

  return violations;
}

export function getChemicalHazardsAndPpe(substances: string[]): { hazards: GHSHazard[]; ppe: PPEItem[] } {
  const hazardsSet = new Set<GHSHazard>();
  const ppeSet = new Set<PPEItem>(['lab_coat']);

  for (const s of substances) {
    const chem = findChemical(s);
    for (const h of chem.hazards) hazardsSet.add(h);
    for (const p of chem.ppe) ppeSet.add(p);
  }

  return {
    hazards: Array.from(hazardsSet),
    ppe: Array.from(ppeSet)
  };
}
