import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { verifyAdminCredentials, setAdminSession, isAdminAuthenticated } from "../../services/authService";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate("/admin/exams", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }
    setLoading(true);
    setError("");
    
    setTimeout(() => {
      if (verifyAdminCredentials(password)) {
        setAdminSession();
        navigate("/admin/exams", { replace: true });
      } else {
        setError("Mật khẩu không đúng.");
      }
      setLoading(false);
    }, 500); // Simulate brief load
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Về trang chủ"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <Link to="/student/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Học sinh
            </Link>
            <Link to="/parent/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Phụ huynh
            </Link>
            <span className="px-2.5 py-1 bg-white text-blue-700 rounded-lg shadow-2xs">
              Giáo viên
            </span>
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="DKTEST Logo"
              className="w-16 h-16 rounded-2xl object-contain shadow-md border border-slate-100 p-1 bg-white"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Giáo Viên</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Nhập mật khẩu quản trị để vào hệ thống DkTEST</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-semibold text-center">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Đăng nhập Giáo viên"}
          </button>
        </form>
      </div>
    </div>
  );
}
