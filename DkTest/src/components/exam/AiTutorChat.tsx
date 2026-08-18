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
}

export default function AiTutorChat({ examTitle, currentQuestionText, studentAnswer }: AiTutorChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Chào bạn! Mình là Gia sư AI DkTEST. Bạn cần hỗ trợ gì về bài thi này?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", text: userMessage }];
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
          }
        }),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorBody = await response.json();
          detail = errorBody?.error ? `: ${errorBody.error}` : "";
        } catch {
          // Ignore non-JSON error responses.
        }
        throw new Error(`API ${response.status}${detail}`);
      }

      if (!response.body) throw new Error("No readable stream");

      // Set up streaming response
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
                      { ...lastMsg, text: lastMsg.text + data.text }
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
      setMessages((prev) => [...prev, { role: "model", text: "Xin lỗi, đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xs hover:bg-indigo-700 hover:scale-105 transition-all z-50 animate-bounce group"
          title="Hỏi Gia sư AI"
        >
          <Sparkles className="w-6 h-6 group-hover:hidden" />
          <MessageCircle className="w-6 h-6 hidden group-hover:block" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xs border border-indigo-100 flex flex-col z-50 overflow-hidden flex-shrink-0 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Gia sư AI</h3>
                <p className="text-[10px] text-indigo-200">Hỗ trợ giải đáp & học tập</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-600"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user" 
                    ? "bg-indigo-600 text-white rounded-tr-sm" 
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-xs"
                }`}>
                  {msg.role === "model" ? (
                    <LatexPreview content={msg.text} />
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Hỏi AI về câu này..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 min-h-[44px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {currentQuestionText && (
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                AI đã biết bạn đang xem câu hỏi nào.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
