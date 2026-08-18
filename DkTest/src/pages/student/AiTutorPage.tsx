import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import LatexPreview from "../../features/exam-builder/editor/LatexPreview";

interface Message {
  role: "user" | "model";
  text: string;
}

export default function AiTutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Chào bạn! Mình là Gia sư AI DkTEST. Bạn cần hỗ trợ gì về các môn học hoặc bài thi không?" }
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
            examTitle: "Trò chuyện trực tiếp cùng Gia sư",
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] min-h-[600px] flex flex-col bg-white rounded-3xl shadow-xs border border-indigo-100 overflow-hidden mt-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Gia sư AI DkTEST</h2>
            <p className="text-sm text-indigo-100">Luôn sẵn sàng giải đáp thắc mắc của bạn</p>
          </div>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-600 shadow-sm"
            }`}>
              {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm ${
              msg.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-sm shadow-sm" 
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-xs"
            }`}>
              {msg.role === "model" ? (
                <LatexPreview content={msg.text} />
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-sm px-6 py-4 shadow-xs flex items-center">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <div className="relative flex items-center max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hỏi Gia sư AI bất cứ điều gì..."
            className="w-full pl-5 pr-14 py-4 bg-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 min-h-[56px] shadow-inner"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
