import React, { useState, useEffect } from 'react';
import { LabScene } from './components/three/LabScene';
import { useAppStore, CHEMICALS, getChemical } from './store/useAppStore';
import { WorkbenchToolbar } from './components/WorkbenchToolbar';
import { MeasurementHUD } from './components/MeasurementHUD';
import { VesselInspector } from './components/VesselInspector';
import { TitrationPanel } from './components/TitrationPanel';
import { GuidedExperimentPanel } from './components/GuidedExperimentPanel';
import { DosageModal } from './components/DosageModal';
import { LitmusTestModal } from './components/LitmusTestModal';
import { LabReportModal } from './components/LabReportModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getChemicalHazardsAndPpe } from './engine/safetyEngine';
import { VfxGallery } from './vfx/dev/VfxGallery';
import { SimulationDebugPanel } from './simulation/ui/SimulationDebugPanel';
import { PourHUD } from './pour/hud/PourHUD';
import { PourInput } from './pour/input/PourInput';
import { 
  Beaker, FlaskConical, AlertTriangle, Info, X, Plus, Move, 
  Search, ShieldAlert, Sparkles, Droplet, Flame, TestTube, Scale, BookOpen,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose
} from 'lucide-react';

function LeftSidebar() {
  const { leftSidebarOpen, language, addVessel, isMixing } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chemicals' | 'instruments' | 'experiments' | 'safety'>('chemicals');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'liquid' | 'solid' | 'indicator'>('all');
  
  if (!leftSidebarOpen) return null;

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  // Filter chemicals
  const filteredChemicals = CHEMICALS.filter(c => {
    const matchesSearch = c.formula.toLowerCase().includes(search.toLowerCase()) || 
      (language === 'en' ? c.name_en : c.name_vi).toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'indicator') return c.category === 'indicator';
    return c.type === filterType;
  });

  // Current active chemicals on workbench for safety tab
  const allWorkbenchSubstances = Array.from(new Set(
    Object.values(useAppStore.getState().vessels).flatMap(v => v.substances)
  ));
  const safetyInfo = getChemicalHazardsAndPpe(allWorkbenchSubstances);

  return (
    <aside className="w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col z-20 shrink-0 shadow-sm max-md:absolute max-md:top-0 max-md:bottom-0 max-md:left-0 max-md:shadow-2xl transition-all duration-200">
      {/* Sidebar Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/50">
        <button 
          onClick={() => setActiveTab('chemicals')} 
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'chemicals' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Chemicals', 'Hóa chất')}
        </button>
        <button 
          onClick={() => setActiveTab('instruments')} 
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'instruments' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Equipment', 'Dụng cụ')}
        </button>
        <button 
          onClick={() => setActiveTab('experiments')} 
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'experiments' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Guide', 'Bài học')}
        </button>
        <button 
          onClick={() => setActiveTab('safety')} 
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'safety' ? 'bg-white text-amber-600 border-b-2 border-amber-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Safety', 'An toàn')}
        </button>
        <button
          onClick={useAppStore.getState().toggleLeftSidebar}
          className="md:hidden px-2.5 py-2 text-slate-400 hover:text-slate-700"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* CHEMICALS TAB */}
      {activeTab === 'chemicals' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filter pills */}
          <div className="p-2.5 border-b border-slate-100 bg-white space-y-1.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder={t('Search chemical...', 'Tìm hóa chất...')} 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors bg-slate-50/50"
              />
            </div>

            <div className="flex gap-1">
              {(['all', 'liquid', 'solid', 'indicator'] as const).map(ft => (
                <button
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase transition-colors ${
                    filterType === ft ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ft === 'all' ? t('All', 'Tất cả') : ft === 'liquid' ? t('Liquid', 'Lỏng') : ft === 'solid' ? t('Solid', 'Rắn') : t('Indicator', 'Chỉ thị')}
                </button>
              ))}
            </div>
            
            <p className="text-[10px] text-slate-400 leading-tight">
              {t('💡 Drag into vessel to weigh (g) or measure (mL).', '💡 Kéo vào bình để cân (g) hoặc đong (mL).')}
            </p>
          </div>

          {/* Chemical List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {filteredChemicals.map(chem => (
              <div 
                key={chem.formula}
                draggable={!isMixing}
                onDragStart={(e) => {
                  if (isMixing) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData('chemical', chem.formula);
                  e.dataTransfer.effectAllowed = 'copy';
                  useAppStore.getState().setIsDraggingChemical(chem.formula);
                }}
                onDragEnd={() => {
                  useAppStore.getState().setIsDraggingChemical(null);
                }}
                onClick={() => {
                  if (isMixing) return;
                  const state = useAppStore.getState();
                  const target = state.selectedVesselId || Object.keys(state.vessels)[0];
                  if (target) {
                    state.setPendingDispense({ chemical: chem.formula, targetVesselId: target });
                  }
                }}
                className={`flex items-center justify-between p-2 rounded-lg transition-all border border-slate-200/70 select-none group 
                  ${isMixing ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-blue-50/60 hover:border-blue-300 cursor-grab bg-white shadow-xs active:cursor-grabbing'}`}
                title={t('Click to measure or drag into vessel', 'Nhấn để đong/cân hoặc kéo vào bình')}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-inner shrink-0" 
                    style={{ backgroundColor: chem.color }} 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight">
                      {chem.formula}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium truncate">
                      {language === 'en' ? chem.name_en : chem.name_vi}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    chem.type === 'solid' ? 'bg-amber-100 text-amber-800' : (chem.category === 'indicator' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-800')
                  }`}>
                    {chem.type === 'solid' ? 'g' : 'mL'}
                  </span>
                  {chem.hazards.length > 0 && (
                    <span className="text-[9px] text-red-500" title={chem.hazards.join(', ')}>
                      ⚠️
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSTRUMENTS & EQUIPMENT TAB */}
      {activeTab === 'instruments' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            {t('Glassware & Containers', 'Dụng cụ thủy tinh')}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => addVessel('beaker', 'Beaker (100mL)')}
              className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-xs"
            >
              <Beaker size={22} className="text-blue-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">{t('Beaker 100mL', 'Cốc mỏ 100mL')}</span>
            </button>
            <button 
              onClick={() => addVessel('flask', 'Flask (250mL)')}
              className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-xs"
            >
              <FlaskConical size={22} className="text-blue-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">{t('Flask 250mL', 'Bình tam giác')}</span>
            </button>
            <button 
              onClick={() => addVessel('test_tube', 'Test Tube')}
              className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-xs"
            >
              <TestTube size={22} className="text-indigo-600 mb-1.5" />
              <span className="text-xs font-bold text-slate-800">{t('Test Tube', 'Ống nghiệm')}</span>
            </button>
            <button 
              onClick={() => addVessel('cylinder', 'Cylinder 100mL')}
              className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-xs"
            >
              <div className="w-3.5 h-6 border-2 border-slate-500 rounded-xs mb-1.5 flex flex-col justify-end">
                <div className="h-2 bg-blue-400 w-full" />
              </div>
              <span className="text-xs font-bold text-slate-800">{t('Graduated Cylinder', 'Ống đong')}</span>
            </button>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-3 mb-1">
            {t('Heating & Analytical Tools', 'Thiết bị đun nóng & Đo lường')}
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => useAppStore.getState().addBurner()}
              className="w-full flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Flame size={18} />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-800 block">{t('Bunsen Burner', 'Đèn cồn đun nóng')}</span>
                  <span className="text-[10px] text-slate-500">{t('Move under vessel to heat solution', 'Đặt dưới bình để đun sôi')}</span>
                </div>
              </div>
              <Plus size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* CURRICULUM & EXPERIMENTS TAB */}
      {activeTab === 'experiments' && (
        <div className="flex-1 p-3.5 overflow-y-auto">
          <GuidedExperimentPanel />
        </div>
      )}

      {/* SAFETY & PPE ADVISORY TAB */}
      {activeTab === 'safety' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>{t('Active Safety Protocol', 'Quy tắc an toàn hiện hành')}</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {t('Real-time inspection of active reagents on the workbench and mandated protective gear.', 'Kiểm tra mức độ nguy hiểm của các chất trên bàn và trang bị bảo hộ bắt buộc.')}
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t('Mandatory PPE', 'Trang thiết bị bảo hộ (PPE)')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {safetyInfo.ppe.map(item => (
                <div key={item} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="text-blue-600">✓</span>
                  <span className="capitalize">{item.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t('Identified GHS Hazards', 'Phân loại nguy hiểm GHS')}</h4>
            {safetyInfo.hazards.length === 0 ? (
              <p className="text-xs text-slate-400 italic">{t('No hazardous chemicals on table.', 'Không có hóa chất nguy hại trên bàn.')}</p>
            ) : (
              <div className="space-y-1.5">
                {safetyInfo.hazards.map(hazard => (
                  <div key={hazard} className="p-2 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-600 shrink-0" />
                    <span className="uppercase">{hazard.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function RightSidebar() {
  const { rightSidebarOpen, lastMixResult, isMixing, mixError, language, selectedVesselId } = useAppStore();
  const [activeTab, setActiveTab] = useState<'vessel' | 'reaction' | 'titration'>('vessel');
  
  // When a vessel is clicked/selected, automatically switch to vessel tab
  useEffect(() => {
    if (selectedVesselId) {
      setActiveTab('vessel');
    }
  }, [selectedVesselId]);

  // When a reaction occurs, automatically switch to reaction tab
  useEffect(() => {
    if (lastMixResult) {
      setActiveTab('reaction');
    }
  }, [lastMixResult]);

  if (!rightSidebarOpen) return null;

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  return (
    <aside className="w-80 max-w-[85vw] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-sm max-md:absolute max-md:top-0 max-md:bottom-0 max-md:right-0 max-md:shadow-2xl transition-all duration-200">
      {/* Tab Header */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/50">
        <button
          onClick={() => setActiveTab('vessel')}
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'vessel' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Vessel', 'Thông tin bình')}
        </button>
        <button
          onClick={() => setActiveTab('reaction')}
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'reaction' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Reaction', 'Phản ứng')}
        </button>
        <button
          onClick={() => setActiveTab('titration')}
          className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'titration' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t('Titration', 'Chuẩn độ')}
        </button>
        <button
          onClick={useAppStore.getState().toggleRightSidebar}
          className="md:hidden px-2.5 py-2 text-slate-400 hover:text-slate-700"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {activeTab === 'vessel' ? (
          <VesselInspector />
        ) : activeTab === 'titration' ? (
          <TitrationPanel />
        ) : (
          <>
            {isMixing && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-slate-500 font-medium animate-pulse">{t('Analyzing chemical dynamics...', 'Đang tính toán động học phản ứng...')}</p>
              </div>
            )}
            
            {mixError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                {t('Error', 'Lỗi')}: {mixError}
              </div>
            )}

            {!isMixing && !lastMixResult && !mixError && (
              <div className="text-center py-12 px-3 space-y-2.5">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">{t('Awaiting Experiment Action', 'Đang đợi thao tác thí nghiệm')}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {t('Pour or mix chemicals into any vessel to observe realistic color transformations, precipitates, gas generation, and balanced equations.', 'Rót hoặc pha trộn hóa chất vào bình để quan sát sự chuyển màu, kết tủa, thoát khí và phương trình ion.')}
                </p>
              </div>
            )}

            {!isMixing && lastMixResult && (
              <div className="space-y-3 text-xs">
                {/* Summary & Resolution Provenance */}
                <section className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Reaction Overview', 'Tổng quan phản ứng')}</h3>
                    {((lastMixResult as any)._resolutionSource || (lastMixResult.confidence === 1.0 ? 'deterministic' : null)) && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-100 text-blue-800">
                        {(lastMixResult as any)._resolutionSource === 'firestore'
                          ? t('Database Verified', 'Đã lưu DB')
                          : (lastMixResult as any)._resolutionSource === 'memory_cache'
                          ? t('Cached', 'Bộ nhớ đệm')
                          : (lastMixResult as any)._resolutionSource === 'gemini'
                          ? t('AI Analyzed', 'Phân tích AI')
                          : t('Standard Reaction', 'Phản ứng chuẩn')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">{lastMixResult.summary}</p>
                </section>

                {/* Balanced Chemical Equation */}
                <section className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Balanced Chemical Equation', 'Phương trình hóa học')}</h3>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs shadow-inner break-words">
                    {lastMixResult.equation}
                  </div>
                  {lastMixResult.ionic_equation && (
                    <div className="bg-slate-100 p-2 rounded-lg font-mono text-[11px] text-slate-700 border border-slate-200 break-words">
                      <div className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">{t('Net Ionic Equation', 'Phương trình ion thu gọn')}</div>
                      {lastMixResult.ionic_equation}
                    </div>
                  )}
                </section>
                
                {/* Physical Observations */}
                <section className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Physical Phenomena', 'Hiện tượng quan sát được')}</h3>
                  <p className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-slate-700 leading-relaxed">
                    {lastMixResult.observable_changes}
                  </p>
                </section>

                {/* Safety Advisory */}
                {lastMixResult.is_dangerous && (
                  <section className="p-3 bg-red-50 rounded-xl border border-red-200 shadow-xs space-y-1">
                    <h3 className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={13} /> {t('Hazard & Safety Notice', 'Lưu ý an toàn thí nghiệm')}
                    </h3>
                    <p className="text-[11px] text-red-900 leading-relaxed font-medium">
                      {lastMixResult.safety_notes}
                    </p>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

const TargetRecognitionHUD = React.memo(function TargetRecognitionHUD() {
  const nearestPourTargetId = useAppStore(state => state.nearestPourTargetId);
  const hoveredVesselId = useAppStore(state => state.hoveredVesselId);
  const isDraggingChemical = useAppStore(state => !!state.isDraggingChemical);
  const language = useAppStore(state => state.language);
  
  const targetId = nearestPourTargetId || (isDraggingChemical ? hoveredVesselId : null);
  const target = useAppStore(state => targetId ? state.vessels[targetId] : null);

  if (!target) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl border border-emerald-400/50 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        <span>
          {nearestPourTargetId 
            ? (language === 'en' ? `🎯 Pour liquid into: ${target.name}` : `🎯 Nhận diện đích rót: ${target.name}`)
            : (language === 'en' ? `🎯 Drop into: ${target.name}` : `🎯 Nhận diện thả vào: ${target.name}`)}
        </span>
        <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full font-mono">
          {target.volume_ml} mL
        </span>
      </div>
    </div>
  );
});

export default function App() {
  const { 
    toggleLeftSidebar, 
    toggleRightSidebar, 
    leftSidebarOpen, 
    rightSidebarOpen, 
    selectedVesselId, 
    setSelectedVesselId, 
    isPresentationMode,
    language, 
    globalWarning, 
    setGlobalWarning 
  } = useAppStore();

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800 select-none">
      
      {/* Global Warning Red Flash Alert */}
      {globalWarning && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center" style={{ animation: 'flash-red 1s infinite alternate' }}>
          <div className="bg-red-600/95 backdrop-blur text-white px-8 py-6 rounded-2xl shadow-2xl max-w-lg text-center border-4 border-red-400 animate-in zoom-in duration-200 pointer-events-auto space-y-3">
             <AlertTriangle size={48} className="mx-auto text-amber-300 animate-bounce" />
             <h2 className="text-xl font-bold uppercase tracking-wider">{t('CRITICAL SAFETY WARNING', 'CẢNH BÁO AN TOÀN NGUY CẤP')}</h2>
             <p className="text-sm font-medium leading-relaxed">{globalWarning}</p>
             <button 
               onClick={() => setGlobalWarning(null)} 
               className="mt-4 bg-white text-red-600 px-6 py-2 rounded-lg font-bold uppercase text-xs hover:bg-red-50 transition-colors shadow-md"
             >
               {t('Acknowledge & Dismiss', 'Đã hiểu & Tiếp tục')}
             </button>
          </div>
          <style>{`
            @keyframes flash-red {
              0% { box-shadow: inset 0 0 0 0 rgba(220, 38, 38, 0); background-color: rgba(220,38,38,0); }
              100% { box-shadow: inset 0 0 120px 30px rgba(220, 38, 38, 0.45); background-color: rgba(220,38,38,0.15); }
            }
          `}</style>
        </div>
      )}

      {/* Chemical Measurement, Litmus Paper & Student Lab Report Dialogs */}
      <DosageModal />
      <LitmusTestModal />
      <LabReportModal />

      {/* Primary Navigation Bar */}
      {!isPresentationMode && (
        <nav className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-2xs relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/20">
              <FlaskConical size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight uppercase">
                Virtual <span className="text-blue-600">ChemLab</span>
              </h1>
              <span className="text-[9px] text-slate-400 font-medium block -mt-0.5">
                {t('Realistic 3D Chemistry Studio', 'Phòng Thí Nghiệm Hóa Học Ảo 3D')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={toggleLeftSidebar} 
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${leftSidebarOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`} 
              title={t('Toggle Chemical & Tool Catalog', 'Mở/Đóng danh mục')}
            >
              <Beaker size={16} />
              <span className="hidden sm:inline">{t('Catalog', 'Hóa chất')}</span>
            </button>
            <button 
              onClick={toggleRightSidebar} 
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${rightSidebarOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`} 
              title={t('Toggle Reaction Insights & Titration', 'Mở/Đóng phản ứng & chuẩn độ')}
            >
              <Info size={16} />
              <span className="hidden sm:inline">{t('Insights', 'Phản ứng')}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Workbench Secondary Toolbar (Camera, Undo/Redo, Grid, Modes, Speeds) */}
      <WorkbenchToolbar />

      {/* Main Lab Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <LeftSidebar />

        {/* 3D Interactive Workbench Viewport */}
        <main 
          className="flex-1 flex flex-col relative bg-slate-100 overflow-hidden"
        >
          {/* Quick Panel Collapse/Expand Floating Buttons on Edges */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleLeftSidebar(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-white/90 backdrop-blur-md rounded-r-lg border border-l-0 border-slate-300 text-slate-600 hover:text-blue-600 shadow-md transition-all hover:pl-2"
            title={leftSidebarOpen ? t('Hide chemicals panel', 'Ẩn bảng hóa chất') : t('Show chemicals panel', 'Hiện bảng hóa chất')}
          >
            {leftSidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); toggleRightSidebar(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 bg-white/90 backdrop-blur-md rounded-l-lg border border-r-0 border-slate-300 text-slate-600 hover:text-blue-600 shadow-md transition-all hover:pr-2"
            title={rightSidebarOpen ? t('Hide reaction panel', 'Ẩn bảng thông tin') : t('Show reaction panel', 'Hiện bảng thông tin')}
          >
            {rightSidebarOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Top-Left Floating Controls: Measurement Telemetry HUD */}
          <div className="absolute top-4 left-4 z-20 pointer-events-auto flex flex-col gap-2">
            <MeasurementHUD />
          </div>

          {/* Real-time Pour Telemetry HUD & Multi-device Controls */}
          <PourHUD />
          <PourInput />

          {/* Dynamic Pour & Drop Target Recognition HUD */}
          <TargetRecognitionHUD />

          {/* 3D Scene Viewport */}
          <div className="flex-1 relative z-0">
            <ErrorBoundary onReset={() => useAppStore.getState().resetWorkbench()}>
              <LabScene />
            </ErrorBoundary>
          </div>
        </main>

        <RightSidebar />
        <VfxGallery />
        <SimulationDebugPanel />
      </div>
    </div>
  );
}
