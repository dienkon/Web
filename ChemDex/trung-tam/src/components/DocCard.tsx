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
      className="group flex flex-col bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl gap-4 hover:bg-slate-800 transition-all cursor-pointer h-full"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] w-full rounded-xl bg-slate-900 overflow-hidden">
        <img 
          src={doc.image} 
          alt={doc.title} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent opacity-60"></div>
        
        {catConfig && (
          <div className="absolute top-3 left-3">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-black/20 ${catConfig.badgeClass}`}>
              {catConfig.label}
            </span>
          </div>
        )}
        
        <button 
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/50 backdrop-blur-md text-white hover:bg-slate-800 transition-colors z-10"
          onClick={onToggleBookmark}
        >
          {isBookmarked ? (
            <BookmarkCheck size={18} className="text-yellow-500 fill-yellow-500/20" />
          ) : (
            <Bookmark size={18} className="text-slate-300" />
          )}
        </button>
      </div>
      
      <div className="flex flex-col flex-1">
        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate mb-1">
          {doc.title}
        </h3>
        <p className="text-xs text-slate-500 mb-3">{doc.author} • {Math.ceil(doc.summary.length / 50)} phút đọc</p>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed flex-1">
          {doc.summary}
        </p>
        
        <div className="flex gap-1 mt-4">
          {doc.tags.slice(0, 2).map((tag, idx) => (
            <button 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-700/50 hover:bg-slate-600/50 hover:text-white px-2 py-1 rounded transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
