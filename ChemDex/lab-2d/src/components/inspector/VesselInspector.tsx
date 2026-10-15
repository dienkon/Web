import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import { Flame, Droplets, Trash2, ArrowRightLeft, Plus, Thermometer, Gauge, Beaker, Sparkles, Loader2 } from 'lucide-react';

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
    language,
  } = useLabStore();

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
      <div className="w-80 h-full bg-white border-l border-slate-200 p-5 flex flex-col justify-center items-center text-center text-slate-400 select-none">
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
    <div className="w-84 h-full bg-white border-l border-slate-200 flex flex-col select-none shadow-xs">
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
                      <span className="font-bold text-slate-800 text-sm">{formatFormulaUnicode(item.formula)}</span>
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
