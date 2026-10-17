import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { HOT_PLATE_RECEIVERS } from '../engine/hotPlateEnergy';

export function HotPlateControls({ plateId, targetId }: { plateId: string; targetId?: string }) {
  const plate = useAppStore(state => state.vessels[plateId]);
  const vessels = useAppStore(state => state.vessels);
  const [receiverId, setReceiverId] = useState('');
  if (!plate || plate.type !== 'hot_plate') return null;
  const settings = plate.hotPlate ?? { isOn: false, setPoint_c: 100 };
  const validExternalTarget = targetId && HOT_PLATE_RECEIVERS.includes(vessels[targetId]?.type);
  const currentTarget = validExternalTarget ? targetId : receiverId;
  return <div className="space-y-2 p-3 rounded-lg border border-slate-400/30 text-xs">
    <div>Bếp: {plate.name} · Mặt bếp {plate.temperature_c.toFixed(1)} °C</div>
    <label className="flex items-center gap-2">Nhiệt độ đặt mặt bếp
      <input type="number" min={25} max={350} step={5} value={settings.setPoint_c}
        className="w-20 rounded p-1 bg-slate-500/20"
        onChange={event => useAppStore.getState().setHotPlate(plateId, { setPoint_c: Number(event.target.value) })} /> °C
    </label>
    <button className="rounded border px-3 py-1" onClick={() => useAppStore.getState().setHotPlate(plateId, { isOn: !settings.isOn })}>
      {settings.isOn ? 'Tắt điện gia nhiệt' : 'Bật điện gia nhiệt'}
    </button>
    {!validExternalTarget && <select value={receiverId} onChange={event => setReceiverId(event.target.value)} className="block max-w-full rounded bg-slate-500/20 p-1">
      <option value="">Chọn bình đặt lên bếp</option>
      {Object.values(vessels).filter(v => HOT_PLATE_RECEIVERS.includes(v.type) && !v.isShattered && !v.id.startsWith('lesson_vessel_'))
        .map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
    </select>}
    <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={!currentTarget}
      onClick={() => useAppStore.getState().placeOnHotPlate(currentTarget, plateId)}>Đặt bình lên mặt bếp</button>
    <p>Nhiệt độ đặt thuộc mặt bếp. Mẫu cần thời gian nhận nhiệt; tắt điện vẫn còn nhiệt dư.</p>
    <div className="font-mono text-[10px]">Điện {(settings.electricalEnergy_J ?? 0).toFixed(0)} J · Truyền mẫu {(settings.deliveredHeat_J ?? 0).toFixed(0)} J</div>
  </div>;
}
