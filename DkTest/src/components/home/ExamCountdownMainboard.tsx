import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  ArrowRight,
  Compass,
  Award,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

const EXAM_TARGETS = {
  thptqg: {
    id: "thptqg",
    name: "Kỳ thi Tốt nghiệp THPT Quốc Gia",
    shortName: "THPTQG 2027",
    dateStr: "11/06/2027",
    targetDate: new Date("2027-06-11T07:30:00+07:00"),
    badge: "Kỳ thi Trọng điểm Toàn quốc",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    description:
      "Mục tiêu lớn nhất của đời học sinh. Kiên trì từng ngày, nắm chắc kiến thức cốt lõi để tự tin bước vào cánh cổng đại học mơ ước!",
    highlights: [
      "Nguyện vọng xét tuyển đại học",
      "Bài thi chuẩn kiến thức phổ thông",
      "Ôn luyện bám sát cấu trúc đề minh họa",
    ],
  },
  vact: {
    id: "vact",
    name: "Kỳ thi Đánh Giá Năng Lực (ĐHQG TP.HCM)",
    shortName: "ĐGNL V-ACT 2027",
    dateStr: "05/04/2027",
    targetDate: new Date("2027-04-05T07:30:00+07:00"),
    badge: "ĐHQG-HCM Aptitude Test",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    description:
      "Tư duy logic, suy luận khoa học và giải quyết vấn đề thực tiễn. Tấm vé vàng xét tuyển sớm vào các trường đại học hàng đầu!",
    highlights: [
      "120 câu hỏi trắc nghiệm / 150 phút",
      "Sử dụng ngôn ngữ & Toán tư duy",
      "Giải quyết vấn đề Khoa học Tự nhiên & Xã hội",
    ],
  },
};

export default function ExamCountdownMainboard() {
  const [activeTab, setActiveTab] = useState<"thptqg" | "vact">("thptqg");
  const [timeLeft, setTimeLeft] = useState<CountdownData>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
  });

  const currentExam = EXAM_TARGETS[activeTab];

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date().getTime();
      const target = currentExam.targetDate.getTime();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeTab, currentExam.targetDate]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none text-slate-800 dark:text-white p-6 sm:p-8 backdrop-blur-sm">
      {/* Background Subtle Gradient & Light Ambient Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-100/50 dark:bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 rounded-full bg-indigo-100/40 dark:bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Header with Switcher Tabs */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
              Bảng Đếm Ngược Mục Tiêu Thi Cử
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Đếm Ngược Ngày Thi Quan Trọng</span>
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-inner self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("thptqg")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "thptqg"
                ? "bg-white text-blue-700 dark:bg-blue-600 dark:text-white shadow-md shadow-slate-300/40 dark:shadow-blue-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-white" />
            <span>THPTQG (11/06/2027)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vact")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "vact"
                ? "bg-white text-emerald-700 dark:bg-emerald-600 dark:text-white shadow-md shadow-slate-300/40 dark:shadow-emerald-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            <Target className="w-4 h-4 text-emerald-600 dark:text-white" />
            <span>ĐGNL V-ACT (05/04/2027)</span>
          </button>
        </div>
      </div>

      {/* Main Countdown Display Grid */}
      <div className="relative z-10 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Information & Motivations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border ${currentExam.badgeColor}`}
            >
              {currentExam.badge}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày thi: <strong className="text-slate-900 dark:text-white">{currentExam.dateStr}</strong>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
            {currentExam.name}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {currentExam.description}
          </p>

          <div className="space-y-2 pt-1">
            {currentExam.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <a
              href="#exams-catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Vào luyện đề ngay</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <Link
              to="/journey"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
            >
              <Award className="w-4 h-4 text-amber-500" />
              <span>Chinh phục Hành trình</span>
            </Link>
          </div>
        </div>

        {/* Right Digital Flip Counters (7 cols) - Clean Bright Cards */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {/* Days Card */}
            <div className="flex flex-col items-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-3 sm:p-5 shadow-md shadow-slate-100 dark:shadow-none relative overflow-hidden group hover:border-blue-400 hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <span className="font-mono text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {timeLeft.days.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                Ngày
              </span>
            </div>

            {/* Hours Card */}
            <div className="flex flex-col items-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-3 sm:p-5 shadow-md shadow-slate-100 dark:shadow-none relative overflow-hidden group hover:border-indigo-400 hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <span className="font-mono text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {timeLeft.hours.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                Giờ
              </span>
            </div>

            {/* Minutes Card */}
            <div className="flex flex-col items-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-3 sm:p-5 shadow-md shadow-slate-100 dark:shadow-none relative overflow-hidden group hover:border-teal-400 hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <span className="font-mono text-2xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                {timeLeft.minutes.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                Phút
              </span>
            </div>

            {/* Seconds Card */}
            <div className="flex flex-col items-center bg-gradient-to-b from-white to-amber-50/30 dark:from-slate-800 dark:to-slate-800/80 border border-amber-200/80 dark:border-slate-700 rounded-2xl p-3 sm:p-5 shadow-md shadow-amber-100/50 dark:shadow-none relative overflow-hidden group hover:border-amber-400 hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
              <span className="font-mono text-2xl sm:text-5xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {timeLeft.seconds.toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-slate-400 mt-1">
                Giây
              </span>
            </div>
          </div>

          {/* Quick Motivational Ribbon */}
          <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate italic font-medium">
                "Thành công là tổng của những nỗ lực nhỏ được lặp đi lặp lại mỗi ngày."
              </span>
            </div>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
              {timeLeft.days > 0 ? `Còn ${timeLeft.days} ngày` : "Đã đến ngày thi!"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
