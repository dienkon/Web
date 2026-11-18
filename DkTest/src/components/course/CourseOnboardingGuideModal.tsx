import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  PanelLeftClose,
  Play,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Unlock,
  Video,
  Wallet,
  X,
} from "lucide-react";

export type CourseGuideScope = "courses_tab" | "course_player";

interface CourseOnboardingGuideModalProps {
  isOpen: boolean;
  scope?: CourseGuideScope;
  onClose: () => void;
  onComplete?: () => void;
}

interface GuideStep {
  id: string;
  badge: string;
  title: string;
  summary: string;
  highlights: { icon: React.ReactNode; title: string; detail: string }[];
  preview: React.ReactNode;
  tip: string;
}

function getGuideSteps(scope: CourseGuideScope): GuideStep[] {
  if (scope === "course_player") {
    return [
      {
        id: "player_nav",
        badge: "Bước 1 / 4 • Bố cục 2 cột",
        title: "Chọn nhanh Bài học & Thu gọn mở rộng khung hình",
        summary:
          "Danh sách bài học được sắp xếp theo từng môn học, chuyên đề và chủ đề giúp bạn không bị rối khi học nhiều chương.",
        highlights: [
          {
            icon: <Layers className="w-4 h-4 text-blue-600" />,
            title: "Trên máy tính (Cột bên trái)",
            detail:
              "Bấm mở từng Môn học → Chuyên đề → chọn Chủ đề muốn học. Bấm nút \"Thu gọn\" để mở rộng tối đa khung video.",
          },
          {
            icon: <BookOpen className="w-4 h-4 text-blue-600" />,
            title: "Trên điện thoại (Nút \"Bài học\")",
            detail:
              "Chạm nút \"Bài học\" màu xanh ở góc trên bên trái để mở danh sách; chọn xong cửa sổ tự đóng để xem video ngay.",
          },
          {
            icon: <X className="w-4 h-4 text-slate-600" />,
            title: "Nút \"Đóng\"",
            detail: "Quay trở lại trang Danh sách Khóa học bất kỳ lúc nào.",
          },
        ],
        preview: (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px]">
                  Bài học
                </span>
                <span className="truncate">KHÓA HỌC DkTEST</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">?</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Đóng</span>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-1 border-b border-slate-100">
                  <span>Danh sách</span>
                  <span className="inline-flex items-center gap-0.5 text-blue-600">
                    <PanelLeftClose className="w-3 h-3" /> Thu gọn
                  </span>
                </div>
                <div className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold truncate">
                  Chủ đề 1 (Đang chọn)
                </div>
                <div className="px-2 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px] truncate">
                  Chủ đề 2
                </div>
              </div>
              <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-2 space-y-1.5">
                <div className="aspect-video rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <Play className="w-5 h-5 fill-current text-blue-400" />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-center">
                  <span className="py-1 rounded bg-blue-600 text-white">Video</span>
                  <span className="py-1 rounded bg-slate-100 text-slate-600">Tài liệu</span>
                  <span className="py-1 rounded bg-slate-100 text-slate-600">Kiểm tra</span>
                </div>
              </div>
            </div>
          </div>
        ),
        tip: "Mẹo: Thu gọn thanh bên trái khi xem bài giảng dài để tập trung toàn màn hình hơn.",
      },
      {
        id: "player_controls",
        badge: "Bước 2 / 4 • Trình phát Video",
        title: "Tua nhanh ±10s, chỉnh tốc độ & độ phân giải",
        summary:
          "Trình phát DkTEST lưu lại đúng mốc thời gian bạn đang xem dở để lần sau mở lại học tiếp ngay.",
        highlights: [
          {
            icon: <RotateCw className="w-4 h-4 text-blue-600" />,
            title: "Tua nhanh ±10 giây",
            detail:
              "Chạm nút lùi/tới 10s ngay giữa màn hình hoặc trên thanh điều khiển (trên máy tính dùng phím ← / → và Space).",
          },
          {
            icon: <SlidersHorizontal className="w-4 h-4 text-blue-600" />,
            title: "Tốc độ 0.5x – 2x & Chất lượng",
            detail:
              "Bấm biểu tượng tốc độ (1x) hoặc độ phân giải (Auto / 720p / 1080p) ở góc dưới phải trình phát.",
          },
        ],
        preview: (
          <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-4 space-y-3">
            <div className="flex items-center justify-center gap-5 py-2">
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-black">
                <RotateCcw className="w-4 h-4" />
              </span>
              <span className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </span>
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-[10px] font-black">
                <RotateCw className="w-4 h-4" />
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="w-2/5 h-full bg-blue-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
              <span>12:30 / 45:00</span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-white/15 text-white">1080p</span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white">1.25x</span>
              </div>
            </div>
          </div>
        ),
        tip: "Khi mở khóa một video trả phí, trình phát sẽ tự động chuyển và phát ngay bài giảng đó.",
      },
      {
        id: "player_tabs",
        badge: "Bước 3 / 4 • 3 Tab dưới Video",
        title: "Chuyển nhanh Video • Tài liệu • Bài kiểm tra",
        summary:
          "Mọi tài nguyên của chủ đề đang học được gom thành 3 tab rõ ràng ngay bên dưới video, không cần cuộn tìm xa.",
        highlights: [
          {
            icon: <Video className="w-4 h-4 text-blue-600" />,
            title: "Tab Video",
            detail:
              "Hiển thị danh sách video trong chủ đề kèm trạng thái nút bấm rõ ràng: Đang phát, Xem video hoặc Đã xem.",
          },
          {
            icon: <FileText className="w-4 h-4 text-blue-600" />,
            title: "Tab Tài liệu",
            detail:
              "Xem và tải nhanh file PDF, bài tập tự luyện hoặc đường dẫn tài liệu gắn với từng bài giảng.",
          },
          {
            icon: <ClipboardCheck className="w-4 h-4 text-blue-600" />,
            title: "Tab Bài kiểm tra",
            detail:
              "Truy cập ngay đề thi trắc nghiệm luyện tập gắn với chuyên đề để kiểm tra lại kiến thức vừa học.",
          },
        ],
        preview: (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <div className="py-1.5 text-center rounded-lg bg-blue-600 text-white">Video (6)</div>
              <div className="py-1.5 text-center rounded-lg text-slate-600">Tài liệu (15)</div>
              <div className="py-1.5 text-center rounded-lg text-slate-600">Bài kiểm tra (3)</div>
            </div>
            <div className="space-y-1.5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 truncate">Bài giảng chính</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold shrink-0">
                  Đang phát
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-700 truncate">Video 2 • Luyện tập</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold shrink-0">
                  Xem video
                </span>
              </div>
            </div>
          </div>
        ),
        tip: "Số đếm trên từng tab cho biết ngay chủ đề này có bao nhiêu video, tài liệu và đề luyện tập.",
      },
      {
        id: "player_progress",
        badge: "Bước 4 / 4 • Tiến độ & Mở khóa",
        title: "Đánh dấu hoàn thành & Mở khóa bằng Ví DkTEST",
        summary:
          "Theo dõi % hoàn thành theo từng chuyên đề và mở khóa bài trả phí hoặc trọn khóa nhanh chóng.",
        highlights: [
          {
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
            title: "Đánh dấu đã học",
            detail:
              "Hệ thống tự đánh dấu khi bạn xem ≥ 90% video, hoặc bạn có thể bấm nút Đánh dấu đã học thủ công.",
          },
          {
            icon: <Wallet className="w-4 h-4 text-blue-600" />,
            title: "Mở khóa an toàn với Ví & Voucher",
            detail:
              "Chọn mở lẻ từng video hoặc trọn khóa ngay tại màn hình phát và áp dụng mã giảm giá Voucher nếu có.",
          },
        ],
        preview: (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Tiến độ hoàn thành khóa học</span>
              <span className="text-blue-600 font-black">65%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="w-2/3 h-full rounded-full bg-blue-600" />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                <Unlock className="w-3.5 h-3.5" /> Ví DkTEST &amp; Voucher
              </span>
            </div>
          </div>
        ),
        tip: "Bạn có thể bấm nút \"Hướng dẫn\" trên góc phải bất kỳ lúc nào để xem lại hướng dẫn này.",
      },
    ];
  }

  return [
    {
      id: "tab_discover",
      badge: "Bước 1 / 4 • Khám phá Khóa học",
      title: "Tìm kiếm & Lọc nhanh khóa học phù hợp",
      summary:
        "Chào mừng bạn lần đầu đến với mục Khóa học trên DkTEST! Tại đây tập hợp đầy đủ video bài giảng, tài liệu và đề luyện tập theo từng môn.",
      highlights: [
        {
          icon: <Filter className="w-4 h-4 text-blue-600" />,
          title: "Tìm kiếm & Lọc theo môn / hình thức",
          detail:
            "Nhập tên khóa học, mã khóa, tên giáo viên hoặc lọc nhanh theo môn học và chế độ học phí.",
        },
        {
          icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
          title: "Nhận biết số bài học thử miễn phí",
          detail:
            "Các thẻ khóa học ghi rõ số bài học thử Free, tổng số video và tổng thời lượng bài giảng.",
        },
      ],
      preview: (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 flex-1">
              Tìm khóa học, môn học...
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
              Tất cả môn
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Miễn phí</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Vào Free • Trả theo video</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Trọn khóa</span>
          </div>
        </div>
      ),
      tip: "Bạn có thể vào xem trước mọi khóa \"Vào Free • Trả theo video\" mà không cần mua cả khóa.",
    },
    {
      id: "tab_unlock",
      badge: "Bước 2 / 4 • Học thử & Mở khóa",
      title: "Học thử miễn phí hoặc mở khóa từng video / trọn khóa",
      summary:
        "DkTEST hỗ trợ 3 hình thức linh hoạt giúp học sinh dễ tiếp cận bài giảng chất lượng với chi phí tối ưu.",
      highlights: [
        {
          icon: <Play className="w-4 h-4 text-blue-600" />,
          title: "Xem ngay bài học thử miễn phí",
          detail:
            "Nhấp vào khóa học bất kỳ để phát ngay các video đầu được đánh dấu Học thử miễn phí.",
        },
        {
          icon: <Wallet className="w-4 h-4 text-blue-600" />,
          title: "Mua lẻ từng video hoặc mở trọn khóa",
          detail:
            "Thanh toán trực tiếp bằng số dư Ví DkTEST và nhập mã Voucher giảm giá nếu giáo viên cung cấp.",
        },
      ],
      preview: (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 text-[11px]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="font-bold text-emerald-900">Bài 1: Nền tảng kiến thức</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
              Học thử Free
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-800">Bài 2: Vận dụng nâng cao</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
              Mở khóa lẻ / Trọn khóa
            </span>
          </div>
        </div>
      ),
      tip: "Sau khi thanh toán mở khóa xong, hệ thống tự động mở và phát bài giảng vừa mua ngay lập tức.",
    },
    {
      id: "tab_layout",
      badge: "Bước 3 / 4 • Giao diện phòng học Video",
      title: "Bố cục 2 cột gọn gàng, dễ thao tác trên mọi thiết bị",
      summary:
        "Khi bấm vào một khóa học, bạn sẽ vào không gian học tập chuẩn với danh sách bài học và trình phát tách biệt rõ ràng.",
      highlights: [
        {
          icon: <PanelLeftClose className="w-4 h-4 text-blue-600" />,
          title: "Máy tính: Cột Danh sách bài học + nút Thu gọn",
          detail:
            "Chọn chủ đề ở cột bên trái; có thể bấm \"Thu gọn\" để ẩn thanh bên và xem video rộng rãi hơn.",
        },
        {
          icon: <BookOpen className="w-4 h-4 text-blue-600" />,
          title: "Điện thoại: Nút \"Bài học\" ở góc trên trái",
          detail:
            "Chạm nút \"Bài học\" để mở nhanh mục lục các chương/chủ đề, chạm bài cần học để chuyển video tức thì.",
        },
      ],
      preview: (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-12 gap-2">
          <div className="col-span-5 bg-white border border-slate-200 rounded-xl p-2 space-y-1">
            <div className="text-[10px] font-extrabold text-slate-700">Danh sách bài học</div>
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-bold truncate">
              Chủ đề đang học
            </div>
            <div className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] truncate">
              Chủ đề tiếp theo
            </div>
          </div>
          <div className="col-span-7 bg-white border border-slate-200 rounded-xl p-2 space-y-1.5">
            <div className="aspect-video rounded-lg bg-slate-900 flex items-center justify-center text-blue-400">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-center">
              <span className="py-1 rounded bg-blue-600 text-white">Video</span>
              <span className="py-1 rounded bg-slate-100 text-slate-600">Tài liệu</span>
              <span className="py-1 rounded bg-slate-100 text-slate-600">Bài kiểm tra</span>
            </div>
          </div>
        </div>
      ),
      tip: "Trong phòng học luôn có nút \"? Hướng dẫn\" và \"Đóng\" ở góc trên bên phải.",
    },
    {
      id: "tab_study",
      badge: "Bước 4 / 4 • Video • Tài liệu • Kiểm tra",
      title: "Học trọn vẹn với 3 tab ngay dưới trình phát",
      summary:
        "Ngay bên dưới khung video là 3 tab giúp bạn chuyển nhanh giữa bài giảng, tài liệu đính kèm và đề kiểm tra của chủ đề đó.",
      highlights: [
        {
          icon: <Video className="w-4 h-4 text-blue-600" />,
          title: "Video • Đang phát / Xem video / Đã xem",
          detail:
            "Chuyển nhanh giữa các video trong cùng chủ đề, biết rõ bài nào đang phát và bài nào đã hoàn thành.",
        },
        {
          icon: <FileText className="w-4 h-4 text-blue-600" />,
          title: "Tài liệu & Bài kiểm tra",
          detail:
            "Mở tải file PDF bài tập ngay trong tab Tài liệu và bấm làm đề luyện tập trong tab Bài kiểm tra.",
        },
      ],
      preview: (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 text-[11px]">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl font-bold text-center">
            <span className="py-1 rounded-lg bg-blue-600 text-white">Video (6)</span>
            <span className="py-1 rounded-lg text-slate-600">Tài liệu (15)</span>
            <span className="py-1 rounded-lg text-slate-600">Kiểm tra (3)</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="font-bold text-slate-800">Bài giảng 1 • Phần lý thuyết</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">
              Đang phát
            </span>
          </div>
        </div>
      ),
      tip: "Bạn có thể mở lại bảng hướng dẫn này bất kỳ lúc nào bằng nút \"Hướng dẫn\" ở đầu trang.",
    },
  ];
}

