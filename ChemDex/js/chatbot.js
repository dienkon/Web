import { escapeHtml } from "./core.js";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_ENDPOINT,
} from "../data/index.js";

const chatbotResponsesUrl = new URL(
  "../data/chatbot-responses.json",
  import.meta.url,
);
let chatbotResponsesCache = null;

function normalizeQuestion(value = "") {
  return String(value)
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function loadChatbotResponses() {
  if (chatbotResponsesCache) return chatbotResponsesCache;
  try {
    const res = await fetch(chatbotResponsesUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    chatbotResponsesCache = await res.json();
  } catch {
    chatbotResponsesCache = { periodic: [], element: [] };
  }
  return chatbotResponsesCache;
}

function getFallbackText(value, fallback = "Chưa có dữ liệu") {
  return value == null || value === "" ? fallback : String(value);
}

function getElementChatData(el = {}) {
  const apps = Array.isArray(el.applications) ? el.applications : [];
  return {
    number: getFallbackText(el.number),
    symbol: getFallbackText(el.symbol),
    nameVi: getFallbackText(el.nameVi),
    nameEn: getFallbackText(el.general?.englishName || el.nameEn),
    group: getFallbackText(el.general?.group),
    period: getFallbackText(el.general?.period),
    state: getFallbackText(el.general?.state),
    electronConfig: getFallbackText(el.general?.electronConfig),
    oxidation: getFallbackText(el.general?.oxidation),
    protons: getFallbackText(
      el.structure?.protons ?? el.structure?.nucleus?.proton,
    ),
    electrons: getFallbackText(el.structure?.electrons),
    neutrons: getFallbackText(
      el.structure?.neutrons ?? el.structure?.nucleus?.neutron,
    ),
    valenceElectrons: getFallbackText(el.structure?.valenceElectrons),
    occurrenceDescription: getFallbackText(el.occurrence?.description),
    applicationsList: apps.length
      ? apps
          .slice(0, 5)
          .map((app) => `- ${app.title || app.name || app.desc || app}`)
          .join("\n")
      : "- Chưa có dữ liệu ứng dụng trong JSON.",
  };
}

function fillTemplate(template = "", values = {}) {
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) =>
    getFallbackText(values[key]),
  );
}

function formatInlineMarkdown(text = "") {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function formatChatAnswer(text = "") {
  const lines = String(text).split(/\r?\n/);
  const html = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    html.push(
      `<ul class="chat-answer-list">${bullets
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("")}</ul>`,
    );
    bullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      continue;
    }
    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
      continue;
    }
    flushBullets();
    html.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }
  flushBullets();
  return html.join("");
}

function splitEquation(equation = "") {
  const value = String(equation);
  const arrow = value.includes("⇌") ? "⇌" : "→";
  const parts = value.split(arrow);
  return {
    left: parts[0]?.trim() || value,
    arrow,
    right: parts.slice(1).join(arrow).trim(),
  };
}

function renderEquationHtml(equation = "", condition = "") {
  const parts = splitEquation(equation);
  if (!parts.right) {
    return `<div class="chat-equation-text">${escapeHtml(equation)}</div>`;
  }

  return `
    <div class="chat-equation">
      <span class="chat-equation-side">${escapeHtml(parts.left)}</span>
      <span class="chat-equation-arrow">
        <span class="chat-equation-condition">${escapeHtml(condition || "")}</span>
        <span class="chat-equation-line">${escapeHtml(parts.arrow)}</span>
      </span>
      <span class="chat-equation-side">${escapeHtml(parts.right)}</span>
    </div>
  `;
}

