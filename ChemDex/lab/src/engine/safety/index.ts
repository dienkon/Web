import { SafetyEvaluationContext, SafetyViolation } from '../../types/safety';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';

export class SafetyEngine {
  /**
   * Evaluates any safety violations prior to executing physical or chemical actions
   */
  public static evaluate(context: SafetyEvaluationContext): SafetyViolation | null {
    const {
      targetVesselContents,
      addedChemicalId,
      addedAmount,
      isHeating,
      isOpen,
      targetVesselCapacityMl,
      currentVolumeMl
    } = context;

    const addedChem = CHEMICAL_LIBRARY[addedChemicalId];

    // 1. Vessel overflow check
    if (addedChem && (addedChem.phase === 'aqueous' || addedChem.phase === 'liquid')) {
      if (currentVolumeMl + addedAmount > targetVesselCapacityMl) {
        return {
          id: 'vessel_overflow',
          severity: 'WARNING',
          titleVi: 'CẢNH BÁO: TRÀO DUNG DỊCH',
          messageVi: `Thể tích sau khi thêm (${(currentVolumeMl + addedAmount).toFixed(1)} mL) vượt quá dung tích tối đa của bình (${targetVesselCapacityMl} mL).`,
          blocked: true,
          preventionTipVi: 'Hãy chọn dụng cụ thí nghiệm có dung tích lớn hơn hoặc giảm lượng hóa chất.',
          timestamp: Date.now()
        };
      }
    }

    // 2. Closed vessel heating check
    if (isHeating && !isOpen) {
      return {
        id: 'closed_vessel_heating',
        severity: 'CRITICAL',
        titleVi: 'NGUY HIỂM: ĐUN NÓNG BÌNH KÍN',
        messageVi: 'Đun nóng bình kín làm áp suất khí và hơi nước tăng đột ngột, có nguy cơ nổ vỡ bình thủy tinh gây thương tích!',
        blocked: true,
        preventionTipVi: 'Luôn mở nút hoặc tháo nắp bình trước khi tiến hành đun nóng.',
        timestamp: Date.now()
      };
    }

    // 3. Water into concentrated acid check (Sulfuric Acid hydration hazard)
    const hasH2SO4 = targetVesselContents.some(c => c.chemicalId === 'H2SO4');
    if (hasH2SO4 && addedChemicalId === 'H2O') {
      return {
        id: 'water_into_acid',
        severity: 'CRITICAL',
        titleVi: 'CỰC KỲ NGUY HIỂM: RÓT NƯỚC VÀO AXIT ĐẶC',
        messageVi: 'Quy tắc vàng an toàn phòng lab: Tuyệt đối KHÔNG rót nước vào axit H₂SO₄ đặc! Nhiệt tỏa ra cực lớn sẽ làm nước sôi bùng và bắn axit ăn mòn vào người.',
        blocked: true,
        preventionTipVi: 'Đúng quy trình: Phải rót từ từ từng giọt axit vào cốc đã chứa sẵn nước và khuấy đều.',
        timestamp: Date.now()
      };
    }

    // 4. Toxic / Corrosive substance handling reminder
    if (addedChem && addedChem.hazards.includes('corrosive')) {
      if (addedAmount > 50) {
        return {
          id: 'large_corrosive_volume',
          severity: 'NOTICE',
          titleVi: 'LƯU Ý AN TOÀN HÓA CHẤT ĂN MÒN',
          messageVi: `Bạn đang thêm lượng lớn dung dịch ăn mòn (${addedChem.nameVi}). Luôn thao tác cẩn trọng và trang bị găng tay bảo hộ.`,
          blocked: false,
          preventionTipVi: 'Mang kính và áo bảo hộ trong suốt quá trình thao tác.',
          timestamp: Date.now()
        };
      }
    }

    return null;
  }
}
