import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "pipette-bulb",
  "taskId": "task_scenario_pipette-bulb",
  "number": 12,
  "title": "Pipet cần bóng hút",
  "category": "equipment",
  "summary": "Minh cầm pipet nhưng chưa lấy bóng hút hoặc bộ hút cơ học.",
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
  "color": "#8a9cbb",
  "model": "pipette",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "pipette-bulb-clue-1",
      "title": "Pipet thủy tinh",
      "detail": "Dụng cụ có đầu hẹp để lấy thể tích mẫu.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "pipette",
      "color": "#8a9cbb"
    },
    {
      "id": "pipette-bulb-clue-2",
      "title": "Bóng hút rời",
      "detail": "Cần dùng bộ hút cơ học phù hợp.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "gloves",
      "color": "#8a9cbb"
    },
    {
      "id": "pipette-bulb-clue-3",
      "title": "Chai mẫu",
      "detail": "Mẫu phải được nhận diện trước khi lấy.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "bottle",
      "color": "#8a9cbb"
    }
  ],
  "decisions": [
    {
      "id": "pipette-bulb-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có được hút pipet bằng miệng không?",
      "choices": [
        {
          "id": "pipette-bulb-q1-1",
          "label": "Không; dùng bóng hút hoặc bộ hút cơ học phù hợp",
          "feedback": "Không hút pipet bằng miệng trong phòng thí nghiệm.",
          "safe": true
        },
        {
          "id": "pipette-bulb-q1-2",
          "label": "Được nếu chỉ hút nước",
          "feedback": "Thao tác này làm tăng nguy cơ. Không hút pipet bằng miệng trong phòng thí nghiệm.",
          "safe": false
        },
        {
          "id": "pipette-bulb-q1-3",
          "label": "Được nếu hút thật nhẹ",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không hút pipet bằng miệng trong phòng thí nghiệm.",
          "safe": false
        }
      ]
    },
    {
      "id": "pipette-bulb-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Trước khi lấy mẫu cần kiểm tra gì?",
      "choices": [
        {
          "id": "pipette-bulb-q2-1",
          "label": "Chỉ cần thấy pipet sạch",
          "feedback": "Thao tác này làm tăng nguy cơ. Dụng cụ và danh tính mẫu đều phải được xác nhận.",
          "safe": false
        },
        {
          "id": "pipette-bulb-q2-2",
          "label": "Chỉ kiểm tra màu dung dịch",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Dụng cụ và danh tính mẫu đều phải được xác nhận.",
          "safe": false
        },
        {
          "id": "pipette-bulb-q2-3",
          "label": "Nhãn mẫu, pipet nguyên vẹn và bộ hút phù hợp",
          "feedback": "Dụng cụ và danh tính mẫu đều phải được xác nhận.",
          "safe": true
        }
      ]
    },
    {
      "id": "pipette-bulb-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Nếu bộ hút không khớp pipet thì sao?",
      "choices": [
        {
          "id": "pipette-bulb-q3-1",
          "label": "Dùng miệng thay thế",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không ép thủy tinh hoặc thay bằng thao tác hút miệng.",
          "safe": false
        },
        {
          "id": "pipette-bulb-q3-2",
          "label": "Dừng và nhờ giáo viên đổi dụng cụ phù hợp",
          "feedback": "Không ép thủy tinh hoặc thay bằng thao tác hút miệng.",
          "safe": true
        },
        {
          "id": "pipette-bulb-q3-3",
          "label": "Cố ép thật mạnh",
          "feedback": "Thao tác này làm tăng nguy cơ. Không ép thủy tinh hoặc thay bằng thao tác hút miệng.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "pipette-bulb-action-1",
      "label": "Chọn bộ hút phù hợp",
      "explanation": "Lấy bóng hút hoặc bộ hút cơ học được hướng dẫn."
    },
    {
      "id": "pipette-bulb-action-2",
      "label": "Kiểm tra và lắp theo chỉ dẫn",
      "explanation": "Không ép mạnh vào thủy tinh."
    },
    {
      "id": "pipette-bulb-action-3",
      "label": "Lấy mẫu đúng kỹ thuật",
      "explanation": "Chỉ tiến hành sau khi được hướng dẫn thao tác."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Mình quên bóng hút. Hút một chút bằng miệng có được không?",
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
      "line": "Không được, kể cả khi nghĩ mẫu chỉ là nước.",
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
      "line": "Hãy xác định pipet, bóng hút và chai mẫu trước khi chọn thao tác.",
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
    "cause": "Thiếu bộ hút làm xuất hiện ý định hút bằng miệng.",
    "response": "Dừng để lấy dụng cụ cơ học đúng loại.",
    "transfer": "Chuẩn bị đủ dụng cụ trước khi mở chai mẫu."
  }
};
