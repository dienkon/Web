import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Sparkles,
  Smile,
  Shield,
  GraduationCap,
  User,
  Volume2,
  VolumeX,
  Radio,
  Users,
} from "lucide-react";
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../../components/common/UserAvatar";

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

export default function GlobalWorldChatPage() {
  const { userProfile, role } = useAuth();
  const [messages, setMessages] = useState<GlobalChatMessage[]>(INITIAL_FALLBACK_MESSAGES);
  const [inputText, setInputText] = useState("");
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
        }
      };
    } catch (e) {
      // BroadcastChannel not supported in some envs
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Full Tab Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 flex flex-col h-full overflow-hidden">
        {/* Main Chat Box Card */}
        <div className="flex-1 bg-white rounded-3xl shadow-md border border-slate-200 flex flex-col overflow-hidden min-h-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base sm:text-lg tracking-tight truncate">
                    Kênh Thế Giới
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Trực tiếp toàn mạng
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 truncate mt-0.5">
                  Không gian trao đổi, hỏi đáp và kết nối bạn bè cùng học tập
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300 shrink-0">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium truncate">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              Tôn trọng nội quy học đường, giao tiếp lịch sự, văn minh & tích cực!
            </span>
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-700">
              <Users className="w-3.5 h-3.5" />
              <span>Cộng đồng DkTEST</span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isMe = msg.senderUid === currentUser.uid;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <UserAvatar
                    src={msg.senderAvatar}
                    name={msg.senderName}
                    size="sm"
                    shape="circle"
                  />

                  <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    {/* Sender meta */}
                    <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                      <span className="font-bold text-slate-800">
                        {isMe ? "Bạn" : msg.senderName}
                      </span>
                      {getRoleBadge(msg.senderRole)}
                      <span className="text-[10px] text-slate-400">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
                        isMe
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Fast Picker */}
          {showEmojiPicker && (
            <div className="bg-white border-t border-slate-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">Biểu cảm nhanh:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendMessage(emoji)}
                  className="p-1.5 text-lg hover:scale-125 transition-transform cursor-pointer"
                  title={`Thả ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
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
                placeholder="Nhập tin nhắn giao lưu với mọi người... (Nhấn Enter để gửi)"
                className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95 shadow-sm flex items-center gap-1.5"
                title="Gửi tin nhắn"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
