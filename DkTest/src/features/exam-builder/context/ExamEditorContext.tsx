import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Exam, Section, Question, QuestionType } from "../../../types";
import { doc, getDoc, collection, getDocs, writeBatch, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../../../services/firebase/config";

interface ValidationIssue {
  id: string; // question or section id
  type: "error" | "warning";
  message: string;
}

interface ExamEditorState {
  examId: string | null;
  examMeta: Partial<Exam>;
  sections: Section[];
  questions: Question[];
  deletedSectionIds: string[];
  deletedQuestionIds: string[];
  activeQuestionId: string | null;
  activeSectionId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  validationIssues: ValidationIssue[];
  previewMode: "none" | "student" | "answers";
}

interface ExamEditorActions {
  setExamMeta: (updates: Partial<Exam>) => void;
  
  // Sections
  addSection: () => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  reorderSections: (newSections: Section[]) => void;
  
  // Questions
  addQuestion: (type: QuestionType, sectionId?: string | null) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  deleteQuestion: (id: string) => void;
  moveQuestion: (questionId: string, targetSectionId: string | null, targetIndex: number) => void;
  moveQuestionToGlobalIndex: (sourceId: string, targetId: string) => void;
  reorderQuestion: (questionId: string, direction: "up" | "down") => void;
  
  // UI
  setActiveQuestion: (id: string | null) => void;
  setActiveSection: (id: string | null) => void;
  setPreviewMode: (mode: "none" | "student" | "answers") => void;
  
  // Data
  loadExam: (id: string) => Promise<void>;
  initNewExam: () => void;
  saveExam: (isPublish?: boolean) => Promise<boolean>;
  importExam: (data: { examMeta: Partial<Exam>, sections: Section[], questions: Question[] }) => void;
}

const ExamEditorContext = createContext<{ state: ExamEditorState; actions: ExamEditorActions } | null>(null);

export const useExamEditorContext = () => {
  const ctx = useContext(ExamEditorContext);
  if (!ctx) throw new Error("useExamEditorContext must be used within ExamEditorProvider");
  return ctx;
};

export const ExamEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ExamEditorState>({
    examId: null,
    examMeta: {
      title: "Bài thi chưa có tên",
      code: "",
      timeLimit: 45,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      showDetails: true,
      allowSubExam: false,
      maxAttempts: 1,
      status: "draft",
    },
    sections: [],
    questions: [],
    deletedSectionIds: [],
    deletedQuestionIds: [],
    activeQuestionId: null,
    activeSectionId: null,
    isDirty: false,
    isSaving: false,
    isLoading: false,
    saveStatus: "idle",
    validationIssues: [],
    previewMode: "none"
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadExam = useCallback(async (id: string) => {
    setState(s => ({ ...s, isLoading: true, examId: id }));
    try {
      const examSnap = await getDoc(doc(db, "exams", id));
      if (!examSnap.exists()) {
        setState(s => ({ ...s, isLoading: false }));
        return; // handle new exam
      }
      
      const meta = examSnap.data() as Exam;
      
      // Load sections
      const sectionsSnap = await getDocs(collection(db, `exams/${id}/sections`));
      const sections = sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Section)).sort((a,b) => a.order - b.order);
      
      // Load questions
      const questionsSnap = await getDocs(collection(db, `exams/${id}/questions`));
      const questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question)).sort((a,b) => a.order - b.order);
      
      setState(s => ({
        ...s,
        isLoading: false,
        examMeta: meta,
        sections,
        questions,
        deletedSectionIds: [],
        deletedQuestionIds: [],
        isDirty: false
      }));
    } catch (err) {
      console.error(err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const initNewExam = useCallback(() => {
    const newId = doc(collection(db, "exams")).id;
    setState(s => ({ ...s, isLoading: false, examId: newId, examMeta: { ...s.examMeta, id: newId } }));
  }, []);

  const validate = (questions: Question[], sections: Section[]) => {
    const issues: ValidationIssue[] = [];
    if (questions.length === 0) {
      issues.push({ id: "root", type: "error", message: "Bài thi chưa có câu hỏi nào. Vui lòng thêm ít nhất 1 câu hỏi." });
    }
    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.text || q.text.trim() === "") {
        issues.push({ id: q.id, type: "error", message: `Câu ${qNum}: Thiếu nội dung câu hỏi.` });
      }
      if (q.type === "single_choice" || q.type === "multiple_choice") {
        if (!q.options || q.options.length < 2) {
          issues.push({ id: q.id, type: "error", message: `Câu ${qNum}: Cần ít nhất 2 đáp án Lựa chọn.` });
        }
        if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
          issues.push({ id: q.id, type: "error", message: `Câu ${qNum}: Chưa đánh dấu đáp án đúng.` });
        }
      }
      if (q.type === "short_answer" && (!q.acceptedAnswers || q.acceptedAnswers.length === 0)) {
        issues.push({ id: q.id, type: "error", message: `Câu ${qNum}: Chưa nhập đáp án chấp nhận.` });
      }
      if (q.type === "true_false" && (!q.statements || q.statements.length === 0)) {
        issues.push({ id: q.id, type: "error", message: `Câu ${qNum}: Chưa có mệnh đề Đúng/Sai.` });
      }
    });
    setState(s => ({ ...s, validationIssues: issues }));
    return issues.length === 0;
  };

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleanObj[key] = sanitizeForFirestore(val);
    }
  }
  return cleanObj;
}

  const saveExam = useCallback(async (isPublish = false) => {
    let { examId, examMeta, sections, questions, deletedSectionIds, deletedQuestionIds } = stateRef.current;
    
    if (!examId) {
      examId = doc(collection(db, "exams")).id;
    }
    
    // Optional: Validate before publish
    if (isPublish) {
       const isValid = validate(questions, sections);
       if (!isValid) return false;
    }

    setState(s => ({ ...s, isSaving: true, saveStatus: "saving" }));
    try {
      const batch = writeBatch(db);
      
      const examRef = doc(db, "exams", examId);
      const cleanExamMeta = sanitizeForFirestore({
        ...examMeta,
        id: examId,
        questionCount: questions.length,
        sectionCount: sections.length,
        status: isPublish ? "published" : (examMeta.status || "draft"),
        createdAt: examMeta.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      batch.set(examRef, cleanExamMeta, { merge: true });
      
      // Delete removed sections
      deletedSectionIds.forEach((secId) => {
        batch.delete(doc(db, `exams/${examId}/sections`, secId));
      });

      // Delete removed questions
      deletedQuestionIds.forEach((qId) => {
        batch.delete(doc(db, `exams/${examId}/questions`, qId));
      });
      
      sections.forEach((sec, idx) => {
        const cleanSec = sanitizeForFirestore({ ...sec, order: idx, examId });
        batch.set(doc(db, `exams/${examId}/sections`, sec.id), cleanSec, { merge: true });
      });
      
      questions.forEach((q, idx) => {
        const qData: any = { ...q, order: idx, examId };
        if (qData.sectionId === undefined) qData.sectionId = null;
        const cleanQ = sanitizeForFirestore(qData);
        batch.set(doc(db, `exams/${examId}/questions`, q.id), cleanQ, { merge: true });
      });
      
      await batch.commit();
      setState(s => ({
        ...s,
        examId,
        examMeta: {
          ...s.examMeta,
          id: examId,
          status: isPublish ? "published" : (s.examMeta.status || "draft"),
        },
        isSaving: false,
        isDirty: false,
        saveStatus: "saved",
        deletedSectionIds: [],
        deletedQuestionIds: [],
        validationIssues: [],
      }));
      return true;
    } catch (error: any) {
      console.error("Error saving exam:", error);
      setState(s => ({
        ...s,
        isSaving: false,
        saveStatus: "error",
        validationIssues: [{ id: "system", type: "error", message: `Lỗi hệ thống khi lưu: ${error?.message || "Vui lòng kiểm tra lại mạng và thử lại."}` }]
      }));
      return false;
    }
  }, []);

  const markDirty = () => {
    setState(s => ({ ...s, isDirty: true, saveStatus: "idle" }));
  };

  const actions: ExamEditorActions = {
    setExamMeta: (updates) => {
      setState(s => ({ ...s, examMeta: { ...s.examMeta, ...updates } }));
      markDirty();
    },
    
    addSection: () => {
      const newSection: Section = {
        id: `sec_${uuidv4()}`,
        examId: stateRef.current.examId || "",
        title: `Phần ${stateRef.current.sections.length + 1}`,
        order: stateRef.current.sections.length,
        questionCount: 0,
        enabled: true
      };
      setState(s => ({ ...s, sections: [...s.sections, newSection] }));
      markDirty();
    },
    updateSection: (id, updates) => {
      setState(s => ({
        ...s,
        sections: s.sections.map(sec => sec.id === id ? { ...sec, ...updates } : sec)
      }));
      markDirty();
    },
    deleteSection: (id) => {
      const examId = stateRef.current.examId;
      if (examId) {
        deleteDoc(doc(db, `exams/${examId}/sections`, id)).catch((err) =>
          console.warn("Could not delete section doc immediately", err)
        );
      }
      setState(s => ({
        ...s,
        sections: s.sections.filter(sec => sec.id !== id),
        questions: s.questions.map(q => q.sectionId === id ? { ...q, sectionId: null } : q),
        deletedSectionIds: [...s.deletedSectionIds, id],
        activeSectionId: s.activeSectionId === id ? null : s.activeSectionId,
      }));
      markDirty();
    },
    reorderSections: (newSections) => {
      setState(s => ({ ...s, sections: newSections.map((sec, idx) => ({ ...sec, order: idx })) }));
      markDirty();
    },
    
    addQuestion: (type, sectionId = null) => {
      const qId = `q_${uuidv4()}`;
      const newQuestion: Question = {
        id: qId,
        examId: stateRef.current.examId || "",
        sectionId,
        type,
        text: "",
        points: 1,
        order: stateRef.current.questions.length,
      };
      
      if (type === "single_choice" || type === "multiple_choice") {
        const opt1 = uuidv4();
        const opt2 = uuidv4();
        newQuestion.text = "Câu hỏi trắc nghiệm mới";
        newQuestion.options = [
          { id: opt1, text: "Lựa chọn 1" },
          { id: opt2, text: "Lựa chọn 2" },
        ];
        newQuestion.correctOptionIds = [opt1];
      } else if (type === "true_false") {
        newQuestion.text = "Mệnh đề Đúng/Sai mới";
        newQuestion.statements = [
          { id: uuidv4(), text: "Mệnh đề 1", correctAnswer: true }
        ];
      } else if (type === "short_answer") {
        newQuestion.text = "Câu hỏi điền từ / trả lời ngắn";
        newQuestion.acceptedAnswers = ["Đáp án đúng"];
        newQuestion.caseSensitive = false;
        newQuestion.trimWhitespace = true;
      }
      
      setState(s => ({
        ...s,
        questions: [...s.questions, newQuestion],
        activeQuestionId: qId
      }));
      markDirty();
    },
    
    updateQuestion: (id, updates) => {
      setState(s => ({
        ...s,
        questions: s.questions.map(q => q.id === id ? { ...q, ...updates } : q)
      }));
      markDirty();
    },
    
    duplicateQuestion: (id) => {
      setState(s => {
        const qToDup = s.questions.find(q => q.id === id);
        if (!qToDup) return s;
        const newId = `q_${uuidv4()}`;
        const newQ = { ...qToDup, id: newId };
        
        // Give new IDs to options to prevent key collisions
        if (newQ.options) {
          const idMap = new Map();
          newQ.options = newQ.options.map(opt => {
             const nId = uuidv4();
             idMap.set(opt.id, nId);
             return { ...opt, id: nId };
          });
          if (newQ.correctOptionIds) {
             newQ.correctOptionIds = newQ.correctOptionIds.map(oldId => idMap.get(oldId) || oldId);
          }
        }
        
        if (newQ.statements) {
          newQ.statements = newQ.statements.map(st => ({ ...st, id: uuidv4() }));
        }

        const idx = s.questions.findIndex(q => q.id === id);
        const newQuestions = [...s.questions];
        newQuestions.splice(idx + 1, 0, newQ);
        
        return {
          ...s,
          questions: newQuestions,
          activeQuestionId: newId
        };
      });
      markDirty();
    },
    
    deleteQuestion: (id) => {
      const examId = stateRef.current.examId;
      if (examId) {
        deleteDoc(doc(db, `exams/${examId}/questions`, id)).catch((err) =>
          console.warn("Could not delete question doc immediately", err)
        );
      }
      setState(s => ({
        ...s,
        questions: s.questions.filter(q => q.id !== id),
        deletedQuestionIds: [...s.deletedQuestionIds, id],
        activeQuestionId: s.activeQuestionId === id ? null : s.activeQuestionId
      }));
      markDirty();
    },
    
    moveQuestion: (questionId, targetSectionId, targetIndex) => {
      setState(s => {
        const qIdx = s.questions.findIndex(q => q.id === questionId);
        if (qIdx === -1) return s;
        
        const newQuestions = [...s.questions];
        const [qToMove] = newQuestions.splice(qIdx, 1);
        qToMove.sectionId = targetSectionId;
        
        // Find insert position in the global array based on the section's local targetIndex.
        // If targetSectionId is null, it means root level.
        const sectionQuestions = newQuestions.filter(q => q.sectionId === targetSectionId);
        
        let globalInsertIndex = newQuestions.length; // fallback
        
        if (targetIndex < sectionQuestions.length) {
           const targetQ = sectionQuestions[targetIndex];
           globalInsertIndex = newQuestions.findIndex(q => q.id === targetQ.id);
        } else if (sectionQuestions.length > 0) {
           const lastTargetQ = sectionQuestions[sectionQuestions.length - 1];
           globalInsertIndex = newQuestions.findIndex(q => q.id === lastTargetQ.id) + 1;
        } else {
           // Empty section. We just append it to the end, or after the section header.
           // For simplicity, we just put it at the end of the global list. 
           // Sorting logic in render will group by sectionId anyway.
        }
        
        if (globalInsertIndex !== -1) {
          newQuestions.splice(globalInsertIndex, 0, qToMove);
        } else {
          newQuestions.push(qToMove);
        }
        
        // Re-assign orders
        const finalQuestions = newQuestions.map((q, idx) => ({ ...q, order: idx }));
        
        return { ...s, questions: finalQuestions };
      });
      markDirty();
    },

    moveQuestionToGlobalIndex: (sourceId, targetId) => {
      if (sourceId === targetId) return;
      setState(s => {
        const sourceIdx = s.questions.findIndex(q => q.id === sourceId);
        const targetIdx = s.questions.findIndex(q => q.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return s;

        const newQuestions = [...s.questions];
        const [movedQuestion] = newQuestions.splice(sourceIdx, 1);
        // Inherit target's section if dropped near it
        const targetQuestion = s.questions[targetIdx];
        movedQuestion.sectionId = targetQuestion.sectionId || null;

        newQuestions.splice(targetIdx, 0, movedQuestion);
        const finalQuestions = newQuestions.map((q, idx) => ({ ...q, order: idx }));
        return { ...s, questions: finalQuestions };
      });
      markDirty();
    },

    reorderQuestion: (questionId, direction) => {
      setState(s => {
        const idx = s.questions.findIndex(q => q.id === questionId);
        if (idx === -1) return s;
        if (direction === "up" && idx === 0) return s;
        if (direction === "down" && idx === s.questions.length - 1) return s;

        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        const newQuestions = [...s.questions];
        const temp = newQuestions[idx];
        newQuestions[idx] = newQuestions[targetIdx];
        newQuestions[targetIdx] = temp;

        const finalQuestions = newQuestions.map((q, i) => ({ ...q, order: i }));
        return { ...s, questions: finalQuestions };
      });
      markDirty();
    },
    
    setActiveQuestion: (id) => setState(s => ({ ...s, activeQuestionId: id })),
    setActiveSection: (id) => setState(s => ({ ...s, activeSectionId: id })),
    setPreviewMode: (mode) => setState(s => ({ ...s, previewMode: mode })),
    
    loadExam,
    initNewExam,
    saveExam,
    
    importExam: (data) => {
      setState(s => ({
        ...s,
        examMeta: { ...s.examMeta, ...data.examMeta },
        sections: data.sections,
        questions: data.questions,
        isDirty: true
      }));
    }
  };

  return (
    <ExamEditorContext.Provider value={{ state, actions }}>
      {children}
    </ExamEditorContext.Provider>
  );
};
