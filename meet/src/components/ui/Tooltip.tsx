import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute ${
            position === 'top' ? '-top-10' : 'top-12'
          } z-50 px-2.5 py-1 text-xs font-medium text-white bg-gray-900/90 backdrop-blur-xs border border-gray-700 rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-all duration-150 animate-fade-in`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
