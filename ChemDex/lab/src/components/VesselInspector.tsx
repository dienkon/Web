import React, { useState } from 'react';
import { useAppStore, getChemical } from '../store/useAppStore';
import { 
  Trash2, Copy, Lock, Unlock, RotateCw, Focus, 
  Thermometer, Gauge, Beaker, Flame, Snowflake, 
  Sparkles, FlaskConical, TestTube, Check, Edit2, ArrowRight, Bot
} from 'lucide-react';
import { formatTemperature, formatPH, formatVolume } from '../utils/units';
import { AIReactionQueryModal } from './AIReactionQueryModal';

export function VesselInspector() {
  const { 
    selectedVesselId, 
    setSelectedVesselId, 
    vessels, 
    vesselIds,
    setVesselState, 
    duplicateVessel, 
    removeVessel, 
    toggleLockVessel, 
    focusVessel, 
    language 
  } = useAppStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  const vessel = selectedVesselId ? vessels[selectedVesselId] : null;

  // Empty state if no vessel is selected
  if (!vessel) {
    return (
      <div className="text-center py-10 px-3 space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
          <Beaker size={24} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">
            {t('No Vessel Selected', 'Chưa chọn bình thí nghiệm')}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {t('Click on any beaker, flask, or test tube on the workbench to inspect parameters, adjust temperature, test pH, or clean.', 'Nhấp vào bất kỳ bình hoặc ống nghiệm nào trên bàn để xem thông số, điều chỉnh nhiệt độ, thử pH hoặc rửa sạch.')}
          </p>
        </div>

        {/* Quick select buttons for existing vessels */}
        {vesselIds.length > 0 && (
          <div className="space-y-1.5 pt-2 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              {t('Vessels on Workbench', 'Bình trên bàn thí nghiệm')} ({vesselIds.length})
            </span>
            <div className="space-y-1">
              {vesselIds.map(id => {
                const v = vessels[id];
                if (!v) return null;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedVesselId(id);
                      focusVessel(id);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        {v.type === 'flask' ? <FlaskConical size={13} /> : v.type === 'test_tube' ? <TestTube size={13} /> : <Beaker size={13} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600">
                          {v.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {v.volume_ml.toFixed(0)} / {v.capacity_ml} mL
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleStartEditName = () => {
    setEditedName(vessel.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      setVesselState(vessel.id, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const fillPercentage = Math.min(100, Math.round((vessel.volume_ml / (vessel.capacity_ml || 100)) * 100));

  // Determine pH description and color
  const getPHColor = (ph: number) => {
    if (ph < 3) return 'bg-red-500/15 text-red-700 border-red-300';
    if (ph < 6) return 'bg-amber-500/15 text-amber-800 border-amber-300';
    if (ph <= 8) return 'bg-emerald-500/15 text-emerald-800 border-emerald-300';
    if (ph <= 11) return 'bg-blue-500/15 text-blue-800 border-blue-300';
    return 'bg-purple-500/15 text-purple-800 border-purple-300';
  };

  const getPHLabel = (ph: number) => {
    if (ph < 3) return t('Strong Acid', 'Axit mạnh');
    if (ph < 6) return t('Weak Acid', 'Axit yếu');
    if (ph <= 8) return t('Neutral', 'Trung tính');
    if (ph <= 11) return t('Weak Base', 'Bazo yếu');
    return t('Strong Base', 'Bazo mạnh');
  };

  const handleCoolDown = () => {
    setVesselState(vessel.id, { temperature_c: 25, isBoiling: false });
  };

  const handleHeatUp = () => {
    const newTemp = Math.min(100, vessel.temperature_c + 35);
    setVesselState(vessel.id, { 
      temperature_c: newTemp, 
      isBoiling: newTemp >= 95 
    });
  };

  const handleRemoveSubstance = (formulaToRemove: string) => {
    const remaining = vessel.substances.filter(s => s !== formulaToRemove);
    if (remaining.length === 0) {
      setVesselState(vessel.id, {
        substances: [],
        contents: [],
        volume: 0,
        volume_ml: 0,
        liquidColor: undefined,
        hasPrecipitate: false,
        precipitateColor: undefined,
        isBoiling: false,
        hasGas: false,
        gasColor: undefined,
        temperature_c: 25,
        ph: 7.0
      });
    } else {
      const volPerItem = vessel.volume_ml / vessel.substances.length;
      const newVol = Math.max(0, vessel.volume_ml - volPerItem);
      setVesselState(vessel.id, {
        substances: remaining,
        volume_ml: newVol,
        volume: Math.min(1.0, newVol / vessel.capacity_ml)
      });
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Vessel Header Card */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
              {vessel.type === 'flask' ? (
                <FlaskConical size={17} className="text-blue-400" />
              ) : vessel.type === 'test_tube' ? (
                <TestTube size={17} className="text-blue-400" />
              ) : (
                <Beaker size={17} className="text-blue-400" />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    value={editedName} 
                    onChange={e => setEditedName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                    autoFocus
                    className="w-full bg-slate-800 text-xs px-2 py-1 rounded border border-blue-500 outline-none text-white font-bold"
                  />
                  <button onClick={handleSaveName} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={handleStartEditName}>
                  <span className="text-xs font-bold tracking-wide truncate">{vessel.name}</span>
                  <Edit2 size={11} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                </div>
              )}
              <span className="text-[10px] text-slate-400 block font-mono capitalize mt-0.5">
                {vessel.type} • {vessel.capacity_ml} mL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button 
              onClick={() => focusVessel(vessel.id)} 
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={t('Focus camera on vessel', 'Tập trung camera vào bình')}
            >
              <Focus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Metrics & Gauge */}
      <div className="grid grid-cols-2 gap-2">
        {/* Volume Fill */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Gauge size={12} /> {t('Volume', 'Thể tích')}</span>
            <span className="font-bold text-slate-700 font-mono">{fillPercentage}%</span>
          </div>
          <div className="mt-1.5">
            <span className="text-xs font-bold text-slate-900 block">{formatVolume(vessel.volume_ml)}</span>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${fillPercentage}%`,
                  backgroundColor: vessel.liquidColor || '#3b82f6'
                }} 
              />
            </div>
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Thermometer size={12} /> {t('Temp', 'Nhiệt độ')}</span>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={handleCoolDown}
                title={t('Cool to room temperature (25°C)', 'Làm nguội về nhiệt độ phòng')}
                className="p-0.5 hover:text-blue-600 rounded transition-colors"
              >
                <Snowflake size={11} />
              </button>
              <button 
                onClick={handleHeatUp}
                title={t('Heat up (+35°C)', 'Gia nhiệt (+35°C)')}
                className="p-0.5 hover:text-amber-600 rounded transition-colors"
              >
                <Flame size={11} />
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className={`text-xs font-bold font-mono ${vessel.temperature_c > 70 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatTemperature(vessel.temperature_c)}
            </span>
            {vessel.isBoiling && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded uppercase">
                {t('Boiling', 'Sôi')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* pH Indicator Pill */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: vessel.liquidColor || '#3b82f6' }} />
          pH Value
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-800">{formatPH(vessel.ph)}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPHColor(vessel.ph)}`}>
            {getPHLabel(vessel.ph)}
          </span>
        </div>
      </div>

      {/* Physical State Tags (Precipitate, Gas, etc) */}
      {(vessel.hasPrecipitate || vessel.hasGas || vessel.isExplosion) && (
        <div className="flex flex-wrap gap-1.5">
          {vessel.hasPrecipitate && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-600" />
              {t('Precipitate', 'Kết tủa')}
            </span>
          )}
          {vessel.hasGas && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              {t('Gas evolving', 'Khí sủi bọt')}
            </span>
          )}
        </div>
      )}

      {/* Dissolved Substances List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider px-0.5">
          <span>{t('Contents & Reagents', 'Thành phần trong bình')}</span>
          <span className="text-[10px] font-mono text-slate-400">({vessel.substances.length})</span>
        </div>

        {vessel.substances.length === 0 ? (
          <div className="p-3 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
            {t('Vessel is currently empty', 'Bình hiện đang rỗng')}
          </div>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
            {vessel.substances.map((formula, idx) => {
              const chem = getChemical(formula);
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" 
                      style={{ backgroundColor: chem.color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate">{chem.formula}</span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {language === 'en' ? chem.name_en : chem.name_vi}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveSubstance(formula)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors shrink-0"
                    title={t('Remove chemical', 'Loại bỏ hóa chất')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lab Interaction Fast Actions */}
      <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
        {/* AI Query Button for In-Depth Reaction Analysis & Operational Guidance */}
        <button
          onClick={() => setIsAIModalOpen(true)}
          disabled={vessel.substances.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none group"
          title={t('Query AI for specific thermodynamic parameters, kinetics, and operational steps', 'Truy vấn chi tiết AI từng thông số cụ thể và thao tác')}
        >
          <Bot size={14} className="text-blue-200 group-hover:scale-110 transition-transform" />
          <span>{t('Query AI Details (Kinetics & Steps)', 'Truy vấn AI (Thông số & Thao tác)')}</span>
        </button>

        {/* Primary Lab Tools: Litmus & Stir */}
        <div className="flex gap-2">
          <button
            onClick={() => useAppStore.getState().setActiveLitmusVesselId(vessel.id)}
            disabled={vessel.volume_ml <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
            title={t('Dip litmus paper to test pH', 'Nhúng giấy quỳ tím để thử độ pH')}
          >
            <span className="w-2 h-3.5 bg-amber-200 border border-amber-400 rounded-2xs inline-block" />
            <span>{t('Litmus', 'Quỳ tím')}</span>
          </button>

          <button
            onClick={() => useAppStore.getState().stirVessel(vessel.id)}
            disabled={vessel.volume_ml <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none shadow-2xs"
            title={t('Stir with glass rod', 'Khuấy đều bằng đũa thủy tinh')}
          >
            <RotateCw size={13} className="text-blue-500" />
            <span>{t('Stir Rod', 'Khuấy đều')}</span>
          </button>
        </div>

        {/* Secondary Vessel Controls */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button 
            onClick={() => setVesselState(vessel.id, { 
              substances: [], 
              contents: [],
              volume: 0, 
              volume_ml: 0, 
              liquidColor: undefined, 
              hasPrecipitate: false, 
              precipitateColor: undefined, 
              isBoiling: false, 
              hasGas: false, 
              gasColor: undefined, 
              isExplosion: false,
              temperature_c: 25,
              ph: 7.0
            })}
            className="col-span-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-1.5 rounded-lg font-semibold text-[11px] transition-colors"
            title={t('Clean/Empty Vessel', 'Rửa sạch bình')}
          >
            <Trash2 size={13} />
            <span>{t('Clean', 'Rửa')}</span>
          </button>

          <button 
            onClick={() => duplicateVessel(vessel.id)}
            className="col-span-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-1.5 rounded-lg font-semibold text-[11px] transition-colors"
            title={t('Duplicate Vessel', 'Nhân bản bình')}
          >
            <Copy size={13} />
            <span>{t('Copy', 'Sao')}</span>
          </button>

          <button 
            onClick={() => toggleLockVessel(vessel.id)}
            className={`col-span-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg font-semibold text-[11px] transition-colors ${
              vessel.isLocked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={vessel.isLocked ? t('Unlock position', 'Mở khóa vị trí') : t('Lock position', 'Khóa vị trí')}
          >
            {vessel.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{vessel.isLocked ? t('Locked', 'Khóa') : t('Lock', 'Khóa')}</span>
          </button>

          <button 
            onClick={() => removeVessel(vessel.id)}
            className="col-span-1 flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 px-1.5 rounded-lg font-semibold text-[11px] transition-colors"
            title={t('Delete Vessel', 'Xóa bình')}
          >
            <Trash2 size={13} />
            <span>{t('Del', 'Xóa')}</span>
          </button>
        </div>
      </div>

      {/* AI Reaction & Operational Details Modal */}
      <AIReactionQueryModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        vesselId={vessel.id}
      />
    </div>
  );
}
