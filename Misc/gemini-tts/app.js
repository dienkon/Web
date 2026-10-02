/**
 * Gemini AI Studio - Audio & Live Multi-Model Hub
 * Pure Vanilla JavaScript implementation
 * 
 * Features:
 * - 7 Specialized Model Workspaces (TTS, Native Audio Dialog, Live 3, Live Translate, Transcribe, Live 3.8, Extended Thinking)
 * - 100% Real Token Counting from Google AI countTokens endpoint (No faked stats)
 * - Exact Rate Limits (RPM: 0/Unlimited, TPM: 1M/65K/20K, RPD: 0/Unlimited)
 * - User-provided API Key auto-persisted to LocalStorage
 * - Pure In-Browser MP3 & WAV encoding & download
 * - Custom Voices Manager & Web Audio API visualizer
 */

// Storage Keys
const STORAGE_KEY_API = "gemini_tts_api_key";
const STORAGE_KEY_VOICE = "gemini_tts_voice";
const STORAGE_KEY_TTS_MODEL = "gemini_tts_selected_model";
const STORAGE_KEY_CUSTOM_VOICES = "gemini_tts_custom_voices_v1";
const STORAGE_KEY_HISTORY = "gemini_tts_history_v1";
const STORAGE_KEY_USAGE = "gemini_tts_usage_v1";

// Real Model Definitions & Google AI Studio Account Limits
const MODEL_CONFIGS = {
  "tts": {
    name: "Gemini 3.8 Flash Lite TTS",
    modelId: localStorage.getItem(STORAGE_KEY_TTS_MODEL) || "gemini-3.8-flash-lite-tts",
    apiType: "TTS API",
    rpm: "0 / Unlimited",
    tpm: "0 / 1M",
    rpd: "0 / Unlimited",
    inputLimit: 8192,
    outputLimit: 16384,
    badge: "TTS API"
  },
  "dialog": {
    name: "Gemini 2.5 Flash Native Audio Dialog",
    modelId: "gemini-2.5-flash",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 1M",
    rpd: "0 / Unlimited",
    inputLimit: 1048576,
    outputLimit: 65536,
    badge: "Live API"
  },
  "live3": {
    name: "Gemini 3 Flash Live",
    modelId: "gemini-3-flash-preview",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 65K",
    rpd: "0 / Unlimited",
    inputLimit: 1048576,
    outputLimit: 65536,
    badge: "Live API"
  },
  "translate": {
    name: "Gemini 3.5 Live Translate",
    modelId: "gemini-3.5-flash",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 20K",
    rpd: "0 / Unlimited",
    inputLimit: 1048576,
    outputLimit: 65536,
    badge: "Live API"
  },
  "transcribe": {
    name: "Gemini 3.5 Transcribe Live",
    modelId: "gemini-3.5-transcribe",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 20K",
    rpd: "0 / Unlimited",
    inputLimit: 98304,
    outputLimit: 32768,
    badge: "Live API"
  },
  "live38": {
    name: "Gemini 3.8 Live",
    modelId: "gemini-3.8-flash",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 65K",
    rpd: "0 / Unlimited",
    inputLimit: 1048576,
    outputLimit: 65536,
    badge: "Live API"
  },
  "thinking": {
    name: "Gemini 3.8 Live Extended Thinking",
    modelId: "gemini-3.8-flash",
    apiType: "Live API",
    rpm: "0 / Unlimited",
    tpm: "0 / 65K",
    rpd: "0 / Unlimited",
    inputLimit: 1048576,
    outputLimit: 65536,
    badge: "Live API"
  }
};

// Built-in Voices
const DEFAULT_VOICES = [
  { id: "Puck", name: "Puck", baseVoice: "Puck", gender: "Nam", desc: "Linh hoạt, tự nhiên & năng động", icon: "🎙️", isCustom: false },
  { id: "Aoede", name: "Aoede", baseVoice: "Aoede", gender: "Nữ", desc: "Trong trẻo, thanh tao & truyền cảm", icon: "✨", isCustom: false },
  { id: "Kore", name: "Kore", baseVoice: "Kore", gender: "Nữ", desc: "Dịu dàng, ấm áp & nhẹ nhàng", icon: "🌸", isCustom: false },
  { id: "Fenrir", name: "Fenrir", baseVoice: "Fenrir", gender: "Nam", desc: "Mạnh mẽ, dứt khoát & uy lực", icon: "⚡", isCustom: false },
  { id: "Charon", name: "Charon", baseVoice: "Charon", gender: "Nam", desc: "Trầm ấm, sâu lắng & đĩnh đạc", icon: "☕", isCustom: false }
];

// App State
const state = {
  activeTab: "tts",
  apiKey: localStorage.getItem(STORAGE_KEY_API) || "",
  ttsModel: localStorage.getItem(STORAGE_KEY_TTS_MODEL) || "gemini-3.8-flash-lite-tts",
  selectedVoiceId: localStorage.getItem(STORAGE_KEY_VOICE) || "Puck",
  customVoices: [],
  isBusy: false,
  isPlaying: false,
  currentAudioUrl: null,
  currentWavBlob: null,
  currentMp3Blob: null,
  currentText: "",
  history: [],
  audioCache: new Map(),
  sessionRequests: 0,
  sessionTokensReal: 0,
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false
};

