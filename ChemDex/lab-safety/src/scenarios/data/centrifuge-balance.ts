import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "centrifuge-balance",
  "taskId": "task_scenario_centrifuge-balance",
  "number": 13,
  "title": "Máy ly tâm mất cân bằng",
  "category": "equipment",
  "summary": "Hai ống mẫu trong rotor đang được đặt lệch về cùng một phía.",
  "position": [
    -4.2,
    0.92,
    -2.2
  ],
  "approach": [
    -4.2,
    0,
    -0.7000000000000002
  ],
  "color": "#8a9cbb",
  "model": "centrifuge",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "centrifuge-balance-clue-1",
      "title": "Hai ống cùng phía",
      "detail": "Vị trí tải chưa được cân đối theo hướng dẫn máy.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "glass",
      "color": "#8a9cbb"
    },
    {
      "id": "centrifuge-balance-clue-2",
      "title": "Nắp máy",
      "detail": "Không mở nắp hay chạm rotor đang quay.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "centrifuge",
      "color": "#8a9cbb"
    },
    {
      "id": "centrifuge-balance-clue-3",
      "title": "Bảng cấu hình mẫu",
      "detail": "Cần xác nhận ống và cách cân bằng trước khi chạy.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "label",
      "color": "#8a9cbb"
    }
  ],
  "decisions": [
    {
      "id": "centrifuge-balance-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có nên bấm chạy ngay không?",
      "choices": [
        {
          "id": "centrifuge-balance-q1-1",
          "label": "Không; kiểm tra cân bằng theo hướng dẫn của máy",
          "feedback": "Tải không cân bằng có thể gây rung và hỏng thiết bị.",
          "safe": true
        },
        {
          "id": "centrifuge-balance-q1-2",
          "label": "Chạy tốc độ thấp để thử",
          "feedback": "Thao tác này làm tăng nguy cơ. Tải không cân bằng có thể gây rung và hỏng thiết bị.",
          "safe": false
        },
        {
          "id": "centrifuge-balance-q1-3",
          "label": "Giữ nắp bằng tay khi chạy",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Tải không cân bằng có thể gây rung và hỏng thiết bị.",
          "safe": false
        }
      ]
    },
    {
      "id": "centrifuge-balance-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Máy rung bất thường thì làm gì?",
      "choices": [
        {
          "id": "centrifuge-balance-q2-1",
          "label": "Mở nắp để nhìn rotor",
          "feedback": "Thao tác này làm tăng nguy cơ. Không mở nắp hoặc chạm rotor khi máy chưa dừng an toàn.",
          "safe": false
        },
        {
          "id": "centrifuge-balance-q2-2",
          "label": "Dùng tay đè máy xuống",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không mở nắp hoặc chạm rotor khi máy chưa dừng an toàn.",
          "safe": false
        },
        {
          "id": "centrifuge-balance-q2-3",
          "label": "Dừng theo quy trình và báo người phụ trách",
          "feedback": "Không mở nắp hoặc chạm rotor khi máy chưa dừng an toàn.",
          "safe": true
        }
      ]
    },
    {
      "id": "centrifuge-balance-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Khi nào lấy ống mẫu ra?",
      "choices": [
        {
          "id": "centrifuge-balance-q3-1",
          "label": "Ngay khi vừa bấm dừng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Phải tuân theo tín hiệu khóa và quy trình của máy.",
          "safe": false
        },
        {
          "id": "centrifuge-balance-q3-2",
          "label": "Sau khi rotor dừng hoàn toàn và khóa cho phép mở",
          "feedback": "Phải tuân theo tín hiệu khóa và quy trình của máy.",
          "safe": true
        },
        {
          "id": "centrifuge-balance-q3-3",
          "label": "Khi thấy màn hình về số không",
          "feedback": "Thao tác này làm tăng nguy cơ. Phải tuân theo tín hiệu khóa và quy trình của máy.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "centrifuge-balance-action-1",
      "label": "Kiểm tra ống và vị trí tải",
      "explanation": "Nhờ giáo viên xác nhận cách cân bằng."
    },
    {
      "id": "centrifuge-balance-action-2",
      "label": "Đóng nắp và xác nhận cấu hình",
      "explanation": "Chỉ chạy khi thiết bị được cho phép."
    },
    {
      "id": "centrifuge-balance-action-3",
      "label": "Chờ dừng hoàn toàn trước khi mở",
      "explanation": "Nếu bất thường, dừng đúng quy trình và báo phụ trách."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Hai ống cùng bên này dễ lấy. Mình bấm chạy nhé?",
      "camera": [
        -6.1,
        2.1,
        0.0
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Chưa được. Cần cân bằng tải theo hướng dẫn máy.",
      "camera": [
        -2.6,
        1.7,
        -0.40000000000000013
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Quan sát vị trí ống, nắp và bảng cấu hình trước khi quyết định.",
      "camera": [
        -5.4,
        2.3,
        0.5999999999999996
      ],
      "target": [
        -4.2,
        1.17,
        -2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Tải mẫu được xếp theo sự tiện lấy.",
    "response": "Kiểm tra cân bằng và cơ cấu khóa trước khi chạy.",
    "transfer": "Mỗi thiết bị có cấu hình và quy trình riêng cần được hướng dẫn."
  }
};
