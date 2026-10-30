import {useShallow} from 'zustand/react/shallow';
import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import { Flame, Droplets, Trash2, ArrowRightLeft, Plus, Thermometer, Gauge, Beaker, Sparkles, Loader2, RotateCw, Droplet, Eraser, Lock, Unlock } from 'lucide-react';

export const VesselInspector: React.FC = () => {
  const {
    equipment,
    selectedEquipmentId,
    removeEquipment,
    toggleHeat,
    addChemicalToEquipment,
    openTransferModal,
    triggerGeminiReactionCheck,
    toggleAIAssistant,
    emptyEquipment,
    toggleStir,
    addDistilledWater,
    toggleSeal,
    language,
  } = useLabStore(useShallow(state => ({equipment: state.equipment,selectedEquipmentId: state.selectedEquipmentId,removeEquipment: state.removeEquipment,toggleHeat: state.toggleHeat,addChemicalToEquipment: state.addChemicalToEquipment,openTransferModal: state.openTransferModal,triggerGeminiReactionCheck: state.triggerGeminiReactionCheck,toggleAIAssistant: state.toggleAIAssistant,emptyEquipment: state.emptyEquipment,toggleStir: state.toggleStir,addDistilledWater: state.addDistilledWater,toggleSeal: state.toggleSeal,language: state.language})));

  const [selectedChemicalId, setSelectedChemicalId] = useState<string>('chem-hcl');
  const [addVolume, setAddVolume] = useState<number>(25);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  const selectedItem = selectedEquipmentId ? equipment[selectedEquipmentId] : null;

  const handleGeminiAnalyze = async () => {
    if (!selectedItem) return;
    setIsAiAnalyzing(true);
    try {
      await triggerGeminiReactionCheck(selectedItem.id);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  if (!selectedItem) {
    return (
      <div className="lab-inspector w-80 h-full bg-white border-l border-slate-200 p-5 flex flex-col justify-center items-center text-center text-slate-400 select-none">
        <Beaker className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600">
          {language === 'vi' ? 'Chưa chọn dụng cụ nào' : 'No equipment selected'}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          {language === 'vi'
            ? 'Nhấp chuột vào một dụng cụ thí nghiệm trên bàn để xem thông số chi tiết và thực hiện thao tác.'
            : 'Click on any laboratory apparatus on the workbench to inspect contents and perform operations.'}
        </p>
      </div>
    );
  }

  const name = language === 'vi' ? selectedItem.name_vi : selectedItem.name;

  return (
    <div className="lab-inspector w-84 h-full bg-white border-l border-slate-200 flex flex-col select-none shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            {language === 'vi' ? 'Thông số dụng cụ' : 'Inspector'}
          </span>
          <h3 className="text-base font-bold text-slate-800">{name}</h3>
        </div>
        <button
          onClick={() => removeEquipment(selectedItem.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title={language === 'vi' ? 'Dọn dẹp khỏi bàn' : 'Remove from bench'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Measurements HUD */}
      <div className="p-4 border-b border-slate-200 grid grid-cols-2 gap-2.5 bg-white">
        {selectedItem.isContainer && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>{language === 'vi' ? 'Thể tích' : 'Volume'}</span>
            </div>
            <p className="text-lg font-mono font-bold text-slate-800 mt-1">
              {selectedItem.volume_ml.toFixed(1)} <span className="text-xs font-normal text-slate-500">mL</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {language === 'vi' ? `Tối đa ${selectedItem.capacity_ml} mL` : `Max ${selectedItem.capacity_ml} mL`}
            </p>
          </div>
        )}

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Gauge className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'vi' ? 'Khối lượng' : 'Mass'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-slate-800 mt-1">
            {selectedItem.mass_g.toFixed(2)} <span className="text-xs font-normal text-slate-500">g</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {language === 'vi' ? `Bì: ${selectedItem.tare_g || 0} g` : `Tare: ${selectedItem.tare_g || 0} g`}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'vi' ? 'Nhiệt độ' : 'Temp'}</span>
          </div>
          <p className="text-lg font-mono font-bold text-slate-800 mt-1">
            {selectedItem.temperature_c.toFixed(1)} <span className="text-xs font-normal text-slate-500">°C</span>
          </p>
        </div>

        {selectedItem.isContainer && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedItem.liquidColorHex || '#cbd5e1' }} />
              <span>pH</span>
            </div>
            <p className="text-lg font-mono font-bold text-slate-800 mt-1">
              {selectedItem.ph.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Live Physical & Thermal Phenomena Badges */}
      {selectedItem.isContainer && (
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex flex-wrap gap-1.5 items-center">
          {selectedItem.isBeingHeated && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1.5 animate-pulse shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-orange-600" />
              <span>
                {language === 'vi'
                  ? `Đang đun nóng (${selectedItem.absorbedPower_W || 350}W, +${selectedItem.heatingRate_c_s || 2.4}°C/s)`
                  : `Heating (${selectedItem.absorbedPower_W || 350}W)`}
              </span>
            </span>
          )}
          {selectedItem.isBoiling && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 animate-bounce shadow-2xs">
              <span>♨️</span>
              <span>{language === 'vi' ? 'Đang sôi mạnh' : 'Vigorously Boiling'}</span>
            </span>
          )}
          {selectedItem.hasGas && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 shadow-2xs">
              <span>🫧</span>
              <span>{language === 'vi' ? 'Sủi bọt khí' : 'Gas Evolution'}</span>
            </span>
          )}
          {selectedItem.hasPrecipitate && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 shadow-2xs">
              <span>⬇️</span>
              <span>
                {language === 'vi'
                  ? `Kết tủa: ${selectedItem.precipitateSubstance || ''} (${selectedItem.precipitateMass_g?.toFixed(2)}g)`
                  : `Precipitate (${selectedItem.precipitateMass_g?.toFixed(2)}g)`}
              </span>
            </span>
          )}
          {selectedItem.hasSilverMirror && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-slate-600" />
              <span>{language === 'vi' ? 'Lớp tráng gương bạc' : 'Silver Mirror Coating'}</span>
            </span>
          )}
          {selectedItem.isStirred && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
              <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
              <span>{language === 'vi' ? 'Đang khuấy' : 'Stirring'}</span>
            </span>
          )}
          {selectedItem.isSealed && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>{language === 'vi' ? 'Đã đậy kín' : 'Sealed'}</span>
            </span>
          )}
        </div>
      )}

      {/* Quick In-Place Action Bar */}
      {selectedItem.isContainer && (
        <div className="px-4 py-2 border-b border-slate-200 bg-white grid grid-cols-4 gap-1.5">
          <button
            onClick={() => toggleStir(selectedItem.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold border transition-all ${
              selectedItem.isStirred
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={language === 'vi' ? 'Khuấy đều dung dịch' : 'Stir'}
          >
            <RotateCw className={`w-3.5 h-3.5 mb-0.5 ${selectedItem.isStirred ? 'animate-spin' : ''}`} />
            <span>{language === 'vi' ? 'Khuấy' : 'Stir'}</span>
          </button>

          <button
            onClick={() => addDistilledWater(selectedItem.id, 25)}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 transition-all"
            title={language === 'vi' ? 'Thêm 25 mL nước cất' : 'Add 25 mL distilled water'}
          >
            <Droplet className="w-3.5 h-3.5 mb-0.5 text-sky-500" />
            <span>+H₂O (25mL)</span>
          </button>

          <button
            onClick={() => toggleSeal(selectedItem.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold border transition-all ${
              selectedItem.isSealed
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={selectedItem.isSealed ? (language === 'vi' ? 'Mở nút' : 'Unseal') : (language === 'vi' ? 'Đậy nút kín' : 'Seal')}
          >
            {selectedItem.isSealed ? <Lock className="w-3.5 h-3.5 mb-0.5" /> : <Unlock className="w-3.5 h-3.5 mb-0.5" />}
            <span>{selectedItem.isSealed ? (language === 'vi' ? 'Mở nút' : 'Unseal') : (language === 'vi' ? 'Đậy nút' : 'Seal')}</span>
          </button>

          <button
            onClick={() => emptyEquipment(selectedItem.id)}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 transition-all"
            title={language === 'vi' ? 'Đổ bỏ hóa chất & tráng rửa' : 'Empty and rinse'}
          >
            <Eraser className="w-3.5 h-3.5 mb-0.5 text-amber-600" />
            <span>{language === 'vi' ? 'Rửa sạch' : 'Rinse'}</span>
          </button>
        </div>
      )}

      {/* Chemical Composition Breakdown */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedItem.isContainer && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{language === 'vi' ? 'Thành phần hóa học' : 'Contents'}</span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">
                {selectedItem.contents.length} {language === 'vi' ? 'chất' : 'species'}
              </span>
            </h4>

            {selectedItem.contents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                {language === 'vi' ? 'Bình rỗng, chưa có hóa chất nào.' : 'Vessel is empty.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {selectedItem.contents.map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{formatFormulaUnicode(item.formula)}</span><button aria-label={`Xem cấu trúc ${item.formula}`} className="ml-2 text-xs text-teal-700 underline" onClick={()=>window.dispatchEvent(new CustomEvent('chemdex:structure',{detail:{chemical:CHEMICAL_CATALOG.find(c=>c.formula===item.formula)?.id,formula:item.formula}}))}>3D ↗</button>
                      <span className="ml-1 text-[10px] text-slate-500 font-sans font-medium uppercase">({item.state})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-700 font-semibold">{item.moles.toFixed(4)} mol</div>
                      {item.concentration_M !== undefined && (
                        <div className="text-[11px] text-blue-600 font-medium">{item.concentration_M.toFixed(3)} M</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Observable Phenomena Alert Cards */}
        {selectedItem.hasPrecipitate && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="font-bold text-amber-800">
              {language === 'vi' ? 'Kết tủa xuất hiện:' : 'Precipitate present:'}
            </span>
            <p className="text-amber-700 mt-0.5 font-mono">
              {formatFormulaUnicode(selectedItem.precipitateSubstance || '')} ({selectedItem.precipitateMass_g?.toFixed(3)} g)
            </p>
          </div>
        )}

        {selectedItem.hasGas && (
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
            <span className="font-bold text-blue-800">
              {language === 'vi' ? 'Sủi bọt khí:' : 'Effervescence:'}
            </span>
            <p className="text-blue-700 mt-0.5">
              {language === 'vi' ? 'Khí thoát ra ngoài môi trường liên tục.' : 'Active gas bubbles rising and escaping.'}
            </p>
          </div>
        )}

        {selectedItem.hasPhaseSeparation && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs">
            <span className="font-bold text-amber-900">
              {language === 'vi' ? 'Tách lớp pha hữu cơ (Este):' : 'Immiscible Organic Layer:'}
            </span>
            <p className="text-amber-800 mt-0.5">
              {language === 'vi'
                ? `Lớp este không tan trong nước, nhẹ hơn nổi lên trên bề mặt (~${selectedItem.organicLayerVolume_ml?.toFixed(1) || 5} mL).`
                : `Organic ester layer separates and floats on aqueous phase (~${selectedItem.organicLayerVolume_ml?.toFixed(1) || 5} mL).`}
            </p>
          </div>
        )}

        {selectedItem.hasFumes && (
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
            <span className="font-bold text-purple-900">
              {language === 'vi' ? 'Khói / Hơi hóa chất:' : 'Chemical Fumes / Vapor:'}
            </span>
            <p className="text-purple-800 mt-0.5">
              {selectedItem.fumeType === 'no2'
                ? (language === 'vi' ? 'Khí NO₂ màu nâu đỏ độc hại bốc lên cuồn cuộn.' : 'Reddish-brown toxic NO₂ gas fumes evolving.')
                : selectedItem.fumeType === 'nh4cl'
                ? (language === 'vi' ? 'Khói trắng NH₄Cl hình thành từ hơi NH₃ và HCl.' : 'Dense white NH₄Cl smoke forming.')
                : (language === 'vi' ? 'Hơi nước sôi bốc lên liên tục.' : 'Steam vapor evolving from boiling liquid.')}
            </p>
          </div>
        )}

        {/* Gemini AI Dynamic Prediction Trigger */}
        {selectedItem.isContainer && selectedItem.contents.length >= 2 && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white border border-indigo-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>{language === 'vi' ? 'Dự đoán phản ứng AI' : 'AI Reaction Prediction'}</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              {language === 'vi'
                ? 'Sử dụng mô hình gemini-3.5-flash-lite để dự đoán sản phẩm và hiện tượng phản ứng.'
                : 'Use gemini-3.5-flash-lite to predict products and reaction phenomena.'}
            </p>
            <button
              onClick={handleGeminiAnalyze}
              disabled={isAiAnalyzing}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xs transition-all disabled:opacity-50"
            >
              {isAiAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'vi' ? 'Phân tích với Gemini 3.5' : 'Analyze with Gemini 3.5'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Precision Add Chemical Form */}
        {selectedItem.isContainer && (
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {language === 'vi' ? 'Thêm hóa chất vào bình' : 'Add Chemical to Vessel'}
            </h4>
            <div className="space-y-2">
              <select
                value={selectedChemicalId}
                onChange={e => setSelectedChemicalId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {CHEMICAL_CATALOG.map(c => (
                  <option key={c.id} value={c.id}>
                    {formatFormulaUnicode(c.formula)} — {language === 'vi' ? c.name_vi : c.name_en}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={selectedItem.capacity_ml}
                  value={addVolume}
                  onChange={e => setAddVolume(Number(e.target.value))}
                  className="w-24 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-500 font-medium">mL</span>
                <button
                  onClick={() => addChemicalToEquipment(selectedItem.id, selectedChemicalId, addVolume)}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Thêm' : 'Add'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Primary Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
        {selectedItem.isContainer && (
          <button
            onClick={() => openTransferModal(selectedItem.id)}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-2xs"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>{language === 'vi' ? 'Rót / Chuyển chất sang bình khác' : 'Transfer / Pour to Vessel'}</span>
          </button>
        )}

        <button
          onClick={() => toggleAIAssistant(true)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-2xs"
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>{language === 'vi' ? 'Hỏi AI Gemini về bình này' : 'Ask Gemini AI about this vessel'}</span>
        </button>

        {selectedItem.type === 'bunsen_burner' && (
          <button
            onClick={() => toggleHeat(selectedItem.id)}
            className={`w-full flex items-center justify-center gap-2 font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-2xs ${
              selectedItem.isOn
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{selectedItem.isOn ? (language === 'vi' ? 'Tắt ngọn lửa' : 'Extinguish Flame') : (language === 'vi' ? 'Đốt ngọn lửa' : 'Ignite Flame')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
