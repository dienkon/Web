import React, { useState, useMemo } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Badge } from '../../ui/Badge';
import { SAFETY_RULES } from '../../data/rules';
import { useStore } from '../../store/useStore';
import { vi } from '../../i18n/vi';
import { Search, BookOpen, ChevronRight, Filter } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const RulesListScreen: React.FC<Props> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const setActiveRuleDialog = useStore((s) => s.setActiveRuleDialog);

  const categories = [
    { id: 'all', label: 'Tất cả (25)' },
    { id: 'ppe', label: 'Bảo hộ (PPE)' },
    { id: 'chemical', label: 'Hóa chất' },
    { id: 'heat', label: 'Nhiệt & Lửa' },
    { id: 'firstaid', label: 'Sơ cứu & Báo cáo' },
    { id: 'waste', label: 'Vệ sinh & Rác' },
  ];

  const filteredRules = useMemo(() => {
    return SAFETY_RULES.filter((rule) => {
      const matchSearch =
        rule.title.toLowerCase().includes(search.toLowerCase()) ||
        rule.description.toLowerCase().includes(search.toLowerCase()) ||
        (rule.why && rule.why.toLowerCase().includes(search.toLowerCase()));

      const matchCat =
        selectedCategory === 'all' || rule.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [search, selectedCategory]);

  return (
    <Sheet
      isOpen={true}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[var(--primary)]" />
          <span>{vi.menu.handbook}</span>
        </div>
      }
      subtitle="25 Quy tắc an toàn tiêu chuẩn phòng thực hành Hóa học"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={vi.ruleCard.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-[var(--line)] rounded-xl text-sm font-semibold text-[var(--ink)] focus:border-[var(--primary)] focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-0.5" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)] shadow-xs'
                  : 'bg-white text-slate-600 border-[var(--line)] hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Rules List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              onClick={() => {
                setActiveRuleDialog(rule);
              }}
              className="p-4 bg-white hover:bg-slate-50/80 border border-[var(--line)] hover:border-[var(--primary)]/60 rounded-2xl transition-all cursor-pointer shadow-xs active:scale-[0.99] flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-[var(--primary)] bg-[var(--primary-50)] px-2 py-0.5 rounded-md">
                    #{rule.id}
                  </span>
                  <Badge level={rule.dangerLevel} showIcon={false} />
                </div>
                <h4 className="text-sm font-bold text-[var(--ink)] group-hover:text-[var(--primary-600)] transition-colors">
                  {rule.title}
                </h4>
                <p className="text-xs text-[var(--ink-2)] mt-1 line-clamp-2 leading-relaxed">
                  {rule.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-[var(--primary)]">
                <span>Xem chi tiết & giải thích</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}

          {filteredRules.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm">
              Không tìm thấy quy tắc an toàn phù hợp với từ khóa.
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
};
