import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles, Table, HelpCircle, BookOpen, Paperclip, Image as ImageIcon, X } from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Attachment {
  name: string;
  type: string;
  data: string; // base64 data url
}

interface Message {
  role: "user" | "model";
  text: string;
  attachment?: Attachment;
}

export default function AiTutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Chào bạn! Mình là **Gia sư AI DkTEST** 🎓.\n\nMình có thể hỗ trợ bạn:\n- Giải thích chi tiết các bài toán, lý thuyết với công thức LaTeX chuẩn xác $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.\n- Vẽ **bảng biến thiên, bảng xét dấu, bảng giá trị & so sánh** rõ ràng, trực quan.\n- **Nhận diện và phân tích ảnh bài tập, bài giải viết tay** bạn tải lên.\n- Hướng dẫn phương pháp tư duy và mẹo làm bài thi hiệu quả.\n\nBạn đang có câu hỏi hay bài tập nào cần giải đáp không?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Kích thước tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setPendingAttachment({
        name: file.name,
        type: file.type || "image/jpeg",
        data: base64Data,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendUserMessage = async (textToSend: string, attachedFile?: Attachment | null) => {
    if ((!textToSend.trim() && !attachedFile) || isTyping) return;

    const userMessage = textToSend.trim() || (attachedFile ? "Hãy phân tích hình ảnh/tệp đính kèm này giúp em." : "");
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { role: "user", text: userMessage, attachment: attachedFile || undefined },
    ];
    setMessages(newMessages);
    setIsTyping(true);
    setPendingAttachment(null);

    try {
      const customApiKey = localStorage.getItem("dktest_gemini_api_key") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey) headers["x-gemini-api-key"] = customApiKey;

      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: newMessages,
          context: {
            examTitle: "Trò chuyện trực tiếp cùng Gia sư",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Lỗi kết nối");
      }

      if (!response.body) throw new Error("No readable stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) => [...prev, { role: "model", text: "" }]);

      let done = false;
      let buffer = "";
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice("data: ".length).trim();
              if (dataStr === "[DONE]") break;
              try {
                const data = JSON.parse(dataStr);
                if (data.text) {
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, text: lastMsg.text + data.text },
                    ];
                  });
                }
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Xin lỗi, đã xảy ra lỗi khi kết nối với AI. Vui lòng kiểm tra khóa API hoặc thử lại sau." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    sendUserMessage(input);
  };

  const suggestions = [
    { label: "📊 Lập bảng xét dấu / bảng biến thiên", text: "Hãy hướng dẫn mình cách lập bảng xét dấu cho tam thức bậc hai $f(x) = x^2 - 4x + 3$ với đầy đủ bảng và công thức." },
    { label: "📐 Bảng công thức lượng giác", text: "Hãy lập bảng tóm tắt các công thức lượng giác cơ bản thường gặp trong bài thi." },
    { label: "💡 Mẹo rút gọn phân số", text: "Hướng dẫn mình các bước và mẹo để rút gọn phân số nhanh và chính xác." },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] min-h-[620px] flex flex-col bg-white rounded-3xl shadow-xs border border-indigo-100 overflow-hidden mt-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xs">
            <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2">
              Gia sư AI DkTEST
              <span className="px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full font-bold uppercase tracking-wider">
                LaTeX & Bảng Biểu
              </span>
            </h2>
            <p className="text-xs text-indigo-100 font-medium">Hỗ trợ định dạng HTML, bảng biểu trực quan và công thức Toán học chuẩn</p>
          </div>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/60">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                msg.role === "user" ? "bg-slate-200 text-slate-700" : "bg-gradient-to-tr from-indigo-600 to-blue-600 text-white"
              }`}
            >
              {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div
              className={`max-w-[88%] sm:max-w-[82%] rounded-3xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm shadow-md"
                  : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-sm shadow-xs overflow-hidden"
              }`}
            >
              {msg.attachment && (
                <div className="mb-2.5">
                  {msg.attachment.type.startsWith("image/") ? (
                    <img
                      src={msg.attachment.data}
                      alt={msg.attachment.name}
                      className="max-h-56 max-w-full rounded-2xl border border-white/20 shadow-xs object-contain"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-white/20 rounded-xl text-xs font-mono flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      <span className="truncate max-w-[220px]">{msg.attachment.name}</span>
                    </div>
                  )}
                </div>
              )}
              {msg.role === "model" ? (
                <div className="prose prose-slate max-w-none text-slate-800">
                  <LatexPreview content={msg.text} />
                </div>
              ) : msg.text.includes("```") || msg.text.includes("$") ? (
                <LatexPreview content={msg.text} className="text-white" />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl rounded-tl-sm px-5 py-3.5 shadow-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Gia sư đang soạn câu trả lời & render LaTeX...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length <= 2 && (
        <div className="px-4 sm:px-6 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 shrink-0">
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendUserMessage(sug.text)}
              disabled={isTyping}
              className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {sug.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        {pendingAttachment && (
          <div className="mb-2 px-3.5 py-2 bg-indigo-50/90 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 text-xs max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5 truncate">
              {pendingAttachment.type.startsWith("image/") ? (
                <img
                  src={pendingAttachment.data}
                  alt="Preview"
                  className="w-10 h-10 rounded-xl object-cover border border-indigo-200 shrink-0"
                />
              ) : (
                <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <span className="truncate text-slate-700 font-semibold text-xs">{pendingAttachment.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-white transition cursor-pointer"
              title="Bỏ đính kèm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative flex items-center max-w-3xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer shrink-0 mr-2"
            title="Tải ảnh hoặc tệp lên"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={pendingAttachment ? "Nhập câu hỏi kèm theo tệp này..." : "Nhập câu hỏi, bài tập hoặc yêu cầu vẽ bảng biểu..."}
            className="w-full pl-5 pr-14 py-3.5 sm:py-4 bg-slate-100/80 border border-transparent focus:border-indigo-300 focus:bg-white rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none max-h-32 min-h-[52px] shadow-inner transition-all placeholder:text-slate-400"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !pendingAttachment) || isTyping}
            className="absolute right-2.5 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-indigo-500/20 cursor-pointer"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
