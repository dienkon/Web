import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto">
          <Search className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Lỗi 404
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 pt-2">
            Không tìm thấy trang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Đường dẫn bạn vừa mở không tồn tại hoặc đã được chuyển sang địa chỉ mới trên hệ thống DkTEST.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            to="/"
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>
      </div>
    </div>
  );
}
