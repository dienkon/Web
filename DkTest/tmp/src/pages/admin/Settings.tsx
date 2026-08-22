import React, { useState, useEffect } from "react";
import {
  Lock,
  Sliders,
  ShieldAlert,
  Database,
  Download,
  Upload,
  Check,
  RefreshCw,
  Trash2,
  Save,
  CheckCircle2,
  KeyRound,
  FileCode,
} from "lucide-react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { useToast } from "../../components/ui/ToastNotification";

export default function Settings() {
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();
  const [activeTab, setActiveTab] = useState<"security" | "exam_defaults" | "anticheat" | "backup">("security");
  const [adminPassword, setAdminPassword] = useState("");
  const [currentSavedPassword, setCurrentSavedPassword] = useState("Dienkon");
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Exam defaults
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(45);
  const [defaultShuffleQuestions, setDefaultShuffleQuestions] = useState(true);
  const [defaultShuffleOptions, setDefaultShuffleOptions] = useState(true);
  const [defaultShuffleStatements, setDefaultShuffleStatements] = useState(true);
  const [defaultShowResults, setDefaultShowResults] = useState(true);

  // Anti-cheat defaults
  const [enableTabMonitor, setEnableTabMonitor] = useState(true);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [autoSubmitOnViolation, setAutoSubmitOnViolation] = useState(false);

  // Backup state
  const [isExporting, setIsExporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin_password") || "Dienkon";
    setCurrentSavedPassword(saved);

    const savedDefaults = localStorage.getItem("dktest_exam_defaults");
    if (savedDefaults) {
      try {
        const parsed = JSON.parse(savedDefaults);
        if (parsed.defaultTimeLimit) setDefaultTimeLimit(parsed.defaultTimeLimit);
        if (parsed.defaultShuffleQuestions !== undefined) setDefaultShuffleQuestions(parsed.defaultShuffleQuestions);
        if (parsed.defaultShuffleOptions !== undefined) setDefaultShuffleOptions(parsed.defaultShuffleOptions);
        if (parsed.defaultShuffleStatements !== undefined) setDefaultShuffleStatements(parsed.defaultShuffleStatements);
        if (parsed.defaultShowResults !== undefined) setDefaultShowResults(parsed.defaultShowResults);
        if (parsed.enableTabMonitor !== undefined) setEnableTabMonitor(parsed.enableTabMonitor);
        if (parsed.maxWarnings !== undefined) setMaxWarnings(parsed.maxWarnings);
        if (parsed.autoSubmitOnViolation !== undefined) setAutoSubmitOnViolation(parsed.autoSubmitOnViolation);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const triggerSaveNotice = () => {
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 3000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      showErrorToast("Vui lòng nhập mật khẩu mới!");
      return;
    }
    localStorage.setItem("admin_password", adminPassword.trim());
    setCurrentSavedPassword(adminPassword.trim());
    setAdminPassword("");
    triggerSaveNotice();
    showSuccessToast("Đã cập nhật mật khẩu Admin thành công!");
  };

  const handleSaveExamDefaults = () => {
    const config = {
      defaultTimeLimit,
      defaultShuffleQuestions,
      defaultShuffleOptions,
      defaultShuffleStatements,
      defaultShowResults,
      enableTabMonitor,
      maxWarnings,
      autoSubmitOnViolation,
    };
    localStorage.setItem("dktest_exam_defaults", JSON.stringify(config));
    triggerSaveNotice();
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupMessage("Đang chuẩn bị gói sao lưu cơ sở dữ liệu...");
    try {
      // 1. Fetch exams
      const examsSnap = await getDocs(collection(db, "exams"));
      const exams = examsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. Fetch students
      const studentsSnap = await getDocs(collection(db, "students"));
      const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const backupData = {
        version: 3,
        system: "DkTEST",
        exportedAt: new Date().toISOString(),
        examsCount: exams.length,
        studentsCount: students.length,
        exams,
        students,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DkTEST_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setBackupMessage(`Xuất sao lưu thành công (${exams.length} đề thi, ${students.length} học sinh)`);
    } catch (e) {
      console.error(e);
      setBackupMessage("Lỗi khi xuất sao lưu dữ liệu.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAppCache = () => {
    sessionStorage.clear();
    showSuccessToast("Đã xóa bộ nhớ đệm thành công!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cài đặt hệ thống</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý mật khẩu quản trị, quy tắc xáo trộn đề thi, chế độ chống gian lận và sao lưu.
          </p>
        </div>

        {showSavedNotification && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Đã lưu thay đổi
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 p-3 space-y-1 bg-slate-50/50 shrink-0">
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Lock className="w-4 h-4" />
            Mật khẩu & Bảo mật
          </button>

          <button
            onClick={() => setActiveTab("exam_defaults")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "exam_defaults"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Mặc định Đề thi & Xáo trộn
          </button>

          <button
            onClick={() => setActiveTab("anticheat")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "anticheat"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Quy tắc Chống gian lận
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "backup"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            Sao lưu & Bảo trì
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 lg:p-8">
          {/* 1. Security & Admin Password */}
          {activeTab === "security" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-600" />
                  Mật khẩu Quản trị viên
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mật khẩu này được sử dụng khi đăng nhập vào hệ thống quản lý đề thi DkTEST.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mật khẩu hiện tại</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800">
                    {currentSavedPassword}
                  </span>
                  <span className="text-xs text-slate-400">(Mặc định ban đầu: Dienkon)</span>
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nhập mật khẩu quản trị mới
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  Đổi mật khẩu Admin
                </button>
              </form>
            </div>
          )}

          {/* 2. Exam Defaults & Detailed Shuffling */}
          {activeTab === "exam_defaults" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  Cấu hình mặc định khi tạo Đề thi
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Các cài đặt này sẽ được tự động áp dụng làm mẫu khi bạn tạo đề thi mới.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100">
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Thời gian làm bài mặc định</label>
                    <p className="text-xs text-slate-500">Thời lượng tính theo phút khi tạo bài thi mới</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={defaultTimeLimit}
                      onChange={(e) => setDefaultTimeLimit(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500">phút</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Tự động xáo trộn câu hỏi</label>
                    <p className="text-xs text-slate-500">Mỗi học sinh nhận được thứ tự câu hỏi ngẫu nhiên</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={defaultShuffleQuestions}
                    onChange={(e) => setDefaultShuffleQuestions(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Tự động xáo trộn phương án đáp án (A, B, C, D)</label>
                    <p className="text-xs text-slate-500">Đảo vị trí các phương án trắc nghiệm lựa chọn</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={defaultShuffleOptions}
                    onChange={(e) => setDefaultShuffleOptions(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Tự động xáo trộn mệnh đề Đúng/Sai</label>
                    <p className="text-xs text-slate-500">Đảo vị trí các ý a, b, c, d trong dạng câu Đúng/Sai</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={defaultShuffleStatements}
                    onChange={(e) => setDefaultShuffleStatements(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Hiển thị điểm & kết quả sau khi nộp</label>
                    <p className="text-xs text-slate-500">Cho phép học sinh xem điểm số ngay khi bấm nộp bài</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={defaultShowResults}
                    onChange={(e) => setDefaultShowResults(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveExamDefaults}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  Lưu cấu hình mặc định
                </button>
              </div>
            </div>
          )}

          {/* 3. Anti-cheat rules */}
          {activeTab === "anticheat" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Quy tắc Giám sát & Chống gian lận
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Giám sát hành vi thí sinh trong quá trình thực hiện bài làm trực tuyến.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100">
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Theo dõi chuyển Tab & Rời màn hình</label>
                    <p className="text-xs text-slate-500">
                      Ghi nhận và hiển thị cảnh báo đỏ khi thí sinh mở tab khác hoặc ứng dụng khác
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableTabMonitor}
                    onChange={(e) => setEnableTabMonitor(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Số lần cảnh báo tối đa cho phép</label>
                    <p className="text-xs text-slate-500">
                      Số lần vi phạm được lưu trong kết quả bài nộp của thí sinh
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxWarnings}
                    onChange={(e) => setMaxWarnings(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Tự động nộp bài khi vượt số lần vi phạm</label>
                    <p className="text-xs text-slate-500">Khóa bài thi và tính điểm ngay lập tức nếu vi phạm quá số lần</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSubmitOnViolation}
                    onChange={(e) => setAutoSubmitOnViolation(e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveExamDefaults}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  Lưu quy tắc chống gian lận
                </button>
              </div>
            </div>
          )}

          {/* 4. Backup & Maintenance */}
          {activeTab === "backup" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Sao lưu & Phục hồi cơ sở dữ liệu
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Xuất toàn bộ đề thi, câu hỏi và học sinh sang tệp JSON an toàn.
                </p>
              </div>

              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  Xuất bản sao lưu toàn hệ thống (.JSON)
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tải về một tệp duy nhất chứa danh sách toàn bộ đề thi, các phần thi, câu hỏi, phương án đáp án và thông tin học sinh để lưu trữ ngoại tuyến hoặc chuyển máy chủ.
                </p>
                <button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  {isExporting ? "Đang xuất sao lưu..." : "Tải tệp sao lưu JSON"}
                </button>
                {backupMessage && (
                  <p className="text-xs font-medium text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
                    {backupMessage}
                  </p>
                )}
              </div>

              <div className="p-5 border border-amber-200 rounded-2xl bg-amber-50/40 space-y-3">
                <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-amber-600" />
                  Xóa bộ nhớ đệm cục bộ
                </h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Làm mới bộ nhớ đệm trình duyệt, xóa các dữ liệu nháp tạm thời nếu gặp lỗi hiển thị.
                </p>
                <button
                  onClick={handleClearAppCache}
                  className="px-4 py-2 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-2xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  Xóa Cache trình duyệt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
