import { useState, useEffect } from "react";
import { getStudentList, updateStudent, deleteStudent } from "../../services/studentService";
import type { Student } from "../../types";
import { Search, Edit, Trash2, X, Save, AlertTriangle } from "lucide-react";
import { formatDate } from "../../utils/date";
import { useToast } from "../../components/ui/ToastNotification";

export default function Students() {
  const { showToast, error: showErrorToast, success: showSuccessToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      
      const currentCursor = reset ? null : cursor;
      const result = await getStudentList({ pageSize: 5, cursor: currentCursor, searchQuery });
      
      setStudents(prev => reset ? result.items : [...prev, ...result.items]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(true);
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setEditName(student.name || "");
    setEditEmail(student.email || "");
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      await updateStudent(editingStudent.id, {
        name: editName,
        email: editEmail,
      });
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, name: editName, email: editEmail } : s));
      setEditingStudent(null);
      showSuccessToast("Cập nhật thông tin học sinh thành công!");
    } catch (e) {
      console.error("Lỗi cập nhật:", e);
      showErrorToast("Lỗi khi cập nhật thông tin học sinh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setIsSubmitting(true);
    try {
      await deleteStudent(deletingStudent.id);
      setStudents(prev => prev.filter(s => s.id !== deletingStudent.id));
      setDeletingStudent(null);
      showSuccessToast("Đã xóa học sinh và các dữ liệu liên quan thành công!");
    } catch (e) {
      console.error("Lỗi xóa:", e);
      showErrorToast("Lỗi khi xóa học sinh.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Tìm theo tên học sinh..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
        {loading && students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Đang tải danh sách học sinh...</div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center">
            <h3 className="text-lg font-medium text-slate-900 mb-1">Không tìm thấy học sinh</h3>
            <p className="text-slate-500">Chưa có dữ liệu hoặc không khớp với từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-6 py-4">Họ và Tên</th>
                  <th className="px-6 py-4">Tài khoản (Username)</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Ngày tham gia</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{student.name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {student.username || <span className="text-slate-400 italic">Không có</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.email || <span className="text-slate-400 italic">Không có</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleEditClick(student)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingStudent(student)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa học sinh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <div className="h-14 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
            <button 
              onClick={() => loadData(false)}
              disabled={loading}
              className="px-4 py-1.5 bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Xem thêm"}
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Chỉnh sửa học sinh</h3>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tài khoản (Username)</label>
                <input 
                  type="text" 
                  value={editingStudent.username || ""} 
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button 
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Xác nhận xóa?</h3>
              <p className="text-sm text-slate-500">
                Bạn có chắc chắn muốn xóa học sinh <strong>{deletingStudent.name}</strong> không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button 
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Xóa học sinh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
