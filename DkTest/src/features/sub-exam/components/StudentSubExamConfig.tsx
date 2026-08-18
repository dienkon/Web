import React from "react";
import { Wand2, Layers, AlertCircle, RotateCcw, HelpCircle, Check } from "lucide-react";
import type { SubExamConfig } from "../types/subExam";
import type { Question, Section } from "../../../types";

interface Props {
  useSubExam: boolean;
  setUseSubExam: (val: boolean) => void;
  config: SubExamConfig | null;
  setConfig: (config: SubExamConfig) => void;
  questions: Question[];
  sections: Section[];
}

export default function StudentSubExamConfig({
  useSubExam,
  setUseSubExam,
  config,
  setConfig,
  questions,
  sections,
}: Props) {
  if (!config) return null;

  const updateConfig = (updates: Partial<SubExamConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const updateSectionSubExam = (sectionId: string, updates: any) => {
    const newSections = [...(config.sections || [])];
    const idx = newSections.findIndex((s) => s.sectionId === sectionId);
    if (idx >= 0) {
      newSections[idx] = { ...newSections[idx], ...updates };
    } else {
      newSections.push({ sectionId, enabled: true, questionCount: -1, ...updates });
    }
    updateConfig({ sections: newSections });
  };

  const singleChoiceTotal = questions.filter((q) => q.type === "single_choice").length;
  const multipleChoiceTotal = questions.filter((q) => q.type === "multiple_choice").length;
  const trueFalseTotal = questions.filter((q) => q.type === "true_false").length;
  const shortAnswerTotal = questions.filter((q) => q.type === "short_answer").length;

  return (
    <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/60 rounded-3xl border-2 border-purple-200 p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-purple-200/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600 text-white rounded-xl shadow-2xs">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-purple-950">
              Cấu hình Đề thi con (Sub-Exam)
            </h3>
            <p className="text-[11px] text-purple-700 font-medium">
              Tùy chỉnh số lượng câu hỏi hoặc bốc thăm ngẫu nhiên phần thi
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={useSubExam}
            onChange={(e) => setUseSubExam(e.target.checked)}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 shadow-2xs"></div>
        </label>
      </div>

      {useSubExam && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Selection Mode */}
          <div className="bg-white/80 border border-purple-100 rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <label className="block text-xs font-bold text-slate-800">
              Phương thức tạo đề con
            </label>
            <select
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={config.selectionMode}
              onChange={(e) => updateConfig({ selectionMode: e.target.value as any })}
            >
              <option value="by_type">Ngẫu nhiên theo loại câu hỏi (Toàn bộ đề)</option>
              {sections.length > 0 && <option value="by_section">Ngẫu nhiên theo từng phần (Section)</option>}
              {sections.length > 0 && <option value="by_section_and_type">Ngẫu nhiên theo Phần & Loại câu hỏi</option>}
            </select>
          </div>

          {/* Section Random Count if exam has sections */}
          {sections.length > 0 && (
            <div className="bg-white border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Số lượng phần (Section) cần bốc thăm ngẫu nhiên
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Đề thi có tổng cộng <strong className="text-purple-700">{sections.length} phần</strong>. Nhập số lượng phần muốn đưa vào đề thi (Ví dụ: nhập <strong>1</strong> thì hệ thống sẽ ngẫu nhiên bốc 1 trong {sections.length} phần).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="-1"
                    max={sections.length}
                    className="w-32 px-3.5 py-2 bg-purple-50/50 border border-purple-300 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                    value={config.randomSectionsCount ?? ""}
                    onChange={(e) =>
                      updateConfig({
                        randomSectionsCount:
                          e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder={`Tất cả (${sections.length})`}
                  />
                  <span className="text-xs font-bold text-slate-600">/ {sections.length} phần</span>
                </div>
              </div>
            </div>
          )}

          {/* Question Count by Type */}
          {config.selectionMode === "by_type" && (
            <div className="bg-white border border-purple-100 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-bold text-slate-900">
                  Số lượng câu hỏi theo loại
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Tổng có: <strong>{questions.length} câu</strong> trong ngân hàng
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Trắc nghiệm 1 đáp án:</span>
                    <span className="text-[11px] font-bold text-slate-500">Có {singleChoiceTotal} câu</span>
                  </div>
                  <input
                    type="number"
                    min="-1"
                    max={singleChoiceTotal}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                    value={config.singleChoiceCount ?? ""}
                    onChange={(e) =>
                      updateConfig({ singleChoiceCount: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })
                    }
                    placeholder={`Tất cả (${singleChoiceTotal})`}
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Nhiều đáp án:</span>
                    <span className="text-[11px] font-bold text-slate-500">Có {multipleChoiceTotal} câu</span>
                  </div>
                  <input
                    type="number"
                    min="-1"
                    max={multipleChoiceTotal}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                    value={config.multipleChoiceCount ?? ""}
                    onChange={(e) =>
                      updateConfig({ multipleChoiceCount: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })
                    }
                    placeholder={`Tất cả (${multipleChoiceTotal})`}
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Đúng / Sai:</span>
                    <span className="text-[11px] font-bold text-slate-500">Có {trueFalseTotal} câu</span>
                  </div>
                  <input
                    type="number"
                    min="-1"
                    max={trueFalseTotal}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                    value={config.trueFalseCount ?? ""}
                    onChange={(e) =>
                      updateConfig({ trueFalseCount: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })
                    }
                    placeholder={`Tất cả (${trueFalseTotal})`}
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Trả lời ngắn:</span>
                    <span className="text-[11px] font-bold text-slate-500">Có {shortAnswerTotal} câu</span>
                  </div>
                  <input
                    type="number"
                    min="-1"
                    max={shortAnswerTotal}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                    value={config.shortAnswerCount ?? ""}
                    onChange={(e) =>
                      updateConfig({ shortAnswerCount: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })
                    }
                    placeholder={`Tất cả (${shortAnswerTotal})`}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Nhập <strong>-1</strong> hoặc để trống để lấy toàn bộ, nhập <strong>0</strong> để bỏ qua loại câu này.
              </p>
            </div>
          )}

          {/* Section details if by_section / by_section_and_type */}
          {(config.selectionMode === "by_section" || config.selectionMode === "by_section_and_type") && sections.length > 0 && (
            <div className="bg-white border border-purple-100 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                Cấu hình số câu theo từng phần
              </h4>
              <div className="space-y-2.5">
                {sections.map((sec, secIdx) => {
                  const secQs = questions.filter((q) => q.sectionId === sec.id);
                  const secConf = config.sections?.find((s) => s.sectionId === sec.id) || {
                    sectionId: sec.id,
                    enabled: true,
                    questionCount: -1,
                  };

                  return (
                    <div
                      key={sec.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold flex items-center justify-center">
                          {secIdx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{sec.title}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Có {secQs.length} câu hỏi trong phần này
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[11px] font-medium text-slate-600">Số câu lấy:</label>
                        <input
                          type="number"
                          min="-1"
                          max={secQs.length}
                          className="w-24 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                          value={secConf.questionCount ?? ""}
                          onChange={(e) =>
                            updateSectionSubExam(sec.id, {
                              questionCount:
                                e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder={`Tất cả (${secQs.length})`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
