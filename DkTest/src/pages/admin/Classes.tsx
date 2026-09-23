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
} from "lucide-react";
import { fetchAdminUsers } from "../../services/adminService";
import type { UserProfile } from "../../types";
import { useToast } from "../../components/ui/ToastNotification";

interface ClassStat {
  className: string;
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
}

export default function Classes() {
  const { showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classMap, setClassMap] = useState<Record<string, ClassStat>>({});
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<UserProfile[]>([]);

  useEffect(() => {
    const loadClassData = async () => {
      setLoading(true);
      try {
        const data = await fetchAdminUsers({ limit: 500, role: "student" });
        const items = (data.items || []) as UserProfile[];

        const map: Record<string, ClassStat> = {};
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

        setClassMap(map);
      } catch (err: any) {
        showErrorToast(err.message || "Không thể tải dữ liệu lớp học.");
      } finally {
        setLoading(false);
      }
    };

    loadClassData();
  }, []);

  const handleSelectClass = async (cName: string) => {
    setSelectedClass(cName);
    try {
      const data = await fetchAdminUsers({
        limit: 100,
        role: "student",
        class: cName === "Chưa phân lớp" ? "" : cName,
      });
      setClassStudents(data.items || []);
    } catch (e) {}
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

      {/* Selected Class Drill-down Table */}
      {selectedClass && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">
              Danh sách học sinh lớp: <span className="text-indigo-600">{selectedClass}</span> ({classStudents.length})
            </h3>
            <button
              onClick={() => setSelectedClass(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Đóng lại
            </button>
          </div>

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
        </div>
      )}
    </div>
  );
}
