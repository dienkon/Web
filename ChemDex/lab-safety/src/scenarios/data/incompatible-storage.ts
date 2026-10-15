import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "incompatible-storage",
  "taskId": "task_scenario_incompatible-storage",
  "number": 11,
  "title": "Hai chai không được để cạnh nhau",
  "category": "chemical",
  "summary": "Các chai vừa được sắp lên kệ theo thứ tự tên thay vì nhóm tương thích.",
  "position": [
    8.2,
    1,
    -0.4
  ],
  "approach": [
    8.2,
    0,
    1.1
  ],
  "color": "#e7b64a",
  "model": "cabinet",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "incompatible-storage-clue-1",
      "title": "Chai nhóm axit",
      "detail": "Cần xác định đúng nhóm và hướng dẫn lưu trữ.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "bottle",
      "color": "#e7b64a"
    },
    {
      "id": "incompatible-storage-clue-2",
      "title": "Chai nhóm bazơ",
      "detail": "Không đặt chung chỉ vì kích thước tương tự.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "bottle",
      "color": "#e7b64a"
    },
    {
      "id": "incompatible-storage-clue-3",
      "title": "Khay thứ cấp",
      "detail": "Khay giúp quản lý sự cố nhưng không thay thế phân nhóm.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "tray",
      "color": "#e7b64a"
    }
  ],
  "decisions": [
    {
      "id": "incompatible-storage-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Sắp hóa chất theo tiêu chí nào?",
      "choices": [
        {
          "id": "incompatible-storage-q1-1",
          "label": "Theo tương thích và hướng dẫn lưu trữ của phòng lab",
          "feedback": "Tên hoặc màu chai không biểu thị đầy đủ khả năng tương thích.",
          "safe": true
        },
        {
          "id": "incompatible-storage-q1-2",
          "label": "Chỉ theo bảng chữ cái",
          "feedback": "Thao tác này làm tăng nguy cơ. Tên hoặc màu chai không biểu thị đầy đủ khả năng tương thích.",
          "safe": false
        },
        {
          "id": "incompatible-storage-q1-3",
          "label": "Chỉ theo màu chai",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Tên hoặc màu chai không biểu thị đầy đủ khả năng tương thích.",
          "safe": false
        }
      ]
    },
    {
      "id": "incompatible-storage-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Không chắc hai chai có tương thích thì làm gì?",
      "choices": [
        {
          "id": "incompatible-storage-q2-1",
          "label": "Đặt chung để tiết kiệm chỗ",
          "feedback": "Thao tác này làm tăng nguy cơ. Không thử tương thích bằng cách tự trộn hóa chất.",
          "safe": false
        },
        {
          "id": "incompatible-storage-q2-2",
          "label": "Trộn một giọt để thử",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không thử tương thích bằng cách tự trộn hóa chất.",
          "safe": false
        },
        {
          "id": "incompatible-storage-q2-3",
          "label": "Giữ nguyên và hỏi giáo viên, đọc hướng dẫn an toàn",
          "feedback": "Không thử tương thích bằng cách tự trộn hóa chất.",
          "safe": true
        }
      ]
    },
    {
      "id": "incompatible-storage-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Ai cho phép chuyển chai sang khu lưu trữ khác?",
      "choices": [
        {
          "id": "incompatible-storage-q3-1",
          "label": "Bạn đang dọn bàn",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Việc bố trí hóa chất cần tuân theo quy định của phòng thí nghiệm.",
          "safe": false
        },
        {
          "id": "incompatible-storage-q3-2",
          "label": "Người phụ trách sau khi xác định nhóm và vị trí phù hợp",
          "feedback": "Việc bố trí hóa chất cần tuân theo quy định của phòng thí nghiệm.",
          "safe": true
        },
        {
          "id": "incompatible-storage-q3-3",
          "label": "Bất cứ ai thấy kệ trống",
          "feedback": "Thao tác này làm tăng nguy cơ. Việc bố trí hóa chất cần tuân theo quy định của phòng thí nghiệm.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "incompatible-storage-action-1",
      "label": "Đọc nhãn và nhận diện nhóm",
      "explanation": "Không đoán theo màu hoặc hình dáng chai."
    },
    {
      "id": "incompatible-storage-action-2",
      "label": "Báo vị trí chưa phù hợp",
      "explanation": "Tra hướng dẫn với người phụ trách."
    },
    {
      "id": "incompatible-storage-action-3",
      "label": "Sắp lại khi được chỉ dẫn",
      "explanation": "Giữ chai kín và khay thứ cấp phù hợp."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Hai chai này vừa khít một ngăn. Mình đặt sát nhau cho gọn.",
      "camera": [
        6.299999999999999,
        2.1,
        1.8000000000000003
      ],
      "target": [
        8.2,
        1.25,
        -0.4
      ]
    },
    {
      "speaker": "Lan",
      "line": "Cần kiểm tra nhóm tương thích trước, không chỉ nhìn kích thước.",
      "camera": [
        8,
        1.7,
        1.4
      ],
      "target": [
        8.2,
        1.25,
        -0.4
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Quan sát nhãn và khay rồi chọn cách bố trí an toàn.",
      "camera": [
        6.999999999999999,
        2.3,
        2.4
      ],
      "target": [
        8.2,
        1.25,
        -0.4
      ]
    }
  ],
  "debrief": {
    "cause": "Hóa chất được sắp theo sự tiện lợi.",
    "response": "Kiểm tra nhãn, tương thích và vị trí do người phụ trách chỉ định.",
    "transfer": "Sắp xếp đẹp không thay thế quy tắc phân nhóm hóa chất."
  }
};
