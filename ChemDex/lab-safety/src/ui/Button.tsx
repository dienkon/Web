import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'safe';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const sizeStyles = {
    sm: 'min-h-[36px] px-3.5 py-1.5 text-xs gap-1.5',
    md: 'min-h-[44px] px-5 py-2.5 text-sm gap-2',
    lg: 'min-h-[56px] px-7 py-3.5 text-base gap-2.5',
  }[size];

  const variantStyles = {
    primary: 'btn-primary-glow text-white border border-[#0990a1]',
    secondary: 'bg-white hover:bg-[#f0f6fa] text-[var(--ink)] border border-[var(--line)] shadow-sm hover:border-[var(--primary)]',
    danger: 'bg-[var(--danger)] hover:bg-[#b51c30] text-white shadow-md shadow-red-500/20 border border-red-700',
    safe: 'bg-[var(--safe)] hover:bg-[#188851] text-white shadow-md shadow-emerald-500/20 border border-emerald-700',
    ghost: 'bg-transparent hover:bg-black/5 text-[var(--ink-2)] hover:text-[var(--ink)] border border-transparent',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
