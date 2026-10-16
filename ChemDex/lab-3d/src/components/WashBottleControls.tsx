import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { canReceivePour } from '../engine/decantTransfer';
import type { VesselState } from '../types/chemistry';

export function WashBottleControls({ vessel }: { vessel: VesselState }) {
  const vessels = useAppStore(state => state.vessels);
  const language = useAppStore(state => state.language);
  const setVesselState = useAppStore(state => state.setVesselState);
  const squirt = useAppStore(state => state.squirtWashBottle);
  const t = (en: string, vi: string) => language === 'vi' ? vi : en;
  const receivers = Object.values(vessels).filter(item => item.id !== vessel.id
    && !item.id.startsWith('lesson_vessel_') && canReceivePour(item));
  const dose = vessel.washDose_ml ?? 5;
  const unavailableTarget = !!vessel.washTargetId && !receivers.some(item => item.id === vessel.washTargetId);
  return <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
    <div className="flex justify-between font-bold">
      <span>{t('Wash bottle', 'Bình tia')}</span>
      <span>{vessel.volume_ml.toFixed(1)} / {vessel.capacity_ml} mL</span>
    </div>
    <label className="block">{t('Rinse into', 'Tia vào')}
      <select aria-label={t('Wash bottle receiver', 'Bình nhận nước tia')}
        className="mt-1 w-full rounded border p-1" value={vessel.washTargetId ?? ''}
        onChange={event => setVesselState(vessel.id, { washTargetId: event.target.value || null })}>
        <option value="">{t('Workbench (uncollected)', 'Ra bàn (không hứng)')}</option>
        {unavailableTarget && <option value={vessel.washTargetId!}>{t('Receiver unavailable', 'Bình nhận không khả dụng')}</option>}
        {receivers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <label className="block">{t('Volume per squeeze (mL)', 'Thể tích mỗi lần tia (mL)')}
      <input aria-label={t('Rinse volume', 'Thể tích tia')} className="mt-1 w-full rounded border p-1"
        type="number" min={0.1} max={25} step={0.1} value={dose}
        onChange={event => {
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next) && next >= 0.1 && next <= 25) setVesselState(vessel.id, { washDose_ml: next });
        }} />
    </label>
    <button onClick={() => squirt(vessel.id)}
      disabled={vessel.volume_ml <= 0 || vessel.isShattered || vessel.isSealed || unavailableTarget}
      className="w-full rounded bg-sky-700 p-2 font-bold text-white disabled:opacity-40">
      {t('Dispense', 'Tia')} {Math.min(dose, vessel.volume_ml).toFixed(1)} mL
    </button>
    <p className="text-[10px] text-slate-600">{t(
      'Adds the actual bottle contents. Overflow reaches the bench; rinsing does not guarantee removal of insoluble deposits.',
      'Tia phần dung dịch đang có trong bình. Phần tràn rơi ra bàn; tia nước không bảo đảm loại hết cặn không tan.',
    )}</p>
  </div>;
}
