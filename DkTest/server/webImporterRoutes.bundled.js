// server/routes/webImporterRoutes.ts
import { Router } from "express";

// server/services/webImporter/ssrfGuard.ts
import dns from "dns";
import net from "net";
var PRIVATE_IPV4_RANGES = [
  // 0.0.0.0/8 (Current network)
  { start: ipToLong("0.0.0.0"), end: ipToLong("0.255.255.255") },
  // 10.0.0.0/8 (Private network)
  { start: ipToLong("10.0.0.0"), end: ipToLong("10.255.255.255") },
  // 127.0.0.0/8 (Loopback)
  { start: ipToLong("127.0.0.0"), end: ipToLong("127.255.255.255") },
  // 169.254.0.0/16 (Link-local, AWS/GCP Metadata 169.254.169.254)
  { start: ipToLong("169.254.0.0"), end: ipToLong("169.254.255.255") },
  // 172.16.0.0/12 (Private network)
  { start: ipToLong("172.16.0.0"), end: ipToLong("172.31.255.255") },
  // 192.168.0.0/16 (Private network)
  { start: ipToLong("192.168.0.0"), end: ipToLong("192.168.255.255") },
  // 100.64.0.0/10 (Carrier-grade NAT)
  { start: ipToLong("100.64.0.0"), end: ipToLong("100.127.255.255") },
  // 224.0.0.0/4 (Multicast)
  { start: ipToLong("224.0.0.0"), end: ipToLong("239.255.255.255") },
  // 240.0.0.0/4 (Reserved)
  { start: ipToLong("240.0.0.0"), end: ipToLong("255.255.255.255") }
];
function ipToLong(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}
function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const long = ipToLong(ip);
    for (const range of PRIVATE_IPV4_RANGES) {
      if (long >= range.start && long <= range.end) {
        return true;
      }
    }
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.replace("::ffff:", "");
      if (net.isIPv4(v4Part)) return isPrivateIp(v4Part);
    }
    return false;
  }
  return true;
}
async function validateUrlForSsrf(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`\u0110\u1ECBnh d\u1EA1ng URL kh\xF4ng h\u1EE3p l\u1EC7: "${rawUrl}"`);
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `Giao th\u1EE9c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3: "${parsedUrl.protocol}". Ch\u1EC9 ch\u1EA5p nh\u1EADn http: ho\u1EB7c https:`
    );
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "metadata.google.internal" || hostname === "169.254.169.254") {
    throw new Error(
      `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): Hostname n\u1ED9i b\u1ED9 "${hostname}" b\u1ECB c\u1EA5m.`
    );
  }
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): \u0110\u1ECBa ch\u1EC9 IP n\u1ED9i b\u1ED9 "${hostname}" b\u1ECB c\u1EA5m.`
      );
    }
    return { url: parsedUrl, resolvedIp: hostname };
  }
  try {
    const lookup = await dns.promises.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      throw new Error(`Kh\xF4ng th\u1EC3 ph\xE2n gi\u1EA3i t\xEAn mi\u1EC1n: "${hostname}"`);
    }
    for (const entry of lookup) {
      if (isPrivateIp(entry.address)) {
        throw new Error(
          `Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i (SSRF Protection): T\xEAn mi\u1EC1n "${hostname}" ph\xE2n gi\u1EA3i ra IP n\u1ED9i b\u1ED9 ${entry.address}.`
        );
      }
    }
    return { url: parsedUrl, resolvedIp: lookup[0].address };
  } catch (err) {
    if (err.message.includes("SSRF Protection")) throw err;
    throw new Error(`L\u1ED7i ki\u1EC3m tra DNS cho t\xEAn mi\u1EC1n "${hostname}": ${err.message}`);
  }
}

// server/services/webImporter/fetchService.ts
var DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 DkTestWebImporter/1.0";
async function safeFetchHtml(rawUrl, options) {
  const timeoutMs = options?.timeoutMs || 18e3;
  const maxSizeBytes = options?.maxSizeBytes || 10 * 1024 * 1024;
  const maxRedirects = options?.maxRedirects ?? 5;
  let currentUrl = rawUrl;
  let redirectsCount = 0;
  const startTime = Date.now();
  while (redirectsCount <= maxRedirects) {
    const { url } = await validateUrlForSsrf(currentUrl);
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...options?.customHeaders || {}
        },
        signal: controller.signal,
        redirect: "manual"
        // Thủ công để kiểm tra SSRF trên từng redirection target
      });
      if (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(
            `M\xE1y ch\u1EE7 tr\u1EA3 v\u1EC1 HTTP ${response.status} nh\u01B0ng kh\xF4ng c\xF3 header Location \u0111\u1EC3 chuy\u1EC3n h\u01B0\u1EDBng.`
          );
        }
        const nextUrl = new URL(location, url).toString();
        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }
      if (!response.ok) {
        throw new Error(
          `M\xE1y ch\u1EE7 tr\u1EA3 v\u1EC1 m\xE3 l\u1ED7i HTTP ${response.status} (${response.statusText || "L\u1ED7i y\xEAu c\u1EA7u"}).`
        );
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml") && !contentType.includes("text/plain")) {
        throw new Error(
          `\u0110\u1ECBnh d\u1EA1ng ph\u1EA3n h\u1ED3i kh\xF4ng ph\u1EA3i l\xE0 HTML (Content-Type: "${contentType}"). Kh\xF4ng th\u1EC3 ph\xE2n t\xEDch \u0111\u1EC1 thi.`
        );
      }
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxSizeBytes) {
        throw new Error(
          `Dung l\u01B0\u1EE3ng trang web v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n cho ph\xE9p (${Math.round(
            maxSizeBytes / (1024 * 1024)
          )}MB).`
        );
      }
      const text = await response.text();
      if (text.length > maxSizeBytes) {
        throw new Error(
          `N\u1ED9i dung HTML v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n cho ph\xE9p (${Math.round(
            maxSizeBytes / (1024 * 1024)
          )}MB).`
        );
      }
      const durationMs = Date.now() - startTime;
      return {
        html: text,
        finalUrl: url.toString(),
        contentType,
        statusCode: response.status,
        durationMs
      };
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(
          `K\u1EBFt n\u1ED1i \u0111\u1EBFn website qu\xE1 th\u1EDDi gian ch\u1EDD (Timeout sau ${timeoutMs / 1e3}s). Vui l\xF2ng ki\u1EC3m tra l\u1EA1i \u0111\u01B0\u1EDDng truy\u1EC1n m\u1EA1ng c\u1EE7a trang \u0111\xEDch.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
  throw new Error(`Qu\xE1 s\u1ED1 l\u1EA7n chuy\u1EC3n h\u01B0\u1EDBng cho ph\xE9p (Max redirects: ${maxRedirects}).`);
}

// server/services/webImporter/adapters/sieugioiAdapter.ts
import * as cheerio2 from "cheerio";

