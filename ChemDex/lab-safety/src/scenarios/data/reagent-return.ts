import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "reagent-return",
  "taskId": "task_scenario_reagent-return",
  "number": 19,
  "title": "Mẫu thừa không trở lại chai gốc",
  "category": "chemical",
  "summary": "Lan lấy dư dung dịch và muốn rót lại vào chai hóa chất dùng chung.",
  "position": [
    -4.2,
    0.92,
    2.2
  ],
  "approach": [
    -4.2,
    0,
    3.7
  ],
  "color": "#e7b64a",
  "model": "tray",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "reagent-return-clue-1",
      "title": "Chai gốc dùng chung",
      "detail": "Mẫu đã lấy ra có thể mang tạp chất vào chai gốc.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "bottle",
      "color": "#e7b64a"
    },
    {
      "id": "reagent-return-clue-2",
      "title": "Cốc chứa mẫu thừa",
      "detail": "Mẫu thừa cần được xử lý theo quy trình thu gom.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "beaker",
      "color": "#e7b64a"
    },
    {
      "id": "reagent-return-clue-3",
      "title": "Ống lấy mẫu",
      "detail": "Dụng cụ đã tiếp xúc có thể gây nhiễm chéo.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "pipette",
      "color": "#e7b64a"
    }
  ],
  "decisions": [
    {
      "id": "reagent-return-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có nên trả dung dịch thừa về chai gốc không?",
      "choices": [
        {
          "id": "reagent-return-q1-1",
          "label": "Không; hỏi giáo viên về thu gom mẫu thừa",
          "feedback": "Mẫu thừa có thể bị nhiễm và ảnh hưởng toàn bộ chai gốc.",
          "safe": true
        },
        {
          "id": "reagent-return-q1-2",
          "label": "Có nếu mẫu vẫn trong",
          "feedback": "Thao tác này làm tăng nguy cơ. Mẫu thừa có thể bị nhiễm và ảnh hưởng toàn bộ chai gốc.",
          "safe": false
        },
        {
          "id": "reagent-return-q1-3",
          "label": "Có nếu mới lấy vài giây",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Mẫu thừa có thể bị nhiễm và ảnh hưởng toàn bộ chai gốc.",
          "safe": false
        }
      ]
    },
    {
      "id": "reagent-return-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Lần lấy mẫu tiếp theo nên làm gì?",
      "choices": [
        {
          "id": "reagent-return-q2-1",
          "label": "Lấy thật nhiều cho đủ",
          "feedback": "Thao tác này làm tăng nguy cơ. Chuẩn bị lượng phù hợp giúp giảm chất thải và thao tác chuyển mẫu.",
          "safe": false
        },
        {
          "id": "reagent-return-q2-2",
          "label": "Dùng lại mọi mẫu thừa",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Chuẩn bị lượng phù hợp giúp giảm chất thải và thao tác chuyển mẫu.",
          "safe": false
        },
        {
          "id": "reagent-return-q2-3",
          "label": "Ước lượng và lấy đúng lượng được hướng dẫn",
          "feedback": "Chuẩn bị lượng phù hợp giúp giảm chất thải và thao tác chuyển mẫu.",
          "safe": true
        }
      ]
    },
    {
      "id": "reagent-return-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Nếu đã lỡ rót ngược thì sao?",
      "choices": [
        {
          "id": "reagent-return-q3-1",
          "label": "Lắc chai cho đều",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Báo cáo kịp thời giúp tránh người khác dùng nhầm mẫu bị ảnh hưởng.",
          "safe": false
        },
        {
          "id": "reagent-return-q3-2",
          "label": "Báo ngay để giáo viên quản lý chai có nguy cơ nhiễm",
          "feedback": "Báo cáo kịp thời giúp tránh người khác dùng nhầm mẫu bị ảnh hưởng.",
          "safe": true
        },
        {
          "id": "reagent-return-q3-3",
          "label": "Im lặng vì không nhìn thấy khác biệt",
          "feedback": "Thao tác này làm tăng nguy cơ. Báo cáo kịp thời giúp tránh người khác dùng nhầm mẫu bị ảnh hưởng.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "reagent-return-action-1",
      "label": "Giữ mẫu thừa riêng",
      "explanation": "Không rót lại vào chai gốc."
    },
    {
      "id": "reagent-return-action-2",
      "label": "Xin hướng dẫn thu gom",
      "explanation": "Xác định loại chất thải phù hợp."
    },
    {
      "id": "reagent-return-action-3",
      "label": "Ghi nhận và chuẩn bị lượng đúng",
      "explanation": "Nếu đã rót ngược, báo ngay sự cố."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Mình lấy dư rồi. Rót lại để tiết kiệm hóa chất nhé?",
      "camera": [
        -6.1,
        2.1,
        4.4
      ],
      "target": [
        -4.2,
        1.17,
        2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Mẫu thừa có thể làm nhiễm cả chai gốc. Hỏi thầy cách thu gom.",
      "camera": [
        -2.6,
        1.7,
        4.0
      ],
      "target": [
        -4.2,
        1.17,
        2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Xem chai gốc, cốc thừa và ống lấy mẫu để xác định nguy cơ.",
      "camera": [
        -5.4,
        2.3,
        5.0
      ],
      "target": [
        -4.2,
        1.17,
        2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Tiết kiệm sai cách gây nguy cơ nhiễm chéo.",
    "response": "Giữ mẫu thừa riêng và xử lý theo hướng dẫn.",
    "transfer": "Lấy lượng cần thiết ngay từ đầu thay vì xử lý lượng dư."
  }
};
