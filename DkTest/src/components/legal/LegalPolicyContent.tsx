import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  FileText,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Mail,
  Ban,
  Wallet,
  Sparkles,
  BookOpen,
  UserCheck,
  Gavel,
  Clock,
  X,
  Check,
  Gift,
} from "lucide-react";

interface LegalSection {
  id: string;
  num: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  points: Array<{ kind: "ok" | "ban" | "warn"; text: string }>;
}

const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: "copyright",
    num: "Điều 1",
    shortTitle: "Bản quyền & SHTT",
    title: "1. Quyền Sở Hữu Trí Tuệ & Bản Quyền Nội Dung",
    subtitle: "Căn cứ Luật Sở hữu trí tuệ Việt Nam (sửa đổi, bổ sung năm 2022).",
    icon: <Scale className="w-5 h-5" />,
    accentBg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-800/60",
    accentText: "text-indigo-600 dark:text-indigo-400",
    points: [
      {
        kind: "ok",
        text: "Mã nguồn nền tảng, thiết kế giao diện, nhãn hiệu DkTEST, thuật toán xáo đề, hệ thống chấm điểm tự động và phần mềm Android/Web thuộc quyền sở hữu trí tuệ độc quyền của đội ngũ phát triển DkTEST.",
      },
      {
        kind: "ok",
        text: "Đề thi, ngân hàng câu hỏi, video bài giảng, tài liệu PDF và lời giải chi tiết thuộc quyền tác giả hợp pháp của giáo viên / quản trị viên / đơn vị đăng tải. Hệ thống hỗ trợ gắn dấu định danh (Watermark) chống sao chép trái phép.",
      },
      {
        kind: "ban",
        text: "Nghiêm cấm mọi hành vi quay màn hình phát tán thương mại, trích xuất dữ liệu tự động (crawl/scrape), chia sẻ tài khoản trả phí cho nhiều người dùng trái phép hoặc re-up đề thi/video khóa học lên nền tảng khác khi chưa có văn bản chấp thuận.",
      },
      {
        kind: "warn",
        text: "Các nhãn hiệu bên thứ ba (nếu được nhắc đến như Google, OpenAI, YouTube, Casio...) thuộc quyền sở hữu của chủ sở hữu tương ứng. DkTEST không đại diện pháp lý hay liên kết chính thức với các hãng này trừ khi có công bố riêng.",
      },
    ],
  },
  {
    id: "accounts",
    num: "Điều 2",
    shortTitle: "Tài khoản & Nghĩa vụ",
    title: "2. Đăng Ký Tài Khoản, Độ Tuổi & Nghĩa Vụ Người Dùng",
    subtitle: "Quy định quản lý định danh Học sinh, Phụ huynh và Quản trị viên.",
    icon: <UserCheck className="w-5 h-5" />,
    accentBg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-800/60",
    accentText: "text-blue-600 dark:text-blue-400",
    points: [
      {
        kind: "ok",
        text: "Người dùng cam kết cung cấp thông tin trung thực khi đăng ký (Họ tên, tên đăng nhập/email, số điện thoại liên hệ khi đặt dịch vụ) và tự chịu trách nhiệm bảo mật mật khẩu đăng nhập.",
      },
      {
        kind: "ok",
        text: "Học sinh dưới 16 tuổi khi tham gia sử dụng các dịch vụ có phát sinh thanh toán hoặc nạp tiền Ví DkTEST cần có sự đồng ý và giám sát của cha mẹ hoặc người giám hộ hợp pháp.",
      },
      {
        kind: "ban",
        text: "Nghiêm cấm tạo nhiều tài khoản ảo để trục lợi chương trình giới thiệu bạn bè (Referral), mã Voucher, Minigame phúc lợi hoặc tấn công gây quá tải hệ thống (spam, DDoS, khai thác lỗ hổng).",
      },
      {
        kind: "warn",
        text: "DkTEST có quyền tạm khóa hoặc chấm dứt vĩnh viễn tài khoản vi phạm nghiêm trọng mà không cần báo trước nhằm bảo vệ sự công bằng và an toàn chung của cộng đồng học tập.",
      },
    ],
  },
  {
    id: "privacy",
    num: "Điều 3",
    shortTitle: "Bảo mật dữ liệu",
    title: "3. Chính Sách Bảo Vệ Dữ Liệu Cá Nhân",
    subtitle: "Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.",
    icon: <Lock className="w-5 h-5" />,
    accentBg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-800/60",
    accentText: "text-emerald-600 dark:text-emerald-400",
    points: [
      {
        kind: "ok",
        text: "Phạm vi thu thập tối thiểu: họ tên, tên đăng nhập/email, lớp/trường (tự chọn), lịch sử làm bài thi, tiến độ khóa học, lịch sử giao dịch Ví DkTEST và thông tin liên hệ Zalo/email do người dùng chủ động điền khi mua dịch vụ.",
      },
      {
        kind: "ok",
        text: "Mục đích xử lý: xác thực tài khoản, chấm điểm, đồng bộ tiến độ học tập đa thiết bị, đối soát giao dịch hợp lệ, gửi thông báo kết quả/đơn hàng và phòng chống gian lận thi cử / trục lợi hệ thống.",
      },
      {
        kind: "ban",
        text: "DkTEST tuyệt đối KHÔNG lưu mật khẩu tài khoản dịch vụ bên thứ ba của khách hàng, và KHÔNG mua bán hay chia sẻ dữ liệu cá nhân cho bên thứ ba vì mục đích quảng cáo thương mại.",
      },
      {
        kind: "ok",
        text: "Quyền của chủ thể dữ liệu: người dùng có quyền xem, chỉnh sửa hồ sơ cá nhân, yêu cầu trích xuất dữ liệu hoặc yêu cầu xóa tài khoản thông qua kênh hỗ trợ pháp chế bên dưới.",
      },
    ],
  },
  {
    id: "anti-cheat",
    num: "Điều 4",
    shortTitle: "Quy chế thi cử",
    title: "4. Quy Chế Khảo Thí & Giám Sát Chống Gian Lận",
    subtitle: "Đảm bảo tính minh bạch, trung thực trong mọi bài kiểm tra trực tuyến.",
    icon: <AlertTriangle className="w-5 h-5" />,
    accentBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-800/60",
    accentText: "text-amber-600 dark:text-amber-400",
    points: [
      {
        kind: "ok",
        text: "Trong thời gian làm bài có bật chế độ giám sát, hệ thống tự động ghi nhận sự kiện chuyển tab, thoát toàn màn hình, mở cửa sổ phụ hoặc hành vi sao chép bất thường vào nhật ký bài thi.",
      },
      {
        kind: "ok",
        text: "Giáo viên, Quản trị viên hoặc Phụ huynh được phân quyền có quyền kiểm tra phiên thi trực tiếp, gửi cảnh báo, tạm dừng hoặc đình chỉ bài thi ngay khi có dấu hiệu gian lận rõ ràng.",
      },
      {
        kind: "warn",
        text: "Bài thi bị đình chỉ hoặc vượt ngưỡng vi phạm quy chế sẽ tự động nộp bài tại thời điểm xử lý và ghi nhận trạng thái vi phạm trong bảng điểm khảo thí.",
      },
    ],
  },
  {
    id: "wallet",
    num: "Điều 5",
    shortTitle: "Ví, Khóa học & Acc AI",
    title: "5. Giao Dịch Ví DkTEST, Mở Khóa Học Liệu & Dịch Vụ AI",
    subtitle: "Minh bạch giá niêm yết, phân bổ thanh toán và quyền hủy gia hạn.",
    icon: <Wallet className="w-5 h-5" />,
    accentBg: "bg-sky-50 dark:bg-sky-950/50 border-sky-200/80 dark:border-sky-800/60",
    accentText: "text-sky-600 dark:text-sky-400",
    points: [
      {
        kind: "ok",
        text: "Số dư Ví DkTEST là đơn vị thanh toán nội bộ dùng để mở khóa đề thi, khóa học video và các gói dịch vụ hỗ trợ học tập trên DkTEST; mọi giao dịch đều có lịch sử đối soát nguyên tử trên máy chủ.",
      },
      {
        kind: "ok",
        text: "Đối với đề thi và khóa học số đã mở khóa thành công, quyền truy cập có hiệu lực theo điều kiện công bố trên trang chi tiết sản phẩm; không hỗ trợ hoàn tiền sau khi nội dung số đã được truy cập trừ trường hợp lỗi kỹ thuật từ hệ thống.",
      },
      {
        kind: "ok",
        text: "Đối với các gói dịch vụ/slot theo chu kỳ tháng tại Cửa hàng Acc AI: giá gói được chốt độc lập theo từng đơn hàng; khách hàng có toàn quyền chủ động bấm Hủy gia hạn trước kỳ tiếp theo để ngừng phát sinh cước mới.",
      },
      {
        kind: "warn",
        text: "Các điều kiện bảo hành/không bảo hành của từng gói dịch vụ AI được ghi rõ ngay tại thẻ sản phẩm trước khi bấm xác nhận thanh toán. Người dùng cần đọc kỹ trước khi đặt mua.",
      },
    ],
  },
  {
    id: "minigame",
    num: "Điều 6",
    shortTitle: "Minigame Phúc lợi 0đ",
    title: "6. Quy Định Sự Kiện Minigame Phúc Lợi & Quà Tặng",
    subtitle: "Cam kết 100% miễn phí tham gia — tuyệt đối không cờ bạc, không đặt cược.",
    icon: <Gift className="w-5 h-5" />,
    accentBg: "bg-purple-50 dark:bg-purple-950/50 border-purple-200/80 dark:border-purple-800/60",
    accentText: "text-purple-600 dark:text-purple-400",
    points: [
      {
        kind: "ok",
        text: "Toàn bộ sự kiện Minigame trên DkTEST (Đua Ngựa, Đua Ong, Tài Xỉu phúc lợi, Bầu Cua hội xuân, Đoán Số May Mắn) có phí tham gia cố định 0đ, hoàn toàn không thu tiền đặt cược và không mang tính chất đánh bạc.",
      },
      {
        kind: "ok",
        text: "Kết quả mọi lượt chơi được sinh ngẫu nhiên an toàn bằng thuật toán mật mã trên máy chủ (CSPRNG) nhằm đảm bảo khách quan, công bằng cho toàn bộ học sinh tham dự.",
      },
      {
        kind: "ban",
        text: "Phần thưởng phúc lợi (cộng số dư Ví DkTEST, mã Voucher hoặc quà học tập) chỉ dành cho tài khoản người dùng thật, không có giá trị quy đổi tiền mặt bên ngoài và bị hủy nếu phát hiện gian lận tài khoản ảo.",
      },
    ],
  },
  {
    id: "ai-community",
    num: "Điều 7",
    shortTitle: "Gia sư AI & Cộng đồng",
    title: "7. Sử Dụng Gia Sư AI & Quy Tắc Ứng Xử Cộng Đồng",
    subtitle: "Xây dựng môi trường học tập văn minh, tích cực và an toàn.",
    icon: <Sparkles className="w-5 h-5" />,
    accentBg: "bg-violet-50 dark:bg-violet-950/50 border-violet-200/80 dark:border-violet-800/60",
    accentText: "text-violet-600 dark:text-violet-400",
    points: [
      {
        kind: "ok",
        text: "Nội dung giải đáp từ Gia sư AI mang tính chất gợi ý, hỗ trợ phương pháp học tập và tham khảo. Người học nên đối chiếu lại với sách giáo khoa, tài liệu chuẩn hoặc giáo viên bộ môn.",
      },
      {
        kind: "ban",
        text: "Nghiêm cấm đăng tải trên Kênh Thế Giới / Cộng đồng các nội dung vi phạm pháp luật Việt Nam, ngôn từ thù ghét, xúc phạm danh dự người khác, nội dung phản cảm, lừa đảo hoặc quảng cáo rác.",
      },
    ],
  },
  {
    id: "liability",
    num: "Điều 8",
    shortTitle: "Miễn trừ & Khiếu nại",
    title: "8. Giới Hạn Trách Nhiệm, Khiếu Nại Bản Quyền & Hiệu Lực",
    subtitle: "Quy trình tiếp nhận phản hồi trong vòng 24 giờ làm việc.",
    icon: <Gavel className="w-5 h-5" />,
    accentBg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200/80 dark:border-rose-800/60",
    accentText: "text-rose-600 dark:text-rose-400",
    points: [
      {
        kind: "ok",
        text: "DkTEST nỗ lực duy trì hệ thống ổn định 24/7 và sao lưu dữ liệu định kỳ, nhưng được miễn trừ trách nhiệm đối với gián đoạn bất khả kháng (mất kết nối internet từ phía người dùng, thiên tai, sự cố hạ tầng mạng diện rộng).",
      },
      {
        kind: "ok",
        text: "Quy trình khiếu nại bản quyền (Gỡ bỏ nội dung): chủ sở hữu bản quyền nếu phát hiện tài liệu/đề thi đăng tải trái phép vui lòng gửi thông báo kèm đường dẫn và bằng chứng sở hữu về email pháp chế để được rà soát và gỡ bỏ trong vòng 24 giờ.",
      },
      {
        kind: "ok",
        text: "DkTEST có quyền cập nhật điều khoản này để phù hợp với quy định pháp luật và tính năng mới. Việc tiếp tục sử dụng nền tảng sau khi thông báo cập nhật đồng nghĩa với việc người dùng đồng thuận với điều khoản hiện hành.",
      },
    ],
  },
];

