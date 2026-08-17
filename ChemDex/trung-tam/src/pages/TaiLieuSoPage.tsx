import React, { useState, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { DustBackground } from '../components/DustBackground';
import { Header } from '../components/Header';
import { LibraryGrid } from '../components/LibraryGrid';
import { ReaderView } from '../components/ReaderView';
import { PanelDrawer } from '../components/PanelDrawer';
import { Toast } from '../components/Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { libraryDocs, fetchDocFull, getCategoryConfig, DocFull } from '../utils/config';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'community'>('library');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DocFull | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  const [bookmarkedIds, setBookmarkedIds] = useLocalStorage<string[]>('bookmarks', []);
  const [historyIds, setHistoryIds] = useLocalStorage<string[]>('history', []);
  
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const handleDocClick = async (id: string) => {
    // Add to history (front)
    setHistoryIds(prev => {
      const newHistory = [id, ...prev.filter(x => x !== id)].slice(0, 50);
      return newHistory;
    });
    
    // Switch view & start loading
    setCurrentDocId(id);
    setCurrentView('reader');
    setIsLoadingDoc(true);
    setMobileMenuOpen(false);
    setHistoryOpen(false);
    setBookmarksOpen(false);
    
    try {
      const fullDoc = await fetchDocFull(id);
      setCurrentDoc(fullDoc);
    } catch (err) {
      console.error("Error fetching doc:", err);
    } finally {
      setIsLoadingDoc(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      if (prev.includes(id)) {
        showToast('Đã xóa khỏi mục đánh dấu');
        return prev.filter(x => x !== id);
      } else {
        showToast('Đã thêm vào mục đánh dấu');
        return [id, ...prev];
      }
    });
  };

  // Filter docs
  const filteredDocs = useMemo(() => {
    return libraryDocs.filter(doc => {
      const matchCat = activeCategory ? doc.category === activeCategory : true;
      const query = searchQuery.toLowerCase();
      const matchSearch = query 
        ? doc.title.toLowerCase().includes(query) || 
          doc.author.toLowerCase().includes(query) ||
          doc.tags.some(t => t.toLowerCase().includes(query))
        : true;
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveCategory(null);
    
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find a related doc
  const relatedDoc = useMemo(() => {
    if (!currentDoc) return null;
    const related = libraryDocs.find(d => 
      d.id !== currentDoc.id && 
      (d.category === currentDoc.category || d.tags.some(t => currentDoc.tags.includes(t)))
    );
    return related || libraryDocs.find(d => d.id !== currentDoc.id) || null;
  }, [currentDoc, libraryDocs]);

  // Derived lists for drawers
  const bookmarkedDocs = useMemo(() => 
    bookmarkedIds.map(id => libraryDocs.find(d => d.id === id)).filter(Boolean) as any[],
  [bookmarkedIds, libraryDocs]);
  
  const historyDocs = useMemo(() => 
    historyIds.map(id => libraryDocs.find(d => d.id === id)).filter(Boolean) as any[],
  [historyIds, libraryDocs]);

  // Active category config
  const activeCatConfig = activeCategory ? getCategoryConfig(activeCategory) : null;

  return (
    <div className="min-h-screen bg-[#1E293B] text-slate-200 font-sans selection:bg-blue-500/30">
      <DustBackground />
      
      {currentView === 'library' || currentView === 'community' ? (
        <div className="flex">
          <Sidebar 
            currentView='library'
            isDesktopCollapsed={!isDesktopSidebarOpen}
            onNavigate={(v) => { window.location.href = v === 'community' ? '/trung-tam/cong-dong' : '/trung-tam/tai-lieu-so'; setMobileMenuOpen(false); }}
            activeCategory={activeCategory}
            onSelectCategory={(c) => { setActiveCategory(c);  setMobileMenuOpen(false); }}
            onOpenHistory={() => { setHistoryOpen(true); setMobileMenuOpen(false); }}
            onOpenBookmarks={() => { setBookmarksOpen(true); setMobileMenuOpen(false); }}
          />
          <main className={`flex-1 transition-all duration-300 min-h-screen ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
            <Header 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
              onOpenBookmarks={() => setBookmarksOpen(true)}
              onOpenHistory={() => setHistoryOpen(true)}
              onToggleDesktopSidebar={() => setIsDesktopSidebarOpen(prev => !prev)}
              isDesktopSidebarOpen={isDesktopSidebarOpen}
            />
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
              
                {/* Hero Section */}
                  {!searchQuery && !activeCategory && (
                    <div className="relative h-auto md:h-80 w-full rounded-3xl overflow-hidden shadow-2xl group border border-slate-700/30 mb-12 flex flex-col md:flex-row">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10 hidden md:block"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10 md:hidden"></div>
                      <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay"></div>
                      
                      <div className="p-8 md:p-12 flex-1 relative z-20 flex flex-col justify-center">
                        <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider rounded-full w-fit mb-4">
                          Tài liệu nổi bật
                        </span>
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Hóa Học Số</span>
                        </h2>
                        <p className="text-slate-400 max-w-md mb-8 leading-relaxed text-lg">
                          Lưu trữ, tìm kiếm và nghiên cứu các tài liệu hóa học chất lượng cao với giao diện hiện đại và trải nghiệm đọc tuyệt vời.
                        </p>
                      </div>
                      
                      <div className="w-full md:w-1/2 h-64 md:h-full relative z-0 md:z-0 absolute top-0 right-0">
                        <img 
                          src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800" 
                          alt="Hero" 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        />
                      </div>
                    </div>
                  )}

                  {/* Library Grid Header */}
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                      {activeCatConfig ? activeCatConfig.label : (searchQuery ? 'Kết quả tìm kiếm' : 'Khám phá Thư viện')}
                      {searchQuery && <span className="text-slate-400 text-sm ml-2 font-normal">Từ khóa: "{searchQuery}"</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 hidden sm:block">Sắp xếp theo:</span>
                      <select className="bg-transparent text-sm font-semibold text-slate-300 outline-none cursor-pointer">
                        <option>Mới nhất</option>
                        <option>Phổ biến nhất</option>
                      </select>
                    </div>
                  </div>

                  <LibraryGrid docs={filteredDocs} onDocClick={handleDocClick} bookmarkedIds={bookmarkedIds} onToggleBookmark={toggleBookmark} onTagClick={handleTagClick} />

              
            </div>
          </main>
        </div>
      ) : isLoadingDoc ? (
        <div className="min-h-screen bg-[#1E293B] flex flex-col items-center justify-center p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center animate-spin shadow-lg">
            <RefreshCw className="text-blue-400" size={24} />
          </div>
          <p className="text-slate-300 font-semibold text-sm animate-pulse">Đang tải nội dung tài liệu Hóa học...</p>
        </div>
      ) : (
        <ReaderView 
          doc={currentDoc} 
          onBack={() => {
            setCurrentView('library');
            setCurrentDoc(null);
            setCurrentDocId(null);
            setIsLoadingDoc(false);
          }}
          isBookmarked={currentDocId ? bookmarkedIds.includes(currentDocId) : false}
          onToggleBookmark={toggleBookmark}
          onTagClick={handleTagClick}
          onDocClick={handleDocClick}
          relatedDoc={relatedDoc}
        />
      )}

      {/* Drawers */}
      <PanelDrawer 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
      >
        <Sidebar 
            currentView='library'
            isMobileDrawer={true}
            onNavigate={(v) => { window.location.href = v === 'community' ? '/trung-tam/cong-dong' : '/trung-tam/tai-lieu-so'; setMobileMenuOpen(false); }}
            activeCategory={activeCategory}
            onSelectCategory={(c) => { setActiveCategory(c);  setMobileMenuOpen(false); }}
            onOpenHistory={() => { setHistoryOpen(true); setMobileMenuOpen(false); }}
            onOpenBookmarks={() => { setBookmarksOpen(true); setMobileMenuOpen(false); }}
          />
      </PanelDrawer>

      <PanelDrawer 
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Lịch sử đọc"
        items={historyDocs}
        onItemClick={handleDocClick}
        position="right"
      />

      <PanelDrawer 
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        title="Tài liệu đã lưu"
        items={bookmarkedDocs}
        onItemClick={handleDocClick}
        onRemoveItem={toggleBookmark}
        position="right"
      />

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
