import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginAnonymously } from '../services/firebase';
import { FlaskConical } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain') {
        setError('Tên miền này chưa được cấp phép trong Firebase. Vui lòng thêm domain vào phần Authorized domains trong Firebase Console.');
      } else {
        setError('Đăng nhập thất bại: ' + err.message);
      }
    }
  };

  const handleGuestLogin = async () => {
    try {
      setError(null);
      await loginAnonymously();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Đăng nhập với tư cách khách thất bại: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-2xl p-8 border border-slate-200/50 dark:border-slate-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
            <FlaskConical className="text-slate-900 dark:text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center">ChemDex Arena</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mt-2">Đăng nhập bằng tài khoản ChemDex hiện có</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Tiếp tục với Google
        </button>

        <div className="mt-8 text-center text-sm text-slate-500">
          Chơi thử ở chế độ <button onClick={handleGuestLogin} className="text-cyan-400 hover:underline cursor-pointer font-bold">Khách (Luyện tập)</button>
        </div>
      </div>
    </div>
  );
}
