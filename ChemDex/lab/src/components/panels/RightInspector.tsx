import React, { useState } from 'react';
import {
  Thermometer,
  Gauge,
  Weight,
  Droplet,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { useUiStore } from '../../store/uiStore';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';

export const RightInspector: React.FC = () => {
  const {
    vessels,
    selectedVesselId,
    latestReaction,
    clearVessel,
    pourVesselToVessel,
    titration,
    startTitration,
    dispenseTitrantDrop,
    stopTitration
  } = useSimulationStore();

  const { rightInspectorOpen, toggleRightInspector, triggerPour, isReacting } = useUiStore();

  const [pourModalOpen, setPourModalOpen] = useState(false);
  const [pourTargetId, setPourTargetId] = useState<string>('');
  const [pourAmount, setPourAmount] = useState<number>(20);

  const selectedVessel = vessels.find(v => v.id === selectedVesselId);

  if (!rightInspectorOpen) {
    return (
      <button
        onClick={toggleRightInspector}
        className="absolute right-3 top-16 z-20 bg-white border border-slate-200 shadow-md rounded-lg p-2 text-slate-700 hover:text-sky-600 hover:bg-slate-50 transition-all"
        title="Mở bảng thông số kiểm định"
      >
        <Gauge className="w-5 h-5" />
      </button>
    );
  }

  const handlePour = async () => {
    if (!selectedVesselId || !pourTargetId || isReacting) return;
    triggerPour(selectedVesselId, pourTargetId, pourAmount);
    setPourModalOpen(false);
  };

  return (
    <aside className="w-72 min-w-[18rem] max-w-[18rem] shrink-0 h-[calc(100vh-3.5rem)] bg-white/95 backdrop-blur-md border-l border-slate-200 flex flex-col shadow-sm z-20 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="font-bold text-sm text-slate-800">
            {selectedVessel ? selectedVessel.name : 'Thông Số Thí Nghiệm'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {selectedVessel
              ? `Dung tích tối đa: ${selectedVessel.capacityMl} mL`
              : 'Chọn một bình trên bàn để xem chi tiết'}
          </p>
        </div>
        {selectedVessel && (
          <button
            onClick={() => clearVessel(selectedVessel.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Làm sạch bình"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-4">
        {/* --- SECTION 1: PHYSICAL MEASUREMENTS --- */}
        {selectedVessel ? (
          <div className="space-y-2.5">
            {/* Volume Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Thể tích chất lỏng</span>
                <span className="font-mono text-sky-600">
                  {selectedVessel.currentVolumeMl.toFixed(1)} / {selectedVessel.capacityMl} mL
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (selectedVessel.currentVolumeMl / selectedVessel.capacityMl) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Temperature */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${selectedVessel.isHeating ? 'bg-amber-100 text-amber-600' : 'bg-slate-200/70 text-slate-600'}`}>
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Nhiệt độ</div>
                  <div className="font-mono font-bold text-xs text-slate-800">
                    {selectedVessel.temperatureC.toFixed(1)} °C
                  </div>
                </div>
              </div>

              {/* pH Meter */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${
                  selectedVessel.pH !== null && selectedVessel.pH < 6.5
                    ? 'bg-rose-100 text-rose-600'
                    : selectedVessel.pH !== null && selectedVessel.pH > 7.5
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Độ pH</div>
                  <div className="font-mono font-bold text-xs text-slate-800">
                    {selectedVessel.pH !== null ? selectedVessel.pH.toFixed(2) : '--'}
                  </div>
                </div>
              </div>

              {/* Mass */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-200/70 text-slate-600">
                  <Weight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Khối lượng</div>
                  <div className="font-mono font-bold text-xs text-slate-800">
                    {selectedVessel.totalMassG.toFixed(1)} g
                  </div>
                </div>
              </div>

              {/* Color swatch */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg border border-slate-300 shadow-2xs"
                  style={{ backgroundColor: selectedVessel.liquidColor.hex || '#ffffff' }}
                />
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Màu sắc</div>
                  <div className="text-xs font-semibold text-slate-800">
                    {selectedVessel.currentVolumeMl > 0 ? 'Dung dịch' : 'Bình rỗng'}
                  </div>
                </div>
              </div>
            </div>

            {/* Pour Action Button */}
            {selectedVessel.currentVolumeMl > 0 && vessels.length > 1 && (
              <button
                onClick={() => setPourModalOpen(true)}
                className="w-full py-2 px-3 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Rót sang bình khác</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Hãy bấm chọn một bình trên bàn làm việc
          </div>
        )}

        {/* --- SECTION 2: CHEMICAL CONTENTS IN SELECTED VESSEL --- */}
        {selectedVessel && (
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Thành Phần Trong Bình</span>
            </h3>

            {selectedVessel.contents.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                <p className="font-medium text-slate-700">Bình đang trống</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chọn hóa chất từ bảng bên trái để bắt đầu thí nghiệm.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedVessel.contents.map((sub, idx) => {
                  const chem = CHEMICAL_LIBRARY[sub.chemicalId];
                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900">
                            {chem?.formula || sub.chemicalId}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {chem?.nameVi}
                          </span>
                        </div>
                        {sub.concentrationM && (
                          <div className="text-[10px] text-slate-400">
                            Nồng độ: {sub.concentrationM.toFixed(2)} M
                          </div>
                        )}
                      </div>
                      <div className="text-right font-mono text-slate-700 font-medium">
                        <div>{sub.amount.toFixed(1)} {sub.unit}</div>
                        <div className="text-[10px] text-slate-400">
                          {(sub.moles * 1000).toFixed(2)} mmol
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- SECTION 3: REACTION PHENOMENON & COMPREHENSIVE EQUATION CARD --- */}
        {latestReaction && (
          <div className="p-3.5 bg-gradient-to-br from-sky-50 via-indigo-50/40 to-slate-50 border border-sky-200 rounded-2xl space-y-3 shadow-xs">
            {/* Header with Type & Provenance */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                <span>{latestReaction.reactionTypeVi || 'Hiện tượng phản ứng'}</span>
              </span>
              <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/80 border border-sky-100 text-slate-500">
                {latestReaction.provenance === 'tier0_deterministic' ? 'Chuẩn sư phạm' : latestReaction.provenance === 'tier4_gemini' ? 'AI Phân tích' : 'Bộ nhớ Cache'}
              </span>
            </div>

            {/* Phenomenon text */}
            <div className="p-2.5 bg-white/90 rounded-xl border border-sky-100/80 text-xs text-slate-800 leading-relaxed font-medium">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block mb-0.5">Hiện tượng quan sát:</span>
              {latestReaction.observations.phenomenonVi}
            </div>

            {/* Chemical Equations: Molecular, Total Ionic, Net Ionic */}
            <div className="p-3 bg-white rounded-xl border border-sky-100 space-y-2">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Phương trình phân tử:
                </div>
                <div className="font-mono font-bold text-xs text-slate-900 leading-normal overflow-x-auto pb-0.5 selection:bg-sky-100">
                  {latestReaction.equation}
                </div>
              </div>

              {latestReaction.ionicEquation && (
                <div className="pt-1.5 border-t border-slate-100">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Phương trình ion đầy đủ:
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 leading-tight overflow-x-auto pb-0.5">
                    {latestReaction.ionicEquation}
                  </div>
                </div>
              )}

              {latestReaction.netIonicEquation && (
                <div className="pt-1.5 border-t border-slate-100">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-sky-600">
                    Phương trình ion thu gọn (Bản chất):
                  </div>
                  <div className="font-mono font-semibold text-xs text-sky-700 leading-tight">
                    {latestReaction.netIonicEquation}
                  </div>
                </div>
              )}
            </div>

            {/* Thermodynamic & Reaction Conditions */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Điều kiện:</span>
                <span className="font-medium text-slate-700">{latestReaction.conditionsVi || 'Nhiệt độ phòng (25°C)'}</span>
              </div>
              <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Nhiệt động học:</span>
                <span className={`font-semibold ${latestReaction.observations.temperatureChangeC > 0 ? 'text-rose-600' : latestReaction.observations.temperatureChangeC < 0 ? 'text-sky-600' : 'text-slate-600'}`}>
                  {latestReaction.observations.temperatureChangeC > 0
                    ? `Tỏa nhiệt (+${latestReaction.observations.temperatureChangeC.toFixed(1)}°C)`
                    : latestReaction.observations.temperatureChangeC < 0
                    ? `Thu nhiệt (${latestReaction.observations.temperatureChangeC.toFixed(1)}°C)`
                    : 'Đẳng nhiệt (Không đổi)'}
                </span>
              </div>
            </div>

            {/* Educational Scientific Explanation & Mechanism */}
            <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-[11px] text-slate-700 leading-relaxed space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                <span>{latestReaction.educationalExplanationVi.titleVi}</span>
              </div>
              <p className="text-slate-600">{latestReaction.educationalExplanationVi.summaryVi}</p>
              {latestReaction.educationalExplanationVi.detailVi && (
                <p className="text-slate-500 text-[10px] pt-1 border-t border-sky-100 italic leading-normal">
                  {latestReaction.educationalExplanationVi.detailVi}
                </p>
              )}
            </div>

            {/* Real-World Applications */}
            {latestReaction.educationalExplanationVi.realWorldApplicationVi && (
              <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                <div className="font-bold text-amber-950 flex items-center gap-1.5 mb-0.5">
                  <span>🌍 Ứng dụng thực tế:</span>
                </div>
                <p className="text-amber-900/90">{latestReaction.educationalExplanationVi.realWorldApplicationVi}</p>
              </div>
            )}

            {/* Safety & Waste Handling Guidelines */}
            {latestReaction.safetyAdviceVi && (
              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <span>🛡️ Xử lý sau phản ứng:</span>
                </div>
                <p>• {latestReaction.safetyAdviceVi.messageVi}</p>
                {latestReaction.safetyAdviceVi.wasteHandlingVi && (
                  <p>• <strong>Thu gom chất thải:</strong> {latestReaction.safetyAdviceVi.wasteHandlingVi}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- SECTION 4: TITRATION SYSTEM & PH CURVE --- */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-sky-600" />
              <span>Thí Nghiệm Chuẩn Độ (Titration)</span>
            </h3>
            {titration.isActive && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Đang mở khóa
              </span>
            )}
          </div>

          {!titration.isActive ? (
            <div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                Chuẩn độ dung dịch bằng buret với chất chỉ thị màu để vẽ đồ thị pH thời gian thực.
              </p>
              <button
                onClick={() => {
                  const burette = vessels.find(v => v.type === 'burette') || vessels[0];
                  const erlenmeyer = vessels.find(v => v.type === 'erlenmeyer') || vessels[1] || vessels[0];
                  if (burette && erlenmeyer) {
                    startTitration(burette.id, erlenmeyer.id, 'NaOH');
                  }
                }}
                className="w-full py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                Bắt đầu chuẩn độ NaOH
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Đã nhỏ vào:</span>
                <span className="font-mono font-bold text-slate-800">
                  {titration.dispensedMl} mL NaOH
                </span>
              </div>

              {/* Titration Mini pH Chart */}
              <div className="h-20 bg-white border border-slate-200 rounded-lg p-1.5 relative flex items-end">
                {/* SVG Curve */}
                <svg className="w-full h-full">
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e2e8f0" strokeDasharray="3 3" />
                  {titration.dataPoints.map((pt, i, arr) => {
                    if (i === 0) return null;
                    const prev = arr[i - 1];
                    const x1 = (prev.volumeAddedMl / 40) * 100;
                    const y1 = 100 - (prev.ph / 14) * 100;
                    const x2 = (pt.volumeAddedMl / 40) * 100;
                    const y2 = 100 - (pt.ph / 14) * 100;
                    return (
                      <line
                        key={i}
                        x1={`${x1}%`}
                        y1={`${y1}%`}
                        x2={`${x2}%`}
                        y2={`${y2}%`}
                        stroke="#0284c7"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
                <div className="absolute top-1 right-2 text-[9px] text-slate-400 font-mono">
                  pH theo V(mL)
                </div>
              </div>

              {/* Dispense Controls */}
              <div className="flex gap-2">
                <button
                  onClick={dispenseTitrantDrop}
                  className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Nhỏ 1 giọt (1 mL)
                </button>
                <button
                  onClick={stopTitration}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Dừng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pour Modal */}
      {pourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-slate-800">
              Rót Dung Dịch Sang Bình Khác
            </h3>
            <p className="text-xs text-slate-500">
              Chọn bình nhận và thể tích muốn rót từ {selectedVessel?.name}:
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Bình nhận:
              </label>
              <select
                value={pourTargetId}
                onChange={(e) => setPourTargetId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">-- Chọn bình nhận --</option>
                {vessels
                  .filter(v => v.id !== selectedVesselId)
                  .map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} (hiện có {v.currentVolumeMl} mL)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Thể tích rót ({pourAmount} mL):
              </label>
              <input
                type="range"
                min="5"
                max={selectedVessel ? selectedVessel.currentVolumeMl : 100}
                step="5"
                value={pourAmount}
                onChange={(e) => setPourAmount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPourModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handlePour}
                disabled={!pourTargetId}
                className="px-4 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 disabled:opacity-40"
              >
                Tiến hành rót
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
