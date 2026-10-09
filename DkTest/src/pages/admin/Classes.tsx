import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Users,
  FileText,
  TrendingUp,
  Award,
  Search,
  ExternalLink,
  Loader2,
  ChevronRight,
  Plus,
  Calendar,
  Trash2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { fetchAdminUsers, fetchAdminStats } from "../../services/adminService";
import {
  fetchAssignments,
  createAssignment,
  deleteAssignment,
  toggleAssignmentStatus,
  type ClassAssignment,
} from "../../services/assignmentService";
import { getExamList } from "../../services/examService";
import type { UserProfile, Exam } from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

interface ClassStat {
  className: string;
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
}

export default function Classes() {
  const { showErrorToast, showSuccessToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classMap, setClassMap] = useState<Record<string, ClassStat>>({});
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<UserProfile[]>([]);
  const [classStudentLimit, setClassStudentLimit] = useState(5);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [hasMoreStudents, setHasMoreStudents] = useState(true);

  // Homework Assignments States
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [assignPassingScore, setAssignPassingScore] = useState(5.0);

  const loadAssignmentsForClass = async (cName: string) => {
    try {
      const list = await fetchAssignments(cName);
      setAssignments(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getExamList({ pageSize: 50 }).then((res) => {
      const published = (res.items || []).filter((x) => x.status === "published");
      setAvailableExams(published);
      if (published.length > 0) {
        setSelectedExamId(published[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loadClassData = async () => {
      setLoading(true);
      try {
        // Step 1: Read pre-aggregated overview (1 single doc read)
        const stats = await fetchAdminStats();
        const dist = stats.studentStats?.classDistribution || {};

        const map: Record<string, ClassStat> = {};
        Object.entries(dist).forEach(([cName, count]) => {
          map[cName] = {
            className: cName,
            totalStudents: Number(count) || 0,
            activeStudents: Number(count) || 0,
            pendingStudents: 0,
          };
        });

        // Fallback: If no classDistribution exists yet in system_stats
        if (Object.keys(map).length === 0) {
          const data = await fetchAdminUsers({ limit: 50, role: "student" });
          const items = (data.items || []) as UserProfile[];
          items.forEach((s) => {
            const cName = s.studentClass?.trim() || "Chưa phân lớp";
            if (!map[cName]) {
              map[cName] = {
                className: cName,
                totalStudents: 0,
                activeStudents: 0,
                pendingStudents: 0,
              };
            }
            map[cName].totalStudents++;
            if (s.accountStatus === "active") map[cName].activeStudents++;
            if (s.accountStatus === "pending") map[cName].pendingStudents++;
          });
        }

        setClassMap(map);
      } catch (err: any) {
        showErrorToast(err.message || "Không thể tải dữ liệu lớp học.");
      } finally {
        setLoading(false);
      }
    };

    loadClassData();
  }, []);

  const handleSelectClass = async (cName: string, customLimit = 5) => {
    setSelectedClass(cName);
    setClassStudentLimit(customLimit);
    setLoadingStudents(true);
    loadAssignmentsForClass(cName);
    try {
      const data = await fetchAdminUsers({
        limit: customLimit,
        role: "student",
        class: cName === "Chưa phân lớp" ? "" : cName,
      });
      const items = data.items || [];
      setClassStudents(items);
      setHasMoreStudents(items.length >= customLimit);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedClass) return;
    const exam = availableExams.find((x) => x.id === selectedExamId);
    if (!exam) return;

    try {
      await createAssignment({
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.code,
        targetClass: selectedClass,
        dueDate: assignDueDate,
        passingScore: assignPassingScore,
        createdBy: "admin",
        status: "open",
      });
      showSuccessToast(`Đã giao bài thi "${exam.title}" cho lớp ${selectedClass}!`);
      setShowAssignModal(false);
      loadAssignmentsForClass(selectedClass);
    } catch {
      showErrorToast("Giao bài tập thất bại.");
    }
  };

  const handleToggleStatus = async (id: string) => {
    await toggleAssignmentStatus(id);
    if (selectedClass) loadAssignmentsForClass(selectedClass);
    showSuccessToast("Đã cập nhật trạng thái bài tập!");
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;
    await deleteAssignment(id);
    if (selectedClass) loadAssignmentsForClass(selectedClass);
    showSuccessToast("Đã xóa bài tập!");
  };

  const handleLoadMoreStudents = () => {
    if (!selectedClass) return;
    const nextLimit = classStudentLimit + 5;
    handleSelectClass(selectedClass, nextLimit);
  };

  const classesList = Object.values(classMap).filter((c) =>
    c.className.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-indigo-600" />
          <span>Thống Kê Theo Lớp Học</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Theo dõi số lượng học sinh, mức độ hoạt động và phân bổ khảo thí theo từng lớp
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp (VD: 10A1, 12A2)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          <span className="text-xs">Đang tổng hợp dữ liệu lớp học...</span>
        </div>
      ) : classesList.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Chưa có dữ liệu lớp học nào phù hợp
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classesList.map((cls) => (
            <div
              key={cls.className}
              onClick={() => handleSelectClass(cls.className)}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                  {cls.className.slice(0, 3)}
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                  Chi tiết <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Lớp {cls.className}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng cộng: <strong className="text-slate-800">{cls.totalStudents}</strong> học sinh
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 block">Đang hoạt động</span>
                  <span className="text-sm font-black text-emerald-700">{cls.activeStudents}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 block">Chờ phê duyệt</span>
                  <span className="text-sm font-black text-amber-700">{cls.pendingStudents}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Class Drill-down Table & Assignments */}
      {selectedClass && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Chi tiết lớp: <span className="text-indigo-600">{selectedClass}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý bài tập về nhà và hồ sơ học sinh trong lớp
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Giao bài tập về nhà</span>
              </button>
              <button
                onClick={() => setSelectedClass(null)}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>

          {/* Assignments Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Bài tập đã giao ({assignments.length})</span>
            </h4>

            {assignments.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                Chưa có bài tập nào được giao cho lớp {selectedClass}. Hãy bấm &ldquo;Giao bài tập về nhà&rdquo; để thêm mới.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignments.map((asgn) => (
                  <div
                    key={asgn.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {asgn.examTitle}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          asgn.status === "open"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {asgn.status === "open" ? "Đang mở" : "Đã khóa"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Hạn: {asgn.dueDate || "Không giới hạn"}
                      </span>
                      <span>Điểm đạt: {asgn.passingScore} đ</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(asgn.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {asgn.status === "open" ? "Khóa bài" : "Mở lại"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(asgn.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                        title="Xóa bài tập"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Students List Section */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Danh sách học sinh ({classStudents.length})</span>
            </h4>

            <div className="divide-y divide-slate-100 text-xs">
              {classStudents.map((s) => (
                <div key={s.uid} className="py-2.5 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/admin/users/${s.uid}`}
                      className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {s.displayName || "Học sinh"}
                    </Link>
                    <p className="text-[10px] text-slate-400">{s.email || s.uid}</p>
                  </div>
                  <Link
                    to={`/admin/users/${s.uid}`}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-colors"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              ))}
            </div>

            {hasMoreStudents && classStudents.length >= classStudentLimit && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMoreStudents}
                  disabled={loadingStudents}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-indigo-200 disabled:opacity-50"
                >
                  {loadingStudents ? "Đang tải thêm..." : "Tải thêm 5 học sinh"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Homework Modal */}
      {showAssignModal && selectedClass && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Giao Bài Tập - Lớp {selectedClass}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Chọn đề thi để giao</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  required
                >
                  {availableExams.length === 0 ? (
                    <option value="">Chưa có bài thi nào được xuất bản</option>
                  ) : (
                    availableExams.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title} ({x.code || "EXAM"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Hạn chót nộp bài</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Điểm tối thiểu để Đạt</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={assignPassingScore}
                  onChange={(e) => setAssignPassingScore(Number(e.target.value) || 5.0)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={availableExams.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  Xác nhận giao bài
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
