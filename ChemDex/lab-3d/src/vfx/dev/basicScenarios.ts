import { useAppStore } from '../../store/useAppStore';
import { effects, type EffectResult } from '../vesselEffects';

/** Shared by both developer panels. Sample replacement is explicit; other
 * scenarios apply physical inputs to the selected vessel without inventing
 * inventory, temperature, gas, precipitate, or a boiling state. */
export function runBasicPhysicalScenario(vesselId: string, scenario: number): EffectResult {
  const fail = (code: EffectResult['code'], message: string): EffectResult => ({ ok: false, vesselId, code, message });
  if (!Number.isInteger(scenario) || scenario < 1 || scenario > 8) return fail('invalid_parameter', 'Kịch bản không tồn tại.');
  const store = useAppStore.getState(), vessel = store.vessels[vesselId];
  if (!vessel) return fail('missing_vessel', 'Chọn bình đích còn tồn tại.');
  const eff = effects.forVessel(vesselId);
  if (scenario === 2 || scenario === 3 || scenario === 7) return eff.setHeatInput(scenario === 2 ? 80 : scenario === 3 ? 300 : 0);
  if (scenario === 5) return eff.ripple(0.4);
  if (scenario === 8) return eff.setEnvironment({ airSpeed_m_s: 0.8 });
  if (scenario === 1 || scenario === 6) {
    const id = store.prepareStudioWaterSample(vesselId, scenario === 1 ? 25 : 5);
    return id ? { ok: true, vesselId, code: 'ok', message: 'Đã thay mẫu nước hữu hạn trong bình đích.' }
      : fail('unsupported', useAppStore.getState().mixError ?? 'Không thể thay mẫu nước.');
  }
  const id = store.prepareStudioProgram('pbno32_ki', undefined, vesselId);
  if (!id) return fail('unsupported', useAppStore.getState().mixError ?? 'Không thể thay mẫu PbI₂.');
  const started = useAppStore.getState().runStudioProgram(id);
  return { ok: started, vesselId, code: started ? 'ok' : 'unsupported', message: started
    ? 'Đã thay mẫu và bắt đầu phản ứng tạo PbI₂ theo kho chất.' : useAppStore.getState().globalWarning ?? 'Điều kiện phản ứng chưa đủ.' };
}
