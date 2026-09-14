import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flame,
  Zap,
  Turtle,
  MousePointerClick,
  Info,
} from "lucide-react";
import type { TimeAnalyticsResult, SegmentAnalytics } from "../../utils/attemptAnalytics";

interface QuestionTimeAnalysisChartProps {
  timeAnalytics: TimeAnalyticsResult;
  segments: {
    start: SegmentAnalytics;
    middle: SegmentAnalytics;
    end: SegmentAnalytics;
  };
  onSelectQuestion?: (questionIndex: number) => void;
}

const COLOR_CORRECT = "#10b981"; // Emerald
const COLOR_INCORRECT = "#ef4444"; // Red
const COLOR_UNANSWERED = "#94a3b8"; // Slate

export default function QuestionTimeAnalysisChart({
  timeAnalytics,
  segments,
  onSelectQuestion,
}: QuestionTimeAnalysisChartProps) {
  const {
    hasTimingData,
    evaluations,
    totalTrackedSeconds,
    averageSecondsPerQuestion,
    correctCount,
    incorrectCount,
    unansweredCount,
    fastestQuestion,
    slowestQuestion,
    longestSlowStreak,
  } = timeAnalytics;

  // Format seconds into "Xp Ys" or "Xs"
  const formatTimeStr = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) return `${mins}p ${secs}s`;
    return `${secs}s`;
  };

  // Recharts data array
  const barData = useMemo(() => {
    return evaluations.map((ev) => {
      let statusLabel = "Bỏ trống";
      let barColor = COLOR_UNANSWERED;
      if (ev.status === "correct") {
        statusLabel = "Đúng";
        barColor = COLOR_CORRECT;
      } else if (ev.status === "incorrect") {
        statusLabel = "Sai";
        barColor = COLOR_INCORRECT;
      }

      return {
        index: ev.questionIndex,
        displayIndex: ev.displayIndex,
        label: `Câu ${ev.displayIndex}`,
        seconds: ev.timeSpentSeconds,
        status: ev.status,
        statusLabel,
        barColor,
      };
    });
  }, [evaluations]);

  // Click handler to navigate to question card
  const handleBarClick = (data: any) => {
    const qIndex = data?.index ?? data?.activePayload?.[0]?.payload?.index;
    if (qIndex === undefined) return;

    if (onSelectQuestion) {
      onSelectQuestion(qIndex);
    } else {
      const targetEl = document.getElementById(`q-result-card-${qIndex}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        targetEl.classList.add("ring-2", "ring-blue-500", "transition-all");
        setTimeout(() => targetEl.classList.remove("ring-2", "ring-blue-500"), 2000);
      }
    }
  };

  // Min-width for horizontal scrolling on many questions
  const chartMinWidth = Math.max(640, barData.length * 36);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 print:hidden">
      {/* Title & Legend Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Phân tích thời gian
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Thời gian chi tiết học sinh dành cho từng câu hỏi trong bài làm
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-4 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
            <span>Đúng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block shadow-2xs" />
            <span>Sai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block shadow-2xs" />
            <span>Bỏ trống</span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart */}
      {!hasTimingData ? (
        <div className="p-8 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-2">
          <Info className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700">
            Chưa có dữ liệu thời gian từng câu
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Lượt làm bài này được thực hiện trước khi hệ thống kích hoạt tính năng đo lường thời gian theo từng câu hỏi.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
            <div style={{ minWidth: `${chartMinWidth}px`, height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 15, right: 10, left: -15, bottom: 25 }}
                  onClick={handleBarClick}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    angle={barData.length > 25 ? -45 : 0}
                    textAnchor={barData.length > 25 ? "end" : "middle"}
                    height={barData.length > 25 ? 40 : 25}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    unit="s"
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 z-50 border border-slate-800 pointer-events-none">
                          <p className="font-extrabold text-sm">{item.label}</p>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>{item.seconds} giây ({formatTimeStr(item.seconds)})</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold pt-0.5 border-t border-slate-800">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: item.barColor }}
                            />
                            <span>{item.statusLabel}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="seconds"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    className="cursor-pointer transition-opacity hover:opacity-85"
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.barColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400 font-medium italic">
            <MousePointerClick className="w-3.5 h-3.5 text-slate-400" />
            <span>Bấm vào một cột để mở câu hỏi tương ứng</span>
          </div>
        </div>
      )}

      {/* 3 Summary Big Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card A: TRUNG BÌNH MỖI CÂU */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
            TRUNG BÌNH MỖI CÂU
          </span>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {hasTimingData ? `${averageSecondsPerQuestion}s` : "--"}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            {hasTimingData ? `Trung vị: ${timeAnalytics.medianSecondsPerQuestion}s` : "Chưa có dữ liệu"}
          </span>
        </div>

        {/* Card B: TỔNG THỜI GIAN */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
            TỔNG THỜI GIAN
          </span>
          <p className="text-2xl font-black text-blue-700 tracking-tight">
            {formatTimeStr(totalTrackedSeconds)}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            {Math.round(totalTrackedSeconds / 60)} phút làm bài
          </span>
        </div>

        {/* Card C: ĐÚNG / SAI / BỎ TRỐNG */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
            ĐÚNG / SAI / BỎ TRỐNG
          </span>
          <p className="text-2xl font-black text-slate-900 tracking-tight space-x-1.5">
            <span className="text-emerald-600">{correctCount}</span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-red-600">{incorrectCount}</span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-slate-500">{unansweredCount}</span>
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Tổng cộng: {barData.length} câu
          </span>
        </div>
      </div>

      {/* Additional Behavioral & Segment Insights */}
      {hasTimingData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {/* Segment Accuracy Card */}
          <div className="bg-slate-50/50 border border-slate-200/70 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                Tỷ lệ đúng theo đoạn đề
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">3 giai đoạn</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                <span className="text-[11px] text-slate-400 font-medium block">Đầu bài</span>
                <span className="text-sm font-black text-slate-800 block mt-0.5">
                  {segments.start.accuracy}%
                </span>
                <span className="text-[10px] text-slate-500">{segments.start.averageTimeSeconds}s/câu</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                <span className="text-[11px] text-slate-400 font-medium block">Giữa bài</span>
                <span className="text-sm font-black text-slate-800 block mt-0.5">
                  {segments.middle.accuracy}%
                </span>
                <span className="text-[10px] text-slate-500">{segments.middle.averageTimeSeconds}s/câu</span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60">
                <span className="text-[11px] text-slate-400 font-medium block">Cuối bài</span>
                <span className="text-sm font-black text-slate-800 block mt-0.5">
                  {segments.end.accuracy}%
                </span>
                <span className="text-[10px] text-slate-500">{segments.end.averageTimeSeconds}s/câu</span>
              </div>
            </div>
          </div>

          {/* Longest Slow Streak & Extremes */}
          <div className="bg-slate-50/50 border border-slate-200/70 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Turtle className="w-4 h-4 text-indigo-500" />
                Đặc điểm tốc độ
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Nhận diện</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Fastest */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Nhanh nhất
                </span>
                {fastestQuestion ? (
                  <div>
                    <span className="font-extrabold text-slate-800">
                      Câu {fastestQuestion.displayIndex}
                    </span>{" "}
                    <span className="text-slate-500">({fastestQuestion.timeSpentSeconds}s)</span>
                    <span
                      className={`ml-1 text-[10px] font-bold ${
                        fastestQuestion.status === "correct" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {fastestQuestion.status === "correct" ? "[Đúng]" : "[Sai]"}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">--</span>
                )}
              </div>

              {/* Slowest */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-500" /> Lâu nhất
                </span>
                {slowestQuestion ? (
                  <div>
                    <span className="font-extrabold text-slate-800">
                      Câu {slowestQuestion.displayIndex}
                    </span>{" "}
                    <span className="text-slate-500">({slowestQuestion.timeSpentSeconds}s)</span>
                    <span
                      className={`ml-1 text-[10px] font-bold ${
                        slowestQuestion.status === "correct" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {slowestQuestion.status === "correct" ? "[Đúng]" : "[Sai]"}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">--</span>
                )}
              </div>
            </div>

            {longestSlowStreak && (
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <span>
                  <strong>Chuỗi câu lâu nhất:</strong> {longestSlowStreak.count} câu liên tiếp (Câu{" "}
                  {longestSlowStreak.startNumber} → {longestSlowStreak.endNumber})
                </span>
                <span className="font-bold text-red-600 shrink-0">~{longestSlowStreak.avgTime}s/câu</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
