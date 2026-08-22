import { useState, useEffect } from "react";
import { Plus, GripVertical, Edit2, Trash2, ChevronDown, ChevronRight, Check, Download, Upload } from "lucide-react";
import { getExam, updateExam } from "../../services/examService";
import { getExamSections, createSection, updateSection, deleteSection, updateSectionOrders } from "../../services/sectionService";
import { getQuestionsBySection, createQuestion, updateQuestion, deleteQuestion, updateQuestionOrders } from "../../services/questionService";
import type { Section, Question, QuestionType, Exam } from "../../types";
import QuestionEditor from "./QuestionEditor";
import { exportJson } from "../../utils/json/exportExamJson";
import { FullExportSchemaV3, ExportV3 } from "../../utils/json/schema";
import JsonImportModal from "./JsonImportModal";
import { importJsonToFirestore } from "../../services/jsonImportService";
import ConfirmModal from "../ui/ConfirmModal";

export default function ExamStructureEditor({ examId }: { examId: string }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // Draft new section
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Editor states
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  // Deletion modals state
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<{ sectionId: string; questionId: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSection(examId, sectionToDelete.id);
      setSections((prev) => prev.filter((s) => s.id !== sectionToDelete.id));
      setQuestions((prev) => {
        const updated = { ...prev };
        delete updated[sectionToDelete.id];
        return updated;
      });
      setSectionToDelete(null);
    } catch (e) {
      console.error("Error deleting section:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteQuestion(examId, questionToDelete.questionId);
      setQuestions((prev) => ({
        ...prev,
        [questionToDelete.sectionId]: (prev[questionToDelete.sectionId] || []).filter(
          (oldQ) => oldQ.id !== questionToDelete.questionId
        ),
      }));
      setQuestionToDelete(null);
    } catch (e) {
      console.error("Error deleting question:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadStructure();
  }, [examId]);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const [examData, secs] = await Promise.all([
        getExam(examId),
        getExamSections(examId)
      ]);
      setExam(examData);
      setSections(secs);
      
      // Expand first section by default
      if (secs.length > 0) {
        setExpandedSections({ [secs[0].id]: true });
        loadQuestionsForSection(secs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForSection = async (sectionId: string) => {
    try {
      const qs = await getQuestionsBySection(examId, sectionId);
      setQuestions(prev => ({ ...prev, [sectionId]: qs }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const isExpanded = !prev[sectionId];
      if (isExpanded && !questions[sectionId]) {
        loadQuestionsForSection(sectionId);
      }
      return { ...prev, [sectionId]: isExpanded };
    });
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      const sec = await createSection(examId, {
        examId,
        title: newSectionTitle,
        order: sections.length,
        questionCount: 0,
        enabled: true,
      });
      setSections([...sections, sec]);
      setIsAddingSection(false);
      setNewSectionTitle("");
      setExpandedSections(prev => ({ ...prev, [sec.id]: true }));
      setQuestions(prev => ({ ...prev, [sec.id]: [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportExam = async () => {
    if (!exam) return;
    // We need all questions, if they are not loaded, load them
    const allQs: Question[] = [];
    for (const sec of sections) {
      if (questions[sec.id]) {
        allQs.push(...questions[sec.id]);
      } else {
        const qs = await getQuestionsBySection(examId, sec.id);
        allQs.push(...qs);
        setQuestions(prev => ({ ...prev, [sec.id]: qs }));
      }
    }

    const payload: ExportV3 = {
      version: 3,
      source: "DkTEST",
      exportedAt: new Date().toISOString(),
      exportType: "exam",
      exam: {
        title: exam.title,
        timeLimit: exam.timeLimit,
        shuffleQuestions: exam.shuffleQuestions,
        showResults: exam.showResults,
        description: exam.description
      },
      sections: sections.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        order: s.order
      })),
      questions: allQs as any
    };

    exportJson(payload, `${exam.code || 'EXAM'}`);
  };

  const handleExportSelected = () => {
    if (selectedQuestions.length === 0) return;
    
    const qsToExport: Question[] = [];
    for (const sec of sections) {
        if (questions[sec.id]) {
            qsToExport.push(...questions[sec.id].filter(q => selectedQuestions.includes(q.id)));
        }
    }

    const payload: ExportV3 = {
      version: 3,
      source: "DkTEST",
      exportedAt: new Date().toISOString(),
      exportType: "question_bank",
      questions: qsToExport as any
    };

    exportJson(payload, `Selected_Questions_${selectedQuestions.length}`);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]
    );
  };

  const handleImportQuestionBank = async (data: ExportV3, mode: any, targetSectionId?: string) => {
    await importJsonToFirestore(data, mode, targetSectionId, examId);
    setShowImportModal(false);
    loadStructure(); // Reload
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Đang tải cấu trúc...</div>;
  }

  return (
    <div className="space-y-6">
      {showImportModal && (
        <JsonImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={handleImportQuestionBank}
          existingSections={sections}
          isQuestionBankOnly={true}
        />
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-900">Danh sách các phần (Sections)</h3>
        <div className="flex items-center gap-2">
          {selectedQuestions.length > 0 && (
            <button 
              onClick={handleExportSelected}
              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
            >
              <Download className="w-4 h-4 mr-1" /> Export {selectedQuestions.length} selected
            </button>
          )}
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1" /> Import Question Bank
          </button>
          <button 
            onClick={handleExportExam}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
          >
            <Download className="w-4 h-4 mr-1" /> Export Full JSON
          </button>
          <button 
            onClick={() => setIsAddingSection(true)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Thêm phần mới
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1.5 scrollbar-thin">
        {sections.map((section) => {
          const isExpanded = expandedSections[section.id];
          const sectionQs = questions[section.id] || [];

          return (
            <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div 
                className="flex items-center p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <GripVertical className="w-5 h-5 text-slate-400 mr-2 cursor-grab" />
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-500 mr-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500 mr-2" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{section.title}</h4>
                  <p className="text-xs text-slate-500">{sectionQs.length} câu hỏi</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      exportJson({
                        version: 3,
                        source: "DkTEST",
                        exportedAt: new Date().toISOString(),
                        exportType: "section",
                        sections: [section],
                        questions: sectionQs as any
                      }, `Section_${section.title}`);
                    }}
                    className="p-1.5 text-slate-400 hover:text-green-600 rounded" 
                    title="Export JSON Section"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt("Đổi tên phần:", section.title);
                      if (newTitle && newTitle.trim()) {
                        updateSection(examId, section.id, { title: newTitle.trim() }).then(() => {
                          setSections((prev) =>
                            prev.map((s) => (s.id === section.id ? { ...s, title: newTitle.trim() } : s))
                          );
                        });
                      }
                    }}
                    title="Đổi tên phần"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSectionToDelete(section);
                    }}
                    title="Xóa phần này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-slate-200 bg-white">
                  {sectionQs.length === 0 && addingToSection !== section.id ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                      <p className="text-slate-500 text-sm mb-3">Phần này chưa có câu hỏi nào</p>
                      <button 
                        onClick={() => setAddingToSection(section.id)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sectionQs.map((q, idx) => (
                        editingQuestion?.id === q.id ? (
                          <QuestionEditor
                            key={q.id}
                            examId={examId}
                            sectionId={section.id}
                            initialQuestion={q}
                            onSaved={(savedQ) => {
                              setEditingQuestion(null);
                              setQuestions(prev => ({
                                ...prev,
                                [section.id]: prev[section.id].map(oldQ => oldQ.id === savedQ.id ? savedQ : oldQ)
                              }));
                            }}
                            onCancel={() => setEditingQuestion(null)}
                          />
                        ) : (
                          <div key={q.id} className="flex items-start p-3 border border-slate-100 rounded-lg bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                            <input 
                              type="checkbox" 
                              checked={selectedQuestions.includes(q.id)}
                              onChange={() => toggleQuestionSelection(q.id)}
                              className="mt-1.5 mr-3 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <GripVertical className="w-4 h-4 text-slate-300 mr-2 mt-1.5 cursor-grab shrink-0" />
                            <div className="flex-1 text-sm pt-0.5">
                              <span className="font-medium text-slate-900 mr-2">Câu {idx + 1}:</span>
                              <span className="text-slate-700 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.text || "<em>Chưa có nội dung</em>" }}></span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                              <button 
                                onClick={() => setEditingQuestion(q)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setQuestionToDelete({ sectionId: section.id, questionId: q.id })}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-medium text-slate-500 shrink-0 capitalize">
                              {q.type.replace('_', ' ')}
                            </span>
                          </div>
                        )
                      ))}
                      
                      {addingToSection === section.id && (
                        <QuestionEditor
                          examId={examId}
                          sectionId={section.id}
                          onSaved={(savedQ) => {
                            setAddingToSection(null);
                            setQuestions(prev => ({
                              ...prev,
                              [section.id]: [...(prev[section.id] || []), savedQ]
                            }));
                          }}
                          onCancel={() => setAddingToSection(null)}
                        />
                      )}

                      {addingToSection !== section.id && (
                        <div className="mt-4 flex justify-center">
                          <button 
                            onClick={() => setAddingToSection(section.id)}
                            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAddingSection && (
          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50 flex items-center gap-3">
            <input 
              type="text" 
              autoFocus
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSection()}
              placeholder="Nhập tên phần (VD: Phần I - Trắc nghiệm)"
              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button 
              onClick={handleAddSection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            >
              <Check className="w-4 h-4 mr-1" /> Lưu
            </button>
            <button 
              onClick={() => { setIsAddingSection(false); setNewSectionTitle(""); }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Hủy
            </button>
          </div>
        )}

        {sections.length === 0 && !isAddingSection && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 mb-4">Bài thi chưa có phần nào.</p>
            <button 
              onClick={() => setIsAddingSection(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Tạo phần đầu tiên
            </button>
          </div>
        )}
      </div>

      {/* Confirm Delete Section Modal */}
      <ConfirmModal
        isOpen={!!sectionToDelete}
        onClose={() => setSectionToDelete(null)}
        onConfirm={handleConfirmDeleteSection}
        isLoading={isDeleting}
        title="Xác nhận xóa phần thi"
        message={
          sectionToDelete ? (
            <div>
              Bạn có chắc chắn muốn xóa <strong>"{sectionToDelete.title}"</strong>?
              <p className="text-slate-600 text-xs mt-2">
                Các câu hỏi trong phần này sẽ bị gỡ khỏi phần thi.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmText="Xóa phần thi"
        cancelText="Hủy bỏ"
        variant="danger"
      />

      {/* Confirm Delete Question Modal */}
      <ConfirmModal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleConfirmDeleteQuestion}
        isLoading={isDeleting}
        title="Xác nhận xóa câu hỏi"
        message="Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?"
        confirmText="Xóa câu hỏi"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
}
