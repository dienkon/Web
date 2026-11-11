import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { DustBackground } from '../components/DustBackground';
import { Header } from '../components/Header';
import { LibraryGrid } from '../components/LibraryGrid';
import { ReaderView } from '../components/ReaderView';
import { PanelDrawer } from '../components/PanelDrawer';
import { Toast } from '../components/Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { libraryDocs, fetchDocFull, getCategoryConfig, DocFull, categories, resolveDocId, docURL } from '../utils/config';
import { RefreshCw } from 'lucide-react';
import { filterLibraryDocs } from '../utils/librarySearch';

export default function App() {
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'community'>('library');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DocFull | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const pendingDocRequest = useRef(0);
  
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

  const handleDocClick = async (requestedId: string, replace = false) => {
    const id = resolveDocId(requestedId);
    if (!id) return;
    const request = ++pendingDocRequest.current;
    const url = new URL(window.location.href);
    url.pathname = docURL(id);
    url.searchParams.delete('doc');
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
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
      if (request === pendingDocRequest.current) setCurrentDoc(fullDoc);
    } catch (err) {
      console.error("Error fetching doc:", err);
    } finally {
      if (request === pendingDocRequest.current) setIsLoadingDoc(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const docTheme = localStorage.getItem('chemdex_doc_theme');
    if (docTheme === 'dark') {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
    // Keep existing saved documents and opaque pre-migration links working.
    const migrate = (ids: string[]) => [...new Set(ids.map(resolveDocId).filter(Boolean))] as string[];
    setBookmarkedIds(migrate);
    setHistoryIds(migrate);
    const openLocation = () => {
      const url = new URL(window.location.href);
      const value = url.searchParams.get('doc') ?? decodeURIComponent(url.pathname.split('/tai-lieu-so/')[1]?.split('/')[0] ?? '');
      if (resolveDocId(value)) void handleDocClick(value, true);
      else {
        pendingDocRequest.current++;
        setCurrentView('library'); setCurrentDoc(null); setCurrentDocId(null); setIsLoadingDoc(false);
      }
    };
    openLocation();
    window.addEventListener('popstate', openLocation);
    return () => { pendingDocRequest.current++; window.removeEventListener('popstate', openLocation); };
  }, []);

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
    return filterLibraryDocs(libraryDocs.filter(doc=>!activeCategory||doc.category===activeCategory),searchQuery);
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
          <main className={`flex-1 transition-all duration-300 min-h-screen `}>
            <Header 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
              onOpenBookmarks={() => setBookmarksOpen(true)}
              onOpenHistory={() => setHistoryOpen(true)}
              onToggleDesktopSidebar={() => window.dispatchEvent(new Event('chemdex:toggle-menu'))}
              isDesktopSidebarOpen={isDesktopSidebarOpen}
            />
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
              
                {/* Hero Section */}
                  {!searchQuery && !activeCategory && (
                    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl group border border-sky-200/80 mb-10 flex flex-col lg:flex-row bg-gradient-to-br from-sky-50 via-white to-amber-50/70">
                      <div className="p-7 sm:p-10 lg:p-12 flex-1 relative z-20 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-full shadow-sm">
                            ✦ Tạp Chí Hóa Học Số
                          </span>
                          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300/80 text-xs font-bold rounded-full">
                            Chuyên đề: Sự ra đời của các chất
                          </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
                          Biên Niên Sử &amp; Câu Chuyện <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600">Khởi Nguyên Hóa Học</span>
                        </h2>
                        <p className="text-slate-600 max-w-2xl mb-6 leading-relaxed text-base sm:text-lg">
                          Mỗi nguyên tố và hợp chất đều ẩn chứa một câu chuyện kỳ vĩ — từ lò phản ứng hạt nhân trong lòng các vì sao, những vỉa khoáng vật cổ xưa, đến khoảnh khắc lóe sáng trong phòng thí nghiệm. Khám phá hơn 480 bài báo khoa học giàu hình ảnh minh họa.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Kỳ báo tiêu điểm:</span>
                          {[
                            { id: 'chat-nuoc', label: '💧 Nước (H₂O)' },
                            { id: 'chat-natri-clorua', label: '🧂 Muối ăn (NaCl)' },
                            { id: 'chat-amoniac', label: '🌾 Amoniac (NH₃)' },
                            { id: 'chat-etanol', label: '🍷 Etanol (C₂H₅OH)' },
                            { id: '001_H', label: '☀️ Hiđro (H)' },
                          ].map((featured) => (
                            <button
                              key={featured.id}
                              type="button"
                              onClick={() => void handleDocClick(featured.id)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-800 border border-sky-200/90 shadow-xs text-xs font-bold transition-all hover:-translate-y-0.5 cursor-pointer"
                            >
                              {featured.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="w-full lg:w-[45%] relative p-4 sm:p-6 flex items-center justify-center bg-gradient-to-br from-sky-100/70 via-teal-50/50 to-amber-100/60">
                        <img 
                          src="/assets/library/cosmic-origin.svg" 
                          alt="Minh họa Tạp chí Hóa Học Số — Sự ra đời của các nguyên tố và hợp chất" 
                          className="w-full aspect-[16/9] object-contain rounded-2xl shadow-lg border border-white/80 group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Library Grid Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                      {activeCatConfig ? activeCatConfig.label : (searchQuery ? 'Kết quả tìm kiếm' : 'Thư viện nguyên tố và hợp chất')}
                      {searchQuery && <span className="text-slate-500 text-sm ml-2 font-normal">Từ khóa: "{searchQuery}"</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 hidden sm:block">Chế độ:</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Bài báo khoa học có minh họa</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 mb-6" aria-label="Lọc danh mục tài liệu">
                    <button onClick={() => setActiveCategory(null)} aria-pressed={!activeCategory} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${!activeCategory ? 'border-sky-500 bg-sky-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'}`}>Tất cả</button>
                    {categories.map(cat => <button key={cat.id} onClick={() => setActiveCategory(cat.id)} aria-pressed={activeCategory===cat.id} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${activeCategory===cat.id ? 'border-sky-500 bg-sky-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'}`}>{cat.label}</button>)}
                  </div>
                  <LibraryGrid docs={filteredDocs} onDocClick={(id) => void handleDocClick(id)} bookmarkedIds={bookmarkedIds} onToggleBookmark={toggleBookmark} onTagClick={handleTagClick} />

              
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
            pendingDocRequest.current++;
            const url = new URL(window.location.href);
            url.pathname = '/trung-tam/tai-lieu-so/';
            url.searchParams.delete('doc');
            window.history.pushState(null, '', url);
            setCurrentView('library');
            setCurrentDoc(null);
            setCurrentDocId(null);
            setIsLoadingDoc(false);
          }}
          isBookmarked={currentDocId ? bookmarkedIds.includes(currentDocId) : false}
          onToggleBookmark={toggleBookmark}
          onTagClick={handleTagClick}
          onDocClick={(id) => void handleDocClick(id)}
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
        onItemClick={(id) => void handleDocClick(id)}
        position="right"
      />

      <PanelDrawer 
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
        title="Tài liệu đã lưu"
        items={bookmarkedDocs}
        onItemClick={(id) => void handleDocClick(id)}
        onRemoveItem={toggleBookmark}
        position="right"
      />

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
