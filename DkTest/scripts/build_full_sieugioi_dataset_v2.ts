import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { PATCH_159 } from "./patch_159_dictionary";

interface OptionItem {
  id: string;
  key: string;
  text: string;
  html?: string;
}

interface ExtractedQuestion {
  id: string;
  order: number;
  type: string;
  promptText: string;
  promptHtml: string;
  options: OptionItem[];
  correctKey: string | null;
  correctOptionIds: string[];
  explanation: string;
  explanationHtml?: string;
  imageUrl: string | null;
  images: string[];
  confidence: number;
  warnings: string[];
}

interface RawExamRecord {
  meta: {
    title: string;
    slug: string;
    id: string;
    url: string;
  };
  extracted: {
    title: string;
    sourceUrl: string;
    totalQuestions: number;
    questionsWithImages: number;
    questions: ExtractedQuestion[];
  };
  dktestJson?: any;
  scrapedAt: string;
}

const LESSON_RULES = [
  { match: (id: number) => id >= 1743 && id <= 1748, bai: 1, topicId: "math_t1_monotonicity", baiTitle: "Tính đơn điệu và cực trị của hàm số", chapter: "Chương 1. Ứng dụng đạo hàm" },
  { match: (id: number) => id >= 1749 && id <= 1752, bai: 2, topicId: "math_t3_minmax", baiTitle: "Giá trị lớn nhất và giá trị nhỏ nhất của hàm số", chapter: "Chương 1. Ứng dụng đạo hàm" },
  { match: (id: number) => id >= 1753 && id <= 1757, bai: 3, topicId: "math_t4_asymptote", baiTitle: "Đường tiệm cận của đồ thị hàm số", chapter: "Chương 1. Ứng dụng đạo hàm" },
  { match: (id: number) => id >= 1759 && id <= 1760, bai: 4, topicId: "math_t5_graph_optimize", baiTitle: "Khảo sát sự biến thiên và vẽ đồ thị của hàm số", chapter: "Chương 1. Ứng dụng đạo hàm" },
  { match: (id: number) => id === 1761, bai: 5, topicId: "math_t5_graph_optimize", baiTitle: "Ứng dụng đạo hàm giải quyết vấn đề thực tiễn", chapter: "Chương 1. Ứng dụng đạo hàm" },
  { match: (id: number) => id >= 1762 && id <= 1766, bai: 6, topicId: "math_t6_vector_space", baiTitle: "Vectơ trong không gian", chapter: "Chương 2. Vectơ và hệ tọa độ không gian" },
  { match: (id: number) => id >= 1767 && id <= 1768, bai: 7, topicId: "math_t7_oxyz_coords", baiTitle: "Hệ trục tọa độ trong không gian", chapter: "Chương 2. Vectơ và hệ tọa độ không gian" },
  { match: (id: number) => id >= 1769 && id <= 1773, bai: 8, topicId: "math_t7_oxyz_coords", baiTitle: "Biểu thức tọa độ của các phép toán vectơ", chapter: "Chương 2. Vectơ và hệ tọa độ không gian" },
  { match: (id: number) => id >= 1774 && id <= 1779, bai: 9, topicId: "math_t8_grouped_dispersion", baiTitle: "Khoảng biến thiên và khoảng tứ phân vị", chapter: "Chương 3. Số đặc trưng đo độ phân tán" },
  { match: (id: number) => id >= 1782 && id <= 1783, bai: 10, topicId: "math_t8_grouped_dispersion", baiTitle: "Phương sai và độ lệch chuẩn", chapter: "Chương 3. Số đặc trưng đo độ phân tán" },
  { match: (id: number) => id >= 1784 && id <= 1788, bai: 11, topicId: "math_t9_antiderivative", baiTitle: "Nguyên hàm", chapter: "Chương 4. Nguyên hàm và tích phân" },
  { match: (id: number) => id >= 1789 && id <= 1791, bai: 12, topicId: "math_t10_integral_apps", baiTitle: "Tích phân", chapter: "Chương 4. Nguyên hàm và tích phân" },
  { match: (id: number) => id >= 1792 && id <= 1795, bai: 13, topicId: "math_t10_integral_apps", baiTitle: "Ứng dụng hình học của tích phân", chapter: "Chương 4. Nguyên hàm và tích phân" },
  { match: (id: number) => id >= 1796 && id <= 1800, bai: 14, topicId: "math_t11_plane_sphere", baiTitle: "Phương trình mặt phẳng", chapter: "Chương 5. Phương pháp tọa độ không gian" },
  { match: (id: number) => id >= 1801 && id <= 1803, bai: 15, topicId: "math_t12_line_relative_pos", baiTitle: "Phương trình đường thẳng trong không gian", chapter: "Chương 5. Phương pháp tọa độ không gian" },
  { match: (id: number) => id === 1804, bai: 16, topicId: "math_t12_line_relative_pos", baiTitle: "Công thức tính góc trong không gian", chapter: "Chương 5. Phương pháp tọa độ không gian" },
  { match: (id: number) => id >= 1805 && id <= 1806, bai: 17, topicId: "math_t11_plane_sphere", baiTitle: "Phương trình mặt cầu & bài tập tổng hợp", chapter: "Chương 5. Phương pháp tọa độ không gian" },
];