function buildReactionsAnswer(el = {}) {
  const reactions = Array.isArray(el.reactions) ? el.reactions : [];
  const title = `Các phương trình quen thuộc của ${el.nameVi || el.symbol || "nguyên tố này"}`;

  if (!reactions.length) {
    const text = `${title}\n\nChưa có dữ liệu phương trình trong JSON của ${el.nameVi || el.symbol || "nguyên tố này"}.`;
    return {
      text,
      html: formatChatAnswer(`**${text}**`),
    };
  }

  const intro = `${title}\n\nDưới đây là các phản ứng của ${el.symbol || el.nameVi}.`;
  const text = [
    intro,
    ...reactions.map((reaction, index) => {
      const condition = reaction.condition ? ` (${reaction.condition})` : "";
      return `${index + 1}. ${reaction.type || "Phản ứng"}: ${reaction.equation}${condition}`;
    }),
  ].join("\n");

  const cards = reactions
    .map(
      (reaction, index) => `
        <article class="chat-reaction-card">
          <div class="chat-reaction-head">
            <span class="chat-reaction-index">${index + 1}</span>
            <span class="chat-reaction-title">${escapeHtml(reaction.type || "Phản ứng")}</span>
          </div>
          ${renderEquationHtml(reaction.equation || "", reaction.condition || "")}
          ${
            reaction.desc
              ? `<p class="chat-reaction-desc">${escapeHtml(reaction.desc)}</p>`
              : ""
          }
        </article>
      `,
    )
    .join("");

  return {
    text,
    html: `
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>Dưới đây là các phản ứng của ${escapeHtml(el.symbol || el.nameVi || "nguyên tố này")}.</p>
      <div class="chat-reaction-list">${cards}</div>
    `,
  };
}

