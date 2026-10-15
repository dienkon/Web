import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "vacuum-check",
  "taskId": "task_scenario_vacuum-check",
  "number": 18,
  "title": "Bình hút chân không chưa kiểm tra",
  "category": "equipment",
  "summary": "Một bình thủy tinh không rõ loại được nối sẵn vào đường hút.",
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
  "model": "vacuum",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "vacuum-check-clue-1",
      "title": "Thành bình",
      "detail": "Phải dùng dụng cụ được thiết kế và kiểm tra cho mục đích này.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "glass",
      "color": "#8a9cbb"
    },
    {
      "id": "vacuum-check-clue-2",
      "title": "Ống và khớp nối",
      "detail": "Khớp nối cần phù hợp và được xác nhận trước vận hành.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "hose",
      "color": "#8a9cbb"
    },
    {
      "id": "vacuum-check-clue-3",
      "title": "Tấm chắn",
      "detail": "Cần có biện pháp bảo vệ theo hướng dẫn thiết bị.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "barrier",
      "color": "#8a9cbb"
    }
  ],
  "decisions": [
    {
      "id": "vacuum-check-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có thể dùng bất kỳ bình thủy tinh nào cho chân không không?",
      "choices": [
        {
          "id": "vacuum-check-q1-1",
          "label": "Không; chỉ dùng thiết bị phù hợp do giáo viên xác nhận",
          "feedback": "Hình dáng hoặc độ dày nhìn bằng mắt không xác nhận bình phù hợp.",
          "safe": true
        },
        {
          "id": "vacuum-check-q1-2",
          "label": "Được nếu bình dày nhìn thấy được",
          "feedback": "Thao tác này làm tăng nguy cơ. Hình dáng hoặc độ dày nhìn bằng mắt không xác nhận bình phù hợp.",
          "safe": false
        },
        {
          "id": "vacuum-check-q1-3",
          "label": "Được nếu hút nhẹ",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Hình dáng hoặc độ dày nhìn bằng mắt không xác nhận bình phù hợp.",
          "safe": false
        }
      ]
    },
    {
      "id": "vacuum-check-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Phát hiện vết sứt ở bình thì làm gì?",
      "choices": [
        {
          "id": "vacuum-check-q2-1",
          "label": "Dán keo rồi chạy",
          "feedback": "Thao tác này làm tăng nguy cơ. Dụng cụ hư hỏng không được đưa vào hệ thống áp suất.",
          "safe": false
        },
        {
          "id": "vacuum-check-q2-2",
          "label": "Giảm mức hút và thử",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Dụng cụ hư hỏng không được đưa vào hệ thống áp suất.",
          "safe": false
        },
        {
          "id": "vacuum-check-q2-3",
          "label": "Dừng và báo giáo viên, không vận hành",
          "feedback": "Dụng cụ hư hỏng không được đưa vào hệ thống áp suất.",
          "safe": true
        }
      ]
    },
    {
      "id": "vacuum-check-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Trước khi tháo hệ thống phải làm gì?",
      "choices": [
        {
          "id": "vacuum-check-q3-1",
          "label": "Mở nắp khi máy còn chạy",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không tự tháo hệ thống khi chưa được xác nhận trạng thái an toàn.",
          "safe": false
        },
        {
          "id": "vacuum-check-q3-2",
          "label": "Theo quy trình dừng và cân bằng áp do người hướng dẫn chỉ định",
          "feedback": "Không tự tháo hệ thống khi chưa được xác nhận trạng thái an toàn.",
          "safe": true
        },
        {
          "id": "vacuum-check-q3-3",
          "label": "Giật ống ra thật nhanh",
          "feedback": "Thao tác này làm tăng nguy cơ. Không tự tháo hệ thống khi chưa được xác nhận trạng thái an toàn.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "vacuum-check-action-1",
      "label": "Kiểm tra loại bình và tình trạng",
      "explanation": "Không đưa bình chưa xác nhận vào vận hành."
    },
    {
      "id": "vacuum-check-action-2",
      "label": "Nhờ người phụ trách kiểm tra toàn hệ",
      "explanation": "Xác nhận ống nối và biện pháp chắn bảo vệ."
    },
    {
      "id": "vacuum-check-action-3",
      "label": "Vận hành và dừng theo hướng dẫn",
      "explanation": "Không tự thay đổi cấu hình hoặc tháo khi còn áp."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Bình này trông dày. Mình nối máy hút vào luôn nhé?",
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
      "line": "Phải kiểm tra đúng loại bình và cả hệ thống trước.",
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
      "line": "Quan sát thành bình, ống nối và tấm chắn của mô hình.",
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
    "cause": "Thiết bị được chọn theo hình thức bên ngoài.",
    "response": "Dừng để xác nhận cấu hình phù hợp.",
    "transfer": "Không thử hệ thống áp suất khi thiếu hướng dẫn và xác nhận thiết bị."
  }
};
