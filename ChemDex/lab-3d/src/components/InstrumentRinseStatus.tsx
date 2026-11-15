import { useAppStore } from '../store/useAppStore';
import { getInstrument } from '../handling/instrumentCatalog';
import { uiText } from '../utils/uiText';

/** One status view for either entry point; all progress comes from the session. */
export function InstrumentRinseStatus() {
  const session = useAppStore(state => state.instrumentRinse);
  const paused = useAppStore(state => state.isSimulationPaused);
  const language = useAppStore(state => state.language);
  if (!session) return null;
  const en = language === 'en';
  const phase = session.phase === 'positioning' ? (en ? 'Positioning over tray' : uiText('Đưa dụng cụ lên khay'))
    : session.phase === 'washing' ? (en ? 'Rinsing' : uiText('Đang tráng nước'))
    : (en ? 'Draining into tray' : uiText('Đang để ráo trên khay'));
  return <div role="status" aria-live="polite" className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
    <p className="font-semibold">{getInstrument(session.tool).name}: {phase}{paused ? (en ? ' · Paused' : ' · Tạm dừng') : ''}</p>
    <div className="flex items-center gap-3">
      <progress aria-label={en ? 'Rinse water used' : uiText('Lượng nước đã rửa')} className="h-2 min-w-0 flex-1 accent-sky-600" max={session.target_ml} value={session.dispensed_ml} />
      <span className="shrink-0 font-mono">{session.dispensed_ml.toFixed(2)} / {session.target_ml.toFixed(0)} mL</span>
    </div>
    <p>{en ? 'Used water is collected as waste. The tool becomes clean after draining.' : uiText('Nước đã dùng được thu vào chất thải. Dụng cụ sạch sau khi để ráo.')}</p>
    <button type="button" className="rounded border border-sky-300 bg-white px-2 py-1 font-medium hover:bg-sky-100" onClick={() => useAppStore.getState().cancelInstrumentRinse()}>
      {en ? 'Stop rinse' : 'Dừng rửa'}
    </button>
  </div>;
}
