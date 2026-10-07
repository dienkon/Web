import React from 'react';

export const Keycap: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => {
  return (
    <kbd className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 font-mono text-xs font-bold text-[var(--ink)] bg-white border border-[#c9d8e5] rounded-lg shadow-[0_2px_0_#b0c3d4] select-none ${className}`}>
      {label}
    </kbd>
  );
};

export const Chip: React.FC<{
  label: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ label, icon, active = false, onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border select-none ${
        active
          ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary)] shadow-xs'
          : 'bg-white text-[var(--ink-2)] border-[var(--line)] hover:bg-slate-50 hover:text-[var(--ink)]'
      } ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${
        checked ? 'bg-[var(--primary)]' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div
        className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5.5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const Slider: React.FC<{
  value: number; // 0 to 1
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}> = ({ value, onChange, min = 0, max = 1, step = 0.05, label }) => {
  return (
    <div className="w-full flex items-center gap-3">
      {label && <span className="text-xs font-semibold text-[var(--ink-2)] w-24 shrink-0">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
      />
      <span className="font-mono text-xs font-bold text-[var(--ink)] w-10 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
};
