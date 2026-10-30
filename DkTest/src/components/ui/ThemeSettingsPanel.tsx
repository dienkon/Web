import React from "react";
import { Sun, Moon, Monitor, Check, Sparkles, Layers, Sliders, Shield } from "lucide-react";
import { useTheme, type ThemeMode, type DarkIntensity, DARK_INTENSITIES } from "../../context/ThemeContext";

interface ThemeSettingsPanelProps {
  className?: string;
  compact?: boolean;
}

export default function ThemeSettingsPanel({ className = "", compact = false }: ThemeSettingsPanelProps) {
  const { theme, resolvedTheme, darkIntensity, setTheme, setDarkIntensity } = useTheme();

  const themeModes: { id: ThemeMode; label: string; desc: string; icon: typeof Sun }[] = [
    {
      id: "light",
      label: "Giao diện Sáng",
      desc: "Nền trắng ngà thanh thoát, độ tương phản sắc nét ban ngày",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Giao diện Tối",
      desc: "Giảm chói mắt ban đêm, tăng sự tập trung khi học & thi",
      icon: Moon,
    },
    {
      id: "system",
      label: "Theo Hệ Thống",
      desc: "Tự động đổi sáng/tối theo cài đặt thiết bị của bạn",
      icon: Monitor,
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Theme Mode Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Chế độ hiển thị
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chọn chủ đề màu sắc cơ bản cho toàn bộ không gian làm việc
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800">
            {theme === "system" ? "Tự động" : theme === "dark" ? "Chế độ Tối" : "Chế độ Sáng"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeModes.map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center animate-in zoom-in-75">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Dark Theme Intensity Customizer */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Cường độ đậm nhạt của Chế độ Tối (Dark Theme Intensity)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tùy chỉnh sắc thái màu nền tối để phù hợp nhất với mắt và màn hình của bạn
            </p>
          </div>
          {resolvedTheme !== "dark" && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 px-2 py-0.5 rounded-md self-start sm:self-auto">
              Sẽ áp dụng khi bật Chế độ Tối
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DARK_INTENSITIES.map((opt) => {
            const isSelected = darkIntensity === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDarkIntensity(opt.id)}
                className={`relative flex flex-col p-3.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/30 shadow-md scale-[1.01]"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs"
                }`}
              >
                {/* Visual Swatch Preview Box */}
                <div
                  className="w-full h-16 rounded-xl border p-2 flex flex-col justify-between mb-3 shadow-inner relative overflow-hidden"
                  style={{
                    backgroundColor: opt.previewBg,
                    borderColor: opt.previewBorder,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                      style={{
                        backgroundColor: opt.previewCard,
                        color: "#ffffff",
                        borderColor: opt.previewBorder,
                        borderWidth: "1px",
                      }}
                    >
                      {opt.previewBg}
                    </span>
                    {opt.tag && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/90 text-white shadow-xs">
                        {opt.tag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 rounded-full flex-1"
                      style={{ backgroundColor: opt.previewCard }}
                    />
                    <div
                      className="w-4 h-2 rounded-full"
                      style={{ backgroundColor: "#3b82f6" }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isSelected
                        ? "text-white"
                        : "text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center animate-in zoom-in-50">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div
                  className={`text-[10px] font-medium mt-0.5 ${
                    isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {opt.name}
                </div>

                <p
                  className={`text-[11px] mt-1.5 leading-relaxed line-clamp-2 ${
                    isSelected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live System Preview Demonstration Card */}
      {!compact && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Xem trước giao diện thời gian thực (Live Preview)
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Đang áp dụng: <b className="text-blue-600 dark:text-blue-400">{resolvedTheme === "dark" ? `Tối (${darkIntensity})` : "Sáng"}</b>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20">
                DK
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  DkTEST - Hệ Thống Thi Trực Tuyến
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chuyển màu mượt mà (Smooth Animation 280ms) không giật khựng màn hình.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setDarkIntensity("chrome")}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                title="Khôi phục chuẩn Chrome mặc định"
              >
                Đặt lại Chrome
              </button>
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="px-3 py-1 text-[11px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {resolvedTheme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                Đổi Sáng/Tối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
