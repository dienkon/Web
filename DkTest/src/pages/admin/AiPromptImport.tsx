import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, X } from "lucide-react";
import { useToast } from "../../components/ui/ToastNotification";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";
import AiGenerationProgress, { AiLogItem } from "../../components/ai/AiGenerationProgress";

const EXAMPLE_PROMPTS = [
  "Tạo đề kiểm tra 15 phút Toán lớp 12 phần Khảo sát hàm số gồm 5 câu trắc nghiệm 4 lựa chọn, có chứa công thức đạo hàm và bảng biến thiên dạng LaTeX.",
  "Tạo đề ôn tập Hóa học 10 phần Cân bằng phản ứng Oxi hóa - Khử gồm 4 câu trắc nghiệm và 1 câu tự luận điền số.",
  "Tạo bài thi Tiếng Anh THPT gồm 1 đoạn văn đọc hiểu ngắn và 4 câu hỏi trắc nghiệm liên quan đến đoạn văn đó.",
  "Tạo đề Vật lý 12 phần Dao động điều hòa gồm 6 câu trắc nghiệm có công thức tính chu kỳ, tần số và pha dao động bằng LaTeX.",
];

export default function AiPromptImport() {
  const navigate = useNavigate();
  const { showToast, error: showErrorToast } = useToast();
  
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [logs, setLogs] = useState<AiLogItem[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showErrorToast("Vui lòng nhập nội dung yêu cầu tạo đề");
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgressPercent(10);
    setProgressMsg("Đang chuẩn bị gửi yêu cầu tới AI...");
    setLogs([
      {
        id: `log-init-${Date.now()}`,
        level: "info",
        message: "Bắt đầu yêu cầu tạo đề từ câu lệnh thông minh...",
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      },
    ]);

    try {
      const response = await fetch("/api/ai/generate-exam-prompt-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi máy chủ HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("Không nhận được phản hồi stream từ máy chủ");

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
                        timestamp: data.timestamp || new Date().toLocaleTimeString("vi-VN"),
                      },
                    ]);
                  } else if (data.type === "done") {
                    hasReceivedResult = true;
                    setResult(data.result);
                    setProgressPercent(100);
                    showToast("Đã tạo đề thi thành công!");
                  } else if (data.type === "error") {
                    throw new Error(data.message || "Lỗi tạo đề thi từ AI");
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

      // Check any remaining buffer at the end
      if (buffer.trim().startsWith("data: ")) {
        try {
          const dataStr = buffer.trim().slice("data: ".length).trim();
          const data = JSON.parse(dataStr);
          if (data.type === "done") {
            hasReceivedResult = true;
            setResult(data.result);
            setProgressPercent(100);
            showToast("Đã tạo đề thi thành công!");
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
          message: `Lỗi: ${err.message || "Lỗi tạo đề bằng AI"}`,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      ]);
      showErrorToast(err.message || "Lỗi tạo đề bằng AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportToEditor = () => {
    if (!result) return;
    navigate("/admin/exams/new", { state: { importedExam: result } });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Tạo Đề Bằng Prompt</h1>
              <p className="text-sm text-slate-500">
                Nhập yêu cầu tự do, AI sẽ tự động tạo đề thi đầy đủ câu hỏi, đáp án và công thức LaTeX ($...$).
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
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nội dung yêu cầu tạo đề:
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Tạo đề kiểm tra 1 tiết Toán 11 gồm 8 câu trắc nghiệm hàm số lượng giác và phương trình lượng giác, mức độ thông hiểu và vận dụng..."
                rows={5}
                className="w-full p-4 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none shadow-2xs"
                disabled={isProcessing}
              />
            </div>

            {/* Suggestions */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">
                Gợi ý mẫu câu lệnh:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="p-3 text-left bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-200 rounded-xl text-xs text-slate-700 transition"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time AI Progress & Live Logs */}
            <AiGenerationProgress
              isProcessing={isProcessing}
              progressPercent={progressPercent}
              currentMessage={progressMsg}
              logs={logs}
              title="Tiến trình khởi tạo AI & Sinh mã LaTeX"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => navigate("/admin/exams")}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                disabled={isProcessing}
              >
                Hủy
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isProcessing}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo ({progressPercent}%)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Tạo đề ngay
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
                AI đã tạo đề thi hoàn tất ({result.questions?.length || 0} câu)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng số câu</span>
                  <div className="text-xl font-black text-slate-800">{result.questions?.length || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Trắc nghiệm</span>
                  <div className="text-xl font-black text-purple-600">
                    {result.questions?.filter((q: any) => q.type === "single_choice" || q.type === "multiple_choice").length || 0}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Đúng / Sai</span>
                  <div className="text-xl font-black text-blue-600">
                    {result.questions?.filter((q: any) => q.type === "true_false").length || 0}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Điền từ / Tự luận</span>
                  <div className="text-xl font-black text-emerald-600">
                    {result.questions?.filter((q: any) => q.type === "short_answer").length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Preview Table with KaTeX rendering */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Xem trước câu hỏi & hiển thị công thức LaTeX</span>
                <span className="text-xs text-slate-500">Đã áp dụng bộ dựng KaTeX</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-16">STT</th>
                      <th className="px-4 py-3 w-28">Loại</th>
                      <th className="px-4 py-3">Nội dung câu hỏi & Đáp án (Render LaTeX)</th>
                      <th className="px-4 py-3 w-32">Nguồn</th>
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
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex w-fit items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Gen
                          </span>
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
                Hủy / Nhập lại Prompt
              </button>
              <button
                onClick={handleImportToEditor}
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
