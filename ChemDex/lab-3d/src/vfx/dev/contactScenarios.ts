import { useAppStore } from '../../store/useAppStore';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { aqueousBoilingPoint } from '../../engine/thermalState';

export const CONTACT_SCENARIOS = [
  { id: 'sodium_small', label: 'Na nhỏ · chạy ngẫu nhiên' },
  { id: 'sodium_large', label: 'Na lớn · nổ khi tiếp xúc' },
  { id: 'color_overflow', label: 'Pha màu · rót tràn' },
  { id: 'reactive_overflow', label: 'Bình đầy · tràn kết tủa' },
  { id: 'spill_precipitate', label: 'Đổ ra bàn · tạo kết tủa' },
  { id: 'spill_gas', label: 'Đổ ra bàn · sinh khí' },
  { id: 'spill_boiling', label: 'Vũng nóng · phản ứng/sôi' },
  { id: 'glass_break', label: 'Vỡ bình · giữ đủ lượng chất' },
  { id: 'thermal_shock', label: 'Kính nóng · nước lạnh' },
  { id: 'oxygen_foam', label: 'Bọt O₂ · thử Pause' },
  { id: 'wet_carbonate', label: 'Rắn khô · gặp axit' },
] as const;
export type ContactScenarioId = typeof CONTACT_SCENARIOS[number]['id'];

/** Quick tests call the same store operations as the lab, including progressive
 * chemistry and finite outflow. The only setup shortcut is explicit replacement
 * of the selected specimen, consistent with the other Studio presets. */
export async function runContactScenario(id: string, scenario: ContactScenarioId): Promise<string> {
  const store = useAppStore.getState(), vessel = store.vessels[id];
  if (!vessel || vessel.isShattered) return 'Chọn bình nguyên vẹn hoặc thay bình đã vỡ.';
  store.setSimulationPaused(false);
  if (scenario === 'oxygen_foam') {
    if (!store.prepareStudioProgram('h2o2_mno2', 'oxygen_foam', id)) return useAppStore.getState().mixError ?? 'Bình không phù hợp.';
    store.cleanSpills(); store.runStudioProgram(id);
    return 'O₂ được giữ trong màng bọt có chất hoạt động bề mặt; thử Pause hoặc nghiêng bình để kiểm tra.';
  }
  if (scenario === 'wet_carbonate') {
    if (!store.prepareStudioProgram('caco3_hcl', undefined, id)) return useAppStore.getState().mixError ?? 'Bình không phù hợp.';
    store.cleanSpills();
    const sample = useAppStore.getState().vessels[id], solids = sample.contents.filter(c => c.phase === 's');
    const contents = sample.contents.filter(c => c.phase !== 's'), dryMass = solids.reduce((sum, c) => sum + c.mass_g, 0);
    const position: [number, number, number] = [sample.position[0] + 0.65, -1.175, sample.position[2]];
    store.setVesselState(id, { contents, substances: contents.map(c => c.formula), mass_g: sample.mass_g - dryMass }, 'withdrawal');
    store.addSpill(position, 0, solids.map(c => c.formula), '#f8fafc', sample.name, dryMass, solids);
    store.transferLiquidContinuous(id, null, sample.volume_ml, position);
    return 'Axit đã làm ướt CaCO₃ khô trên bàn; khí CO₂ và phần rắn còn lại tính từ lượng chất thực.';
  }
  if (scenario === 'spill_precipitate' || scenario === 'spill_gas' || scenario === 'spill_boiling') {
    if (!store.prepareStudioProgram(scenario === 'spill_gas' ? 'na2co3_hcl' : 'cuso4_naoh', undefined, id))
      return useAppStore.getState().mixError ?? 'Bình không phù hợp với mẫu.';
    store.cleanSpills();
    if (scenario === 'spill_boiling') {
      const sample = useAppStore.getState().vessels[id];
      const boiling = aqueousBoilingPoint({ contents: sample.contents, volume_ml: sample.volume_ml,
        environment: useLabEnvironment.getState().conditions });
      store.setVesselState(id, { temperature_c: boiling - 0.2 });
    }
    const sample = useAppStore.getState().vessels[id];
    const receipt = store.transferLiquidContinuous(id, null, sample.volume_ml,
      [sample.position[0] + 0.65, -1.175, sample.position[2]]);
    return receipt.moved_ml > 0 ? scenario === 'spill_boiling'
      ? 'Mẫu ảo nóng gần sôi: nhiệt kết tủa đi vào nóng lên và bay hơi; nước thoát ra được trừ khỏi vũng và ghi vào khí quyển.'
      : 'Đã rót mẫu ra bàn; màu và phản ứng tiếp tục từ lượng chất đã rót.' : 'Không rót được mẫu.';
  }
  if (!store.prepareStudioWaterSample(id)) return useAppStore.getState().mixError ?? 'Bình không phù hợp.';
  store.cleanSpills();
  store.setSimulationPaused(false);
  if (scenario === 'reactive_overflow') {
    const sample = useAppStore.getState().vessels[id];
    await store.mixSubstances(id, 'CuSO4', sample.capacity_ml - sample.volume_ml);
    await store.mixSubstances(id, 'NaOH', sample.capacity_ml * 0.2);
    return 'NaOH đi vào bình CuSO₄ đầy: hỗn hợp trao đổi qua miệng bình; kết tủa xanh tiếp tục hình thành trong phần tràn và trên bàn.';
  }
  if (scenario === 'thermal_shock') {
    const sample = useAppStore.getState().vessels[id];
    store.transferLiquidContinuous(id, null, sample.volume_ml, [sample.position[0] + 0.65, -1.175, sample.position[2]]);
    store.cleanSpills();
    store.setVesselState(id, { temperature_c: 210 });
    await store.mixSubstances(id, 'H2O', 10);
    return useAppStore.getState().vessels[id].isShattered
      ? 'Nước lạnh đã chạm kính nóng: bình vỡ, liều 10 mL chuyển ra bàn. Tiêu chí sốc nhiệt là mô hình minh họa.'
      : 'Loại dụng cụ này không dùng tiêu chí sốc nhiệt của kính; thử với beaker hoặc ống nghiệm.';
  }
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
