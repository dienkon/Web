import React, { useState } from "react";
import { useExamEditorContext } from "../../exam-builder/context/ExamEditorContext";
import { Wand2, Layers, AlertTriangle, RefreshCw, X } from "lucide-react";
import type { SubExamConfig } from "../types/subExam";
import { buildSubExamAttempt } from "../engine/buildSubExamAttempt";
import type { Question } from "../../../types";

export default function SubExamSettings() {
  const { state, actions } = useExamEditorContext();
  const [sampleQuestions, setSampleQuestions] = useState<Question[] | null>(null);

  const config: SubExamConfig = state.examMeta.subExamConfig || {
    enabled: false,
    selectionMode: "by_type",
  };

  const handleToggle = (checked: boolean) => {
    actions.setExamMeta({
      allowSubExam: checked,
      subExamConfig: { ...config, enabled: checked }
    });
  };

  const updateConfig = (updates: Partial<SubExamConfig>) => {
    actions.setExamMeta({
      subExamConfig: { ...config, ...updates }
    });
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

  const generateSample = () => {
    const attempt = buildSubExamAttempt(state.examMeta, state.questions, state.sections, config);
    setSampleQuestions(attempt.questions);
  };

  if (!state.examMeta.allowSubExam && !config.enabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-600" />
            Tạo mã đề ngẫu nhiên (Sub-Exam)
          </h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={false} onChange={(e) => handleToggle(e.target.checked)} />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
        <p className="text-xs text-slate-500">Bật tính năng này để hệ thống tự động trích xuất ngẫu nhiên một số lượng câu hỏi nhất định từ ngân hàng câu hỏi gốc cho mỗi thí sinh.</p>
      </div>
    );
  }

  // Calculate available stats
  const qPool = state.questions;
  const singleChoiceTotal = qPool.filter(q => q.type === "single_choice").length;
  const multipleChoiceTotal = qPool.filter(q => q.type === "multiple_choice").length;
  const trueFalseTotal = qPool.filter(q => q.type === "true_false").length;
  const shortAnswerTotal = qPool.filter(q => q.type === "short_answer").length;

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-100 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" />
          Tạo mã đề ngẫu nhiên (Sub-Exam)
        </h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={true} onChange={(e) => handleToggle(e.target.checked)} />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Cách tạo đề con</label>
          <select
            className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={config.selectionMode}
            onChange={(e) => updateConfig({ selectionMode: e.target.value as any })}
          >
            <option value="by_type">Ngẫu nhiên theo loại câu hỏi (Toàn đề)</option>
            {state.sections.length > 0 && <option value="by_section">Ngẫu nhiên theo từng phần</option>}
            {state.sections.length > 0 && <option value="by_section_and_type">Ngẫu nhiên theo phần & loại câu hỏi</option>}
          </select>
        </div>

        {config.selectionMode === "by_type" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">Cấu hình số lượng</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Trắc nghiệm 1 đáp án (Có: {singleChoiceTotal})</label>
                <input type="number" min="-1" className="w-full px-3 py-2 border rounded-lg text-xs" value={config.singleChoiceCount ?? ""} onChange={e => updateConfig({ singleChoiceCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả, 0: Bỏ qua" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Trắc nghiệm nhiều đáp án (Có: {multipleChoiceTotal})</label>
                <input type="number" min="-1" className="w-full px-3 py-2 border rounded-lg text-xs" value={config.multipleChoiceCount ?? ""} onChange={e => updateConfig({ multipleChoiceCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả, 0: Bỏ qua" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Đúng/Sai (Có: {trueFalseTotal})</label>
                <input type="number" min="-1" className="w-full px-3 py-2 border rounded-lg text-xs" value={config.trueFalseCount ?? ""} onChange={e => updateConfig({ trueFalseCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả, 0: Bỏ qua" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Trả lời ngắn (Có: {shortAnswerTotal})</label>
                <input type="number" min="-1" className="w-full px-3 py-2 border rounded-lg text-xs" value={config.shortAnswerCount ?? ""} onChange={e => updateConfig({ shortAnswerCount: parseInt(e.target.value) || 0 })} placeholder="-1: Tất cả, 0: Bỏ qua" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">* Nhập -1 để lấy toàn bộ câu của loại đó, 0 để không lấy, hoặc N &gt; 0 để lấy tối đa N câu ngẫu nhiên.</p>
          </div>
        )}

        {(config.selectionMode === "by_section" || config.selectionMode === "by_section_and_type") && state.sections.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <label className="block text-xs font-bold text-slate-800">Chọn ngẫu nhiên phần (Section)</label>
                <span className="text-[11px] text-slate-500">
                  Bốc thăm ngẫu nhiên X phần trong tổng số {state.sections.length} phần của đề
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="-1"
                  max={state.sections.length}
                  className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 font-semibold"
                  value={config.randomSectionsCount ?? ""}
                  onChange={(e) =>
                    updateConfig({
                      randomSectionsCount: e.target.value === "" ? undefined : parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="-1: Tất cả"
                />
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">/ {state.sections.length} phần</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-slate-700">Cấu hình chi tiết từng phần</h4>
              {state.sections.map((sec) => {
                const secQs = state.questions.filter((q) => q.sectionId === sec.id);
                const secConfig = config.sections?.find((s) => s.sectionId === sec.id) || {
                  sectionId: sec.id,
                  enabled: true,
                  questionCount: -1,
                };

                return (
                  <div key={sec.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{sec.title}</h5>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={secConfig.enabled}
                          onChange={(e) => updateSectionSubExam(sec.id, { enabled: e.target.checked })}
                        />
                        <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {secConfig.enabled && config.selectionMode === "by_section" && (
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1 font-medium">
                          Lấy ngẫu nhiên N câu (Hiện có: {secQs.length} câu)
                        </label>
                        <input
                          type="number"
                          min="-1"
                          max={secQs.length}
                          className="w-full sm:w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                          value={secConfig.questionCount ?? ""}
                          onChange={(e) =>
                            updateSectionSubExam(sec.id, { questionCount: parseInt(e.target.value) || 0 })
                          }
                          placeholder="-1: Tất cả, 0: Bỏ qua"
                        />
                      </div>
                    )}

                    {secConfig.enabled && config.selectionMode === "by_section_and_type" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">
                            1 đáp án ({secQs.filter((q) => q.type === "single_choice").length})
                          </label>
                          <input
                            type="number"
                            min="-1"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                            value={secConfig.singleChoiceCount ?? ""}
                            onChange={(e) =>
                              updateSectionSubExam(sec.id, { singleChoiceCount: parseInt(e.target.value) || 0 })
                            }
                            placeholder="-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">
                            Nhiều đáp án ({secQs.filter((q) => q.type === "multiple_choice").length})
                          </label>
                          <input
                            type="number"
                            min="-1"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                            value={secConfig.multipleChoiceCount ?? ""}
                            onChange={(e) =>
                              updateSectionSubExam(sec.id, { multipleChoiceCount: parseInt(e.target.value) || 0 })
                            }
                            placeholder="-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">
                            Đúng/Sai ({secQs.filter((q) => q.type === "true_false").length})
                          </label>
                          <input
                            type="number"
                            min="-1"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                            value={secConfig.trueFalseCount ?? ""}
                            onChange={(e) =>
                              updateSectionSubExam(sec.id, { trueFalseCount: parseInt(e.target.value) || 0 })
                            }
                            placeholder="-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-600 mb-1">
                            Trả lời ngắn ({secQs.filter((q) => q.type === "short_answer").length})
                          </label>
                          <input
                            type="number"
                            min="-1"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                            value={secConfig.shortAnswerCount ?? ""}
                            onChange={(e) =>
                              updateSectionSubExam(sec.id, { shortAnswerCount: parseInt(e.target.value) || 0 })
                            }
                            placeholder="-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={generateSample}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Tạo thử một đề (Preview)
          </button>
        </div>

        {sampleQuestions && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">Bản xem trước ({sampleQuestions.length} câu)</h4>
              <button onClick={() => setSampleQuestions(null)} className="p-1 hover:bg-slate-200 rounded-md text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {sampleQuestions.map((q, idx) => (
                <div key={`${q.id}-${idx}`} className="p-3 bg-white border border-slate-100 rounded-lg shadow-xs text-xs flex gap-3">
                  <span className="font-bold text-slate-400">#{idx + 1}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700 mr-2">[{q.type.replace('_', ' ')}]</span>
                    <span className="text-slate-600 line-clamp-1" dangerouslySetInnerHTML={{ __html: q.text }}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}