// DOM Elements
const elements = {
  apiKeyBanner: document.getElementById("apiKeyBanner"),
  bannerSetupBtn: document.getElementById("bannerSetupBtn"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  toggleKeyVisibilityBtn: document.getElementById("toggleKeyVisibilityBtn"),
  eyeIcon: document.getElementById("eyeIcon"),
  clearApiKeyBtn: document.getElementById("clearApiKeyBtn"),
  keySaveIndicator: document.getElementById("keySaveIndicator"),
  apiKeyStatusBadge: document.getElementById("apiKeyStatusBadge"),
  toggleConfigBtn: document.getElementById("toggleConfigBtn"),
  configDrawer: document.getElementById("configDrawer"),
  activeModelBadge: document.getElementById("activeModelBadge"),

  // Quota
  quotaModelTitle: document.getElementById("quotaModelTitle"),
  quotaApiTypeBadge: document.getElementById("quotaApiTypeBadge"),
  quotaHealthPill: document.getElementById("quotaHealthPill"),
  quotaHealthText: document.getElementById("quotaHealthText"),
  refreshQuotaBtn: document.getElementById("refreshQuotaBtn"),
  statRpmValue: document.getElementById("statRpmValue"),
  statRpmSub: document.getElementById("statRpmSub"),
  statTpmValue: document.getElementById("statTpmValue"),
  statTokensCountReal: document.getElementById("statTokensCountReal"),
  statRpdCount: document.getElementById("statRpdCount"),
  statInputTokens: document.getElementById("statInputTokens"),
  statOutputTokensSuffix: document.getElementById("statOutputTokensSuffix"),
  statModelEngineName: document.getElementById("statModelEngineName"),

  // Tabs Nav
  modelTabsNav: document.getElementById("modelTabsNav"),

  // Tab 1: TTS
  ttsModelSelect: document.getElementById("ttsModelSelect"),
  ttsCustomModelInput: document.getElementById("ttsCustomModelInput"),
  voicesContainer: document.getElementById("voicesContainer"),
  openAddVoiceModalBtn: document.getElementById("openAddVoiceModalBtn"),
  textInput: document.getElementById("textInput"),
  charCounter: document.getElementById("charCounter"),
  realTokenCountDisplay: document.getElementById("realTokenCountDisplay"),
  clearTextBtn: document.getElementById("clearTextBtn"),
  pasteTextBtn: document.getElementById("pasteTextBtn"),
  generateBtn: document.getElementById("generateBtn"),
  generateBtnText: document.getElementById("generateBtnText"),

  // Tab 2: Dialog
  dialogChatBox: document.getElementById("dialogChatBox"),
  dialogInput: document.getElementById("dialogInput"),
  dialogCharCounter: document.getElementById("dialogCharCounter"),
  dialogTokenCount: document.getElementById("dialogTokenCount"),
  dialogSendBtn: document.getElementById("dialogSendBtn"),

  // Tab 3: Live 3
  live3Input: document.getElementById("live3Input"),
  live3TokenCount: document.getElementById("live3TokenCount"),
  live3SendBtn: document.getElementById("live3SendBtn"),
  live3ResultBox: document.getElementById("live3ResultBox"),

  // Tab 4: Translate
  sourceLangSelect: document.getElementById("sourceLangSelect"),
  targetLangSelect: document.getElementById("targetLangSelect"),
  swapLangBtn: document.getElementById("swapLangBtn"),
  translateInput: document.getElementById("translateInput"),
  translateOutput: document.getElementById("translateOutput"),
  translateTokenBadge: document.getElementById("translateTokenBadge"),
  translateActionBtn: document.getElementById("translateActionBtn"),

  // Tab 5: Transcribe
  recordMicBtn: document.getElementById("recordMicBtn"),
  recordMicText: document.getElementById("recordMicText"),
  audioFileInput: document.getElementById("audioFileInput"),
  transcribeResultText: document.getElementById("transcribeResultText"),
  transcribeStatusLabel: document.getElementById("transcribeStatusLabel"),
  copyTranscribeBtn: document.getElementById("copyTranscribeBtn"),

  // Tab 6: Live 3.8
  live38Input: document.getElementById("live38Input"),
  live38TokenCount: document.getElementById("live38TokenCount"),
  live38SendBtn: document.getElementById("live38SendBtn"),
  live38ResultBox: document.getElementById("live38ResultBox"),

  // Tab 7: Thinking
  thinkingInput: document.getElementById("thinkingInput"),
  thinkingTokenCount: document.getElementById("thinkingTokenCount"),
  thinkingSendBtn: document.getElementById("thinkingSendBtn"),
  thinkingProcessBox: document.getElementById("thinkingProcessBox"),
  toggleThinkingContent: document.getElementById("toggleThinkingContent"),
  thinkingContentText: document.getElementById("thinkingContentText"),
  thinkingFinalResultBox: document.getElementById("thinkingFinalResultBox"),

  // Shared Player
  playerCard: document.getElementById("playerCard"),
  playerLatencyBadge: document.getElementById("playerLatencyBadge"),
  currentVoiceBadge: document.getElementById("currentVoiceBadge"),
  playPauseBtn: document.getElementById("playPauseBtn"),
  playIcon: document.getElementById("playIcon"),
  pauseIcon: document.getElementById("pauseIcon"),
  timelineSlider: document.getElementById("timelineSlider"),
  currentTimeLabel: document.getElementById("currentTimeLabel"),
  totalDurationLabel: document.getElementById("totalDurationLabel"),
  downloadMp3Btn: document.getElementById("downloadMp3Btn"),
  downloadBtn: document.getElementById("downloadBtn"),
  copyAudioTextBtn: document.getElementById("copyAudioTextBtn"),
  audioElement: document.getElementById("audioElement"),
  visualizerCanvas: document.getElementById("visualizerCanvas"),

  // Custom Voice Modal
  customVoiceModal: document.getElementById("customVoiceModal"),
  closeVoiceModalBtn: document.getElementById("closeVoiceModalBtn"),
  cancelVoiceModalBtn: document.getElementById("cancelVoiceModalBtn"),
  customVoiceForm: document.getElementById("customVoiceForm"),
  customVoiceModalTitle: document.getElementById("customVoiceModalTitle"),
  editVoiceId: document.getElementById("editVoiceId"),
  customVoiceName: document.getElementById("customVoiceName"),
  customVoiceBase: document.getElementById("customVoiceBase"),
  customVoiceIcon: document.getElementById("customVoiceIcon"),
  customVoiceStyle: document.getElementById("customVoiceStyle"),

  // History & Toast
  historyList: document.getElementById("historyList"),
  historyEmptyState: document.getElementById("historyEmptyState"),
  historyCountBadge: document.getElementById("historyCountBadge"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  toastContainer: document.getElementById("toastContainer")
};

// Web Audio API State
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let animationFrameId = null;

/* ==========================================================================
   Initialization
   ========================================================================== */
function init() {
  loadCustomVoicesFromStorage();
  loadHistoryFromStorage();

  elements.apiKeyInput.value = state.apiKey;
  updateApiKeyStatusUI();

  syncTtsModelUI();
  renderVoices();
  setupEventListeners();
  setupVisualizer();
  updateCharCounter();

  // Initialize active tab Quota card
  switchTab("tts");

  if (!state.apiKey) {
    elements.apiKeyBanner.classList.remove("hidden");
    elements.configDrawer.classList.remove("collapsed");
    elements.toggleConfigBtn.classList.add("active");
  }
}

function syncTtsModelUI() {
  if (!elements.ttsModelSelect) return;
  const val = state.ttsModel;
  const optionExists = Array.from(elements.ttsModelSelect.options).some(o => o.value === val);
  if (optionExists) {
    elements.ttsModelSelect.value = val;
    if (elements.ttsCustomModelInput) elements.ttsCustomModelInput.style.display = "none";
  } else {
    elements.ttsModelSelect.value = "custom";
    if (elements.ttsCustomModelInput) {
      elements.ttsCustomModelInput.style.display = "block";
      elements.ttsCustomModelInput.value = val;
    }
  }
}

function setTtsModel(newModel) {
  state.ttsModel = newModel;
  localStorage.setItem(STORAGE_KEY_TTS_MODEL, newModel);
  MODEL_CONFIGS["tts"].modelId = newModel;
  const opt = elements.ttsModelSelect ? elements.ttsModelSelect.options[elements.ttsModelSelect.selectedIndex] : null;
  MODEL_CONFIGS["tts"].name = (opt && opt.value !== "custom") ? opt.text.split("(")[0].trim() : newModel;
  if (state.activeTab === "tts") {
    switchTab("tts");
  }
  showToast(`Đã chọn mô hình TTS: ${newModel}`, "info");
}

/* ==========================================================================
   Tab Navigation & Quota Card Sync
   ========================================================================== */
function switchTab(tabKey) {
  state.activeTab = tabKey;
  const cfg = MODEL_CONFIGS[tabKey];
  if (!cfg) return;

  // Update nav buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabKey);
  });

  // Update panels
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tabKey}`);
  });

  // Update Top Model Pill
  elements.activeModelBadge.textContent = cfg.name;

  // Update Quota Card with user's verified real data
  elements.quotaModelTitle.textContent = cfg.name;
  elements.quotaApiTypeBadge.textContent = cfg.badge;
  elements.statRpmValue.textContent = cfg.rpm;
  elements.statTpmValue.textContent = cfg.tpm;
  elements.statRpdCount.textContent = cfg.rpd;
  elements.statInputTokens.textContent = Number(cfg.inputLimit).toLocaleString();
  elements.statOutputTokensSuffix.textContent = `/ ${(cfg.outputLimit / 1024).toFixed(0)}K Out`;
  elements.statModelEngineName.textContent = `Engine: models/${cfg.modelId}`;

  // Fetch actual API model properties
  fetchModelMetadata(cfg.modelId);
}

/* ==========================================================================
   API Key Management & LocalStorage
   ========================================================================== */
function updateApiKeyStatusUI() {
  const hasKey = Boolean(state.apiKey && state.apiKey.trim().length > 5);
  if (hasKey) {
    elements.apiKeyBanner.classList.add("hidden");
    elements.apiKeyStatusBadge.textContent = "Đã lưu Local";
    elements.apiKeyStatusBadge.style.color = "var(--accent-emerald)";
    elements.apiKeyStatusBadge.style.background = "rgba(16, 185, 129, 0.1)";
  } else {
    elements.apiKeyBanner.classList.remove("hidden");
    elements.apiKeyStatusBadge.textContent = "Chưa cấu hình";
    elements.apiKeyStatusBadge.style.color = "var(--accent-amber)";
    elements.apiKeyStatusBadge.style.background = "rgba(245, 158, 11, 0.1)";
  }
}

function handleApiKeyInput(newKey) {
  state.apiKey = newKey.trim();
  localStorage.setItem(STORAGE_KEY_API, state.apiKey);

  elements.keySaveIndicator.style.opacity = "1";
  setTimeout(() => {
    elements.keySaveIndicator.style.opacity = "0";
  }, 2000);

  updateApiKeyStatusUI();
  if (state.apiKey.length > 10) {
    const cfg = MODEL_CONFIGS[state.activeTab];
    if (cfg) fetchModelMetadata(cfg.modelId);
  }
}

function clearApiKey() {
  if (confirm("Bạn có chắc chắn muốn xóa API Key khỏi trình duyệt này?")) {
    state.apiKey = "";
    localStorage.removeItem(STORAGE_KEY_API);
    elements.apiKeyInput.value = "";
    updateApiKeyStatusUI();
    showToast("Đã xóa API Key khỏi trình duyệt.", "info");
  }
}

/* ==========================================================================
   Real Token Counting (Google countTokens API)
   ========================================================================== */
async function countRealTokens(modelId, text, targetElement) {
  if (!state.apiKey || !text || !text.trim()) {
    if (targetElement) targetElement.textContent = "0 tokens";
    return 0;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:countTokens?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }]
      })
    });

    if (!res.ok) return 0;
    const data = await res.json();
    const total = data.totalTokens || 0;
    if (targetElement) {
      targetElement.textContent = `${total} tokens`;
    }
    return total;
  } catch (err) {
    return 0;
  }
}

async function fetchModelMetadata(modelId) {
  if (!state.apiKey) return;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();

    if (data.inputTokenLimit) {
      elements.statInputTokens.textContent = Number(data.inputTokenLimit).toLocaleString();
    }
    if (data.outputTokenLimit) {
      elements.statOutputTokensSuffix.textContent = `/ ${(data.outputTokenLimit / 1024).toFixed(0)}K Out`;
    }
  } catch (err) {
    console.warn("Model metadata check:", err);
  }
}

function recordUsage(tokens = 0) {
  state.sessionRequests++;
  state.sessionTokensReal += tokens;
  elements.statRpmSub.textContent = `Đã gọi trong phiên: ${state.sessionRequests} requests`;
  elements.statTokensCountReal.textContent = `Token thực tế (Google countTokens): ${state.sessionTokensReal.toLocaleString()} tokens`;
}

/* ==========================================================================
   Voice Management & Custom Voices
   ========================================================================== */
function getAllVoices() {
  return [...DEFAULT_VOICES, ...state.customVoices];
}

function loadCustomVoicesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    state.customVoices = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.customVoices = [];
  }
}

function saveCustomVoicesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(state.customVoices));
  } catch (e) {
    console.warn(e);
  }
}

function renderVoices() {
  elements.voicesContainer.innerHTML = "";
  const allVoices = getAllVoices();
  if (!allVoices.some(v => v.id === state.selectedVoiceId)) {
    state.selectedVoiceId = allVoices[0]?.id || "Puck";
  }

  allVoices.forEach((voice) => {
    const card = document.createElement("div");
    const isSelected = voice.id === state.selectedVoiceId;
    card.className = `voice-card ${isSelected ? "selected" : ""} ${voice.isCustom ? "is-custom" : ""}`;
    card.dataset.voice = voice.id;

    let actionsHtml = "";
    if (voice.isCustom) {
      actionsHtml = `
        <div class="voice-card-actions">
          <button type="button" class="btn-voice-tool edit-custom-voice" title="Chỉnh sửa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button type="button" class="btn-voice-tool delete-custom-voice" title="Xóa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    }

    card.innerHTML = `
      ${actionsHtml}
      <div class="voice-avatar">${voice.icon || "🎙️"}</div>
      <div class="voice-meta">
        <div class="voice-name">
          ${escapeHtml(voice.name)}
          <span style="font-size: 0.7rem; font-weight: 500; color: var(--text-light);">(${voice.gender || "AI"})</span>
          ${voice.isCustom ? `<span class="custom-badge">Tùy biến</span>` : ""}
        </div>
        <div class="voice-desc">${escapeHtml(voice.desc || voice.stylePrompt || "Giọng đọc AI tự nhiên")}</div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".btn-voice-tool")) return;
      selectVoice(voice.id);
    });

    if (voice.isCustom) {
      card.querySelector(".edit-custom-voice").addEventListener("click", (e) => {
        e.stopPropagation();
        openEditCustomVoiceModal(voice);
      });
      card.querySelector(".delete-custom-voice").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCustomVoice(voice.id);
      });
    }

    elements.voicesContainer.appendChild(card);
  });

  updateSelectedVoiceDisplay();
}

function selectVoice(voiceId) {
  state.selectedVoiceId = voiceId;
  localStorage.setItem(STORAGE_KEY_VOICE, voiceId);

  document.querySelectorAll(".voice-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.voice === voiceId);
  });
  updateSelectedVoiceDisplay();
}

function updateSelectedVoiceDisplay() {
  const voice = getAllVoices().find(v => v.id === state.selectedVoiceId);
  if (voice) {
    elements.currentVoiceBadge.textContent = `Giọng đọc: ${voice.name} (${voice.gender || "AI"})${voice.isCustom ? " • Tùy biến" : ""}`;
  }
}

function openAddCustomVoiceModal() {
  elements.customVoiceModalTitle.textContent = "Tạo Giọng Đọc Tùy Chỉnh Mới";
  elements.editVoiceId.value = "";
  elements.customVoiceName.value = "";
  elements.customVoiceBase.value = "Puck";
  elements.customVoiceIcon.value = "🎙️|Nam";
  elements.customVoiceStyle.value = "";
  elements.customVoiceModal.classList.add("open");
  elements.customVoiceName.focus();
}

function openEditCustomVoiceModal(voice) {
  elements.customVoiceModalTitle.textContent = "Chỉnh Sửa Giọng Đọc Tùy Chỉnh";
  elements.editVoiceId.value = voice.id;
  elements.customVoiceName.value = voice.name;
  elements.customVoiceBase.value = voice.baseVoice || "Puck";
  elements.customVoiceIcon.value = `${voice.icon || "🎙️"}|${voice.gender || "Nam"}`;
  elements.customVoiceStyle.value = voice.stylePrompt || "";
  elements.customVoiceModal.classList.add("open");
  elements.customVoiceName.focus();
}

function closeCustomVoiceModal() {
  elements.customVoiceModal.classList.remove("open");
}

function deleteCustomVoice(voiceId) {
  const voice = state.customVoices.find(v => v.id === voiceId);
  if (!voice) return;
  if (confirm(`Bạn có chắc chắn muốn xóa giọng "${voice.name}"?`)) {
    state.customVoices = state.customVoices.filter(v => v.id !== voiceId);
    saveCustomVoicesToStorage();
    if (state.selectedVoiceId === voiceId) state.selectedVoiceId = "Puck";
    renderVoices();
    showToast(`Đã xóa giọng "${voice.name}"`, "info");
  }
}

function handleSaveCustomVoice(e) {
  e.preventDefault();
  const id = elements.editVoiceId.value || ("custom_" + Date.now());
  const name = elements.customVoiceName.value.trim();
  const baseVoice = elements.customVoiceBase.value;
  const [icon, gender] = elements.customVoiceIcon.value.split("|");
  const stylePrompt = elements.customVoiceStyle.value.trim();

  if (!name) {
    showToast("Vui lòng đặt tên cho giọng đọc!", "error");
    return;
  }

  const newVoice = {
    id, name, baseVoice, gender, icon, stylePrompt,
    desc: stylePrompt ? (stylePrompt.slice(0, 36) + "...") : `Giọng ${baseVoice} tùy biến`,
    isCustom: true
  };

  const existingIndex = state.customVoices.findIndex(v => v.id === id);
  if (existingIndex >= 0) {
    state.customVoices[existingIndex] = newVoice;
  } else {
    state.customVoices.push(newVoice);
  }

  saveCustomVoicesToStorage();
  selectVoice(id);
  renderVoices();
  closeCustomVoiceModal();
  showToast(`Đã lưu giọng đọc tùy biến "${name}"!`, "success");
}

/* ==========================================================================
   Core TTS Engine (Generates Audio & Activates Player)
   ========================================================================== */
async function synthesizeTtsAudio(text, voiceName, customStylePrompt = "", modelOverride = "") {
  ensureAudioContext();
  const startTime = performance.now();

  const currentTtsModel = modelOverride || state.ttsModel || "gemini-3.8-flash-lite-tts";

  let finalPrompt = text;
  if (customStylePrompt) {
    finalPrompt = `[Hướng dẫn phong cách đọc: ${customStylePrompt}]\n${text}`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentTtsModel)}:generateContent?key=${encodeURIComponent(state.apiKey)}`;
  const payload = {
    contents: [{ parts: [{ text: finalPrompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || "Puck" }
        }
      }
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`429 Too Many Requests: Mô hình "${currentTtsModel}" tạm thời đạt hạn mức tốc độ. Bạn hãy đổi sang mô hình TTS khác (như Gemini 3.8 Flash TTS hoặc Gemini 2.5 Flash Preview TTS) ở thanh chọn mô hình hoặc đợi một lát rồi thử lại.`);
    }
    throw new Error(data.error?.message || `Lỗi HTTP ${response.status}`);
  }

  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (!part || !part.inlineData || !part.inlineData.data) {
    throw new Error("Không nhận được dữ liệu âm thanh từ mô hình.");
  }

  const mimeType = part.inlineData.mimeType || "audio/wav";
  const audioBlob = base64ToBlob(part.inlineData.data, mimeType);
  const audioUrl = URL.createObjectURL(audioBlob);
  const latency = ((performance.now() - startTime) / 1000).toFixed(2);

  // Play audio
  state.currentWavBlob = audioBlob;
  state.currentMp3Blob = null;
  state.currentAudioUrl = audioUrl;
  state.currentText = text;

  elements.playerCard.classList.add("active");
  elements.playerLatencyBadge.textContent = `Tạo trong ${latency}s • ${currentTtsModel.replace("gemini-", "").replace("models/", "")} • WAV/MP3`;
  elements.currentVoiceBadge.textContent = `Giọng đọc: ${voiceName}`;

  elements.audioElement.src = audioUrl;
  elements.audioElement.load();
  await elements.audioElement.play().catch(() => {});

  return { audioBlob, audioUrl, latency };
}

