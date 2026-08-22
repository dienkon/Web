import React from "react";
import {
  ShieldCheck,
  Lock,
  FileText,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Mail,
  Copy,
  Ban,
  UserCheck,
  Award,
} from "lucide-react";

export default function LegalPolicy() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold uppercase tracking-wider border border-white/15">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Văn Bản Pháp Lý & Điều Khoản Sử Dụng
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Chính Sách Bảo Mật, Quy Chế Thi & Bản Quyền DkTEST
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Hệ thống Khảo thí & Thi trực tuyến DkTEST cam kết đảm bảo tính trung thực, công bằng, bảo mật dữ liệu tuyệt đối và bảo hộ quyền sở hữu trí tuệ hợp pháp của tác giả đề thi cũng như nền tảng.
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Policy Item 1: Copyright */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              1. Quyền Sở Hữu Trí Tuệ & Bản Quyền
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bảo hộ nội dung đề thi và công nghệ độc quyền của DkTEST.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Toàn bộ cấu trúc đề thi, câu hỏi, thuật toán xáo đề và tài nguyên trên DkTEST thuộc quyền sở hữu độc quyền của tác giả / đơn vị khởi tạo.</span>
            </li>
            <li className="flex items-start gap-2">
              <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>Nghiêm cấm mọi hành vi sao chép, trích xuất dữ liệu tự động (scraping), thương mại hóa hoặc phát tán đề thi khi chưa có sự đồng ý bằng văn bản.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Hệ thống tự động đóng dấu Watermark bảo hộ bản quyền tác giả đối với từng bài làm thi của thí sinh.</span>
            </li>
          </ul>
        </div>

        {/* Policy Item 2: Privacy */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              2. Bảo Mật & An Toàn Dữ Liệu
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bảo vệ tuyệt đối thông tin cá nhân và kết quả bài thi.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Dữ liệu bài làm, nhật ký giám sát trực tiếp và điểm số được mã hóa an toàn trên hạ tầng Firebase Cloud Firestore.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Cam kết không chia sẻ, kinh doanh thông tin cá nhân của học sinh, phụ huynh hay giáo viên cho bất kỳ bên thứ ba nào.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Học sinh có quyền yêu cầu trích xuất hoặc xóa bỏ lịch sử làm bài theo quy định của chính sách quyền riêng tư.</span>
            </li>
          </ul>
        </div>

        {/* Policy Item 3: Anti-Cheat Regulations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              3. Quy Chế Thi & Chống Gian Lận
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Quy định nghiêm ngặt nhằm bảo đảm kết quả khảo thí trung thực.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Hệ thống chủ động giám sát trực tiếp hành vi rời tab, mất tập trung, mở cửa sổ phụ hoặc dùng công cụ tự động hóa.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Giám thị / Admin / Phụ huynh có toàn quyền tạm dừng bài thi để kiểm tra hoặc đình chỉ bài thi ngay lập tức khi phát hiện vi phạm.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Bài thi bị đình chỉ sẽ tự động nộp bài và đánh dấu điểm vi phạm quy chế trong hồ sơ khảo thí.</span>
            </li>
          </ul>
        </div>

        {/* Policy Item 4: Legal Disclaimer */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              4. Miễn Trừ Trách Nhiệm & Khiếu Nại
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Quy trình tiếp nhận và giải quyết khiếu nại bản quyền.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>DkTEST cung cấp công cụ tạo và quản lý đề thi cho giáo viên. Tác giả chịu trách nhiệm pháp lý về tính hợp pháp của nội dung do mình đăng tải.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Trường hợp phát hiện vi phạm bản quyền đề thi, vui lòng gửi phản hồi về bộ phận pháp chế để được gỡ bỏ trong vòng 24 giờ.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Contact Info */}
      <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            Dk
          </div>
          <div>
            <p className="font-bold text-slate-900">Ban Pháp Chế & Bản Quyền DkTEST</p>
            <p className="text-slate-500">Mọi thắc mắc và báo cáo vi phạm vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 font-bold text-slate-800 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
          <Mail className="w-4 h-4 text-blue-600" />
          <span>legal@dktest.edu.vn</span>
        </div>
      </div>
    </div>
  );
}
