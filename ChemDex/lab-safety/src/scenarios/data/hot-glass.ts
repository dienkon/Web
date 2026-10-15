import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "hot-glass",
  "taskId": "task_scenario_hot-glass",
  "number": 10,
  "title": "Cốc nóng nhìn như cốc nguội",
  "category": "heat",
  "summary": "Một cốc vừa được đưa khỏi bếp nhưng chưa được đánh dấu đang nóng.",
  "position": [
    4.2,
    0.92,
    -2.2
  ],
  "approach": [
    4.2,
    0,
    -0.7000000000000002
  ],
  "color": "#db9a70",
  "model": "beaker",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "hot-glass-clue-1",
      "title": "Đế gia nhiệt",
      "detail": "Thiết bị vừa sử dụng và đã tắt công tắc.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "burner",
      "color": "#db9a70"
    },
    {
      "id": "hot-glass-clue-2",
      "title": "Cốc chưa có dấu báo",
      "detail": "Thủy tinh nóng có thể trông giống thủy tinh nguội.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "beaker",
      "color": "#db9a70"
    },
    {
      "id": "hot-glass-clue-3",
      "title": "Kẹp chịu nhiệt",
      "detail": "Dụng cụ phải phù hợp kích thước và cách thao tác.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "tray",
      "color": "#db9a70"
    }
  ],
  "decisions": [
    {
      "id": "hot-glass-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có thể dùng tay thử nhiệt cốc không?",
      "choices": [
        {
          "id": "hot-glass-q1-1",
          "label": "Không; coi cốc mới gia nhiệt là đang nóng",
          "feedback": "Không dùng tay để kiểm tra nhiệt độ thủy tinh.",
          "safe": true
        },
        {
          "id": "hot-glass-q1-2",
          "label": "Chạm nhanh bằng đầu ngón tay",
          "feedback": "Thao tác này làm tăng nguy cơ. Không dùng tay để kiểm tra nhiệt độ thủy tinh.",
          "safe": false
        },
        {
          "id": "hot-glass-q1-3",
          "label": "Chạm bằng găng mỏng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không dùng tay để kiểm tra nhiệt độ thủy tinh.",
          "safe": false
        }
      ]
    },
    {
      "id": "hot-glass-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Muốn di chuyển cốc phải làm gì?",
      "choices": [
        {
          "id": "hot-glass-q2-1",
          "label": "Cầm bằng khăn giấy",
          "feedback": "Thao tác này làm tăng nguy cơ. Dụng cụ nóng cần cách xử lý phù hợp; làm lạnh đột ngột có thể gây vỡ.",
          "safe": false
        },
        {
          "id": "hot-glass-q2-2",
          "label": "Đổ nước lạnh để nguội ngay",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Dụng cụ nóng cần cách xử lý phù hợp; làm lạnh đột ngột có thể gây vỡ.",
          "safe": false
        },
        {
          "id": "hot-glass-q2-3",
          "label": "Xin hướng dẫn và dùng dụng cụ chịu nhiệt phù hợp",
          "feedback": "Dụng cụ nóng cần cách xử lý phù hợp; làm lạnh đột ngột có thể gây vỡ.",
          "safe": true
        }
      ]
    },
    {
      "id": "hot-glass-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Đặt cốc chờ nguội ở đâu?",
      "choices": [
        {
          "id": "hot-glass-q3-1",
          "label": "Lẫn với cốc sạch đang dùng",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Vị trí chờ nguội phải ổn định và giúp người khác nhận biết nguy cơ.",
          "safe": false
        },
        {
          "id": "hot-glass-q3-2",
          "label": "Trên bề mặt chịu nhiệt tại vị trí được chỉ định, có cảnh báo",
          "feedback": "Vị trí chờ nguội phải ổn định và giúp người khác nhận biết nguy cơ.",
          "safe": true
        },
        {
          "id": "hot-glass-q3-3",
          "label": "Sát mép bàn",
          "feedback": "Thao tác này làm tăng nguy cơ. Vị trí chờ nguội phải ổn định và giúp người khác nhận biết nguy cơ.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "hot-glass-action-1",
      "label": "Dừng chạm vào cốc",
      "explanation": "Xác định cốc vừa được gia nhiệt."
    },
    {
      "id": "hot-glass-action-2",
      "label": "Báo tình trạng đang nóng",
      "explanation": "Giữ người khác tránh dùng nhầm."
    },
    {
      "id": "hot-glass-action-3",
      "label": "Đặt vào khu chờ nguội theo hướng dẫn",
      "explanation": "Dùng dụng cụ phù hợp nếu cần di chuyển."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Cốc trong veo rồi, chắc nguội. Mình lấy bằng tay nhé?",
      "camera": [
        2.3000000000000003,
        2.1,
        0.0
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Lan",
      "line": "Nó vừa ở trên bếp! Đừng thử bằng tay.",
      "camera": [
        5.800000000000001,
        1.7,
        -0.40000000000000013
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Hãy tìm nguồn nhiệt, vị trí cốc và dụng cụ chịu nhiệt.",
      "camera": [
        3.0,
        2.3,
        0.5999999999999996
      ],
      "target": [
        4.2,
        1.17,
        -2.2
      ]
    }
  ],
  "debrief": {
    "cause": "Cốc nóng không có dấu nhận biết.",
    "response": "Tránh chạm, cảnh báo và dùng dụng cụ phù hợp.",
    "transfer": "Luôn ghi nhớ thủy tinh nóng có thể trông giống thủy tinh nguội."
  }
};
