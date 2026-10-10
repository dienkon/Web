/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Code2,
  Play,
  Save,
  ArrowLeft,
  Eye,
  FileCode,
  Palette,
  Terminal,
  Settings,
  Sparkles,
  HelpCircle,
  Clock,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { saveCodeExam, getCodeExam } from "../../services/codeExamService";
import type { CodeExam } from "../../types/codeExam";
import { useToast } from "../../components/ui/ToastNotification";

// Default starter template for interactive CODE exam
const DEFAULT_HTML_TEMPLATE = `<!-- GIAO DIỆN BÀI THI CODE TỰ DO (DKTEST) -->
<div class="exam-container">
  <header class="exam-header">
    <h1>BÀI THI THỰC HÀNH CÔNG NGHỆ THÔNG TIN</h1>
    <p class="subtitle">Đề thi chạy độc lập bằng HTML - CSS - JavaScript</p>
  </header>

  <main class="questions-flow">
    <!-- Câu hỏi 1 -->
    <section class="card-question">
      <div class="q-title">
        <span class="q-badge">Câu 1</span>
        <span>Thẻ HTML nào dùng để tạo danh sách có thứ tự?</span>
      </div>
      <div class="options-group">
        <label class="opt-label">
          <input type="radio" name="q1" value="ul">
          <span>A. &lt;ul&gt;</span>
        </label>
        <label class="opt-label">
          <input type="radio" name="q1" value="ol">
          <span>B. &lt;ol&gt;</span>
        </label>
        <label class="opt-label">
          <input type="radio" name="q1" value="li">
          <span>C. &lt;li&gt;</span>
        </label>
        <label class="opt-label">
          <input type="radio" name="q1" value="dl">
          <span>D. &lt;dl&gt;</span>
        </label>
      </div>
    </section>

    <!-- Câu hỏi 2: Tự luận nhập mã -->
    <section class="card-question">
      <div class="q-title">
        <span class="q-badge">Câu 2</span>
        <span>Viết mã CSS để căn giữa một phần tử block theo chiều ngang:</span>
      </div>
      <textarea id="q2-input" placeholder="Nhập mã CSS của bạn vào đây..." rows="4"></textarea>
    </section>
  </main>

  <!-- Nút nộp bài trực tiếp trong trang -->
  <footer class="exam-footer">
    <button id="btn-submit" type="button" class="btn-submit">Nộp bài ngay</button>
  </footer>
</div>`;

const DEFAULT_CSS_TEMPLATE = `/* GIAO DIỆN RIÊNG BIỆT CHO TRANG CODE */
body {
  margin: 0;
  padding: 24px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1e293b;
}

.exam-container {
  max-width: 800px;
  margin: 0 auto;
}

.exam-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.exam-header h1 {
  font-size: 22px;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.card-question {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.q-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.q-badge {
  background: #3b82f6;
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opt-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.15s ease;
}

.opt-label:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-family: monospace;
  font-size: 13px;
}

.exam-footer {
  text-align: center;
  margin-top: 32px;
}

.btn-submit {
  background: #2563eb;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(37,99,235,0.2);
}

.btn-submit:hover {
  background: #1d4ed8;
}`;

const DEFAULT_JS_TEMPLATE = `// XỬ LÝ NỘP BÀI VÀ GỬI KẾT QUẢ VỀ HỆ THỐNG DKTEST
document.getElementById('btn-submit').addEventListener('click', function() {
  const selectedQ1 = document.querySelector('input[name="q1"]:checked');
  const ansQ1 = selectedQ1 ? selectedQ1.value : null;
  const ansQ2 = document.getElementById('q2-input').value.trim();

  let score = 0;
  const maxScore = 10;

  // Câu 1: ol là đúng (5 điểm)
  if (ansQ1 === 'ol') {
    score += 5;
  }

  // Câu 2: Chứa margin: 0 auto hoặc margin: auto (5 điểm)
  if (ansQ2.includes('margin') && (ansQ2.includes('auto') || ansQ2.includes('0 auto'))) {
    score += 5;
  }

  // Gửi sự kiện nộp bài lên giao diện DkTEST chứa iframe
  window.parent.postMessage({
    type: 'DKTEST_CODE_EXAM_SUBMIT',
    payload: {
      score: score,
      maxScore: maxScore,
      answers: {
        q1: ansQ1,
        q2: ansQ2
      }
    }
  }, '*');

  alert('Đã hoàn thành! Điểm số của bạn: ' + score + ' / ' + maxScore);
});`;

