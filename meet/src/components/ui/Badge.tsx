import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  className,
}) => {
  const variantStyles = {
    blue: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
    green: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
    yellow: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
    red: 'bg-red-900/60 text-red-300 border border-red-700/50',
    gray: 'bg-gray-800 text-gray-300 border border-gray-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium rounded',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-md',
  };

  return (
    <span className={twMerge(clsx('inline-flex items-center gap-1 font-medium tracking-wide', variantStyles[variant], sizeStyles[size], className))}>
      {children}
    </span>
  );
};