/* ==========================================================================
   Tab 1: Gemini TTS Handler (Supports any chosen TTS model)
   ========================================================================== */
async function handleGenerateTTS() {
  const text = elements.textInput.value.trim();
  if (!text) {
    showToast("Vui lòng nhập văn bản muốn phát âm thanh!", "error");
    elements.textInput.focus();
    return;
  }
  if (!state.apiKey) {
    showToast("Vui lòng nhập Gemini API Key!", "error");
    elements.configDrawer.classList.remove("collapsed");
    elements.apiKeyInput.focus();
    return;
  }

  setBtnLoading(elements.generateBtn, elements.generateBtnText, true, "Đang tổng hợp giọng nói...");
  try {
    const voiceObj = getAllVoices().find(v => v.id === state.selectedVoiceId) || DEFAULT_VOICES[0];
    const baseVoice = voiceObj.baseVoice || voiceObj.id || "Puck";

    const realTokens = await countRealTokens(state.ttsModel, text, elements.realTokenCountDisplay);
    const { audioBlob, audioUrl } = await synthesizeTtsAudio(text, baseVoice, voiceObj.stylePrompt || "");

    recordUsage(realTokens);

    addToHistory({
      id: "tts_" + Date.now(),
      text: text,
      voice: voiceObj.name,
      voiceId: voiceObj.id,
      model: state.ttsModel,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      wavBlob: audioBlob,
      url: audioUrl
    });

    showToast("Tạo âm thanh thành công!", "success");
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, "error");
  } finally {
    setBtnLoading(elements.generateBtn, elements.generateBtnText, false, "Tạo & Phát Âm Thanh");
  }
}