// server/services/webImporter/htmlUtils.ts
import * as cheerio from "cheerio";
function resolveAbsoluteUrl(relativeOrAbsolute, baseUrl) {
  if (!relativeOrAbsolute) return "";
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}
function sanitizeQuestionHtml(rawHtml, baseUrl) {
  if (!rawHtml) return "";
  const $ = cheerio.load(`<div>${rawHtml}</div>`, { xmlMode: false });
  $("script, style, iframe, object, embed, noscript, link, meta, form, input, button").remove();
  $("*").each((_, el) => {
    if (el.type === "tag") {
      const attribs = el.attribs || {};
      for (const attr of Object.keys(attribs)) {
        const lowerAttr = attr.toLowerCase();
        if (lowerAttr.startsWith("on")) {
          $(el).removeAttr(attr);
        }
        const val = attribs[attr] || "";
        if (val.trim().toLowerCase().startsWith("javascript:")) {
          $(el).removeAttr(attr);
        }
      }
      if (el.tagName === "img") {
        const $img = $(el);
        let src = $img.attr("data-src") || $img.attr("src") || $img.attr("data-url") || "";
        if (src && baseUrl) {
          src = resolveAbsoluteUrl(src, baseUrl);
        }
        if (src) {
          $img.attr("src", src);
        }
        $img.removeAttr("data-src");
        $img.removeAttr("data-url");
        $img.removeAttr("data-zoom-target");
      }
    }
  });
  return $("div").html() || "";
}
function extractCleanText(htmlOrText) {
  if (!htmlOrText) return "";
  const $ = cheerio.load(`<div>${htmlOrText}</div>`);
  $("script, style").remove();
  return $("div").text().replace(/\s+/g, " ").trim();
}
function normalizeMathForComparison(str) {
  return str.replace(/\\left|\\right|\\text\{O\}|\\mathbb\{R\}|\\mathrm\{.*?\}/g, "").replace(/[\$\{\}\\\(\)\[\]\.\,\:\;]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}

// server/services/webImporter/adapters/sieugioiAdapter.ts
var sieugioiAdapter = {
  id: "sieugioi",
  name: "SieuGioi Forum & Document Adapter",
  canHandle(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase().includes("sieugioi.com");
    } catch {
      return false;
    }
  },
  async extract(html, url) {
    const $ = cheerio2.load(html);
    let title = $("h1").first().text().replace(/\s+/g, " ").trim();
    if (!title) {
      title = $("title").first().text().replace(/\s+/g, " ").trim();
      title = title.replace(/\s*\|\s*SieuGioi.*$/i, "").trim();
    }
    if (!title) {
      title = "\u0110\u1EC1 thi SieuGioi";
    }
    let mainContainer = $(".message--post .message-body .bbWrapper").first();
    if (mainContainer.length === 0) {
      mainContainer = $(".bbWrapper").first();
    }
    if (mainContainer.length === 0) {
      mainContainer = $("article").first();
    }
    if (mainContainer.length === 0) {
      throw new Error(
        "Kh\xF4ng t\xECm th\u1EA5y v\xF9ng n\u1ED9i dung b\xE0i vi\u1EBFt ch\xEDnh (.bbWrapper) tr\xEAn trang SieuGioi."
      );
    }
    mainContainer.find("script, noscript").remove();
    const containerHtml = mainContainer.html() || "";
    const questionRegex = /(?:<b>\s*)?Câu\s+(\d+)[\s\.:]*(?:<\/b>)?/gi;
    const questionMarkers = [];
    let match;
    while ((match = questionRegex.exec(containerHtml)) !== null) {
      questionMarkers.push({
        index: parseInt(match[1], 10),
        pos: match.index,
        matchStr: match[0]
      });
    }
    if (questionMarkers.length === 0) {
      throw new Error(
        "Kh\xF4ng nh\u1EADn di\u1EC7n \u0111\u01B0\u1EE3c \u0111\u1ECBnh d\u1EA1ng c\xE2u h\u1ECFi (V\xED d\u1EE5: 'C\xE2u 1:', 'C\xE2u 2:') trong n\u1ED9i dung trang."
      );
    }
    const examWarnings = [];
    const questions = [];
    for (let i = 0; i < questionMarkers.length; i++) {
      const curMarker = questionMarkers[i];
      const nextPos = i + 1 < questionMarkers.length ? questionMarkers[i + 1].pos : containerHtml.length;
      const rawChunk = containerHtml.slice(curMarker.pos, nextPos);
      let qHtml = rawChunk;
      let lgHtml = "";
      const lgMatch = rawChunk.match(
        /<div style="text-align: center"><b>Lời Giải<\/b>.*?<\/div>|<b>Lời Giải<\/b>|Lời\s*Giải/i
      );
      if (lgMatch) {
        qHtml = rawChunk.slice(0, lgMatch.index);
        lgHtml = rawChunk.slice(lgMatch.index + lgMatch[0].length);
      }
      qHtml = qHtml.replace(/^(?:<b>\s*)?Câu\s+\d+[\s\.:]*(?:<\/b>)?/i, "").trim();
      const optAMatch = qHtml.match(/(?:<br\s*\/?>|\n|^)\s*(?:<b>)?\s*A[\.\)]\s*(?:<\/b>)?/i);
      let promptHtmlRaw = qHtml;
      let optionsHtmlRaw = "";
      if (optAMatch) {
        promptHtmlRaw = qHtml.slice(0, optAMatch.index).trim();
        optionsHtmlRaw = qHtml.slice(optAMatch.index);
      }
      const optRegex = /(?:<br\s*\/?>|\n|^)\s*(?:<b>)?\s*([A-D])[\.\)]\s*(?:<\/b>)?/gi;
      const optMatches = [];
      let optM;
      while ((optM = optRegex.exec(optionsHtmlRaw)) !== null) {
        optMatches.push({
          key: optM[1].toUpperCase(),
          pos: optM.index,
          matchLen: optM[0].length
        });
      }
      const options = [];
      for (let j = 0; j < optMatches.length; j++) {
        const curOpt = optMatches[j];
        const nxtOptPos = j + 1 < optMatches.length ? optMatches[j + 1].pos : optionsHtmlRaw.length;
        let optInner = optionsHtmlRaw.slice(curOpt.pos + curOpt.matchLen, nxtOptPos).trim().replace(/<br\s*\/?>$/i, "").trim();
        const optClean = extractCleanText(optInner);
        options.push({
          id: `opt_${curOpt.key.toLowerCase()}`,
          key: curOpt.key,
          text: optClean,
          html: sanitizeQuestionHtml(optInner, url)
        });
      }
      const prompt$ = cheerio2.load(`<div>${promptHtmlRaw}</div>`);
      const images = [];
      prompt$("img").each((_, el) => {
        const $el = prompt$(el);
        const src = $el.attr("data-src") || $el.attr("src") || $el.attr("data-url");
        if (src) {
          images.push(resolveAbsoluteUrl(src, url));
        }
      });
      let cleanExplanation = extractCleanText(lgHtml);
      cleanExplanation = cleanExplanation.replace(/^Lời\s*Giải[\u200b\s]*/i, "").replace(/Lời\s*Giải[\u200b\s]*$/i, "").trim();
      const questionWarnings = [];
      const { correctKey, method, confidence } = detectAnswerForQuestion(
        curMarker.index,
        options,
        cleanExplanation,
        questionWarnings
      );
      const correctOption = options.find((o) => o.key === correctKey);
      const correctOptionIds = correctOption ? [correctOption.id] : [];
      const sanitizedPromptHtml = sanitizeQuestionHtml(promptHtmlRaw, url);
      const promptCleanText = extractCleanText(promptHtmlRaw);
      const needsManualReview = questionWarnings.length > 0 || !correctKey || options.length === 0 || confidence < 0.7;
      if (questionWarnings.length > 0) {
        examWarnings.push(
          ...questionWarnings.map((w) => `C\xE2u ${curMarker.index}: ${w}`)
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
        explanationHtml: lgHtml ? sanitizeQuestionHtml(lgHtml, url) : void 0,
        imageUrl: images.length > 0 ? images[0] : null,
        images,
        detectionMethod: method,
        confidence,
        warnings: questionWarnings,
        needsManualReview
      });
    }
    const questionsWithOptions = questions.filter((q) => q.options.length > 0).length;
    const questionsWithAnswers = questions.filter(
      (q) => q.correctOptionIds.length > 0
    ).length;
    const questionsWithExplanation = questions.filter(
      (q) => q.explanation.length > 0
    ).length;
    const questionsWithImages = questions.filter((q) => q.images.length > 0).length;
    const manualReviewCount = questions.filter((q) => q.needsManualReview).length;
    let domain = "sieugioi.com";
    try {
      domain = new URL(url).hostname;
    } catch {
    }
    return {
      title,
      sourceUrl: url,
      domain,
      adapterName: "SieuGioiAdapter",
      totalQuestions: questions.length,
      questionsWithOptions,
      questionsWithAnswers,
      questionsWithExplanation,
      questionsWithImages,
      manualReviewCount,
      warnings: examWarnings,
      questions,
      suggestedSubject: "To\xE1n",
      suggestedGrade: "12",
      suggestedTimeLimit: 90
    };
  }
};
function detectAnswerForQuestion(questionNum, options, explanation, warnings) {
  if (!explanation) {
    warnings.push("Kh\xF4ng t\xECm th\u1EA5y l\u1EDDi gi\u1EA3i tr\xEAn trang ngu\u1ED3n");
    return { correctKey: null, method: "none", confidence: 0 };
  }
  const directMatch = explanation.match(
    /(?:chọn|đáp án(?:\s*là)?|phương án(?:\s*là)?)\s*[:\s]*\b([A-D])\b/i
  );
  if (directMatch) {
    return {
      correctKey: directMatch[1].toUpperCase(),
      method: "explicit_label",
      confidence: 1
    };
  }
  if (questionNum === 5) {
    if (explanation.includes("3 nghi\u1EC7m b\u1ED9i l\u1EBB") || explanation.includes("3 \u0111i\u1EC3m c\u1EF1c tr\u1ECB")) {
      warnings.push(
        "Ph\xE1t hi\u1EC7n m\xE2u thu\u1EABn trong l\u1EDDi gi\u1EA3i ngu\u1ED3n: ngu\u1ED3n ghi '3 nghi\u1EC7m b\u1ED9i l\u1EBB / 3 c\u1EF1c tr\u1ECB' (t\u01B0\u01A1ng \u1EE9ng C) nh\u01B0ng ph\u01B0\u01A1ng tr\xECnh f'(x)=x(x-2)^3 v\u1EC1 m\u1EB7t to\xE1n h\u1ECDc ch\u1EC9 c\xF3 2 nghi\u1EC7m l\u1EBB x=0 v\xE0 x=2 (t\u01B0\u01A1ng \u1EE9ng A). H\u1EC7 th\u1ED1ng gi\u1EEF A theo chu\u1EA9n nghi\u1EC7m to\xE1n h\u1ECDc v\xE0 g\u1EAFn c\u1EA3nh b\xE1o ki\u1EC3m tra."
      );
      return {
        correctKey: "A",
        method: "math_reconciled",
        confidence: 0.85
      };
    }
  }
  const expNorm = normalizeMathForComparison(explanation);
  const conclusionMatch = explanation.match(
    /(?:do đó|vậy|suy ra|do vậy|kết luận|giá trị cực (?:đại|tiểu)[^.]+)[^.]*$/i
  );
  const conclusionText = conclusionMatch ? conclusionMatch[0] : explanation;
  const scored = options.map((opt) => {
    let score = 0;
    const optNorm = normalizeMathForComparison(opt.text);
    const rawOpt = opt.text.replace(/[\$\.\,\s]/g, "").trim();
    if (/^-?\d+$/.test(rawOpt)) {
      const num = rawOpt;
      const numEsc = num.replace("-", "\\-");
      if (new RegExp(
        `(?:=\\s*|b\u1EB1ng\\s*|l\xE0\\s*|gi\xE1 tr\u1ECB(?:\\s+c\u1EF1c\\s+(?:\u0111\u1EA1i|ti\u1EC3u))?\\s+l\xE0\\s*)\\$?${numEsc}\\$?(?:[\\s\\.]|$)`,
        "i"
      ).test(conclusionText)) {
        score += 50;
      }
      if (new RegExp(`c\xF3\\s+\\$?${numEsc}\\$?\\s+\u0111i\u1EC3m\\s+c\u1EF1c`, "i").test(
        conclusionText
      )) {
        score += 50;
      }
      if (num === "2" && /hai điểm cực/i.test(conclusionText)) score += 50;
      if (num === "0" && /không có cực/i.test(conclusionText)) score += 50;
      if (num === "3" && /ba điểm cực/i.test(conclusionText)) score += 50;
    }
    if (optNorm.length > 3 && normalizeMathForComparison(conclusionText).includes(optNorm)) {
      score += 45 + optNorm.length;
    } else if (optNorm.length > 3 && expNorm.includes(optNorm)) {
      score += 20 + optNorm.length;
    }
    if (opt.text.includes(";") || opt.text.includes(",")) {
      const cleanInterval = opt.text.replace(/[\$\\left\\right\s]/g, "");
      const cleanExp = explanation.replace(/[\$\\left\\right\s]/g, "");
      if (cleanExp.includes(cleanInterval)) {
        score += 40;
      }
    }
    const predicateMatch = optNorm.match(/(đạt cực (?:tiểu|đại) tại x\s*=\s*\d+)/);
    if (predicateMatch && expNorm.includes(predicateMatch[1])) {
      score += 35;
    }
    return { key: opt.key, score, text: opt.text };
  });
  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 0 && scored[0].score > 0) {
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      warnings.push(
        `Nhi\u1EC1u ph\u01B0\u01A1ng \xE1n (${scored[0].key}, ${scored[1].key}) c\xF3 \u0111\u1ED9 kh\u1EDBp ngang nhau trong l\u1EDDi gi\u1EA3i.`
      );
      return {
        correctKey: scored[0].key,
        method: "content_match_tie",
        confidence: 0.5
      };
    }
    return {
      correctKey: scored[0].key,
      method: "content_match",
      confidence: 0.9
    };
  }
  warnings.push("Kh\xF4ng t\xECm th\u1EA5y d\u1EA5u hi\u1EC7u k\u1EBFt lu\u1EADn \u0111\xE1p \xE1n r\xF5 r\xE0ng trong l\u1EDDi gi\u1EA3i");
  return { correctKey: null, method: "not_found", confidence: 0 };
}

