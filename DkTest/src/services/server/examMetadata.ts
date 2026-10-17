export * from "./socialMetadata.js";

import {
  fetchExamMetadata,
  renderSocialPageHtml,
  escapeHtml,
  type ExamMeta,
  resolveExamSubjectBanner,
} from "./socialMetadata.js";

export { fetchExamMetadata };

/**
 * Builds HTML meta tags string for Open Graph, Twitter/X, and Canonical URL.
 * Backwards compatible helper for exam pages.
 */
export function buildExamMetaTags({
  exam,
  examId,
  baseUrl,
  found,
}: {
  exam: ExamMeta | null;
  examId: string;
  baseUrl: string;
  found: boolean;
}): {
  fullTitle: string;
  escapedTitle: string;
  escapedDescription: string;
  canonicalUrl: string;
  metaTagsHtml: string;
} {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const canonicalUrl = `${cleanBaseUrl}/student/exam/${encodeURIComponent(examId)}`;

  let titleRaw = "";
  let descRaw = "";

  if (found && exam) {
    const rawExamTitle = exam.title.trim();
    if (rawExamTitle.toLowerCase().includes("dktest")) {
      titleRaw = rawExamTitle;
    } else {
      titleRaw = `📝 ${rawExamTitle} | DkTEST`;
    }

    const parts: string[] = [];
    if (exam.subject) parts.push(`📚 Môn: ${exam.subject}`);
    if (exam.gradeCategory) parts.push(`🎓 ${exam.gradeCategory}`);
    if (exam.isUnlimitedTime) {
      parts.push("⏱️ Không giới hạn thời gian");
    } else if (exam.timeLimit) {
      parts.push(`⏱️ Thời gian: ${exam.timeLimit} phút`);
    }
    if (exam.questionCount) parts.push(`❓ Số lượng: ${exam.questionCount} câu`);
    if (exam.code) parts.push(`🏷️ Mã đề: ${exam.code}`);
    if (exam.accessMode === "paid" && exam.priceVnd && exam.priceVnd > 0) {
      parts.push(`💰 Phí: ${exam.priceVnd.toLocaleString("vi-VN")}đ`);
    } else if (exam.accessMode === "free") {
      parts.push("🎁 Miễn phí");
    }

    let structured = parts.join(" • ");
    if (exam.description && exam.description.trim()) {
      structured = structured ? `${structured} — ${exam.description.trim()}` : exam.description.trim();
    }
    descRaw = structured || "Tham gia bài kiểm tra trực tuyến trên DkTEST";
  } else {
    titleRaw = "📝 DkTEST - Bài Kiểm Tra";
    descRaw = "Tham gia bài kiểm tra trực tuyến trên DkTEST";
  }

  const escapedTitle = escapeHtml(titleRaw);
  const escapedDescription = escapeHtml(descRaw);
  const escapedUrl = escapeHtml(canonicalUrl);

  const tags: string[] = [
    `<meta name="description" content="${escapedDescription}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="DkTEST">`,
    `<meta property="og:title" content="${escapedTitle}">`,
    `<meta property="og:description" content="${escapedDescription}">`,
    `<meta property="og:url" content="${escapedUrl}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapedTitle}">`,
    `<meta name="twitter:description" content="${escapedDescription}">`,
    `<link rel="canonical" href="${escapedUrl}">`,
  ];

  const bannerInfo = resolveExamSubjectBanner({
    exam: (found && exam) ? exam : { id: examId, title: exam?.title || examId },
    examId,
    baseUrl: cleanBaseUrl,
  });

  const imageUrl = (found && exam?.imageUrl) ? exam.imageUrl : bannerInfo.imageUrl;
  const imageAlt = (found && exam?.imageUrl) ? (exam.title || titleRaw) : bannerInfo.imageAlt;
  const escapedImage = escapeHtml(imageUrl);
  const escapedAlt = escapeHtml(imageAlt);
  tags.push(
    `<meta property="og:image" content="${escapedImage}">`
  );

  if (imageUrl.startsWith("https://")) {
    tags.push(`<meta property="og:image:secure_url" content="${escapedImage}">`);
  }

  const cleanImage = (imageUrl || "").split(/[?#]/)[0].toLowerCase();
  if (cleanImage.endsWith(".jpg") || cleanImage.endsWith(".jpeg")) {
    tags.push(`<meta property="og:image:type" content="image/jpeg">`);
  } else if (cleanImage.endsWith(".png")) {
    tags.push(`<meta property="og:image:type" content="image/png">`);
  }

  tags.push(
    `<meta property="og:image:alt" content="${escapedAlt}">`,
    `<meta name="twitter:image" content="${escapedImage}">`
  );

  return {
    fullTitle: titleRaw,
    escapedTitle,
    escapedDescription,
    canonicalUrl,
    metaTagsHtml: tags.join("\n    "),
  };
}

/**
 * Replaces static title and Open Graph / Twitter tags in the HTML template.
 */
export function injectExamMetaIntoHtml(
  templateHtml: string,
  metaInfo: {
    escapedTitle: string;
    escapedDescription: string;
    metaTagsHtml: string;
  }
): string {
  let html = templateHtml;

  html = html.replace(
    /<title>.*?<\/title>/is,
    `<title>${metaInfo.escapedTitle}</title>`
  );

  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  if (html.includes("</title>")) {
    html = html.replace("</title>", `</title>\n    ${metaInfo.metaTagsHtml}`);
  } else if (html.includes("</head>")) {
    html = html.replace(
      "</head>",
      `    <title>${metaInfo.escapedTitle}</title>\n    ${metaInfo.metaTagsHtml}\n  </head>`
    );
  }

  return html;
}

/**
 * Backwards compatible helper to render the dynamic HTML for an exam.
 */
export async function renderExamPageHtml({
  examId,
  baseUrl,
  isDev = false,
  customTemplate,
}: {
  examId: string;
  baseUrl: string;
  isDev?: boolean;
  customTemplate?: string;
}): Promise<{
  html: string;
  status: number;
  exam: ExamMeta | null;
  found: boolean;
}> {
  const { found, exam } = await fetchExamMetadata(examId);

  const { html } = await renderSocialPageHtml({
    url: `/student/exam/${encodeURIComponent(examId)}`,
    baseUrl,
    isDev,
    customTemplate,
  });

  return {
    html,
    status: 200,
    exam,
    found,
  };
}
