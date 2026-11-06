import { useAppStore } from '../../store/useAppStore';

export const CONTACT_SCENARIOS = [
  { id: 'sodium_small', label: 'Na nhỏ · chạy ngẫu nhiên' },
  { id: 'sodium_large', label: 'Na lớn · nổ khi tiếp xúc' },
  { id: 'color_overflow', label: 'Pha màu · rót tràn' },
  { id: 'spill_precipitate', label: 'Đổ ra bàn · tạo kết tủa' },
  { id: 'spill_gas', label: 'Đổ ra bàn · sinh khí' },
  { id: 'glass_break', label: 'Vỡ bình · giữ đủ lượng chất' },
] as const;
export type ContactScenarioId = typeof CONTACT_SCENARIOS[number]['id'];

/** Quick tests call the same store operations as the lab, including progressive
 * chemistry and finite outflow. The only setup shortcut is explicit replacement
 * of the selected specimen, consistent with the other Studio presets. */
export async function runContactScenario(id: string, scenario: ContactScenarioId): Promise<string> {
  const store = useAppStore.getState(), vessel = store.vessels[id];
  if (!vessel || vessel.isShattered) return 'Chọn bình nguyên vẹn hoặc thay bình đã vỡ.';
  store.setSimulationPaused(false);
  if (scenario === 'spill_precipitate' || scenario === 'spill_gas') {
    if (!store.prepareStudioProgram(scenario === 'spill_precipitate' ? 'cuso4_naoh' : 'na2co3_hcl', undefined, id))
      return useAppStore.getState().mixError ?? 'Bình không phù hợp với mẫu.';
    store.cleanSpills();
    const sample = useAppStore.getState().vessels[id];
    const receipt = store.transferLiquidContinuous(id, null, sample.volume_ml,
      [sample.position[0] + 0.65, -1.175, sample.position[2]]);
    return receipt.moved_ml > 0 ? 'Đã rót mẫu ra bàn; màu và phản ứng tiếp tục từ lượng chất đã rót.' : 'Không rót được mẫu.';
  }
  if (!store.prepareStudioWaterSample(id)) return useAppStore.getState().mixError ?? 'Bình không phù hợp.';
  store.cleanSpills();
  store.setSimulationPaused(false);
  if (scenario === 'glass_break') {
    await store.mixSubstances(id, 'CuSO4', 10);
    store.shatterVessel(id, 'Mechanical impact (Studio test)');
    return 'Bình đã vỡ; dung dịch và chất rắn được chuyển ra bàn một lần.';
  }
  if (scenario === 'color_overflow') {
    const capacity = useAppStore.getState().vessels[id].capacity_ml;
    await store.mixSubstances(id, 'CuSO4', capacity * 0.4);
    await store.mixSubstances(id, 'KMnO4', capacity * 0.4);
    return 'Đang pha màu và tràn: theo dõi dung dịch, dòng chảy và vũng trên bàn.';
  }
  await store.mixSubstances(id, 'Na', scenario === 'sodium_large' ? 0.8 : 0.1);
  return scenario === 'sodium_large'
    ? 'Mẫu Na lớn: mô hình tiếp xúc dữ dội, nổ và vỡ bình khi phản ứng bắt đầu.'
    : 'Mẫu Na nhỏ: nổi, chạy ngẫu nhiên, nóng chảy và sinh H₂; NaOH không màu khi chưa có chỉ thị.';
}
