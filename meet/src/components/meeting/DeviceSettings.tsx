import React, { useEffect, useState } from 'react';
import { Camera, Headphones, Mic, Monitor, Volume2 } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { Modal } from '../ui/Modal';
import { useAudioLevelStore } from '../../store/audioLevelStore';

export function MicMeter() {
  const level = useAudioLevelStore(s => s.level);
  const enabled = useMeetingStore(s => s.audioEnabled);
  return <div className="space-y-2">
    <div className="flex justify-between text-xs text-slate-400"><span>{enabled ? 'Hãy nói để kiểm tra micro' : 'Micro đang tắt'}</span><span>{Math.round(level * 100)}%</span></div>
    <div role="meter" aria-label="Mức âm thanh micro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)} className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-emerald-400 transition-[width] duration-100 rounded-full" style={{ width: `${level * 100}%` }} />
    </div>
  </div>;
}

export function DeviceSettings({ isOpen, onClose, onChangeDevice }: {
  isOpen: boolean; onClose: () => void; onChangeDevice: (kind: 'audio' | 'video', id: string) => Promise<void>;
}) {
  const { inputDeviceId, cameraDeviceId, outputDeviceId, speakerVolume, noiseSuppression, shareQuality, setPreferences, addToast } = useMeetingStore();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!isOpen || !navigator.mediaDevices?.enumerateDevices) return;
    const refresh = () => { void navigator.mediaDevices.enumerateDevices().then(setDevices).catch(() => addToast('Không đọc được danh sách thiết bị.', 'warning')); };
    refresh(); navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [isOpen, addToast]);

  const change = async (kind: 'audio' | 'video', id: string) => {
    setPending(true); try { await onChangeDevice(kind, id); } finally { setPending(false); }
  };
  const testSpeaker = async () => {
    const ctx = new AudioContext();
    try {
      const sink = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
      if (outputDeviceId && sink.setSinkId) await sink.setSinkId(outputDeviceId);
      else if (outputDeviceId) { addToast('Trình duyệt phát tiếng thử bằng loa mặc định.', 'info'); }
      await ctx.resume();
      const tone = ctx.createOscillator(); const gain = ctx.createGain();
      tone.frequency.value = 523.25; gain.gain.value = 0;
      tone.connect(gain).connect(ctx.destination);
      gain.gain.linearRampToValueAtTime(speakerVolume * 0.18, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      tone.start(); tone.stop(ctx.currentTime + 0.65); tone.onended = () => { void ctx.close(); };
    } catch { await ctx.close(); addToast('Không phát được âm thanh thử. Kiểm tra loa hoặc quyền âm thanh.', 'warning'); }
  };
  const select = (kind: MediaDeviceKind, value: string, onChange: (id: string) => void) => <select aria-label={kind === 'audioinput' ? 'Micro' : kind === 'videoinput' ? 'Camera' : 'Loa / tai nghe'} disabled={pending} value={value} onChange={e => onChange(e.target.value)} className="w-full mt-2 bg-slate-950/50 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white">
    <option value="">Thiết bị mặc định</option>
    {devices.filter(d => d.kind === kind && d.deviceId && d.deviceId !== 'default').map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Thiết bị ${i + 1}`}</option>)}
  </select>;
  return <Modal isOpen={isOpen} onClose={onClose} title="Thiết bị & âm thanh" maxWidth="lg">
    <div className="space-y-5 max-h-[70dvh] overflow-y-auto pr-1">
      <label className="block text-sm font-medium"><span className="flex gap-2 items-center"><Mic size={16} className="text-blue-300" /> Micro</span>{select('audioinput', inputDeviceId, id => void change('audio', id))}</label>
      <MicMeter />
      <label className="flex gap-3 items-center text-sm text-slate-300"><input type="checkbox" checked={noiseSuppression} onChange={async e => {
        const value = e.target.checked;
        try {
          await useMeetingStore.getState().localStream?.getAudioTracks()[0]?.applyConstraints({ noiseSuppression: value, echoCancellation: true, autoGainControl: true });
          setPreferences({ noiseSuppression: value });
        } catch { addToast('Micro này không hỗ trợ thay đổi lọc tiếng ồn.', 'warning'); }
      }} /> Lọc tiếng ồn & khử tiếng vọng</label>
      <label className="block text-sm font-medium"><span className="flex gap-2 items-center"><Camera size={16} className="text-blue-300" /> Camera</span>{select('videoinput', cameraDeviceId, id => void change('video', id))}</label>
      <label className="block text-sm font-medium"><span className="flex gap-2 items-center"><Headphones size={16} className="text-blue-300" /> Loa / tai nghe</span>
        {'setSinkId' in HTMLMediaElement.prototype ? select('audiooutput', outputDeviceId, id => setPreferences({ outputDeviceId: id })) : <p className="text-xs text-slate-400 mt-2">Dùng thiết bị đầu ra mặc định của hệ thống.</p>}
      </label>
      <div className="flex items-center gap-3"><Volume2 size={18} /><input aria-label="Âm lượng cuộc họp" type="range" min="0" max="1" step="0.05" value={speakerVolume} onChange={e => setPreferences({ speakerVolume: Number(e.target.value) })} className="flex-1 accent-blue-400" /><span className="text-xs w-9">{Math.round(speakerVolume * 100)}%</span><button onClick={() => void testSpeaker()} className="text-xs bg-slate-700 rounded-lg px-3 py-2">Thử loa</button></div>
      <label className="block text-sm"><span className="flex items-center gap-2"><Monitor size={16} className="text-blue-300" /> Ưu tiên chia sẻ màn hình</span>
        <select value={shareQuality} onChange={e => {
          const value = e.target.value as 'detail' | 'motion';
          setPreferences({ shareQuality: value });
          const track = useMeetingStore.getState().screenStream?.getVideoTracks()[0];
          if (track) track.contentHint = value;
        }} className="w-full mt-2 bg-slate-950/50 border border-slate-600 rounded-xl px-3 py-2.5">
          <option value="detail">Văn bản sắc nét · tài liệu, slide</option><option value="motion">Chuyển động mượt · video, thao tác</option>
        </select>
      </label>
      <p className="text-xs leading-relaxed text-slate-400">Để chia sẻ tiếng của video, chọn một tab trình duyệt và bật “Chia sẻ âm thanh” trong hộp chọn màn hình.</p>
    </div>
  </Modal>;
}
