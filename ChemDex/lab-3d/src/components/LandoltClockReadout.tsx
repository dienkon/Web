import React, { useMemo } from 'react';
import type { VesselState } from '../types/chemistry';
import { landoltInventory, landoltSpeciation } from '../science/landoltClock';

export function LandoltClockReadout({ vessel, language = 'vi' }: { vessel: VesselState; language?: 'vi' | 'en' }) {
  const model = useMemo(() => {
    const t = landoltInventory(vessel.contents, vessel.volume_ml);
    return t ? { inventory: t, state: landoltSpeciation(t) } : null;
  }, [vessel.contents, vessel.volume_ml]);
  if (!model) return null;
  const vi = language === 'vi', { inventory: t, state: s } = model;
  const rows = [['iodate', 'IO₃⁻', t.iodate], ['sulfite', vi ? 'Tổng S(IV)' : 'Total S(IV)', t.sulfite],
    ['iodide', vi ? 'Iodide (gồm I₃⁻)' : 'Iodide (including I₃⁻)', t.iodide],
    ['iodine', vi ? 'I₂ quy đổi (gồm I₃⁻)' : 'I₂ equivalent (including I₃⁻)', t.iodine]] as const;
  return <details className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-[11px]" data-landolt-clock>
    <summary className="cursor-pointer font-semibold text-indigo-800">{vi ? 'Đồng hồ iốt · lượng chất đang có' : 'Iodine clock · current inventory'}</summary>
    <dl className="mt-3 space-y-2">{rows.map(([key, label, mol]) => <div className="flex justify-between gap-2" key={key}
      data-landolt-species={key} data-moles={mol}><dt>{label}</dt><dd className="font-mono">{(mol * 1000).toPrecision(4)} mmol</dd></div>)}</dl>
    <p className="mt-3 border-t border-indigo-100 pt-2">pH: <span className="font-mono">{s.ph.toFixed(2)}</span></p>
    <p className="mt-2 leading-relaxed text-slate-500">{vi
      ? 'Mô hình đồng nhất, hằng số tham chiếu 25 °C. Màu tinh bột là minh họa; chưa hiệu chỉnh nhiệt độ, oxy và nhiệt phản ứng.'
      : 'Homogeneous model with 25 C reference constants. Starch color is illustrative; temperature, oxygen and reaction heat are not calibrated.'}</p>
  </details>;
}
