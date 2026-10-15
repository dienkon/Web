import { GameDefinition } from '../core/types';

export const ACADEMY_GAMES: GameDefinition[] = [
  {
    "id": "sort-waste",
    "kind": "sort",
    "title": "Đường đua phân loại rác",
    "subtitle": "Kéo từng mẫu vào vật chứa có nhãn phù hợp.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Kéo từng mẫu vào vật chứa có nhãn phù hợp.",
    "icon": "♻️",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "bins": [
      {
        "id": "domestic",
        "label": "Rác sinh hoạt",
        "description": "Vật liệu sạch theo quy định phòng",
        "icon": "🗑️",
        "color": "#94a3b8"
      },
      {
        "id": "chemical",
        "label": "Rác hóa chất",
        "description": "Vật liệu nhiễm hóa chất đã xác định",
        "icon": "⚠️",
        "color": "#facc15"
      },
      {
        "id": "sharps",
        "label": "Vật sắc",
        "description": "Hộp cứng chống đâm thủng",
        "icon": "📦",
        "color": "#fb7185"
      }
    ],
    "objects": [
      {
        "id": "paper",
        "label": "Giấy sạch",
        "icon": "📄",
        "binId": "domestic",
        "explanation": "Giấy không nhiễm hóa chất được phân loại theo quy định rác sinh hoạt."
      },
      {
        "id": "glass",
        "label": "Ống nghiệm vỡ",
        "icon": "◭",
        "binId": "sharps",
        "explanation": "Dùng dụng cụ thu gom và vật chứa chống đâm thủng."
      },
      {
        "id": "absorbent",
        "label": "Giấy thấm nhiễm hóa chất",
        "icon": "🟨",
        "binId": "chemical",
        "explanation": "Không trộn giấy nhiễm với giấy sạch."
      },
      {
        "id": "wrapper",
        "label": "Bao bì giấy sạch",
        "icon": "📜",
        "binId": "domestic",
        "explanation": "Chỉ chọn nhóm này khi xác nhận không nhiễm."
      },
      {
        "id": "chip",
        "label": "Mảnh thủy tinh mẻ",
        "icon": "🔹",
        "binId": "sharps",
        "explanation": "Mảnh nhỏ vẫn có thể gây cắt."
      },
      {
        "id": "pad",
        "label": "Miếng thấm mẫu đã xác định",
        "icon": "🧽",
        "binId": "chemical",
        "explanation": "Đọc hướng dẫn của mẫu và nhãn vật chứa."
      }
    ]
  },
  {
    "id": "sort-storage",
    "kind": "sort",
    "title": "Kho hóa chất có trật tự",
    "subtitle": "Đọc nhãn nhóm; chất chưa biết phải được báo để xác minh.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Đọc nhãn nhóm; chất chưa biết phải được báo để xác minh.",
    "icon": "🧴",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "bins": [
      {
        "id": "acid",
        "label": "Nhóm axit",
        "description": "Khu lưu trữ được chỉ định cho axit",
        "icon": "🟠",
        "color": "#fb923c"
      },
      {
        "id": "base",
        "label": "Nhóm bazơ",
        "description": "Tách riêng khỏi axit theo hướng dẫn",
        "icon": "🔵",
        "color": "#60a5fa"
      },
      {
        "id": "flammable",
        "label": "Dung môi dễ cháy",
        "description": "Tủ chuyên dụng theo quy định",
        "icon": "🔥",
        "color": "#facc15"
      },
      {
        "id": "unknown",
        "label": "Chờ xác minh",
        "description": "Không dùng hoặc tự xếp chất chưa biết",
        "icon": "❔",
        "color": "#c084fc"
      }
    ],
    "objects": [
      {
        "id": "a",
        "label": "Chai ghi nhãn axit",
        "icon": "🧪",
        "binId": "acid",
        "explanation": "Làm theo chỉ dẫn tương thích cụ thể của phòng."
      },
      {
        "id": "b",
        "label": "Chai ghi nhãn bazơ",
        "icon": "🧴",
        "binId": "base",
        "explanation": "Không xếp tùy ý chung với axit."
      },
      {
        "id": "c",
        "label": "Dung môi nhãn dễ cháy",
        "icon": "🔥",
        "binId": "flammable",
        "explanation": "Tránh nguồn mồi lửa và đọc SDS."
      },
      {
        "id": "d",
        "label": "Chai không có nhãn",
        "icon": "❔",
        "binId": "unknown",
        "explanation": "Giữ nguyên và báo giáo viên; không tự đoán."
      },
      {
        "id": "e",
        "label": "Nhãn bị bong, không đọc đủ",
        "icon": "🏷️",
        "binId": "unknown",
        "explanation": "Danh tính chưa được xác nhận."
      },
      {
        "id": "f",
        "label": "Chai bazơ đã xác minh",
        "icon": "🔵",
        "binId": "base",
        "explanation": "Chọn đúng nhóm nhãn trong bài tập, vẫn kiểm tra tương thích thực tế."
      }
    ]
  },
  {
    "id": "sort-equipment",
    "kind": "sort",
    "title": "Dụng cụ nào làm việc gì?",
    "subtitle": "Ghép đúng công việc để chọn công cụ phù hợp.",
    "skill": "identification",
    "topicId": "identification",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Ghép đúng công việc để chọn công cụ phù hợp.",
    "icon": "🧰",
    "accent": "#a78bfa",
    "equipmentKinds": [
      "board",
      "glass"
    ],
    "bins": [
      {
        "id": "measure",
        "label": "Đo lường",
        "description": "Dụng cụ đọc đại lượng",
        "icon": "📏",
        "color": "#22d3ee"
      },
      {
        "id": "protect",
        "label": "Bảo vệ",
        "description": "Giảm nguy cơ tiếp xúc",
        "icon": "🥽",
        "color": "#a78bfa"
      },
      {
        "id": "cleanup",
        "label": "Thu gom",
        "description": "Dọn mẫu đã được xác định",
        "icon": "🧹",
        "color": "#4ade80"
      }
    ],
    "objects": [
      {
        "id": "scale",
        "label": "Cân phân tích",
        "icon": "⚖️",
        "binId": "measure",
        "explanation": "Đọc khối lượng với vật chứa phù hợp."
      },
      {
        "id": "cylinder",
        "label": "Ống đong",
        "icon": "🧪",
        "binId": "measure",
        "explanation": "Đọc thể tích theo vạch chia."
      },
      {
        "id": "goggles",
        "label": "Kính bảo hộ",
        "icon": "🥽",
        "binId": "protect",
        "explanation": "Bảo vệ mắt khi chọn và mang đúng cách."
      },
      {
        "id": "coat",
        "label": "Áo blouse",
        "icon": "🥼",
        "binId": "protect",
        "explanation": "Che phủ phù hợp khi cài áo đúng."
      },
      {
        "id": "brush",
        "label": "Chổi chuyên dụng",
        "icon": "🧹",
        "binId": "cleanup",
        "explanation": "Quét mẫu được giao vào vùng thu gom."
      },
      {
        "id": "pan",
        "label": "Hốt rác",
        "icon": "🟨",
        "binId": "cleanup",
        "explanation": "Thu gom mẫu mà không nhặt bằng tay."
      }
    ]
  },
  {
    "id": "sort-readiness",
    "kind": "sort",
    "title": "Kiểm tra trước giờ học",
    "subtitle": "Phân biệt đồ đã sẵn sàng và đồ cần báo để thay.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Phân biệt đồ đã sẵn sàng và đồ cần báo để thay.",
    "icon": "✅",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "bins": [
      {
        "id": "ready",
        "label": "Sẵn sàng",
        "description": "Đã kiểm tra đạt điều kiện bài học",
        "icon": "✅",
        "color": "#4ade80"
      },
      {
        "id": "replace",
        "label": "Chưa dùng",
        "description": "Báo giáo viên để sửa hoặc thay",
        "icon": "🛑",
        "color": "#fb7185"
      }
    ],
    "objects": [
      {
        "id": "g",
        "label": "Kính nguyên vẹn, vừa mặt",
        "icon": "🥽",
        "binId": "ready",
        "explanation": "Còn cần mang đúng cách trong suốt thao tác."
      },
      {
        "id": "r",
        "label": "Găng tay có lỗ",
        "icon": "🧤",
        "binId": "replace",
        "explanation": "Lỗ rách làm mất lớp bảo vệ liên tục."
      },
      {
        "id": "c",
        "label": "Áo đã cài gọn",
        "icon": "🥼",
        "binId": "ready",
        "explanation": "Trang phục không để vướng thao tác."
      },
      {
        "id": "s",
        "label": "Giày kín mũi phù hợp",
        "icon": "👟",
        "binId": "ready",
        "explanation": "Giữ giày theo quy định của lớp."
      },
      {
        "id": "t",
        "label": "Cốc có vết nứt",
        "icon": "⚗️",
        "binId": "replace",
        "explanation": "Không thử dùng tiếp cốc đã hỏng."
      },
      {
        "id": "w",
        "label": "Dây điện hở",
        "icon": "🔌",
        "binId": "replace",
        "explanation": "Không tự sửa hoặc cấp nguồn cho dây hỏng."
      }
    ]
  },
  {
    "id": "sort-emergency",
    "kind": "sort",
    "title": "Ưu tiên khi có sự cố",
    "subtitle": "Chọn hành động phù hợp với mức an toàn được mô tả.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động phù hợp với mức an toàn được mô tả.",
    "icon": "🚨",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "bins": [
      {
        "id": "act",
        "label": "Hành động cần làm",
        "description": "Theo kế hoạch ứng phó của phòng",
        "icon": "✅",
        "color": "#4ade80"
      },
      {
        "id": "avoid",
        "label": "Không làm",
        "description": "Hành động tăng nguy cơ hoặc làm chậm thoát nạn",
        "icon": "🛑",
        "color": "#fb7185"
      }
    ],
    "objects": [
      {
        "id": "report",
        "label": "Báo vị trí sự cố cho giáo viên",
        "icon": "📣",
        "binId": "act",
        "explanation": "Thông tin cụ thể giúp gọi đúng hỗ trợ."
      },
      {
        "id": "exit",
        "label": "Theo lối an toàn đến điểm tập kết",
        "icon": "🚪",
        "binId": "act",
        "explanation": "Ưu tiên thoát khỏi vùng nguy hiểm."
      },
      {
        "id": "bag",
        "label": "Quay lại lấy ba lô",
        "icon": "🎒",
        "binId": "avoid",
        "explanation": "Không quay lại vì đồ cá nhân."
      },
      {
        "id": "alarm",
        "label": "Che đầu báo khói",
        "icon": "🚨",
        "binId": "avoid",
        "explanation": "Không vô hiệu hóa hệ thống cảnh báo."
      },
      {
        "id": "count",
        "label": "Chờ kiểm đếm tại điểm tập kết",
        "icon": "👥",
        "binId": "act",
        "explanation": "Giúp xác nhận người đã ra ngoài."
      },
      {
        "id": "try",
        "label": "Thử xử lý chất tràn chưa biết",
        "icon": "❔",
        "binId": "avoid",
        "explanation": "Cần giáo viên đánh giá trước khi xử lý."
      }
    ]
  },
  {
    "id": "sort-workspace",
    "kind": "sort",
    "title": "Bàn thực hành gọn gàng",
    "subtitle": "Tìm những vật cần chỉnh trước khi bắt đầu.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Tìm những vật cần chỉnh trước khi bắt đầu.",
    "icon": "🧰",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "bins": [
      {
        "id": "safe",
        "label": "Giữ nguyên",
        "description": "Bố trí phù hợp tình huống được giao",
        "icon": "✅",
        "color": "#4ade80"
      },
      {
        "id": "fix",
        "label": "Cần chỉnh",
        "description": "Điều kiện chưa sẵn sàng",
        "icon": "🛠️",
        "color": "#fbbf24"
      }
    ],
    "objects": [
      {
        "id": "edge",
        "label": "Bình sát mép bàn",
        "icon": "⚗️",
        "binId": "fix",
        "explanation": "Đặt ổn định xa mép theo hướng dẫn."
      },
      {
        "id": "clear",
        "label": "Lối đi thông thoáng",
        "icon": "🚶",
        "binId": "safe",
        "explanation": "Giữ lối đi không bị cản."
      },
      {
        "id": "rack",
        "label": "Ống nghiệm trong giá chắc",
        "icon": "🧪",
        "binId": "safe",
        "explanation": "Giá giúp ổn định và quản lý dụng cụ."
      },
      {
        "id": "food",
        "label": "Bánh ở bàn hóa chất",
        "icon": "🍞",
        "binId": "fix",
        "explanation": "Đồ ăn uống phải ngoài khu thao tác."
      },
      {
        "id": "cable",
        "label": "Dây vắt ngang lối",
        "icon": "🔌",
        "binId": "fix",
        "explanation": "Báo bố trí lại để tránh vấp."
      },
      {
        "id": "label",
        "label": "Mẫu có nhãn đầy đủ",
        "icon": "🏷️",
        "binId": "safe",
        "explanation": "Nhãn đúng giúp xác định mẫu trước khi dùng."
      }
    ]
  },
  {
    "id": "sequence-ppe",
    "kind": "sequence",
    "title": "Mặc đồ bảo hộ theo trình tự",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "🥼",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Cất đồ cá nhân",
        "detail": "Đưa đồ dễ vướng khỏi khu thao tác.",
        "icon": "🎒"
      },
      {
        "id": "step-2",
        "title": "Kiểm tra trang phục",
        "detail": "Giày kín mũi, tóc gọn, không có đồ đeo vướng.",
        "icon": "👟"
      },
      {
        "id": "step-3",
        "title": "Kiểm tra bảo hộ",
        "detail": "Chọn kính, áo, găng theo hướng dẫn.",
        "icon": "🥽"
      },
      {
        "id": "step-4",
        "title": "Mang và chỉnh vừa",
        "detail": "Cài áo và mang đúng cách.",
        "icon": "🥼"
      },
      {
        "id": "step-5",
        "title": "Xác nhận sẵn sàng",
        "detail": "Hỏi giáo viên nếu còn điều kiện chưa rõ.",
        "icon": "✅"
      }
    ]
  },
  {
    "id": "sequence-balance",
    "kind": "sequence",
    "title": "Cân mẫu đúng cách",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "⚖️",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Kiểm tra cân",
        "detail": "Thiết bị và vị trí đã sẵn sàng theo hướng dẫn.",
        "icon": "⚖️"
      },
      {
        "id": "step-2",
        "title": "Đặt vật chứa",
        "detail": "Không để hóa chất trực tiếp lên đĩa cân.",
        "icon": "⚗️"
      },
      {
        "id": "step-3",
        "title": "Trừ bì",
        "detail": "Đưa số đọc của vật chứa về mốc thích hợp.",
        "icon": "0️⃣"
      },
      {
        "id": "step-4",
        "title": "Thêm mẫu chậm",
        "detail": "Không thêm vượt khả năng kiểm soát.",
        "icon": "➕"
      },
      {
        "id": "step-5",
        "title": "Chờ ổn định và ghi",
        "detail": "Ghi kết quả cùng đơn vị.",
        "icon": "📝"
      }
    ]
  },
  {
    "id": "sequence-volume",
    "kind": "sequence",
    "title": "Đọc thể tích không thị sai",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "🧪",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Chọn dụng cụ",
        "detail": "Đúng độ chia và độ chính xác được giao.",
        "icon": "📏"
      },
      {
        "id": "step-2",
        "title": "Đặt thẳng và ổn định",
        "detail": "Bề mặt và tư thế dụng cụ phù hợp.",
        "icon": "⬇️"
      },
      {
        "id": "step-3",
        "title": "Điều chỉnh lượng",
        "detail": "Kiểm soát dòng để không vượt vạch.",
        "icon": "💧"
      },
      {
        "id": "step-4",
        "title": "Đặt mắt ngang vạch",
        "detail": "Quan sát đúng mặt khum theo bài.",
        "icon": "👁️"
      },
      {
        "id": "step-5",
        "title": "Ghi số và đơn vị",
        "detail": "Không ghi số thiếu đơn vị.",
        "icon": "📝"
      }
    ]
  },
  {
    "id": "sequence-handwash",
    "kind": "sequence",
    "title": "Chu trình rửa tay",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "🫧",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Làm ướt tay",
        "detail": "Bắt đầu theo quy trình vệ sinh của trường.",
        "icon": "💧"
      },
      {
        "id": "step-2",
        "title": "Lấy xà phòng",
        "detail": "Dùng lượng theo hướng dẫn.",
        "icon": "🧴"
      },
      {
        "id": "step-3",
        "title": "Chà các bề mặt",
        "detail": "Chú ý vùng thường bị bỏ sót.",
        "icon": "🫧"
      },
      {
        "id": "step-4",
        "title": "Rửa sạch",
        "detail": "Loại xà phòng theo hướng dẫn.",
        "icon": "🚰"
      },
      {
        "id": "step-5",
        "title": "Lau khô và kết thúc",
        "detail": "Dùng giấy sạch, bỏ đúng thùng.",
        "icon": "📄"
      }
    ]
  },
  {
    "id": "sequence-glass",
    "kind": "sequence",
    "title": "Thu gom vật sắc an toàn",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "🧹",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Cảnh báo vùng vỡ",
        "detail": "Không cho người khác đi qua.",
        "icon": "⚠️"
      },
      {
        "id": "step-2",
        "title": "Báo và chuẩn bị",
        "detail": "Theo hướng dẫn giáo viên, chọn bảo hộ và bộ thu gom.",
        "icon": "🥽"
      },
      {
        "id": "step-3",
        "title": "Dùng chổi gom",
        "detail": "Không nhặt bằng tay.",
        "icon": "🧹"
      },
      {
        "id": "step-4",
        "title": "Dùng hốt đưa vào hộp",
        "detail": "Chọn vật chứa chống đâm thủng theo nhãn.",
        "icon": "📦"
      },
      {
        "id": "step-5",
        "title": "Kiểm tra và báo hoàn tất",
        "detail": "Chỉ mở lại lối khi đủ điều kiện.",
        "icon": "✅"
      }
    ]
  },
  {
    "id": "sequence-evacuate",
    "kind": "sequence",
    "title": "Rời phòng khi có báo động",
    "subtitle": "Xếp các bước thành quy trình có thể giải thích được.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Xếp các bước thành quy trình có thể giải thích được.",
    "icon": "🚪",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "steps": [
      {
        "id": "step-1",
        "title": "Nhận báo động",
        "detail": "Dừng hoạt động theo chỉ dẫn.",
        "icon": "🚨"
      },
      {
        "id": "step-2",
        "title": "Nghe chỉ dẫn",
        "detail": "Không tự tắt thiết bị cảnh báo.",
        "icon": "👂"
      },
      {
        "id": "step-3",
        "title": "Chọn lối an toàn",
        "detail": "Không đi vào khói hoặc vật cản.",
        "icon": "🚪"
      },
      {
        "id": "step-4",
        "title": "Di chuyển theo hướng dẫn",
        "detail": "Không quay lại lấy đồ cá nhân.",
        "icon": "🚶"
      },
      {
        "id": "step-5",
        "title": "Tập kết và kiểm đếm",
        "detail": "Chờ chỉ dẫn, không tự quay lại.",
        "icon": "👥"
      }
    ]
  },
  {
    "id": "memory-tools",
    "kind": "memory",
    "title": "Cặp đôi dụng cụ",
    "subtitle": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "skill": "identification",
    "topicId": "identification",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "icon": "🧰",
    "accent": "#a78bfa",
    "equipmentKinds": [
      "board",
      "glass"
    ],
    "pairs": [
      {
        "id": "pair-1",
        "left": "Cân",
        "right": "Đo khối lượng",
        "explanation": "Dùng vật chứa và trừ bì phù hợp.",
        "icon": "⚖️"
      },
      {
        "id": "pair-2",
        "left": "Ống đong",
        "right": "Đọc thể tích",
        "explanation": "Đọc vạch với tư thế quan sát phù hợp.",
        "icon": "🧪"
      },
      {
        "id": "pair-3",
        "left": "Kính bảo hộ",
        "right": "Bảo vệ mắt",
        "explanation": "Mang loại phù hợp và chỉnh vừa.",
        "icon": "🥽"
      },
      {
        "id": "pair-4",
        "left": "Tủ hút",
        "right": "Kiểm soát hơi theo thiết kế",
        "explanation": "Không thay cho các biện pháp tránh tiếp xúc khác.",
        "icon": "🌬️"
      },
      {
        "id": "pair-5",
        "left": "Hốt rác",
        "right": "Thu gom mẫu vào vật chứa",
        "explanation": "Không nhặt vật sắc bằng tay.",
        "icon": "🧹"
      },
      {
        "id": "pair-6",
        "left": "Đồng hồ",
        "right": "Theo dõi thời gian",
        "explanation": "Dùng mốc được ghi trong quy trình.",
        "icon": "⏱️"
      }
    ]
  },
  {
    "id": "memory-pass",
    "kind": "memory",
    "title": "Nhớ quy trình PASS",
    "subtitle": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "icon": "🧯",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "pairs": [
      {
        "id": "pair-1",
        "left": "P · Pull",
        "right": "Rút chốt",
        "explanation": "Theo hướng dẫn vận hành loại bình.",
        "icon": "🔓"
      },
      {
        "id": "pair-2",
        "left": "A · Aim",
        "right": "Ngắm vùng gốc",
        "explanation": "Chỉ trong điều kiện được huấn luyện an toàn.",
        "icon": "🎯"
      },
      {
        "id": "pair-3",
        "left": "S · Squeeze",
        "right": "Bóp tay gạt",
        "explanation": "Vận hành theo hướng dẫn loại bình.",
        "icon": "✋"
      },
      {
        "id": "pair-4",
        "left": "S · Sweep",
        "right": "Quét qua lại",
        "explanation": "Bao phủ vùng luyện tập được chỉ định.",
        "icon": "↔️"
      }
    ]
  },
  {
    "id": "memory-units",
    "kind": "memory",
    "title": "Đại lượng và đơn vị",
    "subtitle": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "icon": "📏",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "pairs": [
      {
        "id": "pair-1",
        "left": "Khối lượng",
        "right": "g",
        "explanation": "Ghi cùng kết quả đọc từ cân.",
        "icon": "⚖️"
      },
      {
        "id": "pair-2",
        "left": "Thể tích mẫu nhỏ",
        "right": "mL",
        "explanation": "Chọn dụng cụ và độ chia phù hợp.",
        "icon": "💧"
      },
      {
        "id": "pair-3",
        "left": "Thời gian",
        "right": "s",
        "explanation": "Ghi rõ mốc bắt đầu và kết thúc.",
        "icon": "⏱️"
      },
      {
        "id": "pair-4",
        "left": "Nhiệt độ bài học",
        "right": "°C",
        "explanation": "Không chạm tay để thử nhiệt.",
        "icon": "🌡️"
      },
      {
        "id": "pair-5",
        "left": "1 L",
        "right": "1000 mL",
        "explanation": "Quy đổi giá trị trước khi thay đơn vị.",
        "icon": "🧪"
      },
      {
        "id": "pair-6",
        "left": "1 g",
        "right": "1000 mg",
        "explanation": "Không chỉ đổi ký hiệu mà giữ nguyên số.",
        "icon": "📝"
      }
    ]
  },
  {
    "id": "memory-risks",
    "kind": "memory",
    "title": "Nguy cơ và phản ứng",
    "subtitle": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Lật hai thẻ để ghép khái niệm và công dụng.",
    "icon": "🛡️",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "pairs": [
      {
        "id": "pair-1",
        "left": "Găng bị rách",
        "right": "Thay găng phù hợp",
        "explanation": "Không tiếp tục dùng găng hỏng.",
        "icon": "🧤"
      },
      {
        "id": "pair-2",
        "left": "Chai mất nhãn",
        "right": "Báo để xác minh",
        "explanation": "Không ngửi hoặc nếm để đoán.",
        "icon": "🏷️"
      },
      {
        "id": "pair-3",
        "left": "Lối đi có ba lô",
        "right": "Cất đúng chỗ",
        "explanation": "Lối thoát phải thông thoáng.",
        "icon": "🎒"
      },
      {
        "id": "pair-4",
        "left": "Cốc bị nứt",
        "right": "Ngừng dùng và báo",
        "explanation": "Không thử độ bền bằng gia nhiệt.",
        "icon": "⚗️"
      },
      {
        "id": "pair-5",
        "left": "Dây điện hở",
        "right": "Không cấp nguồn",
        "explanation": "Báo giáo viên, không tự sửa.",
        "icon": "🔌"
      },
      {
        "id": "pair-6",
        "left": "Chưa hiểu quy trình",
        "right": "Dừng và hỏi",
        "explanation": "Không thử ngẫu nhiên.",
        "icon": "❔"
      }
    ]
  },
  {
    "id": "hazard-bench",
    "kind": "hazard",
    "title": "Soi lỗi trên bàn",
    "subtitle": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "icon": "🔎",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "scene": "bench",
    "hazards": [
      {
        "id": "spot-1",
        "label": "Bình sát mép",
        "x": 82,
        "y": 72,
        "radius": 10,
        "explanation": "Bình dễ bị va và rơi.",
        "remedy": "Đặt bình ổn định xa mép theo hướng dẫn.",
        "icon": "⚗️"
      },
      {
        "id": "spot-2",
        "label": "Cốc bị nứt",
        "x": 25,
        "y": 68,
        "radius": 10,
        "explanation": "Dụng cụ hỏng không được dùng.",
        "remedy": "Ngừng dùng và báo để thay.",
        "icon": "⚗️"
      },
      {
        "id": "spot-3",
        "label": "Đồ ăn trên bàn",
        "x": 53,
        "y": 67,
        "radius": 10,
        "explanation": "Thực phẩm có thể bị nhiễm.",
        "remedy": "Đưa đồ ăn ra khỏi khu thao tác.",
        "icon": "🍞"
      },
      {
        "id": "spot-4",
        "label": "Chai mất nhãn",
        "x": 66,
        "y": 48,
        "radius": 10,
        "explanation": "Không xác nhận được danh tính mẫu.",
        "remedy": "Giữ nguyên và báo giáo viên.",
        "icon": "❔"
      }
    ]
  },
  {
    "id": "hazard-storage",
    "kind": "hazard",
    "title": "Kiểm tra góc lưu trữ",
    "subtitle": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "icon": "🔎",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "scene": "storage",
    "hazards": [
      {
        "id": "spot-1",
        "label": "Chai chưa có nhãn",
        "x": 21,
        "y": 35,
        "radius": 10,
        "explanation": "Chất chưa được nhận diện đầy đủ.",
        "remedy": "Không dùng và yêu cầu xác minh.",
        "icon": "❔"
      },
      {
        "id": "spot-2",
        "label": "Chai sát mép kệ",
        "x": 80,
        "y": 39,
        "radius": 10,
        "explanation": "Vật chứa có nguy cơ rơi.",
        "remedy": "Báo để bố trí lại ổn định.",
        "icon": "🧴"
      },
      {
        "id": "spot-3",
        "label": "Đồ cá nhân lẫn mẫu",
        "x": 45,
        "y": 67,
        "radius": 10,
        "explanation": "Có thể gây nhiễm đồ cá nhân.",
        "remedy": "Cất riêng tại khu quy định.",
        "icon": "🎒"
      },
      {
        "id": "spot-4",
        "label": "Nắp vật chứa đang mở",
        "x": 72,
        "y": 74,
        "radius": 10,
        "explanation": "Có thể làm tăng tiếp xúc hoặc thất thoát.",
        "remedy": "Theo hướng dẫn đóng nắp thích hợp.",
        "icon": "⚗️"
      }
    ]
  },
  {
    "id": "hazard-exit",
    "kind": "hazard",
    "title": "Giữ lối thoát",
    "subtitle": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "icon": "🔎",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "scene": "emergency",
    "hazards": [
      {
        "id": "spot-1",
        "label": "Ba lô chắn cửa",
        "x": 22,
        "y": 77,
        "radius": 10,
        "explanation": "Vật cản làm khó di chuyển.",
        "remedy": "Đưa về ngăn cất đồ trước giờ thực hành.",
        "icon": "🎒"
      },
      {
        "id": "spot-2",
        "label": "Đồ che thiết bị",
        "x": 75,
        "y": 35,
        "radius": 10,
        "explanation": "Thiết bị khẩn cấp khó tiếp cận.",
        "remedy": "Giữ vùng tiếp cận thông thoáng.",
        "icon": "📦"
      },
      {
        "id": "spot-3",
        "label": "Dây qua lối",
        "x": 52,
        "y": 76,
        "radius": 10,
        "explanation": "Dây có thể gây vấp.",
        "remedy": "Báo để bố trí lại.",
        "icon": "🔌"
      },
      {
        "id": "spot-4",
        "label": "Vật chắn sơ đồ",
        "x": 45,
        "y": 28,
        "radius": 10,
        "explanation": "Thông tin thoát nạn bị che.",
        "remedy": "Báo để khôi phục khả năng quan sát.",
        "icon": "📄"
      }
    ]
  },
  {
    "id": "hazard-cleanup",
    "kind": "hazard",
    "title": "Tìm rủi ro sau thực hành",
    "subtitle": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Quan sát hình mô phỏng và chỉ ra đúng điểm chưa an toàn.",
    "icon": "🔎",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "scene": "bench",
    "hazards": [
      {
        "id": "spot-1",
        "label": "Mảnh vỡ trên sàn",
        "x": 20,
        "y": 85,
        "radius": 10,
        "explanation": "Vật sắc có thể gây cắt.",
        "remedy": "Cảnh báo rồi thu gom bằng dụng cụ phù hợp.",
        "icon": "◭"
      },
      {
        "id": "spot-2",
        "label": "Giấy nhiễm để lẫn",
        "x": 50,
        "y": 66,
        "radius": 10,
        "explanation": "Mất phân loại chất thải.",
        "remedy": "Đưa đúng vật chứa theo hướng dẫn.",
        "icon": "🟨"
      },
      {
        "id": "spot-3",
        "label": "Bình dư chưa nhãn",
        "x": 78,
        "y": 67,
        "radius": 10,
        "explanation": "Không rõ mẫu còn lại là gì.",
        "remedy": "Báo xác minh và quản lý theo quy trình.",
        "icon": "❔"
      },
      {
        "id": "spot-4",
        "label": "Khăn bẩn trên ghế",
        "x": 38,
        "y": 85,
        "radius": 10,
        "explanation": "Có thể truyền nhiễm bẩn.",
        "remedy": "Thu gom theo loại nhiễm, không dùng lại tùy ý.",
        "icon": "🧽"
      }
    ]
  },
  {
    "id": "volume-25",
    "kind": "precision",
    "title": "Vạch 25 mL",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "cylinder",
      "target": 25,
      "minimum": 0,
      "maximum": 50,
      "step": 0.5,
      "tolerance": 1,
      "unit": "mL",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": true
    }
  },
  {
    "id": "volume-40",
    "kind": "precision",
    "title": "Vạch 40 mL",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "cylinder",
      "target": 40,
      "minimum": 0,
      "maximum": 50,
      "step": 0.5,
      "tolerance": 0.5,
      "unit": "mL",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": true
    }
  },
  {
    "id": "balance-5",
    "kind": "precision",
    "title": "Mẫu cân 5 g",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "balance",
      "target": 5,
      "minimum": 0,
      "maximum": 20,
      "step": 0.1,
      "tolerance": 0.2,
      "unit": "g",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": true,
      "needsEyeLevel": false
    }
  },
  {
    "id": "balance-12",
    "kind": "precision",
    "title": "Mẫu cân 12,5 g",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "balance",
      "target": 12.5,
      "minimum": 0,
      "maximum": 20,
      "step": 0.1,
      "tolerance": 0.15,
      "unit": "g",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": true,
      "needsEyeLevel": false
    }
  },
  {
    "id": "pipette-2",
    "kind": "precision",
    "title": "Điều khiển 2,5 mL",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "pipette",
      "target": 2.5,
      "minimum": 0,
      "maximum": 10,
      "step": 0.1,
      "tolerance": 0.2,
      "unit": "mL",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": true
    }
  },
  {
    "id": "pipette-7",
    "kind": "precision",
    "title": "Điều khiển 7,5 mL",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "pipette",
      "target": 7.5,
      "minimum": 0,
      "maximum": 10,
      "step": 0.1,
      "tolerance": 0.15,
      "unit": "mL",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": true
    }
  },
  {
    "id": "temperature-40",
    "kind": "precision",
    "title": "Mức nhiệt mô phỏng 40°C",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "thermometer",
      "target": 40,
      "minimum": 0,
      "maximum": 80,
      "step": 0.5,
      "tolerance": 1,
      "unit": "°C",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": false
    }
  },
  {
    "id": "temperature-55",
    "kind": "precision",
    "title": "Mức nhiệt mô phỏng 55°C",
    "subtitle": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Điều chỉnh bằng nút, thanh trượt hoặc phím mũi tên; xác nhận khi số đọc ổn định.",
    "icon": "🎯",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "precision": {
      "instrument": "thermometer",
      "target": 55,
      "minimum": 0,
      "maximum": 80,
      "step": 0.5,
      "tolerance": 0.5,
      "unit": "°C",
      "instruction": "Đạt số được giao rồi xác nhận; độ chính xác thay đổi theo cấp chơi.",
      "needsTare": false,
      "needsEyeLevel": false
    }
  },
  {
    "id": "flow-first",
    "kind": "flow",
    "title": "Từng giọt đầu tiên",
    "subtitle": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "icon": "💧",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "flow": {
      "target": 25,
      "maxTemperature": 45,
      "pourRate": 12,
      "heatingRate": 0.8,
      "coolingRate": 5,
      "instruction": "Đây là mô hình luyện điều khiển, không phải thông số pha hóa chất thật. Luôn theo quy trình giáo viên.",
      "sourceLabel": "Axit mô phỏng",
      "receiverLabel": "Nước mô phỏng"
    }
  },
  {
    "id": "flow-steady",
    "kind": "flow",
    "title": "Dòng rót đều",
    "subtitle": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "icon": "💧",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "flow": {
      "target": 40,
      "maxTemperature": 45,
      "pourRate": 16,
      "heatingRate": 1,
      "coolingRate": 4,
      "instruction": "Đây là mô hình luyện điều khiển, không phải thông số pha hóa chất thật. Luôn theo quy trình giáo viên.",
      "sourceLabel": "Axit mô phỏng",
      "receiverLabel": "Nước mô phỏng"
    }
  },
  {
    "id": "flow-patience",
    "kind": "flow",
    "title": "Chậm mà chắc",
    "subtitle": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "icon": "💧",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "flow": {
      "target": 50,
      "maxTemperature": 45,
      "pourRate": 20,
      "heatingRate": 1.1,
      "coolingRate": 4,
      "instruction": "Đây là mô hình luyện điều khiển, không phải thông số pha hóa chất thật. Luôn theo quy trình giáo viên.",
      "sourceLabel": "Axit mô phỏng",
      "receiverLabel": "Nước mô phỏng"
    }
  },
  {
    "id": "flow-master",
    "kind": "flow",
    "title": "Kiểm soát cả dòng và nhiệt",
    "subtitle": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 180,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Giữ để rót từng phần, thả để nghỉ, khuấy và chờ nguội trong mô phỏng.",
    "icon": "💧",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "flow": {
      "target": 60,
      "maxTemperature": 45,
      "pourRate": 22,
      "heatingRate": 1.2,
      "coolingRate": 3.5,
      "instruction": "Đây là mô hình luyện điều khiển, không phải thông số pha hóa chất thật. Luôn theo quy trình giáo viên.",
      "sourceLabel": "Axit mô phỏng",
      "receiverLabel": "Nước mô phỏng"
    }
  },
  {
    "id": "decision-preparation-1",
    "kind": "decision",
    "title": "Chuẩn bị: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "caseIds": [
      "case-001",
      "case-002",
      "case-003",
      "case-004",
      "case-005",
      "case-006"
    ]
  },
  {
    "id": "decision-preparation-2",
    "kind": "decision",
    "title": "Chuẩn bị: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "preparation",
    "topicId": "preparation",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#38bdf8",
    "equipmentKinds": [
      "ppe",
      "mirror",
      "locker"
    ],
    "caseIds": [
      "case-007",
      "case-008",
      "case-009",
      "case-010",
      "case-011",
      "case-012"
    ]
  },
  {
    "id": "decision-identification-1",
    "kind": "decision",
    "title": "Nhận diện: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "identification",
    "topicId": "identification",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#a78bfa",
    "equipmentKinds": [
      "board",
      "glass"
    ],
    "caseIds": [
      "case-013",
      "case-014",
      "case-015",
      "case-016",
      "case-017",
      "case-018"
    ]
  },
  {
    "id": "decision-identification-2",
    "kind": "decision",
    "title": "Nhận diện: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "identification",
    "topicId": "identification",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#a78bfa",
    "equipmentKinds": [
      "board",
      "glass"
    ],
    "caseIds": [
      "case-019",
      "case-020",
      "case-021",
      "case-022",
      "case-023",
      "case-024"
    ]
  },
  {
    "id": "decision-measurement-1",
    "kind": "decision",
    "title": "Đo lường: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "caseIds": [
      "case-025",
      "case-026",
      "case-027",
      "case-028",
      "case-029",
      "case-030"
    ]
  },
  {
    "id": "decision-measurement-2",
    "kind": "decision",
    "title": "Đo lường: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "measurement",
    "topicId": "measurement",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#22d3ee",
    "equipmentKinds": [
      "balance",
      "volume",
      "ph",
      "clock"
    ],
    "caseIds": [
      "case-031",
      "case-032",
      "case-033",
      "case-034",
      "case-035",
      "case-036"
    ]
  },
  {
    "id": "decision-handling-1",
    "kind": "decision",
    "title": "Thao tác: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "caseIds": [
      "case-037",
      "case-038",
      "case-039",
      "case-040",
      "case-041",
      "case-042"
    ]
  },
  {
    "id": "decision-handling-2",
    "kind": "decision",
    "title": "Thao tác: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "handling",
    "topicId": "handling",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#fb923c",
    "equipmentKinds": [
      "heat",
      "acid",
      "hood",
      "gas"
    ],
    "caseIds": [
      "case-043",
      "case-044",
      "case-045",
      "case-046",
      "case-047",
      "case-048"
    ]
  },
  {
    "id": "decision-cleanup-1",
    "kind": "decision",
    "title": "Thu gom: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "caseIds": [
      "case-049",
      "case-050",
      "case-051",
      "case-052",
      "case-053",
      "case-054"
    ]
  },
  {
    "id": "decision-cleanup-2",
    "kind": "decision",
    "title": "Thu gom: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "cleanup",
    "topicId": "cleanup",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#4ade80",
    "equipmentKinds": [
      "spillKit",
      "waste",
      "wash"
    ],
    "caseIds": [
      "case-055",
      "case-056",
      "case-057",
      "case-058",
      "case-059",
      "case-060"
    ]
  },
  {
    "id": "decision-emergency-1",
    "kind": "decision",
    "title": "Ứng phó: tình huống 1",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "caseIds": [
      "case-061",
      "case-062",
      "case-063",
      "case-064",
      "case-065",
      "case-066"
    ]
  },
  {
    "id": "decision-emergency-2",
    "kind": "decision",
    "title": "Ứng phó: tình huống 2",
    "subtitle": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "skill": "emergency",
    "topicId": "emergency",
    "durationSeconds": 120,
    "objectives": [
      "Hoàn thành đúng thao tác của thử thách",
      "Nhận ra và sửa lựa chọn chưa an toàn",
      "Giải thích nguyên tắc sau khi hoàn thành"
    ],
    "coachTips": [
      "Đọc yêu cầu trước khi thao tác.",
      "Có thể tạm dừng để quan sát; gợi ý luôn có sẵn.",
      "Chính xác và hiểu nguyên tắc được ưu tiên hơn tốc độ."
    ],
    "debrief": "Chọn hành động rồi đọc phản hồi để hiểu tại sao.",
    "icon": "🧠",
    "accent": "#fb7185",
    "equipmentKinds": [
      "extinguisher",
      "shower",
      "door",
      "smokeAlarm"
    ],
    "caseIds": [
      "case-067",
      "case-068",
      "case-069",
      "case-070",
      "case-071",
      "case-072"
    ]
  }
];
