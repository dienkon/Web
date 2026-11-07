import React, { useState } from 'react';
import { usePhysicsStore } from './usePhysicsStore';
import type { ReferenceExperiment } from './ReferenceExperiments';

const NAMES: Record<string, string> = { force_meter: 'Lực kế — mẫu ngập hoàn toàn', pressure_sensor: 'Áp suất — bình khí kín',
  pipette_bulb: 'Bóng hút — kho khí và nước hữu hạn', water_bath: 'Bể điều nhiệt — hai khối nhiệt', gas_collector: 'Thu khí bằng đẩy nước',
  viscosity: 'Lắng hạt cầu — độ nhớt', ice: 'Băng nước — nhiệt nóng chảy' };
function measurements(e: ReferenceExperiment): [string, number, string][] {
  const v = e.values;
  switch (e.kind) {
    case 'force_meter': return [['Lực giữ', v.reading_N, 'N'], ['Trọng lượng', v.weight_N, 'N'], ['Thể tích ngập', v.displaced_m3 * 1e6, 'mL']];
    case 'pressure_sensor': return [['Áp suất tuyệt đối', v.pressure_Pa / 1000, 'kPa'], ['Nhiệt độ', v.temperature_K - 273.15, '°C']];
    case 'pipette_bulb': return [['Nước trong pipet', v.sample_m3 * 1e6, 'mL'], ['Nước ở nguồn', v.source_m3 * 1e6, 'mL'], ['Áp suất khí', v.pressure_Pa / 1000, 'kPa']];
    case 'water_bath': return [['Nước bể', v.bath_K - 273.15, '°C'], ['Mẫu', v.sample_K - 273.15, '°C'], ['Điện năng', v.electrical_J, 'J']];
    case 'gas_collector': return [['Khí thu được', v.gasVolume_m3 * 1e6, 'mL'], ['Nước trong bình', v.jarWater_m3 * 1e6, 'mL'], ['Khí còn ở nguồn', v.source_mol * 1000, 'mmol']];
    case 'viscosity': return [['Vận tốc lắng', v.velocity_m_s * 1e6, 'µm/s'], ['Quãng lắng', v.displacement_m * 1000, 'mm'], ['Reynolds', v.reynolds ?? 0, '']];
    case 'ice': return [['Nhiệt độ', v.temperature_K - 273.15, '°C'], ['Băng còn lại', v.solid_kg * 1000, 'g'], ['Nhiệt đã cấp', v.supplied_J, 'J']];
  }
}
export function ReferenceMeasurements() {
  const snapshot = usePhysicsStore(s => s.snapshot), start = usePhysicsStore(s => s.startExperiment);
  const enabled = usePhysicsStore(s => s.enabled);
  const [material, setMaterial] = useState('aluminum'), [liquid, setLiquid] = useState('water'), [temperature, setTemperature] = useState(20);
  const experiments = snapshot?.experiments ?? [];
  return <section className="mt-5 border-t pt-4">
    <h3 className="font-semibold">Bàn kiểm chứng định lượng</h3>
    <p className="text-xs mt-1 text-slate-600">Các phép đo dùng mẫu riêng với điều kiện được kiểm soát. Đồng hồ tạm dừng và tốc độ dùng chung với lab.</p>
    <div className="flex flex-wrap gap-2 items-center mt-3 text-xs">
      <label>Mẫu <select aria-label="Vật liệu lực kế" value={material} onChange={e => setMaterial(e.target.value)} className="border rounded p-1 ml-1">
        <option value="aluminum">Nhôm</option><option value="steel">Thép</option><option value="polyethylene">Polyethylene</option><option value="borosilicate">Thủy tinh</option></select></label>
      <label>Chất lỏng <select aria-label="Chất lỏng tham chiếu" value={liquid} onChange={e => setLiquid(e.target.value)} className="border rounded p-1 ml-1">
        <option value="water">Nước</option><option value="glycerol">Glycerol</option><option value="silicone_oil">Dầu silicone 100 cSt</option></select></label>
      <button disabled={!enabled} className="border rounded p-2 disabled:opacity-40" onClick={() => start('force_meter', { material, liquid })}>Đo lực giữ</button>
      <button disabled={!enabled} className="border rounded p-2 disabled:opacity-40" onClick={() => start('viscosity', { liquid })}>Đo vận tốc lắng</button>
    </div>
    <label className="block mt-3 text-xs">Nhiệt độ bình khí: {temperature} °C
      <input aria-label="Nhiệt độ khí" type="range" min="0" max="100" value={temperature}
        onChange={e => { const value = Number(e.target.value); setTemperature(value); if (enabled) start('pressure_sensor', { temperature_K: value + 273.15 }); }} className="block w-full mt-1" />
    </label>
    <div className="grid sm:grid-cols-2 gap-2 mt-3">{experiments.map(e => <article key={e.id} className="bg-slate-50 border rounded-lg p-3" data-experiment={e.kind}>
      <h4 className="text-xs font-semibold">{NAMES[e.kind]}{e.kind === 'viscosity' ? ` · ${e.parameters.liquid}` : ''}</h4>
      <dl className="mt-2 space-y-1">{measurements(e).map(([name, value, unit]) => <div key={name} className="flex justify-between gap-2 text-xs">
        <dt>{name}</dt><dd className="font-mono tabular-nums" data-metric={name}>{Number.isFinite(value) ? value.toFixed(Math.abs(value) < 1 ? 6 : 3) : '—'} {unit}</dd>
      </div>)}</dl>
      <p className="text-[11px] text-slate-500 mt-2">{e.time_s.toFixed(2)} s · mô hình tham chiếu, chưa hiệu chuẩn thiết bị</p>
    </article>)}</div>
    {experiments.length > 0 && <p className="text-xs text-slate-500 mt-2">Bóng hút: khí đẳng nhiệt, dòng nhớt; bể: hệ số trao đổi nhiệt ước lượng; thu khí: khí lí tưởng không tan, độ ngập cố định 2 cm; lực kế: mẫu đứng yên; phép lắng: hạt cầu trong miền Stokes.</p>}
  </section>;
}