interface LegalPolicyContentProps {
  compact?: boolean;
}

export function LegalPolicyContent({ compact = false }: LegalPolicyContentProps) {
  const [activeId, setActiveId] = useState<string>("copyright");

  const jumpTo = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`legal-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={compact ? "space-y-5 font-sans" : "max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 font-sans"}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-[11px] font-bold uppercase tracking-wider border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Văn Bản Pháp Lý &amp; Điều Khoản Sử Dụng
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold border border-emerald-400/25">
              <Clock className="w-3 h-3" />
              Phiên bản 2.0 • Hiệu lực 23/11/2026
            </span>
          </div>
          <h1 className={compact ? "text-xl sm:text-2xl font-black tracking-tight leading-tight" : "text-2xl sm:text-4xl font-black tracking-tight leading-tight"}>
            Bản Quyền, Chính Sách Bảo Mật &amp; Điều Khoản Dịch Vụ DkTEST
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Bằng việc đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào trên nền tảng Web và Ứng dụng Android DkTEST, bạn xác nhận đã đọc, hiểu rõ và đồng ý tuân thủ toàn bộ 8 điều khoản pháp lý dưới đây.
          </p>
        </div>
      </div>

      {/* Quick Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {LEGAL_SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => jumpTo(sec.id)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              activeId === sec.id
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {sec.num}: {sec.shortTitle}
          </button>
        ))}
      </div>

      {/* Detailed Sections Grid */}
      <div className={compact ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-5"}>
        {LEGAL_SECTIONS.map((sec) => (
          <section
            key={sec.id}
            id={`legal-sec-${sec.id}`}
            className="scroll-mt-4 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${sec.accentBg} ${sec.accentText}`}
              >
                {sec.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                  {sec.title}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {sec.subtitle}
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {sec.points.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {pt.kind === "ban" ? (
                    <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  ) : pt.kind === "warn" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span>{pt.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Footer Contact & Copyright Notice */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="DkTEST Logo"
            className="w-10 h-10 rounded-xl object-contain p-0.5 bg-white border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white">
              © {new Date().getFullYear()} DkTEST — Ban Pháp Chế &amp; Bảo Hộ Bản Quyền
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Tiếp nhận yêu cầu gỡ bỏ bản quyền, bảo mật dữ liệu cá nhân &amp; giải quyết tranh chấp trong 24h.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
          <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>legal@dktest.edu.vn</span>
        </div>
      </div>
    </div>
  );
}

interface LegalPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function LegalPolicyModal({ isOpen, onClose, onAccept }: LegalPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-policy-modal-title"
      className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90dvh] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header */}
        <div className="shrink-0 px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="legal-policy-modal-title" className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Bản Quyền &amp; Điều Khoản Pháp Lý DkTEST
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Vui lòng đọc kỹ quyền lợi &amp; nghĩa vụ trước khi tạo tài khoản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng điều khoản"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <LegalPolicyContent compact />
        </div>

        {/* Modal Sticky Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng lại
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Tôi đã đọc &amp; Đồng ý toàn bộ Điều khoản</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
