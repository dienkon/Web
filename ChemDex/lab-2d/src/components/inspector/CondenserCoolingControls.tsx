import React from 'react';
import { Snowflake } from 'lucide-react';
import { EquipmentState } from '../../types/equipment';
import { useLabStore } from '../../store/useLabStore';

interface CondenserCoolingControlsProps {
  condenser: EquipmentState;
  language: 'vi' | 'en';
}

/**
 * Interactive Liebig reflux condenser cooling controls & heat-exchange telemetry,
 * ported from lab-3d CondenserCoolingControls.
 */
export const CondenserCoolingControls: React.FC<CondenserCoolingControlsProps> = ({ condenser, language }) => {
  const setCondenserCooling = useLabStore((s) => s.setCondenserCooling);
  const vi = language === 'vi';
  const cfg = condenser.condenserCooling ?? {
    coolingEnabled: true,
    flowRate_ml_s: 2.5,
    coolantInletTemp_c: 15,
    conductance_W_K: 42,
  };

  return (
    <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 space-y-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-sky-900">
          <Snowflake className="w-3.5 h-3.5 text-sky-600" />
          <span>{vi ? 'Làm mát hồi lưu' : 'Reflux Water Cooling'}</span>
        </div>
        <button
          type="button"
          onClick={() => setCondenserCooling(condenser.id, { coolingEnabled: !cfg.coolingEnabled })}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
            cfg.coolingEnabled
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
          }`}
        >
          {cfg.coolingEnabled ? (vi ? 'Đang bật' : 'Active') : (vi ? 'Đang tắt' : 'Off')}
        </button>
      </div>

      <label className="block space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600 font-medium">
          <span>{vi ? 'Lưu lượng nước' : 'Coolant flow'}</span>
          <span className="font-mono font-bold text-slate-800">{cfg.flowRate_ml_s.toFixed(1)} mL/s</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={12}
          step={0.5}
          value={cfg.flowRate_ml_s}
          onChange={(e) => setCondenserCooling(condenser.id, { flowRate_ml_s: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
      </label>

      <label className="block space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600 font-medium">
          <span>{vi ? 'Nhiệt độ nước vào' : 'Inlet Temp'}</span>
          <span className="font-mono font-bold text-slate-800">{cfg.coolantInletTemp_c.toFixed(1)}°C</span>
        </div>
        <input
          type="range"
          min={5}
          max={35}
          step={1}
          value={cfg.coolantInletTemp_c}
          onChange={(e) => setCondenserCooling(condenser.id, { coolantInletTemp_c: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
      </label>

      <label className="block space-y-1">
        <div className="flex justify-between text-[11px] text-slate-600 font-medium">
          <span>{vi ? 'Hệ số trao đổi nhiệt UA' : 'Conductance UA'}</span>
          <span className="font-mono font-bold text-slate-800">{cfg.conductance_W_K.toFixed(0)} W/K</span>
        </div>
        <input
          type="range"
          min={10}
          max={120}
          step={2}
          value={cfg.conductance_W_K}
          onChange={(e) => setCondenserCooling(condenser.id, { conductance_W_K: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
      </label>

      <div className="pt-2 border-t border-sky-200/80 grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="bg-white/80 rounded-lg px-2 py-1 border border-sky-100">
          <div className="text-slate-500 text-[10px]">{vi ? 'Nước ra' : 'Outlet'}</div>
          <div className="font-mono font-bold text-slate-800">
            {(condenser.coolantOutletTemperature_c ?? cfg.coolantInletTemp_c).toFixed(1)}°C
          </div>
        </div>
        <div className="bg-white/80 rounded-lg px-2 py-1 border border-sky-100">
          <div className="text-slate-500 text-[10px]">{vi ? 'Công suất thu' : 'Cooling'}</div>
          <div className="font-mono font-bold text-sky-700">
            {(condenser.condenserCoolingPower_W ?? 0).toFixed(1)} W
          </div>
        </div>
      </div>
      <p className="text-[10.5px] text-sky-800/85 leading-snug">
        {vi
          ? 'Kéo ống sinh hàn đặt ngay phía trên miệng bình đang đun để ngưng tụ 92% hơi nước hồi lưu.'
          : 'Position directly above a heated vessel mouth to condense 92% of escaping vapor back under reflux.'}
      </p>
    </div>
  );
};
