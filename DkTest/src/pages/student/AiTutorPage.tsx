import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  Maximize2,
  Trash2,
  Key,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  Download,
  AlertCircle,
} from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Attachment {
  name: string;
  type: string;
  data: string; // base64 data url
  size?: number;
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
      text: "Chào bạn! Mình là **Gia sư AI DkTEST** 🎓.\n\nMình có thể hỗ trợ bạn:\n- **Đọc & giải bài tập từ ảnh chụp / tệp tài liệu**: Bạn có thể chụp ảnh đề bài, bài giải viết tay, tài liệu PDF/Word rồi bấm tải lên hoặc **nhấn Ctrl + V để dán ảnh trực tiếp**.\n- Giải chi tiết với công thức toán học LaTeX chuẩn xác $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.\n- Vẽ **bảng biến thiên, bảng xét dấu, bảng so sánh & phân loại** trực quan.\n- Cung cấp khung mã nguồn Discord và mẹo giải nhanh hiệu quả.\n\nBạn có bài tập nào cần giải đáp không?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => {
    return localStorage.getItem("dktest_gemini_api_key") || "";
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Optimize & convert file to Base64 (compressing large camera images to max 2048px)
  const processFile = useCallback((file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert("Kích thước tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 25MB.");
      return;
    }

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawBase64 = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 2048;
          let width = img.width;
          let height = img.height;

          // Downscale if oversized to speed up upload & prevent browser memory overload
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const optimizedBase64 = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
              setPendingAttachment({
                name: file.name,
                type: file.type || "image/jpeg",
                data: optimizedBase64,
                size: Math.round(optimizedBase64.length * 0.75),
              });
              return;
            }
          }

          setPendingAttachment({
            name: file.name,
            type: file.type || "image/jpeg",
            data: rawBase64,
            size: file.size,
          });
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF, Word (.docx), or Text files
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingAttachment({
          name: file.name,
          type: file.type || "application/octet-stream",
          data: e.target?.result as string,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Support pasting images directly from clipboard (e.g. Snipping Tool / Screenshot)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const sendUserMessage = async (textToSend: string, attachedFile?: Attachment | null) => {
    const fileToSend = attachedFile !== undefined ? attachedFile : pendingAttachment;
    if ((!textToSend.trim() && !fileToSend) || isTyping) return;

    const defaultPrompt = fileToSend
      ? "Em gửi hình ảnh / tài liệu bài tập này, Gia sư AI hãy đọc kĩ đề bài và hướng dẫn giải chi tiết giúp em nhé!"
      : "";
    const userMessage = textToSend.trim() || defaultPrompt;

    setInput("");
    setPendingAttachment(null);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", text: userMessage, attachment: fileToSend || undefined },
    ];
    setMessages(newMessages);
    setIsTyping(true);

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
            examTitle: "Trò chuyện trực tiếp cùng Gia sư AI",
          },
        }),
      });

      if (!response.ok) {
        let errMessage = "Lỗi kết nối AI";
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch (e) {}
        throw new Error(errMessage);
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
                } else if (data.type === "error" && data.message) {
                  throw new Error(data.message);
                }
              } catch (e: any) {
                if (e.message && !e.message.includes("JSON")) {
                  throw e;
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[AiTutorPage Error]:", err);
      const msg = err.message || "";
      let friendlyError = "Xin lỗi, đã xảy ra lỗi khi kết nối với Gia sư AI. Vui lòng kiểm tra lại kết nối hoặc khóa API.";
      if (msg.includes("API key") || msg.includes("403") || msg.includes("UNAUTHENTICATED")) {
        friendlyError = "⚠️ Khóa Gemini API không hợp lệ hoặc chưa được cấu hình. Bạn hãy bấm biểu tượng chìa khóa ở góc phải trên để nhập API Key cá nhân.";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: friendlyError,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if ((!input.trim() && !pendingAttachment) || isTyping) return;
    sendUserMessage(input, pendingAttachment);
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleResetChat = () => {
    if (window.confirm("Bạn có chắc chắn muốn làm mới toàn bộ cuộc trò chuyện với Gia sư AI?")) {
      setMessages([
        {
          role: "model",
          text: "Chào bạn! Mình là **Gia sư AI DkTEST** 🎓. Mình đã sẵn sàng hỗ trợ bạn giải bài tập mới. Hãy nhập câu hỏi hoặc gửi ảnh bài tập nhé!",
        },
      ]);
      setPendingAttachment(null);
      setInput("");
    }
  };

  const handleSaveApiKey = () => {
    if (customKeyInput.trim()) {
      localStorage.setItem("dktest_gemini_api_key", customKeyInput.trim());
    } else {
      localStorage.removeItem("dktest_gemini_api_key");
    }
    setShowApiKeyModal(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const suggestions = [
    {
      label: "📸 Giải bài từ ảnh",
      text: "Hãy hướng dẫn em các bước tư duy giải bài tập trong hình ảnh đính kèm này.",
    },
    {
      label: "📊 Lập bảng biến thiên & xét dấu",
      text: "Hãy hướng dẫn mình cách lập bảng xét dấu cho tam thức bậc hai $f(x) = x^2 - 4x + 3$ với đầy đủ bảng và công thức.",
    },
    {
      label: "📐 Bảng công thức lượng giác",
      text: "Hãy lập bảng tóm tắt các công thức lượng giác cơ bản thường gặp trong bài thi.",
    },
    {
      label: "💻 Hướng dẫn thuật toán code",
      text: "Hãy hướng dẫn giải bài toán tìm ước chung lớn nhất (UCLN) bằng thuật toán Euclid kèm khối mã Python chuẩn.",
    },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="max-w-4xl mx-auto h-[calc(100vh-8.5rem)] min-h-[620px] flex flex-col bg-white rounded-3xl shadow-xs border border-indigo-100 overflow-hidden mt-3 relative"
    >
      {/* Drag overlay indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center mb-4 border border-white/30 shadow-lg">
            <UploadCloud className="w-8 h-8 text-amber-300 animate-bounce" />
          </div>
          <p className="text-lg font-black tracking-tight">Thả tệp hoặc ảnh vào đây</p>
          <p className="text-xs text-indigo-100 mt-1">Hỗ trợ ảnh JPG/PNG, tài liệu PDF, Word (.docx), tệp văn bản</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 px-5 sm:px-6 py-3.5 flex items-center justify-between text-white shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xs shadow-inner">
            <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-2">
              Gia sư AI DkTEST
              <span className="px-2 py-0.5 text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 rounded-full font-bold uppercase tracking-wider">
                Multimodal Vision
              </span>
            </h2>
            <p className="text-xs text-indigo-100 font-medium">Nhận diện ảnh chụp đề bài, KaTeX, Bảng biểu HTML & Khối mã Discord</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="p-2 text-indigo-100 hover:text-white hover:bg-white/15 rounded-xl transition cursor-pointer"
            title="Cài đặt khóa Gemini API"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetChat}
            className="p-2 text-indigo-100 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
            title="Làm mới đoạn chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
              className={`max-w-[88%] sm:max-w-[82%] rounded-3xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm relative group ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm shadow-md"
                  : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-sm shadow-xs overflow-hidden"
              }`}
            >
              {/* Attachment Preview in Message */}
              {msg.attachment && (
                <div className="mb-3">
                  {msg.attachment.type.startsWith("image/") ? (
                    <div className="relative inline-block group/img">
                      <img
                        src={msg.attachment.data}
                        alt={msg.attachment.name}
                        onClick={() => setLightboxImage(msg.attachment?.data || null)}
                        className="max-h-64 max-w-full rounded-2xl border border-black/10 shadow-sm object-contain cursor-pointer hover:opacity-95 transition bg-slate-900/5"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImage(msg.attachment?.data || null)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition cursor-pointer"
                        title="Xem ảnh cỡ lớn"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Phóng to</span>
                      </button>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-2xl flex items-center gap-3 ${msg.role === "user" ? "bg-white/15 border border-white/20" : "bg-indigo-50/80 border border-indigo-100"}`}>
                      {msg.attachment.name.endsWith(".docx") || msg.attachment.name.endsWith(".doc") ? (
                        <FileText className="w-6 h-6 text-blue-400 shrink-0" />
                      ) : msg.attachment.name.endsWith(".pdf") ? (
                        <FileText className="w-6 h-6 text-rose-400 shrink-0" />
                      ) : (
                        <FileCode className="w-6 h-6 text-emerald-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                        <p className={`text-[10px] ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                          {formatFileSize(msg.attachment.size)} • Tài liệu đính kèm
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              {msg.role === "model" ? (
                <div className="prose prose-slate max-w-none text-slate-800">
                  <LatexPreview content={msg.text} />
                </div>
              ) : msg.text.includes("```") || msg.text.includes("$") ? (
                <LatexPreview content={msg.text} className="text-white" />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</div>
              )}

              {/* Copy button for model responses */}
              {msg.role === "model" && msg.text && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopyText(msg.text, idx)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    title="Sao chép câu trả lời"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
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
              <span className="text-xs font-semibold text-slate-500">Gia sư đang phân tích dữ liệu & giải bài tập...</span>
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
      <div className="p-3.5 sm:p-4 bg-white border-t border-slate-100 shrink-0">
        {/* Pending Attachment Chip */}
        {pendingAttachment && (
          <div className="mb-2.5 px-3.5 py-2 bg-indigo-50/95 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs max-w-3xl mx-auto shadow-2xs animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2.5 truncate">
              {pendingAttachment.type.startsWith("image/") ? (
                <div className="relative group/preview cursor-pointer" onClick={() => setLightboxImage(pendingAttachment.data)}>
                  <img
                    src={pendingAttachment.data}
                    alt="Preview"
                    className="w-11 h-11 rounded-xl object-cover border border-indigo-200 shrink-0 shadow-2xs hover:opacity-90 transition"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover/preview:opacity-100 flex items-center justify-center text-white transition">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className="truncate min-w-0">
                <p className="truncate text-slate-800 font-bold text-xs">{pendingAttachment.name}</p>
                <p className="text-[10px] text-indigo-600 font-medium">
                  {formatFileSize(pendingAttachment.size)} • Sẵn sàng gửi đến Gia sư AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="text-slate-400 hover:text-red-500 p-1.5 rounded-xl hover:bg-white transition cursor-pointer"
              title="Bỏ tệp này"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="relative flex items-center max-w-3xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-2xl transition cursor-pointer shrink-0 mr-1.5"
            title="Tải ảnh bài tập hoặc tệp tài liệu (PDF, Word, TXT)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              pendingAttachment
                ? "Nhập câu hỏi cho tệp này hoặc nhấn Gửi để AI giải bài..."
                : "Hỏi Gia sư AI, dán ảnh (Ctrl + V) hoặc tải bài tập lên..."
            }
            className="w-full pl-4 pr-14 py-3 sm:py-3.5 bg-slate-100/80 border border-transparent focus:border-indigo-300 focus:bg-white rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none max-h-32 min-h-[48px] shadow-inner transition-all placeholder:text-slate-400"
            rows={1}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingAttachment) || isTyping}
            className="absolute right-2 w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-indigo-500/20 cursor-pointer"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Full-res Image Inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              title="Đóng"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Chi tiết bài tập"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}

      {/* API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 font-black">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base">Cấu hình Google Gemini API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Mặc định hệ thống sử dụng khóa API trên máy chủ. Nếu máy chủ chưa cấu hình hoặc bị giới hạn lượt gọi, bạn có thể nhập khóa Gemini API miễn phí của bạn để dùng không giới hạn.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gemini API Key (Bắt đầu bằng AIzaSy...):
              </label>
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="Dán Gemini API Key của bạn..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomKeyInput("");
                  localStorage.removeItem("dktest_gemini_api_key");
                  setShowApiKeyModal(false);
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Xóa khóa đã lưu
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md cursor-pointer"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
