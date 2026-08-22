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

    sections.forEach((s) => {
      sectionStats[s.id] = { name: s.title || "Phần chung", correct: 0, incorrect: 0, unanswered: 0 };
    });
    sectionStats["no_section"] = { name: "Phần chung", correct: 0, incorrect: 0, unanswered: 0 };

    questions.forEach((q) => {
      const sId = q.sectionId || "no_section";
      const qType = q.type || "unknown";
      
      if (!typeStats[qType]) {
        let typeName = qType;
        if (qType === "single_choice") typeName = "Trắc nghiệm";
        else if (qType === "multiple_choice") typeName = "Nhiều lựa chọn";
        else if (qType === "true_false") typeName = "Đúng/Sai";
        else if (qType === "short_answer") typeName = "Điền khuyết";
        typeStats[qType] = { name: typeName, correct: 0, incorrect: 0, unanswered: 0 };
      }

      const ans = submission.answers?.[q.id];
      let isCorrect = false;
      let isAnswered = false;

      if (ans !== undefined && ans !== null && ans !== "") {
        isAnswered = true;
        if (Array.isArray(ans) && ans.length === 0) isAnswered = false;
        if (typeof ans === "object" && !Array.isArray(ans) && Object.keys(ans).length === 0) isAnswered = false;
      }

      if (isAnswered) {
        if (q.type === "single_choice") {
          isCorrect = q.correctOptionIds?.includes(ans as string) || false;
        } else if (q.type === "multiple_choice") {
          const correctSet = new Set<string>(q.correctOptionIds || []);
          const ansSet = new Set<string>((ans as string[]) || []);
          isCorrect = correctSet.size > 0 && correctSet.size === ansSet.size && [...correctSet].every((id) => ansSet.has(id));
        } else if (q.type === "short_answer") {
          const accepted = q.acceptedAnswers?.map((a) => a.trim().toLowerCase()) || [];
          isCorrect = accepted.includes(String(ans).trim().toLowerCase());
        } else if (q.type === "true_false") {
          const stmts = q.statements || [];
          if (stmts.length > 0 && typeof ans === "object") {
            let cCount = 0;
            stmts.forEach((s) => {
              if ((ans as any)[s.id] === s.correctAnswer) cCount++;
            });
            isCorrect = cCount === stmts.length;
          }
        }
      }

      if (!isAnswered) {
        unanswered++;
        sectionStats[sId].unanswered++;
        typeStats[qType].unanswered++;
      } else if (isCorrect) {
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

    return { pieData, sectionBarData, typeBarData };
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
    </div>
  );
}