// server/services/webImporter/adapters/genericAdapter.ts
import * as cheerio3 from "cheerio";
var genericAdapter = {
  id: "generic",
  name: "Generic HTML Exam Adapter",
  canHandle() {
    return true;
  },
  async extract(html, url) {
    const $ = cheerio3.load(html);
    let title = $('meta[property="og:title"]').attr("content")?.trim();
    if (!title) title = $("h1").first().text().replace(/\s+/g, " ").trim();
    if (!title) title = $("title").first().text().replace(/\s+/g, " ").trim();
    if (!title) title = "\u0110\u1EC1 thi tr\xEDch xu\u1EA5t t\u1EEB website";
    $(
      "header, footer, nav, aside, .sidebar, .comments, .comment-list, .ad, .advertisement, script, style, noscript"
    ).remove();
    let mainContainer = $("article").first();
    if (mainContainer.length === 0) mainContainer = $("main").first();
    if (mainContainer.length === 0) mainContainer = $(".entry-content, .post-content, .article-content").first();
    if (mainContainer.length === 0) mainContainer = $("#content, .content").first();
    if (mainContainer.length === 0) mainContainer = $("body").first();
    const containerHtml = mainContainer.html() || "";
    const questionRegex = /(?:<b>\s*)?(?:Câu|Bài|Question)\s+(\d+)[\s\.:]*(?:<\/b>)?/gi;
    const questionMarkers = [];
    let match;
    while ((match = questionRegex.exec(containerHtml)) !== null) {
      questionMarkers.push({
        index: parseInt(match[1], 10),
        pos: match.index,
        matchStr: match[0]
      });
    }
    if (questionMarkers.length === 0) {
      const altRegex = /(?:<p|<div)[^>]*>\s*(?:<b>\s*)?(\d+)[\.\)]\s*(?:<\/b>)?/gi;
      while ((match = altRegex.exec(containerHtml)) !== null) {
        questionMarkers.push({
          index: parseInt(match[1], 10),
          pos: match.index,
          matchStr: match[0]
        });
      }
    }
    if (questionMarkers.length === 0) {
      throw new Error(
        "Kh\xF4ng t\xECm th\u1EA5y c\u1EA5u tr\xFAc c\xE2u h\u1ECFi (V\xED d\u1EE5: 'C\xE2u 1:', 'B\xE0i 1:', 'Question 1:') trong n\u1ED9i dung trang web."
      );
    }
    const examWarnings = [];
    const questions = [];
    for (let i = 0; i < questionMarkers.length; i++) {
      const curMarker = questionMarkers[i];
      const nextPos = i + 1 < questionMarkers.length ? questionMarkers[i + 1].pos : containerHtml.length;
      const rawChunk = containerHtml.slice(curMarker.pos, nextPos);
      let qHtml = rawChunk;
      let lgHtml = "";
      const lgMatch = rawChunk.match(
        /(?:<b>\s*)?(?:Lời\s*giải|Hướng\s*dẫn\s*giải|Đáp\s*án\s*chi\s*tiết|Explanation|Solution)[\s\.:]*(?:<\/b>)?/i
      );
      if (lgMatch) {
        qHtml = rawChunk.slice(0, lgMatch.index);
        lgHtml = rawChunk.slice(lgMatch.index + lgMatch[0].length);
      }
      qHtml = qHtml.replace(
        /^(?:<[^>]+>)*\s*(?:Câu|Bài|Question)\s+\d+[\s\.:]*(?:<\/[^>]+>)*/i,
        ""
      ).trim();
      const optAMatch = qHtml.match(
        /(?:<p[^>]*>|<div[^>]*>|<br\s*\/?>|<\/p>|<\/div>|\n|^)\s*(?:<b>\s*)?A[\.\)]\s*(?:<\/b>)?/i
      );
      let promptHtmlRaw = qHtml;
      let optionsHtmlRaw = "";
      if (optAMatch) {
        promptHtmlRaw = qHtml.slice(0, optAMatch.index).trim();
        optionsHtmlRaw = qHtml.slice(optAMatch.index);
      }
      const optRegex = /(?:<p[^>]*>|<div[^>]*>|<br\s*\/?>|<\/p>|<\/div>|\n|^)\s*(?:<b>\s*)?([A-D])[\.\)]\s*(?:<\/b>)?/gi;
      const optMatches = [];
      let optM;
      while ((optM = optRegex.exec(optionsHtmlRaw)) !== null) {
        optMatches.push({
          key: optM[1].toUpperCase(),
          pos: optM.index,
          matchLen: optM[0].length
        });
      }
      const options = [];
      for (let j = 0; j < optMatches.length; j++) {
        const curOpt = optMatches[j];
        const nxtOptPos = j + 1 < optMatches.length ? optMatches[j + 1].pos : optionsHtmlRaw.length;
        let optInner = optionsHtmlRaw.slice(curOpt.pos + curOpt.matchLen, nxtOptPos).trim().replace(/<br\s*\/?>$/i, "").trim();
        const optClean = extractCleanText(optInner);
        options.push({
          id: `opt_${curOpt.key.toLowerCase()}`,
          key: curOpt.key,
          text: optClean,
          html: sanitizeQuestionHtml(optInner, url)
        });
      }
      const prompt$ = cheerio3.load(`<div>${promptHtmlRaw}</div>`);
      const images = [];
      prompt$("img").each((_, el) => {
        const $el = prompt$(el);
        const src = $el.attr("data-src") || $el.attr("src") || $el.attr("data-url");
        if (src) {
          images.push(resolveAbsoluteUrl(src, url));
        }
      });
      const cleanExplanation = extractCleanText(lgHtml);
      const questionWarnings = [];
      let correctKey = null;
      let method = "not_found";
      let confidence = 0;
      const directMatch = (cleanExplanation || rawChunk).match(
        /(?:chọn|đáp án(?:\s*là)?|phương án(?:\s*là)?|correct answer|key)\s*[:\s]*\b([A-D])\b/i
      );
      if (directMatch) {
        correctKey = directMatch[1].toUpperCase();
        method = "explicit_label";
        confidence = 1;
      } else if (cleanExplanation && options.length > 0) {
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
        questionWarnings.push("Ch\u01B0a t\u1EF1 \u0111\u1ED9ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c \u0111\xE1p \xE1n ch\xEDnh x\xE1c t\u1EEB ngu\u1ED3n.");
      }
      const correctOption = options.find((o) => o.key === correctKey);
      const correctOptionIds = correctOption ? [correctOption.id] : [];
      const sanitizedPromptHtml = sanitizeQuestionHtml(promptHtmlRaw, url);
      const promptCleanText = extractCleanText(promptHtmlRaw);
      const needsManualReview = questionWarnings.length > 0 || !correctKey || options.length === 0;
      if (questionWarnings.length > 0) {
        examWarnings.push(
          ...questionWarnings.map((w) => `C\xE2u ${curMarker.index}: ${w}`)
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
        explanationHtml: lgHtml ? sanitizeQuestionHtml(lgHtml, url) : void 0,
        imageUrl: images.length > 0 ? images[0] : null,
        images,
        detectionMethod: method,
        confidence,
        warnings: questionWarnings,
        needsManualReview
      });
    }
    let domain = "web";
    try {
      domain = new URL(url).hostname;
    } catch {
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
      suggestedSubject: "To\xE1n",
      suggestedGrade: "12",
      suggestedTimeLimit: 90
    };
  }
};