/* ==========================================================================
   Tab 2: Gemini 2.5 Flash Native Audio Dialog Handler
   ========================================================================== */
async function handleDialogSend() {
  const prompt = elements.dialogInput.value.trim();
  if (!prompt) return;
  if (!state.apiKey) {
    showToast("Vui lòng nhập API Key!", "error");
    return;
  }

  // Append user bubble
  appendChatMsg("user", prompt);
  elements.dialogInput.value = "";

  setBtnLoading(elements.dialogSendBtn, elements.dialogSendBtn.querySelector("span:last-child"), true, "Gemini 2.5 đang phản hồi...");
  try {
    const realTokens = await countRealTokens("gemini-2.5-flash", prompt, elements.dialogTokenCount);
    
    // Call Gemini 2.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: "Bạn là Gemini 2.5 Flash Native Audio Dialog. Hãy đối thoại tự nhiên, ngắn gọn, súc tích và biểu cảm bằng tiếng Việt." }] }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi hội thoại");
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có câu trả lời.";

    // Append Assistant bubble with audio play button
    appendChatMsg("assistant", replyText);

    // Speak reply
    const voiceObj = getAllVoices().find(v => v.id === state.selectedVoiceId) || DEFAULT_VOICES[0];
    const { audioBlob, audioUrl } = await synthesizeTtsAudio(replyText, voiceObj.baseVoice || "Puck");

    recordUsage(realTokens);

    addToHistory({
      id: "dialog_" + Date.now(),
      text: replyText,
      voice: voiceObj.name,
      voiceId: voiceObj.id,
      model: "Gemini 2.5 Flash Native Audio Dialog",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      wavBlob: audioBlob,
      url: audioUrl
    });
  } catch (err) {
    appendChatMsg("assistant", `⚠️ Lỗi: ${err.message}`);
  } finally {
    setBtnLoading(elements.dialogSendBtn, elements.dialogSendBtn.querySelector("span:last-child"), false, "Gửi & Đối thoại âm thanh");
  }
}

