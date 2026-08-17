import React, { useState } from 'react';
import { DustBackground } from '../components/DustBackground';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { PanelDrawer } from '../components/PanelDrawer';
import { Community } from '../community/Community';

export default function CongDongPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#1E293B] text-slate-200 font-sans selection:bg-blue-500/30">
      <DustBackground />
      <div className="flex">
        {/* Desktop Sidebar with Simplified Menu */}
        <Sidebar 
          currentView="community"
          simpleMenuOnly={true}
          isDesktopCollapsed={!isDesktopSidebarOpen}
          onNavigate={(v) => { window.location.href = v === 'community' ? '/trung-tam/cong-dong' : '/trung-tam/tai-lieu-so';}}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenBookmarks={() => setBookmarksOpen(true)}
        />

        <main className={`flex-1 transition-all duration-300 min-h-screen ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <Header 
            isCommunity={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenBookmarks={() => setBookmarksOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
            isDesktopSidebarOpen={isDesktopSidebarOpen}
          />
          <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 w-full max-w-full mx-auto">
            <Community externalSearchQuery={searchQuery} onClearSearch={() => setSearchQuery('')} />
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <PanelDrawer 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
      >
        <Sidebar 
          currentView="community"
          simpleMenuOnly={true}
          isMobileDrawer={true}
          onNavigate={(v) => { window.location.href = v === 'community' ? '/trung-tam/cong-dong' : '/trung-tam/tai-lieu-so'; setMobileMenuOpen(false); }}
          onOpenHistory={() => { setHistoryOpen(true); setMobileMenuOpen(false); }}
          onOpenBookmarks={() => { setBookmarksOpen(true); setMobileMenuOpen(false); }}
        />
      </PanelDrawer>

    </div>
  );
}
