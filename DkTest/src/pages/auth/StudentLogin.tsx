import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Loader2, ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (role === "student") {
      navigate(redirectPath, { replace: true });
    } else if (role === "admin") {
      navigate(redirectPath !== "/" ? redirectPath : "/admin/exams", { replace: true });
    }
  }, [navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || (!isLogin && !displayName.trim())) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", username.trim().toLowerCase());
      const userSnap = await getDoc(userRef);

      if (isLogin) {
        if (!userSnap.exists()) {
          throw new Error("Tài khoản không tồn tại. Nếu bạn chưa có tài khoản, vui lòng chọn 'Đăng ký ngay'.");
        }
        const userData = userSnap.data();
        
        // Log in success
        localStorage.setItem("auth_role", "student");
        localStorage.setItem("student_info", JSON.stringify({
          username: username.trim().toLowerCase(),
          displayName: userData.displayName || username.trim()
        }));
        navigate(redirectPath, { replace: true });
      } else {
        if (userSnap.exists()) {
          throw new Error("Username này đã được sử dụng. Vui lòng chọn username khác hoặc đăng nhập.");
        }
        
        // Register success
        await setDoc(userRef, {
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          role: "student",
          createdAt: new Date().toISOString()
        });

        localStorage.setItem("auth_role", "student");
        localStorage.setItem("student_info", JSON.stringify({
          username: username.trim().toLowerCase(),
          displayName: displayName.trim()
        }));
        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
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
            <span className="px-2.5 py-1 bg-white text-emerald-700 rounded-lg shadow-2xs">
              Học sinh
            </span>
            <Link to="/parent/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Phụ huynh
            </Link>
            <Link to="/admin/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Giáo viên
            </Link>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Thí Sinh</h1>
          <p className="text-xs text-slate-500 font-medium">{isLogin ? "Đăng nhập để vào phòng thi và lưu lịch sử" : "Đăng ký tài khoản học sinh mới"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="Username (viết liền không dấu)..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {!isLogin && (
            <div>
              <input 
                type="text" 
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Họ và tên..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Đăng nhập" : "Đăng ký")}
          </button>
          
          <div className="text-center mt-4">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-green-600"
            >
              {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