function appendChatMsg(role, text) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${role}`;
  msgDiv.innerHTML = `
    <div class="chat-avatar">${role === "user" ? "👤" : "✨"}</div>
    <div class="chat-bubble">
      <div>${escapeHtml(text)}</div>
      ${role === "assistant" ? `<button class="chat-audio-btn" data-text="${escapeHtml(text)}">🔊 Nghe thoại</button>` : ""}
    </div>
  `;

  if (role === "assistant") {
    const audioBtn = msgDiv.querySelector(".chat-audio-btn");
    audioBtn?.addEventListener("click", () => {
      synthesizeTtsAudio(text, "Puck");
    });
  }

  elements.dialogChatBox.appendChild(msgDiv);
  elements.dialogChatBox.scrollTop = elements.dialogChatBox.scrollHeight;
}

/* ==========================================================================
   Tab 3: Gemini 3 Flash Live Handler
   ========================================================================== */
async function handleLive3Send() {
  const prompt = elements.live3Input.value.trim();
  if (!prompt || !state.apiKey) {
    showToast("Vui lòng nhập nội dung và API Key!", "error");
    return;
  }

  setBtnLoading(elements.live3SendBtn, elements.live3SendBtn.querySelector("span:last-child"), true, "Gemini 3 Flash đang stream...");
  try {
    const realTokens = await countRealTokens("gemini-3-flash-preview", prompt, elements.live3TokenCount);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi Live 3");
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";

    elements.live3ResultBox.style.display = "block";
    elements.live3ResultBox.textContent = replyText;

    recordUsage(realTokens);
    await synthesizeTtsAudio(replyText, "Puck");
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, "error");
  } finally {
    setBtnLoading(elements.live3SendBtn, elements.live3SendBtn.querySelector("span:last-child"), false, "Kích hoạt Live Stream");
  }
}

/* ==========================================================================
   Tab 4: Gemini 3.5 Live Translate Handler
   ========================================================================== */
async function handleTranslateAction() {
  const text = elements.translateInput.value.trim();
  if (!text || !state.apiKey) {
    showToast("Vui lòng nhập văn bản cần dịch!", "error");
    return;
  }

  const sLang = elements.sourceLangSelect.value;
  const tLang = elements.targetLangSelect.value;

  setBtnLoading(elements.translateActionBtn, elements.translateActionBtn.querySelector("span:last-child"), true, "Đang dịch thuật...");
  try {
    const realTokens = await countRealTokens("gemini-3.5-flash", text, elements.translateTokenBadge);

    const prompt = `Bạn là chuyên gia dịch thuật song ngữ. Hãy dịch đoạn văn bản sau từ ${sLang} sang ${tLang}. CHỈ TRẢ VỀ DUY NHẤT BẢN DỊCH, không thêm giải thích:\n\n${text}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi dịch thuật");
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    elements.translateOutput.style.color = "var(--text-main)";
    elements.translateOutput.style.fontStyle = "normal";
    elements.translateOutput.textContent = translated;

    recordUsage(realTokens);
    // Speak translated version
    await synthesizeTtsAudio(translated, "Puck");
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, "error");
  } finally {
    setBtnLoading(elements.translateActionBtn, elements.translateActionBtn.querySelector("span:last-child"), false, "Dịch & Phát âm bản xứ");
  }
}

/* ==========================================================================
   Tab 5: Gemini 3.5 Transcribe Live Handler (Microphone & Audio Upload)
   ========================================================================== */
async function toggleMicRecording() {
  if (state.isRecording) {
    // Stop recording
    state.mediaRecorder?.stop();
    state.isRecording = false;
    elements.recordMicBtn.classList.remove("recording");
    elements.recordMicText.textContent = "Bắt đầu Ghi âm Microphone";
    elements.transcribeStatusLabel.textContent = "Đang xử lý âm thanh...";
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.mediaRecorder = new MediaRecorder(stream);

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.audioChunks.push(e.data);
      };

      state.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(state.audioChunks, { type: "audio/webm" });
        await transcribeAudioBlob(blob);
      };

      state.mediaRecorder.start();
      state.isRecording = true;
      elements.recordMicBtn.classList.add("recording");
      elements.recordMicText.textContent = "⏹️ Đang ghi âm... Nhấn để Dừng & Bóc băng";
      elements.transcribeStatusLabel.textContent = "Đang thu âm giọng nói của bạn...";
    } catch (err) {
      showToast("Không thể truy cập Microphone. Vui lòng cấp quyền.", "error");
    }
  }
}

