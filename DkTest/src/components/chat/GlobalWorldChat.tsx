import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Smile,
  Shield,
  GraduationCap,
  User,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Radio,
} from "lucide-react";
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../common/UserAvatar";

export interface GlobalChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: "student" | "teacher" | "admin";
  senderAvatar?: string;
  text: string;
  createdAt: number;
}

const QUICK_EMOJIS = ["🔥", "👏", "💯", "💡", "❤️", "⚡", "🎯", "🎉"];

const INITIAL_FALLBACK_MESSAGES: GlobalChatMessage[] = [
  {
    id: "system_welcome_1",
    senderUid: "system",
    senderName: "Hệ thống DkTEST",
    senderRole: "admin",
    text: "Chào mừng các bạn đến với Kênh Chat Thế Giới DkTEST! Chúc mọi người ôn luyện hiệu quả và bứt phá điểm số! 🚀",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "system_welcome_2",
    senderUid: "teacher_support",
    senderName: "Thầy Hướng Dẫn",
    senderRole: "teacher",
    text: "Mọi người có thể cùng nhau trao đổi kinh nghiệm giải nhanh trắc nghiệm 2025 tại đây nhé!",
    createdAt: Date.now() - 1800000,
  },
];

export default function GlobalWorldChat() {
  const { userProfile, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<GlobalChatMessage[]>(INITIAL_FALLBACK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Active user representation
  const currentUser = useMemo(() => {
    const rawLocal = localStorage.getItem("userProfile");
    const parsedLocal = rawLocal ? JSON.parse(rawLocal) : null;
    const effectiveRole = (role || userProfile?.role || parsedLocal?.role || "student") as "student" | "teacher" | "admin";
    const effectiveName = userProfile?.displayName || userProfile?.fullName || parsedLocal?.displayName || parsedLocal?.name || "Học sinh";
    const effectiveUid = userProfile?.uid || parsedLocal?.uid || `guest_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveAvatar = userProfile?.photoURL || parsedLocal?.avatarUrl || "";

    return {
      uid: effectiveUid,
      name: effectiveName,
      role: effectiveRole,
      avatar: effectiveAvatar,
    };
  }, [userProfile, role]);

  // Setup BroadcastChannel for multi-tab sync fallback
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("dktest_global_world_chat");
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_MESSAGE" && event.data.payload) {
          const newMsg = event.data.payload as GlobalChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (!isOpen) {
            setUnreadCount((c) => c + 1);
          }
        }
      };
    } catch (e) {
      // BroadcastChannel not supported in some envs
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [isOpen]);

  // Real-time Firestore subscription
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const chatQuery = query(
        collection(db, "global_chat_messages"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      unsubscribe = onSnapshot(
        chatQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const fetched: GlobalChatMessage[] = snapshot.docs
              .map((docSnap) => {
                const data = docSnap.data();
                const ts = data.createdAt?.toMillis
                  ? data.createdAt.toMillis()
                  : typeof data.createdAt === "number"
                  ? data.createdAt
                  : Date.now();

                return {
                  id: docSnap.id,
                  senderUid: data.senderUid || "unknown",
                  senderName: data.senderName || "Ẩn danh",
                  senderRole: data.senderRole || "student",
                  senderAvatar: data.senderAvatar || "",
                  text: data.text || "",
                  createdAt: ts,
                };
              })
              .sort((a, b) => a.createdAt - b.createdAt);

            setMessages(fetched);
          }
        },
        (error) => {
          console.warn("[GlobalWorldChat] Firestore offline/permission error, using local channel fallback:", error);
        }
      );
    } catch (err) {
      console.warn("[GlobalWorldChat] Setup listener error:", err);
    }

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Reset unread count when opening
  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      if (!prev) {
        setUnreadCount(0);
        setTimeout(() => inputRef.current?.focus(), 150);
      }
      return !prev;
    });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const raw = (textToSend ?? inputText).trim();
    if (!raw || isSending) return;

    // Rate limiting: 1 second cooldown
    const now = Date.now();
    if (now - lastSentAt < 1000) {
      return;
    }
    setLastSentAt(now);

    const messageText = raw.slice(0, 300);
    setIsSending(true);

    const newMsg: GlobalChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderUid: currentUser.uid,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      text: messageText,
      createdAt: Date.now(),
    };

    // Optimistic local update
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setShowEmojiPicker(false);

    // Broadcast channel
    try {
      broadcastChannelRef.current?.postMessage({
        type: "NEW_MESSAGE",
        payload: newMsg,
      });
    } catch (e) {}

    // Save to Firestore
    try {
      await addDoc(collection(db, "global_chat_messages"), {
        senderUid: newMsg.senderUid,
        senderName: newMsg.senderName,
        senderRole: newMsg.senderRole,
        senderAvatar: newMsg.senderAvatar,
        text: newMsg.text,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[GlobalWorldChat] Send error (message stored locally):", err);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const getRoleBadge = (msgRole: string) => {
    if (msgRole === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Shield className="w-2.5 h-2.5 text-rose-600" />
          Admin
        </span>
      );
    }
    if (msgRole === "teacher") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <GraduationCap className="w-2.5 h-2.5 text-amber-600" />
          Thầy/Cô
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
        <User className="w-2.5 h-2.5 text-blue-500" />
        Học sinh
      </span>
    );
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggleOpen}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full sm:rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-2.5 cursor-pointer transition-all duration-200 active:scale-95 group border-2 border-white/20"
          title="Kênh Chat Thế Giới"
          aria-label="Kênh Chat Thế Giới"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-600 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-600 rounded-full" />
          </div>

          <span className="hidden sm:inline font-bold text-xs tracking-wide">
            Kênh Thế Giới
          </span>

          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-bounce">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isExpanded
              ? "w-[calc(100vw-2rem)] sm:w-[520px] h-[calc(100vh-2rem)] sm:h-[650px]"
              : "w-[calc(100vw-2rem)] sm:w-[380px] h-[520px]"
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight truncate">
                    Kênh Chat Thế Giới
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Trực tiếp
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/80 truncate">
                  Giao lưu học sinh & giáo viên toàn hệ thống
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-300 shrink-0">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleOpen}
                className="p-1.5 rounded-lg hover:bg-rose-500/80 hover:text-white transition-colors cursor-pointer ml-1"
                title="Đóng chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 text-[11px] text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-1 font-medium truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Tôn trọng nội quy học đường, văn minh & tích cực!
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => {
              const isMe = msg.senderUid === currentUser.uid;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  {/* Sender meta */}
                  <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                    {!isMe && (
                      <span className="font-bold text-slate-800">
                        {msg.senderName}
                      </span>
                    )}
                    {getRoleBadge(msg.senderRole)}
                    <span className="text-[10px] text-slate-400">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-2xs ${
                      isMe
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Fast Picker */}
          {showEmojiPicker && (
            <div className="bg-white border-t border-slate-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 shadow-inner">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="p-1 text-base hover:scale-125 transition-transform cursor-pointer"
                  title={`Thả ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  showEmojiPicker
                    ? "bg-amber-100 text-amber-700"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                }`}
                title="Biểu cảm nhanh"
              >
                <Smile className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={300}
                placeholder="Nhắn tin với mọi người... (Enter gửi)"
                className="flex-1 text-xs bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95 shadow-xs"
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
