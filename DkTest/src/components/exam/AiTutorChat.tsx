import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Paperclip, Image as ImageIcon } from "lucide-react";
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
    { role: "model", text: "Chào bạn! Mình là Gia sư AI DkTEST. Bạn có thể hỏi câu hỏi hoặc tải ảnh bài tập lên để mình giải đáp nhé!" },
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

  // Handle autoPrompt when user clicks "Hỏi AI câu này"
  useEffect(() => {
    if (autoPrompt) {
      setIsOpen(true);
      sendCustomPrompt(autoPrompt);
      if (onClearAutoPrompt) onClearAutoPrompt();
    }
  }, [autoPrompt]);

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

  const sendCustomPrompt = async (promptText: string, attachedFile?: Attachment | null) => {
    if ((!promptText.trim() && !attachedFile) || isTyping) return;

    const userMsg: Message = {
      role: "user",
      text: promptText.trim() || (attachedFile ? "Hãy phân tích hình ảnh/tệp này giúp em." : ""),
      attachment: attachedFile || undefined,
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
        throw new Error("Lỗi kết nối AI");
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
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Xin lỗi, đã xảy ra lỗi khi kết nối với Gia sư AI. Vui lòng kiểm tra khóa API hoặc kết nối mạng." },
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

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all z-50 group cursor-pointer"
          title="Hỏi Gia sư AI"
        >
          <Sparkles className="w-6 h-6 group-hover:hidden" />
          <MessageCircle className="w-6 h-6 hidden group-hover:block" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Gia sư AI DkTEST</h3>
                <p className="text-[10px] text-indigo-100">Hỗ trợ bài thi & Phân tích ảnh bài tập</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-200 hover:text-white transition p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs font-medium"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs leading-relaxed"
                  }`}
                >
                  {msg.attachment && (
                    <div className="mb-2">
                      {msg.attachment.type.startsWith("image/") ? (
                        <img
                          src={msg.attachment.data}
                          alt={msg.attachment.name}
                          className="max-h-48 max-w-full rounded-xl border border-white/20 shadow-xs object-contain"
                        />
                      ) : (
                        <div className="px-2.5 py-1.5 bg-white/20 rounded-lg text-xs font-mono flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <LatexPreview content={msg.text} className={msg.role === "user" ? "text-white [&_*]:text-white" : "text-slate-800"} />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold pl-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gia sư AI đang viết câu trả lời...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachment Preview */}
          {pendingAttachment && (
            <div className="px-3 pt-2 pb-1 bg-indigo-50/80 border-t border-indigo-100 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                {pendingAttachment.type.startsWith("image/") ? (
                  <img
                    src={pendingAttachment.data}
                    alt="Preview"
                    className="w-9 h-9 rounded-lg object-cover border border-indigo-200 shrink-0"
                  />
                ) : (
                  <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span className="truncate text-slate-700 font-medium text-[11px]">{pendingAttachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                title="Bỏ đính kèm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
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
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer shrink-0"
              title="Gửi ảnh hoặc tệp đính kèm"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder={pendingAttachment ? "Nhập câu hỏi về tệp này..." : "Nhập thắc mắc của bạn..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && !pendingAttachment) || isTyping}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