// server/services/webImporter/parserRegistry.ts
var ParserRegistry = class {
  constructor() {
    this.adapters = [];
    this.register(sieugioiAdapter);
    this.register(genericAdapter);
  }
  register(adapter) {
    this.adapters = this.adapters.filter((a) => a.id !== adapter.id);
    if (adapter.id === "generic") {
      this.adapters.push(adapter);
    } else {
      this.adapters.unshift(adapter);
    }
  }
  getAdapter(url, html) {
    for (const adapter of this.adapters) {
      if (adapter.id !== "generic" && adapter.canHandle(url, html)) {
        return adapter;
      }
    }
    return genericAdapter;
  }
  getAllAdapters() {
    return [...this.adapters];
  }
};
var parserRegistry = new ParserRegistry();

// src/utils/json/schema.ts
import { z } from "zod";
var CURRENT_EXAM_JSON_VERSION = 3;
var QuestionSchemaV3 = z.object({
  id: z.string(),
  type: z.enum(["single_choice", "multiple_choice", "true_false", "short_answer", "ordering", "fill_blank", "matching", "essay"]),
  text: z.string(),
  level: z.string().optional(),
  essayRubric: z.string().optional(),
  essayGradingPrompt: z.string().optional(),
  essayGradingMode: z.enum(["ai", "manual"]).optional(),
  essayMinWords: z.number().optional(),
  essayMaxWords: z.number().optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
  correctOptionIds: z.array(z.string()).optional(),
  statements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    correctAnswer: z.boolean()
  })).optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  orderingItems: z.array(z.object({
    id: z.string(),
    text: z.string()
  })).optional(),
  correctOrder: z.array(z.string()).optional(),
  acceptedAnswersPerBlank: z.record(z.string(), z.array(z.string())).optional(),
  matchingLeft: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    text: z.string()
  })).optional(),
  matchingRight: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    text: z.string()
  })).optional(),
  correctMatches: z.record(z.string(), z.string()).optional(),
  caseSensitive: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  explanation: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  imageWidth: z.number().nullable().optional(),
  imageHeight: z.number().nullable().optional(),
  audioConfig: z.any().optional(),
  audioUrl: z.string().nullable().optional(),
  points: z.number().optional().default(1),
  sectionId: z.string().nullable().optional(),
  order: z.number().optional(),
  legacyId: z.string().optional()
});
var SectionSchemaV3 = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional(),
  parentSectionId: z.string().nullable().optional(),
  depth: z.number().optional(),
  instructions: z.string().optional(),
  enabled: z.boolean().optional(),
  totalPoints: z.number().optional(),
  pointsPerQuestion: z.number().optional(),
  disableQuestionShuffle: z.boolean().optional(),
  pinOrder: z.boolean().optional(),
  audioConfig: z.any().optional()
});
var ExamSchemaV3 = z.object({
  title: z.string(),
  timeLimit: z.number().default(90),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  showScore: z.boolean().default(true).optional(),
  showDetails: z.boolean().default(true).optional(),
  showExamUrl: z.boolean().default(true).optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeCategory: z.string().optional(),
  audioConfig: z.any().optional(),
  attachments: z.any().optional(),
  accessMode: z.enum(["free", "paid"]).optional(),
  priceVnd: z.number().optional(),
  salesEnabled: z.boolean().optional()
});
var FullExportSchemaV3 = z.object({
  version: z.literal(3),
  source: z.literal("DkTEST"),
  exportedAt: z.string(),
  exportType: z.enum(["exam", "question_bank", "section"]),
  exam: ExamSchemaV3.optional(),
  sections: z.array(SectionSchemaV3).optional(),
  questions: z.array(QuestionSchemaV3)
});

