import React from 'react';
import { useAppStore } from '../store/useAppStore';
import type { VesselState } from '../types/chemistry';

export function FunnelFlowControls({ vessel }: { vessel: VesselState }) {
  const vessels = useAppStore(state => state.vessels);
  const setVesselState = useAppStore(state => state.setVesselState);
  const recover = useAppStore(state => state.recoverFilterResidue);
  const containers = Object.values(vessels).filter(item => item.id !== vessel.id && item.capacity_ml > 0
    && !item.isSealed && !item.isShattered && !item.id.startsWith('lesson_vessel_')
    && ['beaker', 'flask', 'test_tube', 'cylinder', 'watch_glass', 'petri_dish', 'crucible', 'evaporating_dish'].includes(item.type));
  return <div className="rounded border border-slate-200 bg-white p-2 space-y-2 text-xs">
    <label className="block">Bình hứng dịch
      <select aria-label="Bình hứng dịch từ phễu" className="mt-1 w-full rounded border p-1"
        value={vessel.flowReceiverId ?? ''} onChange={event => setVesselState(vessel.id, { flowReceiverId: event.target.value || undefined })}>
        <option value="">Tự tìm bình ngay phía dưới</option>
        {containers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <p className="text-[10px] text-slate-600">Đặt bình thấp hơn và căn bên dưới phễu. Dịch không vào được bình hứng hoặc phần vượt sức chứa sẽ rơi ra bàn.</p>
    {vessel.isSealed && <p className="text-amber-800">Tháo nút đậy trước khi xả để không khí vào thay chỗ chất lỏng.</p>}
    {vessel.flowStatus && <p aria-live="polite" className="text-[10px] text-slate-700">{vessel.flowStatus}</p>}
    {vessel.type === 'filter_funnel' && <>
      <p className="text-[10px] text-slate-600">Giấy lọc lý tưởng; chưa xét keo và hạt siêu nhỏ. Tốc độ dòng chảy là minh họa.</p>
      <label className="block">Bình nhận cặn thu hồi
        <select aria-label="Bình nhận cặn giấy lọc" className="mt-1 w-full rounded border p-1"
          value={vessel.residueReceiverId ?? ''} onChange={event => setVesselState(vessel.id, { residueReceiverId: event.target.value || undefined })}>
          <option value="">Chọn kính đồng hồ hoặc bình chứa</option>
          {containers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button className="w-full rounded bg-amber-700 p-2 text-white disabled:opacity-40"
        disabled={!containers.some(item => item.id === vessel.residueReceiverId) || !(vessel.filterPaperResidue_g! > 0)}
        onClick={() => vessel.residueReceiverId && recover(vessel.id, vessel.residueReceiverId)}>Thu hồi cặn trên giấy lọc</button>
    </>}
  </div>;
}
