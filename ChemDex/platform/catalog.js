import manifest from "../data/features/main.json";

const FEATURE_MARKS = {
  "can-bang-pthh": "⇌",
  "chuoi-phan-ung": "⛓",
  "ion-thu-gon": "⚡",
  "du-doan-san-pham": "✦",
  "nhan-dien-pthh-thong-minh": "📷",
  "tinh-tan": "💧",
  "day-dien-hoa": "🔋",
  "mau-sac-nhan-biet": "🎨",
  "bang-tuan-hoan": "⊞",
  "so-sanh-nguyen-to": "⚖",
  "cau-hinh-electron": "⚛",
  "chuyen-doi-luong-chat": "mol",
  "nong-do-pha-loang": "🧪",
  "chat-han-che-hieu-suat": "%",
  "cong-thuc-uc-luong": "CxHy",
  " dinh-luat-khi": "PV",
  "dinh-luat-khi": "PV",
  "tinh-ph": "pH",
  "chuan-do-axit-bazo": "📈",
  "so-oxi-hoa": "±n",
  "dien-phan": "⊕⊖",
};

export const tools = [
  {
    id: "structures",
    title: "Cấu trúc phân tử 3D",
    description:
      "Xoay phân tử, ion, muối phối trí và mạng tinh thể 3D; kiểm tra độ dài, góc liên kết thực tế và tra cứu PubChem.",
    href: "/tien-ich/cau-truc-3d/",
    category: "Khám phá & Thực hành",
    mark: "⌬",
    keywords: ["phân tử", "mô hình", "ion", "tinh thể", "3d", "liên kết"],
  },
  {
    id: "lab2d",
    title: "Phòng thí nghiệm 2D",
    description:
      "20 thí nghiệm hướng dẫn, pha trộn hóa chất trực quan, lưu phiên thực hành và xuất báo cáo.",
    href: "/lab-2d/",
    category: "Khám phá & Thực hành",
    mark: "⚗",
    keywords: ["lab", "thực hành", "mô phỏng", "2d"],
  },
  {
    id: "lab3d",
    title: "Phòng thí nghiệm 3D",
    description:
      "Khám phá bàn thí nghiệm, dụng cụ trực quan và quan sát hiện tượng phản ứng trong không gian 3D.",
    href: "/lab-3d/",
    category: "Khám phá & Thực hành",
    mark: "⬡",
    keywords: ["lab", "thực hành", "mô phỏng", "3d"],
  },
  {
    id: "safety",
    title: "An toàn phòng thí nghiệm",
    description:
      "Luyện xử lý tình huống khẩn cấp, nhãn cảnh báo GHS và quy tắc an toàn chuẩn trong phòng thí nghiệm.",
    href: "/lab-safety/",
    category: "Khám phá & Thực hành",
    mark: "🛡️",
    keywords: ["lab", "an toàn", "safety"],
  },
  {
    id: "study",
    title: "Ôn tập hóa học",
    description:
      "Hệ thống câu hỏi trắc nghiệm có giải thích chi tiết, lưu tiến độ và luyện lại những câu còn sai.",
    href: "/on-tap/",
    category: "Khám phá & Thực hành",
    mark: "◉",
    keywords: ["quiz", "câu hỏi", "kiểm tra", "ôn tập"],
  },
  ...manifest.features.map((feature) => ({
    ...feature,
    mark:
      FEATURE_MARKS[feature.id] ??
      ({
        "Phương trình": "⇌",
        "Tính toán Đại cương": "mol",
        "Hóa Lý & Phân tích": "∆",
        "Tra cứu Lý thuyết": "▤",
      }[feature.category] ??
      "⌬"),
  })),
];
