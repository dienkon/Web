import React from 'react';
import { AlertTriangle, AlertOctagon, Info, ShieldAlert } from 'lucide-react';

export type DangerLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BadgeProps {
  level: DangerLevel;
  className?: string;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  level,
  className = '',
  showIcon = true,
}) => {
  const configs = {
    low: {
      label: 'Mức độ: Thấp',
      icon: <Info className="w-3.5 h-3.5" />,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    medium: {
      label: 'Mức độ: Trung bình',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    high: {
      label: 'Mức độ: Cao',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      classes: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    critical: {
      label: 'Mức độ: Nghiêm trọng',
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
      classes: 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold animate-pulse',
    },
  }[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${configs.classes} ${className}`}
    >
      {showIcon && configs.icon}
      <span>{configs.label}</span>
    </span>
  );
};
