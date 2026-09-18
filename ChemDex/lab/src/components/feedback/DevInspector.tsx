import React from 'react';
import { Terminal, Cpu, Database, Zap, X } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useSimulationStore } from '../../store/simulationStore';
import { ReactionResolver } from '../../services/reactionResolver';

export const DevInspector: React.FC = () => {
  const { isDevMode, toggleDevMode } = useUiStore();
  const { lastMetrics, resolutionState } = useSimulationStore();
  const metrics = ReactionResolver.getMetrics();

  if (!isDevMode) return null;

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'tier0_deterministic':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">Tier 0 (Deterministic)</span>;
      case 'tier1_memory':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded font-mono font-bold">Tier 1 (RAM Cache)</span>;
      case 'tier2_indexeddb':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded font-mono font-bold">Tier 2 (IndexedDB)</span>;
      case 'tier3_firestore':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">Tier 3 (Firestore)</span>;
      case 'tier4_gemini':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded font-mono font-bold">Tier 4 (Gemini 2.5 Flash)</span>;
      default:
        return <span className="text-slate-400 italic">Chưa có giao dịch phản ứng</span>;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-slate-100 p-4 rounded-2xl shadow-2xl border border-slate-700 w-96 font-mono text-xs select-none backdrop-blur-md">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2 font-bold text-sky-400">
          <Terminal className="w-4 h-4" />
          <span>BẢNG KIỂM ĐỊNH DEV / KIẾN TRÚC</span>
        </div>
        <button
          onClick={toggleDevMode}
          className="text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-[11px]">
        {/* Pipeline status */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Trạng thái Resolver:</span>
          <span className="font-bold text-sky-400 bg-slate-800 px-2 py-0.5 rounded">
            {resolutionState}
          </span>
        </div>

        {/* Reaction Source */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Nguồn tri thức:</span>
          <div>{getSourceBadge(lastMetrics?.source)}</div>
        </div>

        {/* Canonical Key */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Canonical Key:</span>
          <span className="text-amber-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
            {lastMetrics?.canonicalKey || 'None'}
          </span>
        </div>

        {/* Latency */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Độ trễ xử lý:</span>
          <span className="text-emerald-400 font-bold">
            {lastMetrics ? `${lastMetrics.latencyMs.toFixed(2)} ms` : '--'}
          </span>
        </div>

        {/* AI Call count */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-2">
          <span className="text-slate-400 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Số lần gọi Gemini:
          </span>
          <span className="font-bold text-purple-400 bg-slate-800 px-2 py-0.5 rounded">
            {metrics.aiCallCount}
          </span>
        </div>

        {/* Cache hits */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Lượt truy xuất Cache/DB:
          </span>
          <span className="font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
            {metrics.cacheHitCount}
          </span>
        </div>

        <div className="pt-2 text-[10px] text-slate-500 italic border-t border-slate-800">
          * Đạt chuẩn Golden Rule: Thao tác bình rỗng 0ms, tra cứu đa tầng Tier 0-4.
        </div>
      </div>
    </div>
  );
};
