import type { LabScenario } from '../types';

export const scenario: LabScenario = {
  "id": "waste-mixing",
  "taskId": "task_scenario_waste-mixing",
  "number": 17,
  "title": "Hai chai chất thải khác nhóm",
  "category": "waste",
  "summary": "Minh định đổ hai loại chất thải vào cùng một bình đang gần đầy.",
  "position": [
    8.4,
    0.12,
    4.7
  ],
  "approach": [
    8.4,
    0,
    6
  ],
  "color": "#d2a955",
  "model": "waste",
  "objectives": [
    "Nhận diện ba dấu hiệu tại hiện trường",
    "Chọn cách ứng phó phù hợp với tình huống",
    "Thực hiện đúng thứ tự và báo cáo kết quả"
  ],
  "clues": [
    {
      "id": "waste-mixing-clue-1",
      "title": "Nhãn chất thải",
      "detail": "Nhãn ghi nhóm thu gom và thành phần được chấp nhận.",
      "offset": [
        -0.28,
        0.08,
        0.02
      ],
      "prop": "label",
      "color": "#d2a955"
    },
    {
      "id": "waste-mixing-clue-2",
      "title": "Bình gần đầy",
      "detail": "Không được tiếp tục nạp quá mức quy định.",
      "offset": [
        0.12,
        0.18,
        -0.08
      ],
      "prop": "waste",
      "color": "#d2a955"
    },
    {
      "id": "waste-mixing-clue-3",
      "title": "Chai mẫu khác nhóm",
      "detail": "Không trộn chất thải chỉ vì cùng là chất lỏng.",
      "offset": [
        0.4,
        0.08,
        0.08
      ],
      "prop": "bottle",
      "color": "#d2a955"
    }
  ],
  "decisions": [
    {
      "id": "waste-mixing-decision-1",
      "title": "Dừng nguy cơ",
      "prompt": "Có được trộn hai chất thải khác nhóm không?",
      "choices": [
        {
          "id": "waste-mixing-q1-1",
          "label": "Không; đọc nhãn và hỏi người phụ trách",
          "feedback": "Chất thải có thể phản ứng với nhau; nhóm thu gom phải được xác nhận.",
          "safe": true
        },
        {
          "id": "waste-mixing-q1-2",
          "label": "Được nếu đổ từ từ",
          "feedback": "Thao tác này làm tăng nguy cơ. Chất thải có thể phản ứng với nhau; nhóm thu gom phải được xác nhận.",
          "safe": false
        },
        {
          "id": "waste-mixing-q1-3",
          "label": "Được nếu chỉ một ít",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Chất thải có thể phản ứng với nhau; nhóm thu gom phải được xác nhận.",
          "safe": false
        }
      ]
    },
    {
      "id": "waste-mixing-decision-2",
      "title": "Chọn cách xử lý",
      "prompt": "Bình đã gần mức đầy cho phép thì sao?",
      "choices": [
        {
          "id": "waste-mixing-q2-1",
          "label": "Nén hoặc lắc cho có thêm chỗ",
          "feedback": "Thao tác này làm tăng nguy cơ. Không quá đầy và không chuyển chất thải tùy tiện.",
          "safe": false
        },
        {
          "id": "waste-mixing-q2-2",
          "label": "Đổ bớt xuống bồn rửa",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Không quá đầy và không chuyển chất thải tùy tiện.",
          "safe": false
        },
        {
          "id": "waste-mixing-q2-3",
          "label": "Dừng nạp và báo người phụ trách đổi bình phù hợp",
          "feedback": "Không quá đầy và không chuyển chất thải tùy tiện.",
          "safe": true
        }
      ]
    },
    {
      "id": "waste-mixing-decision-3",
      "title": "Xác nhận an toàn",
      "prompt": "Sau khi bỏ chất thải đúng quy định cần gì?",
      "choices": [
        {
          "id": "waste-mixing-q3-1",
          "label": "Xóa nhãn cũ cho sạch",
          "feedback": "Chưa xử lý được nguyên nhân của sự cố. Chất thải vẫn phải được quản lý sau khi thu gom.",
          "safe": false
        },
        {
          "id": "waste-mixing-q3-2",
          "label": "Đóng nắp theo hướng dẫn và giữ nhãn nhận diện rõ",
          "feedback": "Chất thải vẫn phải được quản lý sau khi thu gom.",
          "safe": true
        },
        {
          "id": "waste-mixing-q3-3",
          "label": "Để nắp mở cho bay hơi",
          "feedback": "Thao tác này làm tăng nguy cơ. Chất thải vẫn phải được quản lý sau khi thu gom.",
          "safe": false
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "waste-mixing-action-1",
      "label": "Đọc nhãn và kiểm tra mức chứa",
      "explanation": "Xác định bình phù hợp trước khi mở mẫu."
    },
    {
      "id": "waste-mixing-action-2",
      "label": "Báo người phụ trách khi không phù hợp",
      "explanation": "Không tự trộn hoặc đổi bình chưa có hướng dẫn."
    },
    {
      "id": "waste-mixing-action-3",
      "label": "Thu gom và đóng nắp đúng quy định",
      "explanation": "Giữ nhãn và khu vực sạch theo hướng dẫn."
    }
  ],
  "dialogue": [
    {
      "speaker": "Minh",
      "line": "Cả hai đều là chất lỏng, mình đổ chung cho nhanh nhé?",
      "camera": [
        6.5,
        2.1,
        6
      ],
      "target": [
        8.4,
        0.37,
        4.7
      ]
    },
    {
      "speaker": "Lan",
      "line": "Không được trộn chỉ dựa vào trạng thái lỏng. Bình còn gần đầy nữa.",
      "camera": [
        8,
        1.7,
        6
      ],
      "target": [
        8.4,
        0.37,
        4.7
      ]
    },
    {
      "speaker": "Giáo viên",
      "line": "Hãy đọc nhãn, quan sát mức chứa và xác định nhóm chất thải.",
      "camera": [
        7.2,
        2.3,
        6
      ],
      "target": [
        8.4,
        0.37,
        4.7
      ]
    }
  ],
  "debrief": {
    "cause": "Chất thải được xem là vật bỏ đi không còn nguy cơ.",
    "response": "Phân nhóm, kiểm tra mức chứa và hỏi người phụ trách.",
    "transfer": "Thu gom chất thải cũng là một thao tác hóa chất cần kiểm soát."
  }
};
