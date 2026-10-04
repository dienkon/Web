import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Sparkles, X, Send, Bot, Thermometer, Zap, ShieldAlert, 
  ListOrdered, Eye, RefreshCw, HelpCircle, ArrowRight, CheckCircle2
} from 'lucide-react';

interface AIReactionQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselId: string;
}

export function AIReactionQueryModal({ isOpen, onClose, vesselId }: AIReactionQueryModalProps) {
  const { vessels, language } = useAppStore();
  const vessel = vessels[vesselId];

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [userQuestion, setUserQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string }>>([]);

  const t = (en: string, vi: string) => language === 'en' ? en : vi;

  // Auto query whenever modal is opened for a vessel
  useEffect(() => {
    if (!isOpen || !vessel) return;
    if (vessel.substances.length === 0) {
      setData(null);
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/experiment/ai-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            substances: vessel.substances,
            temperature_c: vessel.temperature_c,
            isHeated: vessel.temperature_c > 50,
            lang: language
          })
        });

        if (!res.ok) {
          throw new Error('Failed to query AI');
        }

        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Error communicating with AI service');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [isOpen, vesselId, vessel?.substances?.join(','), vessel?.temperature_c]);

  if (!isOpen || !vessel) return null;

  const handleAskCustomQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userQuestion.trim() || questionLoading) return;

    const question = userQuestion.trim();
    setUserQuestion('');
    setQuestionLoading(true);

    try {
      const res = await fetch('/api/experiment/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substances: vessel.substances,
          temperature_c: vessel.temperature_c,
          isHeated: vessel.temperature_c > 50,
          userQuestion: question,
          lang: language
        })
      });

      if (!res.ok) throw new Error('Question query failed');
      const result = await res.json();
      
      const answer = language === 'en' ? result.explanation_en : result.explanation_vi;
      setChatHistory(prev => [...prev, { q: question, a: answer }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { 
        q: question, 
        a: t('Could not obtain answer from AI service. Please retry.', 'Không thể nhận phản hồi từ AI. Vui lòng thử lại.') 
      }]);
    } finally {
      setQuestionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Bot size={20} className="text-blue-100 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                {t('AI Reaction & Parameter Query', 'Truy vấn Thông số & Thao tác AI')}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">
                  {vessel.name}
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/90 leading-tight">
                {t('Detailed thermodynamics, kinetics rate law, and standard procedures', 'Thông số nhiệt động học, động học phản ứng và quy trình thao tác')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Vessel Status Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">{t('Chemicals in vessel:', 'Chất hiện có:')}</span>
              <div className="flex flex-wrap gap-1">
                {vessel.substances.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold font-mono text-slate-800">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
              <span>T: <strong>{vessel.temperature_c.toFixed(1)}°C</strong></span>
              <span>pH: <strong>{vessel.ph.toFixed(1)}</strong></span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                {t('Consulting AI Chemical Knowledge Base...', 'Đang truy vấn dữ liệu hóa học chuyên sâu từ AI...')}
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {t('Calculating enthalpy ΔH, reaction rate law, safety rules, and operational sequence.', 'Tính toán nhiệt động ΔH, định luật tốc độ, quy trình thao tác và an toàn.')}
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert size={16} />
                {t('Query Error', 'Lỗi truy vấn')}
              </div>
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Chemical Equation & Type */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200">
                <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider mb-1">
                  {t('Chemical Equation & Classification', 'Phương trình hóa học & Bản chất')}
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 leading-relaxed">
                  {data.equation}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[11px]">
                    {data.reaction_type}
                  </span>
                  {data.thermodynamics?.temperature_required && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                      {data.thermodynamics.temperature_required}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Thermodynamics & Kinetics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Thermodynamics */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Thermometer size={14} className="text-amber-500" />
                    <span>{t('Thermodynamics (Nhiệt động học)', 'Nhiệt động học')}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Biến thiên Enthalpy (ΔH):</span>
                      <strong className="font-mono text-slate-800">{data.thermodynamics?.enthalpy_delta_h || 'Chưa xác định'}</strong>
                    </div>
                    {data.thermodynamics?.gibbs_free_energy && (
                      <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-500">Năng lượng Gibbs (ΔG):</span>
                        <strong className="font-mono text-slate-800">{data.thermodynamics.gibbs_free_energy}</strong>
                      </div>
                    )}
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Nhiệt độ yêu cầu:</span>
                      <strong className="text-slate-800">{data.thermodynamics?.temperature_required || 'Nhiệt độ phòng (25°C)'}</strong>
                    </div>
                  </div>
                </div>

                {/* Kinetics */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Zap size={14} className="text-indigo-500" />
                    <span>{t('Reaction Kinetics (Động học phản ứng)', 'Động học & Tốc độ')}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Tốc độ phản ứng:</span>
                      <strong className="text-slate-800">{data.kinetics?.reaction_speed || 'Trung bình'}</strong>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                      <span className="text-slate-500">Định luật tốc độ (Rate Law):</span>
                      <strong className="font-mono text-indigo-700">{data.kinetics?.rate_law || 'v = k[A][B]'}</strong>
                    </div>
                    {data.kinetics?.catalyst_needed && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-slate-500">Chất xúc tác:</span>
                        <strong className="text-slate-800">{data.kinetics.catalyst_needed}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Operational Procedures & Safety */}
              {data.operational_procedure && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <ListOrdered size={14} className="text-emerald-600" />
                    <span>{t('Standard Operational Procedure (Quy trình thao tác chuẩn)', 'Quy trình thao tác thực nghiệm chuẩn')}</span>
                  </div>
                  
                  <div className="space-y-1.5 pl-1">
                    {data.operational_procedure.step_by_step?.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>

                  {data.operational_procedure.safety_precautions?.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <div className="text-[10px] uppercase font-bold text-amber-700 flex items-center gap-1 mb-1">
                        <ShieldAlert size={12} />
                        <span>{t('Safety Precautions & Handling', 'Lưu ý an toàn thí nghiệm')}</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                        {data.operational_procedure.safety_precautions.map((safe: string, sIdx: number) => (
                          <li key={sIdx}>{safe}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* General Explanation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] leading-relaxed text-slate-700">
                <div className="font-bold text-slate-800 mb-1">
                  {t('Chemical Explanation', 'Giải thích cơ chế phản ứng')}
                </div>
                {language === 'en' ? data.explanation_en : data.explanation_vi}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              {t('No active reagents in vessel to analyze.', 'Chưa có hóa chất trong bình để phân tích.')}
            </div>
          )}

          {/* Interactive Chat / Follow-up Q&A */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-blue-500" />
              <span>{t('Ask AI Specific Question About This Reaction', 'Hỏi chi tiết AI về phản ứng này')}</span>
            </div>

            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                {chatHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="font-bold text-blue-600 flex items-center gap-1">
                      <span>Q:</span> {item.q}
                    </div>
                    <div className="text-slate-700 pl-3 border-l-2 border-blue-200 leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleAskCustomQuestion} className="flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder={t('e.g., Why does this need heating? What happens with excess acid?', 'VD: Tại sao phản ứng cần đun nóng? Hiện tượng khi dư axit?')}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={questionLoading}
              />
              <button
                type="submit"
                disabled={!userQuestion.trim() || questionLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1 transition-colors"
              >
                {questionLoading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>{t('Ask', 'Hỏi')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
