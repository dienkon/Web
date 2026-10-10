import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { sieugioiAdapter } from "../server/services/webImporter/adapters/sieugioiAdapter";
import { normalizeToDkTestJson } from "../server/services/webImporter/normalizer";
import { FullExportSchemaV3 } from "../src/utils/json/schema";

describe("SieuGioi Adapter & DkTEST Importer", () => {
  const fixturePath = path.resolve(__dirname, "fixtures/sieugioi_1743.html");
  const targetUrl =
    "https://sieugioi.com/docs/threads/de-so-1-giai-15-bai-tap-tinh-don-dieu-va-cuc-tri-cua-ham-so.1743/";

  it("canHandle returns true for sieugioi.com URLs", () => {
    expect(sieugioiAdapter.canHandle(targetUrl)).toBe(true);
    expect(
      sieugioiAdapter.canHandle("https://sieugioi.com/threads/test.123")
    ).toBe(true);
    expect(sieugioiAdapter.canHandle("https://example.com/exam")).toBe(false);
  });

  it("extracts all 15 questions with exact reference answers and math preservation", async () => {
    const html = fs.readFileSync(fixturePath, "utf8");
    const extracted = await sieugioiAdapter.extract(html, targetUrl);

    // 1. Kiểm tra tiêu đề đề thi
    expect(extracted.title).toContain("Đề số 1. Giải 15 bài tập");
    expect(extracted.domain).toBe("sieugioi.com");

    // 2. Nhận diện đủ 15 câu hỏi
    expect(extracted.totalQuestions).toBe(15);
    expect(extracted.questions.length).toBe(15);

    // 3. Toàn bộ 15 câu đều có 4 phương án A, B, C, D
    for (const q of extracted.questions) {
      expect(q.options.length).toBe(4);
      expect(q.options.map((o) => o.key)).toEqual(["A", "B", "C", "D"]);
      expect(q.options.every((o) => o.text.length > 0)).toBe(true);
    }

    // 4. Đối chiếu danh sách đáp án tham chiếu bắt buộc:
    // C, A, A, C, A, B, D, C, B, A, B, C, C, A, B
    const expectedReferenceAnswers = [
      "C", "A", "A", "C", "A", "B", "D", "C", "B", "A", "B", "C", "C", "A", "B"
    ];
    const actualAnswers = extracted.questions.map((q) => q.correctKey);
    expect(actualAnswers).toEqual(expectedReferenceAnswers);

    // 5. Kiểm tra cảnh báo mâu thuẫn toán học tại Câu 5
    const q5 = extracted.questions.find((q) => q.order === 5);
    expect(q5).toBeDefined();
    expect(q5?.warnings.length).toBeGreaterThan(0);
    expect(q5?.warnings[0]).toContain("3 nghiệm bội lẻ");

    // 6. Kiểm tra bảo toàn công thức toán học và LaTeX
    const q1 = extracted.questions[0];
    expect(q1.promptText).toContain("$y=f(x)$");
    expect(q1.explanation).toContain("$\\left( 1;2 \\right)$");

    // 7. Kiểm tra bảo toàn ảnh đính kèm (đồ thị, bảng biến thiên)
    expect(q1.images.length).toBeGreaterThan(0);
    expect(q1.imageUrl).toBe(
      "https://sieugioi.com/docs/attachments/q1_img1-png.9192/"
    );

    // 8. Chuẩn hóa thành DkTEST JSON schema v3 và xác thực Zod
    const dktestJson = normalizeToDkTestJson(extracted);
    expect(dktestJson.version).toBe(3);
    expect(dktestJson.source).toBe("DkTEST");
    expect(dktestJson.questions.length).toBe(15);
    expect(dktestJson.sections?.length).toBe(1);

    // Schema validation không được ném lỗi
    const parseResult = FullExportSchemaV3.safeParse(dktestJson);
    expect(parseResult.success).toBe(true);
  });
});
