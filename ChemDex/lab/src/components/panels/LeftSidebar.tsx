import React, { useState } from 'react';
import {
  TestTube,
  Beaker,
  BookOpen,
  ShieldAlert,
  Search,
  Plus,
  Flame,
  Droplets,
  Atom,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';
import { CHEMICAL_LIBRARY } from '../../data/chemicals';
import { EXPERIMENTS_CURRICULUM } from '../../data/experiments';
import { useUiStore, LeftTabType } from '../../store/uiStore';
import { useSimulationStore } from '../../store/simulationStore';
import { ChemicalCategory } from '../../types/chemistry';
import { VesselType } from '../../types/vessel';

export const LeftSidebar: React.FC = () => {
  const {
    activeLeftTab,
    setActiveLeftTab,
    leftSidebarOpen,
    toggleLeftSidebar,
    openDispenseModal,
    startExperiment,
    isReacting
  } = useUiStore();

  const { addVessel, selectedVesselId } = useSimulationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter chemicals
  const filteredChemicals = Object.values(CHEMICAL_LIBRARY).filter(chem => {
    const matchesSearch =
      chem.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chem.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chem.nameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chem.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'all' || chem.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories: { id: string; labelVi: string }[] = [
    { id: 'all', labelVi: 'Tất cả' },
    { id: 'acid', labelVi: 'Axit' },
    { id: 'base', labelVi: 'Bazơ' },
    { id: 'salt', labelVi: 'Muối' },
    { id: 'indicator', labelVi: 'Chỉ thị' },
    { id: 'metal', labelVi: 'Kim loại' },
    { id: 'solvent', labelVi: 'Dung môi' }
  ];

  const apparatusList: { type: VesselType; nameVi: string; descVi: string; icon: string }[] = [
    { type: 'beaker', nameVi: 'Cốc đốt (Beaker)', descVi: 'Dung tích 250 mL, chịu nhiệt tốt', icon: 'beaker' },
    { type: 'erlenmeyer', nameVi: 'Bình tam giác (Erlenmeyer)', descVi: 'Dung tích 250 mL, dùng chuẩn độ', icon: 'flask' },
    { type: 'test_tube', nameVi: 'Ống nghiệm (Test Tube)', descVi: 'Dung tích 50 mL kèm giá đỡ gỗ', icon: 'tube' },
    { type: 'burette', nameVi: 'Buret chuẩn độ (Burette)', descVi: 'Dung tích 50 mL có khóa van nhỏ giọt', icon: 'burette' },
    { type: 'graduated_cylinder', nameVi: 'Ống đong chia vạch', descVi: 'Dung tích 100 mL, đo thể tích chính xác', icon: 'cylinder' }
  ];

  if (!leftSidebarOpen) {
    return (
      <button
        onClick={toggleLeftSidebar}
        className="absolute left-3 top-16 z-20 bg-white border border-slate-200 shadow-md rounded-xl p-2.5 text-slate-700 hover:text-sky-600 hover:bg-slate-50 transition-all flex items-center gap-1.5"
        title="Mở bảng danh mục hóa chất & dụng cụ"
      >
        <TestTube className="w-4 h-4 text-sky-600" />
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
      </button>
    );
  }

  return (
    <aside className="w-64 min-w-[16rem] max-w-[16rem] shrink-0 h-[calc(100vh-3.5rem)] bg-white/98 backdrop-blur-md border-r border-slate-200 flex flex-col shadow-sm z-20 select-none overflow-hidden">
      {/* Sidebar Header with Collapse Button */}
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Kho Thí Nghiệm
        </span>
        <button
          onClick={toggleLeftSidebar}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title="Thu gọn bảng (Collapse)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Reaction Lock Banner */}
      {isReacting && (
        <div className="px-3 py-2 bg-amber-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm animate-pulse">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Đang phản ứng / rót... Tạm khóa thêm chất</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/40 p-1">
        <button
          onClick={() => setActiveLeftTab('chemicals')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-md transition-all ${
            activeLeftTab === 'chemicals'
              ? 'bg-white text-sky-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Droplets className="w-3 h-3" />
          <span>Hóa chất</span>
        </button>

        <button
          onClick={() => setActiveLeftTab('apparatus')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-md transition-all ${
            activeLeftTab === 'apparatus'
              ? 'bg-white text-sky-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Beaker className="w-3 h-3" />
          <span>Dụng cụ</span>
        </button>

        <button
          onClick={() => setActiveLeftTab('curriculum')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-md transition-all ${
            activeLeftTab === 'curriculum'
              ? 'bg-white text-sky-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>Bài học</span>
        </button>

        <button
          onClick={() => setActiveLeftTab('safety')}
          className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-md transition-all ${
            activeLeftTab === 'safety'
              ? 'bg-white text-amber-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>An toàn</span>
        </button>
      </div>

      {/* --- TAB 1: CHEMICALS --- */}
      {activeLeftTab === 'chemicals' && (
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${isReacting ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Search bar */}
          <div className="p-2.5 border-b border-slate-100 min-w-0">
            <div className="relative min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm công thức (HCl, CuSO₄...)"
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto mt-2 pb-1 no-scrollbar w-full min-w-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.labelVi}
                </button>
              ))}
            </div>
          </div>

          {/* Chemicals List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-w-0">
            {filteredChemicals.map((chem) => (
              <div
                key={chem.id}
                draggable={!isReacting}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', chem.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => !isReacting && openDispenseModal(chem.id, selectedVesselId || undefined)}
                className="group p-2 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:shadow-xs cursor-grab active:cursor-grabbing transition-all flex items-center justify-between gap-2 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Swatch */}
                  <div
                    className="w-6 h-6 shrink-0 rounded-lg border border-slate-300/80 flex items-center justify-center text-[9px] font-bold shadow-2xs"
                    style={{
                      backgroundColor: chem.defaultColor.hex || '#ffffff',
                      color: chem.defaultColor.a > 0.5 ? '#ffffff' : '#0f172a'
                    }}
                  >
                    {chem.phase === 'solid' ? 'R' : chem.phase === 'gas' ? 'K' : 'L'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-mono font-bold text-xs text-slate-900 truncate">
                        {chem.formula}
                      </span>
                      {chem.hazards.includes('corrosive') && (
                        <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-1 py-0.2 rounded font-medium shrink-0">
                          Ăn mòn
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium truncate leading-tight mt-0.5" title={chem.nameVi}>
                      {chem.nameVi}
                    </div>
                    <div className="text-[10px] text-slate-400 italic truncate" title={chem.nameEn}>
                      {chem.nameEn}
                    </div>
                  </div>
                </div>

                <button
                  disabled={isReacting}
                  className="w-6 h-6 shrink-0 rounded-lg bg-slate-50 border border-slate-200 group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-all disabled:opacity-40"
                  title="Thêm hóa chất vào bình"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {filteredChemicals.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Không tìm thấy hóa chất phù hợp
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: APPARATUS --- */}
      {activeLeftTab === 'apparatus' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="text-xs text-slate-500 mb-2 px-1">
            Chọn dụng cụ để đặt thêm lên bàn thí nghiệm:
          </div>
          {apparatusList.map((app) => (
            <div
              key={app.type}
              onClick={() => addVessel(app.type)}
              className="group p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 transition-colors">
                  {app.nameVi}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{app.descVi}</div>
              </div>
              <button
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-all"
                title="Đặt lên bàn lab"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB 3: CURRICULUM --- */}
      {activeLeftTab === 'curriculum' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="text-xs text-slate-500 mb-2 px-1">
            Các bài thực hành sư phạm có hướng dẫn từng bước:
          </div>
          {EXPERIMENTS_CURRICULUM.map((exp) => (
            <div
              key={exp.id}
              onClick={() => startExperiment(exp.id)}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:border-sky-400 hover:shadow-sm cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                  {exp.categoryVi}
                </span>
                <span className="text-[11px] text-slate-400">{exp.steps.length} bước</span>
              </div>
              <h3 className="font-bold text-xs text-slate-800 mt-2 group-hover:text-sky-600 transition-colors">
                {exp.titleVi}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                {exp.descriptionVi}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB 4: SAFETY --- */}
      {activeLeftTab === 'safety' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Quy Tắc Vàng Phòng Lab</span>
            </div>
            <p className="text-[11px] text-amber-900 mt-1.5 leading-relaxed">
              1. Tuyệt đối không rót nước vào axit đặc (phải rót từ từ axit vào nước).<br/>
              2. Không đun nóng bình kín.<br/>
              3. Luôn trang bị kính và áo bảo hộ khi tiếp xúc dung dịch ăn mòn.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-800 mb-2">Trang Bị Bảo Hộ (PPE)</h4>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Kính bảo hộ (Safety Goggles): Đang trang bị</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Áo blouse trắng phòng lab: Đang trang bị</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Găng tay nitrile: Sẵn sàng</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-800 mb-2">Phân Loại Chất Thải</h4>
            <div className="space-y-1 text-[11px] text-slate-600">
              <p>• <strong>Axit/Kiềm loãng:</strong> Trung hòa về pH 7 rồi xả bồn rửa.</p>
              <p>• <strong>Kim loại nặng (Pb²⁺, Ba²⁺, Cu²⁺):</strong> Thu gom riêng vào bình thải kim loại nặng độc hại.</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