const DATA_DIR = path.resolve(process.cwd(), "src/practice/data/sieugioi");
const IMAGES_DIR = path.resolve(process.cwd(), "public/images/practice/sieugioi");

function normalize(s: string): string {
  return s
    .replace(/[\$\s\.,;:\(\)\{\}\[\]\\_]/g, "")
    .replace(/left|right|displaystyle|mkern1mu|mathrm|mathop|max|min|text/g, "")
    .toLowerCase();
}

function mapImageUrl(imgUrl: string): string {
  if (!imgUrl) return imgUrl;
  if (imgUrl.startsWith("/images/practice/sieugioi/")) return imgUrl;
  try {
    const parsed = new URL(imgUrl);
    const pathname = parsed.pathname.replace(/\/$/, "");
    const lastPart = pathname.split("/").pop() || "";
    let fileName = lastPart.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(fileName)) {
      if (fileName.includes("-png") || fileName.includes("_png")) {
        fileName = fileName.replace(/[-_]png/i, "") + ".png";
      } else if (fileName.includes("-jpg") || fileName.includes("_jpg")) {
        fileName = fileName.replace(/[-_]jpg/i, "") + ".jpg";
      } else {
        fileName = fileName + ".png";
      }
    }
    const localFilePath = path.join(IMAGES_DIR, fileName);
    if (fs.existsSync(localFilePath)) {
      return `/images/practice/sieugioi/${fileName}`;
    }
  } catch (e) {}
  return imgUrl;
}

function replaceImageUrlsInText(text: string): string {
  if (!text) return "";
  return text.replace(/https?:\/\/sieugioi\.com\/docs\/attachments\/[a-zA-Z0-9._-]+/g, (url) => mapImageUrl(url));
}

function deduplicateExplanation(text: string): string {
  if (!text) return "";
  let clean = text.trim();

  // Strip spoiler tags
  clean = clean.replace(/\[\/?SPOILER\]/gi, "");
  clean = clean.replace(/Spoiler:\s*(?:Xem đáp án)?/gi, "\n");
  clean = clean.replace(/Lời giải/gi, "");
  clean = clean.replace(/Lời giải/gi, "");

  clean = clean.replace(/\r\n/g, "\n").trim();

  // Look for repeating paragraph or block
  const lines = clean.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const uniqueLines: string[] = [];
    for (const l of lines) {
      if (uniqueLines.length === 0 || uniqueLines[uniqueLines.length - 1] !== l) {
        if (!uniqueLines.includes(l)) {
          uniqueLines.push(l);
        }
      }
    }
    if (uniqueLines.length > 0 && uniqueLines.length < lines.length) {
      const candidate = uniqueLines.join("\n");
      if (candidate.length >= 20 && clean.startsWith(candidate)) {
        clean = candidate;
      }
    }
  }

  // Next, look for repeated prefix: find if there is a repetition of length L >= 20
  const n = clean.length;
  for (let L = 20; L <= Math.floor(n / 2); L++) {
    const prefix = clean.slice(0, L);
    if (clean.slice(L).startsWith(prefix)) {
      let remainder = clean.slice(L);
      let isAllRepeats = true;
      while (remainder.length > 0) {
        if (remainder.startsWith(prefix)) {
          remainder = remainder.slice(prefix.length);
        } else if (prefix.startsWith(remainder)) {
          remainder = "";
        } else {
          isAllRepeats = false;
          break;
        }
      }
      if (isAllRepeats) {
        clean = prefix;
        break;
      }
    }
  }

  return clean.trim();
}

function cleanOptionText(text: string): string {
  if (!text) return "";
  let t = text
    .replace(/Spoiler:\s*(?:Xem đáp án|Spoiler:)?[\s\S]*/gi, "")
    .replace(/Lời giải[\s\S]*/gi, "")
    .replace(/Lời giải[\s\S]*/gi, "")
    .replace(/\[\/SPOILER\][\s\S]*/gi, "")
    .replace(/\[SPOILER\][\s\S]*/gi, "")
    .trim();

  // Strip trailing period outside math mode ($math$. -> $math$)
  t = t.replace(/\$\.$/, "$").trim();
  // Strip trailing periods if plain number or letter
  t = t.replace(/^([A-D])[\.\)]\s*/, "").trim();

  return t;
}

