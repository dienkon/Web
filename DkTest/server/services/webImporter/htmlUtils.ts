import * as cheerio from "cheerio";

/**
 * Chuyển đổi URL tương đối thành URL tuyệt đối an toàn.
 */
export function resolveAbsoluteUrl(relativeOrAbsolute: string, baseUrl: string): string {
  if (!relativeOrAbsolute) return "";
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Làm sạch HTML câu hỏi, loại bỏ script, iframe, các thuộc tính sự kiện nguy hiểm (XSS),
 * trong khi bảo toàn các thẻ định dạng, công thức MathML và ảnh.
 */
export function sanitizeQuestionHtml(rawHtml: string, baseUrl?: string): string {
  if (!rawHtml) return "";

  const $ = cheerio.load(`<div>${rawHtml}</div>`, { xmlMode: false });

  // 1. Loại bỏ các thẻ độc hại hoặc không cần thiết
  $("script, style, iframe, object, embed, noscript, link, meta, form, input, button").remove();

  // 2. Làm sạch thuộc tính trên tất cả các phần tử
  $("*").each((_, el) => {
    if (el.type === "tag") {
      const attribs = el.attribs || {};
      for (const attr of Object.keys(attribs)) {
        const lowerAttr = attr.toLowerCase();
        // Xóa thuộc tính event handler (on*)
        if (lowerAttr.startsWith("on")) {
          $(el).removeAttr(attr);
        }
        // Xóa javascript: trong href hoặc src
        const val = attribs[attr] || "";
        if (val.trim().toLowerCase().startsWith("javascript:")) {
          $(el).removeAttr(attr);
        }
      }

      // Xử lý ảnh: Chuyển relative src thành absolute, ưu tiên data-src hoặc src
      if (el.tagName === "img") {
        const $img = $(el);
        let src = $img.attr("data-src") || $img.attr("src") || $img.attr("data-url") || "";
        if (src && baseUrl) {
          src = resolveAbsoluteUrl(src, baseUrl);
        }
        if (src) {
          $img.attr("src", src);
        }
        // Giữ lại alt, width, height, style nếu có
        $img.removeAttr("data-src");
        $img.removeAttr("data-url");
        $img.removeAttr("data-zoom-target");
      }
    }
  });

  return $("div").html() || "";
}

/**
 * Trích xuất văn bản thuần đã chuẩn hóa khoảng trắng từ HTML, giữ nguyên ký hiệu LaTeX $...$.
 */
export function extractCleanText(htmlOrText: string): string {
  if (!htmlOrText) return "";
  const $ = cheerio.load(`<div>${htmlOrText}</div>`);
  $("script, style").remove();
  return $("div").text().replace(/\s+/g, " ").trim();
}

/**
 * Chuẩn hóa biểu thức toán học để so sánh kết quả.
 */
export function normalizeMathForComparison(str: string): string {
  return str
    .replace(/\\left|\\right|\\text\{O\}|\\mathbb\{R\}|\\mathrm\{.*?\}/g, "")
    .replace(/[\$\{\}\\\(\)\[\]\.\,\:\;]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}
