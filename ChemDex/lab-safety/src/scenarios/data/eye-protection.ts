import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "eye-protection",
  "taskId": "task_scenario_eye-protection",
  "number": 15,
  "title": "Kính bảo hộ bị tháo giữa buổi",
  "category": "hygiene",
  "summary": "Lan tháo kính bảo hộ khi bàn bên cạnh vẫn đang thao tác dung dịch.",
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
  "color": "#75bba7",
  "model": "goggles",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "eye-protection-clue-1",
      "title": "Kính đặt trên bàn",
      "detail": "Kính chưa được đeo trong khu vực đang thao tác.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "goggles",
      "color": "#75bba7"
    },
    {
      "id": "eye-protection-clue-2",
      "title": "Cốc mẫu đang mở",
      "detail": "Có nguy cơ dung dịch bắn do thao tác bên cạnh.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "beaker",
      "color": "#75bba7"
    },
    {
      "id": "eye-protection-clue-3",
      "title": "Trạm rửa mắt",
      "detail": "Cần biết vị trí trước buổi học.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "switch",
      "color": "#75bba7"
    }
  ],
  "decisions": [
    {
      "id": "eye-protection-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Khi nào được tháo kính bảo hộ?",
      "choices": [
        {
          "id": "eye-protection-q1-1",
          "label": "Theo hướng dẫn sau khi rời vùng có nguy cơ và được cho phép",
          "feedback": "Nguy cơ có thể đến từ thao tác của người bên cạnh.",
          "safe": true
        },
        {
          "id": "eye-protection-q1-2",
          "label": "Khi đến lượt bạn khác làm",
          "feedback": "Thao tác này làm tăng nguy cơ. Nguy cơ có thể đến từ thao tác của người bên cạnh.",
          "safe": false
        },
        {
          "id": "eye-protection-q1-3",
          "label": "Khi thấy kính hơi vướng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Nguy cơ có thể đến từ thao tác của người bên cạnh.",
          "safe": false
        }
      ]
    },
    {
      "id": "eye-protection-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Nếu có hóa chất bắn vào mắt thì ưu tiên gì?",
      "choices": [
        {
          "id": "eye-protection-q2-1",
          "label": "Chờ xem có đau không",
          "feedback": "Thao tác này làm tăng nguy cơ. Không trì hoãn rửa mắt để chờ triệu chứng hoặc tự điều trị.",
          "safe": false
        },
        {
          "id": "eye-protection-q2-2",
          "label": "Tự nhỏ thuốc trong cặp",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không trì hoãn rửa mắt để chờ triệu chứng hoặc tự điều trị.",
          "safe": false
        },
        {
          "id": "eye-protection-q2-3",
          "label": "Bắt đầu rửa mắt ngay tại trạm và gọi hỗ trợ theo quy trình",
          "feedback": "Không trì hoãn rửa mắt để chờ triệu chứng hoặc tự điều trị.",
          "safe": true
        }
      ]
    },
    {
      "id": "eye-protection-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Trước khi tiếp tục buổi thực hành cần gì?",
      "choices": [
        {
          "id": "eye-protection-q3-1",
          "label": "Nhờ bạn nhìn xem mắt có đỏ",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Sự cố phơi nhiễm cần được báo và xử lý theo quy trình của phòng lab.",
          "safe": false
        },
        {
          "id": "eye-protection-q3-2",
          "label": "Giáo viên xác nhận PPE và tình trạng người học phù hợp",
          "feedback": "Sự cố phơi nhiễm cần được báo và xử lý theo quy trình của phòng lab.",
          "safe": true
        },
        {
          "id": "eye-protection-q3-3",
          "label": "Chỉ cần lau khô kính",
          "feedback": "Thao tác này làm tăng nguy cơ. Sự cố phơi nhiễm cần được báo và xử lý theo quy trình của phòng lab.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "eye-protection-action-1",
      "label": "Dừng thao tác thiếu bảo hộ",
      "explanation": "Tránh thêm nguồn gây bắn."
    },
    {
      "id": "eye-protection-action-2",
      "label": "Báo giáo viên và dùng PPE đúng cách",
      "explanation": "Nếu đã phơi nhiễm, ưu tiên quy trình khẩn cấp."
    },
    {
      "id": "eye-protection-action-3",
      "label": "Chỉ tiếp tục khi được xác nhận",
      "explanation": "Không tự đánh giá an toàn chỉ bằng cảm giác."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Tới lượt bạn làm rồi, mình tháo kính cho đỡ vướng nhé?",
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
      "line": "Bàn vẫn đang dùng dung dịch. Kính vẫn cần được đeo.",
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
      "line": "Hãy tìm kính, nguồn có thể bắn và vị trí trạm rửa mắt.",
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
    "cause": "Người học hiểu nhầm PPE chỉ cần khi tự thao tác.",
    "response": "Giữ bảo hộ trong toàn bộ khu vực nguy cơ theo hướng dẫn.",
    "transfer": "Biết vị trí thiết bị khẩn cấp trước khi bắt đầu làm mẫu."
  }
};
