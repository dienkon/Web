import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useRoomStore, GameMode, Difficulty } from '../store/useRoomStore';
import { useToastStore } from '../store/useToastStore';
import { Copy, Users, Play, Loader2, LogOut, MessageSquare, UserX, Settings, Share2 } from 'lucide-react';
import { renderTitleBadge } from '../utils/titleStyles';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const modeLabelMap: Record<string, string> = {
  balance: 'Cân bằng PT',
  fill_blank: 'Điền khuyết',
  compound_name: 'Gọi tên hợp chất',
  element_quiz: 'Đoán nguyên tố',
  oxidation_state: 'Số Oxi Hóa',
  ranked_mixed: 'Đấu Xếp Hạng',
};

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { currentRoom, joinRoom, toggleReady, startGame, loading, sendMessage, leaveRoom, kickPlayer, error, clearError, updateRoomSettings } = useRoomStore();
  const { showToast } = useToastStore();

  const isNavigatingToMatchRef = useRef(false);

  const [isSharing, setIsSharing] = useState(false);

  const handleShareToGlobal = async () => {
    if (!profile || !roomId || isSharing) return;
    setIsSharing(true);
    try {
      await addDoc(collection(db, 'global_chat'), {
        userId: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        rank: profile.rank || 'Sắt Thô (Fe)',
        equippedTitle: profile.equippedTitle || '',
        text: `🧪 Tôi vừa tạo phòng thi đấu mới! Hãy nhấp vào đây để tham gia so tài cùng tôi nhé: /room/${roomId.toUpperCase()}`,
        createdAt: serverTimestamp(),
      });
      showToast('Đã tự động gửi lời mời tham gia lên kênh thế giới!', 'success');
      // Cooldown 5s to avoid spam
      setTimeout(() => setIsSharing(false), 5000);
    } catch (e: any) {
      console.error('Error sharing room:', e);
      showToast('Lỗi khi chia sẻ phòng: ' + e.message, 'error');
      setIsSharing(false);
    }
  };

  // Editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState<GameMode>('balance');
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>('medium');
  const [editMaxPlayers, setEditMaxPlayers] = useState<number>(2);
  const [editTotalRounds, setEditTotalRounds] = useState<number>(5);

  useEffect(() => {
    if (currentRoom) {
      setEditMode(currentRoom.mode);
      setEditDifficulty(currentRoom.difficulty);
      setEditMaxPlayers(currentRoom.maxPlayers);
      setEditTotalRounds(currentRoom.totalRounds);
    }
  }, [currentRoom?.mode, currentRoom?.difficulty, currentRoom?.maxPlayers, currentRoom?.totalRounds]);

  useEffect(() => {
    if (roomId && profile && (!currentRoom || currentRoom.id !== roomId)) {
      joinRoom(roomId, profile).catch(e => {
        showToast(e.message || 'Không thể vào phòng', 'error');
        navigate('/');
      });
    }
  }, [roomId, profile, currentRoom, joinRoom, navigate]);

  // Handle room error redirection to prevent infinite loading
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
      navigate('/');
    }
  }, [error, clearError, navigate]);

  useEffect(() => {
    if (currentRoom?.status === 'preparing' || currentRoom?.status === 'roundActive') {
      isNavigatingToMatchRef.current = true;
      navigate(`/match/${roomId}`);
    }
  }, [currentRoom?.status, navigate, roomId]);

  // Check if player was kicked by host
  useEffect(() => {
    if (currentRoom && profile && !currentRoom.players?.[profile.uid] && !isNavigatingToMatchRef.current) {
      showToast('Bạn đã bị chủ phòng mời khỏi phòng đấu.', 'warning');
      navigate('/');
    }
  }, [currentRoom, profile, navigate]);

  // Cleanup when navigating away from room page
  useEffect(() => {
    return () => {
      const isStillInRoom = window.location.pathname.startsWith('/room/') || window.location.pathname.startsWith('/match/');
      if (!isNavigatingToMatchRef.current && profile?.uid && !isStillInRoom) {
        leaveRoom(profile.uid);
      }
    };
  }, [profile?.uid, leaveRoom]);

  if (!currentRoom || !profile) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <Loader2 className="animate-spin text-cyan-500" size={48} />
      <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-sm">Đang tải phòng thi đấu...</p>
    </div>
  );

  const players = Object.values(currentRoom.players || {});
  const isHost = currentRoom.hostId === profile.uid;
  const me = currentRoom.players?.[profile.uid];

  const nonHostPlayers = players.filter(p => !p.isHost);
  const allNonHostsReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
  const canStart = isHost && (players.length >= 2 ? allNonHostsReady : currentRoom.maxPlayers === 1);

  return (
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-cyan-600 dark:text-cyan-400 border border-slate-300 dark:border-slate-700 tracking-widest font-mono">
                #{roomId}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
                {modeLabelMap[currentRoom.mode] || currentRoom.mode}
              </span>
              {currentRoom.mode !== 'ranked_mixed' && (
                <>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                    currentRoom.difficulty === 'easy' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                    currentRoom.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20' :
                    currentRoom.difficulty === 'hard' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  }`}>
                    {currentRoom.difficulty === 'easy' ? 'Dễ' : currentRoom.difficulty === 'medium' ? 'Trung bình' : currentRoom.difficulty === 'hard' ? 'Khó' : 'Ngẫu nhiên'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
                    {currentRoom.totalRounds} Màn
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isHost && (
              <button 
                onClick={() => setShowEditModal(true)}
                title="Chỉnh sửa thiết lập phòng"
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-900 rounded-xl text-amber-500 transition-colors flex items-center gap-2 border border-amber-500/20 font-bold text-xs cursor-pointer shadow-sm"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Sửa phòng</span>
              </button>
            )}
            {isHost && (
              <button 
                onClick={handleShareToGlobal}
                disabled={isSharing}
                title="Mời mọi người trên kênh Thế Giới"
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 rounded-xl text-emerald-500 transition-colors flex items-center gap-2 border border-emerald-500/20 font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Share2 size={16} className={isSharing ? 'animate-pulse' : ''} />
                <span className="hidden sm:inline">{isSharing ? 'Đã gửi...' : 'Mời Thế Giới'}</span>
              </button>
            )}
            <button 
              onClick={() => {
                leaveRoom(profile.uid);
                navigate('/');
              }}
              title="Thoát phòng"
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-500 hover:text-slate-900 dark:hover:text-white rounded-xl text-red-500 transition-colors flex items-center gap-2 border border-slate-300 dark:border-slate-700 font-bold text-xs cursor-pointer shadow-sm"
            >
              <LogOut size={16} />
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép đường dẫn phòng!', 'success');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors flex items-center gap-2 border border-slate-300 dark:border-slate-700 font-bold text-xs cursor-pointer shadow-sm"
            >
              <Copy size={16} />
              <span></span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex-1 overflow-y-auto shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Users size={18} className="text-cyan-600 dark:text-cyan-400" />
              Đội hình ({players.length}/{currentRoom.maxPlayers})
            </h3>
            {isHost && (
              <span className="text-xs text-amber-500 font-bold">
                *Cần tất cả người chơi sẵn sàng để bắt đầu
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map(p => (
              <div
                key={p.uid}
                className={`p-4 rounded-xl border ${
                  p.isHost
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : p.isReady
                    ? 'border-green-500/40 bg-green-500/5'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                } flex items-center gap-4 relative overflow-hidden transition-colors shadow-sm`}
              >
                <img
                  src={p.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=Chem'}
                  alt={p.displayName}
                  className="w-12 h-12 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-200 truncate flex items-center gap-1.5 flex-wrap">
                    <span>{p.displayName}</span>
                    {p.equippedTitle && renderTitleBadge(p.equippedTitle, 'sm')}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    {p.isHost ? 'Chủ phòng' : 'Thành viên'}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {p.isHost ? (
                    <span className="text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-wider px-3 py-1 bg-cyan-500/10 rounded-md border border-cyan-500/30">
                      CHỦ PHÒNG
                    </span>
                  ) : p.isReady ? (
                    <span className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider px-3 py-1 bg-green-500/10 rounded-md border border-green-500/30">
                      Sẵn Sàng
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700">
                      Chờ...
                    </span>
                  )}

                  {/* Kick button for Host */}
                  {isHost && !p.isHost && (
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn mời ${p.displayName} ra khỏi phòng?`)) {
                          kickPlayer(p.uid);
                        }
                      }}
                      title="Kick người chơi"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                    >
                      <UserX size={18} />
                    </button>
                  )}
                </div>
                {p.isHost && <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>}
              </div>
            ))}
            
            {Array.from({ length: currentRoom.maxPlayers - players.length }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed flex items-center justify-center gap-4"
              >
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Đang chờ đối thủ tham gia...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          {/* Non-host players see Ready button; Host does not need Ready button */}
          {!isHost && (
            <button
              onClick={() => toggleReady(profile.uid)}
              className={`py-3.5 px-8 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                me?.isReady 
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 border border-slate-300 dark:border-slate-700' 
                  : 'bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white shadow-blue-900/30'
              }`}
            >
              {me?.isReady ? 'Hủy Sẵn Sàng' : 'Sẵn Sàng'}
            </button>
          )}
          
          {isHost && (
            <button
              onClick={() => startGame().catch((e: any) => showToast('Lỗi: ' + e.message, 'error'))}
              disabled={!canStart || loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3.5 px-8 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              {loading
                ? 'ĐANG KHỞI TẠO AI...'
                : players.length < 2
                ? 'ĐANG CHỜ ĐỐI THỦ...'
                : !allNonHostsReady
                ? 'CHỜ TẤT CẢ SẴN SÀNG'
                : 'BẮT ĐẦU TRẬN'}
            </button>
          )}
        </div>
      </div>

      <div className="w-full md:w-80 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col shadow-xl h-80 md:h-auto">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <MessageSquare size={16} className="text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Trò Chuyện Phòng</h3>
        </div>
        <div className="flex-1 p-4 flex flex-col justify-end overflow-hidden">
          <div className="overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
            {currentRoom.messages?.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.uid === profile.uid ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-500 mb-0.5 mx-1 font-bold">{msg.displayName}</span>
                <div className={`px-3 py-2 rounded-xl text-xs font-medium ${
                  msg.uid === profile.uid 
                    ? 'bg-cyan-500 text-slate-900 font-bold rounded-br-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {!currentRoom.messages?.length && (
              <div className="text-center text-slate-500 dark:text-slate-400 text-xs py-4">Chưa có tin nhắn nào</div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20">
          <input 
            type="text" 
            placeholder="Nhập tin nhắn..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                sendMessage(profile.uid, e.currentTarget.value.trim(), profile.displayName);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Settings size={18} className="text-cyan-400" />
                Chỉnh Sửa Thiết Lập Phòng
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {currentRoom?.mode !== 'ranked_mixed' && (
                <>
                  {/* Game Mode */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Chế độ chơi</label>
                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="balance">Cân Bằng Phương Trình</option>
                      <option value="fill_blank">Điền Khuyết Phản Ứng</option>
                      <option value="compound_name">Gọi Tên Hợp Chất</option>
                      <option value="element_quiz">Đoán Nguyên Tố</option>
                      <option value="oxidation_state">Xác Định Số Oxi Hóa</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Độ khó</label>
                    <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                      {(['easy', 'medium', 'hard', 'random'] as const).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setEditDifficulty(level)}
                          className={`flex-1 capitalize py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            editDifficulty === level 
                              ? level === 'easy' ? 'bg-green-500/20 text-green-500 dark:text-green-400 shadow-sm' 
                                : level === 'medium' ? 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 shadow-sm'
                                : level === 'hard' ? 'bg-red-500/20 text-red-500 dark:text-red-400 shadow-sm'
                                : 'bg-purple-500/20 text-purple-500 dark:text-purple-400 shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {level === 'easy' ? 'Dễ' : level === 'medium' ? 'Trung bình' : level === 'hard' ? 'Khó' : 'Ngẫu nhiên'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total Rounds */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Số màn chơi: <span className="text-cyan-400 font-black">{editTotalRounds}</span> / 15 màn
                    </label>
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setEditTotalRounds(Math.max(1, editTotalRounds - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        value={editTotalRounds}
                        onChange={(e) => setEditTotalRounds(parseInt(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setEditTotalRounds(Math.min(15, editTotalRounds + 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Max Players */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Số người chơi tối đa: <span className="text-cyan-400 font-black">{editMaxPlayers}</span> / 20 người
                </label>
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditMaxPlayers(Math.max(Math.max(2, players.length), editMaxPlayers - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="2"
                    max="20"
                    value={editMaxPlayers}
                    onChange={(e) => setEditMaxPlayers(Math.max(players.length, parseInt(e.target.value)))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setEditMaxPlayers(Math.min(20, editMaxPlayers + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
                {editMaxPlayers < players.length && (
                  <span className="text-[10px] text-red-400 font-bold mt-1 block">*Không thể đặt số người chơi nhỏ hơn số người hiện tại trong phòng ({players.length})</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200/60 dark:border-slate-800/60 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const settingsPayload = currentRoom?.mode === 'ranked_mixed'
                    ? {
                        mode: currentRoom.mode,
                        difficulty: currentRoom.difficulty || 'medium',
                        maxPlayers: editMaxPlayers,
                        totalRounds: currentRoom.totalRounds || 5
                      }
                    : {
                        mode: editMode,
                        difficulty: editDifficulty,
                        maxPlayers: editMaxPlayers,
                        totalRounds: editTotalRounds
                      };

                  updateRoomSettings(settingsPayload).then(() => {
                    showToast('Cập nhật thiết lập phòng thành công!', 'success');
                    setShowEditModal(false);
                  }).catch((e: any) => {
                    showToast('Lỗi: ' + e.message, 'error');
                  });
                }}
                className="px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition-colors cursor-pointer"
              >
                Lưu Thiết Lập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