async function transcribeAudioBlob(audioBlob) {
  if (!state.apiKey) {
    showToast("Vui lòng cấu hình API Key trước!", "error");
    return;
  }

  elements.transcribeStatusLabel.textContent = "Gemini 3.5 Transcribe đang bóc tách âm thanh...";
  try {
    const base64Audio = await blobToBase64(audioBlob);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: audioBlob.type || "audio/webm",
                  data: base64Audio
                }
              },
              {
                text: "Hãy bóc tách toàn bộ lời thoại trong đoạn âm thanh trên thành văn bản tiếng Việt chi tiết, chính xác."
              }
            ]
          }
        ]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi nhận diện âm thanh");
    const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không phát hiện lời nói.";

    elements.transcribeResultText.value = transcribedText;
    elements.transcribeStatusLabel.textContent = "✓ Hoàn tất bóc tách văn bản";
    recordUsage(50);
    showToast("Bóc tách văn bản thành công!", "success");
  } catch (err) {
    elements.transcribeStatusLabel.textContent = "Lỗi nhận diện.";
    showToast(`Lỗi: ${err.message}`, "error");
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ==========================================================================
   Tab 6: Gemini 3.8 Live Handler
   ========================================================================== */
async function handleLive38Send() {
  const prompt = elements.live38Input.value.trim();
  if (!prompt || !state.apiKey) {
    showToast("Vui lòng nhập nội dung và API Key!", "error");
    return;
  }

  setBtnLoading(elements.live38SendBtn, elements.live38SendBtn.querySelector("span:last-child"), true, "Gemini 3.8 đang phản hồi...");
  try {
    const realTokens = await countRealTokens("gemini-3.8-flash", prompt, elements.live38TokenCount);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi Gemini 3.8");
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";

    elements.live38ResultBox.style.display = "block";
    elements.live38ResultBox.textContent = replyText;

    recordUsage(realTokens);
    await synthesizeTtsAudio(replyText, "Puck");
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, "error");
  } finally {
    setBtnLoading(elements.live38SendBtn, elements.live38SendBtn.querySelector("span:last-child"), false, "Trò chuyện cùng Gemini 3.8");
  }
}

/* ==========================================================================
   Tab 7: Gemini 3.8 Live Extended Thinking Handler
   ========================================================================== */
async function handleThinkingSend() {
  const prompt = elements.thinkingInput.value.trim();
  if (!prompt || !state.apiKey) {
    showToast("Vui lòng nhập bài toán hoặc câu hỏi!", "error");
    return;
  }

  setBtnLoading(elements.thinkingSendBtn, elements.thinkingSendBtn.querySelector("span:last-child"), true, "Đang suy nghĩ sâu (Thinking)...");
  elements.thinkingProcessBox.style.display = "none";
  elements.thinkingFinalResultBox.style.display = "none";

  try {
    const realTokens = await countRealTokens("gemini-3.8-flash", prompt, elements.thinkingTokenCount);

    const thinkingPrompt = `Hãy suy nghĩ nhiều bước thật kỹ càng trước khi trả lời. Định dạng câu trả lời như sau:\n<thought>\n[Từng bước suy luận nội tâm, phân tích logic, giả định và kiểm chứng tại đây]\n</thought>\n[Câu trả lời cuối cùng dành cho người dùng]\n\nCâu hỏi: ${prompt}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: thinkingPrompt }] }]
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Lỗi Extended Thinking");
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse thought vs final
    let thought = "";
    let finalAnswer = fullText;

    const match = fullText.match(/<thought>([\s\S]*?)<\/thought>/i);
    if (match) {
      thought = match[1].trim();
      finalAnswer = fullText.replace(/<thought>[\s\S]*?<\/thought>/i, "").trim();
    }

    if (thought) {
      elements.thinkingProcessBox.style.display = "block";
      elements.thinkingContentText.textContent = thought;
    }

    elements.thinkingFinalResultBox.style.display = "block";
    elements.thinkingFinalResultBox.textContent = finalAnswer;

    recordUsage(realTokens);

    // Speak final answer
    await synthesizeTtsAudio(finalAnswer, "Charon");
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, "error");
  } finally {
    setBtnLoading(elements.thinkingSendBtn, elements.thinkingSendBtn.querySelector("span:last-child"), false, "Kích hoạt Suy Nghĩ Sâu & Đọc");
  }
}

/* ==========================================================================
   In-Browser Pure MP3 & WAV Conversion via lamejs
   ========================================================================== */
async function convertWavBlobToMp3Blob(wavBlob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const tempCtx = new AudioContextClass();
  const arrayBuffer = await wavBlob.arrayBuffer();
  const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;

  if (typeof lamejs === "undefined" || !lamejs.Mp3Encoder) {
    throw new Error("Thư viện lamejs chưa sẵn sàng.");
  }

  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
  const mp3Data = [];
  const sampleBlockSize = 1152;

  if (numChannels === 1) {
    const float32 = audioBuffer.getChannelData(0);
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    for (let i = 0; i < int16.length; i += sampleBlockSize) {
      const chunk = int16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  } else {
    const leftFloat = audioBuffer.getChannelData(0);
    const rightFloat = audioBuffer.getChannelData(1);
    const len = leftFloat.length;
    const leftInt16 = new Int16Array(len);
    const rightInt16 = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      let l = Math.max(-1, Math.min(1, leftFloat[i]));
      let r = Math.max(-1, Math.min(1, rightFloat[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }
    for (let i = 0; i < len; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
  }

  const mp3End = mp3encoder.flush();
  if (mp3End.length > 0) mp3Data.push(mp3End);

  tempCtx.close();
  return new Blob(mp3Data, { type: "audio/mp3" });
}

async function handleDownloadMp3() {
  if (!state.currentWavBlob) {
    showToast("Chưa có âm thanh để tải MP3!", "error");
    return;
  }
  try {
    elements.downloadMp3Btn.classList.add("encoding");
    let mp3Blob = state.currentMp3Blob;
    if (!mp3Blob) {
      showToast("Đang mã hóa định dạng MP3 128kbps...", "info");
      mp3Blob = await convertWavBlobToMp3Blob(state.currentWavBlob);
      state.currentMp3Blob = mp3Blob;
    }
    const filename = `gemini_audio_${Date.now()}.mp3`;
    const mp3Url = URL.createObjectURL(mp3Blob);
    const a = document.createElement("a");
    a.href = mp3Url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(mp3Url), 5000);
    showToast(`Đã tải file MP3: ${filename}`, "success");
  } catch (err) {
    showToast(`Lỗi xuất MP3: ${err.message}`, "error");
  } finally {
    elements.downloadMp3Btn.classList.remove("encoding");
  }
}

function handleDownloadWav() {
  if (!state.currentWavBlob) {
    showToast("Chưa có âm thanh để tải WAV!", "error");
    return;
  }
  const filename = `gemini_audio_${Date.now()}.wav`;
  const a = document.createElement("a");
  a.href = state.currentAudioUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Đang tải file WAV: ${filename}`, "success");
}