function appendChatMessage(role, text = "") {
  const output = document.getElementById("chat-messages");
  if (!output) return null;
  const row = document.createElement("div");
  row.className = `chat-message-row ${role === "user" ? "chat-message-user" : "chat-message-bot"}`;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`;
  if (role === "user") {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = formatChatAnswer(text);
  }

  row.appendChild(bubble);
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([bubble]).catch(() => {});
  }
  return bubble;
}

function appendTypingIndicator() {
  const output = document.getElementById("chat-messages");
  if (!output) return null;
  const row = document.createElement("div");
  row.id = "chat-loading";
  row.className = "chat-message-row chat-message-bot";
  row.innerHTML = `
    <div class="chat-bubble chat-bubble-bot chat-typing">
      <span></span><span></span><span></span>
    </div>
  `;
  output.appendChild(row);
  output.scrollTop = output.scrollHeight;
  return row;
}

async function typeChatAnswer(answer = "") {
  const bubble = appendChatMessage("bot", "");
  const output = document.getElementById("chat-messages");
  if (!bubble) return;

  const source =
    typeof answer === "string" ? answer : String(answer.text || "");
  const finalHtml =
    typeof answer === "string"
      ? formatChatAnswer(source)
      : answer.html || formatChatAnswer(source);
  let shown = "";
  for (let i = 0; i < source.length; i += 1) {
    shown += source[i];
    bubble.textContent = shown;
    if (output) output.scrollTop = output.scrollHeight;
    await new Promise((resolve) =>
      setTimeout(resolve, source[i] === "\n" ? 35 : 12),
    );
  }
  bubble.innerHTML = finalHtml;
  if (output) output.scrollTop = output.scrollHeight;
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([bubble]).catch(() => {});
  }
}

// Bộ matcher thông minh để nhận diện các tin nhắn tương tự
const MESSAGE_PATTERNS = {
  summary: {
    keywords: [
      "tóm tắt",
      "thông tin",
      "mô tả",
      "giới thiệu",
      "nói về",
      "chi tiết",
      "là gì",
      "about",
      "tell me",
      "summary",
      "describe",
      "overview",
      "info",
      "explain",
      "giải thích",
      "tt",
    ],
    responseIndex: 0,
  },
  electron: {
    keywords: [
      "cấu hình electron",
      "cấu hình e",
      "hoá trị",
      "hóa trị",
      "cấu trúc electron",
      "cấu trúc e",
      "proton",
      "neutron",
      "electron shell",
      "valence",
      "oxidation",
      "electron configuration",
      "atomic structure",
    ],
    responseIndex: 1,
  },
  application: {
    keywords: [
      "ứng dụng",
      "công dụng",
      "làm gì",
      "tác dụng",
      "sử dụng",
      "use",
      "application",
      "purpose",
      "industrial",
      "applications",
      "found in",
      "used in",
      "lợi ích",
    ],
    responseIndex: 2,
  },
  reaction: {
    keywords: [
      "phương trình",
      "phản ứng",
      "tương tác",
      "công thức",
      "hợp chất",
      "reaction",
      "equation",
      "chemical",
      "reacts with",
      "oxidation",
      "compound",
      "liệt kê",
      "pt",
      "vs h2o",
    ],
    responseIndex: 3,
  },
};

function calculateSimilarity(str1, str2) {
  const s1 = normalizeQuestion(str1);
  const s2 = normalizeQuestion(str2);
  if (s1 === s2) return 1;

  // Kiểm tra xem string2 có chứa string1 không
  if (s2.includes(s1) || s1.includes(s2)) return 0.85;

  // Tính Levenshtein distance (đơn giản hóa)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;

  const editDistance = getLevenshteinDistance(shorter, longer);
  return 1 - editDistance / longer.length;
}

function getLevenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function matchUserMessage(userMsg = "") {
  const normalized = normalizeQuestion(userMsg);
  let bestMatch = null;
  let bestScore = 0;

  for (const [category, config] of Object.entries(MESSAGE_PATTERNS)) {
    for (const keyword of config.keywords) {
      const similarity = calculateSimilarity(normalized, keyword);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          category,
          responseIndex: config.responseIndex,
          score: similarity,
        };
      }
    }
  }

  return bestScore >= 0.5 ? bestMatch : null;
}

async function getSuggestedAnswer(userMsg = "") {
  const el = window.__currentChatElement || null;
  const match = matchUserMessage(userMsg);

  if (!match) return null;

  const responses = await loadChatbotResponses();
  const group = el ? responses.element : responses.periodic;
  const template = group?.[match.responseIndex]?.answer;

  if (!template) return null;
  if (template === "__REACTIONS__") return buildReactionsAnswer(el);
  return fillTemplate(template, el ? getElementChatData(el) : {});
}

function getChatbotContext(el = null) {
  const viewDetails = !document
    .getElementById("view-details")
    .classList.contains("hidden");
  if (el) {
    return {
      page: "element",
      title: `${el.nameVi} (${el.symbol})`,
      element: {
        number: el.number,
        symbol: el.symbol,
        nameVi: el.nameVi,
        nameEn: el.general?.englishName || el.nameEn,
        group: el.general?.group || "?",
        period: el.general?.period || "?",
        electronConfig: el.general?.electronConfig || "Đang cập nhật",
        oxidation: el.general?.oxidation || "Đang cập nhật",
        electronegativity: el.general?.electronegativity || "Đang cập nhật",
        applications: (el.applications || [])
          .slice(0, 4)
          .map((a) => a.title || a.desc || ""),
      },
    };
  }
  return {
    page: viewDetails ? "details" : "periodic",
    title: viewDetails ? "Trang chi tiết nguyên tố" : "Trang bảng tuần hoàn",
    element: null,
  };
}

function buildChatSuggestions(el = null) {
  if (!el) {
    return [
      "Nguyên tố này nằm ở đâu trong bảng tuần hoàn?",
      "Tôi muốn tìm nguyên tố theo số hiệu nguyên tử.",
      "Cách lọc nguyên tố theo nhóm là gì?",
    ];
  }
  return [
    `Tóm tắt nhanh về ${el.nameVi}`,
    `Cho tôi biết cấu hình electron của ${el.symbol}`,
    `Nguyên tố ${el.symbol} có ứng dụng gì?`,
    `Liệt kê các phương trình quen thuộc của ${el.nameVi}`,
  ];
}

function setupChatbotContext(el = null) {
  window.__currentChatElement = el || null;
  renderChatSuggestions();
}

function renderChatSuggestions() {
  const list = document.getElementById("chat-suggestions");
  if (!list) return;
  const el = window.__currentChatElement || null;
  const suggestions = buildChatSuggestions(el);
  list.innerHTML = suggestions
    .map(
      (q) =>
        `<button class="chat-chip text-left" type="button" data-chat-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`,
    )
    .join("");
  list.querySelectorAll("[data-chat-q]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openChatbot();
      const input = document.getElementById("chat-input");
      if (input) input.value = btn.getAttribute("data-chat-q") || "";
      sendChatMessage();
    });
  });
}

function openChatbot() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  panel.classList.add("open");
  panel.style.display = "flex";
  renderChatSuggestions();
}

function closeChatbot() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  panel.classList.remove("open");
  panel.style.display = "none";
}

function toggleChatbot() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  const open = panel.classList.contains("open");
  if (open) closeChatbot();
  else openChatbot();
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const output = document.getElementById("chat-messages");
  if (!input || !output) return;

  const userMsg = input.value.trim();
  if (!userMsg) return;

  appendChatMessage("user", userMsg);
  input.value = "";
  appendTypingIndicator();
  output.scrollTop = output.scrollHeight;

  const suggestedAnswer = await getSuggestedAnswer(userMsg);
  if (suggestedAnswer) {
    document.getElementById("chat-loading")?.remove();
    await typeChatAnswer(suggestedAnswer);
    return;
  }

  const apiKey = String(window.GEMINI_API_KEY || GEMINI_API_KEY || "").trim();
  const model = String(
    window.GEMINI_MODEL || GEMINI_MODEL || "gemini-2.5-flash",
  ).trim();
  const endpoint = String(
    window.GEMINI_ENDPOINT ||
      GEMINI_ENDPOINT ||
      "https://generativelanguage.googleapis.com/v1beta/models/",
  ).trim();

  const ctx = getChatbotContext(window.__currentChatElement);
  const systemPrompt = [
    "Bạn là botchat chuyên giải quyết vấn đề liên quan đến hóa học.",
    "Trả lời ngắn gọn, chính xác, dễ hiểu.",
    "Nếu dữ liệu trên trang có sẵn, ưu tiên dùng dữ liệu đó.",
    `Ngữ cảnh trang: ${ctx.title}`,
    ctx.element ? `Nguyên tố hiện tại: ${JSON.stringify(ctx.element)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nCâu hỏi: ${userMsg}` }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  let answer = "";
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userMsg, systemPrompt }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    answer = data.text || "Mình chưa đọc được phản hồi từ Gemini API.";
  } catch (err) {
    answer = `Bạn hiện không có quyền truy cập vào tính năng trên. Hãy báo cáo với quan trị viên để được hỗ trợ.`;
  }

  const loading = document.getElementById("chat-loading");
  if (loading) loading.remove();
  await typeChatAnswer(answer);
}

function mountChatbotWidget() {
  if (document.getElementById("chat-panel")) return;

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.className = "chat-panel glass border border-slate-700 shadow-2xl";
  panel.innerHTML = `
          <div id="chat-handle" class="chat-drag-handle p-4 border-b border-slate-700/50 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-white font-semibold">Botchat Hóa học</div>
              <div class="text-xs text-slate-400">Kéo để di chuyển.</div>
            </div>
            <button type="button" id="chat-close-btn" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="p-4 space-y-3 overflow-y-auto flex-1">
            
            <div id="chat-suggestions" class="flex flex-wrap gap-2"></div>
            <div id="chat-messages" class="space-y-3"></div>
          </div>
          <div class="p-3 border-t border-slate-700/50 bg-slate-800/40">
            <div class="flex gap-2">
              <input id="chat-input" class="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 outline-none" placeholder="Cân bằng phương trình...." />
              <button id="chat-send-btn" class="px-4 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-semibold">Gửi</button>
            </div>
          </div>
        `;
  document.body.appendChild(panel);

  const fab = document.createElement("button");
  fab.id = "chat-fab";
  fab.className = "chat-fab glass border border-slate-700 text-white";
  fab.innerHTML = '<i class="fa-solid fa-comments text-xl"></i>';
  fab.title = "Mở botchat";
  document.body.appendChild(fab);

  fab.addEventListener("click", toggleChatbot);
  panel
    .querySelector("#chat-close-btn")
    ?.addEventListener("click", closeChatbot);
  panel
    .querySelector("#chat-send-btn")
    ?.addEventListener("click", sendChatMessage);
  panel.querySelector("#chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });

  // Drag support
  const handle = panel.querySelector("#chat-handle");
  let dragging = false,
    offsetX = 0,
    offsetY = 0;

  const movePanel = (x, y) => {
    const maxX = window.innerWidth - panel.offsetWidth - 8;
    const maxY = window.innerHeight - panel.offsetHeight - 8;
    panel.style.left = `${Math.max(8, Math.min(x, maxX))}px`;
    panel.style.top = `${Math.max(8, Math.min(y, maxY))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  };

  const onDown = (e) => {
    dragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    offsetY = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    movePanel(rect.left, rect.top);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    movePanel(clientX - offsetX, clientY - offsetY);
  };
  const onUp = () => (dragging = false);

  handle?.addEventListener("mousedown", onDown);
  handle?.addEventListener("touchstart", onDown, { passive: false });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("mouseup", onUp);
  window.addEventListener("touchend", onUp);
}

export {
  getChatbotContext,
  buildChatSuggestions,
  setupChatbotContext,
  renderChatSuggestions,
  openChatbot,
  closeChatbot,
  toggleChatbot,
  sendChatMessage,
  mountChatbotWidget,
};