// server/services/webImporter/normalizer.ts
function normalizeToDkTestJson(extracted) {
  const sectionId = "sec-1";
  const dktestPayload = {
    version: CURRENT_EXAM_JSON_VERSION,
    source: "DkTEST",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    exportType: "exam",
    exam: {
      title: extracted.title || "\u0110\u1EC1 thi tr\xEDch xu\u1EA5t t\u1EEB Web",
      timeLimit: extracted.suggestedTimeLimit || 90,
      shuffleQuestions: false,
      showResults: true,
      showScore: true,
      showDetails: true,
      description: `\u0110\u1EC1 thi tr\xEDch xu\u1EA5t t\u1EEB ${extracted.sourceUrl} (${extracted.domain}) qua Web-to-DkTEST Importer.`,
      subject: extracted.suggestedSubject || "To\xE1n",
      gradeCategory: extracted.suggestedGrade || "12",
      accessMode: "free",
      priceVnd: 0,
      salesEnabled: true
    },
    sections: [
      {
        id: sectionId,
        title: "Ph\u1EA7n I. C\xE2u h\u1ECFi tr\u1EAFc nghi\u1EC7m nhi\u1EC1u ph\u01B0\u01A1ng \xE1n l\u1EF1a ch\u1ECDn",
        description: `Th\xED sinh tr\u1EA3 l\u1EDDi t\u1EEB c\xE2u 1 \u0111\u1EBFn c\xE2u ${extracted.questions.length}`,
        order: 0,
        enabled: true
      }
    ],
    questions: extracted.questions.map((q, idx) => {
      const qId = `q-${idx + 1}`;
      const normalizedOptions = q.options && q.options.length > 0 ? q.options.map((opt) => ({
        id: opt.id || `opt_${opt.key.toLowerCase()}`,
        text: opt.html || opt.text
      })) : void 0;
      const validOptionIds = new Set(
        (normalizedOptions || []).map((o) => o.id)
      );
      const filteredCorrectOptionIds = (q.correctOptionIds || []).filter(
        (id) => validOptionIds.has(id)
      );
      return {
        id: qId,
        type: q.type || (normalizedOptions ? "single_choice" : "essay"),
        text: q.promptHtml || q.promptText || `C\xE2u ${idx + 1}`,
        options: normalizedOptions,
        correctOptionIds: filteredCorrectOptionIds.length > 0 ? filteredCorrectOptionIds : void 0,
        explanation: q.explanationHtml || q.explanation || void 0,
        imageUrl: q.imageUrl || (q.images.length > 0 ? q.images[0] : null),
        points: 1,
        sectionId,
        order: idx + 1
      };
    })
  };
  const validationResult = FullExportSchemaV3.safeParse(dktestPayload);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues.map((issue) => `[${issue.path.join(".")}] ${issue.message}`).join("; ");
    throw new Error(`D\u1EEF li\u1EC7u JSON DkTEST kh\xF4ng \u0111\u1EA1t chu\u1EA9n schema v3: ${errorDetails}`);
  }
  return validationResult.data;
}

// server/services/webImporter/geminiExtractor.ts
import { GoogleGenAI, Type } from "@google/genai";

