import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("auth_role");
    if (role === "student") {
      navigate("/", { replace: true });
    } else if (role === "admin") {
      navigate("/admin/exams", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || (!isLogin && !displayName) || !password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", username.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (isLogin) {
        if (!userSnap.exists()) {
          throw new Error("Tài khoản không tồn tại");
        }
        const userData = userSnap.data();
        if (userData.password !== password) {
          throw new Error("Mật khẩu không đúng");
        }
        
        // Log in success
        localStorage.setItem("auth_role", "student");
        localStorage.setItem("student_info", JSON.stringify({
          username: username.toLowerCase(),
          displayName: userData.displayName
        }));
        navigate("/", { replace: true });
      } else {
        if (userSnap.exists()) {
          throw new Error("Username này đã được sử dụng. Vui lòng chọn username khác.");
        }
        
        // Register success
        await setDoc(userRef, {
          username: username.toLowerCase(),
          displayName,
          password,
          role: "student",
          createdAt: new Date().toISOString()
        });

        localStorage.setItem("auth_role", "student");
        localStorage.setItem("student_info", JSON.stringify({
          username: username.toLowerCase(),
          displayName
        }));
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <User className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Học sinh</h1>
          <p className="text-slate-500 mt-2">{isLogin ? "Đăng nhập để tiếp tục" : "Đăng ký tài khoản học sinh"}</p>
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
          <div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mật khẩu..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
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
