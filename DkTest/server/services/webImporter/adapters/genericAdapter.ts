import * as cheerio from "cheerio";
import type {
  ExtractedExam,
  ExtractedOption,
  ExtractedQuestion,
  SiteAdapter,
} from "../types";
import {
  extractCleanText,
  normalizeMathForComparison,
  resolveAbsoluteUrl,
  sanitizeQuestionHtml,
} from "../htmlUtils";

export const genericAdapter: SiteAdapter = {
  id: "generic",
  name: "Generic HTML Exam Adapter",

  canHandle(): boolean {
    return true; // Fallback cho mọi trang web
  },

  async extract(html: string, url: string): Promise<ExtractedExam> {
    const $ = cheerio.load(html);

    // 1. Trích xuất tiêu đề đề thi
    let title = $('meta[property="og:title"]').attr("content")?.trim();
    if (!title) title = $("h1").first().text().replace(/\s+/g, " ").trim();
    if (!title) title = $("title").first().text().replace(/\s+/g, " ").trim();
    if (!title) title = "Đề thi trích xuất từ website";

    // 2. Loại bỏ các phần tử thừa (Header, Footer, Navigation, Ads, Comments)
    $(
      "header, footer, nav, aside, .sidebar, .comments, .comment-list, .ad, .advertisement, script, style, noscript"
    ).remove();

    // 3. Tìm vùng chứa nội dung chính
    let mainContainer = $("article").first();
    if (mainContainer.length === 0) mainContainer = $("main").first();
    if (mainContainer.length === 0) mainContainer = $(".entry-content, .post-content, .article-content").first();
    if (mainContainer.length === 0) mainContainer = $("#content, .content").first();
    if (mainContainer.length === 0) mainContainer = $("body").first();

    const containerHtml = mainContainer.html() || "";

    // 4. Tìm các điểm phân tách câu hỏi
    const questionRegex =
      /(?:<b>\s*)?(?:Câu|Bài|Question)\s+(\d+)[\s\.:]*(?:<\/b>)?/gi;
    const questionMarkers: Array<{ index: number; pos: number; matchStr: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = questionRegex.exec(containerHtml)) !== null) {
      questionMarkers.push({
        index: parseInt(match[1], 10),
        pos: match.index,
        matchStr: match[0],
      });
    }

    // Nếu không tìm thấy bằng regex thông thường, thử tìm theo thẻ khối <p><b>1.</b> ...
    if (questionMarkers.length === 0) {
      const altRegex = /(?:<p|<div)[^>]*>\s*(?:<b>\s*)?(\d+)[\.\)]\s*(?:<\/b>)?/gi;
      while ((match = altRegex.exec(containerHtml)) !== null) {
        questionMarkers.push({
          index: parseInt(match[1], 10),
          pos: match.index,
          matchStr: match[0],
        });
      }
    }

    if (questionMarkers.length === 0) {
      throw new Error(
        "Không tìm thấy cấu trúc câu hỏi (Ví dụ: 'Câu 1:', 'Bài 1:', 'Question 1:') trong nội dung trang web."
      );
    }

    const examWarnings: string[] = [];
    const questions: ExtractedQuestion[] = [];

    // 5. Trích xuất từng câu hỏi
    for (let i = 0; i < questionMarkers.length; i++) {
      const curMarker = questionMarkers[i];
      const nextPos =
        i + 1 < questionMarkers.length ? questionMarkers[i + 1].pos : containerHtml.length;
      const rawChunk = containerHtml.slice(curMarker.pos, nextPos);

      // Tách phần đề bài và Lời Giải / Hướng dẫn giải
      let qHtml = rawChunk;
      let lgHtml = "";

      const lgMatch = rawChunk.match(
        /(?:<b>\s*)?(?:Lời\s*giải|Hướng\s*dẫn\s*giải|Đáp\s*án\s*chi\s*tiết|Explanation|Solution)[\s\.:]*(?:<\/b>)?/i
      );

      if (lgMatch) {
        qHtml = rawChunk.slice(0, lgMatch.index);
        lgHtml = rawChunk.slice(lgMatch.index + lgMatch[0].length);
      }

      // Xóa header đầu câu
      qHtml = qHtml
        .replace(
          /^(?:<[^>]+>)*\s*(?:Câu|Bài|Question)\s+\d+[\s\.:]*(?:<\/[^>]+>)*/i,
          ""
        )
        .trim();

      // Tìm vị trí bắt đầu của các phương án
      const optAMatch = qHtml.match(
        /(?:<p[^>]*>|<div[^>]*>|<br\s*\/?>|<\/p>|<\/div>|\n|^)\s*(?:<b>\s*)?A[\.\)]\s*(?:<\/b>)?/i
      );
      let promptHtmlRaw = qHtml;
      let optionsHtmlRaw = "";

      if (optAMatch) {
        promptHtmlRaw = qHtml.slice(0, optAMatch.index).trim();
        optionsHtmlRaw = qHtml.slice(optAMatch.index);
      }

      // Trích xuất các phương án A, B, C, D
      const optRegex =
        /(?:<p[^>]*>|<div[^>]*>|<br\s*\/?>|<\/p>|<\/div>|\n|^)\s*(?:<b>\s*)?([A-D])[\.\)]\s*(?:<\/b>)?/gi;
      const optMatches: Array<{ key: string; pos: number; matchLen: number }> = [];
      let optM: RegExpExecArray | null;

      while ((optM = optRegex.exec(optionsHtmlRaw)) !== null) {
        optMatches.push({
          key: optM[1].toUpperCase(),
          pos: optM.index,
          matchLen: optM[0].length,
        });
      }

      const options: ExtractedOption[] = [];
      for (let j = 0; j < optMatches.length; j++) {
        const curOpt = optMatches[j];
        const nxtOptPos =
          j + 1 < optMatches.length ? optMatches[j + 1].pos : optionsHtmlRaw.length;
        let optInner = optionsHtmlRaw
          .slice(curOpt.pos + curOpt.matchLen, nxtOptPos)
          .trim()
          .replace(/<br\s*\/?>$/i, "")
          .trim();

        const optClean = extractCleanText(optInner);
        options.push({
          id: `opt_${curOpt.key.toLowerCase()}`,
          key: curOpt.key,
          text: optClean,
          html: sanitizeQuestionHtml(optInner, url),
        });
      }

      // Trích xuất ảnh trong câu hỏi
      const prompt$ = cheerio.load(`<div>${promptHtmlRaw}</div>`);
      const images: string[] = [];
      prompt$("img").each((_, el) => {
        const $el = prompt$(el);
        const src = $el.attr("data-src") || $el.attr("src") || $el.attr("data-url");
        if (src) {
          images.push(resolveAbsoluteUrl(src, url));
        }
      });

      // Lời giải
      const cleanExplanation = extractCleanText(lgHtml);

      // Nhận diện đáp án
      const questionWarnings: string[] = [];
      let correctKey: string | null = null;
      let method = "not_found";
      let confidence = 0;

      // Nhãn rõ ràng: "Đáp án: A", "Chọn B", "Key: C"
      const directMatch = (cleanExplanation || rawChunk).match(
        /(?:chọn|đáp án(?:\s*là)?|phương án(?:\s*là)?|correct answer|key)\s*[:\s]*\b([A-D])\b/i
      );

      if (directMatch) {
        correctKey = directMatch[1].toUpperCase();
        method = "explicit_label";
        confidence = 1.0;
      } else if (cleanExplanation && options.length > 0) {
        // Đối chiếu nội dung
        const expNorm = normalizeMathForComparison(cleanExplanation);
        const scored = options.map((opt) => {
          let score = 0;
          const optNorm = normalizeMathForComparison(opt.text);
          if (optNorm.length > 2 && expNorm.includes(optNorm)) {
            score += 20 + optNorm.length;
          }
          return { key: opt.key, score };
        });
        scored.sort((a, b) => b.score - a.score);
        if (scored[0].score > 0) {
          correctKey = scored[0].key;
          method = "content_match";
          confidence = 0.8;
        }
      }

      if (!correctKey) {
        questionWarnings.push("Chưa tự động xác định được đáp án chính xác từ nguồn.");
      }

      const correctOption = options.find((o) => o.key === correctKey);
      const correctOptionIds = correctOption ? [correctOption.id] : [];

      const sanitizedPromptHtml = sanitizeQuestionHtml(promptHtmlRaw, url);
      const promptCleanText = extractCleanText(promptHtmlRaw);

      const needsManualReview =
        questionWarnings.length > 0 || !correctKey || options.length === 0;

      if (questionWarnings.length > 0) {
        examWarnings.push(
          ...questionWarnings.map((w) => `Câu ${curMarker.index}: ${w}`)
        );
      }

      questions.push({
        id: `q-${curMarker.index}`,
        order: curMarker.index,
        type: options.length > 0 ? "single_choice" : "essay",
        promptText: promptCleanText,
        promptHtml: sanitizedPromptHtml,
        options,
        correctKey: correctKey || null,
        correctOptionIds,
        explanation: cleanExplanation,
        explanationHtml: lgHtml ? sanitizeQuestionHtml(lgHtml, url) : undefined,
        imageUrl: images.length > 0 ? images[0] : null,
        images,
        detectionMethod: method,
        confidence,
        warnings: questionWarnings,
        needsManualReview,
      });
    }

    let domain = "web";
    try {
      domain = new URL(url).hostname;
    } catch {
      // default
    }

    return {
      title,
      sourceUrl: url,
      domain,
      adapterName: "GenericHtmlAdapter",
      totalQuestions: questions.length,
      questionsWithOptions: questions.filter((q) => q.options.length > 0).length,
      questionsWithAnswers: questions.filter((q) => q.correctOptionIds.length > 0).length,
      questionsWithExplanation: questions.filter((q) => q.explanation.length > 0).length,
      questionsWithImages: questions.filter((q) => q.images.length > 0).length,
      manualReviewCount: questions.filter((q) => q.needsManualReview).length,
      warnings: examWarnings,
      questions,
      suggestedSubject: "Toán",
      suggestedGrade: "12",
      suggestedTimeLimit: 90,
    };
  },
};