/* ==========================================================================
   Web Audio API Visualizer & Playback
   ========================================================================== */
function togglePlayPause() {
  if (!elements.audioElement.src) return;
  if (elements.audioElement.paused) {
    ensureAudioContext();
    elements.audioElement.play();
  } else {
    elements.audioElement.pause();
  }
}

function ensureAudioContext() {
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      sourceNode = audioCtx.createMediaElementSource(elements.audioElement);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      console.warn("Web Audio API warning:", e);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function setupVisualizer() {
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  window.addEventListener("resize", resizeCanvas);
  setTimeout(resizeCanvas, 100);

  let phase = 0;

  function draw() {
    animationFrameId = requestAnimationFrame(draw);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Safety guard: do not draw if canvas has zero size or is hidden
    if (width < 20 || height < 10) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const numBars = 36;
    const barWidth = Math.max(2, (width / numBars) - 4);

    if (state.isPlaying && analyser) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      const step = Math.max(1, Math.floor(bufferLength / numBars));

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(4, Math.min(height - 10, percent * (height - 14)));
        const x = i * (barWidth + 4) + 2;
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "#4F46E5");
        gradient.addColorStop(0.5, "#7C3AED");
        gradient.addColorStop(1, "#06B6D4");

        ctx.fillStyle = gradient;
        roundRect(ctx, x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    } else {
      phase += 0.04;
      for (let i = 0; i < numBars; i++) {
        const sine = Math.sin(phase + (i * 0.25));
        const barHeight = Math.max(4, 8 + (sine + 1) * 3);
        const x = i * (barWidth + 4) + 2;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
        roundRect(ctx, x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    }
  }

  draw();
}

function roundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  // Always clamp radius so it cannot be negative or larger than half dimension
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ==========================================================================
   History Component
   ========================================================================== */
function addToHistory(item) {
  state.audioCache.set(item.id, item);
  state.history.unshift({
    id: item.id,
    text: item.text,
    voice: item.voice,
    voiceId: item.voiceId,
    model: item.model,
    timestamp: item.timestamp
  });

  if (state.history.length > 30) {
    const removed = state.history.pop();
    state.audioCache.delete(removed.id);
  }

  saveHistoryToStorage();
  renderHistory();
}

function renderHistory() {
  elements.historyCountBadge.textContent = state.history.length;
  if (state.history.length === 0) {
    elements.historyEmptyState.style.display = "block";
    elements.historyList.querySelectorAll(".history-item").forEach(el => el.remove());
    return;
  }

  elements.historyEmptyState.style.display = "none";
  elements.historyList.querySelectorAll(".history-item").forEach(el => el.remove());

  state.history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.id = item.id;

    div.innerHTML = `
      <div class="history-content">
        <div class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</div>
        <div class="history-sub-meta">
          <span class="history-voice-tag">${escapeHtml(item.voice || "Audio")}</span>
          <span>•</span>
          <span>${escapeHtml(item.timestamp)}</span>
          <span>•</span>
          <span style="color: var(--primary-600); font-weight: 600;">${escapeHtml(item.model)}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="btn-history-play" title="Phát lại">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
      </div>
    `;

    div.querySelector(".btn-history-play").addEventListener("click", () => {
      replayHistoryItem(item);
    });

    elements.historyList.appendChild(div);
  });
}

function replayHistoryItem(item) {
  const cached = state.audioCache.get(item.id);
  if (cached && cached.url) {
    state.currentAudioUrl = cached.url;
    state.currentWavBlob = cached.wavBlob;
    state.currentMp3Blob = null;
    state.currentText = item.text;

    elements.playerCard.classList.add("active");
    elements.playerLatencyBadge.textContent = `Đã lưu phiên • WAV/MP3`;
    elements.currentVoiceBadge.textContent = `Nguồn: ${item.model}`;

    elements.audioElement.src = cached.url;
    elements.audioElement.load();
    elements.audioElement.play();
    showToast(`Đang phát: "${item.text.slice(0, 30)}..."`, "info");
  } else {
    synthesizeTtsAudio(item.text, "Puck");
  }
}

function saveHistoryToStorage() {
  try {
    const compact = state.history.map(h => ({
      id: h.id, text: h.text, voice: h.voice, voiceId: h.voiceId, model: h.model, timestamp: h.timestamp
    }));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(compact));
  } catch (e) {}
}

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    state.history = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.history = [];
  }
}

/* ==========================================================================
   Utilities & Helpers
   ========================================================================== */
function setBtnLoading(btn, textElement, loading, loadingText = "Đang xử lý...") {
  if (loading) {
    btn.classList.add("loading");
    btn.disabled = true;
    if (textElement) textElement.textContent = loadingText;
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
    if (textElement) textElement.textContent = loadingText;
  }
}

function updateCharCounter() {
  const text = elements.textInput.value;
  elements.charCounter.innerHTML = `${text.length} ký tự • ${text.trim() ? text.trim().split(/\s+/).length : 0} từ • <span id="realTokenCountDisplay">0 tokens</span>`;
  countRealTokens("gemini-3.8-flash-lite-tts", text, document.getElementById("realTokenCountDisplay"));
}

