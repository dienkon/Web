import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, GraduationCap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';

export default function Layout() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 text-slate-900" />
            <span className="font-bold text-lg hidden sm:inline-block">QuizMaster</span>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium">
              Welcome, {user?.displayName}
            </div>
            {user?.role === 'admin' && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-slate-600">
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
