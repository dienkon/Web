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
  // Global navigation is mounted once by /platform/sidebar.js.
  if (currentView === 'community' || !isMobileDrawer) return null;
  return <nav className="p-5" aria-label="Danh mục tài liệu">
    <button onClick={() => onSelectCategory(null)} className="block py-3">Tất cả tài liệu</button>
    {categories.map((cat: CategoryConfig) => <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className="block py-3">{cat.label}</button>)}
  </nav>;
}
