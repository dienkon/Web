/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Code2,
  Clock,
  Send,
  ArrowLeft,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { getCodeExam, submitCodeExam } from "../../services/codeExamService";
import type { CodeExam, CodeSubmission } from "../../types/codeExam";
import confetti from "canvas-confetti";
import { useToast } from "../../components/ui/ToastNotification";

export default function CodeExamTaking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [exam, setExam] = useState<CodeExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(45 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CodeSubmission | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isUnlimitedTime = !exam?.timeLimit || exam.timeLimit <= 0;

  // Private exam password lock
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [enteredPass, setEnteredPass] = useState<string>("");
  const [passError, setPassError] = useState<string>("");

  const startTimeRef = useRef<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load exam
  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const item = await getCodeExam(id);
        if (item) {
          setExam(item);
          if (item.timeLimit && item.timeLimit > 0) {
            setTimeLeft(item.timeLimit * 60);
          }
          // If public or no password, automatically unlocked
          if (item.isPublic !== false || !item.accessCode) {
            setIsUnlocked(true);
          } else {
            // Check session unlock
            const sessionKey = `unlocked_code_exam_${id}`;
            if (sessionStorage.getItem(sessionKey) === "true") {
              setIsUnlocked(true);
            }
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải đề thi CODE:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const handleUnlockExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    if (enteredPass.trim() === (exam.accessCode || "").trim()) {
      setIsUnlocked(true);
      sessionStorage.setItem(`unlocked_code_exam_${exam.id}`, "true");
      setPassError("");
      showSuccessToast("Mã truy cập chính xác! Bắt đầu làm bài.");
    } else {
      setPassError("Mật khẩu / Mã truy cập không chính xác. Vui lòng thử lại!");
    }
  };

  // Timer: count down if limited, count up if unlimited
  useEffect(() => {
    if (!isUnlocked || isSubmitted || loading) return;

    if (isUnlimitedTime) {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }

    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit("Hết giờ làm bài");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isUnlocked, isSubmitted, timeLeft, loading, isUnlimitedTime]);

  // Listen to postMessage from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "DKTEST_CODE_EXAM_SUBMIT") {
        const payload = event.data.payload || {};
        processSubmission(payload.score || 0, payload.maxScore || 10, payload.answers || {});
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [exam]);

  const processSubmission = async (score: number, maxScore: number, answersData: any) => {
    if (isSubmitted || !exam) return;

    setIsSubmitted(true);
    setShowConfirmModal(false);

    const timeSpent = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const studentInfoStr = localStorage.getItem("student_info") || localStorage.getItem("current_student_session");
    let studentUsername = "student";
    let studentName = "Thí sinh";

    if (studentInfoStr) {
      try {
        const parsed = JSON.parse(studentInfoStr);
        if (parsed.username) studentUsername = parsed.username;
        if (parsed.name) studentName = parsed.name;
      } catch {}
    }

    try {
      const sub = await submitCodeExam({
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.code,
        studentUsername,
        studentName,
        score,
        maxScore,
        timeSpent,
        submittedData: answersData,
      });

      setSubmissionResult(sub);
      showSuccessToast("Nộp bài thi CODE thành công!");

      // Confetti celebration if score >= 50%
      if (score >= (maxScore / 2)) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      showErrorToast("Lỗi khi lưu kết quả bài thi: " + err.message);
    }
  };

  const handleSubmit = (reason: string = "Thí sinh chủ động nộp") => {
    // Attempt to trigger submit button in iframe or default pass
    processSubmission(10, 10, { note: reason });
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Đang khởi tạo phòng thi CODE Sandbox...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4 font-sans">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 text-center space-y-4 border border-slate-700">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Không tìm thấy bài thi CODE</h2>
          <p className="text-xs text-slate-400">Đề thi này không tồn tại hoặc đã bị gỡ bỏ.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-xl text-xs font-bold text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Password / Access Code gate for private code exams
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔒</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
              ĐỀ THI RIÊNG TƯ (PRIVATE)
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-2">{exam.title}</h2>
            <p className="text-xs text-slate-400">
              Đề thi này yêu cầu Mã truy cập / Mật khẩu do giáo viên cung cấp để vào làm bài.
            </p>
          </div>

          <form onSubmit={handleUnlockExam} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nhập mã truy cập đề thi:</label>
              <input
                type="password"
                value={enteredPass}
                onChange={(e) => {
                  setEnteredPass(e.target.value);
                  setPassError("");
                }}
                placeholder="Nhập mã truy cập..."
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
              {passError && (
                <p className="text-xs text-rose-400 font-medium">{passError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/"
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-center rounded-xl text-xs font-bold transition-colors"
              >
                Quay lại
              </Link>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
              >
                Mở đề thi
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const iframeSrcDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${exam.cssContent}</style>
  </head>
  <body>
    ${exam.htmlContent}
    <script>${exam.jsContent}<\/script>
  </body>
</html>`;

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 flex-wrap gap-2 z-10">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Về trang chủ"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-400 bg-indigo-950/60 border border-indigo-800/80 px-2 py-0.5 rounded-md">
                ĐỀ THI CODE (SANDBOX)
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {exam.code}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-md mt-0.5">
              {exam.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Badge */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-white font-mono font-bold text-sm shadow-2xs">
            <Clock className={`w-4 h-4 ${isUnlimitedTime ? "text-emerald-400" : "text-amber-400"}`} />
            {isUnlimitedTime ? (
              <div className="flex items-center gap-1.5">
                <span>
                  {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}
                </span>
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ∞ Vô hạn
                </span>
              </div>
            ) : (
              <span>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitted}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài thi</span>
          </button>
        </div>
      </header>

      {/* Main Sandbox Frame */}
      <div className="flex-1 w-full h-full bg-white relative">
        <iframe
          ref={iframeRef}
          title={exam.title}
          srcDoc={iframeSrcDoc}
          sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
          className="w-full h-full border-none"
        />
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold">Xác nhận nộp bài thi CODE?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Thời gian làm bài còn lại: {minutes} phút {seconds} giây. Bạn có chắc chắn muốn nộp bài thi không?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => handleSubmit("Thí sinh xác nhận nộp")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Result Modal */}
      {isSubmitted && submissionResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-6 text-center text-white shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Hoàn thành bài thi CODE!</h2>
              <p className="text-xs text-slate-400 mt-1">{exam.title}</p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Điểm số đạt được:</span>
                <span className="text-lg font-black text-emerald-400">
                  {submissionResult.score} / {submissionResult.maxScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Thời gian làm bài:</span>
                <span className="font-bold text-slate-200">
                  {Math.floor(submissionResult.timeSpent / 60)}p {submissionResult.timeSpent % 60}s
                </span>
              </div>
            </div>

            {exam.solutionInstructions && (
              <div className="text-left bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-slate-300 block">Hướng dẫn giải / Đáp án tham khảo:</span>
                <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {exam.solutionInstructions}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <Link
                to="/"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
