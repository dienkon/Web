import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { PERIODIC_ELEMENTS, CATEGORY_COLORS, PeriodicElement } from '../../data/periodicTable';
import { CHEMICAL_CATALOG } from '../../data/chemicals';
import { X, Search, Plus, Sparkles, Atom, Info } from 'lucide-react';

interface PeriodicTableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PeriodicTableModal: React.FC<PeriodicTableModalProps> = ({ isOpen, onClose }) => {
  const { language, selectedEquipmentId, addChemicalToEquipment, addEquipment } = useLabStore();
  const [selectedElement, setSelectedElement] = useState<PeriodicElement>(PERIODIC_ELEMENTS[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  // Find matching chemical from catalog
  const matchedChemical = CHEMICAL_CATALOG.find(
    c => c.formula.toUpperCase() === selectedElement.symbol.toUpperCase()
  );

  const handleAddReagent = () => {
    if (matchedChemical) {
      if (selectedEquipmentId) {
        addChemicalToEquipment(selectedEquipmentId, matchedChemical.id, 25, 2.0);
      } else {
        const newId = addEquipment('beaker');
        setTimeout(() => addChemicalToEquipment(newId, matchedChemical.id, 25, 2.0), 50);
      }
      onClose();
    }
  };

  const filteredElements = PERIODIC_ELEMENTS.filter(el => {
    const matchSearch =
      el.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.name_vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.name_en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || el.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Atom className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {language === 'vi' ? 'Bảng Tuần Hoàn Các Nguyên Tố Hóa Học' : 'Interactive Periodic Table of Elements'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {language === 'vi' ? 'Tra cứu thông số nguyên tử, độ âm điện, cấu hình electron và nạp nhanh vào bàn thí nghiệm' : 'Atomic weights, electron configurations, and quick reagent synthesis'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Grid on Left, Element Detail Card on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Periodic Elements Table Grid */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col">
            {/* Search and Category Filters */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={language === 'vi' ? 'Tìm theo tên, ký hiệu nguyên tố (H, He, Cu, Fe)...' : 'Search symbol, name...'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              >
                <option value="all">{language === 'vi' ? 'Tất cả phân nhóm' : 'All Categories'}</option>
                <option value="alkali">Kim loại kiềm (IA)</option>
                <option value="alkaline_earth">Kim loại kiềm thổ (IIA)</option>
                <option value="transition_metal">Kim loại chuyển tiếp (d)</option>
                <option value="post_transition">Kim loại sau chuyển tiếp</option>
                <option value="metalloid">Á kim</option>
                <option value="reactive_nonmetal">Phi kim hoạt động</option>
                <option value="halogen">Halogen (VIIA)</option>
                <option value="noble_gas">Khí hiếm (VIIIA)</option>
              </select>
            </div>

            {/* Elements Interactive Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5 flex-1 select-none">
              {filteredElements.map(el => {
                const isSelected = selectedElement.symbol === el.symbol;
                const catStyle = CATEGORY_COLORS[el.category] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };

                return (
                  <button
                    key={el.symbol}
                    onClick={() => setSelectedElement(el)}
                    className={`flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all text-left ${catStyle.bg} ${catStyle.border} ${
                      isSelected
                        ? 'ring-2 ring-blue-600 scale-105 z-10 shadow-sm'
                        : 'hover:scale-102 hover:shadow-2xs opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-semibold text-slate-500 self-start leading-none">
                      {el.z}
                    </span>
                    <span className={`text-base font-extrabold font-mono tracking-tight my-0.5 ${catStyle.text}`}>
                      {el.symbol}
                    </span>
                    <span className="text-[9px] text-slate-600 truncate max-w-full font-medium leading-none">
                      {language === 'vi' ? el.name_vi : el.name_en}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Element Inspector Card */}
          <div className="w-80 border-l border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Element Header Badge */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400">Z = {selectedElement.z}</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {selectedElement.symbol}
                  </h3>
                  <p className="text-sm font-bold text-blue-700">
                    {language === 'vi' ? selectedElement.name_vi : selectedElement.name_en}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 font-bold block">
                    {selectedElement.mass.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">g/mol (amu)</span>
                </div>
              </div>

              {/* Physical & Chemical Properties */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-500">{language === 'vi' ? 'Chu kỳ & Nhóm' : 'Period & Group'}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    Chu kỳ {selectedElement.period} • Nhóm {selectedElement.group}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-500">{language === 'vi' ? 'Cấu hình electron' : 'Electron Config'}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedElement.electronConfig}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-500">{language === 'vi' ? 'Độ âm điện' : 'Electronegativity'}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedElement.electronegativity ? selectedElement.electronegativity.toFixed(2) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-500">{language === 'vi' ? 'Số oxi hóa' : 'Oxidation States'}</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedElement.oxidationStates.map(n => (n > 0 ? `+${n}` : n)).join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-slate-500">{language === 'vi' ? 'Trạng thái chuẩn STP' : 'Standard Phase'}</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {selectedElement.phase_STP}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Add Button if chemical exists in inventory */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              {matchedChemical ? (
                <button
                  onClick={handleAddReagent}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {selectedEquipmentId
                      ? (language === 'vi' ? `Thêm ${selectedElement.symbol} vào bình đang chọn` : `Add ${selectedElement.symbol} to selected vessel`)
                      : (language === 'vi' ? `Tạo cốc với ${selectedElement.symbol}` : `Spawn beaker with ${selectedElement.symbol}`)}
                  </span>
                </button>
              ) : (
                <div className="p-2 rounded-lg bg-slate-100 text-center text-slate-400 text-xs italic">
                  {language === 'vi' ? 'Hóa chất đơn chất này chưa được nạp sẵn vào kho' : 'Element not stocked in basic reagent inventory'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
