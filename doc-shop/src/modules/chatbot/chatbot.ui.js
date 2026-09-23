/**
 * Chatbot UI Component
 */
import { ChatbotService } from "../../services/chatbot.service.js";
import { chatbotState } from "./chatbot.state.js";
import { safe } from "../../utils/sanitize.js";

const QUICK_HINTS = ["Nạp tiền", "Mua tài liệu", "Lỗi key", "Chia sẻ link"];

export const initChatbotUI = () => {
  // Inject launcher and panel into DOM if not present
  if (!document.getElementById("chatbot-launcher")) {
    const launcher = document.createElement("button");
    launcher.id = "chatbot-launcher";
    launcher.className = "fixed bottom-5 right-5 z-40 w-13 h-13 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-600/30 flex items-center justify-center transition-transform hover:scale-105";
    launcher.setAttribute("aria-label", "Mở trợ lý ảo");
    launcher.innerHTML = '<i class="fas fa-headset text-lg"></i>';
    document.body.appendChild(launcher);
  }

  if (!document.getElementById("chatbot-panel")) {
    const panel = document.createElement("div");
    panel.id = "chatbot-panel";
    panel.className = "fixed bottom-20 right-5 z-40 w-[min(92vw,380px)] max-h-[72vh] hidden";
    panel.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col min-h-0 animate-popup">
        <!-- Header -->
        <div class="p-4 bg-gradient-to-r from-primary-700 to-primary-600 text-white flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <p class="font-bold text-sm leading-tight">Trợ lý DkDocShop</p>
              <p class="text-[11px] text-primary-100">Hỗ trợ nạp tiền, tài liệu, key lỗi</p>
            </div>
          </div>
          <button type="button" id="chatbot-close-btn" class="text-white/80 hover:text-white p-1" aria-label="Đóng chat">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Message History -->
        <div id="chatbot-messages-box" class="p-4 space-y-3 overflow-y-auto bg-gray-50 flex-1 min-h-0 max-h-[48vh]"></div>

        <!-- Input Area -->
        <div class="p-3 border-t border-gray-100 bg-white">
          <div class="flex gap-2">
            <input
              type="text"
              id="chatbot-msg-input"
              placeholder="Nhập câu hỏi hoặc mã key..."
              class="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            />
            <button
              type="button"
              id="chatbot-send-btn"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  const launcher = document.getElementById("chatbot-launcher");
  const panel = document.getElementById("chatbot-panel");
  const closeBtn = document.getElementById("chatbot-close-btn");
  const sendBtn = document.getElementById("chatbot-send-btn");
  const input = document.getElementById("chatbot-msg-input");

  const toggleChat = () => {
    panel.classList.toggle("hidden");
    const isHidden = panel.classList.contains("hidden");
    chatbotState.isOpen = !isHidden;

    if (!isHidden) {
      const messagesBox = document.getElementById("chatbot-messages-box");
      if (!messagesBox.childElementCount) {
        appendMessage("Xin chào! Mình là trợ lý thông minh của DkDocShop. Mình có thể giúp gì cho bạn hôm nay?", "bot");
        appendSuggestions();
      }
      setTimeout(() => input?.focus(), 100);
    }
  };

  launcher?.addEventListener("click", toggleChat);
  closeBtn?.addEventListener("click", () => panel.classList.add("hidden"));

  const sendMessage = async () => {
    const text = input?.value?.trim();
    if (!text) return;

    appendMessage(text, "user");
    chatbotState.addMessage("user", text);
    input.value = "";

    const messagesBox = document.getElementById("chatbot-messages-box");
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "bg-white text-gray-400 text-xs px-3 py-2 rounded-2xl w-fit shadow-xs border border-gray-100 flex items-center gap-1";
    typingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin text-[10px]"></i> Đang kiểm tra...';
    messagesBox.appendChild(typingIndicator);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      const reply = await ChatbotService.answer(text, chatbotState.getHistory());
      typingIndicator.remove();
      appendMessage(reply, "bot");
      chatbotState.addMessage("assistant", reply);
    } catch (err) {
      typingIndicator.remove();
      appendMessage("Rất tiếc, mình gặp sự cố khi xử lý câu hỏi này. Bạn hãy thử lại sau ít phút nhé.", "bot");
    }
  };

  sendBtn?.addEventListener("click", sendMessage);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
};

const appendMessage = (text, sender = "bot") => {
  const box = document.getElementById("chatbot-messages-box");
  if (!box) return;

  const div = document.createElement("div");
  if (sender === "bot") {
    div.className = "bg-white text-gray-800 text-xs p-3 rounded-2xl shadow-xs border border-gray-100 whitespace-pre-wrap leading-relaxed max-w-[90%]";
  } else {
    div.className = "bg-primary-600 text-white text-xs p-3 rounded-2xl shadow-xs ml-auto max-w-[85%] whitespace-pre-wrap leading-relaxed";
  }

  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
};

const appendSuggestions = () => {
  const box = document.getElementById("chatbot-messages-box");
  if (!box || document.getElementById("chatbot-quick-suggestions")) return;

  const wrap = document.createElement("div");
  wrap.id = "chatbot-quick-suggestions";
  wrap.className = "bg-white p-3 rounded-2xl shadow-xs border border-gray-100 text-xs space-y-2";
  wrap.innerHTML = `
    <p class="text-[11px] font-semibold text-gray-400">Gợi ý câu hỏi nhanh:</p>
    <div class="flex flex-wrap gap-1.5">
      ${QUICK_HINTS.map(
        (hint) => `
        <button
          type="button"
          class="chat-hint-btn px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition"
          data-hint="${safe(hint)}"
        >
          ${safe(hint)}
        </button>
      `,
      ).join("")}
    </div>
  `;

  wrap.querySelectorAll(".chat-hint-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("chatbot-msg-input");
      if (input) {
        input.value = btn.dataset.hint;
        document.getElementById("chatbot-send-btn")?.click();
      }
    });
  });

  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
};
