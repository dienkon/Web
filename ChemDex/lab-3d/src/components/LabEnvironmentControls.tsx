import React from 'react';
import { useLabEnvironment } from '../store/useLabEnvironment';
import { useAppStore } from '../store/useAppStore';
import { waterBoilingPointAtPressure } from '../science/labEnvironment';

export function LabEnvironmentControls() {
  const { conditions, setConditions } = useLabEnvironment();
  const vi = useAppStore(state => state.language === 'vi');
  return <details className="relative text-xs text-slate-700">
    <summary className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1.5" title={vi ? 'Điều kiện phòng thí nghiệm' : 'Laboratory conditions'}>
      {conditions.temperature_c} °C · {conditions.pressure_atm.toFixed(2)} atm
    </summary>
    <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl space-y-3">
      <p className="font-semibold">{vi ? 'Môi trường phòng thí nghiệm' : 'Laboratory environment'}</p>
      <label className="block">{vi ? 'Nhiệt độ phòng' : 'Room temperature'}: {conditions.temperature_c} °C
        <input className="block w-full" aria-label="Room temperature" type="range" min="10" max="40" step="1" value={conditions.temperature_c}
          onChange={event => setConditions({ temperature_c: Number(event.target.value) })} />
      </label>
      <label className="block">{vi ? 'Áp suất khí quyển' : 'Atmospheric pressure'}: {conditions.pressure_atm.toFixed(2)} atm
        <input className="block w-full" aria-label="Atmospheric pressure" type="range" min="0.6" max="1.2" step="0.01" value={conditions.pressure_atm}
          onChange={event => setConditions({ pressure_atm: Number(event.target.value) })} />
      </label>
      <label className="block">{vi ? 'Khí quyển' : 'Atmosphere'}
        <select className="block w-full rounded border p-1" aria-label="Atmosphere" value={conditions.oxygenFraction === 0 ? 'inert' : 'air'}
          onChange={event => setConditions({ oxygenFraction: event.target.value === 'inert' ? 0 : 0.2095 })}>
          <option value="air">{vi ? 'Không khí · O₂ 20,95%' : 'Air · O₂ 20.95%'}</option>
          <option value="inert">{vi ? 'Khí trơ · O₂ 0%' : 'Inert · O₂ 0%'}</option>
        </select>
      </label>
      <label className="block">{vi ? 'Tốc độ không khí' : 'Air speed'}: {conditions.airSpeed_m_s.toFixed(1)} m/s
        <input className="block w-full" aria-label="Air speed" type="range" min="0" max="1" step="0.1" value={conditions.airSpeed_m_s}
          onChange={event => setConditions({ airSpeed_m_s: Number(event.target.value) })} />
      </label>
      <label className="block">{vi ? 'Độ ẩm tương đối' : 'Relative humidity'}: {Math.round((conditions.relativeHumidity ?? 0.5) * 100)}%
        <input className="block w-full" aria-label="Relative humidity" type="range" min="0" max="1" step="0.05" value={conditions.relativeHumidity ?? 0.5}
          onChange={event => setConditions({ relativeHumidity: Number(event.target.value) })} />
      </label>
      <p className="text-slate-500">{vi ? 'Nước tinh khiết sôi xấp xỉ' : 'Pure water boils near'} {waterBoilingPointAtPressure(conditions.pressure_atm).toFixed(1)} °C.</p>
      <p className="text-slate-500">{vi ? 'O₂ chi phối cháy Na/H₂; Na vẫn phản ứng với nước trong khí trơ. Thay đổi nhiệt độ phòng làm mẫu nguội hoặc ấm dần.' : 'O₂ controls Na/H₂ combustion; sodium still reacts with water in inert gas. Samples approach room temperature gradually.'}</p>
    </div>
  </details>;
}
