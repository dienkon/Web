import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Message {
  role: "user" | "model";
  text: string;
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
    { role: "model", text: "Chào bạn! Mình là Gia sư AI DkTEST. Bạn cần hỗ trợ gì về bài thi này?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  const sendCustomPrompt = async (promptText: string) => {
    if (!promptText.trim() || isTyping) return;

    const newMessages: Message[] = [...messages, { role: "user", text: promptText.trim() }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        { role: "model", text: "Xin lỗi, đã xảy ra lỗi khi kết nối với Gia sư AI. Vui lòng thử lại sau." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput("");
    sendCustomPrompt(text);
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
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Gia sư AI DkTEST</h3>
                <p className="text-[10px] text-indigo-100">Giải thích đề thi & Tư vấn học tập</p>
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
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs font-medium"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs leading-relaxed"
                  }`}
                >
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

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập thắc mắc của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
