/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Tin Học 12 - Cơ sở dữ liệu quan hệ & Truy vấn SQL (GDPT 2018)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const csDatabaseSqlMode: PracticeMode = {
  id: "cs_database_sql",
  title: "Tin Học 12: CSDL Quan hệ & Truy vấn SQL",
  description: "Luyện tập mô hình dữ liệu quan hệ, khóa chính, khóa ngoại và câu lệnh truy vấn SQL theo đề thi THPT 2025.",
  shortTag: "CSDL & SQL 12",
  category: "cs",
  gradeRange: [12, 12],
  icon: "Database",
  badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Khái niệm CSDL, bảng, trường (thuộc tính), bản ghi, khóa chính" },
    { id: 2, name: "Thông hiểu", description: "Khóa ngoại, ràng buộc toàn vẹn, cú pháp SELECT, WHERE, ORDER BY" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, kết nối bảng JOIN, hàm tổng hợp COUNT, SUM, GROUP BY" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: SQL Query & Relational Model
    if (diff >= 2 && formatRoll < 0.4) {
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Thuộc tính \`MaHocSinh\` được chọn làm khóa chính (PRIMARY KEY) thì không được phép chứa giá trị rỗng (NULL) và các giá trị không được trùng lặp.`,
          isCorrect: true,
          explanation: `Ràng buộc thực thể của khóa chính yêu cầu tính duy nhất và không nhận giá trị NULL.`,
        },
        {
          id: "b",
          text: `Mệnh đề \`WHERE DiemTB >= 8.0\` được dùng để lọc các bản ghi trước khi thực hiện nhóm dữ liệu (GROUP BY).`,
          isCorrect: true,
          explanation: `Mệnh đề WHERE lọc từng hàng thỏa mãn điều kiện trước khi tập hợp thành các nhóm.`,
        },
        {
          id: "c",
          text: `Để sắp xếp danh sách học sinh theo thứ tự giảm dần của \`DiemTB\`, ta sử dụng mệnh đề \`ORDER BY DiemTB ASC\`.`,
          isCorrect: false,
          explanation: `Sắp xếp giảm dần phải dùng từ khóa DESC (\`ORDER BY DiemTB DESC\`). ASC là sắp xếp tăng dần.`,
        },
        {
          id: "d",
          text: `Khóa ngoại (FOREIGN KEY) dùng để liên kết dữ liệu giữa hai bảng và đảm bảo tính toàn vẹn tham chiếu.`,
          isCorrect: true,
          explanation: `Khóa ngoại trỏ đến khóa chính của bảng khác để đảm bảo tính toàn vẹn tham chiếu.`,
        },
      ];

      return {
        id: `cs_sql_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Cho bảng CSDL \`HocSinh(MaHocSinh, HoTen, NgaySinh, Lop, DiemTB)\`. Xét tính đúng/sai của các mệnh đề sau về thiết kế và truy vấn CSDL:`,
        subText: "Tin Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: true },
        trueFalseStatements: statements,
        hints: [
          "Khóa chính luôn duy nhất và NOT NULL.",
          "ASC = Ascending (Tăng dần), DESC = Descending (Giảm dần).",
        ],
        misconceptions: [
          "Nhầm lẫn giữa ASC (tăng dần) và DESC (giảm dần).",
          "Nghĩ rằng khóa chính có thể để trống (NULL).",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, nguyên tắc khóa chính.\n- Ý b: Đúng, WHERE lọc trước khi nhóm.\n- Ý c: Sai, giảm dần là DESC chứ không phải ASC.\n- Ý d: Đúng, định nghĩa khóa ngoại và toàn vẹn tham chiếu.`,
      };
    }

    // 2. Part I Single Choice: SQL Syntax & Concepts
    const subType = Math.floor(Math.random() * 2);
    if (subType === 0) {
      return {
        id: `cs_sql_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "choice",
        prompt: `Trong ngôn ngữ SQL, câu lệnh nào sau đây dùng để đếm tổng số bản ghi trong bảng \`HocSinh\`?`,
        subText: "Tin Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
        difficulty: 1,
        options: [
          { id: "A", text: "SELECT COUNT(*) FROM HocSinh;" },
          { id: "B", text: "SELECT SUM(*) FROM HocSinh;" },
          { id: "C", text: "SELECT TOTAL(*) FROM HocSinh;" },
          { id: "D", text: "SELECT LENGTH(*) FROM HocSinh;" },
        ],
        correctAnswer: "A",
        hints: ["Hàm COUNT(*) trả về số lượng hàng trong bảng."],
        misconceptions: ["Nhầm hàm tính tổng SUM với hàm đếm số lượng COUNT."],
        explanation: `Hàm \`COUNT(*)\` trong SQL được sử dụng để đếm số lượng hàng trong kết quả truy vấn.`,
      };
    } else {
      return {
        id: `cs_sql_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "choice",
        prompt: `Trong mô hình dữ liệu quan hệ, mỗi hàng (row) trong một bảng đại diện cho khái niệm nào sau đây?`,
        subText: "Tin Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
        difficulty: 1,
        options: [
          { id: "A", text: "Một bản ghi (record / tuple)" },
          { id: "B", text: "Một trường (field / attribute)" },
          { id: "C", text: "Một khóa chính (primary key)" },
          { id: "D", text: "Một kiểu dữ liệu (data type)" },
        ],
        correctAnswer: "A",
        hints: ["Hàng là bản ghi, cột là trường dữ liệu."],
        misconceptions: ["Nhầm giữa hàng (bản ghi) và cột (thuộc tính/trường)."],
        explanation: `Trong bảng CSDL quan hệ, mỗi hàng (row) biểu diễn một bộ giá trị / bản ghi (record/tuple) tương ứng với một đối tượng cụ thể.`,
      };
    }
  },

  validateAnswer(question: PracticeQuestion, userAnswer: any) {
    if (question.type === "true_false_group") {
      const stmts = question.trueFalseStatements || [];
      if (!userAnswer || typeof userAnswer !== "object") return false;
      return stmts.every((s) => userAnswer[s.id] === s.isCorrect);
    }
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },

  calculateScore(question: PracticeQuestion, userAnswer: any, context) {
    const base = context.difficulty * 10;
    return context.isCorrect ? base + Math.min(context.combo * 2, 10) : 0;
  },
};
