import React from 'react';
import {
  MousePointer2,
  Wand2,
  Pipette,
  Utensils,
  FileCheck2,
  Thermometer,
  Sparkles,
  X,
  Droplets,
  Gauge,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useLabStore, WorkbenchTool } from '../../store/useLabStore';

export const MeasurementHUD: React.FC = () => {
  const {
    language,
    activeTool,
    setActiveTool,
    pipetteBuffer,
    clearPipette,
    spatulaScoop,
    setSpatulaScoop,
    spillPuddles,
    cleanAllSpills,
    selectedEquipmentId,
    equipment,
  } = useLabStore(
    useShallow((s) => ({
      language: s.language,
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
      pipetteBuffer: s.pipetteBuffer,
      clearPipette: s.clearPipette,
      spatulaScoop: s.spatulaScoop,
      setSpatulaScoop: s.setSpatulaScoop,
      spillPuddles: s.spillPuddles,
      cleanAllSpills: s.cleanAllSpills,
      selectedEquipmentId: s.selectedEquipmentId,
      equipment: s.equipment,
    }))
  );

  const vi = language === 'vi';
  const t = (en: string, v: string) => (vi ? v : en);
  const selected = selectedEquipmentId ? equipment[selectedEquipmentId] : null;
  const spillCount = spillPuddles.length;

  const tools: {
    id: WorkbenchTool;
    label: string;
    mobileLabel: string;
    title: string;
    icon: React.ReactNode;
    activeCls: string;
  }[] = [
    {
      id: 'select',
      label: t('Move', 'Di chuyển'),
      mobileLabel: t('Move', 'Chọn'),
      title: t('Select & drag equipment or pour directly', 'Chọn, kéo thả dụng cụ & rót chất trực tiếp'),
      icon: <MousePointer2 size={13} />,
      activeCls: 'bg-blue-600 text-white shadow-xs',
    },
    {
      id: 'stir_rod',
      label: t('Stir Rod', 'Đũa khuấy'),
      mobileLabel: t('Stir', 'Khuấy'),
      title: t('Click or drag across any vessel to stir and accelerate dye/heat mixing', 'Nhấn hoặc khuấy lên bình để trộn đều màu loang'),
      icon: <Wand2 size={13} />,
      activeCls: 'bg-cyan-600 text-white shadow-xs',
    },
    {
      id: 'pipette',
      label: pipetteBuffer
        ? `${t('Drop', 'Nhỏ')} (${pipetteBuffer.volume_ml.toFixed(1)}mL)`
        : t('Pipette', 'Ống hút'),
      mobileLabel: pipetteBuffer
        ? `${pipetteBuffer.volume_ml.toFixed(0)}mL`
        : t('Pipette', 'Hút'),
      title: pipetteBuffer
        ? t('Click a destination vessel to drop sample at cursor site', 'Nhấn vào bình nhận để nhỏ dung dịch tại vị trí trỏ')
        : t('Click a source vessel with liquid to draw up to 10 mL', 'Nhấn vào bình có dung dịch để hút tối đa 10 mL'),
      icon: <Pipette size={13} />,
      activeCls: 'bg-amber-500 text-white shadow-xs',
    },
    {
      id: 'spatula',
      label: spatulaScoop
        ? `${t('Spatula', 'Muỗng')} (${spatulaScoop.formula})`
        : t('Spatula', 'Muỗng xúc'),
      mobileLabel: spatulaScoop ? spatulaScoop.formula : t('Scoop', 'Xúc'),
      title: spatulaScoop
        ? t('Click any vessel to sprinkle scooped solid chemical', 'Nhấn vào bình để rắc chất rắn trên muỗng')
        : t('Select a solid reagent in inventory to scoop onto spatula', 'Chọn hóa chất rắn bên kho để xúc lên muỗng'),
      icon: <Utensils size={13} />,
      activeCls: 'bg-indigo-600 text-white shadow-xs',
    },
    {
      id: 'litmus',
      label: t('Litmus', 'Quỳ tím'),
      mobileLabel: t('Litmus', 'Quỳ'),
      title: t('Click any vessel to dip interactive pH litmus paper', 'Nhấn vào bình để nhúng giấy quỳ tím kiểm tra pH'),
      icon: <FileCheck2 size={13} />,
      activeCls: 'bg-purple-600 text-white shadow-xs',
    },
    {
      id: 'probe',
      label: t('T / pH Probe', 'Đầu dò T·pH'),
      mobileLabel: t('Probe', 'Đo pH'),
      title: t('Inspect exact temperature, pH, viscosity & surface tension', 'Đo chính xác nhiệt độ, pH, độ nhớt & sức căng'),
      icon: <Thermometer size={13} />,
      activeCls: 'bg-rose-600 text-white shadow-xs',
    },
    {
      id: 'sponge',
      label: t('Sponge', 'Khăn lau'),
      mobileLabel: t('Wipe', 'Lau'),
      title: t('Click any spill puddle to wipe clean', 'Nhấn vào vết tràn hóa chất để lau sạch'),
      icon: <Sparkles size={13} />,
      activeCls: 'bg-amber-600 text-white shadow-xs',
    },
  ];

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 bg-white/94 backdrop-blur-md px-1.5 sm:px-2 py-1 rounded-xl border border-slate-200/90 shadow-lg max-w-full overflow-x-auto no-scrollbar select-none">
      {tools.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(isActive && tool.id !== 'select' ? 'select' : tool.id)}
            title={tool.title}
            className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isActive
                ? tool.activeCls
                : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            {tool.id === 'pipette' && pipetteBuffer && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70 shrink-0"
                style={{ backgroundColor: pipetteBuffer.colorHex }}
              />
            )}
            {tool.id === 'spatula' && spatulaScoop && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70 shrink-0"
                style={{ backgroundColor: spatulaScoop.colorHex }}
              />
            )}
            {tool.icon}
            <span className="xl:hidden">{tool.mobileLabel}</span>
            <span className="hidden xl:inline">{tool.label}</span>
            {tool.id === 'sponge' && spillCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {spillCount}
              </span>
            )}
          </button>
        );
      })}

      {/* Clear scooped solid chemical on spatula quickly */}
      {spatulaScoop && (
        <button
          type="button"
          onClick={() => setSpatulaScoop(null)}
          className="p-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 shrink-0 cursor-pointer"
          title={t('Discard Spatula Scoop', 'Bỏ mẫu trên muỗng')}
          aria-label="Discard spatula scoop"
        >
          <X size={13} />
        </button>
      )}

      {/* Clear drawn pipette sample quickly */}
      {pipetteBuffer && (
        <button
          type="button"
          onClick={clearPipette}
          className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 shrink-0 cursor-pointer"
          title={t('Discard Pipette Sample', 'Bỏ mẫu trong ống hút')}
          aria-label="Discard pipette sample"
        >
          <X size={13} />
        </button>
      )}

      {/* Quick Wipe All spills shortcut when active spills present */}
      {spillCount > 0 && (
        <button
          type="button"
          onClick={cleanAllSpills}
          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
        >
          {t('Wipe All', 'Lau hết')}
        </button>
      )}

      {/* Selected Vessel Compact Digital Readout Pill (hidden on narrow portrait unless Probe active) */}
      {selected && selected.isContainer && !selected.isShattered && (
        <div
          className={`${
            activeTool === 'probe' ? 'flex' : 'hidden md:flex'
          } items-center gap-2 pl-2.5 ml-0.5 border-l border-slate-200 text-xs font-mono text-slate-700 whitespace-nowrap shrink-0`}
        >
          <span className="flex items-center gap-1 font-semibold text-rose-600">
            <Thermometer size={12} />
            {selected.temperature_c.toFixed(1)}°C
          </span>
          <span className="text-slate-300">|</span>
          <span
            className="flex items-center gap-1 font-bold"
            style={{ color: selected.ph < 6 ? '#dc2626' : selected.ph > 8 ? '#2563eb' : '#059669' }}
          >
            <Droplets size={12} />
            pH {selected.ph.toFixed(2)}
          </span>
          {selected.viscosity_mPa_s !== undefined && (
            <>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Gauge size={12} />
                {selected.viscosity_mPa_s.toFixed(2)} mPa·s
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
