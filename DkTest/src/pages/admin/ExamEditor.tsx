import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import ExamStructureEditor from "../../components/exam/ExamStructureEditor";
import { getExam, updateExam, createExam } from "../../services/examService";
import type { Exam } from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ExamEditor({ isNew }: { isNew?: boolean }) {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();

  const [exam, setExam] = useState<Partial<Exam>>({
    title: "",
    code: "",
    description: "",
    timeLimit: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showDetails: true,
    allowSubExam: false,
    maxAttempts: 1,
    status: "draft",
    questionCount: 0,
  });

  const [loading, setLoading] = useState(!isNew);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isNew && examId) {
      loadExam(examId);
    }
  }, [isNew, examId]);

  const loadExam = async (id: string) => {
    try {
      setLoading(true);
      const data = await getExam(id);
      if (data) {
        setExam(data);
      } else {
        navigate("/admin/exams");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [isDirty, setIsDirty] = useState(false);

  const saveExamData = async (dataToSave?: Partial<Exam>) => {
    const payload = dataToSave || exam;
    if (!payload.title?.trim()) {
      showErrorToast("Vui lòng nhập tên bài thi!");
      return;
    }
    try {
      setSaveState("saving");
      if (isNew) {
        const created = await createExam(payload as any);
        setSaveState("saved");
        setIsDirty(false);
        navigate(`/admin/exams/${created.id}/edit`, { replace: true });
      } else if (examId) {
        await updateExam(examId, payload);
        setSaveState("saved");
        setIsDirty(false);
      }
      setTimeout(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev));
      }, 2500);
    } catch (err) {
      console.error(err);
      setSaveState("error");
    }
  };

  const handleChange = (field: keyof Exam, value: any) => {
    setExam((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaveState("idle");
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-slate-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/admin/exams")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew ? "Tạo bài thi mới" : "Chỉnh sửa bài thi"}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {isDirty && saveState !== "saving" && (
            <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">
              Có thay đổi chưa lưu
            </span>
          )}
          {saveState === "saving" && (
            <span className="text-slate-500 flex items-center text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang lưu...
            </span>
          )}
          {saveState === "saved" && !isDirty && (
            <span className="text-green-600 flex items-center text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đã lưu vào hệ thống
            </span>
          )}
          {saveState === "error" && (
            <span className="text-red-600 flex items-center text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Lỗi khi lưu
            </span>
          )}
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center shadow-sm cursor-pointer"
            onClick={() => saveExamData()}
          >
            <Save className="w-4 h-4 mr-2" />
            Lưu / Xuất bản bài thi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Thông tin cơ bản</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên bài thi</label>
              <input 
                type="text" 
                value={exam.title || ""}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="VD: Kiểm tra giữa kỳ môn Toán"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã bài thi</label>
                <input 
                  type="text" 
                  value={exam.code || ""}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="VD: MATH_01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian (phút)</label>
                <input 
                  type="number" 
                  value={exam.timeLimit || 60}
                  onChange={(e) => handleChange("timeLimit", Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
              <textarea 
                value={exam.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Nhập mô tả hoặc ghi chú..."
              />
            </div>
          </div>

          {!isNew && examId && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <ExamStructureEditor examId={examId} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Cài đặt hiển thị</h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={exam.shuffleQuestions || false}
                onChange={(e) => handleChange("shuffleQuestions", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Xáo trộn câu hỏi</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={exam.shuffleOptions || false}
                onChange={(e) => handleChange("shuffleOptions", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Xáo trộn đáp án</span>
            </label>

            <div className="h-px bg-slate-200 my-4"></div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={exam.showResults || false}
                onChange={(e) => handleChange("showResults", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Hiển thị điểm sau khi nộp</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer opacity-80 pl-8">
              <input 
                type="checkbox" 
                checked={exam.showDetails || false}
                disabled={!exam.showResults}
                onChange={(e) => handleChange("showDetails", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-slate-600">Cho xem chi tiết đáp án</span>
            </label>

            <div className="h-px bg-slate-200 my-4"></div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={exam.allowSubExam || false}
                onChange={(e) => handleChange("allowSubExam", e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium">Cho phép làm đề con</span>
            </label>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lần làm tối đa</label>
              <input 
                type="number" 
                min={1}
                value={exam.maxAttempts || 1}
                onChange={(e) => handleChange("maxAttempts", Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
              <select 
                value={exam.status || "draft"}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Công khai</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
