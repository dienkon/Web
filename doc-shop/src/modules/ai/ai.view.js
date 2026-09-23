/**
 * DkAI Educational Learning Studio View (Section AL, AV, AW, AX, BE)
 * Powered by Gemini (gemini-3.5-flash-lite) + KaTeX + DOMPurify
 */
import { store } from "../../app/state.js";
import { escapeHtml } from "../../utils/sanitize.js";
import { aiService } from "../../services/ai.service.js";
import { notesService } from "../../services/notes.service.js";
import { flashcardService } from "../../services/flashcard.service.js";
import { toast } from "../../components/toast.js";
import { renderAIResponse } from "../../ai/renderer.js";

export function renderAIView(container) {
  let selectedMode = "tutor";
  let selectedSubject = "Toán Học";
  let selectedGrade = "12";
  let attachedFile = null; // { name, size, mimeType, base64, previewUrl }
  let isLoading = false;

  let messages = [
    {
      id: "msg-welcome",
      role: "ai",
      text: `### 👋 Chào bạn! Mình là DkAI\n\nTrợ lý học tập thông minh của bạn. Mình có thể giúp bạn:\n* **Giải bài tập chi tiết từng bước** với công thức toán học LaTeX chuẩn xác.\n* **Giải thích bản chất lý thuyết** và công thức khó nhớ.\n* **Tóm tắt tài liệu & bài giảng** ngắn gọn, trọng tâm.\n* **Tự động tạo bộ thẻ Flashcard** ghi nhớ kiến thức nhanh.\n\n*Bạn hãy chọn chế độ và nhập câu hỏi, hoặc đính kèm ảnh đề bài/file PDF bên dưới nhé!*`,
      timestamp: Date.now(),
    }
  ];

  const quickPrompts = [
    { label: "📐 Khảo sát hàm số bậc 3", mode: "solver", text: "Khảo sát và vẽ đồ thị hàm số y = x^3 - 3x^2 + 2, tìm các điểm cực trị." },
    { label: "⚡ Định luật Ohm toàn mạch", mode: "tutor", text: "Giải thích định luật Ohm cho toàn mạch và nêu công thức tính hiệu suất nguồn điện." },
    { label: "🧪 Cân bằng phản ứng Oxi hóa - Khử", mode: "solver", text: "Hướng dẫn các bước cân bằng phản ứng oxi hóa khử bằng phương pháp thăng bằng electron." },
    { label: "📋 Tóm tắt Công thức Lượng giác 11", mode: "summary", text: "Tóm tắt các công thức lượng giác cơ bản, công thức cộng, công thức nhân đôi lớp 11." },
    { label: "🧠 Tạo thẻ từ vựng IELTS chủ đề Education", mode: "flashcards", text: "Tạo 5 thẻ flashcard từ vựng IELTS học thuật chủ đề Education kèm ví dụ." },
  ];

  function render() {
    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6 fade-in pb-16">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center text-2xl shadow-sm">
              🤖
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">DkAI Learning Studio</h1>
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  gemini-3.5-flash-lite
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">Trợ lý gia sư giải đáp học tập, công thức Toán - Lý - Hóa với LaTeX chuẩn xác</p>
            </div>
          </div>

          <div class="flex items-center gap-2.5">
            <select id="ai-subject-select" class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-emerald-500">
              <option value="Toán Học" ${selectedSubject === "Toán Học" ? "selected" : ""}>📐 Toán Học</option>
              <option value="Vật Lý" ${selectedSubject === "Vật Lý" ? "selected" : ""}>⚡ Vật Lý</option>
              <option value="Hóa Học" ${selectedSubject === "Hóa Học" ? "selected" : ""}>🧪 Hóa Học</option>
              <option value="Sinh Học" ${selectedSubject === "Sinh Học" ? "selected" : ""}>🧬 Sinh Học</option>
              <option value="Tiếng Anh" ${selectedSubject === "Tiếng Anh" ? "selected" : ""}>🇬🇧 Tiếng Anh</option>
              <option value="Ngữ Văn" ${selectedSubject === "Ngữ Văn" ? "selected" : ""}>📖 Ngữ Văn</option>
              <option value="Tin Học" ${selectedSubject === "Tin Học" ? "selected" : ""}>💻 Tin Học</option>
            </select>

            <select id="ai-grade-select" class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-emerald-500">
              <option value="10" ${selectedGrade === "10" ? "selected" : ""}>Lớp 10</option>
              <option value="11" ${selectedGrade === "11" ? "selected" : ""}>Lớp 11</option>
              <option value="12" ${selectedGrade === "12" ? "selected" : ""}>Lớp 12 - Ôn Thi THPT</option>
              <option value="ĐH" ${selectedGrade === "ĐH" ? "selected" : ""}>Đại học / Cao đẳng</option>
            </select>
          </div>
        </div>

        <!-- Mode Selector Chips -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          ${aiService.modes.map(m => `
            <button data-mode="${m.id}" class="p-3 rounded-2xl border text-center transition-all cursor-pointer ${selectedMode === m.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20' : 'bg-white text-gray-700 border-gray-200/80 hover:border-emerald-300 hover:bg-gray-50/50'}">
              <div class="text-xl mb-1">${m.icon}</div>
              <div class="text-xs font-bold">${escapeHtml(m.label)}</div>
              <div class="text-[10px] opacity-80 mt-0.5 truncate">${escapeHtml(m.desc)}</div>
            </button>
          `).join("")}
        </div>

        <!-- Quick Prompts Pills -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span class="text-gray-400 text-[11px] font-medium shrink-0">💡 Gợi ý nhanh:</span>
          ${quickPrompts.map((p, idx) => `
            <button data-quick-prompt="${idx}" class="shrink-0 px-3 py-1.5 rounded-full bg-white border border-gray-200/80 text-gray-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 text-[11px] font-medium transition-colors">
              ${p.label}
            </button>
          `).join("")}
        </div>

        <!-- Chat Conversation Area -->
        <div class="bg-white rounded-3xl border border-gray-200/80 shadow-xs flex flex-col h-[560px] overflow-hidden">
          <div id="ai-chat-messages" class="flex-1 p-6 overflow-y-auto space-y-5">
            ${messages.map((msg, index) => `
              <div class="flex items-start gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
                ${msg.role === 'ai' ? `
                  <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    🤖
                  </div>
                ` : ''}

                <div class="max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none shadow-xs' : 'bg-gray-50/80 border border-gray-200/80 text-gray-800 rounded-tl-none shadow-xs space-y-3'}">
                  ${msg.attachmentName ? `
                    <div class="mb-2 p-2 rounded-xl bg-white/10 border border-white/20 text-[11px] flex items-center gap-2">
                      <span>📎</span>
                      <span class="truncate font-semibold">${escapeHtml(msg.attachmentName)}</span>
                    </div>
                  ` : ''}

                  <div class="ai-content-body">
                    ${msg.role === 'ai' ? renderAIResponse(msg.text) : `<div class="whitespace-pre-wrap">${escapeHtml(msg.text)}</div>`}
                  </div>

                  ${msg.role === 'ai' && msg.id !== 'msg-welcome' ? `
                    <div class="pt-3 border-t border-gray-200/70 flex flex-wrap items-center gap-3">
                      <button data-action="copy-response" data-index="${index}" class="text-[11px] text-gray-600 hover:text-emerald-600 font-semibold flex items-center gap-1 transition-colors">
                        <span>📋</span> Sao chép lời giải
                      </button>
                      <button data-action="save-ai-note" data-index="${index}" class="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors">
                        <span>📝</span> Lưu vào Ghi chú
                      </button>
                      <button data-action="create-flashcard" data-index="${index}" class="text-[11px] text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 transition-colors">
                        <span>🧠</span> Tạo thẻ Flashcard
                      </button>
                    </div>
                  ` : ''}
                </div>

                ${msg.role === 'user' ? `
                  <div class="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                    👤
                  </div>
                ` : ''}
              </div>
            `).join("")}

            ${isLoading ? `
              <div class="flex items-start gap-3.5">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  🤖
                </div>
                <div class="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 text-xs text-gray-600 flex items-center gap-3">
                  <div class="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>DkAI đang suy nghĩ, tính toán công thức và tổng hợp câu trả lời...</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- File Attachment Preview Pill (if selected) -->
          ${attachedFile ? `
            <div class="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
              <div class="flex items-center gap-2 truncate">
                <span>📎</span>
                <span class="font-semibold truncate">${escapeHtml(attachedFile.name)}</span>
                <span class="text-[10px] text-emerald-600">(${(attachedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button id="remove-attachment-btn" class="p-1 hover:bg-emerald-100 rounded-md text-emerald-700 font-bold transition-colors">
                ✕
              </button>
            </div>
          ` : ''}

          <!-- Input Controls -->
          <div class="p-4 border-t border-gray-200/80 bg-gray-50/40">
            <form id="ai-form" class="flex items-center gap-2.5">
              <input type="file" id="ai-file-input" class="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" />
              <button type="button" id="trigger-file-btn" class="p-3 bg-white border border-gray-200/80 hover:border-emerald-300 text-gray-600 hover:text-emerald-600 rounded-2xl transition-colors cursor-pointer" title="Đính kèm ảnh đề bài hoặc tài liệu PDF">
                📎
              </button>

              <input
                id="ai-input"
                type="text"
                placeholder="${getPlaceholder(selectedMode)}"
                class="flex-1 px-4 py-3 bg-white border border-gray-200/80 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-2xs"
                autocomplete="off"
              />

              <button
                type="submit"
                ${isLoading ? "disabled" : ""}
                class="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Gửi</span>
                <span>🚀</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function getPlaceholder(mode) {
    switch (mode) {
      case "solver":
        return "Nhập đề bài toán, lý, hóa... hoặc công thức cần giải chi tiết (hoặc đính kèm ảnh)...";
      case "summary":
        return "Dán đoạn văn bản hoặc nội dung tài liệu cần tóm tắt trọng tâm...";
      case "flashcards":
        return "Nhập chủ đề kiến thức để DkAI tự động tạo bộ thẻ ghi nhớ Flashcard...";
      case "qa":
        return "Đặt câu hỏi chuyên sâu về kiến thức học tập...";
      default:
        return "Nhập câu hỏi, khái niệm hoặc định lý cần DkAI giải thích... (Enter để gửi)";
    }
  }

  function bindEvents() {
    // Mode switcher
    container.querySelectorAll("[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedMode = btn.dataset.mode;
        render();
      });
    });

    // Subject select
    container.querySelector("#ai-subject-select")?.addEventListener("change", (e) => {
      selectedSubject = e.target.value;
    });

    // Grade select
    container.querySelector("#ai-grade-select")?.addEventListener("change", (e) => {
      selectedGrade = e.target.value;
    });

    // Quick prompts
    container.querySelectorAll("[data-quick-prompt]").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = quickPrompts[parseInt(btn.dataset.quickPrompt, 10)];
        if (p) {
          selectedMode = p.mode;
          const input = container.querySelector("#ai-input");
          if (input) {
            input.value = p.text;
            input.focus();
          }
          render();
        }
      });
    });

    // File input trigger
    const fileInput = container.querySelector("#ai-file-input");
    const triggerFileBtn = container.querySelector("#trigger-file-btn");
    triggerFileBtn?.addEventListener("click", () => {
      fileInput?.click();
    });

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước file không được vượt quá 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result.split(",")[1];
        attachedFile = {
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          base64,
        };
        toast.info(`Đã đính kèm: ${file.name}`);
        render();
      };
      reader.readAsDataURL(file);
    });

    // Remove attachment
    container.querySelector("#remove-attachment-btn")?.addEventListener("click", () => {
      attachedFile = null;
      render();
    });

    // Chat submit
    container.querySelector("#ai-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = container.querySelector("#ai-input");
      const text = input?.value.trim() || "";

      if ((!text && !attachedFile) || isLoading) return;

      const userMsg = {
        id: `msg-${Date.now()}`,
        role: "user",
        text: text || "Phân tích file đính kèm này giúp mình nhé!",
        attachmentName: attachedFile ? attachedFile.name : null,
        timestamp: Date.now(),
      };

      const fileToSend = attachedFile;
      attachedFile = null;
      messages.push(userMsg);
      isLoading = true;
      render();

      const chatContainer = container.querySelector("#ai-chat-messages");
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

      try {
        const responseText = await aiService.askAI({
          prompt: text,
          mode: selectedMode,
          subject: `${selectedSubject} - Lớp ${selectedGrade}`,
          fileAttachment: fileToSend,
        });

        messages.push({
          id: `ai-${Date.now()}`,
          role: "ai",
          text: responseText,
          timestamp: Date.now(),
        });
      } catch (err) {
        messages.push({
          id: `ai-err-${Date.now()}`,
          role: "ai",
          text: `⚠️ **Rất tiếc!** ${err.message || "Không thể kết nối đến máy chủ DkAI lúc này. Vui lòng kiểm tra lại kết nối mạng."}`,
          timestamp: Date.now(),
        });
      } finally {
        isLoading = false;
        render();
        const chatBox = container.querySelector("#ai-chat-messages");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }
    });

    // Actions on AI response
    container.querySelectorAll('[data-action="copy-response"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        const msg = messages[idx];
        if (msg && msg.text) {
          navigator.clipboard.writeText(msg.text).then(() => {
            toast.success("Đã sao chép nội dung vào bộ nhớ tạm!");
          }).catch(() => {
            toast.info("Vui lòng cho phép quyền truy cập bộ nhớ tạm.");
          });
        }
      });
    });

    container.querySelectorAll('[data-action="save-ai-note"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        const msg = messages[idx];
        if (msg && msg.text) {
          notesService.saveNote({
            title: `Ghi chú DkAI: ${selectedSubject}`,
            text: msg.text,
            color: "emerald",
            tags: ["DkAI", selectedSubject, `Lớp ${selectedGrade}`],
          });
          toast.success("Đã lưu lời giải vào Sổ tay ghi chú!");
        }
      });
    });

    container.querySelectorAll('[data-action="create-flashcard"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.index, 10);
        const msg = messages[idx];
        if (msg && msg.text) {
          // Extract first heading or prompt
          const cardFront = `Kiến thức: ${selectedSubject} (DkAI)`;
          const cardBack = msg.text.slice(0, 300) + (msg.text.length > 300 ? "..." : "");

          const deck = flashcardService.createDeck({
            title: `DkAI Deck - ${selectedSubject}`,
            subject: selectedSubject,
            color: "#10b981",
          });
          flashcardService.addCard(deck.id, { front: cardFront, back: cardBack });
          toast.success("Đã tạo bộ thẻ Flashcard thành công!");
        }
      });
    });
  }

  render();
}

