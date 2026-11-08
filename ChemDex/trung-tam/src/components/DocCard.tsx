import React from 'react';
import { DocMeta, getCategoryConfig } from '../utils/config';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface DocCardProps {
  doc: DocMeta;
  onClick: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (e: React.MouseEvent) => void;
  onTagClick?: (tag: string) => void;
}

export function DocCard({ doc, onClick, isBookmarked, onToggleBookmark, onTagClick }: DocCardProps) {
  const catConfig = getCategoryConfig(doc.category);
  
  return (
    <div 
      className="group flex flex-col bg-white border border-sky-200/80 p-5 rounded-2xl gap-4 shadow-sm hover:shadow-xl hover:border-sky-400 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="relative aspect-[16/9] w-full rounded-xl bg-gradient-to-br from-sky-50 via-teal-50 to-amber-50 overflow-hidden border border-sky-100">
        <img
          src={doc.image || '/assets/library/covalent-bonds.svg'} 
          alt={doc.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-transparent to-transparent"></div>
        
        {catConfig && (
          <div className="absolute top-3 left-3">
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase shadow-md ${catConfig.badgeClass}`}>
              {catConfig.label}
            </span>
          </div>
        )}

        {doc.chemicalFormula && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md text-sky-900 font-mono font-extrabold text-base sm:text-lg shadow-md border border-sky-200/80 truncate max-w-[75%]">
              {doc.chemicalFormula}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-400/95 text-slate-950 shadow-sm whitespace-nowrap">
              Bài báo 1.000+ chữ ↗
            </span>
          </div>
        )}
        
        <button 
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:bg-white shadow-sm transition-colors z-10"
          onClick={onToggleBookmark}
          aria-label={`${isBookmarked ? 'Bỏ lưu' : 'Lưu'} ${doc.title}`}
        >
          {isBookmarked ? (
            <BookmarkCheck size={18} className="text-amber-500 fill-amber-500/20" />
          ) : (
            <Bookmark size={18} className="text-slate-600" />
          )}
        </button>
      </div>
      
      <div className="flex flex-col flex-1">
        <h3 className="font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2 mb-1.5 text-base sm:text-lg leading-snug" title={doc.title}>
          {doc.title}
        </h3>
        <p className="text-xs font-medium text-teal-700 mb-2.5">{doc.author} • {doc.readingMinutes ?? Math.ceil(doc.summary.length / 50)} phút đọc · 1.000+ chữ</p>
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed flex-1">
          {doc.summary}
        </p>
        
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100">
          {doc.tags.slice(0, 2).map((tag, idx) => (
            <button 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/70 px-2.5 py-1 rounded-lg transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
