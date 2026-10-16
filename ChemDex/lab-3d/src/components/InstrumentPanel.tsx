import React, { useEffect, useRef, useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { INSTRUMENTS, getInstrument, type InstrumentId } from '../handling/instrumentCatalog';
import { useInstrumentStore } from '../handling/instrumentState';
import { useToolDockStore } from '../handling/toolDock';
import { readInstrument } from '../handling/instrumentReadings';
import {
  activateInstrument,
  alignSelectedVessel,
  aspiratePipette,
  cleanAllSpills,
  currentInstrumentPosition,
  depositSpatula,
  dispenseOneBuretteDrop,
  dispensePipette,
  instrumentTargetProblem,
  positionInstrument,
  resolveInstrumentTarget,
  returnInstrumentHome,
  rinseInstrument,
  setBuretteFlow,
  setBuretteValve,
  stirSelectedVessel,
  tareBalance,
} from '../handling/instrumentOperations';

const BUTTON = 'rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed';

function NumberControl({ label, value, minimum, maximum, step, onChange }: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return <label className="flex items-center justify-between gap-3 text-xs">
    <span>{label}</span>
    <input
      aria-label={label}
      type="number"
      className="w-24 rounded border border-slate-300 px-2 py-1.5"
      value={value}
      min={minimum}
      max={maximum}
      step={step}
      onChange={event => {
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next)) onChange(Math.max(minimum, Math.min(maximum, next)));
      }}
    />
  </label>;
}

function PipetteActions({ disabled }: { disabled: boolean }) {
  const [volume, setVolume] = useState(2.5);
  const sample = useInstrumentStore(state => state.pipetteSample);
  const loaded = (sample?.volume_ml ?? 0) > 1e-6;
  return <div className="space-y-3">
    <NumberControl
      label="Thể tích mỗi thao tác (mL)"
      value={volume}
      minimum={0.05}
      maximum={10}
      step={0.05}
      onChange={setVolume}
    />
    <div className="flex flex-wrap gap-2">
      <button className={BUTTON} disabled={disabled || loaded} onClick={() => aspiratePipette(volume)}>Hút mẫu</button>
      <button className={BUTTON} disabled={disabled || !loaded} onClick={() => dispensePipette(volume)}>Nhả mẫu</button>
      <button className={BUTTON} disabled={loaded} onClick={() => rinseInstrument('pipette')}>Rửa pipet</button>
    </div>
    {sample && sample.volume_ml > 0 && <div className="space-y-1 text-xs">
      <p className="font-medium">Số mol đang giữ</p>
      {sample.contents.filter(content => content.moles > 1e-12).map((content, index) => <p key={`${content.formula}-${index}`} className="flex justify-between">
        <span>{content.formula}</span>
        <span className="font-mono">{content.moles.toExponential(5)} mol</span>
      </p>)}
    </div>}
  </div>;
}

function BuretteActions({ disabled }: { disabled: boolean }) {
  const burette = useAppStore(state => state.burette);
  return <div className="space-y-3">
    <NumberControl
      label="Lưu lượng (mL/s)"
      value={burette.flowRate_ml_s}
      minimum={0.1}
      maximum={2}
      step={0.1}
      onChange={setBuretteFlow}
    />
    <div className="flex flex-wrap gap-2">
      <button className={BUTTON} disabled={disabled} onClick={() => alignSelectedVessel('burette')}>Căn bình dưới buret</button>
      <button className={BUTTON} onClick={dispenseOneBuretteDrop}>Nhả một giọt</button>
      <button className={BUTTON} onClick={() => setBuretteValve(!burette.isDispensing)}>
        {burette.isDispensing ? 'Đóng khóa' : 'Mở khóa'}
      </button>
    </div>
    <p className="text-xs text-slate-500">Cấu hình dung dịch và đồ thị chuẩn độ nằm trong bảng Chuẩn độ hiện có.</p>
  </div>;
}

function InstrumentActions({ id, disabled }: { id: InstrumentId; disabled: boolean }) {
  if (id === 'pipette') return <PipetteActions disabled={disabled} />;
  if (id === 'burette') return <BuretteActions disabled={disabled} />;
  if (id === 'balance') return <div className="flex flex-wrap gap-2">
    <button className={BUTTON} disabled={disabled} onClick={() => alignSelectedVessel('balance')}>Đặt lên cân</button>
    <button className={BUTTON} onClick={tareBalance}>TARE</button>
    <button className={BUTTON} onClick={() => useInstrumentStore.getState().setTare(0)}>Bỏ trừ bì</button>
  </div>;
  if (id === 'stirring_rod') return <div className="flex flex-wrap gap-2">
    <button className={BUTTON} disabled={disabled} onClick={stirSelectedVessel}>Khuấy / dừng khuấy bài học</button>
    <button className={BUTTON} onClick={() => rinseInstrument('stirring_rod')}>Rửa đũa</button>
  </div>;
  if (id === 'spatula') return <div className="flex flex-wrap gap-2">
    <button className={BUTTON} disabled={disabled} onClick={() => void depositSpatula()}>Cho mẫu vào bình</button>
    <button className={BUTTON} onClick={() => rinseInstrument('spatula')}>Rửa thìa</button>
  </div>;
  if (id === 'sponge') return <button className={BUTTON} onClick={cleanAllSpills}>Thu gom tất cả vết tràn</button>;
  return <button className={BUTTON} disabled={disabled} onClick={() => activateInstrument(id)}>Đưa đầu đo vào bình</button>;
}

