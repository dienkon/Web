import { store } from "../app/state.js";
import { gamificationService } from "./gamification.service.js";
import { geminiClient } from "../ai/gemini.client.js";

class AIService {
  constructor() {
    this.modes = [
      { id: "tutor", label: "Gia sư", icon: "👨‍🏫", desc: "Giải thích khái niệm & công thức dễ hiểu" },
      { id: "solver", label: "Giải bài", icon: "✍️", desc: "Hướng dẫn giải chi tiết từng bước (LaTeX)" },
      { id: "summary", label: "Tóm tắt", icon: "📋", desc: "Tóm tắt tài liệu ngắn gọn, trọng tâm" },
      { id: "flashcards", label: "Tạo thẻ", icon: "🧠", desc: "Tự động tạo Flashcard ôn tập" },
      { id: "qa", label: "Hỏi đáp", icon: "💬", desc: "Hỏi đáp chuyên sâu theo ngữ cảnh" },
    ];
  }

  async askAI({ prompt, mode = "tutor", subject = "Toán Học", docContext = null, fileAttachment = null }) {
    try {
      gamificationService.addXP(10, "Đặt câu hỏi học tập cùng DkAI");
    } catch {
      // ignore
    }

    const userClass = store.getState().user.data?.class || "12";
    const contextWithSubject = `[Môn học: ${subject} - Lớp ${userClass}]${docContext ? `\n${docContext}` : ""}`;

    return await geminiClient.generate({
      mode,
      prompt,
      contextText: contextWithSubject,
      fileAttachment,
    });
  }
}

export const aiService = new AIService();

