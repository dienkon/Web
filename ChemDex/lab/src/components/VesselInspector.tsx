import React, { useState } from 'react';
import { useAppStore, getChemical } from '../store/useAppStore';
import { 
  Trash2, Copy, Lock, Unlock, RotateCw, Focus, 
  Thermometer, Gauge, Beaker, Flame, Snowflake, 
  Sparkles, FlaskConical, TestTube, Check, Edit2, ArrowRight, Bot,
  AlertTriangle, RefreshCw, Droplets, Wind, Sliders
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
    replaceShatteredVessel,
    grindMortar,
    toggleStopcock,
    cleanVesselStain,
    squirtWashBottle,
    invertVolumetricFlask,
    toggleCondenserWater,
    sealVessel,
    toggleGripWithTongs,
    placeTestTubeInRack,
    removeTestTubeFromRack,
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

      {/* Shattered Glassware Critical Alert */}
      {vessel.isShattered && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-red-700 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
            <div className="text-xs">
              <p className="font-bold">{t('Vessel Shattered!', 'Dụng cụ vỡ vụn!')}</p>
              <p className="text-[11px] text-red-600/90 mt-0.5">
                {vessel.shatterReason || t('Thermal shock or physical stress fractured the glassware.', 'Sốc nhiệt hoặc va đập đã phá hủy dụng cụ.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => replaceShatteredVessel(vessel.id)}
            className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw size={13} />
            <span>{t('Replace with New Glassware', 'Thay dụng cụ mới')}</span>
          </button>
        </div>
      )}

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

      {/* Physical State Tags (Precipitate, Gas, Fog, Fumes, Bumping, Pulverized) */}
      {(vessel.hasPrecipitate || vessel.hasGas || vessel.isExplosion || vessel.isSuperheated || vessel.bumpingSurge || (vessel.condensationMist || 0) > 0.15 || (vessel.fumingIntensity || 0) > 0.2 || vessel.isPulverized) && (
        <div className="flex flex-wrap gap-1.5">
          {vessel.isSuperheated && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-800 border border-red-200 flex items-center gap-1 animate-pulse">
              <Flame size={11} className="text-red-600" />
              {t('Superheated (Bumping Risk)', 'Quá nhiệt (Nguy cơ nổ bọt)')}
            </span>
          )}
          {vessel.bumpingSurge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
              <AlertTriangle size={11} className="text-orange-600" />
              {t('Bumping Surge!', 'Sôi trào đột ngột!')}
            </span>
          )}
          {((vessel.condensationMist || 0) > 0.15) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
              <Droplets size={11} className="text-cyan-600" />
              {t('Headspace Mist', 'Hơi đọng thành bình')}
            </span>
          )}
          {((vessel.fumingIntensity || 0) > 0.2) && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
              <Wind size={11} className="text-rose-600" />
              {t('Aerosol Fuming', 'Bốc khói hơi')}
            </span>
          )}
          {vessel.isPulverized && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Check size={11} className="text-emerald-600" />
              {t('Finely Pulverized', 'Đã nghiền mịn')}
            </span>
          )}
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

      {/* Evaporative Waterline Stain Ring */}
      {((vessel.stainIntensity || 0) > 0.05) && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" 
              style={{ backgroundColor: vessel.stainColor || '#b45309' }} 
            />
            <div>
              <span className="font-bold text-amber-900 block">{t('Waterline Stain Ring', 'Vệt cặn bám thành bình')}</span>
              <span className="text-[10px] text-amber-700">
                {t('Evaporative residue deposits', 'Lắng cặn bay hơi')}: {Math.round((vessel.stainIntensity || 0) * 100)}%
              </span>
            </div>
          </div>
          <button
            onClick={() => cleanVesselStain(vessel.id)}
            className="py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors shrink-0"
          >
            {t('Scrub Clean', 'Cọ rửa')}
          </button>
        </div>
      )}

      {/* Mortar & Pestle Grinding Control */}
      {vessel.type === 'mortar_pestle' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Mortar & Pestle Pulverizer', 'Cối & Chày Nghiền')}</span>
            <span className="text-[10px] font-mono text-slate-500">
              {vessel.isPulverized ? t('Powder', 'Dạng bột') : t('Solid chunks', 'Dạng hạt')}
            </span>
          </div>
          <button
            onClick={() => grindMortar(vessel.id)}
            className="w-full py-1.5 px-3 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <RotateCw size={13} />
            <span>{t('Grind Solids with Pestle', 'Dùng chày nghiền mịn chất rắn')}</span>
          </button>
        </div>
      )}

      {/* Separatory Funnel Stopcock Control */}
      {vessel.type === 'separatory_funnel' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Separatory Funnel Valve', 'Khóa van phễu chiết')}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              vessel.stopcockOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {vessel.stopcockOpen ? t('Open (Draining)', 'Đang mở (Xả đáy)') : t('Closed (Sealed)', 'Đang khóa')}
            </span>
          </div>
          
          {((vessel.immiscibleOrganicVolume_ml || 0) > 0) && (
            <div className="bg-white/90 p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{t('Upper Organic Layer', 'Pha hữu cơ phía trên')}:</span>
                <span className="font-mono font-bold text-slate-800">{vessel.immiscibleOrganicVolume_ml?.toFixed(1)} mL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{t('Lower Aqueous Layer', 'Pha nước phía dưới')}:</span>
                <span className="font-mono font-bold text-slate-800">{vessel.volume_ml.toFixed(1)} mL</span>
              </div>
            </div>
          )}

          <button
            onClick={() => toggleStopcock(vessel.id)}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
              vessel.stopcockOpen 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Sliders size={13} />
            <span>{vessel.stopcockOpen ? t('Close Stopcock Valve', 'Đóng khóa van xả') : t('Open Stopcock Valve (Drain)', 'Mở khóa van xả đáy')}</span>
          </button>
        </div>
      )}

      {/* Filter Funnel Filtration & Residue Control */}
      {vessel.type === 'filter_funnel' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Gravity Filtration Funnel', 'Phễu Lọc Trọng Lực')}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              vessel.isFiltrating ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {vessel.isFiltrating ? t('Dripping Filtrate...', 'Đang lọc...') : t('Ready', 'Sẵn sàng')}
            </span>
          </div>

          {((vessel.filterPaperResidue_g || 0) > 0 || (vessel.hasPrecipitate && (vessel.precipitateAmount_g || 0) > 0)) && (
            <div className="bg-amber-50/90 border border-amber-200 p-2 rounded-lg text-[11px] space-y-1">
              <div className="flex justify-between items-center font-bold text-amber-900">
                <span>{t('Filter Paper Residue Cake', 'Cặn kết tủa trên giấy lọc')}:</span>
                <span className="font-mono">
                  {((vessel.filterPaperResidue_g || 0) + (vessel.hasPrecipitate ? (vessel.precipitateAmount_g || 0) : 0)).toFixed(2)} g
                </span>
              </div>
              <div className="text-[10px] text-amber-700">
                {t('Substance', 'Chất rắn')}: {vessel.filterPaperResidueSubstance || vessel.precipitateSubstance || 'Precipitate'}
              </div>
            </div>
          )}

          <button
            onClick={() => setVesselState(vessel.id, { filterPaperResidue_g: 0, filterPaperResidueSubstance: undefined, hasPrecipitate: false, precipitateAmount_g: 0 })}
            disabled={(vessel.filterPaperResidue_g || 0) === 0 && !vessel.hasPrecipitate}
            className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-40"
          >
            <Sparkles size={13} />
            <span>{t('Replace / Scrape Filter Paper', 'Thay giấy lọc / Thu hồi cặn')}</span>
          </button>
        </div>
      )}

      {/* Volumetric Flask Inversion & Calibration Control */}
      {vessel.type === 'volumetric_flask' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Volumetric Standard Flask (100 mL)', 'Bình Định Mức Chuẩn (100 mL)')}</span>
            <span className="text-[10px] font-mono text-blue-600 font-bold">
              {vessel.volume_ml.toFixed(1)} / {vessel.capacity_ml || 100} mL
            </span>
          </div>

          <button
            onClick={() => invertVolumetricFlask(vessel.id)}
            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            title={t('Invert flask repeatedly to homogenize and dissolve solutes', 'Dốc ngược bình nhiều lần để hòa tan hoàn toàn chất tan')}
          >
            <RotateCw size={13} />
            <span>{t('Stopper & Invert Mix (Dissolve All)', 'Đậy nút & Dốc ngược trộn đều')}</span>
          </button>
        </div>
      )}

      {/* Liebig Condenser Water Circulation Control */}
      {vessel.type === 'condenser' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Liebig Condenser Jacket', 'Áo Sinh Hàn Liebig')}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              vessel.coolingWaterActive ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {vessel.coolingWaterActive ? t('Cooling Water ON', 'Nước làm mát ĐANG MỞ') : t('Water OFF', 'ĐANG TẮT')}
            </span>
          </div>

          <button
            onClick={() => toggleCondenserWater(vessel.id)}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
              vessel.coolingWaterActive 
                ? 'bg-slate-600 hover:bg-slate-700 text-white' 
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            <Droplets size={13} />
            <span>{vessel.coolingWaterActive ? t('Turn OFF Cooling Water', 'Tắt dòng nước làm mát') : t('Turn ON Cooling Water', 'Bật dòng nước làm mát')}</span>
          </button>
        </div>
      )}

      {/* Squeeze Wash Bottle Control */}
      {vessel.type === 'wash_bottle' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Distilled Water Wash Bottle', 'Bình Tia Nước Cất')}</span>
            <span className="text-[10px] font-mono text-slate-600 font-bold">
              {vessel.volume_ml.toFixed(0)} / {vessel.capacity_ml || 250} mL
            </span>
          </div>

          <button
            onClick={() => squirtWashBottle(vessel.id)}
            disabled={vessel.volume_ml <= 0}
            className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-40"
          >
            <Droplets size={13} />
            <span>{t('Squirt 15 mL Distilled Water', 'Tia 15 mL nước cất')}</span>
          </button>
        </div>
      )}

      {/* Test Tube Rack Slot Management */}
      {vessel.type === 'test_tube_rack' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Test Tube Rack (4 Slots)', 'Giá Ống Nghiệm (4 Vị Trí)')}</span>
            <span className="text-[10px] font-mono font-bold text-amber-800">
              {(vessel.slottedTestTubeIds?.length || 0)} / 4 {t('Slotted', 'Ống')}
            </span>
          </div>

          {selectedVesselId && selectedVesselId !== vessel.id && vessels[selectedVesselId]?.type === 'test_tube' && !(vessel.slottedTestTubeIds || []).includes(selectedVesselId) && (vessel.slottedTestTubeIds?.length || 0) < 4 && (
            <button
              onClick={() => placeTestTubeInRack(vessel.id, selectedVesselId)}
              className="w-full py-1.5 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <TestTube size={13} />
              <span>{t('Insert Selected Tube into Rack', 'Cắm ống nghiệm đã chọn vào giá')}</span>
            </button>
          )}

          {(vessel.slottedTestTubeIds || []).length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-slate-400 font-bold block">{t('Tubes in Rack', 'Các ống đang cắm trên giá')}:</span>
              {vessel.slottedTestTubeIds!.map((tubeId, idx) => {
                const tube = vessels[tubeId];
                if (!tube) return null;
                return (
                  <div key={tubeId} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-mono text-slate-700 truncate">{idx + 1}. {tube.name}</span>
                    <button
                      onClick={() => removeTestTubeFromRack(vessel.id, tubeId)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded text-[10px] font-bold transition-colors"
                    >
                      {t('Eject', 'Rút ra')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lab Tongs Grip Management */}
      {vessel.type === 'tongs' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Laboratory Crucible Tongs', 'Kẹp Gắp Phòng Thí Nghiệm')}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              vessel.grippedVesselId ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {vessel.grippedVesselId ? t('Gripping Vessel', 'Đang kẹp bình') : t('Idle (Open)', 'Đang mở')}
            </span>
          </div>

          {vessel.grippedVesselId ? (
            <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-700 truncate">{t('Holding', 'Đang giữ')}: <b>{vessels[vessel.grippedVesselId]?.name || vessel.grippedVesselId}</b></span>
              <button
                onClick={() => toggleGripWithTongs(vessel.id, vessel.grippedVesselId!)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {t('Release', 'Nhả kẹp')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (selectedVesselId && selectedVesselId !== vessel.id) {
                  toggleGripWithTongs(vessel.id, selectedVesselId);
                }
              }}
              disabled={!selectedVesselId || selectedVesselId === vessel.id}
              className="w-full py-1.5 px-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-40"
            >
              <Sliders size={13} />
              <span>{t('Grip Selected Target Vessel', 'Kẹp bình thí nghiệm đã chọn')}</span>
            </button>
          )}
        </div>
      )}

      {/* Rubber Stopper & Overpressure Monitoring (For sealable vessels) */}
      {['flask', 'erlenmeyer', 'test_tube', 'volumetric_flask', 'beaker'].includes(vessel.type) && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">{t('Rubber Stopper & Pressure', 'Nút Cao Su & Áp Suất Khí')}</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                vessel.isSealed ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {vessel.isSealed ? t('Sealed', 'Đã đậy kín') : t('Open', 'Mở nắp')}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-600">
                {(vessel.internalPressure_atm || 1.0).toFixed(2)} atm
              </span>
            </div>
          </div>

          {vessel.isSealed && (vessel.internalPressure_atm || 1.0) > 1.8 && (
            <div className="bg-red-50 border border-red-300 p-2 rounded-lg text-[11px] text-red-800 font-bold flex items-center gap-1.5 animate-pulse">
              <AlertTriangle size={14} className="text-red-600 shrink-0" />
              <span>{t('CRITICAL OVERPRESSURE! Danger of explosion (> 2.50 atm)', 'NGUY HIỂM ÁP SUẤT CAO! Nguy cơ nổ vỡ bình (> 2.50 atm)')}</span>
            </div>
          )}

          <button
            onClick={() => sealVessel(vessel.id)}
            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${
              vessel.isSealed 
                ? 'bg-purple-700 hover:bg-purple-800 text-white' 
                : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
          >
            <Lock size={13} />
            <span>{vessel.isSealed ? t('Remove Stopper (Vent Pressure)', 'Tháo nút cao su (Xả khí)') : t('Seal Vessel with Stopper', 'Đậy kín nút cao su')}</span>
          </button>
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
              ph: 7.0,
              stainIntensity: 0,
              stainColor: undefined,
              stainHeight: undefined,
              condensationMist: 0,
              isSuperheated: false,
              bumpingSurge: false,
              fumingIntensity: 0,
              immiscibleOrganicVolume_ml: 0,
              isPulverized: false
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
