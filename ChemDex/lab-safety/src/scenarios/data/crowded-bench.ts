import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "crowded-bench",
  "taskId": "task_scenario_crowded-bench",
  "number": 20,
  "title": "Bàn thực hành quá chật",
  "category": "equipment",
  "summary": "Balo, chai và dây dẫn đang chen nhau sát mép bàn.",
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
  "color": "#8a9cbb",
  "model": "tray",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "crowded-bench-clue-1",
      "title": "Balo trên bàn",
      "detail": "Vật dụng cá nhân chiếm vùng thao tác và có thể bị nhiễm.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "crate",
      "color": "#8a9cbb"
    },
    {
      "id": "crowded-bench-clue-2",
      "title": "Chai sát mép",
      "detail": "Dễ bị va quệt khi tay hoặc dây vướng qua.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "bottle",
      "color": "#8a9cbb"
    },
    {
      "id": "crowded-bench-clue-3",
      "title": "Dây qua lối tay",
      "detail": "Dây vướng làm tăng nguy cơ kéo đổ dụng cụ.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "hose",
      "color": "#8a9cbb"
    }
  ],
  "decisions": [
    {
      "id": "crowded-bench-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Trước khi tiếp tục thí nghiệm nên làm gì?",
      "choices": [
        {
          "id": "crowded-bench-q1-1",
          "label": "Dừng để sắp vùng làm việc theo hướng dẫn",
          "feedback": "Không tiếp tục thao tác trong vùng thiếu ổn định.",
          "safe": true
        },
        {
          "id": "crowded-bench-q1-2",
          "label": "Cố làm ở phần bàn còn trống",
          "feedback": "Thao tác này làm tăng nguy cơ. Không tiếp tục thao tác trong vùng thiếu ổn định.",
          "safe": false
        },
        {
          "id": "crowded-bench-q1-3",
          "label": "Đẩy tất cả đồ ra sát mép",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không tiếp tục thao tác trong vùng thiếu ổn định.",
          "safe": false
        }
      ]
    },
    {
      "id": "crowded-bench-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Vật dụng cá nhân nên để đâu?",
      "choices": [
        {
          "id": "crowded-bench-q2-1",
          "label": "Dưới chai hóa chất",
          "feedback": "Thao tác này làm tăng nguy cơ. Không để đồ cá nhân tiếp xúc hóa chất hoặc thiết bị an toàn.",
          "safe": false
        },
        {
          "id": "crowded-bench-q2-2",
          "label": "Treo vào ống cấp khí",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không để đồ cá nhân tiếp xúc hóa chất hoặc thiết bị an toàn.",
          "safe": false
        },
        {
          "id": "crowded-bench-q2-3",
          "label": "Khu riêng được quy định ngoài vùng thao tác",
          "feedback": "Không để đồ cá nhân tiếp xúc hóa chất hoặc thiết bị an toàn.",
          "safe": true
        }
      ]
    },
    {
      "id": "crowded-bench-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Sau khi sắp lại, kiểm tra điều gì?",
      "choices": [
        {
          "id": "crowded-bench-q3-1",
          "label": "Chỉ cần cất balo",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. An toàn cần kiểm tra cả bàn, dây và vùng di chuyển.",
          "safe": false
        },
        {
          "id": "crowded-bench-q3-2",
          "label": "Dụng cụ ổn định, dây gọn và đường đi không bị vướng",
          "feedback": "An toàn cần kiểm tra cả bàn, dây và vùng di chuyển.",
          "safe": true
        },
        {
          "id": "crowded-bench-q3-3",
          "label": "Chỉ cần bàn nhìn đẹp",
          "feedback": "Thao tác này làm tăng nguy cơ. An toàn cần kiểm tra cả bàn, dây và vùng di chuyển.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "crowded-bench-action-1",
      "label": "Dừng thao tác trên bàn chật",
      "explanation": "Không kéo dây hoặc xô chai khi đang dọn."
    },
    {
      "id": "crowded-bench-action-2",
      "label": "Chuyển đồ cá nhân về vùng quy định",
      "explanation": "Sắp chai và dụng cụ theo hướng dẫn."
    },
    {
      "id": "crowded-bench-action-3",
      "label": "Kiểm tra ổn định và khoảng trống",
      "explanation": "Giữ lối đi, nguồn cấp và vùng thao tác thông thoáng."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Bàn hơi chật nhưng mình vẫn còn một góc nhỏ để rót.",
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
      "line": "Dây đang vướng và chai sát mép. Sắp lại an toàn trước.",
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
      "line": "Tìm ba điểm gây vướng rồi chọn thứ tự chuẩn bị bàn.",
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
    "cause": "Thiếu bước chuẩn bị vùng làm việc.",
    "response": "Dừng và bố trí lại đồ, dây và khoảng trống.",
    "transfer": "Chuẩn bị bàn là một phần của thí nghiệm, không phải việc phụ."
  }
};
