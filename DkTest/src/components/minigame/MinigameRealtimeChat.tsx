import React, { useEffect, useRef, useState } from "react";
import { Crown, MessageCircle, Send, Sparkles } from "lucide-react";
import type { MinigameChatMessage } from "../../types/minigame";
import {
  sendMinigameChatMessage,
  subscribeMinigameChatRealtime,
} from "../../services/minigameClientService";

const QUICK_CHATS = [
  "🔥 Cố lên cả nhà!",
  "🎉 Hồi hộp quá!",
  "🍀 Xin vía trúng giải!",
  "👏 Hay quá Admin ơi!",
];

interface MinigameRealtimeChatProps {
  eventId: string;
  currentUid: string;
  currentDisplayName: string;
  currentAvatarUrl?: string;
  isAdmin?: boolean;
  chatEnabled?: boolean;
}

function formatChatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export const MinigameRealtimeChat: React.FC<MinigameRealtimeChatProps> = ({
  eventId,
  currentUid,
  currentDisplayName,
  currentAvatarUrl,
  isAdmin = false,
  chatEnabled = true,
}) => {
  const [messages, setMessages] = useState<MinigameChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!eventId || !chatEnabled) return;
    const unsub = subscribeMinigameChatRealtime(eventId, (list) => {
      setMessages(list);
    });
    return () => unsub();
  }, [eventId, chatEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!chatEnabled) {
    return null;
  }

  const handleSend = async (textOverride?: string) => {
    const content = (textOverride ?? draft).trim();
    if (!content || sending || !currentUid) return;
    setSending(true);
    if (!textOverride) setDraft("");
    try {
      const sent = await sendMinigameChatMessage(eventId, {
        uid: currentUid,
        displayName: currentDisplayName || "Học sinh",
        avatarUrl: currentAvatarUrl,
        isAdmin,
        message: content,
      });
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sent.id)) return prev;
          return [...prev, sent].slice(-60);
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-gradient-to-r from-indigo-50/80 via-white to-fuchsia-50/70 dark:from-indigo-950/30 dark:via-slate-900 dark:to-fuchsia-950/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Trò chuyện phòng trực tiếp</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Chat realtime giữa học sinh &amp; Admin ngay trong sự kiện
            </div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-400">{messages.length} tin</span>
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        className="h-56 sm:h-64 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/60 dark:bg-slate-950/40"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-1.5 py-6">
            <Sparkles className="w-6 h-6 text-indigo-400 opacity-70" />
            <p className="text-xs font-semibold">
              Chưa có tin nhắn nào. Hãy gửi lời chào hoặc cổ vũ mọi người nhé!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.uid === currentUid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  {msg.isAdmin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                      <Crown className="w-2.5 h-2.5" />
                      ADMIN
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {isMine ? "Bạn" : msg.displayName}
                  </span>
                  <span className="text-[9px] text-slate-400">{formatChatTime(msg.createdAt)}</span>
                </div>
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs font-medium break-words shadow-2xs ${
                    msg.isAdmin
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                      : isMine
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Chips */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {QUICK_CHATS.map((text) => (
          <button
            key={text}
            type="button"
            disabled={sending}
            onClick={() => void handleSend(text)}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="p-2.5 flex items-center gap-2 bg-white dark:bg-slate-900"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={280}
          placeholder="Nhập tin nhắn trò chuyện trực tiếp..."
          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gửi</span>
        </button>
      </form>
    </div>
  );
};
