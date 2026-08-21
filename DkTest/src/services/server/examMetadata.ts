import fs from "fs";
import path from "path";

export interface ExamMeta {
  id: string;
  title: string;
  description: string;
  code?: string;
  imageUrl?: string | null;
  timeLimit?: number | null;
  questionCount?: number | null;
}

/**
 * Escapes characters that have special meaning in HTML attributes and text nodes
 * to prevent XSS and broken meta tags.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Detects common social media and search engine crawlers by User-Agent header.
 */
export function isSocialCrawler(userAgent: string = ""): boolean {
  if (!userAgent) return false;
  const crawlerPatterns = [
    /facebookexternalhit/i,
    /Facebot/i,
    /Twitterbot/i,
    /WhatsApp/i,
    /LinkedInBot/i,
    /Discordbot/i,
    /TelegramBot/i,
    /Zalo/i,
    /Googlebot/i,
    /bingbot/i,
    /Baiduspider/i,
    /YandexBot/i,
    /Sogou/i,
    /DuckDuckBot/i,
    /Applebot/i,
    /Slackbot/i,
    /vkShare/i,
    /W3C_Validator/i,
    /SkypeUriPreview/i,
    /MetaInspector/i,
    /redditbot/i,
    /Pinterest/i,
    /Embedly/i,
    /Quora Link Preview/i,
    /outbrain/i,
  ];
  return crawlerPatterns.some((pattern) => pattern.test(userAgent));
}

function getFirestoreString(field: any): string | null {
  if (!field) return null;
  if (typeof field.stringValue === "string") return field.stringValue;
  return null;
}

function getFirestoreNumber(field: any): number | null {
  if (!field) return null;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return Number(field.doubleValue);
  return null;
}

function parseFirestoreExamFields(docId: string, fields: any): ExamMeta {
  const rawTitle = getFirestoreString(fields.title) || "";
  const rawDesc = getFirestoreString(fields.description) || "";
  const code = getFirestoreString(fields.code) || "";

  // Check for any potential thumbnail / image field
  const candidateImage =
    getFirestoreString(fields.coverImage) ||
    getFirestoreString(fields.thumbnail) ||
    getFirestoreString(fields.imageUrl) ||
    getFirestoreString(fields.image) ||
    getFirestoreString(fields.banner) ||
    getFirestoreString(fields.ogImage) ||
    null;

  let validImageUrl: string | null = null;
  if (
    candidateImage &&
    typeof candidateImage === "string" &&
    (candidateImage.startsWith("http://") ||
      candidateImage.startsWith("https://") ||
      candidateImage.startsWith("data:image/"))
  ) {
    validImageUrl = candidateImage;
  }

  const timeLimit =
    getFirestoreNumber(fields.timeLimit) ||
    getFirestoreNumber(fields.durationMinutes) ||
    null;
  const questionCount = getFirestoreNumber(fields.questionCount) || null;

  return {
    id: docId,
    title: rawTitle.trim() || "DkTEST - Bài kiểm tra",
    description:
      rawDesc.trim() || "Tham gia bài kiểm tra trên DkTEST",
    code,
    imageUrl: validImageUrl,
    timeLimit,
    questionCount,
  };
}

/**
 * Fetches exam metadata from Firestore using Firestore REST API.
 * This runs securely in any server or serverless environment without requiring
 * private credentials or heavy SDK initialization.
 */
