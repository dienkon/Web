import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { condenserCoolingSettings } from '../science/condenserHeatExchange';

export function CondenserCoolingControls({ vesselId }: { vesselId: string }) {
  const vessel = useAppStore(s => s.vessels[vesselId]);
  const vi = useAppStore(s => s.language !== 'en');
  if (!vessel || vessel.type !== 'condenser') return null;
  const settings = condenserCoolingSettings(vessel.condenserCooling);
  const inputs = [
    { key: 'flow_ml_s', label: vi ? 'Lưu lượng nước (mL/s)' : 'Water flow (mL/s)', max: 100, step: 0.1 },
    { key: 'inletTemperature_c', label: vi ? 'Nước vào (°C)' : 'Inlet water (°C)', max: 90, step: 1 },
    { key: 'conductance_W_K', label: vi ? 'Truyền nhiệt áo nước UA (W/K)' : 'Coolant-jacket UA (W/K)', max: 500, step: 1 },
  ] as const;
  return <div className="space-y-2 text-xs text-cyan-900">
    {inputs.map(input => <label key={input.key} className="flex items-center justify-between gap-2">
      <span>{input.label}</span>
      <input aria-label={input.label} type="number" min={0} max={input.max} step={input.step}
        disabled={vessel.isLocked || vessel.isShattered} value={settings[input.key]}
        className="w-20 rounded border bg-white p-1"
        onChange={event => useAppStore.getState().setCondenserCooling(vesselId, { [input.key]: Number(event.target.value) })} />
    </label>)}
    <div className="text-[10px] font-mono">
      {vi ? 'Nước ra TB' : 'Mean outlet'} {Number.isFinite(vessel.coolantOutletTemperature_c) ? vessel.coolantOutletTemperature_c!.toFixed(1) : '—'} °C
      {' · '}{(vessel.condenserCoolingPower_W ?? 0).toFixed(1)} W
      <br />{vi ? 'Đã dùng' : 'Used'} {(vessel.coolantPassed_ml ?? 0).toFixed(1)} mL
      {' · '}{(vessel.coolantHeatReceived_J ?? 0).toFixed(1)} J
    </div>
    {vessel.condenserCoolingStatus === 'unsupported-receiver-phase' && <p className="text-[10px] text-amber-700">
      {vi ? 'Mẫu nhận nằm ngoài miền nước lỏng/dung dịch loãng; chưa tính trao đổi nhiệt áo nước cho mẫu này.'
        : 'Receiver is outside the liquid-water/dilute-solution range; jacket heat exchange is unavailable for this sample.'}
    </p>}
    <p className="text-[10px] text-slate-500">{vi
      ? 'Thông số mặc định là danh định, chưa hiệu chuẩn thiết bị. Mở van vẫn dùng nước khi chưa có hơi; tắt nước vẫn có thể ngưng tụ tạm thời khi sinh hàn còn lạnh.'
      : 'Defaults are nominal, not apparatus calibration. An open valve consumes water without vapor; cold glass can briefly condense vapor with coolant off.'}</p>
  </div>;
}
