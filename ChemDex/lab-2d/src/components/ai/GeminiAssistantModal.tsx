import React, { useState } from 'react';
import { useLabStore } from '../../store/useLabStore';
import { queryGeminiChemistryTutor } from '../../services/geminiService';
import { Sparkles, Send, X, Bot, Beaker, MessageSquare, Flame } from 'lucide-react';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({ isOpen, onClose }) => {
  const { equipment, selectedEquipmentId, language } = useLabStore();
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: language === 'vi'
        ? 'Xin chào! Tôi là Trợ lý Hóa học AI ChemDex được hỗ trợ bởi mô hình **gemini-3.5-flash-lite**. Bạn có thể hỏi tôi về bất kỳ phản ứng hóa học nào, yêu cầu dự đoán hiện tượng khi trộn các chất, hoặc giải thích cơ chế phân tử!'
        : 'Hello! I am your ChemDex AI Chemistry Assistant powered by **gemini-3.5-flash-lite**. Ask me anything about chemical reactions, mechanisms, or predictions!',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const selectedVessel = selectedEquipmentId ? equipment[selectedEquipmentId] : null;

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: promptToSend,
      time: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    const context = selectedVessel
      ? {
          vesselName: language === 'vi' ? selectedVessel.name_vi : selectedVessel.name,
          substances: selectedVessel.contents.map(c => c.formula),
          volume_ml: selectedVessel.volume_ml,
          temperature_c: selectedVessel.temperature_c,
          ph: selectedVessel.ph,
        }
      : undefined;

    const aiResponseText = await queryGeminiChemistryTutor(promptToSend, context);

    const aiMsg = {
      sender: 'ai' as const,
      text: aiResponseText,
      time: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full h-[650px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">
                  {language === 'vi' ? 'Trợ lý Hóa học AI' : 'AI Chemistry Assistant'}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-md">
                  gemini-3.5-flash-lite
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {language === 'vi' ? 'Dự đoán phản ứng động & Giải thích khoa học tức thời' : 'Dynamic reaction prediction & instant tutoring'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Vessel Context Banner */}
        {selectedVessel && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Beaker className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {language === 'vi' ? 'Bình đang chọn:' : 'Selected:'}{' '}
                <strong className="text-slate-800">{language === 'vi' ? selectedVessel.name_vi : selectedVessel.name}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">
                {selectedVessel.contents.map(c => c.formula).join(', ') || (language === 'vi' ? 'Rỗng' : 'Empty')}
              </span>
            </div>
            <button
              onClick={() =>
                handleSend(
                  language === 'vi'
                    ? `Phân tích chi tiết thành phần và dự đoán phản ứng có thể xảy ra trong bình ${selectedVessel.name_vi}`
                    : `Analyze the contents and possible reactions in ${selectedVessel.name}`
                )
              }
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>{language === 'vi' ? 'Phân tích bình này' : 'Analyze vessel'}</span>
            </button>
          </div>
        )}

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-gradient-to-tr from-indigo-500 to-blue-500 text-white'
                }`}
              >
                {m.sender === 'user' ? 'Tôi' : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none font-sans'
                }`}
              >
                {m.text}
                <div
                  className={`mt-1.5 text-[10px] text-right font-mono ${
                    m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span>{language === 'vi' ? 'Gemini 3.5 Flash Lite đang suy nghĩ và tính toán...' : 'Gemini is reasoning...'}</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex items-center gap-2 overflow-x-auto text-[11px]">
          {[
            language === 'vi' ? 'Dự đoán Cu + HNO₃ đặc' : 'Predict Cu + conc HNO3',
            language === 'vi' ? 'Giải thích vì sao AgCl kết tủa' : 'Why does AgCl precipitate',
            language === 'vi' ? 'Tính pH khi trộn HCl và NaOH' : 'Calculate pH of HCl + NaOH',
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 whitespace-nowrap transition-colors font-medium border border-slate-200/60"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={
              language === 'vi'
                ? 'Hỏi Gemini về phản ứng, chất hóa học hoặc hiện tượng...'
                : 'Ask Gemini about any reaction or chemical...'
            }
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
