import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { readWorkbenchInventory, useWorkbenchInventoryReference, workbenchInventoryCSV } from '../handling/workbenchInventory';
import { useAppStore } from '../store/useAppStore';
import { downloadText } from '../utils/downloadText';
import { uiText } from '../utils/uiText';

const LABELS = {
  vessels: { en: 'In vessels', vi: 'Trong bình' },
  condensation: { en: 'Wall condensate', vi: uiText('Nước ngưng trên thành bình') },
  pipette: { en: 'In pipette', vi: 'Trong pipet' },
  burette: { en: 'In burette', vi: 'Trong buret' },
  spatula: { en: 'On spatula', vi: 'Trên thìa xúc' },
  inFlight: { en: 'In transit', vi: 'Đang chuyển giữa các bình' },
  spilled: { en: 'Spilled on bench', vi: 'Tràn trên bàn' },
  waste: { en: 'Collected waste', vi: 'Chất thải đã thu gom' },
};
const massKeys = Object.keys(LABELS) as (keyof typeof LABELS)[];
const BUTTON = 'rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40';

export default function WorkbenchInventoryPanel() {
  const state = useAppStore(useShallow(state => ({
    vessels: state.vessels, inFlightPours: state.inFlightPours, spills: state.spills,
    wasteMass_g: state.wasteMass_g, workbenchEscapedGas_g: state.workbenchEscapedGas_g,
    pipetteSample: state.pipetteSample, burette: state.burette, spatulaState: state.spatulaState,
    dosePending: !!state.pouringChemical || state.stockDosePending || state.isMixing,
    epoch: state.pourEpoch, language: state.language,
  })));
  const { language } = state;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const inventory = readWorkbenchInventory(state);
  const reference = useWorkbenchInventoryReference(state => state.reference);
  const baseline = reference?.epoch === state.epoch ? reference.snapshot : null;
  const grams = new Intl.NumberFormat(language, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const difference = new Intl.NumberFormat(language, {
    minimumFractionDigits: 3, maximumFractionDigits: 3, signDisplay: 'exceptZero',
  });
  const heldVessels = inventory.contents.filter(vessel => vessel.held_g + vessel.condensed_g > 0);
  const canCompare = baseline && !state.dosePending && !inventory.buretteMassUnavailable;

  return <section aria-label={t('Workbench inventory', 'Theo dõi khối lượng')} className="min-w-0 space-y-3 text-xs">
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} disabled={state.dosePending || inventory.buretteMassUnavailable}
        onClick={() => {
          const live = useAppStore.getState();
          if (live.pouringChemical || live.stockDosePending || live.isMixing) return;
          const snapshot = readWorkbenchInventory(live);
          if (!snapshot.buretteMassUnavailable) {
            useWorkbenchInventoryReference.setState({ reference: { epoch: live.pourEpoch, snapshot } });
          }
        }}>{baseline ? t('Update baseline', 'Đặt lại mốc so sánh') : t('Set baseline', 'Đặt mốc so sánh')}</button>
      {reference && <button type="button" className={BUTTON}
        onClick={() => useWorkbenchInventoryReference.setState({ reference: null })}>{t('Clear baseline', 'Bỏ mốc')}</button>}
      <button type="button" className={BUTTON} disabled={state.dosePending}
        onClick={() => downloadText('chemdex-khoi-luong.csv', workbenchInventoryCSV(inventory, canCompare ? baseline : null),
          'text/csv;charset=utf-8')}>{t('Download CSV', 'Tải CSV')}</button>
    </div>
    {reference && !baseline && <p role="status" className="text-amber-800">
      {t('The workbench changed. Set a new baseline.', 'Bàn đã đổi trạng thái. Hãy đặt mốc mới.')}
    </p>}
    {state.dosePending && <p role="status" className="text-slate-600">
      {t('Wait for the reagent dose to finish before comparing.', 'Đợi cấp hóa chất xong để so sánh.')}
    </p>}
    <table className="w-full border-collapse text-left">
      <thead className="border-b text-slate-600">
        <tr>
          <th scope="col" className="pb-1.5 font-medium">{t('Location', 'Vị trí')}</th>
          <th scope="col" className="pb-1.5 text-right font-medium">{t('Mass (g)', 'Khối lượng (g)')}</th>
          {canCompare && <th scope="col" className="pb-1.5 pl-2 text-right font-medium">Δ (g)</th>}
        </tr>
      </thead>
      <tbody>
        {massKeys.map(key => <tr key={key} className="border-b border-slate-100">
          <th scope="row" className="py-1.5 pr-1 font-normal">{LABELS[key][language]}</th>
          <td className="text-right font-mono">{key === 'burette' && inventory.buretteMassUnavailable
            ? '—' : grams.format(inventory.masses[key])}</td>
          {canCompare && <td className="pl-2 text-right font-mono">
            {difference.format(inventory.masses[key] - baseline.masses[key])}
          </td>}
        </tr>)}
      </tbody>
      <tfoot>
        <tr className="bg-slate-50 font-semibold">
          <th scope="row" className="py-2 pr-1">{t('On-bench subtotal', 'Tổng ghi nhận trên bàn')}</th>
          <td className="text-right font-mono">{grams.format(inventory.total_g)}</td>
          {canCompare && <td className="pl-2 text-right font-mono">{difference.format(inventory.total_g - baseline.total_g)}</td>}
        </tr>
        <tr className="text-slate-700">
          <th scope="row" className="py-2 pr-1 font-normal">{t('Recorded exhaust', 'Khí và hơi đã thoát')}</th>
          <td className="text-right font-mono">{grams.format(inventory.escaped_g)}</td>
          {canCompare && <td className="pl-2 text-right font-mono">{difference.format(inventory.escaped_g - baseline.escaped_g)}</td>}
        </tr>
      </tfoot>
    </table>
    {heldVessels.length > 0 && <details className="rounded-lg border border-slate-200 p-2">
      <summary className="cursor-pointer font-semibold">{t('By vessel, including condensate', uiText('Theo từng bình, gồm cả nước ngưng'))}</summary>
      <ul className="mt-2 space-y-1">
        {heldVessels.map(vessel => <li key={vessel.id} className="flex justify-between gap-2">
          <span className="min-w-0 break-words">{vessel.name}</span>
          <span className="shrink-0 font-mono">{grams.format(vessel.held_g + vessel.condensed_g)} g</span>
        </li>)}
      </ul>
    </details>}
    <p className="text-slate-500">{t(
      'Totals cover tracked material. Transfers to storage and exchange with the room can change them.',
      'Tổng tính vật chất đang theo dõi. Thêm, cất mẫu hoặc trao đổi với môi trường có thể làm tổng thay đổi.',
    )}</p>
  </section>;
}