export default function CourseOnboardingGuideModal({
  isOpen,
  scope = "courses_tab",
  onClose,
  onComplete,
}: CourseOnboardingGuideModalProps) {
  const steps = getGuideSteps(scope);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen, scope]);

  if (!isOpen) return null;

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;

  const handleFinish = () => {
    onComplete?.();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-guide-modal-title"
      className="fixed inset-0 z-[9990] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
        {/* Bright White DKTEST Top Accent */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-5 py-4">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="space-y-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                <HelpCircle className="w-3 h-3" />
                <span>{activeStep.badge}</span>
              </span>
              <h2 id="course-guide-modal-title" className="text-base sm:text-xl font-black text-slate-900 leading-snug">
                {activeStep.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hướng dẫn"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{activeStep.summary}</p>

          {/* Visual schematic */}
          <div>{activeStep.preview}</div>

          {/* Highlight bullets */}
          <div className="space-y-2.5">
            {activeStep.highlights.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-900">{item.title}</div>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3.5 py-2.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-[11px] sm:text-xs font-semibold text-blue-900">
            💡 {activeStep.tip}
          </div>
        </div>

        {/* Stepper & Controls Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center gap-1.5">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  aria-label={`Chuyển sang bước ${idx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === stepIndex ? "w-6 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg cursor-pointer"
            >
              Bỏ qua
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã hiểu • Bắt đầu học</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