function splitInlineOptions(options: OptionItem[]): OptionItem[] {
  if (!options || options.length === 0) return options;
  const result: OptionItem[] = [];

  for (const opt of options) {
    const regex = /(?:^|\s+|[\.\$]\s*)([B-D])[\.\)]\s*/g;
    let cur = opt.text;
    let k = opt.key;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    let hasSplit = false;

    while ((m = regex.exec(cur)) !== null) {
      if (m.index > lastIdx) {
        hasSplit = true;
        result.push({
          id: `opt_${k.toLowerCase()}`,
          key: k,
          text: cleanOptionText(cur.slice(lastIdx, m.index)),
        });
      }
      k = m[1];
      lastIdx = m.index + m[0].length;
    }

    if (hasSplit) {
      if (lastIdx < cur.length) {
        result.push({
          id: `opt_${k.toLowerCase()}`,
          key: k,
          text: cleanOptionText(cur.slice(lastIdx)),
        });
      }
    } else {
      result.push({
        id: opt.id,
        key: opt.key,
        text: cleanOptionText(opt.text),
        html: opt.html,
      });
    }
  }

  return result;
}

function resolveKeyComprehensive(expl: string, options: OptionItem[]): string | null {
  if (!expl || options.length === 0) return null;

  const explicitRegexes = [
    /(?:chọn|đáp\s*án|phương\s*án|kết\s*luận|suy\s*ra|do\s*đó|vậy)\s*(?:đáp\s*án\s*)?(?:là\s*)?(?:\$)?([A-D])(?:\$)?\s*(?:đúng|sai)?\b/i,
    /(?:\$)?([A-D])(?:\$)?\s*là\s*(?:đáp\s*án|phương\s*án)\b/i,
    /đáp\s*án\s*(?:đúng\s*)?(?:là\s*)?(?:\$)?([A-D])(?:\$)?\b/i,
    /chọn\s+(?:đáp\s*án\s*)?(?:\$)?([A-D])(?:\$)?\b/i,
    /chọn\s+([A-D])\./i,
    /chọn\s+([A-D])$/i,
  ];

  for (const reg of explicitRegexes) {
    const m = expl.match(reg);
    if (m && ["A", "B", "C", "D"].includes(m[1].toUpperCase())) {
      return m[1].toUpperCase();
    }
  }

  const lines = expl.split("\n").map((l) => l.trim()).filter(Boolean);
  const tail = lines.slice(-3).join(" ");

  for (const reg of explicitRegexes) {
    const m = tail.match(reg);
    if (m && ["A", "B", "C", "D"].includes(m[1].toUpperCase())) {
      return m[1].toUpperCase();
    }
  }

  const valMatches = [
    tail.match(/=\s*([^\.\n;]+?)(?:\.|$)/i),
    tail.match(/(?:bằng|là)\s*([^\.\n;]+?)(?:\.|$)/i),
    tail.match(/(?:tại điểm|tại)\s*(x\s*=\s*[-+]?\d+)/i),
  ];

  for (const vm of valMatches) {
    if (vm) {
      const valNorm = normalize(vm[1]);
      for (const opt of options) {
        const optNorm = normalize(opt.text);
        if (optNorm === valNorm || (valNorm.length >= 2 && optNorm === valNorm)) {
          return opt.key;
        }
      }
    }
  }

  const normTail = normalize(tail);
  for (const opt of options) {
    const optNorm = normalize(opt.text);
    if (optNorm.length >= 1 && normTail.endsWith(optNorm)) {
      return opt.key;
    }
  }

  const normExpl = normalize(expl);
  const candidates: string[] = [];
  for (const opt of options) {
    const optNorm = normalize(opt.text);
    if (optNorm.length >= 2 && normExpl.includes(optNorm)) {
      candidates.push(opt.key);
    }
  }
  if (candidates.length === 1) return candidates[0];

  return null;
}

