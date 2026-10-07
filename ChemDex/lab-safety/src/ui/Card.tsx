import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`${elevated ? 'white-glass-elevated' : 'white-glass'} card-highlight rounded-[20px] p-5 sm:p-6 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
