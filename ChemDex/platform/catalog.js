import manifest from "../data/features/main.json";

export const tools = [
  { id: "structures", title: "Cấu trúc phân tử 3D", description: "Xoay phân tử, ion và tinh thể; đo góc liên kết và tra PubChem.", href: "/tien-ich/cau-truc-3d/", category: "Khám phá & Thực hành", mark: "⌬", keywords: ["phân tử", "mô hình", "ion", "tinh thể", "3d"] },
  { id: "lab2d", title: "Phòng thí nghiệm 2D", description: "20 thí nghiệm hướng dẫn, lưu phiên thực hành và xuất báo cáo.", href: "/lab-2d/", category: "Khám phá & Thực hành", mark: "⚗", keywords: ["lab", "thực hành", "mô phỏng"] },
  { id: "lab3d", title: "Phòng thí nghiệm 3D", description: "Khám phá dụng cụ và quan sát thí nghiệm trong không gian 3D.", href: "/lab-3d/", category: "Khám phá & Thực hành", mark: "⬡", keywords: ["lab", "thực hành", "mô phỏng"] },
  { id: "safety", title: "An toàn phòng thí nghiệm", description: "Luyện xử lý tình huống và nhận biết quy tắc an toàn trong lab.", href: "/lab-safety/", category: "Khám phá & Thực hành", mark: "◇", keywords: ["lab", "an toàn", "safety"] },
  { id: "study", title: "Ôn tập hóa học", description: "Câu hỏi có giải thích, lưu tiến độ và luyện lại những câu còn sai.", href: "/on-tap/", category: "Khám phá & Thực hành", mark: "◉", keywords: ["quiz", "câu hỏi", "kiểm tra"] },
  ...manifest.features.map((feature) => ({ ...feature, mark: ({ "Phương trình": "⇌", "Tính toán Đại cương": "n", "Hóa Lý & Phân tích": "∆", "Tra cứu Lý thuyết": "▤" })[feature.category] ?? "⌬" })),
];
