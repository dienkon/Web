import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DocMeta, getCategoryConfig } from '../utils/config';

interface PanelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items?: DocMeta[];
  onItemClick?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  children?: React.ReactNode;
  position?: 'left' | 'right';
}

export function PanelDrawer({ 
  isOpen, 
  onClose, 
  title, 
  items = [], 
  onItemClick, 
  onRemoveItem,
  children,
  position = 'right'
}: PanelDrawerProps) {
  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isLeft = position === 'left';

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className={`
        fixed top-0 h-full w-[280px] sm:w-[400px] z-50 
        bg-slate-900/95 backdrop-blur-2xl 
        ${isLeft ? 'left-0 border-r sm:rounded-r-3xl' : 'right-0 border-l sm:rounded-l-3xl'} border-slate-700/50 
        shadow-2xl flex flex-col transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : (isLeft ? '-translate-x-full' : 'translate-x-full')}
      `}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        <div className={`flex-1 overflow-y-auto ${children ? '' : 'p-6 space-y-4'}`}>
          {children ? (
            children
          ) : items.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">
              <p>Chưa có tài liệu nào.</p>
            </div>
          ) : (
            items.map(doc => {
              const catConfig = getCategoryConfig(doc.category);
              return (
                <div 
                  key={doc.id}
                  className="flex gap-4 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-all group"
                  onClick={() => onItemClick && onItemClick(doc.id)}
                >
                  <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-900">
                    <img src={doc.image} alt={doc.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors">{doc.title}</h4>
                    {catConfig && (
                      <span className={`text-[10px] uppercase font-bold inline-block px-2 py-0.5 rounded-md w-fit ${catConfig.badgeClass}`}>
                        {catConfig.label}
                      </span>
                    )}
                  </div>
                  {onRemoveItem && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(doc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 self-center rounded-full hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
