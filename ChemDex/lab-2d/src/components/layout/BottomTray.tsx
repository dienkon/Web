import React from 'react';
import { useLabStore } from '../../store/useLabStore';
import { EquipmentType } from '../../types/equipment';
import { soundEngine } from '../../services/soundEngine';

export const BottomTray: React.FC = () => {
  const { addEquipment, language } = useLabStore();

  const QUICK_ITEMS: { type: EquipmentType; label_vi: string; label_en: string; icon: string }[] = [
    { type: 'beaker', label_vi: 'Cốc 250mL', label_en: 'Beaker', icon: '🧪' },
    { type: 'erlenmeyer_flask', label_vi: 'Bình tam giác', label_en: 'Flask', icon: '⚗️' },
    { type: 'test_tube', label_vi: 'Ống nghiệm', label_en: 'Test Tube', icon: '🧪' },
    { type: 'graduated_cylinder', label_vi: 'Ống đong', label_en: 'Cylinder', icon: '📏' },
    { type: 'burette', label_vi: 'Buret', label_en: 'Burette', icon: '🔬' },
    { type: 'analytical_balance', label_vi: 'Cân điện tử', label_en: 'Balance', icon: '⚖️' },
    { type: 'bunsen_burner', label_vi: 'Đèn Bunsen', label_en: 'Burner', icon: '🔥' },
    { type: 'hot_plate', label_vi: 'Bếp điện', label_en: 'Hot Plate', icon: '♨️' },
    { type: 'evaporating_dish', label_vi: 'Bát sứ', label_en: 'Dish', icon: '🥣' },
    { type: 'ph_meter', label_vi: 'Bút pH', label_en: 'pH Meter', icon: '📟' },
    { type: 'thermometer', label_vi: 'Nhiệt kế', label_en: 'Thermo', icon: '🌡️' },
    { type: 'separatory_funnel', label_vi: 'Phễu chiết', label_en: 'Sep Funnel', icon: '🍷' },
    { type: 'ph_paper', label_vi: 'Giấy pH', label_en: 'pH Paper', icon: '📜' },
    { type: 'wash_bottle', label_vi: 'Bình tia H2O', label_en: 'Wash Bottle', icon: '🧴' },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-lg px-3 py-1.5 flex items-center gap-2 select-none">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
        {language === 'vi' ? 'Dụng cụ nhanh' : 'Quick Tray'}
      </span>
      {QUICK_ITEMS.map(item => (
        <button
          key={item.type}
          onClick={() => {
            addEquipment(item.type);
            soundEngine.glassClink();
          }}
          className="flex flex-col items-center justify-center p-1.5 px-2.5 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-700 transition-all hover:scale-105 active:scale-95 group"
          title={language === 'vi' ? `Thêm ${item.label_vi}` : `Add ${item.label_en}`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[10px] font-semibold mt-1 text-slate-500 group-hover:text-blue-600 whitespace-nowrap">
            {language === 'vi' ? item.label_vi : item.label_en}
          </span>
        </button>
      ))}
    </div>
  );
};
