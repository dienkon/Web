import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { EXPERIMENTS_CATALOG } from '../../data/experiments';
import { EquipmentType } from '../../types/equipment';
import { formatFormulaUnicode } from '../../chemistry/core/formula';
import { FlaskConical, Beaker, BookOpen, ShieldAlert, Search, Plus, Sparkles, AlertCircle } from 'lucide-react';

export const SidebarInventory: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    addEquipment,
    selectedEquipmentId,
    addChemicalToEquipment,
    selectExperiment,
    activeExperiment,
    setDraggedChemicalId,
    language,
  } = useLabStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const EQUIPMENT_LIST: { type: EquipmentType; name_en: string; name_vi: string; desc_vi: string; icon: string }[] = [
    { type: 'beaker', name_en: 'Beaker (250 mL)', name_vi: 'Cốc thủy tinh (250 mL)', desc_vi: 'Dụng cụ chứa dung dịch, pha trộn và gia nhiệt phổ biến.', icon: '🧪' },
    { type: 'erlenmeyer_flask', name_en: 'Erlenmeyer Flask (250 mL)', name_vi: 'Bình tam giác (250 mL)', desc_vi: 'Miệng hẹp chống bắn tóe, thích hợp chuẩn độ và lắc trộn.', icon: '⚗️' },
    { type: 'test_tube', name_en: 'Test Tube (50 mL)', name_vi: 'Ống nghiệm (50 mL)', desc_vi: 'Thực hiện phản ứng lượng nhỏ và quan sát nhanh.', icon: '🧪' },
    { type: 'graduated_cylinder', name_en: 'Graduated Cylinder (100 mL)', name_vi: 'Ống đong (100 mL)', desc_vi: 'Đo lường thể tích chất lỏng chính xác.', icon: '📏' },
    { type: 'burette', name_en: 'Burette & Stand (50 mL)', name_vi: 'Buret 50 mL và Giá đỡ', desc_vi: 'Thiết bị chuẩn độ nhỏ giọt định lượng chính xác.', icon: '🔬' },
    { type: 'analytical_balance', name_en: 'Analytical Balance', name_vi: 'Cân điện tử phân tích', desc_vi: 'Đo khối lượng chính xác đến miligram có chức năng Tare.', icon: '⚖️' },
    { type: 'bunsen_burner', name_en: 'Bunsen Burner', name_vi: 'Đèn Bunsen', desc_vi: 'Cung cấp ngọn lửa khí đốt gia nhiệt mẫu chất.', icon: '🔥' },
    { type: 'hot_plate', name_en: 'Hot Plate & Magnetic Stirrer', name_vi: 'Bếp điện gia nhiệt & Khuấy từ', desc_vi: 'Gia nhiệt mặt gốm kiểm soát nhiệt độ và khuấy từ tự động.', icon: '♨️' },
    { type: 'evaporating_dish', name_en: 'Evaporating Dish (Porcelain)', name_vi: 'Bát sứ nung & Cô cạn', desc_vi: 'Chịu nhiệt độ cao, dùng cô cạn dung dịch thu tinh thể muối.', icon: '🥣' },
    { type: 'watch_glass', name_en: 'Watch Glass (Pyrex)', name_vi: 'Mặt kính đồng hồ', desc_vi: 'Đậy cốc ngăn bay hơi hoặc làm khô lượng nhỏ mẫu chất.', icon: '🔍' },
    { type: 'ph_meter', name_en: 'Digital pH Meter Pen', name_vi: 'Bút đo pH điện tử', desc_vi: 'Đầu đo điện cực thủy tinh đo độ pH dung dịch chính xác.', icon: '📟' },
    { type: 'thermometer', name_en: 'Laboratory Thermometer', name_vi: 'Nhiệt kế phòng thí nghiệm', desc_vi: 'Cột chất lỏng nhạy nhiệt đo từ 0 đến 120°C.', icon: '🌡️' },
    { type: 'stirring_rod', name_en: 'Glass Stirring Rod', name_vi: 'Đũa thủy tinh khuấy', desc_vi: 'Khuấy trộn đồng nhất và dẫn dòng chảy chất lỏng khi rót.', icon: '🥢' },
    { type: 'test_tube_rack', name_en: 'Test Tube Rack', name_vi: 'Giá để ống nghiệm 6 lỗ', desc_vi: 'Giữ đứng các ống nghiệm trên bàn thao tác an toàn.', icon: '🪜' },
    { type: 'funnel', name_en: 'Filter Funnel with Paper', name_vi: 'Phễu lọc có giấy lọc', desc_vi: 'Tách chất rắn không tan ra khỏi dung dịch.', icon: '⏳' },
    { type: 'pipette', name_en: 'Graduated Pipette', name_vi: 'Pipet chia vạch (10 mL)', desc_vi: 'Hút và chuyển chính xác thể tích chất lỏng nhỏ.', icon: '💧' },
    { type: 'wash_bottle', name_en: 'Wash Bottle (H2O)', name_vi: 'Bình tia nước cất', desc_vi: 'Bơm tia nước cất tráng rửa và pha loãng nhanh.', icon: '🧴' },
  ];

  const filteredChemicals = CHEMICAL_CATALOG.filter(c => {
    const matchesSearch =
      c.name_vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.formula.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col select-none shadow-xs">
      {/* Sidebar Tabs Header */}
      <div className="p-2 border-b border-slate-200 grid grid-cols-4 gap-1 bg-slate-50">
        <button
          onClick={() => setActiveSidebarTab('chemicals')}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeSidebarTab === 'chemicals'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FlaskConical className="w-4 h-4 mb-1" />
          <span>{language === 'vi' ? 'Hóa chất' : 'Chemicals'}</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('equipment')}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeSidebarTab === 'equipment'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Beaker className="w-4 h-4 mb-1" />
          <span>{language === 'vi' ? 'Dụng cụ' : 'Apparatus'}</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('experiments')}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeSidebarTab === 'experiments'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-1" />
          <span>{language === 'vi' ? 'Bài học' : 'Guides'}</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('safety')}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeSidebarTab === 'safety'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 mb-1" />
          <span>{language === 'vi' ? 'An toàn' : 'Safety'}</span>
        </button>
      </div>

      {/* Tab 1: Chemicals Catalog */}
      {activeSidebarTab === 'chemicals' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder={language === 'vi' ? 'Tìm hóa chất, công thức...' : 'Search chemicals...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {['all', 'acid', 'base', 'salt', 'indicator', 'metal'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full capitalize whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-100 text-blue-700 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? (language === 'vi' ? 'Tất cả' : 'All') : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredChemicals.map(chem => (
              <div
                key={chem.id}
                draggable={true}
                onDragStart={e => {
                  e.dataTransfer.setData('text/plain', chem.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggedChemicalId(chem.id);
                }}
                onDragEnd={() => {
                  setDraggedChemicalId(null);
                }}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all bg-white group cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {formatFormulaUnicode(chem.formula)}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-700 mt-0.5">
                      {language === 'vi' ? chem.name_vi : chem.name_en}
                    </h4>
                  </div>
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs"
                    style={{ backgroundColor: chem.colorHex }}
                    title={chem.colorHex}
                  />
                </div>

                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {chem.category}
                  </span>
                  {chem.defaultConcentration_M && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      {chem.defaultConcentration_M} M
                    </span>
                  )}
                  {chem.hazards.map(h => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                      {h}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">
                  {language === 'vi' ? chem.description_vi : chem.description_en}
                </p>

                {/* Quick Add action */}
                <button
                  onClick={() => {
                    if (selectedEquipmentId) {
                      addChemicalToEquipment(selectedEquipmentId, chem.id, 25);
                    } else {
                      // Automatically create a beaker and add chemical
                      const newId = addEquipment('beaker');
                      setTimeout(() => addChemicalToEquipment(newId, chem.id, 25), 50);
                    }
                  }}
                  className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {selectedEquipmentId
                      ? (language === 'vi' ? 'Thêm vào bình đang chọn (+25 mL)' : 'Add to selected vessel')
                      : (language === 'vi' ? 'Tạo cốc mới với hóa chất này' : 'Create beaker with chemical')}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Equipment Apparatus */}
      {activeSidebarTab === 'equipment' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <p className="text-xs text-slate-500 mb-2">
            {language === 'vi' ? 'Nhấp vào dụng cụ để đưa lên bàn thí nghiệm:' : 'Click to place equipment on workbench:'}
          </p>
          {EQUIPMENT_LIST.map(eq => (
            <div
              key={eq.type}
              draggable={true}
              onDragStart={e => {
                e.dataTransfer.setData('application/equipment-type', eq.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => addEquipment(eq.type)}
              className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-grab active:cursor-grabbing transition-all flex items-center gap-3 bg-white shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-xl transition-colors shrink-0">
                {eq.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-800">
                  {language === 'vi' ? eq.name_vi : eq.name_en}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{eq.desc_vi}</p>
              </div>
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Guided Experiments Curriculum */}
      {activeSidebarTab === 'experiments' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {language === 'vi' ? '10 Bài thực hành chuẩn' : '10 Guided Experiments'}
            </span>
            {activeExperiment && (
              <button
                onClick={() => selectExperiment(null)}
                className="text-[11px] text-red-600 font-semibold hover:underline"
              >
                {language === 'vi' ? 'Hủy bài học' : 'Exit guide'}
              </button>
            )}
          </div>

          {EXPERIMENTS_CATALOG.map((exp, idx) => {
            const isActive = activeExperiment?.id === exp.id;
            return (
              <div
                key={exp.id}
                onClick={() => selectExperiment(exp.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {language === 'vi' ? `Bài ${idx + 1}` : `Lab ${idx + 1}`}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {exp.durationMinutes} {language === 'vi' ? 'phút' : 'min'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-2">
                  {language === 'vi' ? exp.title_vi : exp.title_en}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {language === 'vi' ? exp.description_vi : exp.description_en}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">
                    {exp.steps.length} {language === 'vi' ? 'bước thực hiện' : 'steps'}
                  </span>
                  <span className="font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{isActive ? (language === 'vi' ? 'Đang học' : 'Active') : (language === 'vi' ? 'Bắt đầu' : 'Start')}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Lab Safety & PPE Standards */}
      {activeSidebarTab === 'safety' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{language === 'vi' ? 'Quy tắc an toàn cốt lõi' : 'Core Safety Rules'}</span>
            </h4>
            <ul className="space-y-2 text-slate-600 list-disc list-inside">
              <li>{language === 'vi' ? 'Luôn rót từ từ axit vào nước, tuyệt đối không làm ngược lại để tránh trào sôi bắn tóe.' : 'Always add acid to water, never water to acid.'}</li>
              <li>{language === 'vi' ? 'Đeo kính bảo hộ, găng tay và áo choàng phòng thí nghiệm khi tiếp xúc với hóa chất ăn mòn.' : 'Always wear eye protection and lab gloves.'}</li>
              <li>{language === 'vi' ? 'Không hít trực tiếp hơi axit hoặc khí sinh ra (CO2, SO2, NH3). Dùng tay phẩy nhẹ hơi nếu cần ngửi.' : 'Never inhale chemical vapors directly.'}</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
              {language === 'vi' ? 'Biểu trưng cảnh báo GHS' : 'GHS Hazard Symbols'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-red-600">Corrosive (Ăn mòn)</span>
                <p className="text-slate-500 mt-0.5">HCl, H2SO4, NaOH, KOH</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-amber-600">Toxic (Độc tính)</span>
                <p className="text-slate-500 mt-0.5">AgNO3, BaCl2, Cu(II)</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-blue-600">Gas release (Sinh khí)</span>
                <p className="text-slate-500 mt-0.5">NaHCO3 + HCl, Zn + HCl</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-emerald-600">Safe (An toàn)</span>
                <p className="text-slate-500 mt-0.5">H2O, NaCl, Na2SO4</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
