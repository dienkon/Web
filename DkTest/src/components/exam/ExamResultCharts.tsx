import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Question, Section, Submission } from "../../types";
import { evaluateQuestionAnswer } from "../../utils/attemptAnalytics";
import {
  COGNITIVE_LEVEL_META,
  computeCognitiveLevelPerformance,
} from "../../utils/cognitiveLevelUtils";

interface ExamResultChartsProps {
  submission: Submission;
  questions: Question[];
  sections: Section[];
}

const COLORS = ["#10b981", "#ef4444", "#94a3b8"]; // Correct, Incorrect, Unanswered

export default function ExamResultCharts({ submission, questions, sections }: ExamResultChartsProps) {
  const chartData = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const sectionStats: Record<string, { name: string; correct: number; incorrect: number; unanswered: number }> = {};
    const typeStats: Record<string, { name: string; correct: number; incorrect: number; unanswered: number }> = {};

    (sections || []).forEach((s) => {
      sectionStats[s.id] = { name: s.title || "Phần chung", correct: 0, incorrect: 0, unanswered: 0 };
    });
    sectionStats["no_section"] = { name: "Phần chung", correct: 0, incorrect: 0, unanswered: 0 };

    const pointPerQuestion = questions.length > 0 ? (submission?.maxScore || 10) / questions.length : 1;

    (questions || []).forEach((q) => {
      const sId = q.sectionId || "no_section";
      const qType = q.type || "unknown";

      if (!sectionStats[sId]) {
        sectionStats[sId] = { name: "Phần thi", correct: 0, incorrect: 0, unanswered: 0 };
      }

      if (!typeStats[qType]) {
        let typeName = qType;
        if (qType === "single_choice") typeName = "Trắc nghiệm";
        else if (qType === "multiple_choice") typeName = "Nhiều lựa chọn";
        else if (qType === "true_false") typeName = "Đúng/Sai";
        else if (qType === "short_answer") typeName = "Điền ngắn";
        else if (qType === "fill_blank") typeName = "Điền khuyết";
        else if (qType === "ordering") typeName = "Sắp xếp";
        else if (qType === "matching") typeName = "Nối bảng";
        typeStats[qType] = { name: typeName, correct: 0, incorrect: 0, unanswered: 0 };
      }

      const ans = submission?.answers?.[q.id];
      const evalResult = evaluateQuestionAnswer(q, ans, pointPerQuestion);

      if (evalResult.status === "unanswered") {
        unanswered++;
        sectionStats[sId].unanswered++;
        typeStats[qType].unanswered++;
      } else if (evalResult.isCorrect) {
        correct++;
        sectionStats[sId].correct++;
        typeStats[qType].correct++;
      } else {
        incorrect++;
        sectionStats[sId].incorrect++;
        typeStats[qType].incorrect++;
      }
    });

    const pieData = [
      { name: "Đúng", value: correct },
      { name: "Sai", value: incorrect },
      { name: "Bỏ trống", value: unanswered },
    ].filter((d) => d.value > 0);

    const sectionBarData = Object.values(sectionStats).filter((s) => s.correct + s.incorrect + s.unanswered > 0);
    const typeBarData = Object.values(typeStats).filter((s) => s.correct + s.incorrect + s.unanswered > 0);
    const levelPerformance = computeCognitiveLevelPerformance(questions, submission).filter(
      (r) => r.total > 0
    );

    return { pieData, sectionBarData, typeBarData, levelPerformance };
  }, [submission, questions, sections]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
      {/* Overall Pie Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">Tỉ lệ trả lời</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.pieData.map((entry, index) => {
                   let color = COLORS[2];
                   if (entry.name === "Đúng") color = COLORS[0];
                   if (entry.name === "Sai") color = COLORS[1];
                   return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section/Topic Bar Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">Kết quả theo phần</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.sectionBarData}
              margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="correct" name="Đúng" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar dataKey="incorrect" name="Sai" stackId="a" fill="#ef4444" />
              <Bar dataKey="unanswered" name="Bỏ trống" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cognitive Level Analysis (NB / TH / VD / VDC) */}
      {chartData.levelPerformance.length > 0 && (
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Phân tích năng lực theo Mức độ nhận thức (NB / TH / VD / VDC)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá mức độ nắm vững kiến thức từ nền tảng (Nhận biết) đến phân hóa cao (Vận dụng cao).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {chartData.levelPerformance.map((row) => {
              const meta = COGNITIVE_LEVEL_META[row.level];
              return (
                <div
                  key={row.level}
                  className={`p-3.5 rounded-2xl border ${meta.badgeClass} space-y-2`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black">
                      {meta.shortLabel} • {row.label}
                    </span>
                    <span className="text-xs font-black">{row.accuracyPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/80 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${row.accuracyPct}%`, backgroundColor: meta.barColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold opacity-90">
                    <span>Đúng: {row.correct}/{row.total}</span>
                    <span>Sai: {row.incorrect}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.levelPerformance.map((r) => ({
                  name: `${r.level} (${r.label})`,
                  correct: r.correct,
                  incorrect: r.incorrect,
                  unanswered: r.unanswered,
                }))}
                margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "#f1f5f9" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="circle" />
                <Bar dataKey="correct" name="Đúng" stackId="lv" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="incorrect" name="Sai" stackId="lv" fill="#ef4444" />
                <Bar dataKey="unanswered" name="Bỏ trống" stackId="lv" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
