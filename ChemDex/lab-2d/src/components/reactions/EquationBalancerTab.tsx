import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Flame, Scale, Sparkles, AlertCircle } from 'lucide-react';
import {
  balanceChemicalEquation,
  calculateStoichiometry,
  StoichReactantInput,
} from '../../chemistry/core/equationBalancer';
import { formatFormulaUnicode } from '../../chemistry/core/formula';

interface EquationBalancerTabProps {
  initialEquation?: string;
  vi: boolean;
  isDark: boolean;
}

const BALANCER_EXAMPLES = [
  'KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O',
  'FeS2 + O2 -> Fe2O3 + SO2',
  'Cu + HNO3 -> Cu(NO3)2 + NO + H2O',
  'MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O',
  'Zn(s) + HCl(aq) -> ZnCl2(aq) + H2(g)',
];

function createDefaultInputs(count: number): StoichReactantInput[] {
  return Array.from({ length: count }, (_, idx) =>
    idx === 0 ? { mode: 'mass_g', mass_g: 10 } : { mode: 'moles', moles: 0 }
  );
}

export const EquationBalancerTab: React.FC<EquationBalancerTabProps> = ({
  initialEquation,
  vi,
  isDark,
}) => {
  const [equationInput, setEquationInput] = useState<string>(
    initialEquation?.trim() || 'KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O'
  );
  const [reactantInputs, setReactantInputs] = useState<StoichReactantInput[]>(() =>
    createDefaultInputs(2)
  );
  const [assumeSingleExcess, setAssumeSingleExcess] = useState<boolean>(true);

  useEffect(() => {
    if (initialEquation?.trim()) {
      setEquationInput(initialEquation.trim());
    }
  }, [initialEquation]);

  const balanced = useMemo(
    () => balanceChemicalEquation(equationInput),
    [equationInput]
  );

  // Synchronize input row count whenever balanced reactant count changes
  useEffect(() => {
    if (!balanced.ok) return;
    setReactantInputs((prev) =>
      balanced.reactants.map((_, i) => prev[i] ?? { mode: 'mass_g', mass_g: i === 0 ? 10 : 0 })
    );
  }, [balanced.ok, balanced.ok ? balanced.reactants.length : 0]);

  const stoichiometry = useMemo(() => {
    if (!balanced.ok) return null;
    return calculateStoichiometry(balanced, reactantInputs, assumeSingleExcess);
  }, [balanced, reactantInputs, assumeSingleExcess]);

  const cardCls = isDark
    ? 'bg-slate-800/70 border-slate-700 text-slate-100'
    : 'bg-slate-50 border-slate-200 text-slate-800';
  const inputCls = isDark
    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  const updateInput = (idx: number, patch: Partial<StoichReactantInput>) => {
    setReactantInputs((prev) => {
      const next = [...prev];
      next[idx] = { ...(next[idx] ?? { mode: 'mass_g', mass_g: 0 }), ...patch };
      return next;
    });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4">
      {/* Input Box & Quick Presets */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${cardCls}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-extrabold">
              {vi
                ? 'Cân bằng phương trình đại số chính xác (RREF) & Tính theo PTHH'
                : 'Exact Rational Equation Balancer (RREF) & Stoichiometry'}
            </h3>
          </div>
          <span className="text-[11px] opacity-70">
            {vi ? 'Hỗ trợ cả phân tử, phức chất & phương trình ion thu gọn' : 'Supports molecular, hydrates & net ionic equations'}
          </span>
        </div>

        <input
          type="text"
          value={equationInput}
          onChange={(e) => setEquationInput(e.target.value)}
          placeholder="Fe + HNO3 -> Fe(NO3)3 + NO + H2O"
          aria-label={vi ? 'Nhập phương trình hóa học cần cân bằng' : 'Enter chemical equation to balance'}
          className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs sm:text-sm font-semibold ${inputCls}`}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold opacity-70 mr-1">
            {vi ? 'Ví dụ:' : 'Examples:'}
          </span>
          {BALANCER_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setEquationInput(ex)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 bg-slate-900/70 hover:bg-slate-700 text-sky-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-blue-700'
              }`}
            >
              {ex.split('->')[0].trim()} → ...
            </button>
          ))}
        </div>
      </div>

      {/* Balanced Output */}
      {!balanced.ok ? (
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{vi ? balanced.error_vi : balanced.error_en}</span>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {vi ? 'Phương trình đã cân bằng chính xác' : 'Balanced Equation'}
              </span>
              <span className="text-[11px] font-mono opacity-80">
                {vi ? 'Bảo toàn:' : 'Conserved:'} {balanced.elementsConserved.join(', ')}
                {balanced.isIonic ? (vi ? ' & Điện tích' : ' & Charge') : ''}
              </span>
            </div>

            <div className="font-mono text-sm sm:text-base font-bold leading-relaxed flex flex-wrap items-center gap-1.5">
              {balanced.reactants.map((r, i) => (
                <React.Fragment key={`${r.raw}-${i}`}>
                  <span className="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">
                    {r.coefficient > 1 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {r.coefficient}
                      </span>
                    )}
                    <span>{formatFormulaUnicode(r.displayFormula)}</span>
                  </span>
                  {i < balanced.reactants.length - 1 && <span className="opacity-60">+</span>}
                </React.Fragment>
              ))}
              <span className="px-1.5 text-emerald-600 font-black">→</span>
              {balanced.products.map((p, i) => (
                <React.Fragment key={`${p.raw}-${i}`}>
                  <span className="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10">
                    {p.coefficient > 1 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {p.coefficient}
                      </span>
                    )}
                    <span>{formatFormulaUnicode(p.displayFormula)}</span>
                  </span>
                  {i < balanced.products.length - 1 && <span className="opacity-60">+</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Stoichiometry & Limiting Reagent Calculator */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${cardCls}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs sm:text-sm font-extrabold">
                  {vi ? 'Tính lượng chất & Tìm chất hết / dư' : 'Limiting Reagent & Theoretical Yield Calculator'}
                </h4>
              </div>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={assumeSingleExcess}
                  onChange={(e) => setAssumeSingleExcess(e.target.checked)}
                  className="accent-emerald-600"
                />
                <span>
                  {vi
                    ? 'Tự coi các chất bỏ trống (= 0) là lấy dư'
                    : 'Treat omitted reactants (= 0) as excess'}
                </span>
              </label>
            </div>

            {/* Reactant Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {balanced.reactants.map((r, idx) => {
                const inp = reactantInputs[idx] ?? { mode: 'mass_g', mass_g: 0 };
                const outcome = stoichiometry?.ok ? stoichiometry.reactants[idx] : undefined;
                return (
                  <div
                    key={`${r.raw}-${idx}`}
                    className={`p-3 rounded-xl border space-y-2 ${
                      outcome?.isLimiting
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : isDark
                          ? 'border-slate-700 bg-slate-900/50'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-xs font-bold flex items-center gap-1.5">
                        <span className="text-emerald-600">{r.coefficient}</span>
                        <span>{formatFormulaUnicode(r.displayFormula)}</span>
                        <span className="text-[10.5px] opacity-60">
                          (M = {r.molarMass_g_mol.toFixed(2)})
                        </span>
                      </div>
                      {outcome?.isLimiting && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          <Flame className="w-3 h-3" /> {vi ? 'Chất hết' : 'Limiting'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <select
                        value={inp.mode}
                        onChange={(e) =>
                          updateInput(idx, {
                            mode: e.target.value as StoichReactantInput['mode'],
                          })
                        }
                        className={`px-2 py-1.5 rounded-lg border font-semibold ${inputCls}`}
                      >
                        <option value="mass_g">{vi ? 'Khối lượng (g)' : 'Mass (g)'}</option>
                        <option value="moles">{vi ? 'Số mol (mol)' : 'Moles (mol)'}</option>
                        <option value="solution">{vi ? 'Dung dịch (mL, M)' : 'Solution (mL, M)'}</option>
                      </select>

                      {inp.mode === 'mass_g' && (
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={inp.mass_g ?? 0}
                          onChange={(e) => updateInput(idx, { mass_g: Math.max(0, Number(e.target.value) || 0) })}
                          className={`w-24 px-2 py-1.5 rounded-lg border font-mono ${inputCls}`}
                        />
                      )}
                      {inp.mode === 'moles' && (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inp.moles ?? 0}
                          onChange={(e) => updateInput(idx, { moles: Math.max(0, Number(e.target.value) || 0) })}
                          className={`w-24 px-2 py-1.5 rounded-lg border font-mono ${inputCls}`}
                        />
                      )}
                      {inp.mode === 'solution' && (
                        <>
                          <input
                            type="number"
                            min={0}
                            step="5"
                            placeholder="mL"
                            value={inp.volume_ml ?? 100}
                            onChange={(e) => updateInput(idx, { volume_ml: Math.max(0, Number(e.target.value) || 0) })}
                            className={`w-20 px-2 py-1.5 rounded-lg border font-mono ${inputCls}`}
                          />
                          <span className="text-[11px] opacity-70">mL</span>
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            placeholder="M"
                            value={inp.molarity_M ?? 1}
                            onChange={(e) => updateInput(idx, { molarity_M: Math.max(0, Number(e.target.value) || 0) })}
                            className={`w-16 px-2 py-1.5 rounded-lg border font-mono ${inputCls}`}
                          />
                          <span className="text-[11px] opacity-70">M</span>
                        </>
                      )}
                    </div>

                    {outcome && (
                      <div className="flex flex-wrap justify-between gap-2 text-[11px] font-mono opacity-80">
                        <span>
                          {vi ? 'Phản ứng:' : 'Reacted:'} {outcome.reactedMoles.toFixed(4)} mol
                        </span>
                        <span>
                          {vi ? 'Còn dư:' : 'Excess:'} {outcome.remainingMoles.toFixed(4)} mol ({outcome.remainingMass_g.toFixed(2)} g)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Product Theoretical Yields */}
            {stoichiometry?.ok && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-blue-600">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {vi ? 'Sản phẩm thu được (Lý thuyết 100%)' : 'Theoretical Product Yields'}
                  </span>
                  <span className="font-mono text-[11px]">
                    ξ = {stoichiometry.extent_mol.toFixed(4)} mol
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {stoichiometry.products.map((prod, idx) => (
                    <div
                      key={`${prod.formula}-${idx}`}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span>{formatFormulaUnicode(prod.displayFormula)}</span>
                        <span className="text-emerald-600">
                          {prod.theoreticalMoles.toFixed(4)} mol
                        </span>
                      </div>
                      <div className="font-mono text-[11px] opacity-80 flex flex-wrap justify-between gap-1">
                        <span>m = {prod.theoreticalMass_g.toFixed(2)} g</span>
                        {prod.isGas && (
                          <span className="text-sky-600 font-semibold">
                            V(25°C) ≈ {prod.gasVolume25C_L.toFixed(2)} L · đktc {prod.gasVolumeSTP_L.toFixed(2)} L
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
