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
  const isMoleculeRender = Boolean(doc.image && /\/assets\/library\/photos\/substances\/.+\.png$/i.test(doc.image));

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src.includes('topic-default')) {
      target.onerror = null;
      return;
    }
    target.src = '/assets/library/photos/topic-default.jpg';
  };
  
  return (
    <div 
      className="group flex flex-col bg-white dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl gap-3.5 shadow-xs hover:shadow-xl hover:border-sky-400 dark:hover:border-sky-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full"
      onClick={onClick}
    >
      {/* High-prominence Image Container with Guaranteed Fallback */}
      <div className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-sky-100 dark:border-slate-700/60 shadow-xs ${isMoleculeRender ? 'bg-slate-950/90' : 'bg-slate-900/10 dark:bg-slate-800/50'}`}>
        <img
          src={doc.image || '/assets/library/photos/topic-default.jpg'} 
          alt="" 
          onError={handleImageError}
          className={`w-full h-full transition-transform duration-500 ${isMoleculeRender ? 'object-contain p-2.5 group-hover:scale-105' : 'object-cover group-hover:scale-105'}`}
          loading="lazy"
        />
        {/* Subtle dark gradient overlay for crystal-clear readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent pointer-events-none" />
        
        {catConfig && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider bg-slate-900/80 text-white border border-white/15 shadow-sm backdrop-blur-md">
              {catConfig.label}
            </span>
          </div>
        )}

        <button 
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-300 hover:scale-105 shadow-sm transition-all z-10"
          onClick={onToggleBookmark}
          aria-label={`${isBookmarked ? 'Bỏ lưu' : 'Lưu'} ${doc.title}`}
        >
          {isBookmarked ? (
            <BookmarkCheck size={16} className="text-amber-500 fill-amber-500/20" />
          ) : (
            <Bookmark size={16} className="text-slate-600 dark:text-slate-400" />
          )}
        </button>

        {doc.chemicalFormula && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-sky-300 font-mono font-black text-xs sm:text-sm border border-sky-400/30 shadow-xs truncate max-w-[65%]">
              {doc.chemicalFormula}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-xs whitespace-nowrap">
              Bài báo 1.000+ chữ ↗
            </span>
          </div>
        )}
      </div>
      
      {/* Article Content Info */}
      <div className="flex flex-col flex-1">
        <h3 
          className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 mb-1.5 text-base sm:text-lg leading-snug" 
          title={doc.title}
        >
          {doc.title}
        </h3>

        {/* Crisp metadata row without text overlap */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-teal-700 dark:text-teal-400 mb-2">
          <span className="font-semibold truncate max-w-[60%]">{doc.author}</span>
          <span className="shrink-0 text-slate-500 dark:text-slate-400 font-medium">
            {doc.readingMinutes ?? 5} phút đọc • 1.000+ chữ
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed flex-1">
          {doc.summary}
        </p>
        
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {doc.tags.slice(0, 2).map((tag, idx) => (
            <button 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/70 dark:border-sky-800/60 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
