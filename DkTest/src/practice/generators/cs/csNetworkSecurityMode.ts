/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Practice Generator: Tin Học 12 - Mạng máy tính, An toàn thông tin & Đạo đức số (GDPT 2018)
 */

import { PracticeMode, PracticeQuestion, PracticeContext, TrueFalseStatement } from "../../core/types";

export const csNetworkSecurityMode: PracticeMode = {
  id: "cs_network_security",
  title: "Tin Học 12: Mạng máy tính & An toàn thông tin",
  description: "Luyện tập kiến trúc mạng, địa chỉ IPv4/IPv6, dịch vụ DNS, giao thức truyền thông và bảo mật thông tin.",
  shortTag: "Mạng & Bảo mật 12",
  category: "cs",
  gradeRange: [12, 12],
  icon: "ShieldAlert",
  badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  gameRule: "standard",
  defaultLength: 10,
  supportsAdaptive: true,
  difficultyLevels: [
    { id: 1, name: "Nhận biết", description: "Khái niệm LAN/WAN, địa chỉ IP, tên miền DNS, phần mềm độc hại" },
    { id: 2, name: "Thông hiểu", description: "Vai trò giao thức TCP/IP, HTTP/HTTPS, tường lửa (Firewall), bản quyền số" },
    { id: 3, name: "Vận dụng", description: "Đúng/Sai 4 ý, phân tích rủi ro an ninh mạng, phòng chống tấn công lừa đảo (Phishing)" },
  ],

  generateQuestion(context: PracticeContext): PracticeQuestion {
    const diff = context.difficulty || 1;
    const formatRoll = Math.random();

    // 1. Part II True / False Cluster: Network Protocols & Cybersecurity
    if (diff >= 2 && formatRoll < 0.4) {
      const statements: TrueFalseStatement[] = [
        {
          id: "a",
          text: `Hệ thống phân giải tên miền (DNS) có nhiệm vụ chuyển đổi tên miền dễ nhớ (như \`example.com\`) thành địa chỉ IP tương ứng.`,
          isCorrect: true,
          explanation: `DNS là viết tắt của Domain Name System, có chức năng chính là biên dịch tên miền thành địa chỉ IP.`,
        },
        {
          id: "b",
          text: `Giao thức HTTPS mã hóa dữ liệu truyền tải giữa trình duyệt và máy chủ bằng chứng chỉ số SSL/TLS để chống nghe lén.`,
          isCorrect: true,
          explanation: `HTTPS = HTTP + SSL/TLS đảm bảo mã hóa và an toàn toàn vẹn dữ liệu truyền trên Internet.`,
        },
        {
          id: "c",
          text: `Địa chỉ IPv4 gồm 128 bit và được viết dưới dạng 8 nhóm số thập lục phân ngăn cách bởi dấu hai chấm.`,
          isCorrect: false,
          explanation: `Địa chỉ IPv4 gồm 32 bit (viết dưới dạng 4 số thập phân cách nhau bởi dấu chấm). IPv6 mới gồm 128 bit.`,
        },
        {
          id: "d",
          text: `Tấn công giả mạo (Phishing) là hình thức kẻ tấn công tạo email hoặc website giả mạo nhằm lừa người dùng cung cấp mật khẩu hoặc thông tin thẻ ngân hàng.`,
          isCorrect: true,
          explanation: `Phishing là kỹ thuật lừa đảo xã hội (social engineering) phổ biến để đánh cắp danh tính.`,
        },
      ];

      return {
        id: `cs_net_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "true_false_group",
        prompt: `Trong môi trường Internet hiện đại, an toàn và bảo mật thông tin là kỹ năng số cốt lõi. Xét tính đúng/sai của các phát biểu sau:`,
        subText: "Tin Học 12 • Phần II: Đúng/Sai",
        difficulty: diff,
        correctAnswer: { a: true, b: true, c: false, d: true },
        trueFalseStatements: statements,
        hints: [
          "Phân biệt rõ: IPv4 (32 bit, 4 byte) vs IPv6 (128 bit, 16 byte).",
          "HTTPS dùng mã hóa TLS/SSL.",
        ],
        misconceptions: [
          "Nhầm lẫn độ dài bit giữa IPv4 (32 bit) và IPv6 (128 bit).",
          "Nghĩ rằng HTTP thông thường cũng có mã hóa bảo mật.",
        ],
        explanation: `Lời giải:\n- Ý a: Đúng, chức năng của DNS.\n- Ý b: Đúng, HTTPS bảo mật dữ liệu.\n- Ý c: Sai, IPv4 là 32 bit chứ không phải 128 bit.\n- Ý d: Đúng, khái niệm tấn công Phishing.`,
      };
    }

    // 2. Part I Single Choice: IP and Networking Concepts
    return {
      id: `cs_net_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "choice",
      prompt: `Địa chỉ nào sau đây là một địa chỉ IPv4 hợp lệ?`,
      subText: "Tin Học 12 • Phần I: Trắc nghiệm 4 lựa chọn",
      difficulty: 1,
      options: [
        { id: "A", text: "192.168.1.1" },
        { id: "B", text: "192.168.1.300" },
        { id: "C", text: "192.168.1" },
        { id: "D", text: "192.168.1.1.5" },
      ],
      correctAnswer: "A",
      hints: [
        "Địa chỉ IPv4 gồm 4 số nguyên từ 0 đến 255 ngăn cách nhau bằng dấu chấm.",
      ],
      misconceptions: [
        "Chọn địa chỉ có số vượt quá 255 (như 300) hoặc không đủ 4 octet.",
      ],
      explanation: `Địa chỉ IPv4 hợp lệ gồm 4 octet, mỗi octet có giá trị từ 0 đến 255. Địa chỉ \`192.168.1.1\` là hoàn toàn hợp lệ.`,
    };
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
