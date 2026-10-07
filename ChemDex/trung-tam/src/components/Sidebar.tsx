import React from 'react';
import { Beaker, BookOpen, Clock, Bookmark, Grid, ExternalLink, FlaskConical, Users, Trophy, Wrench, Atom } from 'lucide-react';
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
  const [isLabOpen, setIsLabOpen] = React.useState(false);
  const isSimplified = simpleMenuOnly || currentView === 'community';

  const content = (
    <>
      <div className="p-5 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-atom"></i>
          </div>
          <h1 className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            ChemDex
          </h1>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <a
          href="/"
          className="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <i className="fa-solid fa-table-cells text-blue-400 w-5"></i>
          <span className="font-medium">Bảng Tuần Hoàn</span>
        </a>

        <button
          onClick={() => {
            onSelectCategory(null);
            onNavigate("library");
          }}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentView === "library" && activeCategory === null
              ? "text-slate-300 bg-slate-800 text-white shadow-md active-nav"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <i className="fa-solid fa-book-open text-emerald-400 w-5"></i>
          <span className="font-medium">Tài Liệu Số</span>
        </button>

        <button
          onClick={() => onNavigate("community")}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            currentView === "community"
              ? "text-slate-300 bg-slate-800 text-white shadow-md active-nav"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <i className="fa-solid fa-users text-sky-400 w-5"></i>
          <span className="font-medium">Cộng đồng</span>
        </button>

        <a
          href="/tien-ich/"
          className="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <i className="fa-solid fa-toolbox text-blue-400 w-5"></i>
          <span className="font-medium">Tiện Ích Học Tập</span>
        </a>

        {/* Thí Nghiệm Dropdown Accordion */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsLabOpen(prev => !prev)}
            className="nav-btn w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-flask text-purple-400 w-5"></i>
              <span className="font-medium">Thí Nghiệm</span>
            </div>
            <i className={`fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${isLabOpen ? 'rotate-180' : ''}`}></i>
          </button>
          {isLabOpen && (
            <div className="pl-4 pr-1 py-1 space-y-1 bg-slate-900/40 rounded-xl border border-slate-700/40 transition-all">
              <a
                href="/lab-safety/"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-emerald-300 hover:text-white hover:bg-emerald-500/20 transition-all font-medium"
              >
                <i className="fa-solid fa-shield-halved text-emerald-400 w-4 text-center"></i>
                <span>An toàn phòng thí nghiệm</span>
              </a>
              <a
                href="/thi-nghiem.html"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all font-medium"
              >
                <i className="fa-solid fa-flask-vial text-cyan-400 w-4 text-center"></i>
                <span>Lab 2D</span>
              </a>
              <a
                href="/lab-3d/"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-purple-300 hover:text-white hover:bg-purple-500/20 transition-all font-medium"
              >
                <i className="fa-solid fa-cubes text-purple-400 w-4 text-center"></i>
                <span>Lab 3D</span>
              </a>
            </div>
          )}
        </div>

        <a
          href="/dau-truong/"
          className="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <i className="fa-solid fa-trophy text-yellow-400 w-5"></i>
          <span className="font-medium">Đấu Trường</span>
        </a>

        {/* Categories - Only show in Library view */}
        {!isSimplified && (
          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3 px-2">
              Danh mục
            </p>
            <div className="space-y-1">
              {categories.map((cat: CategoryConfig) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeCategory === cat.id
                      ? "text-slate-300 bg-slate-800 text-white shadow-md active-nav"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <i className={`${cat.iconClass} text-slate-400 w-5`}></i>
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
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
    <aside className="hidden lg:flex w-64 glass flex-col h-screen fixed left-0 top-0 border-r border-slate-700/50 z-50 shrink-0 transition-all duration-300">
      {content}
    </aside>
  );
}
