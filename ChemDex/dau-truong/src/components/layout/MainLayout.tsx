import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { updateBGMState } from '../../utils/audio';
import FloatingChat from './FloatingChat';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    updateBGMState();
  }, [location.pathname]);

  const isMatchPage = location.pathname.startsWith('/match/');

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {!isMatchPage && (
        <Sidebar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {!isMatchPage && (
          <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white dark:text-white transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>
              
            </div>
            
          </header>
        )}
        <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar ${isMatchPage ? 'p-2 sm:p-4 lg:p-6' : 'p-4 lg:p-8'}`}>
          <Outlet />
        </div>
      </main>

      {!isMatchPage && <FloatingChat />}
    </div>
  );
}
