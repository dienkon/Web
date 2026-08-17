import React, { useState, useEffect } from 'react';
import { Menu, Bookmark, Clock, Sun, Moon, PanelLeftClose, PanelLeftOpen, Bell, Check, X, Trash2 } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface HeaderProps {
  isCommunity?: boolean;
  onOpenMobileMenu: () => void;
  onOpenHistory: () => void;
  onOpenBookmarks: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarOpen?: boolean;
}

export function Header({ 
  onOpenMobileMenu, 
  onOpenHistory, 
  onOpenBookmarks,
  searchQuery,
  onSearchChange,
  isCommunity = false,
  onToggleDesktopSidebar,
  isDesktopSidebarOpen = true
}: HeaderProps) {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (isLight) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribeNotif = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });
    return () => unsubscribeNotif();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      const promises = unreadNotifs.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      setIsNotifOpen(false);
      if (notif.postId) {
        window.location.href = `/trung-tam/cong-dong?post=${notif.postId}`;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-md border-b border-slate-700/50 no-print flex flex-col justify-center ${isCommunity ? 'bg-slate-900/90' : 'bg-[#1E293B]/90'}`}>
      <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center gap-3 sm:gap-4 flex-1">
          {/* Desktop Sidebar Toggle Button */}
          {onToggleDesktopSidebar && (
            <button
              onClick={onToggleDesktopSidebar}
              className="hidden lg:flex p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/60"
              title={isDesktopSidebarOpen ? "Ẩn thanh menu bên (PC)" : "Hiện thanh menu bên (PC)"}
            >
              {isDesktopSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
          )}

          <div className="flex items-center gap-3">
            {isCommunity ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={onOpenMobileMenu}
                  className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
                >
                  <Menu size={24} />
                </button>
                <a href="/trung-tam/cong-dong" className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cộng Đồng
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-4 lg:hidden">
                <button 
                  onClick={onOpenMobileMenu}
                  className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-white">ChemDex</h1>
              </div>
            )}
          </div>

          {/* Search Bar - available in both Library and Community on desktop */}
          <div className="hidden md:flex max-w-md w-full ml-4">
            <SearchBar 
              value={searchQuery} 
              onChange={onSearchChange} 
              placeholder={isCommunity ? "Tìm bài viết, câu hỏi Hóa học (AI Phân tích)..." : "Tìm kiếm tài liệu Hóa học..."}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Notification Bell Button */}
          {currentUser && isCommunity && (
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 relative"
                title="Thông báo"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-76 sm:w-85 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-96">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Bell size={14} className="text-blue-400" />
                      Thông báo ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full"
                      >
                        <Check size={11} /> Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto max-h-80 divide-y divide-slate-800/60 no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        Không có thông báo mới nào
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 hover:bg-slate-800/60 cursor-pointer transition flex gap-2.5 items-start relative group ${!n.read ? 'bg-blue-600/10' : ''}`}
                        >
                          <img 
                            src={n.senderPhoto || `https://i.pravatar.cc/100?u=${n.senderId}`} 
                            className="w-7 h-7 rounded-full border border-slate-700 shrink-0 mt-0.5" 
                            alt="sender avatar" 
                          />
                          <div className="min-w-0 flex-1 pr-4">
                            <p className="text-xs text-slate-200 font-semibold leading-snug">{n.message}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong'}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-2 shrink-0 self-center">
                            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                            <button 
                              onClick={(e) => handleDeleteNotification(n.id, e)}
                              className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition rounded"
                              title="Xóa thông báo"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={() => setIsLight(!isLight)}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title={isLight ? "Chế độ tối" : "Chế độ sáng"}
          >
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {!isCommunity && (
            <>
              <button 
                onClick={onOpenBookmarks}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-slate-800 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700 text-white"
              >
                <Bookmark size={16} className="text-yellow-500 fill-yellow-500" />
                <span className="hidden lg:block">Đã đánh dấu</span>
              </button>

              <button 
                onClick={onOpenHistory}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-slate-800 text-sm font-medium hover:bg-slate-700 transition-colors border border-slate-700 text-white"
              >
                <Clock size={16} className="text-blue-400" />
                <span className="hidden lg:block">Lịch sử</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Mobile Search Bar in natural layout flow so it pushes content down instead of overlapping */}
      <div className="md:hidden px-4 pb-3 pt-0 w-full">
        <SearchBar 
          value={searchQuery} 
          onChange={onSearchChange} 
          placeholder={isCommunity ? "Tìm bài viết, câu hỏi (AI)..." : "Tìm kiếm..."}
        />
      </div>
    </header>
  );
}