export async function fetchExamMetadata(
  examId: string
): Promise<{ found: boolean; exam: ExamMeta | null }> {
  if (!examId || typeof examId !== "string") {
    return { found: false, exam: null };
  }

  const cleanId = examId.trim();
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "exam-fd7a1";

  try {
    // 1. Direct document get by ID
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/exams/${encodeURIComponent(
      cleanId
    )}`;
    const res = await fetch(docUrl, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const doc = await res.json();
      if (doc && doc.fields) {
        return {
          found: true,
          exam: parseFirestoreExamFields(cleanId, doc.fields),
        };
      }
    }

    // 2. Query by code (e.g. if code was provided in the URL instead of docId)
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "exams" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "code" },
            op: "EQUAL",
            value: { stringValue: cleanId.toUpperCase() },
          },
        },
        limit: 1,
      },
    };

    const queryRes = await fetch(queryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(queryBody),
    });

    if (queryRes.ok) {
      const results = await queryRes.json();
      const firstDoc = results?.[0]?.document;
      if (firstDoc && firstDoc.fields) {
        const foundId = firstDoc.name ? firstDoc.name.split("/").pop() : cleanId;
        return {
          found: true,
          exam: parseFirestoreExamFields(foundId || cleanId, firstDoc.fields),
        };
      }
    }
  } catch (err) {
    console.error(`[ExamMetadata] Error fetching exam ${cleanId}:`, err);
  }

  return { found: false, exam: null };
}

/**
 * Builds HTML meta tags string for Open Graph, Twitter/X, and Canonical URL.
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
      titleRaw = `${rawExamTitle} | DkTEST`;
    }
    descRaw = exam.description || "Tham gia bài kiểm tra trên DkTEST";
  } else {
    titleRaw = "DkTEST - Bài kiểm tra";
    descRaw = "Tham gia bài kiểm tra trực tuyến trên DkTEST";
  }

  const escapedTitle = escapeHtml(titleRaw);
  const escapedDescription = escapeHtml(descRaw);
  const escapedUrl = escapeHtml(canonicalUrl);

  const tags: string[] = [
    `<meta name="description" content="${escapedDescription}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapedTitle}">`,
    `<meta property="og:description" content="${escapedDescription}">`,
    `<meta property="og:url" content="${escapedUrl}">`,
    `<meta property="og:site_name" content="DkTEST">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapedTitle}">`,
    `<meta name="twitter:description" content="${escapedDescription}">`,
    `<link rel="canonical" href="${escapedUrl}">`,
  ];

  if (found && exam?.imageUrl) {
    const escapedImage = escapeHtml(exam.imageUrl);
    tags.push(
      `<meta property="og:image" content="${escapedImage}">`,
      `<meta name="twitter:image" content="${escapedImage}">`,
      `<meta property="og:image:alt" content="${escapedTitle}">`
    );
  }

  return {
    fullTitle: titleRaw,
    escapedTitle,
    escapedDescription,
    canonicalUrl,
    metaTagsHtml: tags.join("\n    "),
  };
}

/**
 * Replaces static title and Open Graph / Twitter tags in the HTML template
 * with the generated dynamic metadata tags.
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

  // Replace <title>...</title>
  html = html.replace(
    /<title>.*?<\/title>/is,
    `<title>${metaInfo.escapedTitle}</title>`
  );

  // Remove existing static meta description, og:*, twitter:*, canonical tags to prevent duplicates
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+property=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");

  // Inject dynamic tags right after <title>...</title> or before </head>
  if (html.includes("</title>")) {
    html = html.replace(
      "</title>",
      `</title>\n    ${metaInfo.metaTagsHtml}`
    );
  } else if (html.includes("</head>")) {
    html = html.replace(
      "</head>",
      `    <title>${metaInfo.escapedTitle}</title>\n    ${metaInfo.metaTagsHtml}\n  </head>`
    );
  }

  return html;
}

/**
 * Fallback standalone base HTML template if index.html cannot be read on disk.
 */
export function getFallbackBaseHtml(scriptSrc: string = "/src/main.tsx"): string {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptSrc}"></script>
  </body>
</html>`;
}

/**
 * Complete helper to render the dynamic HTML for an exam.
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
  const metaInfo = buildExamMetaTags({ exam, examId, baseUrl, found });

  let rawTemplate = customTemplate || "";

  if (!rawTemplate) {
    // Try reading from dist/index.html (production) or index.html (development/root)
    const distIndexPath = path.join(process.cwd(), "dist", "index.html");
    const rootIndexPath = path.join(process.cwd(), "index.html");

    if (!isDev && fs.existsSync(distIndexPath)) {
      try {
        rawTemplate = fs.readFileSync(distIndexPath, "utf-8");
      } catch (e) {}
    }

    if (!rawTemplate && fs.existsSync(rootIndexPath)) {
      try {
        rawTemplate = fs.readFileSync(rootIndexPath, "utf-8");
      } catch (e) {}
    }

    if (!rawTemplate) {
      rawTemplate = getFallbackBaseHtml(isDev ? "/src/main.tsx" : "/src/main.tsx");
    }
  }

  const finalHtml = injectExamMetaIntoHtml(rawTemplate, metaInfo);
  const status = found ? 200 : 404;

  return {
    html: finalHtml,
    status,
    exam,
    found,
  };
}
