import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  Lock,
  Paperclip,
  Play,
  ShieldAlert,
  Sparkles,
  WifiOff,
  Link2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loadOfflineExam, countOfflineAttempts } from '../../services/offline/exams';
import { offlineStore, type OfflineExam } from '../../services/offline/store';
import { resolveOfflineUrl } from '../../services/offline/media';
import { hasActiveExamInProgress, hydrateActiveExamSession } from '../../services/examSessionService';
import StudentSubExamConfig from '../../features/sub-exam/components/StudentSubExamConfig';
import { buildSubExamAttempt } from '../../features/sub-exam/engine/buildSubExamAttempt';
import type { SubExamConfig } from '../../features/sub-exam/types/subExam';
import CopyExamCode from '../../components/exam/CopyExamCode';
import ExamPreExamSolutionPreviewModal from '../../components/exam/ExamPreExamSolutionPreviewModal';

export default function OfflineExamSetup() {
  const { examId = '' } = useParams();
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [pack, setPack] = useState<OfflineExam>();
  const [useSubExam, setUseSubExam] = useState(false);
  const [config, setConfig] = useState<SubExamConfig>({ enabled: false, selectionMode: 'by_type' });
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [showSolutionPreviewModal, setShowSolutionPreviewModal] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    void (async () => {
      const value = await loadOfflineExam(examId);
      if (!active) return;
      if (!value) {
        setError('Đề chưa được tải vào tài khoản này.');
        return;
      }
      const draft = await offlineStore.getDraft(user.uid, examId);
      if (!active) return;
      if (draft) hydrateActiveExamSession(draft.session);
      setResuming(!!hasActiveExamInProgress(examId, true));
      setPack(value);
      const used = await countOfflineAttempts(value);
      if (active) {
        setAttempts(used);
        setConfig({ selectionMode: 'by_type', ...value.exam.subExamConfig, enabled: false });
      }
    })().catch(() => {
      if (active) setError('Không đọc được đề trên thiết bị.');
    });
    return () => {
      active = false;
    };
  }, [user?.uid, examId]);

  const selectedCount = useMemo(
    () =>
      pack
        ? useSubExam
          ? buildSubExamAttempt(pack.exam, pack.questions, pack.sections, { ...config, enabled: true }).questions.length
          : pack.questions.length
        : 0,
    [pack, config, useSubExam]
  );

  const preSubmitAttachments = useMemo(() => {
    if (!pack?.exam?.attachments || pack.exam.attachments.length === 0) return [];
    if (!pack.exam.showAttachmentsBeforeSubmit) return [];
    return pack.exam.attachments.filter((att) => att.showBeforeSubmit !== false);
  }, [pack]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Đang mở tài khoản…</p>
        </div>
      </div>
    );
  }

  if (!user || userProfile?.role !== 'student') {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vui lòng đăng nhập đúng tài khoản học sinh đã tải đề thi này.
        </p>
        <Link className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold" to="/login">
          Đăng nhập tài khoản đã tải đề
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const isNotOpenYet = Boolean(pack?.exam.openTime && Date.parse(pack.exam.openTime) > now);
  const isClosed = Boolean(pack?.exam.closeTime && Date.parse(pack.exam.closeTime) <= now);
  const isAttemptLimitReached = Boolean(pack?.exam.maxAttempts && pack.exam.maxAttempts > 0 && attempts >= pack.exam.maxAttempts);
  const isExamBlocked = !resuming && (isNotOpenYet || isClosed || isAttemptLimitReached);

  const handleStartOfflineExam = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pack) return;
    setError('');
    if (!resuming) {
      if (isNotOpenYet) return setError(`Chưa đến thời gian mở đề (${formatDateTime(pack.exam.openTime)}).`);
      if (isClosed) return setError('Đề đã đóng nhận bài.');
      if (isAttemptLimitReached) return setError('Bạn đã hết lượt làm bài của đề này.');
      if (pack.exam.password && password !== pack.exam.password) return setError('Mật khẩu đề thi không chính xác.');
      if (!acceptedTerms) return setError('Vui lòng tích cam kết làm bài nghiêm túc.');
      if (selectedCount === 0) return setError('Đề thi chưa có câu hỏi phù hợp.');
      try {
        localStorage.setItem(
          `custom_sub_exam_config_${examId}`,
          JSON.stringify({ ownerUid: user.uid, useSubExam, config: { ...config, enabled: useSubExam } })
        );
      } catch {
        return setError('Không lưu được cấu hình trên thiết bị. Kiểm tra dung lượng máy.');
      }
    }
    navigate(`/student/exam/${examId}/take?offline=1`);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 py-6 sm:py-10 px-4 flex flex-col items-center justify-center pb-24">
      <div className="max-w-2xl w-full space-y-5">
        <div className="flex items-center justify-between">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            to="/student/offline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Đề thi trên máy</span>
          </Link>
        </div>

        {!pack ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Thiết lập bài thi offline</h1>
            {error ? (
              <p role="alert" className="text-sm text-rose-600 font-semibold">
                {error}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Đang nạp gói đề đã lưu trên thiết bị...</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {/* Banner (Matching Online ExamIntro) */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 lg:p-8 text-white">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyExamCode
                    code={pack.exam.code}
                    className="text-[11px] font-mono font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full backdrop-blur-xs"
                  />
                  <span className="text-[11px] font-bold bg-emerald-500/30 text-emerald-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    <span>SẴN SÀNG THI OFFLINE</span>
                  </span>
                </div>
                <span className="text-[11px] text-blue-100/80 font-medium">
                  Đã tải {new Date(pack.downloadedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
                {pack.exam.title}
              </h1>
              {pack.exam.description && (
                <p className="text-blue-100/80 text-xs sm:text-sm mt-2 line-clamp-2">{pack.exam.description}</p>
              )}
            </div>

            <div className="p-6 lg:p-8 space-y-6">
              {/* Quick Metrics Grid (Matching Online ExamIntro) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 font-semibold block">Thời gian thi</span>
                  <span
                    className={`text-base font-extrabold ${
                      pack.exam.isUnlimitedTime || pack.exam.unlimitedTime || pack.exam.timeLimit === 0
                        ? 'text-emerald-600'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {pack.exam.isUnlimitedTime || pack.exam.unlimitedTime || pack.exam.timeLimit === 0
                      ? 'Không giới hạn'
                      : `${pack.exam.timeLimit || pack.exam.duration || 45} phút`}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <FileText className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 font-semibold block">Số lượng câu</span>
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {pack.questions.length} câu
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <Layers className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 font-semibold block">Số lần làm</span>
                  <span
                    className={`text-base font-extrabold ${
                      isAttemptLimitReached ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {pack.exam.maxAttempts && pack.exam.maxAttempts > 0
                      ? `${attempts}/${pack.exam.maxAttempts}`
                      : 'Vô hạn'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 font-semibold block">Chống gian lận</span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 block mt-1">
                    {pack.exam.antiCheatEnabled ? 'Đang kích hoạt' : 'Chế độ tự luyện'}
                  </span>
                </div>
              </div>

              {/* Admin Enabled: Pre-exam Full Solution & Original Exam Preview (Identical to Online) */}
              {pack.exam.allowPreviewSolutionBeforeExam && (
                <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                        Xem Trước Đề Gốc & Lời Giải Chi Tiết
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
                        Giáo viên cho phép xem trước toàn bộ câu hỏi và đáp án trước khi bấm bắt đầu làm bài.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSolutionPreviewModal(true)}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Bấm vào để xem trước đề thi & lời giải chi tiết</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  </button>
                </div>
              )}

              {/* Pre-Submission Attachments from Teacher/Admin (Matching Online) */}
              {preSubmitAttachments.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        Tài liệu & Tệp đính kèm bài thi (Được phép xem trước)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tài liệu tham khảo, bảng công thức hoặc hướng dẫn làm bài do giáo viên cung cấp:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {preSubmitAttachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {att.type === 'link' ? (
                            <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <div className="truncate text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 mr-2">
                              {att.label || `Tài liệu ${idx + 1}:`}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              {att.type === 'link' ? att.url : att.fileName}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {att.type === 'link' ? (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> Mở link
                            </a>
                          ) : (
                            <a
                              href={resolveOfflineUrl(att.url || att.fileData)}
                              target="_blank"
                              rel="noreferrer"
                              download={att.fileName || `tailieu_${idx + 1}`}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Xem / Tải file
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Info */}
              {(pack.exam.openTime || pack.exam.closeTime) && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-around gap-2 text-xs font-medium">
                  {pack.exam.openTime && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">Thời gian mở đề:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatDateTime(pack.exam.openTime)}</strong>
                    </div>
                  )}
                  {pack.exam.openTime && pack.exam.closeTime && <span className="hidden sm:inline text-slate-300">|</span>}
                  {pack.exam.closeTime && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-semibold">Thời gian kết thúc:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{formatDateTime(pack.exam.closeTime)}</strong>
                    </div>
                  )}
                </div>
              )}

              {isNotOpenYet && !resuming && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Chưa đến thời gian mở đề thi</h4>
                    <p className="text-xs mt-1 text-amber-800">
                      Đề thi sẽ chính thức mở vào lúc <strong>{formatDateTime(pack.exam.openTime)}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {isClosed && !resuming && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Đề thi đã đóng nhận bài</h4>
                    <p className="text-xs mt-1 text-rose-800">
                      Thời gian kết thúc bài thi là <strong>{formatDateTime(pack.exam.closeTime)}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {isAttemptLimitReached && !resuming && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Đã hết số lần làm bài cho phép</h4>
                    <p className="text-xs mt-1 text-rose-800">
                      Bạn đã nộp bài <strong>{attempts}</strong> lần (Quy định tối đa: <strong>{pack.exam.maxAttempts}</strong> lần).
                    </p>
                  </div>
                </div>
              )}

              {/* Resuming or Sub-exam Configuration */}
              {resuming ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-4 rounded-2xl text-xs font-semibold">
                  Bạn có bài đang làm. Đề con, thứ tự câu hỏi và đồng hồ được giữ nguyên khi tiếp tục.
                </div>
              ) : (
                <div className="space-y-3">
                  {(pack.exam.allowSubExam || pack.exam.subExamConfig?.enabled) && (
                    <StudentSubExamConfig
                      useSubExam={useSubExam}
                      setUseSubExam={setUseSubExam}
                      config={config}
                      setConfig={setConfig}
                      questions={pack.questions}
                      sections={pack.sections}
                    />
                  )}
                  <p role="status" className="text-xs font-bold text-slate-600 dark:text-slate-300 px-1">
                    Bài sẽ có {selectedCount} câu hỏi.
                  </p>
                </div>
              )}

              {/* Rules & Notice */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-2 text-xs text-amber-950 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Quy chế làm bài thi Offline:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  <li>
                    Thí sinh tham gia: <strong>{userProfile.displayName || userProfile.username || 'Học sinh'}</strong>
                  </li>
                  <li>
                    Đồng hồ đếm ngược sẽ chạy ngay khi bạn nhấn <strong>"{resuming ? 'Tiếp tục bài đang làm' : 'Bắt đầu làm bài offline'}"</strong>.
                  </li>
                  <li>Câu trả lời được lưu liên tục trên thiết bị và tự động đồng bộ lên máy chủ khi có mạng.</li>
                </ul>
              </div>

              <form onSubmit={handleStartOfflineExam} className="space-y-4 pt-1">
                {!resuming && pack.exam.password && pack.exam.password.trim() !== '' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Mật khẩu phòng thi <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        aria-label="Mật khẩu đề thi"
                        type="password"
                        required
                        placeholder="Nhập mật khẩu do giáo viên cung cấp"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-xs text-rose-600 font-bold">
                    {error}
                  </p>
                )}

                {!resuming && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="offline-terms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="offline-terms" className="text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer">
                      Tôi đã sẵn sàng và cam kết làm bài nghiêm túc.
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!resuming && (!acceptedTerms || isExamBlocked || selectedCount === 0)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{resuming ? 'Tiếp tục bài đang làm' : 'Bắt đầu làm bài offline'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {showSolutionPreviewModal && pack && (
          <ExamPreExamSolutionPreviewModal
            exam={pack.exam}
            sections={pack.sections}
            questions={pack.questions}
            onClose={() => setShowSolutionPreviewModal(false)}
            onStartExam={() => handleStartOfflineExam()}
          />
        )}
      </div>
    </div>
  );
}
