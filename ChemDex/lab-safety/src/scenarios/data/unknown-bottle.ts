import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "unknown-bottle",
  "taskId": "task_scenario_unknown-bottle",
  "number": 7,
  "title": "Chai hóa chất mất nhãn",
  "category": "chemical",
  "summary": "Minh tìm thấy một chai dung dịch không còn nhãn trên khay mẫu.",
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
  "model": "bottle",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "unknown-bottle-clue-1",
      "title": "Nhãn bị bong",
      "detail": "Không còn tên hóa chất và ký hiệu nguy hại trên chai.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "label",
      "color": "#e7b64a"
    },
    {
      "id": "unknown-bottle-clue-2",
      "title": "Nắp chai chưa kín",
      "detail": "Không mở thêm hoặc đưa sát mặt để kiểm tra.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "bottle",
      "color": "#e7b64a"
    },
    {
      "id": "unknown-bottle-clue-3",
      "title": "Khay chứa riêng",
      "detail": "Mẫu đang nằm cùng các chai đã có tên, dễ bị dùng nhầm.",
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
      "id": "unknown-bottle-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Em xử lý chai không có nhãn như thế nào?",
      "choices": [
        {
          "id": "unknown-bottle-q1-1",
          "label": "Dừng sử dụng, giữ nguyên và báo giáo viên",
          "feedback": "Màu hoặc mùi không xác nhận được danh tính hóa chất.",
          "safe": true
        },
        {
          "id": "unknown-bottle-q1-2",
          "label": "Ngửi để đoán thành phần",
          "feedback": "Thao tác này làm tăng nguy cơ. Màu hoặc mùi không xác nhận được danh tính hóa chất.",
          "safe": false
        },
        {
          "id": "unknown-bottle-q1-3",
          "label": "Dán tên hóa chất dựa vào màu",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Màu hoặc mùi không xác nhận được danh tính hóa chất.",
          "safe": false
        }
      ]
    },
    {
      "id": "unknown-bottle-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Có được đổ mẫu vào chai khác cho gọn không?",
      "choices": [
        {
          "id": "unknown-bottle-q2-1",
          "label": "Đổ chung vào chai gần nhất",
          "feedback": "Thao tác này làm tăng nguy cơ. Không trộn mẫu chưa biết và không đổ hóa chất xuống bồn rửa.",
          "safe": false
        },
        {
          "id": "unknown-bottle-q2-2",
          "label": "Đổ xuống bồn rửa",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không trộn mẫu chưa biết và không đổ hóa chất xuống bồn rửa.",
          "safe": false
        },
        {
          "id": "unknown-bottle-q2-3",
          "label": "Không; chờ người phụ trách xác định và hướng dẫn",
          "feedback": "Không trộn mẫu chưa biết và không đổ hóa chất xuống bồn rửa.",
          "safe": true
        }
      ]
    },
    {
      "id": "unknown-bottle-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Khi nào có thể dùng lại mẫu này?",
      "choices": [
        {
          "id": "unknown-bottle-q3-1",
          "label": "Khi một bạn nói đã từng dùng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Việc xác minh và dán nhãn phải do người phụ trách quyết định.",
          "safe": false
        },
        {
          "id": "unknown-bottle-q3-2",
          "label": "Sau khi người phụ trách xác nhận danh tính, nhãn và cách dùng",
          "feedback": "Việc xác minh và dán nhãn phải do người phụ trách quyết định.",
          "safe": true
        },
        {
          "id": "unknown-bottle-q3-3",
          "label": "Khi chai được lau sạch",
          "feedback": "Thao tác này làm tăng nguy cơ. Việc xác minh và dán nhãn phải do người phụ trách quyết định.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "unknown-bottle-action-1",
      "label": "Dừng thao tác với mẫu",
      "explanation": "Đặt dụng cụ đang dùng xuống vị trí an toàn."
    },
    {
      "id": "unknown-bottle-action-2",
      "label": "Cảnh báo và báo giáo viên",
      "explanation": "Giữ chai nguyên trạng, tránh người khác dùng nhầm."
    },
    {
      "id": "unknown-bottle-action-3",
      "label": "Chờ xác nhận trước khi tiếp tục",
      "explanation": "Chỉ thao tác khi có nhãn và chỉ dẫn phù hợp."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Chai này mất nhãn nhưng màu giống mẫu nước muối. Mình dùng luôn nhé?",
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
      "line": "Không đoán theo màu. Đặt lại trên khay và báo thầy trước.",
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
      "line": "Hãy kiểm tra ba dấu hiệu, rồi quyết định cách quản lý mẫu chưa biết.",
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
    "cause": "Chai mất nhãn tạo nguy cơ nhầm hóa chất.",
    "response": "Dừng dùng và giao người phụ trách xác minh.",
    "transfer": "Kiểm tra nhãn trước mỗi lần lấy mẫu, kể cả mẫu trông quen thuộc."
  }
};
