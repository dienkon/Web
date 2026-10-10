import { describe, it, expect } from "vitest";
import { genericAdapter } from "../server/services/webImporter/adapters/genericAdapter";
import { normalizeToDkTestJson } from "../server/services/webImporter/normalizer";
import { FullExportSchemaV3 } from "../src/utils/json/schema";

describe("Generic HTML Exam Adapter", () => {
  const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Đề thi thử THPT Quốc Gia môn Toán 2026</title>
</head>
<body>
  <header><nav>Trang chủ | Liên hệ</nav></header>
  <main>
    <article>
      <h1>Đề thi thử THPT Quốc Gia môn Toán 2026</h1>
      <div class="content">
        <p><b>Câu 1:</b> Cho hàm số $y=f(x)$ có bảng biến thiên dưới đây. Khẳng định nào đúng?</p>
        <p><img src="/images/graph1.png" alt="Đồ thị hàm số"></p>
        <p>A. Hàm số đồng biến trên $(0; 2)$.<br>
        B. Hàm số nghịch biến trên $(-1; 1)$.<br>
        C. Hàm số có 3 điểm cực trị.<br>
        D. Giá trị cực đại bằng 5.</p>
        <p><b>Lời giải:</b></p>
        <p>Dựa vào đồ thị ta thấy hàm số đồng biến trên $(0; 2)$. Do đó chọn đáp án A.</p>

        <p><b>Câu 2:</b> Tìm tập xác định $D$ của hàm số $y = \log_2(x - 3)$.</p>
        <p>A. $D = (3; +\infty)$.<br>
        B. $D = [3; +\infty)$.<br>
        C. $D = (-\infty; 3)$.<br>
        D. $D = \mathbb{R} \setminus \{3\}$.</p>
        <p><b>Hướng dẫn giải:</b> Hàm số xác định khi $x - 3 > 0 \Leftrightarrow x > 3$. Vậy tập xác định là $D = (3; +\infty)$. Đáp án A.</p>
      </div>
    </article>
  </main>
  <footer>Bản quyền 2026</footer>
</body>
</html>
  `;

  it("extracts questions, options, answers, images and produces valid DkTEST JSON", async () => {
    const baseUrl = "https://giaoduc.example.com/de-thi-toan";
    const extracted = await genericAdapter.extract(sampleHtml, baseUrl);

    expect(extracted.title).toContain("Đề thi thử THPT Quốc Gia môn Toán 2026");
    expect(extracted.totalQuestions).toBe(2);

    // Câu 1
    const q1 = extracted.questions[0];
    expect(q1.order).toBe(1);
    expect(q1.options.length).toBe(4);
    expect(q1.correctKey).toBe("A");
    expect(q1.imageUrl).toBe("https://giaoduc.example.com/images/graph1.png"); // Relative to absolute!
    expect(q1.explanation).toContain("đồng biến trên $(0; 2)$");

    // Câu 2
    const q2 = extracted.questions[1];
    expect(q2.order).toBe(2);
    expect(q2.options.length).toBe(4);
    expect(q2.correctKey).toBe("A");

    // DkTEST JSON schema validation
    const dktestJson = normalizeToDkTestJson(extracted);
    expect(dktestJson.version).toBe(3);
    expect(dktestJson.questions.length).toBe(2);
    expect(FullExportSchemaV3.safeParse(dktestJson).success).toBe(true);
  });
});
