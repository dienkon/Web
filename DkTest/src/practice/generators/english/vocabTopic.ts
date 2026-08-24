import { PracticeMode, PracticeQuestion, PracticeContext } from "../../core/types";

const VOCAB_DATA = [
  { topic: "Gia đình", en: "siblings", vi: "anh chị em ruột", options: ["anh chị em ruột", "ông bà", "họ hàng", "con cái"] },
  { topic: "Trường học", en: "curriculum", vi: "chương trình giảng dạy", options: ["chương trình giảng dạy", "phòng thí nghiệm", "bảng phấn", "học phí"] },
  { topic: "Công nghệ", en: "artificial intelligence", vi: "trí tuệ nhân tạo", options: ["trí tuệ nhân tạo", "mạng máy tính", "ổ cứng", "chương trình diệt virus"] },
  { topic: "Môi trường", en: "biodiversity", vi: "đa dạng sinh học", options: ["đa dạng sinh học", "ô nhiễm không khí", "hiệu ứng nhà kính", "năng lượng tái tạo"] },
  { topic: "Du lịch", en: "accommodation", vi: "chỗ ở / nơi lưu trú", options: ["chỗ ở / nơi lưu trú", "vé máy bay", "hành lý", "lịch trình tour"] },
  { topic: "Sức khỏe", en: "immune system", vi: "hệ miễn dịch", options: ["hệ miễn dịch", "huyết áp", "đơn thuốc", "triệu chứng bệnh"] },
  { topic: "Nghề nghiệp", en: "entrepreneur", vi: "nhà khởi nghiệp / doanh nhân", options: ["nhà khởi nghiệp / doanh nhân", "kế toán viên", "kỹ sư phần mềm", "kiến trúc sư"] },
  { topic: "Kinh tế", en: "inflation", vi: "sự lạm phát", options: ["sự lạm phát", "lợi nhuận", "sự đầu tư", "tài sản cố định"] },
  { topic: "Ẩm thực", en: "nutritional value", vi: "giá trị dinh dưỡng", options: ["giá trị dinh dưỡng", "chất gia vị", "công thức nấu ăn", "món ăn phụ"] },
  { topic: "Cảm xúc", en: "overwhelmed", vi: "tràn ngập / quá tải cảm xúc", options: ["tràn ngập / quá tải cảm xúc", "hào hứng", "lo lắng nhẹ", "thất vọng"] },
];

export const englishVocabTopicMode: PracticeMode = {
  id: "english-vocab-topic",
  title: "Từ vựng Tiếng Anh theo Chủ đề",
  description: "Luyện tập từ vựng chuẩn Oxford theo các chủ đề thông dụng trong đề thi.",
  shortTag: "Tiếng Anh",
  category: "english",
  gradeRange: [3, 12],
  icon: "BookOpen",
  badgeColor: "emerald",
  gameRule: "standard",
  defaultLength: 10,
  difficultyLevels: [
    { id: 1, name: "Cơ bản", description: "Từ vựng các chủ đề Gia đình, Trường học, Cảm xúc." },
    { id: 2, name: "Nâng cao", description: "Từ vựng chuyên sâu: Công nghệ, Môi trường, Kinh tế." },
  ],
  generateQuestion: (context: PracticeContext): PracticeQuestion => {
    const item = VOCAB_DATA[Math.floor(Math.random() * VOCAB_DATA.length)];
    const isEnToVi = Math.random() > 0.3;

    if (isEnToVi) {
      const correctText = item.vi;
      const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);

      return {
        id: `vocab_${Date.now()}_${Math.random()}`,
        type: "choice",
        prompt: `Nghĩa tiếng Việt của từ/cụm từ **"${item.en}"** (Chủ đề: ${item.topic}) là gì?`,
        options: shuffledOptions.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })),
        correctAnswer: String.fromCharCode(65 + shuffledOptions.indexOf(correctText)),
        explanation: `**${item.en}** phát âm chuẩn nghĩa là: **${item.vi}**.`,
        difficulty: context.difficulty,
      };
    } else {
      const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);

      return {
        id: `vocab_${Date.now()}_${Math.random()}`,
        type: "choice",
        prompt: `Từ tiếng Anh nào mang nghĩa **"${item.vi}"** (Chủ đề: ${item.topic})?`,
        options: [item.en, "perspective", "substantial", "counterpart"]
          .sort(() => Math.random() - 0.5)
          .map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })),
        correctAnswer: "A",
        explanation: `Từ tiếng Anh chính xác cho "${item.vi}" là **${item.en}**.`,
        difficulty: context.difficulty,
      };
    }
  },
  validateAnswer: (question, userAnswer) => {
    return String(userAnswer).trim().toUpperCase() === String(question.correctAnswer).trim().toUpperCase();
  },
  calculateScore: (question, userAnswer, session) => {
    return session.isCorrect ? 10 + session.combo * 2 : 0;
  },
};
