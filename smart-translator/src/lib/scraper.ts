export interface ScrapeJob {
  origin: string;
  prefix: string;
  suffix: string;
  search: string;
  hash: string;
}

export function parseUrlPattern(url: string): ScrapeJob | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/^(.*?)(\d+)(\.html?)$/i);
    if (!match) return null;
    return {
      origin: urlObj.origin,
      prefix: match[1],
      suffix: match[3],
      search: urlObj.search,
      hash: urlObj.hash
    };
  } catch {
    return null;
  }
}

export function buildChapterUrl(job: ScrapeJob, pageNumber: number): string {
  const urlObj = new URL(job.origin);
  urlObj.pathname = `${job.prefix}${pageNumber}${job.suffix}`;
  urlObj.search = job.search;
  urlObj.hash = job.hash;
  return urlObj.href;
}

export async function fetchWithCorsProxy(url: string, userProxy: string = ""): Promise<string> {
  const proxies = [
    userProxy ? (userProxy.includes("?") || userProxy.includes("url=") ? `${userProxy}${encodeURIComponent(url)}` : `${userProxy}${url}`) : null,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${url}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://cors.isomorphic-git.org/${url}`,
    `https://thingproxy.freeboard.io/fetch/${url}`,
    url
  ].filter(Boolean) as string[];

  let lastError = null;
  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.text();
      }
      lastError = new Error(`Proxy ${proxyUrl} returned ${res.status}`);
    } catch (e: any) {
      lastError = e;
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}

const CONFIG = {
  minTinyLineLength: 5,
  blockedTagNames: ['script', 'style', 'svg', 'canvas', 'iframe', 'noscript', 'header', 'footer', 'aside', 'nav', 'form'],
  blockedKeywordPatterns: [
    'comment', 'comments', 'reply', 'popup', 'modal', 'share', 'social', 'recommend', 'related',
    'advert', 'ads', 'ad-', 'ad_', 'banner', 'float', 'floating', 'toolbar', 'promo', 'sponsor',
    'footer', 'header', 'breadcrumb', 'sidebar', 'menu', 'nav'
  ],
  boilerplatePatterns: [
    '上一页', '下一页', '首页', '尾页', '目录', '举报', '收藏', '广告', '推荐', '手机版', '电脑版',
    '最新网址', 'QQ群', 'APP下载', 'www.', 'https://', 'http://'
  ],
  chapterTitleRegexes: [
    /^第[0-9零一二三四五六七八九十百千两〇]+[章节卷回集篇部]/i,
    /^chapter\s*\d+/i,
    /^ch\.?\s*\d+/i,
    /^chapter\s*[ivxlcdm]+$/i,
    /^ch\.?\s*[ivxlcdm]+$/i
  ],
  titleSelectors: ['h1', '.bookname', '.chapter-title', '.title', '.chapter-title h1', '.bookname h1', 'h2']
};

const utils = {
  isProbablyTitleLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return CONFIG.chapterTitleRegexes.some((regex) => regex.test(trimmed));
  },
  decodeHtmlEntities(text: string) {
    const ta = document.createElement('textarea');
    ta.innerHTML = text;
    return ta.value;
  },
  normalizeWhitespace(text: string) {
    return String(text)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n[ \t\f\v]+/g, '\n')
      .trim();
  },
  sanitizeTextForDisplay(text: string) {
    return this.normalizeWhitespace(this.decodeHtmlEntities(text));
  },
  isSameText(a: string, b: string) {
    return this.normalizeWhitespace(a) === this.normalizeWhitespace(b);
  }
};

