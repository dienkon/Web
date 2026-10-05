/**
 * CHEMDEX LAB - Smart Snapping & Placement Engine (K1.4)
 * Snaps objects to bench grid, burner wire gauze, balance pan,
 * test-tube rack, retort clamp, and receiver vessels.
 */

export interface SnapTargetResult {
  isSnapped: boolean;
  position: [number, number, number];
  targetType: 'grid' | 'balance' | 'burner' | 'rack' | 'vessel_mouth' | 'free_table';
  targetId?: string;
  isValid: boolean;
  hint_en: string;
  hint_vi: string;
}

export function evaluateSnapTarget(
  currentPos: [number, number, number],
  vesselType: string,
  allVessels: Record<string, { id: string; type: string; position: [number, number, number] }>,
  allBurners: Record<string, { id: string; position: [number, number, number] }>,
  snapToGrid: boolean = false
): SnapTargetResult {
  const [x, y, z] = currentPos;

  // 1. Check Analytical Balance Pan
  const balanceX = 7.5;
  const balanceZ = -2.5;
  const distToBalance = Math.hypot(x - balanceX, z - balanceZ);
  if (distToBalance < 0.85) {
    return {
      isSnapped: true,
      position: [balanceX, -0.02, balanceZ],
      targetType: 'balance',
      isValid: true,
      hint_en: 'Placed on Analytical Balance Pan',
      hint_vi: 'Đặt trên đĩa cân phân tích'
    };
  }

  // 2. Check Alcohol Burner Wire Gauze
  for (const [bId, b] of Object.entries(allBurners)) {
    const distToBurner = Math.hypot(x - b.position[0], z - b.position[2]);
    if (distToBurner < 0.85) {
      const gauzeY = b.position[1] + (vesselType === 'test_tube' ? 2.31 : 2.49);
      const isThermalCompatible = ['beaker', 'flask', 'crucible', 'evaporating_dish', 'test_tube'].includes(vesselType);
      return {
        isSnapped: true,
        position: [b.position[0], gauzeY, b.position[2]],
        targetType: 'burner',
        targetId: bId,
        isValid: isThermalCompatible,
        hint_en: isThermalCompatible ? 'Heating on Wire Gauze' : 'Incompatible vessel for direct flame!',
        hint_vi: isThermalCompatible ? 'Gia nhiệt trên lưới amiăng' : 'Dụng cụ không phù hợp đun trực tiếp!'
      };
    }
  }

  // 3. Test Tube Rack Slotting
  if (vesselType === 'test_tube') {
    for (const [rId, r] of Object.entries(allVessels)) {
      if (r.type === 'test_tube_rack') {
        const distToRack = Math.hypot(x - r.position[0], z - r.position[2]);
        if (distToRack < 1.1) {
          return {
            isSnapped: true,
            position: [r.position[0], r.position[1] + 0.45, r.position[2]],
            targetType: 'rack',
            targetId: rId,
            isValid: true,
            hint_en: 'Slotted in Test Tube Rack',
            hint_vi: 'Cắm vào giá để ống nghiệm'
          };
        }
      }
    }
  }

  // 4. Filter Funnel into Flask / Beaker Neck
  if (vesselType === 'filter_funnel') {
    for (const [vId, v] of Object.entries(allVessels)) {
      if (['flask', 'beaker', 'cylinder'].includes(v.type)) {
        const distToV = Math.hypot(x - v.position[0], z - v.position[2]);
        if (distToV < 0.75) {
          const mountY = v.position[1] + (v.type === 'flask' ? 1.35 : 1.15);
          return {
            isSnapped: true,
            position: [v.position[0], mountY, v.position[2]],
            targetType: 'vessel_mouth',
            targetId: vId,
            isValid: true,
            hint_en: 'Inserted Filter Funnel',
            hint_vi: 'Lắp phễu lọc vào cổ bình'
          };
        }
      }
    }
  }

  // 5. Bench Grid Snapping
  if (snapToGrid) {
    const gridStep = 0.5;
    const snappedX = Math.round(x / gridStep) * gridStep;
    const snappedZ = Math.round(z / gridStep) * gridStep;
    return {
      isSnapped: true,
      position: [snappedX, -0.135, snappedZ],
      targetType: 'grid',
      isValid: true,
      hint_en: 'Bench Grid Alignment',
      hint_vi: 'Căn chỉnh lưới bàn'
    };
  }

  // 6. Free Table Placement (Default)
  return {
    isSnapped: false,
    position: [x, Math.max(-0.135, y), z],
    targetType: 'free_table',
    isValid: true,
    hint_en: 'Workbench Top',
    hint_vi: 'Mặt bàn thí nghiệm'
  };
}
