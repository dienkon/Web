import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  Maximize2,
  FileText,
  Copy,
  Check,
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

interface AiTutorChatProps {
  examTitle?: string;
  currentQuestionText?: string;
  studentAnswer?: any;
  autoPrompt?: string | null;
  onClearAutoPrompt?: () => void;
}

export default function AiTutorChat({
  examTitle,
  currentQuestionText,
  studentAnswer,
  autoPrompt,
  onClearAutoPrompt,
}: AiTutorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Chào bạn! Mình là **Gia sư AI DkTEST** 🎓.\n\nBạn có thể hỏi bất kỳ câu hỏi nào, hoặc **tải ảnh bài tập / dán ảnh (Ctrl + V)** lên để mình giải đáp chi tiết nhé!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Handle autoPrompt when user clicks "Hỏi AI câu này"
  useEffect(() => {
    if (autoPrompt) {
      setIsOpen(true);
      sendCustomPrompt(autoPrompt);
      if (onClearAutoPrompt) onClearAutoPrompt();
    }
  }, [autoPrompt]);

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

  const sendCustomPrompt = async (promptText: string, attachedFile?: Attachment | null) => {
    const fileToSend = attachedFile !== undefined ? attachedFile : pendingAttachment;
    if ((!promptText.trim() && !fileToSend) || isTyping) return;

    const defaultPrompt = fileToSend
      ? "Em gửi hình ảnh / tệp bài tập này, Gia sư AI hãy đọc kĩ đề bài và hướng dẫn giải chi tiết giúp em nhé!"
      : "";
    const userMessage = promptText.trim() || defaultPrompt;

    const userMsg: Message = {
      role: "user",
      text: userMessage,
      attachment: fileToSend || undefined,
    };

    const newMessages: Message[] = [...messages, userMsg];
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
            examTitle,
            currentQuestionText,
            studentAnswer,
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
                    return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + data.text }];
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
      console.error("[AiTutorChat Error]:", err);
      const msg = err.message || "";
      let friendlyError = "Xin lỗi, đã xảy ra lỗi khi kết nối với Gia sư AI. Vui lòng kiểm tra khóa API hoặc kết nối mạng.";
      if (msg.includes("API key") || msg.includes("403") || msg.includes("UNAUTHENTICATED")) {
        friendlyError = "⚠️ Khóa Gemini API không hợp lệ. Bạn vui lòng vào trang Gia sư AI chính để cập nhật API Key.";
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
    const text = input.trim();
    setInput("");
    sendCustomPrompt(text, pendingAttachment);
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/30 hover:scale-105 transition-all z-50 group cursor-pointer"
          title="Hỏi Gia sư AI (Hỗ trợ ảnh bài tập)"
        >
          <Sparkles className="w-6 h-6 group-hover:hidden" />
          <MessageCircle className="w-6 h-6 hidden group-hover:block" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 px-4 py-3 flex items-center justify-between text-white shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xs">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Gia sư AI DkTEST</h3>
                <p className="text-[10px] text-indigo-100">Hỗ trợ nhận diện ảnh đề bài & LaTeX</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                    msg.role === "user" ? "bg-slate-200 text-slate-700" : "bg-gradient-to-tr from-indigo-600 to-blue-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs font-medium shadow-md"
                      : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs leading-relaxed"
                  }`}
                >
                  {/* Attachment Preview */}
                  {msg.attachment && (
                    <div className="mb-2">
                      {msg.attachment.type.startsWith("image/") ? (
                        <div className="relative group/mini cursor-pointer" onClick={() => setLightboxImage(msg.attachment?.data || null)}>
                          <img
                            src={msg.attachment.data}
                            alt={msg.attachment.name}
                            className="max-h-48 max-w-full rounded-xl border border-black/10 shadow-xs object-contain"
                          />
                          <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover/mini:opacity-100 flex items-center justify-center text-white transition text-[10px] font-bold gap-1">
                            <Maximize2 className="w-3 h-3" />
                            <span>Phóng to</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 ${msg.role === "user" ? "bg-white/20" : "bg-indigo-50 text-indigo-900 border border-indigo-100"}`}>
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
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

                  {/* Copy Button */}
                  {msg.role === "model" && msg.text && (
                    <div className="mt-2 pt-1 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold pl-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gia sư AI đang viết câu trả lời...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachment Preview */}
          {pendingAttachment && (
            <div className="px-3 pt-2 pb-1.5 bg-indigo-50/90 border-t border-indigo-100 flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 truncate">
                {pendingAttachment.type.startsWith("image/") ? (
                  <img
                    src={pendingAttachment.data}
                    alt="Preview"
                    className="w-9 h-9 rounded-lg object-cover border border-indigo-200 shrink-0"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
                <span className="truncate text-slate-700 font-semibold text-[11px]">{pendingAttachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                title="Bỏ tệp"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-1.5">
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
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title="Gửi ảnh bài tập hoặc tệp (PDF, Word, TXT)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder={pendingAttachment ? "Nhập câu hỏi kèm tệp này..." : "Hỏi AI hoặc dán ảnh (Ctrl + V)..."}
              value={input}
              onPaste={handlePaste}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && !pendingAttachment) || isTyping}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
              title="Gửi"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white bg-white/10 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Bài tập"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/20"
            />
          </div>
        </div>
      )}
    </>
  );
}