function InstrumentPlacement({ id }: { id: InstrumentId }) {
  const saved = useToolDockStore(state => state.positions[id]);
  const [x, setX] = useState(() => currentInstrumentPosition(id)[0]);
  const [z, setZ] = useState(() => currentInstrumentPosition(id)[2]);
  useEffect(() => {
    const position = currentInstrumentPosition(id);
    setX(position[0]);
    setZ(position[2]);
  }, [id, saved]);
  if (id === 'sponge') return null;
  return <fieldset className="space-y-2 rounded-lg border p-3">
    <legend className="px-1 text-xs font-semibold">Vị trí nghỉ trên bàn</legend>
    <NumberControl label="Tọa độ X" value={x} minimum={-10} maximum={10} step={0.1} onChange={setX} />
    <NumberControl label="Tọa độ Z" value={z} minimum={-4.5} maximum={4.5} step={0.1} onChange={setZ} />
    <div className="flex gap-2">
      <button className={BUTTON} onClick={() => positionInstrument(id, [x, getInstrument(id).home[1], z])}>Đặt vị trí</button>
      <button className={BUTTON} onClick={() => returnInstrumentHome(id)}>Về giá ban đầu</button>
    </div>
  </fieldset>;
}

function InstrumentDetails({ id }: { id: InstrumentId }) {
  // This component is mounted only while the panel is open. The store already
  // publishes vessel state at a bounded rate; no additional render timer is used.
  useAppStore(state => state.vessels);
  useAppStore(state => state.selectedVesselId);
  useAppStore(state => state.burette);
  useAppStore(state => state.spatulaState);
  useAppStore(state => state.spills);
  useAppStore(state => state.toolContamination);
  useInstrumentStore();
  useToolDockStore(state => state.positions);
  const definition = getInstrument(id);
  const reading = readInstrument(id);
  const target = resolveInstrumentTarget();
  const problem = instrumentTargetProblem(id, target);
  const notices = useInstrumentStore(state => state.notices);
  const latest = notices.filter(notice => notice.tool === id).at(-1);
  return <div className="space-y-4">
    <p className="text-xs text-slate-600">{definition.description}</p>
    <div className="rounded-xl bg-slate-900 p-4 text-white">
      <div className="flex items-baseline gap-2">
        <output aria-label={`Số đọc ${definition.name}`} className={`text-2xl font-mono ${reading.valid ? 'text-emerald-300' : 'text-slate-400'}`}>{reading.value}</output>
        <span className="text-xs">{reading.unit}</span>
      </div>
      <p className="mt-1 text-xs text-slate-300">{reading.context}</p>
    </div>
    <dl className="space-y-2 text-xs">
      {reading.details.map(detail => <div key={detail.label} className="flex justify-between gap-3">
        <dt className="text-slate-500">{detail.label}</dt>
        <dd className="text-right break-words">{detail.value}</dd>
      </div>)}
    </dl>
    {definition.targetRequired && problem && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{problem}</p>}
    <InstrumentActions id={id} disabled={Boolean(problem)} />
    {latest && <p role="status" className={`rounded-lg p-2 text-xs ${latest.success ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
      {latest.message}
    </p>}
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold">Cách sử dụng</summary>
      <ol className="mt-2 list-decimal space-y-2 pl-4 text-slate-600">
        {definition.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}
      </ol>
    </details>
    <InstrumentPlacement id={id} />
  </div>;
}

export default function InstrumentPanel({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState<InstrumentId>('pipette');
  const root = useRef<HTMLElement>(null);
  const vessels = useAppStore(state => state.vessels);
  const selected = useAppStore(state => state.selectedVesselId);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('keydown', keyboard);
      previousFocus?.focus();
    };
  }, [onClose]);
  return <aside
    ref={root}
    tabIndex={-1}
    aria-label="Điều khiển dụng cụ"
    className="fixed right-4 top-24 bottom-6 z-50 flex w-[370px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-slate-300 bg-white shadow-xl outline-none"
  >
    <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Wrench size={16} />Điều khiển dụng cụ</h2>
      <button aria-label="Đóng bảng dụng cụ" className="rounded p-1 hover:bg-slate-100" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="overflow-y-auto space-y-4 p-4">
      <label className="block space-y-1 text-xs">
        <span>Dụng cụ</span>
        <select aria-label="Chọn dụng cụ" className="w-full rounded border p-2" value={id} onChange={event => setId(event.target.value as InstrumentId)}>
          {INSTRUMENTS.map(instrument => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span>Bình đang chọn</span>
        <select aria-label="Bình thao tác" className="w-full rounded border p-2" value={selected ?? ''} onChange={event => useAppStore.getState().setSelectedVesselId(event.target.value || null)}>
          <option value="">Chưa chọn bình</option>
          {Object.values(vessels).filter(vessel => vessel.capacity_ml > 0 && !vessel.isShattered).map(vessel => <option key={vessel.id} value={vessel.id}>{vessel.name}</option>)}
        </select>
      </label>
      <InstrumentDetails key={id} id={id} />
    </div>
  </aside>;
}
