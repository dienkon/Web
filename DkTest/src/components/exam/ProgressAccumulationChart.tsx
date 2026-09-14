import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Target } from "lucide-react";
import type { ProgressAccumulationPoint } from "../../utils/attemptAnalytics";

interface ProgressAccumulationChartProps {
  data: ProgressAccumulationPoint[];
  maxScore?: number;
}

export default function ProgressAccumulationChart({
  data,
  maxScore = 10,
}: ProgressAccumulationChartProps) {
  if (!data || data.length === 0) return null;

  const chartMinWidth = Math.max(600, data.length * 28);

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 print:hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Diễn biến làm bài
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Biểu đồ tích lũy điểm số theo từng câu từ đầu đến cuối đề thi
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-blue-700">
            <span className="w-3 h-1.5 rounded-full bg-blue-600 inline-block" />
            <span>Điểm của bạn</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-1.5 rounded-full bg-slate-300 border border-dashed border-slate-400 inline-block" />
            <span>Điểm tối đa</span>
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
        <div style={{ minWidth: `${chartMinWidth}px`, height: "260px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 15, right: 20, left: -15, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                interval={Math.max(0, Math.floor(data.length / 15))}
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                domain={[0, maxScore]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload as ProgressAccumulationPoint;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800 pointer-events-none">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
                        <span className="font-extrabold text-sm">{item.label}</span>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                            item.status === "correct"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : item.status === "incorrect"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.status === "correct"
                            ? "Đúng (+ điểm)"
                            : item.status === "incorrect"
                            ? "Sai (không tăng)"
                            : "Bỏ trống"}
                        </span>
                      </div>
                      <div className="space-y-0.5 font-medium">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">Điểm của bạn:</span>
                          <strong className="text-blue-400 font-bold">{item.userScore} đ</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">Điểm tối đa đến câu này:</span>
                          <span className="text-slate-300">{item.maxScore} đ</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Max Score reference line */}
              <Line
                type="linear"
                dataKey="maxScore"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                name="Điểm tối đa"
              />
              {/* Actual user score accumulation */}
              <Line
                type="monotone"
                dataKey="userScore"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 2.5, fill: "#2563eb", strokeWidth: 1, stroke: "#fff" }}
                activeDot={{ r: 5, fill: "#1d4ed8", stroke: "#fff", strokeWidth: 2 }}
                name="Điểm của bạn"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
