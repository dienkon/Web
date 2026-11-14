import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLabStore } from '../../store/useLabStore';
import { EquipmentType } from '../../types/equipment';
import { soundEngine } from '../../services/soundEngine';

const QUICK_ITEMS: { type: EquipmentType; label_vi: string; label_en: string; icon: string }[] = [
  { type: 'beaker', label_vi: 'Cốc 250mL', label_en: 'Beaker', icon: '🧪' },
  { type: 'erlenmeyer_flask', label_vi: 'Bình tam giác', label_en: 'Flask', icon: '⚗️' },
  { type: 'test_tube', label_vi: 'Ống nghiệm', label_en: 'Test Tube', icon: '🧫' },
  { type: 'graduated_cylinder', label_vi: 'Ống đong', label_en: 'Cylinder', icon: '📏' },
  { type: 'burette', label_vi: 'Buret', label_en: 'Burette', icon: '🔬' },
  { type: 'analytical_balance', label_vi: 'Cân điện tử', label_en: 'Balance', icon: '⚖️' },
  { type: 'bunsen_burner', label_vi: 'Đèn Bunsen', label_en: 'Burner', icon: '🔥' },
  { type: 'hot_plate', label_vi: 'Bếp điện', label_en: 'Hot Plate', icon: '♨️' },
  { type: 'evaporating_dish', label_vi: 'Bát sứ', label_en: 'Dish', icon: '🥣' },
  { type: 'separatory_funnel', label_vi: 'Phễu chiết', label_en: 'Sep Funnel', icon: '🍷' },
  { type: 'ph_meter', label_vi: 'Bút pH', label_en: 'pH Meter', icon: '📟' },
  { type: 'thermometer', label_vi: 'Nhiệt kế', label_en: 'Thermo', icon: '🌡️' },
  { type: 'ph_paper', label_vi: 'Giấy pH', label_en: 'pH Paper', icon: '📜' },
  { type: 'wash_bottle', label_vi: 'Bình tia', label_en: 'Wash Bottle', icon: '🧴' },
];

export const BottomTray: React.FC = () => {
  const { addEquipment, language } = useLabStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative z-20 shrink-0 w-full flex justify-center px-1.5 sm:px-3 py-1 bg-slate-100/85 border-t border-slate-200/80 select-none">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-slate-200/90 shadow-xs text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-blue-50 cursor-pointer"
        >
          <ChevronUp size={13} />
          <span>{language === 'vi' ? 'Dụng cụ' : 'Tray'}</span>
        </button>
      ) : (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm px-1.5 sm:px-2 py-0.5 sm:py-1 flex items-center gap-0.5 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0 cursor-pointer"
            title={language === 'vi' ? 'Thu gọn thanh dụng cụ' : 'Minimize tray'}
            aria-label="Minimize quick tray"
          >
            <ChevronDown size={14} />
          </button>

          {QUICK_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                addEquipment(item.type);
                soundEngine.glassClink();
              }}
              className="flex flex-col items-center justify-center py-1 px-2 sm:px-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition-transform active:scale-95 shrink-0 group cursor-pointer"
              title={language === 'vi' ? `Thêm ${item.label_vi}` : `Add ${item.label_en}`}
            >
              <span className="text-base sm:text-xl leading-none">{item.icon}</span>
              <span className="text-[10.5px] sm:text-[11px] font-semibold mt-0.5 text-slate-600 group-hover:text-blue-600 whitespace-nowrap">
                {language === 'vi' ? item.label_vi : item.label_en}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
