import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, Crown, MessageCircle, Send, Sparkles } from "lucide-react";
import type { MinigameChatMessage } from "../../types/minigame";
import {
  MINIGAME_UNIFIED_CHAT_ROOM,
  sendMinigameChatMessage,
  subscribeMinigameChatRealtime,
} from "../../services/minigameClientService";

const QUICK_CHATS = [
  "🔥 Cố lên cả nhà!",
  "🎉 Hồi hộp quá!",
  "🍀 Xin vía nhân phẩm!",
  "🦆 Vịt số mấy về đích đây?",
  "👏 Hay quá Admin ơi!",
];

interface MinigameRealtimeChatProps {
  eventId?: string;
  roomTag?: string;
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
  eventId = MINIGAME_UNIFIED_CHAT_ROOM,
  roomTag,
  currentUid,
  currentDisplayName,
  currentAvatarUrl,
  isAdmin = false,
  chatEnabled = true,
}) => {
  const [messages, setMessages] = useState<MinigameChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const prevLastMsgIdRef = useRef<string>("");
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    if (!chatEnabled) return;
    const unsub = subscribeMinigameChatRealtime(eventId || MINIGAME_UNIFIED_CHAT_ROOM, (list) => {
      setMessages(list);
    });
    return () => unsub();
  }, [eventId, chatEnabled]);

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    isNearBottomRef.current = true;
    setHasUnreadBelow(false);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;

    const latest = messages[messages.length - 1];
    const latestId = latest?.id || "";

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      prevLastMsgIdRef.current = latestId;
      scrollToBottom(false);
      return;
    }

    if (latestId !== prevLastMsgIdRef.current) {
      prevLastMsgIdRef.current = latestId;
      if (isNearBottomRef.current || latest?.uid === currentUid) {
        scrollToBottom(true);
      } else {
        setHasUnreadBelow(true);
      }
    }
  }, [messages, currentUid]);

  if (!chatEnabled) {
    return null;
  }

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distance < 72;
    isNearBottomRef.current = near;
    if (near && hasUnreadBelow) {
      setHasUnreadBelow(false);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const content = (textOverride ?? draft).trim();
    if (!content || sending || !currentUid) return;
    setSending(true);
    if (!textOverride) setDraft("");
    isNearBottomRef.current = true;
    try {
      await sendMinigameChatMessage(eventId || MINIGAME_UNIFIED_CHAT_ROOM, {
        uid: currentUid,
        displayName: currentDisplayName || "Học sinh",
        avatarUrl: currentAvatarUrl,
        isAdmin,
        message: content,
        roomTag,
      });
      scrollToBottom(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-gradient-to-r from-indigo-50/90 via-white to-fuchsia-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-fuchsia-950/25">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-2xs">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>Kênh Chat Chung Sân Chơi Minigame</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                XUYÊN SUỐT LIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              1 luồng chat liên tục xuyên suốt Sảnh chờ, Phòng sự kiện &amp; Khu tự chơi miễn phí
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 shrink-0">
          {messages.length} tin
        </span>
      </div>

      {/* Messages Feed */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-60 sm:h-68 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/75 dark:bg-slate-950/50"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-1.5 py-6">
              <Sparkles className="w-6 h-6 text-indigo-400 opacity-70" />
              <p className="text-xs font-semibold">
                Chưa có tin nhắn nào. Hãy gửi lời chào hoặc khoe kỷ lục tự chơi nhé!
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
                  <div className="flex items-center gap-1.5 mb-0.5 px-1 flex-wrap">
                    {msg.isAdmin && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                        <Crown className="w-2.5 h-2.5" />
                        ADMIN
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {isMine ? "Bạn" : msg.displayName}
                    </span>
                    {msg.roomTag && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold">
                        {msg.roomTag}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">
                      {formatChatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs font-medium break-words shadow-2xs transition-opacity ${
                      msg.pending ? "opacity-80" : "opacity-100"
                    } ${
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

        {hasUnreadBelow && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold shadow-md cursor-pointer"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Có tin nhắn mới</span>
          </button>
        )}
      </div>

      {/* Quick Chips */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
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
          placeholder="Nhập tin nhắn trò chuyện chung toàn sân chơi..."
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
