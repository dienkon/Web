import React, { useMemo } from 'react';
import type { VesselState } from '../types/chemistry';
import { copperAmmoniaEquilibrium } from '../science/copperAmmoniaEquilibrium';

/** The same read-only ionic view is used by manual and automatic inspectors.
 * Analytical salt pools in the material ledger are not literal free species. */
export function CopperAmmoniaReadout({ vessel, language = 'vi' }: { vessel: VesselState; language?: 'en' | 'vi' }) {
  const model = useMemo(() => copperAmmoniaEquilibrium(vessel.contents, vessel.volume_ml, vessel.temperature_c, true),
    [vessel.contents, vessel.volume_ml, vessel.temperature_c]);
  if (!model) return null;
  const t = (en: string, vi: string) => language === 'en' ? en : vi;
  const { inventory, state } = model, total_M = inventory.copper_mol / inventory.liters;
  const rows = [
    { key: 'solid', label: 'Cu(OH)₂ (s)', amount_M: inventory.solid_mol / inventory.liters },
    { key: 'unbound', label: t('Cu(II) without NH₃', 'Cu(II) không gắn NH₃'),
      amount_M: state.freeCopper_M + state.hydrolyzedCopper_M + state.copperSulfatePair_M },
    ...state.ammines_M.map((c, i) => ({ key: `ammine-${i + 1}`, label: `[Cu(NH₃)${['', '₂', '₃', '₄'][i]}]²⁺`, amount_M: c })),
    ...state.hydroxoAmmines_M.map((c, i) => ({ key: `mixed-${i + 1}`,
      label: ['Cu(NH₃)OH⁺', 'Cu(NH₃)₂(OH)₂', 'Cu(NH₃)₃OH⁺'][i], amount_M: c })),
  ];
  const percentage = (value: number) => value > 0 && value < 0.0001 ? '<0.01%' : `${(value * 100).toFixed(2)}%`;
  const fractionSum = rows.reduce((sum, r) => sum + r.amount_M / total_M, 0);
  return <details className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-[11px]" data-copper-speciation
    data-copper-mol={inventory.copper_mol} data-fraction-sum={fractionSum}>
    <summary className="cursor-pointer font-semibold text-sky-800">{t('Estimated Cu(II) distribution', 'Phân bố Cu(II) ước tính')}</summary>
    <p className="mt-2 leading-relaxed text-slate-500">{t('Fractions of total copper, including solid. Salt formulas in the inventory are analytical amounts.',
      'Tỉ lệ theo tổng đồng, gồm cả chất rắn. Công thức muối trong kiểm kê là lượng quy đổi.')}</p>
    <dl className="mt-2 space-y-1.5">{rows.map(row => <div key={row.key} className="flex items-start justify-between gap-2"
      data-copper-species={row.key} data-fraction={row.amount_M / total_M}>
      <dt className="min-w-0 break-words text-slate-700">{row.label}</dt>
      <dd className="shrink-0 font-mono tabular-nums text-sky-900">{percentage(row.amount_M / total_M)}</dd>
    </div>)}</dl>
    <p className="mt-3 border-t border-sky-100 pt-2 text-slate-600">NH₃ {t('free', 'tự do')}: <span className="font-mono">{state.freeAmmonia_M.toPrecision(3)} M</span></p>
    <p className="mt-2 leading-relaxed text-slate-500">{t('Ideal concentrations; temperature parameters for mixed complexes are estimates.',
      'Ước tính theo nồng độ lý tưởng; tham số nhiệt của phức hỗn hợp còn là giá trị ước lượng.')}</p>
  </details>;
}
