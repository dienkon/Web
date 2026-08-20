import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText, Loader2, Sparkles, CheckCircle2, AlertTriangle, X, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "../../components/ui/ToastNotification";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import AiGenerationProgress, { AiLogItem } from "../../components/ai/AiGenerationProgress";

export default function AiWordImport() {
  const navigate = useNavigate();
  const { showToast, error: showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<AiLogItem[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith(".docx") && !selectedFile.name.endsWith(".doc")) {
        showErrorToast("Chỉ hỗ trợ file Word (.docx, .doc)");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.endsWith(".docx") && !droppedFile.name.endsWith(".doc")) {
        showErrorToast("Chỉ hỗ trợ file Word (.docx, .doc)");
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setProgressPercent(5);
    setProgressMsg("Đang đọc và phân tích file Word...");
    setLogs([
      {
        id: `log-init-${Date.now()}`,
        level: "info",
        message: `Bắt đầu xử lý file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ai/generate-exam-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Lỗi máy chủ HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("Không nhận được luồng dữ liệu từ máy chủ");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";
      let hasReceivedResult = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const lines = event.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice("data: ".length).trim();
                if (!dataStr) continue;
                try {
                  const data = JSON.parse(dataStr);
                  if (data.type === "log") {
                    if (data.percent !== undefined) setProgressPercent(data.percent);
                    if (data.message) setProgressMsg(data.message);
                    setLogs((prev) => [
                      ...prev,
                      {
                        id: `log-${Date.now()}-${Math.random()}`,
                        level: data.level || "info",
                        message: data.message,
                        timestamp: data.timestamp || new Date().toLocaleTimeString("vi-VN"),
                      },
                    ]);
                  } else if (data.type === "info" || data.type === "progress") {
                    setProgressMsg(data.message);
                    if (data.percent !== undefined) setProgressPercent(data.percent);
                    setLogs((prev) => [
                      ...prev,
                      {
                        id: `log-${Date.now()}-${Math.random()}`,
                        level: "info",
                        message: data.message,
                        timestamp: new Date().toLocaleTimeString("vi-VN"),
                      },
                    ]);
                  } else if (data.type === "done") {
                    hasReceivedResult = true;
                    setResult(data.result);
                    setProgressPercent(100);
                    showToast("Đã phân tích xong đề thi từ Word!");
                  } else if (data.type === "error") {
                    throw new Error(data.message || "Lỗi phân tích đề thi từ AI");
                  }
                } catch (e: any) {
                  if (e.message && e.message !== "Unexpected end of JSON input") {
                    console.error("Lỗi xử lý sự kiện SSE:", e);
                  }
                }
              }
            }
          }
        }
      }

      if (buffer.trim().startsWith("data: ")) {
        try {
          const dataStr = buffer.trim().slice("data: ".length).trim();
          const data = JSON.parse(dataStr);
          if (data.type === "done") {
            hasReceivedResult = true;
            setResult(data.result);
            setProgressPercent(100);
            showToast("Đã phân tích xong đề thi từ Word!");
          } else if (data.type === "error") {
            throw new Error(data.message);
          }
        } catch (e) {
          // ignore
        }
      }

      if (!hasReceivedResult && !result) {
        setProgressMsg("");
      }
    } catch (err: any) {
      console.error("Lỗi khi gửi AI:", err);
      setLogs((prev) => [
        ...prev,
        {
          id: `log-err-${Date.now()}`,
          level: "error",
          message: `Lỗi: ${err.message || "Không thể xử lý file Word"}`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      ]);
      showErrorToast(err.message || "Lỗi xử lý file Word qua AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportToBuilder = () => {
    if (!result) return;
    navigate("/admin/exams/new", { state: { importedExam: result } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Tạo Đề Từ File Word</h1>
              <p className="text-sm text-slate-500">
                Tự động nhận diện câu hỏi, đáp án, nhóm bài đọc và chuyển đổi công thức Toán/Lý/Hóa sang LaTeX chuẩn ($...$).
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin/exams")}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="space-y-6">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                file ? "border-indigo-400 bg-indigo-50/30" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                className="hidden" 
              />
              
              {file ? (
                <>
                  <FileText className="w-12 h-12 text-indigo-500 mb-3" />
                  <span className="font-bold text-slate-800">{file.name}</span>
                  <span className="text-xs text-slate-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white shadow-xs border border-slate-100 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-lg">Kéo file Word vào đây</h3>
                  <p className="text-sm text-slate-500 mt-1">hoặc <span className="text-indigo-600 font-semibold">Chọn file .docx</span></p>
                  <p className="text-xs text-slate-400 mt-2">Hỗ trợ tự động định dạng LaTeX ($...$) cho công thức toán, lý, hóa</p>
                </>
              )}
            </div>

            {/* Live Real-time AI Progress & Log Terminal */}
            <AiGenerationProgress
              isProcessing={isProcessing}
              progressPercent={progressPercent}
              currentMessage={progressMsg}
              logs={logs}
              title="Tiến trình đọc Word & Nhận diện LaTeX"
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => navigate("/admin/exams")}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                disabled={isProcessing}
              >
                Hủy
              </button>
              <button 
                onClick={handleUpload}
                disabled={!file || isProcessing}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích ({progressPercent}%)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Bắt đầu phân tích AI
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-lg mb-2">
                <CheckCircle2 className="w-5 h-5" />
                AI đã phân tích & định dạng LaTeX xong ({result.questions?.length || 0} câu)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng số câu</span>
                  <div className="text-xl font-black text-slate-800">{result.statistics?.totalQuestions || result.questions?.length || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Đáp án từ file</span>
                  <div className="text-xl font-black text-emerald-600">{result.statistics?.answersFromDocument || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">AI tự suy luận</span>
                  <div className="text-xl font-black text-amber-600">{result.statistics?.answersGeneratedByAI || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Số phần / Bài đọc</span>
                  <div className="text-xl font-black text-indigo-600">{result.sections?.length || 0}</div>
                </div>
              </div>
            </div>

            {/* Sections / Passages list if any */}
            {result.sections && result.sections.length > 0 && (
              <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-indigo-900 text-sm">Các phần / Bài đọc phát hiện ({result.sections.length}):</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.sections.map((sec: any, sIdx: number) => (
                    <div key={sIdx} className="bg-white p-3 rounded-lg border border-indigo-100 text-xs">
                      <span className="font-bold text-indigo-700">{sec.title}</span>
                      {sec.description && (
                        <div className="mt-1 text-slate-600 max-h-24 overflow-y-auto bg-slate-50 p-2 rounded">
                          <LatexPreview content={sec.description} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Preview Table with KaTeX rendering */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Danh sách câu hỏi & hiển thị công thức LaTeX</span>
                <span className="text-xs text-slate-500">Đã áp dụng bộ dựng KaTeX</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-16">STT</th>
                      <th className="px-4 py-3 w-28">Loại</th>
                      <th className="px-4 py-3">Nội dung câu hỏi (Hiển thị LaTeX)</th>
                      <th className="px-4 py-3 w-36">Nguồn Đ/A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {result.questions?.map((q: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-bold text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold whitespace-nowrap">
                            {q.type === "single_choice" ? "Trắc nghiệm 1" : q.type === "multiple_choice" ? "Nhiều lựa chọn" : q.type === "true_false" ? "Đúng / Sai" : "Điền từ"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <div className="font-medium">
                            <LatexPreview content={q.text} />
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                              {q.options.map((opt: any, oIdx: number) => {
                                const isCorrect = q.correctOptionIds?.includes(opt.id);
                                return (
                                  <div key={oIdx} className={`p-1.5 rounded flex items-center gap-1.5 ${isCorrect ? "bg-emerald-50 text-emerald-800 font-medium border border-emerald-200" : "bg-slate-50"}`}>
                                    <span className="font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                                    <LatexPreview content={opt.text} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.statements && q.statements.length > 0 && (
                            <div className="mt-2 space-y-1 text-xs text-slate-600">
                              {q.statements.map((stmt: any, stmtIdx: number) => (
                                <div key={stmtIdx} className="p-1 rounded bg-slate-50 flex items-center justify-between">
                                  <LatexPreview content={stmt.text} />
                                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${stmt.correctAnswer ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                    {stmt.correctAnswer ? "ĐÚNG" : "SAI"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {q.answerSource === "ai_generated" ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex w-fit items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI ({Math.round((q.answerConfidence || 0.95) * 100)}%)
                            </span>
                          ) : q.answerSource === "unknown" ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex w-fit items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Trống
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex w-fit items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> File
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setResult(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
              >
                Hủy / Chọn file khác
              </button>
              <button 
                onClick={handleImportToBuilder}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Tiếp tục chỉnh sửa trong Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