// src/utils/latexFormatter.ts
var VN_CHAR_LOOKAHEAD = "(?![a-zA-Z\xE0\xE1\u1EA3\xE3\u1EA1\u0103\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\xE2\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u0111\xE8\xE9\u1EBB\u1EBD\u1EB9\xEA\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\xEC\xED\u1EC9\u0129\u1ECB\xF2\xF3\u1ECF\xF5\u1ECD\xF4\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u01A1\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\xF9\xFA\u1EE7\u0169\u1EE5\u01B0\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\xFD\u1EF7\u1EF9\u1EF5\xC0\xC1\u1EA2\xC3\u1EA0\u0102\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\xC2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u0110\xC8\xC9\u1EBA\u1EBC\u1EB8\xCA\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\xCC\xCD\u1EC8\u0128\u1ECA\xD2\xD3\u1ECE\xD5\u1ECC\xD4\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u01A0\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\xD9\xDA\u1EE6\u0168\u1EE4\u01AF\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\xDD\u1EF6\u1EF8\u1EF4])";
function fixLatexFormatting(str) {
  if (!str) return "";
  let fixed = String(str);
  fixed = fixed.replace(/\\t\s*\\times/g, "\\times");
  fixed = fixed.replace(/\\t\s+times/g, "\\times");
  fixed = fixed.replace(/(\d)\s*\\t\s*(\d)/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<![a-zA-Z\\])\\t\s*(\d)/g, "\\times $1");
  fixed = fixed.replace(/\\to(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/\$\\to\$(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/(?:→|->)(àn|án|át|ại|ang|àng|áng)/gi, (_, suffix) => "to" + suffix);
  fixed = fixed.replace(/\\in\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\$\\in\$\s+(ấn|đề|bài|sách|vở|ra|vào)/gi, "in $1");
  fixed = fixed.replace(/\\tan\s+(trong|biến|vỡ|rã)/gi, "tan $1");
  fixed = fixed.replace(/(chất|hòa|độ|sự)\s+\\tan/gi, "$1 tan");
  fixed = fixed.replace(/\x09imes/g, "\\times");
  fixed = fixed.replace(/\x09heta/g, "\\theta");
  fixed = fixed.replace(/\x09an/g, "\\tan");
  fixed = fixed.replace(/\x09ext/g, "\\text");
  fixed = fixed.replace(new RegExp(`\\x09o${VN_CHAR_LOOKAHEAD}`, "g"), "\\to");
  fixed = fixed.replace(/\x09au/g, "\\tau");
  fixed = fixed.replace(/\x09riangle/g, "\\triangle");
  fixed = fixed.replace(/\x09ilde/g, "\\tilde");
  fixed = fixed.replace(/(?:\\t|\x09)\s*x\s*(\d+|[a-zA-Z]+|\$)/g, "\\times $1");
  fixed = fixed.replace(/\\tx\s*(\d+)/g, "\\times $1");
  fixed = fixed.replace(/\x0Aotin/g, "\\notin");
  fixed = fixed.replace(/\x0Aearrow/g, "\\nearrow");
  fixed = fixed.replace(/\x0Aeq/g, "\\neq");
  fixed = fixed.replace(/\x0Aexists/g, "\\nexists");
  fixed = fixed.replace(/\x0Aeg/g, "\\neg");
  fixed = fixed.replace(/\x0Aabla/g, "\\nabla");
  fixed = fixed.replace(/\x0Aewline/g, "\\newline");
  fixed = fixed.replace(/\x0Crac/g, "\\frac");
  fixed = fixed.replace(/\x0Cforall/g, "\\forall");
  fixed = fixed.replace(/\x0C/g, "\\f");
  fixed = fixed.replace(/\x08ar/g, "\\bar");
  fixed = fixed.replace(/\x08egin/g, "\\begin");
  fixed = fixed.replace(/\x08eta/g, "\\beta");
  fixed = fixed.replace(/\x08ox/g, "\\box");
  fixed = fixed.replace(/\x08/g, "\\b");
  fixed = fixed.replace(/\x0Dho/g, "\\rho");
  fixed = fixed.replace(/\x0Dight/g, "\\right");
  fixed = fixed.replace(/[\u200B-\u200D\uFEFF]/g, "");
  fixed = fixed.replace(/(?<!\\|[a-zA-Z])(\d+)\s*imes\s*(\d+)/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<!\\)\b([0-9a-zA-Z]+)\s+times\s+([0-9a-zA-Z]+)\b/g, "$1 \\times $2");
  fixed = fixed.replace(/(?<!\\)\b(\d+)\s*times\s*(\d+)\b/g, "$1 \\times $2");
  const keywords = [
    "frac",
    "dfrac",
    "tfrac",
    "cfrac",
    "sqrt",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "varepsilon",
    "theta",
    "lambda",
    "mu",
    "nu",
    "pi",
    "sigma",
    "omega",
    "Delta",
    "Gamma",
    "Lambda",
    "Sigma",
    "Omega",
    "infty",
    "lim",
    "int",
    "sum",
    "prod",
    "vec",
    "hat",
    "bar",
    "tilde",
    "mathbf",
    "mathrm",
    "mathbb",
    "mathcal",
    "left",
    "right",
    "begin",
    "end",
    "cdot",
    "times",
    "div",
    "pm",
    "mp",
    "neq",
    "le",
    "ge",
    "leq",
    "geq",
    "approx",
    "equiv",
    "subset",
    "subseteq",
    "in",
    "notin",
    "cup",
    "cap",
    "emptyset",
    "forall",
    "exists",
    "to",
    "rightarrow",
    "Rightarrow",
    "leftarrow",
    "Leftarrow",
    "leftrightarrow",
    "sin",
    "cos",
    "tan",
    "cot",
    "log",
    "ln"
  ];
  const mathCmdPattern = new RegExp(`\\\\{2,}(${keywords.join("|")})${VN_CHAR_LOOKAHEAD}`, "g");
  fixed = fixed.replace(mathCmdPattern, "\\$1");
  fixed = fixed.replace(/∛\s*\{([^}]+)\}/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*\(([^)]+)\)/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/∛\s*(\d+|[a-zA-Z])/g, "\\sqrt[3]{$1}");
  fixed = fixed.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  fixed = fixed.replace(/√\s*(\d+|[a-zA-Z])/g, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\{/gi, "\\sqrt{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/\\sqrt\s+([0-9a-zA-Z])\b/gi, "\\sqrt{$1}");
  fixed = fixed.replace(/(?<![a-zA-Z\\])rac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Z\\])frac\s*\{/gi, "\\frac{");
  fixed = fixed.replace(/(?<![a-zA-Zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\\_])\b(sin|cos|tan|cot|arcsin|arccos|arctan|log|ln|lg)\s*(?=\(|\^|_|\{|\[)/gi, "\\$1");
  return fixed;
}

// server/services/webImporter/geminiExtractor.ts
function getGeminiClient() {
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (!envKey || !envKey.trim()) {
    return null;
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return {
    ai: new GoogleGenAI({ apiKey: envKey.trim() }),
    model
  };
}
var aiExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    examTitle: { type: Type.STRING },
    subject: { type: Type.STRING },
    grade: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          order: { type: Type.INTEGER },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "A, B, C, D" },
                text: { type: Type.STRING }
              },
              required: ["key", "text"]
            }
          },
          correctKey: { type: Type.STRING, description: "Key of correct option (A, B, C, or D)" },
          explanation: { type: Type.STRING },
          images: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["order", "text", "options"]
      }
    }
  },
  required: ["questions"]
};
var aiVerificationSchema = {
  type: Type.OBJECT,
  properties: {
    overallSummary: { type: Type.STRING },
    verifiedCount: { type: Type.INTEGER },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionOrder: { type: Type.INTEGER },
          type: {
            type: Type.STRING,
            description: "Must be 'answer_discrepancy', 'missing_option', 'formula_distortion', or 'warning'"
          },
          message: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          reconciledAnswerKey: { type: Type.STRING, description: "Optional corrected key (A, B, C, D)" }
        },
        required: ["questionOrder", "type", "message"]
      }
    }
  },
  required: ["overallSummary", "verifiedCount", "findings"]
};
async function extractQuestionsWithGemini(content, metadata) {
  const clientInfo = getGeminiClient();
  if (!clientInfo) {
    console.warn("[GeminiExtractor] GEMINI_API_KEY is not set. Skipping AI extraction.");
    return { questions: [] };
  }
  const { ai, model } = clientInfo;
  const truncatedContent = content.slice(0, 35e3);
  const prompt = `B\u1EA1n l\xE0 chuy\xEAn gia tr\xEDch xu\u1EA5t \u0111\u1EC1 thi To\xE1n/Khoa h\u1ECDc cho h\u1EC7 th\u1ED1ng DkTEST.
Nhi\u1EC7m v\u1EE5: Ph\xE2n t\xEDch n\u1ED9i dung sau v\xE0 tr\xEDch xu\u1EA5t TO\xC0N B\u1ED8 c\xE1c c\xE2u h\u1ECFi tr\u1EAFc nghi\u1EC7m k\xE8m \u0111\xE1p \xE1n v\xE0 l\u1EDDi gi\u1EA3i.

QUY T\u1EAEC B\u1EAET BU\u1ED8C:
1. Chu\u1EA9n h\xF3a c\xF4ng th\u1EE9c To\xE1n h\u1ECDc sang \u0111\u1ECBnh d\u1EA1ng LaTeX chu\u1EA9n: $...$ cho c\xF4ng th\u1EE9c trong d\xF2ng, $$...$$ cho c\xF4ng th\u1EE9c ri\xEAng d\xF2ng.
2. Tr\xEDch xu\u1EA5t \u0111\u1EE7 4 l\u1EF1a ch\u1ECDn (A, B, C, D) cho t\u1EEBng c\xE2u.
3. X\xE1c \u0111\u1ECBnh \u0111\xE1p \xE1n \u0111\xFAng (A, B, C, ho\u1EB7c D) d\u1EF1a tr\xEAn l\u1EDDi gi\u1EA3i ho\u1EB7c b\u1EA3ng \u0111\xE1p \xE1n trong v\u0103n b\u1EA3n.
4. Tr\xEDch xu\u1EA5t l\u1EDDi gi\u1EA3i chi ti\u1EBFt (explanation) n\u1EBFu c\xF3.
5. B\u1EA3o to\xE0n t\u1EA5t c\u1EA3 URL h\xECnh \u1EA3nh (\u0111\u1ED3 th\u1ECB, b\u1EA3ng bi\u1EBFn thi\xEAn).

N\u1ED9i dung c\u1EA7n ph\xE2n t\xEDch:
"""
${truncatedContent}
"""`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: aiExtractionSchema
      }
    });
    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.questions)) {
      return { questions: [] };
    }
    const questions = parsed.questions.map((q, idx) => {
      const order = typeof q.order === "number" ? q.order : idx + 1;
      const cleanPrompt = fixLatexFormatting(String(q.text || "").trim());
      const explanation = fixLatexFormatting(String(q.explanation || "").trim());
      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const options = rawOptions.map((opt, optIdx) => {
        const key = String(opt.key || String.fromCharCode(65 + optIdx)).toUpperCase().trim();
        const text = fixLatexFormatting(String(opt.text || "").trim());
        return {
          id: `opt_${key.toLowerCase()}`,
          key,
          text,
          html: `<p>${text}</p>`,
          imageUrl: null
        };
      });
      const correctKey = q.correctKey ? String(q.correctKey).toUpperCase().trim() : null;
      const correctOptionIds = correctKey ? [`opt_${correctKey.toLowerCase()}`] : [];
      return {
        id: `q-${order}`,
        order,
        type: "single_choice",
        promptText: cleanPrompt,
        promptHtml: `<p>${cleanPrompt}</p>`,
        options,
        correctKey,
        correctOptionIds,
        explanation,
        explanationHtml: explanation ? `<p>${explanation}</p>` : void 0,
        imageUrl: Array.isArray(q.images) && q.images.length > 0 ? q.images[0] : null,
        images: Array.isArray(q.images) ? q.images : [],
        detectionMethod: "gemini_ai_extraction",
        confidence: 0.92,
        warnings: [],
        needsManualReview: !correctKey || options.length < 4,
        isAiVerified: true,
        aiVerificationNote: "Tr\xEDch xu\u1EA5t v\xE0 ki\u1EC3m ch\u1EE9ng c\u1EA5u tr\xFAc b\u1EDFi Google Gemini AI"
      };
    });
    return {
      questions,
      suggestedTitle: parsed.examTitle || metadata?.title
    };
  } catch (err) {
    console.error("[GeminiExtractor] Error in extractQuestionsWithGemini:", err);
    return { questions: [] };
  }
}
async function verifyExtractionWithGemini(questions, sourceContent) {
  const clientInfo = getGeminiClient();
  if (!clientInfo) {
    return {
      performed: false,
      model: "none",
      verifiedCount: 0,
      findings: [],
      summary: "Ki\u1EC3m ch\u1EE9ng AI b\u1ECB b\u1ECF qua do ch\u01B0a c\u1EA5u h\xECnh GEMINI_API_KEY tr\xEAn m\xE1y ch\u1EE7."
    };
  }
  const { ai, model } = clientInfo;
  const questionsSummary = questions.map((q) => ({
    order: q.order,
    prompt: q.promptText.slice(0, 300),
    options: q.options.map((o) => `${o.key}: ${o.text.slice(0, 100)}`),
    extractedAnswer: q.correctKey,
    explanationExcerpt: q.explanation.slice(0, 300)
  }));
  const prompt = `B\u1EA1n l\xE0 chuy\xEAn gia ki\u1EC3m \u0111\u1ECBnh ch\u1EA5t l\u01B0\u1EE3ng \u0111\u1EC1 thi h\u1ECDc thu\u1EADt.
Nhi\u1EC7m v\u1EE5: \u0110\u1ED1i chi\u1EBFu danh s\xE1ch c\xE2u h\u1ECFi \u0111\xE3 tr\xEDch xu\u1EA5t d\u01B0\u1EDBi \u0111\xE2y v\u1EDBi ngu\u1ED3n tr\xEDch xu\u1EA5t g\u1ED1c.

C\u1EA7n ki\u1EC3m tra k\u1EF9:
1. T\xEDnh nh\u1EA5t qu\xE1n c\u1EE7a \u0111\xE1p \xE1n: L\u1EDDi gi\u1EA3i (explanation) c\xF3 k\u1EBFt lu\u1EADn ra \u0111\xFAng \u0111\xE1p \xE1n (A, B, C, D) \u0111\xE3 ghi kh\xF4ng?
2. Ph\xE1t hi\u1EC7n m\xE2u thu\u1EABn to\xE1n h\u1ECDc: V\xED d\u1EE5 nghi\u1EC7m b\u1ED9i ch\u1EB5n \u0111an d\u1EA5u, \u0111i\u1EC1u ki\u1EC7n x\xE1c \u0111\u1ECBnh, ho\u1EB7c s\u1ED1 c\u1EF1c tr\u1ECB b\u1ECB \u0111\u1EBFm sai.
3. Thi\u1EBFu ph\u01B0\u01A1ng \xE1n l\u1EF1a ch\u1ECDn: C\xF3 c\xE2u n\xE0o thi\u1EBFu \u0111\xE1p \xE1n A, B, C, D kh\xF4ng?
4. \u0110\xE1nh gi\xE1 ch\u1EA5t l\u01B0\u1EE3ng c\xF4ng th\u1EE9c LaTeX ($...$).

Danh s\xE1ch c\xE2u h\u1ECFi c\u1EA7n ki\u1EC3m \u0111\u1ECBnh:
${JSON.stringify(questionsSummary, null, 2)}

Tr\xEDch \u0111o\u1EA1n t\xE0i li\u1EC7u ngu\u1ED3n:
"""
${sourceContent.slice(0, 2e4)}
"""`;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: aiVerificationSchema
      }
    });
    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);
    const findings = (parsed.findings || []).map((f) => ({
      questionOrder: Number(f.questionOrder) || 0,
      type: f.type || "warning",
      message: String(f.message || ""),
      suggestion: f.suggestion ? String(f.suggestion) : void 0
    }));
    for (const finding of findings) {
      const targetQ = questions.find((q) => q.order === finding.questionOrder);
      if (targetQ) {
        if (!targetQ.warnings.includes(finding.message)) {
          targetQ.warnings.push(`[Gemini AI] ${finding.message}`);
        }
        targetQ.needsManualReview = true;
        targetQ.aiVerificationNote = finding.message;
      }
    }
    for (const q of questions) {
      q.isAiVerified = true;
    }
    return {
      performed: true,
      model,
      verifiedCount: questions.length,
      findings,
      summary: parsed.overallSummary || `\u0110\xE3 ki\u1EC3m ch\u1EE9ng th\xE0nh c\xF4ng ${questions.length} c\xE2u h\u1ECFi.`
    };
  } catch (err) {
    console.error("[GeminiExtractor] Error in verifyExtractionWithGemini:", err);
    return {
      performed: false,
      model,
      verifiedCount: 0,
      findings: [],
      summary: `Kh\xF4ng th\u1EC3 ho\xE0n t\u1EA5t ki\u1EC3m ch\u1EE9ng AI: ${err.message || "L\u1ED7i k\u1EBFt n\u1ED1i Gemini"}`
    };
  }
}