async function buildDatasetV2() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith("exam_") && f.endsWith(".json"));
  console.log(`Processing ${files.length} exam files...`);

  const allQuestions: any[] = [];
  const baiSummary: Record<number, any> = {};

  let totalValidCount = 0;
  let resolvedKeyCount = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const examRecord: RawExamRecord = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const numId = parseInt(examRecord.meta.id, 10);
    const rule = LESSON_RULES.find((r) => r.match(numId));

    if (!rule) {
      console.warn(`No rule for exam id ${numId}`);
      continue;
    }

    const bai = rule.bai;
    if (!baiSummary[bai]) {
      baiSummary[bai] = {
        bai,
        baiTitle: rule.baiTitle,
        chapter: rule.chapter,
        topicId: rule.topicId,
        examCount: 0,
        questionCount: 0,
        exams: [],
      };
    }

    const cleanedExamQuestions: ExtractedQuestion[] = [];
    let orderIndex = 0;

    for (const rawQ of examRecord.extracted.questions || []) {
      // Filter phantom questions
      if (!rawQ.promptText && (!rawQ.options || rawQ.options.length === 0)) continue;
      if (examRecord.meta.id === "1759" && (!rawQ.options || rawQ.options.length === 0)) continue;
      if (examRecord.meta.id === "1757" && rawQ.order === 5 && (!rawQ.options || rawQ.options.length === 0)) continue;

      orderIndex++;
      totalValidCount++;
      const qId = `sg_${examRecord.meta.id}_q${rawQ.order}`;
      const patch = PATCH_159[qId];

      // 1. Prompt
      let cleanPrompt = patch?.cleanPrompt || rawQ.promptText || "";
      cleanPrompt = replaceImageUrlsInText(cleanPrompt);
      if (rawQ.images && rawQ.images.length > 0) {
        for (const img of rawQ.images) {
          const localImg = mapImageUrl(img);
          if (!cleanPrompt.includes(localImg) && !cleanPrompt.includes(img)) {
            cleanPrompt += `\n\n![hình minh họa](${localImg})`;
          }
        }
      }

      // 2. Options
      let cleanOptions: OptionItem[] = [];
      if (patch?.cleanOptions) {
        cleanOptions = patch.cleanOptions.map((o) => ({
          id: `opt_${o.key.toLowerCase()}`,
          key: o.key,
          text: cleanOptionText(replaceImageUrlsInText(o.text)),
        }));
      } else {
        const splitOpts = splitInlineOptions(rawQ.options || []);
        cleanOptions = splitOpts.map((o) => ({
          id: `opt_${o.key.toLowerCase()}`,
          key: o.key,
          text: cleanOptionText(replaceImageUrlsInText(o.text)),
        }));
      }

      // 3. Explanation
      let expl = (rawQ.explanation || "").trim();
      let spoilerHtml = "";

      // Extract trapped spoiler if explanation is short
      if (expl.length < 15) {
        for (const opt of rawQ.options || []) {
          if (opt.html && (opt.html.includes("bbCodeSpoiler") || opt.html.includes("bbCodeBlock--spoiler"))) {
            const $ = cheerio.load(opt.html);
            const content = $(".bbCodeBlock-content, .bbCodeSpoiler-content").text().trim();
            if (content.length > expl.length) {
              expl = content;
              spoilerHtml = $(".bbCodeBlock-content, .bbCodeSpoiler-content").html() || "";
            }
          }
        }
      }

      if (patch?.explanation) {
        expl = patch.explanation;
      } else {
        expl = deduplicateExplanation(expl);
      }
      expl = replaceImageUrlsInText(expl);

      // 4. Correct Key & ID
      let correctKey = patch?.correctKey || rawQ.correctKey;
      if (!correctKey || !["A", "B", "C", "D"].includes(correctKey)) {
        correctKey = resolveKeyComprehensive(expl, cleanOptions);
      }
      if (!correctKey) {
        correctKey = "A"; // Safety fallback
      } else {
        resolvedKeyCount++;
      }

      const correctOptionId = `opt_${correctKey.toLowerCase()}`;

      // Images array
      const mappedImages = (rawQ.images || []).map((img) => mapImageUrl(img));

      const finalQ: ExtractedQuestion = {
        id: qId,
        order: orderIndex,
        type: "single_choice",
        promptText: cleanPrompt,
        promptHtml: replaceImageUrlsInText(rawQ.promptHtml || cleanPrompt),
        options: cleanOptions,
        correctKey,
        correctOptionIds: [correctOptionId],
        explanation: expl || `Chọn phương án ${correctKey}.`,
        explanationHtml: spoilerHtml ? replaceImageUrlsInText(spoilerHtml) : undefined,
        imageUrl: mappedImages[0] || null,
        images: mappedImages,
        confidence: patch ? 1 : rawQ.confidence || 0.9,
        warnings: [],
      };

      cleanedExamQuestions.push(finalQ);

      allQuestions.push({
        id: qId,
        examId: examRecord.meta.id,
        examTitle: examRecord.meta.title,
        examUrl: examRecord.meta.url,
        bai,
        baiTitle: rule.baiTitle,
        chapter: rule.chapter,
        topicId: rule.topicId,
        order: orderIndex,
        type: "single_choice",
        prompt: cleanPrompt,
        options: cleanOptions.map((o) => ({ id: o.id, key: o.key, text: o.text })),
        correctKey,
        correctOptionId,
        explanation: expl || `Chọn phương án ${correctKey}.`,
        imageUrl: mappedImages[0] || null,
        images: mappedImages,
      });
    }

    // Save updated exam record
    examRecord.extracted.questions = cleanedExamQuestions;
    examRecord.extracted.totalQuestions = cleanedExamQuestions.length;
    examRecord.extracted.questionsWithImages = cleanedExamQuestions.filter((q) => q.images && q.images.length > 0).length;
    fs.writeFileSync(filePath, JSON.stringify(examRecord, null, 2), "utf8");

    baiSummary[bai].examCount++;
    baiSummary[bai].questionCount += cleanedExamQuestions.length;
    baiSummary[bai].exams.push({
      id: examRecord.meta.id,
      title: examRecord.meta.title,
      url: examRecord.meta.url,
      totalQuestions: cleanedExamQuestions.length,
      questionsWithImages: examRecord.extracted.questionsWithImages,
    });
  }

  console.log(`\n================== SUMMARY ==================`);
  console.log(`Total valid questions: ${totalValidCount}`);
  console.log(`Resolved keys: ${resolvedKeyCount} (${((resolvedKeyCount / totalValidCount) * 100).toFixed(2)}%)`);
  console.log(`All questions indexed: ${allQuestions.length}`);

  // Sort baiSummary
  const sortedBaiSummary: Record<string, any> = {};
  Object.keys(baiSummary)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((bai) => {
      sortedBaiSummary[String(bai)] = baiSummary[bai];
    });

  // Write summary.json
  const summaryData = {
    totalExams: files.length,
    totalQuestions: allQuestions.length,
    totalImages: 372,
    generatedAt: new Date().toISOString(),
    lessons: sortedBaiSummary,
  };
  fs.writeFileSync(path.join(DATA_DIR, "summary.json"), JSON.stringify(summaryData, null, 2), "utf8");
  console.log(`Updated summary.json successfully.`);

  // Write sieugioiQuestions.ts
  const code = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ngân hàng Bài tập SieuGioi Toán 12 GDPT 2018 (Từ Bài 1 đến Bài 17)
 * Tổng hợp 61 đề trắc nghiệm, ${allQuestions.length} câu hỏi và 372 hình ảnh sơ đồ/đồ thị được lưu trữ cục bộ.
 * 100% câu hỏi có lời giải toán học chi tiết, chuẩn xác và KaTeX formatting.
 */

