import React from 'react';
import { Beaker, BookOpen, Clock, Bookmark, Grid, ExternalLink, FlaskConical, Users, Trophy, Wrench } from 'lucide-react';
import { categories, CategoryConfig } from '../utils/config';

interface SidebarProps {
  currentView?: string;
  onNavigate?: (view: 'library' | 'community') => void;
  activeCategory?: string | null;
  onSelectCategory?: (id: string | null) => void;
  onOpenHistory?: () => void;
  onOpenBookmarks?: () => void;
  isMobileDrawer?: boolean;
  simpleMenuOnly?: boolean;
  isDesktopCollapsed?: boolean;
}

export function Sidebar({ currentView = 'library', onNavigate = () => {}, 
  activeCategory = null, 
  onSelectCategory = () => {}, 
  onOpenHistory = () => {}, 
  onOpenBookmarks = () => {},
  isMobileDrawer = false,
  simpleMenuOnly = false,
  isDesktopCollapsed = false
}: SidebarProps) {
  
  const isSimplified = simpleMenuOnly || currentView === 'community';

  const content = (
    <>
      <div className="flex items-center gap-3 px-6 py-6 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
          <Beaker className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ChemDex
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar">
        {/* Main Nav */}
        <div className="space-y-1">
          <a
            href="../../"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm hover:bg-slate-800 text-slate-400 border border-transparent group"
          >
            <div className="flex items-center gap-3">
              <Grid size={18} />
              <span>Bảng tuần hoàn</span>
            </div>
            <ExternalLink
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
            />
          </a>

          <button
            onClick={() => {
              onSelectCategory(null);
              onNavigate("library");
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
              currentView === "library" && activeCategory === null
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "hover:bg-slate-800 text-slate-400 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} />
              <span>Thư viện số</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("community")}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
              currentView === "community"
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "hover:bg-slate-800 text-slate-400 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>Cộng đồng</span>
            </div>
          </button>

          <a
            href="https://chem-dex.vercel.app/tien-ich/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm hover:bg-slate-800 text-slate-400 border border-transparent group"
          >
            <div className="flex items-center gap-3">
              <Wrench size={18} className="text-blue-400" />
              <span>Tiện ích</span>
            </div>
            <ExternalLink
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
            />
          </a>

          <a
            href="https://antoanphongthinghiem.ai.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm hover:bg-slate-800 text-slate-400 border border-transparent group"
          >
            <div className="flex items-center gap-3">
              <FlaskConical size={18} />
              <span>Phòng thí nghiệm</span>
            </div>
            <ExternalLink
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
            />
          </a>

          <a
            href="https://chem-dex.vercel.app/dau-truong"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm hover:bg-slate-800 text-slate-400 border border-transparent group"
          >
            <div className="flex items-center gap-3">
              <Trophy size={18} className="text-yellow-400" />
              <span>Đấu trường</span>
            </div>
            <ExternalLink
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
            />
          </a>
        </div>

        {/* Categories - Only show in Library view */}
        {!isSimplified && (
          <div className="pt-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3 px-2">
              Danh mục
            </p>
            <div className="space-y-1">
              {categories.map((cat: CategoryConfig) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
                    activeCategory === cat.id
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      : "hover:bg-slate-800 text-slate-400 border border-transparent"
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                    <div className={cat.iconClass}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                  </div>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (isMobileDrawer) {
    return (
      <div className="h-full flex flex-col bg-transparent pt-4">
        {content}
      </div>
    );
  }

  if (isDesktopCollapsed) {
    return null;
  }

  return (
    <div className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-slate-900/40 backdrop-blur-xl border-r border-slate-700/50 no-print transition-all duration-300">
      {content}
    </div>
  );
}
