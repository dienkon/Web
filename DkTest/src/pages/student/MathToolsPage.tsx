import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Compass, Sparkles, ChevronRight, Home, BookOpen } from "lucide-react";
import MathGraphingStudio from "../../practice/components/MathGraphingStudio";
import CasioCalculator from "../../components/exam/CasioCalculator";

export default function MathToolsPage() {
  const navigate = useNavigate();
  const [showCasio, setShowCasio] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-sm shadow-xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 flex-wrap" aria-label="Breadcrumb">
            <Link
              to="/"
              className="flex items-center gap-1.5 hover:text-white transition-colors text-slate-400 font-medium"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <Link
              to="/practice"
              className="flex items-center gap-1.5 hover:text-white transition-colors text-slate-400 font-medium"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Góc luyện tập</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-400 font-bold flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-1 rounded-lg">
              <Compass className="w-3.5 h-3.5" />
              Phòng Thí Nghiệm Toán Học
            </span>
          </nav>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCasio(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Mở máy tính Casio fx-580VN X trực tiếp bên cạnh phòng đồ thị"
            >
              <Calculator className="w-4 h-4" />
              <span>Máy tính Casio fx-580</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Quay lại trang trước"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>

        {/* Dedicated Graphing & Geometry Studio Component */}
        <div className="rounded-3xl overflow-hidden shadow-2xl">
          <MathGraphingStudio />
        </div>
      </div>

      {/* Floating Casio fx-580VN X Emulator Modal */}
      <CasioCalculator
        isOpen={showCasio}
        onClose={() => setShowCasio(false)}
      />
    </div>
  );
}
