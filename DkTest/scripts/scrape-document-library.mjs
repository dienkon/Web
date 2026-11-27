import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT_FILE = path.join(process.cwd(), "public", "data", "document-library-seed.json");
const OUT_PACKS_FILE = path.join(process.cwd(), "public", "data", "document-library-packs.json");
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 DkTEST-Library-Sync/2.1";

function decodeHtmlEntities(str) {
  return String(str || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&#8217;|&#8216;/gi, "'")
    .replace(/&#8211;|&#8212;/gi, "–")
    .replace(/&#0*38;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : "";
    });
}

function stripHtml(str) {
  return decodeHtmlEntities(String(str || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function slugifyId(str) {
  return stripDiacritics(str)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function cleanTitle(raw) {
  return stripHtml(raw)
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
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    // Canonicalize Google Drive file URLs
    if (
      parsed.hostname.includes("drive.google.com") &&
      !parsed.pathname.includes("/folders/")
    ) {
      const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/i);
      const idParam = parsed.searchParams.get("id");
      const id = fileMatch ? fileMatch[1] : idParam;
      if (id && /^[a-zA-Z0-9_-]{15,}$/.test(id)) {
        return `https://drive.google.com/file/d/${id}/view`;
      }
    }
    return parsed.toString();
  } catch {
    return u;
  }
}

function compactDocUrl(rawUrl) {
  const u = String(rawUrl || "").trim();
  const driveFile = u.match(/^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{15,})(?:\/view|\/preview)?$/i);
  if (driveFile) return `gd:${driveFile[1]}`;
  const driveOpen = u.match(/^https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{15,})$/i);
  if (driveOpen) return `gd:${driveOpen[1]}`;
  const driveFolder = u.match(/^https?:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]{15,})/i);
  if (driveFolder) return `gdf:${driveFolder[1]}`;
  const sheet = u.match(/^https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{15,})/i);
  if (sheet) return `gds:${sheet[1]}`;
  return u;
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
  if (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//i.test(lowerUrl) || lowerUrl.startsWith("gdf:")) {
    return "folder";
  }
  if (/docs\.google\.com\/spreadsheets\//i.test(lowerUrl) || lowerUrl.startsWith("gds:")) {
    return "sheet";
  }
  return "pdf";
}

function classifySubject(title, tags = []) {
  const combined = stripDiacritics(`${tags.join(" ")} ${title}`);
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
  if (/\b(sinh hoc|mon sinh|di truyen|sinh thai|sinh 8|sinh 9|sinh 10|sinh 11|sinh 12|ebook sinh)\b/.test(combined)) {
    return "biology";
  }
  if (/\b(hoa hoc|mon hoa|huu co|vo co|este|hoa 8|hoa 9|hoa 10|hoa 11|hoa 12|ebook hoa)\b/.test(combined)) {
    return "chemistry";
  }
  if (/\b(dia ly|dia li|atlat|mon dia|dia 8|dia 9|dia 10|dia 11|dia 12)\b/.test(combined)) {
    return "geography";
  }
  if (/\b(lich su|mon su|su 8|su 9|su 10|su 11|su 12|ebook su|chien dich.*su)\b/.test(combined)) {
    return "history";
  }
  if (/\b(vat ly|vat li|mon ly|mon li|dao dong|song co|dien xoay chieu|hat nhan|vat ly 8|vat ly 9|vat ly 10|vat ly 11|vat ly 12|ebook ly|ebook li)\b/.test(combined)) {
    return "physics";
  }
  if (/\b(ngu van|mon van|nghi luan|doc hieu|tho |tac pham|van hoc|van 6|van 7|van 8|van 9|van 10|van 11|van 12)\b/.test(combined)) {
    return "literature";
  }
  if (/\b(tieng anh|english|ielts|toeic|vstep|grammar|vocabulary|reading|anh 6|anh 7|anh 8|anh 9|anh 10|anh 11|anh 12)\b/.test(combined)) {
    return "english";
  }
  if (/\b(toan|dai so|giai tich|hinh hoc|tich phan|dao ham|ham so|xac suat|logarit|casio|tu duy dinh luong)\b/.test(combined)) {
    return "math";
  }
  if (/\b(dgnl|dgtd|hsa|v-act|vact|tsa|vsat|spt|qda|danh gia nang luc|danh gia tu duy|khoa hoc hsa|khoa hoc tsa)\b/.test(combined)) {
    return "aptitude";
  }
  return "multi_subject";
}

function classifyGrade(title, tags = [], allowThcs = true) {
  const normTitle = stripDiacritics(title);
  const normTags = stripDiacritics(tags.join(" "));
  const both = `${normTitle} ${normTags}`;

  // Middle school (THCS 6, 7, 8, 9 & Entrance into Grade 10)
  if (
    /\b(lop 6|lop 7|lop 8|lop 9|toan 6|toan 7|toan 8|toan 9|van 6|van 7|van 8|van 9|anh 6|anh 7|anh 8|anh 9|tieng anh 6|tieng anh 7|tieng anh 8|tieng anh 9|khtn 6|khtn 7|khtn 8|khtn 9|thi vao 10|vao lop 10|tuyen sinh lop 10|tuyen sinh 10|thcs)\b/.test(
      both
    ) &&
    !/\b(lop 11|lop 12|toan 11|toan 12)\b/.test(normTitle)
  ) {
    return allowThcs ? "thcs" : null;
  }

  // Competency / Thinking Assessment exams
  if (
    /\b(hsa|v-act|vact|tsa|vsat|hsca|h-sca|spt|qda|dgnl|dgtd|danh gia nang luc|danh gia tu duy|bo cong an|bo quoc phong)\b/.test(
      both
    )
  ) {
    return "dgnl_dgtd";
  }

  // University / General / Certificates
  if (
    tags.includes("TLK") ||
    /\b(dai cuong|dai hoc|mac-lenin|triet hoc|kinh te vi mo|xac suat thong ke dai hoc|hust|ptit|neu|uet|tmu|vstep|ielts|toeic|hsk|topik)\b/.test(
      both
    )
  ) {
    return "general";
  }

  // Explicit Grade 10 or Grade 11
  if (
    /\b(lop 10|toan 10|vat ly 10|vat li 10|hoa 10|hoa hoc 10|sinh 10|sinh hoc 10|anh 10|tieng anh 10|ngu van 10|van 10|su 10|lich su 10|dia 10|dia li 10|dia ly 10|tin 10|tin hoc 10|gdktpl 10|khoi 10)\b/.test(
      both
    )
  ) {
    return "grade_10";
  }
  if (
    /\b(lop 11|toan 11|vat ly 11|vat li 11|hoa 11|hoa hoc 11|sinh 11|sinh hoc 11|anh 11|tieng anh 11|ngu van 11|van 11|su 11|lich su 11|dia 11|dia li 11|dia ly 11|tin 11|tin hoc 11|gdktpl 11|khoi 11)\b/.test(
      both
    )
  ) {
    return "grade_11";
  }

  // National High School Graduation / Mock Exams
  if (
    /\b(tot nghiep thpt|tn thpt|thpt quoc gia|thptqg|thi thu dai hoc|thi thu tot nghiep|de minh hoa|de tham khao bo|de thi thu thpt|de thi thu)\b/.test(
      both
    )
  ) {
    return "thpt_qg";
  }

  return "grade_12";
}

