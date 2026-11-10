import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MessageSquare, Users, GraduationCap, PhoneOff, Settings2, Hand, LayoutGrid, UserRound, Maximize, Download, ShieldCheck, MoreHorizontal } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { socketService } from '../../services/socket';
import { clsx } from 'clsx';

interface Props {
  audioEnabled: boolean; videoEnabled: boolean; isScreenSharing: boolean; participantCount: number;
  onToggleAudio: () => void; onToggleVideo: () => void; onToggleScreenShare: () => void;
  onLeave: () => void; onOpenHostModal?: () => void; onOpenSettings: () => void;
}
export const ControlBar: React.FC<Props> = props => {
  const { activePanel, setActivePanel, isHost, handRaised, setPreferences, layout, addToast } = useMeetingStore();
  const [more, setMore] = useState(false);
  const hand = () => {
    setPreferences({ handRaised: !handRaised });
    socketService.emit('media:toggle', { type: 'hand', enabled: !handRaised });
  };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { addToast('Trình duyệt chưa hỗ trợ chế độ toàn màn hình.', 'info'); }
    setMore(false);
  };
  const exportChat = () => {
    const { chatMessages, roomCode } = useMeetingStore.getState();
    const body = chatMessages.map(m => `[${new Date(m.timestamp).toLocaleTimeString('vi-VN')}] ${m.senderName}: ${m.text}`).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', body || 'Chưa có tin nhắn.'], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `MeetClass-${roomCode}-chat.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMore(false);
  };
  const button = (label: string, icon: React.ReactNode, onClick: () => void, active = false, danger = false) =>
    <button aria-label={label} title={label} onClick={onClick} aria-pressed={active} className={clsx('meeting-control', danger ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25' : active ? 'bg-blue-400 text-slate-950 hover:bg-blue-300' : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200')}>{icon}</button>;
  return <footer className="meeting-controls relative z-30 shrink-0 px-3 sm:px-6 py-3 border-t border-white/[0.07] bg-[#10151e]">
    <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 flex-wrap">
      <div className="hidden xl:block w-36"><p className="text-sm font-semibold">Một không gian.</p><p className="text-xs text-slate-500 mt-1">Mọi kết nối.</p></div>
      <div className="flex items-center gap-2 mx-auto">
        {button(props.audioEnabled ? 'Tắt micro (Ctrl+Shift+M)' : 'Bật micro (Ctrl+Shift+M)', props.audioEnabled ? <Mic size={19} /> : <MicOff size={19} />, props.onToggleAudio, false, !props.audioEnabled)}
        {button(props.videoEnabled ? 'Tắt camera (Ctrl+Shift+V)' : 'Bật camera (Ctrl+Shift+V)', props.videoEnabled ? <Video size={19} /> : <VideoOff size={19} />, props.onToggleVideo, false, !props.videoEnabled)}
        <span className="w-px h-6 bg-white/10 mx-1" />
        {button(props.isScreenSharing ? 'Dừng trình chiếu' : 'Chia sẻ màn hình', <MonitorUp size={19} />, props.onToggleScreenShare, props.isScreenSharing)}
        {button(handRaised ? 'Hạ tay' : 'Giơ tay', <Hand size={19} />, hand, handRaised)}
        <div className="relative">
          {button('Tùy chọn cuộc họp', <MoreHorizontal size={20} />, () => setMore(!more), more)}
          {more && <>
            <button aria-label="Đóng tùy chọn" className="fixed inset-0 z-0 cursor-default" onClick={() => setMore(false)} />
            <div className="absolute bottom-14 right-0 w-64 bg-[#202938] border border-white/10 rounded-2xl p-2 shadow-2xl z-10 text-sm">
              <button className="menu-action" onClick={() => { props.onOpenSettings(); setMore(false); }}><Settings2 size={17} /> Thiết bị & âm thanh</button>
              <button className="menu-action" onClick={() => { setPreferences({ layout: layout === 'grid' ? 'speaker' : 'grid' }); setMore(false); }}>{layout === 'grid' ? <UserRound size={17} /> : <LayoutGrid size={17} />}{layout === 'grid' ? 'Tập trung người nói' : 'Bố cục dạng lưới'}</button>
              <button className="menu-action" onClick={() => void fullscreen()}><Maximize size={17} /> Toàn màn hình</button>
              <button className="menu-action" onClick={exportChat}><Download size={17} /> Tải nội dung trò chuyện</button>
              {isHost && <button className="menu-action" onClick={() => { props.onOpenHostModal?.(); setMore(false); }}><ShieldCheck size={17} /> Quản lý phòng</button>}
              <p className="px-3 py-2 text-[11px] text-slate-400 border-t border-white/10 mt-1">Ctrl + Shift + M: mic · V: camera</p>
            </div>
          </>}
        </div>
        <button aria-label="Rời cuộc họp" title="Rời cuộc họp" onClick={props.onLeave} className="meeting-control !w-14 bg-rose-500 hover:bg-rose-400 text-white ml-1"><PhoneOff size={20} /></button>
      </div>
      <div className="flex items-center justify-center gap-2 mx-auto sm:mx-0">
        {button('Lớp học tương tác', <GraduationCap size={20} />, () => setActivePanel('classroom'), activePanel === 'classroom')}
        {button('Trò chuyện', <MessageSquare size={19} />, () => setActivePanel('chat'), activePanel === 'chat')}
        {button(`Người tham gia (${props.participantCount})`, <span className="flex items-center gap-1"><Users size={19} /><span className="text-[11px]">{props.participantCount}</span></span>, () => setActivePanel('participants'), activePanel === 'participants')}
      </div>
    </div>
  </footer>;
};
