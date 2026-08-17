import React, { useState, useRef } from "react";
import { Upload, X, Check, Plus, Trash2 } from "lucide-react";
import type { Question, QuestionType, QuestionOption, TrueFalseStatement } from "../../types";
import { createQuestion, updateQuestion } from "../../services/questionService";
import { uploadImageToCloudinary } from "../../services/cloudinary";
import { useToast } from "../ui/ToastNotification";

export default function QuestionEditor({
  examId,
  sectionId,
  initialQuestion,
  onSaved,
  onCancel,
}: {
  examId: string;
  sectionId: string;
  initialQuestion?: Question;
  onSaved: (q: Question) => void;
  onCancel: () => void;
}) {
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();
  const isEditing = !!initialQuestion;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [type, setType] = useState<QuestionType>(initialQuestion?.type || "single_choice");
  const [text, setText] = useState(initialQuestion?.text || "");
  const [points, setPoints] = useState(initialQuestion?.points || 1);
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || "");

  // Options state
  const [options, setOptions] = useState<QuestionOption[]>(
    initialQuestion?.options || [
      { id: Date.now().toString() + "1", text: "" },
      { id: Date.now().toString() + "2", text: "" },
    ]
  );
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    initialQuestion?.correctOptionIds || []
  );

  // T/F state
  const [statements, setStatements] = useState<TrueFalseStatement[]>(
    initialQuestion?.statements || []
  );

  // Short answer state
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    initialQuestion?.acceptedAnswers || []
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadImageToCloudinary(file);
      setText((prev) => prev + `\n<img src="${url}" alt="image" className="max-w-full h-auto mt-2 rounded" />\n`);
    } catch (err) {
      showErrorToast("Tải ảnh thất bại. Vui lòng kiểm tra lại cấu hình.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!text.trim()) {
      showErrorToast("Vui lòng nhập nội dung câu hỏi");
      return;
    }
    setLoading(true);
    try {
      const questionData: Partial<Question> = {
        examId,
        sectionId,
        type,
        text,
        points,
        explanation,
      };

      if (type === "single_choice" || type === "multiple_choice") {
        questionData.options = options;
        questionData.correctOptionIds = correctOptionIds;
      } else if (type === "true_false") {
        questionData.statements = statements;
      } else if (type === "short_answer") {
        questionData.acceptedAnswers = acceptedAnswers;
      }

      let savedQ: Question;
      if (isEditing) {
        await updateQuestion(examId, initialQuestion!.id, questionData);
        savedQ = { ...initialQuestion!, ...questionData } as Question;
      } else {
        questionData.order = 999; // append to end
        savedQ = await createQuestion(examId, questionData as any);
      }
      onSaved(savedQ);
    } catch (err) {
      console.error(err);
      showErrorToast("Có lỗi khi lưu câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "" }]);
  };

  const updateOptionText = (id: string, newText: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text: newText } : o)));
  };

  const removeOption = (id: string) => {
    setOptions(options.filter((o) => o.id !== id));
    setCorrectOptionIds(correctOptionIds.filter((cId) => cId !== id));
  };

  const toggleCorrectOption = (id: string) => {
    if (type === "single_choice") {
      setCorrectOptionIds([id]);
    } else {
      setCorrectOptionIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-semibold text-slate-900">
          {isEditing ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
        </h4>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Loại câu hỏi</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="single_choice">Trắc nghiệm (1 đáp án)</option>
            <option value="multiple_choice">Trắc nghiệm (nhiều đáp án)</option>
            <option value="true_false">Đúng / Sai</option>
            <option value="short_answer">Điền khuyết</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-700">Nội dung câu hỏi</label>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded inline-flex items-center disabled:opacity-50"
              >
                {uploading ? (
                  "Đang tải..."
                ) : (
                  <>
                    <Upload className="w-3 h-3 mr-1" />
                    Chèn ảnh
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Nhập nội dung câu hỏi (hỗ trợ HTML nếu chèn ảnh)..."
          />
        </div>

        {/* Options Editor for Choice Types */}
        {(type === "single_choice" || type === "multiple_choice") && (
          <div className="bg-white p-4 border border-slate-200 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-3">Các lựa chọn</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCorrectOption(opt.id)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      correctOptionIds.includes(opt.id)
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {correctOptionIds.includes(opt.id) && <Check className="w-4 h-4" />}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOptionText(opt.id, e.target.value)}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeOption(opt.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addOption}
              className="mt-3 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Thêm lựa chọn
            </button>
          </div>
        )}

        {/* Short Answer Editor */}
        {type === "short_answer" && (
          <div className="bg-white p-4 border border-slate-200 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-3">Đáp án chấp nhận (mỗi dòng 1 đáp án)</label>
            <textarea
              value={acceptedAnswers.join("\n")}
              onChange={(e) => setAcceptedAnswers(e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nhập các đáp án đúng..."
            />
          </div>
        )}

        {/* True/False Editor */}
        {type === "true_false" && (
          <div className="bg-white p-4 border border-slate-200 rounded-lg">
             <label className="block text-sm font-medium text-slate-700 mb-3">Các mệnh đề</label>
             <div className="space-y-3">
              {statements.map((stmt, idx) => (
                <div key={stmt.id} className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={stmt.text}
                      onChange={(e) => {
                        const newStmts = [...statements];
                        newStmts[idx].text = e.target.value;
                        setStatements(newStmts);
                      }}
                      placeholder="Nhập mệnh đề..."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <select
                    value={stmt.correctAnswer ? "true" : "false"}
                    onChange={(e) => {
                        const newStmts = [...statements];
                        newStmts[idx].correctAnswer = e.target.value === "true";
                        setStatements(newStmts);
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="true">Đúng</option>
                    <option value="false">Sai</option>
                  </select>
                  <button
                    onClick={() => {
                        const newStmts = [...statements];
                        newStmts.splice(idx, 1);
                        setStatements(newStmts);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
             </div>
             <button
              onClick={() => setStatements([...statements, { id: Date.now().toString(), text: "", correctAnswer: true }])}
              className="mt-3 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Thêm mệnh đề
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Giải thích (tùy chọn)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Hiển thị khi học sinh xem lại bài..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Đang lưu..." : "Lưu câu hỏi"}
        </button>
      </div>
    </div>
  );
}