import CodeEditorWithSyntax from "../../components/code/CodeEditorWithSyntax";
import { Lock, Globe, Share2, Check } from "lucide-react";

export default function CodeExamBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [activeCodeTab, setActiveCodeTab] = useState<"html" | "css" | "js" | "settings">("html");
  const [examTitle, setExamTitle] = useState("Đề thi Lập trình Web & HTML/CSS/JS");
  const [examCode, setExamCode] = useState("CODE-WEB-01");
  const [timeLimit, setTimeLimit] = useState(0); // 0 = Vô hạn (mặc định vô hạn)
  const [description, setDescription] = useState("Đề thi tương tác đặc biệt được lập trình hoàn toàn bằng HTML, CSS và JavaScript.");

  // Public / Private Settings
  const [isPublic, setIsPublic] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML_TEMPLATE);
  const [cssContent, setCssContent] = useState(DEFAULT_CSS_TEMPLATE);
  const [jsContent, setJsContent] = useState(DEFAULT_JS_TEMPLATE);
  const [solutionInstructions, setSolutionInstructions] = useState("Câu 1: Thẻ <ol> tạo danh sách đánh số.\nCâu 2: Dùng margin: 0 auto.");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);

  // Load existing exam if editing
  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const item = await getCodeExam(id);
        if (item) {
          setExamTitle(item.title);
          setExamCode(item.code);
          setTimeLimit(typeof item.timeLimit === "number" ? item.timeLimit : 0);
          setDescription(item.description || "");
          setIsPublic(item.isPublic ?? true);
          setAccessCode(item.accessCode || "");
          setHtmlContent(item.htmlContent);
          setCssContent(item.cssContent);
          setJsContent(item.jsContent);
          setSolutionInstructions(item.solutionInstructions || "");
        }
      } catch (err) {
        console.error("Lỗi khi tải đề thi CODE:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  // Combined code document for preview
  const previewDocument = useMemo(() => {
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${cssContent}</style>
  </head>
  <body>
    ${htmlContent}
    <script>${jsContent}<\/script>
  </body>
</html>`;
  }, [htmlContent, cssContent, jsContent]);

  // Handle Save
  const handleSave = async (status: "published" | "draft" = "published") => {
    if (!examTitle.trim()) {
      showErrorToast("Vui lòng nhập tiêu đề cho đề thi CODE!");
      return;
    }

    setIsSaving(true);
    try {
      const examId = id || `code_exam_${Date.now()}`;
      await saveCodeExam({
        id: examId,
        title: examTitle.trim(),
        code: examCode.trim() || `CODE-${Date.now().toString().slice(-4)}`,
        description,
        timeLimit: Number(timeLimit) >= 0 ? Number(timeLimit) : 0,
        htmlContent,
        cssContent,
        jsContent,
        solutionInstructions,
        status,
        isPublic,
        accessCode: isPublic ? "" : accessCode.trim(),
      });

      showSuccessToast(status === "published" ? "Đã xuất bản đề thi CODE thành công!" : "Đã lưu bản nháp đề thi CODE!");
      if (!id) {
        navigate(`/admin/code-exam/edit/${examId}`, { replace: true });
      }
    } catch (err: any) {
      showErrorToast("Lỗi khi lưu đề thi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentShareLink = typeof window !== "undefined" && id ? `${window.location.origin}/code-exam/${id}` : "";

  const handleCopyShareLink = () => {
    if (!currentShareLink) {
      showErrorToast("Vui lòng lưu đề thi trước khi sao chép liên kết!");
      return;
    }
    navigator.clipboard.writeText(currentShareLink);
    setCopiedLink(true);
    showSuccessToast("Đã sao chép link làm bài thi CODE!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Navigation & Actions Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/exams"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Quay lại danh sách đề thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Tiêu đề đề thi CODE..."
                className="bg-transparent font-bold text-sm sm:text-base text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 outline-hidden px-1"
              />
              <span className="text-[11px] text-slate-400 block px-1">
                Phân hệ đề thi độc lập (HTML-CSS-JS Custom Sandbox)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {id && (
            <>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sao chép link gửi cho thí sinh"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Đã chép link!" : "Sao chép link"}</span>
              </button>

              <Link
                to={`/code-exam/${id}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Làm thử bài</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu nháp</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSaving ? "Đang lưu..." : "Xuất bản đề thi CODE"}</span>
          </button>
        </div>
      </header>

      {/* Main Split Container: Left Code Tabs, Right Live Iframe Preview */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left Column: Code Editor Tabs */}
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
          {/* Code Tabs Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveCodeTab("html")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCodeTab === "html"
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-orange-400" />
                <span>index.html</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab("css")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCodeTab === "css"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                <span>style.css</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab("js")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCodeTab === "js"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-yellow-400" />
                <span>script.js</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab("settings")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCodeTab === "settings"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cài đặt & Gửi link</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
              Tô màu cú pháp Prism.js
            </span>
          </div>

          {/* Active Tab Editor Body */}
          <div className="flex-1 overflow-hidden p-3 flex flex-col">
            {activeCodeTab === "html" && (
              <CodeEditorWithSyntax
                value={htmlContent}
                onChange={setHtmlContent}
                language="html"
                placeholder="Nhập mã HTML tại đây..."
              />
            )}

            {activeCodeTab === "css" && (
              <CodeEditorWithSyntax
                value={cssContent}
                onChange={setCssContent}
                language="css"
                placeholder="Nhập mã CSS tại đây..."
              />
            )}

            {activeCodeTab === "js" && (
              <CodeEditorWithSyntax
                value={jsContent}
                onChange={setJsContent}
                language="javascript"
                placeholder="Nhập mã JavaScript tại đây..."
              />
            )}

            {activeCodeTab === "settings" && (
              <div className="flex-1 overflow-y-auto space-y-4 p-2 text-xs">
                {/* Sharing Link Box */}
                <div className="p-3.5 bg-slate-900 border border-indigo-500/30 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                      <Share2 className="w-4 h-4 text-indigo-400" />
                      Liên kết làm bài cho thí sinh:
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                      Gửi link trực tiếp
                    </span>
                  </div>
                  {id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={currentShareLink}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs select-all outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Đã chép" : "Sao chép"}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-xs">
                      Vui lòng bấm <strong>"Lưu nháp"</strong> hoặc <strong>"Xuất bản"</strong> để tạo liên kết làm bài thi chính thức.
                    </p>
                  )}
                </div>

                {/* Public vs Private Setting */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5 text-sm">
                    {isPublic ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                    Chế độ truy cập đề thi:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isPublic
                          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-white">Công khai (Public)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Bất kỳ thí sinh nào có link đều có thể mở và làm bài thi ngay lập tức.</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        !isPublic
                          ? "bg-amber-950/30 border-amber-500/50 text-amber-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-white">Không công khai (Private)</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Yêu cầu mã truy cập / mật khẩu trước khi thí sinh được phép vào làm bài.</div>
                      </div>
                    </button>
                  </div>

                  {!isPublic && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <label className="font-bold text-slate-300">Mật khẩu làm bài thi (Access Code):</label>
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Nhập mã truy cập (ví dụ: 123456 hoặc CODE2027)..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-mono text-xs focus:border-amber-500 outline-hidden"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Mã đề thi:</label>
                  <input
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-300">Thời gian làm bài (phút):</label>
                    <button
                      type="button"
                      onClick={() => setTimeLimit(timeLimit === 0 ? 45 : 0)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        timeLimit === 0
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {timeLimit === 0 ? "∞ Đang đặt Vô hạn" : "Đặt Vô hạn"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                      placeholder="0 = Vô hạn thời gian"
                    />
                    {timeLimit === 0 && (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-2 rounded-xl shrink-0">
                        ∞ Vô hạn thời gian
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Nhập 0 hoặc bấm nút "Đặt Vô hạn" để không giới hạn thời gian làm bài của thí sinh.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Mô tả bài thi:</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Hướng dẫn giải / Ghi chú đáp án:</label>
                  <textarea
                    value={solutionInstructions}
                    onChange={(e) => setSolutionInstructions(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 resize-y font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Sandboxed IFrame Preview */}
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Xem trước màn hình thí sinh (Live Sandbox)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Sandbox iframe độc lập
            </span>
          </div>

          <div className="flex-1 bg-white p-0 overflow-hidden">
            <iframe
              title="Code Exam Live Sandbox Preview"
              srcDoc={previewDocument}
              sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
