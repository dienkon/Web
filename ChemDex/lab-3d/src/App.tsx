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
const VfxGallery = React.lazy(() => import('./vfx/dev/VfxGallery').then(m => ({ default: m.VfxGallery })));
const SimulationDebugPanel = React.lazy(() => import('./simulation/ui/SimulationDebugPanel').then(m => ({ default: m.SimulationDebugPanel })));
const isDev = Boolean((import.meta as any).env?.DEV) || (typeof window !== 'undefined' && window.location.search.includes('dev=1'));
import { PourHUD } from './pour/hud/PourHUD';
import { PourInput } from './pour/input/PourInput';
import { ControlRing } from './ui/ControlRing';
import { CheatSheet } from './ui/CheatSheet';
import { Toast } from './components/Toast';
import { RadialMenu } from './ui/RadialMenu';
import { handleLabKeyDown } from './input/KeyMap';
import { 
  Beaker, FlaskConical, AlertTriangle, Info, X, Plus, Move, 
  Search, ShieldAlert, Sparkles, Droplet, Flame, TestTube, Scale, BookOpen,
  Thermometer, Pipette, Wand2, Filter, Layers,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose
} from 'lucide-react';

function LeftSidebar() {
  const leftSidebarOpen = useAppStore(state => state.leftSidebarOpen);
  const language = useAppStore(state => state.language);
  const addVessel = useAppStore(state => state.addVessel);
  const isMixing = useAppStore(state => state.isMixing);
  const [activeTab, setActiveTab] = useState<'chemicals' | 'instruments' | 'experiments' | 'safety'>('chemicals');
  const [search, setSearch] = useState('');
  const [equipSearch, setEquipSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'liquid' | 'solid' | 'indicator'>('all');
  
  if (!leftSidebarOpen) return null;

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  // Filter chemicals (memoized to eliminate lag during drag and typing)
  const filteredChemicals = React.useMemo(() => {
    return CHEMICALS.filter(c => {
      const matchesSearch = c.formula.toLowerCase().includes(search.toLowerCase()) || 
        (language === 'en' ? c.name_en : c.name_vi).toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'all') return true;
      if (filterType === 'indicator') return c.category === 'indicator';
      return c.type === filterType;
    });
  }, [search, filterType, language]);

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
            {filteredChemicals.map((chem, idx) => (
              <div 
                key={`${chem.formula}_${idx}`}
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

      {/* INSTRUMENTS & EQUIPMENT TAB (OVERHAULED INTO 5 NEAT CATEGORIES) */}
      {activeTab === 'instruments' && (() => {
        const categories = [
          {
            id: 'reaction',
            title_en: 'Reaction Vessels',
            title_vi: 'Bình phản ứng',
            items: [
              { type: 'beaker', name_en: 'Beaker 100mL', name_vi: 'Cốc mỏ 100mL', cap: '100mL', icon: <Beaker size={18} className="text-blue-600" /> },
              { type: 'flask', name_en: 'Erlenmeyer Flask', name_vi: 'Bình tam giác', cap: '250mL', icon: <FlaskConical size={18} className="text-blue-600" /> },
              { type: 'test_tube', name_en: 'Test Tube 50mL', name_vi: 'Ống nghiệm 50mL', cap: '50mL', icon: <TestTube size={18} className="text-indigo-600" /> },
              { type: 'volumetric_flask', name_en: 'Volumetric Flask', name_vi: 'Bình định mức', cap: '100mL', icon: <FlaskConical size={18} className="text-cyan-600" /> },
            ]
          },
          {
            id: 'volumetric',
            title_en: 'Volumetric & Transfer',
            title_vi: 'Định lượng & Rót dịch',
            items: [
              { type: 'cylinder', name_en: 'Graduated Cylinder', name_vi: 'Ống đong 100mL', cap: '100mL', icon: <div className="w-3 h-5 border-2 border-indigo-500 rounded-xs flex flex-col justify-end"><div className="h-2 bg-indigo-400 w-full" /></div> },
              { type: 'wash_bottle', name_en: 'Wash Bottle 250mL', name_vi: 'Bình tia nước cất', cap: '250mL', icon: <Droplet size={18} className="text-sky-500" /> },
              { type: 'tool_pipette', name_en: 'Pasteur Pipette', name_vi: 'Pipet nhỏ giọt', cap: '2mL', icon: <Pipette size={18} className="text-teal-600" /> },
              { type: 'tool_burette', name_en: 'Burette Stand', name_vi: 'Buret chuẩn độ', cap: '50mL', icon: <div className="w-2.5 h-5 border-l-2 border-r-2 border-b-2 border-purple-500 flex flex-col justify-end"><div className="h-3 bg-purple-300 w-full" /></div> },
            ]
          },
          {
            id: 'thermal',
            title_en: 'Thermal & Ignition',
            title_vi: 'Đun nóng & Nhiệt độ',
            items: [
              { type: 'burner', name_en: 'Bunsen Burner', name_vi: 'Đèn cồn đun nóng', cap: 'Flame', icon: <Flame size={18} className="text-amber-500" /> },
              { type: 'hot_plate', name_en: 'Hot Plate & Stirrer', name_vi: 'Bếp gia nhiệt & Khuấy từ', cap: 'Plate', icon: <div className="w-4 h-3.5 border-2 border-orange-500 rounded bg-orange-100 flex items-center justify-center text-[10px]">♨️</div> },
              { type: 'crucible', name_en: 'Porcelain Crucible', name_vi: 'Chén nung sứ 50mL', cap: '50mL', icon: <div className="w-4 h-4 border-2 border-amber-600 rounded-b-md bg-amber-50 shadow-xs" /> },
              { type: 'watch_glass', name_en: 'Watch Glass 40mL', name_vi: 'Kính đồng hồ 40mL', cap: '40mL', icon: <div className="w-5 h-2.5 border-b-2 border-l border-r border-cyan-500 rounded-b-full bg-cyan-100/40" /> },
              { type: 'petri_dish', name_en: 'Petri Dish 60mL', name_vi: 'Đĩa Petri 60mL', cap: '60mL', icon: <div className="w-5 h-2 border-2 border-emerald-500 rounded-xs bg-emerald-50/50" /> },
            ]
          },
          {
            id: 'separation',
            title_en: 'Separation & Filtration',
            title_vi: 'Tách chiết & Lọc',
            items: [
              { type: 'separatory_funnel', name_en: 'Separatory Funnel', name_vi: 'Phễu chiết quả lê', cap: '150mL', icon: <div className="w-4 h-5 border-2 border-emerald-600 rounded-t-full rounded-b-xs flex items-center justify-center text-[9px] font-bold text-emerald-700">⚗️</div> },
              { type: 'filter_funnel', name_en: 'Filter Funnel 75mL', name_vi: 'Phễu lọc có giấy lọc', cap: '75mL', icon: <Filter size={18} className="text-emerald-600" /> },
              { type: 'evaporating_dish', name_en: 'Evaporating Dish', name_vi: 'Bát sứ cô cạn', cap: '100mL', icon: <div className="w-5 h-3 border-b-2 border-l border-r border-slate-400 rounded-b-xl bg-slate-100" /> },
              { type: 'condenser', name_en: 'Liebig Condenser', name_vi: 'Ống sinh hàn Liebig', cap: '120mL', icon: <Layers size={18} className="text-sky-600" /> },
              { type: 'pneumatic_trough', name_en: 'Pneumatic Trough', name_vi: 'Chậu thu khí dời nước', cap: 'Trough', icon: <div className="w-4 h-3 border-2 border-sky-500 rounded bg-sky-100 flex items-center justify-center text-[10px]">🫧</div> },
              { type: 'stopper', name_en: 'Rubber Stopper + Tube', name_vi: 'Nút cao su & Ống dẫn khí', cap: 'Plug', icon: <div className="w-4 h-4 bg-slate-700 text-white rounded-b flex items-center justify-center text-[9px] font-bold">⊥</div> },
            ]
          },
          {
            id: 'tools',
            title_en: 'Tools & Analytics',
            title_vi: 'Dụng cụ & Đo lường',
            items: [
              { type: 'retort_stand', name_en: 'Retort Stand', name_vi: 'Giá thí nghiệm sắt', cap: 'Stand', icon: <div className="w-3 h-5 border-l-2 border-slate-700 flex flex-col justify-end"><div className="w-3 h-1 bg-slate-800" /></div> },
              { type: 'retort_clamp', name_en: 'Retort Clamp', name_vi: 'Kẹp sắt vặn ốc', cap: 'Clamp', icon: <div className="w-4 h-2 border-t-2 border-b-2 border-slate-600" /> },
              { type: 'mortar_pestle', name_en: 'Mortar & Pestle', name_vi: 'Cối & Chày sứ', cap: '80mL', icon: <div className="w-4 h-3.5 border-2 border-violet-500 rounded-b-lg bg-violet-50 flex items-center justify-center text-[10px]">🥣</div> },
              { type: 'test_tube_rack', name_en: 'Test Tube Rack', name_vi: 'Giá để ống nghiệm', cap: 'Rack', icon: <div className="w-5 h-3 border-2 border-amber-800 rounded-xs flex gap-0.5 justify-center items-center"><div className="w-1 h-2 bg-blue-400 rounded-xs" /><div className="w-1 h-2 bg-purple-400 rounded-xs" /></div> },
              { type: 'tongs', name_en: 'Crucible Tongs', name_vi: 'Kẹp gắp chén nung', cap: 'Tongs', icon: <div className="w-4 h-4 border-2 border-slate-600 rounded-full flex items-center justify-center text-[9px] font-bold">✂</div> },
              { type: 'tool_balance', name_en: 'Analytical Balance', name_vi: 'Cân phân tích điện tử', cap: '0.001g', icon: <Scale size={18} className="text-indigo-600" /> },
              { type: 'tool_stirring_rod', name_en: 'Glass Stirring Rod', name_vi: 'Đũa thủy tinh', cap: 'Tool', icon: <Wand2 size={18} className="text-blue-500" /> },
              { type: 'tool_thermometer', name_en: 'Thermometer Probe', name_vi: 'Nhiệt kế điện tử', cap: 'Tool', icon: <Thermometer size={18} className="text-rose-500" /> },
              { type: 'tool_spatula', name_en: 'Chemical Spatula', name_vi: 'Thìa lấy hóa chất', cap: 'Tool', icon: <div className="w-4 h-1 bg-slate-500 rounded-full" /> },
              { type: 'tool_sponge', name_en: 'Cleaning Sponge', name_vi: 'Bọt biển / Khăn lau vết loang', cap: 'Clean', icon: <div className="w-4 h-3.5 border-2 border-emerald-500 rounded bg-emerald-100 flex items-center justify-center text-[10px]">🧽</div> },
            ]
          }
        ];

        const handleEquipClick = (item: any) => {
          if (item.type === 'burner') {
            useAppStore.getState().addBurner();
          } else if (item.type === 'tool_pipette') {
            const cur = useAppStore.getState().activeTool;
            useAppStore.getState().setActiveTool(cur === 'pipette' ? 'none' : 'pipette');
          } else if (item.type === 'tool_stirring_rod') {
            const cur = useAppStore.getState().activeTool;
            useAppStore.getState().setActiveTool(cur === 'stirring_rod' ? 'none' : 'stirring_rod');
          } else if (item.type === 'tool_thermometer') {
            const cur = useAppStore.getState().activeTool;
            useAppStore.getState().setActiveTool(cur === 'thermometer' ? 'none' : 'thermometer');
          } else if (item.type === 'tool_spatula') {
            const cur = useAppStore.getState().activeTool;
            useAppStore.getState().setActiveTool(cur === 'spatula' ? 'none' : 'spatula');
          } else if (item.type === 'tool_sponge') {
            const cur = useAppStore.getState().activeTool;
            useAppStore.getState().setActiveTool(cur === 'sponge' ? 'none' : 'sponge');
          } else if (item.type === 'tool_balance') {
            useAppStore.getState().setCameraPreset('front');
          } else if (item.type === 'tool_burette') {
            useAppStore.getState().setCameraPreset('front');
            useAppStore.getState().setRightSidebarOpen(true);
          } else {
            addVessel(item.type, language === 'en' ? item.name_en : item.name_vi);
          }
        };

        const q = equipSearch.trim().toLowerCase();

        return (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
            {/* Equipment Search Bar */}
            <div className="p-2.5 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t('Search 20+ apparatus...', 'Tìm hơn 20 loại dụng cụ...')} 
                  value={equipSearch}
                  onChange={e => setEquipSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors bg-slate-50/50"
                />
              </div>
            </div>

            {/* Categorized Sections */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3.5">
              {categories.map(cat => {
                const visibleItems = cat.items.filter(it => 
                  !q || 
                  it.name_en.toLowerCase().includes(q) || 
                  it.name_vi.toLowerCase().includes(q) ||
                  it.type.toLowerCase().includes(q)
                );
                if (visibleItems.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      <span>{language === 'en' ? cat.title_en : cat.title_vi}</span>
                      <span className="text-[9px] text-slate-400 font-mono">({visibleItems.length})</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {visibleItems.map(item => (
                        <button
                          key={item.type}
                          onClick={() => handleEquipClick(item)}
                          className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200/80 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-xs transition-all group relative text-center"
                          title={language === 'en' ? item.name_en : item.name_vi}
                        >
                          <div className="mb-1.5 group-hover:scale-110 transition-transform">
                            {item.icon}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700 leading-tight">
                            {language === 'en' ? item.name_en : item.name_vi}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {item.cap}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

const RightSidebar = React.memo(function RightSidebar() {
  const rightSidebarOpen = useAppStore(state => state.rightSidebarOpen);
  const lastMixResult = useAppStore(state => state.lastMixResult);
  const isMixing = useAppStore(state => state.isMixing);
  const mixError = useAppStore(state => state.mixError);
  const language = useAppStore(state => state.language);
  const selectedVesselId = useAppStore(state => state.selectedVesselId);
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
});

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
  const leftSidebarOpen = useAppStore(state => state.leftSidebarOpen);
  const rightSidebarOpen = useAppStore(state => state.rightSidebarOpen);
  const isPresentationMode = useAppStore(state => state.isPresentationMode);
  const language = useAppStore(state => state.language);
  const toggleLeftSidebar = useAppStore(state => state.toggleLeftSidebar);
  const toggleRightSidebar = useAppStore(state => state.toggleRightSidebar);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleLabKeyDown(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-800 select-none">
      
      {/* Gentle Top-Right Toast Notification System */}
      <Toast />

      {/* Chemical Measurement, Litmus Paper & Student Lab Report Dialogs */}
      <DosageModal />
      <LitmusTestModal />
      <LabReportModal />

      {/* Primary Navigation Bar */}
      {!isPresentationMode && (
        <nav className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-4 shrink-0 z-20 shadow-2xs relative">
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

          {/* ChemDex Central Ecosystem Navigation Links */}
          <div className="flex items-center gap-1 bg-slate-100/90 px-1.5 py-1 rounded-xl border border-slate-200/80 text-xs shadow-inner">
            <a 
              href="../" 
              className="px-2.5 py-1 rounded-lg font-semibold text-slate-700 hover:text-blue-600 hover:bg-white transition-all flex items-center gap-1.5 shadow-2xs"
              title="Về Trang chủ ChemDex / Bảng tuần hoàn"
            >
              <span className="text-blue-500 font-bold">←</span>
              <span>ChemDex</span>
            </a>
            <span className="w-px h-3.5 bg-slate-300 hidden sm:block" />
            <a 
              href="../tai-lieu-so.html" 
              className="hidden sm:inline-block px-2.5 py-1 rounded-lg font-medium text-slate-600 hover:text-blue-600 hover:bg-white transition-all shadow-2xs"
            >
              {t('Documents', 'Tài liệu số')}
            </a>
            <a 
              href="../tien-ich/" 
              className="hidden md:inline-block px-2.5 py-1 rounded-lg font-medium text-slate-600 hover:text-blue-600 hover:bg-white transition-all shadow-2xs"
            >
              {t('Utilities', 'Tiện ích')}
            </a>
            <a 
              href="../trung-tam/" 
              className="hidden lg:inline-block px-2.5 py-1 rounded-lg font-medium text-slate-600 hover:text-blue-600 hover:bg-white transition-all shadow-2xs"
            >
              {t('Arena', 'Đấu trường')}
            </a>
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

          {/* Interactive Lab Reality Tools & Controls */}
          <ControlRing />
          <CheatSheet />
          <RadialMenu />

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
        {isDev && (
          <React.Suspense fallback={null}>
            <VfxGallery />
            <SimulationDebugPanel />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