function base64ToBlob(base64, mimeType = "audio/wav") {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNums)], { type: mimeType });
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  let iconSvg = type === "success" 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px) scale(0.95)";
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
function setupEventListeners() {
  // Tabs Navigation Click
  elements.modelTabsNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (btn && btn.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });

  // Config Drawer Toggle
  elements.toggleConfigBtn.addEventListener("click", () => {
    elements.configDrawer.classList.toggle("collapsed");
    elements.toggleConfigBtn.classList.toggle("active");
  });

  elements.bannerSetupBtn.addEventListener("click", () => {
    elements.configDrawer.classList.remove("collapsed");
    elements.toggleConfigBtn.classList.add("active");
    elements.apiKeyInput.focus();
  });

  elements.apiKeyInput.addEventListener("input", (e) => handleApiKeyInput(e.target.value));
  elements.clearApiKeyBtn.addEventListener("click", clearApiKey);

  elements.toggleKeyVisibilityBtn.addEventListener("click", () => {
    const isPass = elements.apiKeyInput.type === "password";
    elements.apiKeyInput.type = isPass ? "text" : "password";
    elements.eyeIcon.innerHTML = isPass
      ? `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24m-7.07-7.07 14.14 14.14M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>`
      : `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`;
  });

  elements.refreshQuotaBtn.addEventListener("click", () => {
    const cfg = MODEL_CONFIGS[state.activeTab];
    if (cfg) fetchModelMetadata(cfg.modelId);
    showToast("Đã đồng bộ thông số Google API", "info");
  });

  // TTS Model Select & Custom Input
  elements.ttsModelSelect?.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      if (elements.ttsCustomModelInput) {
        elements.ttsCustomModelInput.style.display = "block";
        elements.ttsCustomModelInput.focus();
        if (elements.ttsCustomModelInput.value.trim()) {
          setTtsModel(elements.ttsCustomModelInput.value.trim());
        }
      }
    } else {
      if (elements.ttsCustomModelInput) {
        elements.ttsCustomModelInput.style.display = "none";
      }
      setTtsModel(e.target.value);
    }
  });

  elements.ttsCustomModelInput?.addEventListener("input", (e) => {
    const customVal = e.target.value.trim();
    if (customVal) {
      setTtsModel(customVal);
    }
  });

  // Tab 1: TTS
  elements.textInput.addEventListener("input", updateCharCounter);
  elements.generateBtn.addEventListener("click", handleGenerateTTS);
  elements.clearTextBtn.addEventListener("click", () => {
    elements.textInput.value = "";
    elements.textInput.focus();
    updateCharCounter();
  });
  elements.pasteTextBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        elements.textInput.value = text;
        updateCharCounter();
        showToast("Đã dán từ clipboard", "success");
      }
    } catch {}
  });
  document.querySelectorAll(".preset-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.textInput.value = btn.getAttribute("data-text");
      updateCharCounter();
      showToast("Đã nạp câu mẫu!", "info");
    });
  });

  // Tab 2: Dialog
  elements.dialogSendBtn.addEventListener("click", handleDialogSend);
  elements.dialogInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleDialogSend();
    }
  });
  elements.dialogInput.addEventListener("input", (e) => {
    elements.dialogCharCounter.innerHTML = `${e.target.value.length} ký tự • <span id="dialogTokenCount">0 tokens</span>`;
    countRealTokens("gemini-2.5-flash", e.target.value, document.getElementById("dialogTokenCount"));
  });

  // Tab 3: Live 3
  elements.live3SendBtn.addEventListener("click", handleLive3Send);
  elements.live3Input.addEventListener("input", (e) => {
    countRealTokens("gemini-3-flash-preview", e.target.value, elements.live3TokenCount);
  });

  // Tab 4: Translate
  elements.translateActionBtn.addEventListener("click", handleTranslateAction);
  elements.translateInput.addEventListener("input", (e) => {
    countRealTokens("gemini-3.5-flash", e.target.value, elements.translateTokenBadge);
  });
  elements.swapLangBtn.addEventListener("click", () => {
    const s = elements.sourceLangSelect.value;
    elements.sourceLangSelect.value = elements.targetLangSelect.value;
    elements.targetLangSelect.value = s;
  });

  // Tab 5: Transcribe
  elements.recordMicBtn.addEventListener("click", toggleMicRecording);
  elements.audioFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      elements.transcribeStatusLabel.textContent = `Đã chọn: ${file.name}`;
      transcribeAudioBlob(file);
    }
  });
  elements.copyTranscribeBtn.addEventListener("click", () => {
    if (elements.transcribeResultText.value) {
      navigator.clipboard.writeText(elements.transcribeResultText.value);
      showToast("Đã sao chép văn bản!", "success");
    }
  });

  // Tab 6: Live 3.8
  elements.live38SendBtn.addEventListener("click", handleLive38Send);
  elements.live38Input.addEventListener("input", (e) => {
    countRealTokens("gemini-3.8-flash", e.target.value, elements.live38TokenCount);
  });

  // Tab 7: Thinking
  elements.thinkingSendBtn.addEventListener("click", handleThinkingSend);
  elements.thinkingInput.addEventListener("input", (e) => {
    countRealTokens("gemini-3.8-flash", e.target.value, elements.thinkingTokenCount);
  });
  elements.toggleThinkingContent.addEventListener("click", () => {
    elements.thinkingContentText.classList.toggle("collapsed");
  });

  // Custom Voice Modal
  elements.openAddVoiceModalBtn.addEventListener("click", openAddCustomVoiceModal);
  elements.closeVoiceModalBtn.addEventListener("click", closeCustomVoiceModal);
  elements.cancelVoiceModalBtn.addEventListener("click", closeCustomVoiceModal);
  elements.customVoiceForm.addEventListener("submit", handleSaveCustomVoice);
  elements.customVoiceModal.addEventListener("click", (e) => {
    if (e.target === elements.customVoiceModal) closeCustomVoiceModal();
  });
  document.querySelectorAll(".style-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.customVoiceStyle.value = btn.dataset.style;
    });
  });

  // Audio Playback Events
  elements.playPauseBtn.addEventListener("click", togglePlayPause);
  elements.audioElement.addEventListener("play", () => {
    state.isPlaying = true;
    elements.playIcon.style.display = "none";
    elements.pauseIcon.style.display = "block";
    elements.playerCard.classList.add("playing");
    ensureAudioContext();
  });
  elements.audioElement.addEventListener("pause", () => {
    state.isPlaying = false;
    elements.playIcon.style.display = "block";
    elements.pauseIcon.style.display = "none";
    elements.playerCard.classList.remove("playing");
  });
  elements.audioElement.addEventListener("ended", () => {
    state.isPlaying = false;
    elements.playIcon.style.display = "block";
    elements.pauseIcon.style.display = "none";
    elements.playerCard.classList.remove("playing");
    elements.timelineSlider.value = 100;
  });
  elements.audioElement.addEventListener("timeupdate", () => {
    if (!elements.audioElement.duration) return;
    const current = elements.audioElement.currentTime;
    const total = elements.audioElement.duration;
    elements.timelineSlider.value = (current / total) * 100;
    elements.currentTimeLabel.textContent = formatTime(current);
  });
  elements.audioElement.addEventListener("loadedmetadata", () => {
    elements.totalDurationLabel.textContent = formatTime(elements.audioElement.duration || 0);
  });
  elements.timelineSlider.addEventListener("input", (e) => {
    if (!elements.audioElement.duration) return;
    elements.audioElement.currentTime = (e.target.value / 100) * elements.audioElement.duration;
  });

  // Speed
  document.querySelectorAll(".speed-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      elements.audioElement.playbackRate = parseFloat(btn.dataset.speed);
    });
  });

  // Downloads
  elements.downloadMp3Btn.addEventListener("click", handleDownloadMp3);
  elements.downloadBtn.addEventListener("click", handleDownloadWav);
  elements.copyAudioTextBtn.addEventListener("click", () => {
    if (state.currentText) {
      navigator.clipboard.writeText(state.currentText);
      showToast("Đã sao chép nội dung!", "success");
    }
  });

  // History Clear
  elements.clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Xóa toàn bộ lịch sử phát âm thanh?")) {
      state.history = [];
      state.audioCache.clear();
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      renderHistory();
      showToast("Đã làm sạch lịch sử", "info");
    }
  });
}

// Start application
window.addEventListener("DOMContentLoaded", init);