const cleaner = {
  cleanDocument(doc: Document) {
    const clone = doc.cloneNode(true) as Document;
    this.removeUnwantedNodes(clone);
    this.stripAttributes(clone);
    return clone;
  },

  removeUnwantedNodes(rootDoc: Document) {
    CONFIG.blockedTagNames.forEach((tag) => {
      rootDoc.querySelectorAll(tag).forEach((node) => node.remove());
    });

    const allElements = Array.from(rootDoc.querySelectorAll('*'));
    for (const el of allElements) {
      const haystack = `${el.id || ''} ${el.className || ''}`.toLowerCase();
      if (CONFIG.blockedKeywordPatterns.some((kw) => haystack.includes(kw))) {
        if (this.shouldRemoveByKeyword(el)) {
          el.remove();
        }
      }
    }
  },

  shouldRemoveByKeyword(el: Element) {
    const text = (el.textContent || '').trim();
    if (!text) return true;
    const childCount = el.children.length;
    const textLength = text.length;
    if (childCount > 0 && textLength < 200) return true;
    return true;
  },

  stripAttributes(rootDoc: Document) {
    const attrsToKeep = new Set(['href', 'src', 'alt', 'title', 'aria-label', 'class', 'id', 'role']);
    for (const el of Array.from(rootDoc.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) {
        if (!attrsToKeep.has(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
      }
    }
  },

  normalizeLine(line: string) {
    return utils.normalizeWhitespace(utils.decodeHtmlEntities(line)).trim();
  },

  collapseAdjacentDuplicates(lines: string[]) {
    const output: string[] = [];
    for (const line of lines) {
      if (output.length > 0 && line.trim() && utils.isSameText(output[output.length - 1], line)) {
        continue;
      }
      output.push(line);
    }
    return output;
  },

  cleanLines(text: string, chapterTitle = '') {
    const normalized = utils.normalizeWhitespace(utils.decodeHtmlEntities(text));
    const lines = normalized.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
    const filtered: string[] = [];
    let blankStreak = 0;

    for (const rawLine of lines) {
      const line = this.normalizeLine(rawLine);
      if (!line) {
        blankStreak += 1;
        if (blankStreak <= 1) filtered.push('');
        continue;
      }
      blankStreak = 0;

      const lower = line.toLowerCase();
      if (CONFIG.boilerplatePatterns.some((pattern) => lower.includes(pattern.toLowerCase()))) continue;
      if (line.length < CONFIG.minTinyLineLength && !utils.isProbablyTitleLine(line) && line !== chapterTitle) continue;
      filtered.push(line);
    }

    const compacted = this.collapseAdjacentDuplicates(filtered);
    const normalizedOutput: string[] = [];
    for (const line of compacted) {
      if (line === '' && normalizedOutput.length > 0 && normalizedOutput[normalizedOutput.length - 1] === '') continue;
      normalizedOutput.push(line);
    }

    return utils.normalizeWhitespace(normalizedOutput.join('\n')).replace(/\n{3,}/g, '\n\n').trim();
  }
};

const extractor = {
  extractChapterTitle(doc: Document) {
    for (const selector of ['h1', '.chapter-title', '.title', '.bookname', 'h2']) {
      const node = doc.querySelector(selector);
      if (!node) continue;
      const text = utils.sanitizeTextForDisplay(node.textContent || '');
      if (text && utils.isProbablyTitleLine(text)) return text;
    }

    const bodyText = utils.sanitizeTextForDisplay(doc.body?.innerText || '');
    const firstLines = bodyText.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5);
    for (const line of firstLines) {
      if (utils.isProbablyTitleLine(line)) return line;
    }

    const title = utils.sanitizeTextForDisplay(doc.querySelector('title')?.textContent || '');
    const titleParts = title.split(/[-|_]/).map((part) => part.trim()).filter(Boolean);
    for (const part of titleParts) {
      if (utils.isProbablyTitleLine(part)) return part;
    }

    return titleParts[titleParts.length - 1] || title || '';
  },

  selectContentNode(doc: Document) {
    const candidates = this.collectCandidates(doc);
    let best = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const node of candidates) {
      const metrics = this.scoreNode(node);
      if (metrics.score > bestScore) {
        bestScore = metrics.score;
        best = { node, metrics };
      }
    }

    if (!best) {
      return { node: doc.body, metrics: { score: 0 } };
    }
    return best;
  },

  collectCandidates(doc: Document) {
    const selector = ['article', 'main', 'section', 'div', 'td', 'blockquote', 'pre', 'li', 'body'].join(',');
    const nodes = Array.from(doc.querySelectorAll(selector));
    if (nodes.length === 0) return [doc.body].filter(Boolean);
    return nodes.filter((node) => node && node.textContent && node.textContent.trim().length > 0);
  },

  scoreNode(node: Element) {
    const text = utils.sanitizeTextForDisplay(node.textContent || '');
    const textLength = text.length;
    if (textLength < 50) {
      return { score: Number.NEGATIVE_INFINITY };
    }

    const paragraphs = Array.from(node.querySelectorAll('p, blockquote, pre, li'));
    const paragraphCount = paragraphs.length || Math.max(1, text.split('\n').filter((line) => line.trim()).length);
    const averageParagraphLength = paragraphCount ? textLength / paragraphCount : textLength;
    const linkTextLength = Array.from(node.querySelectorAll('a')).reduce((sum, a) => sum + (a.textContent || '').trim().length, 0);
    const linkDensity = textLength > 0 ? linkTextLength / textLength : 0;
    const buttonCount = node.querySelectorAll('button, input, select, textarea').length;
    const interactiveCount = buttonCount + node.querySelectorAll('a').length;
    const buttonDensity = textLength > 0 ? interactiveCount / Math.max(1, textLength / 100) : 0;
    const lineCount = text.split('\n').filter((line) => line.trim()).length;
    const continuousTextBonus = Math.min(lineCount * 18, 160);
    const chapterTitleBonus = utils.isProbablyTitleLine(text.split('\n')[0] || '') ? 120 : 0;
    const menuPenalty = this.keywordPenalty(node, ['menu', 'nav', 'sidebar', 'breadcrumb']);
    const navigationPenalty = this.keywordPenalty(node, ['next', 'prev', 'page', 'chapter', 'index', 'directory']);
    const adPenalty = this.keywordPenalty(node, ['ad', 'ads', 'advert', 'banner', 'sponsor']);
    const depthPenalty = Math.max(0, this.depthFromBody(node) * 4);

    const score =
      textLength +
      paragraphCount * 40 +
      averageParagraphLength * 5 +
      chapterTitleBonus +
      continuousTextBonus -
      linkDensity * 500 -
      buttonDensity * 300 -
      menuPenalty -
      navigationPenalty -
      adPenalty -
      depthPenalty;

    return { score };
  },

  keywordPenalty(node: Element, keywords: string[]) {
    const haystack = `${node.id || ''} ${node.className || ''} ${(node.getAttribute('role') || '')}`.toLowerCase();
    return keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 180 : 0), 0);
  },

  depthFromBody(node: Element) {
    let depth = 0;
    let current: Element | null = node;
    while (current && current.tagName.toLowerCase() !== 'body') {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  },

  extractTextFromNode(node: Element, chapterTitle = '') {
    // In React, innerText isn't always available in standard DOM parser if it's a headless DOM, 
    // but textContent is.
    const rawText = utils.sanitizeTextForDisplay((node as HTMLElement).innerText || node.textContent || '');
    return cleaner.cleanLines(rawText, chapterTitle);
  }
};

export function parseHtmlContent(html: string): { title: string, content: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const cleanedDoc = cleaner.cleanDocument(doc);
  const chapterTitle = extractor.extractChapterTitle(cleanedDoc);
  const selected = extractor.selectContentNode(cleanedDoc);
  const cleanText = extractor.extractTextFromNode(selected.node, chapterTitle);

  return { title: chapterTitle, content: cleanText };
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
