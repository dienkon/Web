import type { InstrumentId } from './instrumentCatalog';
import { isLessonVessel } from './instrumentCatalog';
import { useAppStore } from '../store/useAppStore';
import { useInstrumentStore } from './instrumentState';
import { balanceOccupant, balanceReading, buretteReceiver, resolveInstrumentTarget } from './instrumentOperations';
import { lessonRuntime } from '../lesson/runtime';
import { neutralPhAtTemperature } from '../science/aqueousTemperature';
import { sampleMeasurement } from '../science/sampleMeasurement';
import type { VesselState } from '../types/chemistry';

export function readSample(vessel: VesselState | null | undefined) {
  const scenarioPh = vessel && isLessonVessel(vessel.id)
    ? lessonRuntime.list().find(session => session.vesselId === vessel.id)?.environment.pH : undefined;
  return sampleMeasurement(vessel, scenarioPh);
}

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
      const sample = state.pipetteSample;
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
      const measured = readSample(target);
      return {
        value: measured.thermometerPoint && measured.temperature_c !== null ? measured.temperature_c.toFixed(2) : '—',
        unit: '°C',
        valid: measured.thermometerPoint !== null && measured.temperature_c !== null,
        context: measured.thermometerPoint ? target!.name : 'Đầu đo chưa ngập trong dung dịch của bình mở',
        details: [{ label: 'Giá trị', value: 'Nhiệt độ trạng thái mẫu; đầu đo 3D có độ trễ' }],
      };
    case 'ph_meter': {
      const lesson = target && isLessonVessel(target.id)
        ? lessonRuntime.list().find(session => session.vesselId === target.id)
        : null;
      const observation = readSample(target), valid = observation.ph !== null;
      return {
        value: observation.ph !== null ? observation.ph.toFixed(2) : '---',
        unit: 'pH',
        valid,
        context: valid ? target!.name : observation.reason,
        details: [{
          label: 'Cơ sở',
          value: lesson ? 'pH điều kiện kịch bản; không suy ra từ cân bằng axit–bazơ'
            : observation.basis === 'ideal_aqueous_25c'
              ? 'Cân bằng điện tích dung dịch lý tưởng; hằng số ở 25 °C, chưa hiệu chỉnh hoạt độ/nhiệt độ'
              : observation.basis === 'ideal_aqueous_temperature'
                ? `Cân bằng dung dịch lý tưởng; hằng số tại ${observation.referenceTemperature_c!.toFixed(1)} °C, chưa hiệu chỉnh hoạt độ`
              : observation.reason,
        }, ...(!lesson && observation.basis ? [{ label: 'Mốc trung tính',
          value: `pH ${neutralPhAtTemperature(observation.referenceTemperature_c ?? 25)?.toFixed(2) ?? '---'} theo nhiệt độ của mô hình` }] : [])],
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
