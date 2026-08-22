import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { User, Loader2, ArrowLeft, Users, ShieldCheck, HeartHandshake, Eye, Sparkles } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";

export default function ParentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/parent/dashboard";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [isLogin, setIsLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    const adminToken = localStorage.getItem("admin_token");
    setIsAdmin(role === "admin" || !!adminToken);

    if (role === "parent") {
      navigate(redirectPath, { replace: true });
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
      const cleanUser = username.trim().toLowerCase();
      const userRef = doc(db, "users", cleanUser);
      const userSnap = await getDoc(userRef);

      if (isLogin) {
        if (!userSnap.exists()) {
          throw new Error("Tài khoản phụ huynh không tồn tại. Nếu bạn chưa có tài khoản, vui lòng chọn 'Đăng ký ngay'.");
        }
        const userData = userSnap.data();
        
        // Log in success (coexisting sessions)
        localStorage.setItem("parent_info", JSON.stringify({
          username: cleanUser,
          displayName: userData.displayName || cleanUser,
          role: "parent",
          phone: userData.phone || "",
        }));
        localStorage.setItem("auth_role", "parent");
        navigate(redirectPath, { replace: true });
      } else {
        if (userSnap.exists()) {
          throw new Error("Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác hoặc đăng nhập.");
        }
        
        // Register success (coexisting sessions)
        await setDoc(userRef, {
          username: cleanUser,
          displayName: displayName.trim(),
          phone: phone.trim(),
          role: "parent",
          createdAt: new Date().toISOString()
        });

        localStorage.setItem("parent_info", JSON.stringify({
          username: cleanUser,
          displayName: displayName.trim(),
          role: "parent",
          phone: phone.trim(),
        }));
        localStorage.setItem("auth_role", "parent");
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
            <Link to="/student/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
              Học sinh
            </Link>
            <span className="px-2.5 py-1 bg-white text-indigo-700 rounded-lg shadow-2xs">
              Phụ huynh
            </span>
            {isAdmin && (
              <Link to="/admin/login" className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors">
                Giáo viên
              </Link>
            )}
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cổng Phụ Huynh</h1>
          <p className="text-xs text-slate-500 font-medium">
            {isLogin
              ? "Đăng nhập để đồng hành và theo dõi tiến độ học tập của con"
              : "Đăng ký tài khoản phụ huynh để tạo đề & giám sát bài thi"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tên đăng nhập <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="VD: phuhuynh_nam..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Họ và tên Phụ huynh <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Số điện thoại liên hệ (tùy chọn)
                </label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0912..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? "Đăng nhập Phụ huynh" : "Đăng ký tài khoản")}
          </button>
          
          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer"
            >
              {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
