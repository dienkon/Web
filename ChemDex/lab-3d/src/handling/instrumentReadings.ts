import type { InstrumentId } from './instrumentCatalog';
import { isLessonVessel } from './instrumentCatalog';
import { useAppStore } from '../store/useAppStore';
import { useInstrumentStore } from './instrumentState';
import { balanceOccupant, balanceReading, buretteReceiver, resolveInstrumentTarget } from './instrumentOperations';
import { lessonRuntime } from '../lesson/runtime';

export interface InstrumentReading {
  value: string;
  unit: string;
  valid: boolean;
  context: string;
  details: { label: string; value: string }[];
}

export function readInstrument(id: InstrumentId): InstrumentReading {
  const state = useAppStore.getState();
  const target = resolveInstrumentTarget();
  const instruments = useInstrumentStore.getState();
  switch (id) {
    case 'pipette': {
      const sample = instruments.pipetteSample;
      return {
        value: (sample?.volume_ml ?? 0).toFixed(3),
        unit: 'mL',
        valid: true,
        context: sample && sample.volume_ml > 0 ? 'Mẫu đang giữ trong pipet' : 'Pipet rỗng',
        details: [
          { label: 'Khối lượng mẫu', value: `${(sample?.mass_g ?? 0).toFixed(4)} g` },
          { label: 'Thành phần', value: sample?.contents.filter(item => item.moles > 1e-12).map(item => item.formula).join(', ') || '—' },
          { label: 'Nhiễm chéo', value: state.toolContamination.pipette ?? 'Đã sạch' },
        ],
      };
    }
    case 'balance': {
      const occupant = balanceOccupant();
      return {
        value: balanceReading().toFixed(3),
        unit: 'g',
        valid: true,
        context: occupant?.name ?? 'Đĩa cân trống',
        details: [
          { label: 'Mốc trừ bì', value: `${instruments.balanceTare_g.toFixed(3)} g` },
          { label: 'Loại số đo', value: 'Khối lượng cả bình, trừ mốc TARE' },
        ],
      };
    }
    case 'burette': {
      const burette = state.burette;
      return {
        value: burette.currentVolume_ml.toFixed(3),
        unit: 'mL',
        valid: true,
        context: `${burette.reagentFormula} · ${burette.concentration_M} M`,
        details: [
          { label: 'Bình dưới đầu buret', value: buretteReceiver()?.name ?? 'Chưa có' },
          { label: 'Khóa', value: burette.isDispensing ? 'Đang mở' : 'Đang đóng' },
          { label: 'Lưu lượng', value: `${burette.flowRate_ml_s.toFixed(2)} mL/s` },
        ],
      };
    }
    case 'thermometer':
      return {
        value: target ? target.temperature_c.toFixed(2) : '—',
        unit: '°C',
        valid: Boolean(target),
        context: target?.name ?? 'Chọn bình cần đo',
        details: [{ label: 'Giá trị', value: 'Nhiệt độ trạng thái mẫu; đầu đo 3D có độ trễ' }],
      };
    case 'ph_meter': {
      const lesson = target && isLessonVessel(target.id)
        ? lessonRuntime.list().find(session => session.vesselId === target.id)
        : null;
      const valid = Boolean(target && target.volume_ml > 0.05 && target.capacity_ml > 0);
      const pH = lesson?.environment.pH ?? target?.ph ?? 7;
      return {
        value: valid ? Math.max(0, Math.min(14, pH)).toFixed(2) : '---',
        unit: 'pH',
        valid,
        context: valid ? target!.name : 'Đầu đo chưa có pha dung dịch',
        details: [{
          label: 'Cơ sở',
          value: lesson ? 'pH điều kiện kịch bản; không suy ra từ cân bằng axit–bazơ'
            : target?.phModel === 'ideal_aqueous_25c'
              ? 'Cân bằng điện tích dung dịch lý tưởng; hằng số ở 25 °C, chưa hiệu chỉnh hoạt độ/nhiệt độ'
              : 'Trạng thái pH giản lược; hệ này chưa có bộ cân bằng đầy đủ',
        }],
      };
    }
    case 'stirring_rod':
      return {
        value: state.stirringVesselId ? 'Đang khuấy' : 'Sẵn sàng',
        unit: '',
        valid: Boolean(target),
        context: target?.name ?? 'Chọn bình cần khuấy',
        details: [{ label: 'Nhiễm chéo', value: state.toolContamination.stirring_rod ?? 'Đã sạch' }],
      };
    case 'spatula':
      return {
        value: state.spatulaState.mass_g.toFixed(3),
        unit: 'g',
        valid: Boolean(state.spatulaState.chemical),
        context: state.spatulaState.chemical ?? 'Thìa rỗng',
        details: [{ label: 'Nhiễm chéo', value: state.toolContamination.spatula ?? 'Đã sạch' }],
      };
    case 'sponge':
      return {
        value: Object.values(state.spills).reduce((sum, spill) => sum + spill.mass_g, 0).toFixed(3),
        unit: 'g',
        valid: true,
        context: `${Object.keys(state.spills).length} vết tràn trên bàn`,
        details: [{ label: 'Chất thải đã thu gom', value: `${state.wasteMass_g.toFixed(3)} g` }],
      };
  }
}
