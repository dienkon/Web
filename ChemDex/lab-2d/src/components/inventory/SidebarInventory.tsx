import React, { useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  FlaskConical,
  Beaker,
  BookOpen,
  ShieldAlert,
  Search,
  Plus,
  Sparkles,
  AlertCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { usePointerDragStore, PointerDragPayload } from '../../store/usePointerDragStore';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { EXPERIMENTS_CATALOG } from '../../data/experiments';
import { EquipmentType } from '../../types/equipment';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import { soundEngine } from '../../services/soundEngine';

interface EquipmentPaletteItem {
  type: EquipmentType;
  group: 'vessels' | 'volumetric' | 'heating' | 'separation' | 'probes';
  name_en: string;
  name_vi: string;
  desc_vi: string;
  desc_en: string;
  icon: string;
}

const EQUIPMENT_GROUPS: { id: EquipmentPaletteItem['group']; vi: string; en: string }[] = [
  { id: 'vessels', vi: 'Bình phản ứng', en: 'Reaction Vessels' },
  { id: 'volumetric', vi: 'Định lượng & Chuẩn độ', en: 'Volumetric & Titration' },
  { id: 'heating', vi: 'Gia nhiệt & Khuấy từ', en: 'Heating & Stirring' },
  { id: 'separation', vi: 'Lọc, Chiết & Rắn', en: 'Separation & Solids' },
  { id: 'probes', vi: 'Đầu dò & Vệ sinh', en: 'Probes & Cleanup' },
];

const EQUIPMENT_LIST: EquipmentPaletteItem[] = [
  { type: 'beaker', group: 'vessels', name_en: 'Beaker (250 mL)', name_vi: 'Cốc thủy tinh 250 mL', desc_vi: 'Pha chế, trộn dung dịch & đun nóng.', desc_en: 'General mixing, heating & reactions.', icon: '🧪' },
  { type: 'erlenmeyer_flask', group: 'vessels', name_en: 'Erlenmeyer Flask (250 mL)', name_vi: 'Bình tam giác 250 mL', desc_vi: 'Chuẩn độ, lắc trộn & chống bắn.', desc_en: 'Swirling & titration with narrow neck.', icon: '⚗️' },
  { type: 'test_tube', group: 'vessels', name_en: 'Test Tube (50 mL)', name_vi: 'Ống nghiệm 50 mL', desc_vi: 'Thử mẫu nhanh lượng nhỏ.', desc_en: 'Qualitative micro-scale reactions.', icon: '🧫' },
  { type: 'evaporating_dish', group: 'vessels', name_en: 'Evaporating Dish', name_vi: 'Bát sứ cô cạn', desc_vi: 'Cô cạn thu tinh thể muối.', desc_en: 'High-heat crystallization.', icon: '🥣' },

  { type: 'burette', group: 'volumetric', name_en: 'Burette & Stand (50 mL)', name_vi: 'Buret 50 mL & Giá đỡ', desc_vi: 'Chuẩn độ nhỏ giọt định lượng.', desc_en: 'Precision stopcock titration.', icon: '🔬' },
  { type: 'graduated_cylinder', group: 'volumetric', name_en: 'Graduated Cylinder (100 mL)', name_vi: 'Ống đong 100 mL', desc_vi: 'Đong thể tích dung dịch chính xác.', desc_en: 'Volume measurement.', icon: '📏' },
  { type: 'pipette', group: 'volumetric', name_en: 'Graduated Pipette (10 mL)', name_vi: 'Pipet chia vạch 10 mL', desc_vi: 'Hút & chuyển lượng chất lỏng nhỏ.', desc_en: 'Small-volume liquid transfer.', icon: '💧' },
  { type: 'wash_bottle', group: 'volumetric', name_en: 'Wash Bottle (H₂O)', name_vi: 'Bình tia nước cất', desc_vi: 'Tráng rửa & pha loãng tức thì.', desc_en: 'Distilled water dispensing.', icon: '🧴' },

  { type: 'bunsen_burner', group: 'heating', name_en: 'Bunsen Burner', name_vi: 'Đèn Bunsen', desc_vi: 'Ngọn lửa khí đốt gia nhiệt trực tiếp.', desc_en: 'Adjustable open flame heat.', icon: '🔥' },
  { type: 'hot_plate', group: 'heating', name_en: 'Hot Plate & Stirrer', name_vi: 'Bếp điện & Khuấy từ', desc_vi: 'Gia nhiệt & khuấy từ đồng nhất.', desc_en: 'Controlled heating & magnetic stir.', icon: '♨️' },
  { type: 'condenser', group: 'heating', name_en: 'Reflux Condenser (Liebig)', name_vi: 'Ống sinh hàn hồi lưu', desc_vi: 'Ngưng tụ hơi nóng hồi lưu khi đun sôi.', desc_en: 'Water-cooled reflux condensation.', icon: '❄️' },
  { type: 'stirring_rod', group: 'heating', name_en: 'Glass Stirring Rod', name_vi: 'Đũa thủy tinh', desc_vi: 'Khuấy đều & dẫn dòng rót.', desc_en: 'Manual mixing & decanting.', icon: '🥢' },

  { type: 'separatory_funnel', group: 'separation', name_en: 'Separatory Funnel (250 mL)', name_vi: 'Phễu chiết quả lê', desc_vi: 'Chiết tách hai pha không đồng tan.', desc_en: 'Immiscible phase separation.', icon: '🍷' },
  { type: 'funnel', group: 'separation', name_en: 'Filter Funnel with Paper', name_vi: 'Phễu lọc & Giấy lọc', desc_vi: 'Tách kết tủa khỏi dung dịch.', desc_en: 'Solid-liquid filtration.', icon: '⏳' },
  { type: 'watch_glass', group: 'separation', name_en: 'Watch Glass (Pyrex)', name_vi: 'Mặt kính đồng hồ', desc_vi: 'Cân mẫu rắn hoặc đậy cốc.', desc_en: 'Solid crystal tray / cover.', icon: '🔍' },
  { type: 'test_tube_rack', group: 'separation', name_en: 'Test Tube Rack (6-slot)', name_vi: 'Giá cắm ống nghiệm', desc_vi: 'Giữ đứng nhiều ống nghiệm.', desc_en: '6-slot stand for tubes.', icon: '🪜' },

  { type: 'analytical_balance', group: 'probes', name_en: 'Analytical Balance', name_vi: 'Cân điện tử phân tích', desc_vi: 'Cân khối lượng chính xác có Tare.', desc_en: 'Milligram mass scale.', icon: '⚖️' },
  { type: 'ph_meter', group: 'probes', name_en: 'Digital pH Meter', name_vi: 'Bút đo pH điện tử', desc_vi: 'Điện cực đo pH tức thời.', desc_en: 'Live pH electrode readout.', icon: '📟' },
  { type: 'thermometer', group: 'probes', name_en: 'Lab Thermometer', name_vi: 'Nhiệt kế thủy ngân', desc_vi: 'Đo nhiệt độ dung dịch 0–120°C.', desc_en: '0–120°C temperature sensor.', icon: '🌡️' },
  { type: 'ph_paper', group: 'probes', name_en: 'Universal pH Paper', name_vi: 'Giấy chỉ thị pH', desc_vi: 'Đo nhanh độ axit/kiềm.', desc_en: 'Colorimetric pH strip.', icon: '📜' },
  { type: 'sponge', group: 'probes', name_en: 'Cleaning Sponge', name_vi: 'Bọt biển lau bàn', desc_vi: 'Lau sạch hóa chất tràn.', desc_en: 'Wipe benchtop spills.', icon: '🧽' },
];

export const SidebarInventory: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    addEquipment,
    selectedEquipmentId,
    selectExperiment,
    activeExperiment,
    completedExperiments,
    setMobilePanel,
    toggleReactionLibrary,
    language,
  } = useLabStore(
    useShallow((s) => ({
      activeSidebarTab: s.activeSidebarTab,
      setActiveSidebarTab: s.setActiveSidebarTab,
      addEquipment: s.addEquipment,
      selectedEquipmentId: s.selectedEquipmentId,
      selectExperiment: s.selectExperiment,
      activeExperiment: s.activeExperiment,
      completedExperiments: s.completedExperiments,
      setMobilePanel: s.setMobilePanel,
      toggleReactionLibrary: s.toggleReactionLibrary,
      language: s.language,
    }))
  );

  const vi = language === 'vi';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vessels: true,
    volumetric: true,
    heating: true,
    separation: false,
    probes: false,
  });
  const suppressNextClickRef = useRef(false);

  const startCrossPlatformDrag = (payload: PointerDragPayload, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;
    const store = usePointerDragStore.getState();
    store.startDrag(payload, e.clientX, e.clientY);

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const onMove = (ev: PointerEvent) => {
      usePointerDragStore.getState().moveDrag(ev.clientX, ev.clientY);
    };
    const onCancel = () => {
      cleanup();
      usePointerDragStore.getState().clearDrag();
    };
    const onUp = (ev: PointerEvent) => {
      cleanup();

      const st = usePointerDragStore.getState();
      if (st.activeDrag && st.isDraggingMoved) {
        suppressNextClickRef.current = true;
        window.dispatchEvent(
          new CustomEvent('chemdex:pointer-drop', {
            detail: { payload: st.activeDrag, clientX: ev.clientX, clientY: ev.clientY },
          })
        );
      }
      st.clearDrag();
      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 60);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const filteredChemicals = CHEMICAL_CATALOG.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name_vi.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.formula.toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col select-none">
      {/* Mobile Close Header */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
        <span className="text-xs font-bold text-slate-700">
          {vi ? 'Kho Hóa Chất & Dụng Cụ' : 'Lab Shelf'}
        </span>
        <button
          type="button"
          onClick={() => setMobilePanel(null)}
          className="p-1 rounded-lg text-slate-500 hover:bg-slate-200"
          aria-label="Close shelf"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="p-1.5 border-b border-slate-200 grid grid-cols-4 gap-1 bg-slate-50 shrink-0">
        {[
          { id: 'chemicals' as const, vi: 'Hóa chất', en: 'Reagents', icon: <FlaskConical className="w-3.5 h-3.5 mb-0.5" /> },
          { id: 'equipment' as const, vi: 'Dụng cụ', en: 'Gear', icon: <Beaker className="w-3.5 h-3.5 mb-0.5" /> },
          { id: 'experiments' as const, vi: 'Bài học', en: 'Guides', icon: <BookOpen className="w-3.5 h-3.5 mb-0.5" /> },
          { id: 'safety' as const, vi: 'An toàn', en: 'Safety', icon: <ShieldAlert className="w-3.5 h-3.5 mb-0.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSidebarTab(tab.id)}
            className={`flex flex-col items-center py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all ${
              activeSidebarTab === tab.id
                ? 'bg-white text-blue-600 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            <span>{vi ? tab.vi : tab.en}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Chemicals */}
      {activeSidebarTab === 'chemicals' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-2.5 border-b border-slate-200 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder={vi ? 'Tìm công thức, tên chất...' : 'Search formula, reagent...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
              {[
                { id: 'all', vi: 'Tất cả', en: 'All' },
                { id: 'acid', vi: 'Axit', en: 'Acids' },
                { id: 'base', vi: 'Bazơ', en: 'Bases' },
                { id: 'salt', vi: 'Muối', en: 'Salts' },
                { id: 'metal', vi: 'Kim loại', en: 'Metals' },
                { id: 'oxide', vi: 'Oxit', en: 'Oxides' },
                { id: 'indicator', vi: 'Chỉ thị', en: 'Indicators' },
                { id: 'organic', vi: 'Hữu cơ', en: 'Organics' },
                { id: 'solvent', vi: 'Dung môi', en: 'Solvents' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {vi ? cat.vi : cat.en}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>{vi ? `${filteredChemicals.length} chất` : `${filteredChemicals.length} items`}</span>
              <span>{vi ? 'Kéo sang bàn hoặc bấm +' : 'Drag to bench or tap +'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredChemicals.map((chem) => (
              <div
                key={chem.id}
                onPointerDown={(e) =>
                  startCrossPlatformDrag(
                    {
                      kind: 'chemical',
                      chemicalId: chem.id,
                      formula: chem.formula,
                      label: vi ? chem.name_vi : chem.name_en,
                      colorHex: chem.colorHex,
                    },
                    e
                  )
                }
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all bg-white cursor-grab active:cursor-grabbing touch-pan-y select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatFormulaUnicode(chem.formula)}
                    </span>
                    <h4 className="text-[11.5px] font-semibold text-slate-700 truncate">
                      {vi ? chem.name_vi : chem.name_en}
                    </h4>
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 mt-0.5"
                    style={{ backgroundColor: chem.colorHex }}
                  />
                </div>

                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {chem.category}
                  </span>
                  {chem.defaultConcentration_M && (
                    <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      {chem.defaultConcentration_M} M
                    </span>
                  )}
                  <button
                    type="button"
                    className="ml-auto text-[11px] text-teal-700 hover:underline font-medium"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('chemdex:structure', { detail: { chemical: chem.id } })
                      )
                    }
                  >
                    3D ↗
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (suppressNextClickRef.current) return;
                      window.dispatchEvent(new CustomEvent('chemdex:dose', { detail: chem.id }));
                      setMobilePanel(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 text-[11px] font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>
                      {selectedEquipmentId
                        ? vi ? 'Thêm vào bình đã chọn' : 'Add to selected'
                        : vi ? 'Tạo cốc với chất này' : 'Spawn beaker + chemical'}
                    </span>
                  </button>
                  {chem.phase_STP === 'solid' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (suppressNextClickRef.current) return;
                        useLabStore.getState().setSpatulaScoop({
                          chemicalId: chem.id,
                          formula: chem.formula,
                          name_vi: chem.name_vi,
                          name_en: chem.name_en,
                          mass_g: 2.0,
                          colorHex: chem.colorHex || '#cbd5e1',
                        });
                        useLabStore.getState().setActiveTool('spatula');
                        soundEngine.click();
                        setMobilePanel(null);
                      }}
                      title={vi ? 'Xúc 2g chất rắn lên muỗng để rắc vào bình' : 'Scoop 2g solid onto spatula'}
                      className="py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[11px] font-semibold shrink-0 transition-colors"
                    >
                      🥄 {vi ? 'Xúc' : 'Scoop'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: 5-Group Categorized Equipment */}
      {activeSidebarTab === 'equipment' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          <p className="text-[11px] text-slate-400 px-0.5">
            {vi ? 'Kéo sang bàn hoặc bấm để đặt dụng cụ:' : 'Drag or tap to place apparatus:'}
          </p>

          {EQUIPMENT_GROUPS.map((grp) => {
            const items = EQUIPMENT_LIST.filter((eq) => eq.group === grp.id);
            const isOpen = openGroups[grp.id] ?? true;
            return (
              <div key={grp.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenGroups((g) => ({ ...g, [grp.id]: !isOpen }))}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100/70 transition-colors"
                >
                  <span>{vi ? grp.vi : grp.en}</span>
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="p-1.5 pt-0 space-y-1.5">
                    {items.map((eq) => (
                      <div
                        key={eq.type}
                        onPointerDown={(e) =>
                          startCrossPlatformDrag(
                            {
                              kind: 'equipment',
                              type: eq.type,
                              label: vi ? eq.name_vi : eq.name_en,
                              icon: eq.icon,
                            },
                            e
                          )
                        }
                        onClick={() => {
                          if (suppressNextClickRef.current) return;
                          addEquipment(eq.type);
                          soundEngine.glassClink();
                          setMobilePanel(null);
                        }}
                        className="p-2 rounded-lg border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 cursor-grab active:cursor-grabbing touch-pan-y select-none transition-all flex items-center gap-2.5 bg-white group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-base shrink-0">
                          {eq.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11.5px] font-bold text-slate-800 truncate">
                            {vi ? eq.name_vi : eq.name_en}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {vi ? eq.desc_vi : eq.desc_en}
                          </p>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Guided Experiments */}
      {activeSidebarTab === 'experiments' && (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          <button
            type="button"
            onClick={() => {
              toggleReactionLibrary(true);
              setMobilePanel(null);
            }}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-900 shadow-xs transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-left min-w-0">
                <span className="block text-[11.5px] font-bold leading-tight truncate">
                  {vi ? 'Kho 131 Thí nghiệm & 1.300 PƯ' : '131+ Experiments & 1,300 Equations'}
                </span>
                <span className="block text-[10px] text-emerald-700/80 truncate">
                  {vi ? 'Phân tích chuỗi, điều kiện & chạy trên bàn 2D' : 'Reaction chains, conditions & 2D bench runner'}
                </span>
              </span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shrink-0 group-hover:bg-emerald-700">
              {vi ? 'Mở' : 'Open'}
            </span>
          </button>

          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {vi ? 'Bài thực hành chuẩn SGK' : 'Guided Curriculum'}
            </span>
            {activeExperiment && (
              <button
                type="button"
                onClick={() => selectExperiment(null)}
                className="text-[11px] text-red-600 font-semibold hover:underline"
              >
                {vi ? 'Thoát bài' : 'Exit'}
              </button>
            )}
          </div>

          {EXPERIMENTS_CATALOG.map((exp, idx) => {
            const isActive = activeExperiment?.id === exp.id;
            return (
              <div
                key={exp.id}
                onClick={() => {
                  selectExperiment(exp.id);
                  setMobilePanel(null);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {vi ? `Bài ${idx + 1}` : `Lab ${idx + 1}`}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {exp.durationMinutes} {vi ? 'phút' : 'min'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                  {vi ? exp.title_vi : exp.title_en}
                  {completedExperiments?.[exp.id] && (
                    <span className="ml-1.5 text-emerald-700 text-xs">✓</span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {vi ? exp.description_vi : exp.description_en}
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {exp.steps.length} {vi ? 'bước' : 'steps'}
                  </span>
                  <span className="font-bold text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{isActive ? (vi ? 'Đang học' : 'Active') : (vi ? 'Bắt đầu' : 'Start')}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Safety */}
      {activeSidebarTab === 'safety' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{vi ? 'Quy tắc an toàn phòng thí nghiệm' : 'Lab Safety Rules'}</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
              <li>{vi ? 'Luôn rót axit từ từ vào nước, không làm ngược lại.' : 'Always add acid slowly into water.'}</li>
              <li>{vi ? 'Đeo kính & găng tay trước khi đun nóng hoặc dùng axit/kiềm mạnh.' : 'Wear PPE before heating or corrosive work.'}</li>
              <li>{vi ? 'Không đun nóng bình đang đậy kín nút để tránh nổ áp suất.' : 'Never heat sealed vessels.'}</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-[10.5px]">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-red-600">Corrosive</span>
              <p className="text-slate-500">HCl, H₂SO₄, NaOH</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-amber-600">Toxic</span>
              <p className="text-slate-500">AgNO₃, BaCl₂, Pb²⁺</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600">Exothermic</span>
              <p className="text-slate-500">Na + H₂O, H⁺ + OH⁻</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-emerald-600">Standard</span>
              <p className="text-slate-500">H₂O, NaCl, Glucose</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
