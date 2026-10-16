import React, { useState } from 'react';
import type { LessonSession } from './types';
import { requireLessonDefinition } from './catalog';
import { diagnoseLesson } from './diagnostics';
import { formatLessonAmount, formatLessonMass } from './chemistry/formula';

const CELL = 'px-2 py-1.5 text-right font-mono whitespace-nowrap';

function ReagentAnalysis({ session }: { session: LessonSession }) {
  const definition = requireLessonDefinition(session.definitionId);
  const diagnostic = diagnoseLesson(definition, session);
  return <div className="space-y-3">
    <p className="text-slate-600">So sánh n/ν của từng chất đầu. Giá trị nhỏ nhất xác định lượng phản ứng tối đa.</p>
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-[10px]">
        <caption className="sr-only">Phân tích chất giới hạn và chất dư</caption>
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 text-left">Chất đầu</th>
            <th className={CELL}>ν</th>
            <th className={CELL}>n ban đầu</th>
            <th className={CELL}>n/ν</th>
          </tr>
        </thead>
        <tbody>
          {diagnostic.reactants.map(reactant => <tr key={reactant.species} className="border-t">
            <th className="p-2 text-left font-normal">
              <span className="block">{reactant.name}</span>
              <span className={reactant.missing ? 'text-red-700' : reactant.limiting ? 'text-teal-700' : 'text-amber-700'}>
                {reactant.missing ? 'Thiếu mẫu' : reactant.limiting ? 'Giới hạn' : 'Dư theo tỉ lệ'}
              </span>
            </th>
            <td className={CELL}>{reactant.coefficient}</td>
            <td className={CELL}>{formatLessonAmount(reactant.initial_mol)}</td>
            <td className={CELL}>{formatLessonAmount(reactant.extentCapacity_mol)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {diagnostic.messages.map(message => <p key={message} className="rounded border border-teal-100 bg-white p-2 text-[11px]">{message}</p>)}
  </div>;
}

function ProductAnalysis({ session }: { session: LessonSession }) {
  const definition = requireLessonDefinition(session.definitionId);
  const diagnostic = diagnoseLesson(definition, session);
  return <div className="space-y-3">
    <p className="text-slate-600">Lượng đích tính từ chất giới hạn và mức chuyển hóa của kịch bản.</p>
    {diagnostic.products.map(product => <article key={product.species} className="rounded border bg-white p-2 space-y-2">
      <h5 className="font-semibold">{product.name} · {product.formula} ({product.phase})</h5>
      <dl className="space-y-1 text-[10px]">
        <div className="flex justify-between gap-2">
          <dt>Lượng đích</dt>
          <dd>{formatLessonAmount(product.theoretical_mol)} · {formatLessonMass(product.theoretical_g)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Đã tạo thành</dt>
          <dd>{formatLessonAmount(product.formed_mol)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Còn trong bình</dt>
          <dd>{formatLessonAmount(product.retained_mol)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Đã thoát ra</dt>
          <dd>{formatLessonAmount(product.escaped_mol)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>So với lượng đích mô hình</dt>
          <dd>{product.yieldFraction === null ? '—' : `${(product.yieldFraction * 100).toFixed(2)}%`}</dd>
        </div>
        {product.gasVolume_ml !== null && <div className="flex justify-between gap-2">
          <dt>Khí lý tưởng, 25 °C và 1 atm</dt>
          <dd>{product.gasVolume_ml.toFixed(3)} mL</dd>
        </div>}
      </dl>
    </article>)}
    <p className="text-[10px] text-slate-500">Tỉ lệ hoàn thành mô hình không phải hiệu suất thực nghiệm của một phép tổng hợp.</p>
  </div>;
}

function ElementAnalysis({ session }: { session: LessonSession }) {
  const definition = requireLessonDefinition(session.definitionId);
  const diagnostic = diagnoseLesson(definition, session);
  return <div className="space-y-3">
    <p className="text-slate-600">Tổng mol nguyên tử ban đầu bằng lượng giữ lại cộng lượng đi theo khí thoát.</p>
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-[10px]">
        <caption className="sr-only">Kiểm tra bảo toàn từng nguyên tố</caption>
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 text-left">Nguyên tố</th>
            <th className={CELL}>Ban đầu</th>
            <th className={CELL}>Giữ lại</th>
            <th className={CELL}>Thoát</th>
            <th className={CELL}>Sai số mol</th>
          </tr>
        </thead>
        <tbody>
          {diagnostic.elements.map(element => <tr key={element.element} className="border-t">
            <th className="p-2 text-left">{element.element}</th>
            <td className={CELL}>{element.initial_mol.toExponential(3)}</td>
            <td className={CELL}>{element.retained_mol.toExponential(3)}</td>
            <td className={CELL}>{element.escaped_mol.toExponential(3)}</td>
            <td className={`${CELL} ${element.conserved ? 'text-teal-700' : 'text-red-700'}`}>{element.error_mol.toExponential(2)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className={diagnostic.allElementsConserved ? 'text-teal-800' : 'text-red-800'}>
      {diagnostic.allElementsConserved ? 'Đạt kiểm tra bảo toàn nguyên tố.' : 'Không đạt kiểm tra bảo toàn nguyên tố.'}
    </p>
  </div>;
}

export function LessonDiagnostics({ session }: { session: LessonSession }) {
  const [view, setView] = useState<'reactants' | 'products' | 'elements'>('reactants');
  return <details className="rounded-lg border border-teal-200 bg-teal-50/50 p-2">
    <summary className="cursor-pointer font-semibold">Giải thích định lượng và bảo toàn nguyên tố</summary>
    <nav className="my-3 flex flex-wrap gap-1" aria-label="Phân tích định lượng">
      {([
        ['reactants', 'Chất giới hạn'],
        ['products', 'Sản phẩm'],
        ['elements', 'Nguyên tố'],
      ] as const).map(([id, label]) => <button
        key={id}
        aria-pressed={view === id}
        className={`rounded border px-2 py-1 ${view === id ? 'bg-teal-700 text-white' : 'bg-white'}`}
        onClick={() => setView(id)}
      >{label}</button>)}
    </nav>
    {view === 'reactants' && <ReagentAnalysis session={session} />}
    {view === 'products' && <ProductAnalysis session={session} />}
    {view === 'elements' && <ElementAnalysis session={session} />}
  </details>;
}
