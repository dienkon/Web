import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "dirty-gloves",
  "taskId": "task_scenario_dirty-gloves",
  "number": 16,
  "title": "Găng bẩn và chiếc điện thoại",
  "category": "hygiene",
  "summary": "Minh vừa xử lý mẫu xong và định cầm điện thoại bằng găng đang dùng.",
  "position": [
    4.2,
    0.92,
    2.2
  ],
  "approach": [
    4.2,
    0,
    3.7
  ],
  "color": "#75bba7",
  "model": "gloves",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "dirty-gloves-clue-1",
      "title": "Găng đã tiếp xúc mẫu",
      "detail": "Găng có thể mang chất bẩn dù không có vết rõ.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "gloves",
      "color": "#75bba7"
    },
    {
      "id": "dirty-gloves-clue-2",
      "title": "Vật dụng cá nhân",
      "detail": "Điện thoại không được đưa vào vùng thao tác hóa chất.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "crate",
      "color": "#75bba7"
    },
    {
      "id": "dirty-gloves-clue-3",
      "title": "Bồn rửa tay",
      "detail": "Cần rửa tay sau tháo găng theo quy trình.",
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
      "id": "dirty-gloves-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có thể cầm điện thoại bằng găng đang dùng không?",
      "choices": [
        {
          "id": "dirty-gloves-q1-1",
          "label": "Không; tránh đưa chất bẩn sang vật dụng cá nhân",
          "feedback": "Găng có thể gây lây nhiễm sang bề mặt thường chạm.",
          "safe": true
        },
        {
          "id": "dirty-gloves-q1-2",
          "label": "Được nếu găng còn khô",
          "feedback": "Thao tác này làm tăng nguy cơ. Găng có thể gây lây nhiễm sang bề mặt thường chạm.",
          "safe": false
        },
        {
          "id": "dirty-gloves-q1-3",
          "label": "Được nếu chỉ chạm cạnh máy",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Găng có thể gây lây nhiễm sang bề mặt thường chạm.",
          "safe": false
        }
      ]
    },
    {
      "id": "dirty-gloves-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Sau khi tháo găng thì làm gì?",
      "choices": [
        {
          "id": "dirty-gloves-q2-1",
          "label": "Lau găng lên áo",
          "feedback": "Thao tác này làm tăng nguy cơ. Tháo găng không thay thế việc rửa tay.",
          "safe": false
        },
        {
          "id": "dirty-gloves-q2-2",
          "label": "Cất găng vào túi để dùng lại",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Tháo găng không thay thế việc rửa tay.",
          "safe": false
        },
        {
          "id": "dirty-gloves-q2-3",
          "label": "Bỏ đúng nơi quy định và rửa tay",
          "feedback": "Tháo găng không thay thế việc rửa tay.",
          "safe": true
        }
      ]
    },
    {
      "id": "dirty-gloves-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Nếu đã chạm điện thoại bằng găng bẩn thì sao?",
      "choices": [
        {
          "id": "dirty-gloves-q3-1",
          "label": "Đưa cho bạn giữ giúp",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không làm lan chất bẩn bằng việc chuyền đồ hoặc lau tùy tiện.",
          "safe": false
        },
        {
          "id": "dirty-gloves-q3-2",
          "label": "Báo giáo viên để xử lý bề mặt theo hướng dẫn",
          "feedback": "Không làm lan chất bẩn bằng việc chuyền đồ hoặc lau tùy tiện.",
          "safe": true
        },
        {
          "id": "dirty-gloves-q3-3",
          "label": "Dùng tay trần lau ngay",
          "feedback": "Thao tác này làm tăng nguy cơ. Không làm lan chất bẩn bằng việc chuyền đồ hoặc lau tùy tiện.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "dirty-gloves-action-1",
      "label": "Đặt lại vật dụng cá nhân ở vùng sạch",
      "explanation": "Không tiếp tục chạm bằng găng đang dùng."
    },
    {
      "id": "dirty-gloves-action-2",
      "label": "Tháo và bỏ găng đúng cách",
      "explanation": "Thực hiện theo hướng dẫn, tránh chạm mặt ngoài bẩn."
    },
    {
      "id": "dirty-gloves-action-3",
      "label": "Rửa tay và báo bề mặt đã chạm",
      "explanation": "Nhờ giáo viên xử lý nguy cơ lây nhiễm."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Điện thoại đang rung. Mình bấm nhanh bằng găng chắc không sao.",
      "camera": [
        2.3000000000000003,
        2.1,
        4.4
      ],
      "target": [
        4.2,
        1.17,
        2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Găng có thể mang hóa chất. Đừng chạm vật dụng cá nhân.",
      "camera": [
        5.800000000000001,
        1.7,
        4.0
      ],
      "target": [
        4.2,
        1.17,
        2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Quan sát găng, vật dụng cá nhân và vị trí rửa tay.",
      "camera": [
        3.0,
        2.3,
        5.0
      ],
      "target": [
        4.2,
        1.17,
        2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Vùng sạch và vùng thao tác bị trộn lẫn.",
    "response": "Ngừng chạm đồ cá nhân, tháo găng đúng và rửa tay.",
    "transfer": "Bề mặt sạch không được chạm bằng găng đã xử lý mẫu."
  }
};
