import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "blocked-exit",
  "taskId": "task_scenario_blocked-exit",
  "number": 14,
  "title": "Thùng đồ chắn lối thoát",
  "category": "exit",
  "summary": "Một kiện vật tư được đặt ngang đường từ bàn thực hành ra cửa.",
  "position": [
    -6,
    0.08,
    5.4
  ],
  "approach": [
    -6,
    0,
    6
  ],
  "color": "#84aa66",
  "model": "crate",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "blocked-exit-clue-1",
      "title": "Kiện vật tư",
      "detail": "Vật cản làm thu hẹp tuyến đi ra cửa.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "crate",
      "color": "#84aa66"
    },
    {
      "id": "blocked-exit-clue-2",
      "title": "Mũi tên thoát nạn",
      "detail": "Biển hướng dẫn chỉ tuyến thoát được quy định.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "label",
      "color": "#84aa66"
    },
    {
      "id": "blocked-exit-clue-3",
      "title": "Khoảng trống lối đi",
      "detail": "Không được biến lối thoát thành chỗ chứa đồ.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "barrier",
      "color": "#84aa66"
    }
  ],
  "decisions": [
    {
      "id": "blocked-exit-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Phát hiện vật cản ở lối thoát thì làm gì?",
      "choices": [
        {
          "id": "blocked-exit-q1-1",
          "label": "Báo giáo viên để tổ chức giải phóng lối đi an toàn",
          "feedback": "Lối thoát cần luôn thông thoáng và được kiểm tra.",
          "safe": true
        },
        {
          "id": "blocked-exit-q1-2",
          "label": "Bước qua và bỏ mặc",
          "feedback": "Thao tác này làm tăng nguy cơ. Lối thoát cần luôn thông thoáng và được kiểm tra.",
          "safe": false
        },
        {
          "id": "blocked-exit-q1-3",
          "label": "Đặt thêm đồ để dễ thấy",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Lối thoát cần luôn thông thoáng và được kiểm tra.",
          "safe": false
        }
      ]
    },
    {
      "id": "blocked-exit-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Có báo động trong lúc lối này bị chặn thì sao?",
      "choices": [
        {
          "id": "blocked-exit-q2-1",
          "label": "Cố chen qua kiện đồ",
          "feedback": "Thao tác này làm tăng nguy cơ. Không trì hoãn thoát nạn hoặc tự đi vào tuyến không an toàn.",
          "safe": false
        },
        {
          "id": "blocked-exit-q2-2",
          "label": "Quay lại thu dọn thiết bị",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không trì hoãn thoát nạn hoặc tự đi vào tuyến không an toàn.",
          "safe": false
        },
        {
          "id": "blocked-exit-q2-3",
          "label": "Theo hướng dẫn dùng lối thay thế an toàn",
          "feedback": "Không trì hoãn thoát nạn hoặc tự đi vào tuyến không an toàn.",
          "safe": true
        }
      ]
    },
    {
      "id": "blocked-exit-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Sau khi dọn vật cản cần làm gì?",
      "choices": [
        {
          "id": "blocked-exit-q3-1",
          "label": "Che biển thoát nạn bằng thùng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Giữ cả đường đi, cửa và biển chỉ dẫn luôn sử dụng được.",
          "safe": false
        },
        {
          "id": "blocked-exit-q3-2",
          "label": "Xác nhận lối đi thông thoáng và không đặt lại đồ ở đó",
          "feedback": "Giữ cả đường đi, cửa và biển chỉ dẫn luôn sử dụng được.",
          "safe": true
        },
        {
          "id": "blocked-exit-q3-3",
          "label": "Để thùng sát cửa hơn",
          "feedback": "Thao tác này làm tăng nguy cơ. Giữ cả đường đi, cửa và biển chỉ dẫn luôn sử dụng được.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "blocked-exit-action-1",
      "label": "Nhận diện và báo vật cản",
      "explanation": "Không tự nâng kiện nặng hoặc gây ngã đổ."
    },
    {
      "id": "blocked-exit-action-2",
      "label": "Theo hướng dẫn giải phóng lối đi",
      "explanation": "Dùng nơi chứa vật tư được chỉ định."
    },
    {
      "id": "blocked-exit-action-3",
      "label": "Kiểm tra lại đường thoát",
      "explanation": "Giữ tuyến đi và biển hướng dẫn không bị che."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Mình để thùng ở đây một lát, chắc không ai cần ra cửa đâu.",
      "camera": [
        -7.9,
        2.1,
        6
      ],
      "target": [
        -6,
        0.33,
        5.4
      ]
    },
    {
      "speaker": "Lan",
      "line": "Lối thoát phải luôn trống. Báo thầy để chuyển vật tư đúng chỗ.",
      "camera": [
        -4.4,
        1.7,
        6
      ],
      "target": [
        -6,
        0.33,
        5.4
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Hãy xác định vật cản, biển hướng dẫn và khoảng trống cần giữ.",
      "camera": [
        -7.2,
        2.3,
        6
      ],
      "target": [
        -6,
        0.33,
        5.4
      ]
    }
  ],
  "debrief": {
    "cause": "Vật tư được để tạm trên lối thoát.",
    "response": "Báo người phụ trách và giải phóng tuyến đi có tổ chức.",
    "transfer": "Đừng coi thời gian để tạm là lý do chặn lối thoát."
  }
};
