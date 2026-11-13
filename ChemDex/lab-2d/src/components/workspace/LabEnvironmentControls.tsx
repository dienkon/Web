import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, RotateCcw, Wind, Droplets, Gauge, Thermometer } from 'lucide-react';
import { useLabEnvironment } from '../../store/useLabEnvironment';
import { useLabStore } from '../../store/useLabStore';

export const LabEnvironmentControls: React.FC = () => {
  const {
    environment,
    setTemperature,
    setPressure,
    setAtmosphere,
    setAirSpeed,
    setRelativeHumidity,
    resetEnvironment,
    getDerivedMetrics,
  } = useLabEnvironment();
  const language = useLabStore((s) => s.language);
  const vi = language === 'vi';
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number }>({ top: 56, right: 12 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setPopoverPos({
        top: Math.max(8, Math.min(window.innerHeight - 360, rect.bottom + 8)),
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };

    updatePosition();

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (popoverRef.current && popoverRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const { boilingPointWater_c, dewPoint_c } = getDerivedMetrics();
  const isInert = environment.oxygenFraction === 0;

  return (
    <div ref={containerRef} className="relative text-xs">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={vi ? 'Điều kiện môi trường phòng thí nghiệm' : 'Laboratory environment conditions'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs font-semibold transition-colors cursor-pointer ${
          isInert
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            : 'bg-white/95 text-slate-700 border-slate-200/90 hover:bg-slate-50'
        }`}
        title={vi ? 'Nhiệt độ phòng, áp suất khí quyển, khí trơ & độ ẩm' : 'Room temperature, atmospheric pressure, gas composition & humidity'}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="whitespace-nowrap">
          {environment.temperature_c.toFixed(0)}°C · {environment.pressure_atm.toFixed(2)} atm
        </span>
        {isInert && (
          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[10px] font-bold">
            N₂
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ top: `${popoverPos.top}px`, right: `${popoverPos.right}px` }}
          className="lab-popover fixed z-[90] w-[min(340px,calc(100vw-16px))] rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-md p-4 shadow-2xl space-y-3 text-slate-700"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {vi ? 'Môi trường phòng thí nghiệm' : 'Laboratory Environment'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {vi ? 'Ảnh hưởng trực tiếp điểm sôi, bay hơi & phản ứng cháy' : 'Couples to boiling point, cooling flux & combustion'}
              </p>
            </div>
            <button
              type="button"
              onClick={resetEnvironment}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title={vi ? 'Khôi phục điều kiện chuẩn (25°C, 1 atm)' : 'Reset to STP'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="block space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                {vi ? 'Nhiệt độ phòng' : 'Room temperature'}
              </span>
              <span className="font-mono text-blue-600">{environment.temperature_c.toFixed(0)} °C</span>
            </div>
            <input
              className="w-full accent-blue-600"
              aria-label="Room temperature"
              type="range"
              min="10"
              max="40"
              step="1"
              value={environment.temperature_c}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </label>

          <label className="block space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                {vi ? 'Áp suất khí quyển' : 'Atmospheric pressure'}
              </span>
              <span className="font-mono text-blue-600">{environment.pressure_atm.toFixed(2)} atm</span>
            </div>
            <input
              className="w-full accent-indigo-600"
              aria-label="Atmospheric pressure"
              type="range"
              min="0.6"
              max="1.2"
              step="0.01"
              value={environment.pressure_atm}
              onChange={(e) => setPressure(Number(e.target.value))}
            />
          </label>

          <div className="space-y-1">
            <span className="block text-[11px] font-semibold">
              {vi ? 'Thành phần khí quyển' : 'Atmosphere composition'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAtmosphere('air')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                  !isInert
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {vi ? 'Không khí (20.95% O₂)' : 'Air (20.95% O₂)'}
              </button>
              <button
                type="button"
                onClick={() => setAtmosphere('inert')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                  isInert
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {vi ? 'Khí trơ N₂ (0% O₂)' : 'Inert N₂ (0% O₂)'}
              </button>
            </div>
          </div>

          <label className="block space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-sky-500" />
                {vi ? 'Tốc độ gió tủ hút' : 'Airflow speed'}
              </span>
              <span className="font-mono text-blue-600">{environment.airSpeed_m_s.toFixed(1)} m/s</span>
            </div>
            <input
              className="w-full accent-sky-500"
              aria-label="Air speed"
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={environment.airSpeed_m_s}
              onChange={(e) => setAirSpeed(Number(e.target.value))}
            />
          </label>

          <label className="block space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-teal-500" />
                {vi ? 'Độ ẩm tương đối' : 'Relative humidity'}
              </span>
              <span className="font-mono text-blue-600">{Math.round(environment.relativeHumidity * 100)}%</span>
            </div>
            <input
              className="w-full accent-teal-600"
              aria-label="Relative humidity"
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={environment.relativeHumidity}
              onChange={(e) => setRelativeHumidity(Number(e.target.value))}
            />
          </label>

          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{vi ? 'Điểm sôi H₂O ở áp suất này:' : 'H₂O boiling point:'}</span>
              <span className="font-mono font-bold text-slate-800">{boilingPointWater_c.toFixed(1)} °C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{vi ? 'Điểm sương không khí:' : 'Dew point:'}</span>
              <span className="font-mono font-semibold text-slate-700">{dewPoint_c.toFixed(1)} °C</span>
            </div>
            {isInert && (
              <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                {vi
                  ? '⚠ Khí trơ (0% O₂): Ngọn lửa đèn cồn tắt & H₂/Na không cháy.'
                  : '⚠ Inert atmosphere (0% O₂): Burners extinguish & Na/H₂ do not ignite.'}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
