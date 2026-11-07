import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePhysicsStore } from './usePhysicsStore';
import { coverageInventory, SAMPLE_IDS, sampleDefinition, EXPANSION_TOOLS, toolDefinition } from './catalog';
import { useAppStore } from '../store/useAppStore';
import { scenePointToSI } from '../science/sceneUnits';
import { materialProperties } from './materials';
import { ReferenceMeasurements } from './ReferenceMeasurements';
import { LAB_GEOMETRY } from '../core/labGeometry';
import { metersToScene } from '../science/sceneUnits';

let nextObject = 0;
const TOOL_NAMES: Record<string, string> = { force_meter: 'Lực kế', pressure_sensor: 'Cảm biến áp suất',
  pipette_bulb: 'Bóng hút pipet', water_bath: 'Bể điều nhiệt', gas_collector: 'Bình thu khí chia độ' };

export function PhysicsPanel() {
  const state = usePhysicsStore(), appPaused = useAppStore(s => s.isSimulationPaused);
  const [tab, setTab] = useState<'objects' | 'coverage'>('objects'), [search, setSearch] = useState('');
  const inventory = useMemo(coverageInventory, []);
  const add = (id: string, sample: boolean) => {
    const app = useAppStore.getState(), target = app.selectedVesselId ? app.vessels[app.selectedVesselId] : undefined;
    if (id === 'glycerol' || id === 'silicone_oil') { state.startExperiment('viscosity', { liquid: id }); return; }
    if (id === 'ice') { app.prepareStudioIceSample(); state.startExperiment('ice'); return; }
    if (!sample) state.startExperiment(id as typeof EXPANSION_TOOLS[number]);
    const definition = sample ? sampleDefinition(id) : toolDefinition(id);
    const center: [number, number, number] = !sample
      ? [-12 + EXPANSION_TOOLS.indexOf(id as typeof EXPANSION_TOOLS[number]) * 5, LAB_GEOMETRY.tableTop_scene + metersToScene(definition.dimensions_m[1] / 2 + 0.003), 4]
      : target ? [target.position[0], target.position[1] + 3.5, target.position[2]] : [0, 3, 0];
    let objectId: string;
    do { objectId = `physical_${id}_${++nextObject}`; } while (state.expansions.some(e => e.id === objectId));
    state.addExpansion({ id: objectId, definition, position_m: scenePointToSI(center), rotation: [0, 0, 0, 1],
      contentsMass_kg: 0, temperature_K: id === 'ice' ? 263.15 : 293.15, locked: false });
  };
  return <>
    <button type="button" onClick={() => state.setPanelOpen(!state.panelOpen)} aria-expanded={state.panelOpen}
      className="px-2 py-1 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-700" title="Hồ sơ và mô phỏng vật lí">Vật lí</button>
    {state.panelOpen && createPortal(<div role="dialog" aria-modal="true" aria-label="Vật lí có kiểm chứng"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3" onClick={() => state.setPanelOpen(false)}>
      <section className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90dvh] overflow-y-auto p-4 text-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between gap-3 items-center"><h2 className="text-lg font-bold">Vật thể và mô phỏng vật lí</h2>
          <button onClick={() => state.setPanelOpen(false)} aria-label="Đóng" className="p-2 rounded hover:bg-slate-100">✕</button></div>
        <p className="text-sm mt-2">Thông số, chuyển động và phạm vi kiểm chứng của các vật trong lab.</p>
        <label className="flex gap-2 items-center mt-3 text-sm"><input type="checkbox" checked={state.enabled} onChange={e => state.setEnabled(e.target.checked)} />
          Bật va chạm và cầm/thả bằng lực — bản thử nghiệm</label>
        <p className="text-xs mt-2 text-slate-600">{state.status === 'running' ? `Đang chạy · ${state.snapshot?.time_s.toFixed(2)} s` : state.status === 'starting' ? 'Đang khởi tạo…' : state.status === 'error' ? `Lỗi: ${state.error}` : 'Chưa bật'}
          {appPaused ? ' · Lab đang tạm dừng' : ''}</p>
        <p className="text-xs mt-2 text-amber-800">Khối lượng vỏ, ma sát và sức bền còn là ước lượng. Phụ kiện dùng hình bao tham chiếu; chưa được chứng nhận tiếp xúc hoặc sai số thực nghiệm.</p>
        <div className="flex gap-3 my-4 border-b"><button className="pb-2 font-semibold" onClick={() => setTab('objects')}>Mẫu và dụng cụ</button>
          <button className="pb-2 font-semibold" onClick={() => setTab('coverage')}>Hồ sơ ({inventory.length})</button></div>
        {tab === 'objects' ? <>
          <p className="text-sm mb-3">Mẫu rắn được thả phía trên bình đang chọn. Có thể tạm dừng để bố trí.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{SAMPLE_IDS.map(id => <button key={id} disabled={!state.enabled}
            onClick={() => add(id, true)} className="border rounded-lg p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-40">
            {materialProperties(id).name}<span className="block text-xs text-slate-500">{['glycerol', 'silicone_oil'].includes(id) ? 'Đo vận tốc lắng trong mẫu lỏng' : id === 'ice' ? 'Tạo mẫu nước–đá và đo nhiệt' : 'Mẫu 1 cm³'}</span></button>)}</div>
          <h3 className="font-semibold mt-4 mb-2">Dụng cụ bổ sung</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{EXPANSION_TOOLS.map(id => <button key={id} disabled={!state.enabled} onClick={() => add(id, false)}
            className="border rounded-lg p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-40">{TOOL_NAMES[id]}<span className="block text-xs text-slate-500">Hình bao tham chiếu</span></button>)}</div>
          <button onClick={state.clearExpansions} className="mt-4 text-sm underline">Thu dọn mẫu bổ sung</button>
          <ReferenceMeasurements />
        </> : <>
          <input aria-label="Tìm hồ sơ vật lí" placeholder="Tìm vật thể, công thức…" value={search} onChange={e => setSearch(e.target.value)} className="border rounded p-2 w-full mb-3 text-sm" />
          <div className="space-y-2">{inventory.filter(e => `${e.id} ${e.name}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map(e => <details key={e.id} className="border rounded p-2 text-sm">
            <summary>{e.name} <span className="text-xs text-amber-800">· ước lượng</span></summary>
            <p className="text-xs mt-2 text-slate-600">{e.id} · {e.behaviors.join(', ')}</p>
            <p className="text-xs mt-1">Miền: {e.validation.domain}</p>
            {e.validation.limitations.map((l, i) => <p key={i} className="text-xs mt-1">{l}</p>)}
            {e.validation.sourceUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-blue-700 underline mt-1">Nguồn thông số</a>)}
          </details>)}</div>
        </>}
      </section>
    </div>, document.body)}
  </>;
}
