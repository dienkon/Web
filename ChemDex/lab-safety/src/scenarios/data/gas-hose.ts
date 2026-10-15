import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "gas-hose",
  "taskId": "task_scenario_gas-hose",
  "number": 9,
  "title": "Ống dẫn khí tuột khớp",
  "category": "gas",
  "summary": "Đầu ống mềm của đèn đốt đang lỏng khỏi khớp nối.",
  "position": [
    4.2,
    0.93,
    -2.2
  ],
  "approach": [
    4.2,
    0,
    -0.7000000000000002
  ],
  "color": "#76a987",
  "model": "hose",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "gas-hose-clue-1",
      "title": "Đầu ống bị lệch",
      "detail": "Khớp nối không còn nằm đúng vị trí.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "hose",
      "color": "#76a987"
    },
    {
      "id": "gas-hose-clue-2",
      "title": "Nguồn đánh lửa",
      "detail": "Không thử rò rỉ bằng ngọn lửa.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "burner",
      "color": "#76a987"
    },
    {
      "id": "gas-hose-clue-3",
      "title": "Van cấp khí",
      "detail": "Chỉ người được hướng dẫn mới cô lập nguồn khi an toàn.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "switch",
      "color": "#76a987"
    }
  ],
  "decisions": [
    {
      "id": "gas-hose-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Phát hiện ống lỏng, em làm gì trước?",
      "choices": [
        {
          "id": "gas-hose-q1-1",
          "label": "Dừng thao tác, tránh nguồn đánh lửa và báo giáo viên",
          "feedback": "Không thử rò rỉ bằng lửa hoặc tiếp tục vận hành hệ thống lỗi.",
          "safe": true
        },
        {
          "id": "gas-hose-q1-2",
          "label": "Bật lửa thử xem khí còn ra không",
          "feedback": "Thao tác này làm tăng nguy cơ. Không thử rò rỉ bằng lửa hoặc tiếp tục vận hành hệ thống lỗi.",
          "safe": false
        },
        {
          "id": "gas-hose-q1-3",
          "label": "Bóp ống bằng tay rồi tiếp tục",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không thử rò rỉ bằng lửa hoặc tiếp tục vận hành hệ thống lỗi.",
          "safe": false
        }
      ]
    },
    {
      "id": "gas-hose-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Có nên tự tháo lắp khớp nối không?",
      "choices": [
        {
          "id": "gas-hose-q2-1",
          "label": "Tự gắn thật nhanh khi khí đang cấp",
          "feedback": "Thao tác này làm tăng nguy cơ. Nguồn cấp và tình trạng ống phải được người phụ trách xử lý.",
          "safe": false
        },
        {
          "id": "gas-hose-q2-2",
          "label": "Nhờ bạn giữ đầu ống",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Nguồn cấp và tình trạng ống phải được người phụ trách xử lý.",
          "safe": false
        },
        {
          "id": "gas-hose-q2-3",
          "label": "Không; để người phụ trách kiểm tra và cô lập nguồn",
          "feedback": "Nguồn cấp và tình trạng ống phải được người phụ trách xử lý.",
          "safe": true
        }
      ]
    },
    {
      "id": "gas-hose-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Khi nào được dùng lại đèn đốt?",
      "choices": [
        {
          "id": "gas-hose-q3-1",
          "label": "Khi không còn nghe tiếng khí",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không nghe hoặc không ngửi thấy khí không phải xác nhận an toàn.",
          "safe": false
        },
        {
          "id": "gas-hose-q3-2",
          "label": "Khi hệ thống đã được kiểm tra và giáo viên cho phép",
          "feedback": "Không nghe hoặc không ngửi thấy khí không phải xác nhận an toàn.",
          "safe": true
        },
        {
          "id": "gas-hose-q3-3",
          "label": "Ngay khi đầu ống nhìn thẳng",
          "feedback": "Thao tác này làm tăng nguy cơ. Không nghe hoặc không ngửi thấy khí không phải xác nhận an toàn.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "gas-hose-action-1",
      "label": "Dừng và tránh đánh lửa",
      "explanation": "Không tạo thêm nguồn bắt cháy."
    },
    {
      "id": "gas-hose-action-2",
      "label": "Cảnh báo và báo người phụ trách",
      "explanation": "Không tự sửa ống khi nguồn chưa được xử lý."
    },
    {
      "id": "gas-hose-action-3",
      "label": "Chờ kiểm tra hệ thống",
      "explanation": "Chỉ tiếp tục sau khi được cho phép."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Ống bị trượt ra một chút. Mình bật đèn kiểm tra thử nhé?",
      "camera": [
        2.3000000000000003,
        2.1,
        0.0
      ],
      "target": [
        4.2,
        1.1800000000000002,
        -2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Đừng đánh lửa! Giữ khoảng cách và báo thầy ngay.",
      "camera": [
        5.800000000000001,
        1.7,
        -0.40000000000000013
      ],
      "target": [
        4.2,
        1.1800000000000002,
        -2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Đây là mô hình huấn luyện. Hãy xác định đầu ống, nguồn lửa và van cấp.",
      "camera": [
        3.0,
        2.3,
        0.5999999999999996
      ],
      "target": [
        4.2,
        1.1800000000000002,
        -2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Khớp nối chưa được kiểm tra trước khi cấp khí.",
    "response": "Dừng thao tác, tránh đánh lửa và báo người phụ trách.",
    "transfer": "Kiểm tra ống, khớp nối và quy trình sử dụng trước buổi thực hành."
  }
};