function classifyCategory(title, tags = [], format = "pdf", subFilesCount = 0) {
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
  if (
    /\b(de thi|de kiem tra|de minh hoa|de on|de khao sat|khao sat chat luong|thi thu|giua ky|giua ki|hoc ky|hoc ki|cuoi ky|cuoi ki|hsg|hoc sinh gioi|gk1|gk2|hk1|hk2)\b/.test(
      both
    )
  ) {
    return "exam_test";
  }
  return "topic_guide";
}

/**
 * Parses nested `<div class="folderTree_ft">` (`<li class="folder_ft">...<ul><li class="file_ft">`)
 * so multi-folder packs from nganhangdethi.org preserve exact hierarchical `p` (`folderPath`)!
 */
function parseNestedFolderTreeFt(html, postTitle = "") {
  const subFiles = [];
  let videoUrl = "";
  const treeStart = html.indexOf("folderTree_ft");
  if (treeStart < 0 && !html.includes("file_ft")) {
    return { subFiles, videoUrl };
  }

  const tokenRe =
    /<li\b[^>]*class=['"][^'"]*folder_ft[^'"]*['"][^>]*>([^<]*)|<li\b[^>]*class=['"][^'"]*file_ft[^'"]*['"][^>]*data-href=['"]([^'"]+)['"][^>]*>[\s\S]*?<span[^>]*class=['"][^'"]*file_name_ft[^'"]*['"][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/li>|<ul\b[^>]*>|<\/ul>|<\/li>/gi;

  const folderStack = [];
  let pendingFolderName = null;
  const normPostTitle = stripDiacritics(postTitle).trim();

  let m;
  while ((m = tokenRe.exec(html)) !== null) {
    const full = m[0];
    if (m[1] !== undefined) {
      // <li class="folder_ft">Folder Name
      pendingFolderName = stripHtml(m[1]).replace(/[\\/:*?"<>|]+/g, "-").trim();
    } else if (/^<ul\b/i.test(full)) {
      if (pendingFolderName !== null) {
        folderStack.push(pendingFolderName);
        pendingFolderName = null;
      } else {
        folderStack.push("");
      }
    } else if (/^<\/ul>/i.test(full)) {
      if (folderStack.length > 0) folderStack.pop();
    } else if (m[2] !== undefined) {
      // <li class="file_ft" data-href="...">...</li>
      const u = cleanDocUrl(m[2]);
      const n = stripHtml(m[3]);
      if (!u || !n) continue;
      if (/\.(mp4|mkv|mov|avi|webm)$/i.test(n)) {
        if (!videoUrl) videoUrl = u;
        continue;
      }
      // Build relative folder path, omitting redundant outer wrapper matching post title
      const cleanSegments = folderStack
        .filter(Boolean)
        .filter((seg, idx) => {
          if (idx === 0 && normPostTitle && stripDiacritics(seg) === normPostTitle) {
            return false;
          }
          return true;
        });
      const folderPath = cleanSegments.join("/");
      const fmt = detectFormatFromUrlOrName(u, n);
      if (subFiles.length < 120 && !subFiles.some((x) => x.u === u)) {
        subFiles.push({
          n: n.slice(0, 140),
          u: compactDocUrl(u),
          f: fmt,
          ...(folderPath ? { p: folderPath.slice(0, 140) } : {}),
        });
      }
    } else if (/^<\/li>/i.test(full)) {
      pendingFolderName = null;
    }
  }

  return { subFiles, videoUrl };
}

function extractEntryFiles(htmlContent, postTitle = "") {
  const html = String(htmlContent || "");
  let primaryUrl = "";
  let answerUrl = "";
  let videoUrl = "";

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

  // 2. Check <w-table file="..." video="...">
  if (!primaryUrl) {
    const wMatch = html.match(/<w-table\b([\s\S]*?)>/i);
    if (wMatch) {
      const fMatch = wMatch[1].match(/\bfile=['"]([^'"]+)['"]/i);
      const vMatch = wMatch[1].match(/\bvideo=['"]([^'"]+)['"]/i);
      if (fMatch) primaryUrl = cleanDocUrl(fMatch[1]);
      if (vMatch) videoUrl = cleanDocUrl(vMatch[1]);
    }
  }

  // 3. Parse nested `<div class="folderTree_ft">` (`folder_ft` & `file_ft`)
  const parsedTree = parseNestedFolderTreeFt(html, postTitle);
  const subFiles = parsedTree.subFiles;
  if (!videoUrl && parsedTree.videoUrl) videoUrl = parsedTree.videoUrl;

  if (!primaryUrl && subFiles.length > 0) {
    const pdfFirst = subFiles.find((x) => x.f === "pdf") || subFiles[0];
    primaryUrl = pdfFirst.u;
  }

  // 4. Fallback: extract Google Drive / Docs / PDF / DOCX links from HTML content
  if (!primaryUrl) {
    const anchorMatches = [
      ...html.matchAll(/<a\b[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi),
    ];
    const docLinks = [];
    for (const am of anchorMatches) {
      const rawHref = am[1];
      const text = stripHtml(am[2]);
      if (
        /(?:drive\.google\.com\/(?:file\/d\/|open\?|uc\?|drive\/folders\/)|docs\.google\.com\/spreadsheets\/d\/|\.(?:pdf|docx?|zip|rar)(?:[?#]|$))/i.test(
          rawHref
        )
      ) {
        const cleaned = cleanDocUrl(rawHref);
        if (cleaned && !docLinks.some((d) => d.url === cleaned)) {
          docLinks.push({ url: cleaned, label: text });
        }
      }
    }

    if (docLinks.length === 0) {
      const urlRegex =
        /https?:\/\/(?:drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+(?:\/view|\/preview)?|open\?id=[a-zA-Z0-9_-]+|uc\?[^"'\s<>]+|drive\/folders\/[a-zA-Z0-9_-]+)|docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+|[^\s"'<>]+\.(?:pdf|docx?|zip))/gi;
      const rawMatches = [...new Set((html.match(urlRegex) || []).map(cleanDocUrl).filter(Boolean))];
      for (const u of rawMatches) {
        docLinks.push({ url: u, label: "" });
      }
    }

    if (docLinks.length > 0) {
      // Distinguish exam vs answer if 2 links exist
      const ansLink = docLinks.find((d) =>
        /\b(dap an|loi giai|giai chi tiet)\b/i.test(stripDiacritics(d.label))
      );
      const examLink =
        docLinks.find((d) => d !== ansLink && !d.url.includes("/folders/")) || docLinks[0];
      primaryUrl = examLink.url;
      if (ansLink && ansLink.url !== primaryUrl) {
        answerUrl = ansLink.url;
      }
      if (docLinks.length > 2 && subFiles.length === 0) {
        docLinks.slice(0, 80).forEach((dl, idx) => {
          subFiles.push({
            n: (dl.label || `Tài liệu phần ${idx + 1}`).slice(0, 140),
            u: compactDocUrl(dl.url),
            f: detectFormatFromUrlOrName(dl.url, dl.label),
          });
        });
      }
    }
  }

  primaryUrl = compactDocUrl(primaryUrl);
  answerUrl = answerUrl ? compactDocUrl(answerUrl) : "";
  videoUrl = videoUrl ? compactDocUrl(videoUrl) : "";
  if (answerUrl === primaryUrl) answerUrl = "";
  if (videoUrl === primaryUrl) videoUrl = "";

  return { primaryUrl, answerUrl, videoUrl, subFiles };
}

async function fetchJsonWithRetry(url, retries = 2, timeoutMs = 25000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      results[idx] = await mapper(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ============================================================================
// Folder Registry Helper
// ============================================================================
const folderMap = new Map();

function ensureFolder(folder) {
  if (!folderMap.has(folder.id)) {
    folderMap.set(folder.id, folder);
  }
  return folder.id;
}

const SUBJECT_LABELS = {
  math: "Toán học",
  physics: "Vật lý",
  chemistry: "Hóa học",
  biology: "Sinh học",
  literature: "Ngữ văn",
  english: "Tiếng Anh",
  history: "Lịch sử",
  geography: "Địa lí",
  civics: "GD Kinh tế & Pháp luật",
  informatics: "Tin học",
  technology: "Công nghệ",
  foreign_other: "Ngoại ngữ (Trung • Hàn • Nhật)",
  aptitude: "Đánh giá năng lực - Tư duy",
  multi_subject: "Tổng hợp Đa môn",
};

const CATEGORY_FOLDER_LABELS = {
  exam_test: "Đề thi & Đáp án",
  ebook_book: "Sách & Ebook",
  topic_guide: "Chuyên đề & Lý thuyết",
  formula_handbook: "Sổ tay & Sơ đồ tư duy",
  folder_pack: "Thư mục Tổng hợp (Trọn bộ)",
};

const TOPIC_CLUSTER_LABELS = {
  thptqg_truong_so: { n: "Đề thi thử TN THPT & Khảo sát Trường - Sở", ic: "blue", o: 10 },
  bo_de_thuc_chien: { n: "Bộ Đề Minh Họa & Thực Chiến Chuẩn Cấu Trúc Mới", ic: "teal", o: 12 },
  de_gk1: { n: "Đề kiểm tra Giữa Học kỳ 1 (GK1) Trường - Sở", ic: "indigo", o: 15 },
  de_hk1: { n: "Đề kiểm tra Cuối Học kỳ 1 (HK1) Trường - Sở", ic: "indigo", o: 16 },
  de_gk2_hk2: { n: "Đề kiểm tra Giữa & Cuối Học kỳ 2 (GK2 - HK2) Trường - Sở", ic: "indigo", o: 17 },
  de_hsg: { n: "Đề thi Học sinh giỏi (HSG) Tỉnh / Trường & Chuyên", ic: "rose", o: 18 },
  tuyen_sinh_10: { n: "Đề thi Ôn tập THCS & Tuyển sinh vào Lớp 10", ic: "emerald", o: 19 },
  dgnl_hsa: { n: "Bộ Đề & Tài liệu ĐGNL ĐHQG Hà Nội (HSA)", ic: "amber", o: 20 },
  dgnl_vact: { n: "Bộ Đề & Tài liệu ĐGNL ĐHQG TP.HCM (V-ACT)", ic: "amber", o: 21 },
  dgtd_tsa: { n: "Bộ Đề & Tài liệu Đánh giá Tư duy Bách Khoa (TSA)", ic: "amber", o: 22 },
  dgnl_spt_vsat: { n: "Bộ Đề ĐGNL Sư phạm (SPT) • VSAT • QDA • Bộ Công An", ic: "amber", o: 23 },
  cd_ham_so: { n: "Chuyên đề Hàm số & Ứng dụng Đạo hàm", ic: "blue", o: 30 },
  cd_tich_phan: { n: "Chuyên đề Nguyên hàm - Tích phân & Ứng dụng", ic: "blue", o: 31 },
  cd_hinh_oxyz: { n: "Chuyên đề Hình học Không gian & Tọa độ Oxyz / Vectơ", ic: "blue", o: 32 },
  cd_xac_suat: { n: "Chuyên đề Tổ hợp - Xác suất - Thống kê", ic: "blue", o: 33 },
  cd_dai_so: { n: "Chuyên đề Mũ - Lôgarit - Dãy số - Lượng giác", ic: "blue", o: 34 },
  cd_dung_sai_tln: { n: "Tuyển tập Câu hỏi Đúng Sai & Trả lời ngắn Thực tế", ic: "teal", o: 35 },
  cd_ly_song_dien: { n: "Chuyên đề Dao động - Sóng - Điện từ & Hạt nhân", ic: "indigo", o: 36 },
  cd_hoa_chuyen_de: { n: "Chuyên đề Hóa Hữu cơ (Este, Amin, Polime) & Vô cơ", ic: "emerald", o: 37 },
  cd_sinh_chuyen_de: { n: "Chuyên đề Di truyền - Biến dị - Tiến hóa & Sinh thái", ic: "emerald", o: 38 },
  cd_van_nghi_luan: { n: "Chuyên đề Đọc hiểu - Nghị luận Văn học & Xã hội", ic: "rose", o: 39 },
  cd_anh_luyen_de: { n: "Chuyên đề Ngữ pháp - Từ vựng & Đọc hiểu Tiếng Anh", ic: "blue", o: 40 },
  tu_sach_ebook: { n: "Tủ Sách Tham Khảo & Ebook Tổng Ôn", ic: "purple", o: 50 },
  so_tay_mindmap: { n: "Sổ Tay Công Thức, Lý Thuyết Trọng Tâm & Sơ Đồ Tư Duy", ic: "teal", o: 52 },
  bo_tai_lieu_tong_hop: { n: "Thư mục Trọn bộ & Tài liệu Tổng ôn", ic: "slate", o: 55 },
};

function classifyTopicCluster(title, tags = [], grade = "grade_12", subject = "math", category = "exam_test") {
  const both = stripDiacritics(`${title} ${tags.join(" ")}`);

  if (grade === "thcs" || /\b(vao lop 10|thi vao 10|tuyen sinh lop 10|tuyen sinh 10|lop 8|lop 9|toan 8|toan 9)\b/.test(both)) {
    return "tuyen_sinh_10";
  }

  if (grade === "dgnl_dgtd") {
    if (/\b(hsa|dgnl ha noi|dhqg ha noi)\b/.test(both)) return "dgnl_hsa";
    if (/\b(v-act|vact|dgnl tphcm|dgnl hcm|dhqg tphcm)\b/.test(both)) return "dgnl_vact";
    if (/\b(tsa|danh gia tu duy|bach khoa)\b/.test(both)) return "dgtd_tsa";
    return "dgnl_spt_vsat";
  }

  if (category === "formula_handbook" || /\b(so tay|cong thuc|so do tu duy|mindmap|tom tat ly thuyet)\b/.test(both)) {
    return "so_tay_mindmap";
  }
  if (category === "ebook_book" || /\b(ebook|sach |giao trinh|cam nang)\b/.test(both)) {
    return "tu_sach_ebook";
  }

  // Specific exam series (School & Department exams grouped cleanly!)
  if (/\b(hoc sinh gioi|chon hsg|\bhsg\b|chuyen cap tinh|bang a|bang b|olympic)\b/.test(both)) {
    return "de_hsg";
  }
  if (/\b(giua hoc ki 1|giua hoc ky 1|giua ki 1|giua ky 1|\bgk1\b|\bghk1\b)\b/.test(both)) {
    return "de_gk1";
  }
  if (/\b(cuoi hoc ki 1|cuoi hoc ky 1|hoc ki 1|hoc ky 1|cuoi ki 1|cuoi ky 1|\bhk1\b|\bchk1\b)\b/.test(both)) {
    return "de_hk1";
  }
  if (/\b(giua hoc ki 2|giua hoc ky 2|giua ki 2|giua ky 2|cuoi hoc ki 2|cuoi hoc ky 2|hoc ki 2|hoc ky 2|cuoi ki 2|cuoi ky 2|\bgk2\b|\bhk2\b|\bghk2\b|\bchk2\b)\b/.test(both)) {
    return "de_gk2_hk2";
  }
  if (/\b(de minh hoa|de tham khao|phat trien de|60 de|50 de|40 de|30 de|25 de|20 de|15 de|bo de thuc chien|luyen de)\b/.test(both)) {
    return "bo_de_thuc_chien";
  }
  if (
    grade === "thpt_qg" ||
    /\b(thi thu|tot nghiep thpt|tn thpt|thptqg|thpt quoc gia|khao sat chat luong|kscl|ren ky nang|so gd|lien truong|cum truong)\b/.test(both)
  ) {
    return "thptqg_truong_so";
  }

  // Subject-specific curriculum chapters & question formats
  if (/\b(dung sai|tra loi ngan|bai toan thuc te)\b/.test(both)) {
    return "cd_dung_sai_tln";
  }
  if (subject === "math") {
    if (/\b(ham so|dao ham|cuc tri|don dieu|tiem can|do thi)\b/.test(both)) return "cd_ham_so";
    if (/\b(nguyen ham|tich phan)\b/.test(both)) return "cd_tich_phan";
    if (/\b(oxyz|vecto|khong gian|khoi da dien|goc va khoang cach|mat cau|mat phang)\b/.test(both)) return "cd_hinh_oxyz";
    if (/\b(xac suat|thong ke|to hop|nhi thuc)\b/.test(both)) return "cd_xac_suat";
    if (/\b(logarit|ham so mu|luong giac|day so|cap so|phuong trinh|bat phuong trinh)\b/.test(both)) return "cd_dai_so";
  } else if (subject === "physics") {
    return "cd_ly_song_dien";
  } else if (subject === "chemistry") {
    return "cd_hoa_chuyen_de";
  } else if (subject === "biology") {
    return "cd_sinh_chuyen_de";
  } else if (subject === "literature") {
    return "cd_van_nghi_luan";
  } else if (subject === "english") {
    return "cd_anh_luyen_de";
  }

  if (category === "exam_test") {
    return grade === "grade_12" ? "thptqg_truong_so" : "bo_de_thuc_chien";
  }
  return "bo_tai_lieu_tong_hop";
}

// ============================================================================
// 1. Harvest Ngân Hàng Đề Thi (nganhangdethi.org) with Authentic Hierarchy
// ============================================================================
function buildNhdtFolderForEntry(title, tags, grade, subject, category) {
  ensureFolder({
    id: "sfold_nhdt",
    n: "Ngân Hàng Đề Thi (nganhangdethi.org)",
    p: null,
    sk: "nhdt",
    ic: "blue",
    o: 1,
    u: "https://www.nganhangdethi.org/",
    d: "Kho đề thi, Ebook Moon/Mapstudy & thư mục tài liệu 10, 11, 12, HSA, V-ACT, TSA phân cấp chuẩn như gốc.",
  });

  const normBoth = stripDiacritics(`${tags.join(" ")} ${title}`);

  // Branch A: ĐGNL & ĐGTD (HSA, V-ACT, TSA, VSAT)
  if (grade === "dgnl_dgtd") {
    const dgnlRoot = ensureFolder({
      id: "sfold_nhdt_dgnl",
      n: "Kỳ thi ĐGNL & ĐGTD (HSA • V-ACT • TSA • VSAT)",
      p: "sfold_nhdt",
      sk: "nhdt",
      g: "dgnl_dgtd",
      ic: "amber",
      o: 10,
    });

    let examKey = "other";
    let examName = "Tổng hợp ĐGNL • VSAT • Sư Phạm";
    let order = 14;
    if (tags.includes("HSA") || /\b(hsa|dgnl ha noi|dhqg ha noi)\b/.test(normBoth)) {
      examKey = "hsa";
      examName = "Đánh giá năng lực Hà Nội (HSA)";
      order = 11;
    } else if (tags.includes("V-ACT") || /\b(v-act|vact|dgnl tphcm|dhqg tphcm)\b/.test(normBoth)) {
      examKey = "vact";
      examName = "Đánh giá năng lực TP.HCM (V-ACT)";
      order = 12;
    } else if (tags.includes("TSA") || /\b(tsa|danh gia tu duy|bach khoa)\b/.test(normBoth)) {
      examKey = "tsa";
      examName = "Đánh giá tư duy Bách Khoa (TSA)";
      order = 13;
    }

    const examFolderId = ensureFolder({
      id: `sfold_nhdt_dgnl_${examKey}`,
      n: examName,
      p: dgnlRoot,
      sk: "nhdt",
      g: "dgnl_dgtd",
      ic: "amber",
      o: order,
    });

    const catFolderId = ensureFolder({
      id: `sfold_nhdt_dgnl_${examKey}_${category}`,
      n: CATEGORY_FOLDER_LABELS[category] || "Tài liệu",
      p: examFolderId,
      sk: "nhdt",
      g: "dgnl_dgtd",
      s: subject,
      o: 20,
    });
    return catFolderId;
  }

  // Branch B: Ngoại ngữ khác & Tài liệu khác (TLK / Đại cương)
  if (grade === "general" || subject === "foreign_other") {
    const tlkRoot = ensureFolder({
      id: "sfold_nhdt_tlk",
      n: "Tài liệu Khác & Ngoại ngữ (TLK • Đại cương • Chứng chỉ)",
      p: "sfold_nhdt",
      sk: "nhdt",
      g: "general",
      ic: "purple",
      o: 50,
    });

    let subKey = "general";
    let subName = "Tài liệu Đại cương & Tổng hợp";
    if (tags.includes("Tiếng Trung") || /\b(tieng trung|hsk)\b/.test(normBoth)) {
      subKey = "chinese";
      subName = "Tiếng Trung & HSK";
    } else if (tags.includes("Tiếng Hàn") || /\b(tieng han|topik)\b/.test(normBoth)) {
      subKey = "korean";
      subName = "Tiếng Hàn & TOPIK";
    } else if (/\b(ielts|toeic|vstep)\b/.test(normBoth)) {
      subKey = "certs";
      subName = "Chứng chỉ IELTS • TOEIC • VSTEP";
    }

    return ensureFolder({
      id: `sfold_nhdt_tlk_${subKey}`,
      n: subName,
      p: tlkRoot,
      sk: "nhdt",
      g: "general",
      s: subject,
      o: 10,
    });
  }

  // Branch C: Grade 12 & Tốt nghiệp THPT / Grade 11 / Grade 10 / THCS
  let gradeGroupKey = "g12";
  let gradeGroupName = "Tài liệu Lớp 12 & Tốt nghiệp THPT";
  let gradeOrder = 20;
  let folderGrade = grade;

  if (grade === "grade_11") {
    gradeGroupKey = "g11";
    gradeGroupName = "Tài liệu Lớp 11";
    gradeOrder = 30;
  } else if (grade === "grade_10") {
    gradeGroupKey = "g10";
    gradeGroupName = "Tài liệu Lớp 10";
    gradeOrder = 40;
  } else if (grade === "thcs") {
    gradeGroupKey = "thcs";
    gradeGroupName = "Tài liệu THCS & Thi vào 10";
    gradeOrder = 45;
  } else {
    folderGrade = grade === "thpt_qg" ? "thpt_qg" : "grade_12";
  }

  const gradeFolderId = ensureFolder({
    id: `sfold_nhdt_${gradeGroupKey}`,
    n: gradeGroupName,
    p: "sfold_nhdt",
    sk: "nhdt",
    g: folderGrade,
    ic: gradeGroupKey === "g12" ? "blue" : gradeGroupKey === "g11" ? "indigo" : "teal",
    o: gradeOrder,
  });

  const subjSuffix =
    gradeGroupKey === "g12" ? " 12" : gradeGroupKey === "g11" ? " 11" : gradeGroupKey === "g10" ? " 10" : "";
  const subjBase = SUBJECT_LABELS[subject] || "Tổng hợp";
  const subjDisplayName =
    subject === "multi_subject" || subject === "foreign_other" || subject === "aptitude"
      ? `${subjBase}${subjSuffix}`
      : `${subjBase}${subjSuffix}`;

  const subjFolderId = ensureFolder({
    id: `sfold_nhdt_${gradeGroupKey}_${subject}`,
    n: subjDisplayName,
    p: gradeFolderId,
    sk: "nhdt",
    g: folderGrade,
    s: subject,
    o: 10,
  });

  return subjFolderId;
}

async function harvestBloggerSource({ baseUrl, sourceLabel, sourceKey, maxTotal, buildFolderFn }) {
  const collected = [];
  const seenUrls = new Set();
  const requestedBatch = 100;
  let start = 1;

  while (start <= maxTotal) {
    const feedUrl = `${baseUrl}/feeds/posts/default?alt=json&max-results=${requestedBatch}&start-index=${start}`;
    const data = await fetchJsonWithRetry(feedUrl, 2, 25000);
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
      const { primaryUrl, answerUrl, videoUrl, subFiles } = extractEntryFiles(content, title);
      if (!primaryUrl) continue;
      if (seenUrls.has(primaryUrl)) continue;
      seenUrls.add(primaryUrl);

      const grade = classifyGrade(title, tags, true);
      if (!grade) continue;

      const subject = classifySubject(title, tags);
      const fileFormat = detectFormatFromUrlOrName(primaryUrl, subFiles[0]?.n || title);
      const category = classifyCategory(title, tags, fileFormat, subFiles.length);
      const folderId = buildFolderFn(title, tags, grade, subject, category);

      const altLink = (entry?.link || []).find((l) => l?.rel === "alternate")?.href || "";
      const publishedRaw = String(entry?.published?.["$t"] || "2026-01-01");
      const dateShort = publishedRaw.slice(0, 10);
      const hash = crypto
        .createHash("md5")
        .update(`${sourceKey}|${primaryUrl}|${title}`)
        .digest("hex")
        .slice(0, 10);

      const cleanTags = tags
        .filter((t) => t !== "TLK" && t.length <= 28)
        .slice(0, 4);

      const compactItem = {
        id: `doc_${sourceKey}_${hash}`,
        t: title.slice(0, 210),
        g: grade,
        s: subject,
        c: category,
        f: fileFormat,
        fid: folderId,
        sk: sourceKey,
        u: primaryUrl,
        ...(answerUrl ? { a: answerUrl } : {}),
        ...(videoUrl ? { v: videoUrl } : {}),
        ...(subFiles.length > 1 ? { sf: subFiles } : {}),
        d: dateShort,
        src: sourceLabel,
        ...(altLink ? { pu: altLink } : {}),
        ...(cleanTags.length > 0 ? { tg: cleanTags } : {}),
      };
      collected.push(compactItem);
    }

    start += entries.length;
  }

  return collected;
}

// ============================================================================
// 2. Harvest Tài Liệu Ôn Thi EDU (https://tailieuonthi.edu.vn/) via WP REST API
// ============================================================================
async function harvestTaiLieuOnThiEdu() {
  const baseUrl = "https://tailieuonthi.edu.vn";
  ensureFolder({
    id: "sfold_tlo_edu",
    n: "Tài Liệu Ôn Thi EDU (tailieuonthi.edu.vn)",
    p: null,
    sk: "tlo_edu",
    ic: "emerald",
    o: 2,
    u: "https://tailieuonthi.edu.vn/",
    d: "Hệ thống thư mục THCS (Lớp 8, 9), THPT (10, 11, 12), Đề khảo sát Sở GD&ĐT, ĐGNL & ĐGTD miễn phí.",
  });

  // Fetch all WP categories
  const rawCats = (await fetchJsonWithRetry(`${baseUrl}/wp-json/wp/v2/categories?per_page=100&page=1`)) || [];
  const excludedSlugs = new Set(["tin-tuc", "khoa-hoc", "uncategorized"]);
  const catById = new Map();
  for (const c of rawCats) {
    if (!c?.id || excludedSlugs.has(c.slug)) continue;
    catById.set(c.id, c);
  }

  // Register exact parent-child WP category tree under sfold_tlo_edu
  for (const c of catById.values()) {
    const parentFolderId =
      c.parent && catById.has(c.parent) ? `sfold_edu_${c.parent}` : "sfold_tlo_edu";
    const cleanName = cleanTitle(c.name);
    const g = classifyGrade(cleanName, [c.slug], true) || undefined;
    const s = classifySubject(cleanName, [c.slug]);
    ensureFolder({
      id: `sfold_edu_${c.id}`,
      n: cleanName,
      p: parentFolderId,
      sk: "tlo_edu",
      ...(g ? { g } : {}),
      ...(s !== "multi_subject" ? { s } : {}),
      ic: "emerald",
      o: c.parent ? 20 : 10,
      ...(c.link ? { u: c.link } : {}),
    });
  }

  function getCatDepth(catId) {
    let depth = 0;
    let cur = catById.get(catId);
    while (cur && cur.parent && catById.has(cur.parent) && depth < 6) {
      depth++;
      cur = catById.get(cur.parent);
    }
    return depth;
  }

  const collected = [];
  const seenUrls = new Set();

  for (let page = 1; page <= 15; page++) {
    const posts = await fetchJsonWithRetry(
      `${baseUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,date,title,categories,link,content`
    );
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const post of posts) {
      const title = cleanTitle(post.title?.rendered || "");
      if (!title || title.length < 4) continue;

      const catIds = (post.categories || []).filter((cid) => catById.has(cid));
      const catNames = catIds.map((cid) => cleanTitle(catById.get(cid)?.name || ""));

      const html = post.content?.rendered || "";
      const { primaryUrl, answerUrl, videoUrl, subFiles } = extractEntryFiles(html, title);
      if (!primaryUrl) continue;
      if (seenUrls.has(primaryUrl)) continue;
      seenUrls.add(primaryUrl);

      // Pick deepest WP category as leaf folder so hierarchy matches tailieuonthi.edu.vn!
      let chosenFolderId = "sfold_tlo_edu";
      if (catIds.length > 0) {
        const sortedCats = [...catIds].sort((a, b) => getCatDepth(b) - getCatDepth(a));
        chosenFolderId = `sfold_edu_${sortedCats[0]}`;
      }

      const grade = classifyGrade(title, catNames, true) || "grade_12";
      const subject = classifySubject(title, catNames);
      const fileFormat = detectFormatFromUrlOrName(primaryUrl, title);
      const category = classifyCategory(title, catNames, fileFormat, subFiles.length);
      const dateShort = String(post.date || "2026-01-01").slice(0, 10);
      const hash = crypto
        .createHash("md5")
        .update(`edu|${post.id}|${primaryUrl}`)
        .digest("hex")
        .slice(0, 10);

      collected.push({
        id: `doc_edu_${hash}`,
        t: title.slice(0, 210),
        g: grade,
        s: subject,
        c: category,
        f: fileFormat,
        fid: chosenFolderId,
        sk: "tlo_edu",
        u: primaryUrl,
        ...(answerUrl ? { a: answerUrl } : {}),
        ...(videoUrl ? { v: videoUrl } : {}),
        ...(subFiles.length > 1 ? { sf: subFiles } : {}),
        d: dateShort,
        src: "Tài Liệu Ôn Thi EDU",
        ...(post.link ? { pu: post.link } : {}),
        ...(catNames.length > 0 ? { tg: catNames.slice(0, 3) } : {}),
      });
    }

    if (posts.length < 100) break;
  }

  return collected;
}

// ============================================================================
// 3. Harvest Tài Liệu Ôn Thi ORG (https://tailieuonthi.org/) via WP + v2 API
// ============================================================================
async function harvestTaiLieuOnThiOrg() {
  const baseUrl = "https://tailieuonthi.org";
  ensureFolder({
    id: "sfold_tlo_org",
    n: "Tài Liệu Ôn Thi ORG (tailieuonthi.org)",
    p: null,
    sk: "tlo_org",
    ic: "amber",
    o: 3,
    u: "https://tailieuonthi.org/",
    d: "Chuyên trang tài liệu các kỳ thi THPT, HSA, TSA, V-ACT, SPT (Sư phạm), QDA & Bộ Công An có đáp án chi tiết.",
  });

  // Fetch all WP categories
  const rawCats = (await fetchJsonWithRetry(`${baseUrl}/wp-json/wp/v2/categories?per_page=100&page=1`)) || [];
  const excludedSlugs = new Set(["tin-tuc", "uncategorized", "phong-luyen-thi"]);
  const catById = new Map();
  for (const c of rawCats) {
    if (!c?.id || excludedSlugs.has(c.slug)) continue;
    catById.set(c.id, c);
  }

  for (const c of catById.values()) {
    const parentFolderId =
      c.parent && catById.has(c.parent) ? `sfold_org_${c.parent}` : "sfold_tlo_org";
    const cleanName = cleanTitle(c.name);
    const g = classifyGrade(cleanName, [c.slug], true) || undefined;
    const s = classifySubject(cleanName, [c.slug]);
    ensureFolder({
      id: `sfold_org_${c.id}`,
      n: cleanName,
      p: parentFolderId,
      sk: "tlo_org",
      ...(g ? { g } : {}),
      ...(s !== "multi_subject" ? { s } : {}),
      ic: "amber",
      o: c.parent ? 20 : 10,
      ...(c.link ? { u: c.link } : {}),
    });
  }

  const miscOrgFolder = ensureFolder({
    id: "sfold_org_misc",
    n: "Tài liệu Tổng hợp Khác",
    p: "sfold_tlo_org",
    sk: "tlo_org",
    ic: "amber",
    o: 90,
  });

  function getCatDepth(catId) {
    let depth = 0;
    let cur = catById.get(catId);
    while (cur && cur.parent && catById.has(cur.parent) && depth < 6) {
      depth++;
      cur = catById.get(cur.parent);
    }
    return depth;
  }

  // Step A: Quickly list all post IDs via WP REST posts endpoint (100 per page -> ~9 requests)
  const postStubs = [];
  for (let page = 1; page <= 15; page++) {
    const batch = await fetchJsonWithRetry(
      `${baseUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,date,title,categories,link,content`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    postStubs.push(...batch);
    if (batch.length < 100) break;
  }

  console.log(`  -> tailieuonthi.org listed ${postStubs.length} posts; fetching resource file metadata...`);

  // Step B: Concurrently fetch `/wp-json/tailieuonthi/v2/resource/<id>` to get structured `files` & `click_summary.targets`
  const detailedList = await mapConcurrent(postStubs, 16, async (stub) => {
    const resJson = await fetchJsonWithRetry(
      `${baseUrl}/wp-json/tailieuonthi/v2/resource/${stub.id}`,
      1,
      15000
    );
    return { stub, resJson };
  });

  const collected = [];
  const seenUrls = new Set();

  for (const { stub, resJson } of detailedList) {
    const title = cleanTitle(resJson?.title || stub.title?.rendered || "");
    if (!title || title.length < 4) continue;

    // Extract download targets from v2 resource JSON + fallback HTML
    const targets = resJson?.click_summary?.targets || [];
    const v2Files = resJson?.files || [];
    const bundleItems = resJson?.bundle_items || [];

    let primaryUrl = "";
    let answerUrl = "";
    const subFiles = [];

    const dlTargets = targets
      .filter((t) => t?.url && (t.kind === "download" || /drive\.google|docs\.google|\.pdf|\.doc/i.test(t.url)))
      .map((t) => ({ url: cleanDocUrl(t.url), label: cleanTitle(t.label || "") }))
      .filter((t) => Boolean(t.url));

    if (dlTargets.length > 0) {
      const ansTarget = dlTargets.find(
        (t) =>
          dlTargets.length > 1 &&
          /\b(dap an|loi giai|giai chi tiet)\b/i.test(stripDiacritics(t.label))
      );
      const mainTarget = dlTargets.find((t) => t !== ansTarget) || dlTargets[0];
      primaryUrl = compactDocUrl(mainTarget.url);
      if (ansTarget && compactDocUrl(ansTarget.url) !== primaryUrl) {
        answerUrl = compactDocUrl(ansTarget.url);
      }
      if (dlTargets.length > 2) {
        dlTargets.slice(0, 80).forEach((dt, idx) => {
          const cu = compactDocUrl(dt.url);
          if (!subFiles.some((x) => x.u === cu)) {
            subFiles.push({
              n: (dt.label || `Tệp tài liệu ${idx + 1}`).slice(0, 140),
              u: cu,
              f: detectFormatFromUrlOrName(dt.url, dt.label),
            });
          }
        });
      }
    }

    if (!primaryUrl && v2Files.length > 0) {
      const validFiles = v2Files
        .map((f) => cleanDocUrl(f?.url || ""))
        .filter(Boolean);
      if (validFiles.length > 0) {
        primaryUrl = compactDocUrl(validFiles[0]);
        if (validFiles.length === 2 && compactDocUrl(validFiles[1]) !== primaryUrl) {
          answerUrl = compactDocUrl(validFiles[1]);
        } else if (validFiles.length > 2) {
          validFiles.slice(0, 80).forEach((vu, idx) => {
            const cu = compactDocUrl(vu);
            if (!subFiles.some((x) => x.u === cu)) {
              subFiles.push({
                n: `Tài liệu phần ${idx + 1}`,
                u: cu,
                f: detectFormatFromUrlOrName(vu),
              });
            }
          });
        }
      }
    }

    if (!primaryUrl && Array.isArray(bundleItems) && bundleItems.length > 0) {
      bundleItems.slice(0, 80).forEach((bi, idx) => {
        const bu = cleanDocUrl(bi?.url || bi?.file_url || "");
        if (!bu) return;
        const cu = compactDocUrl(bu);
        if (!primaryUrl) primaryUrl = cu;
        subFiles.push({
          n: cleanTitle(bi?.title || bi?.label || `Tài liệu ${idx + 1}`).slice(0, 140),
          u: cu,
          f: detectFormatFromUrlOrName(bu, bi?.title),
        });
      });
    }

    if (!primaryUrl && resJson?.teacher_word_url) {
      const wu = cleanDocUrl(resJson.teacher_word_url);
      if (wu) primaryUrl = compactDocUrl(wu);
    }

    if (!primaryUrl) {
      const fallback = extractEntryFiles(resJson?.content || stub.content?.rendered || "", title);
      primaryUrl = fallback.primaryUrl;
      answerUrl = fallback.answerUrl;
      if (fallback.subFiles.length > 1) subFiles.push(...fallback.subFiles);
    }

    if (!primaryUrl) continue;
    if (seenUrls.has(primaryUrl)) continue;
    seenUrls.add(primaryUrl);

    const catIds = (stub.categories || []).filter((cid) => catById.has(cid));
    const catNames = catIds.map((cid) => cleanTitle(catById.get(cid)?.name || ""));
    const classif = resJson?.classification || {};
    const extraTags = [
      ...(classif.exam || []).map((x) => x.label),
      ...(classif.subject || []).map((x) => x.label),
      ...(classif.grade || []).map((x) => x.label),
      ...catNames,
    ].filter(Boolean);

    let chosenFolderId = miscOrgFolder;
    if (catIds.length > 0) {
      const sortedCats = [...catIds].sort((a, b) => getCatDepth(b) - getCatDepth(a));
      chosenFolderId = `sfold_org_${sortedCats[0]}`;
    }

    const grade = classifyGrade(title, extraTags, true) || "grade_12";
    const subject = classifySubject(title, extraTags);
    const fileFormat = detectFormatFromUrlOrName(primaryUrl, title);
    const category = classifyCategory(title, extraTags, fileFormat, subFiles.length);
    const dateShort = String(resJson?.date || stub.date || "2026-01-01").slice(0, 10);
    const hash = crypto
      .createHash("md5")
      .update(`org|${stub.id}|${primaryUrl}`)
      .digest("hex")
      .slice(0, 10);

    collected.push({
      id: `doc_org_${hash}`,
      t: title.slice(0, 210),
      g: grade,
      s: subject,
      c: category,
      f: fileFormat,
      fid: chosenFolderId,
      sk: "tlo_org",
      u: primaryUrl,
      ...(answerUrl ? { a: answerUrl } : {}),
      ...(subFiles.length > 1 ? { sf: subFiles } : {}),
      d: dateShort,
      src: "Tài Liệu Ôn Thi ORG",
      ...(stub.link ? { pu: stub.link } : {}),
      ...(extraTags.length > 0 ? { tg: [...new Set(extraTags)].slice(0, 4) } : {}),
    });
  }

  return collected;
}

// ============================================================================
// 4. Harvest Math & High-School Partner Sources under `sfold_math_partners`
// ============================================================================
function buildMathPartnerFolder(title, tags, grade, subject, category) {
  ensureFolder({
    id: "sfold_math_partners",
    n: "Kho Toán & Chuyên Đề Mở Rộng",
    p: null,
    sk: "math_partners",
    ic: "purple",
    o: 4,
    u: "https://www.mathvn.com/",
    d: "Tổng hợp chuyên đề, đề khảo sát và đề thi thử Toán THPT từ Nguyễn Bảo Vương, MathVN & THPT.Math.",
  });

  const mapByGrade = {
    thpt_qg: { id: "sfold_mp_thptqg", n: "Đề Thi Thử Tốt Nghiệp THPT", o: 10 },
    grade_12: { id: "sfold_mp_g12", n: "Toán & Tài liệu Lớp 12", o: 20 },
    grade_11: { id: "sfold_mp_g11", n: "Toán & Tài liệu Lớp 11", o: 30 },
    grade_10: { id: "sfold_mp_g10", n: "Toán & Tài liệu Lớp 10", o: 40 },
    thcs: { id: "sfold_mp_thcs", n: "Toán THCS (6–9) & Tuyển sinh vào 10", o: 50 },
    dgnl_dgtd: { id: "sfold_mp_dgnl", n: "Tư duy Định lượng ĐGNL - ĐGTD", o: 15 },
    general: { id: "sfold_mp_gen", n: "Sách & Tài liệu Tham khảo Khác", o: 60 },
  };
  const gInfo = mapByGrade[grade] || mapByGrade.grade_12;
  return ensureFolder({
    id: gInfo.id,
    n: gInfo.n,
    p: "sfold_math_partners",
    sk: "math_partners",
    g: grade,
    s: subject,
    ic: "purple",
    o: gInfo.o,
  });
}

// ============================================================================
// Main Orchestrator
// ============================================================================
async function main() {
  console.log("=== DkTEST v2.0.9 Full Standardized Multi-Source & Topic-Cluster Harvester ===");
  const allItems = [];

  console.log("\n[1/4] Harvesting Ngân Hàng Đề Thi (https://www.nganhangdethi.org)...");
  const nhdtItems = await harvestBloggerSource({
    baseUrl: "https://www.nganhangdethi.org",
    sourceLabel: "Ngân Hàng Đề Thi",
    sourceKey: "nhdt",
    maxTotal: 3500,
    buildFolderFn: buildNhdtFolderForEntry,
  });
  console.log(`  -> Ngân Hàng Đề Thi harvested: ${nhdtItems.length} documents`);
  allItems.push(...nhdtItems);

  console.log("\n[2/4] Harvesting Tài Liệu Ôn Thi EDU (https://tailieuonthi.edu.vn)...");
  const eduItems = await harvestTaiLieuOnThiEdu();
  console.log(`  -> Tài Liệu Ôn Thi EDU harvested: ${eduItems.length} documents`);
  allItems.push(...eduItems);

  console.log("\n[3/4] Harvesting Tài Liệu Ôn Thi ORG (https://tailieuonthi.org)...");
  const orgItems = await harvestTaiLieuOnThiOrg();
  console.log(`  -> Tài Liệu Ôn Thi ORG harvested: ${orgItems.length} documents`);
  allItems.push(...orgItems);

  console.log("\n[4/4] Harvesting Partner Math Repositories (NBV, MathVN, THPT.Math)...");
  const partnerSites = [
    { url: "https://nguyenbaovuong.blogspot.com", label: "Nguyễn Bảo Vương", max: 850 },
    { url: "https://www.mathvn.com", label: "MathVN", max: 2000 },
    { url: "https://thpt.math.vn", label: "THPT.Math", max: 350 },
  ];
  const partnerSeen = new Set();
  for (const ps of partnerSites) {
    const items = await harvestBloggerSource({
      baseUrl: ps.url,
      sourceLabel: ps.label,
      sourceKey: "math_partners",
      maxTotal: ps.max,
      buildFolderFn: buildMathPartnerFolder,
    });
    let added = 0;
    for (const it of items) {
      if (partnerSeen.has(it.u)) continue;
      partnerSeen.add(it.u);
      allItems.push(it);
      added++;
    }
    console.log(`  -> ${ps.label}: +${added} unique documents`);
  }

  // Assign standardized topicKey (`tk`) to every document & auto-cluster folders with >= 6 items!
  for (const item of allItems) {
    item.tk = classifyTopicCluster(item.t, item.tg || [], item.g, item.s, item.c);
  }

  const itemsByFolder = new Map();
  for (const item of allItems) {
    const fid = item.fid || `sfold_${item.sk || "nhdt"}`;
    if (!itemsByFolder.has(fid)) itemsByFolder.set(fid, []);
    itemsByFolder.get(fid).push(item);
  }

  for (const [parentFid, folderItems] of itemsByFolder.entries()) {
    if (folderItems.length < 6) continue;
    const parentMeta = folderMap.get(parentFid);
    if (!parentMeta) continue;

    // Check depth of parentFid (keep max depth <= 4 so hierarchy stays crisp)
    let depth = 0;
    let cur = parentMeta;
    while (cur && cur.p && folderMap.has(cur.p) && depth < 6) {
      depth++;
      cur = folderMap.get(cur.p);
    }
    if (depth >= 3) continue;

    const byTopic = new Map();
    for (const it of folderItems) {
      if (!byTopic.has(it.tk)) byTopic.set(it.tk, []);
      byTopic.get(it.tk).push(it);
    }
    // Only split into topic subfolders if at least 2 distinct topics have >= 2 items
    const qualifyingTopics = [...byTopic.entries()].filter(([, arr]) => arr.length >= 2);
    if (qualifyingTopics.length < 2) continue;

    for (const [tk, arr] of qualifyingTopics) {
      const tMeta = TOPIC_CLUSTER_LABELS[tk] || TOPIC_CLUSTER_LABELS.bo_tai_lieu_tong_hop;
      const subId = `${parentFid}__${tk}`;
      ensureFolder({
        id: subId,
        n: tMeta.n,
        p: parentFid,
        sk: parentMeta.sk,
        ...(parentMeta.g ? { g: parentMeta.g } : {}),
        ...(parentMeta.s ? { s: parentMeta.s } : {}),
        ic: tMeta.ic || parentMeta.ic || "teal",
        o: tMeta.o ?? 30,
      });
      for (const docItem of arr) {
        docItem.fid = subId;
      }
    }
  }

  // Sort documents newest first
  allItems.sort((a, b) => String(b.d).localeCompare(String(a.d)));

  // Prune empty folders while preserving every ancestor of non-empty folders!
  const directCounts = new Map();
  for (const item of allItems) {
    if (item.fid) {
      directCounts.set(item.fid, (directCounts.get(item.fid) || 0) + 1);
    }
  }

  const activeFolderIds = new Set();
  for (const [fid, cnt] of directCounts.entries()) {
    if (cnt <= 0) continue;
    let curId = fid;
    let guard = 0;
    while (curId && folderMap.has(curId) && guard < 12) {
      activeFolderIds.add(curId);
      curId = folderMap.get(curId).p;
      guard++;
    }
  }

  const finalFolders = [...folderMap.values()]
    .filter((f) => activeFolderIds.has(f.id))
    .sort((a, b) => (a.o ?? 50) - (b.o ?? 50) || a.n.localeCompare(b.n, "vi"));

  // Re-attach any orphan item whose folder wasn't registered to its source root
  const validFolderSet = new Set(finalFolders.map((f) => f.id));
  for (const item of allItems) {
    if (!item.fid || !validFolderSet.has(item.fid)) {
      item.fid = `sfold_${item.sk || "nhdt"}`;
    }
  }

  // Extract multi-file `sf` arrays into `document-library-packs.json` so initial catalog load stays ultra-fast!
  const packsMap = {};
  for (const item of allItems) {
    if (item.pu) {
      item.pu = item.pu
        .replace(/^https?:\/\/www\.nganhangdethi\.org/i, "nh:")
        .replace(/^https?:\/\/tailieuonthi\.edu\.vn/i, "edu:")
        .replace(/^https?:\/\/tailieuonthi\.org/i, "org:");
    }
    if (item.sf && item.sf.length > 1) {
      packsMap[item.id] = item.sf;
      item.sfc = item.sf.length;
      delete item.sf;
    }
  }

  const bundle = {
    version: 2,
    generatedAt: new Date().toISOString(),
    totalCount: allItems.length,
    folderCount: finalFolders.length,
    sources: [
      "Ngân Hàng Đề Thi",
      "Tài Liệu Ôn Thi EDU",
      "Tài Liệu Ôn Thi ORG",
      "Nguyễn Bảo Vương",
      "MathVN",
      "THPT.Math",
    ],
    folders: finalFolders,
    items: allItems,
  };

  const jsonStr = JSON.stringify(bundle);
  const packsStr = JSON.stringify(packsMap);
  fs.writeFileSync(OUT_FILE, jsonStr, "utf8");
  fs.writeFileSync(OUT_PACKS_FILE, packsStr, "utf8");

  // Print rich breakdown
  const bySource = {};
  const byGrade = {};
  const byTopic = {};
  for (const it of allItems) {
    bySource[it.sk] = (bySource[it.sk] || 0) + 1;
    byGrade[it.g] = (byGrade[it.g] || 0) + 1;
    byTopic[it.tk] = (byTopic[it.tk] || 0) + 1;
  }
  const packValues = Object.values(packsMap);
  const multiFilePacks = packValues.length;
  const nestedSubfolderPacks = packValues.filter((arr) => arr.some((s) => Boolean(s.p))).length;

  console.log("\n=== SEED REPOSITORY SUMMARY ===");
  console.log(`Total documents: ${allItems.length}`);
  console.log(`Total active hierarchical folders: ${finalFolders.length}`);
  console.log(`Multi-file packs: ${multiFilePacks} (with nested internal subfolders: ${nestedSubfolderPacks})`);
  console.log("By sourceKey:", bySource);
  console.log("By grade:", byGrade);
  console.log("Top topic clusters:", Object.entries(byTopic).sort((a, b) => b[1] - a[1]).slice(0, 8));
  console.log(`Output file: ${OUT_FILE} (${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB)`);
  console.log(`Packs file: ${OUT_PACKS_FILE} (${(Buffer.byteLength(packsStr) / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
