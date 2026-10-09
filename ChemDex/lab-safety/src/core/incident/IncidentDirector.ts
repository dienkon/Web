import { FireClass } from '../fire/FireClasses';
import { SpillChemicalType } from '../spill/SpillSim';

export type IncidentType = 'fire' | 'chemical_spill' | 'eye_splash';

export interface IncidentScenario {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  fireClass?: FireClass;
  chemicalType?: SpillChemicalType;
  targetPosition: [number, number, number];
  requiredPPE: string[];
}

export class IncidentDirector {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  public setSeed(seed: number) {
    this.seed = seed;
  }

  /**
   * Generates a deterministic sequence of emergency incidents for the session
   */
  public generateIncidents(mode: 'learn' | 'challenge' | 'exam'): IncidentScenario[] {
    const list: IncidentScenario[] = [];

    // Incident 1: Flammable Liquid Fire on Bench 2
    list.push({
      id: 'inc_fire_b',
      type: 'fire',
      fireClass: 'B',
      title: 'Cháy Cốc Cồn Trên Bàn 2 (Lửa Loại B)',
      description: 'Cốc cồn ethanol bắt lửa từ đèn cồn bên cạnh. Hãy chọn đúng bình CO2 hoặc bột ABC, tuyệt đối KHÔNG dùng nước!',
      targetPosition: [2.1, 0.95, -1.0],
      requiredPPE: ['hasGoggles', 'hasLabCoat'],
    });

    // Incident 2: Acid chemical spill in central walkway
    list.push({
      id: 'inc_spill_acid',
      type: 'chemical_spill',
      chemicalType: 'acid_concentrated',
      title: 'Đổ Tràn Axit Sunfuric H2SO4 Tại Lối Đi',
      description: 'Lọ axit đổ trên sàn men. Cần mặc đủ đồ bảo hộ, rải bột trung hòa trước khi thấm hút và dọn vào thùng rác nguy hại.',
      targetPosition: [0.0, 0.01, 0.4],
      requiredPPE: ['hasGoggles', 'hasLabCoat', 'hasGloves'],
    });

    // In Exam mode, add electric fire challenge
    if (mode === 'exam') {
      list.push({
        id: 'inc_fire_c',
        type: 'fire',
        fireClass: 'C_electrical',
        title: 'Cháy Chập Điện Ổ Cắm Bàn 4 (Lửa Loại C)',
        description: 'Tia lửa điện bốc khói từ máy khuấy từ đang cắm điện. Ngắt cầu dao điện tổng trước hoặc dùng bình CO2!',
        targetPosition: [2.1, 0.95, 1.8],
        requiredPPE: ['hasGoggles', 'hasLabCoat', 'hasGloves'],
      });
    }

    return list;
  }
}

export const incidentDirector = new IncidentDirector();
