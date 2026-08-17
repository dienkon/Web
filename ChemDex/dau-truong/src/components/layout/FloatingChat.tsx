import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { collection, query, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { MessageSquare, X, Send, Maximize2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderTitleBadge } from '../../utils/titleStyles';
import RoomInviteLink from './RoomInviteLink';

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  rank: string;
  equippedTitle: string;
  text: string;
  createdAt: any;
}

// Vietnamese profanity filter
const PROFANITY_WORDS = [
  'đm', 'dm', 'dkm', 'vcl', 'vkl', 'lz', 'cặc', 'cac', 'lồn', 'lon', 'đéo', 'deo',
  'súc vật', 'suc vat', 'chó', 'đĩ', 'di', 'đệt', 'det', 'hãm', 'ham', 'buồi', 
  'buoi', 'dái', 'dai', 'cứt', 'cut', 'địt', 'dit', 'phò', 'pho', 'cave', 'đút',
  'dâm', 'dam', 'bú', 'bu', 'sex'
];

function filterProfanity(text: string): string {
  let filtered = text;
  PROFANITY_WORDS.forEach(word => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b|${escapedWord}`, 'gi');
    filtered = filtered.replace(regex, '***');
  });
  return filtered;
}

// Detect uppercase 6-character room codes or paths like /room/ABCDEF
function detectRoomCode(text: string): string | null {
  // Regex to catch /room/xxxxxx
  const urlMatch = text.match(/\/room\/([a-zA-Z0-9]{6})/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return null;
}

export default function FloatingChat() {
  const { profile, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messageLimit, setMessageLimit] = useState(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const previousMessagesLength = useRef(0);
  const previousScrollHeight = useRef<number>(0);
  const isLoadingHistory = useRef<boolean>(false);

  useLayoutEffect(() => {
    if (isLoadingHistory.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - previousScrollHeight.current;
      isLoadingHistory.current = false;
    }
  }, [messages]);

  // Load live messages
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'global_chat'),
      orderBy('createdAt', 'desc'),
      limit(isOpen ? messageLimit : 1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          displayName: data.displayName || 'Hóa thủ ẩn danh',
          photoURL: data.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem',
          rank: data.rank || 'Sắt Thô (Fe)',
          equippedTitle: data.equippedTitle || '',
          text: data.text || '',
          createdAt: data.createdAt,
        } as ChatMessage;
      });

      const reversedDocs = docs.reverse();
      setMessages(reversedDocs);

      // Trigger unread notification badge if minimized and it's a real new message
      if (!isFirstLoad.current && !isOpen) {
        setHasNewMessage(true);
      }
      
      // Auto scroll to bottom if new messages arrived (not older ones loaded)
      if (isOpen && scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        // If it's a new message at the bottom, or first time loading
        if (isNearBottom || previousMessagesLength.current === 0 || previousMessagesLength.current === 1) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
      
      previousMessagesLength.current = reversedDocs.length;
      isFirstLoad.current = false;
    }, (err) => {
      console.warn("FloatingChat snapshot error:", err);
    });

    return () => unsubscribe();
  }, [user, isOpen, messageLimit]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      setHasNewMessage(false);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !inputText.trim() || sending) return;

    const rawText = inputText;
    setInputText('');
    setSending(true);

    try {
      const cleanText = filterProfanity(rawText);
      await addDoc(collection(db, 'global_chat'), {
        userId: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        rank: profile.rank || 'Sắt Thô (Fe)',
        equippedTitle: profile.equippedTitle || '',
        text: cleanText,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("FloatingChat message sending error:", err);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      className="fixed bottom-6 right-6 z-40 select-none"
      style={{ touchAction: 'none' }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="absolute bottom-16 right-0 w-[340px] sm:w-[380px] h-[480px] bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xl overflow-hidden flex flex-col"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="cursor-move px-4 py-3 bg-gradient-to-r from-cyan-950 to-blue-950 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MessageSquare className="text-cyan-400 w-5 h-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Chat Thế Giới</h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Stream */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/10 custom-scrollbar"
              onScroll={(e) => {
                if (e.currentTarget.scrollTop === 0 && messages.length >= messageLimit) {
                  previousScrollHeight.current = e.currentTarget.scrollHeight;
                  isLoadingHistory.current = true;
                  setMessageLimit(prev => prev + 10);
                }
              }}
            >
              {messages.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500 dark:text-slate-400">
                  <MessageSquare size={24} className="mx-auto text-slate-600 dark:text-slate-300 dark:text-slate-800 mb-2" />
                  Chưa có tin nhắn nào. Gửi lời chào đầu tiên!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userId === profile?.uid;
                  const roomCode = detectRoomCode(msg.text);
                  const isBot = msg.userId === 'chatbot' || msg.userId === 'system' || msg.displayName?.toLowerCase().includes('bot') || msg.displayName?.toLowerCase().includes('hệ thống');

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 max-w-[88%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <img
                        src={msg.photoURL}
                        alt={msg.displayName}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-start"
                      />

                      <div className="space-y-0.5">
                        {/* User Display Info */}
                        <div className={`flex flex-wrap items-center gap-1 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{msg.displayName}</span>
                          <span className="text-[8px] bg-slate-200/60 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded font-semibold uppercase">
                            {msg.rank.split(' ')[0]} {/* shortened rank */}
                          </span>
                        </div>

                        {/* Speech Bubble */}
                        <div className={`p-2.5 rounded-2xl text-xs leading-relaxed border ${
                          isBot
                            ? 'bg-slate-50 text-slate-700 border-slate-200 rounded-tl-none font-medium shadow-sm'
                            : isMe 
                              ? 'bg-sky-50 text-slate-900 border-sky-200/80 rounded-tr-none font-medium shadow-sm' 
                              : 'bg-white text-slate-900 border-slate-200/80 rounded-tl-none shadow-sm'
                        }`}>
                          {/* Equipped Title on top of speech bubble content */}
                          {msg.equippedTitle && (
                            <div className="mb-1 flex">
                              {renderTitleBadge(msg.equippedTitle, 'sm')}
                            </div>
                          )}

                          <p className="break-all whitespace-pre-wrap">{msg.text}</p>

                          {/* Render verified room invite link if /room/xxx format is found */}
                          {roomCode && (
                            <RoomInviteLink roomCode={roomCode} isMe={isMe} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40 flex gap-2 items-center shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập nội dung chát (Ví dụ: /room/ABCDEF)..."
                maxLength={100}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-transform duration-300 active:scale-95 cursor-pointer relative"
      >
        <MessageSquare size={22} className={isOpen ? 'rotate-90 transition-transform' : ''} />
        
        {/* Unread Message Indicator Badge */}
        {!isOpen && hasNewMessage && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[8px] font-black text-slate-900 dark:text-white items-center justify-center">!</span>
          </span>
        )}
      </button>
    </motion.div>
  );
}
