import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Play, Plus, Users, Target, Trophy, History, User, Settings, HelpCircle, LogOut, X, ChevronLeft, ChevronRight, Atom, Shield, Swords, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { logout } from '../../services/firebase';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Trang chủ', icon: Home, path: '/' },
    { name: 'Tạo phòng', icon: Plus, path: '/create-room' },
    { name: 'Ghép phòng', icon: Users, path: '/join' },
    { name: 'Luyện tập', icon: Target, path: '/practice' },
    { name: 'BXH', icon: Trophy, path: '/leaderboard' },
    { name: 'Lịch sử đấu', icon: History, path: '/history' },
    { name: 'Hồ sơ', icon: User, path: '/profile' },
    { name: 'Cài đặt', icon: Settings, path: '/settings' },
    { name: 'Hướng dẫn', icon: HelpCircle, path: '/help' },
    { name: 'Chính sách', icon: Shield, path: '/terms' },
  ];

  const bottomNavItems = [
   
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-950 flex flex-col border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'w-64 lg:w-64'}
        `}
      >
        <div className={`p-6 flex items-center shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between lg:justify-start gap-3'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <span className="font-bold text-xl text-slate-900 dark:text-white">C</span>
            </div>
            {!isCollapsed && <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">CHEM<span className="text-cyan-400">ARENA</span></h1>}
          </div>
          
          <button 
            className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setIsOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 space-y-1 mt-2 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center rounded-lg transition-colors cursor-pointer group
                  ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'}
                  ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-cyan-400 border border-cyan-400/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}
                `}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon size={20} />
                  {isActive && isCollapsed && (
                     <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                  )}
                </div>
                
                {!isCollapsed && (
                  <>
                    <span className="font-medium whitespace-nowrap flex-1">{item.name}</span>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0"></div>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 mt-auto border-t border-slate-200/50 dark:border-slate-700/50 space-y-1 shrink-0 overflow-hidden">
          
          
          {/* Collapse Toggle for Desktop */}
          <button 
            className="hidden lg:flex mt-4 w-full items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
      </div>
    </>
  );
}