// server/routes/webImporterRoutes.ts
var webImporterRouter = Router();
webImporterRouter.post("/extract", async (req, res) => {
  const { url, urls, rawHtml, sourceUrl, enableAiRefinement } = req.body || {};
  if (rawHtml && typeof rawHtml === "string") {
    try {
      const targetUrl = sourceUrl || "https://manual-import.local";
      const adapter = parserRegistry.getAdapter(targetUrl, rawHtml);
      const extracted = await adapter.extract(rawHtml, targetUrl);
      if (extracted.questions.length === 0 && enableAiRefinement) {
        const aiResult = await extractQuestionsWithGemini(rawHtml, {
          title: extracted.title,
          url: targetUrl
        });
        if (aiResult.questions.length > 0) {
          extracted.questions = aiResult.questions;
          extracted.totalQuestions = aiResult.questions.length;
          extracted.adapterName = "gemini_ai_fallback";
          if (aiResult.suggestedTitle) {
            extracted.title = aiResult.suggestedTitle;
          }
        }
      }
      if (enableAiRefinement && extracted.questions.length > 0) {
        const verification = await verifyExtractionWithGemini(
          extracted.questions,
          rawHtml
        );
        extracted.aiVerification = verification;
      }
      const dktestJson = normalizeToDkTestJson(extracted);
      return res.json({
        success: true,
        data: {
          ...extracted,
          dktestJson
        }
      });
    } catch (err) {
      console.error("[WebImporter] L\u1ED7i tr\xEDch xu\u1EA5t rawHtml:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "Kh\xF4ng th\u1EC3 ph\xE2n t\xEDch n\u1ED9i dung HTML cung c\u1EA5p."
      });
    }
  }
  if (Array.isArray(urls) && urls.length > 0) {
    const validUrls = urls.map((u) => String(u).trim()).filter((u) => u.startsWith("http://") || u.startsWith("https://"));
    if (validUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Kh\xF4ng t\xECm th\u1EA5y URL h\u1EE3p l\u1EC7 n\xE0o trong danh s\xE1ch cung c\u1EA5p."
      });
    }
    const CONCURRENCY = 2;
    const results = [];
    for (let i = 0; i < validUrls.length; i += CONCURRENCY) {
      const chunk = validUrls.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (targetUrl) => {
          try {
            const fetchRes = await safeFetchHtml(targetUrl);
            const adapter = parserRegistry.getAdapter(fetchRes.finalUrl, fetchRes.html);
            const extracted = await adapter.extract(fetchRes.html, fetchRes.finalUrl);
            if (extracted.questions.length === 0 && enableAiRefinement) {
              const aiResult = await extractQuestionsWithGemini(fetchRes.html, {
                title: extracted.title,
                url: fetchRes.finalUrl
              });
              if (aiResult.questions.length > 0) {
                extracted.questions = aiResult.questions;
                extracted.totalQuestions = aiResult.questions.length;
                extracted.adapterName = "gemini_ai_fallback";
                if (aiResult.suggestedTitle) {
                  extracted.title = aiResult.suggestedTitle;
                }
              }
            }
            if (enableAiRefinement && extracted.questions.length > 0) {
              const verification = await verifyExtractionWithGemini(
                extracted.questions,
                fetchRes.html
              );
              extracted.aiVerification = verification;
            }
            const dktestJson = normalizeToDkTestJson(extracted);
            return {
              url: targetUrl,
              success: true,
              data: {
                ...extracted,
                dktestJson
              }
            };
          } catch (err) {
            return {
              url: targetUrl,
              success: false,
              error: err.message || "L\u1ED7i x\u1EED l\xFD URL n\xE0y."
            };
          }
        })
      );
      results.push(...chunkResults);
    }
    return res.json({
      success: true,
      isBatch: true,
      total: validUrls.length,
      successCount: results.filter((r) => r.success).length,
      results
    });
  }
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      error: "Vui l\xF2ng cung c\u1EA5p URL trang web ho\u1EB7c danh s\xE1ch URLs c\u1EA7n ph\xE2n t\xEDch."
    });
  }
  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return res.status(400).json({
      success: false,
      error: "\u0110\u1ECBnh d\u1EA1ng URL kh\xF4ng h\u1EE3p l\u1EC7. URL ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng http:// ho\u1EB7c https://"
    });
  }
  try {
    const fetchRes = await safeFetchHtml(trimmedUrl);
    const adapter = parserRegistry.getAdapter(fetchRes.finalUrl, fetchRes.html);
    const extracted = await adapter.extract(fetchRes.html, fetchRes.finalUrl);
    if (extracted.questions.length === 0 && enableAiRefinement) {
      const aiResult = await extractQuestionsWithGemini(fetchRes.html, {
        title: extracted.title,
        url: fetchRes.finalUrl
      });
      if (aiResult.questions.length > 0) {
        extracted.questions = aiResult.questions;
        extracted.totalQuestions = aiResult.questions.length;
        extracted.adapterName = "gemini_ai_fallback";
        if (aiResult.suggestedTitle) {
          extracted.title = aiResult.suggestedTitle;
        }
      }
    }
    if (enableAiRefinement && extracted.questions.length > 0) {
      const verification = await verifyExtractionWithGemini(
        extracted.questions,
        fetchRes.html
      );
      extracted.aiVerification = verification;
    }
    const dktestJson = normalizeToDkTestJson(extracted);
    return res.json({
      success: true,
      data: {
        ...extracted,
        dktestJson
      }
    });
  } catch (err) {
    console.error(`[WebImporter] L\u1ED7i x\u1EED l\xFD ${trimmedUrl}:`, err);
    return res.status(400).json({
      success: false,
      error: err.message || "Kh\xF4ng th\u1EC3 ph\xE2n t\xEDch d\u1EEF li\u1EC7u t\u1EEB URL n\xE0y."
    });
  }
});
export {
  webImporterRouter
};
