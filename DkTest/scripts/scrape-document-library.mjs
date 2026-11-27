import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT_FILE = path.join(process.cwd(), "public", "data", "document-library-seed.json");
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

function decodeHtmlEntities(str) {
  return String(str || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function cleanTitle(raw) {
  return decodeHtmlEntities(raw)
    .replace(/^\[NBV\]\s*[-–—:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDocUrl(raw) {
  let u = decodeHtmlEntities(String(raw || "").trim());
  if (!u || u === "link" || u === "#" || !/^https?:\/\//i.test(u)) return "";
  try {
    const parsed = new URL(u);
    parsed.searchParams.delete("fbclid");
    parsed.searchParams.delete("usp");
    return parsed.toString();
  } catch {
    return u;
  }
}

function detectFormatFromUrlOrName(url, name = "") {
  const lowerName = String(name || "").toLowerCase();
  const lowerUrl = String(url || "").toLowerCase();
  if (lowerName.endsWith(".pdf") || /\.pdf(?:[?#]|$)/i.test(lowerUrl)) return "pdf";
  if (lowerName.endsWith(".docx") || /\.docx(?:[?#]|$)/i.test(lowerUrl)) return "docx";
  if (lowerName.endsWith(".doc") || /\.doc(?:[?#]|$)/i.test(lowerUrl)) return "doc";
  if (lowerName.endsWith(".pptx") || lowerName.endsWith(".ppt")) return "pptx";
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) return "xlsx";
  if (lowerName.endsWith(".zip") || lowerName.endsWith(".rar") || lowerName.endsWith(".7z")) return "zip";
  if (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//i.test(lowerUrl)) return "folder";
  if (/docs\.google\.com\/spreadsheets\//i.test(lowerUrl)) return "sheet";
  if (/drive\.google\.com\/(?:file\/d\/|open\?|uc\?)/i.test(lowerUrl)) return "pdf";
  return "pdf";
}

function classifySubject(title, tags) {
  const combined = stripDiacritics(`${tags.join(" ")} ${title}`);
  // Multi-subject explicitly
  if (/\b(13 mon|cac mon|da mon|full bo .* toan.*van|toan.*ly.*hoa)\b/.test(combined)) {
    return "multi_subject";
  }
  if (/\b(tieng trung|tieng han|tieng nhat|tieng phap|tieng duc|hsk|topik|jlpt)\b/.test(combined)) {
    return "foreign_other";
  }
  if (/\b(tin hoc|lap trinh|python|c\+\+|thuat toan|co so du lieu|he dieu hanh|ptit)\b/.test(combined)) {
    return "informatics";
  }
  if (/\b(cong nghe)\b/.test(combined)) return "technology";
  if (/\b(gdktpl|gdkt|gdcd|kinh te va phap luat|kinh te phap luat|cong dan)\b/.test(combined)) {
    return "civics";
  }
  if (/\b(sinh hoc|mon sinh|di truyen|sinh thai|sinh 10|sinh 11|sinh 12|ebook sinh)\b/.test(combined)) {
    return "biology";
  }
  if (/\b(hoa hoc|mon hoa|huu co|vo co|este|hoa 10|hoa 11|hoa 12|ebook hoa)\b/.test(combined)) {
    return "chemistry";
  }
  if (/\b(dia ly|dia li|atlat|mon dia|dia 10|dia 11|dia 12)\b/.test(combined)) {
    return "geography";
  }
  if (/\b(lich su|mon su|su 10|su 11|su 12|ebook su|chien dich.*su)\b/.test(combined)) {
    return "history";
  }
  if (/\b(vat ly|vat li|mon ly|mon li|dao dong|song co|dien xoay chieu|hat nhan|ebook ly|ebook li)\b/.test(combined)) {
    return "physics";
  }
  if (/\b(ngu van|mon van|nghi luan|doc hieu|tho |tac pham|van hoc|van 10|van 11|van 12)\b/.test(combined)) {
    return "literature";
  }
  if (/\b(tieng anh|english|ielts|toeic|vstep|grammar|vocabulary|reading|anh 10|anh 11|anh 12)\b/.test(combined)) {
    return "english";
  }
  if (/\b(toan|dai so|giai tich|hinh hoc|tich phan|dao ham|ham so|xac suat|logarit|casio)\b/.test(combined)) {
    return "math";
  }
  if (/\b(dgnl|dgtd|hsa|v-act|vact|tsa|vsat|danh gia nang luc|danh gia tu duy|spt)\b/.test(combined)) {
    return "aptitude";
  }
  return "multi_subject";
}

function classifyGrade(title, tags) {
  const normTitle = stripDiacritics(title);
  const normTags = stripDiacritics(tags.join(" "));
  const both = `${normTitle} ${normTags}`;

  // Skip middle school (6, 7, 8, 9) if exclusively tagged
  if (/\b(toan 6|toan 7|toan 8|toan 9|lop 6|lop 7|lop 8|lop 9|vao lop 10)\b/.test(both) && !/\b(10|11|12)\b/.test(normTitle.replace(/vao lop 10/g, ""))) {
    return null;
  }

  // Competency / Thinking Assessment exams first if explicit
  if (/\b(hsa|v-act|vact|tsa|vsat|hsca|h-sca|spt|dgnl|dgtd|danh gia nang luc|danh gia tu duy)\b/.test(both)) {
    return "dgnl_dgtd";
  }

  // University / General / Certificates
  if (
    tags.includes("TLK") ||
    /\b(dai cuong|mac-lenin|triet hoc|kinh te vi mo|xac suat thong ke dai hoc|hust|ptit|neu|uet|vstep|ielts|toeic|hsk|topik)\b/.test(normTitle)
  ) {
    return "general";
  }

  // Explicit Grade 10 or Grade 11 in title takes priority over generic '12' blog labels
  if (/\b(lop 10|toan 10|vat ly 10|vat li 10|hoa 10|hoa hoc 10|sinh 10|sinh hoc 10|anh 10|tieng anh 10|ngu van 10|van 10|su 10|lich su 10|dia 10|dia li 10|dia ly 10|tin 10|gdktpl 10|khoi 10)\b/.test(normTitle)) {
    return "grade_10";
  }
  if (/\b(lop 11|toan 11|vat ly 11|vat li 11|hoa 11|hoa hoc 11|sinh 11|sinh hoc 11|anh 11|tieng anh 11|ngu van 11|van 11|su 11|lich su 11|dia 11|dia li 11|dia ly 11|tin 11|gdktpl 11|khoi 11)\b/.test(normTitle)) {
    return "grade_11";
  }

  if (/\b(tai lieu 10|toan 10|lop 10)\b/.test(normTags) && !/\b(11|12)\b/.test(normTitle)) {
    return "grade_10";
  }
  if (/\b(tai lieu 11|toan 11|lop 11)\b/.test(normTags) && !/\b(10|12)\b/.test(normTitle)) {
    return "grade_11";
  }

  // National High School Graduation / Mock Exams
  if (/\b(tot nghiep thpt|thpt quoc gia|thptqg|thi thu dai hoc|thi thu tot nghiep|de minh hoa|de tham khao bo|de so gd|de thi thu)\b/.test(both)) {
    return "thpt_qg";
  }

  if (/\b(12|thpt)\b/.test(both)) {
    return "grade_12";
  }

  return "grade_12";
}

function classifyCategory(title, tags, format, subFilesCount) {
  const both = stripDiacritics(`${title} ${tags.join(" ")}`);
  if (subFilesCount > 1 || format === "folder" || format === "sheet") {
    return "folder_pack";
  }
  if (/\b(so tay|cong thuc|so do tu duy|mindmap|phao|tom tat ly thuyet|infographic)\b/.test(both)) {
    return "formula_handbook";
  }
  if (/\b(ebook|sach |giao trinh|cam nang|bo sach)\b/.test(both)) {
    return "ebook_book";
  }
  if (/\b(de thi|de kiem tra|de minh hoa|de on|de khao sat|thi thu|giua ky|giua ki|hoc ky|hoc ki|cuoi ky|cuoi ki|hsg|hoc sinh gioi|gk1|gk2|hk1|hk2)\b/.test(both)) {
    return "exam_test";
  }
  return "topic_guide";
}

function extractEntryFiles(htmlContent) {
  const html = String(htmlContent || "");
  let primaryUrl = "";
  let answerUrl = "";
  let videoUrl = "";
  const subFiles = [];

  // 1. Check <x-file de="..." da="..." video="...">
  const xFileMatch = html.match(/<x-file\b([\s\S]*?)(?:>|<\/x-file>)/i);
  if (xFileMatch) {
    const attrs = xFileMatch[1];
    const deMatch = attrs.match(/\bde=['"]([^'"]+)['"]/i);
    const daMatch = attrs.match(/\bda=['"]([^'"]+)['"]/i);
    const vidMatch = attrs.match(/\bvideo=['"]([^'"]+)['"]/i);
    if (deMatch) primaryUrl = cleanDocUrl(deMatch[1]);
    if (daMatch) answerUrl = cleanDocUrl(daMatch[1]);
    if (vidMatch) videoUrl = cleanDocUrl(vidMatch[1]);
  }

  // 2. Check <w-table file="..." video="..." exam="...">
  if (!primaryUrl) {
    const wMatch = html.match(/<w-table\b([\s\S]*?)>/i);
    if (wMatch) {
      const fMatch = wMatch[1].match(/\bfile=['"]([^'"]+)['"]/i);
      const vMatch = wMatch[1].match(/\bvideo=['"]([^'"]+)['"]/i);
      if (fMatch) primaryUrl = cleanDocUrl(fMatch[1]);
      if (vMatch) videoUrl = cleanDocUrl(vMatch[1]);
    }
  }

  // 3. Check <li class="file_ft" data-href="..."><span class="file_name_ft">...</span></li>
  const fileFtRegex = /<li[^>]*class=['"][^'"]*file_ft[^'"]*['"][^>]*data-href=['"]([^'"]+)['"][^>]*>[\s\S]*?<span[^>]*class=['"][^'"]*file_name_ft[^'"]*['"][^>]*>([\s\S]*?)<\/span>/gi;
  let fm;
  while ((fm = fileFtRegex.exec(html)) !== null) {
    const u = cleanDocUrl(fm[1]);
    const n = decodeHtmlEntities(fm[2].replace(/<[^>]+>/g, "")).trim();
    if (!u || !n) continue;
    // Skip pure video mp4 items if there are actual documents, unless nothing else exists
    const isVideoFile = /\.(mp4|mkv|mov|avi|webm)$/i.test(n);
    if (isVideoFile) {
      if (!videoUrl) videoUrl = u;
      continue;
    }
    const fmt = detectFormatFromUrlOrName(u, n);
    if (subFiles.length < 30 && !subFiles.some((x) => x.u === u)) {
      subFiles.push({ n: n.slice(0, 140), u, f: fmt });
    }
  }

  if (!primaryUrl && subFiles.length > 0) {
    const pdfFirst = subFiles.find((x) => x.f === "pdf") || subFiles[0];
    primaryUrl = pdfFirst.u;
  }

  // 4. Fallback: extract Google Drive / Docs / PDF links from HTML content
  if (!primaryUrl) {
    const urlRegex = /https?:\/\/(?:drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+(?:\/view|\/preview)?|open\?id=[a-zA-Z0-9_-]+|uc\?[^"'\s<>]+|drive\/folders\/[a-zA-Z0-9_-]+)|docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+|[^\s"'<>]+\.pdf)/gi;
    const matches = html.match(urlRegex) || [];
    const cleaned = [...new Set(matches.map(cleanDocUrl).filter(Boolean))];
    // Prefer direct PDF / Drive file over folder
    const bestFile =
      cleaned.find((u) => /drive\.google\.com\/(?:file\/d\/|uc\?|open\?)/i.test(u) || /\.pdf$/i.test(u)) ||
      cleaned[0];
    if (bestFile) {
      primaryUrl = bestFile;
      // Convert preview/uc links to standard canonical file/d/<id>/view when possible
      const idMatch =
        primaryUrl.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i) ||
        primaryUrl.match(/[?&]id=([a-zA-Z0-9_-]{15,})/i);
      if (idMatch && !primaryUrl.includes("/folders/")) {
        primaryUrl = `https://drive.google.com/file/d/${idMatch[1]}/view`;
      }
    }
  }

  if (answerUrl === primaryUrl) answerUrl = "";
  if (videoUrl === primaryUrl) videoUrl = "";

  return { primaryUrl, answerUrl, videoUrl, subFiles };
}

async function fetchBloggerSiteEntries(baseUrl, sourceLabel, maxTotal = 3500) {
  const collected = [];
  const requestedBatch = 100;
  let start = 1;
  while (start <= maxTotal) {
    const feedUrl = `${baseUrl}/feeds/posts/default?alt=json&max-results=${requestedBatch}&start-index=${start}`;
    try {
      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DkTEST-Library-Sync/2.0",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        console.warn(`[Scraper] ${baseUrl} start=${start} HTTP ${res.status}`);
        break;
      }
      const data = await res.json();
      const entries = data?.feed?.entry || [];
      if (entries.length === 0) break;

      for (const entry of entries) {
        const rawTitle = entry?.title?.["$t"] || "";
        const title = cleanTitle(rawTitle);
        if (!title || title.length < 4) continue;

        const tags = (entry?.category || [])
          .map((c) => String(c?.term || "").trim())
          .filter((t) => t && !["login", "top", "search"].includes(t.toLowerCase()));

        if (/^(tim kiem tai lieu|loc danh sach tai lieu|nhan them .* xu)/i.test(stripDiacritics(title))) {
          continue;
        }

        const content = entry?.content?.["$t"] || entry?.summary?.["$t"] || "";
        const { primaryUrl, answerUrl, videoUrl, subFiles } = extractEntryFiles(content);
        if (!primaryUrl) continue;

        const grade = classifyGrade(title, tags);
        if (!grade) continue;

        const subject = classifySubject(title, tags);
        const fileFormat = detectFormatFromUrlOrName(primaryUrl, subFiles[0]?.n || title);
        const category = classifyCategory(title, tags, fileFormat, subFiles.length);

        const pubRaw = String(entry?.published?.["$t"] || "2026-01-01");
        const dateOnly = /^\d{4}-\d{2}-\d{2}/.test(pubRaw) ? pubRaw.slice(0, 10) : "2026-01-01";

        const hash = crypto
          .createHash("sha1")
          .update(`${primaryUrl}|${title.toLowerCase()}`)
          .digest("hex")
          .slice(0, 12);

        const docItem = {
          id: `doc_${hash}`,
          t: title.slice(0, 190),
          g: grade,
          s: subject,
          c: category,
          f: fileFormat,
          u: primaryUrl,
          ...(answerUrl ? { a: answerUrl } : {}),
          ...(videoUrl ? { v: videoUrl } : {}),
          ...(subFiles.length > 1 ? { sf: subFiles.slice(0, 12) } : {}),
          d: dateOnly,
          src: sourceLabel,
          ...(tags.length > 0 ? { tg: tags.slice(0, 4) } : {}),
        };
        collected.push(docItem);
      }

      console.log(
        `[Scraper] ${sourceLabel}: fetched start=${start}, got=${entries.length}, valid=${collected.length}`
      );
      start += entries.length;
    } catch (err) {
      console.warn(`[Scraper] Error on ${baseUrl} start=${start}:`, err.message);
      break;
    }
  }
  return collected;
}

console.log("[Scraper] Starting multi-source Vietnamese Exam & Document harvest...");

const [nganhangItems, nbvItems, mathvnItems, thptMathItems] = await Promise.all([
  fetchBloggerSiteEntries("https://www.nganhangdethi.org", "Ngân Hàng Đề Thi", 3300),
  fetchBloggerSiteEntries("https://nguyenbaovuong.blogspot.com", "Thư Viện Toán THPT", 600),
  fetchBloggerSiteEntries("https://www.mathvn.com", "MathVN THPT", 900),
  fetchBloggerSiteEntries("https://thpt.math.vn", "THPT MathVN", 600),
]);

const allRaw = [...nganhangItems, ...nbvItems, ...mathvnItems, ...thptMathItems];
const seenUrls = new Set();
const seenIds = new Set();
const deduped = [];

for (const item of allRaw) {
  const urlKey = item.u.toLowerCase();
  if (seenUrls.has(urlKey) || seenIds.has(item.id)) continue;
  seenUrls.add(urlKey);
  seenIds.add(item.id);
  deduped.push(item);
}

// Sort newest first
deduped.sort((a, b) => (b.d || "").localeCompare(a.d || ""));

// Summary stats
const byGrade = {};
const bySubject = {};
const byCategory = {};
for (const d of deduped) {
  byGrade[d.g] = (byGrade[d.g] || 0) + 1;
  bySubject[d.s] = (bySubject[d.s] || 0) + 1;
  byCategory[d.c] = (byCategory[d.c] || 0) + 1;
}

const bundle = {
  version: 1,
  generatedAt: new Date().toISOString(),
  totalCount: deduped.length,
  sources: [
    "nganhangdethi.org",
    "nguyenbaovuong.blogspot.com",
    "mathvn.com",
    "thpt.math.vn",
  ],
  items: deduped,
};

const jsonStr = JSON.stringify(bundle);
fs.writeFileSync(OUT_FILE, jsonStr, "utf8");

console.log("\n=== HARVEST COMPLETE ===");
console.log("Total unique documents:", deduped.length);
console.log("Raw JSON size:", Math.round(Buffer.byteLength(jsonStr) / 1024), "KB");
console.log("By Grade:", byGrade);
console.log("By Subject:", bySubject);
console.log("By Category:", byCategory);
