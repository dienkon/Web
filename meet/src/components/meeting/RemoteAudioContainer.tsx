import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Participant } from '../../types/meeting';
import { useMeetingStore } from '../../store/meetingStore';

function RemoteAudio({ stream, enabled, onBlocked }: { stream: MediaStream; enabled: boolean; onBlocked: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const volume = useMeetingStore(s => s.speakerVolume);
  const output = useMeetingStore(s => s.outputDeviceId);
  useEffect(() => {
    const audio = ref.current!;
    audio.srcObject = stream;
    const play = () => { void audio.play().catch(error => { if (error.name === 'NotAllowedError') onBlocked(); }); };
    play();
    window.addEventListener('pointerdown', play);
    window.addEventListener('keydown', play);
    return () => { window.removeEventListener('pointerdown', play); window.removeEventListener('keydown', play); audio.srcObject = null; };
  }, [stream, onBlocked]);
  useEffect(() => { if (ref.current) { ref.current.volume = volume; ref.current.muted = !enabled; } }, [volume, enabled]);
  useEffect(() => {
    const audio = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (audio?.setSinkId) void audio.setSinkId(output).catch(() => useMeetingStore.getState().addToast('Không thể dùng loa đã chọn. Hãy chọn loa mặc định.', 'warning'));
  }, [output]);
  return <audio ref={ref} autoPlay data-remote-audio />;
}

export const RemoteAudioContainer: React.FC<{ participants: Participant[] }> = ({ participants }) => {
  const [blocked, setBlocked] = useState(false);
  const onBlocked = React.useCallback(() => setBlocked(true), []);
  const unlock = async () => {
    const results = await Promise.allSettled([...document.querySelectorAll<HTMLAudioElement>('audio[data-remote-audio]')].map(el => el.play()));
    setBlocked(results.some(r => r.status === 'rejected'));
  };
  return <>
    {participants.map(p => <React.Fragment key={p.id}>
      {p.stream && <RemoteAudio stream={p.stream} enabled={p.audioEnabled} onBlocked={onBlocked} />}
      {p.screenStream && <RemoteAudio stream={p.screenStream} enabled={!!p.isScreenSharing} onBlocked={onBlocked} />}
    </React.Fragment>)}
    {blocked && <button onClick={() => void unlock()} className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-300 text-slate-950 shadow-xl text-sm font-semibold">
      <Volume2 size={18} /> Bấm để nghe âm thanh cuộc họp
    </button>}
  </>;
};