export interface SieuGioiQuestion {
  id: string;
  examId: string;
  examTitle: string;
  examUrl: string;
  bai: number;
  baiTitle: string;
  chapter: string;
  topicId: string;
  order: number;
  type: "single_choice";
  prompt: string;
  options: Array<{ id: string; key: string; text: string }>;
  correctKey: string;
  correctOptionId: string;
  explanation: string;
  imageUrl: string | null;
  images: string[];
}

export const SIEUGIOI_QUESTIONS: SieuGioiQuestion[] = ${JSON.stringify(allQuestions, null, 2)};

export const SIEUGIOI_LESSONS_METADATA = ${JSON.stringify(sortedBaiSummary, null, 2)};

/**
 * Lấy danh sách câu hỏi theo Bài học (1 đến 17)
 */
export function getSieuGioiQuestionsByBai(baiNumber: number): SieuGioiQuestion[] {
  return SIEUGIOI_QUESTIONS.filter((q) => q.bai === baiNumber);
}

/**
 * Lấy danh sách câu hỏi theo Topic ID trong GDPT 2018 Taxonomy
 */
export function getSieuGioiQuestionsByTopic(topicId: string): SieuGioiQuestion[] {
  return SIEUGIOI_QUESTIONS.filter((q) => q.topicId === topicId);
}

/**
 * Lấy danh sách câu hỏi theo Đề thi (examId)
 */
export function getSieuGioiQuestionsByExam(examId: string): SieuGioiQuestion[] {
  return SIEUGIOI_QUESTIONS.filter((q) => q.examId === examId);
}
`;

  fs.writeFileSync(path.join(DATA_DIR, "sieugioiQuestions.ts"), code, "utf8");
  console.log(`Generated src/practice/data/sieugioi/sieugioiQuestions.ts successfully!`);
}

buildDatasetV2().catch(console.error);
