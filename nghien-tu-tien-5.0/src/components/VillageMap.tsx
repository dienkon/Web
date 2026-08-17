import React, { useState, useEffect, useRef } from 'react';
import { PlayerCharacter, GameItem, Skill, Quest } from '../types';
import {
  listenAllOnlinePlayers,
  listenVillageChats,
  sendVillageChat,
  getLocalVillageChat,
  isFirebaseLive,
} from "../lib/firebase";
import { playSound, MAPS } from '../utils/gameData';
import { 
  Users, 
  Send, 
  MessageSquare, 
  Compass, 
  Heart, 
  Shield, 
  Sparkles, 
  AlertCircle,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import GameCanvas from './GameCanvas';

interface VillageMapProps {
  player: PlayerCharacter;
  setPlayer: React.Dispatch<React.SetStateAction<PlayerCharacter>>;
  inventory: GameItem[];
  setInventory: React.Dispatch<React.SetStateAction<GameItem[]>>;
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  currentMapId: string;
  setCurrentMapId: React.Dispatch<React.SetStateAction<string>>;
  activeQuests: Quest[];
  setActiveQuests: React.Dispatch<React.SetStateAction<Quest[]>>;
  user: any; // Google auth user
  setActiveTab?: React.Dispatch<React.SetStateAction<string>>;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRealm: string;
  text: string;
  timestamp: number;
}

export default function VillageMap({
  player,
  setPlayer,
  inventory,
  setInventory,
  skills,
  setSkills,
  currentMapId,
  setCurrentMapId,
  activeQuests,
  setActiveQuests,
  user,
  setActiveTab
}: VillageMapProps) {
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showMapList, setShowMapList] = useState(true);

  // Realms strings array for converting realm index
  const REALMS_SHORT = [
    'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 
    'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Tiên Nhân', 'Kim Tiên', 'Tiên Vương', 'Tiên Tôn', 'Tiên Đế'
  ];

  // Load online players list in real-time
  useEffect(() => {
    const unsubscribe = listenAllOnlinePlayers((activePlayers) => {
      // Filter out duplicate or self-duplicate entries
      const unique = activePlayers.filter((p, index, self) => 
        self.findIndex(t => t.uid === p.uid) === index
      );
      setOnlinePlayers(unique);
    });

    return () => unsubscribe && unsubscribe();
  }, [player]);

  // Load real-time chat messages
  // useEffect(() => {
  //   const unsubscribe = listenVillageChats((chatMsgs) => {
  //     // Sort messages ascending by timestamp for display
  //     const sorted = [...chatMsgs].sort((a, b) => a.timestamp - b.timestamp);
  //     setMessages(sorted);
      
  //     // Scroll to bottom
  //     setTimeout(() => {
  //       chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  //     }, 100);
  //   });

  //   return () => unsubscribe && unsubscribe();
  // }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (isFirebaseLive) {
      unsubscribe = listenVillageChats((chatMsgs) => {
        const sorted = [...chatMsgs].sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sorted);
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      });
    } else {
      const local = getLocalVillageChat();
      const sorted = [...local].sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
    }

    return () => unsubscribe && unsubscribe();
  }, []);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    playSound('click');
    const senderId = user?.uid || "guest_" + player.name.toLowerCase().replace(/\s+/g, '');
    const senderName = player.name;
    const senderRealm = `🔮 ${REALMS_SHORT[player.realmIndex]} Tầng ${player.realmLevel}`;

    await sendVillageChat({
      senderId,
      senderName,
      senderRealm,
      text: typedMessage.trim()
    });

    setTypedMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col md:flex-row" id="village_mp_view">
      
      {/* 1. Interactive 2D Multiplayer Map Area (Full Screen) */}
      <div className="flex-1 relative flex flex-col" id="village_arena_map">
        
        {/* Overlay HUD */}
        <div className="absolute top-4 left-4 z-10 flex gap-2" id="village_map_hud">
          <button 
            onClick={() => {
              if (setActiveTab) setActiveTab('meditation');
            }} 
            className="py-1 px-3 bg-red-950/80 rounded-lg border border-red-800/50 text-[10px] font-bold text-red-400 hover:bg-red-900 shadow-md flex items-center gap-1"
          >
            Thoát Làng
          </button>
          <span className="py-1 px-3 bg-emerald-950/80 rounded-lg border border-emerald-800/50 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> TÔNG MÔN ({onlinePlayers.length + 1})
          </span>
        </div>

        {/* Chat Toggle Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="absolute top-4 right-4 z-10 bg-stone-900/80 p-2.5 rounded-full border border-cyan-800/50 shadow-xl"
        >
          <MessageSquare size={18} className="text-cyan-400" />
        </button>
        
        <div className="flex-1 w-full h-full" id="village_canvas_container">
          {showMapList ? (
            <div className="w-full h-full overflow-y-auto p-4 flex flex-col items-center justify-center bg-stone-900/90 backdrop-blur-md relative">
              <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Compass size={24} /> BẢN ĐỒ LÃNH ĐỊA
              </h2>
              <p className="text-xs text-stone-400 mb-6 text-center max-w-lg">
                Các bí cảnh, lãnh địa ngầm có độ khó tăng dần. Lựa chọn cẩn thận vì yêu thú có thể làm tổn thương nguyên khí!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl w-full">
                {MAPS.map((map) => {
                  const isLocked = player.realmIndex < map.reqRealm;
                  return (
                    <button
                      key={map.id}
                      onClick={() => {
                        if (isLocked) {
                          alert(`Đạo hữu cần đạt tối thiểu [${REALMS_SHORT[map.reqRealm]}] để tiến vào ${map.name}!`);
                          return;
                        }
                        playSound('click');
                        setCurrentMapId(map.id);
                        setShowMapList(false);
                      }}
                      className={`relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all ${
                        isLocked 
                          ? 'border-stone-800 bg-stone-950/50 opacity-60 cursor-not-allowed' 
                          : 'border-stone-800 bg-stone-950 hover:border-amber-500 hover:scale-[1.02] active:scale-95 shadow-xl'
                      }`}
                      style={{ borderLeftColor: map.border, borderLeftWidth: '4px' }}
                    >
                      <h3 className="text-sm font-black uppercase text-stone-200 mb-1">{map.name}</h3>
                      <div className="text-[10px] space-y-1 mt-2 w-full">
                        <div className="flex justify-between w-full text-stone-400">
                          <span>Khuyến nghị Lvl:</span>
                          <span className="font-bold text-amber-500">{map.minLevel}+</span>
                        </div>
                        <div className="flex justify-between w-full text-stone-400">
                          <span>Yêu cầu cảnh giới:</span>
                          <span className={`font-bold ${isLocked ? 'text-red-400' : 'text-cyan-400'}`}>
                            {REALMS_SHORT[map.reqRealm]}
                          </span>
                        </div>
                      </div>
                      {isLocked && (
                        <div className="absolute inset-0 bg-stone-950/80 rounded-lg flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-red-500 text-xs font-black uppercase flex items-center gap-1">
                            <Lock size={12} /> Bị Khóa
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => {
                  if (setActiveTab) setActiveTab('meditation');
                }} 
                className="mt-6 py-2 px-6 bg-red-950/80 rounded-lg border border-red-800 text-xs font-bold text-red-400 hover:bg-red-900 transition-all"
              >
                Quay Lại Nơi Tu Luyện
              </button>
            </div>
          ) : (
            <GameCanvas
              player={player}
              setPlayer={setPlayer}
              inventory={inventory}
              setInventory={setInventory}
              skills={skills}
              setSkills={setSkills}
              currentMapId={currentMapId}
              activeQuests={activeQuests}
              setActiveQuests={setActiveQuests}
              user={user}
            />
          )}
        </div>
      </div>

      {/* 2. Multiplayer Sector Chat messages scroller container (Collapsible) */}
      {isChatOpen && (
        <div className="absolute top-16 right-4 bottom-20 w-72 md:relative md:top-auto md:right-auto md:bottom-auto md:w-80 bg-stone-950/95 border border-stone-800 rounded-2xl p-3 flex flex-col z-20 shadow-2xl backdrop-blur-md" id="village_chat_room">
        {/* Chat header */}
        <div className="flex items-center gap-2 mb-2 border-b border-stone-900 pb-1.5 text-xs text-stone-400 font-bold">
          <MessageSquare size={13} className="text-cyan-400 animate-pulse" />
          <span>KÊNH TRUYỀN ÂM TÔNG MÔN CHUNG</span>
        </div>

        {/* Chat log scroller viewport */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-2 scrollbar-none" id="chats_viewport">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-600 italic text-[10px] space-y-1">
              <MessageSquare size={16} className="opacity-40 animate-pulse" />
              <p>Hội trường vắng vẻ. Chưa ai truyền âm nhập thiên cả.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.senderId === user?.uid || msg.senderId === ("guest_" + player.name.toLowerCase().replace(/\s+/g, ''));
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col text-left space-y-0.5 ${isSelf ? 'items-end' : 'items-start'}`}
                  id={`chat_bubble_${msg.id}`}
                >
                  <div className="flex items-center gap-1.5 text-[8px] font-mono text-stone-500">
                    <span className="font-bold text-amber-500/80">{msg.senderName}</span>
                    <span className="text-stone-600">({msg.senderRealm})</span>
                  </div>
                  <div className={`max-w-[85%] p-2 rounded-xl text-[10px] leading-relaxed break-words ${
                    isSelf 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-stone-950 font-bold' 
                      : 'bg-stone-900 border border-stone-800 text-stone-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Send message text input bar form */}
        <form onSubmit={handleSendMessage} className="pt-2 border-t border-stone-900 flex gap-2 shrink-0" id="village_chat_form">
          <input
            type="text"
            placeholder="Truyền âm đại pháp (Nói gì đó...)"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            className="flex-1 px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-[10px] placeholder-stone-500 focus:outline-none focus:border-cyan-500 font-medium"
            id="village_chat_input"
          />
          <button
            type="submit"
            className="px-3.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 rounded-lg flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
            id="village_chat_send_btn"
          >
            <Send size={12} />
          </button>
        </form>

      </div>
      )}

    </div>
  );
}
