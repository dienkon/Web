import React from "react";
import { ShieldAlert, LogOut, HelpCircle, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AccountSuspendedViewProps {
  customReason?: string;
}

export default function AccountSuspendedView({ customReason }: AccountSuspendedViewProps) {
  const { userProfile, logout } = useAuth();

  const reason =
    customReason ||
    userProfile?.suspendedReason ||
    (userProfile as any)?.lockReason ||
    "Tài khoản của bạn đã bị tạm khoá bởi Quản trị viên hệ thống.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-red-50/20 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-red-200/80 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-red-100 text-red-700">
            Trạng Thái: Tạm Khoá Tài Khoản
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Tài Khoản Đang Bị Tạm Khoá
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tài khoản của bạn hiện không thể truy cập các tính năng làm bài thi và luyện tập trên hệ thống DkTEST.
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl text-left space-y-1.5">
          <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Lý do tạm khoá từ Quản trị viên:</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-red-950 leading-relaxed break-words">
            "{reason}"
          </p>
        </div>

        <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ trực tiếp với Thầy/Cô phụ trách hoặc Ban quản trị để được hỗ trợ mở khoá.
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <a
            href="mailto:support@dktest.vn"
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Mail className="w-4 h-4 text-slate-500" />
            <span>Hỗ trợ kỹ thuật</span>
          </a>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
